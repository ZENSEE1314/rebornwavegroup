import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RUN_ONCE_KEEP_MS, createRunOnce } from "./runOnce";

describe("runOnce", () => {
  it("should give a repeated key the first answer without running the work again", async () => {
    const runOnce = createRunOnce();
    let runs = 0;
    const work = async () => ++runs;
    await runOnce("a", work);
    assert.equal(await runOnce("a", work), 1);
    assert.equal(runs, 1);
  });

  it("should run the work only once when the same key arrives while it is still running", async () => {
    const runOnce = createRunOnce();
    let runs = 0;
    const slow = async () => { runs++; await new Promise((resolve) => setTimeout(resolve, 20)); return "done"; };
    const answers = await Promise.all([runOnce("a", slow), runOnce("a", slow)]);
    assert.deepEqual(answers, ["done", "done"]);
    assert.equal(runs, 1);
  });

  it("should run the work for a different key", async () => {
    const runOnce = createRunOnce();
    await runOnce("a", async () => 1);
    assert.equal(await runOnce("b", async () => 2), 2);
  });

  it("should run the work again after a crash", async () => {
    const runOnce = createRunOnce();
    await assert.rejects(runOnce("a", async () => { throw new Error("boom"); }));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(await runOnce("a", async () => "second try"), "second try");
  });

  it("should forget a key after the keep time", async () => {
    const clock = { now: 1000 };
    const runOnce = createRunOnce(() => clock.now);
    await runOnce("a", async () => 1);
    clock.now += RUN_ONCE_KEEP_MS + 1;
    assert.equal(await runOnce("a", async () => 2), 2);
  });
});
