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

function controlledDate(initial) {
  let current = initial;
  return class ControlledDate extends Date {
    constructor(...args) { super(...(args.length ? args : [current])); }
    static set(value) { current = value; }
    static now() { return new Date(current).getTime(); }
  };
}

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
  assert.equal(clearLeft.intentionen, 'Legacy');
  assert.equal(clearLeft.planFieldsExplicitlyEdited && clearLeft.planFieldsExplicitlyEdited.intentionen, undefined);
  assert.equal(clearLeft.planFieldEditedAt, undefined);
  assert.equal(clearLeft.planFieldClearedAt, undefined);
  assert.deepEqual(plain(legacyValue), valueBefore);
  assert.deepEqual(plain(legacyClear), clearBefore);
  assert.equal(decide(legacyClear, value('Neu', recent)).intentionen, 'Neu');
  assert.equal(decide(clear(recent), legacyValue).intentionen, '');
  assert.deepEqual(plain(decide(clearLeft, legacyValue)), plain(clearLeft));

  const emptyLegacy = decide(legacyClear, { intentionen: '', tasks: [] });
  assert.equal(emptyLegacy.intentionen, '');
  assert.equal(emptyLegacy.planFieldsExplicitlyEdited.intentionen, true);
  assert.equal(emptyLegacy.planFieldEditedAt, undefined);
  assert.equal(emptyLegacy.planFieldClearedAt, undefined);
  assert.deepEqual(plain(decide(emptyLegacy, JSON.parse(JSON.stringify(emptyLegacy)))), plain(emptyLegacy));

  const otherLegacyClear = { vermeiden: '', planFieldsExplicitlyEdited: { vermeiden: true }, tasks: [] };
  const otherLegacyValue = { vermeiden: 'Wert', tasks: [] };
  assert.equal(decide(otherLegacyClear, otherLegacyValue).vermeiden, 'Wert');
  assert.equal(decide(otherLegacyValue, otherLegacyClear).vermeiden, 'Wert');
  const conflictingTextLeft = decide({ ort: 'Zürich' }, { ort: 'Berlin' });
  const conflictingTextRight = decide({ ort: 'Berlin' }, { ort: 'Zürich' });
  assert.deepEqual(plain(conflictingTextLeft), plain(conflictingTextRight));
  assert.equal(conflictingTextLeft.ort, 'Zürich');
  assert.deepEqual(plain(decide(conflictingTextLeft, conflictingTextRight)), plain(conflictingTextLeft));
  assert.equal(JSON.parse(JSON.stringify(clearLeft)).intentionen, 'Legacy');

  const directLegacy = c.mergeCloseDayPlan(legacyValue, legacyClear);
  assert.equal(directLegacy.intentionen, '');
  assert.equal(directLegacy.planFieldEditedAt, undefined);
  assert.equal(directLegacy.planFieldClearedAt, undefined);
  assert.equal(directLegacy.planFieldsExplicitlyEdited.intentionen, true);
  const directAgain = c.mergeCloseDayPlan(directLegacy, directLegacy);
  assert.deepEqual(plain(directAgain), plain(directLegacy));
  assert.equal(JSON.parse(JSON.stringify(directLegacy)).planFieldsExplicitlyEdited.intentionen, true);
  assert.equal(c.mergeArchivedDayPlan(directLegacy, legacyValue).intentionen, 'Legacy');

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
  const c = context(['getCloseDayItemFreshness', 'canonicalMergeFingerprint', 'mergeById'], { isDeleted: id => deleted.has(id) });
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
  assert.equal(c.mergeById([fresh, old], [], 'id')[0].text, 'neu');
  assert.equal(c.mergeById([old, fresh], [], 'id')[0].text, 'neu');
  assert.equal(c.mergeById([], [fresh, old], 'id')[0].text, 'neu');
  assert.equal(c.mergeById([], [old, fresh], 'id')[0].text, 'neu');
  const tiedA = { id: 'tie', text: 'A', updatedAt: fresh.updatedAt };
  const tiedB = { id: 'tie', text: 'B', updatedAt: fresh.updatedAt };
  assert.deepEqual(plain(c.mergeById([tiedA, tiedB], [], 'id')), plain(c.mergeById([tiedB, tiedA], [], 'id')));
  const beforeA = plain([old]); const beforeB = plain([fresh]);
  assert.deepEqual(plain(c.mergeById([old], [fresh], 'id')), plain(c.mergeById(c.mergeById([old], [fresh], 'id'), [fresh], 'id')));
  assert.deepEqual(plain([old]), beforeA); assert.deepEqual(plain([fresh]), beforeB);
  deleted.add('same');
  assert.equal(c.mergeById([old], [fresh], 'id').length, 0);
}

// ID-less legacy records retain distinct content and replica occurrence counts.
{
  const deleted = new Set(['deleted']);
  const c = context(['getCloseDayItemFreshness', 'canonicalMergeFingerprint', 'mergeById'], {
    isDeleted: id => deleted.has(id)
  });
  const A = { text: 'A', details: { z: 1, a: 2 } };
  const AReordered = { details: { a: 2, z: 1 }, text: 'A' };
  const B = { text: 'B' };
  const C = { text: 'C' };
  const fingerprints = items => Array.from(items, c.canonicalMergeFingerprint).sort();
  const count = (items, fingerprint) => fingerprints(items).filter(value => value === fingerprint).length;
  const aFingerprint = c.canonicalMergeFingerprint(A);

  assert.deepEqual(fingerprints(c.mergeById([A, B], [C], 'id')), fingerprints([A, B, C]));
  assert.deepEqual(fingerprints(c.mergeById([A, B], [C], 'id')), fingerprints(c.mergeById([C], [A, B], 'id')));
  assert.equal(c.mergeById([A], [AReordered], 'id').length, 1);
  assert.equal(count(c.mergeById([A, A], [A], 'id'), aFingerprint), 2);
  assert.equal(count(c.mergeById([A], [A, A], 'id'), aFingerprint), 2);
  assert.equal(count(c.mergeById([A, A], [AReordered, AReordered], 'id'), aFingerprint), 2);
  const mixedMultiplicity = c.mergeById([A, A], [AReordered, B], 'id');
  assert.equal(count(mixedMultiplicity, aFingerprint), 2);
  assert.equal(count(mixedMultiplicity, c.canonicalMergeFingerprint(B)), 1);
  assert.deepEqual(fingerprints(c.mergeById(mixedMultiplicity, [AReordered, B], 'id')), fingerprints(mixedMultiplicity));

  const local = [A, A, { id: 'stable', text: 'alt', updatedAt: '2026-01-01T00:00:00.000Z' }];
  const remote = [AReordered, B, { id: 'stable', text: 'neu', updatedAt: '2026-01-02T00:00:00.000Z' },
    { id: 'other' }, { id: 'deleted' }];
  const localBefore = JSON.stringify(local); const remoteBefore = JSON.stringify(remote);
  const result = c.mergeById(local, remote, 'id');
  assert.equal(result.find(item => item.id === 'stable').text, 'neu');
  assert.ok(result.some(item => item.id === 'other'));
  assert.ok(result.some(item => !Object.prototype.hasOwnProperty.call(item, 'id') && item.text === 'A'));
  assert.equal(result.some(item => item.id === 'deleted'), false);
  assert.equal(result.filter(item => !item.id).every(item => !Object.prototype.hasOwnProperty.call(item, 'id')), true);
  assert.equal(c.mergeById([{ id: '', text: 'empty-id-a' }, { text: 'no-id' }],
    [{ id: '', text: 'empty-id-b' }], 'id').length, 3);
  assert.equal(JSON.stringify(local), localBefore); assert.equal(JSON.stringify(remote), remoteBefore);
  assert.deepEqual(fingerprints(c.mergeById(local, remote, 'id')), fingerprints(c.mergeById(remote, local, 'id')));
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
    'mergeArchivedDayPlan', 'getCloseDayItemFreshness', 'canonicalMergeFingerprint', 'mergeById', 'mergeArchivedDay', 'mergeDays'], {
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
  const legacyDay = { date: '2026-01-04', cards: [{ text: 'A' }, { text: 'B' }, { text: 'C' }],
    objects: [{ text: 'O1' }, { text: 'O2' }, { text: 'O3' }],
    feedItems: [{ title: 'F1' }, { title: 'F2' }, { title: 'F3' }] };
  const normalizedLegacyDay = c.mergeArchivedDay({}, legacyDay);
  assert.deepEqual(plain(normalizedLegacyDay.cards.map(x => x.text).sort()), ['A', 'B', 'C']);
  assert.deepEqual(plain(normalizedLegacyDay.objects.map(x => x.text).sort()), ['O1', 'O2', 'O3']);
  assert.deepEqual(plain(normalizedLegacyDay.feedItems.map(x => x.title).sort()), ['F1', 'F2', 'F3']);
  const roundTrippedLegacyDay = JSON.parse(JSON.stringify(normalizedLegacyDay));
  assert.deepEqual(plain(roundTrippedLegacyDay), plain(normalizedLegacyDay));
  assert.equal(c.mergeDays([legacyDay], [])[0].cards.length, 3);
  const duplicateDate = '2026-01-05';
  const duplicateOne = { id: 'day-one', date: duplicateDate, reviewDone: false,
    closedAt: '2026-01-05T20:00:00.000Z', cards: [{ id: 'a' }, { text: 'legacy-a' }],
    objects: [{ id: 'oa' }], feedItems: [{ id: 'fa' }], plan: { intentionen: 'Plan A' } };
  const duplicateTwo = { id: 'day-two', date: duplicateDate, reviewDone: true,
    cards: [{ id: 'b' }, { text: 'legacy-b' }], objects: [{ id: 'ob' }], feedItems: [{ id: 'fb' }],
    plan: { ort: 'Plan B' } };
  const duplicateRemote = { date: duplicateDate, cards: [{ id: 'c' }], objects: [{ id: 'oc' }], feedItems: [{ id: 'fc' }] };
  const duplicateBefore = plain([duplicateOne, duplicateTwo]);
  const duplicateMerged = c.mergeDays([duplicateOne, duplicateTwo], [duplicateRemote])[0];
  assert.deepEqual(plain(duplicateMerged.cards.filter(x => x.id).map(x => x.id)), ['a', 'b', 'c']);
  assert.equal(duplicateMerged.cards.filter(x => !x.id).length, 2);
  assert.deepEqual(plain(duplicateMerged.objects.map(x => x.id)), ['oa', 'ob', 'oc']);
  assert.deepEqual(plain(duplicateMerged.feedItems.map(x => x.id)), ['fa', 'fb', 'fc']);
  assert.equal(duplicateMerged.plan.intentionen, 'Plan A'); assert.equal(duplicateMerged.plan.ort, 'Plan B');
  assert.equal(duplicateMerged.reviewDone, true); assert.equal(duplicateMerged.closedAt, duplicateOne.closedAt);
  assert.equal(c.mergeDays([duplicateOne, duplicateTwo], [duplicateRemote]).length, 1);
  assert.deepEqual(plain(c.mergeDays([duplicateMerged], [duplicateRemote])), plain([duplicateMerged]));
  assert.deepEqual(plain([duplicateOne, duplicateTwo]), duplicateBefore);
  const days = c.mergeDays([local, { date: '2026-01-03', cards: [] }], [remote, { date: '2025-12-31', cards: [] }]);
  assert.deepEqual(plain(days.map(x => x.date)), ['2026-01-03', '2026-01-01', '2025-12-31']);
}

// Stale TODAY upserts late additions into an existing archive before reset.
{
  const staleDate = '2026-01-01';
  const todayDate = '2026-01-02';
  const c = context(['legacyPlanTaskId', 'normalizePlanTasks', 'mergePlanTasks', 'mergePlanWakeTime', 'mergeCloseDayPlan',
    'mergeArchivedDayPlan', 'getCloseDayItemFreshness', 'canonicalMergeFingerprint', 'mergeById', 'filterDeletedFeedItems', 'hasRelevantDayContent',
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
      'mergeArchivedDayPlan', 'getCloseDayItemFreshness', 'canonicalMergeFingerprint', 'mergeById', 'filterDeletedFeedItems', 'hasRelevantDayContent',
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
  const c = context(['legacyPlanTaskId', 'normalizePlanTasks', 'mergePlanTasks', 'mergePlanWakeTime', 'mergeCloseDayPlan', 'mergeArchivedDayPlan', 'getCloseDayItemFreshness', 'filterDeletedFeedItems', 'canonicalMergeFingerprint', 'mergeById', 'mergeArchivedDay', 'mergeDays'], {
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
    'mergeArchivedDayPlan', 'canonicalMergeFingerprint', 'mergeById', 'filterDeletedFeedItems', 'hasRelevantDayContent', 'mergeArchivedDay', 'mergeToday'], {
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
    'mergePlanWakeTime', 'mergeCloseDayPlan', 'mergeArchivedDayPlan', 'canonicalMergeFingerprint', 'mergeById', 'filterDeletedFeedItems',
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
  assert.equal(c.S.days.find(d => d.date === '2020-01-02').plan.intentionen, 'Alt');
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
    'mergeArchivedDayPlan', 'touchUpdatedAt', 'finishDay'], {
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

// Reclosing a past day updates, but never duplicates, migration targets.
{
  const targetDate = '2026-01-01';
  const ControlledDate = controlledDate('2026-01-10T00:00:00.000Z');
  const day = { date: targetDate, cards: [], feedItems: [], plan: {}, objects: [
    { id: 'move', typ: 'aufgabe', status: '>', text: 'Gleich', contexts: ['a'], reviewNote: 'Alt' },
    { id: 'plan', typ: 'aufgabe', status: '<', text: 'Gleich', contexts: ['b'], reviewNote: '2026-02-01 Alt' },
    { id: 'move-two', typ: 'aufgabe', status: '>', text: 'Gleich' }
  ] };
  let uidCounter = 0;
  const c = context(['getCloseDayItemFreshness', 'mergeCloseDayItems', 'legacyPlanTaskId', 'normalizePlanTasks',
    'mergePlanTasks', 'mergePlanWakeTime', 'mergeCloseDayPlan', 'mergeArchivedDayPlan', 'touchUpdatedAt', 'finishDay'], {
    viewDate: targetDate, TODAY: { date: '2099-01-01' }, S: { days: [day], migrationPuffer: [], futurelog: [] },
    pipeStepsDone: {}, today: () => '2099-01-01', uid: () => `generated-${++uidCounter}`, isDeleted: () => false, Date: ControlledDate,
    document: { getElementById: () => null }, save() {}, renderCardList() {}, updateBadges() {}, updateDateNav() {},
    renderCalendarDots() {}, updateDrawerActive() {}, syncDrawerBadges() {}, updateFLBadge() {}, toast() {}, switchTab() {},
    getViewData: () => day
  });
  c.finishDay();
  assert.equal(c.S.migrationPuffer.length, 2); assert.equal(c.S.futurelog.length, 1);
  assert.equal(c.S.migrationPuffer[0].createdAt, c.S.migrationPuffer[0].updatedAt);
  assert.equal(c.S.futurelog[0].createdAt, c.S.futurelog[0].updatedAt);
  const moveId = c.S.migrationPuffer.find(item => item.objId === 'move').id;
  const futureId = c.S.futurelog[0].id; const futureDate = c.S.futurelog[0].date;
  day.objects[0].text = 'Aktuell'; day.objects[0].reviewNote = 'Neu';
  day.objects[1].text = 'Geplant aktuell'; day.objects[1].reviewNote = '2026-03-01 Neu';
  ControlledDate.set('2026-01-11T00:00:00.000Z');
  c.finishDay();
  assert.equal(c.S.migrationPuffer.length, 2); assert.equal(c.S.futurelog.length, 1);
  assert.equal(c.S.migrationPuffer.find(item => item.objId === 'move').id, moveId);
  assert.equal(c.S.migrationPuffer.find(item => item.objId === 'move').updatedAt, '2026-01-11T00:00:00.000Z');
  assert.match(c.S.migrationPuffer.find(item => item.objId === 'move').text, /Aktuell/);
  assert.equal(c.S.futurelog[0].id, futureId); assert.equal(c.S.futurelog[0].date, futureDate);
  assert.equal(c.S.futurelog[0].text, 'Geplant aktuell');
  day.objects[0].status = '<';
  c.finishDay(); c.finishDay();
  assert.equal(c.S.futurelog.filter(item => item.objId === 'move' && item.fromDate === targetDate).length, 1);
  assert.equal(c.S.migrationPuffer.filter(item => item.objId === 'move' && item.fromDate === targetDate).length, 1);
  c.S.migrationPuffer.push({ id: 'legacy-migration', text: 'Legacy' });
  c.S.futurelog.push({ id: 'legacy-future', text: 'Legacy' });
  c.finishDay();
  assert.ok(c.S.migrationPuffer.some(item => item.id === 'legacy-migration'));
  assert.ok(c.S.futurelog.some(item => item.id === 'legacy-future'));
  const secondDate = '2026-01-02';
  const secondDay = { date: secondDate, objects: [{ id: 'move', typ: 'aufgabe', status: '>', text: 'Anderer Tag' }] };
  c.viewDate = secondDate; c.getViewData = () => secondDay;
  c.finishDay();
  assert.equal(c.S.migrationPuffer.filter(item => item.objId === 'move').length, 2);
}

// Mutable synced records timestamp real user actions, never render-only paths.
{
  const ControlledDate = controlledDate('2026-02-01T00:00:00.000Z');
  const elements = {
    flText: { value: 'Planen' }, flDate: { value: '2026-03-01' }, flMonth: { value: '' }
  };
  const c = context(['touchUpdatedAt', 'addFutureLogEntry', 'doneFLEntry', 'undoFLEntry', 'pullFLToday'], {
    Date: ControlledDate, S: { futurelog: [] }, uid: () => 'future-id', today: () => '2026-02-01',
    document: { getElementById: id => elements[id] || null }, getViewData: () => ({ objects: [] }),
    stampItemEditMeta: item => item, save() {}, renderFLList() {}, updateFLBadge() {}, updateBadges() {}, toast() {}
  });
  c.addFutureLogEntry();
  const entry = c.S.futurelog[0];
  assert.equal(entry.createdAt, '2026-02-01T00:00:00.000Z'); assert.equal(entry.updatedAt, entry.createdAt);
  ControlledDate.set('2026-02-02T00:00:00.000Z'); c.doneFLEntry(entry.id);
  assert.equal(entry.done, true); assert.equal(entry.updatedAt, '2026-02-02T00:00:00.000Z');
  ControlledDate.set('2026-02-03T00:00:00.000Z'); c.undoFLEntry(entry.id);
  assert.equal(entry.done, false); assert.equal(entry.updatedAt, '2026-02-03T00:00:00.000Z');
  ControlledDate.set('2026-02-04T00:00:00.000Z'); c.undoFLEntry(entry.id);
  assert.equal(entry.updatedAt, '2026-02-03T00:00:00.000Z');

  const merge = context(['getCloseDayItemFreshness', 'canonicalMergeFingerprint', 'mergeById'], { isDeleted: () => false });
  const olderDone = { ...plain(entry), done: true, updatedAt: '2026-02-02T00:00:00.000Z' };
  assert.equal(merge.mergeById([olderDone], [entry], 'id')[0].done, false);
  assert.equal(merge.mergeById([entry], [olderDone], 'id')[0].done, false);
}

// Zettel actions and edits carry monotonic freshness metadata.
{
  const ControlledDate = controlledDate('2026-03-01T00:00:00.000Z');
  const modal = { dataset: {} };
  const elements = {
    zettelTitle: { value: 'Titel' }, zettelBody: { value: 'Text' }, zettelTags: { value: 'a, b' }, zettelAddModal: modal
  };
  const c = context(['touchUpdatedAt', 'keepZettel', 'discardZettel', 'addZettelManual'], {
    Date: ControlledDate, S: { zettels: [] }, uid: () => 'zettel-id', today: () => '2026-03-01',
    document: { getElementById: id => elements[id] || null }, save() {}, renderZettelTab() {}, updateZettelBadge() {},
    closeModal() {}, toast() {}
  });
  c.addZettelManual();
  const zettel = c.S.zettels[0];
  assert.equal(zettel.createdAt, zettel.updatedAt);
  ControlledDate.set('2026-03-02T00:00:00.000Z'); c.discardZettel(zettel.id);
  assert.equal(zettel.kept, false); assert.equal(zettel.updatedAt, '2026-03-02T00:00:00.000Z');
  ControlledDate.set('2026-03-03T00:00:00.000Z'); c.keepZettel(zettel.id);
  assert.equal(zettel.kept, true); assert.equal(zettel.updatedAt, '2026-03-03T00:00:00.000Z');
  elements.zettelTitle.value = 'Neuer Titel'; elements.zettelBody.value = 'Neuer Text'; modal.dataset.editId = zettel.id;
  ControlledDate.set('2026-03-04T00:00:00.000Z'); c.addZettelManual();
  assert.equal(zettel.title, 'Neuer Titel'); assert.equal(zettel.updatedAt, '2026-03-04T00:00:00.000Z');
  const merge = context(['getCloseDayItemFreshness', 'canonicalMergeFingerprint', 'mergeById'], { isDeleted: () => false });
  const olderDiscard = { ...plain(zettel), kept: false, updatedAt: '2026-03-02T00:00:00.000Z' };
  assert.equal(merge.mergeById([olderDiscard], [zettel], 'id')[0].kept, true);
  assert.equal(merge.mergeById([zettel], [olderDiscard], 'id')[0].kept, true);
}

// Collection creation and actual field edits retain stable IDs and freshness.
{
  const ControlledDate = controlledDate('2026-04-01T00:00:00.000Z');
  const c = context(['touchUpdatedAt', 'createCollectionFromValues', 'updateCollectionFields'], {
    Date: ControlledDate, S: { collections: [] }, uid: () => 'id',
    normalizeKolName: value => String(value).trim().toLowerCase(),
    findCollectionByNameNormalized: () => null,
    activeKolId: null, save() {}, renderKollektionenTab() {}, openKolDetail() {}, toast() {}
  });
  const col = c.createCollectionFromValues('Alt', '');
  assert.equal(col.createdAt, col.updatedAt);
  ControlledDate.set('2026-04-02T00:00:00.000Z');
  c.updateCollectionFields(col.id, { name: 'Neu', description: 'Beschreibung' });
  assert.equal(col.id, 'col-id'); assert.equal(col.updatedAt, '2026-04-02T00:00:00.000Z');
  ControlledDate.set('2026-04-03T00:00:00.000Z');
  c.updateCollectionFields('col-id', { name: 'Neu', description: 'Beschreibung' });
  assert.equal(col.updatedAt, '2026-04-02T00:00:00.000Z');
  const merge = context(['getCloseDayItemFreshness', 'canonicalMergeFingerprint', 'mergeById'], { isDeleted: () => false });
  assert.equal(merge.mergeById([{ ...plain(col), name: 'Alt', updatedAt: '2026-04-01T00:00:00.000Z' }], [col], 'id')[0].name, 'Neu');
}

// Existing card/object edit helpers stamp freshness once per mutation.
{
  const ControlledDate = controlledDate('2026-05-01T00:00:00.000Z');
  const card = { id: 'card' }; const obj = { id: 'obj' };
  const c = context(['touchUpdatedAt', 'stampItemEditMeta', 'touchObj', 'setObjStatus'], {
    Date: ControlledDate, getDeviceId: () => 'device', getDeviceName: () => 'Device',
    findObjGlobal: () => ({ obj, save() {} }), saveDebounced() {}, renderObjectList() {}, updateReviewBadge() {},
    activeCtxDetail: null, activeCtxReview: null
  });
  c.stampItemEditMeta(card);
  assert.equal(card.updatedAt, '2026-05-01T00:00:00.000Z');
  ControlledDate.set('2026-05-02T00:00:00.000Z'); c.touchObj(obj);
  assert.equal(obj.updatedAt, '2026-05-02T00:00:00.000Z');
  ControlledDate.set('2026-05-03T00:00:00.000Z'); c.setObjStatus(obj.id, 'x');
  assert.equal(obj.status, 'x'); assert.equal(obj.updatedAt, '2026-05-03T00:00:00.000Z');
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
  // load() archives a stale feed before applying the current-day feed filter.
  const loadContext = (state, currentDate) => {
    const ControlledDate = controlledDate(`${currentDate}T12:00:00.000Z`);
    const sandbox = {
      ...state, _dbAvailable: false, _localFallbackWrittenThisSession: false,
      localStorage: { getItem: () => null }, today: () => currentDate, Date: ControlledDate,
      isLocalFallbackAuthoritative: () => false, ensurePromptOverrideState() {}, migrateLegacyObjectMetadata() {},
      cleanOrphanCollectionRefs() {}, getDeviceId() {}, getDeviceName() {}, loadSyncState() {}, save() {}
    };
    sandbox.isDeleted = id => !!(sandbox.S.deletedIds && sandbox.S.deletedIds[id]);
    return context(['legacyPlanTaskId', 'normalizePlanTasks', 'mergePlanTasks', 'mergePlanWakeTime', 'mergeCloseDayPlan',
      'mergeArchivedDayPlan', 'getCloseDayItemFreshness', 'canonicalMergeFingerprint', 'mergeById',
      'filterDeletedFeedItems', 'hasRelevantDayContent', 'mergeArchivedDay', 'archiveTodayIfStale', 'pruneDeletedIds', 'load'], sandbox);
  };
  const staleDate = '2026-01-01'; const currentDate = '2026-01-02';
  const staleLoad = loadContext({
    S: { days: [{ date: staleDate, cards: [], objects: [], plan: {}, feedItems: [
      { id: 'existing', loadedAt: `${staleDate}T08:00:00Z` }, { id: 'same', loadedAt: `${staleDate}T09:00:00Z` }
    ] }], futurelog: [], migrationPuffer: [], deletedIds: { deleted: `${currentDate}T00:00:00Z` } },
    TODAY: { date: staleDate, cards: [], objects: [], plan: {}, feedItems: [
      { id: 'late', loadedAt: `${staleDate}T10:00:00Z` }, { id: 'same', loadedAt: `${staleDate}T09:00:00Z` },
      { id: 'deleted', loadedAt: `${staleDate}T11:00:00Z` }
    ] }
  }, currentDate);
  await staleLoad.load();
  assert.equal(staleLoad.TODAY.date, currentDate); assert.equal(staleLoad.TODAY.feedItems.length, 0);
  assert.deepEqual(plain(staleLoad.S.days[0].feedItems.map(item => item.id)), ['existing', 'late', 'same']);
  await staleLoad.load();
  assert.equal(staleLoad.S.days.length, 1); assert.equal(staleLoad.S.days[0].feedItems.length, 3);

  const currentLoad = loadContext({
    S: { days: [], futurelog: [], migrationPuffer: [], deletedIds: {} },
    TODAY: { date: currentDate, cards: [], objects: [], plan: {}, feedItems: [
      { id: 'old', loadedAt: `${staleDate}T10:00:00Z` }, { id: 'current', loadedAt: `${currentDate}T10:00:00Z` }
    ] }
  }, currentDate);
  await currentLoad.load();
  assert.deepEqual(plain(currentLoad.TODAY.feedItems.map(item => item.id)), ['current']);

  const tombstoneDate = '2026-05-01';
  const tombstoneLoad = loadContext({
    S: { days: [], futurelog: [], migrationPuffer: [], deletedIds: {
      expiredCard: '2025-01-01T00:00:00.000Z', activeCard: '2026-04-30T00:00:00.000Z',
      expiredObject: '2025-01-01T00:00:00.000Z', activeObject: '2026-04-30T00:00:00.000Z',
      expiredFeed: '2025-01-01T00:00:00.000Z', activeFeed: '2026-04-30T00:00:00.000Z'
    } },
    TODAY: { date: '2026-04-30', plan: {},
      cards: [{ id: 'expiredCard' }, { id: 'activeCard' }],
      objects: [{ id: 'expiredObject' }, { id: 'activeObject' }],
      feedItems: [{ id: 'expiredFeed', loadedAt: '2026-04-30T10:00:00Z' },
        { id: 'activeFeed', loadedAt: '2026-04-30T11:00:00Z' }] }
  }, tombstoneDate);
  await tombstoneLoad.load();
  assert.deepEqual(plain(tombstoneLoad.S.days[0].cards.map(item => item.id)), ['expiredCard']);
  assert.deepEqual(plain(tombstoneLoad.S.days[0].objects.map(item => item.id)), ['expiredObject']);
  assert.deepEqual(plain(tombstoneLoad.S.days[0].feedItems.map(item => item.id)), ['expiredFeed']);
  assert.equal(tombstoneLoad.S.deletedIds.expiredCard, undefined);
  assert.equal(tombstoneLoad.S.deletedIds.expiredObject, undefined);
  assert.equal(tombstoneLoad.S.deletedIds.expiredFeed, undefined);
  assert.ok(tombstoneLoad.S.deletedIds.activeCard); assert.ok(tombstoneLoad.S.deletedIds.activeObject);
  assert.ok(tombstoneLoad.S.deletedIds.activeFeed);
  await tombstoneLoad.load();
  assert.equal(tombstoneLoad.S.days.length, 1);

  const legacyStaleDate = '2026-06-01'; const legacyCurrentDate = '2026-06-02';
  const legacyStale = loadContext({
    S: { days: [{ date: legacyStaleDate, cards: [], objects: [], plan: {},
      feedItems: [{ id: 'existing-archive', loadedAt: `${legacyStaleDate}T08:00:00Z` }] }],
      futurelog: [], migrationPuffer: [], deletedIds: {},
      feedItems: [{ id: 'legacy-stale', loadedAt: `${legacyStaleDate}T09:00:00Z` }] },
    TODAY: { date: legacyStaleDate, cards: [], objects: [], plan: {}, feedItems: [] }
  }, legacyCurrentDate);
  await legacyStale.load();
  assert.deepEqual(plain(legacyStale.S.days[0].feedItems.map(item => item.id)), ['existing-archive', 'legacy-stale']);
  assert.equal(legacyStale.TODAY.date, legacyCurrentDate); assert.equal(legacyStale.TODAY.feedItems.length, 0);
  assert.equal(Object.prototype.hasOwnProperty.call(legacyStale.S, 'feedItems'), false);
  await legacyStale.load();
  assert.equal(legacyStale.S.days.length, 1); assert.equal(legacyStale.S.days[0].feedItems.length, 2);

  const legacyCurrent = loadContext({
    S: { days: [], futurelog: [], migrationPuffer: [], deletedIds: {},
      feedItems: [{ id: 'legacy-current', loadedAt: `${legacyCurrentDate}T09:00:00Z` }] },
    TODAY: { date: legacyCurrentDate, cards: [], objects: [], plan: {}, feedItems: [] }
  }, legacyCurrentDate);
  await legacyCurrent.load();
  assert.deepEqual(plain(legacyCurrent.TODAY.feedItems.map(item => item.id)), ['legacy-current']);
  assert.equal(Object.prototype.hasOwnProperty.call(legacyCurrent.S, 'feedItems'), false);

  const populatedCurrent = loadContext({
    S: { days: [], futurelog: [], migrationPuffer: [], deletedIds: {},
      feedItems: [{ id: 'legacy-unused', loadedAt: `${legacyCurrentDate}T09:00:00Z` }] },
    TODAY: { date: legacyCurrentDate, cards: [], objects: [], plan: {},
      feedItems: [{ id: 'already-current', loadedAt: `${legacyCurrentDate}T10:00:00Z` }] }
  }, legacyCurrentDate);
  await populatedCurrent.load();
  assert.deepEqual(plain(populatedCurrent.TODAY.feedItems.map(item => item.id)), ['already-current']);
  assert.equal(populatedCurrent.S.feedItems.length, 1);

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
