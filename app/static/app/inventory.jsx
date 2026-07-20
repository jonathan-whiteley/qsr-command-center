// QSR Command Center — Reorders / Inventory module.

const ParBar = ({ onHand, par }) => {
  const pct = Math.min(100, (onHand / par) * 100);
  const low = onHand / par < 0.4;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ width:70, height:6, background:'var(--db-oat-medium)', borderRadius:3, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background: low?'var(--db-lava-600)':'var(--db-green-600)', borderRadius:3 }} />
      </div>
      <span style={{ fontSize:11.5, fontFamily:'var(--font-mono)', color: low?'var(--db-lava-700)':'var(--db-gray-text)' }}>{onHand}/{par}</span>
    </div>
  );
};

const Stepper = ({ value, onChange, unit }) => (
  <div style={{ display:'inline-flex', alignItems:'center', gap:0, border:'1px solid var(--db-gray-lines)', borderRadius:7, overflow:'hidden', background:'#fff' }}>
    <button onClick={() => onChange(Math.max(0, value-1))} className="hb-step" style={{ border:0, background:'transparent', padding:'6px 8px', cursor:'pointer', display:'flex', color:'var(--db-gray-text)' }}><Icon name="minus" size={13} /></button>
    <span style={{ minWidth:26, textAlign:'center', fontSize:13, fontFamily:'var(--font-mono)', color:'var(--db-navy-800)' }}>{value}</span>
    <button onClick={() => onChange(value+1)} className="hb-step" style={{ border:0, background:'transparent', padding:'6px 8px', cursor:'pointer', display:'flex', color:'var(--db-gray-text)' }}><Icon name="plus" size={13} /></button>
  </div>
);

const POCard = ({ po, released, onRelease }) => {
  const [qtys, setQtys] = useState(Object.fromEntries(po.items.map(i => [i.id, i.qty])));
  const total = po.items.reduce((s, i) => s + qtys[i.id] * i.cost, 0);
  const lineCount = po.items.filter(i => qtys[i.id] > 0).length;
  return (
    <Card style={{ overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', borderBottom:'1px solid var(--db-gray-lines)', background:'var(--db-oat-light)' }}>
        <div style={{ width:34, height:34, borderRadius:8, background:'var(--db-oat-medium)', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="truck" size={18} color="var(--db-navy-800)" /></div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:500, color:'var(--db-navy-800)' }}>{po.vendor}</div>
          <div style={{ fontSize:11.5, color:'var(--db-gray-text)' }}>{po.items.length} items below par · delivers {po.eta}</div>
        </div>
        {released ? <Pill level="ok" dot>Released · arriving {po.eta}</Pill> : <Pill level="info" dot>Ready to release</Pill>}
      </div>
      <div>
        {po.items.map((it, idx) => (
          <div key={it.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 18px', borderBottom: idx<po.items.length-1?'1px solid var(--db-gray-lines)':0 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13.5, fontWeight:500, color:'var(--db-navy-800)' }}>{it.name}</div>
              <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--db-navy-400)' }}>{it.sku} · {it.trend}</div>
            </div>
            <ParBar onHand={it.onHand} par={it.par} />
            <div style={{ width:90, textAlign:'right', flexShrink:0 }}>
              {released ? <span style={{ fontSize:13, fontFamily:'var(--font-mono)', color:'var(--db-navy-800)' }}>{qtys[it.id]} {it.unit}</span>
                : <Stepper value={qtys[it.id]} onChange={v => setQtys(q => ({ ...q, [it.id]: v }))} unit={it.unit} />}
            </div>
            <div style={{ width:70, textAlign:'right', fontSize:13, fontFamily:'var(--font-mono)', color:'var(--db-navy-800)', flexShrink:0 }}>${(qtys[it.id]*it.cost).toFixed(0)}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', background:'var(--db-oat-light)' }}>
        <span style={{ fontSize:12.5, color:'var(--db-gray-text)' }}>{released ? <LakebaseTag table="purchase_orders" /> : `${lineCount} line items · suggested by usage model`}</span>
        <span style={{ marginLeft:'auto', fontSize:13, color:'var(--db-gray-text)' }}>PO total</span>
        <span style={{ fontSize:18, fontWeight:600, color:'var(--db-navy-800)', fontFamily:'var(--font-mono)' }}>${total.toFixed(2)}</span>
        {released ? <Btn variant="subtle" icon="check" disabled style={{ marginLeft:8 }}>Released</Btn>
          : <Btn variant="primary" icon="truck" onClick={() => onRelease(total)} style={{ marginLeft:8 }}>Release order</Btn>}
      </div>
    </Card>
  );
};

/* ============================ Stock-level charts ============================ */

// Donut ring — share of SKUs at/above par
const StockRing = ({ atPar, total, size = 132 }) => {
  const pct = atPar / total;
  const r = size/2 - 9, c = 2 * Math.PI * r, cx = size/2;
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--db-navy-700)" strokeWidth="9" />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--db-green-500)" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${c*pct} ${c}`} />
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize:30, fontWeight:600, color:'#fff', letterSpacing:'-0.02em', fontFeatureSettings:'"tnum"' }}>{Math.round(pct*100)}%</span>
        <span style={{ fontSize:10.5, color:'var(--db-navy-300)', marginTop:1 }}>at par</span>
      </div>
    </div>
  );
};

// Days-of-cover row — burndown sparkline + cover bar with lead-time marker
const MAX_COVER = 7;
const CoverRow = ({ item, last }) => {
  const risk = item.daysCover <= item.lead ? 'danger' : item.daysCover <= item.lead + 1.5 ? 'warn' : 'ok';
  const rc = { danger:'var(--db-lava-600)', warn:'var(--db-yellow-600)', ok:'var(--db-green-600)' }[risk];
  const rfg = { danger:'var(--db-lava-700)', warn:'var(--db-yellow-800)', ok:'var(--db-green-700)' }[risk];
  const coverW = Math.min(100, (item.daysCover / MAX_COVER) * 100);
  const leadL = Math.min(100, (item.lead / MAX_COVER) * 100);
  return (
    <div style={{ display:'grid', gridTemplateColumns:'132px 74px 1fr 96px', alignItems:'center', gap:14, padding:'11px 0', borderBottom: last?0:'1px solid var(--db-gray-lines)' }}>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:500, color:'var(--db-navy-800)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.name}</div>
        <div style={{ fontSize:10.5, color:'var(--db-navy-400)', fontFamily:'var(--font-mono)' }}>{item.onHand}/{item.par} · {item.cat}</div>
      </div>
      <Spark pts={item.history} w={70} h={26} color={item.color} sw={1.8} />
      <div style={{ position:'relative', height:20, background:'var(--db-oat-medium)', borderRadius:5, overflow:'hidden' }}>
        <div style={{ width:`${coverW}%`, height:'100%', background:rc, borderRadius:5, opacity:0.9 }} />
        <div title={`${item.lead}d vendor lead`} style={{ position:'absolute', top:-2, bottom:-2, left:`${leadL}%`, width:2, background:'var(--db-navy-800)' }} />
      </div>
      <div style={{ textAlign:'right' }}>
        <span style={{ fontSize:14, fontWeight:600, color:rfg, fontFamily:'var(--font-mono)' }}>{item.daysCover.toFixed(1)}d</span>
        <div style={{ fontSize:10, color:'var(--db-navy-400)' }}>{risk==='danger'?'before lead':'cover'}</div>
      </div>
    </div>
  );
};

// Fill-rate by category — horizontal bars (% of par)
const CategoryFill = ({ cats }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:15 }}>
    {cats.map(cat => {
      const low = cat.pct < 50;
      return (
        <div key={cat.name}>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:5 }}>
            <span style={{ fontSize:12.5, fontWeight:500, color:'var(--db-navy-800)' }}>{cat.name}</span>
            <span style={{ fontSize:11.5, color:'var(--db-gray-text)', fontFamily:'var(--font-mono)' }}>{cat.pct}% · {cat.skus} SKUs</span>
          </div>
          <div style={{ position:'relative', height:9, background:'var(--db-oat-medium)', borderRadius:5, overflow:'hidden' }}>
            <div style={{ width:`${cat.pct}%`, height:'100%', background: low?'var(--db-lava-600)':cat.color, borderRadius:5 }} />
          </div>
        </div>
      );
    })}
  </div>
);

const InventoryView = () => {
  const { reordersReleased, releasePO } = useApp();

  // Live stock health + category fill + watched items + POs from /api/inventory/*.
  const [liveHealth, setLiveHealth] = useState(null);
  const [liveCats, setLiveCats] = useState(null);
  const [liveWatched, setLiveWatched] = useState(null);
  const [livePos, setLivePos] = useState(null);
  useEffect(() => {
    fetch('/api/inventory/health', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null).then(setLiveHealth).catch(() => {});
    fetch('/api/inventory/by-category', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null).then(setLiveCats).catch(() => {});
    fetch('/api/inventory/watched?limit=6', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null).then(setLiveWatched).catch(() => {});
    fetch('/api/inventory/purchase-orders', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null).then(setLivePos).catch(() => {});
  }, []);

  // Map API PO shape -> the prototype's POCard shape.
  const reorders = livePos
    ? livePos.map(po => ({
        id: po.po_id,
        vendor: po.vendor_name,
        eta: po.eta ? po.eta.replace(/T.*$/, '') : 'TBD',
        items: po.lines.map((l, i) => ({
          id: `${po.po_id}-${i}`,
          name: l.item_name,
          sku: l.sku,
          onHand: l.on_hand_eod,
          par: l.reorder_point,
          unit: 'unit',
          cost: l.unit_cost,
          qty: l.qty,
          trend: l.usage_trend || 'steady',
        })),
      }))
    : REORDERS;
  const openCount = reorders.filter(p => !reordersReleased.has(p.id)).length;

  const health = liveHealth
    ? { atPar: liveHealth.at_par, total: liveHealth.total_skus, below: liveHealth.below_par }
    : { atPar: STOCK_HEALTH.atPar, total: STOCK_HEALTH.total, below: STOCK_HEALTH.below };
  const cats = liveCats
    ? liveCats.map(c => ({ name: c.category, pct: c.pct_at_par, skus: c.sku_count,
        color: c.category === 'meat' ? 'var(--db-lava-600)' :
               c.category === 'veggie' ? 'var(--db-green-600)' :
               c.category === 'bread_cheese' ? 'var(--db-yellow-600)' :
               c.category === 'pantry' ? 'var(--db-blue-600)' : 'var(--db-maroon-600)' }))
    : STOCK_CATS;
  // Map API watched rows -> the shape STOCK_WATCH expected.
  const CAT_COLOR = { meat:'var(--db-lava-600)', veggie:'var(--db-green-600)', bread_cheese:'var(--db-yellow-600)', pantry:'var(--db-blue-600)', beverage:'var(--db-maroon-600)' };
  const watched = liveWatched
    ? liveWatched.map(w => ({
        name: w.item_name,
        cat: (w.category || '').replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase()),
        onHand: w.on_hand_eod,
        par: w.reorder_point,
        daysCover: w.days_of_cover ?? 0,
        lead: w.lead_time_days ?? 2,
        history: [w.reorder_point, Math.round(w.reorder_point*0.85), Math.round(w.reorder_point*0.7), Math.round(w.reorder_point*0.55), Math.round(w.reorder_point*0.4), Math.round(w.reorder_point*0.25), w.on_hand_eod],
        color: CAT_COLOR[w.category] || 'var(--db-lava-600)',
      }))
    : STOCK_WATCH;
  const belowPar = health.below;
  const atRisk = watched.filter(i => i.daysCover <= i.lead).length;
  const valNow = STOCK_VALUE_TREND[STOCK_VALUE_TREND.length-1];
  return (
    <div style={{ flex:1, overflow:'auto', background:'var(--db-oat-light)' }}>
      <div style={{ padding:'28px 32px 44px', maxWidth:1040, margin:'0 auto' }}>
        <PageHead icon="inventory" title="Inventory" sub="Stock levels, days of cover and the reorders staged to keep you above par.">
          <Btn variant="ghost" icon="search">Browse all SKUs</Btn>
        </PageHead>

        {/* ===== bold health banner ===== */}
        <div style={{ background:'var(--db-navy-900)', borderRadius:18, padding:'26px 30px', position:'relative', overflow:'hidden', marginBottom:16 }}>
          <svg viewBox="0 0 24 24" width="300" height="300" fill="none" stroke="var(--db-navy-700)" strokeWidth="0.45" style={{ position:'absolute', right:-50, top:-70, opacity:0.5 }}><path d={PATHS.box} /></svg>
          <div style={{ display:'flex', gap:30, alignItems:'center', position:'relative', flexWrap:'wrap' }}>
            <StockRing atPar={health.atPar} total={health.total} />
            <div style={{ flex:1, minWidth:260 }}>
              <div className="db-eyebrow" style={{ color:'var(--db-lava-400)', fontSize:11.5, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase' }}>Stock health</div>
              <h2 style={{ fontSize:27, fontWeight:500, color:'#fff', letterSpacing:'-0.02em', margin:'8px 0 0', lineHeight:1.12 }}>
                {belowPar} items below par — <span style={{ color:'var(--db-lava-400)' }}>{atRisk} at stockout risk</span>
              </h2>
              <p style={{ fontSize:13.5, color:'var(--db-navy-300)', margin:'10px 0 0', maxWidth:440, lineHeight:1.5 }}>
                {health.atPar} of {health.total} SKUs are at or above par. Carnitas runs out before its next delivery — release the staged orders to recover.
              </p>
            </div>
            <div style={{ display:'flex', gap:26, paddingLeft:26, borderLeft:'1px solid var(--db-navy-700)' }}>
              <div>
                <div style={{ fontSize:11, color:'var(--db-navy-400)', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.06em' }}>On-hand value</div>
                <div style={{ fontSize:28, fontWeight:600, color:'#fff', letterSpacing:'-0.02em', margin:'5px 0 3px', fontFeatureSettings:'"tnum"' }}>${valNow}k</div>
                <Delta up={false} size={11.5}>−19% vs 8wk</Delta>
              </div>
            </div>
          </div>
        </div>

        {/* ===== chart row ===== */}
        <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:16, marginBottom:16 }}>
          <Card pad={20}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
              <div style={{ fontSize:14.5, fontWeight:500, color:'var(--db-navy-800)' }}>Days of cover</div>
              <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--db-gray-text)' }}>
                <span style={{ width:2, height:12, background:'var(--db-navy-800)', display:'inline-block' }} /> vendor lead time
              </div>
            </div>
            <div style={{ fontSize:12, color:'var(--db-gray-text)', marginBottom:4 }}>On-hand ÷ daily usage. Bars short of the lead-time marker run out before resupply.</div>
            <div>
              {watched.map((it, i) => <CoverRow key={it.name} item={it} last={i===watched.length-1} />)}
            </div>
          </Card>
          <Card pad={20}>
            <div style={{ fontSize:14.5, fontWeight:500, color:'var(--db-navy-800)', marginBottom:4 }}>Fill rate by category</div>
            <div style={{ fontSize:12, color:'var(--db-gray-text)', marginBottom:18 }}>On-hand as % of par</div>
            <CategoryFill cats={cats} />
          </Card>
        </div>

        <div style={{ marginBottom:18 }}>
          <AIRec tone="navy">
            <strong>Avocado</strong> is your tightest produce item — 3 cases against a par of 12, usage up 18% on the carnitas bowl. I bumped the suggested order to 10 cases so you don't 86 the guac this weekend. <strong>Carnitas</strong> and <strong>chicken</strong> are also below par.
          </AIRec>
        </div>

        <div style={{ display:'flex', alignItems:'center', marginBottom:12 }}>
          <h2 style={{ fontSize:16, fontWeight:500, color:'var(--db-navy-800)', margin:0 }}>Staged reorders</h2>
          <span style={{ marginLeft:10, fontSize:12, fontWeight:500, color: openCount?'var(--db-blue-700)':'var(--db-green-800)', background: openCount?'var(--db-blue-300)':'var(--db-green-300)', padding:'2px 9px', borderRadius:999 }}>{openCount || 'All released'}</span>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {reorders.map(po => (
            <POCard key={po.id} po={po} released={reordersReleased.has(po.id)} onRelease={(total) => releasePO(po.id, total)} />
          ))}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { InventoryView });
