# Piko - Voice Command Shopping Assistant

Piko is a cheerful, mobile-first shopping companion built for a software engineering assessment. Phase 2 adds multilingual voice and typed commands with no runtime dependencies or build step.

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
- Honest placeholders for understood search and suggestion requests
- Optional native spoken confirmation for successful voice actions
- Microphone permission, timeout, no-speech, network, cancellation, and unsupported-browser handling

## Planned

- Phase 3: history-based, seasonal, sale, and substitute suggestions
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

Voice recognition availability and supported languages depend on the browser. Typed commands always use the same parser and remain available as a fallback. Search and suggestion requests are recognized but intentionally remain placeholders until Phases 4 and 3 respectively.

## Test

With a current Node.js release installed:

```powershell
node --test app.test.mjs
```

Manual checks should also cover typed commands in all three languages, live transcripts, microphone permission errors, listening cancellation, spoken-feedback preference, refresh persistence, keyboard navigation, and mobile widths.

## Data and privacy

Piko stores one versioned record under `piko:shopping:v1` in the current browser's localStorage. It does not intentionally record or store microphone audio. Browser speech recognition may rely on a browser or provider-managed remote recognition service. No environment variables or API keys are used.

## Project structure

```text
index.html      Semantic application shell
styles.css      Responsive visual design
app.js          State, persistence, rendering, and interactions
app.test.mjs    Dependency-free logic checks
```
