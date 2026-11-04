import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { karaokeSetupBat } from "./karaokeSetup";
import { readFileSync } from "node:fs";

const input = { cloudUrl: "https://rebornwave.group", token: "ABC123DEF456", tenantSlug: "" };

describe("karaokeSetupBat", () => {
  it("should carry the address and token", () => {
    const bat = karaokeSetupBat(input);
    assert.ok(bat.includes("set CLOUD_URL=https://rebornwave.group") && bat.includes("set KARAOKE_TOKEN=ABC123DEF456"));
  });
  it("should get the bridge program from the same address", () => {
    assert.ok(karaokeSetupBat(input).includes("https://rebornwave.group/api/karaoke/bridge.mjs"));
  });
  it("should carry the company name for a company on the shared host", () => {
    assert.ok(karaokeSetupBat({ ...input, tenantSlug: "my-club" }).includes("set TENANT_SLUG=my-club"));
  });
  it("should not set a box address (the bridge finds the box)", () => {
    assert.ok(!karaokeSetupBat(input).includes("BOX_URL"));
  });
  it("should use Windows line endings", () => {
    assert.ok(karaokeSetupBat(input).split("\r\n").length > 10);
  });
  it("should refuse a value a command line could misread", () => {
    assert.throws(() => karaokeSetupBat({ ...input, token: "x & del *" }));
  });
});

describe("Android TV setup script", () => {
  const script = readFileSync("venue/android-tv-setup.sh", "utf8");
  it("should fetch the bridge from the app", () => {
    assert.ok(script.includes('"$CLOUD_URL/api/karaoke/bridge.mjs"'));
  });
  it("should ask for the token instead of holding one", () => {
    assert.ok(script.includes("read -r -p") && script.includes("< /dev/tty"));
  });
  it("should start again after the TV restarts", () => {
    assert.ok(script.includes(".termux/boot"));
  });
});
