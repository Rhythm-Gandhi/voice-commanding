const STORAGE_KEY = "piko:shopping:v1";
const MAX_NAME_LENGTH = 60;
const MIN_QUANTITY = 0.25;
const MAX_QUANTITY = 999;

const CATEGORIES = {
  Produce: { icon: "🥬", keywords: ["apple", "banana", "orange", "grape", "lemon", "lime", "mango", "berry", "berries", "tomato", "potato", "onion", "garlic", "carrot", "spinach", "lettuce", "broccoli", "cucumber", "avocado", "fruit", "vegetable", "coriander", "cilantro"] },
  Dairy: { icon: "🥛", keywords: ["milk", "cheese", "yogurt", "yoghurt", "butter", "cream", "paneer", "egg"] },
  Bakery: { icon: "🥖", keywords: ["bread", "bun", "bagel", "croissant", "cake", "muffin", "tortilla"] },
  Snacks: { icon: "🍿", keywords: ["chips", "crisps", "cookie", "cookies", "biscuit", "chocolate", "candy", "popcorn", "nuts"] },
  Beverages: { icon: "🧃", keywords: ["water", "juice", "soda", "coffee", "tea", "cola", "drink"] },
  Household: { icon: "🧽", keywords: ["soap", "detergent", "cleaner", "tissue", "toilet paper", "paper towel", "sponge", "garbage bag", "trash bag"] },
  Pantry: { icon: "🥫", keywords: ["rice", "pasta", "flour", "sugar", "salt", "oil", "cereal", "oats", "spice", "sauce", "beans", "lentil", "dal"] },
  Other: { icon: "🧺", keywords: [] }
};

const UNITS = new Set(["item", "pack", "bottle", "box", "dozen", "kg", "g", "L", "mL"]);
const UNIT_LABELS = {
  item: ["item", "items"],
  pack: ["pack", "packs"],
  bottle: ["bottle", "bottles"],
  box: ["box", "boxes"],
  dozen: ["dozen", "dozen"],
  kg: ["kg", "kg"],
  g: ["g", "g"],
  L: ["L", "L"],
  mL: ["mL", "mL"]
};

function normalizeItemName(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

function validateItemName(value) {
  const name = normalizeItemName(value);
  if (!name) return "Enter an item name.";
  if (name.length > MAX_NAME_LENGTH) return `Keep the item name under ${MAX_NAME_LENGTH} characters.`;
  if (!/[\p{L}\p{N}]/u.test(name)) return "Use at least one letter or number.";
  return "";
}

function parseQuantity(value) {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity < MIN_QUANTITY || quantity > MAX_QUANTITY) return null;
  return Math.round(quantity * 100) / 100;
}

function categorizeItem(value) {
  const name = normalizeItemName(value).toLocaleLowerCase();
  const words = new Set(name.split(/[^\p{L}\p{N}]+/u).filter(Boolean));

  for (const [category, { keywords }] of Object.entries(CATEGORIES)) {
    if (category === "Other") continue;
    const matches = keywords.some((keyword) => keyword.includes(" ")
      ? name.includes(keyword)
      : words.has(keyword) || words.has(`${keyword}s`) || words.has(`${keyword}es`));
    if (matches) return category;
  }
  return "Other";
}

function createEmptyStore() {
  return { version: 1, list: { items: [] }, history: [], preferences: {} };
}

function capitalize(value) {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}

function formatNumber(value) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
}

function formatAmount(quantity, unit) {
  const labels = UNIT_LABELS[unit] ?? UNIT_LABELS.item;
  return `${formatNumber(quantity)} ${quantity === 1 ? labels[0] : labels[1]}`;
}

function quantityStep(unit) {
  if (unit === "g" || unit === "mL") return 50;
  if (unit === "kg" || unit === "L") return 0.25;
  return 1;
}

function validStoredItem(item) {
  if (!item || typeof item !== "object" || typeof item.id !== "string") return null;
  const name = normalizeItemName(item.name);
  const quantity = parseQuantity(item.quantity);
  if (validateItemName(name) || quantity === null || !UNITS.has(item.unit)) return null;
  return {
    id: item.id,
    name,
    quantity,
    unit: item.unit,
    category: categorizeItem(name),
    completed: Boolean(item.completed),
    createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : new Date().toISOString()
  };
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function iconButton(action, symbol, label) {
  const button = element("button", "item-action", symbol);
  button.type = "button";
  button.dataset.action = action;
  button.setAttribute("aria-label", label);
  return button;
}

function init() {
  const nodes = {
    addForm: document.querySelector("#add-form"),
    name: document.querySelector("#item-name"),
    quantity: document.querySelector("#item-quantity"),
    unit: document.querySelector("#item-unit"),
    nameError: document.querySelector("#name-error"),
    quantityError: document.querySelector("#quantity-error"),
    groups: document.querySelector("#category-groups"),
    empty: document.querySelector("#empty-state"),
    emptyAdd: document.querySelector("#empty-add-button"),
    summary: document.querySelector("#list-summary"),
    clearCompleted: document.querySelector("#clear-completed"),
    feedback: document.querySelector("#feedback"),
    editDialog: document.querySelector("#edit-dialog"),
    editForm: document.querySelector("#edit-form"),
    editId: document.querySelector("#edit-id"),
    editName: document.querySelector("#edit-name"),
    editQuantity: document.querySelector("#edit-quantity"),
    editUnit: document.querySelector("#edit-unit"),
    editError: document.querySelector("#edit-error"),
    closeDialog: document.querySelector("#close-dialog"),
    cancelEdit: document.querySelector("#cancel-edit")
  };

  let store = createEmptyStore();
  let feedbackTimer;

  function showFeedback(message, tone = "success") {
    window.clearTimeout(feedbackTimer);
    nodes.feedback.dataset.tone = tone;
    nodes.feedback.querySelector(".feedback-icon").textContent = tone === "success" ? "✓" : tone === "error" ? "!" : "";
    nodes.feedback.querySelector(".feedback-message").textContent = message;
    nodes.feedback.hidden = false;
    if (tone !== "processing") {
      feedbackTimer = window.setTimeout(() => { nodes.feedback.hidden = true; }, 3200);
    }
  }

  function loadStore() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return createEmptyStore();
    try {
      const parsed = JSON.parse(saved);
      if (parsed?.version !== 1 || !Array.isArray(parsed?.list?.items)) throw new Error("Unsupported storage schema");
      const items = parsed.list.items.map(validStoredItem).filter(Boolean);
      if (items.length !== parsed.list.items.length) showFeedback("Some damaged saved items were safely skipped.", "error");
      return {
        version: 1,
        list: { items },
        history: Array.isArray(parsed.history) ? parsed.history : [],
        preferences: parsed.preferences && typeof parsed.preferences === "object" ? parsed.preferences : {}
      };
    } catch {
      showFeedback("Your saved list could not be read, so Piko started a fresh one.", "error");
      return createEmptyStore();
    }
  }

  function saveStore() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      return true;
    } catch {
      showFeedback("This change could not be saved on your device.", "error");
      return false;
    }
  }

  function makeItemCard(item) {
    const card = element("article", `item-card${item.completed ? " is-completed" : ""}`);
    card.dataset.id = item.id;

    const checkbox = element("input", "item-check");
    checkbox.type = "checkbox";
    checkbox.checked = item.completed;
    checkbox.dataset.action = "toggle";
    checkbox.setAttribute("aria-label", `${item.completed ? "Mark" : "Mark"} ${item.name} ${item.completed ? "not completed" : "completed"}`);
    const checkTarget = element("label", "item-check-target");
    checkTarget.append(checkbox);

    const main = element("div", "item-main");
    const top = element("div", "item-topline");
    const name = element("h4", "item-name", item.name);
    const actions = element("div", "item-actions");
    actions.append(
      iconButton("edit", "✎", `Edit ${item.name}`),
      iconButton("remove", "×", `Remove ${item.name}`)
    );
    top.append(name, actions);

    const bottom = element("div", "item-bottom");
    bottom.append(element("span", "item-amount", formatAmount(item.quantity, item.unit)));

    const quantity = element("div", "quantity-control");
    quantity.setAttribute("aria-label", `Quantity for ${item.name}`);
    const decrease = element("button", "quantity-button", "−");
    decrease.type = "button";
    decrease.dataset.action = "decrease";
    decrease.disabled = item.quantity - quantityStep(item.unit) < MIN_QUANTITY;
    decrease.setAttribute("aria-label", `Decrease ${item.name} quantity`);
    const value = element("span", "quantity-value", formatNumber(item.quantity));
    value.setAttribute("aria-live", "polite");
    const increase = element("button", "quantity-button", "+");
    increase.type = "button";
    increase.dataset.action = "increase";
    increase.disabled = item.quantity + quantityStep(item.unit) > MAX_QUANTITY;
    increase.setAttribute("aria-label", `Increase ${item.name} quantity`);
    quantity.append(decrease, value, increase);
    bottom.append(quantity);

    main.append(top, bottom);
    card.append(checkTarget, main);
    return card;
  }

  function render() {
    const items = store.list.items;
    const completed = items.filter((item) => item.completed).length;
    nodes.summary.textContent = `${items.length} ${items.length === 1 ? "item" : "items"}${completed ? ` • ${completed} checked` : ""}`;
    nodes.clearCompleted.hidden = completed === 0;
    nodes.empty.hidden = items.length !== 0;
    nodes.groups.replaceChildren();

    for (const [category, details] of Object.entries(CATEGORIES)) {
      const categoryItems = items.filter((item) => item.category === category);
      if (!categoryItems.length) continue;

      const section = element("section", "category-group");
      section.setAttribute("aria-labelledby", `category-${category}`);
      const header = element("div", "category-header");
      const title = element("h3");
      title.id = `category-${category}`;
      title.append(element("span", "", details.icon), document.createTextNode(category));
      header.append(title, element("span", "category-count", `${categoryItems.length} ${categoryItems.length === 1 ? "item" : "items"}`));
      const grid = element("div", "items-grid");
      grid.append(...categoryItems.map(makeItemCard));
      section.append(header, grid);
      nodes.groups.append(section);
    }
  }

  function commit(message, tone = "success") {
    saveStore();
    render();
    showFeedback(message, tone);
  }

  function validateForm(nameInput, quantityInput, errorNode) {
    const name = normalizeItemName(nameInput.value);
    const nameError = validateItemName(name);
    const quantity = parseQuantity(quantityInput.value);
    nameInput.setAttribute("aria-invalid", String(Boolean(nameError)));
    if (errorNode === nodes.nameError) nodes.nameError.textContent = nameError;
    if (quantityInput === nodes.quantity) {
      nodes.quantityError.textContent = quantity === null ? `Choose a quantity from ${MIN_QUANTITY} to ${MAX_QUANTITY}.` : "";
      quantityInput.setAttribute("aria-invalid", String(quantity === null));
    }
    if (errorNode === nodes.editError) errorNode.textContent = nameError || (quantity === null ? `Choose a quantity from ${MIN_QUANTITY} to ${MAX_QUANTITY}.` : "");
    return nameError || quantity === null ? null : { name: capitalize(name), quantity };
  }

  nodes.addForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const valid = validateForm(nodes.name, nodes.quantity, nodes.nameError);
    if (!valid) {
      showFeedback("Check the highlighted item details.", "error");
      (nodes.nameError.textContent ? nodes.name : nodes.quantity).focus();
      return;
    }

    showFeedback("Adding your item…", "processing");
    const unit = UNITS.has(nodes.unit.value) ? nodes.unit.value : "item";
    const existing = store.list.items.find((item) =>
      !item.completed && item.unit === unit && item.name.toLocaleLowerCase() === valid.name.toLocaleLowerCase());

    if (existing && existing.quantity + valid.quantity <= MAX_QUANTITY) {
      existing.quantity = Math.round((existing.quantity + valid.quantity) * 100) / 100;
      existing.updatedAt = new Date().toISOString();
      commit(`Added more ${existing.name} to your list!`);
    } else {
      const now = new Date().toISOString();
      store.list.items.push({
        id: crypto.randomUUID(),
        name: valid.name,
        quantity: valid.quantity,
        unit,
        category: categorizeItem(valid.name),
        completed: false,
        createdAt: now,
        updatedAt: now
      });
      commit(`Added ${valid.name} to your list!`);
    }

    nodes.addForm.reset();
    nodes.quantity.value = "1";
    nodes.name.removeAttribute("aria-invalid");
    nodes.quantity.removeAttribute("aria-invalid");
    nodes.nameError.textContent = "";
    nodes.quantityError.textContent = "";
    nodes.name.focus();
  });

  nodes.groups.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const item = store.list.items.find(({ id }) => id === button.closest(".item-card")?.dataset.id);
    if (!item) return;

    if (button.dataset.action === "remove") {
      store.list.items = store.list.items.filter(({ id }) => id !== item.id);
      commit(`Removed ${item.name} from your list.`);
      return;
    }

    if (button.dataset.action === "edit") {
      nodes.editId.value = item.id;
      nodes.editName.value = item.name;
      nodes.editQuantity.value = item.quantity;
      nodes.editUnit.value = item.unit;
      nodes.editError.textContent = "";
      nodes.editDialog.showModal();
      nodes.editName.focus();
      return;
    }

    const direction = button.dataset.action === "increase" ? 1 : -1;
    const next = parseQuantity(item.quantity + direction * quantityStep(item.unit));
    if (next === null) return;
    item.quantity = next;
    item.updatedAt = new Date().toISOString();
    commit(`${item.name} quantity is now ${formatAmount(item.quantity, item.unit)}.`);
  });

  nodes.groups.addEventListener("change", (event) => {
    if (!event.target.matches('input[data-action="toggle"]')) return;
    const item = store.list.items.find(({ id }) => id === event.target.closest(".item-card")?.dataset.id);
    if (!item) return;
    item.completed = event.target.checked;
    item.updatedAt = new Date().toISOString();
    commit(`${item.name} marked ${item.completed ? "complete" : "not complete"}.`);
  });

  nodes.editForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const valid = validateForm(nodes.editName, nodes.editQuantity, nodes.editError);
    if (!valid) {
      showFeedback("Check the highlighted item details.", "error");
      return;
    }
    const item = store.list.items.find(({ id }) => id === nodes.editId.value);
    if (!item) {
      nodes.editDialog.close();
      showFeedback("That item is no longer on your list.", "error");
      return;
    }
    item.name = valid.name;
    item.quantity = valid.quantity;
    item.unit = UNITS.has(nodes.editUnit.value) ? nodes.editUnit.value : "item";
    item.category = categorizeItem(valid.name);
    item.updatedAt = new Date().toISOString();
    nodes.editDialog.close();
    commit(`Updated ${item.name}.`);
  });

  nodes.closeDialog.addEventListener("click", () => nodes.editDialog.close());
  nodes.cancelEdit.addEventListener("click", () => nodes.editDialog.close());
  nodes.emptyAdd.addEventListener("click", () => {
    nodes.name.focus();
    nodes.name.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  nodes.clearCompleted.addEventListener("click", () => {
    const count = store.list.items.filter((item) => item.completed).length;
    store.list.items = store.list.items.filter((item) => !item.completed);
    commit(`Cleared ${count} checked ${count === 1 ? "item" : "items"}.`);
  });
  nodes.name.addEventListener("input", () => {
    nodes.name.removeAttribute("aria-invalid");
    nodes.nameError.textContent = "";
  });
  nodes.quantity.addEventListener("input", () => {
    nodes.quantity.removeAttribute("aria-invalid");
    nodes.quantityError.textContent = "";
  });

  store = loadStore();
  render();
  document.body.dataset.appState = "ready";
}

if (typeof document !== "undefined") init();
