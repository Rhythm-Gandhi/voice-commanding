import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const context = vm.createContext({ Intl });
const source = readFileSync(new URL("./app.js", import.meta.url), "utf8");
vm.runInContext(`${source}\nglobalThis.testApi = { CATALOG, buildRecommendations, categorizeItem, createDemoHistory, createEmptyStore, getSubstitutes, normalizeItemName, parseCatalogSearch, parseCommand, parseQuantity, productListItem, searchCatalog, validHistoryEvent, validateItemName };`, context);
const { CATALOG, buildRecommendations, categorizeItem, createDemoHistory, createEmptyStore, getSubstitutes, normalizeItemName, parseCatalogSearch, parseCommand, parseQuantity, productListItem, searchCatalog, validHistoryEvent, validateItemName } = context.testApi;
const plain = (value) => JSON.parse(JSON.stringify(value));
const DAY_MS = 86_400_000;

function added(name, daysAgo, now = new Date("2026-06-30T12:00:00Z")) {
  return validHistoryEvent({ name, quantity: 1, unit: "item", type: "added", at: new Date(now.getTime() - daysAgo * DAY_MS).toISOString() });
}

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

test("frequent items remain regulars but a just-purchased item is not predicted", () => {
  const now = new Date("2026-06-30T12:00:00Z");
  const history = [added("Bread", 14, now), added("Bread", 7, now), added("Bread", 0, now)];
  const recommendations = buildRecommendations(history, [], [], now);
  assert.equal(recommendations.regulars[0].name, "Bread");
  assert.equal(recommendations.likely.some(({ name }) => name === "Bread"), false);
});

test("a repeated item approaching its typical interval is predicted", () => {
  const now = new Date("2026-06-30T12:00:00Z");
  const history = [added("Eggs", 20, now), added("Eggs", 10, now), added("Coffee", 1, now)];
  const recommendations = buildRecommendations(history, [], [], now);
  assert.equal(recommendations.likely[0].name, "Eggs");
  assert.equal(recommendations.likely.some(({ name }) => name === "Coffee"), false);
});

test("active and never-purchased items are excluded from history predictions", () => {
  const now = new Date("2026-06-30T12:00:00Z");
  const history = [added("Milk", 14, now), added("Milk", 7, now)];
  const recommendations = buildRecommendations(history, [{ name: "Milk" }], [], now);
  assert.equal(recommendations.likely.length, 0);
  assert.equal(recommendations.regulars.length, 0);
  assert.equal(recommendations.likely.some(({ name }) => name === "Bananas"), false);
});

test("seasonal picks use the curated month data", () => {
  const recommendations = buildRecommendations([], [], [], new Date("2026-06-30T12:00:00Z"));
  assert.equal(recommendations.seasonal.some(({ name }) => name === "Mangoes"), true);
  assert.equal(recommendations.seasonal.some(({ name }) => name === "Hot chocolate"), false);
});

test("unavailable catalog products return curated substitutes", () => {
  assert.deepEqual(plain(getSubstitutes("Milk")).map(({ name }) => name), ["Oat milk", "Almond milk", "Soy milk"]);
  assert.deepEqual(plain(getSubstitutes("Bread")).map(({ name }) => name), ["Whole wheat bread", "Tortillas"]);
});

test("demo history is explicit, repeatable, and immediately useful", () => {
  const now = new Date("2026-06-30T12:00:00Z");
  const history = createDemoHistory(now);
  assert.equal(history.every(({ demo }) => demo), true);
  const recommendations = buildRecommendations(history, [], [], now);
  assert.ok(recommendations.regulars.length);
  assert.ok(recommendations.likely.length);
  assert.ok(recommendations.alternatives.length);
});

test("understands broader suggestion requests in all supported languages", () => {
  assert.equal(parseCommand("What am I running low on?", "en-US").intent, "suggestion");
  assert.equal(parseCommand("मुझे क्या चाहिए", "hi-IN").intent, "suggestion");
  assert.equal(parseCommand("¿Qué suelo comprar?", "es-ES").intent, "suggestion");
  assert.deepEqual(plain(parseCommand("Suggest an alternative to milk", "en-US")), { ok: true, intent: "substitute", language: "en", query: "Milk" });
  assert.equal(parseCommand("दूध का विकल्प क्या है", "hi-IN").intent, "substitute");
  assert.equal(parseCommand("Alternativa a leche", "es-ES").intent, "substitute");
});

test("extracts product, brand, price, size, attribute, and category filters", () => {
  assert.deepEqual(plain(parseCatalogSearch("Colgate toothpaste under ₹200", "en")), { maxPrice: 200, brand: "Colgate", query: "toothpaste" });
  assert.deepEqual(plain(parseCatalogSearch("organic fruit under 220 rupees", "en")), { maxPrice: 220, attributes: ["organic"], category: "Produce" });
  assert.deepEqual(plain(parseCatalogSearch("large bottles of water", "en")), { size: "large", query: "water" });
  assert.deepEqual(plain(parseCatalogSearch("toothpaste over ₹200", "en")), { minPrice: 200, query: "toothpaste" });
});

test("filters catalog products using combined structured entities", () => {
  const parsed = parseCommand("Find Colgate toothpaste under ₹200", "en-US");
  assert.equal(parsed.intent, "search");
  assert.deepEqual(plain(searchCatalog(parsed.filters)).map(({ id }) => id), ["toothpaste-colgate"]);
  assert.equal(searchCatalog(parseCatalogSearch("organic fruit under ₹220", "en")).every((product) => product.category === "Produce" && product.attributes.includes("organic") && (product.salePrice ?? product.price) <= 220), true);
  assert.deepEqual(plain(searchCatalog(parseCommand("Show me Dove products", "en-US").filters)).map(({ brand }) => brand), ["Dove", "Dove"]);
});

test("supports minimum price, no results, and multilingual core search terms", () => {
  assert.equal(searchCatalog(parseCatalogSearch("toothpaste over ₹200", "en")).every((product) => (product.salePrice ?? product.price) >= 200), true);
  assert.deepEqual(plain(searchCatalog(parseCatalogSearch("Colgate toothpaste under ₹100", "en"))), []);
  assert.equal(searchCatalog(parseCommand("दूध दिखाओ", "hi-IN").filters).some(({ name }) => name === "Milk"), true);
  assert.equal(searchCatalog(parseCommand("100 रुपये से कम दूध दिखाओ", "hi-IN").filters).some(({ name }) => name === "Milk"), true);
  assert.equal(searchCatalog(parseCommand("Busca leche por debajo de 100 rupias", "es-ES").filters).some(({ name }) => name === "Milk"), true);
});

test("returns unavailable products with substitutes", () => {
  const milk = searchCatalog(parseCatalogSearch("milk under ₹100", "en")).find(({ name }) => name === "Milk");
  assert.equal(milk.available, false);
  assert.deepEqual(plain(getSubstitutes(milk.name)).map(({ name }) => name), ["Oat milk", "Almond milk", "Soy milk"]);
});

test("maps a search result into the existing list and history payload", () => {
  const product = CATALOG.find(({ id }) => id === "toothpaste-colgate");
  assert.deepEqual(plain(productListItem(product)), { name: "Colgate Total Toothpaste", quantity: 1, unit: "item", category: "Household" });
  const event = validHistoryEvent({ ...productListItem(product), type: "added", at: "2026-08-22T12:00:00Z" });
  assert.equal(event.name, "Colgate Total Toothpaste");
  assert.equal(event.category, "Household");
});
