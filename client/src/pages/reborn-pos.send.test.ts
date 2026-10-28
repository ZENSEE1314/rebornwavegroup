import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("client/src/pages/reborn-pos.tsx", "utf8");

describe("POS add items to a bill", () => {
  it("should keep the picked items until the server took them", () => assert.match(source, /sent instanceof Promise\) sent\.then\(\(\) => setCart\(\{\}\)/));
  it("should send the add-items request again with the same key when the connection dropped", () => assert.match(source, /mutationFn: \(items: any\[\]\) => postWithRetry\(`\/api\/reborn\/pos\/orders\/\$\{order\.id\}\/items`/));
  it("should try again only when the connection dropped", () => assert.match(source, /error\?\.message !== translate\("srv\.err\.offline"\) \|\| attempt >= SEND_RETRIES/));
});
