import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./games.ts", import.meta.url), "utf8");
const joinRoute = source.slice(source.indexOf('"/api/reborn/games/rooms/:code/join"'), source.indexOf('"/api/reborn/games/rooms/:code/start"'));

describe("games room join route", () => {
  it("should look up the name before the last already-joined check", () => {
    const lookup = joinRoute.indexOf("await nameFor(uid)");
    const lastCheck = joinRoute.lastIndexOf("room.players.some((p) => p.id === uid)");
    assert.ok(lookup > 0 && lastCheck > lookup);
  });

  it("should add the player with no await after the last already-joined check", () => {
    const lastCheck = joinRoute.lastIndexOf("room.players.some((p) => p.id === uid)");
    const push = joinRoute.indexOf("room.players.push(");
    assert.ok(push > lastCheck && !joinRoute.slice(lastCheck, push).includes("await"));
  });
});
