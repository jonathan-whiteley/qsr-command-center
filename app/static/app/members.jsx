// QSR Command Center — Members win-back module.

const SelectCard = ({ active, onClick, title, sub, right, rec }) => (
  <button onClick={onClick} className="hb-select" style={{
    display:'flex', alignItems:'center', gap:12, width:'100%', textAlign:'left', cursor:'pointer',
    border: active?'2px solid var(--db-lava-600)':'1px solid var(--db-gray-lines)', background: active?'#fff':'#fff',
    borderRadius:11, padding:'13px 15px', margin: active?-1:0, boxShadow: active?'var(--shadow-sm)':'none', transition:'all var(--dur-fast) var(--ease-out)',
  }}>
    <span style={{ width:18, height:18, borderRadius:999, border: active?'5px solid var(--db-lava-600)':'2px solid var(--db-navy-300)', flexShrink:0, boxSizing:'border-box' }} />
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontSize:13.5, fontWeight:500, color:'var(--db-navy-800)' }}>{title}</span>
        {rec && <Pill level="info">AI pick</Pill>}
      </div>
      <div style={{ fontSize:11.5, color:'var(--db-gray-text)', marginTop:2 }}>{sub}</div>
    </div>
    {right && <span style={{ fontSize:13, fontWeight:600, color:'var(--db-navy-800)', fontFamily:'var(--font-mono)', flexShrink:0 }}>{right}</span>}
  </button>
);

const ChannelToggle = ({ icon, label, on, onToggle }) => (
  <button onClick={onToggle} style={{
    display:'flex', alignItems:'center', gap:8, padding:'9px 13px', borderRadius:9, cursor:'pointer',
    border: on?'1px solid var(--db-navy-800)':'1px solid var(--db-gray-lines)', background: on?'var(--db-navy-800)':'#fff', color: on?'#fff':'var(--db-gray-text)', flex:1, justifyContent:'center',
  }}>
    <Icon name={icon} size={15} color="currentColor" /> <span style={{ fontSize:12.5, fontWeight:500 }}>{label}</span>
    {on && <Icon name="check" size={13} color="currentColor" stroke={2.4} />}
  </button>
);

const MembersView = () => {
  const { membersSent, sendCampaign } = useApp();
  const [seg, setSeg] = useState('m1');
  const [offer, setOffer] = useState('o1');
  const [chans, setChans] = useState({ push:true, email:true, sms:false });
  const segment = MEMBER_SEGMENTS.find(s => s.id === seg);
  const off = OFFERS.find(o => o.id === offer);
  const max = Math.max(...MEMBER_TREND);
  const projected = { o1:46, o2:38, o3:29 }[offer];

  return (
    <div style={{ flex:1, overflow:'auto', background:'var(--db-oat-light)' }}>
      <div style={{ padding:'28px 32px 40px', maxWidth:1080, margin:'0 auto' }}>
        <PageHead icon="members" title="Loyalty" sub="Spot members slipping away and launch a win-back in a couple of clicks.">
          <Btn variant="ghost" icon="members">View all 2,418</Btn>
        </PageHead>

        <div style={{ display:'flex', gap:12, marginBottom:18 }}>
          <LaborStat label="Active members" value="2,418" foot={<Delta up size={11.5}>+5.2% MoM</Delta>} />
          <LaborStat label="Lapsing now" value="184" foot="regulars, 21d quiet" />
          <LaborStat label="Redemption rate" value="31%" foot="last campaign" />
          <LaborStat label="Member sales" value="62%" foot="of total revenue" />
        </div>

        {membersSent ? (
          <Card pad={0} style={{ overflow:'hidden' }}>
            <div style={{ background:'var(--db-navy-900)', padding:'36px 32px', display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', gap:14 }}>
              <span style={{ width:54, height:54, borderRadius:999, background:'var(--db-green-600)', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="check" size={30} color="#fff" stroke={2.4} /></span>
              <h2 style={{ fontSize:22, fontWeight:500, color:'#fff', margin:0 }}>Win-back sent to 184 members</h2>
              <p style={{ fontSize:14, color:'var(--db-navy-300)', margin:0, maxWidth:440, lineHeight:1.5 }}>“$5 off your next $15” went out via push and email. Genie projects <strong style={{ color:'var(--db-green-400)' }}>~46 recovered visits</strong> over the next two weeks.</p>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:4, alignItems:'center' }}>
                <Pill level="ok" dot>Campaign WB-0530 live</Pill>
                <LakebaseTag table="campaigns" tone="dark" />
              </div>
            </div>
          </Card>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:20 }}>
            {/* composer */}
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              <AIRec>
                <strong>184 regulars</strong> who came 4+ times a month have gone quiet for 21 days — that's <strong>$2,100/mo</strong> at risk. A <strong>$5-off-$15</strong> push is the model's best recovery play for this group.
              </AIRec>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--db-navy-800)', marginBottom:10 }}>1 · Who to reach</div>
                <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                  {MEMBER_SEGMENTS.map(s => <SelectCard key={s.id} active={seg===s.id} onClick={() => setSeg(s.id)} title={s.name} sub={s.desc} right={s.size} rec={s.rec} />)}
                </div>
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--db-navy-800)', marginBottom:10 }}>2 · The offer</div>
                <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                  {OFFERS.map(o => <SelectCard key={o.id} active={offer===o.id} onClick={() => setOffer(o.id)} title={o.label} sub={`${o.lift} · projected ${o.proj}`} rec={o.rec} />)}
                </div>
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--db-navy-800)', marginBottom:10 }}>3 · Channels</div>
                <div style={{ display:'flex', gap:9 }}>
                  <ChannelToggle icon="bell" label="Push" on={chans.push} onToggle={() => setChans(c => ({...c, push:!c.push}))} />
                  <ChannelToggle icon="mail" label="Email" on={chans.email} onToggle={() => setChans(c => ({...c, email:!c.email}))} />
                  <ChannelToggle icon="phone" label="SMS" on={chans.sms} onToggle={() => setChans(c => ({...c, sms:!c.sms}))} />
                </div>
              </div>
            </div>
            {/* preview */}
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--db-navy-800)' }}>Preview</div>
              <Card pad={16} style={{ background:'var(--db-oat-medium)' }}>
                <div style={{ background:'#fff', borderRadius:10, padding:'12px 14px', boxShadow:'var(--shadow-sm)', display:'flex', gap:11 }}>
                  <div style={{ width:34, height:34, borderRadius:8, background:'var(--db-lava-600)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name="today" size={18} color="#fff" stroke={2.2} /></div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12.5, fontWeight:600, color:'var(--db-navy-800)' }}>Lakehouse Market</div>
                    <div style={{ fontSize:12.5, color:'var(--db-navy-800)', marginTop:2, lineHeight:1.45 }}>We miss you, {'{first_name}'}! Here's <strong>{off.label.toLowerCase()}</strong> — good through Sunday. Swing by Fillmore.</div>
                    <div style={{ fontSize:10.5, color:'var(--db-navy-400)', marginTop:5, fontFamily:'var(--font-mono)' }}>now</div>
                  </div>
                </div>
              </Card>
              <Card pad={16}>
                <div style={{ fontSize:11.5, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--db-gray-text)', marginBottom:10 }}>Projected impact</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                  <span style={{ fontSize:30, fontWeight:600, color:'var(--db-navy-800)', letterSpacing:'-0.02em' }}>~{projected}</span>
                  <span style={{ fontSize:13, color:'var(--db-gray-text)' }}>recovered visits</span>
                </div>
                <div style={{ fontSize:12.5, color:'var(--db-green-700)', fontWeight:500, marginTop:2 }}>≈ ${(projected*11.4).toFixed(0)} in 14 days</div>
                <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid var(--db-gray-lines)' }}>
                  <Spark pts={MEMBER_TREND} w={336} h={40} color="var(--db-lava-600)" />
                  <div style={{ fontSize:11, color:'var(--db-navy-400)', marginTop:4 }}>Active members, trailing 12 weeks</div>
                </div>
              </Card>
              <Btn variant="primary" full size="lg" icon="send" onClick={() => sendCampaign({ seg, offer, chans, projected })}>Send to {segment.size} members</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

Object.assign(window, { MembersView });
