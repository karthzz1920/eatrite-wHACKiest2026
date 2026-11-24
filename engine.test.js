const test = require('node:test'); const assert = require('node:assert');
const meals = require('../data/meals.json'); const { recommend, dayAnalysis, planDay, DEFAULT_TARGETS } = require('../src/engine'); const { parseChart } = require('../src/chart');
const run = (o) => recommend({ meals, targets: DEFAULT_TARGETS, top: 20, ...o });

test('vegetarian users never see meat, fish or egg', () => {
  const r = run({ profile: { diet: 'veg' } }).results; assert.ok(r.length > 5); assert.ok(r.every((x) => x.meal.diet === 'veg'));
});
test('avoid list removes allergens', () => {
  assert.ok(run({ profile: { diet: 'nonveg', avoid: ['dairy', 'fish'] } }).results.every((x) => !x.meal.allergens.some((a) => ['dairy', 'fish'].includes(a))));
});
test('doctor limits are hard rules', () => {
  const r = run({ profile: { diet: 'nonveg' }, limits: { sugarCap: 15, carbCap: 90 } });
  assert.ok(r.results.length > 0); assert.ok(r.results.every((x) => x.meal.sugar <= 15 / 3 * 1.25 && x.meal.carbs <= 90 / 3 * 1.25)); assert.ok(r.excluded.carbs > 0);
});
test('budget filter works', () => { assert.ok(run({ profile: { budget: 80 } }).results.every((x) => x.meal.price <= 80)); });
test('results are ranked by balance score', () => { const s = run({}).results.map((x) => x.score); assert.deepStrictEqual(s, [...s].sort((a, b) => b - a)); });
test('protein trap is flagged for a protein-heavy, fibre-poor meal', () => {
  const r = recommend({ meals: meals.filter((m) => m.id === 'fish-rice'), targets: { ...DEFAULT_TARGETS, protein: 30 }, top: 5 }).results[0]; assert.ok(r.proteinTrap);
});
test('day analysis nudges toward the weakest nutrient', () => {
  const logged = meals.filter((m) => m.id === 'curd-rice'); const d = dayAnalysis({ meals, logged });
  assert.ok(d.score < 60); assert.ok(d.nudges.length > 0 && /Try /.test(d.nudges[0]));
});
test('chart parser reads explicit and implied limits', () => {
  const a = parseChart('Diabetic. Low sugar diet, carbohydrates max 150 g per day. No dairy.');
  assert.strictEqual(a.limits.carbCap, 150); assert.strictEqual(a.limits.sugarCap, 25); assert.deepStrictEqual(a.profile.avoid, ['dairy']);
  assert.strictEqual(parseChart('sugar under 20 g').limits.sugarCap, 20);
});
test('day planner fills open slots within the rules, without repeats', () => {
  const limits = { sugarCap: 25, carbCap: 150 }; const profile = { diet: 'veg', avoid: ['dairy'] };
  const plan = planDay({ meals, profile, limits, targets: DEFAULT_TARGETS, logged: [] });
  assert.strictEqual(plan.length, 3); assert.strictEqual(new Set(plan.map((m) => m.id)).size, 3);
  assert.ok(plan.every((m) => m.diet === 'veg' && !m.allergens.includes('dairy')));
  assert.ok(plan.reduce((a, m) => a + m.carbs, 0) <= 150); assert.strictEqual(planDay({ meals, logged: plan }).length, 0);
});
