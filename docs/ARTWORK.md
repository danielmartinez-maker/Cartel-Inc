# Artwork provenance

The active artwork follows the user-approved reference: angular cut-paper faces, warm ochre and burnt-sienna planes, deep petrol teal backgrounds, bold cream silhouettes and fine screenprint grain. The supplied reference was used as a style guide; it was not included as a game asset or modified.

The built-in image generation tool produced both active atlases, then they were resized and encoded as WebP. Drafts remain in `assets/portraits.webp` and `assets/initiatives.webp`; the game uses the versioned `-print` assets below. The game makes no image generation or external asset requests.

## Character portraits

File: `assets/portraits-print.webp`, 1152 × 768, 3 columns × 2 rows. All six fictional characters retain their campaign roles and positions, now with clear angular planes and a common teal backdrop.

| Cell | Character | Role |
| --- | --- | --- |
| 0, 0 | Elena Cruz | Governor |
| 1, 0 | Rafael Ibarra | Governor / commissioner |
| 2, 0 | Lucía Vega | Governor / prosecutor |
| 0, 1 | Mateo Salcedo | Los Cedros leader |
| 1, 1 | Inés Valdés | La Marea leader |
| 2, 1 | Tomás Roca | La Frontera leader |

Generation prompt:

> undefined

## Initiative emblems

File: `assets/initiatives-print.webp`, 1024 × 512, RGB, 4 columns × 2 rows. Cream silhouettes on square teal panels replace the circular draft badges.

| Row | Icons, from left to right |
| --- | --- |
| 0 | Star shield, open eye, justice scales, healthcare cross |
| 1 | Education, roads, water, community buildings |

Generation prompt:

> Use case: stylized-concept. Asset type: single production sprite atlas for Cartel: Containment game. Image 1 is the user's approved visual STYLE REFERENCE; match its BOTTOM ROW of oversized cream cut-paper emblems on deep petrol teal square panels. Create a new icon-only sprite atlas with exactly 4 equal square columns and 2 equal square rows, 2:1 landscape, aligned edge to edge, no gutters. Every cell has the exact same uniform textured deep teal background, approximately #0b3632, with one bold centered warm cream silhouette icon, approximately #f6dfae. The icon fills about 70 percent of its square with generous clear margins. Top row left to right: (1) broad heraldic shield with a dark teal five-point star cutout, (2) wide open almond-shaped eye with round iris, (3) balanced justice scales with sturdy base and two hanging pans, (4) equal-armed medical cross. Bottom row left to right: (5) open book with a center fold, (6) simple curving road with dark dashed central line, (7) single water droplet, (8) a group of three apartment buildings with square dark window cutouts, matching the reference. Flat bold block shapes, minimal details, slightly imperfect paper-cut edges and subtle fine ink grain exactly like the reference's shield, eye, scales and buildings. Solid cream emblems on teal panels, not circular badges. No gradients, no 3D, no glossy lighting, no drop shadows, no thin outline-only icons, no photographs, no text, no numbers, no letters, no border, no people, no extra symbols, no UI, no watermark. This is an asset atlas, not a mockup.

## Interface and cartography

`art-direction.css` applies the reference palette to the command panels, initiative desk, portraits, dialogs, time controls and map framing. The province uses warm paper against teal water. Status colors and geometric unit markers remain distinct. Portraits are larger in the commander header and network dossiers so their faces remain legible.

| Color | Use |
| --- | --- |
| `#0b3632` | Teal ink, water, header and emblem backgrounds |
| `#f6dfae` | Cream symbols and titles |
| `#d6a04f` | Ochre accents and time controls |
| `#b75d3c` | Burnt-sienna warnings and hostile presence |
| `#f3e7cc` | Warm paper command surfaces |

`assets/print-grain.svg` provides a subtle static grain overlay without blocking input. Solid SVG shield, eye and building symbols match the raster emblems at small sizes. Map geometry, terrain marks, population dots, unit markers and navigation symbols are original code-native SVG.

No assets, logos, maps, characters, sounds or source code from Rebel Inc. were used. Sound cues are synthesized locally with Web Audio.
