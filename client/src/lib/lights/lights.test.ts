import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { APP_EFFECTS, hsvToRgb, renderEffect, rgbToHsv, scaleRgb } from "./effects";
import { DEFAULT_MAX_LIVE, LightHub, type LightLink } from "./hub";
import { PROFILES, chooseProfile, profileForSaved, stylesSharingConnection, type ProfileId } from "./protocols";
import { restoreSavedLights } from "./bluetooth";

const hex = (bytes: number[]) => bytes.map((b) => b.toString(16).padStart(2, "0")).join(" ");
const service = (id: ProfileId) => PROFILES[id].service;

describe("light command bytes", () => {
  it("should send exactly the colours the duoCo app was seen sending (style 1)", () => {
    const { elk1 } = PROFILES;
    assert.equal(hex(elk1.colour({ r: 255, g: 0, b: 0 })), "7e 07 05 03 ff 00 00 10 ef");
    assert.equal(hex(elk1.colour({ r: 0, g: 255, b: 0 })), "7e 07 05 03 00 ff 00 10 ef");
    assert.equal(hex(elk1.colour({ r: 0, g: 0, b: 255 })), "7e 07 05 03 00 00 ff 10 ef");
    assert.equal(hex(elk1.colour({ r: 255, g: 255, b: 255 })), "7e 07 05 03 ff ff ff 10 ef");
  });

  it("should send exactly the power commands the duoCo app was seen sending (style 1)", () => {
    assert.equal(hex(PROFILES.elk1.power(true)), "7e 04 04 f0 00 01 ff 00 ef");
    assert.equal(hex(PROFILES.elk1.power(false)), "7e 04 04 00 00 00 ff 00 ef");
  });

  it("should start the built-in effects the duoCo app was seen starting (style 1)", () => {
    assert.equal(hex(PROFILES.elk1.builtIn(22, 50)[1]), "7e 05 03 9c 03 ff ff 00 ef"); // strobe white
    assert.equal(hex(PROFILES.elk1.builtIn(1, 100)[0]), "7e 07 02 64 00 00 00 00 ef");
    assert.equal(hex(PROFILES.elk1.builtIn(1, 100)[1]), "7e 05 03 87 03 ff ff 00 ef");
  });

  it("should keep the effect number inside the 22 built-in effects", () => {
    assert.equal(hex(PROFILES.elk1.builtIn(99, 50)[1]), "7e 05 03 9c 03 ff ff 00 ef");
    assert.equal(hex(PROFILES.elk1.builtIn(0, 50)[1]), "7e 05 03 87 03 ff ff 00 ef");
  });

  it("should build the older ELK-BLEDOM layout (style 2)", () => {
    const { elk2 } = PROFILES;
    assert.equal(hex(elk2.colour({ r: 255, g: 128, b: 0 })), "7e 00 05 03 ff 80 00 00 ef");
    assert.equal(hex(elk2.power(true)), "7e 00 04 f0 00 01 ff 00 ef");
    assert.equal(hex(elk2.power(false)), "7e 00 04 00 00 00 ff 00 ef");
    assert.equal(hex(elk2.builtIn(1, 100)[1]), "7e 00 03 87 03 00 00 00 ef");
  });

  it("should build the ELK-BLEDOB layout (style 3) with its wider speed range", () => {
    const { elk3 } = PROFILES;
    assert.equal(hex(elk3.power(true)), "7e 07 04 ff 00 01 02 01 ef");
    assert.equal(hex(elk3.power(false)), "7e 07 04 00 00 00 02 01 ef");
    assert.equal(hex(elk3.builtIn(1, 100)[0]), "7e 07 02 b7 00 00 00 00 ef");
  });

  it("should send LED- strips their channels in red, blue, green order", () => {
    assert.equal(hex(PROFILES.ledDash.colour({ r: 255, g: 128, b: 0 })), "7e 07 05 03 ff 00 80 00 ef");
    assert.equal(hex(PROFILES.ledble.colour({ r: 255, g: 128, b: 0 })), "7e 00 05 03 ff 80 00 00 ef");
    assert.equal(hex(PROFILES.ledble.power(true)), "7e 00 04 01 00 00 00 00 ef");
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
    assert.equal(hex(PROFILES.elk1.colour({ r: 300, g: -5, b: 12.6 })), "7e 07 05 03 ff 00 0d 10 ef");
  });

  it("should build the music commands for the lights that have a microphone", () => {
    const music = PROFILES.elk1.music!;
    assert.equal(hex(music.enable(true)), "7e 04 07 01 ff ff ff 00 ef");
    assert.equal(hex(music.enable(false)), "7e 04 07 00 ff ff ff 00 ef");
    assert.equal(hex(music.mode(1)), "7e 05 03 80 04 ff ff 00 ef");
    assert.equal(hex(music.mode(8)), "7e 05 03 87 04 ff ff 00 ef");
    assert.equal(hex(music.mode(99)), "7e 05 03 87 04 ff ff 00 ef");
    assert.equal(hex(music.sensitivity(70)), "7e 04 06 46 ff ff ff 00 ef");
    assert.equal(PROFILES.triones.music, undefined);
    assert.equal(PROFILES.ledble.music, undefined);
  });
});

describe("choosing the command style", () => {
  it("should pick the style from the name a light advertises", () => {
    const elk = [service("elk1")];
    assert.equal(chooseProfile("ELK-BLEDOM", elk)?.id, "elk1");
    assert.equal(chooseProfile("ELK-BLEDOB", elk)?.id, "elk3");
    assert.equal(chooseProfile("ELK-BLEDOM0E", elk)?.id, "elk3");
    assert.equal(chooseProfile("ELK-BLE", elk)?.id, "elk2");
    assert.equal(chooseProfile("ELK-BULB2", elk)?.id, "elk2");
    assert.equal(chooseProfile("Some other name", elk)?.id, "elk1");
  });

  it("should tell the two FFE0 families apart by name", () => {
    const ffe0 = [service("ledble")];
    assert.equal(chooseProfile("LEDBLE-1234", ffe0)?.id, "ledble");
    assert.equal(chooseProfile("LED-ABC", ffe0)?.id, "ledDash");
    assert.equal(chooseProfile("JACKYLED", ffe0)?.id, "ledDash");
  });

  it("should pick Triones from its service and refuse a light it does not know", () => {
    assert.equal(chooseProfile("anything", [service("triones")])?.id, "triones");
    assert.equal(chooseProfile("anything", [service("elk1").toUpperCase()])?.id, "elk1");
    assert.equal(chooseProfile("anything", ["0000ffe5-0000-1000-8000-00805f9b34fb"]), null);
  });

  it("should only offer styles that talk on the same characteristic", () => {
    assert.deepEqual(stylesSharingConnection(PROFILES.elk1).map((p) => p.id), ["elk1", "elk2", "elk3"]);
    assert.deepEqual(stylesSharingConnection(PROFILES.ledble).map((p) => p.id), ["ledble", "ledDash", "leddmx"]);
    assert.deepEqual(stylesSharingConnection(PROFILES.triones).map((p) => p.id), ["triones"]);
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
  const instant = () => Promise.resolve();

  interface Fake { id: string; frames: number[][][]; link: LightLink }
  function fleet(count: number, options: { failConnect?: string[]; profile?: ProfileId; maxLive?: number } = {}) {
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
    const hub = new LightHub({ now: () => 0, pause: instant, maxLive: options.maxLive });
    for (const light of lights) hub.addLight({ id: light.id, name: light.id, profileId: options.profile ?? "elk1" }, light.link);
    return { hub, lights, shared };
  }

  it("should send a colour to every light while never holding more than the connection limit", async () => {
    const { hub, lights, shared } = fleet(14);
    await hub.setColour({ r: 255, g: 0, b: 0 });
    for (const light of lights) assert.equal(hex(light.frames.at(-1)![0]), "7e 07 05 03 80 00 00 10 ef", light.id); // 50 percent brightness: 127.5 rounds up to 0x80
    assert.ok(shared.peak <= DEFAULT_MAX_LIVE, `peak ${shared.peak}`);
    hub.dispose();
  });

  it("should hold as many connections as the admin allows", async () => {
    const { hub, shared } = fleet(14, { maxLive: 10 });
    await hub.setColour({ r: 255, g: 0, b: 0 });
    assert.equal(shared.peak, 10);
    hub.setMaxLive(4);
    assert.equal(shared.live.size, 4);
    assert.equal(hub.getSnapshot().maxLive, 4);
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

  it("should only reach the lights that were ticked when Ticked is the target", async () => {
    const { hub, lights } = fleet(4);
    hub.toggleSelected("light-3");
    hub.setTarget({ kind: "selected" });
    await hub.setPower(false);
    assert.deepEqual(lights.map((light) => light.frames.length), [0, 0, 1, 0]);
    assert.equal(hex(lights[2].frames[0][0]), "7e 04 04 00 00 00 ff 00 ef");
    hub.dispose();
  });

  it("should switch the lights back on when a colour is chosen after power off", async () => {
    const { hub, lights } = fleet(1);
    await hub.setPower(false);
    await hub.setColour({ r: 0, g: 0, b: 255 });
    assert.deepEqual(lights[0].frames.at(-1)!.map(hex), ["7e 04 04 f0 00 01 ff 00 ef", "7e 07 05 03 00 00 80 10 ef"]);
    await hub.setColour({ r: 0, g: 0, b: 255 });
    assert.equal(lights[0].frames.at(-1)!.length, 1);
    hub.dispose();
  });

  it("should carry on with the other lights when one cannot be reached", async () => {
    const { hub, lights } = fleet(3, { failConnect: ["light-2"] });
    await hub.setColour({ r: 255, g: 255, b: 255 });
    assert.equal(hub.getSnapshot().lights[1].failure, "no answer");
    assert.equal(lights[0].frames.length, 1);
    assert.equal(lights[2].frames.length, 1);
    hub.dispose();
  });

  it("should end with the latest colour when several arrive while one is still being sent", async () => {
    const { hub, lights } = fleet(2);
    await Promise.all([hub.setColour({ r: 255, g: 0, b: 0 }), hub.setColour({ r: 0, g: 255, b: 0 }), hub.setColour({ r: 0, g: 0, b: 255 })]);
    for (const light of lights) assert.equal(hex(light.frames.at(-1)![0]), "7e 07 05 03 00 00 80 10 ef");
    hub.dispose();
  });

  it("should animate no more lights than the connection limit allows", async () => {
    const { hub, lights } = fleet(12);
    hub.startEffect("rainbow");
    await hub.renderFrame(0);
    assert.equal(hub.getSnapshot().animatedCount, DEFAULT_MAX_LIVE);
    assert.equal(lights.filter((light) => light.frames.length > 0).length, DEFAULT_MAX_LIVE);
    hub.dispose();
  });

  it("should not resend a colour that did not change between frames", async () => {
    const { hub, lights } = fleet(1);
    hub.startEffect("strobe");
    await new Promise<void>((resolve) => setTimeout(resolve, 20)); // the effect draws its own first frame as soon as it starts
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
    for (const light of lights) assert.equal(hex(light.frames.at(-1)![1]), "7e 05 03 89 03 ff ff 00 ef");
    hub.dispose();
  });

  it("should offer only the built-in effect numbers every targeted light has", () => {
    const hub = new LightHub({ now: () => 0 });
    const link = (): LightLink => ({ isLive: () => false, connect: async () => undefined, write: async () => undefined, disconnect: () => undefined });
    hub.addLight({ id: "a", name: "a", profileId: "elk1" }, link());
    hub.addLight({ id: "b", name: "b", profileId: "triones" }, link());
    assert.equal(hub.getSnapshot().builtInLimit, PROFILES.triones.builtInCount);
    hub.dispose();
  });

  it("should ignore a light that was added twice", () => {
    const { hub, lights } = fleet(1);
    assert.equal(hub.addLight({ id: lights[0].id, name: "again", profileId: "elk1" }, lights[0].link), false);
    assert.equal(hub.getSnapshot().lights.length, 1);
    hub.dispose();
  });

  it("should switch a light to another command style on the same characteristic and refuse one that is not", async () => {
    const { hub, lights } = fleet(1);
    hub.setStyle("light-1", "elk2");
    await hub.setColour({ r: 255, g: 0, b: 0 });
    assert.equal(hex(lights[0].frames.at(-1)![0]), "7e 00 05 03 80 00 00 00 ef");
    hub.setStyle("light-1", "triones");
    assert.equal(hub.getSnapshot().lights[0].profileId, "elk2");
    hub.dispose();
  });

  it("should flash red, green and blue on a light and then put its colour back", async () => {
    const { hub, lights } = fleet(2);
    await hub.testLight("light-1");
    assert.deepEqual(lights[0].frames.map((written) => written.map(hex)), [
      ["7e 04 04 f0 00 01 ff 00 ef", "7e 07 05 03 ff 00 00 10 ef"],
      ["7e 07 05 03 00 ff 00 10 ef"],
      ["7e 07 05 03 00 00 ff 10 ef"],
      ["7e 07 05 03 80 80 80 10 ef"],
    ]);
    assert.equal(lights[1].frames.length, 0);
    assert.equal(hub.getSnapshot().testingId, "");
    hub.dispose();
  });
});

describe("music mode", () => {
  const instant = () => Promise.resolve();
  function setup(profiles: ProfileId[]) {
    const hub = new LightHub({ now: () => 0, pause: instant });
    const lights = profiles.map((profileId, i) => {
      const frames: number[][][] = [];
      let isLive = false;
      const link: LightLink = {
        isLive: () => isLive,
        connect: async () => { isLive = true; },
        write: async (written) => { frames.push(written); },
        disconnect: () => { isLive = false; },
      };
      hub.addLight({ id: `light-${i + 1}`, name: `light-${i + 1}`, profileId }, link);
      return { frames };
    });
    return { hub, lights };
  }

  it("should tell the lights with a microphone to follow the music and skip the others", async () => {
    const { hub, lights } = setup(["elk1", "triones"]);
    await hub.playMusic(2);
    assert.deepEqual(lights[0].frames[0].map(hex), ["7e 04 07 01 ff ff ff 00 ef", "7e 05 03 81 04 ff ff 00 ef", "7e 04 06 3c ff ff ff 00 ef"]);
    assert.equal(lights[1].frames.length, 0);
    const view = hub.getSnapshot();
    assert.equal(view.musicCount, 1);
    assert.equal(view.musicLimit, 8);
    assert.equal(view.control.music, 2);
    hub.dispose();
  });

  it("should tell a light to stop listening before it shows a colour again", async () => {
    const { hub, lights } = setup(["elk1"]);
    await hub.playMusic(1);
    await hub.setColour({ r: 255, g: 0, b: 0 });
    assert.deepEqual(lights[0].frames.at(-1)!.map(hex), ["7e 04 07 00 ff ff ff 00 ef", "7e 07 05 03 80 00 00 10 ef"]);
    await hub.setColour({ r: 0, g: 255, b: 0 });
    assert.equal(lights[0].frames.at(-1)!.length, 1);
    hub.dispose();
  });

  it("should send only the new sensitivity while music plays, and nothing when it does not", async () => {
    const { hub, lights } = setup(["elk1"]);
    await hub.setSensitivity(90);
    assert.equal(lights[0].frames.length, 0);
    await hub.playMusic(1);
    await hub.setSensitivity(20);
    assert.deepEqual(lights[0].frames.at(-1)!.map(hex), ["7e 04 06 14 ff ff ff 00 ef"]);
    hub.dispose();
  });

  it("should leave music mode and show the colour again when music is stopped", async () => {
    const { hub, lights } = setup(["elk1"]);
    await hub.playMusic(3);
    await hub.stopMusic();
    assert.deepEqual(lights[0].frames.at(-1)!.map(hex), ["7e 04 07 00 ff ff ff 00 ef", "7e 07 05 03 80 80 80 10 ef"]);
    assert.equal(hub.getSnapshot().control.music, null);
    hub.dispose();
  });

  it("should report no music support when no targeted light has a microphone", () => {
    const { hub } = setup(["triones", "ledble"]);
    const view = hub.getSnapshot();
    assert.equal(view.musicCount, 0);
    assert.equal(view.musicLimit, 0);
    hub.dispose();
  });
});

describe("lights saved on the device", () => {
  it("should give back only the saved lights the device still knows, without connecting any", async () => {
    let connects = 0;
    const known = (id: string) => ({ id, name: "ELK-" + id, addEventListener() {}, gatt: { connected: false, connect: async () => { connects++; return {}; }, disconnect() {} } });
    const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: { bluetooth: { requestDevice: async () => known("x"), getDevices: async () => [known("AA"), known("BB")] } } });
    try {
      const restored = await restoreSavedLights([{ id: "AA", name: "Bar 1", profileId: "elk1", group: "Bar" }, { id: "ZZ", name: "Gone", profileId: "elk1" }]);
      assert.deepEqual(restored.map((light) => [light.info.id, light.info.name, light.group]), [["AA", "Bar 1", "Bar"]]);
      assert.equal(connects, 0);
    } finally { if (original) Object.defineProperty(globalThis, "navigator", original); else delete (globalThis as any).navigator; }
  });
});

describe("LEDDMX (LED LAMP) lights", () => {
  it("should send the 0x7B 0xFF colour frame", () => {
    assert.equal(hex(PROFILES.leddmx.colour({ r: 255, g: 128, b: 0 })), "7b ff 07 ff 80 00 00 ff bf");
  });
  it("should switch on and off with the 0x04 frame", () => {
    assert.equal(hex(PROFILES.leddmx.power(true)), "7b ff 04 01 ff ff ff ff bf");
    assert.equal(hex(PROFILES.leddmx.power(false)), "7b ff 04 00 ff ff ff ff bf");
  });
  it("should set the speed and then the effect", () => {
    assert.deepEqual(PROFILES.leddmx.builtIn(5, 60).map(hex), ["7b ff 02 3c ff 00 ff ff bf", "7b ff 03 05 ff ff ff ff bf"]);
  });
  it("should be chosen for a light named LEDDMX-03", () => {
    assert.equal(chooseProfile("LEDDMX-03-04D8", [service("ledble")])?.id, "leddmx");
  });
  it("should move a light saved as LEDBLE with an LEDDMX name to the LEDDMX style", () => {
    assert.equal(profileForSaved("LEDDMX-03-04D8", "ledble"), "leddmx");
    assert.equal(profileForSaved("LEDBLE-1234", "ledble"), "ledble");
  });
});
