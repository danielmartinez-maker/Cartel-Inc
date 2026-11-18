# Campaign verification, v0.8

Verified on 18 November 2026. Gameplay version: `0.8.0`. These notes describe the raster renderer, command menus and expanded civilian economy. Earlier screenshots and verification notes in Git history describe earlier builds.

## Automated evidence

- 120 Node tests pass.
- 49 JavaScript modules pass syntax and asset checks; the static production build and whitespace checks pass.
- All nine separate legal-order campaigns reach victory. The driver uses the real seeded opening and normal orders, without granting resources, moving units directly or altering AI state.

| Difficulty | Seed 72841 | Seed 4 | Seed 197 |
| --- | --- | --- | --- |
| Assisted | Day 287, 986 stable | Day 284, 994 stable | Day 286, 984 stable |
| Standard | Day 350, 967 stable | Day 350, 970 stable | Day 354, 976 stable |
| Veteran | Day 403, 949 stable | Day 402, 965 stable | Day 408, 963 stable |

Each run dismantled all nine organizations, reached zero remaining threat and completed the 14-day hold. This verifies a legal winning strategy for these runs, not every strategy or human balance preference.

The balance pass caught a mandatory emergency with no affordable option at low cash. Three regional emergencies now include a free fallback with weaker recovery or a public trust cost. A regression exercises every event with an empty treasury and verifies that the campaign can advance afterward. The driver also explicitly checks affordability instead of silently failing its preferred response.

The raster source-size calculation is checked against all 3,600 neighborhood polygons at four viewport and pixel-density combinations, including large corner cells and high-density displays. This is geometry evidence, not a mobile visual review.

## New economic coverage

- Fuel stockouts idle dependent producers; available materials can still restore energy output.
- Multiple goods share one corridor capacity. Closed bridges stop freight and increase unmet demand and prices.
- Goods reconcile across production, actual factory inputs, household consumption, stolen cargo, spoilage, warehouse overflow and ending inventory, within cent-rounding tolerance.
- Escorts reduce the stolen share and add an explicit $8 weekly cost. Infiltrated cargo adds illicit cash that remains subject to conversion limits.
- Higher tax rates exchange household purchasing power for receipts. Corruption diverts part of the assessment.
- Investments reserve treasury money and local materials, appear in active orders, finish on their accepted day, add upkeep and survive save/replay.
- Duplicate investment, insufficient materials, invalid targets and maximum development are enforced. Malformed policies, investments, shipment records, consumption and histories are rejected.
- Public accounts reconcile; twelve settlements are retained. Earlier economic saves gain absent fields without changing cartel territory or campaign progress.

The existing suite also covers geography, hierarchy validation, bridge isolation and recovery, cartel and regional decisions, infrastructure cascades, neighborhood programs, combat tactics, committed units, save migration and deterministic replay.

## Live interface review

Reviewed the running app in Chromium at 1363 × 936 through normal controls. An earlier saved campaign resumed paused, retained its progress and gained the new economic accounting. The review campaign remained paused on Day 24 when capturing the final views.

- Full-screen map with a compact command dock and separate modal command windows. Main sections switch directly while time remains paused.
- All nine portraits appear in the leader gallery. A dossier opens 13 members and eight separate income sources on their own pages.
- Forces separate three recruitment types from the filtered roster. A movement filter correctly shows an empty state when no unit is traveling.
- Four Economy sections open independently. Production inputs, actual stocks, local prices, household measures, recorded trade and facility links display real state.
- A small business investment spent $28 and eight local materials, displayed 12 days remaining, then opened at level one. Subsequent weekly accounts included its $0.30 upkeep.
- The ledger displayed three weekly settlements. Issuing a $120 bond and repaying $60 left $60 principal and the matching cash change. Recovery tax and escorted freight settings persisted after reload.
- Province fifty opened its 24-district directory. Sierra Alta opened correct district and neighborhood controls. Fine zoom kept raster buildings and streets; the map container contained no SVG scenery.
- Country, province, district and individual-neighborhood navigation remained available. Ready units at a shared base use separate token slots.
- Screenshots show the live interface, not generated UI mockups: [leader gallery](command-gallery.jpg), [production and trade](economy-trade.jpg), and [neighborhood zoom](neighborhood-zoom.jpg).

## Limits

The art library reuses terrain scenes across settlements. The drawing changes between zoom levels through raster detail transitions; it is not a continuous 3D reconstruction or a unique painting of each neighborhood. Labels, boundary lines and progress arcs are Canvas overlays.

This pass did not repeat a full combat video capture, mobile-size review, file-picker import, manual visits to all 3,600 neighborhoods or GPU performance measurement. Combat and import rules remain covered by the automated suite; the new frame sheet and active terrain were inspected visually. Existing weather and encounter recordings are historical evidence, not recordings of this build.
