// Reads a doctor's diet chart (plain text) into editable limits. The user must confirm them in the UI.
function parseChart(text = '') {
  const t = String(text).toLowerCase(); const limits = {}; const profile = {}; const notes = [];
  const num = (re) => { const m = t.match(re); return m ? Number(m[1]) : null; };
  const sugar = num(/sugars?[^\d\n,.;]{0,25}?(\d{1,3})\s*g/); const carbs = num(/carb(?:ohydrate)?s?[^\d\n,.;]{0,25}?(\d{2,3})\s*g/);
  if (sugar) limits.sugarCap = sugar; else if (/low[- ]?sugar|sugar[- ]?free|diabet|prediabet/.test(t)) { limits.sugarCap = 25; notes.push('Low-sugar advice found: using a 25 g/day sugar cap. Edit if your doctor gave a number.'); }
  if (carbs) limits.carbCap = carbs; else if (/low[- ]?carb/.test(t)) { limits.carbCap = 130; notes.push('Low-carb advice found: using a 130 g/day carb cap. Edit if your doctor gave a number.'); }
  if (/vegetarian|no meat/.test(t)) profile.diet = 'veg'; else if (/eggetarian/.test(t)) profile.diet = 'egg';
  const avoid = []; if (/no dairy|lactose|dairy[- ]free|milk allerg/.test(t)) avoid.push('dairy'); if (/egg allerg|no eggs?/.test(t)) avoid.push('egg'); if (/fish allerg|shellfish|no fish/.test(t)) avoid.push('fish');
  if (avoid.length) profile.avoid = avoid;
  if (/sodium|salt|bp|hypertens/.test(t)) notes.push('Salt/sodium advice noticed. Not modelled in this prototype, so please follow your doctor’s guidance.');
  if (!Object.keys(limits).length && !avoid.length && !profile.diet) notes.push('No limits recognised. Try wording like “low sugar”, “sugar under 25 g” or “low carb”.');
  return { limits, profile, notes };
}
module.exports = { parseChart };
