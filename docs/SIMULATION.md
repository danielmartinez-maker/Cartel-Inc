# Connected national campaign, v0.8

Fifty adjoining province polygons share boundary vertices, forming one contiguous country. Each contains 24 Voronoi districts, with three clipped neighborhood cells per district. The 1,200-district route graph is symmetric and connected by land. Shared polygon arrays define clipping, selections, boundaries and hit testing on a Canvas renderer. The map uses separate raster artwork for country, province, district and neighborhood scales, with crossfades into closer detail. It never substitutes SVG buildings at close zoom.

## Authoritative daily tick

Accepted commands spend immediately and store their duration, target and forecast. Each daily tick processes force travel and recovery, public works, local projects, operations, provincial rollouts, infrastructure wear, district conditions, neighborhood conditions, central and regional cartel actions, weekly finance, events and terminal objectives. Infrastructure output is refreshed after AI actions so sabotage appears immediately. Decisions pause the simulation. The campaign PRNG is separate from animation geometry and timing. Save replay is deterministic.

## Communities and public works

District fear and displacement erode support. Prosperity affects government funding and cartel recruitment. Institutions, services, stations and ready units suppress cells. Three neighborhoods per district separately track support, service access, employment, grievance, security and nine faction influence values. Utilities feed neighborhood access; education and commerce support employment. Grievance changes recruitment pressure. Neighborhood support and employment feed back into the district. Individual patrols improve local security. Targeted programs are costed, timed and unique per neighborhood.

Province priorities add continuing weekly costs and influence services, employment, security or integrity. Water and clinic rollouts deliver one eligible district daily. National administration can open provincial water delivery and administration sequentially. Regional hubs and secure stations can recruit locally.

## Infrastructure and supply

There are 454 facilities and interprovincial corridors. Every province has power, water, a hospital, telecoms, a depot and a rail terminal. Geography also determines coastal ports, airfields, reservoirs and universities. State includes condition, level, security, infiltration, controller, load and outage duration.

Output combines condition, capacity level, infiltration, congestion and outages. Loads over 75% reduce delivered output. Power supports water pumping, communications and hospitals; reservoirs provide limited backup. Freight facilities support logistics and commerce. Employment and household access react gradually to sustained service failures. Facilities wear over time, while policies, repairs, security and audits counter deterioration and infiltration.

National supply access is a weighted province graph from headquarters. Bridge condition below 15 closes its edge. Other corridors remain usable with delay from poor output. District threat, local facilities, administration and logistics policy also affect supply. Unit supply, readiness and fatigue modify power.

Deployment stores the full path and the travel days for each edge. Tokens interpolate on that timing rather than on geometric length. At junctions, units recalculate the next edge cost and reroute around a new closure. If all alternatives are closed, they hold without consuming travel time and resume when an actual repair reopens access. An already entered crossing completes before the next junction assessment. Repairs take effect after the force movement phase, so a newly opened route is used on the following day.

## Civilian markets and public finance

Food, fuel, materials and medicine have provincial inventories, production, factory use, household needs, actual consumption, waste and local prices. Food and materials production require fuel; fuel production needs materials; medical production needs both. Producers share opening inputs proportionally. Resource specialization, labor, security, power, water and completed investment determine potential output. Input shortages limit actual output.

Each weekly settlement produces goods, clears neighboring markets across the real corridor graph, then delivers household consumption. All goods share a corridor capacity across three clearing passes. Bridge closures stop transfers. Open freight maximizes throughput; escorts use 18% of capacity and an $8 weekly allocation to cut loss risk by 78%; essential-goods priority costs $6 and moves food and medicine first. Shipment records identify origin, destination, good, load and loss. Controlled corridors can add stolen value to the controlling faction’s illicit cash. Remaining perishable stock spoils, logistics investment reduces spoilage, and each good has a 500-unit warehouse limit. Overflow is recorded as waste. Rounded stock ledgers are regression-tested for conservation.

Unfulfilled household demand raises shortage and price pressure. The local price basket and tax rate determine real purchasing power from the wage index. Employment, institutions, economic conditions and business investment influence formality and hardship. Production and prosperity form the tax base; corruption, coercion, informal activity and disconnected access reduce collection. These are abstract regional indices, not a household-level simulation.

Four investments have three levels each: agriculture, industry, logistics and enterprise. Up to six projects can run at once. Accepted orders reserve money and local materials; benefits begin only on completion. Each level adds $0.30 weekly upkeep. Projects appear in active orders and survive validated saves. Borrowing adds $120 to both cash and principal, capped at $600. Repayment removes up to $60 from each. Interest is 0.6% per week. The budget separates grants, recovery, tax receipts, financial enforcement, administration, forces, infrastructure, priorities, financing and economic programs. Twelve reconciled settlements are retained. Mandatory events always include a zero-cost response so liquidity cannot freeze time permanently.

## Organizations and central AI

Nine cartels use six archetypes. Thirteen named members per faction have 20 possible traits, command references, skill, loyalty, exposure, authority, stress, ambition and district/neighborhood locations. Traits and specialists change real capabilities, with arsenal, manpower, institutional penetration, counterintelligence, cohesion and logistics contributing further modifiers.

Funds pay for ranked central plans. The planner scores local and rival conditions, government presence, terrain, public support, prosperity, infrastructure opportunities, strategy and exposure. It chooses among its three highest scored affordable plans through the seeded PRNG. Plans include recruitment, fortification, expansion, coercion, bribery, withdrawal, relocation, rivalry, pacts, infrastructure infiltration, fronts, sabotage, counterintelligence and discipline. Expansion and withdrawal cannot traverse closed bridges. Up to 80 strong cells per faction can participate in central expansion.

Pacts expire after 21 days and block rivalry against their parties. Relations are symmetric. Protection rackets, contraband, illicit drug markets, illegal extraction, freight theft, fuel diversion, procurement fraud and commercial fronts generate separate abstract weekly revenue streams. Each source requires occupied activity locations and depends on local security, institutions, resources or facility output. Individual sources can be disrupted for 28 days. Illicit proceeds accumulate separately; cash-conversion capacity and active financiers limit usable funds, with overhead paid before the net reaches faction reserves. Fronts only persist while the faction controls the facility with sufficient infiltration. Audits can remove the front, reduce funding and strengthen the case.

## Regional command and succession

Each cartel has three regional branches with commanders, stockpiles, autonomy, loyalty, posture and a recorded last action. Regional planners consider consolidating, recruiting, withdrawing, expanding, rivalry, infrastructure penetration and local revenue. Available supplies and central funding constrain orders. Active staff, skill, authority, stress and broken reporting chains affect command effectiveness and action cadence. Commander traits affect preferences. Branch plans remain inside their assigned province.

Loyal branches can draw central resources. High autonomy and low loyalty can produce a splintered branch, which uses its own stockpile and collects local resources. It can resist after a leader arrest even with no central funds. It remains part of the original faction's dossier and victory requirement. Capturing or turning its commander disables its decisions. Branch resource consumption and plans survive saves.

A leader arrest reduces funding, cohesion and cells and opens a succession assessment. A surviving candidate, sufficient cohesion, funds and remaining strength permit promotion. Promotion uses an existing member, leaves the old specialist role vacant and reconnects the hierarchy without creating a reporting cycle. Investigations and accepted operations prevent targets from relocating before resolution. Captured organizations decay; after remaining cell strength falls below three, dissolution stands down unfinished faction operations.

## Objectives and compatibility

The five-year mandate requires 900 stable districts and all nine organizations dismantled, sustained for 14 days. Public trust reaching zero or day 1,825 causes defeat. Force, project and public-works caps are 60, 32 and 40.

Version-one and version-two saves are validated by the archived previous engine before migration. Original districts, member identities, cases, finances and active work are retained. New geography recalculates old moving routes. Existing version-three moves lacking segment timings retain their accepted ETA while gaining valid timings. Restores pause. Validation rejects invalid cells, assets, command cycles, asymmetric relations, impossible references, duplicate work, malformed route timings and inconsistent operating units.

## Scope

The player sees the simulated state directly. This is not an intelligence deception model. Splintered branches retain their parent faction identity, and succession uses a finite cast. All 50 provinces currently have the same district count and neighborhood count. Geography and civilian conditions vary, but this release does not simulate every household, vehicle or individual armed member as an independent agent.
