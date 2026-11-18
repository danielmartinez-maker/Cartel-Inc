# Artwork provenance

## Current raster renderer, v0.8

The active campaign renders artwork with Canvas. Shared polygon data supplies clipping, boundary overlays and hit testing. The country, province, district and individual neighborhood have independent raster detail levels. The closest supported zoom adapts to the neighborhood bounds, source resolution and canvas pixel density, rather than stretching every cell to one fixed magnification. Street and building illustrations remain bitmap art at the closest supported zoom; there is no SVG scenery fallback. High detail is assembled from reusable terrain scenes, not 3,600 unique paintings. The art transition is a crossfade between scale-specific drawings, not a geometrically continuous 3D reconstruction.

The interface keeps the map full-screen and moves detailed controls into dedicated command windows. A nine-leader gallery opens organization dossiers; economy, force and district sections have their own submenus. The former website-style rails and permanent initiative desk are hidden in the current layout.

| Active asset | Dimensions | Purpose |
| --- | --- | --- |
| `assets/connected-country.webp` | 3960 × 2360 | National painting |
| `assets/province-detail.webp` | 1536 × 1024 | New continuous provincial painting |
| `assets/terrain-*.webp` | 1254 × 1254 each | Nine reusable close scenes: civic, residential, docks, rural, hills, industrial, arid, wetland and coast |
| `assets/neighborhood-tiles.webp` | 1254 × 1254 | Earlier close-scene atlas retained as raster loading fallback |
| `assets/map-sprites.webp` | 1254 × 1254 | 36 cutouts for formations, facilities, vehicles, weather, plants, construction and effects |
| `assets/field-animation.webp` | 1536 × 1024 | New 6-column, 4-row transparent animation sheet |
| `assets/command-emblems.webp` | 1774 × 887 | New 6-column, 3-row transparent interface symbols |

The animation rows are federal patrol, hostile formation, civilian shoppers and water. Each has six successive poses. The renderer samples them independently from campaign randomness, with combat time frozen when the campaign pauses. Civilian and water ambience follows the Map life setting. Other moving assets include image-based cars, trucks, boats, rail vehicles, clouds, birds, smoke, dust and construction. Infrastructure outages and operating conditions gate related effects. Recorded trade convoys follow actual freight corridors and stop displaying after a bridge closes.

The command emblems are coins, heart, scales, flag, network, shield / wheat, factory, warehouse, map, eye, book / community, medical cross, water, road, bridge, wrench. They replace mismatched facility illustrations in the treasury, corruption and command controls. Small geometric progress arcs and hit-testing boundaries are interface overlays, not replacement scenery.

The three new production assets were created with the built-in image generator. The patrol sheet received a background-extraction pass that preserved its layout; alpha was retained when encoding WebP. The province drawing was encoded as WebP at its generated resolution. No artificial upscaling is used to claim additional source detail.

### Province detail prompt

> Use case: stylized-concept. Asset type: a production high-resolution province terrain illustration for a strategy game, no UI. The supplied picture is a STYLE REFERENCE only for angular cut-paper illustrated cartography and restrained ochre, burnt sienna, cream, pine green and deep teal colors. Draw a single continuous rural-to-urban province with dense fine details at 3072 by 2048 pixels, landscape 3:2. View straight from high overhead, only a little axonometric relief. Fill the entire rectangular canvas edge to edge with LAND; no island silhouette, sea, ocean, border, margins, frame or horizon. Composition: quiet golden farms, varied field shapes, orchards and small woods across most of the image, a ridge of angular low mountains along the upper quarter, several very small outlying rural settlements, one modest cream provincial capital with connected street blocks and terracotta roofs just RIGHT of center, a second smaller town lower left, a thin teal river flowing from upper middle down through the image with two bridges, a subtle rail line, small freight depot at bottom right, and tiny power and water works. The capital must occupy at most one eighth of the image; this is a whole PROVINCE with expansive readable quiet countryside around the settlement, not a close-up sea of repeated buildings. Keep all colors subdued enough for game units and boundary labels to read clearly. Very fine print grain, well-defined little buildings, detailed natural features. No people, units, pins, troop markers, district boundaries, text, letters, numbers, roads labels, icons, title, legend, UI, skulls or watermark. A coherent single drawing, never a collage or panel grid.

The request suggested 3072 × 2048; the delivered drawing is 1536 × 1024, as listed in the table.

### Field animation prompt summary

A 6 × 4 transparent sheet in the existing cut-paper style: six successive walking poses of a three-person teal federal patrol; six poses of a sienna hostile group walking the opposite way; six poses of two civilian shoppers; six looping teal water and cream foam poses. Equal square cells, fixed scale, angle and baseline, transparent margins, no lettering or borders. The final edit removed the softly colored backdrop without changing alignment, framing, shape, colors or the 1536 × 1024 canvas.

### Command emblem prompt summary

A 6 × 3 transparent sheet of eighteen bold cream paper-cut silhouettes matching `initiatives-print.webp`, in the exact order listed above. Flat symbols, transparent cutouts, generous cell margins and subtle grain, legible at 24 pixels. No colored facilities, labels, gradients, 3D, shadows, UI or watermark.

The sections below preserve earlier art directions and describe historical renderer versions. References there to SVG terrain and vector neighborhood buildings do not describe the active renderer.

The active artwork follows the user-approved reference: angular cut-paper faces, warm ochre and burnt-sienna planes, deep petrol teal backgrounds, bold cream silhouettes and fine screenprint grain. The supplied reference was used as a style guide; it was not included as a game asset or modified.

The built-in image generation tool produced the active atlases, province painting and menu panorama, then they were resized and encoded as WebP. Drafts remain in `assets/portraits.webp` and `assets/initiatives.webp`; the game uses the versioned `-print` assets below. The game makes no image generation or external asset requests.

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

The portraits were generated from the approved style reference as six separate fictional character busts, with consistent framing, angular planes and fine paper grain.

## Initiative emblems

File: `assets/initiatives-print.webp`, 1024 × 512, RGB, 4 columns × 2 rows. Cream silhouettes on square teal panels replace the circular draft badges.

| Row | Icons, from left to right |
| --- | --- |
| 0 | Star shield, open eye, justice scales, healthcare cross |
| 1 | Education, roads, water, community buildings |

Generation prompt:

> Use case: stylized-concept. Asset type: single production sprite atlas for Cartel: Containment game. Image 1 is the user's approved visual STYLE REFERENCE; match its BOTTOM ROW of oversized cream cut-paper emblems on deep petrol teal square panels. Create a new icon-only sprite atlas with exactly 4 equal square columns and 2 equal square rows, 2:1 landscape, aligned edge to edge, no gutters. Every cell has the exact same uniform textured deep teal background, approximately #0b3632, with one bold centered warm cream silhouette icon, approximately #f6dfae. The icon fills about 70 percent of its square with generous clear margins. Top row left to right: (1) broad heraldic shield with a dark teal five-point star cutout, (2) wide open almond-shaped eye with round iris, (3) balanced justice scales with sturdy base and two hanging pans, (4) equal-armed medical cross. Bottom row left to right: (5) open book with a center fold, (6) simple curving road with dark dashed central line, (7) single water droplet, (8) a group of three apartment buildings with square dark window cutouts, matching the reference. Flat bold block shapes, minimal details, slightly imperfect paper-cut edges and subtle fine ink grain exactly like the reference's shield, eye, scales and buildings. Solid cream emblems on teal panels, not circular badges. No gradients, no 3D, no glossy lighting, no drop shadows, no thin outline-only icons, no photographs, no text, no numbers, no letters, no border, no people, no extra symbols, no UI, no watermark. This is an asset atlas, not a mockup.

## Interface and cartography

Verified in-game views: [network dossiers](art-direction-preview.jpg) and [initiative funding](art-direction-initiatives.jpg). These are screenshots of the running campaign, rather than generated interface mockups.

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


## Province artwork, front end and district scenery

Verified live views: [illustrated province](illustrated-province.jpg), [main menu](main-menu.jpg), and [loading screen](loading-screen.jpg). These are unmodified screenshots of the running game.

The v0.2 artwork expansion adds three generated assets. The province image was created with a geometry guide rendered from the existing map data, so the art follows the coastline and central river. The game clips it to the authoritative land outline and draws all 24 selectable district boundaries, status layers, labels and units above it. The image never defines hit testing or simulation geometry. Native terrain art remains the fallback if the painting cannot be loaded.

| Asset | Dimensions | Use |
| --- | --- | --- |
| `assets/santa-esperanza-map.webp` | 1200 × 800 | Illustrated province and loading-screen map |
| `assets/menu-coast.webp` | 1600 × 900 | Main-menu coastal panorama |
| `assets/district-scenes.webp` | 1536 × 512 | Eight 3:2 district scenery panels in a 4 × 2 atlas |

The district atlas order is mountain, forest, rural, urban / capital, border, coast, port. CSS selects and crops the appropriate panel without changing the art. The main menu and campaign setup reuse the existing portrait and emblem atlases.

### Province painting prompt

> Use case: stylized-concept. Asset type: final illustrated province terrain map for a strategy game, Cartel: Containment. Image 1 is an EXACT GEOMETRY GUIDE, 1536x1024 in a 3:2 frame. Image 2 is the approved ART STYLE reference. Redraw Image 1 as rich illustrated cut-paper cartography in Image 2's deep petrol teal, warm parchment, golden ochre, burnt sienna and muted forest-green screenprint style. CRITICAL: preserve the precise land silhouette, its location and scale in the full frame, the plain deep teal sea around it, and the route of the winding north-to-south central river. Do not zoom, crop, tilt, rotate, or add a horizon. Orthographic top-down map with small illustrated relief features, not a perspective landscape. Use the guide's district color areas as terrain guidance: angular mountain ridges in the northwest, upper north-center, east-central quarry region and southwest inland; dense patterned woodland in the upper-west-central and lower-right green districts; golden agricultural plains, tiny orchards, geometric field parcels and rural paths in the other interiors; compact cream and terracotta towns, a provincial capital just east of the central river in the upper-middle; small harbors along the lower-left and lower-right coast. Add coves, tiny rocky coastal edges, stepped hill contours and understated small bridges on the existing river. Handmade layered paper silhouettes with crisp angular faces and restrained fine print grain. Leave quiet readable clearings at the guide's circle centers for game markers, but REMOVE the circles themselves. The faint straight district lines are guide lines only: do NOT draw internal borders because the game draws precise interactive borders over the art. No dots, pins, labels, letters, numbers, compass, legend, frame, UI, people, weapons, skulls, or watermark. Warm cream land, teal ink water, tasteful detailed terrain readable at normal zoom. Keep the entire canvas at the guide's original 3:2 aspect ratio and match every coastline vertex. This is the playable map artwork, not a mockup.

### Menu panorama prompt

> Use case: stylized-concept. Asset type: full-width main menu key art for Cartel: Containment, a fictional province strategy game. Image 1 is the approved art style reference. Create a cinematic panoramic illustration of Santa Esperanza, a fictional Latin American coastal province, with the same angular cut-paper silhouettes, ochre highlights, burnt sienna planes, cream buildings, deep petrol teal shadows, and fine screenprint grain. Landscape 16:9, at least 1536 pixels wide. View from a high coastal hillside toward a small cream-and-terracotta port city on the RIGHT half, winding river, geometric golden agricultural fields, dark green forest bands and sharp mountain ridges in the distance. Teal ocean in the foreground with a small harbor and a few tiny fishing boats; warm pale sunrise above a hazy mountain horizon. Sober political-thriller atmosphere, calm but consequential. The entire LEFT THIRD must be mostly quiet deep teal shadow and sea, no buildings or focal details there: it will hold the game's title and menu buttons. Compose the illustrated city, harbor and mountains primarily across the right two thirds, with the strongest light on the right. This is painted artwork, not a UI screenshot. No text, typography, labels, logos, borders, emblems, people, soldiers, weapons, aircraft, skulls, explosions, or watermark. Use flat poster colors and crisp angular graphic shapes, no photorealism, no 3D rendering or glossy surfaces.

### District scenery prompt

> Use case: stylized-concept. Asset type: one eight-cell district scenery atlas for the Cartel: Containment strategy game. Image 1 is the approved screenprinted cut-paper art style. Exactly 4 columns by 2 rows, each cell a self-contained wide 3:2 landscape illustration; the whole atlas is exactly 3:1 wide, for example 2304x768. Equal cell sizes edge to edge, no gutters or borders, no text. Restrained palette of deep petrol teal, cream, ochre, burnt sienna and forest green, sharp polygonal shadow planes and fine paper grain, consistent art direction across all eight scenes. Top row left to right: (1) mountain highlands with angular ochre ridges, a narrow road and a remote cream village; (2) dense temperate woodland with a quiet river and small forest settlement; (3) agricultural countryside with golden field parcels, orchard rows and a rural farmhouse; (4) an urban town with compact cream buildings, terracotta roofs and a small plaza. Bottom row left to right: (5) the provincial capital, a civic courthouse with a modest columned facade, plaza and surrounding town; (6) an isolated border district with an empty road crossing, small checkpoint building and rugged dry hills; (7) a quiet rocky coastline with teal water, fishing cottages and a small beach; (8) a working harbor with warehouses, cranes, jetties and tiny fishing boats. Illustrated landscape vignettes, not icons and not 3D. Each cell should fill its entire rectangle with the scene. No people, weapons, flags, words, letters, numbers, labels, UI or watermark. Do not repeat the portraits or symbols from the style reference. Exactly eight separate scenes, arranged in the stated order for sprite use.

## v0.5 expansion assets

`assets/cartel-leaders.webp` is a new generated 3×2 portrait atlas, 1152×768, ordered Alicia Montoya, Darío Beltrán, Valeria Castaño, Esteban Mena, Camila Duarte and Julián Ochoa. The original six-character atlas was supplied as a style/layout reference. The production prompt requested six distinct fictional adults, chest-up framing, equal square panels, angular cut-paper forms, ochre skin, deep teal backgrounds, cream and earth-tone clothes, printed grain, and no weapons, symbols, lettering or UI. The result was resized and encoded as WebP; portraits remain decorative identities for the faction's founder, while successor names are stated explicitly in the dossier.

`assets/mandate-map.webp` is a new 2640×1520 generated terrain painting displayed across the 3300×1900 country view. A code-rendered five-island geometry guide and the original province painting were supplied as composition and style references. The prompt requested the five coastlines and layout from the guide, differentiated highlands, eastern trading ports, central farms and city, southern agricultural valleys and misty coastal woodland. It specified warm ochre/cream cut-paper terrain, deep teal sea, printed grain, natural rivers, tiny towns and no text, UI, dots, labels or district borders. The final painting was resized/encoded as WebP and is clipped to the exact playable polygons. Interactive borders, cells, ferry corridors, names and symbols are native SVG, independent of generated image accuracy.

Both assets were created with the built-in image generator and are included in the repository. They extend the existing user-approved style without replacing the earlier assets.


## Connected country, v0.6

`assets/connected-country.webp` (3960×2360) replaces the separate-island presentation with a generated contiguous-country terrain painting in the approved ochre, cream and teal style. It includes illustrated towns, farms, forests, mountains, waterways, freight yards, airfields, ports and dams. Native SVG supplies the exact 50 province boundaries, district and neighborhood cells, route graph, infrastructure symbols and all status overlays. Painted facilities are scenery; clickable SVG markers identify the simulated infrastructure. Older terrain artwork remains in the repository for provenance and compatibility.
