import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { FAQ_FILE_MAX_BYTES, cleanFileName, isImageMime, isInlineMime, mimeFor, parseLink, parseUpload } from "./faqFileRules";

const bot = readFileSync(new URL("../server/whatsappBot.ts", import.meta.url), "utf8");
const faqRoutes = readFileSync(new URL("../server/faqFiles.ts", import.meta.url), "utf8");

describe("FAQ file names and types", () => {
  it("should keep only the file name of a path", () => {
    assert.equal(cleanFileName("C:\\menus\\Menu 2026.pdf"), "Menu 2026.pdf");
  });

  it("should call an apk an apk even when the browser says octet-stream", () => {
    assert.equal(mimeFor("Reborn.apk", "application/octet-stream"), "application/vnd.android.package-archive");
  });

  it("should treat a png as a picture and an apk as a file", () => {
    assert.deepEqual([isImageMime("image/png"), isImageMime("application/vnd.android.package-archive")], [true, false]);
  });

  it("should never show an uploaded web page or svg inline", () => {
    assert.deepEqual([isInlineMime("text/html"), isInlineMime("image/svg+xml")], [false, false]);
  });
});

describe("FAQ upload checks", () => {
  it("should read a picture sent as a data url", () => {
    const upload = parseUpload({ name: "menu.png", data: `data:image/png;base64,${Buffer.from("abc").toString("base64")}` });
    assert.deepEqual("error" in upload ? null : [upload.name, upload.mime, upload.data.toString()], ["menu.png", "image/png", "abc"]);
  });

  it("should refuse a file bigger than the limit", () => {
    const big = Buffer.alloc(FAQ_FILE_MAX_BYTES + 1).toString("base64");
    assert.deepEqual(parseUpload({ name: "big.apk", data: big }), { error: "tooBig" });
  });

  it("should refuse an empty file", () => {
    assert.deepEqual(parseUpload({ name: "x.pdf", data: "" }), { error: "empty" });
  });

  it("should accept a download link and refuse text that is not a web address", () => {
    assert.deepEqual([parseLink({ name: "App", url: "https://example.com/app.apk" }), parseLink({ name: "App", url: "javascript:alert(1)" })], [{ name: "App", url: "https://example.com/app.apk" }, { error: "badLink" }]);
  });
});

describe("FAQ files in the bot", () => {
  it("should send the files of the answer after its text", () => {
    assert.ok(bot.includes("await sendFaqFiles(from, c, ans.files, lang);"));
  });

  it("should still answer a question whose answer is only files", () => {
    assert.ok(bot.includes("!(f.answer || \"\").trim() && !filesByFaq.get(f.id)?.length"));
  });

  it("should serve an uploaded file as a download, not as a page", () => {
    assert.ok(faqRoutes.includes('"X-Content-Type-Options": "nosniff"') && faqRoutes.includes('isInlineMime(row.mime) ? "inline" : "attachment"'));
  });
});
