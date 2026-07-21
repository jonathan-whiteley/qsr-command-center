// QSR Command Center — Ask (Genie) slide-over panel + canned responder.

/* Bars viz used inside Genie answers */
const GenieBars = ({ rows, accent = 'var(--db-lava-600)' }) => {
  const max = Math.max(...rows.map(r => r[1]));
  return (
    <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:8 }}>
      {rows.map(([label, val, disp]) => (
        <div key={label} style={{ display:'grid', gridTemplateColumns:'92px 1fr 52px', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:11.5, color:'var(--db-gray-text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{label}</span>
          <div style={{ height:18, background:'var(--db-oat-medium)', borderRadius:4, overflow:'hidden' }}>
            <div style={{ width:`${(val/max)*100}%`, height:'100%', background:accent, borderRadius:4 }} />
          </div>
          <span style={{ fontSize:11.5, fontFamily:'var(--font-mono)', color:'var(--db-navy-800)', textAlign:'right' }}>{disp}</span>
        </div>
      ))}
    </div>
  );
};

/* Canned response generator */
function genieReply(q) {
  const t = q.toLowerCase();
  const m = (...ks) => ks.some(k => t.includes(k));
  if (m('prep','sell','busy','forecast','today','make extra','86'))
    return { text: <span>Today's forecast is <strong>$16,400</strong> (91% confidence), ~11% over last Friday with sun and a Giants day game nearby. Prep heavier on the lunch winners — and you're low on avocado, so guac will be tight until tomorrow's delivery.</span>,
      viz:{ title:'Suggested extra prep vs. a normal Friday', rows:[['Carnitas','+22','+22%'],['Chicken','+9','+9%'],['Agua fresca','+15','+15%'],['Guac','-','86 risk']] }, source:'main.sales.forecast_daily · weather_join' };
  if (m('labor','staff','overtime','ot','schedule','hours'))
    return { text: <span>Labor ran <strong>24.8%</strong> of sales this week — <strong style={{color:'var(--db-green-700)'}}>1.2pts under</strong> your 26% target. Thursday drove most of it (Devon's 1.2h OT covering a grill no-show). Tuesday dinner looks over-staffed against forecast — trimming one closer saves ~$120/wk.</span>,
      viz:{ title:'Planned vs. forecast hours, this week', rows:[['Thu',33,'33h'],['Fri',38,'38h'],['Sat',42,'42h'],['Tue',34,'34h ⚠']] }, source:'main.labor.timecards · main.sales.forecast' };
  if (m('cooler','equipment','fridge','temp','warm','broken','fix'))
    return { text: <span>Walk-in cooler #2 has drifted from 38°F to <strong style={{color:'var(--db-lava-700)'}}>42°F over the last 36 hours</strong> — likely a failing door gasket or condenser. It's still in CoolTech warranty. I'd book service today before the weekend; product risk starts above 41°F.</span>,
      viz:{ title:'Cooler #2 temperature (°F, last 36h)', rows:[['Start',37,'37°'],['+12h',39,'39°'],['+24h',41,'41°'],['Now',42,'42° ⚠']] }, source:'main.iot.fridge_telemetry' };
  if (m('guac','avocado','stock','reorder','order','par','inventory','out of'))
    return { text: <span>Avocados are at <strong>3 cases on hand vs a par of 12</strong>, and usage is up 18%. Bay Produce can deliver tomorrow at 6a — that PO is staged and ready. Carnitas and chicken are also below par on the Golden Gate order.</span>,
      viz:{ title:'Below par — top items', rows:[['Avocado',9,'3/12'],['Carnitas',4,'1/5'],['Chicken',6,'2/8'],['Romaine',9,'5/14']] }, source:'main.inventory.on_hand · usage_30d' };
  if (m('member','win','lapse','loyal','reward','churn','retention'))
    return { text: <span><strong>184 regulars</strong> who used to come 4+ times a month haven't visited in 21 days. A <strong>$5-off-$15</strong> offer is the model's best bet — projected ~46 recovered visits, roughly <strong>$520</strong> in the next two weeks.</span>,
      viz:{ title:'Projected recovered visits by offer', rows:[['$5 off $15',46,'46'],['Free side',38,'38'],['2× points',29,'29']] }, source:'main.loyalty.members · propensity_model' };
  if (m('review','feedback','guest','rating','complaint','nps','star'))
    return { text: <span>You're at <strong>4.3★</strong> with NPS 41. Two reviews need a reply. The rising theme this week is <strong>pickup wait times</strong> (7 mentions, up) — tied to the mobile-order station on Friday lunch. Guac stockouts are the #2 gripe.</span>,
      viz:{ title:'Feedback themes this week', rows:[['Friendly staff',12,'+12'],['Food fresh',9,'9'],['Pickup wait',7,'7 ↑'],['Guac out',4,'4 ↑']] }, source:'main.feedback.reviews · topic_model' };
  if (m('sales','revenue','yesterday','money','ticket','aov'))
    return { text: <span>Yesterday closed at <strong>$14,820</strong>, up <strong style={{color:'var(--db-green-700)'}}>6.2%</strong> on 612 guests. Lunch was 54% of the day. Carnitas bowl led with 142 units.</span>,
      viz:{ title:'Revenue by daypart, yesterday', rows:[['Lunch',54,'$7.9k'],['Dinner',19,'$2.8k'],['Breakfast',14,'$2.1k'],['Afternoon',13,'$1.9k']] }, source:'main.sales.orders' };
  return { text: <span>I can pull from your sales, labor, inventory, equipment telemetry, loyalty and guest-feedback tables. Try asking about today's prep, why labor moved, the walk-in cooler, what to reorder, lapsing members, or guest reviews.</span> };
}

const SUGGESTIONS = [
  'What products get the most complaints?',
  'Which stores have the most negative reviews?',
  'How has sentiment trended over the last 3 months?',
  'Show cleanliness ratings by state.',
  'What is the average rating by category across all stores?',
];

/* Render the LIGHT markdown Genie returns: **bold**, • bullets, blank-line paragraphs.
   Doesn't try to be a general markdown parser — Genie's response shape is narrow. */
const renderInline = (text) => {
  const parts = [];
  let i = 0;
  const re = /\*\*([^*]+)\*\*/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > i) parts.push(text.slice(i, m.index));
    parts.push(<strong key={parts.length}>{m[1]}</strong>);
    i = m.index + m[0].length;
  }
  if (i < text.length) parts.push(text.slice(i));
  return parts;
};
const GenieText = ({ text }) => {
  if (!text) return null;
  const blocks = text.split(/\n{2,}/);
  return (
    <div style={{ fontSize:13.5, lineHeight:1.55, color:'var(--db-navy-800)', whiteSpace:'pre-wrap' }}>
      {blocks.map((block, bi) => {
        const lines = block.split('\n');
        const bullets = lines.every(l => /^\s*[•\-*]\s+/.test(l));
        if (bullets) {
          return (
            <ul key={bi} style={{ margin:bi === 0 ? '0 0 0 0' : '8px 0 0 0', paddingLeft:18, listStyle:'disc' }}>
              {lines.map((l, li) => (
                <li key={li} style={{ marginBottom:4 }}>{renderInline(l.replace(/^\s*[•\-*]\s+/, ''))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={bi} style={{ margin:bi === 0 ? 0 : '8px 0 0 0' }}>{renderInline(block)}</p>
        );
      })}
    </div>
  );
};

const GeniePanel = () => {
  const { genieOpen, closeGenie, genieMsgs, askGenie, store } = useApp();
  const scrollRef = useRef(null);
  const [draft, setDraft] = useState('');
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [genieMsgs, genieOpen]);
  const submit = (text) => { const v = (text ?? draft).trim(); if (!v) return; askGenie(v); setDraft(''); };
  return (
    <React.Fragment>
      <div onClick={closeGenie} style={{ position:'fixed', inset:0, background:'rgba(11,32,38,0.4)', opacity:genieOpen?1:0, pointerEvents:genieOpen?'auto':'none', transition:'opacity var(--dur-base) var(--ease-out)', zIndex:140 }} />
      <aside style={{ position:'fixed', top:0, right:0, bottom:0, width:436, background:'var(--db-oat-light)', boxShadow:'var(--shadow-xl)', zIndex:150, display:'flex', flexDirection:'column', transform:genieOpen?'translateX(0)':'translateX(100%)', transition:'transform var(--dur-slow) var(--ease-out)' }}>
        {/* header */}
        <div style={{ background:'var(--db-navy-900)', padding:'16px 20px', display:'flex', alignItems:'center', gap:11, flexShrink:0 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'var(--db-lava-600)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="spark" size={18} color="#fff" />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14.5, fontWeight:600, color:'#fff' }}>Ask Genie</div>
            <div style={{ fontSize:11.5, color:'var(--db-navy-400)' }}>Genie · grounded in {store.num} data</div>
          </div>
          <button onClick={closeGenie} className="hb-iconbtn" style={{ background:'transparent', border:0, cursor:'pointer', display:'flex', padding:6 }}><Icon name="x" size={18} color="var(--db-navy-300)" /></button>
        </div>
        {/* messages */}
        <div ref={scrollRef} style={{ flex:1, overflow:'auto', padding:'20px' }}>
          {genieMsgs.map((msg, i) => (
            msg.from === 'user' ? (
              <div key={i} style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
                <div style={{ background:'var(--db-navy-800)', color:'#fff', padding:'10px 14px', borderRadius:'12px 12px 3px 12px', fontSize:13.5, lineHeight:1.5, maxWidth:300 }}>{msg.text}</div>
              </div>
            ) : (
              <div key={i} style={{ display:'flex', gap:10, marginBottom:18 }}>
                <div style={{ width:26, height:26, borderRadius:7, background:'var(--db-lava-600)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}><Icon name="spark" size={14} color="#fff" /></div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ background:'#fff', border:'1px solid var(--db-gray-lines)', borderRadius:'3px 12px 12px 12px', padding:'12px 14px' }}>
                    {msg.loading ? <span className="hb-dots" style={{ color:'var(--db-navy-400)', fontSize:18, letterSpacing:2 }}>•••</span> : (
                      <React.Fragment>
                        {typeof msg.text === 'string' ? <GenieText text={msg.text} /> : <div style={{ fontSize:13.5, lineHeight:1.55, color:'var(--db-navy-800)' }}>{msg.text}</div>}
                        {msg.viz && (
                          <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid var(--db-gray-lines)' }}>
                            <div style={{ fontSize:11, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--db-gray-text)' }}>{msg.viz.title}</div>
                            <GenieBars rows={msg.viz.rows} />
                          </div>
                        )}
                        {msg.source && <div style={{ marginTop:10, fontSize:10.5, fontFamily:'var(--font-mono)', color:'var(--db-navy-400)', display:'flex', alignItems:'center', gap:5 }}><Icon name="inventory" size={12} color="var(--db-navy-400)" />{msg.source}</div>}
                      </React.Fragment>
                    )}
                  </div>
                </div>
              </div>
            )
          ))}
          {/* suggestions */}
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:4 }}>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => submit(s)} className="hb-suggest" style={{ textAlign:'left', background:'#fff', border:'1px solid var(--db-gray-lines)', borderRadius:10, padding:'10px 13px', fontSize:13, color:'var(--db-navy-800)', cursor:'pointer', display:'flex', alignItems:'center', gap:9 }}>
                <Icon name="spark" size={14} color="var(--db-lava-600)" /> {s}
              </button>
            ))}
          </div>
        </div>
        {/* input */}
        <div style={{ padding:16, borderTop:'1px solid var(--db-gray-lines)', background:'#fff', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--db-oat-light)', border:'1px solid var(--db-gray-lines)', borderRadius:10, padding:'5px 5px 5px 14px' }}>
            <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key==='Enter' && submit()} placeholder="Ask about your store…" style={{ flex:1, border:0, outline:'none', background:'transparent', font:'400 14px/1.4 var(--font-sans)', color:'var(--db-navy-800)' }} />
            <Btn variant="primary" size="sm" onClick={() => submit()} style={{ padding:'8px 11px' }}><Icon name="send" size={15} color="#fff" /></Btn>
          </div>
        </div>
      </aside>
    </React.Fragment>
  );
};

Object.assign(window, { GeniePanel, genieReply, GenieBars });
