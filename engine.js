// EatRite nutrient engine: deterministic and explainable. Nutrition numbers never come from an LLM.
const SCORE_NUTS = ['protein', 'fibre', 'iron', 'calcium', 'vitC'];
const LABEL = { protein: 'Protein', fibre: 'Fibre', iron: 'Iron', calcium: 'Calcium', vitC: 'Vitamin C', carbs: 'Carbs', fat: 'Fat', sugar: 'Sugar' };
const DIET_RANK = { veg: 0, egg: 1, nonveg: 2 };
// Editable starting points. Verify against ICMR-NIN Nutrient Requirements for Indians (2020).
const DEFAULT_TARGETS = { protein: 55, carbs: 260, fibre: 30, fat: 60, iron: 19, calcium: 1000, vitC: 80 };
const sum = (list, k) => list.reduce((a, m) => a + (m[k] || 0), 0);
const pct = (x) => Math.round(x * 100);

function exclusionReason(meal, profile, limits, logged, mealsLeft) {
  if (DIET_RANK[meal.diet] > DIET_RANK[profile.diet || 'nonveg']) return 'diet';
  if ((profile.avoid || []).some((a) => meal.allergens.includes(a))) return 'avoid';
  if (profile.budget && meal.price > profile.budget) return 'budget';
  for (const [cap, key] of [['sugarCap', 'sugar'], ['carbCap', 'carbs']]) {
    if (!limits[cap]) continue;
    const remaining = Math.max(0, limits[cap] - sum(logged, key));
    if (meal[key] > Math.min(remaining, (remaining / mealsLeft) * 1.25)) return key; // doctor limits are hard rules
  }
  return null;
}

function coverage(meal, targets, logged, mealsLeft) {
  const cov = {};
  for (const n of SCORE_NUTS) {
    const need = Math.max(0, targets[n] - sum(logged, n)) / mealsLeft;
    cov[n] = need === 0 ? 1 : Math.min(meal[n] / need, 1);
  }
  return cov;
}

function recommend({ meals, profile = {}, limits = {}, targets = DEFAULT_TARGETS, logged = [], top = 6 }) {
  const mealsLeft = Math.max(1, 3 - logged.length);
  const excluded = {}; const ranked = [];
  for (const meal of meals) {
    const why = exclusionReason(meal, profile, limits, logged, mealsLeft);
    if (why) { excluded[why] = (excluded[why] || 0) + 1; continue; }
    const cov = coverage(meal, targets, logged, mealsLeft);
    const score = pct(SCORE_NUTS.reduce((a, n) => a + cov[n], 0) / SCORE_NUTS.length);
    const sorted = SCORE_NUTS.slice().sort((a, b) => cov[b] - cov[a]);
    const weakest = sorted[sorted.length - 1];
    const proteinTrap = cov.protein >= 0.9 && cov[weakest] < 0.5;
    let reason = `Covers ${pct(cov[sorted[0]])}% of your ${LABEL[sorted[0]].toLowerCase()} and ${pct(cov[sorted[1]])}% of your ${LABEL[sorted[1]].toLowerCase()} need for this meal.`;
    if (limits.sugarCap) reason += ` Sugar ${meal.sugar} g fits your limit.`;
    if (limits.carbCap) reason += ` Carbs ${meal.carbs} g fit your limit.`;
    if (proteinTrap) reason += ` Heads-up: protein is covered but ${LABEL[weakest].toLowerCase()} is low, so pair it with something else.`;
    ranked.push({ meal, score, coverage: Object.fromEntries(SCORE_NUTS.map((n) => [n, pct(cov[n])])), reason, proteinTrap });
  }
  ranked.sort((a, b) => b.score - a.score || a.meal.price - b.meal.price);
  return { results: ranked.slice(0, top), excluded, mealsLeft };
}

function dayAnalysis({ meals, profile = {}, limits = {}, targets = DEFAULT_TARGETS, logged = [] }) {
  const totals = {}; const pcts = {};
  for (const n of [...SCORE_NUTS, 'carbs', 'fat', 'sugar']) totals[n] = Math.round(sum(logged, n) * 10) / 10;
  for (const n of [...SCORE_NUTS, 'carbs', 'fat']) pcts[n] = pct(totals[n] / targets[n]);
  const score = logged.length ? pct(SCORE_NUTS.reduce((a, n) => a + Math.min(totals[n] / targets[n], 1), 0) / SCORE_NUTS.length) : 0;
  const nudges = [];
  if (!logged.length) nudges.push('Add a meal to see your balance and get nudges.');
  else {
    const mealsLeft = Math.max(1, 3 - logged.length);
    for (const n of SCORE_NUTS.slice().sort((a, b) => pcts[a] - pcts[b]).slice(0, 2)) {
      if (pcts[n] >= 70) continue;
      const pool = meals.filter((m) => !exclusionReason(m, profile, limits, logged, mealsLeft)).sort((a, b) => b[n] - a[n]);
      nudges.push(`${LABEL[n]} is at ${pcts[n]}% of today’s target.${pool[0] ? ` Try ${pool[0].name} next.` : ''}`);
    }
    if (!nudges.length) nudges.push('Nicely balanced so far. Keep it up.');
  }
  return { totals, pcts, score, nudges };
}

// Greedy day planner: fills the remaining meal slots with the meals that best balance the day.
function planDay({ meals, profile = {}, limits = {}, targets = DEFAULT_TARGETS, logged = [] }) {
  const chosen = [...logged]; const plan = [];
  while (chosen.length < 3) {
    const r = recommend({ meals, profile, limits, targets, logged: chosen, top: 20 }).results.find((x) => !chosen.includes(x.meal));
    if (!r) break; chosen.push(r.meal); plan.push(r.meal);
  }
  return plan;
}

module.exports = { recommend, dayAnalysis, planDay, DEFAULT_TARGETS, SCORE_NUTS, LABEL };
