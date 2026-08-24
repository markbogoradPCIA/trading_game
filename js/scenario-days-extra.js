const SCENARIO_DAYS_EXTRA = [
  {
    id: "spr-no-near-term-release",
    tag: "POLICY",
    category: "SPR",
    headline: "White House Says No Near-Term SPR Release Is Planned",
    context:
      "SPR release rumours had circulated after recent price spikes. U.S. commercial crude stocks below the five-year average.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bullish",
    difficulty: "Medium",
    reason: "Removes threat of government barrels entering market",
    change: 1.2,
    resolution:
      "WTI up +1.2%. **Fundamental read (bullish):** Ruling out an SPR release removes the threat of government barrels flooding the market, reducing a bearish overhang on flat price.",
    dmNote: "No SPR release = no extra supply — removes bearish risk premium.",
    aligned: { aggressive: 0.4, defensive: 0.1, contrarian: -0.15 },
  },
  {
    id: "spr-30mb-release",
    tag: "POLICY",
    category: "SPR",
    headline: "DOE Announces 30mb Release From Strategic Petroleum Reserve",
    context:
      "The SPR currently holds approximately 360mb of crude. Release volumes will be delivered over the next 60 days.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bearish",
    difficulty: "Easy",
    reason: "Government supply enters market",
    change: -2.2,
    resolution:
      "WTI down −2.2%. **Fundamental read (bearish):** A 30mb SPR release adds government supply to the market, increasing available barrels and pressuring WTI flat price.",
    dmNote: "SPR release = extra supply = bearish.",
    aligned: { aggressive: -0.5, defensive: 0, contrarian: 0.2 },
  },
  {
    id: "spr-refill-tender-6mb",
    tag: "POLICY",
    category: "SPR",
    headline: "DOE Opens Tender to Purchase 6mb of Crude for SPR Refill",
    context:
      "The SPR refill programme targets sour crude grades delivered to Gulf Coast storage. WTI near $71/bbl.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bullish",
    difficulty: "Easy",
    reason: "Government becomes an additional physical buyer",
    change: 1.4,
    resolution:
      "WTI up +1.4%. **Fundamental read (bullish):** DOE purchasing 6mb for SPR refill makes the government an additional physical buyer, adding demand and supporting flat price.",
    dmNote: "SPR purchase = extra demand = bullish.",
    aligned: { aggressive: 0.5, defensive: 0.15, contrarian: -0.2 },
  },
  {
    id: "spr-cancel-purchases",
    tag: "POLICY",
    category: "SPR",
    headline: "DOE Cancels Planned SPR Purchases as Oil Prices Rise",
    context:
      "DOE had been scheduled to buy 3mb/month through Q2. WTI has risen $8/bbl over the past three weeks.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bearish",
    difficulty: "Medium",
    reason: "Expected source of crude demand disappears",
    change: -1.1,
    resolution:
      "WTI down −1.1%. **Fundamental read (bearish):** Cancelling planned SPR purchases removes an expected source of physical crude demand, easing buying pressure on the market.",
    dmNote: "Lost demand = slightly bearish. Medium difficulty — second-order SPR logic.",
    aligned: { aggressive: -0.4, defensive: 0, contrarian: 0.15 },
  },
  {
    id: "cushing-lowest-2022",
    tag: "EIA",
    category: "Inventory",
    headline: "Cushing Storage Levels Fall to Lowest Since 2022",
    context:
      "Cushing is the WTI delivery hub. Outbound pipeline flows to the Gulf Coast remain strong at 1.8mbd.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bullish",
    difficulty: "Easy",
    reason: "Tight inventories at WTI delivery hub",
    change: 1.7,
    resolution:
      "WTI up +1.7%. **Fundamental read (bullish):** Cushing at its lowest level since 2022 signals tight inventories at the WTI delivery hub, supportive for flat price.",
    dmNote: "Low Cushing stocks = tight WTI hub = bullish.",
    aligned: { aggressive: 0.5, defensive: 0.15, contrarian: -0.2 },
  },
  {
    id: "cushing-rise-5mb",
    tag: "EIA",
    category: "Inventory",
    headline: "Cushing Storage Levels Rise 5mb in Three Weeks",
    context:
      "Inbound flows on Keystone and Seaway have exceeded outbound nominations. WTI prompt diffs at Cushing at −$0.20/bbl.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bearish",
    difficulty: "Easy",
    reason: "Increasing WTI inventory buffer",
    change: -1.5,
    resolution:
      "WTI down −1.5%. **Fundamental read (bearish):** A 5mb build at Cushing over three weeks adds inventory at the WTI delivery hub, increasing the supply buffer and weighing on flat price.",
    dmNote: "Rising Cushing stocks = bearish for WTI.",
    aligned: { aggressive: -0.5, defensive: 0, contrarian: 0.2 },
  },
  {
    id: "enterprise-record-houston-flows",
    tag: "DATA",
    category: "Pipeline",
    headline: "Enterprise Reports Record Crude Pipeline Flows Into Houston",
    context:
      "Strong pipeline inflows typically reflect heavy Gulf Coast refining and export pull. Houston area refinery runs at 94%.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bullish",
    difficulty: "Medium",
    reason: "Strong Gulf refining/export pull",
    change: 1.3,
    resolution:
      "WTI up +1.3%. **Fundamental read (bullish):** Record pipeline flows into Houston signal strong Gulf Coast refining and export demand pulling crude toward the coast, tightening the overall balance.",
    dmNote: "Pipeline flows toward the Gulf = demand pull = bullish.",
    aligned: { aggressive: 0.4, defensive: 0.1, contrarian: -0.15 },
  },
  {
    id: "seaway-cuts-cushing-gulf-50",
    tag: "OPS",
    category: "Pipeline",
    headline: "Seaway Pipeline Cuts Cushing-to-Gulf Flows by 50% for Maintenance",
    context:
      "Seaway moves crude from Cushing to the Gulf Coast. Maintenance scheduled for ten days. Cushing stocks at 40mb.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bearish",
    difficulty: "Medium",
    reason: "Crude becomes trapped inland and weakens Cushing",
    change: -1.6,
    resolution:
      "WTI down −1.6%. **Fundamental read (bearish):** Cutting Seaway flows by 50% traps crude inland at Cushing rather than moving it to Gulf demand centres, building the WTI hub and pressuring flat price.",
    dmNote: "Cushing-to-Gulf bottleneck = barrels pile up at WTI hub = bearish.",
    aligned: { aggressive: -0.4, defensive: 0, contrarian: 0.15 },
  },
  {
    id: "houston-channel-reopens",
    tag: "OPS",
    category: "Shipping",
    headline: "Houston Ship Channel Reopens After Two-Day Closure",
    context:
      "The closure had delayed tanker traffic to Houston-area refineries and export terminals. Gulf Coast crude stocks drew 1.2mb last week.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bullish",
    difficulty: "Medium",
    reason: "Export and refinery logistics normalize",
    change: 1.1,
    resolution:
      "WTI up +1.1%. **Fundamental read (bullish):** Reopening the Houston Ship Channel restores export and refinery logistics, allowing crude to flow normally and clearing a logistical bottleneck.",
    dmNote: "Shipping normalisation = barrels can move = bullish.",
    aligned: { aggressive: 0.4, defensive: 0.1, contrarian: -0.15 },
  },
  {
    id: "houston-channel-closed",
    tag: "BREAKING",
    category: "Shipping",
    headline: "Houston Ship Channel Closed to Vessel Traffic Following Collision",
    context:
      "The channel serves Houston refineries and nearby export docks. Duration of the closure is unknown. WTI near $73/bbl.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bearish",
    difficulty: "Medium",
    reason: "Export logistics disrupted and Gulf crude can accumulate",
    change: -1.5,
    resolution:
      "WTI down −1.5%. **Fundamental read (bearish):** Closing the Houston Ship Channel disrupts export and refinery logistics, trapping Gulf Coast barrels and building local supply.",
    dmNote: "Shipping disruption on the Gulf = barrels accumulate = bearish.",
    aligned: { aggressive: -0.4, defensive: 0, contrarian: 0.15 },
  },
  {
    id: "opec-compliance-above-quota",
    tag: "OPEC",
    category: "OPEC",
    headline: "OPEC+ Compliance Data Shows Members Producing 700kbd Above Quotas",
    context:
      "Official OPEC+ targets have been unchanged for three months. Brent-WTI spread at $3.80/bbl.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bearish",
    difficulty: "Easy",
    reason: "More actual supply than officially targeted",
    change: -1.6,
    resolution:
      "WTI down −1.6%. **Fundamental read (bearish):** OPEC+ producing 700kbd above quotas means more actual global supply than targeted, adding barrels to the market and pressuring WTI.",
    dmNote: "Overproduction vs quota = extra supply = bearish.",
    aligned: { aggressive: -0.5, defensive: 0, contrarian: 0.2 },
  },
  {
    id: "opec-compliance-improves",
    tag: "OPEC",
    category: "OPEC",
    headline: "OPEC+ Compliance Improves; Production Falls 600kbd Month-on-Month",
    context:
      "Saudi Arabia and Russia led the production cuts. Global crude demand estimates stable near 103mbd.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bullish",
    difficulty: "Easy",
    reason: "Actual global production falls",
    change: 1.8,
    resolution:
      "WTI up +1.8%. **Fundamental read (bullish):** A 600kbd month-on-month drop in OPEC+ production removes global supply, tightening the balance and supporting WTI.",
    dmNote: "Less OPEC+ production = bullish.",
    aligned: { aggressive: 0.5, defensive: 0.15, contrarian: -0.2 },
  },
  {
    id: "rig-count-falls-18",
    tag: "DATA",
    category: "Production",
    headline: "U.S. Oil Rig Count Falls by 18, Largest Weekly Drop This Year",
    context:
      "Baker Hughes data reflects drilling activity with a typical three-to-six month lag to production changes. WTI near $68/bbl.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bullish",
    difficulty: "Medium",
    reason: "Potential future production slowdown",
    change: 1.0,
    resolution:
      "WTI up +1.0%. **Fundamental read (bullish):** The largest rig-count drop of the year signals potential future U.S. production slowdown, supportive for flat price on supply concerns.",
    dmNote: "Rig count = forward production indicator. Medium — timing lag.",
    aligned: { aggressive: 0.4, defensive: 0.1, contrarian: -0.15 },
  },
  {
    id: "rig-count-rises-six-weeks",
    tag: "DATA",
    category: "Production",
    headline: "U.S. Oil Rig Count Rises for Sixth Consecutive Week",
    context:
      "Permian Basin accounted for 12 of the 15 new rigs added. WTI flat price near $70/bbl.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bearish",
    difficulty: "Medium",
    reason: "Potential future production growth",
    change: -0.9,
    resolution:
      "WTI down −0.9%. **Fundamental read (bearish):** Six consecutive weeks of rig-count increases signal potential future U.S. production growth, adding a bearish supply overhang to flat price.",
    dmNote: "Rising rigs = future supply growth = bearish. Medium — forward-looking.",
    aligned: { aggressive: -0.4, defensive: 0, contrarian: 0.15 },
  },
  {
    id: "wti-midland-diffs-strengthen",
    tag: "PHYSICAL",
    category: "Physical",
    headline: "WTI Midland Differentials Strengthen as European Buying Accelerates",
    context:
      "Midland diffs at +$1.40/bbl vs WTI Cushing, up $0.60 this week. European refiners seeking medium-sour replacement barrels.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bullish",
    difficulty: "Hard",
    reason: "Strong physical differentials indicate demand for U.S. crude",
    change: 1.5,
    resolution:
      "WTI up +1.5%. **Fundamental read (bullish):** Strengthening Midland diffs reflect strong physical demand for Permian crude — a tight physical market that supports WTI flat price.",
    dmNote: "Hard — requires understanding that diffs = physical demand signal.",
    aligned: { aggressive: 0.35, defensive: 0.1, contrarian: -0.1 },
  },
  {
    id: "wti-midland-diffs-weaken",
    tag: "PHYSICAL",
    category: "Physical",
    headline: "WTI Midland Differentials Weaken Sharply as Export Demand Slows",
    context:
      "Midland diffs fell to +$0.30/bbl vs WTI Cushing from +$1.10 last week. U.S. Gulf export nominations declined 8% w/w.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bearish",
    difficulty: "Hard",
    reason: "Weak physical differentials indicate poor demand / excess supply",
    change: -1.4,
    resolution:
      "WTI down −1.4%. **Fundamental read (bearish):** Sharply weakening Midland diffs signal poor physical demand and excess supply in the Permian, bearish for WTI flat price.",
    dmNote: "Hard — weak diffs = excess barrels / poor demand at the wellhead.",
    aligned: { aggressive: -0.35, defensive: 0, contrarian: 0.1 },
  },
  {
    id: "gulf-draw-cushing-build",
    tag: "EIA",
    category: "Inventory",
    headline: "Gulf Coast Crude Stocks Draw 5.5mb Despite Cushing Build",
    context:
      "Same EIA report: Cushing built +2.1mb w/w. PADD 3 Gulf Coast stocks at a 14-month low. WTI near $74/bbl.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bullish",
    difficulty: "Hard",
    reason: "Strong Gulf pull can outweigh an inland inventory build",
    change: 1.6,
    resolution:
      "WTI up +1.6%. **Fundamental read (bullish):** A 5.5mb Gulf Coast draw signals strong coastal refining and export pull. Despite the Cushing build, the Gulf draw dominates — barrels are leaving the system via the coast.",
    dmNote: "Hard — two signals, but Gulf draw + low coastal stocks is the dominant read.",
    aligned: { aggressive: 0.35, defensive: 0.1, contrarian: -0.1 },
  },
  {
    id: "gulf-build-export-slow",
    tag: "EIA",
    category: "Inventory",
    headline: "Gulf Coast Crude Stocks Build 6.0mb as Export Loadings Slow",
    context:
      "Gulf Coast commercial stocks now 8mb above the five-year average. U.S. crude exports fell to 3.6mbd last week.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bearish",
    difficulty: "Medium",
    reason: "Coastal accumulation combined with weaker exports",
    change: -1.7,
    resolution:
      "WTI down −1.7%. **Fundamental read (bearish):** A 6.0mb Gulf Coast build combined with slower export loadings means barrels are accumulating at the coast with nowhere to go — bearish for WTI.",
    dmNote: "Coastal build + weak exports = bearish combination.",
    aligned: { aggressive: -0.4, defensive: 0, contrarian: 0.15 },
  },
  {
    id: "gulf-hurricane-forecast",
    tag: "BREAKING",
    category: "Weather",
    headline: "Major Gulf Hurricane Forecast to Cross Offshore Production Region",
    context:
      "Gulf of Mexico offshore production totals roughly 1.8mbd. Storm expected to reach the production zone in 72 hours.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bullish",
    difficulty: "Medium",
    reason: "Threatens offshore crude production",
    change: 2.0,
    resolution:
      "WTI up +2.0%. **Fundamental read (bullish):** A major hurricane forecast to cross the offshore production region threatens Gulf of Mexico output, risking supply disruption and supporting flat price.",
    dmNote: "Hurricane threat to production = supply risk = bullish.",
    aligned: { aggressive: 0.4, defensive: 0.1, contrarian: -0.15 },
  },
  {
    id: "gulf-hurricane-restore",
    tag: "UPDATE",
    category: "Weather",
    headline: "Gulf Producers Restore Nearly All Oil Output Following Hurricane",
    context:
      "Offshore production had been curtailed by 1.4mbd at the storm's peak. Restoration to 95% of pre-storm levels achieved within five days.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bearish",
    difficulty: "Medium",
    reason: "Previously disrupted crude supply returns",
    change: -1.8,
    resolution:
      "WTI down −1.8%. **Fundamental read (bearish):** Restoring nearly all Gulf offshore output brings previously disrupted supply back to the market, easing the storm premium on flat price.",
    dmNote: "Supply restoration after disruption = bearish.",
    aligned: { aggressive: -0.4, defensive: 0, contrarian: 0.15 },
  },
];
