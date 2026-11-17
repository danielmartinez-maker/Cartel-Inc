# v0.5 verification

Verified on 17 November 2026.

## Automated checks

- Syntax and asset checks: 24 JavaScript modules, all entry points, stylesheets and generated art present.
- Node test suite: 58 tests passed, including five full legal-order campaigns and the new strategy-layer regressions.
- Separate balance driver: all nine legal-order campaigns won, covering seeds 72841, 4 and 197 at Assisted, Standard and Veteran. Victories occurred between days 252 and 392; all nine networks were dismantled and at least 90 districts stabilized. This is a regression strategy, not a claim that every player strategy will win.
- Production build passed. No runtime dependencies added.
- GitHub Actions Verify campaign passed on gameplay commit `d05b9d903236b605e62d8483a113aafea71b5134`.

The final follow-up also verifies that an encounter disappears when its target faction has no cell left, even if a rival remains.

The added regressions cover exact 5× playable land area, 120 unique districts, weighted routing, six archetypes and 45 seeded members, real trait/role capability effects, ranked and affordable AI plans, pressure-driven withdrawal, relocation/watch locks, pact expiry, named succession, blocked succession, staff arrests, loyalty-based witness deals, rival cell targeting, provincial rollouts, supply and recovery, regional recruitment, roster caps, legacy migration, malformed save rejection, and standing down in-flight orders after dissolution.

## Live browser review

The immutable gameplay preview was reviewed in Chromium:

https://raw.githack.com/danielmartinez-maker/Cartel-Inc/d05b9d903236b605e62d8483a113aafea71b5134/index.html

- The existing version-one campaign resumed at day 69. Its earlier resources and unit positions remained, the interface showed 120 districts and nine networks, and time remained paused after restoration.
- The SVG contained all 120 selectable district groups and the country viewBox was 3300×1900.
- Each of the five province selectors zoomed to the corresponding region and displayed the correct province heading.
- All nine faction selectors displayed the appropriate cartel and archetype, with five members in each dossier. New leader art loaded in the established style.
- An investigation into a named lieutenant completed through normal controls and raised exposure from 18% to 43%. Case progress, prerequisite reasons, individual traits, roles, loyalty and skill were readable in the dossier.
- Faction decision histories recorded recruitment and expansion after advancing time. A provincial decision paused the campaign as expected.
- The force roster displayed supply, readiness, fatigue and costed resupply. Deployment and a containment order were accepted through the interface. Encounter ownership and all confirmed result variants are covered by automated tests; no new frame-by-frame motion comparison was recorded for this expansion.
- No page-origin console errors were observed during the final review. Browser-extension metadata errors were unrelated to the game.

Screenshots show the migrated test campaign at day 146: [country overview](expanded-campaign.jpg) and [regional member dossier](cartel-member-traits.jpg). The browser screenshot is evidence of the rendered state, not of a completed campaign victory. Save-file picker interaction was not retested; version-one fixture migration and version-two validation/replay were tested in Node.
