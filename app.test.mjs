import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const context = vm.createContext({ Intl });
const source = readFileSync(new URL("./app.js", import.meta.url), "utf8");
vm.runInContext(`${source}\nglobalThis.testApi = { categorizeItem, createEmptyStore, normalizeItemName, parseCommand, parseQuantity, validateItemName };`, context);
const { categorizeItem, createEmptyStore, normalizeItemName, parseCommand, parseQuantity, validateItemName } = context.testApi;
const plain = (value) => JSON.parse(JSON.stringify(value));

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
  assert.equal(categorizeItem("दूध"), "Dairy");
  assert.equal(categorizeItem("leche"), "Dairy");
  assert.equal(categorizeItem("steak"), "Other");
});

test("accepts only supported quantities", () => {
  assert.equal(parseQuantity("2.5"), 2.5);
  assert.equal(parseQuantity(0), null);
  assert.equal(parseQuantity(1000), null);
  assert.equal(parseQuantity("not a number"), null);
});

test("starts with an extensible, empty versioned store", () => {
  assert.deepEqual(plain(createEmptyStore()), {
    version: 1,
    list: { items: [] },
    history: [],
    preferences: {}
  });
});

test("understands varied English add phrases and units", () => {
  assert.deepEqual(plain(parseCommand("I want to buy bananas", "en-US")).items, [
    { name: "Bananas", quantity: 1, unit: "item" }
  ]);
  assert.deepEqual(plain(parseCommand("Get me two bottles of water", "en-US")).items, [
    { name: "Water", quantity: 2, unit: "bottle" }
  ]);
});

test("parses multiple English items in one command", () => {
  const result = plain(parseCommand("Add 2 bottles of milk and 5 apples", "en-US"));
  assert.equal(result.intent, "add");
  assert.deepEqual(result.items, [
    { name: "Milk", quantity: 2, unit: "bottle" },
    { name: "Apples", quantity: 5, unit: "item" }
  ]);
});

test("distinguishes English remove, set, increment, and future intents", () => {
  assert.equal(parseCommand("I don't need bread anymore", "en-US").intent, "remove");
  assert.deepEqual(plain(parseCommand("Change milk quantity to 3", "en-US")).item, { name: "Milk", quantity: 3, unit: null });
  assert.deepEqual(plain(parseCommand("Add two more apples", "en-US")).item, { name: "Apples", quantity: 2, unit: null });
  assert.equal(parseCommand("Clear my shopping list", "en-US").intent, "clear");
  assert.equal(parseCommand("Find organic apples", "en-US").intent, "search");
  assert.equal(parseCommand("Recommend something", "en-US").intent, "suggestion");
});

test("rejects invalid quantities and unknown commands", () => {
  assert.equal(parseCommand("Add 1000 apples", "en-US").ok, false);
  assert.equal(parseCommand("Tell me a joke", "en-US").ok, false);
});

test("parses Hindi add, multiple items, remove, and quantity commands", () => {
  assert.deepEqual(plain(parseCommand("दो बोतल दूध जोड़ो", "hi-IN")).items, [
    { name: "दूध", quantity: 2, unit: "bottle" }
  ]);
  assert.equal(parseCommand("अंडे, ब्रेड और केले जोड़ो", "hi-IN").items.length, 3);
  assert.equal(parseCommand("दूध हटाओ", "hi-IN").intent, "remove");
  assert.deepEqual(plain(parseCommand("दूध की मात्रा तीन करो", "hi-IN")).item, { name: "दूध", quantity: 3, unit: null });
});

test("parses Spanish add, multiple items, remove, and quantity commands", () => {
  assert.deepEqual(plain(parseCommand("Añade dos botellas de leche", "es-ES")).items, [
    { name: "Leche", quantity: 2, unit: "bottle" }
  ]);
  assert.equal(parseCommand("Necesito huevos, pan y plátanos", "es-ES").items.length, 3);
  assert.equal(parseCommand("Quita leche de mi lista", "es-ES").intent, "remove");
  assert.deepEqual(plain(parseCommand("Cambia la cantidad de leche a tres botellas", "es-ES")).item, { name: "Leche", quantity: 3, unit: "bottle" });
});
