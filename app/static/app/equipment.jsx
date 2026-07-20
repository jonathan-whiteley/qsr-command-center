// QSR Command Center — Equipment module.

const TempChart = ({ pts, w = 300, h = 80, danger }) => {
  const max = Math.max(...pts, 41), min = Math.min(...pts, 36), rng = max - min || 1;
  const step = w / (pts.length - 1);
  const xy = pts.map((p, i) => [i * step, h - ((p - min) / rng) * (h - 10) - 5]);
  const line = xy.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const thresholdY = h - ((41 - min) / rng) * (h - 10) - 5;
  const col = danger ? 'var(--db-lava-600)' : 'var(--db-green-600)';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display:'block', overflow:'visible', width:'100%' }}>
      <line x1="0" y1={thresholdY} x2={w} y2={thresholdY} stroke="var(--db-lava-400)" strokeWidth="1" strokeDasharray="4 4" />
      <text x={w-2} y={thresholdY-4} textAnchor="end" fontSize="9" fill="var(--db-lava-700)" fontFamily="var(--font-mono)">41° limit</text>
      <path d={`${line} L${w} ${h} L0 ${h} Z`} fill={col} opacity="0.08" />
      <path d={line} fill="none" stroke={col} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xy[xy.length-1][0]} cy={xy[xy.length-1][1]} r="3.5" fill={col} />
    </svg>
  );
};

const SlotOption = ({ slot, selected, onSelect }) => (
  <button onClick={onSelect} className="hb-slot" style={{
    display:'flex', alignItems:'center', gap:12, width:'100%', textAlign:'left', cursor:'pointer',
    border: selected?'2px solid var(--db-lava-600)':'1px solid var(--db-navy-700)', background: selected?'var(--db-navy-700)':'transparent',
    borderRadius:10, padding:'11px 13px', margin: selected?-1:0,
  }}>
    <span style={{ width:18, height:18, borderRadius:999, border: selected?'5px solid var(--db-lava-600)':'2px solid var(--db-navy-500)', flexShrink:0, boxSizing:'border-box', background: selected?'#fff':'transparent' }} />
    <div style={{ flex:1 }}>
      <div style={{ fontSize:13.5, fontWeight:500, color:'#fff' }}>{slot.label} · {slot.time}</div>
      <div style={{ fontSize:11.5, color:'var(--db-navy-300)' }}>{slot.tech} · {slot.note}</div>
    </div>
    {slot.rec && <Pill level="warn">Recommended</Pill>}
  </button>
);

const CoolerAlert = ({ eq, scheduled, onSchedule }) => {
  const [sel, setSel] = useState(SERVICE_SLOTS.find(s => s.rec).id);
  const slot = SERVICE_SLOTS.find(s => s.id === sel);
  return (
    <div style={{ background:'var(--db-navy-900)', borderRadius:16, overflow:'hidden', marginBottom:20 }}>
      <div style={{ display:'flex', gap:24, padding:'24px 28px' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:'var(--db-lava-600)', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="alert" size={17} color="#fff" /></div>
            <span style={{ fontSize:12.5, fontWeight:600, color:'var(--db-lava-400)', letterSpacing:'0.05em', textTransform:'uppercase' }}>Needs service</span>
          </div>
          <h2 style={{ fontSize:22, fontWeight:500, color:'#fff', margin:'14px 0 6px', letterSpacing:'-0.01em' }}>{eq.name}</h2>
          <p style={{ fontSize:13.5, color:'var(--db-navy-300)', lineHeight:1.5, margin:0, maxWidth:380 }}>
            Holding <strong style={{ color:'#fff' }}>42°F</strong> against a 36–38°F target — drifted +4°F over 36 hours. Likely a door gasket or condenser. Still in CoolTech warranty.
          </p>
          <div style={{ marginTop:18, background:'var(--db-navy-800)', borderRadius:10, padding:'14px 16px' }}>
            <TempChart pts={eq.spark} danger />
          </div>
        </div>
        <div style={{ width:340, flexShrink:0 }}>
          {scheduled ? (
            <div style={{ height:'100%', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', textAlign:'center', gap:12, background:'var(--db-navy-800)', borderRadius:12, padding:24 }}>
              <span style={{ width:48, height:48, borderRadius:999, background:'var(--db-green-600)', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="check" size={26} color="#fff" stroke={2.4} /></span>
              <div style={{ fontSize:15, fontWeight:600, color:'#fff' }}>Service booked</div>
              <div style={{ fontSize:13, color:'var(--db-navy-300)', lineHeight:1.5 }}>{scheduled.label} · {scheduled.time}<br/>{scheduled.tech}</div>
              <Pill level="ok" dot>Work order WO-2291 sent</Pill>
              <LakebaseTag table="work_orders" tone="dark" />
            </div>
          ) : (
            <React.Fragment>
              <div style={{ fontSize:12.5, fontWeight:500, color:'var(--db-navy-300)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:12 }}>Pick a service window</div>
              <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                {SERVICE_SLOTS.map(s => <SlotOption key={s.id} slot={s} selected={sel===s.id} onSelect={() => setSel(s.id)} />)}
              </div>
              <Btn variant="primary" full icon="calendar" onClick={() => onSchedule(slot)} style={{ marginTop:14 }}>Book {slot.label.toLowerCase()} service</Btn>
            </React.Fragment>
          )}
        </div>
      </div>
    </div>
  );
};

const EqCard = ({ eq }) => {
  const lv = LEVEL[eq.level];
  return (
    <Card pad={16} style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:11 }}>
        <div style={{ width:36, height:36, borderRadius:9, background:lv.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon name={eq.type==='Refrigeration'?'snow':eq.type==='Cooking'?'flame':eq.type==='Beverage'?'flame':'equipment'} size={18} color={lv.fg} />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13.5, fontWeight:500, color:'var(--db-navy-800)' }}>{eq.name}</div>
          <div style={{ fontSize:11.5, color:'var(--db-gray-text)' }}>{eq.type}</div>
        </div>
        <span style={{ width:9, height:9, borderRadius:999, background:lv.dot }} />
      </div>
      <div style={{ fontSize:12.5, color:'var(--db-navy-800)', fontWeight:500 }}>{eq.metric}</div>
      <div style={{ fontSize:11.5, color:'var(--db-gray-text)', lineHeight:1.4, marginTop:-6 }}>{eq.detail}</div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:4, borderTop:'1px solid var(--db-gray-lines)' }}>
        <span style={{ fontSize:11, color:'var(--db-navy-400)' }}>Serviced {eq.lastService}</span>
        {eq.level==='warn' ? <button className="hb-link" style={{ background:'none', border:0, fontSize:12, color:'var(--db-lava-700)', fontWeight:500, cursor:'pointer' }}>Schedule</button>
          : <span style={{ fontSize:11.5, color:'var(--db-green-700)', fontWeight:500 }}>Healthy</span>}
      </div>
    </Card>
  );
};

const EquipmentView = () => {
  const { equipmentScheduled, scheduleService } = useApp();
  const cooler = EQUIPMENT[0];
  const booked = equipmentScheduled.slot;
  const rest = EQUIPMENT.slice(1);
  return (
    <div style={{ flex:1, overflow:'auto', background:'var(--db-oat-light)' }}>
      <div style={{ padding:'28px 32px 40px', maxWidth:1080, margin:'0 auto' }}>
        <PageHead icon="equipment" title="Equipment" sub="Live telemetry from refrigeration, cooking and front-of-house gear — with service booking built in.">
          <Btn variant="ghost" icon="refresh">Refresh</Btn>
        </PageHead>

        <CoolerAlert eq={cooler} scheduled={booked} onSchedule={(slot) => scheduleService(slot)} />

        <div style={{ display:'flex', alignItems:'center', marginBottom:14 }}>
          <h2 style={{ fontSize:16, fontWeight:500, color:'var(--db-navy-800)', margin:0 }}>All equipment</h2>
          <span style={{ marginLeft:'auto', fontSize:12.5, color:'var(--db-gray-text)' }}>{rest.filter(e=>e.level==='ok').length} healthy · 1 watch</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {rest.map(eq => <EqCard key={eq.id} eq={eq} />)}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { EquipmentView });
