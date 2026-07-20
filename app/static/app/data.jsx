// QSR Command Center — mock data for all modules.

// Today / tomorrow, computed at module load. Queries against the synthetic
// data still anchor to ANCHOR_DATE (e.g. 2026-06-22) via the API, but the
// UI shows the operator the real current date so the demo never looks stale.
const _now = new Date();
const _dow      = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][_now.getDay()];
const _dowLong  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][_now.getDay()];
const _mon      = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][_now.getMonth()];
const _monLong  = ['January','February','March','April','May','June','July','August','September','October','November','December'][_now.getMonth()];
const _tomorrow = new Date(_now.getTime() + 86400000);
const _tdowLong = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][_tomorrow.getDay()];
const _tmonLong = ['January','February','March','April','May','June','July','August','September','October','November','December'][_tomorrow.getMonth()];

const STORE = {
  name: 'Operator Command Center', num: '#0417', hood: 'Fillmore · San Francisco', hoodShort: 'Fillmore',
  manager: 'Maya',
  date: `${_dow}, ${_mon} ${_now.getDate()}`,
  dateLong: `${_dowLong}, ${_monLong} ${_now.getDate()}`,
  tomorrowLong: `${_tdowLong}, ${_tmonLong} ${_tomorrow.getDate()}`,
  clock: _now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
};

const KPIS = {
  sales:    { label:'Sales yesterday', v:'$14,820', d:'+6.2%', up:true, spark:[9,11,10,13,12,14,13,15,14,16,15,17] },
  forecast: { label:'Forecast today', v:'$16,400', sub:'91% confidence', spark:[12,13,12,14,15,14,16,15,17,16,18,17] },
  labor:    { label:'Labor cost', v:'24.8%', d:'1.2% under target', up:true, spark:[27,26,27,25,26,25,24,25,24,25,24,25] },
  guest:    { label:'Guest score', v:'4.3★', d:'NPS 41', up:true, spark:[4.0,4.1,4.0,4.2,4.1,4.3,4.2,4.4,4.3,4.2,4.3,4.3] },
  traffic:  { label:'Guests', v:'612', d:'+38 vs LW', up:true, spark:[520,540,560,545,580,600,590,610,600,612] },
};

/* ---- Labor: timecards needing approval ---- */
const TIMECARDS = [
  { id:'tc1', name:'Devon Pratt', role:'Line cook', initials:'DP', day:'Thu, May 29', sched:'10:00a–6:00p', actual:'9:52a–7:14p', hours:9.4, ot:1.2, issue:'1.2h overtime', level:'warn',
    note:'Stayed late to cover a no-show on the grill station.' },
  { id:'tc2', name:'Aisha Mensah', role:'Cashier', initials:'AM', day:'Thu, May 29', sched:'11:00a–4:00p', actual:'11:03a–4:01p', hours:5.0, ot:0, issue:'Missed meal break', level:'warn',
    note:'No 30-min break recorded on a 5-hour shift (CA compliance flag).' },
  { id:'tc3', name:'Marco Ruiz', role:'Shift lead', initials:'MR', day:'Thu, May 29', sched:'6:00a–2:00p', actual:'5:46a–2:08p', hours:8.4, ot:0.3, issue:'Early clock-in', level:'info',
    note:'Clocked in 14 min before scheduled start.' },
];
const SCHEDULE_WEEK = [
  { day:'Mon', planned:31, fcast:30 }, { day:'Tue', planned:34, fcast:28 }, { day:'Wed', planned:30, fcast:31 },
  { day:'Thu', planned:33, fcast:33 }, { day:'Fri', planned:38, fcast:40 }, { day:'Sat', planned:42, fcast:44 }, { day:'Sun', planned:36, fcast:34 },
];

/* ---- Reorders ---- */
const REORDERS = [
  { id:'r1', vendor:'Bay Produce Co.', eta:'Tomorrow 6a', items:[
    { id:'i1', name:'Hass avocado (case)', sku:'PRD-0420', onHand:3, par:12, unit:'case', cost:38.00, qty:10, trend:'+18% usage' },
    { id:'i2', name:'Romaine hearts (case)', sku:'PRD-0118', onHand:5, par:14, unit:'case', cost:24.50, qty:10, trend:'steady' },
    { id:'i3', name:'Roma tomato (case)', sku:'PRD-0309', onHand:4, par:10, unit:'case', cost:21.00, qty:6, trend:'steady' },
  ]},
  { id:'r2', vendor:'Golden Gate Proteins', eta:'Sat 7a', items:[
    { id:'i4', name:'Grilled chicken (40lb)', sku:'PRO-1102', onHand:2, par:8, unit:'box', cost:112.00, qty:6, trend:'+9% usage' },
    { id:'i5', name:'Carnitas (30lb)', sku:'PRO-1140', onHand:1, par:5, unit:'box', cost:98.00, qty:4, trend:'+22% usage' },
    { id:'i6', name:'Black beans (#10 can)', sku:'DRY-2201', onHand:8, par:18, unit:'case', cost:33.00, qty:10, trend:'steady' },
  ]},
];

/* ---- Inventory analytics ---- */
// Stock health: share of tracked SKUs at/above par
const STOCK_HEALTH = { atPar: 31, below: 9, total: 40 };   // 31 of 40 SKUs healthy
// Days of cover per watched item — on-hand ÷ avg daily usage, vs vendor lead time
const STOCK_WATCH = [
  { name:'Carnitas',        cat:'Proteins', onHand:1, par:5,  daysCover:0.8, lead:2, history:[5,4,4,3,2,2,1],   color:'var(--db-maroon-600)' },
  { name:'Grilled chicken', cat:'Proteins', onHand:2, par:8,  daysCover:1.4, lead:2, history:[8,7,6,5,4,3,2],   color:'var(--db-lava-600)' },
  { name:'Hass avocado',    cat:'Produce',  onHand:3, par:12, daysCover:2.1, lead:1, history:[12,10,8,7,5,4,3], color:'var(--db-green-600)' },
  { name:'Roma tomato',     cat:'Produce',  onHand:4, par:10, daysCover:2.9, lead:1, history:[10,9,8,7,6,5,4],  color:'var(--db-yellow-600)' },
  { name:'Romaine hearts',  cat:'Produce',  onHand:5, par:14, daysCover:3.2, lead:1, history:[14,12,11,9,8,6,5],color:'var(--db-green-600)' },
  { name:'Black beans',     cat:'Dry goods',onHand:8, par:18, daysCover:6.0, lead:3, history:[18,16,15,13,11,10,8],color:'var(--db-blue-600)' },
];
// Fill rate (% of par on hand) by category
const STOCK_CATS = [
  { name:'Produce',   pct:42, skus:11, color:'var(--db-green-600)' },
  { name:'Proteins',  pct:28, skus:7,  color:'var(--db-lava-600)' },
  { name:'Dry goods', pct:74, skus:14, color:'var(--db-blue-600)' },
  { name:'Beverage',  pct:91, skus:8,  color:'var(--db-yellow-600)' },
];
// Total on-hand inventory value, trailing 8 weeks ($k)
const STOCK_VALUE_TREND = [9.1, 8.7, 9.3, 8.4, 8.9, 8.2, 7.8, 7.4];

/* ---- Equipment ---- */
const EQUIPMENT = [
  { id:'e1', name:'Walk-in cooler #2', type:'Refrigeration', level:'danger', metric:'+4°F over 36h', detail:'Holding 42°F · target 36–38°F', spark:[37,37,38,38,39,40,40,41,42,42], lastService:'Mar 2', warranty:'CoolTech · in warranty' },
  { id:'e2', name:'Fryer bank A', type:'Cooking', level:'warn', metric:'Filter due', detail:'Oil at 142 fry-hours · change at 150', spark:[80,95,108,120,128,135,140,142], lastService:'May 12', warranty:'Frymaster' },
  { id:'e3', name:'Walk-in cooler #1', type:'Refrigeration', level:'ok', metric:'37°F · nominal', detail:'Holding steady in range', spark:[37,37,36,37,37,36,37,37], lastService:'Apr 18', warranty:'CoolTech · in warranty' },
  { id:'e4', name:'Ice machine', type:'Refrigeration', level:'ok', metric:'Nominal', detail:'Production normal', spark:[50,52,51,53,52,51,52,52], lastService:'Apr 2', warranty:'Hoshizaki' },
  { id:'e5', name:'POS terminal 3', type:'Front of house', level:'ok', metric:'Online', detail:'Last sync 2m ago', spark:[1,1,1,1,1,1,1,1], lastService:'—', warranty:'—' },
  { id:'e6', name:'Espresso machine', type:'Beverage', level:'ok', metric:'Nominal', detail:'Backflush done today', spark:[1,1,1,1,1,1,1,1], lastService:'May 20', warranty:'La Marzocco' },
];
const SERVICE_SLOTS = [
  { id:'s1', label:'Today', time:'2:00–4:00 PM', tech:'CoolTech · Ravi K.', note:'Soonest available', rec:true },
  { id:'s2', label:'Today', time:'5:00–7:00 PM', tech:'CoolTech · Ravi K.', note:'After dinner rush' },
  { id:'s3', label:'Tomorrow', time:'7:00–9:00 AM', tech:'CoolTech · Dana W.', note:'Before open' },
];

/* ---- Members ---- */
const MEMBER_SEGMENTS = [
  { id:'m1', name:'Lapsing regulars', size:184, desc:'Visited 4+×/mo, none in last 21 days', value:'$11.40 avg ticket', rec:true },
  { id:'m2', name:'New & cooling', size:96, desc:'Joined <60d, 1 visit only', value:'$8.20 avg ticket' },
  { id:'m3', name:'Birthday this week', size:23, desc:'Reward-eligible', value:'$13.10 avg ticket' },
];
const OFFERS = [
  { id:'o1', label:'$5 off your next $15', lift:'Best recovery', proj:'~46 visits', rec:true },
  { id:'o2', label:'Free side with entrée', lift:'Highest margin', proj:'~38 visits' },
  { id:'o3', label:'Double points weekend', lift:'Lowest cost', proj:'~29 visits' },
];
const MEMBER_TREND = [620,640,660,690,710,742,760,800,830,860,900,930];

/* ---- Guest feedback ---- */
const REVIEWS = [
  { id:'g1', author:'Priya S.', initials:'PS', rating:2, channel:'Google', time:'1h ago', sentiment:'neg', needsReply:true,
    text:'Mobile order said ready but I waited 15 min at pickup. Food was fine once I got it, staff seemed slammed.',
    aiDraft:'Hi Priya — thank you for flagging the pickup wait, and sorry we held you up. Friday lunch caught us short-staffed at the mobile station; we’ve added a runner for that window. Hope to make your next visit smoother.' },
  { id:'g2', author:'Marcus L.', initials:'ML', rating:3, channel:'Yelp', time:'3h ago', sentiment:'neu', needsReply:true,
    text:'Carnitas bowl was great but they were out of guac again. Second time this month.',
    aiDraft:'Hi Marcus — glad the carnitas hit the spot, and apologies for the guac. We’ve bumped our avocado order (it’s on tomorrow’s delivery), so you should be covered next time. Thanks for sticking with us.' },
  { id:'g3', author:'Tara W.', initials:'TW', rating:5, channel:'Google', time:'5h ago', sentiment:'pos', needsReply:false,
    text:'Marco at the register remembered my usual and the line moved fast. Best lunch spot in Fillmore.',
    aiDraft:'Thank you, Tara! Marco will be thrilled — we’ll pass it along. See you for the usual soon.' },
  { id:'g4', author:'Jules R.', initials:'JR', rating:4, channel:'App', time:'Yesterday', sentiment:'pos', needsReply:false,
    text:'Quick, fresh, and the new agua fresca is excellent. Would love oat milk for the coffee though.',
    aiDraft:'Thanks, Jules — so glad you love the agua fresca! Noting the oat milk request for the team.' },
  { id:'g5', author:'Ben C.', initials:'BC', rating:5, channel:'Yelp', time:'Yesterday', sentiment:'pos', needsReply:false,
    text:'Consistently solid. Online order is always right.',
    aiDraft:'Appreciate it, Ben — consistency is the goal. Thanks for the love!' },
];
const FEEDBACK_THEMES = [
  { theme:'Pickup wait times', count:7, dir:'up', level:'warn' },
  { theme:'Guacamole stockouts', count:4, dir:'up', level:'warn' },
  { theme:'Friendly staff', count:12, dir:'up', level:'ok' },
  { theme:'Food freshness', count:9, dir:'flat', level:'ok' },
];
// Daily review sentiment, trailing 30 days (counts per day)
const SENTIMENT_30D = [
  { date:'05-01', pos:1, neu:1, neg:0 }, { date:'05-02', pos:2, neu:0, neg:1 },
  { date:'05-03', pos:1, neu:1, neg:0 }, { date:'05-04', pos:1, neu:0, neg:0 },
  { date:'05-05', pos:2, neu:1, neg:0 }, { date:'05-06', pos:3, neu:0, neg:0 },
  { date:'05-07', pos:2, neu:1, neg:0 }, { date:'05-08', pos:1, neu:1, neg:1 },
  { date:'05-09', pos:3, neu:0, neg:0 }, { date:'05-10', pos:2, neu:1, neg:0 },
  { date:'05-11', pos:1, neu:1, neg:1 }, { date:'05-12', pos:2, neu:0, neg:1 },
  { date:'05-13', pos:1, neu:1, neg:1 }, { date:'05-14', pos:2, neu:1, neg:0 },
  { date:'05-15', pos:3, neu:0, neg:0 }, { date:'05-16', pos:2, neu:1, neg:0 },
  { date:'05-17', pos:2, neu:0, neg:0 }, { date:'05-18', pos:1, neu:1, neg:1 },
  { date:'05-19', pos:2, neu:0, neg:1 }, { date:'05-20', pos:1, neu:1, neg:2 },
  { date:'05-21', pos:2, neu:1, neg:1 }, { date:'05-22', pos:3, neu:0, neg:1 },
  { date:'05-23', pos:2, neu:1, neg:2 }, { date:'05-24', pos:3, neu:1, neg:1 },
  { date:'05-25', pos:2, neu:0, neg:2 }, { date:'05-26', pos:3, neu:1, neg:1 },
  { date:'05-27', pos:4, neu:0, neg:1 }, { date:'05-28', pos:3, neu:1, neg:2 },
  { date:'05-29', pos:4, neu:1, neg:2 }, { date:'05-30', pos:4, neu:0, neg:2 },
];

/* ---- Sales ---- */
const SALES_HOURLY = [120,90,80,140,420,680,540,380,300,420,560,640,520,360,280,240,200,160];
const TOP_ITEMS = [
  { name:'Carnitas bowl', units:142, rev:'$1,846', w:100 },
  { name:'Chicken burrito', units:118, rev:'$1,534', w:83 },
  { name:'Agua fresca (lg)', units:96, rev:'$528', w:67 },
  { name:'Veggie tacos (3)', units:74, rev:'$888', w:52 },
  { name:'Chips & guac', units:61, rev:'$427', w:43 },
];
const DAYPARTS = [
  { name:'Breakfast', rev:'$2,140', pct:14 }, { name:'Lunch', rev:'$7,980', pct:54 },
  { name:'Afternoon', rev:'$1,920', pct:13 }, { name:'Dinner', rev:'$2,780', pct:19 },
];

Object.assign(window, { STORE, KPIS, TIMECARDS, SCHEDULE_WEEK, REORDERS, STOCK_HEALTH, STOCK_WATCH, STOCK_CATS, STOCK_VALUE_TREND, EQUIPMENT, SERVICE_SLOTS, MEMBER_SEGMENTS, OFFERS, MEMBER_TREND, REVIEWS, FEEDBACK_THEMES, SENTIMENT_30D, SALES_HOURLY, TOP_ITEMS, DAYPARTS });
