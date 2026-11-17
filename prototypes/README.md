# Sierra Command

An original JavaScript strategy game inspired by the territory control and civilian stability systems of Rebel Inc. You lead a government campaign against three fictional cartel networks in Sierra de la Luz.

## Play

[Open the browser version](https://raw.githack.com/danielmartinez-maker/Cartel-Inc/05556dbde12b807c9844034092ce4e7cb32dec08/prototypes/sierra-command.html). If a hosting notice appears, choose Open the page.

Download this branch and open `prototypes/sierra-command.html` in a modern browser. Everything is included in that one file: no installation, build, server, account or external asset downloads are needed.

Choose an administrator and difficulty, then begin the campaign. It starts paused.

- Click a province to inspect it. In Units, you can also choose a destination from the province dropdown.
- Assign a security unit and issue a deployment order.
- Gather evidence, disrupt cartel influence, fund community projects and audit corrupt institutions.
- Fund state-wide policies in Civilian, Security and Governance.
- Open leadership cases in Networks, then keep weakening the organizations until they are dismantled.
- Win by securing 20 of the 24 provinces and dismantling all three networks within 144 weeks. Public trust must stay above zero.

The field manual explains the exact prerequisites. Space pauses/resumes; N advances one week; 1, 2 and 3 select 1x, 2x and 4x speed. The game pauses when the tab is hidden and when political decisions appear.

## Campaign systems

Twenty-four connected provinces have independent threat, support, development, corruption, intelligence and control progress. Units take time to move and cannot protect their origin while in transit. Programs take several weeks; disruption requires a unit to remain on station through completion.

Three distinct cartel organizations track network strength, case intelligence and leadership status. Leadership arrests do not automatically dismantle a network.

Three playable administrators, three difficulties, six national initiative tracks with three levels each, local projects, recurring decisions, monthly funding, upkeep, spending inflation, autosaves and JSON import/export are implemented.

The schematic map uses original SVG terrain, roads, cities, dots and unit markers. Portraits are simple original vector illustrations. No Rebel Inc assets are used.

## Verification

Run `node prototypes/verify-sierra.cjs` from the repository root, or `node verify-sierra.cjs` in this folder.

Fifteen simulation checks cover determinism, costs, project duplication, movement, operation prerequisites and cancellation, leadership cases, paused decisions, save validation, institutional requirements, and victory/loss conditions. A scripted strategy wins eight seeded standard campaigns in 94–106 weeks.

The engine and interface scripts compile. Interface initialization and command handlers were exercised with a lightweight DOM stub, including campaign start, all four command panels, all three map layers and a policy completing.

Hosted browser checks confirmed campaign startup, map and HUD rendering, policy funding and completion, week progression, decisions, Units and Networks panels, province selection using the native dropdown, and ALPHA departing for and arriving in Bahía Clara. Exact movement timing is covered by the deterministic engine and command-handler checks.

Mobile layout, complete keyboard navigation, and actual save-file download/import dialogs still need separate browser QA.
