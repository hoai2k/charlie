# Mole Madness gameplay review — 2026-10-28

Authored art checked in local Google Chrome, headless Playwright, at actual 1920×1080 game layout. Both one-player and eight-player all-CPU games completed to ResultsScene with zero page errors. Natural runs sampled 226 and 441 critter frames respectively; mole rise stayed within 0–1 and repeatedly held the 0.52 low peek.

- `OCT28-MOLE-GAMEPLAY-1-players.jpg` and `OCT28-MOLE-GAMEPLAY-8-players.jpg`: unmodified running games with the installed art.
- `OCT28-MOLE-GAMEPLAY-poses.jpg`: actual renderer held at selected phases. Back row: left/right low peeks. Second row: left/right scans. Third row: blink and tease. Front row: bonked and neutral.
- `OCT28-MOLE-GAMEPLAY-front-peeks.jpg`: both low peeks moved to the front row to verify depth scaling and clipping.

All six authored keys loaded. Eyes and pink noses remain visible in the low peek, with the lower body behind the existing hole lip. Left/right glances read clearly without a body flip. Normal scans hold 0.55–0.60 seconds, returning to neutral between directions. Blink, tease, and bonked override normal scans; bonked remains through sinking. One image is drawn per mole, without crossfade.

Authored travel uses the measured 206/320 visible alpha height, preserving sprite scale and full-rise position. Procedural fallback retains its original travel. Authored bonk stars were lowered from 170 to 110 logical pixels × depth × rise: they now orbit immediately above the smaller visible head. Fairy/troll rise, hole clip, controls, bop eligibility, and scoring remain unchanged.

Illustrative median RGB samples from the front-peek gameplay JPEG: fur cheek (103,66,56), nearby grass (162,211,60), dark empty burrow (23,8,8), pink nose (249,158,136). Linear-sRGB luminance ratios: fur/grass 4.94:1, fur/burrow 2.25:1, nose/burrow 9.56:1. Visual review confirms the head silhouette reads against bright grass; lighter cheek planes, eyes and pink nose preserve recognition against the darker hole. These are sampled artwork ratios, not a UI accessibility conformance claim.

Validation: `node --test party/tools/sprites/mole-motion.test.mjs` — 5/5 passing (rise bounds/hold, stable scan timing, reaction precedence/fallback, unchanged hit eligibility, authored peek visibility/procedural travel).
