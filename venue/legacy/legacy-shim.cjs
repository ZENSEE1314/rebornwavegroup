// Windows 7 can only run Node.js 12, which has no fetch() and no AbortSignal.timeout(). This gives the karaoke bridge the little it uses of both.
// Written in plain ES2018 on purpose: it is put in front of the bundle as it is (not rewritten by the build).
(function () {
  if (typeof AbortSignal === "undefined") globalThis.AbortSignal = function AbortSignal() {};
  if (typeof AbortSignal.timeout !== "function") AbortSignal.timeout = function (ms) { return { timeoutMs: ms }; };
  if (typeof globalThis.fetch === "function") return;

  var http = require("http");
  var https = require("https");
  var MAX_REDIRECTS = 5;

  function request(target, options, redirects) {
    return new Promise(function (resolve, reject) {
      var url = new URL(target);
      var headers = Object.assign({}, options.headers || {});
      var body = options.body === undefined || options.body === null ? null : Buffer.from(String(options.body));
      if (body && !headers["content-length"]) headers["content-length"] = body.length;
      var timer = null;
      var req = (url.protocol === "https:" ? https : http).request(url, { method: options.method || "GET", headers: headers }, function (res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects < MAX_REDIRECTS) {
          res.resume();
          clearTimeout(timer);
          resolve(request(new URL(res.headers.location, url).href, options, redirects + 1));
          return;
        }
        var chunks = [];
        res.on("data", function (chunk) { chunks.push(chunk); });
        res.on("error", function (error) { clearTimeout(timer); reject(error); });
        res.on("end", function () {
          clearTimeout(timer);
          var data = Buffer.concat(chunks);
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            headers: { get: function (name) { var value = res.headers[String(name).toLowerCase()]; return value === undefined ? null : String(value); } },
            text: function () { return Promise.resolve(data.toString("utf8")); },
            json: function () { return new Promise(function (done, fail) { try { done(JSON.parse(data.toString("utf8"))); } catch (error) { fail(error); } }); },
            arrayBuffer: function () { return Promise.resolve(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)); },
          });
        });
      });
      req.on("error", function (error) { clearTimeout(timer); reject(error); });
      var timeoutMs = options.signal && options.signal.timeoutMs;
      if (timeoutMs) timer = setTimeout(function () { req.destroy(new Error("The operation timed out")); }, timeoutMs);
      if (body) req.write(body);
      req.end();
    });
  }

  globalThis.fetch = function (target, options) { return request(String(target), options || {}, 0); };
})();
