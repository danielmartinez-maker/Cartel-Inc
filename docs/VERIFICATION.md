# National campaign verification, v0.6

Verified on 17 November 2026. Gameplay and visual review revision: `dea590737e2b99a68156268275db382d306d9277`.

[Play the reviewed build](https://raw.githack.com/danielmartinez-maker/Cartel-Inc/dea590737e2b99a68156268275db382d306d9277/index.html)

## Automated checks

- 91 Node tests passed. The suite includes five complete legal-order campaigns across all governors and difficulties.
- 38 JavaScript modules passed syntax and asset checks. Production build and whitespace checks passed.
- GitHub Actions Verify campaign passed on the reviewed gameplay revision (run 36).
- The separate legal-order balance driver won all nine campaigns without resource grants or direct state changes:

| Difficulty | Seed 72841 | Seed 4 | Seed 197 |
| --- | --- | --- | --- |
| Assisted | Day 267, 1,000 stable | Day 267, 984 stable | Day 268, 995 stable |
| Standard | Day 323, 965 stable | Day 324, 964 stable | Day 325, 981 stable |
| Veteran | Day 373, 967 stable | Day 373, 953 stable | Day 374, 958 stable |

Each ended with all nine networks dismantled, zero remaining threat, positive public trust, nonnegative funding and the required 14-day hold. This demonstrates a legal winning strategy across these seeds, not the success of every possible strategy or a substitute for human balance feedback.

### Covered regressions

- All 50 adjoining provinces, 1,200 district polygons and 3,600 neighborhood records; symmetric land connectivity and weighted routes.
- All 454 facilities and corridors, power/water/health/communications cascades, reservoir redundancy, congestion, costed repairs, capacity upgrades, security and front audits.
- Bridge closure before deployment entry reroutes a unit. Closing all bridges isolates provinces 24 and 37; a cut-off unit holds without phantom travel progress and resumes after a real repair. Route interpolation uses segment durations, including restored saves.
- Nine organizations, six archetypes, 117 reproducible members, 20 traits, hierarchy references, central plans, costs, rivalry, pacts, front revenue and succession.
- Regional withdrawal under security pressure, stockpile and funding consumption, command disruption, stress, autonomous action without central funds, and rejection of cyclic reporting chains.
- Neighborhood employment and inquiry, patrols, utilities, grievance and feedback into district conditions; provincial priorities and continued costs.
- Version-one and version-two migration, earlier version-three route timing compatibility, validated active work, deterministic replay and malformed import rejection.
- Presentation remains separate from simulation randomness. Confrontation stages use authoritative progress; pause, disabled motion, hidden views and real outcome labels are covered.

## Live browser review

The immutable gameplay build was reviewed in Chromium through normal controls. The existing day-146 review campaign resumed paused with its prior progress and the new world intact. Review ended paused on day 164.

- National view showed 50 selectable province shapes, a 9900×5900 viewBox, and all 50 entries plus the country option in the province selector.
- Province 50, Valle de la Concordia, opened with its correct heading, 24 selectable districts, nine infrastructure/corridor markers and a district directory.
- Infrastructure layer rendered four dependency paths and two freight convoys in that province. Facility controls displayed condition, security, infiltration, utilization and effective output.
- A legal power-station repair spent funds, displayed 12 days remaining and an active repair marker, and completed at full condition. The facility subsequently showed ordinary wear and improved output.
- Neighborhood close zoom showed three distinct cells and 42 crisp building symbols in the selected urban district. Returning from country scale to neighborhood scale rebuilt the three cells correctly.
- A La Estación employment program was funded through the interface, showed 12 days remaining and completed. The inspected neighborhood showed 79% employment afterward.
- The Los Cedros dossier displayed thirteen members and three branches. Advancing time produced real recorded branch actions: contesting a rival, establishing a neighboring cell and recruiting locally. Stockpile, command-effectiveness and last-action details were visible.
- ALPHA deployed from El Pinar to Las Cumbres using the accepted five-day route while an investigation completed there. Its supply and fatigue readouts changed, and it became available for orders on arrival.
- A legal containment operation displayed ADVANCING and IN CONTACT phases. Pausing held the troop formation. The operation later reported that Los Cedros evaded containment; the map result read CELL EVADED and the district retained rival cells.
- Disabling Map life removed the transient result; reenabling it did not replay the result. The final campaign remained paused with Map life enabled.
- The campaign desk showed the correct five-year limit, Day 148 of 1825, during review.
- No game-origin errors appeared in the scoped console check. Browser-extension metadata messages were separate from game code.

## Evidence limits

World connectivity, emergency cascades, bridge isolation/rerouting, blocked-route recovery, deterministic replay, full victories and import compatibility are automated evidence. The live review covered selected provinces and operations, not a manual visit to all 3,600 neighborhoods. No new frame-by-frame video, device GPU measurement, mobile-size review or file-picker import test was recorded in this pass. Previous v0.5 screenshots and earlier confrontation GIFs remain historical evidence, not screenshots of the current national campaign.
