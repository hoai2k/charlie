# Low-angle puddle art handoff

Built-in ImageGen repainted each requested icon using the original oil pool for camera/footprint and the themed cell for material/color. generation.json retains exact prompts and corrections. sources/ holds accepted art; references/ the inputs; before/ preserves original decoded sheets for cell-isolation checks.

Only oil cell3 (x768–1023) is replaced. Uniform resampling only; each source main pool is220px wide in its256px cell, centered128140. The exporter does not stretch geometry. A connected-component measurement excludes detached ground droplets; the reviewed approximate0.55 target accepts0.48–0.62, with exact per-source ratios recorded in reports/. All other four cells remain RGBA pixel-identical after lossless WebP export.

Batch1: Farm mud0.502, Moon Base goo0.601, Fairy Woods bog0.519. No flying splashes or standing grass. review-farm-space-woods.webp compares before/after through actual drawPowerupIcon at68px, plus native256px cells on their track ground. Test rig is silent and loads no audio scripts.

Rebuild: python3 americangirldollrace/tools/tracks/puddles-low-angle/build.py <track keys>. Art-only delivery; gameplay agent bumps each track's powerupArtVersion. Existing pickup labels/behavior stay with that agent.
