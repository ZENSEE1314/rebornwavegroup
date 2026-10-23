import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RateLimiter, sessionSecret } from "./webSecurity";

describe("RateLimiter", () => {
  const minute = 60_000;
  it("should allow tries up to the maximum", () => {
    const limiter = new RateLimiter(10 * minute, 3, () => 0);
    assert.deepEqual([1, 2, 3].map(() => limiter.take("a").allowed), [true, true, true]);
  });
  it("should refuse the try after the maximum", () => {
    const limiter = new RateLimiter(10 * minute, 3, () => 0);
    for (let i = 0; i < 3; i++) limiter.take("a");
    assert.equal(limiter.take("a").allowed, false);
  });
  it("should say how long to wait", () => {
    const limiter = new RateLimiter(10 * minute, 1, () => 0);
    limiter.take("a");
    assert.equal(limiter.take("a").retryAfterSeconds, 600);
  });
  it("should count each key on its own", () => {
    const limiter = new RateLimiter(10 * minute, 1, () => 0);
    limiter.take("a");
    assert.equal(limiter.take("b").allowed, true);
  });
  it("should allow tries again once the window has passed", () => {
    let clock = 0;
    const limiter = new RateLimiter(10 * minute, 1, () => clock);
    limiter.take("a");
    clock = 10 * minute + 1;
    assert.equal(limiter.take("a").allowed, true);
  });
});

describe("sessionSecret", () => {
  it("should use the secret of the host when it is long enough", () => {
    process.env.SESSION_SECRET = "a-long-secret-from-the-host";
    assert.equal(sessionSecret(), "a-long-secret-from-the-host");
  });
  it("should never fall back to a fixed word", () => {
    process.env.SESSION_SECRET = "short";
    const secret = sessionSecret();
    assert.ok(secret.length >= 32 && secret !== "fallback-secret-for-dev");
  });
});

import { createHmac } from "node:crypto";
import { verifyMetaSignature } from "./webSecurity";

describe("verifyMetaSignature", () => {
  const body = Buffer.from('{"object":"whatsapp_business_account"}');
  const signed = (secret: string) => "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  it("should accept a call signed with the app secret", () => assert.equal(verifyMetaSignature(body, signed("app-secret"), "app-secret"), "ok"));
  it("should refuse a call signed with another secret", () => assert.equal(verifyMetaSignature(body, signed("other"), "app-secret"), "bad"));
  it("should refuse a call with no signature", () => assert.equal(verifyMetaSignature(body, undefined, "app-secret"), "bad"));
  it("should refuse a call whose body was changed", () => assert.equal(verifyMetaSignature(Buffer.from("{}"), signed("app-secret"), "app-secret"), "bad"));
  it("should say it cannot check when no app secret is known", () => assert.equal(verifyMetaSignature(body, signed("x"), ""), "unverifiable"));
});

import { contentSecurityPolicy, cspMode } from "./webSecurity";

describe("contentSecurityPolicy", () => {
  const directives = contentSecurityPolicy().split("; ");
  it("should forbid plugins and objects", () => assert.ok(directives.includes("object-src 'none'")));
  it("should not let a page change its base address", () => assert.ok(directives.includes("base-uri 'self'")));
  it("should send forms only to this site", () => assert.ok(directives.includes("form-action 'self'")));
  it("should not let other sites frame this one", () => assert.ok(directives.includes("frame-ancestors 'self'")));
  it("should not allow scripts from any https site", () => assert.ok(!directives.find((d) => d.startsWith("script-src"))!.split(" ").includes("https:")));
  it("should not allow eval in scripts", () => assert.ok(!contentSecurityPolicy().includes("'unsafe-eval'")));
});

describe("cspMode", () => {
  it("should enforce when nothing is set", () => assert.equal(cspMode(undefined), "enforce"));
  it("should only report when asked", () => assert.equal(cspMode("report-only"), "report-only"));
  it("should switch off when asked", () => assert.equal(cspMode("off"), "off"));
  it("should enforce for an unknown word", () => assert.equal(cspMode("banana"), "enforce"));
});
