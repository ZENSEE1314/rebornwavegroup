import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const alarm = read("./staff-alarm.ts");
const layout = read("../components/RebornLayout.tsx");

describe("staff alarm on every kind of phone", () => {
  it("should flash the screen with every ring so a phone that cannot vibrate still shows it", () => {
    assert.ok(alarm.includes("flash();") && read("../index.css").includes("html.rw-alarm-flash::after"));
  });

  it("should ask for the one touch that lets a phone beep and vibrate", () => {
    assert.ok(layout.includes("<AlarmEnableBar />") && alarm.includes('addEventListener("pointerdown", unlock)'));
  });

  it("should be rung by all three staff alerts", () => {
    for (const name of ["NewOrderAlert", "ReadyItemsAlert", "ServiceCallAlert"]) assert.ok(read(`../components/${name}.tsx`).includes("ringAlarm(VIBRATION);"), name);
  });

  it("should say so on a phone whose browser cannot vibrate", () => {
    assert.ok(read("../components/AlarmEnableBar.tsx").includes("!canVibrate()"));
  });
});
