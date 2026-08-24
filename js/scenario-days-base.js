const SCENARIO_DAYS_BASE = [
  {
    id: "eia-us-crude-draw-62",
    tag: "EIA",
    category: "Inventory",
    headline: "EIA: U.S. Crude Inventories Draw 6.2mb vs 1.8mb Draw Expected",
    context:
      "Weekly EIA report. WTI flat price near $72/bbl; Gulf Coast refinery runs averaged 92% last week.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bullish",
    difficulty: "Easy",
    reason: "Larger-than-expected crude draw means tighter supply",
    change: 2.1,
    resolution:
      "WTI up +2.1%. **Fundamental read (bullish):** A draw of 6.2mb versus a 1.8mb expected draw signals a much tighter U.S. crude balance — less supply available, supportive for flat price.",
    dmNote: "Classic inventory surprise — magnitude of the miss matters.",
    aligned: { aggressive: 0.5, defensive: 0.15, contrarian: -0.2 },
  },
  {
    id: "cushing-build-34",
    tag: "EIA",
    category: "Inventory",
    headline: "EIA: Cushing Crude Stocks Build 3.4mb to Highest Since January",
    context:
      "Cushing is the WTI delivery hub. Prompt WTI diffs at Cushing are −$0.10/bbl. Flat price opened near $71/bbl.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bearish",
    difficulty: "Easy",
    reason: "More crude accumulating at WTI delivery hub",
    change: -1.8,
    resolution:
      "WTI down −1.8%. **Fundamental read (bearish):** Builds at Cushing — the WTI delivery point — add barrels to the hub that sets flat-price delivery, weighing on WTI.",
    dmNote: "Cushing builds are directly bearish for WTI flat price.",
    aligned: { aggressive: -0.5, defensive: 0, contrarian: 0.2 },
  },
  {
    id: "us-exports-48-record",
    tag: "FLOW",
    category: "Exports",
    headline: "U.S. Crude Exports Rise to 4.8mbd, Highest in Five Months",
    context:
      "Gulf Coast loadings have been steady. WTI-Brent spread near −$1.50/bbl, keeping U.S. barrels competitive abroad.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bullish",
    difficulty: "Easy",
    reason: "Strong exports remove barrels from U.S. system",
    change: 1.9,
    resolution:
      "WTI up +1.9%. **Fundamental read (bullish):** Exports at 4.8mbd pull crude out of the U.S. system, tightening the domestic balance and supporting flat price.",
    dmNote: "Export strength = barrels leaving the country.",
    aligned: { aggressive: 0.5, defensive: 0.15, contrarian: -0.2 },
  },
  {
    id: "us-imports-jump-900",
    tag: "FLOW",
    category: "Imports",
    headline: "U.S. Crude Imports Jump 900kbd as Canadian Pipeline Flows Recover",
    context:
      "Gulf Coast refinery utilization at 91%. Imports feed both coastal and mid-continent balances.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bearish",
    difficulty: "Easy",
    reason: "More crude supply entering U.S. market",
    change: -1.6,
    resolution:
      "WTI down −1.6%. **Fundamental read (bearish):** A 900kbd jump in imports adds supply to the U.S. market, easing tightness and pressuring flat price.",
    dmNote: "More barrels in = bearish, all else equal.",
    aligned: { aggressive: -0.5, defensive: 0, contrarian: 0.2 },
  },
  {
    id: "opec-delay-increase",
    tag: "OPEC",
    category: "OPEC",
    headline: "OPEC+ Agrees to Delay Planned Production Increase by Three Months",
    context:
      "OPEC+ had been set to return 180kbd/month of withheld supply. Brent-WTI spread stable near $4/bbl.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bullish",
    difficulty: "Easy",
    reason: "Expected supply stays off the market",
    change: 2.0,
    resolution:
      "WTI up +2.0%. **Fundamental read (bullish):** Delaying the planned production increase keeps withheld OPEC+ barrels off the market — less global supply, supportive for WTI.",
    dmNote: "Supply withheld = bullish. Straightforward OPEC read.",
    aligned: { aggressive: 0.5, defensive: 0.15, contrarian: -0.2 },
  },
  {
    id: "saudi-500-increase",
    tag: "OPEC",
    category: "OPEC",
    headline: "Saudi Arabia Signals 500kbd Increase in Crude Production Next Month",
    context:
      "Saudi Arabia is the OPEC+ group's largest producer. WTI flat price near $73/bbl ahead of the announcement.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bearish",
    difficulty: "Easy",
    reason: "More global crude supply",
    change: -1.7,
    resolution:
      "WTI down −1.7%. **Fundamental read (bearish):** A 500kbd Saudi production increase adds meaningful global supply, weighing on crude prices including WTI.",
    dmNote: "More OPEC supply = bearish.",
    aligned: { aggressive: -0.5, defensive: 0, contrarian: 0.2 },
  },
  {
    id: "keystone-shut-pressure",
    tag: "BREAKING",
    category: "Pipeline",
    headline: "Keystone Pipeline Shut After Pressure Drop; Restart Timing Unknown",
    context:
      "Keystone moves Canadian crude into the U.S. mid-continent and Gulf Coast. Cushing stocks at 38mb, near the five-year average.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bullish",
    difficulty: "Easy",
    reason: "Unexpected supply/logistics disruption",
    change: 2.8,
    resolution:
      "WTI up +2.8%. **Fundamental read (bullish):** An unplanned Keystone shutdown disrupts crude flows into the U.S., removing supply from the system and supporting flat price.",
    dmNote: "Pipeline outage = supply disruption = bullish.",
    aligned: { aggressive: 0.5, defensive: 0.15, contrarian: -0.2 },
  },
  {
    id: "keystone-full-service",
    tag: "OPS",
    category: "Pipeline",
    headline: "Keystone Pipeline Returns to Full Service After Repairs",
    context:
      "Keystone had been running at reduced rates for nine days. Gulf Coast refinery runs at 93% of capacity.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bearish",
    difficulty: "Easy",
    reason: "Disrupted supply/flows return",
    change: -1.5,
    resolution:
      "WTI down −1.5%. **Fundamental read (bearish):** Full Keystone restart restores normal crude flows, adding supply back to the market and easing the outage premium.",
    dmNote: "Outage recovery = supply returns = bearish.",
    aligned: { aggressive: -0.5, defensive: 0, contrarian: 0.2 },
  },
  {
    id: "loop-suspends-vlcc",
    tag: "BREAKING",
    category: "Exports",
    headline: "LOOP Suspends VLCC Loadings Due to Severe Weather",
    context:
      "LOOP is the primary U.S. Gulf Coast deepwater export terminal. Gulf Coast commercial crude stocks at a six-month low.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bearish",
    difficulty: "Medium",
    reason: "Export disruption can cause Gulf Coast crude to accumulate",
    change: -1.4,
    resolution:
      "WTI down −1.4%. **Fundamental read (bearish):** Suspending VLCC loadings at LOOP traps barrels on the Gulf Coast that cannot be exported, building local supply and pressuring WTI.",
    dmNote: "Export terminal down → coastal barrels back up → bearish. Timing/logistics nuance.",
    aligned: { aggressive: -0.4, defensive: 0, contrarian: 0.15 },
  },
  {
    id: "loop-resumes-loadings",
    tag: "OPS",
    category: "Exports",
    headline: "LOOP Resumes Normal Crude Loadings After Weather Disruption",
    context:
      "Weather-related loading suspensions lasted four days. U.S. Gulf exports averaged 4.2mbd last week.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bullish",
    difficulty: "Medium",
    reason: "Export outlet returns and removes Gulf barrels",
    change: 1.3,
    resolution:
      "WTI up +1.3%. **Fundamental read (bullish):** Resuming LOOP loadings restores the export outlet, allowing Gulf Coast barrels to leave the U.S. system and tightening the domestic balance.",
    dmNote: "Export recovery removes coastal barrels — opposite of the suspension day.",
    aligned: { aggressive: 0.4, defensive: 0.1, contrarian: -0.15 },
  },
  {
    id: "valero-port-arthur-restart",
    tag: "REFINERY",
    category: "Refinery",
    headline: "Valero Port Arthur Refinery Restarts 200kbd CDU After Outage",
    context:
      "The CDU had been offline for twelve days. Gulf Coast 3-2-1 cracks at $26/bbl, supporting run rates.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bullish",
    difficulty: "Easy",
    reason: "Refinery restart increases crude demand",
    change: 1.6,
    resolution:
      "WTI up +1.6%. **Fundamental read (bullish):** Restarting a 200kbd CDU brings crude demand back online, pulling barrels from the market and supporting flat price.",
    dmNote: "Refinery restart = more crude consumption = bullish.",
    aligned: { aggressive: 0.5, defensive: 0.15, contrarian: -0.2 },
  },
  {
    id: "exxon-baytown-shut",
    tag: "REFINERY",
    category: "Refinery",
    headline: "Exxon Baytown Refinery Shuts 250kbd CDU After Equipment Failure",
    context:
      "Baytown is one of the largest U.S. refineries. Unplanned outage; duration under assessment. WTI near $74/bbl.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bearish",
    difficulty: "Easy",
    reason: "Refinery outage reduces crude demand",
    change: -2.0,
    resolution:
      "WTI down −2.0%. **Fundamental read (bearish):** Shutting a 250kbd CDU removes crude demand immediately — less refinery consumption means barrels can accumulate, bearish for flat price.",
    dmNote: "Unplanned refinery outage = demand loss = bearish.",
    aligned: { aggressive: -0.5, defensive: 0, contrarian: 0.2 },
  },
  {
    id: "refinery-util-952",
    tag: "EIA",
    category: "Refinery",
    headline: "U.S. Refinery Utilization Rises to 95.2%, Highest Since Summer",
    context:
      "Strong gasoline cracks are incentivizing high run rates. EIA data covers the prior week's operations.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bullish",
    difficulty: "Easy",
    reason: "Refineries consume more crude",
    change: 1.5,
    resolution:
      "WTI up +1.5%. **Fundamental read (bullish):** Refinery utilization at 95.2% means refineries are consuming near-maximum crude volumes, tightening supply and supporting WTI.",
    dmNote: "High refinery runs = strong crude demand = bullish.",
    aligned: { aggressive: 0.5, defensive: 0.15, contrarian: -0.2 },
  },
  {
    id: "refinery-util-below-85",
    tag: "EIA",
    category: "Refinery",
    headline: "U.S. Refinery Utilization Falls Below 85% as Turnaround Season Begins",
    context:
      "Spring maintenance season is underway across the Gulf Coast and Midwest. WTI flat price near $70/bbl.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bearish",
    difficulty: "Easy",
    reason: "Refinery crude demand falls",
    change: -1.7,
    resolution:
      "WTI down −1.7%. **Fundamental read (bearish):** Utilization below 85% means refineries are consuming significantly less crude during turnarounds, easing demand and pressuring flat price.",
    dmNote: "Turnaround season = lower crude runs = bearish.",
    aligned: { aggressive: -0.5, defensive: 0, contrarian: 0.2 },
  },
  {
    id: "unipec-six-vlccs",
    tag: "FLOW",
    category: "Exports",
    headline: "China's Unipec Books Six VLCCs for U.S. Gulf Crude Loading",
    context:
      "Six VLCCs represent roughly 12mb of crude. Houston WTI diffs firmed +$0.15/bbl on the news.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bullish",
    difficulty: "Medium",
    reason: "Strong foreign physical demand",
    change: 1.8,
    resolution:
      "WTI up +1.8%. **Fundamental read (bullish):** Six VLCC bookings signal strong Chinese demand for U.S. Gulf crude, pulling barrels into the export market and tightening the domestic balance.",
    dmNote: "Confirmed-scale export demand from a major buyer.",
    aligned: { aggressive: 0.4, defensive: 0.1, contrarian: -0.15 },
  },
  {
    id: "asian-cut-us-purchases",
    tag: "FLOW",
    category: "Exports",
    headline: "Asian Refiners Cut U.S. Crude Purchases as Freight Costs Surge",
    context:
      "VLCC freight from the U.S. Gulf to Asia rose to $4.20/bbl. U.S. exports averaged 4.1mbd over the past month.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bearish",
    difficulty: "Medium",
    reason: "Export demand weakens",
    change: -1.3,
    resolution:
      "WTI down −1.3%. **Fundamental read (bearish):** Asian refiners cutting U.S. purchases weakens export demand, leaving more barrels in the domestic market and pressuring flat price.",
    dmNote: "Weaker export pull = more barrels stay home = bearish.",
    aligned: { aggressive: -0.4, defensive: 0, contrarian: 0.15 },
  },
  {
    id: "api-draw-71",
    tag: "DATA",
    category: "Inventory",
    headline: "API Reports 7.1mb U.S. Crude Inventory Draw",
    context:
      "API data is released one day ahead of the official EIA report. WTI flat price near $72/bbl after the print.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bullish",
    difficulty: "Easy",
    reason: "Large crude draw",
    change: 1.8,
    resolution:
      "WTI up +1.8%. **Fundamental read (bullish):** A 7.1mb API crude draw signals a significant tightening of U.S. inventories, supportive for WTI ahead of EIA confirmation.",
    dmNote: "Large inventory draw — straightforward bullish read.",
    aligned: { aggressive: 0.5, defensive: 0.15, contrarian: -0.2 },
  },
  {
    id: "api-build-83",
    tag: "DATA",
    category: "Inventory",
    headline: "API Reports 8.3mb U.S. Crude Inventory Build",
    context:
      "API data is released one day ahead of the official EIA report. Gulf Coast refinery runs at 90% last week.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bearish",
    difficulty: "Easy",
    reason: "Large crude build",
    change: -2.0,
    resolution:
      "WTI down −2.0%. **Fundamental read (bearish):** An 8.3mb API crude build signals a significant surplus building in U.S. storage, bearish for flat price.",
    dmNote: "Large inventory build — straightforward bearish read.",
    aligned: { aggressive: -0.5, defensive: 0, contrarian: 0.2 },
  },
  {
    id: "permian-winter-storm",
    tag: "DATA",
    category: "Production",
    headline: "Permian Crude Production Falls 250kbd Following Winter Storm",
    context:
      "The Permian Basin accounts for roughly 45% of U.S. crude output. Production losses typically recover over one to two weeks.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bullish",
    difficulty: "Easy",
    reason: "Domestic crude supply loss",
    change: 2.2,
    resolution:
      "WTI up +2.2%. **Fundamental read (bullish):** A 250kbd Permian production loss removes domestic supply from the market, tightening the U.S. balance and supporting flat price.",
    dmNote: "Production outage = less supply = bullish.",
    aligned: { aggressive: 0.5, defensive: 0.15, contrarian: -0.2 },
  },
  {
    id: "permian-record-68",
    tag: "DATA",
    category: "Production",
    headline: "Permian Crude Production Hits Record 6.8mbd",
    context:
      "U.S. total crude output estimated at 13.2mbd. WTI flat price near $69/bbl.",
    prompt: "What's your first-order read for WTI flat price?",
    expectedDirection: "bearish",
    difficulty: "Easy",
    reason: "More domestic crude production",
    change: -1.4,
    resolution:
      "WTI down −1.4%. **Fundamental read (bearish):** Record Permian production at 6.8mbd adds domestic supply, easing tightness and weighing on WTI flat price.",
    dmNote: "More production = more supply = bearish.",
    aligned: { aggressive: -0.5, defensive: 0, contrarian: 0.2 },
  },
];
