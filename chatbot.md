# LifeLink Chatbot — Design Concept

**Status:** Draft for review
**Type:** Rule-based / decision-tree chatbot (no LLM, no external API keys)

---

## 1. Core Idea

A menu-driven chatbot that helps users navigate LifeLink's health features without needing to know where things are in the app. The user picks a category, the bot narrows down through a few guided questions, and ends in an **action** — showing information, collecting input, or redirecting to a relevant screen/portal (e.g. the health records upload portal).

This avoids LLMs entirely: no hallucination risk, no API cost, fully predictable behavior — which matters a lot for a health/safety-adjacent app.

---

## 2. Architecture

### 2.1 Menu as data, not code

Instead of hardcoded `if/elif` chains, the whole conversation flow is defined as a **tree structure** (JSON), with a single generic engine that walks it. This means:

- Adding/editing questions = editing a JSON file, not the app's code.
- The tree can be updated on a server and fetched by the app — so flows can change without an app store release.
- Non-engineers can eventually maintain it (especially if paired with an admin panel — see Feature Ideas).

**Node types:**
| Node type | Purpose |
|---|---|
| `menu` | Shows a prompt + numbered options, waits for a choice |
| `redirect` | Sends user to a specific in-app screen or external link |
| `form` | Collects free-text/structured input (e.g. symptoms, location) |
| `info` | Displays a static message/tip and ends or loops back |
| `escalate` | Triggers an emergency or human-handoff flow |

### 2.2 Example tree (expanded from original idea)

```json
{
  "root": {
    "type": "menu",
    "prompt": "What are you in doubt about today?",
    "options": {
      "1": {"label": "Health Records", "next": "health_records"},
      "2": {"label": "Emergency Availability", "next": "emergency_start"},
      "3": {"label": "Medical Advice", "next": "medical_advice"},
      "4": {"label": "Mental Health Support", "next": "mental_health"},
      "5": {"label": "Nutrition & Diet", "next": "nutrition"},
      "6": {"label": "Fitness & Exercise", "next": "fitness"},
      "7": {"label": "Symptom Checker", "next": "symptom_checker"},
      "8": {"label": "Medication Information", "next": "medication_info"},
      "9": {"label": "Health Insurance", "next": "insurance"},
      "10": {"label": "General Health Tips", "next": "health_tips"}
    }
  },
  "health_records": {
    "type": "menu",
    "prompt": "Is this about your medical records?",
    "options": {
      "1": {"label": "Yes", "next": "health_records_action"},
      "2": {"label": "Go back", "next": "root"}
    }
  },
  "health_records_action": {
    "type": "menu",
    "prompt": "Would you like to upload records, or view which hospital recently uploaded records about you?",
    "options": {
      "1": {"label": "Upload records", "next": "upload_redirect"},
      "2": {"label": "View hospital uploads", "next": "history_redirect"}
    }
  },
  "upload_redirect": {
    "type": "redirect",
    "target": "app://records/upload",
    "message": "Taking you to the upload portal..."
  },
  "history_redirect": {
    "type": "redirect",
    "target": "app://records/history",
    "message": "Here's your record upload history..."
  }
}
```

---

## 3. Feature Ideas to Extend the Concept

### 3.1 Smarter fallback for free-text (still no LLM)
Menus are great until the user wants to just *type* something ("my chest hurts"). Add a lightweight **local classifier** as a fallback layer only where free text is unavoidable (e.g. Symptom Checker, Medical Advice):
- Small **TF-IDF + Logistic Regression** model (scikit-learn) trained on example phrases per category.
- Or a **CSV-based FAQ matcher**: `question, answer, category` rows, matched via keyword or embedding similarity (`sentence-transformers`, runs locally, no API).
- If confidence is low, don't guess — fall back to the menu ("I'm not sure I understood — did you mean one of these?").

### 3.2 Emergency-first design
Given "Emergency Availability" is option 2, this deserves special treatment, not just another menu branch:
- **Priority shortcut**: a persistent "Emergency" button always visible in the chat UI, bypassing the whole menu tree.
- **Escalate node type**: instead of just showing info, this can trigger:
  - Auto-capture device GPS location (with permission).
  - One-tap call to emergency services or a pre-set emergency contact.
  - Send location + basic profile info to nearest hospital/ambulance service if integrated.
- This should never depend on network availability if avoidable — cache emergency contacts/numbers locally on-device.

### 3.3 Symptom checker as structured decision tree (not just free text)
Rather than (or alongside) free-text symptom matching, build the symptom checker itself as a **branching tree**, like classic triage systems:
- "Where is the discomfort?" → "How long has it lasted?" → "Any of these other symptoms?" → outputs a **triage level** (self-care tip / see a doctor soon / seek emergency care) — never a diagnosis, always a next-step recommendation.
- This keeps it safe (no AI guessing at medical conditions) and is exactly the kind of thing your tree structure already supports.

### 3.4 Personalization without ML
- Pull from the user's existing LifeLink profile (age, known conditions, medications) to **skip irrelevant menu branches** or pre-fill forms — e.g. skip asking allergy questions if already on file.
- Remember last 2-3 categories a user visited, surface them as "Quick access" at the top of the root menu.

### 3.5 Multi-language support
Since it's just a JSON tree, translating is straightforward:
- Store prompts/labels as translation keys (`health_records.prompt`) with a language JSON file per locale, rather than hardcoding English strings in the tree.
- No retraining needed since there's no ML in the menu layer itself.

### 3.6 Offline mode
- Ship the **core menu tree** (not the whole app) bundled locally, so basic navigation and emergency info work with no connectivity.
- Only free-text fallback / record uploads / live hospital data require network — clearly indicate this in the UI ("requires internet") so users aren't confused offline.

### 3.7 Admin panel for non-engineers
- A simple internal web dashboard where a content/clinical team can add or edit menu nodes, without touching code or redeploying the app.
- Version the tree (`v1`, `v2`, ...) so you can roll back a bad edit instantly.
- Optional: A/B test different phrasings of prompts to see which get fewer "Invalid option" fallbacks.

### 3.8 Analytics on the tree itself
- Log which nodes users hit most, where they abandon the flow, and how often they hit "Invalid option" — this tells you which menus are confusing or missing options, and where to prioritize adding free-text fallback intelligence.

### 3.9 Accessibility
- Voice input/output for menu options (especially useful for elderly or visually impaired users in a health app).
- Large-tap-target buttons rather than requiring users to type a number, especially for older users.

### 3.10 Privacy & security (important for health data)
- Any `form` nodes collecting health info should be encrypted in transit and at rest, and ideally not logged in plaintext analytics.
- Clear consent prompts before accessing location (for emergency features) or uploading records.
- Since this is health data, check whether HIPAA (or your region's equivalent, e.g. India's DPDP Act) applies to how you store/transmit anything collected through the bot.

---

## 4. Suggested Tech Stack

| Layer | Suggestion |
|---|---|
| Menu tree storage | JSON file, served from a small backend (FastAPI/Flask) so it can update without app releases |
| Mobile client | Renders tree generically — one screen component that reads `prompt` + `options` and renders buttons |
| Free-text fallback (optional) | scikit-learn (TF-IDF) or sentence-transformers, hosted on your own backend — no external API keys |
| Emergency data | Cached locally on-device for offline access |
| Admin panel | Simple internal web app (could even be a basic React/Next.js CRUD panel) writing to the same JSON/DB the tree engine reads from |

---

## 5. Suggested Build Order (Phases)

1. **Phase 1** — Core menu tree engine + your original 10 categories, redirect nodes working for Health Records upload/history.
2. **Phase 2** — Emergency shortcut + escalate node type (location capture, one-tap call).
3. **Phase 3** — Symptom checker as its own branching sub-tree with triage levels.
4. **Phase 4** — Free-text fallback layer (TF-IDF or embeddings) for Medical Advice / Symptom Checker.
5. **Phase 5** — Admin panel + analytics, multi-language, offline bundling.

---

## 6. Open Questions to Resolve Before Building

- Does "Medical Advice" / "Symptom Checker" need any disclaimers or legal review, given it's giving health-adjacent guidance?
- Who maintains the menu tree content long-term — engineering or a clinical/content team? (Affects whether the admin panel is a Phase 1 or Phase 5 priority.)
- Is there a real backend for hospital record uploads/history already, or does that need building too?