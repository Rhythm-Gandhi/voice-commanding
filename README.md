# Piko - Voice Command Shopping Assistant

Piko is a cheerful, mobile-first shopping list manager with multilingual voice commands, explainable recommendations, and structured product search. It is a zero-dependency static application built for the Voice Command Shopping Assistant technical assessment.

**Live application:** <https://rhythm-gandhi.github.io/voice-commanding/>

**Repository:** <https://github.com/Rhythm-Gandhi/voice-commanding>

## Features

- Native voice recognition and typed fallback through one command pipeline
- English/Hinglish, Hindi, and Spanish add, remove, quantity, search, substitute, and suggestion commands
- Categorized shopping list with editing, completion, quantities, persistence, and clear/reset controls
- Explainable regular, likely-needed, seasonal, demonstration-deal, and substitute recommendations
- Optional, clearly labelled demo history for immediate evaluation
- Structured local-catalog search by product, category, brand, price, size, attribute, and availability
- Polished result, unavailable-product, substitute, sale, empty, loading, success, and error states
- Accessible keyboard controls, visible focus, reduced-motion support, and responsive mobile design

## Technology and architecture

Piko uses semantic HTML, modern CSS, and browser-native JavaScript. There is no framework, package manager, build step, backend, database, external catalog, or retailer API.

`app.js` contains pure deterministic parser, recommendation, and catalog-filter functions followed by the DOM application layer. Voice and typed input share `parseCommand()` and the same action executor. The versioned list, preferences, and bounded shopping history are stored in `localStorage`; search results remain temporary. User text is rendered with safe DOM APIs rather than HTML injection.

## Run locally

```powershell
cd "D:\unthinable voice command"
python -m http.server 8000
```

Open <http://localhost:8000>. No installation or environment variables are required.

## Voice requirements and languages

Use a current Chrome or Edge release over HTTPS or localhost, allow microphone access, choose English / Hinglish, हिन्दी, or Español, and tap the microphone. The deterministic parser accepts number words from the supported languages even when they are mixed, such as `Add do milk`, `Add dos milk`, or `Añade two paquetes de leche`. Browser speech-recognition availability varies; typed commands always remain available. Depending on the browser, recognition may use a provider-managed remote service.

Example commands:

```text
Add milk and bread
Add do milk
I want to buy bananas
Add 2 bottles of water
Remove milk from my list
Change apples quantity to 10
What am I running low on?
Find Colgate toothpaste under ₹200
दो बोतल दूध जोड़ो
दूध दिखाओ
Añade dos botellas de leche
Busca leche por debajo de 100 rupias
```

## Recommendations and demo history

Each local calendar day containing an addition is treated as a shopping session. For repeated products, Piko calculates the median interval between sessions. An item becomes prediction-eligible once 75% of its typical interval has passed, then ranks using capped frequency, due ratio, and repeat-session evidence. Recent, dismissed, never-purchased, and active-list items are excluded. Regulars remain frequency-based and separate from predictions.

Select **Load demo history** to add explicitly labelled sample events for milk, bread, eggs, and apples. This immediately demonstrates regulars, due predictions, deals, and alternatives. **Clear list** keeps history, **Clear history** keeps the current list, and **Reset all data** removes list, history, preferences, and demo data after confirmation.

## Product search

Search commands extract independent filters and combine them against a 22-product local demonstration catalog priced in Indian rupees (₹). Sale prices are used for price filtering when applicable. Prices, sales, brands, availability, seasonal information, and substitutes are demonstration data, not live retailer claims. Adding a result routes through the existing list, history, categorization, and recommendation logic.

## Testing

Run the complete dependency-free test suite with a current Node.js release:

```powershell
node --test app.test.mjs
```

The suite covers validation, multilingual commands, quantities, recommendations, recency suppression, seasonal data, substitutes, structured search filters, no results, unavailable products, and search-result list/history integration.

## Privacy and security

Piko stores only list data, preferences, and item-event history under `piko:shopping:v1` on the current device. It does not intentionally store microphone audio or collect account/profile data. Inputs are normalized and length-limited, microphone capture starts only from a user action, the page uses a restrictive Content Security Policy, and all local data can be reset from the UI. No secrets or API keys are required.

## Known limitations

- Speech recognition and language quality depend on browser/platform support and may require an online provider service.
- Catalog, price, sale, season, availability, and substitute data are curated demonstrations rather than live inventory.
- Multilingual parsing intentionally supports practical shopping phrases rather than unrestricted translation.
- Predictions require repeated shopping days unless demo history is loaded.

## Approach (200 words maximum)

Piko uses a zero-dependency, local-first architecture so an evaluator can download and run it immediately. I started with a versioned shopping-list model and built every input path around one deterministic parser and action executor. Typed commands therefore exercise the same behavior as speech-recognition results and remain a reliable fallback when the Web Speech API is unavailable.

The parser uses explicit multilingual patterns, validated quantities, and structured search entities instead of an opaque AI service. Recommendations remain explainable: regulars use addition frequency, while likely-needed items require repeated shopping days and compare elapsed time with the median restock interval. Seasonal items, sales, availability, and substitutes come from a clearly labelled local demonstration catalog. Optional demo history solves the cold-start problem without silently fabricating user data.

The interface is rendered with safe DOM APIs, persists only necessary local data, and includes permission, timeout, no-result, unavailable-product, empty, loading, success, and error states. Native browser capabilities, semantic HTML, responsive CSS, and Node's built-in test runner keep the implementation small, auditable, accessible, and easy to deploy as a static site.

## Project structure

```text
index.html      Semantic application shell and CSP
styles.css      Responsive visual design and states
app.js          Catalog, parser, recommendations, state, and interactions
app.test.mjs    Node built-in deterministic tests
.gitignore      Submission exclusions
README.md       Evaluator and submission documentation
```
