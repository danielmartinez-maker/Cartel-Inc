# Living province, v0.3

The generated province painting remains the foundation. SVG dots, silhouettes and progress rings add motion above it while keeping boundaries, labels and orders selectable. No external assets or runtime dependencies were added.

## What moves

- Civilian vehicles follow connected district routes. A route closes visually when either endpoint has at least 35 threat. Support affects the amount of visible civilian movement.
- Three fishing boats travel outside the land silhouette, with small wakes. Bird flocks and translucent cloud shadows move across the province. A land clip and sea mask keep effects on the correct surfaces.
- The campaign day selects a gradual daylight, golden-hour, night-watch and first-light cycle. Town lights appear during night watch. Some weather fronts add passing rain. Lighting and weather have no simulation effects.
- Moving units interpolate along their actual assigned route between campaign days. Route dashes, unit beacons and operational scans run while the mandate is active. Persistent unit elements preserve keyboard focus across daily renders.
- Investigation and construction rings show actual order progress. Completed services or police stations leave stamps. Arrivals, completions, newly active cells, stabilization and lost stability produce brief, bounded map notifications.

## Planning and access

Activity lists all active projects, operations, unit training and travel, sorted by remaining duration. Selecting an item opens its district. The same view shows the five most threatened districts, mandate progress, the next funding date and recent reports.

While deploying a ready unit, hover over a district or focus it with Tab to preview its route and ETA. The preview and accepted move use the same `movementPlan` function, including completed road repairs. Enter or click still issues the order; previewing never mutates the campaign.

Map life switches ambient motion on or off without pausing the simulation. Its preference uses a separate local-storage entry. Device reduced-motion settings override motion; CSS also disables transitions and keyframes. All mission information remains available in static rings, status labels and the field log.

## Time and performance

One animation-frame loop drives the presentation clock and the existing daily simulation. Pausing preserves a partially elapsed day. Speed changes preserve that fraction. A frame stall contributes at most 250 ms, and the existing visibility handler pauses the campaign when its tab becomes hidden.

Map motion updates are bounded to roughly 30 updates per second and reuse existing SVG nodes. Hidden menus, dialogs and tabs suspend map effects. Scene lifetime is bounded: traffic and flocks have fixed populations, unit and work nodes are keyed, and no more than twelve transient notifications are retained. Presentation geometry and weather use no campaign randomness, so saves and operation outcomes remain deterministic.

The automated suite verifies clock equivalence across all three speeds, pause and stall handling, distance-based path sampling, preview/order agreement, read-only presentation, activity ordering and truthful milestone labels. Existing campaign rules and legal-order balance runs continue to pass.
