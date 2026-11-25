import { test } from "node:test";
import assert from "node:assert/strict";
import { isFoodItem } from "./foodItems";

test("a Main course item is food", () => assert.equal(isFoodItem({ category: "Main course" }), true));
test("a beer is not food", () => assert.equal(isFoodItem({ category: "Beer" }), false));
test("an item with the cost-already-in-expenses tick is food whatever its category", () => assert.equal(isFoodItem({ category: "General", noExpenseCost: true }), true));
test("a General item without the tick is not food", () => assert.equal(isFoodItem({ category: "General" }), false));
