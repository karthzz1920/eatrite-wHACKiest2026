const fs = require('fs'); const path = require('path'); const express = require('express');
try { for (const l of fs.readFileSync('.env', 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2]; } } catch {}
const { recommend, dayAnalysis, DEFAULT_TARGETS } = require('./src/engine'); const { parseChart } = require('./src/chart'); const ai = require('./src/ai');
const meals = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/meals.json'), 'utf8'));
const byIds = (ids = []) => ids.map((id) => meals.find((m) => m.id === id)).filter(Boolean);
const app = express(); app.use(express.json({ limit: '10mb' })); app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/status', (_, res) => res.json({ bedrock: ai.bedrockReady(), elevenlabs: ai.ttsReady(), defaults: DEFAULT_TARGETS }));
app.get('/api/meals/:id', (req, res) => { const m = meals.find((x) => x.id === req.params.id); m ? res.json(m) : res.status(404).json({ error: 'not found' }); });
app.post('/api/recommend', async (req, res) => {
  const { profile, limits, targets, logged } = req.body || {};
  const out = recommend({ meals, profile, limits: limits || {}, targets: { ...DEFAULT_TARGETS, ...targets }, logged: byIds(logged) });
  if (ai.bedrockReady()) await Promise.all(out.results.slice(0, 3).map(async (r) => { r.aiNote = await ai.explain(r.meal, r.reason); }));
  res.json(out);
});
app.post('/api/explain', async (req, res) => { const { id, reason } = req.body || {}; const m = byIds([id])[0]; res.json({ note: m ? await ai.explain(m, String(reason || '')) : null }); });
app.post('/api/day', (req, res) => { const { profile, limits, targets, logged } = req.body || {}; res.json(dayAnalysis({ meals, profile, limits: limits || {}, targets: { ...DEFAULT_TARGETS, ...targets }, logged: byIds(logged) })); });
app.post('/api/chart', async (req, res) => {
  let { text, imageBase64, format } = req.body || {}; let source = 'text';
  if (!text && imageBase64) {
    text = await ai.readChartImage(Buffer.from(imageBase64, 'base64'), format || 'png');
    if (!text) return res.status(501).json({ error: 'Reading photos needs AWS Bedrock (see README). Paste the chart text instead.' });
    source = 'bedrock';
  }
  res.json({ source, text, ...parseChart(text) });
});
app.post('/api/tts', async (req, res) => { const a = await ai.tts(String((req.body || {}).text || '').slice(0, 1500)); if (!a) return res.status(501).json({ error: 'ElevenLabs not configured' }); res.type('audio/mpeg').send(a); });

if (require.main === module) { const port = process.env.PORT || 3000; app.listen(port, () => console.log(`EatRite running on http://localhost:${port}`)); }
module.exports = app;
