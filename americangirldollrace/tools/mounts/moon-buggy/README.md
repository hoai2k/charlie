Apollo-style moon buggy, based on the owner’s lunar_rover.jpg reference. Built-in ImageGen sources are packed with uniform scale and real alpha by build.py. Source art faces left and is normalized to face right on export. Every frame retains baseline409; the lower open seat is measured per frame in calibration.json and mounted through MOUNT_ART, preserving the reference chassis proportions. Rebuild from source.webp, then run the race stamp script. Browser review covers idle, drive, takeoff, airborne, landing and mirrored riders; the smoke suite verifies actual Moon Base pickups and all nine runtime seats.

Owner revision: use the thinner open-frame rover and smaller wheels; all nine
frames are clean cutouts with no baked dirt, dust, pebbles or ground shadow.
Every chassis remains level: sprites provide wheel/suspension movement, while
roverMotion supplies a subtle distance-driven driving bob and mirrored jump pitch.
The same canvas transform includes the driver, keeping her seated. Normal
pickups retain the existing 0.24 scale; ridden art retains depth scale × 1.08.
