const STORAGE_KEY = "piko:shopping:v1";
const MAX_NAME_LENGTH = 60;
const MIN_QUANTITY = 0.25;
const MAX_QUANTITY = 999;

const CATEGORIES = {
  Produce: { icon: "🥬", keywords: ["apple", "banana", "orange", "grape", "lemon", "lime", "mango", "berry", "berries", "tomato", "potato", "onion", "garlic", "carrot", "spinach", "lettuce", "broccoli", "cucumber", "avocado", "fruit", "vegetable", "coriander", "cilantro", "सेब", "केला", "केले", "संतरा", "आलू", "प्याज", "manzana", "manzanas", "plátano", "plátanos", "naranja", "naranjas", "patata", "cebolla"] },
  Dairy: { icon: "🥛", keywords: ["milk", "cheese", "yogurt", "yoghurt", "butter", "cream", "paneer", "egg", "दूध", "पनीर", "अंडा", "अंडे", "leche", "queso", "huevo", "huevos"] },
  Bakery: { icon: "🥖", keywords: ["bread", "bun", "bagel", "croissant", "cake", "muffin", "tortilla", "ब्रेड", "रोटी", "pan"] },
  Snacks: { icon: "🍿", keywords: ["chips", "crisps", "cookie", "cookies", "biscuit", "chocolate", "candy", "popcorn", "nuts", "चिप्स", "बिस्कुट", "galleta", "galletas"] },
  Beverages: { icon: "🧃", keywords: ["water", "juice", "soda", "coffee", "tea", "cola", "drink", "पानी", "जूस", "चाय", "agua", "jugo", "café", "cafe"] },
  Household: { icon: "🧽", keywords: ["soap", "detergent", "cleaner", "tissue", "toilet paper", "paper towel", "sponge", "garbage bag", "trash bag"] },
  Pantry: { icon: "🥫", keywords: ["rice", "pasta", "flour", "sugar", "salt", "oil", "cereal", "oats", "spice", "sauce", "beans", "lentil", "dal", "चावल", "आटा", "चीनी", "नमक", "दाल", "arroz", "harina", "azúcar", "azucar", "sal", "aceite"] },
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

const NUMBER_WORDS = {
  en: { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20 },
  hi: { एक: 1, दो: 2, तीन: 3, चार: 4, पांच: 5, पाँच: 5, छह: 6, सात: 7, आठ: 8, नौ: 9, दस: 10, ग्यारह: 11, बारह: 12, तेरह: 13, चौदह: 14, पंद्रह: 15, सोलह: 16, सत्रह: 17, अठारह: 18, उन्नीस: 19, बीस: 20 },
  es: { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciséis: 16, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20 }
};

const UNIT_WORDS = {
  en: { item: ["item", "items"], pack: ["pack", "packs"], bottle: ["bottle", "bottles"], box: ["box", "boxes"], dozen: ["dozen"], kg: ["kg", "kilogram", "kilograms", "kilo", "kilos"], g: ["g", "gram", "grams"], L: ["l", "litre", "litres", "liter", "liters"], mL: ["ml", "millilitre", "millilitres", "milliliter", "milliliters"] },
  hi: { item: ["वस्तु", "आइटम"], pack: ["पैक", "पैकेट"], bottle: ["बोतल", "बोतलें"], box: ["डिब्बा", "डिब्बे"], dozen: ["दर्जन"], kg: ["किलो", "किलोग्राम"], g: ["ग्राम"], L: ["लीटर"], mL: ["मिलीलीटर"] },
  es: { item: ["artículo", "artículos"], pack: ["paquete", "paquetes"], bottle: ["botella", "botellas"], box: ["caja", "cajas"], dozen: ["docena", "docenas"], kg: ["kg", "kilo", "kilos", "kilogramo", "kilogramos"], g: ["g", "gramo", "gramos"], L: ["l", "litro", "litros"], mL: ["ml", "mililitro", "mililitros"] }
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
  const words = new Set(name.split(/[^\p{L}\p{M}\p{N}]+/u).filter(Boolean));

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

function languageKey(language) {
  if (String(language).toLowerCase().startsWith("hi")) return "hi";
  if (String(language).toLowerCase().startsWith("es")) return "es";
  return "en";
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeCommand(value) {
  return normalizeItemName(value)
    .replace(/[’‘]/g, "'")
    .replace(/[!?;:“”\"]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[.]+$/g, "")
    .trim()
    .toLocaleLowerCase();
}

function replaceNumberWords(value, language) {
  let text = value;
  for (const [word, number] of Object.entries(NUMBER_WORDS[language])) {
    text = text.replace(new RegExp(`(^|[\\s,])${escapeRegex(word)}(?=$|[\\s,])`, "gu"), `$1${number}`);
  }
  return text;
}

function unitAliases(language) {
  const aliases = new Map();
  for (const words of [UNIT_WORDS.en, UNIT_WORDS[language]]) {
    for (const [unit, values] of Object.entries(words)) {
      for (const value of values) aliases.set(value.toLocaleLowerCase(), unit);
    }
  }
  return aliases;
}

function cleanItemName(value, language) {
  let name = normalizeItemName(value).replace(/^[,\s]+|[,\s]+$/g, "");
  if (language === "en") name = name.replace(/^(?:some|the)\s+/u, "").replace(/\s+(?:please|anymore)$/u, "");
  if (language === "es") name = name.replace(/^(?:el|la|los|las)\s+/u, "").replace(/\s+por favor$/u, "");
  return normalizeItemName(name);
}

function parseItemPhrase(value, language) {
  const aliases = unitAliases(language);
  const units = [...aliases.keys()].sort((a, b) => b.length - a.length).map(escapeRegex).join("|");
  const text = replaceNumberWords(normalizeCommand(value), language);
  const preposition = language === "es" ? "de" : language === "hi" ? "का|की|के" : "of";
  let match = text.match(new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s+(${units})(?:\\s+(?:${preposition}))?\\s+(.+)$`, "u"));
  let quantity;
  let unit = "item";
  let name;

  if (match) {
    quantity = parseQuantity(match[1].replace(",", "."));
    unit = aliases.get(match[2]) ?? "item";
    name = match[3];
  } else {
    match = text.match(new RegExp(`^(.+?)\\s+(?:${preposition})\\s+(\\d+(?:[.,]\\d+)?)\\s+(${units})$`, "u"));
    if (match) {
      name = match[1];
      quantity = parseQuantity(match[2].replace(",", "."));
      unit = aliases.get(match[3]) ?? "item";
    } else {
      match = text.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/u);
      quantity = match ? parseQuantity(match[1].replace(",", ".")) : 1;
      name = match ? match[2] : text;
    }
  }

  name = cleanItemName(name, language);
  if (quantity === null || validateItemName(name)) return null;
  return { name: capitalize(name), quantity, unit };
}

function parseQuantityValue(value, language) {
  const aliases = unitAliases(language);
  const units = [...aliases.keys()].sort((a, b) => b.length - a.length).map(escapeRegex).join("|");
  const text = replaceNumberWords(normalizeCommand(value), language);
  const match = text.match(new RegExp(`^(\\d+(?:[.,]\\d+)?)(?:\\s+(${units}))?$`, "u"));
  if (!match) return null;
  const quantity = parseQuantity(match[1].replace(",", "."));
  return quantity === null ? null : { quantity, unit: match[2] ? aliases.get(match[2]) : null };
}

function splitItemPhrases(value, language) {
  const connector = language === "hi" ? "और" : language === "es" ? "y" : "and";
  return value.split(new RegExp(`\\s*(?:,|\\s${connector}\\s)\\s*`, "u")).map((part) => part.trim()).filter(Boolean);
}

function parseItems(value, language) {
  const items = splitItemPhrases(value, language).map((part) => parseItemPhrase(part, language));
  return items.length && items.every(Boolean) ? items : null;
}

function commandResult(intent, language, details = {}) {
  return { ok: true, intent, language, ...details };
}

function parseCommand(value, recognitionLanguage = "en-US") {
  const language = languageKey(recognitionLanguage);
  const text = normalizeCommand(value);
  if (!text) return { ok: false, error: "Say or type a shopping command first." };
  if (text.length > 160) return { ok: false, error: "Keep commands under 160 characters." };

  const clearPatterns = {
    en: /^(?:clear|empty|delete|remove)\s+(?:my\s+)?(?:shopping\s+)?list$/u,
    hi: /^(?:(?:मेरी\s+)?(?:खरीदारी\s+)?सूची\s+(?:साफ\s+करो|खाली\s+करो|मिटाओ|हटाओ)|सब\s+हटाओ)$/u,
    es: /^(?:limpia|vacía|vacia|borra)\s+(?:mi\s+)?lista$/u
  };
  if (clearPatterns[language].test(text)) return commandResult("clear", language);

  const suggestionPatterns = {
    en: /(?:suggest|recommend|what should i buy)/u,
    hi: /(?:सुझाव|क्या\s+खरीद)/u,
    es: /(?:sugiere|recomienda|qué\s+debo\s+comprar|que\s+debo\s+comprar)/u
  };
  if (suggestionPatterns[language].test(text)) return commandResult("suggestion", language);

  const searchPatterns = {
    en: [/^(?:search(?: for)?|find(?: me)?|look for)\s+(.+)$/u],
    hi: [/^(?:खोजो|ढूँढो|ढूंढो)\s+(.+)$/u, /^(.+)\s+(?:खोजो|ढूँढो|ढूंढो)$/u],
    es: [/^(?:busca|encuentra)\s+(.+)$/u]
  };
  for (const pattern of searchPatterns[language]) {
    const match = text.match(pattern);
    if (match) return commandResult("search", language, { query: capitalize(cleanItemName(match[1], language)) });
  }

  const updatePatterns = {
    en: [/^(?:change|set|make)\s+(?:the\s+)?quantity\s+(?:of|for)\s+(.+?)\s+(?:to|at)\s+(.+)$/u, /^(?:change|set|make)\s+(.+?)(?:\s+quantity)?\s+(?:to|at)\s+(.+)$/u],
    hi: [/^(.+?)\s+(?:की\s+)?मात्रा\s+(.+?)\s+(?:करो|कर\s+दो)$/u, /^(.+?)\s+को\s+(.+?)\s+(?:करो|कर\s+दो)$/u],
    es: [/^(?:cambia|establece|pon)\s+(?:la\s+)?cantidad\s+de\s+(.+?)\s+(?:a|en)\s+(.+)$/u, /^(?:pon|cambia)\s+(.+?)\s+(?:a|en)\s+(.+)$/u]
  };
  for (const pattern of updatePatterns[language]) {
    const match = text.match(pattern);
    if (!match) continue;
    const amount = parseQuantityValue(match[2], language);
    const name = cleanItemName(match[1], language);
    if (!amount || validateItemName(name)) return { ok: false, error: "I found the item, but not a valid quantity." };
    return commandResult("updateQuantity", language, { item: { name: capitalize(name), ...amount }, operation: "set" });
  }

  const incrementPatterns = {
    en: /^(?:add|get)\s+(.+?)\s+more\s+(.+)$/u,
    hi: /^(.+?)\s+और\s+(.+?)\s+(?:जोड़ो|डालो)$/u,
    es: /^(?:añade|agrega)\s+(.+?)\s+(?:más|mas)\s+(.+)$/u
  };
  const incrementMatch = text.match(incrementPatterns[language]);
  if (incrementMatch) {
    const amount = parseQuantityValue(incrementMatch[1], language);
    const name = cleanItemName(incrementMatch[2], language);
    if (amount && !validateItemName(name)) return commandResult("updateQuantity", language, { item: { name: capitalize(name), ...amount }, operation: "increment" });
  }

  const removePatterns = {
    en: [/^(?:remove|delete)\s+(.+?)(?:\s+from\s+(?:my\s+)?list)?$/u, /^take\s+(.+?)\s+off\s+(?:my\s+)?list$/u, /^i\s+don'?t\s+need\s+(.+?)(?:\s+anymore)?$/u],
    hi: [/^(?:मेरी\s+सूची\s+से\s+)?(.+?)\s+(?:हटाओ|निकालो)$/u, /^मुझे\s+(.+?)\s+नहीं\s+चाहिए$/u],
    es: [/^(?:elimina|quita|borra)\s+(.+?)(?:\s+de\s+mi\s+lista)?$/u, /^no\s+necesito\s+(.+?)(?:\s+más|\s+mas)?$/u]
  };
  for (const pattern of removePatterns[language]) {
    const match = text.match(pattern);
    if (!match) continue;
    const items = parseItems(match[1], language);
    return items ? commandResult("remove", language, { items }) : { ok: false, error: "I couldn't identify which item to remove." };
  }

  const addPatterns = {
    en: [/^(?:please\s+)?(?:add|buy|put|get(?:\s+me)?|i\s+need|i\s+want(?:\s+to\s+buy)?)\s+(.+)$/u],
    hi: [/^(?:मुझे\s+)?(.+?)\s+(?:चाहिए|खरीदना\s+है)$/u, /^(?:मेरी\s+सूची\s+में\s+)?(.+?)\s+(?:जोड़ो|डालो|खरीदो)$/u],
    es: [/^(?:añade|agrega|pon|compra|necesito|quiero(?:\s+comprar)?)\s+(.+)$/u]
  };
  for (const pattern of addPatterns[language]) {
    const match = text.match(pattern);
    if (!match) continue;
    let body = match[1];
    if (language === "en") body = body.replace(/\s+(?:to|on)\s+(?:my\s+)?list$/u, "");
    if (language === "es") body = body.replace(/\s+a\s+mi\s+lista$/u, "");
    const items = parseItems(body, language);
    return items ? commandResult("add", language, { items }) : { ok: false, error: "I heard an add command, but couldn't identify valid items." };
  }

  return { ok: false, error: "I didn't understand that yet. Try “Add milk”, “Remove bread”, or “Set apples to 3”." };
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
    assistantCard: document.querySelector(".assistant-card"),
    voiceStateLabel: document.querySelector("#voice-state-label"),
    assistantStatus: document.querySelector("#assistant-status"),
    transcript: document.querySelector("#voice-transcript"),
    transcriptText: document.querySelector("#transcript-text"),
    commandForm: document.querySelector("#command-form"),
    commandInput: document.querySelector("#command-input"),
    language: document.querySelector("#voice-language"),
    micButton: document.querySelector("#mic-button"),
    voiceNote: document.querySelector("#voice-note"),
    spokenFeedback: document.querySelector("#spoken-feedback"),
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
  let voiceStateTimer;
  let recognition;
  let recognitionTimer;
  let listening = false;
  let commandHandled = false;
  let recognitionFailed = false;
  let userCancelled = false;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

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

  function setVoiceState(state, message, transcript = "") {
    window.clearTimeout(voiceStateTimer);
    nodes.assistantCard.dataset.voiceState = state;
    nodes.voiceStateLabel.textContent = ({ idle: "Ready", listening: "Listening", processing: "Processing", success: "Done", error: "Needs help" })[state];
    nodes.assistantStatus.textContent = message;
    nodes.transcript.hidden = !transcript;
    nodes.transcriptText.textContent = transcript;
    nodes.micButton.setAttribute("aria-label", state === "listening" ? "Stop listening" : "Start voice input");
    nodes.voiceNote.textContent = state === "listening" ? "Tap to stop" : SpeechRecognition ? "Tap to speak" : "Type instead";
  }

  function returnVoiceToIdle() {
    voiceStateTimer = window.setTimeout(() => {
      const message = SpeechRecognition
        ? "Tap the microphone or type a command below."
        : "Voice recognition is unavailable here. Typed commands still work.";
      setVoiceState(SpeechRecognition ? "idle" : "error", message, nodes.transcriptText.textContent);
    }, 4500);
  }

  function describeItems(items, language) {
    return items.map((item) => {
      if (item.unit === "item") return `${formatNumber(item.quantity)} ${item.name}`;
      const connector = language === "en" ? "of " : language === "es" ? "de " : "";
      return `${formatAmount(item.quantity, item.unit)} ${connector}${item.name}`;
    }).join(", ");
  }

  function actionMessage(language, action, details = {}) {
    const messages = {
      en: {
        added: () => `Added ${describeItems(details.items, "en")}!`,
        removed: () => `Removed ${details.names.join(", ")} from your list.`,
        updated: () => `Updated ${details.name} to ${formatAmount(details.quantity, details.unit)}.`,
        cleared: () => `Cleared ${details.count} ${details.count === 1 ? "item" : "items"} from your list.`,
        empty: () => "Your shopping list is already empty."
      },
      hi: {
        added: () => `${describeItems(details.items, "hi")} सूची में जोड़ दिया।`,
        removed: () => `${details.names.join(", ")} सूची से हटा दिया।`,
        updated: () => `${details.name} की मात्रा ${formatAmount(details.quantity, details.unit)} कर दी।`,
        cleared: () => `सूची से ${details.count} आइटम हटा दिए।`,
        empty: () => "आपकी खरीदारी सूची पहले से खाली है।"
      },
      es: {
        added: () => `Añadí ${describeItems(details.items, "es")}.`,
        removed: () => `Eliminé ${details.names.join(", ")} de tu lista.`,
        updated: () => `Actualicé ${details.name} a ${formatAmount(details.quantity, details.unit)}.`,
        cleared: () => `Eliminé ${details.count} artículos de tu lista.`,
        empty: () => "Tu lista de compras ya está vacía."
      }
    };
    return messages[language][action]();
  }

  function speak(message) {
    if (!("speechSynthesis" in window) || !nodes.spokenFeedback.checked) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = nodes.language.value;
    utterance.rate = 1;
    utterance.volume = 0.85;
    window.speechSynthesis.speak(utterance);
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

  function itemKey(value) {
    return normalizeItemName(value).toLocaleLowerCase();
  }

  function findItem(name) {
    const key = itemKey(name);
    return store.list.items.find((item) => itemKey(item.name) === key)
      ?? store.list.items.find((item) => itemKey(item.name).replace(/(?:es|s)$/u, "") === key.replace(/(?:es|s)$/u, ""));
  }

  function addListItem({ name, quantity, unit }) {
    const existing = store.list.items.find((item) => !item.completed && item.unit === unit && itemKey(item.name) === itemKey(name));
    if (existing && existing.quantity + quantity <= MAX_QUANTITY) {
      existing.quantity = Math.round((existing.quantity + quantity) * 100) / 100;
      existing.updatedAt = new Date().toISOString();
      return existing;
    }

    const now = new Date().toISOString();
    const item = {
      id: crypto.randomUUID(),
      name,
      quantity,
      unit,
      category: categorizeItem(name),
      completed: false,
      createdAt: now,
      updatedAt: now
    };
    store.list.items.push(item);
    return item;
  }

  function executeParsedCommand(parsed) {
    if (parsed.intent === "add") {
      const items = parsed.items.map(addListItem);
      saveStore();
      render();
      return { ok: true, message: actionMessage(parsed.language, "added", { items }) };
    }

    if (parsed.intent === "remove") {
      const found = parsed.items.map(({ name }) => findItem(name)).filter(Boolean);
      if (!found.length) return { ok: false, message: `I couldn't find ${parsed.items.map(({ name }) => name).join(", ")} on your list.` };
      const ids = new Set(found.map(({ id }) => id));
      store.list.items = store.list.items.filter(({ id }) => !ids.has(id));
      saveStore();
      render();
      return { ok: true, message: actionMessage(parsed.language, "removed", { names: found.map(({ name }) => name) }) };
    }

    if (parsed.intent === "updateQuantity") {
      let item = findItem(parsed.item.name);
      if (!item && parsed.operation === "increment") {
        item = addListItem({ ...parsed.item, unit: parsed.item.unit ?? "item" });
      } else if (!item) {
        return { ok: false, message: `I couldn't find ${parsed.item.name} on your list.` };
      } else {
        const quantity = parsed.operation === "increment" ? item.quantity + parsed.item.quantity : parsed.item.quantity;
        const validated = parseQuantity(quantity);
        if (validated === null) return { ok: false, message: `That would put ${item.name} outside the supported quantity range.` };
        item.quantity = validated;
        if (parsed.item.unit) item.unit = parsed.item.unit;
        item.updatedAt = new Date().toISOString();
      }
      saveStore();
      render();
      return { ok: true, message: actionMessage(parsed.language, "updated", item) };
    }

    if (parsed.intent === "clear") {
      const count = store.list.items.length;
      if (!count) return { ok: true, message: actionMessage(parsed.language, "empty") };
      store.list.items = [];
      saveStore();
      render();
      return { ok: true, message: actionMessage(parsed.language, "cleared", { count }) };
    }

    if (parsed.intent === "search") {
      return { ok: true, placeholder: true, message: `I heard your search for ${parsed.query}. Product search arrives in Phase 4.` };
    }

    return { ok: true, placeholder: true, message: "Smart suggestions arrive in Phase 3. Your request is understood and ready for that feature." };
  }

  async function handleCommand(rawCommand, source) {
    const transcript = normalizeItemName(rawCommand);
    setVoiceState("processing", "✨ Got it! Let me organize that…", transcript);
    await new Promise((resolve) => window.setTimeout(resolve, 220));

    const parsed = parseCommand(transcript, nodes.language.value);
    if (!parsed.ok) {
      setVoiceState("error", parsed.error, transcript);
      showFeedback(parsed.error, "error");
      returnVoiceToIdle();
      return;
    }

    const result = executeParsedCommand(parsed);
    const message = `${result.ok ? "✓" : "!"} ${result.message}`;
    setVoiceState(result.ok ? "success" : "error", message, transcript);
    showFeedback(result.message, result.ok ? "success" : "error");
    if (result.ok && source === "voice" && !result.placeholder) speak(result.message);
    if (result.ok && source === "typed") nodes.commandInput.value = "";
    returnVoiceToIdle();
  }

  function voiceErrorMessage(error) {
    return ({
      "not-allowed": "Microphone access was blocked. Allow it in browser settings, or type your command below.",
      "service-not-allowed": "Voice recognition is blocked by this browser. Typed commands still work.",
      "no-speech": "I didn't hear anything. Move closer to the microphone and try again.",
      "audio-capture": "No working microphone was found. Check your device, or type the command.",
      network: "Voice recognition could not reach its service. Check your connection or type the command.",
      "language-not-supported": "This browser cannot recognize the selected language. Try another language or type the command."
    })[error] ?? "Voice recognition stopped unexpectedly. Please try again or type the command.";
  }

  function startListening() {
    if (!SpeechRecognition) return;
    commandHandled = false;
    recognitionFailed = false;
    userCancelled = false;
    let finalTranscript = "";
    recognition = new SpeechRecognition();
    recognition.lang = nodes.language.value;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      listening = true;
      setVoiceState("listening", "Listening… Say a shopping command.");
      recognitionTimer = window.setTimeout(() => {
        recognitionFailed = true;
        recognition.stop();
        const message = "Listening timed out. Try a shorter command, or type it below.";
        setVoiceState("error", message);
        showFeedback(message, "error");
        returnVoiceToIdle();
      }, 12000);
    };

    recognition.onresult = (event) => {
      let heard = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const words = event.results[index][0].transcript;
        heard += words;
        if (event.results[index].isFinal) finalTranscript += words;
      }
      setVoiceState("listening", "Listening… Say a shopping command.", finalTranscript || heard);
      if (finalTranscript) {
        commandHandled = true;
        window.clearTimeout(recognitionTimer);
        recognition.stop();
        handleCommand(finalTranscript, "voice");
      }
    };

    recognition.onerror = (event) => {
      window.clearTimeout(recognitionTimer);
      if (event.error === "aborted" && (userCancelled || commandHandled)) return;
      recognitionFailed = true;
      const message = voiceErrorMessage(event.error);
      setVoiceState("error", message);
      showFeedback(message, "error");
      returnVoiceToIdle();
    };

    recognition.onend = () => {
      listening = false;
      window.clearTimeout(recognitionTimer);
      if (userCancelled) {
        setVoiceState("idle", "Listening stopped. Tap the microphone whenever you're ready.");
      } else if (!commandHandled && !recognitionFailed) {
        const message = "I didn't catch a command. Try again or type it below.";
        setVoiceState("error", message);
        showFeedback(message, "error");
        returnVoiceToIdle();
      }
    };

    try {
      recognition.start();
    } catch {
      const message = "The microphone is already busy. Wait a moment and try again.";
      setVoiceState("error", message);
      showFeedback(message, "error");
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
    const item = addListItem({ ...valid, unit });
    commit(existing ? `Added more ${item.name} to your list!` : `Added ${item.name} to your list!`);

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

  nodes.commandForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (listening) {
      commandHandled = true;
      recognition.stop();
    }
    handleCommand(nodes.commandInput.value, "typed");
  });

  nodes.micButton.addEventListener("click", () => {
    if (listening) {
      userCancelled = true;
      recognition.stop();
      return;
    }
    startListening();
  });

  nodes.language.addEventListener("change", () => {
    if (listening) {
      userCancelled = true;
      recognition.stop();
    }
    store.preferences.language = nodes.language.value;
    saveStore();
    nodes.commandInput.placeholder = ({
      "en-US": "Try “Add 2 bottles of milk”",
      "hi-IN": "कोशिश करें “दो बोतल दूध जोड़ो”",
      "es-ES": "Prueba “Añade dos botellas de leche”"
    })[nodes.language.value];
  });

  nodes.spokenFeedback.addEventListener("change", () => {
    store.preferences.spokenFeedback = nodes.spokenFeedback.checked;
    saveStore();
  });

  store = loadStore();
  nodes.language.value = ["en-US", "hi-IN", "es-ES"].includes(store.preferences.language) ? store.preferences.language : "en-US";
  nodes.spokenFeedback.checked = store.preferences.spokenFeedback !== false;
  nodes.spokenFeedback.disabled = !("speechSynthesis" in window);
  nodes.micButton.disabled = !SpeechRecognition;
  nodes.language.dispatchEvent(new Event("change"));
  if (!SpeechRecognition) {
    setVoiceState("error", "Voice recognition is unavailable in this browser. Type a command below—the same parser and actions still work.");
  } else {
    setVoiceState("idle", "Tap the microphone or type a command below.");
  }
  render();
  document.body.dataset.appState = "ready";
}

if (typeof document !== "undefined") init();
