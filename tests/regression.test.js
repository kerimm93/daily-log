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
  const c = context(['ensurePlanState', 'savePlanField', 'clearPlanPrompt'], {
    TODAY: isToday ? day : { plan: { tasks: [] } }, getViewData: () => day,
    isViewingToday: () => isToday, document: { getElementById: id => elements[id] || null },
    save: () => saves++, renderCloseDayStatus() {}, renderPlanTab() {}, toast() {}
  });
  return { c, day, elements, saves: () => saves };
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
    planFieldClearedAt: { intentionen: '2020-01-01T00:00:00.000Z' } }, { intentionen: 'Korrektur' });
  pastFill.c.savePlanField('intentionen');
  assert.equal(pastFill.day.plan.intentionen, 'Korrektur');
  assert.ok(pastFill.day.plan.planFieldEditedAt.intentionen);
  assert.equal(pastFill.day.plan.planFieldClearedAt, undefined);
  assert.equal(pastFill.day.plan.planFieldsExplicitlyEdited, undefined);
  assert.equal(pastFill.saves(), 1);

  const pastClear = planEditorContext(false, { intentionen: 'alt', tasks: [] }, { intentionen: '' });
  pastClear.c.savePlanField('intentionen');
  assert.equal(pastClear.day.plan.planFieldClearedAt.intentionen,
    pastClear.day.plan.planFieldEditedAt.intentionen);
  assert.equal(pastClear.day.plan.planFieldsExplicitlyEdited, undefined);

  const clearAll = planEditorContext(false, { intentionen: 'alt', tasks: [] });
  clearAll.c.clearPlanPrompt();
  ['intentionen', 'vermeiden', 'ort', 'stundenplan'].forEach(key => {
    assert.equal(clearAll.day.plan.planFieldClearedAt[key], clearAll.day.plan.planFieldEditedAt[key]);
  });
}

// Persistent field freshness makes value/clear archive merging symmetric.
{
  const c = context(['mergeCloseDayPlan', 'mergeArchivedDayPlan']);
  const cleared = c.mergeCloseDayPlan(
    { intentionen: 'Alter Wert', vermeiden: '' },
    { intentionen: '', vermeiden: '', planFieldsExplicitlyEdited: { intentionen: true } }
  );
  assert.equal(cleared.intentionen, '');
  assert.ok(cleared.planFieldClearedAt.intentionen);
  assert.equal(cleared.planFieldEditedAt.intentionen, cleared.planFieldClearedAt.intentionen);
  assert.equal(c.mergeArchivedDayPlan(cleared, { intentionen: 'Alter Wert' }).intentionen, '');
  assert.equal(c.mergeArchivedDayPlan({ vermeiden: '' }, { vermeiden: 'Ergänzung' }).vermeiden, 'Ergänzung');
  assert.equal(c.mergeArchivedDayPlan({ ort: 'Berlin' }, { ort: '' }).ort, 'Berlin');

  const reclosed = c.mergeCloseDayPlan({ ort: 'Berlin' }, {
    ort: '', planFieldsExplicitlyEdited: { ort: true }
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

  const refilled = c.mergeCloseDayPlan(clear(old), {
    intentionen: 'wieder da', planFieldsExplicitlyEdited: { intentionen: true },
    planFieldEditedAt: { intentionen: recent }
  });
  assert.equal(refilled.intentionen, 'wieder da');
  assert.equal(refilled.planFieldEditedAt.intentionen, recent);
  assert.equal(refilled.planFieldClearedAt && refilled.planFieldClearedAt.intentionen, undefined);
}

// Same-date/Gist day merging keeps the persistent clear marker and JSON payloads preserve it.
{
  const c = context(['mergeCloseDayPlan', 'mergeArchivedDayPlan', 'filterDeletedFeedItems', 'mergeById', 'mergeDays'], {
    S: { deletedIds: {} }, isDeleted: () => false
  });
  const local = [{ date: '2026-01-01', cards: [], objects: [], plan: {
    intentionen: '', planFieldClearedAt: { intentionen: '2026-01-02T00:00:00.000Z' }
  }}];
  const remote = [{ date: '2026-01-01', cards: [], objects: [], plan: { intentionen: 'stale' } }];
  const merged = c.mergeDays(local, remote);
  assert.equal(merged[0].plan.intentionen, '');
  assert.equal(JSON.parse(JSON.stringify({ S: { days: merged } })).S.days[0].plan.planFieldClearedAt.intentionen,
    '2026-01-02T00:00:00.000Z');
}

// Same-date and stale remote TODAY paths use the same freshness decision.
{
  const old = '2026-01-01T00:00:00.000Z';
  const recent = '2026-01-02T00:00:00.000Z';
  const todayDate = '2099-01-01';
  const c = context(['getCloseDayItemFreshness', 'mergeCloseDayItems', 'mergeCloseDayPlan',
    'mergeArchivedDayPlan', 'mergeById', 'filterDeletedFeedItems', 'mergeToday'], {
    S: { days: [{ date: '2020-01-01', cards: [], objects: [], feedItems: [], plan: {
      intentionen: 'alt', planFieldEditedAt: { intentionen: old }
    }}], deletedIds: {} }, today: () => todayDate, isDeleted: () => false
  });
  const blankToday = { date: todayDate, cards: [], objects: [], feedItems: [], plan: {} };
  c.mergeToday(blankToday, { date: '2020-01-01', cards: [], objects: [], feedItems: [], plan: {
    intentionen: '', planFieldEditedAt: { intentionen: recent }, planFieldClearedAt: { intentionen: recent }
  }});
  assert.equal(c.S.days[0].plan.intentionen, '');

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
  const c = context(['mergeCloseDayPlan', 'mergeArchivedDayPlan', 'importFileAndMerge'], {
    FileReader: FileReaderStub,
    S: { days: [{ date, cards: [], objects: [], feedItems: [], plan: {
      intentionen: 'alt', planFieldEditedAt: { intentionen: old }
    }}] }, TODAY: { date: '2099-01-01', cards: [], objects: [], feedItems: [] },
    today: () => '2099-01-01', archiveTodayIfStale() {}, mergeS: local => local,
    mergeById: local => local, parseImportBackup: () => ({ remoteS: {}, remoteTODAY: {
      date, cards: [], objects: [], feedItems: [], plan: { intentionen: '',
        planFieldEditedAt: { intentionen: recent }, planFieldClearedAt: { intentionen: recent } }
    }}), ensureImportDefaults() {}, save() {}, gistAutoSyncDebounced() {}, refreshAfterImport() {}, toast() {}
  });
  c.importFileAndMerge({ files: [{}], value: 'backup.json' });
  assert.equal(c.S.days[0].plan.intentionen, '');
  assert.equal(c.S.days[0].plan.planFieldEditedAt.intentionen, recent);
}

// Daily Note input uses only public plan fields, never merge metadata.
{
  const day = { cards: [], objects: [], feedItems: [], reviewDone: false, plan: {
    intentionen: '', planFieldClearedAt: { intentionen: '2026-01-02T00:00:00.000Z' }
  }};
  const c = context(['getDailyNoteFullDayInput'], {
    S: { migrationPuffer: [] }, viewDate: '2026-01-02', getViewData: () => day,
    formatObjForPrompt: () => ''
  });
  assert.doesNotMatch(c.getDailyNoteFullDayInput(), /planField(?:Cleared|Edited)At|2026-01-02T00:00:00\.000Z/);
}

// Actual finishDay preserves a clear after a same-day merge removed transient UI markers.
{
  const iso = new Date().toISOString().slice(0, 10);
  const old = '2026-01-01T00:00:00.000Z';
  const recent = '2026-01-02T00:00:00.000Z';
  const c = context(['getCloseDayItemFreshness', 'mergeCloseDayItems', 'mergeCloseDayPlan',
    'mergeArchivedDayPlan', 'finishDay'], {
    viewDate: iso, TODAY: { date: iso, cards: [], objects: [], feedItems: [], reviewDone: false,
      plan: { intentionen: '', tasks: [], planFieldEditedAt: { intentionen: recent },
        planFieldClearedAt: { intentionen: recent } } },
    S: { days: [{ date: iso, cards: [], objects: [], feedItems: [], plan: {
      intentionen: 'alt', tasks: [], planFieldEditedAt: { intentionen: old }
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
