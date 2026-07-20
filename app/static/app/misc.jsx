// QSR Command Center — Sales + Reports views.

const HourlyChart = () => {
  const max = Math.max(...SALES_HOURLY);
  const labels = ['6a','','8a','','10a','','12p','','2p','','4p','','6p','','8p','','10p',''];
  return (
    <Card pad={20}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ fontSize:14.5, fontWeight:500, color:'var(--db-navy-800)' }}>Sales by hour · yesterday</div>
        <Pill level="ok" dot>Peak 12–1p</Pill>
      </div>
      <div style={{ display:'flex', alignItems:'end', gap:5, height:150 }}>
        {SALES_HOURLY.map((v, i) => {
          const peak = v === max;
          return (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
              <div title={`$${v}`} style={{ width:'100%', height:`${(v/max)*120}px`, background: peak?'var(--db-lava-600)':'var(--db-navy-700)', borderRadius:'3px 3px 0 0', opacity: peak?1:0.85 }} />
              <span style={{ fontSize:9.5, color:'var(--db-navy-400)', fontFamily:'var(--font-mono)' }}>{labels[i]}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

const SalesView = () => {
  const kpis = [
    { ...KPIS.sales, c:'var(--db-lava-600)' },
    { label:'Transactions', v:'612', d:'+38 vs LW', up:true, spark:KPIS.traffic.spark, c:'var(--db-navy-600)' },
    { label:'Avg ticket', v:'$24.21', d:'+1.4%', up:true, spark:[22,23,22,24,23,24,24,25,24,24], c:'var(--db-green-600)' },
    { ...KPIS.forecast, c:'var(--db-blue-600)' },
  ];
  return (
    <div style={{ flex:1, overflow:'auto', background:'var(--db-oat-light)' }}>
      <div style={{ padding:'28px 32px 40px', maxWidth:1080, margin:'0 auto' }}>
        <PageHead icon="sales" title="Sales" sub="Yesterday's close and how today is shaping up against forecast.">
          <Btn variant="ghost" icon="calendar">Yesterday</Btn>
          <Btn variant="ghost" icon="filter">Export</Btn>
        </PageHead>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:18 }}>
          {kpis.map(k => (
            <Card key={k.label} pad="16px 18px">
              <div style={{ fontSize:11, color:'var(--db-gray-text)', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.05em' }}>{k.label}</div>
              <div style={{ fontSize:27, fontWeight:600, color:'var(--db-navy-800)', letterSpacing:'-0.02em', margin:'6px 0 4px' }}>{k.v}</div>
              <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
                {k.d ? <Delta up={k.up}>{k.d}</Delta> : <span style={{ fontSize:12, color:'var(--db-gray-text)' }}>{k.sub}</span>}
                <Spark pts={k.spark} color={k.c} w={70} h={26} />
              </div>
            </Card>
          ))}
        </div>

        <div style={{ marginBottom:18 }}><HourlyChart /></div>

        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:16 }}>
          <Card pad={20}>
            <div style={{ fontSize:14.5, fontWeight:500, color:'var(--db-navy-800)', marginBottom:16 }}>Top items</div>
            <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
              {TOP_ITEMS.map(it => (
                <div key={it.name}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:13, color:'var(--db-navy-800)', fontWeight:500 }}>{it.name}</span>
                    <span style={{ fontSize:12.5, color:'var(--db-gray-text)', fontFamily:'var(--font-mono)' }}>{it.units} · {it.rev}</span>
                  </div>
                  <div style={{ height:7, background:'var(--db-oat-medium)', borderRadius:4 }}><div style={{ width:`${it.w}%`, height:'100%', background:'var(--db-lava-600)', borderRadius:4 }} /></div>
                </div>
              ))}
            </div>
          </Card>
          <Card pad={20}>
            <div style={{ fontSize:14.5, fontWeight:500, color:'var(--db-navy-800)', marginBottom:16 }}>By daypart</div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {DAYPARTS.map(d => (
                <div key={d.name} style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ width:74, fontSize:13, color:'var(--db-navy-800)' }}>{d.name}</span>
                  <div style={{ flex:1, height:7, background:'var(--db-oat-medium)', borderRadius:4 }}><div style={{ width:`${d.pct/0.54}%`, maxWidth:'100%', height:'100%', background:'var(--db-navy-800)', borderRadius:4 }} /></div>
                  <span style={{ width:54, textAlign:'right', fontSize:12.5, color:'var(--db-gray-text)', fontFamily:'var(--font-mono)' }}>{d.rev}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Reports ---------------- */
const REPORTS = [
  { name:'Daily flash', desc:'Sales, labor %, guests — emailed 6:00 AM', icon:'sales', tag:'Daily', live:true },
  { name:'Weekly P&L close', desc:'Margins, COGS, labor, waste', icon:'reports', tag:'Mondays', live:true },
  { name:'Food cost variance', desc:'Theoretical vs. actual usage', icon:'inventory', tag:'Weekly', live:true },
  { name:'Labor compliance', desc:'Breaks, OT, predictive scheduling', icon:'labor', tag:'Weekly', live:true },
  { name:'Guest sentiment digest', desc:'Themes + rating trend', icon:'feedback', tag:'Weekly', live:false },
  { name:'Equipment uptime', desc:'Telemetry + service history', icon:'equipment', tag:'Monthly', live:false },
];
const ReportsView = () => (
  <div style={{ flex:1, overflow:'auto', background:'var(--db-oat-light)' }}>
    <div style={{ padding:'28px 32px 40px', maxWidth:1080, margin:'0 auto' }}>
      <PageHead icon="reports" title="Reports" sub="Scheduled exports and store summaries, built on your governed data in Unity Catalog.">
        <Btn variant="primary" icon="plus">New report</Btn>
      </PageHead>

      <div style={{ marginBottom:18 }}>
        <AIRec tone="navy" action="Open weekly close" onAction={()=>{}}>
          Your <strong>week is tracking +4.8%</strong> vs last week on slightly lower labor. Biggest swing: carnitas mix up 22%, pushing food cost +0.6pt. I've drafted the Monday P&L close — review when you have a minute.
        </AIRec>
      </div>

      <div style={{ display:'flex', alignItems:'center', marginBottom:14 }}>
        <h2 style={{ fontSize:16, fontWeight:500, color:'var(--db-navy-800)', margin:0 }}>Scheduled reports</h2>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        {REPORTS.map(r => (
          <Card key={r.name} hover pad={18} style={{ cursor:'pointer', display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:11 }}>
              <div style={{ width:36, height:36, borderRadius:9, background:'var(--db-oat-medium)', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name={r.icon} size={18} color="var(--db-navy-800)" /></div>
              <span style={{ marginLeft:'auto' }}><Pill level={r.live?'ok':'neutral'} dot={r.live}>{r.live?'Scheduled':'Off'}</Pill></span>
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:500, color:'var(--db-navy-800)' }}>{r.name}</div>
              <div style={{ fontSize:12, color:'var(--db-gray-text)', marginTop:3, lineHeight:1.45 }}>{r.desc}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:6, borderTop:'1px solid var(--db-gray-lines)' }}>
              <span style={{ fontSize:11.5, color:'var(--db-navy-400)', fontFamily:'var(--font-mono)' }}>{r.tag}</span>
              <Icon name="chev" size={15} color="var(--db-navy-400)" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  </div>
);

/* ---------------- Sales & Labor (combined tab) ---------------- */
const SalesLaborView = () => {
  const { slTab, setSlTab, outstanding } = useApp();
  const tab = slTab || 'sales';
  const segs = [{ id:'sales', label:'Sales' }, { id:'labor', label:'Labor', count: outstanding.labor }];
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>
      <div style={{ height:50, background:'#fff', borderBottom:'1px solid var(--db-gray-lines)', display:'flex', alignItems:'center', gap:7, padding:'0 28px', flexShrink:0 }}>
        <span style={{ fontSize:12, fontWeight:500, color:'var(--db-navy-400)', textTransform:'uppercase', letterSpacing:'0.06em', marginRight:6 }}>Sales &amp; Labor</span>
        {segs.map(s => {
          const on = tab === s.id;
          return (
            <button key={s.id} onClick={() => setSlTab(s.id)} style={{ display:'inline-flex', alignItems:'center', gap:7, border:0, cursor:'pointer', fontSize:13, fontWeight:500, padding:'7px 15px', borderRadius:999, background: on?'var(--db-navy-800)':'var(--db-oat-medium)', color: on?'#fff':'var(--db-gray-text)' }}>
              {s.label}
              {s.count > 0 && <span style={{ fontSize:10.5, fontWeight:600, minWidth:17, height:17, padding:'0 5px', borderRadius:999, background: on?'var(--db-lava-600)':'var(--db-lava-300)', color: on?'#fff':'var(--db-lava-700)', display:'flex', alignItems:'center', justifyContent:'center' }}>{s.count}</span>}
            </button>
          );
        })}
      </div>
      {tab === 'sales' ? <SalesView /> : <LaborView />}
    </div>
  );
};

Object.assign(window, { SalesView, ReportsView, SalesLaborView });
