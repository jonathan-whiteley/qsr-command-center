// QSR Command Center — Today (Genie-first home).

const ACTION_LABELS = {
  labor:     o => o ? `Approve ${o} timecard${o>1?'s':''}` : null,
  inventory: o => o ? `Release ${o} reorder${o>1?'s':''}` : null,
  feedback:  o => o ? `Reply to ${o} review${o>1?'s':''}` : null,
};
const CHIP_ORDER = ['inventory','labor','feedback'];

const moneyShort = (n) => {
  if (n == null) return '—';
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'k';
  return '$' + Math.round(n);
};
const countShort = (n) => {
  if (n == null) return '—';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(Math.round(n));
};

const HomeView = () => {
  const { go, openGenie, askGenie, outstanding, store, t } = useApp();
  const brief = t.aiBrief || 'spotlight';
  const proseSize = brief === 'minimal' ? 15.5 : brief === 'compact' ? 18.5 : 22.5;
  const heroPad = brief === 'minimal' ? '22px 28px' : '30px 34px';
  const chips = CHIP_ORDER.map(id => ({ id, label: ACTION_LABELS[id](outstanding[id]) })).filter(c => c.label);
  const totalOpen = chips.length;
  const modCount = m => outstanding[m.id];
  const MOD_TONE = {
    labor:     { bg:'var(--db-blue-300)',   fg:'var(--db-blue-700)',   dot:'var(--db-blue-600)' },
    inventory: { bg:'var(--db-lava-300)',   fg:'var(--db-lava-700)',   dot:'var(--db-lava-600)' },
    feedback:  { bg:'var(--db-maroon-300)', fg:'var(--db-maroon-700)', dot:'var(--db-maroon-600)' },
  };
  const MODS = [
    { id:'labor', icon:'labor', name:'Labor', level:MOD_TONE.labor,
      sig: outstanding.labor ? `${outstanding.labor} timecards flagged for review` : 'All timecards approved',
      cta: outstanding.labor ? `Approve ${outstanding.labor} timecard${outstanding.labor>1?'s':''}` : 'Open labor planner' },
    { id:'inventory', icon:'inventory', name:'Inventory', level:MOD_TONE.inventory,
      sig: outstanding.inventory ? `${outstanding.inventory} purchase orders ready to release` : 'Nothing to release',
      cta: outstanding.inventory ? `Release ${outstanding.inventory} reorder${outstanding.inventory>1?'s':''}` : 'Browse inventory' },
    { id:'feedback', icon:'feedback', name:'Guest Sentiment', level:MOD_TONE.feedback,
      sig: outstanding.feedback ? `${outstanding.feedback} reviews need a reply` : 'All reviews answered',
      cta: outstanding.feedback ? `Reply to ${outstanding.feedback} review${outstanding.feedback>1?'s':''}` : 'View all reviews' },
  ];

  // Live KPIs from /api/today/kpis when the App is wired; falls back to mock data
  // in data.jsx for the standalone prototype.
  const [live, setLive] = useState(null);
  useEffect(() => {
    fetch('/api/today/kpis', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(setLive)
      .catch(() => setLive(null));
  }, []);

  const fmtDelta = (pct) => pct == null ? null : `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
  const kpiList = live ? [
    { label:'Sales yesterday', v: moneyShort(live.sales_yesterday.value), d: fmtDelta(live.sales_yesterday.delta_pct), up: (live.sales_yesterday.delta_pct || 0) >= 0, spark: live.sales_yesterday.spark, c:'var(--db-lava-600)' },
    { label:'Forecast today', v: moneyShort(live.forecast_today.value), sub: live.forecast_today.sub, spark: live.sales_yesterday.spark, c:'var(--db-blue-600)' },
    { label:'Labor % of sales', v: (live.labor_pct.value || 0).toFixed(1) + '%', spark: live.sales_yesterday.spark, c:'var(--db-green-600)' },
    { label:'Guest score', v: (live.guest_score.value || 0).toFixed(1) + '★', sub: live.guest_score.sub, spark: live.sales_yesterday.spark, c:'var(--db-yellow-600)' },
    { label:'Guests', v: countShort(live.guests.value), d: fmtDelta(live.guests.delta_pct), up: (live.guests.delta_pct || 0) >= 0, spark: live.sales_yesterday.spark, c:'var(--db-navy-600)' },
  ] : [
    { ...KPIS.sales, c:'var(--db-lava-600)' },
    { ...KPIS.forecast, c:'var(--db-blue-600)' },
    { ...KPIS.labor, c:'var(--db-green-600)' },
    { ...KPIS.guest, c:'var(--db-yellow-600)' },
    { ...KPIS.traffic, c:'var(--db-navy-600)' },
  ];

  return (
    <div style={{ flex:1, overflow:'auto', background:'var(--db-oat-light)' }}>
      <div style={{ padding:'28px 32px 40px', maxWidth:1120, margin:'0 auto' }}>
        {/* ===== performance KPIs ===== */}
        <div style={{ display:'flex', alignItems:'center', marginBottom:13 }}>
          <h2 style={{ fontSize:13, fontWeight:600, color:'var(--db-gray-text)', margin:0, textTransform:'uppercase', letterSpacing:'0.07em' }}>Today's performance</h2>
          <span style={{ marginLeft:'auto', fontSize:12, color:'var(--db-navy-400)', fontFamily:'var(--font-mono)' }}>vs. last Friday</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:22 }}>
          {kpiList.map(k => (
            <Card key={k.label} pad="14px 16px">
              <div style={{ fontSize:11, color:'var(--db-gray-text)', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.05em' }}>{k.label}</div>
              <div style={{ fontSize:25, fontWeight:600, color:'var(--db-navy-800)', letterSpacing:'-0.02em', margin:'5px 0 4px' }}>{k.v}</div>
              <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:6 }}>
                {k.d ? <Delta up={k.up} size={11.5}>{k.d}</Delta> : <span style={{ fontSize:11.5, color:'var(--db-gray-text)' }}>{k.sub}</span>}
                <Spark pts={k.spark} color={k.c} w={62} h={24} />
              </div>
            </Card>
          ))}
        </div>

        {/* ===== AI hero ===== */}
        <div style={{ background:'var(--db-navy-900)', borderRadius:18, padding:heroPad, position:'relative', overflow:'hidden' }}>
          <svg viewBox="0 0 24 24" width="340" height="340" fill="none" stroke="var(--db-navy-700)" strokeWidth="0.45" style={{ position:'absolute', right:-50, top:-70, opacity:0.55 }}>
            <path d={PATHS.spark} />
          </svg>
          <div style={{ display:'flex', alignItems:'center', gap:10, position:'relative' }}>
            <div style={{ width:30, height:30, borderRadius:8, background:'var(--db-lava-600)', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="spark" size={17} color="#fff" /></div>
            <span style={{ fontSize:12.5, fontWeight:500, color:'var(--db-lava-400)', letterSpacing:'0.05em', textTransform:'uppercase' }}>Genie · your daily brief</span>
            <span style={{ marginLeft:'auto', fontSize:12, color:'var(--db-navy-400)', fontFamily:'var(--font-mono)' }}>{store.date}</span>
          </div>
          {totalOpen > 0 ? (
            <p style={{ fontSize:proseSize, lineHeight:1.5, color:'#fff', fontWeight:400, margin:'16px 0 0', maxWidth:760, letterSpacing:'-0.01em', position:'relative' }}>
              {brief === 'minimal' ? (
                <React.Fragment>Morning, {store.manager}. Forecast <strong style={{ fontWeight:600 }}>{live ? moneyShort(live.forecast_today.value) : '$16,400'}</strong> today · <strong style={{ fontWeight:600 }}>{totalOpen}</strong> {totalOpen===1?'thing needs':'things need'} you — starting with the <span style={{ color:'var(--db-lava-400)', fontWeight:600 }}>pepperoni reorder</span>.</React.Fragment>
              ) : brief === 'compact' ? (
                <React.Fragment>Morning, {store.manager}. Yesterday <strong style={{ fontWeight:600 }}>{live ? moneyShort(live.sales_yesterday.value) : '$14,820'}</strong>{live && live.sales_yesterday.delta_pct != null ? <> (<span style={{ color: live.sales_yesterday.delta_pct >= 0 ? 'var(--db-green-400)' : 'var(--db-lava-400)', fontWeight:600 }}>{live.sales_yesterday.delta_pct >= 0 ? '+' : ''}{live.sales_yesterday.delta_pct.toFixed(1)}%</span>)</> : ' (+6.2%)'}, forecast <strong style={{ fontWeight:600 }}>{live ? moneyShort(live.forecast_today.value) : '$16,400'}</strong>. First up: <span style={{ color:'var(--db-lava-400)', fontWeight:600 }}>release the pepperoni reorder</span> before lunch. {totalOpen} things waiting below.</React.Fragment>
              ) : (
                <React.Fragment>Morning, {store.manager}. Yesterday closed at <strong style={{ fontWeight:600 }}>{live ? moneyShort(live.sales_yesterday.value) : '$14,820'}</strong>{live && live.sales_yesterday.delta_pct != null ? <>, <span style={{ color: live.sales_yesterday.delta_pct >= 0 ? 'var(--db-green-400)' : 'var(--db-lava-400)', fontWeight:600 }}>{live.sales_yesterday.delta_pct >= 0 ? '+' : ''}{live.sales_yesterday.delta_pct.toFixed(1)}%</span></> : <>, up <span style={{ color:'var(--db-green-400)', fontWeight:600 }}>6.2%</span></>}. Today's forecast is <strong style={{ fontWeight:600 }}>{live ? moneyShort(live.forecast_today.value) : '$16,400'}</strong>. First thing to handle: you're low on <span style={{ fontWeight:600 }}>pepperoni</span> and <span style={{ fontWeight:600 }}>mozzarella</span> — <span style={{ color:'var(--db-lava-400)', fontWeight:600 }}>release the staged reorder</span> before the lunch rush so you don't 86 the Classic. You've got <strong style={{ fontWeight:600 }}>{totalOpen}</strong> {totalOpen===1?'thing':'things'} waiting below.</React.Fragment>
              )}
            </p>
          ) : (
            <p style={{ fontSize:proseSize, lineHeight:1.5, color:'#fff', fontWeight:400, margin:'16px 0 0', maxWidth:760, letterSpacing:'-0.01em', position:'relative' }}>
              Nice work, {store.manager} — <span style={{ color:'var(--db-green-400)', fontWeight:600 }}>you're all caught up</span>. Timecards are approved, reorders are out and guests have heard back. Forecast still says <strong style={{ fontWeight:600 }}>$16,400</strong> today. Go run the floor.
            </p>
          )}
          {/* action chips */}
          {totalOpen > 0 && (
            <div style={{ display:'flex', gap:10, marginTop:24, flexWrap:'wrap', position:'relative' }}>
              {chips.map((c, i) => (
                <button key={c.id} onClick={() => go(c.id)} className="hb-chip-action" style={{ background:'rgba(255,255,255,0.08)', color:'#fff', border:'1px solid var(--db-navy-700)', padding:'9px 15px', borderRadius:999, font:'500 13px/1 var(--font-sans)', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8 }}>
                  {c.id==='inventory' && <span style={{ width:6, height:6, borderRadius:999, background:'var(--db-lava-500)' }} />}
                  {c.label}
                  <Icon name="arrow" size={13} color="var(--db-navy-300)" />
                </button>
              ))}
            </div>
          )}
          {/* ask bar */}
          <div onClick={openGenie} style={{ marginTop:22, background:'var(--db-navy-800)', border:'1px solid var(--db-navy-700)', borderRadius:12, padding:'6px 6px 6px 16px', display:'flex', alignItems:'center', gap:10, position:'relative', maxWidth:760, cursor:'pointer' }}>
            <Icon name="spark" size={16} color="var(--db-navy-400)" />
            <span style={{ flex:1, fontSize:14, color:'var(--db-navy-400)' }}>Ask anything about your store…</span>
            <Btn variant="primary" size="sm" style={{ padding:'8px 11px' }}><Icon name="arrow" size={15} color="#fff" /></Btn>
          </div>
        </div>

        {/* ===== modules ===== */}
        <div style={{ display:'flex', alignItems:'center', marginTop:30, marginBottom:14 }}>
          <h2 style={{ fontSize:16, fontWeight:500, color:'var(--db-navy-800)', margin:0 }}>Jump into a module</h2>
          <span style={{ marginLeft:'auto', fontSize:12.5, color:'var(--db-gray-text)' }}>{totalOpen > 0 ? `${totalOpen} ${totalOpen===1?'area needs':'areas need'} attention` : 'Everything handled'}</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
          {MODS.map(m => {
            const ct = modCount(m);
            const done = !ct;
            const lv = done ? LEVEL.ok : m.level;
            return (
              <Card key={m.id} hover pad={0} onClick={() => go(m.id)} style={{ cursor:'pointer', display:'flex', flexDirection:'column', overflow:'hidden' }}>
                {/* accent rail */}
                <div style={{ height:4, background: done ? 'var(--db-green-500)' : lv.dot }} />
                <div style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:16, flex:1 }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                    <div style={{ width:48, height:48, borderRadius:12, background:lv.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Icon name={m.icon} size={24} color={lv.fg} />
                    </div>
                    {done
                      ? <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11.5, fontWeight:600, color:'var(--db-green-700)' }}><Icon name="check" size={15} color="var(--db-green-600)" stroke={2.4} /> Done</span>
                      : <span style={{ minWidth:26, height:26, padding:'0 8px', borderRadius:999, background:lv.bg, color:lv.fg, fontSize:13, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center' }}>{ct > 99 ? '99+' : ct}</span>}
                  </div>
                  <div>
                    <div style={{ fontSize:18, fontWeight:600, color:'var(--db-navy-800)', letterSpacing:'-0.01em' }}>{m.name}</div>
                    <div style={{ fontSize:13.5, color:'var(--db-gray-text)', marginTop:5, lineHeight:1.45 }}>{m.sig}</div>
                  </div>
                </div>
                {/* action footer */}
                <div style={{ borderTop:'1px solid var(--db-gray-lines)', background:'var(--db-oat-light)', padding:'13px 22px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:13, fontWeight:600, color: done ? 'var(--db-navy-700)' : lv.fg }}>{m.cta}</span>
                  <Icon name="arrow" size={16} color={done ? 'var(--db-navy-400)' : lv.fg} />
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { HomeView });
