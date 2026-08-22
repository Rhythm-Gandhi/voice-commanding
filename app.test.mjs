import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const context = vm.createContext({ Intl });
const source = readFileSync(new URL("./app.js", import.meta.url), "utf8");
vm.runInContext(`${source}\nglobalThis.testApi = { categorizeItem, createEmptyStore, normalizeItemName, parseQuantity, validateItemName };`, context);
const { categorizeItem, createEmptyStore, normalizeItemName, parseQuantity, validateItemName } = context.testApi;

test("normalizes and validates item names", () => {
  assert.equal(normalizeItemName("  green   apples  "), "green apples");
  assert.equal(validateItemName(""), "Enter an item name.");
  assert.equal(validateItemName("---"), "Use at least one letter or number.");
  assert.equal(validateItemName("Milk"), "");
});

test("assigns common items without substring false positives", () => {
  assert.equal(categorizeItem("organic apples"), "Produce");
  assert.equal(categorizeItem("2 bottles of milk"), "Dairy");
  assert.equal(categorizeItem("toilet paper"), "Household");
  assert.equal(categorizeItem("green tea"), "Beverages");
  assert.equal(categorizeItem("steak"), "Other");
});

test("accepts only supported quantities", () => {
  assert.equal(parseQuantity("2.5"), 2.5);
  assert.equal(parseQuantity(0), null);
  assert.equal(parseQuantity(1000), null);
  assert.equal(parseQuantity("not a number"), null);
});

test("starts with an extensible, empty versioned store", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(createEmptyStore())), {
    version: 1,
    list: { items: [] },
    history: [],
    preferences: {}
  });
});
