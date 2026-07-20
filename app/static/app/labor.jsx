// OperatorIQ / Lakehouse Market — Labor (forward-looking day-part planner + timecard approvals).

/* ============================ Staffing model ============================ */
const ROLE_RATES  = { cook: 18.50, cashier: 17.25, lead: 21.00, manager: 28.00 };
const TARGET_RPLH = { breakfast: 80, lunch: 100, dinner: 85, late: 60 };   // revenue per labor-hour
const DP_HOURS    = { breakfast: 3, lunch: 4, dinner: 4, late: 3 };
const ROLE_MIX = {
  breakfast: { cook:0.40, cashier:0.40, lead:0.20, manager:0.00 },
  lunch:     { cook:0.45, cashier:0.35, lead:0.13, manager:0.07 },
  dinner:    { cook:0.45, cashier:0.33, lead:0.15, manager:0.07 },
  late:      { cook:0.43, cashier:0.43, lead:0.14, manager:0.00 },
};
const ROLE_FLOORS = {
  breakfast: { cook:1, cashier:1, lead:1, manager:0 },
  lunch:     { cook:2, cashier:1, lead:1, manager:1 },
  dinner:    { cook:2, cashier:1, lead:1, manager:1 },
  late:      { cook:1, cashier:1, lead:1, manager:0 },
};
function computeStaffing(dp, revenue) {
  const hours = DP_HOURS[dp], target = TARGET_RPLH[dp];
  const laborHours = Math.max(0, revenue / target);
  const headcount = Math.max(0, Math.ceil(laborHours / hours));
  const mix = ROLE_MIX[dp], floors = ROLE_FLOORS[dp];
  const raw = { cook:headcount*mix.cook, cashier:headcount*mix.cashier, lead:headcount*mix.lead, manager:headcount*mix.manager };
  const roles = { ...floors };
  let assigned = roles.cook + roles.cashier + roles.lead + roles.manager;
  let remaining = Math.max(0, headcount - assigned);
  const diff = Object.entries(raw).map(([k,v]) => [k, Math.max(0, v - floors[k])]).sort((a,b) => b[1]-a[1]);
  let i = 0;
  while (remaining > 0) { roles[diff[i % diff.length][0]] += 1; remaining--; i++; }
  const cost = Object.entries(roles).reduce((s,[k,n]) => s + n*hours*ROLE_RATES[k], 0);
  return { headcount, roles, cost, hours };
}
const DP_IDS = ['breakfast','lunch','dinner','late'];
const DP_THEME = {
  breakfast:{ tint:'var(--db-yellow-300)', deep:'var(--db-yellow-700)', icon:'sunrise', label:'Breakfast', time:'6–10a',  blurb:'Early traffic', curve:[0.25,0.6,1,0.7] },
  lunch:    { tint:'var(--db-lava-300)',   deep:'var(--db-lava-600)',   icon:'sun',     label:'Lunch',     time:'11a–2p', blurb:'Peak rush',     curve:[0.35,0.85,1,0.95,0.6] },
  dinner:   { tint:'var(--db-maroon-300)', deep:'var(--db-maroon-600)', icon:'sunset',  label:'Dinner',    time:'5–8p',   blurb:'Family pickup', curve:[0.5,0.9,1,0.7,0.4] },
  late:     { tint:'var(--db-blue-300)',   deep:'var(--db-blue-700)',   icon:'moon',    label:'Late',      time:'8–11p',  blurb:'Wind-down',     curve:[0.85,0.6,0.3,0.15] },
};
const DP_BASELINE = { breakfast:1180, lunch:4080, dinner:2520, late:880 };  // tomorrow (Sat) forecast
const DP_CONF = { breakfast:0.09, lunch:0.06, dinner:0.07, late:0.13 };
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const moneyK = (n) => n >= 1000 ? '$' + (n/1000).toFixed(1) + 'k' : '$' + Math.round(n);

/* ============================ Shared stat card (used app-wide) ============================ */
const LaborStat = ({ label, value, foot }) => (
  <Card pad="14px 16px" style={{ flex:1 }}>
    <div style={{ fontSize:11, color:'var(--db-gray-text)', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</div>
    <div style={{ fontSize:24, fontWeight:600, color:'var(--db-navy-800)', letterSpacing:'-0.02em', margin:'5px 0 3px' }}>{value}</div>
    {foot && (typeof foot === 'string' ? <div style={{ fontSize:12, color:'var(--db-gray-text)' }}>{foot}</div> : foot)}
  </Card>
);

/* ============================ Planner hero ============================ */
const PlannerHero = ({ totals, overrideCount, refreshing, onRefresh, lastRun, baseHc }) => {
  const laborPct = totals.cost / totals.rev;
  const over = laborPct > 0.26, under = laborPct < 0.22;
  const verdict = over ? 'Above target' : under ? 'Below target' : 'On target';
  const vColor = over ? 'var(--db-lava-400)' : under ? 'var(--db-yellow-400)' : 'var(--db-green-400)';
  const Big = ({ label, value, delta }) => (
    <div style={{ minWidth:128 }}>
      <div style={{ fontSize:11, fontWeight:500, color:'var(--db-navy-400)', textTransform:'uppercase', letterSpacing:'0.07em' }}>{label}</div>
      <div style={{ fontSize:34, fontWeight:600, letterSpacing:'-0.02em', lineHeight:1.05, marginTop:5, color:'#fff', fontFeatureSettings:'"tnum"' }}>{value}</div>
      {delta != null && delta !== 0 && (
        <div style={{ fontSize:11.5, fontWeight:500, marginTop:4, fontFamily:'var(--font-mono)', color: delta>0?'var(--db-green-400)':'var(--db-lava-400)' }}>
          {delta>0?'+':'−'}{moneyK(Math.abs(delta))} vs forecast
        </div>
      )}
    </div>
  );
  return (
    <div style={{ background:'var(--db-navy-900)', borderRadius:18, padding:'28px 32px', position:'relative', overflow:'hidden' }}>
      <svg viewBox="0 0 24 24" width="300" height="300" fill="none" stroke="var(--db-navy-700)" strokeWidth="0.45" style={{ position:'absolute', right:-46, top:-64, opacity:0.5 }}><path d={PATHS.sun} /></svg>
      <div style={{ display:'flex', gap:32, flexWrap:'wrap', position:'relative' }}>
        <div style={{ flex:'1 1 300px', minWidth:280 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'4px 11px', background:'var(--db-lava-600)', borderRadius:999, fontSize:11, fontWeight:600, letterSpacing:'0.05em', textTransform:'uppercase', color:'#fff' }}>
            <Icon name="spark" size={12} color="#fff" /> Tomorrow's plan
          </div>
          <h2 style={{ margin:'14px 0 0', fontSize:32, fontWeight:500, letterSpacing:'-0.02em', lineHeight:1.05, color:'#fff' }}>{STORE.tomorrowLong}</h2>
          <p style={{ marginTop:10, fontSize:14, color:'var(--db-navy-300)', maxWidth:440, lineHeight:1.5 }}>
            Genie forecast tomorrow's traffic by day-part. Adjust anything you know that it doesn't, then approve — crew, cost and labor % update live.
          </p>
          <div style={{ marginTop:14, display:'flex', alignItems:'center', gap:12, fontSize:12, color:'var(--db-navy-400)', flexWrap:'wrap' }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
              <span style={{ width:6, height:6, borderRadius:999, background: refreshing?'var(--db-yellow-500)':'var(--db-green-500)' }} />
              {refreshing ? 'Refreshing forecast…' : `Forecast updated ${lastRun}`}
            </span>
            <button onClick={onRefresh} disabled={refreshing} style={{ background:'var(--db-navy-700)', color:'#fff', border:0, padding:'5px 12px', borderRadius:999, cursor:refreshing?'wait':'pointer', fontSize:11.5, fontWeight:500, display:'inline-flex', alignItems:'center', gap:6, fontFamily:'var(--font-sans)' }}>
              <Icon name="refresh" size={12} color="#fff" stroke={2} /> Refresh
            </button>
          </div>
        </div>
        <div style={{ display:'flex', gap:26, flexWrap:'wrap' }}>
          <Big label="Predicted sales" value={money(totals.rev)} delta={overrideCount?totals.rev-totals.baseRev:null} />
          <Big label="Recommended labor" value={money(totals.cost)} delta={overrideCount?totals.cost-totals.baseCost:null} />
          <div style={{ paddingLeft:26, borderLeft:'1px solid var(--db-navy-700)' }}>
            <div style={{ fontSize:11, fontWeight:500, color:'var(--db-navy-400)', textTransform:'uppercase', letterSpacing:'0.07em' }}>Labor % of sales</div>
            <div style={{ fontSize:36, fontWeight:600, letterSpacing:'-0.02em', lineHeight:1.05, marginTop:5, color:'#fff', fontFeatureSettings:'"tnum"' }}>
              {(laborPct*100).toFixed(1)}<span style={{ fontSize:20, color:'var(--db-navy-400)' }}>%</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginTop:5, fontSize:11.5 }}>
              <span style={{ color:vColor, fontWeight:500, display:'inline-flex', alignItems:'center', gap:5 }}><span style={{ width:6, height:6, borderRadius:999, background:vColor }} />{verdict}</span>
              <span style={{ color:'var(--db-navy-400)', fontFamily:'var(--font-mono)' }}>· goal 22–26%</span>
            </div>
            <div style={{ fontSize:11.5, color:'var(--db-navy-400)', marginTop:7 }}>
              {totals.headcount} on the schedule {overrideCount>0 && totals.headcount!==baseHc && <span style={{ color:'#fff', fontWeight:500 }}>({totals.headcount>baseHc?'+':''}{totals.headcount-baseHc} vs forecast)</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================ Day-part card ============================ */
const RoleStack = ({ roles, accent }) => {
  const items = [
    { k:'cook', label:'Cooks', icon:'flame', c:accent },
    { k:'cashier', label:'Cashiers', icon:'cash', c:'var(--db-navy-600)' },
    { k:'lead', label:'Leads', icon:'star', c:'var(--db-yellow-700)' },
    { k:'manager', label:'Manager', icon:'user', c:'var(--db-green-700)' },
  ];
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {items.filter(it => roles[it.k] > 0).map(it => (
        <div key={it.k} style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:24, height:24, borderRadius:6, background:'var(--db-oat-medium)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name={it.icon} size={12} color={it.c} stroke={2} />
          </div>
          <span style={{ flex:1, fontSize:13, color:'var(--db-navy-800)' }}>{it.label}</span>
          <div style={{ display:'flex', gap:3 }}>
            {[...Array(roles[it.k])].map((_,i) => <span key={i} style={{ width:7, height:7, borderRadius:999, background:it.c }} />)}
          </div>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:12, fontWeight:600, color:'var(--db-navy-800)', minWidth:14, textAlign:'right' }}>{roles[it.k]}</span>
        </div>
      ))}
    </div>
  );
};
const MiniStat = ({ label, value, delta, isMoney }) => (
  <div>
    <div style={{ fontSize:10, fontWeight:600, color:'var(--db-gray-text)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{label}</div>
    <div style={{ display:'flex', alignItems:'baseline', gap:6, marginTop:2 }}>
      <span style={{ fontSize:23, fontWeight:600, color:'var(--db-navy-800)', letterSpacing:'-0.01em', fontFeatureSettings:'"tnum"' }}>{value}</span>
      {delta != null && delta !== 0 && (
        <span style={{ fontSize:11, fontWeight:500, fontFamily:'var(--font-mono)', color: delta>0?'var(--db-green-700)':'var(--db-lava-700)' }}>
          {delta>0?'+':'−'}{isMoney?moneyK(Math.abs(delta)):Math.abs(delta)}
        </span>
      )}
    </div>
  </div>
);
const DaypartCard = ({ id, override, onOverride, onClear, showConf, baselineOverride }) => {
  const th = DP_THEME[id];
  const baseline = baselineOverride ?? DP_BASELINE[id];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const revenue = override ?? baseline;
  const isOv = override != null;
  const base = computeStaffing(id, baseline);
  const cur = computeStaffing(id, revenue);
  const hcD = cur.headcount - base.headcount, costD = cur.cost - base.cost;
  const startEdit = () => { setDraft(String(Math.round(revenue))); setEditing(true); };
  const commit = () => {
    const n = parseFloat(draft.replace(/[^0-9.]/g, ''));
    if (!isNaN(n) && n >= 0) { Math.round(n) === Math.round(baseline) ? onClear() : onOverride(n); }
    setEditing(false);
  };
  return (
    <article style={{ background:'#fff', borderRadius:14, border: isOv?`2px solid ${th.deep}`:'1px solid var(--db-gray-lines)', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow: isOv?'var(--shadow-md)':'none', position:'relative' }}>
      {isOv && <div style={{ position:'absolute', top:12, right:12, background:th.deep, color:'#fff', fontSize:9, fontWeight:600, padding:'3px 8px', borderRadius:999, letterSpacing:'0.06em', textTransform:'uppercase' }}>Adjusted</div>}
      {/* themed band */}
      <div style={{ background:th.tint, padding:'16px 18px 14px', borderBottom:'1px solid var(--db-gray-lines)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:th.deep, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name={th.icon} size={18} color="#fff" /></div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:600, color:'var(--db-navy-800)', letterSpacing:'-0.01em', lineHeight:1.1 }}>{th.label}</div>
            <div style={{ fontSize:10.5, color:'var(--db-navy-700)', marginTop:2, fontFamily:'var(--font-mono)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{th.time} · {th.blurb}</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:30, marginTop:13 }}>
          {th.curve.map((y,i) => <div key={i} style={{ flex:1, height:`${y*100}%`, background:th.deep, opacity:0.3+y*0.5, borderRadius:'3px 3px 1px 1px' }} />)}
        </div>
      </div>
      {/* revenue */}
      <div style={{ padding:'16px 18px 12px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
          <span style={{ fontSize:10, fontWeight:600, color:'var(--db-gray-text)', textTransform:'uppercase', letterSpacing:'0.09em' }}>{isOv?'Your estimate':'Predicted sales'}</span>
          {!editing && (
            <button onClick={startEdit} style={{ background:'transparent', border:0, padding:0, cursor:'pointer', color:isOv?th.deep:'var(--db-gray-text)', display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:500 }}>
              <Icon name="edit" size={11} color="currentColor" /> {isOv?'Adjust':'Override'}
            </button>
          )}
        </div>
        {editing ? (
          <div style={{ display:'flex', alignItems:'center', gap:3, paddingBottom:5, borderBottom:`2px solid ${th.deep}` }}>
            <span style={{ fontSize:28, fontWeight:600, color:'var(--db-navy-800)' }}>$</span>
            <input autoFocus type="text" value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit}
              onKeyDown={e=>{ if(e.key==='Enter')commit(); if(e.key==='Escape')setEditing(false); }}
              style={{ font:'600 28px/1.1 var(--font-sans)', color:'var(--db-navy-800)', border:0, outline:0, padding:0, background:'transparent', width:'100%', letterSpacing:'-0.02em' }} />
          </div>
        ) : (
          <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
            <span style={{ fontSize:30, fontWeight:600, color:isOv?th.deep:'var(--db-navy-800)', letterSpacing:'-0.02em', fontFeatureSettings:'"tnum"', lineHeight:1.1 }}>{money(revenue)}</span>
            {isOv && <span style={{ fontSize:12, color:'var(--db-gray-text)', textDecoration:'line-through', fontFeatureSettings:'"tnum"' }}>{money(baseline)}</span>}
          </div>
        )}
        {showConf && !editing && (
          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6, fontSize:11, color:'var(--db-gray-text)' }}>
            <Icon name={isOv?'edit':'spark'} size={11} color={isOv?th.deep:'var(--db-lava-600)'} />
            {isOv ? 'Manual override' : `Genie forecast · ± ${(DP_CONF[id]*100).toFixed(0)}%`}
          </div>
        )}
      </div>
      {/* crew + cost */}
      <div style={{ padding:'0 18px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <MiniStat label="Crew" value={cur.headcount} delta={isOv?hcD:null} />
        <MiniStat label="Labor cost" value={moneyK(cur.cost)} delta={isOv?costD:null} isMoney />
      </div>
      {/* role mix */}
      <div style={{ padding:'14px 18px 4px' }}>
        <div style={{ fontSize:10, fontWeight:600, color:'var(--db-gray-text)', textTransform:'uppercase', letterSpacing:'0.09em', marginBottom:8 }}>The crew</div>
        <RoleStack roles={cur.roles} accent={th.deep} />
      </div>
      {isOv ? (
        <div style={{ margin:'14px 18px 16px', padding:'9px 12px', background:'var(--db-oat-light)', borderRadius:9, border:`1px dashed ${th.deep}`, display:'flex', alignItems:'center', gap:8, fontSize:11 }}>
          <Icon name="info" size={12} color={th.deep} />
          <span style={{ flex:1, color:'var(--db-gray-text)' }}><strong style={{ color:'var(--db-navy-800)', fontWeight:600 }}>{hcD>0?'+':''}{hcD} crew · {costD>=0?'+':'−'}{moneyK(Math.abs(costD))}</strong> vs forecast</span>
          <button onClick={onClear} style={{ background:'transparent', border:0, color:th.deep, cursor:'pointer', fontSize:11, padding:0, fontWeight:500 }}>Reset</button>
        </div>
      ) : <div style={{ height:16 }} />}
    </article>
  );
};

/* ============================ Approve-schedule modal ============================ */
const ApproveModal = ({ open, onClose, onConfirm, totals }) => {
  const [reason, setReason] = useState('');
  useEffect(() => { if (open) setReason(''); }, [open]);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(11,32,38,0.45)', zIndex:160, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:520, overflow:'hidden', boxShadow:'var(--shadow-xl)' }}>
        <div style={{ padding:'22px 24px', background:'var(--db-navy-900)', color:'#fff', display:'flex', alignItems:'center', gap:13 }}>
          <div style={{ width:42, height:42, borderRadius:11, background:'var(--db-lava-600)', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="check" size={22} color="#fff" stroke={2.4} /></div>
          <div>
            <div style={{ fontSize:17, fontWeight:600, letterSpacing:'-0.01em' }}>Lock in tomorrow's schedule</div>
            <div style={{ fontSize:12, color:'var(--db-navy-400)', marginTop:2 }}>{STORE.tomorrowLong} · {STORE.num}</div>
          </div>
        </div>
        <div style={{ padding:24 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', background:'var(--db-oat-light)', borderRadius:12, overflow:'hidden', border:'1px solid var(--db-gray-lines)' }}>
            {[['Sales',money(totals.rev)],['Labor',money(totals.cost)],['Crew',totals.headcount]].map(([l,v],i) => (
              <div key={l} style={{ padding:'14px 16px', borderRight:i<2?'1px solid var(--db-gray-lines)':0 }}>
                <div style={{ fontSize:10, color:'var(--db-gray-text)', textTransform:'uppercase', letterSpacing:'0.09em', fontWeight:600 }}>{l}</div>
                <div style={{ fontSize:22, fontWeight:600, color:'var(--db-navy-800)', marginTop:2, letterSpacing:'-0.01em', fontFeatureSettings:'"tnum"' }}>{v}</div>
              </div>
            ))}
          </div>
          <label style={{ fontSize:12, fontWeight:600, color:'var(--db-navy-800)', display:'block', margin:'18px 0 6px' }}>
            Why the change? <span style={{ color:'var(--db-gray-text)', fontWeight:400 }}>(helps Genie learn from you)</span>
          </label>
          <textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Giants day game — expecting a bigger lunch crowd."
            className="hb-textarea" style={{ width:'100%', boxSizing:'border-box', minHeight:80, padding:'11px 13px', borderRadius:10, border:'1px solid var(--db-gray-lines)', font:'400 13px/1.5 var(--font-sans)', color:'var(--db-navy-800)', resize:'vertical', outline:'none', background:'#fff' }} />
          <div style={{ marginTop:10 }}><LakebaseTag table="schedules" /></div>
        </div>
        <div style={{ padding:'16px 24px', borderTop:'1px solid var(--db-gray-lines)', display:'flex', justifyContent:'flex-end', gap:10, background:'var(--db-oat-light)' }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" icon="check" onClick={()=>onConfirm(reason)}>Approve schedule</Btn>
        </div>
      </div>
    </div>
  );
};

/* ============================ Timecards (kept) ============================ */
const TimecardRow = ({ tc, approved, onApprove, onDeny }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom:'1px solid var(--db-gray-lines)', opacity:approved?0.6:1, transition:'opacity var(--dur-base) var(--ease-out)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px' }}>
        <div style={{ width:38, height:38, borderRadius:999, background:'var(--db-navy-800)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:600, flexShrink:0 }}>{tc.initials}</div>
        <div style={{ width:148, flexShrink:0 }}>
          <div style={{ fontSize:13.5, fontWeight:500, color:'var(--db-navy-800)' }}>{tc.name}</div>
          <div style={{ fontSize:11.5, color:'var(--db-gray-text)' }}>{tc.role} · {tc.day}</div>
        </div>
        <div style={{ width:150, flexShrink:0, fontSize:12, fontFamily:'var(--font-mono)', color:'var(--db-gray-text)' }}>
          <div>sched {tc.sched}</div>
          <div style={{ color:'var(--db-navy-800)' }}>clock {tc.actual}</div>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          {approved ? <Pill level="ok" dot>Approved</Pill> : <Pill level={tc.level} dot>{tc.issue}</Pill>}
          <button onClick={()=>setOpen(o=>!o)} className="hb-link" style={{ background:'none', border:0, padding:0, marginLeft:12, fontSize:12, color:'var(--db-gray-text)', cursor:'pointer' }}>{open?'Hide':'Why?'}</button>
        </div>
        <div style={{ fontSize:13, fontFamily:'var(--font-mono)', color:'var(--db-navy-800)', width:54, textAlign:'right', flexShrink:0 }}>{tc.hours}h</div>
        {!approved ? (
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            <Btn size="sm" variant="ghost" onClick={onDeny}>Edit</Btn>
            <Btn size="sm" variant="primary" icon="check" onClick={onApprove}>Approve</Btn>
          </div>
        ) : <div style={{ width:150, display:'flex', justifyContent:'flex-end', flexShrink:0 }}><Icon name="check" size={18} color="var(--db-green-600)" stroke={2.2} /></div>}
      </div>
      {open && <div style={{ padding:'0 18px 14px 70px', fontSize:12.5, color:'var(--db-gray-text)', lineHeight:1.5 }}>{tc.note}</div>}
    </div>
  );
};

const RECENT_DAYS = [
  ['Mon May 26','$10,140','$10,140','0','$0','—','$10,210'],
  ['Sun May 25','$9,980','$10,210','+1','+$230','Mother\'s Day prep','$10,180'],
  ['Sat May 24','$10,520','$10,710','+1','+$190','Farmers market lunch','$10,620'],
  ['Fri May 23','$10,290','$10,520','+1','+$230','Giants home game','$10,720'],
  ['Thu May 22','$9,810','$9,810','0','$0','—','$9,750'],
];
const RecentDays = () => (
  <Card style={{ overflow:'hidden' }}>
    <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--db-gray-lines)', display:'flex', alignItems:'center', gap:10 }}>
      <Icon name="history" size={16} color="var(--db-gray-text)" />
      <span style={{ fontSize:14, fontWeight:500, color:'var(--db-navy-800)' }}>Recent days</span>
      <span style={{ fontSize:11.5, color:'var(--db-gray-text)' }}>· approved vs. actual</span>
    </div>
    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
      <thead>
        <tr style={{ textAlign:'left', color:'var(--db-gray-text)', background:'var(--db-oat-light)' }}>
          {['Date','Forecast','Approved','Δ Crew','Δ Cost','Reason','Actual'].map(h => (
            <th key={h} style={{ padding:'9px 16px', fontSize:10, textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {RECENT_DAYS.map((r,i) => (
          <tr key={i} style={{ color:'var(--db-navy-800)', borderTop:'1px solid var(--db-gray-lines)' }}>
            <td style={{ padding:'11px 16px', fontFamily:'var(--font-mono)', color:'var(--db-gray-text)' }}>{r[0]}</td>
            <td style={{ padding:'11px 16px', fontFamily:'var(--font-mono)' }}>{r[1]}</td>
            <td style={{ padding:'11px 16px', fontFamily:'var(--font-mono)', fontWeight:600 }}>{r[2]}</td>
            <td style={{ padding:'11px 16px', fontFamily:'var(--font-mono)', color:r[3]==='0'?'var(--db-navy-300)':'var(--db-lava-700)', fontWeight:r[3]==='0'?400:600 }}>{r[3]}</td>
            <td style={{ padding:'11px 16px', fontFamily:'var(--font-mono)', color:r[4]==='$0'?'var(--db-navy-300)':'var(--db-lava-700)', fontWeight:r[4]==='$0'?400:600 }}>{r[4]}</td>
            <td style={{ padding:'11px 16px', color:r[5]==='—'?'var(--db-navy-300)':'var(--db-navy-800)' }}>{r[5]}</td>
            <td style={{ padding:'11px 16px', fontFamily:'var(--font-mono)', color:'var(--db-gray-text)' }}>{r[6]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </Card>
);

/* ============================ Labor view ============================ */
const LaborView = () => {
  const { laborApproved, approveTimecard, approveAllTimecards, scheduleApproved, approveSchedule, t } = useApp();
  const [overrides, setOverrides] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [lastRun, setLastRun] = useState('5 min ago');
  const [modal, setModal] = useState(false);
  const showConf = t.showConfidence !== false;

  const setOverride = (dp, v) => setOverrides(o => ({ ...o, [dp]: v }));
  const clearOverride = (dp) => setOverrides(o => { const x = { ...o }; delete x[dp]; return x; });
  const overrideCount = Object.keys(overrides).length;

  // Live daypart forecasts from /api/labor/tomorrow. Falls back to DP_BASELINE
  // when the API is unreachable (standalone prototype mode).
  const [live, setLive] = useState(null);
  useEffect(() => {
    fetch('/api/labor/tomorrow', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(setLive)
      .catch(() => setLive(null));
  }, []);
  const baselines = {};
  if (live && Array.isArray(live.cards)) {
    live.cards.forEach(c => { baselines[c.daypart] = c.forecast_revenue; });
  }
  const baselineFor = (dp) => baselines[dp] ?? DP_BASELINE[dp];

  let totals = { rev:0, cost:0, baseRev:0, baseCost:0, headcount:0 }, baseHc = 0;
  DP_IDS.forEach(dp => {
    const base = baselineFor(dp), cur = overrides[dp] ?? base;
    const bC = computeStaffing(dp, base), cC = computeStaffing(dp, cur);
    totals.baseRev += base; totals.rev += cur; totals.baseCost += bC.cost; totals.cost += cC.cost;
    totals.headcount += cC.headcount; baseHc += bC.headcount;
  });

  const refresh = () => { setRefreshing(true); setTimeout(() => { setRefreshing(false); setLastRun('just now'); }, 1100); };
  const remaining = TIMECARDS.filter(tc => !laborApproved.has(tc.id)).length;

  return (
    <div style={{ flex:1, overflow:'auto', background:'var(--db-oat-light)' }}>
      <div style={{ padding:'24px 32px 48px', maxWidth:1180, margin:'0 auto', display:'flex', flexDirection:'column', gap:22 }}>
        <PlannerHero totals={totals} overrideCount={overrideCount} refreshing={refreshing} onRefresh={refresh} lastRun={lastRun} baseHc={baseHc} />

        <div style={{ marginTop:-2 }}>
          <AIRec tone="navy" action="Bump lunch +12%" onAction={() => setOverride('lunch', Math.round(baselineFor('lunch')*1.12))}>
            Tomorrow is a <strong>Giants home day game</strong> two blocks over. Genie sees lunch running <strong>~12% hot</strong> versus a normal Saturday — historically worth a <strong>+2 cook</strong> bump from 11:30–1:30. The rest of the day tracks to forecast.
          </AIRec>
        </div>

        {/* day-part planner */}
        <section>
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:14, gap:14 }}>
            <div>
              <h2 style={{ margin:0, fontSize:18, fontWeight:500, color:'var(--db-navy-800)', letterSpacing:'-0.01em' }}>By day-part</h2>
              <p style={{ margin:'4px 0 0', fontSize:13, color:'var(--db-gray-text)' }}>Tap any card to override the forecast. Crew, cost and labor % update live.</p>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {overrideCount > 0 && <Btn variant="ghost" size="sm" icon="refresh" onClick={() => setOverrides({})}>Reset all</Btn>}
              <Btn variant="primary" icon="check" onClick={() => setModal(true)}>{scheduleApproved ? 'Update schedule' : 'Approve schedule'}</Btn>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
            {DP_IDS.map(dp => (
              <DaypartCard key={dp} id={dp} baselineOverride={baselines[dp]} override={overrides[dp]} onOverride={v=>setOverride(dp,v)} onClear={()=>clearOverride(dp)} showConf={showConf} />
            ))}
          </div>
          {scheduleApproved && overrideCount === 0 && (
            <div style={{ marginTop:12, display:'flex', alignItems:'center', gap:10 }}>
              <Pill level="ok" dot>Tomorrow's schedule approved</Pill>
              <LakebaseTag table="schedules" />
            </div>
          )}
        </section>

        {/* timecards */}
        <section>
          <div style={{ display:'flex', alignItems:'center', marginBottom:12 }}>
            <h2 style={{ fontSize:18, fontWeight:500, color:'var(--db-navy-800)', margin:0, letterSpacing:'-0.01em' }}>Timecards to approve</h2>
            <span style={{ marginLeft:10, fontSize:12, fontWeight:500, color:remaining?'var(--db-lava-700)':'var(--db-green-800)', background:remaining?'var(--db-lava-300)':'var(--db-green-300)', padding:'2px 9px', borderRadius:999 }}>{remaining || 'Done'}</span>
            {remaining > 0 && <Btn variant="ghost" size="sm" icon="check" onClick={approveAllTimecards} style={{ marginLeft:'auto' }}>Approve all ({remaining})</Btn>}
          </div>
          <Card style={{ overflow:'hidden' }}>
            {TIMECARDS.map(tc => (
              <TimecardRow key={tc.id} tc={tc} approved={laborApproved.has(tc.id)} onApprove={()=>approveTimecard(tc.id)} onDeny={()=>approveTimecard(tc.id)} />
            ))}
            {remaining === 0 && (
              <div style={{ padding:'16px 18px', display:'flex', alignItems:'center', gap:10, background:'var(--db-oat-light)' }}>
                <Icon name="check" size={16} color="var(--db-green-600)" stroke={2.2} />
                <span style={{ fontSize:13, color:'var(--db-green-800)', fontWeight:500 }}>All timecards approved &amp; synced to payroll.</span>
                <span style={{ marginLeft:'auto' }}><LakebaseTag table="timecards" /></span>
              </div>
            )}
          </Card>
        </section>

        <RecentDays />
      </div>
      <ApproveModal open={modal} onClose={()=>setModal(false)} totals={totals} onConfirm={() => { setModal(false); approveSchedule(); setOverrides({}); }} />
    </div>
  );
};

Object.assign(window, { LaborView, LaborStat, computeStaffing });
