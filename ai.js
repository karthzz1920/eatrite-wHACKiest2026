// Optional integrations. Each returns null when not configured, so the app always works offline.
let client = null;
const bedrockReady = () => !!process.env.BEDROCK_MODEL_ID;
async function bedrock(content, maxTokens = 400) {
  if (!bedrockReady()) return null;
  try {
    const sdk = require('@aws-sdk/client-bedrock-runtime');
    client = client || new sdk.BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
    const out = await client.send(new sdk.ConverseCommand({ modelId: process.env.BEDROCK_MODEL_ID, messages: [{ role: 'user', content }], inferenceConfig: { maxTokens } }));
    return out.output.message.content.map((c) => c.text || '').join('').trim();
  } catch (e) { console.warn('Bedrock unavailable:', e.message); return null; }
}
const readChartImage = (buf, format) => bedrock([{ image: { format, source: { bytes: buf } } }, { text: 'Transcribe the diet advice in this image as plain text. Include every number and limit exactly as written. Output only the text.' }], 800);
const explain = (meal, reason) => bedrock([{ text: `In one friendly sentence (max 30 words), explain why "${meal.name}" suits someone with this need: ${reason} Do not state any nutrition numbers.` }], 120);
async function tts(text) {
  const key = process.env.ELEVENLABS_API_KEY, voice = process.env.ELEVENLABS_VOICE_ID;
  if (!key || !voice) return null;
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, { method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' }, body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }) });
  return r.ok ? Buffer.from(await r.arrayBuffer()) : null;
}
module.exports = { bedrockReady, readChartImage, explain, tts, ttsReady: () => !!(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID) };
