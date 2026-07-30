const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('index.html', 'utf8');

function functionSource(name) {
  const patterns = [`function ${name}(`, `async function ${name}(`];
  const starts = patterns.map(p => html.indexOf(p)).filter(i => i >= 0);
  assert.ok(starts.length, `function ${name} exists`);
  const start = Math.min(...starts);
  const brace = html.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = brace; i < html.length; i++) {
    const c = html[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    if (c === '}' && --depth === 0) return html.slice(start, i + 1);
  }
  throw new Error(`unterminated function ${name}`);
}

function context(functions, extra = {}) {
  const sandbox = { console, URLSearchParams, setTimeout, clearTimeout, ...extra };
  vm.createContext(sandbox);
  vm.runInContext(functions.map(functionSource).join('\n'), sandbox);
  return sandbox;
}

function plain(value) { return JSON.parse(JSON.stringify(value)); }

function planEditorContext(isToday, initialPlan, values = {}) {
  const elements = {
    planIntentionen: { value: values.intentionen ?? initialPlan.intentionen ?? '' },
    planVermeiden: { value: values.vermeiden ?? initialPlan.vermeiden ?? '' },
    planAufstehzeit: { value: values.aufstehzeit ?? initialPlan.aufstehzeit ?? '05:00' },
    planOrt: { value: values.ort ?? initialPlan.ort ?? '' },
    planStundenplan: { value: values.stundenplan ?? initialPlan.stundenplan ?? '' },
    planPromptText: { textContent: '', style: {} },
    planPromptPlaceholder: { style: {} }
  };
  const day = { plan: initialPlan };
  let saves = 0;
  const c = context(['legacyPlanTaskId', 'normalizePlanTasks', 'ensurePlanState', 'savePlanField', 'clearPlanPrompt'], {
    TODAY: isToday ? day : { plan: { tasks: [] } }, getViewData: () => day,
    isViewingToday: () => isToday, document: { getElementById: id => elements[id] || null },
    save: () => saves++, renderCloseDayStatus() {}, renderPlanTab() {}, toast() {}
  });
  return { c, day, elements, saves: () => saves };
}

// Wake-time edits are persisted for today and archives and merge by freshness.
{
  function wakeEditor(isToday, value) {
    const day = { plan: { aufstehzeit: '05:00', tasks: [] } };
    const c = context(['legacyPlanTaskId', 'normalizePlanTasks', 'ensurePlanState', 'savePlanWakeTime'], {
      TODAY: isToday ? day : { plan: { tasks: [] } }, getViewData: () => day,
      isViewingToday: () => isToday, document: { getElementById: () => ({ value }) },
      save() {}, renderCloseDayStatus() {}
    });
    c.savePlanWakeTime();
    return day.plan;
  }
  assert.ok(wakeEditor(true, '08:00').aufstehzeitEditedAt);
  assert.ok(wakeEditor(false, '07:00').aufstehzeitEditedAt);
  assert.ok(wakeEditor(true, '05:00').aufstehzeitEditedAt);

  const c = context(['legacyPlanTaskId', 'normalizePlanTasks', 'mergePlanTasks', 'mergePlanWakeTime', 'mergeCloseDayPlan', 'mergeArchivedDayPlan']);
  const old = '2026-01-01T00:00:00.000Z';
  const recent = '2026-01-02T00:00:00.000Z';
  const wake = (value, at) => ({ aufstehzeit: value, aufstehzeitEditedAt: at, tasks: [] });
  assert.equal(c.mergeArchivedDayPlan({ aufstehzeit: '05:00', tasks: [] }, wake('08:00', recent)).aufstehzeit, '08:00');
  assert.equal(c.mergeArchivedDayPlan(wake('08:00', recent), wake('05:00', old)).aufstehzeit, '08:00');
  assert.equal(c.mergeArchivedDayPlan(wake('08:00', old), wake('05:00', recent)).aufstehzeit, '05:00');
  assert.deepEqual(plain(c.mergeArchivedDayPlan(wake('08:00', old), wake('05:00', recent))),
    plain(c.mergeArchivedDayPlan(wake('05:00', recent), wake('08:00', old))));
  const stableWake = c.mergeArchivedDayPlan(wake('05:00', recent), wake('05:00', recent));
  assert.deepEqual(plain(c.mergeArchivedDayPlan(stableWake, wake('05:00', recent))), plain(stableWake));

  const legacyExplicit = { aufstehzeit: '08:00', aufstehzeitExplicitlyEdited: true, tasks: [] };
  const legacyPlain = { aufstehzeit: '09:00', tasks: [] };
  const legacyLeft = c.mergeArchivedDayPlan(legacyExplicit, legacyPlain);
  const legacyRight = c.mergeArchivedDayPlan(legacyPlain, legacyExplicit);
  assert.deepEqual(plain(legacyLeft), plain(legacyRight));
  assert.equal(legacyLeft.aufstehzeit, '08:00');
  assert.equal(legacyLeft.aufstehzeitEditedAt, undefined);
  assert.equal(legacyLeft.aufstehzeitExplicitlyEdited, true);
  assert.equal(c.mergeArchivedDayPlan({ aufstehzeit: '08:00', tasks: [] }, {
    aufstehzeit: '05:00', aufstehzeitExplicitlyEdited: true, tasks: []
  }).aufstehzeit, '05:00');
  assert.equal(c.mergeArchivedDayPlan(legacyExplicit, wake('07:00', recent)).aufstehzeit, '07:00');
  const explicitConflictA = { aufstehzeit: '07:00', aufstehzeitExplicitlyEdited: true, tasks: [] };
  const explicitConflictB = { aufstehzeit: '08:00', aufstehzeitExplicitlyEdited: true, tasks: [] };
  assert.deepEqual(plain(c.mergeArchivedDayPlan(explicitConflictA, explicitConflictB)),
    plain(c.mergeArchivedDayPlan(explicitConflictB, explicitConflictA)));
  const plainA = { aufstehzeit: '07:00', tasks: [] };
  const plainB = { aufstehzeit: '08:00', tasks: [] };
  assert.deepEqual(plain(c.mergeArchivedDayPlan(plainA, plainB)), plain(c.mergeArchivedDayPlan(plainB, plainA)));
}

// Plan tasks have stable identities, freshness and per-item tombstones.
{
  const c = context(['legacyPlanTaskId', 'normalizePlanTasks', 'mergePlanTasks', 'mergePlanWakeTime', 'mergeCloseDayPlan', 'mergeArchivedDayPlan']);
  const legacy = c.normalizePlanTasks([{ text: 'gleich', source: '' }, { text: 'gleich', source: '' }]);
  assert.notEqual(legacy[0].id, legacy[1].id);
  assert.deepEqual(plain(c.normalizePlanTasks(legacy).map(t => t.id)), plain(legacy.map(t => t.id)));
  assert.equal(c.normalizePlanTasks([{ text: 'Objekt', objectId: 'o1' }])[0].id, 'plan-object-o1');

  const old = '2026-01-01T00:00:00.000Z';
  const recent = '2026-01-02T00:00:00.000Z';
  const task = (id, text, at) => ({ id, text, selected: true, createdAt: at, updatedAt: at });
  const base = { tasks: [task('a', 'A', old), task('b', 'B', old)] };
  const deleted = { tasks: [task('a', 'A', old)], planTaskDeletedAt: { b: recent } };
  const left = c.mergeArchivedDayPlan(base, deleted);
  const right = c.mergeArchivedDayPlan(deleted, base);
  assert.deepEqual(plain(left.tasks.map(t => t.id)), ['a']);
  assert.deepEqual(plain(right.tasks.map(t => t.id)), ['a']);
  assert.equal(left.planTaskDeletedAt.b, recent);
  assert.deepEqual(plain(c.mergeArchivedDayPlan(left, base)), plain(left));

  const restored = c.mergeArchivedDayPlan(deleted, { tasks: [task('b', 'B neu', '2026-01-03T00:00:00.000Z')] });
  assert.equal(restored.tasks.find(t => t.id === 'b').text, 'B neu');
  const parallel = c.mergeArchivedDayPlan({ tasks: [task('a', 'A', recent)] }, { tasks: [task('c', 'C', recent)] });
  assert.deepEqual(plain(parallel.tasks.map(t => t.id)), ['a', 'c']);
  const edited = c.mergeArchivedDayPlan({ tasks: [task('a', 'Alt', old)] }, { tasks: [task('a', 'Neu', recent)] });
  assert.equal(edited.tasks[0].text, 'Neu');

  const cleared = c.mergeArchivedDayPlan(base, { tasks: [], planTasksClearedAt: recent });
  assert.equal(cleared.tasks.length, 0);
  const afterClear = c.mergeArchivedDayPlan(cleared, { tasks: [task('c', 'Später', '2026-01-03T00:00:00.000Z')] });
  assert.deepEqual(plain(afterClear.tasks.map(t => t.id)), ['c']);
  assert.deepEqual(plain(c.mergeArchivedDayPlan(cleared, base)), plain(cleared));
  assert.equal(JSON.parse(JSON.stringify(deleted)).planTaskDeletedAt.b, recent);

  const legacyClear = { tasks: [], planTasksExplicitlyCleared: true };
  const undatedTasks = { tasks: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }] };
  const clearBefore = plain(legacyClear);
  const tasksBefore = plain(undatedTasks);
  const legacyClearLeft = c.mergeCloseDayPlan(legacyClear, undatedTasks);
  const legacyClearRight = c.mergeCloseDayPlan(undatedTasks, legacyClear);
  assert.deepEqual(plain(legacyClearLeft), plain(legacyClearRight));
  assert.equal(legacyClearLeft.tasks.length, 0);
  assert.equal(legacyClearLeft.planTasksClearedAt, undefined);
  assert.equal(legacyClearLeft.planTasksExplicitlyCleared, true);
  assert.deepEqual(plain(c.mergeCloseDayPlan(legacyClearLeft, undatedTasks)), plain(legacyClearLeft));
  assert.equal(JSON.parse(JSON.stringify(legacyClearLeft)).planTasksExplicitlyCleared, true);
  assert.deepEqual(plain(legacyClear), clearBefore);
  assert.deepEqual(plain(undatedTasks), tasksBefore);

  const datedTask = task('new', 'Neu', recent);
  assert.deepEqual(plain(c.mergeCloseDayPlan(legacyClear, { tasks: [datedTask] }).tasks.map(t => t.id)), ['new']);
  const modernClear = c.mergeCloseDayPlan(legacyClear, { tasks: [], planTasksClearedAt: recent });
  assert.equal(modernClear.planTasksClearedAt, recent);
  assert.equal(modernClear.planTasksExplicitlyCleared, undefined);
  const olderClear = c.mergeCloseDayPlan({ tasks: [], planTasksClearedAt: old }, {
    tasks: [task('newer', 'Später', recent)]
  });
  assert.deepEqual(plain(olderClear.tasks.map(t => t.id)), ['newer']);

  const orderedLegacy = c.normalizePlanTasks([
    { id: 'z', text: 'A' }, { id: 'a', text: 'B' }, { id: 'm', text: 'C' }
  ]);
  assert.deepEqual(plain(orderedLegacy.map(t => t.text)), ['A', 'B', 'C']);
  assert.deepEqual(plain(orderedLegacy.map(t => t.order)), [0, 1, 2]);
  assert.deepEqual(plain(c.normalizePlanTasks(orderedLegacy)), plain(orderedLegacy));
  assert.deepEqual(plain(JSON.parse(JSON.stringify(orderedLegacy)).map(t => t.order)), [0, 1, 2]);
  assert.deepEqual(plain(c.mergeCloseDayPlan({ tasks: orderedLegacy }, { tasks: orderedLegacy }).tasks.map(t => t.text)), ['A', 'B', 'C']);
  assert.deepEqual(plain(c.mergeArchivedDayPlan({ tasks: orderedLegacy }, { tasks: orderedLegacy }).tasks.map(t => t.text)), ['A', 'B', 'C']);

  const parallelLeft = { tasks: [task('base', 'Basis', old), Object.assign(task('c', 'C', recent), { order: 1 })] };
  parallelLeft.tasks[0].order = 0;
  const parallelRight = { tasks: [Object.assign(task('base', 'Basis', old), { order: 0 }),
    Object.assign(task('d', 'D', recent), { order: 1 })] };
  const parallelOrderA = c.mergeCloseDayPlan(parallelLeft, parallelRight);
  const parallelOrderB = c.mergeCloseDayPlan(parallelRight, parallelLeft);
  assert.deepEqual(plain(parallelOrderA.tasks.map(t => t.id)), plain(parallelOrderB.tasks.map(t => t.id)));
  assert.deepEqual(plain(parallelOrderA.tasks.map(t => t.id)), ['base', 'c', 'd']);
  assert.deepEqual(plain(c.mergeCloseDayPlan(parallelOrderA, parallelOrderB)), plain(parallelOrderA));
}

// Actual task UI actions assign IDs, update freshness and record deletions.
{
  const plan = { tasks: [] };
  const input = { value: 'Manuell' };
  let nextId = 0;
  const c = context(['legacyPlanTaskId', 'normalizePlanTasks', 'nextPlanTaskOrder', 'ensurePlanState', 'addPlanTask', 'togglePlanTask', 'removePlanTask'], {
    TODAY: { plan }, getViewData: () => ({ plan }), uid: () => 'manual-' + (++nextId),
    document: { getElementById: id => id === 'planNewTask' ? input : null },
    save() {}, renderPlanTaskList() {}
  });
  c.addPlanTask();
  assert.equal(plan.tasks[0].id, 'manual-1');
  assert.equal(plan.tasks[0].order, 0);
  assert.ok(plan.tasks[0].updatedAt);
  const roundTrip = JSON.parse(JSON.stringify(plan));
  assert.equal(roundTrip.tasks[0].id, 'manual-1');
  c.togglePlanTask(0, false);
  assert.ok(plan.tasks[0].updatedAt);
  input.value = 'Zweit';
  c.addPlanTask();
  assert.equal(plan.tasks[1].order, 1);
  c.removePlanTask(0);
  assert.deepEqual(plain(plan.tasks.map(t => t.text)), ['Zweit']);
  assert.ok(plan.planTaskDeletedAt['manual-1']);
}

// Migrated tasks are appended after the existing user order.
{
  const plan = { tasks: [{ id: 'existing', text: 'A', order: 0 }] };
  const day = { plan };
  const c = context(['legacyPlanTaskId', 'normalizePlanTasks', 'nextPlanTaskOrder', 'ensurePlanState', 'reloadMigratedTasks'], {
    TODAY: { plan: { tasks: [] }, objects: [] }, S: { migrationPuffer: [{ text: 'B', fromDate: '2026-01-01' }] },
    getViewData: () => day, uid: () => 'migrated', save() {}, renderPlanTaskList() {}, toast() {}
  });
  c.reloadMigratedTasks();
  assert.deepEqual(plain(plan.tasks.map(t => t.text)), ['A', 'B']);
  assert.deepEqual(plain(plan.tasks.map(t => t.order)), [0, 1]);
}

// Field persistence writes complete freshness immediately for today and archive days.
{
  const todayEdit = planEditorContext(true, { intentionen: 'vorher', tasks: [] }, { intentionen: '' });
  todayEdit.c.savePlanField('intentionen');
  const clearTime = todayEdit.day.plan.planFieldEditedAt.intentionen;
  assert.ok(clearTime);
  assert.equal(todayEdit.day.plan.planFieldClearedAt.intentionen, clearTime);
  assert.equal(todayEdit.day.plan.planFieldsExplicitlyEdited.intentionen, true);
  todayEdit.elements.planIntentionen.value = 'wieder befüllt';
  todayEdit.c.savePlanField('intentionen');
  assert.ok(todayEdit.day.plan.planFieldEditedAt.intentionen);
  assert.equal(todayEdit.day.plan.planFieldClearedAt, undefined);

  const pastFill = planEditorContext(false, { intentionen: '', tasks: [],
    planFieldEditedAt: { intentionen: '2020-01-01T00:00:00.000Z' },
    planFieldClearedAt: { intentionen: '2020-01-01T00:00:00.000Z' },
    planFieldsExplicitlyEdited: { intentionen: true, ort: true } }, { intentionen: 'Korrektur' });
  pastFill.c.savePlanField('intentionen');
  assert.equal(pastFill.day.plan.intentionen, 'Korrektur');
  assert.ok(pastFill.day.plan.planFieldEditedAt.intentionen);
  assert.equal(pastFill.day.plan.planFieldClearedAt, undefined);
  assert.deepEqual(plain(pastFill.day.plan.planFieldsExplicitlyEdited), { ort: true });
  assert.equal(pastFill.saves(), 1);

  const pastClear = planEditorContext(false, { intentionen: 'alt', tasks: [] }, { intentionen: '' });
  pastClear.c.savePlanField('intentionen');
  assert.equal(pastClear.day.plan.planFieldClearedAt.intentionen,
    pastClear.day.plan.planFieldEditedAt.intentionen);
  assert.equal(pastClear.day.plan.planFieldsExplicitlyEdited, undefined);

  const untouchedLegacy = planEditorContext(false, { intentionen: '', tasks: [],
    planFieldsExplicitlyEdited: { intentionen: true },
    planFieldClearedAt: { ort: '2020-01-01T00:00:00.000Z' } });
  untouchedLegacy.c.savePlanField();
  untouchedLegacy.c.savePlanField('not-a-plan-field');
  assert.deepEqual(plain(untouchedLegacy.day.plan.planFieldsExplicitlyEdited), { intentionen: true });
  assert.equal(untouchedLegacy.day.plan.planFieldEditedAt, undefined);
  assert.deepEqual(plain(untouchedLegacy.day.plan.planFieldClearedAt), { ort: '2020-01-01T00:00:00.000Z' });

  const promptPlan = { intentionen: '', vermeiden: '', ort: '', stundenplan: '', aufstehzeit: '05:00', tasks: [],
    planFieldsExplicitlyEdited: { intentionen: true } };
  const promptElements = {
    planIntentionen: { value: '' }, planVermeiden: { value: '' }, planAufstehzeit: { value: '05:00' },
    planOrt: { value: '' }, planStundenplan: { value: '' }, planPromptText: { textContent: '', style: {} },
    planPromptPlaceholder: { style: {} }
  };
  const promptContext = context(['legacyPlanTaskId', 'normalizePlanTasks', 'ensurePlanState', 'savePlanField', 'generatePlanPrompt'], {
    TODAY: { plan: { tasks: [] }, objects: [] }, S: { config: { context: '' } },
    getViewData: () => ({ plan: promptPlan }), isViewingToday: () => false,
    document: { getElementById: id => promptElements[id] || null }, save() {}
  });
  promptContext.generatePlanPrompt();
  promptContext.generatePlanPrompt();
  assert.deepEqual(plain(promptPlan.planFieldsExplicitlyEdited), { intentionen: true });
  assert.equal(promptPlan.planFieldEditedAt, undefined);

  const clearAll = planEditorContext(false, { intentionen: 'alt', tasks: [{
    id: 'clear-me', text: 'Aufgabe', createdAt: '2020-01-01T00:00:00.000Z', updatedAt: '2020-01-01T00:00:00.000Z'
  }] });
  clearAll.c.clearPlanPrompt();
  ['intentionen', 'vermeiden', 'ort', 'stundenplan'].forEach(key => {
    assert.equal(clearAll.day.plan.planFieldClearedAt[key], clearAll.day.plan.planFieldEditedAt[key]);
  });
  assert.equal(clearAll.day.plan.aufstehzeitEditedAt, clearAll.day.plan.planTasksClearedAt);
  assert.equal(clearAll.day.plan.planTaskDeletedAt['clear-me'], clearAll.day.plan.planTasksClearedAt);
}

// Persistent field freshness makes value/clear archive merging symmetric.
{
  const c = context(['legacyPlanTaskId', 'normalizePlanTasks', 'mergePlanTasks', 'mergePlanWakeTime', 'mergeCloseDayPlan', 'mergeArchivedDayPlan']);
  const modernClearAt = '2026-01-02T00:00:00.000Z';
  const cleared = c.mergeCloseDayPlan(
    { intentionen: 'Alter Wert', vermeiden: '' },
    { intentionen: '', vermeiden: '', planFieldsExplicitlyEdited: { intentionen: true },
      planFieldEditedAt: { intentionen: modernClearAt }, planFieldClearedAt: { intentionen: modernClearAt } }
  );
  assert.equal(cleared.intentionen, '');
  assert.ok(cleared.planFieldClearedAt.intentionen);
  assert.equal(cleared.planFieldEditedAt.intentionen, cleared.planFieldClearedAt.intentionen);
  assert.equal(c.mergeArchivedDayPlan(cleared, { intentionen: 'Alter Wert' }).intentionen, '');
  assert.equal(c.mergeArchivedDayPlan({ vermeiden: '' }, { vermeiden: 'Ergänzung' }).vermeiden, 'Ergänzung');
  assert.equal(c.mergeArchivedDayPlan({ ort: 'Berlin' }, { ort: '' }).ort, 'Berlin');

  const reclosed = c.mergeCloseDayPlan({ ort: 'Berlin' }, {
    ort: '', planFieldsExplicitlyEdited: { ort: true },
    planFieldEditedAt: { ort: modernClearAt }, planFieldClearedAt: { ort: modernClearAt }
  });
  assert.equal(reclosed.ort, '');
  assert.ok(reclosed.planFieldClearedAt.ort);

  const roundTrip = JSON.parse(JSON.stringify(cleared));
  assert.deepEqual(plain(roundTrip.planFieldClearedAt), plain(cleared.planFieldClearedAt));
  const legacy = c.mergeArchivedDayPlan({ intentionen: '' }, { intentionen: 'Legacy' });
  assert.equal(legacy.intentionen, 'Legacy');
  const once = c.mergeArchivedDayPlan(cleared, { intentionen: 'Alter Wert' });
  const twice = c.mergeArchivedDayPlan(once, { intentionen: 'Alter Wert' });
  assert.deepEqual(plain(twice), plain(once));

  const old = '2026-01-01T00:00:00.000Z';
  const recent = '2026-01-02T00:00:00.000Z';
  const value = (text, at) => ({ intentionen: text, planFieldEditedAt: { intentionen: at } });
  const clear = at => ({ intentionen: '', planFieldEditedAt: { intentionen: at },
    planFieldClearedAt: { intentionen: at } });
  const decide = (a, b) => c.mergeArchivedDayPlan(a, b);
  assert.equal(decide(value('alt', old), clear(recent)).intentionen, '');
  assert.equal(decide(value('neu', recent), clear(old)).intentionen, 'neu');
  assert.equal(decide(clear(old), value('neu', recent)).intentionen, 'neu');
  assert.equal(decide(clear(recent), value('alt', old)).intentionen, '');
  assert.deepEqual(plain(decide(value('alt', old), clear(recent))), plain(decide(clear(recent), value('alt', old))));
  assert.equal(decide({ intentionen: 'legacy' }, clear(recent)).intentionen, '');
  assert.equal(decide(value('neu', recent), { intentionen: '', planFieldClearedAt: {} }).intentionen, 'neu');
  assert.equal(decide({ intentionen: 'legacy' }, { intentionen: '' }).intentionen, 'legacy');
  const intermediate = { intentionen: '', planFieldEditedAt: { intentionen: recent } };
  const normalizedIntermediate = decide(value('alt', old), intermediate);
  assert.equal(normalizedIntermediate.intentionen, '');
  assert.equal(normalizedIntermediate.planFieldClearedAt.intentionen, recent);

  const legacyValue = { intentionen: 'Legacy', tasks: [] };
  const legacyClear = { intentionen: '', planFieldsExplicitlyEdited: { intentionen: true }, tasks: [] };
  const valueBefore = plain(legacyValue);
  const clearBefore = plain(legacyClear);
  const clearLeft = decide(legacyClear, legacyValue);
  const clearRight = decide(legacyValue, legacyClear);
  assert.deepEqual(plain(clearLeft), plain(clearRight));
  assert.equal(clearLeft.intentionen, '');
  assert.equal(clearLeft.planFieldsExplicitlyEdited.intentionen, true);
  assert.equal(clearLeft.planFieldEditedAt, undefined);
  assert.deepEqual(plain(legacyValue), valueBefore);
  assert.deepEqual(plain(legacyClear), clearBefore);
  assert.equal(decide(legacyClear, value('Neu', recent)).intentionen, 'Neu');
  assert.equal(decide(clear(recent), legacyValue).intentionen, '');
  assert.deepEqual(plain(decide(clearLeft, legacyValue)), plain(clearLeft));

  const directLegacy = c.mergeCloseDayPlan(legacyValue, legacyClear);
  assert.equal(directLegacy.intentionen, '');
  assert.equal(directLegacy.planFieldEditedAt, undefined);
  assert.equal(directLegacy.planFieldClearedAt, undefined);
  assert.equal(directLegacy.planFieldsExplicitlyEdited.intentionen, true);
  const directAgain = c.mergeCloseDayPlan(directLegacy, directLegacy);
  assert.deepEqual(plain(directAgain), plain(directLegacy));
  assert.equal(JSON.parse(JSON.stringify(directLegacy)).planFieldsExplicitlyEdited.intentionen, true);
  assert.equal(c.mergeArchivedDayPlan(directLegacy, legacyValue).intentionen, '');

  const refilled = c.mergeCloseDayPlan(clear(old), {
    intentionen: 'wieder da', planFieldsExplicitlyEdited: { intentionen: true },
    planFieldEditedAt: { intentionen: recent }
  });
  assert.equal(refilled.intentionen, 'wieder da');
  assert.equal(refilled.planFieldEditedAt.intentionen, recent);
  assert.equal(refilled.planFieldClearedAt && refilled.planFieldClearedAt.intentionen, undefined);
}

// Item freshness prefers updatedAt and converges deterministically.
{
  const deleted = new Set();
  const c = context(['getCloseDayItemFreshness', 'mergeById'], { isDeleted: id => deleted.has(id) });
  const old = { id: 'same', text: 'alt', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };
  const fresh = { id: 'same', text: 'neu', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' };
  assert.equal(c.mergeById([old], [fresh], 'id')[0].text, 'neu');
  assert.equal(c.mergeById([fresh], [old], 'id')[0].text, 'neu');
  assert.equal(c.mergeById([{ id: 'same', createdAt: '2026-01-01T00:00:00.000Z' }],
    [{ id: 'same', createdAt: '2026-01-02T00:00:00.000Z' }], 'id')[0].createdAt, '2026-01-02T00:00:00.000Z');
  assert.equal(c.mergeById([{ id: 'same', text: 'alt', updatedAt: 'invalid', createdAt: '2026-01-01T00:00:00.000Z' }],
    [{ id: 'same', text: 'neu', createdAt: '2026-01-02T00:00:00.000Z' }], 'id')[0].text, 'neu');
  const noTimeA = { id: 'same', text: 'A' };
  const noTimeB = { id: 'same', text: 'B' };
  assert.deepEqual(plain(c.mergeById([noTimeA], [noTimeB], 'id')), plain(c.mergeById([noTimeB], [noTimeA], 'id')));
  assert.deepEqual(plain(c.mergeById([{ id: 'a' }], [{ id: 'b' }], 'id').map(x => x.id)), ['a', 'b']);
  const beforeA = plain([old]); const beforeB = plain([fresh]);
  assert.deepEqual(plain(c.mergeById([old], [fresh], 'id')), plain(c.mergeById(c.mergeById([old], [fresh], 'id'), [fresh], 'id')));
  assert.deepEqual(plain([old]), beforeA); assert.deepEqual(plain([fresh]), beforeB);
  deleted.add('same');
  assert.equal(c.mergeById([old], [fresh], 'id').length, 0);
}

// Archive relevance includes plan-only and legacy-clear states, but not defaults.
{
  const c = context(['filterDeletedFeedItems', 'hasRelevantDayContent'], { isDeleted: () => false });
  const day = plan => ({ cards: [], objects: [], feedItems: [], reviewDone: false, plan });
  assert.equal(c.hasRelevantDayContent(day({ intentionen: 'Plan' })), true);
  assert.equal(c.hasRelevantDayContent(day({ planFieldClearedAt: { intentionen: 'x' } })), true);
  assert.equal(c.hasRelevantDayContent(day({ intentionen: '', planFieldsExplicitlyEdited: { intentionen: true } })), true);
  assert.equal(c.hasRelevantDayContent(day({ aufstehzeit: '05:00', aufstehzeitExplicitlyEdited: true })), true);
  assert.equal(c.hasRelevantDayContent(day({ tasks: [{ id: 't' }] })), true);
  assert.equal(c.hasRelevantDayContent(day({ planTaskDeletedAt: { t: 'x' } })), true);
  assert.equal(c.hasRelevantDayContent(day({ planTasksClearedAt: 'x' })), true);
  assert.equal(c.hasRelevantDayContent(day({ planTasksExplicitlyCleared: true })), true);
  assert.equal(c.hasRelevantDayContent(day({ intentionen: '', vermeiden: '', ort: '', stundenplan: '', aufstehzeit: '05:00', tasks: [] })), false);
}

// Archived day merging is element-wise, symmetric, tombstone-aware and non-mutating.
{
  const deleted = new Set(['deleted']);
  const c = context(['legacyPlanTaskId', 'normalizePlanTasks', 'mergePlanTasks', 'mergePlanWakeTime', 'mergeCloseDayPlan',
    'mergeArchivedDayPlan', 'getCloseDayItemFreshness', 'mergeById', 'mergeArchivedDay', 'mergeDays'], {
    isDeleted: id => deleted.has(id)
  });
  const local = { id: 'day-stable', date: '2026-01-01', reviewDone: false, closedAt: '2026-01-02T00:00:00.000Z',
    cards: [{ id: 'card-l' }, { id: 'deleted' }], objects: [{ id: 'obj-a' }], feedItems: [{ id: 'feed-l' }],
    plan: { intentionen: 'Lokal', tasks: [{ id: 'task-a', text: 'A', order: 0 }] } };
  const remote = { date: '2026-01-01', reviewDone: true, cards: [{ id: 'card-r' }],
    objects: [{ id: 'obj-b' }, { id: 'obj-c' }], feedItems: [{ id: 'feed-r' }],
    plan: { ort: 'Remote', tasks: [{ id: 'task-b', text: 'B', order: 1 }] } };
  const localBefore = plain(local); const remoteBefore = plain(remote);
  const merged = c.mergeArchivedDay(local, remote);
  assert.deepEqual(plain(merged.cards.map(x => x.id)), ['card-l', 'card-r']);
  assert.deepEqual(plain(merged.objects.map(x => x.id)), ['obj-a', 'obj-b', 'obj-c']);
  assert.deepEqual(plain(merged.feedItems.map(x => x.id)), ['feed-l', 'feed-r']);
  assert.deepEqual(plain(merged.plan.tasks.map(x => x.id)), ['task-a', 'task-b']);
  assert.equal(merged.plan.intentionen, 'Lokal'); assert.equal(merged.plan.ort, 'Remote');
  assert.equal(merged.closedAt, local.closedAt); assert.equal(merged.reviewDone, true); assert.equal(merged.id, 'day-stable');
  assert.deepEqual(plain(c.mergeArchivedDay(local, remote)), plain(c.mergeArchivedDay(remote, local)));
  assert.deepEqual(plain(c.mergeArchivedDay(merged, remote)), plain(merged));
  assert.deepEqual(plain(local), localBefore); assert.deepEqual(plain(remote), remoteBefore);
  const days = c.mergeDays([local, { date: '2026-01-03', cards: [] }], [remote, { date: '2025-12-31', cards: [] }]);
  assert.deepEqual(plain(days.map(x => x.date)), ['2026-01-03', '2026-01-01', '2025-12-31']);
}

// Stale TODAY upserts late additions into an existing archive before reset.
{
  const staleDate = '2026-01-01';
  const todayDate = '2026-01-02';
  const c = context(['legacyPlanTaskId', 'normalizePlanTasks', 'mergePlanTasks', 'mergePlanWakeTime', 'mergeCloseDayPlan',
    'mergeArchivedDayPlan', 'getCloseDayItemFreshness', 'mergeById', 'filterDeletedFeedItems', 'hasRelevantDayContent',
    'mergeArchivedDay', 'archiveTodayIfStale'], {
    isDeleted: id => id === 'deleted', today: () => todayDate, save() {},
    S: { days: [{ id: 'archive', date: staleDate, cards: [{ id: 'a' }], objects: [{ id: 'oa' }],
      feedItems: [{ id: 'fa' }], closedAt: '2026-01-01T20:00:00.000Z', reviewDone: true, plan: { intentionen: 'Alt' } }] },
    TODAY: { date: staleDate, cards: [{ id: 'b' }, { id: 'deleted' }], objects: [{ id: 'ob' }],
      feedItems: [{ id: 'fb' }], reviewDone: false, plan: { ort: 'Neu' } }
  });
  c.archiveTodayIfStale();
  assert.equal(c.S.days.length, 1);
  assert.deepEqual(plain(c.S.days[0].cards.map(x => x.id)), ['a', 'b']);
  assert.deepEqual(plain(c.S.days[0].objects.map(x => x.id)), ['oa', 'ob']);
  assert.deepEqual(plain(c.S.days[0].feedItems.map(x => x.id)), ['fa', 'fb']);
  assert.equal(c.S.days[0].plan.ort, 'Neu'); assert.equal(c.S.days[0].closedAt, '2026-01-01T20:00:00.000Z');
  assert.equal(c.TODAY.date, todayDate);
}

// A plan-only stale TODAY is archived; an untouched default plan is not.
{
  function archivePlan(plan) {
    const c = context(['legacyPlanTaskId', 'normalizePlanTasks', 'mergePlanTasks', 'mergePlanWakeTime', 'mergeCloseDayPlan',
      'mergeArchivedDayPlan', 'getCloseDayItemFreshness', 'mergeById', 'filterDeletedFeedItems', 'hasRelevantDayContent',
      'mergeArchivedDay', 'archiveTodayIfStale'], {
      isDeleted: () => false, today: () => '2026-01-02', save() {}, S: { days: [] },
      TODAY: { date: '2026-01-01', cards: [], objects: [], feedItems: [], reviewDone: false, plan }
    });
    c.archiveTodayIfStale();
    return c.S.days;
  }
  assert.equal(archivePlan({ intentionen: 'Nur Plan' }).length, 1);
  assert.equal(archivePlan({ intentionen: '', planFieldsExplicitlyEdited: { intentionen: true } }).length, 1);
  assert.equal(archivePlan({ planTasksExplicitlyCleared: true }).length, 1);
  assert.equal(archivePlan({ intentionen: '', vermeiden: '', ort: '', stundenplan: '', aufstehzeit: '05:00', tasks: [] }).length, 0);
}

// Same-date/Gist day merging keeps the persistent clear marker and JSON payloads preserve it.
{
  const c = context(['legacyPlanTaskId', 'normalizePlanTasks', 'mergePlanTasks', 'mergePlanWakeTime', 'mergeCloseDayPlan', 'mergeArchivedDayPlan', 'getCloseDayItemFreshness', 'filterDeletedFeedItems', 'mergeById', 'mergeArchivedDay', 'mergeDays'], {
    S: { deletedIds: {} }, isDeleted: () => false
  });
  const local = [{ date: '2026-01-01', cards: [], objects: [], plan: {
    intentionen: '', planFieldClearedAt: { intentionen: '2026-01-02T00:00:00.000Z' },
    aufstehzeit: '05:00', tasks: [], planTaskDeletedAt: { b: '2026-01-02T00:00:00.000Z' }
  }}];
  const remote = [{ date: '2026-01-01', cards: [], objects: [], plan: {
    intentionen: 'stale', aufstehzeit: '08:00', aufstehzeitEditedAt: '2026-01-02T00:00:00.000Z',
    tasks: [{ id: 'b', text: 'B', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }]
  } }];
  const merged = c.mergeDays(local, remote);
  assert.equal(merged[0].plan.intentionen, '');
  assert.equal(merged[0].plan.aufstehzeit, '08:00');
  assert.equal(merged[0].plan.tasks.length, 0);
  assert.ok(merged[0].plan.planTaskDeletedAt.b);
  assert.equal(JSON.parse(JSON.stringify({ S: { days: merged } })).S.days[0].plan.planFieldClearedAt.intentionen,
    '2026-01-02T00:00:00.000Z');
}

// Same-date and stale remote TODAY paths use the same freshness decision.
{
  const old = '2026-01-01T00:00:00.000Z';
  const recent = '2026-01-02T00:00:00.000Z';
  const todayDate = '2099-01-01';
  const c = context(['getCloseDayItemFreshness', 'mergeCloseDayItems', 'legacyPlanTaskId', 'normalizePlanTasks', 'mergePlanTasks', 'mergePlanWakeTime', 'mergeCloseDayPlan',
    'mergeArchivedDayPlan', 'mergeById', 'filterDeletedFeedItems', 'hasRelevantDayContent', 'mergeArchivedDay', 'mergeToday'], {
    S: { days: [{ date: '2020-01-01', cards: [], objects: [], feedItems: [], plan: {
      intentionen: 'alt', planFieldEditedAt: { intentionen: old }, aufstehzeit: '05:00',
      tasks: [{ id: 'b', text: 'B', createdAt: old, updatedAt: old }]
    }}], deletedIds: {} }, today: () => todayDate, isDeleted: () => false
  });
  const blankToday = { date: todayDate, cards: [], objects: [], feedItems: [], plan: {} };
  c.mergeToday(blankToday, { date: '2020-01-01', cards: [], objects: [], feedItems: [], plan: {
    intentionen: '', planFieldEditedAt: { intentionen: recent }, planFieldClearedAt: { intentionen: recent },
    aufstehzeit: '08:00', aufstehzeitEditedAt: recent, tasks: [], planTaskDeletedAt: { b: recent }
  }});
  assert.equal(c.S.days[0].plan.intentionen, '');
  assert.equal(c.S.days[0].plan.aufstehzeit, '08:00');
  assert.equal(c.S.days[0].plan.tasks.length, 0);

  const local = { ...blankToday, plan: { intentionen: '', planFieldEditedAt: { intentionen: old },
    planFieldClearedAt: { intentionen: old } } };
  const remote = { ...blankToday, plan: { intentionen: 'neu', planFieldEditedAt: { intentionen: recent } } };
  assert.equal(c.mergeToday(local, remote).plan.intentionen, 'neu');
  assert.equal(c.mergeToday(remote, local).plan.intentionen, 'neu');
  const newClear = { ...blankToday, plan: { intentionen: '', planFieldEditedAt: { intentionen: recent },
    planFieldClearedAt: { intentionen: recent } } };
  const oldValue = { ...blankToday, plan: { intentionen: 'alt', planFieldEditedAt: { intentionen: old } } };
  assert.equal(c.mergeToday(newClear, oldValue).plan.intentionen, '');
  assert.equal(c.mergeToday(oldValue, newClear).plan.intentionen, '');
}

// The actual JSON file merge path applies symmetric plan freshness to a past TODAY.
{
  const date = '2020-01-01';
  const old = '2026-01-01T00:00:00.000Z';
  const recent = '2026-01-02T00:00:00.000Z';
  class FileReaderStub {
    readAsText() { this.onload({ target: { result: '{}' } }); }
  }
  const c = context(['legacyPlanTaskId', 'normalizePlanTasks', 'mergePlanTasks', 'mergePlanWakeTime', 'mergeCloseDayPlan', 'mergeArchivedDayPlan', 'mergeArchivedDay', 'importFileAndMerge'], {
    FileReader: FileReaderStub,
    S: { days: [{ date, cards: [], objects: [], feedItems: [], plan: {
      intentionen: 'alt', planFieldEditedAt: { intentionen: old }, aufstehzeit: '05:00',
      tasks: [{ id: 'b', text: 'B', createdAt: old, updatedAt: old }]
    }}] }, TODAY: { date: '2099-01-01', cards: [], objects: [], feedItems: [] },
    today: () => '2099-01-01', archiveTodayIfStale() {}, mergeS: local => local,
    mergeById: local => local, parseImportBackup: () => ({ remoteS: {}, remoteTODAY: {
      date, cards: [], objects: [], feedItems: [], plan: { intentionen: '',
        planFieldEditedAt: { intentionen: recent }, planFieldClearedAt: { intentionen: recent },
        aufstehzeit: '08:00', aufstehzeitEditedAt: recent, tasks: [], planTaskDeletedAt: { b: recent } }
    }}), ensureImportDefaults() {}, save() {}, gistAutoSyncDebounced() {}, refreshAfterImport() {}, toast() {}
  });
  c.importFileAndMerge({ files: [{}], value: 'backup.json' });
  assert.equal(c.S.days[0].plan.intentionen, '');
  assert.equal(c.S.days[0].plan.planFieldEditedAt.intentionen, recent);
  assert.equal(c.S.days[0].plan.aufstehzeit, '08:00');
  assert.equal(c.S.days[0].plan.tasks.length, 0);
}

// Past remote TODAY archives and merges metadata-only legacy clears.
{
  const c = context(['getCloseDayItemFreshness', 'legacyPlanTaskId', 'normalizePlanTasks', 'mergePlanTasks',
    'mergePlanWakeTime', 'mergeCloseDayPlan', 'mergeArchivedDayPlan', 'mergeById', 'filterDeletedFeedItems',
    'hasRelevantDayContent', 'mergeArchivedDay', 'mergeToday'], {
    today: () => '2099-01-01', isDeleted: () => false,
    S: { days: [{ date: '2020-01-02', cards: [], objects: [], feedItems: [], plan: { intentionen: 'Alt' } },
      { date: '2020-01-03', cards: [], objects: [], feedItems: [], plan: { tasks: [{ id: 'a', text: 'A' }] } }] }
  });
  const local = { date: '2099-01-01', cards: [], objects: [], feedItems: [], plan: {} };
  c.mergeToday(local, { date: '2020-01-01', cards: [], objects: [], feedItems: [], plan: {
    intentionen: '', planFieldsExplicitlyEdited: { intentionen: true }
  }});
  assert.equal(c.S.days.find(d => d.date === '2020-01-01').plan.planFieldsExplicitlyEdited.intentionen, true);
  c.mergeToday(local, { date: '2020-01-02', cards: [], objects: [], feedItems: [], plan: {
    intentionen: '', planFieldsExplicitlyEdited: { intentionen: true }
  }});
  assert.equal(c.S.days.find(d => d.date === '2020-01-02').plan.intentionen, '');
  c.mergeToday(local, { date: '2020-01-03', cards: [], objects: [], feedItems: [], plan: {
    tasks: [], planTasksExplicitlyCleared: true
  }});
  assert.equal(c.S.days.find(d => d.date === '2020-01-03').plan.tasks.length, 0);
  c.mergeToday(local, { date: '2020-01-04', cards: [], objects: [], feedItems: [], plan: {
    aufstehzeit: '05:00', aufstehzeitExplicitlyEdited: true
  }});
  const wakeLegacy = c.S.days.find(d => d.date === '2020-01-04').plan;
  assert.equal(wakeLegacy.aufstehzeitExplicitlyEdited, true);
  assert.equal(wakeLegacy.aufstehzeitEditedAt, undefined);
}

// Daily Note input uses only public plan fields, never merge metadata.
{
  const day = { cards: [], objects: [], feedItems: [], reviewDone: false, plan: {
    intentionen: '', aufstehzeit: '05:00', aufstehzeitEditedAt: '2026-01-02T00:00:00.000Z',
    aufstehzeitExplicitlyEdited: true, planFieldsExplicitlyEdited: { intentionen: true },
    tasks: [{ id: 'technical-id', text: 'Sichtbar', order: 987654, updatedAt: '2026-01-02T00:00:00.000Z' }],
    planTaskDeletedAt: { deleted: '2026-01-02T00:00:00.000Z' }, planTasksClearedAt: '2026-01-02T00:00:00.000Z',
    planFieldClearedAt: { intentionen: '2026-01-02T00:00:00.000Z' }
  }};
  const c = context(['getDailyNoteFullDayInput'], {
    S: { migrationPuffer: [] }, viewDate: '2026-01-02', getViewData: () => day,
    formatObjForPrompt: () => ''
  });
  assert.doesNotMatch(c.getDailyNoteFullDayInput(), /planField(?:Cleared|Edited|sExplicitlyEdited)At|planFieldsExplicitlyEdited|aufstehzeit(?:EditedAt|ExplicitlyEdited)|planTaskDeletedAt|planTasksClearedAt|technical-id|987654|2026-01-02T00:00:00\.000Z/);
}

// Actual finishDay preserves a clear after a same-day merge removed transient UI markers.
{
  const iso = new Date().toISOString().slice(0, 10);
  const old = '2026-01-01T00:00:00.000Z';
  const recent = '2026-01-02T00:00:00.000Z';
  const c = context(['getCloseDayItemFreshness', 'mergeCloseDayItems', 'legacyPlanTaskId', 'normalizePlanTasks', 'mergePlanTasks', 'mergePlanWakeTime', 'mergeCloseDayPlan',
    'mergeArchivedDayPlan', 'finishDay'], {
    viewDate: iso, TODAY: { date: iso, cards: [], objects: [], feedItems: [], reviewDone: false,
      plan: { intentionen: '', tasks: [], planFieldEditedAt: { intentionen: recent },
        planFieldClearedAt: { intentionen: recent }, aufstehzeit: '08:00', aufstehzeitEditedAt: recent,
        planTaskDeletedAt: { b: recent } } },
    S: { days: [{ date: iso, cards: [], objects: [], feedItems: [], plan: {
      intentionen: 'alt', tasks: [{ id: 'b', text: 'B', createdAt: old, updatedAt: old }],
      planFieldEditedAt: { intentionen: old }, aufstehzeit: '05:00'
    }}], migrationPuffer: [], futurelog: [], deletedIds: {} }, pipeStepsDone: {},
    today: () => iso, uid: () => 'day-id', isDeleted: () => false,
    document: { getElementById: () => null }, save() {}, renderCardList() {}, updateBadges() {},
    updateDateNav() {}, renderCalendarDots() {}, updateDrawerActive() {}, syncDrawerBadges() {},
    updateFLBadge() {}, toast() {}, switchTab() {},
    getViewData: null
  });
  c.getViewData = () => c.TODAY;
  c.finishDay();
  assert.equal(c.S.days.length, 1);
  assert.equal(c.S.days[0].plan.intentionen, '');
  assert.ok(c.S.days[0].plan.planFieldClearedAt.intentionen);
  assert.ok(c.S.days[0].plan.planFieldEditedAt.intentionen);
  assert.equal(c.S.days[0].plan.aufstehzeit, '08:00');
  assert.equal(c.S.days[0].plan.tasks.length, 0);
  assert.equal(c.S.days[0].plan.planTaskDeletedAt.b, recent);
  c.finishDay();
  assert.equal(c.S.days.length, 1);
}

// Cockpit and close view share active-content semantics after today's archived snapshot.
{
  const nodes = {};
  const document = { getElementById(id) { return nodes[id] ||= {
    textContent: '', innerHTML: '', setAttribute() {}, classList: { toggle() {} }
  }; } };
  const iso = new Date().toISOString().slice(0, 10);
  const defaultPlan = () => ({ intentionen: '', vermeiden: '', ort: '', stundenplan: '', aufstehzeit: '05:00', tasks: [] });
  const c = context(['hasActiveDayContent', 'isDayClosed', 'setTextIfPresent', 'updateSammelnStatus', 'renderCloseDayStatus'], {
    document, TODAY: { date: iso, cards: [], objects: [], feedItems: [], reviewDone: false, plan: defaultPlan() },
    S: { days: [] }, viewDate: iso, today: () => iso, getViewData: null
  });
  c.getViewData = () => c.TODAY;
  assert.equal(c.isDayClosed({ closedAt: 'x', reviewDone: false }), true);
  assert.equal(c.isDayClosed({ reviewDone: true }), false);
  assert.equal(c.isDayClosed({ closedAt: 'x', reviewDone: true }), true);
  assert.equal(c.isDayClosed({}), false);
  c.S.days = [{ date: iso, closedAt: 'x', reviewDone: false }];
  c.updateSammelnStatus();
  assert.equal(nodes.statClose.textContent, 'fertig');
  assert.match(nodes.mobileDayStatus.innerHTML, /Abschluss fertig/);
  c.renderCloseDayStatus();
  assert.equal(nodes.closeDayStatus.textContent, '✓ Abgeschlossen');

  const activeCases = [
    day => day.cards.push({ id: 'card' }),
    day => day.objects.push({ id: 'object', dismissed: false }),
    day => day.feedItems.push({ id: 'feed' }),
    day => { day.plan.intentionen = 'neu'; },
    day => day.plan.tasks.push({ text: 'neu' })
  ];
  activeCases.forEach(addContent => {
    c.TODAY = { date: iso, cards: [], objects: [], feedItems: [], reviewDone: false, plan: defaultPlan() };
    addContent(c.TODAY);
    assert.equal(c.isDayClosed(c.TODAY), false);
    c.updateSammelnStatus();
    assert.equal(nodes.statClose.textContent, 'offen');
    assert.match(nodes.mobileDayStatus.innerHTML, /Abschluss offen/);
    c.renderCloseDayStatus();
    assert.equal(nodes.closeDayStatus.textContent, '· Offen');
  });
  c.TODAY = { date: iso, cards: [], objects: [{ dismissed: true }], feedItems: [], plan: defaultPlan() };
  c.TODAY.plan.planFieldEditedAt = { intentionen: '2026-01-02T00:00:00.000Z' };
  c.TODAY.plan.planFieldClearedAt = { intentionen: '2026-01-02T00:00:00.000Z' };
  assert.equal(c.hasActiveDayContent(c.TODAY), false);
  assert.equal(c.isDayClosed(c.TODAY), true);
  const past = { date: '2020-01-01', reviewDone: true };
  assert.equal(c.isDayClosed(past), false);
  assert.equal(c.isDayClosed({ date: '2020-01-01', closedAt: 'x' }), true);
}

// Highlights loader normalizes legacy archive days, saves, deduplicates, and honors tombstones.
(async () => {
  const date = '2020-01-01';
  let saves = 0;
  const results = [
    { id: 'one', updated_at: `${date}T10:00:00Z`, title: 'One' },
    { id: 'two', updated_at: `${date}T11:00:00Z`, title: 'Two' },
    { id: 'deleted', updated_at: `${date}T12:00:00Z`, title: 'Deleted' }
  ];
  const c = context(['loadHighlights'], {
    READWISE_KEY: 'readwise',
    localStorage: { getItem: () => 'token' },
    document: { getElementById: () => null },
    S: { days: [{ date, cards: [], objects: [], plan: {} }], feedLastHighlights: '', deletedIds: {} },
    TODAY: { date: '2099-01-01', feedItems: [] },
    today: () => '2099-01-01',
    fetch: async () => ({ ok: true, json: async () => ({ results }) }),
    isDeleted: id => id === 'hl-deleted',
    save: () => saves++, renderFeedTab() {}, updateFeedBadge() {}, setFeedFilter() {}, showFeedNotice() {}
  });
  await c.loadHighlights();
  assert.equal(Array.isArray(c.S.days[0].feedItems), true);
  assert.deepEqual(plain(c.S.days[0].feedItems.map(i => i.id)), ['hl-one', 'hl-two']);
  assert.equal(saves, 1);
  await c.loadHighlights();
  assert.equal(c.S.days[0].feedItems.length, 2);
  assert.equal(saves, 2);
  console.log('regression tests passed');
})().catch(err => { console.error(err); process.exitCode = 1; });
