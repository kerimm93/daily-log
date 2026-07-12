'use strict';

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_KARTEN = [
  { id:'k1', time:'15:52', type:'LOG',
    text:'- [ ] 12:59 Ich sollte später auf jeden Fall mal für Roadtrip nachfragen',
    processed:false, objekte:0 },
  { id:'k2', time:'12:44', type:'FILE',
    text:'Wenn ich mir die nächsten Sprints als Markdown-Codeblock aus Obsidian exportiere und per GPT in Kanban-Boards überführe, kann ich den Sprint direkt visualisieren.',
    processed:true, objekte:1 },
  { id:'k3', time:'12:37', type:'FILE',
    text:'Ich muss unbedingt mal Tutorials für Roadtrip erstellen. Das wäre ein guter erster Sprint für diesen Monat.',
    processed:true, objekte:1 },
];

const MOCK_OBJEKTE = [
  { id:'o1', type:'aufgabe', title:'Roadtrip-Tutorials erstellen',
    source:'12:37', erweiterung:true, tags:[] },
  { id:'o2', type:'sop', title:'Sprint-Reihenfolge per Markdown-Codeblock, Obsidian Kanban und GPT anpassen',
    source:'12:44', erweiterung:true, tags:['Priorität','Inspiration'] },
];

const MOCK_RUECKSTAND = [
  { date:'Sa., 6. Juni', type:'FILE', text:'# Co-Pilot-Bericht · 00:15' },
  { date:'So., 7. Juni', type:'FILE', text:'# Co-Pilot-Bericht · 23:56' },
  { date:'Mo., 8. Juni', type:'LOG',  text:'- [ ] Kalenderansicht einbauen\n- [ ] Bewerbungsunterlagen vorbereiten' },
];

const MOCK_FUTURE_LOG = {
  inbox: [
    { id:'fi1', text:'Notlinker Notiz erstellen', date:'2026-03-29' },
    { id:'fi2', text:'Mit meinen Apps an allen Geräten einloggen und einrichten', date:'2026-03-29' },
    { id:'fi3', text:'Feature: alte Daily Log Chats importieren', date:'2026-03-29' },
    { id:'fi4', text:'Obsidian-Kanban-Plugin final konfigurieren', date:'2026-05-12' },
  ],
  dieseWoche: [
    { id:'dw1', text:'Bewerbungsunterlagen fertigstellen', date:'2026-06-08', priority:true },
    { id:'dw2', text:'Claude-Cowork-Tutorial von Nick Milo ansehen', date:'2026-06-09' },
    { id:'dw3', text:'Roadtrip Sprint-Planung abschließen', date:'2026-06-10', priority:true },
    { id:'dw4', text:'Kalenderansicht recherchieren', date:'2026-06-10' },
    { id:'dw5', text:'Restliches Geschirr spülen', date:'2026-06-07' },
  ],
  naechsteWoche: [
    { id:'nw1', text:'Bewerbungstracker fertigstellen', date:'2026-03-29' },
    { id:'nw2', text:'Mit Bewerbungen beginnen und abarbeiten', date:'2026-03-29' },
    { id:'nw3', text:'Screenshots der letzten Unterrichtseinheit herunterladen', date:'2026-06-15' },
    { id:'nw4', text:'Braindump diktieren', date:'2026-06-16' },
    { id:'nw5', text:'Fred noch antworten', date:'2026-06-17' },
  ],
  dieserMonat: [
    { id:'dm1', text:'Text für den Lesekreis lesen', date:'2026-06-20' },
    { id:'dm2', text:'Rausfinden: Auswirkung des GPT-Downgrades', date:'2026-06-22' },
    { id:'dm3', text:'Boden wischen', date:'2026-06-25' },
    { id:'dm4', text:'Monats-Review vorbereiten', date:'2026-06-30' },
  ],
  naechsterMonat: [
    { id:'nm1', text:'Atlas-Integration planen', date:'2026-07-05' },
    { id:'nm2', text:'Monats-Review-Template überarbeiten', date:'2026-07-10' },
    { id:'nm3', text:'Urlaub Q3 planen', date:'2026-07-15' },
  ],
  langfristig: [
    { id:'lf1', text:'Roadtrip öffentlich zugänglich machen', date:'2025-12-01' },
    { id:'lf2', text:'DailyLog als PWA im App Store', date:'2026-01-10' },
    { id:'lf3', text:'Kalenderansicht in die App einbauen', date:'2026-02-14' },
    { id:'lf4', text:'People-/Beziehungsmodul bauen', date:'2026-03-01' },
    { id:'lf5', text:'Zettelansicht neu denken', date:'2026-03-15' },
  ],
};

const MOCK_VERLAUF = [
  { date:'2026-06-09', wd:'Di., 9. Juni',   karten:2,  objekte:8,   status:'offen' },
  { date:'2026-06-08', wd:'Mo., 8. Juni',   karten:2,  objekte:8,   status:'offen' },
  { date:'2026-06-07', wd:'So., 7. Juni',   karten:3,  objekte:8,   status:'offen' },
  { date:'2026-06-06', wd:'Sa., 6. Juni',   karten:1,  objekte:8,   status:'offen' },
  { date:'2026-06-05', wd:'Fr., 5. Juni',   karten:4,  objekte:27,  status:'teilweise', offen:13 },
  { date:'2026-06-04', wd:'Do., 4. Juni',   karten:2,  objekte:48,  status:'abgeschlossen' },
  { date:'2026-06-03', wd:'Mi., 3. Juni',   karten:5,  objekte:114, status:'abgeschlossen' },
  { date:'2026-06-02', wd:'Di., 2. Juni',   karten:5,  objekte:55,  status:'abgeschlossen' },
  { date:'2026-06-01', wd:'Mo., 1. Juni',   karten:3,  objekte:49,  status:'abgeschlossen' },
  { date:'2026-05-31', wd:'So., 31. Mai',   karten:2,  objekte:22,  status:'abgeschlossen' },
];

// ─── Micro Components ─────────────────────────────────────────────────────────

function ObjTypTag({ type }) {
  const M = {
    aufgabe:     ['AUFGABE',  'var(--blue)',   'var(--blue-bg)'],
    ereignis:    ['EREIGNIS', 'var(--green)',  'var(--green-bg)'],
    notiz:       ['NOTIZ',    'var(--ink-mid)','var(--surface-3)'],
    idee:        ['IDEE',     'var(--orange)', 'var(--orange-bg)'],
    zitat:       ['ZITAT',    'var(--purple)', 'var(--purple-bg)'],
    sop:         ['SOP',      'var(--red)',    'var(--red-bg)'],
    beobachtung: ['BEOB.',    'var(--blue)',   'var(--blue-bg)'],
  };
  const [label, color, bg] = M[type] || ['?','var(--ink-mid)','var(--surface-3)'];
  return (
    <span style={{
      fontFamily:'var(--font-mono)', fontSize:'0.57rem', fontWeight:600,
      letterSpacing:'0.06em', textTransform:'uppercase',
      padding:'2px 7px', borderRadius:'3px', background:bg, color,
      border:`1px solid ${color}`, flexShrink:0,
    }}>{label}</span>
  );
}

function KartenTypBadge({ type }) {
  const M = {
    LOG:  ['var(--blue-bg)','var(--blue)'],
    VOICE:['var(--green-bg)','var(--green)'],
    FILE: ['var(--purple-bg)','var(--purple)'],
    MAIL: ['var(--orange-bg)','var(--orange)'],
    TEXT: ['var(--surface-3)','var(--ink-mid)'],
  };
  const [bg, color] = M[type] || M.TEXT;
  return (
    <span style={{
      fontFamily:'var(--font-mono)', fontSize:'0.57rem', fontWeight:600,
      letterSpacing:'0.06em', textTransform:'uppercase',
      padding:'2px 7px', borderRadius:'3px', background:bg, color, flexShrink:0,
    }}>{type}</span>
  );
}

function StatusPill({ status, offen }) {
  if (status === 'abgeschlossen') return (
    <span style={{fontFamily:'var(--font-mono)',fontSize:'0.58rem',padding:'3px 9px',borderRadius:'3px',background:'var(--green-bg)',color:'var(--green)',border:'1px solid var(--green)',whiteSpace:'nowrap'}}>✓ abgeschlossen</span>
  );
  if (status === 'teilweise') return (
    <span style={{fontFamily:'var(--font-mono)',fontSize:'0.58rem',padding:'3px 9px',borderRadius:'3px',background:'var(--orange-bg)',color:'var(--orange)',border:'1px solid var(--orange)',whiteSpace:'nowrap'}}>△ {offen} offen</span>
  );
  return (
    <span style={{fontFamily:'var(--font-mono)',fontSize:'0.58rem',padding:'3px 9px',borderRadius:'3px',background:'var(--surface-2)',color:'var(--ink-dim)',border:'1px solid var(--border)',whiteSpace:'nowrap'}}>· offen</span>
  );
}

function KarteRow({ karte }) {
  const [hov, setHov] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:'flex', alignItems:'flex-start', gap:'9px',
        padding:'9px 10px', marginBottom:'2px', borderRadius:'var(--r-sm)',
        background: hov ? 'var(--surface-2)' : 'transparent',
        border:`1px solid ${hov ? 'var(--border)' : 'transparent'}`,
        transition:'all .1s', cursor:'default',
      }}>
      <span style={{fontFamily:'var(--font-mono)',fontSize:'0.6rem',color:'var(--ink-dim)',minWidth:'36px',paddingTop:'3px',flexShrink:0}}>{karte.time}</span>
      <KartenTypBadge type={karte.type} />
      <span style={{flex:1,fontSize:'0.85rem',lineHeight:1.5,color:'var(--ink-mid)',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{karte.text}</span>
      <div style={{display:'flex',alignItems:'center',gap:'5px',flexShrink:0}}>
        {karte.objekte > 0 && <span style={{fontFamily:'var(--font-mono)',fontSize:'0.58rem',color:'var(--accent)',whiteSpace:'nowrap'}}>{karte.objekte} Obj.</span>}
        {!karte.processed && <span style={{color:'var(--orange)',fontSize:'0.75rem'}}>!</span>}
        {hov && <span style={{fontFamily:'var(--font-mono)',fontSize:'0.75rem',color:'var(--ink-dim)',cursor:'pointer'}}>›</span>}
      </div>
    </div>
  );
}

// ─── ScreenSammeln ────────────────────────────────────────────────────────────

const CARD_TYPES = [
  {id:'LOG',label:'Log'},{id:'VOICE',label:'Voice'},
  {id:'MAIL',label:'Mail'},{id:'TEXT',label:'Text'},
];

function SideStatusPanel() {
  return (
    <div style={{borderRadius:'var(--r)',border:'1px solid var(--border)',background:'var(--surface)',padding:'16px 18px'}}>
      <div style={{fontFamily:'var(--font-mono)',fontSize:'0.56rem',letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--ink-soft)',marginBottom:'12px'}}>Heute · 10. Juni</div>
      <div style={{display:'flex',flexDirection:'column',gap:'9px'}}>
        {[
          {dot:'var(--blue)',   text:'3 Karten gespeichert'},
          {dot:'var(--orange)', text:'1 unverarbeitet'},
          {dot:'var(--accent)', text:'2 Objekte extrahiert'},
          {dot:'var(--ink-dim)',text:'Abschluss: noch offen'},
        ].map((s,i) => (
          <div key={i} style={{display:'flex',alignItems:'center',gap:'9px'}}>
            <span style={{width:'6px',height:'6px',borderRadius:'50%',background:s.dot,flexShrink:0}} />
            <span style={{fontSize:'0.82rem',color:'var(--ink-mid)'}}>{s.text}</span>
          </div>
        ))}
      </div>
      <hr style={{border:'none',borderTop:'1px solid var(--border)',margin:'13px 0'}} />
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontSize:'0.78rem',color:'var(--orange)'}}>↑ 7 Karten Rückstand</span>
        <button className="btn btn-sm btn-ghost">Anzeigen</button>
      </div>
    </div>
  );
}

function ActionCard({ icon, title, desc, btn1, btn2 }) {
  return (
    <div style={{borderRadius:'var(--r)',border:'1px solid var(--border)',background:'var(--surface)',padding:'14px 16px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'6px'}}>
        <span style={{color:'var(--accent)',fontSize:'0.8rem'}}>{icon}</span>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'0.56rem',letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--ink-soft)'}}>{title}</span>
      </div>
      <p style={{fontSize:'0.78rem',color:'var(--ink-mid)',lineHeight:1.55,marginBottom:'10px'}}>{desc}</p>
      <div style={{display:'flex',gap:'7px',flexWrap:'wrap'}}>
        <button className="btn btn-sm btn-primary">{btn1}</button>
        {btn2 && <button className="btn btn-sm btn-ghost">{btn2}</button>}
      </div>
    </div>
  );
}

function ScreenSammeln({ device }) {
  const [cardType, setCardType] = React.useState('LOG');
  const [text, setText] = React.useState('');
  const [karten, setKarten] = React.useState([...MOCK_KARTEN]);
  const [flash, setFlash] = React.useState(false);
  const isMobile = device === 'mobile';

  function save() {
    if (!text.trim()) return;
    const h = String(new Date().getHours()).padStart(2,'0');
    const m = String(new Date().getMinutes()).padStart(2,'0');
    setKarten(p => [{id:`k${Date.now()}`,time:`${h}:${m}`,type:cardType,text,processed:false,objekte:0}, ...p]);
    setText('');
    setFlash(true);
    setTimeout(() => setFlash(false), 1600);
  }

  const words = text.split(/\s+/).filter(Boolean).length;
  const lines = text ? text.split('\n').length : 0;

  return (
    <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 260px',gap:'28px',alignItems:'start'}}>
      {/* Main column */}
      <div>
        <div style={{marginBottom:'24px'}}>
          <h1 style={{fontFamily:'var(--font-head)',fontWeight:'var(--head-weight)',fontSize:isMobile?'1.3rem':'1.55rem',color:'var(--ink)',lineHeight:1.1,marginBottom:'5px'}}>
            Dienstag, 10. Juni
          </h1>
          <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'0.6rem',color:'var(--ink-dim)',letterSpacing:'0.08em'}}>2026 · KW 24</span>
            {isMobile && <>
              <span style={{color:'var(--border-mid)'}}>·</span>
              <span style={{fontFamily:'var(--font-mono)',fontSize:'0.6rem',color:'var(--orange)'}}>1 unverarbeitet</span>
            </>}
          </div>
        </div>

        {/* Input */}
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--r)',padding:'16px 18px',marginBottom:'22px'}}>
          <div style={{display:'flex',gap:'5px',marginBottom:'12px'}}>
            {CARD_TYPES.map(({id, label}) => {
              const on = cardType === id;
              return (
                <button key={id} onClick={() => setCardType(id)} style={{
                  fontFamily:'var(--font-mono)',fontSize:'0.62rem',fontWeight:on?700:400,
                  letterSpacing:'0.05em',textTransform:'uppercase',
                  padding:'5px 12px',borderRadius:'var(--r-sm)',
                  border:on?'1px solid var(--accent)':'1px solid var(--border)',
                  background:on?'var(--accent)':'transparent',
                  color:on?'var(--bg)':'var(--ink-dim)',cursor:'pointer',transition:'all .1s',
                }}>{label}</button>
              );
            })}
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if ((e.ctrlKey||e.metaKey) && e.key==='Enter') save(); }}
            placeholder="Inhalt hier einfügen — Zeitstempel-Bullets, Voice-Transkript, E-Mail, Freitext…"
            style={{
              width:'100%',background:'var(--bg-mid)',border:'1px solid var(--border)',
              borderRadius:'var(--r-sm)',color:'var(--ink)',fontFamily:'var(--font-body)',
              fontSize:'0.9rem',lineHeight:1.65,padding:'11px 13px',resize:'vertical',
              minHeight:'120px',outline:'none',transition:'border-color .15s',
            }}
          />
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginTop:'10px',flexWrap:'wrap'}}>
            <button className="btn btn-primary" onClick={save} style={{
              background:flash?'var(--green)':undefined,
              borderColor:flash?'var(--green)':undefined,
              transition:'background .2s,border-color .2s',
            }}>
              {flash ? '✓ Gespeichert' : '+ Karte speichern'}
            </button>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'0.58rem',color:'var(--ink-dim)'}}>
              {words > 0 ? `${words} Wörter · ${lines} Z.` : '0 Wörter'}
            </span>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'0.55rem',color:'var(--ink-dim)',marginLeft:'auto'}}>⌘↵</span>
          </div>
        </div>

        {/* Cards list */}
        <div style={{marginBottom:isMobile?'20px':0}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'0.56rem',letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--ink-soft)'}}>Heutige Karten</span>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'0.58rem',color:'var(--ink-dim)'}}>
              {karten.filter(k=>k.processed).length}/{karten.length} verarbeitet
            </span>
          </div>
          {karten.map(k => <KarteRow key={k.id} karte={k} />)}
        </div>

        {isMobile && (
          <div style={{marginTop:'18px',display:'flex',flexDirection:'column',gap:'11px'}}>
            <ActionCard icon="●" title="Morning Briefing"
              desc="Zusammenfassung des Tages für einen schnellen Tagesstart-Chat."
              btn1="Briefing generieren" btn2="↑ Importieren" />
            <ActionCard icon="○" title="Co-Pilot"
              desc="Begleitender Chat mit heutigem Tageskontext."
              btn1="Co-Pilot starten" btn2="↑ Importieren" />
          </div>
        )}
      </div>

      {/* Right sidebar — desktop only */}
      {!isMobile && (
        <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
          <SideStatusPanel />
          <ActionCard icon="●" title="Morning Briefing"
            desc="Zusammenfassung des bisherigen Tags + Woche. Ergebnis als Karte importierbar."
            btn1="Briefing generieren" btn2="↑ Importieren" />
          <ActionCard icon="○" title="Co-Pilot · Fokus"
            desc="Begleitender Chat mit heutigem Kontext. Abschlussbericht als neue Karte."
            btn1="Co-Pilot starten" btn2="↑ Importieren" />
        </div>
      )}
    </div>
  );
}

// ─── ScreenObjekte ────────────────────────────────────────────────────────────

const OBJ_FILTERS = [
  {id:'alle',label:'Alle',count:2},
  {id:'aufgabe',label:'Aufgabe',count:1},
  {id:'sop',label:'SOP',count:1},
  {id:'idee',label:'Idee',count:0},
  {id:'notiz',label:'Notiz',count:0},
];

function ObjektRow({ obj }) {
  const [hov, setHov] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding:'9px 12px', borderRadius:'var(--r-sm)',
        border:`1px solid ${hov ? 'var(--border)' : 'transparent'}`,
        background: hov ? 'var(--surface-2)' : 'transparent',
        transition:'all .1s', marginBottom:'2px', cursor:'default',
      }}>
      <div style={{display:'flex',alignItems:'flex-start',gap:'9px'}}>
        <input type="checkbox" style={{marginTop:'4px',accentColor:'var(--accent)',flexShrink:0,cursor:'pointer'}} />
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'7px',marginBottom:'4px',flexWrap:'wrap'}}>
            <ObjTypTag type={obj.type} />
            <span style={{fontFamily:'var(--font-mono)',fontSize:'0.57rem',color:'var(--ink-dim)'}}>{obj.source}</span>
            {obj.erweiterung && <span style={{fontFamily:'var(--font-mono)',fontSize:'0.55rem',color:'var(--accent-dim)'}}>+ Ergänzung</span>}
          </div>
          <div style={{fontSize:'0.88rem',fontWeight:500,color:'var(--ink)',lineHeight:1.4,marginBottom:obj.tags?.length?'5px':0}}>
            {obj.title}
          </div>
          {obj.tags?.length > 0 && (
            <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
              {obj.tags.map(t => (
                <span key={t} style={{fontFamily:'var(--font-mono)',fontSize:'0.55rem',letterSpacing:'0.03em',padding:'2px 7px',borderRadius:'999px',background:'var(--surface-3)',color:'var(--ink-mid)',border:'1px solid var(--border)'}}>· {t}</span>
              ))}
            </div>
          )}
        </div>
        {hov && (
          <div style={{display:'flex',gap:'3px',flexShrink:0}}>
            {['L','✎','⬡','✕'].map(a => (
              <button key={a} style={{fontFamily:'var(--font-mono)',fontSize:'0.6rem',width:'24px',height:'24px',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'var(--r-sm)',border:'1px solid var(--border)',background:'var(--surface-3)',color:'var(--ink-mid)',cursor:'pointer'}}>{a}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ScreenObjekte({ device }) {
  const [filter, setFilter] = React.useState('alle');
  const [rueckOpen, setRueckOpen] = React.useState(false);

  return (
    <div>
      <div style={{marginBottom:'22px'}}>
        <h1 style={{fontFamily:'var(--font-head)',fontWeight:'var(--head-weight)',fontSize:'1.4rem',color:'var(--ink)',marginBottom:'4px'}}>Objekte</h1>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'0.6rem',color:'var(--ink-dim)'}}>10. Juni · 2 extrahiert heute</span>
      </div>

      {/* Filters */}
      <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'14px',flexWrap:'wrap'}}>
        {OBJ_FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            fontFamily:'var(--font-mono)',fontSize:'0.6rem',fontWeight:filter===f.id?700:400,
            letterSpacing:'0.04em',padding:'4px 11px',borderRadius:'999px',cursor:'pointer',
            border:filter===f.id?'1px solid var(--accent)':'1px solid var(--border)',
            background:filter===f.id?'var(--accent-bg)':'transparent',
            color:filter===f.id?'var(--accent)':'var(--ink-dim)',
          }}>{f.label}{f.count > 0 ? ` · ${f.count}` : ''}</button>
        ))}
        <span style={{marginLeft:'auto',fontFamily:'var(--font-mono)',fontSize:'0.58rem',color:'var(--ink-dim)',cursor:'pointer'}}>↑ chronologisch</span>
      </div>

      {/* Extrahierte Objekte */}
      <div style={{marginBottom:'18px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'6px'}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:'0.56rem',letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--ink-soft)'}}>Extrahiert heute</span>
          <button className="btn btn-sm btn-ghost" style={{fontSize:'0.58rem'}}>Auswählen</button>
        </div>
        {MOCK_OBJEKTE.map(o => <ObjektRow key={o.id} obj={o} />)}
      </div>

      {/* Karten zur Extraktion */}
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--r)',padding:'14px 16px',marginBottom:'14px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:'0.56rem',letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--ink-soft)'}}>Karten zur Extraktion</span>
          <span style={{fontFamily:'var(--font-mono)',fontSize:'0.58rem',color:'var(--orange)'}}>1 unverarbeitet</span>
        </div>
        {MOCK_KARTEN.map(k => (
          <div key={k.id} style={{border:'1px solid var(--border)',borderRadius:'var(--r-sm)',padding:'9px 11px',marginBottom:'7px',background:'var(--bg-mid)'}}>
            <div style={{display:'flex',alignItems:'center',gap:'7px',marginBottom:'6px',flexWrap:'wrap'}}>
              <span style={{fontFamily:'var(--font-mono)',fontSize:'0.58rem',color:'var(--ink-dim)'}}>{k.time}</span>
              <KartenTypBadge type={k.type} />
              <span style={{fontSize:'0.78rem',color:'var(--ink-mid)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{k.text}</span>
              {k.objekte > 0 && <span style={{fontFamily:'var(--font-mono)',fontSize:'0.55rem',color:'var(--accent)',flexShrink:0}}>{k.objekte} Obj. ✓</span>}
            </div>
            <button className="btn btn-sm">{k.processed ? '↺ Neu extrahieren' : '↓ Extrahieren'}</button>
          </div>
        ))}
      </div>

      {/* Rückstand */}
      <div style={{border:'1px solid var(--border)',borderRadius:'var(--r)',overflow:'hidden'}}>
        <button onClick={() => setRueckOpen(o => !o)} style={{width:'100%',padding:'11px 16px',background:'var(--surface-2)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            <span style={{color:'var(--orange)',fontSize:'1rem'}}>⚠</span>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'0.56rem',letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--orange)'}}>Rückstand</span>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'0.6rem',color:'var(--orange)'}}>7 Karten aus vergangenen Tagen</span>
          </div>
          <span style={{fontFamily:'var(--font-mono)',fontSize:'0.7rem',color:'var(--ink-dim)'}}>{rueckOpen ? '▴' : '▾'}</span>
        </button>
        {rueckOpen && (
          <div style={{padding:'12px 16px'}}>
            {MOCK_RUECKSTAND.map((r, i) => (
              <div key={i} style={{display:'flex',alignItems:'center',gap:'9px',padding:'8px 10px',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',marginBottom:'6px',background:'var(--surface)'}}>
                <span style={{fontFamily:'var(--font-mono)',fontSize:'0.6rem',color:'var(--ink-dim)',minWidth:'78px',flexShrink:0}}>{r.date}</span>
                <KartenTypBadge type={r.type} />
                <span style={{fontSize:'0.8rem',color:'var(--ink-mid)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.text}</span>
                <button className="btn btn-sm">↓ Extrahieren</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Exports ─────────────────────────────────────────────────────────────────
Object.assign(window, {
  MOCK_KARTEN, MOCK_OBJEKTE, MOCK_RUECKSTAND, MOCK_FUTURE_LOG, MOCK_VERLAUF,
  ObjTypTag, KartenTypBadge, StatusPill,
  ScreenSammeln, ScreenObjekte,
});
