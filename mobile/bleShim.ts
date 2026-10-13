// The Reborn website controls Bluetooth LED lights with the browser's Web Bluetooth. The app's web view has none, so this script
// (injected before the page loads) gives the page the same `navigator.bluetooth` and passes every call to the app's native Bluetooth
// (mobile/ble.ts) through `ReactNativeWebView.postMessage`. The page's own code does not change.
//
// Page → app:  { ble: true, id, op, args }          op: scan | connect | disconnect | services | write
// App → page:  window.__rebornBleReply(id, ok, payload)  and  window.__rebornBleEvent(deviceId, "gattserverdisconnected")
export const BLE_SHIM = `
(function () {
  if (navigator.bluetooth || !window.ReactNativeWebView) return;
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
  function scanning() {
    var overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;color:#fff;font:16px sans-serif";
    overlay.textContent = "Looking for lights…";
    document.body.appendChild(overlay);
    return function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); };
  }

  var bluetooth = {
    requestDevice: function (options) {
      var stop = scanning();
      return call("scan", {}).then(function (list) { stop(); return choose(list); }, function (error) { stop(); throw error; }).then(makeDevice);
    }
  };
  try { Object.defineProperty(navigator, "bluetooth", { value: bluetooth, configurable: true }); } catch (e) { navigator.bluetooth = bluetooth; }
  window.__REBORN_NATIVE_BLE__ = true;
})();
true;
`;
