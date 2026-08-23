import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const context = vm.createContext({ Intl });
const source = readFileSync(new URL("./app.js", import.meta.url), "utf8");
vm.runInContext(`${source}\nglobalThis.testApi = { CATALOG, buildRecommendations, categorizeItem, createDemoHistory, createEmptyStore, dedupeItems, findAmbiguousItem, getSubstitutes, itemKey, listCatalogEstimate, normalizeItemName, parseCatalogSearch, parseCommand, parseQuantity, productListItem, quantityRemoval, searchCatalog, shoppingListText, speechLanguage, validHistoryEvent, validateItemName, viewFromHash };`, context);
const { CATALOG, buildRecommendations, categorizeItem, createDemoHistory, createEmptyStore, dedupeItems, findAmbiguousItem, getSubstitutes, itemKey, listCatalogEstimate, normalizeItemName, parseCatalogSearch, parseCommand, parseQuantity, productListItem, quantityRemoval, searchCatalog, shoppingListText, speechLanguage, validHistoryEvent, validateItemName, viewFromHash } = context.testApi;
const plain = (value) => JSON.parse(JSON.stringify(value));
const DAY_MS = 86_400_000;

test("maps linked mobile views and totals demonstration catalog prices", () => {
  assert.equal(viewFromHash("#lists"), "lists");
  assert.equal(viewFromHash("#recommendations"), "recommendations");
  assert.equal(viewFromHash("#unknown"), "home");
  assert.deepEqual(plain(listCatalogEstimate([
    { name: "Bread", quantity: 2 },
    { name: "Unknown grocery", quantity: 3 }
  ])), { total: 90, savings: 20 });
});

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

test("sorts expanded grocery categories using specific phrases first", () => {
  assert.equal(categorizeItem("soy sauce"), "Asian Pantry");
  assert.equal(categorizeItem("frozen peas"), "Frozen");
  assert.equal(categorizeItem("salmon"), "Meat & Seafood");
  assert.equal(categorizeItem("toothpaste"), "Personal Care");
  assert.equal(categorizeItem("dish soap"), "Household");
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

test("merges active duplicate names even when their units differ", () => {
  const items = plain(dedupeItems([
    { name: "Milk", quantity: 2, unit: "pack", completed: false, updatedAt: "2026-01-01T00:00:00.000Z" },
    { name: "milk", quantity: 1, unit: "item", completed: false, updatedAt: "2026-01-02T00:00:00.000Z" }
  ]));
  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 3);
  assert.equal(items[0].unit, "pack");
});

test("understands varied English add phrases and units", () => {
  assert.deepEqual(plain(parseCommand("I want to buy bananas", "en-US")).items, [
    { name: "Bananas", quantity: 1, unit: "item" }
  ]);
  assert.deepEqual(plain(parseCommand("Get me two bottles of water", "en-US")).items, [
    { name: "Water", quantity: 2, unit: "bottle" }
  ]);
  assert.deepEqual(plain(parseCommand("Add do milk", "en-IN")).items, [
    { name: "Milk", quantity: 2, unit: "pack" }
  ]);
  assert.deepEqual(plain(parseCommand("Do bottle water.", "en-IN")).items, [
    { name: "Water", quantity: 2, unit: "bottle" }
  ]);
  assert.deepEqual(plain(parseCommand("Add dos milk", "en-IN")).items, [
    { name: "Milk", quantity: 2, unit: "pack" }
  ]);
  assert.deepEqual(plain(parseCommand("Add do apples", "en-IN")).items, [
    { name: "Apples", quantity: 2, unit: "item" }
  ]);
});

test("uses a widely supported English voice for Hinglish confirmations", () => {
  assert.equal(speechLanguage("en-IN"), "en-US");
  assert.equal(speechLanguage("hi-IN"), "hi-IN");
  assert.equal(speechLanguage("es-ES"), "es-ES");
});

test("parses multiple English items in one command", () => {
  const result = plain(parseCommand("Add 2 bottles of milk and 5 apples", "en-US"));
  assert.equal(result.intent, "add");
  assert.deepEqual(result.items, [
    { name: "Milk", quantity: 2, unit: "bottle" },
    { name: "Apples", quantity: 5, unit: "item" }
  ]);
});

test("filters speech fillers and separates natural space-delimited groceries", () => {
  assert.deepEqual(plain(parseCommand("umm add onion spinach milk you know", "en-IN")).items, [
    { name: "Onion", quantity: 1, unit: "item" },
    { name: "Spinach", quantity: 1, unit: "item" },
    { name: "Milk", quantity: 1, unit: "item" }
  ]);
  assert.deepEqual(plain(parseCommand("उम्म प्याज पालक दूध जोड़ो", "hi-IN")).items.map(({ name }) => name), ["प्याज", "पालक", "दूध"]);
  assert.deepEqual(plain(parseCommand("eh añade cebolla espinaca leche por favor", "es-ES")).items.map(({ name }) => name), ["Cebolla", "Espinaca", "Leche"]);
});

test("parses Romanized Hindi aliases, implicit adds, connectors, and speech-style suffixes", () => {
  assert.equal(parseCommand("atta", "en-IN").items[0].name, "Atta");
  assert.equal(parseCommand("chini", "en-IN").items[0].name, "Chini");
  assert.deepEqual(plain(parseCommand("atta doodh chini ad", "en-IN")).items.map(({ name }) => name), ["Atta", "Doodh", "Chini"]);
  assert.deepEqual(plain(parseCommand("atta doodh chini", "en-IN")).items.map(({ name }) => name), ["Atta", "Doodh", "Chini"]);
  assert.deepEqual(plain(parseCommand("atta aur doodh and chini", "en-IN")).items.map(({ name }) => name), ["Atta", "Doodh", "Chini"]);
  assert.deepEqual(plain(parseCommand("dhoodh", "en-IN")).items, [{ name: "Doodh", quantity: 1, unit: "item" }]);
  assert.deepEqual(plain(parseCommand("list me atta doodh daal do", "en-IN")).items.map(({ name }) => name), ["Atta", "Doodh"]);
  assert.deepEqual(plain(parseCommand("mujhe atta doodh chini chahiye", "en-IN")).items.map(({ name }) => name), ["Atta", "Doodh", "Chini"]);
  assert.equal(parseCommand("atta list mein daalo", "en-IN").items[0].name, "Atta");
  assert.equal(parseCommand("doodh le lena", "en-IN").items[0].name, "Doodh");
  assert.equal(parseCommand("atta doodh hata do", "en-IN").intent, "remove");
  assert.equal(parseCommand("chini hata do", "en-IN").items[0].name, "Chini");
});

test("parses Hinglish quantities before or after an item", () => {
  assert.deepEqual(plain(parseCommand("add 2 kilo atta", "en-IN")).items, [{ name: "Atta", quantity: 2, unit: "kg" }]);
  assert.deepEqual(plain(parseCommand("atta 2 kilo", "en-IN")).items, [{ name: "Atta", quantity: 2, unit: "kg" }]);
  assert.deepEqual(plain(parseCommand("2 packet dhoodh", "en-IN")).items, [{ name: "Doodh", quantity: 2, unit: "pack" }]);
  assert.deepEqual(plain(parseCommand("aloo 5", "en-IN")).items, [{ name: "Aloo", quantity: 5, unit: "item" }]);
});

test("parses arbitrary Indian grocery names with quantities and units", () => {
  const cases = [
    ["one kilo bajra", { name: "Bajra", quantity: 1, unit: "kg" }],
    ["2 kilo atta", { name: "Atta", quantity: 2, unit: "kg" }],
    ["500 gram ragi", { name: "Ragi", quantity: 500, unit: "g" }],
    ["1 kg jowar", { name: "Jowar", quantity: 1, unit: "kg" }],
    ["2 packet poha", { name: "Poha", quantity: 2, unit: "pack" }],
    ["1 kilo besan", { name: "Besan", quantity: 1, unit: "kg" }],
    ["bajra 1 kilo", { name: "Bajra", quantity: 1, unit: "kg" }],
    ["Add 750 gram quinoa", { name: "Quinoa", quantity: 750, unit: "g" }]
  ];
  for (const [command, expected] of cases) assert.deepEqual(plain(parseCommand(command, "en-IN")).items, [expected]);
  assert.deepEqual(plain(parseCommand("Add quinoa", "en-IN")).items, [{ name: "Quinoa", quantity: 1, unit: "item" }]);
});

test("categorizes Indian staples while preserving Other for unmatched groceries", () => {
  for (const name of ["Bajra", "Jowar", "Ragi", "Atta", "Maida", "Suji", "Poha", "Besan"]) assert.equal(categorizeItem(name), "Grains / Pantry");
  for (const name of ["Dal", "Rajma", "Chana", "Moong", "Masoor", "Urad"]) assert.equal(categorizeItem(name), "Pulses / Pantry");
  for (const name of ["Jeera", "Haldi", "Dhaniya", "Mustard seeds"]) assert.equal(categorizeItem(name), "Spices");
  assert.equal(categorizeItem("Quinoa"), "Other");
});

test("uses canonical alias identity for duplicates and list matching", () => {
  assert.equal(itemKey("Milk"), itemKey("dhoodh"));
  assert.equal(itemKey("aata"), itemKey("Atta"));
  const items = plain(dedupeItems([
    { name: "Milk", quantity: 1, unit: "pack", completed: false, updatedAt: "2026-01-01T00:00:00.000Z" },
    { name: "Doodh", quantity: 2, unit: "pack", completed: false, updatedAt: "2026-01-02T00:00:00.000Z" }
  ]));
  assert.equal(items.length, 1);
  assert.equal(items[0].name, "Milk");
  assert.equal(items[0].quantity, 3);
  assert.equal(categorizeItem("dhoodh"), "Dairy");
});

test("normalizes high-confidence Makki flour aliases into one canonical item", () => {
  const commands = ["add 1 kilo makki", "add 1 kilo makki ka atta", "add 1 kilo makki atta", "add 1 kilo corn flour", "add 1 kilo maize flour"];
  const parsed = commands.map((command) => plain(parseCommand(command, "en-IN")).items[0]);
  assert.equal(parsed.every(({ name, unit }) => name === "Makki ka Atta" && unit === "kg"), true);
  assert.equal(parsed.every(({ name }) => categorizeItem(name) === "Grains / Pantry"), true);
  const merged = plain(dedupeItems(parsed.map((item, index) => ({ ...item, completed: false, updatedAt: `2026-01-0${index + 1}T00:00:00.000Z` }))));
  assert.equal(merged.length, 1);
  assert.equal(merged[0].name, "Makki ka Atta");
  assert.equal(merged[0].quantity, 5);
});

test("shares canonical identities for established synonyms", () => {
  assert.equal(new Set(["atta", "aata", "wheat flour"].map(itemKey)).size, 1);
  assert.equal(new Set(["doodh", "dhoodh", "milk"].map(itemKey)).size, 1);
  assert.equal(new Set(["chini", "cheeni", "sugar"].map(itemKey)).size, 1);
});

test("flags related corn products for clarification without over-merging", () => {
  const existing = [{ id: "flour", name: "Makki ka Atta", completed: false }];
  assert.equal(findAmbiguousItem("Corn", existing)?.id, "flour");
  assert.equal(findAmbiguousItem("Sweet corn", existing)?.id, "flour");
  assert.equal(findAmbiguousItem("Cornmeal", existing), null);
  assert.notEqual(itemKey("Corn"), itemKey("Makki ka Atta"));
});

test("uses canonical aliases when searching a catalog", () => {
  const catalog = [{ name: "Makki ka Atta", brand: "Local Mill", category: "Grains / Pantry", attributes: [], price: 80, salePrice: null, available: true }];
  assert.equal(searchCatalog({ query: "maize flour" }, catalog).length, 1);
  assert.equal(searchCatalog({ query: "makki" }, catalog).length, 1);
});

test("keeps multiword groceries whole and flags partially unknown speech", () => {
  assert.deepEqual(plain(parseCommand("almond milk coconut water olive oil brown bread toilet paper", "en-IN")).items.map(({ name }) => name), ["Almond milk", "Coconut water", "Olive oil", "Brown bread", "Toilet paper"]);
  const partial = plain(parseCommand("atta xyz chini", "en-IN"));
  assert.deepEqual(partial.items.map(({ name }) => name), ["Atta", "Chini"]);
  assert.deepEqual(partial.unknown, ["xyz"]);
  assert.equal(parseCommand("xyz qwerty", "en-IN").ok, false);
});

test("suggests deterministic grocery spelling corrections", () => {
  const items = plain(parseCommand("Add onoin spinach milk", "en-IN")).items;
  assert.deepEqual(items[0], { name: "Onion", quantity: 1, unit: "item", correction: { from: "onoin", to: "onion" } });
  assert.equal(items.length, 3);
});

test("distinguishes English remove, set, increment, and future intents", () => {
  assert.equal(parseCommand("I don't need bread anymore", "en-US").intent, "remove");
  assert.deepEqual(plain(parseCommand("Change milk quantity to 3", "en-US")).item, { name: "Milk", quantity: 3, unit: null });
  assert.deepEqual(plain(parseCommand("Add two more apples", "en-US")).item, { name: "Apples", quantity: 2, unit: null });
  assert.equal(parseCommand("Clear my shopping list", "en-US").intent, "clear");
  assert.equal(parseCommand("Find organic apples", "en-US").intent, "search");
  assert.equal(parseCommand("Recommend something", "en-US").intent, "suggestion");
});

test("decrements quantified removals while keeping plain remove as full deletion", () => {
  const direct = plain(parseCommand("Remove 2 pkt milk", "en-IN"));
  assert.equal(direct.operation, "decrement");
  assert.deepEqual(direct.items, [{ name: "Milk", quantity: 2, unit: "pack" }]);
  assert.deepEqual(plain(parseCommand("Could you please remove two packets of milk from my list", "en-IN")).items, direct.items);
  assert.deepEqual(plain(parseCommand("I would like to take out two packets of milk", "en-IN")).items, direct.items);
  assert.deepEqual(plain(parseCommand("Reduce milk by two packets", "en-IN")).items, direct.items);
  assert.deepEqual(plain(parseCommand("milk ke do packet hata do", "en-IN")).items, direct.items);
  assert.equal(parseCommand("remove milk", "en-IN").operation, "all");

  const milk = { name: "Milk", quantity: 5, unit: "pack" };
  assert.deepEqual(plain(quantityRemoval(milk, direct.items[0])), { ok: true, remaining: 3 });
  assert.equal(quantityRemoval(milk, { name: "Milk", quantity: 6, unit: "pack" }).ok, false);
  assert.equal(quantityRemoval(milk, { name: "Milk", quantity: 2, unit: "kg" }).ok, false);
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
  assert.deepEqual(plain(parseCommand("two पैकेट दूध जोड़ो", "hi-IN")).items, [
    { name: "दूध", quantity: 2, unit: "pack" }
  ]);
});

test("parses Spanish add, multiple items, remove, and quantity commands", () => {
  assert.deepEqual(plain(parseCommand("Añade dos botellas de leche", "es-ES")).items, [
    { name: "Leche", quantity: 2, unit: "bottle" }
  ]);
  assert.equal(parseCommand("Necesito huevos, pan y plátanos", "es-ES").items.length, 3);
  assert.equal(parseCommand("Quita leche de mi lista", "es-ES").intent, "remove");
  assert.deepEqual(plain(parseCommand("Cambia la cantidad de leche a tres botellas", "es-ES")).item, { name: "Leche", quantity: 3, unit: "bottle" });
  assert.deepEqual(plain(parseCommand("Añade do leche", "es-ES")).items, [
    { name: "Leche", quantity: 2, unit: "pack" }
  ]);
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
  assert.deepEqual(plain(productListItem(product)), { name: "Colgate Total Toothpaste", quantity: 1, unit: "item", category: "Personal Care" });
  const event = validHistoryEvent({ ...productListItem(product), type: "added", at: "2026-08-22T12:00:00Z" });
  assert.equal(event.name, "Colgate Total Toothpaste");
  assert.equal(event.category, "Personal Care");
});

test("creates a grouped plain-text list for sharing", () => {
  const text = shoppingListText([
    { name: "Onion", quantity: 1, unit: "item", category: "Produce", completed: false },
    { name: "Milk", quantity: 2, unit: "pack", category: "Dairy", completed: true }
  ]);
  assert.match(text, /Produce[\s\S]*• Onion — 1 item/u);
  assert.match(text, /Dairy[\s\S]*✓ Milk — 2 packs/u);
});
