// The Reborn website controls Bluetooth LED lights with the browser's Web Bluetooth. The app's web view has none, so this script
// (injected before the page loads) gives the page the same `navigator.bluetooth` and passes every call to the app's native Bluetooth
// (mobile/ble.ts) through `ReactNativeWebView.postMessage`. The page's own code does not change.
//
// Page → app:  { ble: true, id, op, args }          op: scan | connect | disconnect | services | write
// Also: window.__rebornLanScan() asks the app to scan the Wi-Fi network for cameras and TVs (mobile/lanScan.ts).
// App → page:  window.__rebornBleReply(id, ok, payload)  and  window.__rebornBleEvent(deviceId, "gattserverdisconnected")
export const BLE_SHIM = `
(function () {
  if (!window.ReactNativeWebView) return;
  var pending = {};
  var devices = {};
  var seq = 0;

  function call(op, args) {
    return new Promise(function (resolve, reject) {
      var id = ++seq;
      pending[id] = { resolve: resolve, reject: reject };
      window.ReactNativeWebView.postMessage(JSON.stringify({ ble: true, id: id, op: op, args: args || {} }));
    });
  }
  window.__rebornBleReply = function (id, ok, payload) {
    var entry = pending[id];
    if (!entry) return;
    delete pending[id];
    if (ok) entry.resolve(payload); else entry.reject(new Error(String(payload || "Bluetooth error")));
  };
  window.__rebornBleEvent = function (deviceId, type) {
    var device = devices[deviceId];
    if (!device) return;
    device.gatt.connected = false;
    (device.listeners[type] || []).slice().forEach(function (listener) { try { listener({ target: device }); } catch (e) {} });
  };

  // The phone scans its Wi-Fi for CCTV cameras and TVs; resolves with [{ ip, kind, name, model, rtsp, via }].
  window.__rebornLanScan = function () { return call("lanScan", {}); };
  if (navigator.bluetooth) return;

  function toBase64(value) {
    var bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    var text = "";
    for (var i = 0; i < bytes.length; i++) text += String.fromCharCode(bytes[i]);
    return btoa(text);
  }
  function notFound() { var error = new Error("No device selected"); error.name = "NotFoundError"; return error; }

  function makeCharacteristic(deviceId, serviceUuid, uuid) {
    function write(value, response) { return call("write", { id: deviceId, service: serviceUuid, characteristic: uuid, data: toBase64(value), response: response }).then(function () {}); }
    return {
      uuid: uuid,
      writeValue: function (value) { return write(value, true); },
      writeValueWithResponse: function (value) { return write(value, true); },
      writeValueWithoutResponse: function (value) { return write(value, false); }
    };
  }
  function makeService(deviceId, uuid) {
    return { uuid: uuid, getCharacteristic: function (characteristic) { return Promise.resolve(makeCharacteristic(deviceId, uuid, String(characteristic).toLowerCase())); } };
  }
  function makeDevice(info) {
    if (devices[info.id]) { devices[info.id].name = info.name; return devices[info.id]; }
    var device = { id: info.id, name: info.name, listeners: {} };
    device.gatt = {
      connected: false,
      device: device,
      connect: function () { return call("connect", { id: info.id }).then(function () { device.gatt.connected = true; return device.gatt; }); },
      disconnect: function () { device.gatt.connected = false; call("disconnect", { id: info.id }).catch(function () {}); },
      getPrimaryServices: function () { return call("services", { id: info.id }).then(function (list) { return list.map(function (uuid) { return makeService(info.id, uuid); }); }); },
      getPrimaryService: function (uuid) { return Promise.resolve(makeService(info.id, String(uuid).toLowerCase())); }
    };
    device.addEventListener = function (type, listener) { (device.listeners[type] = device.listeners[type] || []).push(listener); };
    device.removeEventListener = function (type, listener) { device.listeners[type] = (device.listeners[type] || []).filter(function (item) { return item !== listener; }); };
    devices[info.id] = device;
    return device;
  }

  // A simple chooser, like the browser's own: the app scans for a few seconds, the person taps the light.
  function choose(list) {
    return new Promise(function (resolve, reject) {
      var overlay = document.createElement("div");
      overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;padding:16px;font-family:sans-serif";
      var box = document.createElement("div");
      box.style.cssText = "width:100%;max-width:420px;max-height:80vh;overflow:auto;background:#160f2a;color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:16px;padding:16px";
      var title = document.createElement("p");
      title.textContent = list.length ? "Choose a light" : "No lights found. Switch the light on, close its own app, and try again.";
      title.style.cssText = "margin:0 0 12px;font-weight:700";
      box.appendChild(title);
      function close(action) { document.body.removeChild(overlay); action(); }
      list.forEach(function (info) {
        var button = document.createElement("button");
        button.textContent = info.name;
        button.style.cssText = "display:block;width:100%;text-align:left;margin:0 0 8px;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:15px";
        button.onclick = function () { close(function () { resolve(info); }); };
        box.appendChild(button);
      });
      var cancel = document.createElement("button");
      cancel.textContent = "Cancel";
      cancel.style.cssText = "display:block;width:100%;margin-top:4px;padding:12px;border-radius:10px;border:0;background:#fff;color:#000;font-weight:700;font-size:15px";
      cancel.onclick = function () { close(function () { reject(notFound()); }); };
      box.appendChild(cancel);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
    });
  }
  // Same chooser, but several lights can be ticked at once ("Select all" too); resolves with the list of ticked lights.
  function chooseMany(list, rescan) {
    return new Promise(function (resolve, reject) {
      var overlay = document.createElement("div");
      overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;padding:16px;font-family:sans-serif";
      var box = document.createElement("div");
      box.style.cssText = "width:100%;max-width:420px;max-height:85vh;display:flex;flex-direction:column;background:#160f2a;color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:16px;padding:16px";
      var title = document.createElement("p");
      title.textContent = list.length ? "Choose your lights (" + list.length + " found)" : "No lights found. Switch the light on, close its own app, and try again.";
      title.style.cssText = "margin:0 0 10px;font-weight:700;flex:none";
      box.appendChild(title);
      var picked = {};
      var rows = document.createElement("div");
      rows.style.cssText = "overflow:auto;flex:1;min-height:0";
      var add = document.createElement("button");
      function count() { return Object.keys(picked).length; }
      function refresh() {
        add.textContent = count() ? "Add " + count() + (count() === 1 ? " light" : " lights") : "Tick the lights to add";
        add.disabled = !count();
        add.style.opacity = count() ? "1" : ".4";
        list.forEach(function (info) {
          var row = info.__row;
          row.textContent = (picked[info.id] ? "\u2611  " : "\u2610  ") + info.name;
          row.style.background = picked[info.id] ? "rgba(34,211,238,.25)" : "rgba(255,255,255,.08)";
        });
      }
      function close(action) { document.body.removeChild(overlay); action(); }
      if (list.length) {
        var bar = document.createElement("div");
        bar.style.cssText = "display:flex;gap:8px;margin:0 0 10px;flex:none";
        [["Select all", function () { list.forEach(function (info) { picked[info.id] = info; }); }], ["Clear", function () { picked = {}; }]].forEach(function (item) {
          var chip = document.createElement("button");
          chip.textContent = item[0];
          chip.style.cssText = "flex:1;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:transparent;color:#fff;font-size:14px;font-weight:700";
          chip.onclick = function () { item[1](); refresh(); };
          bar.appendChild(chip);
        });
        box.appendChild(bar);
      }
      function addRow(info) {
        var row = document.createElement("button");
        row.style.cssText = "display:block;width:100%;text-align:left;margin:0 0 8px;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,.2);color:#fff;font-size:15px";
        row.onclick = function () { if (picked[info.id]) delete picked[info.id]; else picked[info.id] = info; refresh(); };
        info.__row = row;
        rows.appendChild(row);
      }
      list.forEach(addRow);
      box.appendChild(rows);
      // Scan again without closing: new lights join the list, the ticks stay.
      var again = document.createElement("button");
      again.textContent = "Scan again";
      again.style.cssText = "display:block;width:100%;margin-top:8px;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,.3);background:transparent;color:#fff;font-weight:700;font-size:15px;flex:none";
      again.onclick = function () {
        again.disabled = true; again.textContent = "Scanning…";
        rescan().then(function (found) {
          found.forEach(function (info) { if (!list.some(function (known) { return known.id === info.id; })) { list.push(info); addRow(info); } });
        }, function () {}).then(function () { again.disabled = false; again.textContent = "Scan again"; title.textContent = "Choose your lights (" + list.length + " found)"; refresh(); });
      };
      if (rescan) box.appendChild(again);
      add.style.cssText = "display:block;width:100%;margin-top:8px;padding:12px;border-radius:10px;border:0;background:#fbbf24;color:#000;font-weight:700;font-size:15px;flex:none";
      add.onclick = function () { var chosen = list.filter(function (info) { return picked[info.id]; }); close(function () { resolve(chosen); }); };
      if (list.length) box.appendChild(add);
      var cancel = document.createElement("button");
      cancel.textContent = "Cancel";
      cancel.style.cssText = "display:block;width:100%;margin-top:8px;padding:12px;border-radius:10px;border:0;background:#fff;color:#000;font-weight:700;font-size:15px;flex:none";
      cancel.onclick = function () { close(function () { reject(notFound()); }); };
      box.appendChild(cancel);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      refresh();
    });
  }
  function scanning() {
    var overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;color:#fff;font:16px sans-serif";
    overlay.textContent = "Looking for lights…";
    document.body.appendChild(overlay);
    return function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); };
  }

  // The lights the admin has chosen stay on the phone: getDevices() (a real Web Bluetooth call) gives them back next time, so nothing is chosen twice.
  var KNOWN_KEY = "reborn.ble.known";
  function loadKnown() { try { var list = JSON.parse(localStorage.getItem(KNOWN_KEY) || "[]"); return Array.isArray(list) ? list : []; } catch (e) { return []; } }
  function saveKnown(infos) {
    try {
      var known = loadKnown();
      infos.forEach(function (info) { if (!known.some(function (item) { return item.id === info.id; })) known.push({ id: info.id, name: info.name }); });
      localStorage.setItem(KNOWN_KEY, JSON.stringify(known));
    } catch (e) { /* storage blocked: the lights are chosen again next visit */ }
  }
  var bluetooth = {
    getDevices: function () { return Promise.resolve(loadKnown().map(makeDevice)); },
    // Not part of Web Bluetooth: take a light off the phone's saved list.
    forgetDevice: function (id) { try { localStorage.setItem(KNOWN_KEY, JSON.stringify(loadKnown().filter(function (item) { return item.id !== id; }))); } catch (e) { /* ignore */ } },
    requestDevice: function (options) {
      var stop = scanning();
      return call("scan", {}).then(function (list) { stop(); return choose(list); }, function (error) { stop(); throw error; }).then(function (info) { saveKnown([info]); return makeDevice(info); });
    },
    // Not part of Web Bluetooth: the same scan, with several lights ticked at once. The page uses it when it exists.
    requestDevices: function (options) {
      var stop = scanning();
      return call("scan", {}).then(function (list) { stop(); return chooseMany(list, function () { return call("scan", {}); }); }, function (error) { stop(); throw error; }).then(function (list) { saveKnown(list); return list.map(makeDevice); });
    }
  };
  try { Object.defineProperty(navigator, "bluetooth", { value: bluetooth, configurable: true }); } catch (e) { navigator.bluetooth = bluetooth; }
  window.__REBORN_NATIVE_BLE__ = true;
})();
true;
`;
