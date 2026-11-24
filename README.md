# EatRite: balance your plate, not just your protein

**wHACKiest 2026 · Track 3: Know Thyself · Team Syntax Squad (ID 62598265)**

India’s protein boom has people counting grams of protein while fibre, iron, calcium and vitamins go unchecked. EatRite turns your nutrient targets, or your doctor’s diet chart, into meals you can order or cook today, shows the *shape* of your day, and nudges you toward whatever your plate is missing.

## Features
| Area | What it does |
|---|---|
| **Doctor’s diet chart → rules** | Paste, speak or (with AWS Bedrock) upload a photo of the advice. EatRite extracts sugar/carb caps, food preference and allergens. You confirm them, and they become **hard rules**: meals that break them are hidden. |
| **Balanced-plate score** | Every meal is scored on how well it fills your *remaining* gaps (protein, fibre, iron, calcium, vitamin C), not on protein alone, with a “protein is covered but fibre is low” warning. |
| **Shape of your day** | A radar chart of five nutrients. An even shape means a balanced day. A lopsided one shows what is missing. |
| **Plan my day** | One click fills the open meal slots with the combination that best balances the day within your rules, with the total cost. |
| **7-day insights** | Daily balance scores plus a plain-language insight: weakest nutrient, and days when protein was on target but fibre or iron was not. |
| **Personal targets** | Starting-point targets from sex and weight (editable; verify with ICMR-NIN RDA 2020). |
| **Order or cook** | Order hand-off message to a partner kitchen, plus step-by-step recipes with read-aloud. |
| **Elder-friendly** | Large-text mode, voice dictation of the doctor’s advice, read-aloud (ElevenLabs when configured, browser voice otherwise). |
| **Privacy and data ownership** | All personal data stays in your browser. The server is stateless. Delete everything in one click, or export it. |

## Run it
Requires Node.js 18+.
```bash
npm install
npm start          # http://localhost:3000
npm test           # 9 unit tests (engine, planner, chart parser)
```
`public/index.html` is also fully standalone: open it directly in a browser (or host it anywhere) and everything except the server-only features works.

Optional integrations (copy `.env.example` to `.env`):
| Integration | Needs | Adds |
|---|---|---|
| **AWS Bedrock** | AWS credentials, `AWS_REGION`, `BEDROCK_MODEL_ID` | One-line AI explanations on the top meals; reading a diet-chart **photo** |
| **ElevenLabs** | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` | Natural read-aloud voice |

The nutrient maths is always deterministic. The LLM never produces nutrition numbers.

## Architecture
```
public/index.html  (UI + engine, works standalone)
        │  optional, same origin
        ▼
server.js (Express) ── src/engine.js   rules, gap scoring, planner, nudges (tested)
                   ├── src/chart.js    diet-chart text → limits (tested)
                   └── src/ai.js       optional Bedrock / ElevenLabs
data/meals.json  (16 sample meals; the same data is embedded in the page)
```
The page mirrors `src/engine.js` so it can run without a server. API: `GET /api/status`, `GET /api/meals/:id`, `POST /api/recommend`, `/api/day`, `/api/chart`, `/api/explain`, `/api/tts`.

## Honest scope
- **Sample data:** meals, nutrient values, prices and kitchens are **illustrative**. Replace nutrient values with **IFCT 2017** (ICMR-NIN) before real use. Default targets must be verified against ICMR-NIN RDA (2020).
- **Orders are simulated.** No real kitchen is contacted.
- **Roadmap, not built:** accounts (Cognito), DynamoDB, Lambda/Amplify hosting, real partner onboarding and payments, wearable data, regional-language voice.
- **Bedrock and ElevenLabs paths** are implemented but untested against live keys. All offline paths are tested.
- **Not medical advice.** A doctor’s limits always win. Salt/sodium advice is noticed but not modelled.

## License
MIT
