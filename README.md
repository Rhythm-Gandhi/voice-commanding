# Piko - Voice Command Shopping Assistant

Piko is a cheerful, mobile-first shopping companion built for a software engineering assessment. Phase 3 adds transparent, local recommendation logic with no runtime dependencies or build step.

## Currently implemented

- Add, edit, remove, complete, and clear shopping items
- Increase, decrease, and directly specify quantities and units
- Automatic grouping into Produce, Dairy, Bakery, Snacks, Beverages, Household, Pantry, and Other
- Versioned localStorage persistence with damaged-data recovery
- Responsive item cards, intentional empty/loading/success/error states, and a prepared voice-assistant panel
- Semantic HTML, keyboard controls, visible focus states, reduced-motion support, and safe DOM rendering
- Input normalization, validation, and reasonable limits
- Native Web Speech API recognition with live transcript and clear listening, processing, success, and error states
- One shared parser/action pipeline for spoken and typed commands
- English, Hindi, and Spanish add, remove, quantity, multi-item, and clear commands
- Local shopping history with added, completed, and removed timestamps grouped into calendar-day shopping sessions
- Separate regular, likely-needed, seasonal, demonstration-deal, and substitute recommendations
- Transparent reasons, direct add and dismiss controls, and active-list exclusion
- Explicit optional demo history plus separate list, history, and full-data reset controls
- Multilingual voice and typed suggestion requests
- Optional native spoken confirmation for successful voice actions
- Microphone permission, timeout, no-speech, network, cancellation, and unsupported-browser handling

## Planned

- Phase 4: voice product search with brand, size, and price filters
- Phase 5: final hardening, documentation, and deployment

## Run locally

The app has no install step. Serve this directory with any static server, for example:

```powershell
python -m http.server 8000
```

Then open <http://localhost:8000>. Directly opening `index.html` may also work, but a local server matches production behavior more closely.

## Voice and typed commands

Choose English, हिन्दी, or Español, then tap the microphone or enter the same phrase in the command field. Examples:

```text
Add 2 bottles of milk and 5 apples
Remove milk from my list
Set apples to 3
Add two more apples
दो बोतल दूध जोड़ो
दूध की मात्रा तीन करो
Añade dos botellas de leche
Cambia la cantidad de leche a tres botellas
```

Suggestion examples include `What should I buy?`, `What do I usually buy?`, `What might I need?`, `मुझे क्या चाहिए`, and `¿Qué suelo comprar?`. Voice recognition availability and supported languages depend on the browser. Typed commands always use the same parser and remain available as a fallback. Search requests remain an honest Phase 4 placeholder.

## How predictions work

Piko treats each local calendar day with an addition as a shopping session. For every repeatedly added item it calculates the median number of days between sessions. An item becomes eligible when at least 75% of that typical interval has elapsed. Its ranking then combines capped addition frequency, how due it is, and repeat-session evidence. Items added very recently, already on the active list, dismissed by the user, or never purchased are excluded. “Your regulars” uses frequency only and is deliberately separate from this prediction.

Seasonal picks and sale prices come from a small curated demonstration catalog; they are not live retailer claims. Deals matching prior additions rank first. Alternatives are returned only when a previously added catalog product is marked unavailable and has curated substitutes.

## Demo and reset

Select **Load demo history** to add clearly labelled, relative sample events for milk, bread, eggs, and apples. The pattern immediately demonstrates regulars, due predictions, deal ranking, and milk alternatives without pretending the data belongs to the user. Reloading replaces only prior demo events and preserves genuine history.

Use **Clear list** to keep history, **Clear history** to keep the current list, or **Reset all data** to remove the list, history, preferences, dismissed suggestions, and demo data. Each destructive action requires confirmation.

## Test

With a current Node.js release installed:

```powershell
node --test app.test.mjs
```

Manual checks should also cover demo loading, adding and dismissing recommendation cards, all reset confirmations, typed suggestion commands in all three languages, refresh persistence, keyboard navigation, and mobile widths.

## Data and privacy

Piko stores one versioned record under `piko:shopping:v1` in the current browser's localStorage. Shopping history contains only item details, event type, and timestamps needed for recommendations; it contains no account or profile information. It does not intentionally record or store microphone audio. Browser speech recognition may rely on a browser or provider-managed remote recognition service. No environment variables or API keys are used.

## Project structure

```text
index.html      Semantic application shell
styles.css      Responsive visual design
app.js          State, persistence, rendering, and interactions
app.test.mjs    Dependency-free logic checks
```
