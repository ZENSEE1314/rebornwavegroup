import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const read = (name: string) => readFileSync(new URL(`../tv-overlay/app/src/main/java/group/rebornwave/tvoverlay/${name}`, import.meta.url), "utf8");

// The Android app cannot be run here, so these keep the rules of "gifts go to the HDMI / TV screen" from being lost in a later change.
describe("the gift overlay on the box's screens", () => {
  it("should send the gifts to the HDMI / TV screen unless the admin chose another", () => {
    assert.ok(read("Link.java").includes("getString(KEY_SCREENS, Screens.EXTERNAL)"));
  });

  it("should fall back to the main screen when the box has no second screen", () => {
    assert.ok(read("Screens.java").includes("no HDMI / TV screen on this box"));
  });

  it("should draw the overlay service through the per-screen windows", () => {
    assert.ok(read("OverlayService.java").includes("new OverlayWindows(this, type, TOUCH_PASS_THROUGH_ALPHA)"));
  });

  it("should draw the accessibility overlay through the per-screen windows", () => {
    assert.ok(read("OverlayAccessibilityService.java").includes("new OverlayWindows(this, WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY, 1f)"));
  });

  it("should make the windows of another screen from a context made for that screen", () => {
    assert.ok(read("OverlayWindows.java").includes("service.createDisplayContext(display)"));
  });

  it("should have a test banner that shows whether a window can cover the karaoke picture", () => {
    assert.ok(read("OverlayWindows.java").includes("void banner(String text, long millis)") && read("MainActivity.java").includes("windows.banner("));
  });

  it("should give the HDMI screen a presentation window, which needs neither a token nor a permission", () => {
    assert.ok(read("OverlayWindows.java").includes("TYPE_PRESENTATION = 2037"));
  });

  it("should not ask for the draw-over permission when only the HDMI screen is wanted", () => {
    assert.ok(read("OverlayService.java").includes("canDraw(context) || !Screens.needsDrawPermission(context)"));
  });

  it("should draw the gifts from plain views, not a web page, so an old browser on the box cannot stop them", () => {
    assert.equal(/WebView/.test(read("OverlayWindows.java")), false);
    assert.ok(read("GiftView.java").includes("class GiftView extends FrameLayout"));
  });

  it("should follow the TV screen's own stream for gifts", () => {
    assert.ok(read("TvFeed.java").includes('"/api/tv/" + token + "/stream"'));
  });

  it("should put the overlay back on top of the karaoke picture before every gift", () => {
    const windows = read("OverlayWindows.java");
    assert.ok(windows.includes("void raise()") && windows.includes("raise();\n                for (Layer layer : layers.values()) layer.view.play(gift);"));
  });

  it("should put the gift words on a see-through grey box so they can be read over any picture", () => {
    const gifts = read("GiftView.java");
    assert.ok(gifts.includes("words.setBackground(greyBox())") && gifts.includes("bar.setBackgroundColor(GREY_BOX)"));
  });

  it("should follow the HDMI cable being plugged in or out", () => {
    assert.ok(read("OverlayWindows.java").includes("registerDisplayListener(screensChanged, handler)"));
  });
});
