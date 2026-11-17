# Expanded campaign simulation, v0.5

The country contains five provinces, each using 24 independently simulated district cells. The translated/mirrored land polygons have exactly five times the original polygon area. A 3300×1900 country view covers the five land masses and their sea corridors. District identity 0–23 belongs to the original province so old save references survive migration. Decorative painting does not define hit areas or adjacency.

## Tick and determinism

Accepted orders spend immediately and store duration, selected faction, operation power and forecast. Each day processes unit travel and logistics, completed projects and operations, provincial service rollouts, district conditions, cartel decisions, public trust, weekly finance and terminal objectives. Pending decisions stop ticks. The seeded PRNG belongs only to simulation; presentation never consumes it.

A district has a nine-value cell array. Total threat is synchronized from this array, capped at 100; adding one faction cannot overfill a district. Containment and asset disruption affect the explicitly selected faction. Removing the last cell of one faction does not remove its rivals. UI dots use the dominant faction's color, and confrontation effects use the operation's actual target.

## AI decisions

Every active organization schedules a decision roughly every 5–20 days, depending on effective logistics. Plans are scored and unaffordable or impossible plans are excluded. The best three are weighted by squared scores, then selected with the campaign PRNG. Replaying a save preserves the choices.

Expansion starts from established cells and follows the district graph, including transport corridors. Security presence, support, institutions, stability, local threat and terrain affect targets. At most 18 cells of strength 12 or more can be active for one faction before new expansion stops. Rival attacks require a neighboring rival and respect active pacts. Relations and pact pairs are symmetric. Pacts expire after 21 days and contribute to organizational income.

Cohesion modifies defense and aggression; logistics modifies mobility and decision intervals. Funding pays for decisions and constrains recruitment. Heat encourages relocation. Investigations establish a temporary watch that blocks relocation, and an accepted member operation locks its target's location through resolution. Captured leadership stops normal plans and cell growth, with reduced income while the organization attempts recovery.

Dossier decision reasons report the factor associated with the selected plan, rather than inventing narrative events. The game exposes simulation information directly; it does not implement a hidden-information deception model.

## Members and succession

Forty-five seeded members are generated, with unique names and five initial roles per faction. Two traits per member contribute skill-weighted capability modifiers. Leader traits carry greater organizational weight than staff traits. Removing a specialist applies an additional role penalty. Loyalty influences witness-deal chance; exposure gates individual operations.

Arresting a leader reduces cohesion, funding and cell strength and sets one succession assessment date. Succession needs cohesion above 44, at least 20 funds, remaining total strength above 35, and an active candidate. Skill, loyalty and ambition rank candidates. A promoted member leaves their old specialist role; the captured leader becomes a former leader. No members are generated during succession. Successful promotion loses more cohesion, funding and evidence, and returns the organization to active decisions. If recovery fails, the captured organization continues to decay.

## Civilian and force layers

Prosperity affects recruitment priorities, legal income and weekly government funding. Fear and displacement reduce support. Institutions and services suppress cells. Provincial water and clinic programs deliver only one eligible district daily and skip already completed or currently funded local projects. Regional administration affects every district in its province and opens its hub for recruitment if secure. Local stations can serve as forward recruitment bases.

Supply depends on the route from headquarters, average threat along that route, local stations, regional administration and the logistics policy. Ready units approach local supply access; movement and operations consume supply and increase fatigue. Readiness and fatigue recover faster in quiet districts. Unit power uses all three values. Resupply is a costed three-day operation with the unit unavailable during delivery. Upkeep grows with roster size, capped at 18 units.

## Save compatibility and limits

Version-two saves include cell arrays, members, relations, pacts, AI timers, civilian conditions, regional programs, force logistics and operation targets. Validation rejects invalid references, inconsistent threat totals, asymmetric relations, duplicate work and broken operating-unit assignments. Version-one saves are validated before migration. Original districts and in-flight orders are retained; new faction state and territories use the original campaign seed. A migrated victory opens the new campaign phase. A migrated defeat stays terminal. All restores pause.

Verification includes exact-area geometry, connected and weighted routes, capability changes, pressure responses, affordable AI decisions, pact expiry, real leader arrests and succession, blocked succession, member operations, rival cell targeting, regional rollouts, supply, bases, roster caps, migration and malformed imports. The legal-order campaign driver exercises all nine arrests, remaining-cell cleanup and the 90-district objective on all three difficulties.
