// The little that the karaoke bridge needs from Node.js, given to it inside the Android app's hidden page (a WebView).
// Everything that touches the network, the clock or a file goes to the app itself (`AndroidHost`, BridgeHost.java):
// the page has no cross-origin rules to fight and its timers cannot be slowed down by the system.
// Written in plain ES2015 on purpose: it is put in front of the bundle as it is (not rewritten by the build).
(function () {
  var host = window.AndroidHost;
  var requests = {};
  var timers = {};
  var nextId = 1;
  var DEFAULT_TIMEOUT_MS = 30000;

  window.__hostHttp = function (id, status, headersJson, bodyBase64, error) {
    var pending = requests[id];
    if (!pending) return;
    delete requests[id];
    if (error) pending.reject(new Error(error));
    else pending.resolve({ status: status, headers: JSON.parse(headersJson || "{}"), base64: bodyBase64 || "" });
  };
  window.__hostWake = function (id) {
    var run = timers[id];
    delete timers[id];
    if (run) run();
  };

  function toBytes(base64) {
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function toResponse(answer) {
    var bytes = null;
    var read = function () { if (!bytes) bytes = toBytes(answer.base64); return bytes; };
    var response = {
      ok: answer.status >= 200 && answer.status < 300,
      status: answer.status,
      headers: { get: function (name) { var value = answer.headers[String(name).toLowerCase()]; return value === undefined ? null : value; } },
      text: function () { return Promise.resolve(new TextDecoder("utf-8").decode(read())); },
      json: function () { return response.text().then(JSON.parse); },
      arrayBuffer: function () { var all = read(); return Promise.resolve(all.buffer.slice(all.byteOffset, all.byteOffset + all.byteLength)); },
    };
    return response;
  }

  window.fetch = function (url, options) {
    var init = options || {};
    var id = nextId++;
    var timeout = (init.signal && init.signal.timeoutMs) || DEFAULT_TIMEOUT_MS;
    return new Promise(function (resolve, reject) {
      requests[id] = { resolve: function (answer) { resolve(toResponse(answer)); }, reject: reject };
      host.http(id, String(init.method || "GET"), String(url), JSON.stringify(init.headers || {}), init.body === undefined || init.body === null ? "" : String(init.body), timeout);
    });
  };

  // The page's own AbortSignal.timeout would cancel nothing here: the app watches the clock, so the fetch above only needs the number.
  window.AbortSignal = { timeout: function (ms) { return { timeoutMs: ms }; } };

  window.setTimeout = function (run, ms) {
    var id = nextId++;
    timers[id] = run;
    host.sleep(id, Math.max(0, Math.floor(Number(ms) || 0)));
    return id;
  };

  window.Buffer = {
    from: function (arrayBuffer) {
      var bytes = new Uint8Array(arrayBuffer);
      return { toString: function () { var text = ""; for (var i = 0; i < bytes.length; i++) text += String.fromCharCode(bytes[i]); return btoa(text); } };
    },
  };

  window.process = { env: {}, argv: [] };

  var say = function () { host.log(Array.prototype.slice.call(arguments).join(" ")); };
  window.console = { log: say, info: say, warn: say, error: say };
})();
