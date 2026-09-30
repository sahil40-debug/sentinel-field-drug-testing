# Sentinel — Digital Companion for Field Drug Testing

> **Smart India Hackathon 2026 — Problem Statement PS-231**
>
> A presumptive, AI-assisted field drug-testing companion. Capture a colour-change test, let a vision-language model compare the reaction against the expected reference colour, and produce a GPS-stamped, tamper-evident digital record — all from a phone, in the field.

**🌐 Live demo:** [https://sentinel-field-drug-testing.vercel.app](https://sentinel-field-drug-testing.vercel.app)

---

## ⚠️ Important disclaimer

This system produces **presumptive field-testing results only**. It is **not** a laboratory confirmation and does **not** replace forensic laboratory analysis. All results must be confirmed by an accredited laboratory before use in any proceeding. The meaning of *Positive / Negative* is defined by the selected test type and its corresponding test-kit interpretation.

---

## ✨ What it does

Sentinel digitises the workflow around existing colour-change presumptive test kits:

1. **Select a test** — the officer searches/picks the substance the field test is intended to identify (e.g. *Cocaine → Scott test → expected Blue*).
2. **Capture & locate** — photograph the completed test (or upload an image), capture GPS, and optionally pick manual colour overrides when the photo didn't capture colours clearly.
3. **AI colour analysis** — a Vision-Language Model (VLM) compares the reaction colour to the expected reference and returns a structured JSON result: **Positive / Negative / Inconclusive** + confidence + reason + observed/expected colours + notes.
4. **Result** — review the classification, colour evidence, and model reasoning.
5. **Finalize** — save the record; the system computes a **SHA-256 image hash** and a **SHA-256 record hash** (over a canonical, sorted-key payload).
6. **History** — searchable, filterable log of all finalized tests.
7. **Verification** — recompute the hashes from stored fields and compare against the stored values; any tampering (including of GPS fields) is detected.

---

## 🧪 Supported substances (33 profiles)

Built-in presumptive colour-test profiles sourced from the DEA *Analysis of Drugs* Manual (Appendix 1C/1D, Rev 3, 2018/2019), UNODC, and *Clark's Analysis of Drugs and Poisons*:

| Substance | Reagent | Expected colour |
|---|---|---|
| Heroin / Morphine / Codeine | Marquis | Purple-violet |
| Methamphetamine | Marquis | Orange-brown |
| Amphetamine | Marquis | Orange to brown |
| MDA / MDMA | Marquis | Purple to black |
| Hydrocodone | Marquis | Yellow→brown→violet |
| Oxycodone | Marquis | Yellow→brown→violet |
| Fentanyl | Marquis | Orange |
| Phentermine | Marquis | Orange |
| Peyote / Mescaline | Marquis | Orange |
| Psilocin | Marquis | Greenish-brown |
| Psilocybin | Marquis | Dull orange |
| Cocaine | Scott (cobalt thiocyanate) | Blue |
| Diphenhydramine | Marquis | Yellow |
| Aspirin | Marquis | Slow pink to rose |
| Acetaminophen / Paracetamol | Nitric acid | Fuming orange |
| Quinine | Nitric acid | UV fluorescence |
| Quinidine | Nitric acid | UV fluorescence |
| Procaine | Sanchez | Red |
| Benzocaine | Sanchez | Weak red |
| Lidocaine | Cobalt thiocyanate + SnCl₂ | Blue precipitate |
| Cannabis / THC | Duquenois-Levine | Purple |
| Cannabis / THC | Fast Blue B | Dark red/purple |
| Ketamine | Mandelin | Greenish to yellow-orange |
| LSD | Ehrlich (p-DMAB) | Purple to blue |
| Barbiturates | Dille-Koppanyi | Red-violet to purple |
| Methadone | Marquis | Pink to purple |
| Methylphenidate | Marquis | Orange-red |
| Tramadol | Marquis | Yellow to orange |
| Mephedrone (4-MMC) | Marquis | Yellow to greenish |
| Hydromorphone | Marquis | Purple |
| Benzodiazepines | Zimmerman | Pink to purple |
| MDPV | Mandelin | Blue-grey to black |
| Dextromethorphan | Marquis | Yellow to brown |

Add new substances by appending to `src/lib/drug-profiles.ts` — the classifier loads them automatically.

---

## 🤖 The AI model & JSON schema

The image-analysis engine uses **Google Gemini** via the `@google/genai` SDK (model `gemini-2.5-flash-lite` — free tier, 1500 requests/day). The code includes a built-in **model fallback** that tries multiple Gemini model names in order, so it keeps working even if Google deprecates a model name. Requires a `GEMINI_API_KEY` environment variable — get one free at **https://aistudio.google.com/apikey**.

### Input to the model
- The captured image (base64 data URL)
- The selected test definition: target substance, aliases, reagent, expected reaction colour + representative hex, interpretation note, source
- Optional **manual colour overrides** (reference-card colour and/or reaction colour) when the photo didn't capture colours clearly

### Output schema (strict JSON, zod-validated)
```json
{
  "classification": "Positive | Negative | Inconclusive",
  "confidence": 0.0,
  "reason": "string",
  "observed_colour": { "name": "Blue", "hex": "#1E5BB8", "rgb": [30, 91, 184] },
  "expected_colour": { "name": "Blue", "hex": "#1E5BB8" },
  "colour_match": "strong | moderate | weak | none",
  "reference_card_detected": true,
  "reaction_area_detected": true,
  "image_quality": "good | acceptable | poor",
  "manual_override_used": false,
  "notes": ["string"]
}
```

The full schema + prompt live in [`src/lib/ai-schema.ts`](src/lib/ai-schema.ts).

---

## 🛡️ Tamper-evidence & integrity

Every finalized record is protected by two SHA-256 hashes (Node `crypto`, `src/lib/integrity.ts`):

1. **Image hash** — SHA-256 of the raw captured image bytes.
2. **Record hash** — SHA-256 over a **canonical** serialisation (sorted keys, excludes the hash itself) of: recordNo, drugProfileId, operatorId, imageDataUrl, imageHash, **latitude, longitude, locationLabel**, analysisJson, classification, confidence, reason, createdAt.

**Verification** recomputes both hashes from the *stored* column values and compares against the stored hashes. Tampering **any** stored field — including the denormalised reason/classification/location columns — breaks the record hash and is flagged as `✕ VERIFICATION FAILED`.

---

## 🏗️ Tech stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4 + shadcn/ui (New York) + Playfair Display (serif headings)
- **Database:** Prisma ORM + Neon Postgres (production) / SQLite (local dev)
- **AI:** Google Gemini (`@google/genai` SDK, `gemini-2.5-flash-lite` model with auto-fallback)
- **State:** Zustand (client) — single-page view-state app
- **Icons:** Lucide
- **PWA:** manifest + service worker (installable, offline shell)

---

## 📁 Project structure

```
src/
├─ app/
│  ├─ api/
│  │  ├─ drugs/         GET  — list/search drug profiles (auto-seeds DB)
│  │  ├─ ai-analyze/     POST — VLM image analysis (strict JSON)
│  │  ├─ records/        GET (list/search) + POST (finalize + hash)
│  │  ├─ records/[id]/   GET / DELETE
│  │  ├─ verify/         POST — recompute & compare hashes
│  │  └─ stats/          GET — dashboard counters
│  ├─ globals.css        lavender editorial theme
│  ├─ layout.tsx        fonts + PWA metadata
│  └─ page.tsx           single-page app entry
├─ components/
│  ├─ drug-test/
│  │  ├─ app-shell.tsx          sticky nav + footer
│  │  ├─ ui-bits.tsx            shared UI (badges, swatches)
│  │  └─ views/
│  │     ├─ login.tsx           split-screen editorial hero
│  │     ├─ dashboard.tsx       stats + recent tests
│  │     ├─ select-drug.tsx     searchable substance list
│  │     ├─ capture.tsx         camera + upload + GPS + manual colour override
│  │     ├─ analyzing.tsx       animated stepper
│  │     ├─ result.tsx          result hero + evidence + save + verify
│  │     ├─ history.tsx         searchable log
│  │     ├─ record-detail.tsx   full record + integrity
│  │     └─ verification.tsx    tamper-evidence checker
│  └─ ui/               shadcn/ui components
└─ lib/
   ├─ ai-schema.ts      zod schema + prompt (strict JSON)
   ├─ ai-client.ts       server-only VLM wrapper
   ├─ db.ts              Prisma client
   ├─ drug-profiles.ts   33 substance profiles
   ├─ geo.ts             geolocation + reverse-geocode
   ├─ image-quality.ts   client-side sharpness/brightness analysis
   ├─ integrity.ts       SHA-256 image + record hashing
   ├─ store.ts           Zustand app store
   └─ types.ts           shared DTOs
```

---

## 🚀 Getting started

### Prerequisites
- Node.js 20+ (or [Bun](https://bun.sh))
- A `GEMINI_API_KEY` — free from https://aistudio.google.com/apikey
- A Postgres database (Neon free tier for Vercel; or use SQLite locally by temporarily setting `provider = "sqlite"` in `prisma/schema.prisma`)

### Install & run
```bash
bun install                 # or npm install
bun run db:push             # create the database schema (Postgres or SQLite)
bun run dev                 # start on http://localhost:3000
```

Open the app, sign in with any operator ID (e.g. `OFFICER-01`), and run a test.

### Useful scripts
| Script | What it does |
|---|---|
| `bun run dev` | Start dev server (port 3000) |
| `bun run lint` | ESLint |
| `bun run db:push` | Push Prisma schema to the database |
| `bun run db:generate` | Regenerate Prisma Client |
| `bun run build` | Production build |
| `bun run start` | Run the production server |

---

## 📱 Progressive Web App

Sentinel is a **PWA** — installable to the home screen with an offline shell:
- `public/manifest.json` — app name, icons, theme colour, display standalone
- `public/sw.js` — service worker caching the app shell for offline use
- Registered via `src/components/pwa/register-sw.ts`

To install: open the app in a mobile/desktop browser → "Add to Home screen" / "Install".

---

## ☁️ Deployment

Sentinel deploys cleanly to any Next.js-friendly host. Recommended: **Vercel**.

### Vercel (recommended — the production deployment target)

This project is configured for one-click Vercel deployment. The `vercel-build` script auto-runs `prisma generate && prisma db push && next build`, so Postgres tables are created automatically on every deploy.

1. Push this repo to GitHub.
2. Import the repo at [vercel.com/new](https://vercel.com/new).
3. Framework preset: **Next.js** (auto-detected).
4. Create a **Neon Postgres** database: Vercel project → **Storage** tab → Create Database → Postgres (Neon). Vercel auto-adds `POSTGRES_URL` and friends.
5. Add environment variables (Settings → Environment Variables):
   - `DATABASE_URL` = `#{POSTGRES_URL}` (or paste the Neon connection string directly) — all 3 environments, type Secret
   - `GEMINI_API_KEY` = [your key from https://aistudio.google.com/apikey] — all 3 environments, type Secret
6. Deploy. The build auto-creates the Postgres tables via `prisma db push`.

> **Note:** If the auto-created env var conflicts with an existing `DATABASE_URL`, delete the old one first. Neon's Prisma tab (in the Vercel Storage view) shows the connection string if you need it.

### Other hosts
- **Netlify / Render / Railway** — deploy as a Next.js app with a managed Postgres and the same two env vars (`DATABASE_URL`, `GEMINI_API_KEY`).
- **Self-hosted** — `bun run build && bun run start` behind a reverse proxy; provide a Postgres instance and the `GEMINI_API_KEY`.

---

## 🔌 API reference

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/drugs?q=` | List/search drug profiles (auto-seeds DB on first call) |
| `POST` | `/api/ai-analyze` | VLM analysis — body: `{ imageDataUrl, drugProfileId, manualReferenceHex?, manualReactionHex? }` → returns `{ result, imageHash, drug }` |
| `GET` | `/api/records?q=&classification=&limit=` | List/search finalized records |
| `POST` | `/api/records` | Finalize + store a record — body: `{ imageDataUrl, drugProfileId, analysis, operatorId, location? }` |
| `GET` | `/api/records/[id]` | Get one record (by cuid or recordNo) |
| `DELETE` | `/api/records/[id]` | Delete a record |
| `POST` | `/api/verify` | Verify integrity — body: `{ id? \| recordNo? }` → returns match/mismatch per hash |
| `GET` | `/api/stats` | Dashboard counters |

---

## 🔒 Security notes

- The AI analysis runs **server-side only** — `@google/genai` is never imported in client code.
- Hashes and integrity status are computed on the backend; the frontend never generates or trusts client-side hashes.
- Geolocation requires explicit browser permission and is opt-in.
- For production, add authentication (NextAuth.js v4 is available in the stack) and rate-limit the `/api/ai-analyze` route.

---

## 📜 Sources

- DEA *Analysis of Drugs Manual*, Appendix 1C/1D, Revision 3 (2018/2019)
- UNODC *Recommended Methods for the Identification and Analysis of Cocaine/Cannabis*
- UNODC *Early Warning Advisory on New Psychoactive Substances*
- *Clark's Analysis of Drugs and Poisons*

---

## 📄 License

Prototype built for the Smart India Hackathon 2026 (PS-231). Educational / demonstrative use.
