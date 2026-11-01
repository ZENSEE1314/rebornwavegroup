import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { cameraSetupBat, cleanSetupCameras } from "./cameraSetup";

const camera = { name: "Front door", host: "192.168.100.240", user: "admin", password: "p\"w&d%1", channel: 1 };
const input = { cloudUrl: "https://rebornwave.group", token: "ABC123DEF456", tenantSlug: "", cameras: [camera] };
const configOf = (bat: string) => JSON.parse(Buffer.from(/FromBase64String\('([^']+)'\)/.exec(bat)![1], "base64").toString("utf8"));

describe("cameraSetupBat", () => {
  it("should get the bridge program from the same address", () => {
    assert.ok(cameraSetupBat(input).includes("https://rebornwave.group/api/camera/bridge.mjs"));
  });
  it("should write the cameras, address and token into the config file", () => {
    const config = configOf(cameraSetupBat(input));
    assert.deepEqual([config.cameras[0].id, config.cameras[0].host, config.cloudUrl, config.cloudToken], ["cam1", "192.168.100.240", "https://rebornwave.group", "ABC123DEF456"]);
  });
  it("should keep a password with symbols intact and out of the command line", () => {
    const bat = cameraSetupBat(input);
    assert.ok(configOf(bat).cameras[0].password === "p\"w&d%1" && !bat.includes("p\"w&d"));
  });
  it("should carry the company name for a company on the shared host", () => {
    assert.equal(configOf(cameraSetupBat({ ...input, tenantSlug: "my-club" })).tenantSlug, "my-club");
  });
  it("should refuse a token a command line could misread", () => {
    assert.throws(() => cameraSetupBat({ ...input, token: "x & del *" }));
  });
});

describe("cleanSetupCameras", () => {
  it("should drop a camera with no password", () => {
    assert.equal(cleanSetupCameras([{ host: "192.168.1.5", user: "admin", password: "" }]), null);
  });
  it("should refuse a host with a space or symbol", () => {
    assert.equal(cleanSetupCameras([{ host: "1.2.3.4 && calc", user: "a", password: "b" }]), null);
  });
  it("should name an unnamed camera and default the channel to 1", () => {
    const [cam] = cleanSetupCameras([{ host: "192.168.1.5", user: "a", password: "b" }])!;
    assert.deepEqual([cam.name, cam.channel], ["Camera 1", 1]);
  });
});
