'use strict';
const { StatusPill } = window;

// ─── Future Log ───────────────────────────────────────────────────────────────

const FL_SECTORS = [
  { id:'inbox',          label:'Inbox',          color:'var(--ink-dim)' },
  { id:'dieseWoche',     label:'Diese Woche',     color:'var(--accent)' },
  { id:'naechsteWoche',  label:'Nächste Woche',   color:'var(--blue)' },
  { id:'dieserMonat',    label:'Dieser Monat',    color:'var(--ink-mid)' },
  { id:'naechsterMonat', label:'Nächster Monat',  color:'var(--ink-dim)' },
  { id:'langfristig',    label:'Langfristig',     color:'var(--ink-dim)' },
];

const MOVE_TARGETS = {
  inbox:          ['Diese Woche','Nächste Woche','Dieser Monat','Langfristig'],
  dieseWoche:     ['Nächste Woche','Dieser Monat','Langfristig'],
  naechsteWoche:  ['Diese Woche','Dieser Monat','Langfristig'],
  dieserMonat:    ['Diese Woche','Nächste Woche','Langfristig'],
  naechsterMonat: ['Diese Woche','Dieser Monat','Langfristig'],
  langfristig:    ['Diese Woche','Dieser Monat'],
};

const QB = {
  fontFamily:'var(--font-mono)', fontSize:'0.65rem', fontWeight:600,
  width:'25px', height:'25px', display:'flex', alignItems:'center', justifyContent:'center',
  borderRadius:'var(--r-sm)', border:'1px solid var(--border)',
  background:'var(--surface-3)', color:'var(--ink-mid)', cursor:'pointer', flexShrink:0,
};

function FLItem({ item, sector, onAction }) {
  const [hov, setHov] = React.useState(false);
  const [menu, setMenu] = React.useState(false);
  const targets = MOVE_TARGETS[sector] || [];
  const canQuickMove = sector !== 'dieseWoche' && sector !== 'inbox';

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setMenu(false); }}
      style={{
        display:'flex', alignItems:'center', gap:'8px',
        padding:'9px 12px', marginBottom:'4px', borderRadius:'var(--r-sm)',
        border:'1px solid var(--border)',
        background: hov ? 'var(--surface-3)' : 'var(--surface)',
        transition:'background .1s', position:'relative',
      }}>
      <span style={{color:'var(--border-str)',fontSize:'0.75rem',cursor:'grab',flexShrink:0,userSelect:'none',opacity:hov?1:0,transition:'opacity .1s',width:'14px',textAlign:'center'}}>⣿</span>
      {item.priority && <span style={{color:'var(--accent)',fontSize:'0.85rem',flexShrink:0,marginRight:'-2px'}}>·</span>}
      <span style={{flex:1,fontSize:'0.875rem',lineHeight:1.4,color:item.priority?'var(--ink)':'var(--ink-mid)',fontWeight:item.priority?500:400}}>
        {item.text}
      </span>
      {hov && <span style={{fontFamily:'var(--font-mono)',fontSize:'0.55rem',color:'var(--ink-dim)',flexShrink:0}}>{item.date?.slice(5)}</span>}
      {hov && canQuickMove && (
        <button onClick={() => onAction('moveWeek', item.id)} style={{
          fontFamily:'var(--font-mono)', fontSize:'0.58rem', fontWeight:700,
          padding:'3px 9px', borderRadius:'var(--r-sm)',
          border:'1px solid var(--accent)', background:'var(--accent-bg)',
          color:'var(--accent)', cursor:'pointer', flexShrink:0, whiteSpace:'nowrap',
        }}>→ Woche</button>
      )}
      {hov && (
        <div style={{display:'flex',gap:'3px',flexShrink:0}}>
          <button onClick={() => onAction('done', item.id)} style={{...QB, color:'var(--green)'}} title="Erledigt">✓</button>
          <button onClick={() => onAction('strike', item.id)} style={QB} title="Streichen">—</button>
          <div style={{position:'relative'}}>
            <button onClick={() => setMenu(o => !o)} style={QB} title="Verschieben">→</button>
            {menu && targets.length > 0 && (
              <div style={{
                position:'absolute', right:0, top:'calc(100% + 4px)', zIndex:50,
                background:'var(--surface-3)', border:'1px solid var(--border-mid)',
                borderRadius:'var(--r-sm)', minWidth:'155px',
                boxShadow:'var(--shadow)', overflow:'hidden',
              }}>
                {targets.map(t => (
                  <button key={t} onClick={() => { onAction('moveTo', item.id, t); setMenu(false); }} style={{
                    display:'block', width:'100%', textAlign:'left',
                    fontFamily:'var(--font-mono)', fontSize:'0.63rem',
                    padding:'8px 13px', border:'none', borderBottom:'1px solid var(--border)',
                    background:'none', color:'var(--ink-mid)', cursor:'pointer',
                  }}>{t}</button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => onAction('delete', item.id)} style={{...QB, color:'var(--red)'}} title="Löschen">✕</button>
        </div>
      )}
    </div>
  );
}

const WEEK_LIMIT = 7;

function ScreenFutureLog({ device }) {
  const [sector, setSector] = React.useState('dieseWoche');
  const [items, setItems] = React.useState(() => ({...window.MOCK_FUTURE_LOG}));
  const isDesktop = device === 'desktop';

  function act(action, id, target) {
    if (action === 'done' || action === 'strike' || action === 'delete') {
      setItems(p => ({...p, [sector]: p[sector].filter(i => i.id !== id)}));
    } else if (action === 'moveWeek') {
      const item = items[sector].find(i => i.id === id);
      if (!item) return;
      setItems(p => ({...p, [sector]: p[sector].filter(i => i.id !== id), dieseWoche: [...p.dieseWoche, {...item}]}));
    }
  }

  function moveAllToWeek() {
    setItems(p => ({...p, naechsteWoche: [], dieseWoche: [...p.dieseWoche, ...p.naechsteWoche]}));
  }

  const cur = items[sector] || [];
  const total = Object.values(items).reduce((s, a) => s + a.length, 0);
  const sec = FL_SECTORS.find(s => s.id === sector);

  return (
    <div>
      <div style={{marginBottom:'22px'}}>
        <h1 style={{fontFamily:'var(--font-head)',fontWeight:'var(--head-weight)',fontSize:'1.4rem',color:'var(--ink)',marginBottom:'4px'}}>Future Log</h1>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'0.6rem',color:'var(--ink-dim)'}}>{total} Items gesamt · 6 Zeitsektoren</span>
      </div>

      {/* Sector tabs */}
      <div style={{display:'flex',borderBottom:'2px solid var(--border)',marginBottom:'18px',overflowX:'auto',flexShrink:0}}>
        {FL_SECTORS.map(s => {
          const cnt = items[s.id]?.length || 0;
          const active = s.id === sector;
          return (
            <button key={s.id} onClick={() => setSector(s.id)} style={{
              fontFamily:'var(--font-mono)', fontSize:'0.61rem', fontWeight:active?700:400,
              letterSpacing:'0.03em', padding:'8px 14px',
              border:'none', background:'none', cursor:'pointer',
              color: active ? s.color : 'var(--ink-dim)',
              borderBottom: active ? `2px solid ${s.color}` : '2px solid transparent',
              marginBottom:'-2px', whiteSpace:'nowrap', transition:'color .1s',
            }}>
              {s.label}
              {cnt > 0 && (
                <span style={{
                  marginLeft:'5px', fontFamily:'var(--font-mono)', fontSize:'0.55rem',
                  padding:'1px 5px', borderRadius:'9px',
                  background: active ? s.color : 'var(--surface-3)',
                  color: active ? 'var(--bg)' : 'var(--ink-dim)',
                }}>{cnt}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sector header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px',flexWrap:'wrap',gap:'8px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
          <span style={{fontFamily:'var(--font-head)',fontSize:'0.98rem',fontWeight:'var(--head-weight)',color:sec?.color}}>{sec?.label}</span>
          {sector === 'dieseWoche' && (
            <div style={{display:'flex',alignItems:'center',gap:'3px'}}>
              {Array.from({length: WEEK_LIMIT}).map((_, i) => (
                <span key={i} style={{
                  width:'7px', height:'7px', borderRadius:'2px',
                  background: i < cur.length
                    ? (cur.length >= WEEK_LIMIT ? 'var(--red)' : 'var(--accent)')
                    : 'var(--border)',
                  transition:'background .2s',
                }} />
              ))}
              <span style={{fontFamily:'var(--font-mono)',fontSize:'0.58rem',marginLeft:'5px',color:cur.length>=WEEK_LIMIT?'var(--red)':'var(--ink-dim)'}}>
                {cur.length}/{WEEK_LIMIT}
              </span>
            </div>
          )}
        </div>
        <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
          {sector === 'naechsteWoche' && cur.length > 0 && (
            <button className="btn btn-sm" style={{color:'var(--accent)',borderColor:'var(--accent)'}} onClick={moveAllToWeek}>
              → Alle nach Diese Woche
            </button>
          )}
          <button className="btn btn-sm btn-ghost">+ Item</button>
        </div>
      </div>

      {/* Item list */}
      {cur.length === 0 ? (
        <div style={{padding:'40px 0',textAlign:'center',color:'var(--ink-dim)',fontFamily:'var(--font-mono)',fontSize:'0.72rem'}}>
          Keine Items in diesem Sektor ·{' '}
          <span style={{color:'var(--accent)',cursor:'pointer'}}>+ hinzufügen</span>
        </div>
      ) : (
        <div>{cur.map(item => <FLItem key={item.id} item={item} sector={sector} onAction={act} />)}</div>
      )}

      {/* Overview grid — desktop */}
      {isDesktop && (
        <div style={{marginTop:'28px',borderTop:'1px solid var(--border)',paddingTop:'18px'}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:'0.56rem',letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--ink-dim)',display:'block',marginBottom:'10px'}}>Alle Sektoren</span>
          <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'8px'}}>
            {FL_SECTORS.map(s => (
              <button key={s.id} onClick={() => setSector(s.id)} style={{
                padding:'10px 10px', borderRadius:'var(--r-sm)',
                border:`1px solid ${s.id===sector ? s.color : 'var(--border)'}`,
                background: s.id===sector ? 'var(--surface-2)' : 'var(--surface)',
                cursor:'pointer', textAlign:'left', transition:'all .12s',
              }}>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'0.53rem',letterSpacing:'0.07em',textTransform:'uppercase',color:s.color,marginBottom:'4px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.label}</div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'1.05rem',fontWeight:700,color:'var(--ink)'}}>{items[s.id]?.length||0}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Verlauf ──────────────────────────────────────────────────────────────────

const PROMPT_TYPES = ['Review','Musteranalyse','Projekt-Handoff','Freie Verarbeitung'];

function ScreenVerlauf({ device }) {
  const [sel, setSel] = React.useState([]);
  const [pType, setPType] = React.useState('Review');
  const [generated, setGenerated] = React.useState(false);
  const verlauf = window.MOCK_VERLAUF;

  function toggle(date) {
    setSel(p => p.includes(date) ? p.filter(d => d !== date) : [...p, date]);
    setGenerated(false);
  }

  const selDays = sel.map(d => verlauf.find(v => v.date === d)).filter(Boolean);
  const totalKarten = selDays.reduce((s,d) => s + d.karten, 0);
  const totalObj = selDays.reduce((s,d) => s + d.objekte, 0);

  return (
    <div>
      <div style={{marginBottom:'22px'}}>
        <h1 style={{fontFamily:'var(--font-head)',fontWeight:'var(--head-weight)',fontSize:'1.4rem',color:'var(--ink)',marginBottom:'4px'}}>Verlauf</h1>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'0.6rem',color:'var(--ink-dim)'}}>Tage wählen · Kontext-Prompt erzeugen</span>
      </div>

      {/* Prompt builder */}
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--r)',padding:'15px 17px',marginBottom:'18px'}}>
        <div style={{fontFamily:'var(--font-mono)',fontSize:'0.56rem',letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--ink-soft)',marginBottom:'8px'}}>Ausgewählte Tage → Prompt</div>
        {sel.length === 0 ? (
          <p style={{fontSize:'0.8rem',color:'var(--ink-dim)',marginBottom:'10px'}}>Wähle unten mehrere Tage für einen Kontext-Prompt aus.</p>
        ) : (
          <div>
            <div style={{display:'flex',gap:'5px',flexWrap:'wrap',marginBottom:'10px'}}>
              {selDays.map(d => (
                <span key={d.date} style={{fontFamily:'var(--font-mono)',fontSize:'0.58rem',padding:'3px 9px',borderRadius:'999px',background:'var(--accent-bg)',color:'var(--accent)',border:'1px solid var(--accent-dim)'}}>
                  {d.wd.split(', ')[1] || d.wd}
                </span>
              ))}
            </div>
            <div style={{display:'flex',gap:'5px',flexWrap:'wrap',marginBottom:'10px'}}>
              {PROMPT_TYPES.map(p => (
                <button key={p} onClick={() => setPType(p)} style={{
                  fontFamily:'var(--font-mono)',fontSize:'0.58rem',fontWeight:pType===p?700:400,
                  padding:'3px 10px',borderRadius:'999px',cursor:'pointer',
                  border:pType===p?'1px solid var(--accent)':'1px solid var(--border)',
                  background:pType===p?'var(--accent-bg)':'transparent',
                  color:pType===p?'var(--accent)':'var(--ink-dim)',
                }}>{p}</button>
              ))}
            </div>
          </div>
        )}
        <div style={{display:'flex',gap:'7px',flexWrap:'wrap'}}>
          <button className="btn btn-primary btn-sm" disabled={sel.length===0} onClick={() => setGenerated(true)}>
            Auswahl als Prompt
          </button>
          <button className="btn btn-sm btn-ghost">Alle sichtbaren</button>
          {sel.length > 0 && <button className="btn btn-sm btn-ghost" onClick={() => { setSel([]); setGenerated(false); }}>Leeren</button>}
        </div>
        {generated && sel.length > 0 && (
          <div style={{marginTop:'11px',background:'var(--bg-mid)',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',padding:'11px 13px',fontFamily:'var(--font-mono)',fontSize:'0.7rem',color:'var(--ink-mid)',lineHeight:1.6}}>
            [{pType} · {sel.length} Tag{sel.length>1?'e':''}] {totalKarten} Karten · {totalObj} Objekte<br />
            Zeitraum: {selDays[selDays.length-1]?.wd} – {selDays[0]?.wd}<br />
            <span style={{color:'var(--accent)'}}>→ Prompt wurde in die Zwischenablage kopiert (Simulation)</span>
          </div>
        )}
      </div>

      {/* Day list */}
      <div style={{fontFamily:'var(--font-mono)',fontSize:'0.56rem',letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--ink-soft)',marginBottom:'8px'}}>Gespeicherte Tage</div>
      {verlauf.map(day => (
        <div key={day.date} onClick={() => toggle(day.date)} style={{
          display:'flex', alignItems:'center', gap:'11px',
          padding:'10px 13px', borderRadius:'var(--r-sm)',
          border:`1px solid ${sel.includes(day.date) ? 'var(--accent)' : 'var(--border)'}`,
          background: sel.includes(day.date) ? 'var(--accent-bg)' : 'var(--surface)',
          marginBottom:'5px', cursor:'pointer', transition:'all .12s',
        }}>
          <input type="checkbox" readOnly checked={sel.includes(day.date)} style={{accentColor:'var(--accent)',flexShrink:0}} />
          <div style={{flex:1,minWidth:0,overflow:'hidden'}}>
            <div style={{fontSize:'0.88rem',fontWeight:600,color:'var(--ink)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',marginBottom:'2px'}}>{day.wd}</div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'0.57rem',color:'var(--ink-dim)',whiteSpace:'nowrap'}}>
              {day.date} · {day.karten} Karten · {day.objekte} Obj.
            </div>
          </div>
          <StatusPill status={day.status} offen={day.offen} />
        </div>
      ))}
    </div>
  );
}

// ─── Abschluss ────────────────────────────────────────────────────────────────

function ScreenAbschluss({ device }) {
  const [step, setStep] = React.useState('note');
  const [legOpen, setLegOpen] = React.useState(false);

  return (
    <div>
      <div style={{marginBottom:'22px'}}>
        <h1 style={{fontFamily:'var(--font-head)',fontWeight:'var(--head-weight)',fontSize:'1.4rem',color:'var(--ink)',marginBottom:'4px'}}>Abschluss</h1>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'0.6rem',color:'var(--ink-dim)'}}>Dienstag, 10. Juni · noch offen</span>
      </div>

      {/* Steps */}
      <div style={{display:'flex',borderBottom:'2px solid var(--border)',marginBottom:'22px'}}>
        {[{id:'note',label:'1 · Daily Note'},{id:'bujo',label:'2 · BuJo'}].map(s => (
          <button key={s.id} onClick={() => setStep(s.id)} style={{
            padding:'8px 20px', border:'none', background:'none', cursor:'pointer',
            fontFamily:'var(--font-mono)', fontSize:'0.63rem', letterSpacing:'0.04em',
            fontWeight: step===s.id ? 700 : 400,
            color: step===s.id ? 'var(--accent)' : 'var(--ink-dim)',
            borderBottom: step===s.id ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom:'-2px',
          }}>{s.label}</button>
        ))}
      </div>

      {step === 'note' && (
        <div>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--r)',padding:'18px 20px',marginBottom:'14px'}}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'0.56rem',letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--ink-soft)',marginBottom:'10px'}}>Daily Note</div>
            <p style={{fontSize:'0.85rem',color:'var(--ink-mid)',lineHeight:1.6,marginBottom:'16px'}}>
              Strukturierter Reflexionsprompt für heute — auf Basis aller Karten und Objekte des Tages. Das Ergebnis kann als neue Karte importiert werden.
            </p>
            <div style={{display:'flex',flexDirection:'column',gap:'9px',alignItems:'flex-start'}}>
              <button className="btn btn-primary btn-lg">Daily Note Prompt generieren</button>
              <div style={{display:'flex',gap:'7px'}}>
                <button className="btn btn-sm btn-ghost">↑ Ergebnis importieren</button>
                <button className="btn btn-sm btn-ghost">Vorschau</button>
              </div>
            </div>
          </div>
          <button className="btn btn-sm" onClick={() => setStep('bujo')}>Weiter zu BuJo →</button>
        </div>
      )}

      {step === 'bujo' && (
        <div>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--r)',padding:'18px 20px',marginBottom:'14px'}}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'0.56rem',letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--ink-soft)',marginBottom:'10px'}}>BuJo-Fassung</div>
            <p style={{fontSize:'0.85rem',color:'var(--ink-mid)',lineHeight:1.6,marginBottom:'16px'}}>
              Bullet-Journal-Eintrag des Tages: kompakt, strukturiert, im klassischen BuJo-Format.
            </p>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
              <button className="btn btn-primary">BuJo generieren</button>
              <button className="btn btn-sm btn-ghost">↑ Importieren</button>
            </div>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={() => setStep('note')}>← Zurück zu Daily Note</button>
        </div>
      )}

      {/* Legacy tools */}
      <div style={{border:'1px solid var(--border)',borderRadius:'var(--r)',overflow:'hidden',marginTop:'24px'}}>
        <button onClick={() => setLegOpen(o => !o)} style={{width:'100%',padding:'10px 16px',background:'var(--surface-2)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:'0.56rem',letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--ink-dim)'}}>Erweiterte Werkzeuge</span>
          <span style={{fontFamily:'var(--font-mono)',fontSize:'0.7rem',color:'var(--ink-dim)'}}>{legOpen ? '▴' : '▾'}</span>
        </button>
        {legOpen && (
          <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:'6px'}}>
            {['Aufgaben-Extraktion (Legacy)','Scanner / OCR','Zettelkasten-Export','Alle generieren'].map(l => (
              <button key={l} className="btn btn-sm btn-ghost" style={{justifyContent:'flex-start',color:'var(--ink-dim)'}}>{l}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Advanced / Settings ──────────────────────────────────────────────────────

function ScreenAdvanced({ device }) {
  const groups = [
    { g:'Sync & Backup',      items:['GitHub-Gist-Sync konfigurieren','Backup erstellen','Import / Recovery','Export als ZIP'] },
    { g:'Feed & Scanner',     items:['Feed-Quellen verwalten','Scanner / OCR','Archiv-Import'] },
    { g:'Zettel & Plan',      items:['Zettelkasten-Ansicht','Plan für morgen','Wochenplan'] },
    { g:'App-Einstellungen',  items:['Theme & Darstellung','Sprache & Format','PWA / Manifest','Alle Daten löschen'] },
  ];
  return (
    <div>
      <div style={{marginBottom:'22px'}}>
        <h1 style={{fontFamily:'var(--font-head)',fontWeight:'var(--head-weight)',fontSize:'1.4rem',color:'var(--ink)',marginBottom:'4px'}}>Einstellungen & Werkzeuge</h1>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'0.6rem',color:'var(--ink-dim)'}}>Technische Bereiche · kein Tages-Workflow</span>
      </div>
      {groups.map(({ g, items }) => (
        <div key={g} style={{marginBottom:'20px'}}>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'0.56rem',letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--ink-soft)',marginBottom:'7px'}}>{g}</div>
          <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
            {items.map(item => (
              <button key={item} className="btn btn-ghost" style={{justifyContent:'flex-start',fontSize:'0.8rem'}}>
                <span style={{color:'var(--ink-dim)'}}>›</span> {item}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Exports ─────────────────────────────────────────────────────────────────
Object.assign(window, { ScreenFutureLog, ScreenVerlauf, ScreenAbschluss, ScreenAdvanced });
