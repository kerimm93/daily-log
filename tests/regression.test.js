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

// Persistent explicit-clear metadata and conservative archive merging.
{
  const c = context(['mergeCloseDayPlan', 'mergeArchivedDayPlan']);
  const cleared = c.mergeCloseDayPlan(
    { intentionen: 'Alter Wert', vermeiden: '' },
    { intentionen: '', vermeiden: '', planFieldsExplicitlyEdited: { intentionen: true } }
  );
  assert.equal(cleared.intentionen, '');
  assert.ok(cleared.planFieldClearedAt.intentionen);
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

// Daily Note input uses only public plan fields, never merge metadata.
{
  const day = { cards: [], objects: [], feedItems: [], reviewDone: false, plan: {
    intentionen: '', planFieldClearedAt: { intentionen: '2026-01-02T00:00:00.000Z' }
  }};
  const c = context(['getDailyNoteFullDayInput'], {
    S: { migrationPuffer: [] }, viewDate: '2026-01-02', getViewData: () => day,
    formatObjForPrompt: () => ''
  });
  assert.doesNotMatch(c.getDailyNoteFullDayInput(), /planFieldClearedAt|2026-01-02T00:00:00\.000Z/);
}

// Actual finishDay archives an explicit clear and remains idempotent on reclose.
{
  const iso = new Date().toISOString().slice(0, 10);
  const c = context(['getCloseDayItemFreshness', 'mergeCloseDayItems', 'mergeCloseDayPlan', 'finishDay'], {
    viewDate: iso, TODAY: { date: iso, cards: [], objects: [], feedItems: [], reviewDone: false,
      plan: { intentionen: '', tasks: [], planFieldsExplicitlyEdited: { intentionen: true } } },
    S: { days: [], migrationPuffer: [], futurelog: [], deletedIds: {} }, pipeStepsDone: {},
    today: () => iso, uid: () => 'day-id', isDeleted: () => false,
    document: { getElementById: () => null }, save() {}, renderCardList() {}, updateBadges() {},
    updateDateNav() {}, renderCalendarDots() {}, updateDrawerActive() {}, syncDrawerBadges() {},
    updateFLBadge() {}, toast() {}, switchTab() {},
    getViewData: null
  });
  c.getViewData = () => c.TODAY;
  c.finishDay();
  assert.equal(c.S.days.length, 1);
  assert.ok(c.S.days[0].plan.planFieldClearedAt.intentionen);
  c.finishDay();
  assert.equal(c.S.days.length, 1);
}

// Cockpit closure is based on closedAt, including today's archive after finishDay reset.
{
  const nodes = {};
  const document = { getElementById(id) { return nodes[id] ||= { textContent: '', innerHTML: '' }; } };
  const iso = new Date().toISOString().slice(0, 10);
  const c = context(['isDayClosed', 'setTextIfPresent', 'updateSammelnStatus'], {
    document, TODAY: { date: iso, cards: [], objects: [], reviewDone: false }, S: { days: [] },
    today: () => iso, getViewData: null
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
  const past = { date: '2020-01-01', reviewDone: true };
  assert.equal(c.isDayClosed(past), false);
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
