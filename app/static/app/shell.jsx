// QSR Command Center — shell: icons, primitives, context, sidebar, topbar.
// Attaches to window for cross-script use.
const { useState, useEffect, useRef, useContext, createContext } = React;

/* ============================ Icons ============================ */
const PATHS = {
  today:'M3 10.5 12 3l9 7.5M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9',
  sales:'M3 3v18h18M7 14l3-3 3 3 5-6',
  labor:'M16 18v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 8.5a3 3 0 1 0 0-.01M18 7v5M21 9.5h-6',
  inventory:'M3 7 12 3l9 4-9 4-9-4ZM3 7v8l9 4 9-4V7M12 11v8',
  equipment:'M14.5 6.5a3.5 3.5 0 0 0-4.6 4.6l-6 6a2 2 0 1 0 2.8 2.8l6-6a3.5 3.5 0 0 0 4.6-4.6l-2.2 2.2-2-2 2.2-2.2Z',
  members:'M19 14c1.5-1.5 2-3 2-5a5 5 0 0 0-9-3 5 5 0 0 0-9 3c0 2 .5 3.5 2 5l7 7 7-7Z',
  feedback:'M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12Z',
  reports:'M3 3v18h18M8 17V9M13 17V5M18 17v-6',
  settings:'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM19.4 13a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 13H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.7 7L4.6 7a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.7V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.2A1.7 1.7 0 0 0 21 11.9h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1.1Z',
  spark:'M12 3l1.8 5.6L19 10l-5.2 1.4L12 17l-1.8-5.6L5 10l5.2-1.4L12 3Z',
  bell:'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9ZM10 21a2 2 0 0 0 4 0',
  search:'M21 21l-4.5-4.5M3 11a8 8 0 1 0 16 0 8 8 0 0 0-16 0Z',
  arrow:'M5 12h14M13 6l6 6-6 6',
  chev:'M9 6l6 6-6 6',
  chevd:'M6 9l6 6 6-6',
  chevl:'M15 6l-6 6 6 6',
  check:'M5 13l4 4 10-10',
  clock:'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
  alert:'M12 9v4M12 17h.01M10.3 4 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0Z',
  truck:'M3 6h11v9H3zM14 9h4l3 3v3h-7M6.5 18.5a1.5 1.5 0 1 0 0-.01M17.5 18.5a1.5 1.5 0 1 0 0-.01',
  star:'M12 3l2.7 6.2 6.7.6-5 4.5 1.5 6.6L12 17.9 6.1 21.4l1.5-6.6-5-4.5 6.7-.6Z',
  thermo:'M14 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0Z',
  arrowup:'M12 19V5M6 11l6-6 6 6',
  arrowdn:'M12 5v14M6 13l6 6 6-6',
  x:'M6 6l12 12M18 6 6 18',
  send:'M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z',
  edit:'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z',
  calendar:'M3 9h18M7 3v4M17 3v4M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  dollar:'M12 2v20M17 6.5C17 4.6 14.8 3 12 3S7 4.6 7 6.5 9.2 10 12 10s5 1.6 5 3.5S14.8 17 12 17s-5-1.6-5-3.5',
  filter:'M3 5h18l-7 8v6l-4-2v-4L3 5Z',
  dots:'M5 12h.01M12 12h.01M19 12h.01',
  reply:'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 5 5v6',
  plus:'M12 5v14M5 12h14',
  minus:'M5 12h14',
  flame:'M12 3c3 4 6 6 6 10a6 6 0 0 1-12 0c0-1.6.6-2.8 1.5-4 .4 1 1 1.7 2 2-.3-3 1-5.4 2.5-8Z',
  box:'M3 7 12 3l9 4-9 4-9-4ZM3 7v8l9 4 9-4V7',
  snow:'M12 2v20M4 7l16 10M20 7 4 17M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3',
  user:'M16 18v-1a4 4 0 0 0-4-4 4 4 0 0 0-4 4v1M12 11a3.5 3.5 0 1 0 0-.01',
  phone:'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z',
  mail:'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM3.5 6.5 12 12l8.5-5.5',
  gift:'M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8M2 7h20v5H2zM12 22V7M12 7H8a2 2 0 1 1 0-4c3 0 4 4 4 4ZM12 7h4a2 2 0 1 0 0-4c-3 0-4 4-4 4Z',
  wrench:'M14.5 6.5a3.5 3.5 0 0 0-4.6 4.6l-6 6a2 2 0 1 0 2.8 2.8l6-6a3.5 3.5 0 0 0 4.6-4.6l-2.2 2.2-2-2 2.2-2.2Z',
  pin:'M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11ZM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  refresh:'M21 12a9 9 0 1 1-3-6.7M21 4v5h-5',
  sunrise:'M3 18h18M5 18a7 7 0 0 1 14 0M12 2v4M5 9l2 2M19 9l-2 2M2 14h2M20 14h2',
  sun:'M12 2v3M12 19v3M5 12H2M22 12h-3M5.6 5.6L4 4M20 20l-1.6-1.6M5.6 18.4L4 20M20 4l-1.6 1.6M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z',
  sunset:'M3 18h18M5 18a7 7 0 0 1 14 0M12 14V2M8 6l4-4 4 4M2 22h20',
  moon:'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  cash:'M2 7h20v10H2zM12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 9v6M18 9v6',
  history:'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2',
  info:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8h.01M11 12h1v4h1',
  doc:'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5ZM14 3v5h5M9 13h6M9 17h6',
  eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  plane:'M17.8 19.2 16 11l3.5-3.5a2.1 2.1 0 0 0-3-3L13 8 4.8 6.2a1 1 0 0 0-.9 1.7l5.1 3.4-2.5 2.5-2-.5a.8.8 0 0 0-.8 1.3l2 2 2 2a.8.8 0 0 0 1.3-.8l-.5-2 2.5-2.5 3.4 5.1a1 1 0 0 0 1.7-.9Z',
  grid:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
};
const Icon = ({ name, size = 18, color = 'currentColor', stroke = 1.6, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
       strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
    <path d={PATHS[name] || PATHS.today} />
  </svg>
);

/* ============================ Sparkline ============================ */
const Spark = ({ pts, w = 96, h = 30, color = 'var(--db-lava-600)', fill = true, sw = 2 }) => {
  const max = Math.max(...pts), min = Math.min(...pts), rng = max - min || 1;
  const step = w / (pts.length - 1);
  const xy = pts.map((p, i) => [i * step, h - ((p - min) / rng) * (h - 4) - 2]);
  const line = xy.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      {fill && <path d={`${line} L${w} ${h} L0 ${h} Z`} fill={color} opacity="0.1" />}
      <path d={line} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xy[xy.length - 1][0]} cy={xy[xy.length - 1][1]} r="2.6" fill={color} />
    </svg>
  );
};

/* ============================ Context ============================ */
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

/* ============================ Primitives ============================ */
const LEVEL = {
  danger:{ fg:'var(--db-lava-700)', bg:'var(--db-lava-300)', dot:'var(--db-lava-600)' },
  warn:  { fg:'var(--db-yellow-800)', bg:'var(--db-yellow-300)', dot:'var(--db-yellow-600)' },
  info:  { fg:'var(--db-blue-700)', bg:'var(--db-blue-300)', dot:'var(--db-blue-600)' },
  ok:    { fg:'var(--db-green-800)', bg:'var(--db-green-300)', dot:'var(--db-green-600)' },
  neutral:{ fg:'var(--db-navy-700)', bg:'var(--db-oat-medium)', dot:'var(--db-navy-400)' },
};

const Btn = ({ variant = 'primary', children, icon, iconRight, size = 'md', full, onClick, disabled, style }) => {
  const pad = size === 'sm' ? '7px 12px' : size === 'lg' ? '12px 20px' : '9px 15px';
  const fs = size === 'sm' ? 12.5 : size === 'lg' ? 15 : 13.5;
  const base = { border:0, padding:pad, borderRadius:8, font:`500 ${fs}px/1 var(--font-sans)`, cursor: disabled?'default':'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7, transition:'all var(--dur-base) var(--ease-out)', width: full?'100%':'auto', opacity: disabled?0.45:1, whiteSpace:'nowrap' };
  const variants = {
    primary:{ background:'var(--db-lava-600)', color:'#fff' },
    dark:{ background:'var(--db-navy-800)', color:'#fff' },
    ghost:{ background:'#fff', color:'var(--db-navy-800)', border:'1px solid var(--db-gray-lines)' },
    subtle:{ background:'var(--db-oat-medium)', color:'var(--db-navy-800)' },
    quiet:{ background:'transparent', color:'var(--db-gray-text)' },
  };
  return (
    <button className={`hb-btn hb-btn-${variant}`} onClick={disabled?undefined:onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>
      {icon && <Icon name={icon} size={fs+1} color="currentColor" />}
      {children}
      {iconRight && <Icon name={iconRight} size={fs+1} color="currentColor" />}
    </button>
  );
};

const Pill = ({ level = 'neutral', children, dot, style }) => {
  const l = LEVEL[level];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:11.5, fontWeight:500, padding:'3px 10px', borderRadius:999, color:l.fg, background:l.bg, ...style }}>
      {dot && <span style={{ width:6, height:6, borderRadius:999, background:l.dot }} />}
      {children}
    </span>
  );
};

const Card = ({ children, pad = 0, style, hover, onClick }) => (
  <div className={hover ? 'hb-card hb-card-hover' : 'hb-card'} onClick={onClick}
       style={{ background:'#fff', border:'1px solid var(--db-gray-lines)', borderRadius:12, padding:pad, ...style }}>
    {children}
  </div>
);

const Delta = ({ up, children, size = 12 }) => (
  <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:size, fontWeight:500, color: up?'var(--db-green-700)':'var(--db-lava-700)' }}>
    <Icon name={up?'arrowup':'arrowdn'} size={size} stroke={2} /> {children}
  </span>
);

const Eyebrow = ({ children, color = 'var(--db-gray-text)', style }) => (
  <div style={{ fontSize:11.5, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.08em', color, ...style }}>{children}</div>
);

const PageHead = ({ icon, title, sub, children }) => (
  <div style={{ display:'flex', alignItems:'flex-start', gap:16, marginBottom:22 }}>
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        {icon && <Icon name={icon} size={22} color="var(--db-navy-800)" />}
        <h1 style={{ fontSize:26, fontWeight:500, color:'var(--db-navy-800)', letterSpacing:'-0.02em', margin:0 }}>{title}</h1>
      </div>
      {sub && <p style={{ fontSize:14, color:'var(--db-gray-text)', margin:'8px 0 0', maxWidth:640 }}>{sub}</p>}
    </div>
    {children && <div style={{ display:'flex', gap:10, flexShrink:0 }}>{children}</div>}
  </div>
);

/* Inline AI recommendation block — recurring across modules */
const AIRec = ({ children, action, onAction, tone = 'navy' }) => (
  <div style={{
    display:'flex', alignItems:'flex-start', gap:13, padding:'14px 16px', borderRadius:12,
    background: tone==='navy' ? 'var(--db-navy-800)' : 'var(--db-oat-medium)',
    border: tone==='navy' ? 0 : '1px solid var(--db-gray-lines)',
  }}>
    <div style={{ width:28, height:28, borderRadius:7, background:'var(--db-lava-600)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
      <Icon name="spark" size={16} color="#fff" />
    </div>
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color: tone==='navy'?'var(--db-lava-400)':'var(--db-lava-700)', marginBottom:4 }}>Genie</div>
      <div style={{ fontSize:13.5, lineHeight:1.5, color: tone==='navy'?'#fff':'var(--db-navy-800)' }}>{children}</div>
    </div>
    {action && <Btn size="sm" variant={tone==='navy'?'primary':'dark'} onClick={onAction} style={{ flexShrink:0 }}>{action}</Btn>}
  </div>
);

/* Lakebase write-back attribution tag — shown wherever an action persists data */
const LakebaseTag = ({ table, tone = 'light' }) => (
  <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:10.5, fontFamily:'var(--font-mono)', color: tone==='dark'?'var(--db-navy-400)':'var(--db-gray-text)' }}>
    <Icon name="inventory" size={12} color="currentColor" /> written to lakebase.{table}
  </span>
);

/* ============================ Logo ============================ */
const Logo = ({ size = 28 }) => (
  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
    <img src="assets/little-caesars-logo.svg" alt="Little Caesars" style={{ height:size, width:'auto', display:'block', flexShrink:0 }} />
    <span style={{ fontSize:16, fontWeight:700, color:'#fff', letterSpacing:'-0.01em' }}>Command Center</span>
  </div>
);

/* ============================ Sidebar ============================ */
const NAV = [
  { id:'today', label:'Today', icon:'today' },
  { id:'labor', label:'Labor', icon:'labor' },
  { id:'inventory', label:'Inventory', icon:'inventory' },
  { id:'feedback', label:'Guest Sentiment', icon:'feedback' },
];

const Sidebar = () => {
  const { view, go, outstanding, store } = useApp();
  return (
    <aside style={{ width:236, background:'var(--db-navy-900)', display:'flex', flexDirection:'column', flexShrink:0, height:'100%' }}>
      <div style={{ padding:'18px 18px 14px', borderBottom:'1px solid var(--db-navy-700)' }}><Logo /></div>
      <div style={{ padding:'12px 14px 8px' }}>
        <button className="hb-search" style={{ width:'100%', background:'var(--db-navy-700)', border:0, borderRadius:8, padding:'8px 11px', display:'flex', alignItems:'center', gap:9, cursor:'pointer' }}>
          <Icon name="search" size={15} color="var(--db-navy-400)" />
          <span style={{ fontSize:12.5, color:'var(--db-navy-400)' }}>Search store…</span>
          <span style={{ marginLeft:'auto', fontSize:10.5, color:'var(--db-navy-500)', fontFamily:'var(--font-mono)' }}>⌘K</span>
        </button>
      </div>
      <nav style={{ padding:'4px 12px', flex:1, display:'flex', flexDirection:'column', gap:2, overflow:'auto' }}>
        {NAV.map(it => {
          const on = view === it.id;
          const ct = outstanding[it.id];
          return (
            <button key={it.id} onClick={() => go(it.id)} className="hb-nav" style={{
              display:'flex', alignItems:'center', gap:11, padding:'8px 11px', borderRadius:7, border:0, textAlign:'left', cursor:'pointer',
              background: on?'var(--db-navy-700)':'transparent', color: on?'#fff':'var(--db-navy-300)', fontSize:13.5, fontWeight: on?500:400, fontFamily:'var(--font-sans)', position:'relative',
            }}>
              {on && <span style={{ position:'absolute', left:-12, top:8, bottom:8, width:3, borderRadius:3, background:'var(--db-lava-600)' }} />}
              <Icon name={it.icon} size={17} color={on?'var(--db-lava-500)':'var(--db-navy-400)'} />
              {it.label}
              {ct > 0 && <span style={{ marginLeft:'auto', fontSize:10.5, fontWeight:600, minWidth:18, height:18, padding:'0 5px', borderRadius:999, background: on?'var(--db-lava-600)':'var(--db-navy-700)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>{ct>99?'99+':ct}</span>}
            </button>
          );
        })}
      </nav>
      <div style={{ padding:'10px 14px', borderTop:'1px solid var(--db-navy-700)', display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, opacity:0.7 }}>
          <img src="assets/databricks-symbol-color.svg" style={{ height:15 }} alt="" />
          <span style={{ fontSize:10.5, color:'var(--db-navy-400)' }}>Powered by Databricks</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:999, background:'var(--db-lava-600)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff' }}>MO</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12.5, fontWeight:500, color:'#fff' }}>Maya Okonkwo</div>
            <div style={{ fontSize:10.5, color:'var(--db-navy-400)' }}>Store manager</div>
          </div>
          <Icon name="settings" size={15} color="var(--db-navy-400)" />
        </div>
      </div>
    </aside>
  );
};

/* ============================ TopBar ============================ */
const TopBar = () => {
  const { store, openGenie } = useApp();
  return (
    <header style={{ height:56, padding:'0 28px', background:'#fff', borderBottom:'1px solid var(--db-gray-lines)', display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:9, fontSize:13.5 }}>
        <span style={{ fontWeight:500, color:'var(--db-navy-800)' }}>{store.num} · {store.hoodShort}</span>
        <Icon name="chevd" size={14} color="var(--db-navy-400)" />
      </div>
      <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:16 }}>
        <span style={{ fontSize:12.5, color:'var(--db-gray-text)', fontFamily:'var(--font-mono)' }}>{store.date} · {store.clock}</span>
        <Btn size="sm" variant="primary" icon="spark" onClick={openGenie} style={{ borderRadius:999 }}>Ask Genie</Btn>
        <button className="hb-iconbtn" style={{ position:'relative', background:'transparent', border:0, cursor:'pointer', display:'flex', padding:4 }}>
          <Icon name="bell" size={19} color="var(--db-gray-text)" />
          <span style={{ position:'absolute', top:1, right:1, width:7, height:7, borderRadius:999, background:'var(--db-lava-600)', border:'1.5px solid #fff' }} />
        </button>
      </div>
    </header>
  );
};

/* ============================ Toasts ============================ */
const ToastRegion = ({ toasts }) => (
  <div style={{ position:'fixed', bottom:24, right:24, display:'flex', flexDirection:'column', gap:10, zIndex:200 }}>
    {toasts.map(t => (
      <div key={t.id} className="hb-toast" style={{ display:'flex', alignItems:'center', gap:11, background:'var(--db-navy-800)', color:'#fff', padding:'12px 16px', borderRadius:10, boxShadow:'var(--shadow-lg)', minWidth:280, maxWidth:380 }}>
        <span style={{ width:22, height:22, borderRadius:999, background: t.tone==='ok'?'var(--db-green-600)':'var(--db-lava-600)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon name={t.tone==='ok'?'check':'spark'} size={13} color="#fff" stroke={2.4} />
        </span>
        <span style={{ fontSize:13.5, lineHeight:1.4 }}>{t.msg}</span>
      </div>
    ))}
  </div>
);

Object.assign(window, { useState, useEffect, useRef, AppCtx, useApp, Icon, Spark, LEVEL, Btn, Pill, Card, Delta, Eyebrow, PageHead, AIRec, LakebaseTag, Logo, NAV, Sidebar, TopBar, ToastRegion });
