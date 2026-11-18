# Current national map, v0.6

The connected map uses a 50-province overview, a 24-district provincial view and a three-neighborhood close view. Only the active province has detailed district, infrastructure and traffic DOM elements. Freight convoys travel between simulated rail terminals, depots, ports and airfields; facility output determines whether they run. Utility lines stop flowing when a dependent facility loses service. Repairs have visible work rings and active facility halos. Unit tokens follow accepted travel days for each route segment and stop at blocked crossings. Map life and reduced motion stop animation. Ambient effects can continue during pause; units, orders and encounters use campaign time.

The earlier implementation record follows. Sea-route ambience described below belongs to the previous island map.

# Living provinces, v0.5

Verified live views: [province and Activity view](living-province.jpg) · [keyboard deployment preview](deployment-preview.jpg). These are unmodified browser screenshots.

The generated province painting remains the foundation. SVG dots, silhouettes and progress rings add motion above it while keeping boundaries, labels and orders selectable. The v0.5 country view uses five land masses, 120 districts, regional detail zoom and native transport corridors. A new terrain painting extends the art; no runtime dependencies were added.

## What moves

- Civilian vehicles follow connected district routes. A route closes visually when either endpoint has at least 35 threat. Support affects the amount of visible civilian movement.
- Five fishing boats travel outside the land silhouette, with small wakes. Bird flocks and translucent cloud shadows move across the province. A land clip and sea mask keep effects on the correct surfaces.
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

The original v0.3 live browser checks verified saved-campaign continuation, moving ambience with paused mandate time, smooth unit transforms between daily ticks, fixed unit positions while paused, persistent motion preferences, keyboard route preview and dispatch, simultaneous construction and investigations, completed-service stamps, arrival/completion notifications, Activity ordering and map-layer switching. Night-watch and first-light labels were also observed as campaign days advanced. Browser-extension messages were excluded from game-console assessment.

Current five-province navigation, faction dossiers and migration were reviewed separately. See [v0.5 verification](VERIFICATION.md).
