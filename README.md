# Piko - Voice Command Shopping Assistant

Piko is a cheerful, mobile-first shopping companion built for a software engineering assessment. Phase 1 provides a polished manual shopping list with no runtime dependencies or build step.

## Currently implemented

- Add, edit, remove, complete, and clear shopping items
- Increase, decrease, and directly specify quantities and units
- Automatic grouping into Produce, Dairy, Bakery, Snacks, Beverages, Household, Pantry, and Other
- Versioned localStorage persistence with damaged-data recovery
- Responsive item cards, intentional empty/loading/success/error states, and a prepared voice-assistant panel
- Semantic HTML, keyboard controls, visible focus states, reduced-motion support, and safe DOM rendering
- Input normalization, validation, and reasonable limits

## Planned

- Phase 2: multilingual voice commands and natural-language intent parsing
- Phase 3: history-based, seasonal, sale, and substitute suggestions
- Phase 4: voice product search with brand, size, and price filters
- Phase 5: final hardening, documentation, and deployment

## Run locally

The app has no install step. Serve this directory with any static server, for example:

```powershell
python -m http.server 8000
```

Then open <http://localhost:8000>. Directly opening `index.html` may also work, but a local server matches production behavior more closely.

## Test

With a current Node.js release installed:

```powershell
node --test app.test.mjs
```

Manual checks should cover add, edit, remove, quantity controls, completion, category grouping, refresh persistence, empty and invalid states, keyboard navigation, and mobile widths.

## Data and privacy

Phase 1 stores one versioned record under `piko:shopping:v1` in the current browser's localStorage. No data leaves the browser, and no environment variables or API keys are used.

## Project structure

```text
index.html      Semantic application shell
styles.css      Responsive visual design
app.js          State, persistence, rendering, and interactions
app.test.mjs    Dependency-free logic checks
```
