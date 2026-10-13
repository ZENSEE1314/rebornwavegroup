import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BLE_SHIM } from "./bleShim";

type Sent = { ble: true; id: number; op: string; args: Record<string, unknown> };

// A minimal page: the shim talks to `window`, `navigator` and `document`; the "app" side answers through __rebornBleReply.
function startPage(answer: (call: Sent) => unknown) {
  const sent: Sent[] = [];
  const buttons: Array<{ textContent: string; onclick: () => void }> = [];
  const make = (): any => ({ style: {}, children: [] as any[], appendChild(child: any) { this.children.push(child); if ("onclick" in child || child.textContent) buttons.push(child); return child; }, removeChild() {}, set onclick(fn: () => void) { (this as any)._onclick = fn; }, get onclick() { return (this as any)._onclick; } });
  const page: any = { navigator: {}, document: { createElement: () => make(), body: make() }, btoa: (text: string) => Buffer.from(text, "binary").toString("base64") };
  page.window = page;
  page.ReactNativeWebView = { postMessage(raw: string) { const call = JSON.parse(raw) as Sent; sent.push(call); queueMicrotask(() => { try { page.__rebornBleReply(call.id, true, answer(call)); } catch (error) { page.__rebornBleReply(call.id, false, (error as Error).message); } }); } };
  new Function("window", "navigator", "document", "btoa", "ReactNativeWebView", BLE_SHIM)(page, page.navigator, page.document, page.btoa, page.ReactNativeWebView);
  return { page, sent, buttons };
}

const light = { id: "AA:BB", name: "ELK-BLEDOM01" };
const answer = (call: Sent) => ({ scan: [light], connect: true, services: ["0000fff0-0000-1000-8000-00805f9b34fb"], write: true, disconnect: true } as Record<string, unknown>)[call.op];

describe("Web Bluetooth inside the app", () => {
  it("should provide navigator.bluetooth", () => { const { page } = startPage(answer); assert.equal(typeof page.navigator.bluetooth.requestDevice, "function"); });

  it("should not replace a Bluetooth the browser already has", () => {
    const sent: unknown[] = [];
    const page: any = { navigator: { bluetooth: "real" }, ReactNativeWebView: { postMessage: (m: unknown) => sent.push(m) } };
    new Function("window", "navigator", "document", "btoa", "ReactNativeWebView", BLE_SHIM)(page, page.navigator, {}, () => "", page.ReactNativeWebView);
    assert.equal(page.navigator.bluetooth, "real");
  });

  it("should list the lights the app found and give back the one tapped", async () => {
    const { page, buttons } = startPage(answer);
    const pending = page.navigator.bluetooth.requestDevice({ acceptAllDevices: true });
    await new Promise((resolve) => setTimeout(resolve, 5));
    buttons.find((button) => button.textContent === "ELK-BLEDOM01")!.onclick();
    const device = await pending;
    assert.deepEqual([device.id, device.name], ["AA:BB", "ELK-BLEDOM01"]);
  });

  it("should fail like the browser (NotFoundError) when the chooser is cancelled", async () => {
    const { page, buttons } = startPage(answer);
    const pending = page.navigator.bluetooth.requestDevice({});
    await new Promise((resolve) => setTimeout(resolve, 5));
    buttons.find((button) => button.textContent === "Cancel")!.onclick();
    await assert.rejects(pending, (error: Error) => error.name === "NotFoundError");
  });

  it("should connect, find the services and write a colour as base64", async () => {
    const { page, sent, buttons } = startPage(answer);
    const pending = page.navigator.bluetooth.requestDevice({});
    await new Promise((resolve) => setTimeout(resolve, 5));
    buttons.find((button) => button.textContent === "ELK-BLEDOM01")!.onclick();
    const device = await pending;
    const server = await device.gatt.connect();
    assert.equal(server.connected, true);
    const services = await server.getPrimaryServices();
    assert.deepEqual(services.map((service: { uuid: string }) => service.uuid), ["0000fff0-0000-1000-8000-00805f9b34fb"]);
    const characteristic = await (await server.getPrimaryService("0000FFF0-0000-1000-8000-00805F9B34FB")).getCharacteristic("0000fff3-0000-1000-8000-00805f9b34fb");
    await characteristic.writeValueWithoutResponse(new Uint8Array([0x7e, 0x07, 0x05, 0x03, 255, 0, 0, 0x10, 0xef]));
    const write = sent.find((call) => call.op === "write")!;
    assert.deepEqual([write.args.service, write.args.characteristic, write.args.response], ["0000fff0-0000-1000-8000-00805f9b34fb", "0000fff3-0000-1000-8000-00805f9b34fb", false]);
    assert.equal(Buffer.from(String(write.args.data), "base64").toString("hex"), "7e07050 3ff000010ef".replace(" ", ""));
  });

  it("should tell the page when the light drops the connection", async () => {
    const { page, buttons } = startPage(answer);
    const pending = page.navigator.bluetooth.requestDevice({});
    await new Promise((resolve) => setTimeout(resolve, 5));
    buttons.find((button) => button.textContent === "ELK-BLEDOM01")!.onclick();
    const device = await pending;
    await device.gatt.connect();
    let dropped = false;
    device.addEventListener("gattserverdisconnected", () => { dropped = true; });
    page.__rebornBleEvent("AA:BB", "gattserverdisconnected");
    assert.deepEqual([dropped, device.gatt.connected], [true, false]);
  });

  it("should pass a native error to the page", async () => {
    const { page } = startPage((call) => { if (call.op === "scan") throw new Error("Bluetooth is switched off. Turn it on and try again."); return null; });
    await assert.rejects(page.navigator.bluetooth.requestDevice({}), /switched off/);
  });
});
