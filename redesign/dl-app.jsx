'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────

const THEMES = ['dark','light','eink'];
const THEME_ICONS = { dark:'◐', light:'◑', eink:'▣' };
const THEME_LABELS = { dark:'Dark', light:'Light', eink:'E-Ink' };
const DIRS = ['journal','ledger','console'];
const DIR_LABELS = { journal:'Journal', ledger:'Ledger', console:'Console' };

const NAV_DAILY = [
  { id:'sammeln',    label:'Sammeln',    cnt:3,    icon:'✎' },
  { id:'objekte',    label:'Objekte',    cnt:2,    icon:'◈' },
  { id:'futurelog',  label:'Future Log', cnt:1847, icon:'↗' },
  { id:'verlauf',    label:'Verlauf',    cnt:null, icon:'☰' },
  { id:'abschluss',  label:'Abschluss',  cnt:1,    icon:'✓' },
];
const NAV_WEEKLY = [
  { id:'review',       label:'Review',       cnt:null, icon:'↺' },
  { id:'kollektionen', label:'Kollektionen', cnt:49,   icon:'▣' },
  { id:'kontexte',     label:'Kontexte',     cnt:null, icon:'⬡' },
];
const NAV_TOOLS = [
  { id:'plan',     label:'Plan',          cnt:null, icon:'▤' },
  { id:'zettel',   label:'Zettel',        cnt:1,    icon:'❧' },
  { id:'feed',     label:'Feed',          cnt:null, icon:'⟳' },
  { id:'advanced', label:'Einstellungen', cnt:null, icon:'⚙' },
];
const ALL_NAV = [...NAV_DAILY, ...NAV_WEEKLY, ...NAV_TOOLS];
const SCREEN_MAP = {
  sammeln:'ScreenSammeln', objekte:'ScreenObjekte',
  futurelog:'ScreenFutureLog', verlauf:'ScreenVerlauf',
  abschluss:'ScreenAbschluss', advanced:'ScreenAdvanced',
};

// ─── NavBtn ───────────────────────────────────────────────────────────────────

function NavBtn({ item, active, onClick }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:'flex', alignItems:'center', gap:'8px', padding:'6px 10px',
        width:'100%', borderRadius:'var(--r-sm)', border:'none',
        background: active ? 'var(--surface-3)' : hov ? 'var(--surface-2)' : 'none',
        cursor:'pointer', textAlign:'left', transition:'background .1s',
      }}>
      <span style={{fontFamily:'var(--font-mono)',fontSize:'0.78rem',width:'16px',textAlign:'center',color:active?'var(--accent)':'var(--ink-dim)',flexShrink:0}}>{item.icon}</span>
      <span style={{flex:1,fontFamily:'var(--font-mono)',fontSize:'0.66rem',letterSpacing:'0.02em',color:active?'var(--ink)':'var(--ink-mid)',fontWeight:active?700:400}}>{item.label}</span>
      {item.cnt != null && (
        <span style={{
          fontFamily:'var(--font-mono)', fontSize:'0.54rem',
          padding:'1px 6px', borderRadius:'9px',
          background: item.cnt > 999 ? 'var(--accent)' : 'var(--surface-3)',
          color: item.cnt > 999 ? 'var(--bg)' : 'var(--ink-dim)',
        }}>{item.cnt > 999 ? item.cnt : item.cnt}</span>
      )}
    </button>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ screen, setScreen, theme, setTheme, dir, setDir }) {
  const [toolsOpen, setToolsOpen] = React.useState(false);

  return (
    <div style={{
      width:'218px', flexShrink:0,
      background:'var(--bg-mid)', borderRight:'1px solid var(--border)',
      display:'flex', flexDirection:'column', height:'100%', overflow:'hidden',
    }}>
      {/* Logo + date */}
      <div style={{padding:'18px 14px 13px',borderBottom:'1px solid var(--border)',flexShrink:0}}>
        <div style={{fontFamily:'var(--font-head)',fontWeight:'var(--head-weight)',fontSize:'1.04rem',color:'var(--ink)',marginBottom:'6px',letterSpacing:'-0.01em'}}>Daily Log</div>
        <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
          {['‹','›'].map((a,i) => (
            <button key={a} disabled={i===1} style={{fontFamily:'var(--font-mono)',fontSize:'0.72rem',padding:'1px 6px',border:'1px solid var(--border)',borderRadius:'3px',background:'none',color:'var(--ink-dim)',cursor:i===1?'default':'pointer',opacity:i===1?0.4:1}}>{a}</button>
          ))}
          <span style={{fontFamily:'var(--font-mono)',fontSize:'0.6rem',color:'var(--ink-mid)',letterSpacing:'0.06em'}}>10.06.2026</span>
        </div>
      </div>

      {/* Navigation */}
      <div style={{flex:1,overflowY:'auto',padding:'8px 6px'}}>
        <div style={{fontFamily:'var(--font-mono)',fontSize:'0.53rem',letterSpacing:'0.14em',textTransform:'uppercase',color:'var(--ink-dim)',padding:'6px 10px 3px'}}>Täglich</div>
        {NAV_DAILY.map(item => <NavBtn key={item.id} item={item} active={screen===item.id} onClick={() => setScreen(item.id)} />)}

        <div style={{fontFamily:'var(--font-mono)',fontSize:'0.53rem',letterSpacing:'0.14em',textTransform:'uppercase',color:'var(--ink-dim)',padding:'12px 10px 3px'}}>Woche</div>
        {NAV_WEEKLY.map(item => <NavBtn key={item.id} item={item} active={screen===item.id} onClick={() => setScreen(item.id)} />)}

        <button onClick={() => setToolsOpen(o => !o)} style={{display:'flex',alignItems:'center',gap:'5px',width:'100%',padding:'12px 10px 3px',border:'none',background:'none',cursor:'pointer'}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:'0.53rem',letterSpacing:'0.14em',textTransform:'uppercase',color:'var(--ink-dim)'}}>Werkzeuge</span>
          <span style={{fontFamily:'var(--font-mono)',fontSize:'0.6rem',color:'var(--ink-dim)'}}>{toolsOpen ? '▴' : '▾'}</span>
        </button>
        {toolsOpen && NAV_TOOLS.map(item => <NavBtn key={item.id} item={item} active={screen===item.id} onClick={() => setScreen(item.id)} />)}
      </div>

      {/* Theme + direction controls */}
      <div style={{padding:'10px 12px 14px',borderTop:'1px solid var(--border)',flexShrink:0,display:'flex',flexDirection:'column',gap:'7px'}}>
        <div style={{display:'flex',gap:'4px'}}>
          {THEMES.map(t => (
            <button key={t} onClick={() => setTheme(t)} style={{
              flex:1, padding:'5px 2px',
              fontFamily:'var(--font-mono)', fontSize:'0.5rem', letterSpacing:'0.03em', textTransform:'uppercase',
              borderRadius:'var(--r-sm)',
              border: theme===t ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: theme===t ? 'var(--accent)' : 'transparent',
              color: theme===t ? 'var(--bg)' : 'var(--ink-dim)',
              cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:'1px',
            }}>
              <span style={{fontSize:'0.8rem'}}>{THEME_ICONS[t]}</span>
              <span>{THEME_LABELS[t]}</span>
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:'4px'}}>
          {DIRS.map(d => (
            <button key={d} onClick={() => setDir(d)} style={{
              flex:1, padding:'4px 2px',
              fontFamily:'var(--font-mono)', fontSize:'0.5rem', letterSpacing:'0.03em', textTransform:'uppercase',
              borderRadius:'var(--r-sm)',
              border: dir===d ? '1px solid var(--border-str)' : '1px solid var(--border)',
              background: dir===d ? 'var(--surface-3)' : 'transparent',
              color: dir===d ? 'var(--ink)' : 'var(--ink-dim)',
              cursor:'pointer',
            }}>{DIR_LABELS[d]}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Bottom Bar (Mobile) ──────────────────────────────────────────────────────

function BottomBar({ screen, setScreen }) {
  const items = [
    { id:'sammeln',   icon:'✎', label:'Sammeln' },
    { id:'objekte',   icon:'◈', label:'Objekte' },
    { id:'futurelog', icon:'↗', label:'Future' },
    { id:'verlauf',   icon:'☰', label:'Verlauf' },
    { id:'abschluss', icon:'✓', label:'Abschluss' },
  ];
  return (
    <div style={{
      position:'absolute', bottom:0, left:0, right:0,
      background:'var(--surface)', borderTop:'1px solid var(--border)',
      display:'flex', zIndex:100,
    }}>
      {items.map(item => {
        const active = screen === item.id;
        return (
          <button key={item.id} onClick={() => setScreen(item.id)} style={{
            flex:1, padding:'9px 4px 7px',
            display:'flex', flexDirection:'column', alignItems:'center', gap:'2px',
            border:'none', background:'none', cursor:'pointer',
          }}>
            <span style={{fontSize:'1rem',color:active?'var(--accent)':'var(--ink-dim)',transition:'color .1s'}}>{item.icon}</span>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'0.49rem',letterSpacing:'0.03em',color:active?'var(--accent)':'var(--ink-dim)'}}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Placeholder Screen ───────────────────────────────────────────────────────

function PlaceholderScreen({ screen }) {
  const item = ALL_NAV.find(n => n.id === screen) || { icon:'·', label:screen };
  return (
    <div style={{padding:'60px 20px',textAlign:'center'}}>
      <div style={{fontFamily:'var(--font-mono)',fontSize:'2.5rem',color:'var(--border-mid)',marginBottom:'16px'}}>{item.icon}</div>
      <div style={{fontFamily:'var(--font-head)',fontSize:'1.1rem',color:'var(--ink-mid)',marginBottom:'8px'}}>{item.label}</div>
      <div style={{fontFamily:'var(--font-mono)',fontSize:'0.68rem',color:'var(--ink-dim)'}}>Prototyp · in diesem Sprint noch nicht voll ausgebaut</div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  const [screen, setScreen] = React.useState('sammeln');
  const [theme,  setTheme]  = React.useState('dark');
  const [dir,    setDir]    = React.useState('journal');
  const [device, setDevice] = React.useState('desktop');

  React.useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  React.useEffect(() => { document.documentElement.setAttribute('data-dir',   dir);   }, [dir]);

  const ScreenComp = SCREEN_MAP[screen] ? window[SCREEN_MAP[screen]] : null;
  const isDesktop = device === 'desktop';

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden',background:'var(--bg)'}}>

      {/* ── Top meta bar ── */}
      <div style={{
        background:'var(--bg-mid)', borderBottom:'1px solid var(--border)',
        padding:'5px 16px', display:'flex', alignItems:'center', gap:'10px',
        flexShrink:0, zIndex:200,
      }}>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'0.55rem',letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--ink-dim)'}}>Prototyp</span>
        <span style={{color:'var(--border)'}}>·</span>
        {['desktop','mobile'].map(d => (
          <button key={d} onClick={() => setDevice(d)} style={{
            fontFamily:'var(--font-mono)', fontSize:'0.57rem', letterSpacing:'0.04em', textTransform:'uppercase',
            padding:'3px 9px', borderRadius:'var(--r-sm)',
            border: device===d ? '1px solid var(--accent)' : '1px solid var(--border)',
            background: device===d ? 'var(--accent-bg)' : 'transparent',
            color: device===d ? 'var(--accent)' : 'var(--ink-dim)',
            cursor:'pointer',
          }}>{d === 'desktop' ? '⬚ Desktop' : '▭ Mobile'}</button>
        ))}
        {!isDesktop && (
          <>
            <span style={{color:'var(--border)',marginLeft:'2px'}}>·</span>
            {DIRS.map(d => (
              <button key={d} onClick={() => setDir(d)} style={{
                fontFamily:'var(--font-mono)', fontSize:'0.54rem', letterSpacing:'0.03em', textTransform:'uppercase',
                padding:'3px 7px', borderRadius:'var(--r-sm)',
                border: dir===d ? '1px solid var(--border-str)' : '1px solid var(--border)',
                background: dir===d ? 'var(--surface-3)' : 'transparent',
                color: dir===d ? 'var(--ink)' : 'var(--ink-dim)',
                cursor:'pointer',
              }}>{DIR_LABELS[d]}</button>
            ))}
          </>
        )}
        <span style={{marginLeft:'auto',fontFamily:'var(--font-mono)',fontSize:'0.54rem',color:'var(--ink-dim)',letterSpacing:'0.04em'}}>
          DailyLog Redesign · Hi-Fi Prototyp
        </span>
      </div>

      {/* ── Desktop layout ── */}
      {isDesktop && (
        <div style={{display:'flex',flex:1,overflow:'hidden'}}>
          <Sidebar screen={screen} setScreen={setScreen} theme={theme} setTheme={setTheme} dir={dir} setDir={setDir} />
          <div style={{flex:1,overflowY:'auto',padding:'32px 44px 60px'}}>
            {ScreenComp ? <ScreenComp device="desktop" /> : <PlaceholderScreen screen={screen} />}
          </div>
        </div>
      )}

      {/* ── Mobile layout ── */}
      {!isDesktop && (
        <div style={{flex:1,overflow:'hidden',display:'flex',justifyContent:'center',background:'var(--bg)'}}>
          <div style={{
            width:'100%', maxWidth:'400px',
            display:'flex', flexDirection:'column',
            height:'100%', position:'relative',
            background:'var(--bg)', borderLeft:'1px solid var(--border)', borderRight:'1px solid var(--border)',
          }}>
            {/* Mobile header */}
            <div style={{
              flexShrink:0,
              background:'var(--bg-mid)', borderBottom:'1px solid var(--border)',
              padding:'9px 14px', display:'flex', alignItems:'center', justifyContent:'space-between',
            }}>
              <div>
                <div style={{fontFamily:'var(--font-head)',fontWeight:'var(--head-weight)',fontSize:'0.92rem',color:'var(--ink)'}}>Daily Log</div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'0.56rem',color:'var(--ink-dim)',letterSpacing:'0.06em'}}>10.06.2026</div>
              </div>
              <div style={{display:'flex',gap:'4px'}}>
                {THEMES.map(t => (
                  <button key={t} onClick={() => setTheme(t)} style={{
                    fontFamily:'var(--font-mono)',fontSize:'0.68rem',
                    padding:'4px 7px',borderRadius:'var(--r-sm)',
                    border: theme===t ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: theme===t ? 'var(--accent)' : 'transparent',
                    color: theme===t ? 'var(--bg)' : 'var(--ink-dim)',
                    cursor:'pointer',
                  }}>{THEME_ICONS[t]}</button>
                ))}
              </div>
            </div>
            {/* Scrollable content */}
            <div style={{flex:1,overflowY:'auto',padding:'14px 14px 68px'}}>
              {ScreenComp ? <ScreenComp device="mobile" /> : <PlaceholderScreen screen={screen} />}
            </div>
            <BottomBar screen={screen} setScreen={setScreen} />
          </div>
        </div>
      )}

    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
