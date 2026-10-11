import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { APP_EFFECTS, hsvToRgb, renderEffect, rgbToHsv, scaleRgb } from "./effects";
import { LightHub, MAX_LIVE_LIGHTS, type LightLink } from "./hub";
import { PROFILES, detectProfile } from "./protocols";

const hex = (bytes: number[]) => bytes.map((b) => b.toString(16).padStart(2, "0")).join(" ");

describe("light command bytes", () => {
  it("should build the ELK-BLEDOM colour, power and effect commands", () => {
    const { elk } = PROFILES;
    assert.equal(hex(elk.colour({ r: 255, g: 128, b: 0 })), "7e 00 05 03 ff 80 00 00 ef");
    assert.equal(hex(elk.power(true)), "7e 00 04 f0 00 01 ff 00 ef");
    assert.equal(hex(elk.power(false)), "7e 00 04 00 00 00 ff 00 ef");
    assert.deepEqual(elk.builtIn(1, 100).map(hex), ["7e 00 02 64 00 00 00 00 ef", "7e 00 03 80 03 00 00 00 ef"]);
  });

  it("should keep the ELK-BLEDOM effect number inside its 29 built-in effects", () => {
    assert.equal(hex(PROFILES.elk.builtIn(29, 50)[1]), "7e 00 03 9c 03 00 00 00 ef");
    assert.equal(hex(PROFILES.elk.builtIn(99, 50)[1]), "7e 00 03 9c 03 00 00 00 ef");
  });

  it("should build the Triones colour and power commands", () => {
    const { triones } = PROFILES;
    assert.equal(hex(triones.colour({ r: 255, g: 128, b: 0 })), "56 ff 80 00 00 f0 aa");
    assert.equal(hex(triones.power(true)), "cc 23 33");
    assert.equal(hex(triones.power(false)), "cc 24 33");
  });

  it("should map Triones speed so 100 percent is the fastest setting", () => {
    assert.equal(hex(PROFILES.triones.builtIn(1, 100)[0]), "bb 25 01 44");
    assert.equal(hex(PROFILES.triones.builtIn(20, 0)[0]), "bb 38 1f 44");
  });

  it("should clamp colour channels to a byte", () => {
    assert.equal(hex(PROFILES.elk.colour({ r: 300, g: -5, b: 12.6 })), "7e 00 05 03 ff 00 0d 00 ef");
  });

  it("should pick the profile from the services a light offers", () => {
    assert.equal(detectProfile([PROFILES.triones.service])?.id, "triones");
    assert.equal(detectProfile([PROFILES.elk.service.toUpperCase()])?.id, "elk");
    assert.equal(detectProfile(["0000ffe0-0000-1000-8000-00805f9b34fb"]), null);
  });
});

describe("movement effects", () => {
  const base = { r: 200, g: 100, b: 50 };
  const frame = (time: number, index = 0, count = 10, speed = 50) => ({ time, index, count, base, speed });

  it("should convert colours between RGB and HSV without drifting", () => {
    assert.deepEqual(hsvToRgb(0, 1, 1), { r: 255, g: 0, b: 0 });
    assert.deepEqual(hsvToRgb(120, 1, 1), { r: 0, g: 255, b: 0 });
    assert.deepEqual(hsvToRgb(240, 1, 1), { r: 0, g: 0, b: 255 });
    const round = rgbToHsv({ r: 200, g: 100, b: 50 });
    assert.deepEqual(hsvToRgb(round.h, round.s, round.v), { r: 200, g: 100, b: 50 });
  });

  it("should scale a colour and never go below black or above the original", () => {
    assert.deepEqual(scaleRgb(base, 0.5), { r: 100, g: 50, b: 25 });
    assert.deepEqual(scaleRgb(base, 2), base);
    assert.deepEqual(scaleRgb(base, -1), { r: 0, g: 0, b: 0 });
  });

  it("should give each light its own hue in the rainbow", () => {
    assert.notDeepEqual(renderEffect("rainbow", frame(0, 0)), renderEffect("rainbow", frame(0, 5)));
  });

  it("should never flash faster than three times a second", () => {
    for (const speed of [1, 50, 100]) {
      let lastOn = true;
      let changes = 0;
      for (let t = 0; t < 1; t += 0.01) {
        const isOn = renderEffect("strobe", frame(t, 0, 1, speed)).r > 0;
        if (isOn !== lastOn) changes++;
        lastOn = isOn;
      }
      assert.ok(changes <= 6, `speed ${speed}: ${changes} changes in one second`);
    }
  });

  it("should put the brightest part of the chase on the light at its head", () => {
    const head = renderEffect("chase", frame(0, 0));
    const far = renderEffect("chase", frame(0, 5));
    assert.deepEqual(head, base);
    assert.ok(far.r < head.r);
  });

  it("should repeat the same twinkle for the same light and moment", () => {
    assert.deepEqual(renderEffect("twinkle", frame(1.3, 3)), renderEffect("twinkle", frame(1.3, 3)));
  });

  it("should keep every effect inside the colour range", () => {
    for (const effect of APP_EFFECTS) {
      for (let t = 0; t < 5; t += 0.37) {
        const { r, g, b } = renderEffect(effect, frame(t, 2));
        for (const value of [r, g, b]) assert.ok(Number.isInteger(value) && value >= 0 && value <= 255, `${effect} at ${t}`);
      }
    }
  });
});

describe("light hub", () => {
  const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  interface Fake { id: string; frames: number[][][]; link: LightLink }
  function fleet(count: number, options: { failConnect?: string[] } = {}) {
    const shared = { live: new Set<string>(), peak: 0 };
    const lights: Fake[] = Array.from({ length: count }, (_, i) => {
      const id = `light-${i + 1}`;
      const frames: number[][][] = [];
      let isLive = false;
      const link: LightLink = {
        isLive: () => isLive,
        connect: async () => {
          await settle();
          if (options.failConnect?.includes(id)) throw new Error("no answer");
          isLive = true;
          shared.live.add(id);
          shared.peak = Math.max(shared.peak, shared.live.size);
        },
        write: async (written) => { frames.push(written); },
        disconnect: () => { isLive = false; shared.live.delete(id); },
      };
      return { id, frames, link };
    });
    const hub = new LightHub(() => 0);
    for (const light of lights) hub.addLight({ id: light.id, name: light.id, profileId: "elk" }, light.link);
    return { hub, lights, shared };
  }

  it("should send a colour to every light while never holding more than the connection limit", async () => {
    const { hub, lights, shared } = fleet(14);
    await hub.setColour({ r: 255, g: 0, b: 0 });
    for (const light of lights) assert.equal(hex(light.frames.at(-1)![0]), "7e 00 05 03 80 00 00 00 ef", light.id); // 50 percent brightness: 127.5 rounds up to 0x80
    assert.ok(shared.peak <= MAX_LIVE_LIGHTS, `peak ${shared.peak}`);
    hub.dispose();
  });

  it("should only reach the lights of the chosen group", async () => {
    const { hub, lights } = fleet(6);
    ["light-1", "light-2"].forEach((id) => hub.setGroup(id, "Floor 1"));
    hub.setTarget({ kind: "group", group: "Floor 1" });
    await hub.setColour({ r: 0, g: 255, b: 0 });
    assert.deepEqual(lights.map((light) => light.frames.length), [1, 1, 0, 0, 0, 0]);
    hub.dispose();
  });

  it("should only reach the lights that were ticked when Selected is the target", async () => {
    const { hub, lights } = fleet(4);
    hub.toggleSelected("light-3");
    hub.setTarget({ kind: "selected" });
    await hub.setPower(false);
    assert.deepEqual(lights.map((light) => light.frames.length), [0, 0, 1, 0]);
    assert.equal(hex(lights[2].frames[0][0]), "7e 00 04 00 00 00 ff 00 ef");
    hub.dispose();
  });

  it("should switch the lights back on when a colour is chosen after power off", async () => {
    const { hub, lights } = fleet(1);
    await hub.setPower(false);
    await hub.setColour({ r: 0, g: 0, b: 255 });
    assert.deepEqual(lights[0].frames.at(-1)!.map(hex), ["7e 00 04 f0 00 01 ff 00 ef", "7e 00 05 03 00 00 80 00 ef"]);
    await hub.setColour({ r: 0, g: 0, b: 255 });
    assert.equal(lights[0].frames.at(-1)!.length, 1);
    hub.dispose();
  });

  it("should carry on with the other lights when one cannot be reached", async () => {
    const { hub, lights } = fleet(3, { failConnect: ["light-2"] });
    await hub.setColour({ r: 255, g: 255, b: 255 });
    const view = hub.getSnapshot();
    assert.equal(view.lights[1].failure, "no answer");
    assert.equal(lights[0].frames.length, 1);
    assert.equal(lights[2].frames.length, 1);
    hub.dispose();
  });

  it("should end with the latest colour when several arrive while one is still being sent", async () => {
    const { hub, lights } = fleet(2);
    const sent = [hub.setColour({ r: 255, g: 0, b: 0 }), hub.setColour({ r: 0, g: 255, b: 0 }), hub.setColour({ r: 0, g: 0, b: 255 })];
    await Promise.all(sent);
    for (const light of lights) assert.equal(hex(light.frames.at(-1)![0]), "7e 00 05 03 00 00 80 00 ef");
    hub.dispose();
  });

  it("should animate no more lights than the connection limit allows", async () => {
    const { hub, lights } = fleet(12);
    hub.startEffect("rainbow");
    await hub.renderFrame(0);
    assert.equal(hub.getSnapshot().animatedCount, MAX_LIVE_LIGHTS);
    assert.equal(lights.filter((light) => light.frames.length > 0).length, MAX_LIVE_LIGHTS);
    hub.dispose();
  });

  it("should not resend a colour that did not change between frames", async () => {
    const { hub, lights } = fleet(1);
    hub.startEffect("strobe");
    await settle(); // the effect draws its own first frame as soon as it starts
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
    await hub.renderFrame(0);
    await hub.renderFrame(0.01);
    assert.equal(lights[0].frames.length, 1);
    hub.dispose();
  });

  it("should send a built-in effect to every selected light and stop the app effect", async () => {
    const { hub, lights } = fleet(3);
    hub.startEffect("chase");
    await hub.playBuiltIn(3);
    assert.equal(hub.getSnapshot().control.effect, null);
    for (const light of lights) assert.equal(hex(light.frames.at(-1)![1]), "7e 00 03 82 03 00 00 00 ef");
    hub.dispose();
  });

  it("should offer only the built-in effect numbers every targeted light has", () => {
    const hub = new LightHub(() => 0);
    const link = (): LightLink => ({ isLive: () => false, connect: async () => undefined, write: async () => undefined, disconnect: () => undefined });
    hub.addLight({ id: "a", name: "a", profileId: "elk" }, link());
    hub.addLight({ id: "b", name: "b", profileId: "triones" }, link());
    assert.equal(hub.getSnapshot().builtInLimit, PROFILES.triones.builtInCount);
    hub.dispose();
  });

  it("should ignore a light that was added twice", () => {
    const { hub, lights } = fleet(1);
    assert.equal(hub.addLight({ id: lights[0].id, name: "again", profileId: "elk" }, lights[0].link), false);
    assert.equal(hub.getSnapshot().lights.length, 1);
    hub.dispose();
  });
});
