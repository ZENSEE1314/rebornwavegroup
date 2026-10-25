// Copy to shared/<name>.test.ts (or server/<name>.test.ts). Run one file: npx tsx --test shared/<name>.test.ts
// Rules: test behaviour not implementation; one check per test; names say the behaviour ("should ... when ...");
// no logic (if / loops) in a test; real code over mocks, mock only the network, files and the clock.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { thingUnderTest } from "./thing";

describe("thingUnderTest", () => {
  it("should return the expected result for a normal input", () => {
    // Arrange
    const input = 1;
    // Act
    const result = thingUnderTest(input);
    // Assert
    assert.equal(result, 1);
  });

  it("should return nothing when the input is empty", () => {
    assert.equal(thingUnderTest(0), 0);
  });
});
