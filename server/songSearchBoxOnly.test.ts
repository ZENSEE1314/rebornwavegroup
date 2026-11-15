import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const server = readFileSync(new URL("./rebornGame.ts", import.meta.url), "utf8");
const route = server.slice(server.indexOf('app.get("/api/reborn/songs/search"'), server.indexOf('app.post("/api/reborn/songs/request"'));
const boxBranch = route.slice(route.indexOf("if (query && isBoxOnline(companyKey))"), route.indexOf("await seedSongsIfEmpty()"));

describe("song search with the song system connected", () => {
  it("should ask only the box and not the library or the outside catalogs", () => {
    assert.ok(boxBranch.includes("searchKaraokeBox(companyKey, query)") && !boxBranch.includes("searchSongCatalog"));
  });

  it("should tell the screen to search again when the box did not answer in time", () => {
    assert.ok(boxBranch.includes("slow: true") && boxBranch.includes("boxConnected: true"));
  });

  it("should still use the library and catalogs when the song system is offline", () => {
    assert.ok(route.includes("await searchSongCatalog(req.query.q, 10, 100)") || route.includes("searchSongCatalog(req.query.q, 10, 100)"));
  });
});
