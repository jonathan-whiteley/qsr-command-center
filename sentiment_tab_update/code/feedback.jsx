// Homebase app — Guest feedback module.

const Stars = ({ n, size = 14 }) => (
  <div style={{ display:'inline-flex', gap:1 }}>
    {[1,2,3,4,5].map(i => <Icon key={i} name="star" size={size} color={i<=n?'var(--db-yellow-600)':'var(--db-gray-lines)'} stroke={0} style={{ fill: i<=n?'var(--db-yellow-600)':'var(--db-gray-lines)' }} />)}
  </div>
);
const SENT = { pos:{ fg:'var(--db-green-800)', bg:'var(--db-green-300)', label:'Positive' }, neu:{ fg:'var(--db-yellow-800)', bg:'var(--db-yellow-300)', label:'Neutral' }, neg:{ fg:'var(--db-lava-700)', bg:'var(--db-lava-300)', label:'Needs care' } };

/* ============================ Sentiment timeline (stacked area) ============================ */
const SENT_FILL = { pos:'#34B98B', neu:'#C7CDD0', neg:'#FF8A78' };
const SENT_LINE = { pos:'#1F9E73', neu:'#A9B1B5', neg:'#F2664F' };

function splineCmds(pts) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i-1] || pts[i], p1 = pts[i], p2 = pts[i+1], p3 = pts[i+2] || pts[i+1];
    const c1x = p1[0] + (p2[0]-p0[0])/6, c1y = p1[1] + (p2[1]-p0[1])/6;
    const c2x = p2[0] - (p3[0]-p1[0])/6, c2y = p2[1] - (p3[1]-p1[1])/6;
    out.push(`C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`);
  }
  return out.join(' ');
}
const sLine = pts => `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)} ${splineCmds(pts)}`;
const sBand = (top, bot) => {
  const br = [...bot].reverse();
  return `${sLine(top)} L ${br[0][0].toFixed(1)} ${br[0][1].toFixed(1)} ${splineCmds(br)} Z`;
};

const SentimentTimeline = ({ data }) => {
  const ref = useRef(null);
  const [w, setW] = useState(936);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const fit = () => setW(el.clientWidth); fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 248, padL = 32, padB = 26, padT = 10, padR = 8;
  const plotW = w - padL - padR, plotH = H - padT - padB;
  const n = data.length;
  // Pick a max that fits the data, rounded up to a nice tick boundary.
  const peak = data.reduce((m,d) => Math.max(m, (d.pos||0) + (d.neu||0) + (d.neg||0)), 0);
  const step = peak <= 8 ? 2 : peak <= 20 ? 5 : peak <= 50 ? 10 : peak <= 100 ? 20 : 50;
  const max = Math.max(step, Math.ceil((peak * 1.1) / step) * step);
  const X = i => padL + (i/(n-1)) * plotW;
  const Y = v => padT + plotH - (v/max) * plotH;
  const base   = data.map((d,i) => [X(i), Y(0)]);
  const posTop = data.map((d,i) => [X(i), Y(d.pos)]);
  const neuTop = data.map((d,i) => [X(i), Y(d.pos + d.neu)]);
  const negTop = data.map((d,i) => [X(i), Y(d.pos + d.neu + d.neg)]);
  const ticks = [];
  for (let t = 0; t <= max; t += step) ticks.push(t);
  const xIdx = data.map((_,i) => i).filter(i => i % 4 === 0);

  return (
    <Card pad={20}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
        <div style={{ fontSize:11.5, fontWeight:600, color:'var(--db-gray-text)', textTransform:'uppercase', letterSpacing:'0.07em' }}>Sentiment timeline · last 30 days</div>
        <div style={{ display:'flex', alignItems:'center', gap:14, fontSize:11.5, color:'var(--db-gray-text)' }}>
          {[['pos','positive'],['neu','neutral'],['neg','negative']].map(([k,l]) => (
            <span key={k} style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
              <span style={{ width:9, height:9, borderRadius:2, background:SENT_FILL[k] }} />{l}
            </span>
          ))}
        </div>
      </div>
      <div ref={ref} style={{ width:'100%' }}>
        <svg width={w} height={H} style={{ display:'block' }}>
          {ticks.map(t => (
            <g key={t}>
              <line x1={padL} y1={Y(t)} x2={w-padR} y2={Y(t)} stroke="var(--db-gray-lines)" strokeWidth="1" opacity={t===0?1:0.6} />
              <text x={padL-8} y={Y(t)+3.5} textAnchor="end" fontSize="10" fill="var(--db-navy-400)" fontFamily="var(--font-mono)">{t}</text>
            </g>
          ))}
          <path d={sBand(posTop, base)}   fill={SENT_FILL.pos} fillOpacity="0.92" />
          <path d={sBand(neuTop, posTop)} fill={SENT_FILL.neu} fillOpacity="0.92" />
          <path d={sBand(negTop, neuTop)} fill={SENT_FILL.neg} fillOpacity="0.92" />
          <path d={sLine(posTop)} fill="none" stroke={SENT_LINE.pos} strokeWidth="1.5" />
          <path d={sLine(negTop)} fill="none" stroke={SENT_LINE.neg} strokeWidth="1.5" />
          {xIdx.map(i => (
            <text key={i} x={X(i)} y={H-9} textAnchor="middle" fontSize="10" fill="var(--db-navy-400)" fontFamily="var(--font-mono)">{data[i].date}</text>
          ))}
        </svg>
      </div>
    </Card>
  );
};

/* ============================ Sentiment heatmap (store x category) ============================ */
// Brand + diverging sentiment scale (validated poles: red #D6322C .. cream .. green #1F9E73)
const HM_CATS = [
  ['speed', 'Speed'], ['cleanliness', 'Cleanliness'], ['order_accuracy', 'Order Accuracy'],
  ['quality', 'Quality'], ['service', 'Service'],
];
const HM_NEG = [214, 50, 44], HM_MID = [241, 236, 224], HM_POS = [31, 158, 115];
const hmLerp = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const hmColor = (r) => {
  const t = Math.max(0, Math.min(1, (r - 1) / 4));
  const c = t < 0.5 ? hmLerp(HM_NEG, HM_MID, t / 0.5) : hmLerp(HM_MID, HM_POS, (t - 0.5) / 0.5);
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};
const hmInk = (r) => { const t = (r - 1) / 4; return (t > 0.32 && t < 0.72) ? '#4a463f' : '#fff'; };
const hmBucket = (r) => (r < 2.5 ? 'Negative' : r < 3.5 ? 'Mixed' : 'Positive');
// strip trailing ", ST" and city for a compact row label, keep full as address
const hmShortName = (full) => (full || '').split(',')[0];
const hmAddr = (full) => { const p = (full || '').split(','); return p.slice(1).join(',').trim(); };

const HM_ROW_H = 42, HM_ROW_GAP = 4, HM_VISIBLE = 10; // ~10 stores before scroll
const SentimentHeatmap = ({ rows }) => {
  const [tip, setTip] = useState(null);
  // sort: key='default' (worst→best, as returned), 'store', or a category key. dir='asc'|'desc'.
  const [sort, setSort] = useState({ key: 'default', dir: 'desc' });
  const move = (e, s, catKey, catLabel, v) => {
    setTip({
      x: e.clientX, y: e.clientY, store: hmShortName(s.location_name), addr: hmAddr(s.location_name),
      cat: catLabel, v, n: s.n, snippet: s.snippet,
    });
  };
  const clickHead = (key) => setSort(prev =>
    prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: key === 'store' ? 'asc' : 'asc' } // categories: worst (lowest) first
  );

  const sorted = (() => {
    if (sort.key === 'default') return rows;
    const list = [...rows];
    if (sort.key === 'store') {
      list.sort((a, b) => hmShortName(a.location_name).localeCompare(hmShortName(b.location_name)));
      return sort.dir === 'desc' ? list.reverse() : list;
    }
    // category: numeric, nulls (n<5) always sink to the bottom
    list.sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return sort.dir === 'asc' ? av - bv : bv - av;
    });
    return list;
  })();

  const arrow = (key) => sort.key === key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : '';
  const canvasMax = HM_VISIBLE * HM_ROW_H + (HM_VISIBLE - 1) * HM_ROW_GAP + 4;

  return (
    <Card pad={20} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--lce-black)' }}>Sentiment by store &amp; category</div>
        <span style={{ fontSize: 11.5, color: 'var(--db-gray-text)' }}>Avg category rating (1–5) · hover a cell · click a header to sort</span>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--db-gray-text)', margin: '0 0 12px' }}>
        {sort.key === 'default' ? 'Stores sorted worst → best. ' : ''}Red = negative, green = positive. Hatched = too few reviews to score. Scroll for all {rows.length} stores.
      </p>

      <div style={{ maxHeight: canvasMax, overflowY: 'auto', overflowX: 'hidden', paddingRight: 4 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '210px repeat(5, 1fr)', gap: HM_ROW_GAP, alignItems: 'center' }}>
          {/* sticky header row */}
          <div onClick={() => clickHead('store')}
            style={{ position: 'sticky', top: 0, zIndex: 2, background: '#fff', fontSize: 11.5, fontWeight: 600,
              color: sort.key === 'store' ? 'var(--lce-orange-dark)' : 'var(--db-gray-text)', paddingBottom: 8, cursor: 'pointer', userSelect: 'none' }}>
            Store{arrow('store')}
          </div>
          {HM_CATS.map(([k, l]) => (
            <div key={k} onClick={() => clickHead(k)}
              style={{ position: 'sticky', top: 0, zIndex: 2, background: '#fff', fontSize: 11.5, fontWeight: 600,
                color: sort.key === k ? 'var(--lce-orange-dark)' : 'var(--db-gray-text)', textAlign: 'center', paddingBottom: 8, cursor: 'pointer', userSelect: 'none' }}>
              {l}{arrow(k)}
            </div>
          ))}
          {sorted.map((s) => (
            <React.Fragment key={s.location_name}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--lce-black)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 8 }}>
                {hmShortName(s.location_name)}
                <span style={{ fontSize: 10.5, color: 'var(--db-gray-text)', fontWeight: 400 }}> · {hmAddr(s.location_name)}</span>
              </div>
              {HM_CATS.map(([k, l]) => {
                const v = s[k];
                if (v == null) {
                  return (
                    <div key={k} style={{ height: HM_ROW_H, borderRadius: 8, display: 'grid', placeItems: 'center', fontSize: 11, color: 'var(--db-gray-text)',
                      background: 'repeating-linear-gradient(45deg,#f4f1e9,#f4f1e9 6px,#eae5d8 6px,#eae5d8 12px)' }}>n&lt;5</div>
                  );
                }
                return (
                  <div key={k}
                    onMouseMove={(e) => move(e, s, k, l, v)} onMouseLeave={() => setTip(null)}
                    style={{ height: HM_ROW_H, borderRadius: 8, display: 'grid', placeItems: 'center', position: 'relative',
                      fontFamily: 'var(--font-mono)', fontSize: 14.5, fontWeight: 500, cursor: 'default',
                      background: hmColor(v), color: hmInk(v) }}>
                    {v.toFixed(1)}
                    <span style={{ position: 'absolute', right: 5, bottom: 2, fontSize: 8.5, opacity: 0.7 }}>n={s.n}</span>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, fontSize: 11.5, color: 'var(--db-gray-text)' }}>
        <span>Negative</span>
        <span style={{ display: 'flex', height: 11, width: 160, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--db-gray-lines)' }}>
          {Array.from({ length: 20 }).map((_, i) => <span key={i} style={{ flex: 1, background: hmColor(1 + (i / 19) * 4) }} />)}
        </span>
        <span>Positive</span>
        <span style={{ width: 12 }} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 15, height: 11, borderRadius: 3, border: '1px solid var(--db-gray-lines)',
            background: 'repeating-linear-gradient(45deg,#f4f1e9,#f4f1e9 4px,#eae5d8 4px,#eae5d8 8px)' }} />
          Insufficient data (n&lt;5)
        </span>
      </div>

      {tip && (
        <div style={{ position: 'fixed', left: Math.min(tip.x + 14, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 300),
          top: tip.y + 14, zIndex: 60, pointerEvents: 'none', background: 'var(--lce-black)', color: '#fff',
          borderRadius: 10, padding: '11px 13px', maxWidth: 280, boxShadow: '0 8px 30px rgba(0,0,0,.35)' }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 5 }}>{tip.store} · {tip.cat}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: '#cfc9bd', margin: '2px 0' }}>
            <span>Avg rating</span><b style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>{tip.v.toFixed(1)} / 5</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: '#cfc9bd', margin: '2px 0' }}>
            <span>Sentiment</span>
            <b style={{ color: tip.v < 2.5 ? '#FF8A78' : tip.v < 3.5 ? '#E0A21D' : '#34B98B' }}>{hmBucket(tip.v)}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: '#cfc9bd', margin: '2px 0' }}>
            <span>Reviews (store)</span><b style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>{tip.n}</b>
          </div>
          {tip.snippet && <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #333', color: '#e4dfd4', fontStyle: 'italic', lineHeight: 1.35, fontSize: 11.5 }}>“{tip.snippet}”</div>}
        </div>
      )}
    </Card>
  );
};

/* ============================ Product mentions (diverging sentiment bar) ============================ */
const PROD_NEG = '#D6322C', PROD_POS = '#1F9E73', PROD_NEU = '#C7CDD0';
const ProductSentiment = ({ rows }) => {
  const [tip, setTip] = useState(null);
  const HALF = 230; // px each side = 100%
  const maxMentions = Math.max(...rows.map(r => r.mentions), 1);
  const move = (e, r) => setTip({ x: e.clientX, y: e.clientY, r });
  return (
    <Card pad={20} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--lce-black)' }}>What guests talk about &amp; how they feel</div>
        <span style={{ fontSize: 11.5, color: 'var(--db-gray-text)' }}>Product mentions in reviews · negative ← → positive</span>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--db-gray-text)', margin: '0 0 18px' }}>
        Bar splits by sentiment; the number is how many reviews mention it. Core ingredients skew negative; specialty items skew positive.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: `120px ${HALF}px ${HALF}px 66px`, rowGap: 9, alignItems: 'center' }}>
        {/* header row: center axis labels */}
        <div />
        <div style={{ textAlign: 'right', fontSize: 10.5, color: 'var(--db-gray-text)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingRight: 6 }}>negative</div>
        <div style={{ textAlign: 'left', fontSize: 10.5, color: 'var(--db-gray-text)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: 6 }}>positive</div>
        <div style={{ textAlign: 'right', fontSize: 10.5, color: 'var(--db-gray-text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>reviews</div>

        {rows.map(r => {
          const negW = (r.pct_neg / 100) * HALF;
          const posW = (r.pct_pos / 100) * HALF;
          const vol = 0.4 + 0.6 * (r.mentions / maxMentions); // volume → opacity
          return (
            <React.Fragment key={r.product}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--lce-black)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.product}</div>
              {/* negative side (right-aligned, grows left) */}
              <div onMouseMove={e => move(e, r)} onMouseLeave={() => setTip(null)}
                style={{ height: 20, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', borderRight: '2px solid var(--db-navy-300)', cursor: 'default' }}>
                <div style={{ width: negW, height: '100%', background: PROD_NEG, opacity: vol, borderRadius: '5px 0 0 5px' }} />
              </div>
              {/* positive side (left-aligned, grows right) */}
              <div onMouseMove={e => move(e, r)} onMouseLeave={() => setTip(null)}
                style={{ height: 20, display: 'flex', justifyContent: 'flex-start', alignItems: 'center', cursor: 'default' }}>
                <div style={{ width: posW, height: '100%', background: PROD_POS, opacity: vol, borderRadius: '0 5px 5px 0' }} />
              </div>
              <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--db-navy-800)' }}>{r.mentions.toLocaleString()}</div>
            </React.Fragment>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16, fontSize: 11.5, color: 'var(--db-gray-text)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: PROD_NEG }} /> % negative</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: PROD_POS }} /> % positive</span>
        <span>· bar opacity ∝ mention volume</span>
      </div>

      {tip && (
        <div style={{ position: 'fixed', left: Math.min(tip.x + 14, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 300), top: tip.y + 14, zIndex: 60, pointerEvents: 'none', background: 'var(--lce-black)', color: '#fff', borderRadius: 10, padding: '11px 13px', maxWidth: 280, boxShadow: '0 8px 30px rgba(0,0,0,.35)' }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 5 }}>{tip.r.product}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: '#cfc9bd', margin: '2px 0' }}><span>Mentions</span><b style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>{tip.r.mentions.toLocaleString()}</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: '#cfc9bd', margin: '2px 0' }}><span>Negative</span><b style={{ color: '#FF8A78', fontFamily: 'var(--font-mono)' }}>{tip.r.pct_neg}%</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: '#cfc9bd', margin: '2px 0' }}><span>Positive</span><b style={{ color: '#34B98B', fontFamily: 'var(--font-mono)' }}>{tip.r.pct_pos}%</b></div>
          {tip.r.snippet && <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #333', color: '#e4dfd4', fontStyle: 'italic', lineHeight: 1.35, fontSize: 11.5 }}>“{tip.r.snippet}”</div>}
        </div>
      )}
    </Card>
  );
};

/* ============================ Review Theme Explorer (packed bubble cluster) ============================ */
// Ported from the Claude Design spec "Review Theme Explorer": products form
// color-grouped bubble clusters (size = mention volume, color = product); clicking a
// bubble drives a detail panel with mentions / avg rating / share + sample reviews with
// highlighted keywords. Wired to the live /theme-clusters data.
// Palette: design colors keyed to our extracted product concepts; [bg, text].
const TE_PALETTE = {
  'Pizza': ['#FF5F46', '#fff'], 'Pepperoni': ['#E65100', '#fff'], 'Cheese': ['#1B5162', '#fff'],
  'EMB': ['#C2185B', '#fff'], 'Crazy Bread': ['#FFAB00', '#1B3139'],
  'Italian Cheese Bread': ['#B5651D', '#fff'], 'Crazy Sauce': ['#7A5C8A', '#fff'],
  'Wings': ['#618794', '#fff'], 'Crazy Puffs': ['#00A972', '#fff'], 'Deep Dish': ['#98102A', '#fff'],
  'Stuffed Crust': ['#3B82C4', '#fff'],
};
const TE_FALLBACK = ['#FF5F46', '#FFAB00', '#618794', '#00A972', '#1B5162', '#98102A', '#E65100', '#7A5C8A', '#B5651D', '#3B82C4'];
const teColor = (product, idx) => TE_PALETTE[product] || [TE_FALLBACK[idx % TE_FALLBACK.length], '#fff'];
// Legible-but-compact bubbles: floor keeps small clusters labelable, ceiling keeps the
// whole set inside the field. A post-pass rescale (below) guarantees fit for any count.
const teRadius = (count, maxCount) => {
  const t = Math.sqrt(count) / Math.sqrt(maxCount || 1); // 0..1 by area
  return Math.round(22 + t * 36); // ~22px (smallest) .. 58px (largest)
};

// Product-clustered circle packing: each product's bubbles spiral-pack around its own
// centroid; centroids sit on a ring so groups stay together yet fill one blob. Returns
// bubble positions plus each product's cluster centroid (for the group label).
const tePackLayout = (products, clusters, W, H, maxCount) => {
  const cx = W / 2, cy = H / 2, nP = products.length, ringR = Math.min(W, H) * 0.27;
  const placed = [];
  const totals = products.map(p => clusters.filter(c => c.product === p).reduce((s, c) => s + c.count, 0));
  const order = products.map((_, pi) => pi).sort((a, b) => totals[b] - totals[a]);
  const centroids = {};
  order.forEach((pi, slot) => {
    const ang = -Math.PI / 2 + slot * 2 * Math.PI / nP;
    const ccx = cx + ringR * Math.cos(ang), ccy = cy + ringR * Math.sin(ang);
    const items = clusters.filter(c => c.product === products[pi])
      .map(c => ({ id: c.id, r: teRadius(c.count, maxCount) })).sort((a, b) => b.r - a.r);
    const group = [];
    for (const it of items) {
      let x = ccx, y = ccy, angle = 0, rad = 0;
      for (let i = 0; i < 9000; i++) {
        x = ccx + rad * Math.cos(angle); y = ccy + rad * Math.sin(angle);
        let ok = (x - it.r >= 2 && x + it.r <= W - 2 && y - it.r >= 24 && y + it.r <= H - 2);
        if (ok) { for (const p of placed) { if (Math.hypot(p.x - x, p.y - y) < p.r + it.r + 5) { ok = false; break; } } }
        if (ok) break;
        angle += 0.28; rad = 2.4 * angle / (2 * Math.PI) * 4;
      }
      it.x = x; it.y = y; placed.push(it); group.push(it);
    }
    // group label anchor: top-center of the cluster's bounding box
    if (group.length) {
      const minY = Math.min(...group.map(g => g.y - g.r));
      const gx = group.reduce((s, g) => s + g.x, 0) / group.length;
      centroids[products[pi]] = { x: gx, y: minY, product: products[pi] };
    }
  });
  // Fit-to-bounds: if anything spilled outside the field, uniformly scale positions +
  // radii around the field center so every bubble is guaranteed visible. Top inset
  // leaves room for the cluster-label pills that sit above each group.
  const TOP = 26;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  placed.forEach(p => { minX = Math.min(minX, p.x - p.r); maxX = Math.max(maxX, p.x + p.r); minY = Math.min(minY, p.y - p.r); maxY = Math.max(maxY, p.y + p.r); });
  const bw = maxX - minX, bh = maxY - minY;
  const scale = Math.min(1, (W - 4) / (bw || 1), (H - TOP - 4) / (bh || 1));
  if (scale < 1 || minX < 0 || maxX > W || minY < TOP || maxY > H) {
    const bcx = (minX + maxX) / 2, bcy = (minY + maxY) / 2;
    const tcx = W / 2, tcy = TOP + (H - TOP) / 2;
    placed.forEach(p => { p.x = tcx + (p.x - bcx) * scale; p.y = tcy + (p.y - bcy) * scale; p.r = p.r * scale; });
    Object.values(centroids).forEach(c => { c.x = tcx + (c.x - bcx) * scale; c.y = tcy + (c.y - bcy) * scale; });
  }
  const map = {}; placed.forEach(p => { map[p.id] = { x: p.x, y: p.y, r: p.r }; }); return { map, centroids };
};

// Split review text into highlighted / plain parts on the product name + attr keywords.
// WORD-BOUNDARY matched (mirrors the backend RLIKE) so "raw" won't light up inside
// "straw" and "dry" won't match "laundry".
const teEscapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const teBuildParts = (text, terms) => {
  const src = text || '';
  const cleaned = terms.flat().filter(Boolean).map(t => teEscapeRe(String(t).trim())).filter(Boolean);
  if (!cleaned.length) return [{ t: src, hi: false }];
  // \b around each alternative; case-insensitive, global.
  let re;
  try { re = new RegExp('\\b(' + cleaned.join('|') + ')\\b', 'gi'); }
  catch (e) { return [{ t: src, hi: false }]; }
  const ranges = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    if (m.index === re.lastIndex) re.lastIndex++; // guard against zero-width
    ranges.push([m.index, m.index + m[0].length]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const parts = []; let cur = 0;
  ranges.forEach(([s, e]) => { if (s < cur) return; if (s > cur) parts.push({ t: src.slice(cur, s), hi: false }); parts.push({ t: src.slice(s, e), hi: true }); cur = e; });
  if (cur < src.length) parts.push({ t: src.slice(cur), hi: false });
  return parts.length ? parts : [{ t: src, hi: false }];
};

const TE_W = 600, TE_H = 468;

const ThemeExplorer = ({ rows }) => {
  // Stable id + product ordering (by total volume, matching the packing order).
  const clusters = React.useMemo(() => rows.map((c, i) => ({ ...c, id: `${c.product}|${c.attr}|${i}` })), [rows]);
  const products = React.useMemo(() => {
    const tot = {};
    clusters.forEach(c => { tot[c.product] = (tot[c.product] || 0) + c.count; });
    return Object.keys(tot).sort((a, b) => tot[b] - tot[a]);
  }, [clusters]);
  const prodIdx = React.useMemo(() => { const m = {}; products.forEach((p, i) => { m[p] = i; }); return m; }, [products]);
  const prodTotals = React.useMemo(() => {
    const t = {}; clusters.forEach(c => { t[c.product] = (t[c.product] || 0) + c.count; }); return t;
  }, [clusters]);
  const maxCount = React.useMemo(() => Math.max(...clusters.map(c => c.count), 1), [clusters]);
  const { map: layout, centroids } = React.useMemo(
    () => tePackLayout(products, clusters, TE_W, TE_H, maxCount), [products, clusters, maxCount]);

  const biggest = clusters.reduce((a, b) => (b.count > a.count ? b : a), clusters[0]);
  const [selId, setSel] = useState(biggest ? biggest.id : null);
  const sel = clusters.find(c => c.id === selId) || biggest;

  const [color, txt] = sel ? teColor(sel.product, prodIdx[sel.product]) : ['#FF5F46', '#fff'];
  const tot = sel ? (prodTotals[sel.product] || sel.count) : 1;
  const share = sel ? Math.round((sel.count / tot) * 100) : 0;
  const worse = sel ? sel.trend >= 0 : true;
  const stars = (n) => { const k = Math.max(0, Math.min(5, Math.round(n || 0))); return '★'.repeat(k) + '☆'.repeat(5 - k); };

  return (
    <Card pad={0} style={{ overflow: 'hidden' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, padding: '20px 24px 16px', borderBottom: '1px solid var(--db-gray-lines)' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--lce-orange-dark)', marginBottom: 5 }}>Product Sentiment · Negative Themes</div>
          <div style={{ fontSize: 21, fontWeight: 700, color: 'var(--lce-black)', letterSpacing: '-0.01em' }}>What are unhappy customers actually saying?</div>
        </div>
        <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.5, color: 'var(--db-gray-text)', whiteSpace: 'nowrap', paddingTop: 4 }}>
          bubble size = mention volume<br />color = product
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        {/* bubble field + legend */}
        <div style={{ flex: 'none', width: TE_W + 40, padding: '16px 20px 12px', borderRight: '1px solid var(--db-gray-lines)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ position: 'relative', width: TE_W, height: TE_H, margin: '0 auto' }}>
            {/* Product name is conveyed by bubble color (see legend below); no on-canvas
                cluster labels. */}
            {clusters.map(c => {
              const L = layout[c.id]; if (!L) return null;
              const [bg, fg] = teColor(c.product, prodIdx[c.product]);
              const isSel = c.id === selId; const r = L.r;
              // Font scales with radius; count hidden on the smallest bubbles so the label fits.
              const fs = Math.max(8.5, Math.min(15, Math.round(r * 0.32)));
              const showCount = r >= 24;
              return (
                <div key={c.id} onClick={() => setSel(c.id)}
                  title={`${c.product} — ${c.attr.toLowerCase()} · ${c.count} mentions`}
                  style={{ position: 'absolute', left: (L.x - r) + 'px', top: (L.y - r) + 'px', width: (2 * r) + 'px', height: (2 * r) + 'px',
                    borderRadius: '50%', background: bg, color: fg, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', cursor: 'pointer', textAlign: 'center', boxSizing: 'border-box',
                    border: '2px solid rgba(255,255,255,.7)', padding: 2, overflow: 'hidden',
                    fontSize: fs, lineHeight: 1.05, zIndex: isSel ? 20 : 1,
                    boxShadow: isSel ? `0 0 0 3px #fff, 0 0 0 6px ${bg}, 0 6px 16px rgba(27,49,57,.28)` : '0 2px 7px rgba(27,49,57,.18)',
                    transition: 'transform .15s ease, box-shadow .15s ease, filter .15s ease' }}>
                  <div style={{ fontWeight: 700, whiteSpace: 'normal', overflowWrap: 'break-word', maxWidth: '100%' }}>{c.attr}</div>
                  {showCount && <div style={{ fontWeight: 500, fontSize: Math.max(8, fs - 3), opacity: 0.85, marginTop: 2 }}>{c.count}</div>}
                </div>
              );
            })}
          </div>
          {/* legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px 16px', padding: '12px 4px 2px', borderTop: '1px solid var(--db-gray-lines)', marginTop: 10 }}>
            {products.map((p, i) => {
              const [bg] = teColor(p, i);
              return (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: 'var(--lce-black)' }}>
                  <span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: bg, flex: 'none' }} />
                  {p}<span style={{ color: 'var(--db-gray-text)', fontWeight: 400 }}>{prodTotals[p]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* detail panel */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--db-oat-light)' }}>
          {sel && (
            <React.Fragment>
              <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid var(--db-gray-lines)', background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: color, flex: 'none' }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--lce-black)' }}>{sel.product}</span>
                  <span style={{ fontSize: 13, color: 'var(--db-gray-text)' }}>·</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--db-navy-800)' }}>{sel.attr}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 999, marginLeft: 2,
                    background: worse ? 'var(--db-lava-300)' : 'var(--db-green-300)', color: worse ? 'var(--db-maroon-700)' : 'var(--db-green-800)' }}>
                    {worse ? '▲ ' : '▼ '}{Math.abs(sel.trend)}% vs prior
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 12 }}>
                  <div>
                    <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, color: 'var(--lce-orange-dark)' }}>{sel.count}</div>
                    <div style={{ fontSize: 11, color: 'var(--db-gray-text)', marginTop: 3 }}>mentions</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, color: 'var(--db-navy-800)' }}>{sel.avg != null ? sel.avg.toFixed(1) : '—'}<span style={{ fontSize: 14, color: 'var(--db-yellow-600)' }}> ★</span></div>
                    <div style={{ fontSize: 11, color: 'var(--db-gray-text)', marginTop: 3 }}>avg rating</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--db-gray-text)', marginBottom: 4 }}>{share}% of {sel.product} complaints</div>
                    <div style={{ height: 7, background: 'var(--db-oat-medium)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: share + '%', background: color, borderRadius: 999 }} />
                    </div>
                  </div>
                </div>
              </div>
              {/* sample reviews */}
              <div style={{ padding: '6px 16px 14px', overflowY: 'auto', maxHeight: 420 }}>
                {(sel.samples && sel.samples.length) ? sel.samples.map((s, i) => {
                  const parts = teBuildParts(s.text, [sel.product, ...(sel.keywords || [])]);
                  return (
                    <div key={i} style={{ background: '#fff', border: '1px solid var(--db-gray-lines)', borderRadius: 8, padding: '12px 13px', marginTop: 10, boxShadow: '0 1px 2px rgba(0,0,0,.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 7 }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--db-yellow-600)', letterSpacing: 1 }}>{stars(s.rating)}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--db-gray-text)' }}>{(s.location_name || '').split(',')[0]} · {s.date}</div>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--db-navy-800)' }}>
                        {parts.map((pt, j) => pt.hi
                          ? <mark key={j} style={{ background: 'var(--db-lava-300)', color: 'var(--db-maroon-700)', fontWeight: 600, padding: '0 2px', borderRadius: 3 }}>{pt.t}</mark>
                          : <span key={j}>{pt.t}</span>)}
                      </p>
                    </div>
                  );
                }) : <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12.5, color: 'var(--db-gray-text)' }}>No sample reviews available.</div>}
                <div style={{ textAlign: 'center', padding: '14px 0 4px', fontSize: 11.5, fontWeight: 500, color: 'var(--db-gray-text)' }}>
                  Showing {Math.min(sel.samples ? sel.samples.length : 0, 4)} of {sel.count} reviews in this cluster
                </div>
              </div>
            </React.Fragment>
          )}
        </div>
      </div>
    </Card>
  );
};

/* ============================ State filter dropdown ============================ */
const StateFilter = ({ states, value, onChange }) => (
  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#fff', border: '1px solid var(--db-gray-lines)', borderRadius: 10, padding: '7px 12px', fontSize: 13, color: 'var(--db-gray-text)', cursor: 'pointer' }}>
    <Icon name="pin" size={14} color="var(--db-gray-text)" />
    State:
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ border: 0, background: 'transparent', font: '600 13px var(--font-sans)', color: 'var(--lce-black)', cursor: 'pointer', outline: 'none' }}>
      <option value="all">All states</option>
      {states.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  </label>
);

/* ============================ Review detail table ============================ */
const SENT_CHIP = {
  Positive: { fg: 'var(--db-green-800)', bg: 'var(--db-green-300)' },
  Negative: { fg: 'var(--db-lava-700)', bg: 'var(--db-lava-300)' },
  Mixed: { fg: 'var(--db-yellow-800)', bg: 'var(--db-yellow-300)' },
  Neutral: { fg: 'var(--db-navy-700)', bg: 'var(--db-oat-medium)' },
};
const shortStore = (full) => (full || '').split(',')[0];
const ReviewTable = ({ rows }) => {
  const [sortKey, setSortKey] = useState('date');
  const [asc, setAsc] = useState(false);
  const sorted = [...rows].sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey];
    if (sortKey === 'rating') { av = av ?? -1; bv = bv ?? -1; }
    else { av = String(av || ''); bv = String(bv || ''); }
    const c = av < bv ? -1 : av > bv ? 1 : 0;
    return asc ? c : -c;
  });
  const th = (key, label, align) => (
    <th onClick={() => { if (sortKey === key) setAsc(!asc); else { setSortKey(key); setAsc(false); } }}
      style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-gray-text)', fontWeight: 600, textAlign: align || 'left', padding: '9px 12px', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}>
      {label}{sortKey === key ? (asc ? ' ↑' : ' ↓') : ''}
    </th>
  );
  return (
    <Card pad={0} style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '18px 20px 10px' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--lce-black)', margin: 0 }}>Review detail</h2>
        <span style={{ fontSize: 11.5, color: 'var(--db-gray-text)' }}>{rows.length.toLocaleString()} reviews · click a column to sort</span>
      </div>
      <div style={{ maxHeight: 560, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ position: 'sticky', top: 0, background: '#fff', boxShadow: '0 1px 0 var(--db-gray-lines)' }}>
            <tr>{th('location_name', 'Store')}{th('date', 'Date')}{th('rating', 'Rating', 'right')}{th('categories', 'Categories')}{th('sentiment', 'Sentiment')}<th style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-gray-text)', fontWeight: 600, textAlign: 'left', padding: '9px 12px' }}>Comment</th></tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const c = SENT_CHIP[r.sentiment] || SENT_CHIP.Neutral;
              return (
                <tr key={i} style={{ borderTop: '1px solid var(--db-gray-lines)' }}>
                  <td style={{ padding: '9px 12px', color: 'var(--lce-black)', whiteSpace: 'nowrap' }}>{shortStore(r.location_name)}</td>
                  <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', color: 'var(--db-gray-text)', whiteSpace: 'nowrap' }}>{r.date}</td>
                  <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', textAlign: 'right', color: 'var(--db-navy-800)' }}>{r.rating != null ? r.rating + '★' : '—'}</td>
                  <td style={{ padding: '9px 12px', color: 'var(--db-gray-text)', maxWidth: 200 }}>{r.categories && r.categories.length ? r.categories.join(', ') : '—'}</td>
                  <td style={{ padding: '9px 12px' }}><span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 999, color: c.fg, background: c.bg, whiteSpace: 'nowrap' }}>{r.sentiment}</span></td>
                  <td style={{ padding: '9px 12px', color: 'var(--db-navy-800)', minWidth: 280 }}>{r.comment || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

const ReviewCard = ({ rv, replied, onReply }) => {
  const [draft, setDraft] = useState(rv.aiDraft);
  const [editing, setEditing] = useState(false);
  const s = SENT[rv.sentiment];
  return (
    <Card pad={0} style={{ overflow:'hidden' }}>
      <div style={{ padding:'16px 18px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:999, background:'var(--db-oat-medium)', color:'var(--db-navy-800)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12.5, fontWeight:600, flexShrink:0 }}>{rv.initials}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:9 }}>
              <span style={{ fontSize:13.5, fontWeight:500, color:'var(--db-navy-800)' }}>{rv.author}</span>
              <Stars n={rv.rating} />
            </div>
            <div style={{ fontSize:11.5, color:'var(--db-gray-text)', marginTop:1 }}>{rv.channel} · {rv.time}</div>
          </div>
          <span style={{ fontSize:11, fontWeight:500, padding:'3px 9px', borderRadius:999, color:s.fg, background:s.bg }}>{s.label}</span>
        </div>
        <p style={{ fontSize:13.5, color:'var(--db-navy-800)', lineHeight:1.55, margin:'12px 0 0' }}>{rv.text}</p>
      </div>

      {replied ? (
        <div style={{ borderTop:'1px solid var(--db-gray-lines)', padding:'14px 18px', background:'var(--db-oat-light)', display:'flex', gap:11 }}>
          <Icon name="reply" size={16} color="var(--db-green-700)" style={{ marginTop:2, flexShrink:0 }} />
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11.5, fontWeight:600, color:'var(--db-green-800)', marginBottom:3 }}>Your reply · sent</div>
            <div style={{ fontSize:13, color:'var(--db-navy-800)', lineHeight:1.5 }}>{draft}</div>
            <div style={{ marginTop:6 }}><LakebaseTag table="review_replies" /></div>
          </div>
        </div>
      ) : rv.needsReply ? (
        <div style={{ borderTop:'1px solid var(--db-gray-lines)', padding:'14px 18px', background:'var(--db-oat-light)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:9 }}>
            <Icon name="spark" size={14} color="var(--db-lava-600)" />
            <span style={{ fontSize:11.5, fontWeight:600, color:'var(--db-lava-700)', textTransform:'uppercase', letterSpacing:'0.05em' }}>AI-drafted reply</span>
            <span style={{ fontSize:11, color:'var(--db-gray-text)' }}>· matched to your brand voice, edit before sending</span>
          </div>
          {editing ? (
            <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={4} className="hb-textarea" style={{ width:'100%', boxSizing:'border-box', border:'1px solid var(--db-navy-300)', borderRadius:9, padding:'11px 13px', font:'400 13px/1.55 var(--font-sans)', color:'var(--db-navy-800)', resize:'vertical', outline:'none', background:'#fff' }} />
          ) : (
            <div onClick={() => setEditing(true)} style={{ background:'#fff', border:'1px solid var(--db-gray-lines)', borderRadius:9, padding:'11px 13px', fontSize:13, color:'var(--db-navy-800)', lineHeight:1.55, cursor:'text' }}>{draft}</div>
          )}
          <div style={{ display:'flex', alignItems:'center', gap:9, marginTop:11 }}>
            <Btn size="sm" variant="primary" icon="send" onClick={() => onReply(draft)}>Send reply</Btn>
            <Btn size="sm" variant="ghost" icon="edit" onClick={() => setEditing(e => !e)}>{editing?'Done editing':'Edit'}</Btn>
            <Btn size="sm" variant="quiet" icon="refresh" onClick={() => setDraft(rv.aiDraft)}>Regenerate</Btn>
          </div>
        </div>
      ) : null}
    </Card>
  );
};

const FeedbackView = () => {
  const [view, setView] = useState('heatmap'); // 'heatmap' | 'themes' | 'table'
  const [state, setState] = useState('all');

  const [states, setStates] = useState([]);
  const [summary, setSummary] = useState(null);
  const [liveTimeline, setLiveTimeline] = useState(null);
  const [liveReviews, setLiveReviews] = useState(null);
  const [liveStoreCat, setLiveStoreCat] = useState(null);
  const [liveProducts, setLiveProducts] = useState(null);
  const [liveClusters, setLiveClusters] = useState(null);

  // States list is fetched once.
  useEffect(() => {
    fetch('/api/feedback/states', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null).then(d => setStates(d || [])).catch(() => {});
  }, []);

  // Everything else refetches when the state filter changes.
  useEffect(() => {
    const q = state && state !== 'all' ? `?state=${encodeURIComponent(state)}` : '';
    const qAmp = q ? `${q}&` : '?';
    setSummary(null); setLiveStoreCat(null); setLiveProducts(null); setLiveTimeline(null); setLiveReviews(null); setLiveClusters(null);
    fetch(`/api/feedback/summary${q}`, { credentials: 'include' }).then(r => r.ok ? r.json() : null).then(setSummary).catch(() => {});
    fetch(`/api/feedback/store-category${qAmp}min_n=5`, { credentials: 'include' }).then(r => r.ok ? r.json() : null).then(setLiveStoreCat).catch(() => {});
    fetch(`/api/feedback/products${q}`, { credentials: 'include' }).then(r => r.ok ? r.json() : null).then(setLiveProducts).catch(() => {});
    fetch(`/api/feedback/theme-clusters${qAmp}min_n=5`, { credentials: 'include' }).then(r => r.ok ? r.json() : null).then(setLiveClusters).catch(() => {});
    fetch(`/api/feedback/sentiment-timeline${q}`, { credentials: 'include' }).then(r => r.ok ? r.json() : null).then(setLiveTimeline).catch(() => {});
    fetch(`/api/feedback/reviews${qAmp}limit=300`, { credentials: 'include' }).then(r => r.ok ? r.json() : null).then(setLiveReviews).catch(() => {});
  }, [state]);

  const storeCat = Array.isArray(liveStoreCat) ? liveStoreCat : null;
  const products = Array.isArray(liveProducts) ? liveProducts : null;
  const clusters = Array.isArray(liveClusters) ? liveClusters : null;
  const reviews = Array.isArray(liveReviews) ? liveReviews : null;
  const sentimentRows = liveTimeline ? liveTimeline.map(d => ({ date: d.date.slice(5), pos: d.pos, neu: d.neu, neg: d.neg })) : null;

  const Toggle = () => (
    <span style={{ display: 'inline-flex', background: 'var(--db-oat-medium)', borderRadius: 10, padding: 3, gap: 2 }}>
      {[['heatmap', 'Heatmap'], ['themes', 'Themes'], ['table', 'Table']].map(([k, l]) => (
        <button key={k} onClick={() => setView(k)}
          style={{ border: 0, background: view === k ? '#fff' : 'transparent', color: view === k ? 'var(--lce-black)' : 'var(--db-gray-text)',
            font: '600 13px var(--font-sans)', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', boxShadow: view === k ? '0 1px 2px rgba(0,0,0,.08)' : 'none' }}>{l}</button>
      ))}
    </span>
  );

  return (
    <div style={{ flex:1, overflow:'auto', background:'var(--db-oat-light)' }}>
      <div style={{ padding:'28px 32px 40px', maxWidth:1000, margin:'0 auto' }}>
        <PageHead icon="feedback" title="Guest Sentiment" sub="Google reviews across every location — sentiment by store, category and product, with the stores that need attention surfaced first." />

        {/* filter + view toggle row */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
          <StateFilter states={states} value={state} onChange={setState} />
          {summary && <span style={{ fontSize:12.5, color:'var(--db-gray-text)' }}>{summary.total_reviews.toLocaleString()} reviews · {summary.stores} stores</span>}
          <span style={{ flex:1 }} />
          <Toggle />
        </div>

        {/* KPIs — sentiment-only, from /summary */}
        <div style={{ display:'flex', gap:12, marginBottom:18 }}>
          <LaborStat label="Avg rating" value={summary?.avg_rating != null ? summary.avg_rating.toFixed(1) + '★' : '—'} foot={summary ? `${summary.total_reviews.toLocaleString()} reviews` : ' '} />
          <LaborStat label="Negative reviews" value={summary ? summary.pct_neg + '%' : '—'} foot={<span style={{ color:'var(--db-lava-700)' }}>of all reviews</span>} />
          <LaborStat label="Weakest category" value={<span style={{ color:'var(--db-lava-700)', fontSize:18 }}>{summary?.weakest_category || '—'}</span>} foot={summary?.weakest_avg != null ? `${summary.weakest_avg.toFixed(1)} avg` : ' '} />
          <LaborStat label="Strongest category" value={<span style={{ color:'var(--db-green-700)', fontSize:18 }}>{summary?.strongest_category || '—'}</span>} foot={summary?.strongest_avg != null ? `${summary.strongest_avg.toFixed(1)} avg` : ' '} />
          <LaborStat label="Stores" value={summary ? String(summary.stores) : '—'} foot={state !== 'all' ? state : 'all states'} />
        </div>

        {view === 'heatmap' && (
          <React.Fragment>
            {/* Heatmap */}
            {storeCat && storeCat.length > 0 ? (
              <div style={{ marginBottom:18 }}><SentimentHeatmap rows={storeCat} /></div>
            ) : (
              <Card pad={28} style={{ marginBottom:18, textAlign:'center', color:'var(--db-gray-text)', fontSize:13.5 }}>Loading store × category…</Card>
            )}
            {/* Product mentions viz */}
            {products && products.length > 0 && (
              <div style={{ marginBottom:18 }}><ProductSentiment rows={products} /></div>
            )}
          </React.Fragment>
        )}

        {view === 'themes' && (
          // Break out wider than the 1000px content column so the bubble field and the
          // review panel both get room. Clamps on narrow viewports.
          <div style={{ width:'min(1180px, calc(100vw - 96px))', marginLeft:'calc((100% - min(1180px, calc(100vw - 96px))) / 2)', marginBottom:18 }}>
            {clusters ? (
              clusters.length > 0 ? (
                <ThemeExplorer rows={clusters} />
              ) : (
                <Card pad={28} style={{ textAlign:'center', color:'var(--db-gray-text)', fontSize:13.5 }}>No product-linked complaint themes for this filter.</Card>
              )
            ) : (
              <Card pad={28} style={{ textAlign:'center', color:'var(--db-gray-text)', fontSize:13.5 }}>Loading themes…</Card>
            )}
          </div>
        )}

        {view === 'table' && (
          <React.Fragment>
            {/* Sentiment timeline sits above the review table */}
            {sentimentRows && sentimentRows.length > 0 && (
              <div style={{ marginBottom:18 }}><SentimentTimeline data={sentimentRows} /></div>
            )}
            {/* Review table */}
            {reviews ? (
              <div style={{ marginBottom:18 }}><ReviewTable rows={reviews} /></div>
            ) : (
              <Card pad={28} style={{ marginBottom:18, textAlign:'center', color:'var(--db-gray-text)', fontSize:13.5 }}>Loading reviews…</Card>
            )}
          </React.Fragment>
        )}
      </div>
    </div>
  );
};

Object.assign(window, { FeedbackView });
