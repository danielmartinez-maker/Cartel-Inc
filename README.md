# Cartel: Containment

A JavaScript strategy game about restoring civilian control across one connected fictional country. The national campaign has **50 adjoining provinces, 1,200 districts, 3,600 simulated neighborhoods, 454 infrastructure assets, nine cartels and 117 named members**.

The generated country and neighborhood paintings, angular portraits, cream symbols and animated raster formations follow the established cut-paper art direction. All people, places and organizations are fictional.

## Play

Requires Node.js 20 or newer. No runtime dependencies, accounts or API keys.

```sh
npm start
```

Open http://localhost:8080. Choose New operation, a governor, difficulty and seed. Issue orders while paused, then press Begin. The main menu, loading screen, autosave, import/export, field manual and pause menu are included. JavaScript modules require a web server.

The map fills the screen. The command dock opens dedicated windows for forces, cartel leadership, development, infrastructure, economy, provincial administration and operations. Cartel dossiers have separate overview, member, branch, finances and territory pages. Forces separate recruitment from the roster; district commands separate conditions, security orders and neighborhood programs. Windows pause the campaign and can switch sections directly.

Select a province or use the province selector, double-click a district, then double-click a neighborhood for fine detail. The back control returns through neighborhood, district, province and country scales. Four raster detail levels keep close views illustrated; interactive boundaries are drawn on Canvas, with no SVG scenery fallback. A terrain library supplies reusable scenes rather than a unique painting of every settlement. Pointer, drag, wheel and keyboard selection remain available.

New campaigns can use a seeded scenario, reroll their opening, load a replay code or export a map briefing. The scenario preview is under “Scenario & map briefing” in campaign setup. Saved campaigns keep their established geography and gain absent economic fields without reseeding.

## Simulation layers

| Layer | What it changes |
| --- | --- |
| Provinces | Weekly spending priorities, utility continuity, transport access, service programs, administration and recruitment bases. |
| Districts | Support, intelligence, threat, security, stability, prosperity, fear, displacement and institutions. Rival faction cells can coexist. |
| Neighborhoods | Employment, grievance, service access, security, support and faction influence. Targeted relief, employment, outreach, inquiry and patrols affect their local conditions. |
| Infrastructure | Power stations, waterworks, hospitals, telecoms, depots, rail terminals, coastal ports, airports, dams, universities, highways and bridges have condition, capacity, congestion, security and infiltration. |
| Cartels | Funds, arsenal, manpower, counterintelligence, patronage, laundering, internal disputes, cohesion, logistics, evidence, fronts, rival relations and temporary pacts. |
| Regional command | Three branches per cartel have named commanders, loyalty, autonomy, stockpiles and recorded local decisions. Command disruption and stress slow their decisions. Autonomous branches can use their own supplies after central command collapses. |
| Members | Thirteen members per cartel, multiple command levels, 20 traits, skill, authority, ambition, stress, loyalty, exposure, district and neighborhood location. |
| Security forces | Up to 60 units have supply, readiness, fatigue, neighborhood patrol assignments and weighted travel. Units reroute at junctions when bridges close and hold when no open route remains. |
| Government | Local projects, provincial rollouts, national policies, inflation, corruption, weekly income, operating costs and a five-year mandate. |
| Civilian economy | Four goods, shared factory inputs, inventories, household needs, prices, wages, purchasing power, hardship, formal employment, tax leakage and physical freight movements. |
| Economic policy | Tax rates, open or escorted freight, essential-goods priority, public bonds, debt service and timed provincial investment. |

### Production, trade and public finance

The Economy window has four pages: Overview, Production & trade, Provincial markets and Treasury. Fuel and materials are actual inputs; stockouts idle dependent production. Power, water, labor, local threat, specialization and investment affect output. Goods clear through shared road and bridge capacity before household consumption. Theft, spoilage and storage overflow are recorded, and closed bridges stop trade. Infiltrated corridors can turn stolen cargo into cartel cash that still needs conversion.

Market prices and taxes affect household purchasing power. Weak institutions, informal activity and corruption reduce tax collection. Higher rates improve receipts at a cost to disposable income and formal employment. Freight escorts cost money and reduce capacity while cutting theft; relief prioritizes food and medicine.

Agricultural cooperatives, workshops, freight consolidation and small business credit each have three levels. Their projects reserve treasury funding and local materials immediately, take time to open, and add continuing upkeep. Public bonds create an equal liability and incur interest. The treasury shows recurring receipts, expenses and the last twelve weekly settlements. Every mandatory decision has a response available with an empty treasury, with weaker recovery or a trust cost.

### Infrastructure dependencies

Power failures reduce water pumping, hospital capacity and communications. Reservoirs provide partial power and water redundancy. Rail, depot and airfield output support logistics; freight congestion and infiltration reduce delivered output. Damaged bridges can force detours or isolate provinces. Repairs, capacity expansion, security deployments and audits cost money and take time.

Infrastructure infiltration can give a faction control of a facility. Commercial fronts in freight assets generate revenue. Audits expose cases, cut funding and remove fronts. The Activity view highlights urgent assets across the whole country.

### Cartel decisions

Six archetypes create different priorities: territorial, mercantile, clandestine, predatory, patronage and mobile. The central planner ranks affordable responses to local security, terrain, resources, communities, exposure and rivals. It can entrench, recruit, expand, bribe, coerce, withdraw, relocate, contest rivals, negotiate pacts, infiltrate infrastructure, build fronts, sabotage facilities and protect its investigations or command structure.

Regional commanders also plan local actions. Their staff hierarchy, skill, authority and stress affect decision timing. Branches spend stockpiles; loyal branches draw central funding, while autonomous branches retain local resources and can continue resisting during a leadership vacuum. Capturing a branch commander disrupts its local action.

Specialist losses change organizational capabilities. Investigations reveal members; witness deals depend on loyalty and protection. Leader arrests can trigger succession by an existing member if funding, cohesion and surviving territory permit it. The organization is dismantled only after command is in custody and its remaining cells collapse.

The simulation exposes its state and decision reasons to the player. It does not claim a hidden-information model or unlimited procedural factions. Autonomous branches remain tracked within their parent faction.

### Objectives

Stabilize **900 of 1,200 districts**, dismantle **all nine networks**, and hold both conditions for **14 consecutive days**. The mandate lasts **1,825 days**. A stable district has at least 75% stability, at least 60% support and less than 8% total threat. Stability grows with a civilian service or sufficient security. Zero public trust or an expired mandate ends the campaign.

## Animation and controls

Confrontations advance through approach, contact and containment using actual operation progress. Animated patrol and hostile formations, bursts, dust and smoke illustrate the encounter; its simulation report determines the ending. Unit tokens follow each route segment's accepted duration. Civilian walking cycles, moving traffic, rail convoys, boats, water motion, smoke, radio signals, construction, birds, clouds and changing light make the map active. Recorded freight travels on the same simulated corridors that carried the settlement; a newly closed bridge hides that flow.

Space pauses/resumes, 1/2/3 select time speeds, H opens the manual and Escape opens the pause menu or cancels deployment. Tab and Enter navigate controls. Map life can be disabled; reduced motion is respected. Ambient map life can continue while paused. Units and confrontation time wait for campaign time.

Version-one and version-two campaigns migrate to the connected country. Previous district cases, member identities, resources and in-flight work are preserved. Earlier version-three saves gain travel segment timings while retaining their accepted ETA. All restores pause, and imports validate geography, references, hierarchies, resources and active work.

## Verify and build

```sh
npm run check
npm test
npm run test:balance
npm run build
```

The test suite includes full campaigns through legal orders, world connectivity, AI decisions, regional command, infrastructure cascades, bridge isolation and repair, route animation, neighborhood effects, migration, deterministic replay and malformed save rejection. The separate balance driver runs nine campaigns across three difficulties and seeds without granting resources or directly changing simulation state.

The build copies a static release to `dist/`. Deploy that directory to a static host, preserving relative paths. Subdirectory hosting is supported. Use `node tools/serve.mjs --dist` to serve the build or `node tools/serve.mjs --port=8081` for another development port.

[Simulation rules](docs/SIMULATION.md) · [Verification and limits](docs/VERIFICATION.md) · [Art provenance](docs/ARTWORK.md)
