// Virtual lights for trying the screen without any hardware. They connect slowly on purpose, like real ones do.
import type { LightInfo, LightLink } from "./hub";

const DEMO_CONNECT_MS = 350;
const DEMO_WRITE_MS = 25;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createDemoLight(number: number): { info: LightInfo; link: LightLink } {
  let isLive = false;
  return {
    info: { id: `demo-${number}`, name: `Demo light ${number}`, profileId: "elk1" },
    link: {
      isLive: () => isLive,
      connect: async () => { await sleep(DEMO_CONNECT_MS); isLive = true; },
      write: async () => { await sleep(DEMO_WRITE_MS); },
      disconnect: () => { isLive = false; },
    },
  };
}
