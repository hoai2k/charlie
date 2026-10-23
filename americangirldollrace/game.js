const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const gameFrame = document.querySelector(".game-frame");
const startPanel = document.querySelector("#startPanel");
const finishPanel = document.querySelector("#finishPanel");
const pausePanel = document.querySelector("#pausePanel");
const finishTitle = document.querySelector("#finishTitle");
const finishText = document.querySelector("#finishText");
const startButton = document.querySelector("#startButton");
const fullscreenButton = document.querySelector("#fullscreenButton");
const restartButton = document.querySelector("#restartButton");
const resumeButton = document.querySelector("#resumeButton");
const pauseCard = pausePanel.querySelector(".pause-card:not(.pause-settings)");
const pauseSettings = document.querySelector("#pauseSettings");
const pauseSoundButton = document.querySelector("#pauseSoundButton");
const pauseSettingsButton = document.querySelector("#pauseSettingsButton");
const pauseFullscreenButton = document.querySelector("#pauseFullscreenButton");
const menuButton = document.querySelector("#menuButton");
const touchJumpButton = document.querySelector("#touchJumpButton");
const touchPushButton = document.querySelector("#touchPushButton");
const touchPauseButton = document.querySelector("#touchPauseButton");
const touchControls = document.querySelector("#touchControls");
let music = document.querySelector("#music");
let nextMusic = document.querySelector("#nextMusic");
const gameMode = document.querySelector("#gameMode");
const backgroundSelect = document.querySelector("#backgroundSelect");
const difficultySelect = document.querySelector("#difficultySelect");
const specialsSelect = document.querySelector("#specialsSelect");
const settingsButton = document.querySelector("#settingsButton");
const settingsPanel = document.querySelector("#settingsPanel");
const PLAYER_ID_WORDS = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"];
const characterSelects = PLAYER_ID_WORDS.map(word => document.querySelector(`#player${word}Character`));
const characterSelectWraps = characterSelects.map(select => select?.closest("label") || null);
const characterSelectLabels = characterSelectWraps.map(wrap => wrap?.querySelector("span") || null);
const LEGACY_STATUS_IDS = ["whirlpoolStatus", "julietteStatus", "claudiaStatus", "kayaStatus"];
const playerHuds = PLAYER_ID_WORDS.map(word => document.querySelector(`#player${word}Hud`));
const playerLabels = PLAYER_ID_WORDS.map(word => document.querySelector(`#player${word}Label`));
const playerStatuses = PLAYER_ID_WORDS.map((word, index) => (
  document.querySelector(`#${LEGACY_STATUS_IDS[index] || `player${word}Status`}`)
));
const hudElement = document.querySelector(".hud");
const joinTray = document.querySelector("#joinTray");
const controls = document.querySelector(".controls");
const controllerPointerLayer = document.createElement("div");
controllerPointerLayer.className = "controller-pointer-layer";
gameFrame.appendChild(controllerPointerLayer);

let W = canvas.width;
const H = canvas.height;
const MIN_VIEW_WIDTH = 640;
const EXPECTED_VIEW_WIDTH = 1280;
const FRAME = 418;
const SPRITE_COLS = 3;
const DOLL_SPRITE_ROWS = 4;
const HORSE_SPRITE_ROWS = 3;
const SPRITE_ANCHOR_X = FRAME / 2;
const SPRITE_ANCHOR_Y = FRAME - 9;
const BASE_FINISH = 15600;
// The course length; a track's lengthScale stretches it (see applyTrackBounds).
let FINISH = BASE_FINISH;
const BOARD_WIDTH = EXPECTED_VIEW_WIDTH;
// A racer's feet are drawn FOOT_OFFSET_Y below racer.y (see drawRacer). The
// bottom bound puts feet at the bottom of the view on every track; the top
// bound follows each background's painted dirt (its dirtTop) so feet stop at
// the path's top edge. See applyTrackBounds.
const FOOT_OFFSET_Y = 54;
const DEFAULT_TRACK_TOP = 490;
let TRACK_TOP = DEFAULT_TRACK_TOP;
// Where racers' feet meet the painted path. Hurdles, power-ups and trolls are
// placed from here down; racers may walk a little higher (up to the fence,
// see applyTrackBounds).
let PATH_TOP = DEFAULT_TRACK_TOP;
// Racers' shadows are centred SHADOW_OFFSET_Y below racer.y (see drawRacer).
const SHADOW_OFFSET_Y = 40;
// Power-ups keep this far below the path's top edge and this far from hurdles.
const POWERUP_PATH_EDGE_CLEARANCE = 28;
const POWERUP_HURDLE_CLEARANCE_X = 100;
const POWERUP_HURDLE_CLEARANCE_Y = 56;
const TRACK_BOTTOM = 665;
// Racer size is tied to screen height, not to the band, so dolls stay the
// same size on every track.
const DEPTH_SCALE_TOP_Y = 490;
const DEPTH_SCALE_BOTTOM_Y = 665;
const RACER_VISIBLE_LEFT_MARGIN = 88;
const RACER_VISIBLE_RIGHT_MARGIN = 96;
const CAMERA_PLAYER_MARGIN = RACER_VISIBLE_LEFT_MARGIN + RACER_VISIBLE_RIGHT_MARGIN;
let CAMERA_MIN_ZOOM = EXPECTED_VIEW_WIDTH / (FINISH + CAMERA_PLAYER_MARGIN * 2);
const CAMERA_ZOOM_IN_DAMPING = 3.2;
const HURDLE_W = 54;
const HURDLE_HIT_W = HURDLE_W;
const HURDLE_HIT_H = 32;
const PLAYER_FOOT_W = 30;
const PLAYER_FOOT_H = 14;
// Racers land on (and must clear) the top of the hurdle as drawn: hurdleTopZ()
// measures each track's hurdle art; this is the code-drawn picket's top.
const HURDLE_TOP_Z = 60;
const MONSTER_FOOT_W = 48;
const MONSTER_FOOT_H = 22;
const PLAYER_RUN_SPEED = 360;
const PLAYER_BACK_SPEED = 210;
const PLAYER_LANE_SPEED = 245;
const AI_RUN_SPEED = 250;
const AI_AHEAD_IGNORE_OBSTACLES = 0.5;
const AI_AHEAD_WANDER_START = 1;
const AI_AHEAD_WANDER_END = 0.25;
const AI_BEHIND_CATCHUP = 0.5;
const HORSE_RUN_SPEED = 560;
const HORSE_AI_RUN_SPEED = 400;
const JUMP_POWER = 760;
const HORSE_JUMP_POWER = 940;
const GRAVITY = 2100;
const LANDING_POSE_DISTANCE = 100;
const UNMOUNTED_LANDING_PAUSE_DURATION = 0.2;
const HORSE_DURATION = 10;
// A troll grabbing a rider pulls her off: her mount stays where it was as a
// pickup with only the time it had left (a Horse Show horse never runs out).
// On the Horse Show two spare horses also wait, a third and two thirds of the
// way along at the bottom of the track, for anyone on foot.
const LOOSE_MOUNT_PICKUP_X = 60;
const HORSE_SHOW_SPARE_HORSES = [1 / 3, 2 / 3];
const UNICORN_DURATION_MULTIPLIER = 1.2;
const PEGASUS_DURATION_MULTIPLIER = 1.2;
const SKELETON_HORSE_TIME = HORSE_DURATION * 1.2; // s a girl rides a troll's skeleton horse // flying mounts: pegasus, griffon, broomstick
const HORSE_FLASH_TIME = 2.4;
const UNICORN_BEAM_RANGE = 520;
const UNICORN_BEAM_DURATION = 0.2;
const UNICORN_BEAM_FAN = 70; // px over which the stripes spread out from the horn
const PEGASUS_HOVER_Z = (HORSE_JUMP_POWER * HORSE_JUMP_POWER) / (2 * GRAVITY);
const RIDER_MOUNT_Y_OFFSET = 100;
const DEFAULT_RIDER_X_OFFSET = 0;
const DEFAULT_RIDER_Y_OFFSET = RIDER_MOUNT_Y_OFFSET;
// Per-frame mount calibration measured from the sprite sheets (frame pixels):
// [seatX, seatY, groundShiftY] for each [row][col]. seatX/seatY is the top of
// the back where the rider sits (seatY already includes groundShiftY);
// groundShiftY moves the frame down so the unicorn/pegasus art, which is drawn
// higher in its cells than the horse, stands on the same ground line and its
// body bobs like the horse's. The per-doll riderX/YOffset values were tuned on
// the horse gallop, so riders are placed relative to MOUNT_SEAT_REFERENCE.
const MOUNT_FRAME_CALIBRATION = {
  griffon: window.MOUNT_ART?.griffon?.calibration,
  horse: [
    [[199, 230, 0], [219, 232, 0], [198, 233, 0]],
    [[228, 234, 0], [218, 219, 0], [229, 233, 0]],
    [[219, 231, 0], [224, 235, 0], [226, 228, 0]]
  ],
  unicorn: [
    [[218, 216, 29], [225, 218, 30], [190, 219, 27]],
    [[237, 220, 42], [218, 205, 45], [225, 219, 36]],
    [[189, 217, 34], [212, 221, 94], [208, 214, 57]]
  ],
  pegasus: [
    [[203, 218, 22], [221, 220, 24], [199, 221, 24]],
    [[235, 222, 7], [222, 207, 0], [220, 221, 3]],
    [[222, 219, 26], [217, 223, 70], [207, 216, 32]]
  ]
};
// Themed ground mounts (tracks.js mountOdds) ride like the horse. Their sheets
// use (226, 242), or their measured MOUNT_ART seats (the lower Apollo rover).
const THEMED_MOUNT_TYPES = ["pony", "reindeer", "rocking_horse", "carousel_horse", "moon_buggy"];
for (const type of THEMED_MOUNT_TYPES) {
  MOUNT_FRAME_CALIBRATION[type] = window.MOUNT_ART?.[type]?.calibration || [0, 1, 2].map(() => [0, 1, 2].map(() => [226, 242, 0]));
}
const MOUNT_SEAT_REFERENCE = { x: 225, y: 228.67 };
const PUSH_COOLDOWN = 0.72;
const PUSH_ACTIVE_TIME = 0.22;
const PUSH_RANGE_X = 78;
const PUSH_RANGE_Y = 46;
const MOUNTED_PUSH_EXTRA_RANGE = 40;
const PUSH_FORCE = 350;
const AMANDA_HAZARD_DEFAULT_INTERVAL = 10;
const AMANDA_HAZARD_MODE_INTERVAL = 2;
const AMANDA_HAZARD_TRIGGER_X = 112;
const AMANDA_HAZARD_TRIGGER_Y = 88;
const AMANDA_HAZARD_PUSH_X = 118;
const AMANDA_HAZARD_TARGET_PUSH_X = 210;
const AMANDA_HAZARD_PUSH_Y = 94;
const AMANDA_HAZARD_PUSH_FORCE = 620;
const AMANDA_HAZARD_EMERGE_TIME = 0.22;
const AMANDA_HAZARD_HOLD_TIME = 0.24;
const AMANDA_HAZARD_RETREAT_TIME = 0.38;
const AMANDA_HAZARD_COOLDOWN = 1.6;
// Hit Amanda (push, thrown ball, rainbow) while she's popped up and she's
// caught: she tumbles out, gets up and sits on that fence for the rest of the
// race, and pops up nowhere else. Hit her again there and she wobbles.
const AMANDA_CAUGHT_STATES = ["tumble", "down", "climb", "sitting", "bonked"];
const AMANDA_TUMBLE_TIME = 0.5;
const AMANDA_DOWN_TIME = 0.7;
const AMANDA_CLIMB_TIME = 0.45;
const AMANDA_BONK_TIME = 0.5;
const AMANDA_SEAT = { x: 155, y: 338 }; // seat in her riding frame (row 4, cell 1)
const AMANDA_HIT_RANGE_X = 46;
const AMANDA_HIT_RANGE_Y = 60;
// Tag the sitting Amanda (walk up to her without pushing) and she follows you.
const AMANDA_TAG_RANGE_X = 70;
const AMANDA_ALLY_SPEED = PLAYER_RUN_SPEED;
const CANDY_PILE_REACH_X = 70; // walk this close to a beaten candy troll's pile to scatter it
const CANDY_PILE_REACH_Y = 46;
const CANDY_CELEBRATE_TIME = 0.8; // s she cheers (running on)
const AMANDA_ALLY_FOLLOW_DELAY = 0.45; // s: she goes where her player was this long ago
const AMANDA_ALLY_STAND_GAP = 56; // and when her player stops, stands this close beside her
const AMANDA_ALLY_CATCH_UP = 1.15; // her top speed, against her player's
const AMANDA_ALLY_GUARD_RANGE = 320; // she goes for monsters this close to her player (or to her)
const AMANDA_ALLY_FIGHT_RANGE = 800; // and keeps fighting one until it's this far away
const AMANDA_ALLY_PUSH_RANGE = 96;
const AMANDA_ALLY_PUSH_COOLDOWN = 1.1;
const AMANDA_ALLY_MAX_PUSHES = 5; // pushed this often, she runs off out of the race
const OIL_SLIDE_DURATION = 1.5;
const OIL_SLIDE_SPEED = 430;
const SNOWBALL_PICKUP_COUNT = 5;
const SNOWBALL_SPEED = 760;
const SNOWBALL_RANGE = 520;
const SNOWBALL_RADIUS = 13;
const SNOWBALL_HAND_DRAW_Y_OFFSET = 200;
// A missed throw starts dropping at this share of its range, landing at the end.
const SNOWBALL_ARC_START = 0.55;
const THROWN_ROLL_KEEP = 30; // thrown apples and the like left lying on the ground at most
const THROWN_BOUNCE = 0.35; // share of its speed a dropped apple bounces back up with
const THROWN_BOUNCE_MIN = 70; // px/s below which it stops bouncing
const THROWN_SQUISH_TIME = 0.7; // s one stepped on takes to fade
const SNOW_PILE_LIFE = 1.6;
const MONSTER_SPRITE_ROWS = 4;
const MONSTER_HEIGHT_SCALE = 1.3;
const MONSTER_WAIT_FROM_BOARD_END = EXPECTED_VIEW_WIDTH;
let MONSTER_COURSE_START_X = FINISH / 3 + 120;
// A troll riding a horse (a track's trollMount) has to keep up with riders.
// Just under a player's horse (HORSE_RUN_SPEED), so riders can stay ahead.
const MOUNTED_MONSTER_SPEED = 515;
const MOUNTED_MONSTER_LANE_SPEED = 190;
const MOUNTED_MONSTER_GRAB_RANGE_X = 74;
const MOUNTED_MONSTER_HORSE_SCALE = 1.3;
const TROLL_RIDING_CHANCE = 0.5;
// After throwing someone a riding troll stands still this long, so the
// thrown rider can get away.
const MOUNTED_MONSTER_REST_AFTER_THROW = 2.2;
// Riding toys (tracks.js rideToys): roller skates for speed and a pogo stick
// for high jump. They last twice as long as the plain power-up and, once the
// doll's toys sheet is listed in RIDE_TOY_SHEETS, change how she looks while
// moving at the same speed (image-requests.md §8). With both, she keeps the
// look of the first until it runs out, with both powers.
const RIDE_TOY_DURATION_MULTIPLIER = 2;
const SKATE_STRIDE_PX = 150;
const POGO_BOUNCE_HZ = 2.4;
const POGO_BOUNCE_HEIGHT = 30;
// Coming down on a troll on a pogo stick knocks him over and springs her up
// off his head like a raised step.
const POGO_STOMP_HEAD_Z = 150; // her feet passing down through his head height
const POGO_STOMP_RANGE_X = 75;
const POGO_STOMP_RANGE_Y = 46;
const POGO_STOMP_BOUNCE = 1.25; // times her jump power
// Moon boots (tracks.js moonBoots, Moon Base): the high-jump pickup lowers
// the racer's gravity instead, so softer jumps float over several hurdles.
const MOON_BOOTS_DURATION = 10;
const MOON_BOOTS_GRAVITY_SCALE = 0.35;
const MOON_BOOTS_JUMP_SCALE = 0.82;
// Power-up feedback: after-images, speed streaks and sparkles while boosted;
// a burst and a sparkle trail on boosted jumps; a coloured ring underfoot.
const SPEED_GHOST_COUNT = 4;
const SPEED_GHOST_INTERVAL = 0.045;
const MOON_BOOTS_COLOR = "#a98bff";
// Track items (tracks.js itemEffects) that replace a speed or high-jump
// pickup with their own effect (image-requests.md §10):
// spell book: the wand sparkles while she picks a direction by moving, then
// casts at the closest racer or monster that way (or the closest anywhere if
// she doesn't pick one in time), who becomes a frog.
const SPELL_AIM_TIME = 1.6;
const SPELL_AIM_COMMIT = 0.22; // seconds of steady stick in one direction
const SPELL_AIM_CONE = Math.cos(Math.PI / 3);
const SPELL_CAST_TIME = 0.6;
const SPELL_BOLT_DELAY = 0.18;
const SPELL_BOLT_TIME = 0.35;
const SPELL_BEAM_LINGER = 0.3;
const SPELL_RANGE = 1100;
const FROG_DURATION = 3.5;
const FROG_HOP_HZ = 1.8;
const FROG_SPEED_SCALE = 0.7;
// The wand hand in the push frame (frame pixels, facing right).
const WAND_HAND = { x: 349, y: 151 };
// surfboard: ride a wave forward, fast, over hurdles, steering sluggishly.
const SURF_DURATION = 5;
const WAVE_FEATHER_BOTTOM = 0.16; // share of the surf wave's height its bottom fades over
const WAVE_FEATHER_BACK = 0.3; // and of its width its trailing back end fades over
const SURF_SPEED_SCALE = 1.8;
const SURF_LANE_RESPONSE = 1.2;
const SURF_DRIFT = 70;
// wind-up key: little tin cars drive ahead and bump whoever they meet.
const WINDUP_CAR_COUNT = 3;
const WINDUP_CAR_SPEED = 520;
const WINDUP_CAR_LIFE = 5;
const WINDUP_CAR_COLORS = [["#e2403a", "#b52a25"], ["#f4c430", "#c99a12"], ["#3a8de2", "#2a63b5"]];
// Kickable beach balls (tracks.js beachBalls): run into one to nudge it along,
// push (X) to kick it. Positions are at feet level, like power-ups.
const BEACH_BALL_RADIUS = 22;
const BEACH_BALL_KICK_SPEED = 920;
const BEACH_BALL_KICK_LIFT = 580;
const BEACH_BALL_NUDGE_MIN_SPEED = 260;
const BEACH_BALL_COLORS = ["#ff4d5a", "#ffffff", "#2f8cff", "#ffffff", "#ffd23f", "#ffffff"];
// A troll knocked off his horse leaves it to bolt off the end of the track.
const RUNAWAY_HORSE_SPEED = 640;
// EMP: a plain EMP crackles lightning from her button to everyone it hits; a
// track's themed EMP (firework, bell, conch…) streams sparks to them instead.
const EMP_ARC_TIME = 0.6;
// An EMP reaches racers and monsters within a full screen's width of the
// trigger (in world pixels, whatever the split-screen views or zoom); with
// nobody in range, it shocks whoever pressed it.
const EMP_RANGE = EXPECTED_VIEW_WIDTH;
const EMP_STREAM_TIME = 0.3;
const EMP_EFFECT_TIME = 1.1; // s the non-lightning EMP effects play
const EMP_ROCKET_TIME = 0.55; // s a firework/pop rocks rocket takes to dive onto its target
const EMP_WAVE_TIME = 0.8; // s a sound wave takes to spread to the farthest target
const MOON_BOOT_GROW = 1.45; // a moon boot is this much bigger than the foot it covers
const MOON_BOOT_FOOT_MIN = 44; // the foot sizes (frame px) a moon boot is scaled from, at least
const MOON_BOOT_FOOT_MAX = 64; // and at most (a long measurement is part of her leg)
const MOON_BOOT_FOOT_MID = 34; // px up from its sole, in the boot art, that sits on the foot's middle
const LASER_SHOCK_COLOR = "#ff4d64"; // crackles on someone a laser shocked
const LASER_SHOTS = 4; // bolts the laser trigger fires at each target
const LASER_FIRST_SHOT = 0.12; // s before the first
const LASER_SHOT_GAP = 0.13; // s between bolts
const LASER_SPEED = 2200; // px/s a bolt flies
const LASER_BOLT_LENGTH = 46; // px long each bolt is
const LASER_TIME = 1.4; // s the trigger fires and fades
const LIGHTNING_ARC_MAX = 160; // px an EMP's bolts arc up on their way to a target
const EMP_CROW_TIME = 0.6; // s a crow takes to reach its target
const ROVER_BOUNCE = 12; // sprite px the moon buggy hops over each bump as it drives
const ROVER_BUMP_SPACING = 45; // bumps come every pi times this many world px (about 4 a second at full speed)
const ROVER_LANDING_TIME = 0.35; // s its landing squash and recoil last
const ROVER_LANDING_SQUASH = 16; // sprite px it squashes down on landing
// Cloud floors (game-terrain.js, tracks.js cloudFloor).
const CLOUD_WIDTH_MIN = 430; // px wide each cloud is, from this
const CLOUD_WIDTH_RANGE = 240; // to this much more
const CLOUD_OVERLAP = 60; // px neighbouring clouds overlap
const CLOUD_STEP = 12; // px a cloud may sit higher or lower than the last
const CLOUD_MAX_LIFT = 18; // px the floor ever sits above or below the flat course
const CLOUD_DOME = 8; // px each cloud's middle rises above its ends
const CLOUD_GAP_MIN = 110; // px wide a gap is (a running jump clears about 250)
const CLOUD_GAP_MAX = 150;
const CLOUD_GAP_EVERY_MIN = 1300; // px of clouds between gaps, from this
const CLOUD_GAP_EVERY_RANGE = 1100; // to this much more
const CLOUD_GAP_EDGE_GRACE = 14; // px into a gap before her feet are off the cloud
const CLOUD_FLOOR_SAFE_START = 1400; // no gaps before here
const CLOUD_FLOOR_SAFE_END = 800; // or this close to the finish
const CLOUD_FALL_DRAG = 0.25; // her running-off speed keeps this share after a second
const CLOUD_FALL_DEPTH = 460; // px down she's out of sight
const CLOUD_RESCUE_DEPTH = 300; // px down a flier can still fly back up
const CLOUD_RESPAWN_DELAY = 0.45; // s out of sight before she's back
const CLOUD_GAP_SKY_OVERHANG = 90; // px the sky painted in a gap runs under the clouds either side
const CLOUD_HOP_SPEED = 64; // px/s up each step's bounce starts on the clouds
const CLOUD_HOP_GRAVITY = 290; // px/s² it falls back (a calm ~0.45 s hop, 7 px high)
const CLOUD_SINK = 20; // px she sinks into a cloud standing still (about to her ankles)
const CLOUD_SINK_FEATHER = 8; // px over which the cloud fades in over her sinking feet
const CLOUD_SINK_TIME = 0.6; // s to sink right in // s she's gone after falling through a gap
const CLOUD_FLOOR_BACK_EDGE = 16; // px above PATH_TOP the floor's back edge sits
const CLOUD_FLOOR_CELL_W = 768; // the floor sheet's cells (image-requests.md §21)
const CLOUD_FLOOR_CELL_H = 320;
const CLOUD_FLOOR_ART_TOP = 40; // px down a cell its back edge is
const ROOSTER_CROW_TIME = 0.8; // s the rooster crows (the waves go out), then
const ROOSTER_LINGER = 1.2; // s it hops about before fading
const ROOSTER_FEET_BELOW_ICON = 30; // px below the trigger icon's centre the rooster stands
const EMP_FIREWORK_COLORS = ["#ff4d6d", "#ffd84a", "#4cc3ff", "#7dff8a", "#c48bff"];
// Each kind of power-up glows its own colour on every track, whatever its art.
const POWERUP_GLOW_COLORS = {
  boost: "#2fd65a",
  jump: "#ff8a1c",
  emp: "#b45cff",
  horse: "#ffd84a",
  snowball: "#4cc3ff"
};
// Darker shades of the same colours for the status text over a racer.
const POWERUP_TEXT_COLORS = {
  boost: "#16903a",
  jump: "#d35c00",
  emp: "#8434d6",
  snowball: "#167fc0"
};
// A riding troll jumps a hurdle on approach this often; otherwise his horse
// balks at it for MOUNTED_MONSTER_BALK_TIME before jumping.
const MOUNTED_MONSTER_JUMP_CHANCE = 0.6;
const MOUNTED_MONSTER_BALK_TIME = 0.7;
const MOUNTED_MONSTER_JUMP_LOOKAHEAD = 110;
const MONSTER_COUNTS_BY_DIFFICULTY = {
  none: 0,
  normal: 2,
  extra: 4,
  "too-many": 8
};
const MONSTER_SPEED = 150;
const MONSTER_LANE_SPEED = 130;
const MONSTER_SIGHT_RANGE = 1300; // px, about a screen: farther away than this, a monster stops chasing
const MONSTER_GRAB_RANGE_X = 58;
const MONSTER_GRAB_RANGE_Y = 50;
const MONSTER_THROW_FORCE = 1020;
const MONSTER_SLEEP_KNOCKBACKS = 5;
const MONSTER_FINISH_BACK_THROW_DISTANCE = EXPECTED_VIEW_WIDTH * 0.5;
const STORM_CLOUD_AVERAGE_INTERVAL = 15;
const STORM_CLOUD_MIN_INTERVAL = 7;
const EXTRA_MONSTER_CLOUD_AVERAGE_INTERVAL = 30;
const EXTRA_MONSTER_CLOUD_MIN_INTERVAL = 14;
const REWARD_CLOUD_AVERAGE_INTERVAL = 7;
const REWARD_CLOUD_MIN_INTERVAL = 4;
const STORM_CLOUD_DURATION = 8.5;
const STORM_CLOUD_DROP_TIME = 1.7;
const STORM_MONSTER_DROP_DURATION = 0.9;
const REWARD_POWERUP_DROP_DURATION = 0.75;
const STORM_CLOUD_START_PADDING = 180;
const STORM_CLOUD_END_PADDING = 260;
const VICTORY_FIREWORK_COUNT = 7;
const VICTORY_JUMP_HEIGHT = 74;
const VICTORY_JUMP_SPEED = 0.006;
const LEGO_SPLIT_LINE_WIDTH = 8;
const LEGO_SPLIT_LINE_FADE_SPEED = 7.5;
const LEGO_CAMERA_TARGET_RATIO = 0.36;
const LEGO_PANE_KEEP_VISIBLE_MARGIN = 112;
const LEGO_SCREEN_ALIGNMENT_EPSILON = 1.5;
const LEGO_MERGE_CROSSING_EPSILON = LEGO_SCREEN_ALIGNMENT_EPSILON * 2;
const LEGO_CAMERA_CATCHUP_RATE = 1.5;
const LEGO_MERGE_HYSTERESIS = 24;
const LEGO_FORCE_MERGE_FRACTION = 0.3;
const LEGO_FORCE_MERGE_DWELL = 0.5;
const LEGO_ROW_EXIT_DELAY = 1.2;
const LEGO_CROSSFADE_SECONDS = 0.3;
const LEGO_MAX_PANES_PER_ROW = 4;
const LEGO_TWO_ROW_ENTER = 5;
const LEGO_TWO_ROW_EXIT = 3;
const RACE_TRACKER_WIDTH = 250;
const RACE_TRACKER_TOP = 94;
const RACE_TRACKER_RIGHT = 24;
const POWERUP_TYPES = ["jump", "boost", "emp", "oil", "snowball", "horse"];
const GOOD_POWERUP_TYPES = POWERUP_TYPES.filter(type => type !== "oil");
const CONTROLLER_POINTER_SPEED = 720;
const CONTROLLER_POINTER_DEADZONE = 0.18;
const CONTROLLER_POINTER_SIZE = 22;
const POWERUP_START_X = 760;
const POWERUP_END_PADDING = 700;
const POWERUP_MIN_GAP = 460;
const POWERUP_RANDOM_GAP = 420;
const POWERUP_ICON_TARGET_SIZE = 68;
// Per-track power-up sheets (tracks.js) are 256px cells in POWERUP_ICON_RECTS order.
const TRACK_POWERUP_CELL = 256;
const TRACK_CARD_ATLAS_CELLS = 5;
const POWERUP_ICON_RECTS = [
  { x: 0, y: 0, w: 510, h: 561 },
  { x: 510, y: 0, w: 620, h: 561 },
  { x: 1130, y: 0, w: 570, h: 561 },
  { x: 1700, y: 0, w: 500, h: 561 },
  { x: 2200, y: 0, w: 604, h: 561 }
];
const keys = new Set();
// Keys pressed since the join/picker code last looked, so a quick tap that
// starts and ends between two frames still counts.
const keysTapped = new Set();
GameAudio.attachMusic(music, 1);
GameAudio.attachMusic(nextMusic, 0);
const mobileQuery = window.matchMedia("(pointer: coarse)");

const MODE_CONFIG = {
  one: { humans: 1, ais: 0 },
  "one-one-ai": { humans: 1, ais: 1 },
  "one-two-ai": { humans: 1, ais: 2 },
  two: { humans: 2, ais: 0 },
  three: { humans: 3, ais: 0 },
  four: { humans: 4, ais: 0 },
  "two-one-ai": { humans: 2, ais: 1 },
  "two-two-ai": { humans: 2, ais: 2 },
  "three-one-ai": { humans: 3, ais: 1 },
  five: { humans: 5, ais: 0 },
  six: { humans: 6, ais: 0 },
  seven: { humans: 7, ais: 0 },
  eight: { humans: 8, ais: 0 }
};
const MAX_PLAYERS = 8;
// One stable colour per player slot (P1..P8), independent of the character, so
// two players who picked the same doll can still be told apart.
// These match the P1-P8 rosettes in assets/ui/player_badges.webp.
const PLAYER_SLOT_COLORS = ["#e0322f", "#2a6fdb", "#e8a800", "#2e9e44", "#8a3fd1", "#f07a1a", "#18a3a3", "#e8559a"];
const JOIN_BUTTONS = [0, 1, 2, 3, 9];
const LEAVE_BUTTON = 8;
const LEAVE_HOLD_SECONDS = 1.5;
const DISCONNECT_LEAVE_SECONDS = 5;
const PICKER_REPEAT_DELAY = 0.32;
const PICKER_REPEAT_RATE = 0.16;
const MOBILE_MODE_VALUES = new Set(["one", "one-one-ai", "one-two-ai"]);
const DIFFICULTIES = [
  { key: "none", label: "No Monsters" },
  { key: "normal", label: "Normal" },
  { key: "extra", label: "Extra Monsters" },
  { key: "too-many", label: "Too Many Monsters" }
];

const RACER_STARTS = [
  { x: 128, y: 502 },
  { x: 92, y: 566 },
  { x: 170, y: 624 },
  { x: 56, y: 610 },
  { x: 206, y: 540 },
  { x: 140, y: 650 },
  { x: 60, y: 520 },
  { x: 214, y: 600 }
];

const CHARACTER_FALLBACKS = ["whirlpool", "juliette", "claudia", "kaya", "lily", "marisol", "amanda", "rumi"];
const SPECIALS = new Set(["none", "unicorn", "pegasus", "griffon", "broom", "all-dolls", "horsing", "amanda-mode"]);
// dirtTop is the screen y (at the 720 render height) where the painted path
// starts below the background's fence; fenceBase (optional) is where that
// fence meets the ground, when there's a verge between the two.
const TRACK_THEMES = window.TRACK_THEMES || {};
const BACKGROUNDS = [
  { key: "farm", name: "Farm", imageKey: "backgroundFarm", music: "assets/music/Plastic Shoes.mp3", dirtTop: 532, fenceBase: 500 },
  { key: "fairy", name: "Fairy", imageKey: "backgroundFairy", music: "assets/music/Make a Little Fairy Magic.mp3", dirtTop: 548, fenceBase: 516 },
  { key: "town", name: "Village", imageKey: "backgroundTown", music: "assets/music/Ghent Sweet Parade.mp3", dirtTop: 574, fenceBase: 547 },
  { key: "winter", name: "Winter", imageKey: "backgroundWinter", music: "assets/music/Snow in My Pocket.mp3", dirtTop: 566, fenceBase: 518 },
  { key: "castles", name: "Castles", imageKey: "backgroundCastles", music: "assets/music/Sugar Castle Run.mp3", dirtTop: 586, fenceBase: 558 },
];
// New tracks from tracks.js race once their background art is in.
const generalMusic = window.TRACK_GENERAL_MUSIC || ["assets/music/Plastic Shoes.mp3"];
let generalMusicTurn = 0;
for (const [key, theme] of Object.entries(TRACK_THEMES)) {
  const ownBackground = theme.art?.includes("background");
  const standIn = BACKGROUNDS.find(background => background.key === theme.standInBackground);
  if (BACKGROUNDS.some(background => background.key === key) || (!ownBackground && !standIn)) continue;
  const music = theme.music || generalMusic[generalMusicTurn++ % generalMusic.length];
  const imageKey = ownBackground ? trackArtKey(key, "background") : standIn.imageKey;
  const dirtTop = ownBackground ? theme.dirtTop : standIn.dirtTop;
  BACKGROUNDS.push({ key, name: theme.name, imageKey, music, dirtTop });
}
const startingBackground = "farm";
const NEXT_RACE_DELAY = 3600;
const PAUSE_MUSIC_FADE_MS = 350;
const CELEBRATION_MUSIC_GAIN = 0.35;
const CELEBRATION_MUSIC_FADE_MS = 260;
const NEXT_TRACK_CROSSFADE_DELAY_MS = 900;
const NEXT_TRACK_CROSSFADE_MS = 2400;
const SONG_RESUME_FADE_MS = 1500; // a song picked up where it was left fades in over this
const NEXT_TRACK_PREVIEW_GAIN = 0.55;

const extraDolls = window.EXTRA_DOLLS || {};
const images = {
  backgroundFarm: loadImage("assets/background_farm.webp"),
  backgroundCastles: loadImage("assets/background_castles.webp"),
  backgroundFairy: loadImage("assets/background_fairy.webp"),
  backgroundTown: loadImage("assets/background_village.webp"),
  backgroundWinter: loadImage("assets/background_winter.webp"),
  whirlpool: loadImage("assets/doll_whirlpool_sprites.webp"),
  juliette: loadImage("assets/doll_juliette_sprites.webp"),
  claudia: loadImage("assets/doll_claudia_sprites.webp"),
  kaya: loadImage("assets/doll_kaya_sprites.webp"),
  lily: loadImage("assets/doll_lily_sprites.webp"),
  marisol: loadImage("assets/doll_marisol_sprites.webp"),
  amanda: loadImage("assets/doll_amanda_sprites.webp"),
  penelope: loadImage("assets/doll_penelope_sprites.webp"),
  rumi: loadImage("assets/doll_rumi_sprites.webp"),
  horse: loadImage("assets/horse_sprites.webp"),
  unicorn: loadImage("assets/unicorn_sprites.webp"),
  pegasus: loadImage("assets/pegasus_sprites.webp"),
  griffon: loadImage("assets/griffon_sprites.webp"),
  broom: loadImage("assets/broom.webp"),
  monster: loadImage(window.MONSTERS?.troll?.sheet || "assets/monster_sprites.webp"),
  powerupIcons: loadImage("assets/icons_alpha.webp"),
  confetti: loadImage("assets/ui/confetti.webp"),
  ...Object.fromEntries(Object.entries(extraDolls).map(([key, doll]) => [key, loadImage(`assets/doll_${doll.assetKey || key}_sprites.webp?v=${window.GAME_CONFIG?.dollArtVersion || "1"}`)])),
};

const jumpSpriteScale = {
  default: 0.9,
  lily: 1.02,
  marisol: 0.99,
  amanda: 0.99,
  penelope: 0.99,
  rumi: 0.99,
  ...Object.fromEntries(Object.entries(extraDolls).map(([key, doll]) => [key, doll.jumpScale || 1])),
};

const characters = {
  whirlpool: {
    name: "Whirlpool",
    spriteKey: "whirlpool",
    color: "#5a3a86",
    riderXOffset: -15,
    riderYOffset: 128,
    image: () => images.whirlpool
  },
  juliette: {
    name: "Juliette",
    spriteKey: "juliette",
    color: "#c58a28",
    riderYOffset: DEFAULT_RIDER_Y_OFFSET,
    image: () => images.juliette
  },
  claudia: {
    name: "Claudia",
    spriteKey: "claudia",
    color: "#25897f",
    riderYOffset: DEFAULT_RIDER_Y_OFFSET,
    image: () => images.claudia
  },
  kaya: {
    name: "Kaya",
    spriteKey: "kaya",
    color: "#9a6426",
    riderYOffset: DEFAULT_RIDER_Y_OFFSET,
    image: () => images.kaya
  },
  lily: {
    name: "Lily",
    spriteKey: "lily",
    color: "#d33b2f",
    riderYOffset: 85,
    image: () => images.lily
  },
  marisol: {
    name: "Marisol",
    spriteKey: "marisol",
    color: "#f25ca5",
    riderYOffset: 95,
    image: () => images.marisol
  },
  amanda: {
    name: "Amanda",
    spriteKey: "amanda",
    color: "#263d8f",
    riderYOffset: 85,
    image: () => images.amanda
  },
  penelope: {
    name: "Penelope",
    spriteKey: "penelope",
    color: "#8f4f6f",
    riderYOffset: 85,
    hidden: true,
    image: () => images.penelope
  },
  rumi: {
    name: "Rumi",
    spriteKey: "rumi",
    color: "#7b3bb8",
    riderYOffset: 85,
    image: () => images.rumi
  },
  ...Object.fromEntries(Object.entries(extraDolls).map(([key, doll]) => [key, {
    ...doll, image: () => images[key]
  }])),
};

function dollAssetKey(key) {
  return characters[key]?.assetKey || key;
}

const state = {
  running: false,
  done: false,
  lastTime: 0,
  camera: 0,
  cameraZoom: 1,
  countdown: 0,
  mode: "two",
  winner: null,
  racers: [],
  obstacles: [],
  powerups: [],
  projectiles: [],
  thrownLeftovers: [],
  rainbowBeams: [],
  empArcs: [],
  monsters: [],
  runawayHorses: [],
  beachBalls: [],
  particles: [],
  spells: [],
  windupCars: [],
  difficulty: "normal",
  specials: "none",
  cameraMode: "lego",
  stormCloud: null,
  stormTimer: 0,
  rewardCloud: null,
  rewardTimer: 0,
  paused: false,
  lastStartPressed: false,
  viewportScaleX: 1,
  renderViewportWidth: null,
  backgroundIndex: 0,
  nextRaceTimer: null,
  victoryStartTime: 0,
  legoSplitActive: false,
  legoSplitRendering: false,
  legoSplitLineAlpha: 0,
  legoSplitLineCount: 0,
  legoSplitLinePositions: [],
  legoPaneCameras: [],
  legoPaneGroupKeys: [],
  legoMergeBoundarySnapshots: {},
  legoSharedLazy: false,
  legoRows: 1,
  legoRowOfRacer: {},
  legoRowExitHold: 0,
  legoPaneGeometry: {},
  legoForceMergeHold: {},
  legoForceMergeSeen: {},
  legoCrossfadeRequested: false,
  legoCrossfade: 0,
  // Input bindings by player slot (= racer.playerIndex). slotPads holds a
  // Gamepad.index, slotKeys a keyboard scheme ("wasd" | "arrows").
  slotPads: Array(MAX_PLAYERS).fill(null),
  slotKeys: Array(MAX_PLAYERS).fill(null),
  preserveBindings: false,
  joinPickers: [],
  padButtonsDown: new Map(),
  padLeaveHold: new Map(),
  slotDisconnectTimers: new Map(),
  // Controllers whose player chose to leave this race: they are not handed
  // to other players automatically, only by pressing A to join again.
  retiredPads: new Set()
};

const touchInput = {
  movePointerId: null,
  startX: 0,
  startY: 0,
  horizontal: 0,
  vertical: 0,
  jump: false,
  push: false
};

let menuAnimationFrame = null;
let lastMenuFrameTime = 0;
let nextTrackCrossfadeTimer = null;
const musicFadeTokens = new WeakMap();
const musicGains = new WeakMap([[music, 1], [nextMusic, 0]]);

const controllerPointers = new Map();
const spriteAlphaCanvases = new Map();
const menuCharacterPreview = [
  { key: "lily", x: 59, y: 430 },
  { key: "penelope", x: 132, y: 432 },
  { key: "rumi", x: 206, y: 430 },
  { key: "amanda", x: 141, y: 490 },
  { key: "kaya", x: 284, y: 492 },
  { key: "juliette", x: 57, y: 576 },
  { key: "claudia", x: 234, y: 576 },
  { key: "whirlpool", x: 153, y: 650 },
  { key: "marisol", x: 316, y: 620 }
];

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

function resizeCanvasToFrame() {
  const rect = gameFrame.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  const nextWidth = Math.max(MIN_VIEW_WIDTH, Math.round(H * (rect.width / rect.height)));
  // In portrait the frame is narrower than the minimum view, so letterbox the
  // canvas (keeping its proportions) instead of letting CSS squash it.
  const letterboxHeight = nextWidth > H * (rect.width / rect.height) ? (rect.width * H) / nextWidth : null;
  canvas.style.height = letterboxHeight ? `${letterboxHeight}px` : "";
  if (canvas.width === nextWidth && canvas.height === H) return;
  W = nextWidth;
  canvas.width = W;
  canvas.height = H;
  // Pane widths change with the canvas, so old alignment history is invalid.
  state.legoMergeBoundarySnapshots = {};
  updateCamera();
  drawScene(0);
}

let assetsReady = false;
let assetsFailed = false;

async function waitForAssets() {
  resizeCanvasToFrame();
  // PLAY stays disabled until every image has decoded: starting a race early
  // would be cancelled by the resetRace() below and leave the game stuck.
  startButton.disabled = true;
  startButton.textContent = "LOADING…";
  try {
    await Promise.all(Object.values(images).map(img => img.decode()));
    validateSpriteSheets();
  } catch (error) {
    console.error(error);
    assetsFailed = true;
    startButton.disabled = false;
    startButton.textContent = "TAP TO RETRY";
    return;
  }
  assetsReady = true;
  startButton.disabled = false;
  startButton.textContent = "PLAY";
  resetRace();
  drawScene(0);
  startMenuAnimationLoop();
}

function validateSpriteSheets() {
  for (const [key, character] of Object.entries(characters)) {
    const image = character.image();
    if (image.width !== FRAME * SPRITE_COLS || image.height !== FRAME * DOLL_SPRITE_ROWS) {
      throw new Error(`${key} sprite sheet must be ${FRAME * SPRITE_COLS}x${FRAME * DOLL_SPRITE_ROWS}px`);
    }
  }
  for (const key of ["horse", "unicorn", "pegasus", "griffon"]) {
    if (images[key].width !== FRAME * SPRITE_COLS || images[key].height !== FRAME * HORSE_SPRITE_ROWS) {
      throw new Error(`${key} sprite sheet must be ${FRAME * SPRITE_COLS}x${FRAME * HORSE_SPRITE_ROWS}px`);
    }
  }
  if (images.monster.width !== FRAME * SPRITE_COLS || images.monster.height !== FRAME * MONSTER_SPRITE_ROWS) {
    throw new Error(`monster sprite sheet must be ${FRAME * SPRITE_COLS}x${FRAME * MONSTER_SPRITE_ROWS}px`);
  }
}

/* Alternate outfit colours (outfits.js). racer.outfit 0 = original clothes. */
function applyRacerOutfit(racer, outfit) {
  racer.outfit = outfit || 0;
  if (!racer.outfit || !window.DollOutfits) return;
  const ready = DollOutfits.getSync(racer.spriteKey, "sheet", racer.outfit);
  if (ready) {
    racer.sheet = ready;
    return;
  }
  // Not built yet (e.g. a mid-race join): swap it in as soon as it is.
  DollOutfits.get(racer.spriteKey, "sheet", racer.outfit).then(sheet => {
    if (racer.outfit === outfit && sheet) racer.sheet = sheet;
  });
}

function dedupeRacerOutfits() {
  if (!window.DollOutfits) return;
  const taken = new Map();
  // Players keep what they chose; computer racers move if they clash.
  const ordered = state.racers.slice().sort((a, b) => a.ai - b.ai);
  for (const racer of ordered) {
    const used = taken.get(racer.spriteKey) || new Set();
    if (used.has(racer.outfit)) applyRacerOutfit(racer, DollOutfits.firstFree(racer.spriteKey, used));
    used.add(racer.outfit);
    taken.set(racer.spriteKey, used);
  }
}

function resetRace(mode = state.mode) {
  clearNextRaceTimer();
  updateMobileModeAvailability();
  state.mode = MODE_CONFIG[mode] ? mode : gameMode.value || "two";
  if (!isModeAvailable(state.mode)) state.mode = "one-one-ai";
  gameMode.value = state.mode;
  const config = getModeConfig();
  state.running = false;
  state.done = false;
  state.lastTime = 0;
  state.camera = 0;
  state.cameraZoom = 1;
  state.renderViewportWidth = null;
  applyTrackBounds();
  state.legoSplitActive = false;
  state.legoSplitRendering = false;
  state.legoSplitLineAlpha = 0;
  state.legoSplitLineCount = 0;
  state.legoSplitLinePositions = [];
  state.legoPaneCameras = [];
  state.legoPaneGroupKeys = [];
  state.legoMergeBoundarySnapshots = {};
  state.legoSharedLazy = false;
  state.legoRows = 1;
  state.legoRowOfRacer = {};
  state.legoRowExitHold = 0;
  state.legoForceMergeHold = {};
  state.legoForceMergeSeen = {};
  state.legoCrossfadeRequested = false;
  state.legoCrossfade = 0;
  state.winner = null;
  state.victoryStartTime = 0;
  state.cloudFloor = makeCloudFloor();
  state.obstacles = makeObstacles();
  state.projectiles = [];
  state.monsterBolts = [];
  state.thrownLeftovers = [];
  state.rainbowBeams = [];
  state.empArcs = [];
  state.amandaCaught = null;
  state.amandaAlly = null;
  state.monsters = makeMonsters();
  state.runawayHorses = [];
  state.beachBalls = makeBeachBalls();
  state.particles = [];
  state.spells = [];
  state.windupCars = [];
  state.jumpPogo = Math.random() < POGO_SHARE;
  state.powerups = [...makePowerups(), ...makeSpareHorses()];
  clearCloudGaps();
  state.stormCloud = null;
  state.stormTimer = nextStormDelay();
  state.rewardCloud = null;
  state.rewardTimer = nextRewardDelay();
  state.paused = false;
  pausePanel.classList.add("hidden");
  state.racers = [];
  const totalRacers = Math.min(MAX_PLAYERS, config.humans + config.ais);
  setupSlotBindings(config.humans);
  for (let index = 0; index < totalRacers; index += 1) {
    const ai = index >= config.humans;
    const character = getSelectedCharacter(characterSelects[index], CHARACTER_FALLBACKS[index]);
    const start = RACER_STARTS[index];
    const racer = makeRacer(
      character.name,
      character.spriteKey,
      character.image(),
      index,
      start.x,
      startYInTrack(start.y),
      ai,
      character.color,
      ai ? 365 : 475,
      character.riderYOffset,
      character.riderXOffset
    );
    applyRacerOutfit(racer, state.raceOutfits?.[index] || 0);
    state.racers.push(racer);
  }
  // Two racers on the same doll never share an outfit (e.g. computer racers).
  dedupeRacerOutfits();
  updatePlayerLabels();
  updateModeLabels();
  updateBackgroundSelect();
  updateDifficultyButton();
  updateSpecialsSelect();
  updateHud();
  finishPanel.classList.add("hidden");
  finishPanel.classList.remove("celebration");
}

function clearNextRaceTimer() {
  if (!state.nextRaceTimer) return;
  clearTimeout(state.nextRaceTimer);
  state.nextRaceTimer = null;
}

function getCurrentBackground() {
  return BACKGROUNDS[state.backgroundIndex] || BACKGROUNDS[0];
}

function trackArtKey(trackKey, file) {
  return `track_${trackKey}_${file}`;
}

function getTrackTheme(background = getCurrentBackground()) {
  return TRACK_THEMES[background.key] || {};
}

// The current track's art file from tracks.js, or null to use the built-in look.
function getTrackArt(file) {
  return images[trackArtKey(getCurrentBackground().key, file)] || null;
}

// Track cards: the track's own card art, then its cell of track_cards.webp
// (the original five), then a crop of its background.
// Track-specific art (backgrounds, props, themed mounts, the troll's riding
// sheets) loads on demand for the current and next track, so PLAY only waits
// for the core sheets. Until a file has loaded the built-in look is used.
const trackArtLoads = new Map();

function loadArtOnce(key, src) {
  if (!trackArtLoads.has(key)) {
    trackArtLoads.set(key, new Promise(resolve => {
      const img = new Image();
      img.onload = () => img.decode().catch(() => {}).then(() => {
        images[key] = img;
        resolve();
      });
      img.onerror = () => {
        console.warn(`Couldn't load ${src}`);
        resolve();
      };
      img.src = src;
    }));
  }
  return trackArtLoads.get(key);
}

// A track's power-up sheet's cache stamp: its own (tracks.js
// powerupArtVersion, bumped when that sheet changes) or the shared one.
function powerupArtVersion(trackKey) {
  return TRACK_THEMES[trackKey]?.powerupArtVersion || window.GAME_CONFIG?.powerupArtVersion || "1";
}

function preloadTrackArt(background) {
  if (!background) return;
  const theme = getTrackTheme(background);
  for (const file of theme.art || []) loadArtOnce(trackArtKey(background.key, file), `assets/tracks/${background.key}/${file}.webp${file === "powerups" ? "?v=" + powerupArtVersion(background.key) : ""}`);
  for (const type of [...Object.keys(theme.mountOdds || {}), theme.baseMount].flat()) {
    if (THEMED_MOUNT_TYPES.includes(type)) loadArtOnce(type, `assets/${type}_sprites.webp`);
  }
  if (getTrackTheme(background).rideToys?.boost === "skates") loadArtOnce(trackArtKey(SKATES_ICON_TRACK, "powerups"), `assets/tracks/${SKATES_ICON_TRACK}/powerups.webp?v=${powerupArtVersion(SKATES_ICON_TRACK)}`);
  if (pogoEligible(background)) loadArtOnce(trackArtKey(POGO_ICON_TRACK, "powerups"), `assets/tracks/${POGO_ICON_TRACK}/powerups.webp?v=${powerupArtVersion(POGO_ICON_TRACK)}`);
  if (theme.monster && theme.monster !== "troll" && window.MONSTERS?.[theme.monster]) {
    loadArtOnce(theme.monster, monsterSheetUrl(theme.monster));
    const particleArt = window.MONSTERS[theme.monster].particles;
    if (particleArt) loadArtOnce(particleArt, `assets/${particleArt}.webp`);
    if (window.MONSTERS[theme.monster].lightning) {
      loadArtOnce("cloudtroll_lightning", "assets/cloudtroll_lightning.webp");
      loadArtOnce("cloudtroll_bolt", "assets/cloudtroll_bolt.webp");
    }
  }
  if (theme.trollMount) {
    for (const name of window.TRACK_SHARED_ART || []) loadArtOnce(name, `assets/${name}_sprites.webp`);
  }
}

function getTrackCard(background) {
  if (getTrackTheme(background).art?.includes("card")) {
    return { url: `assets/tracks/${background.key}/card.webp?v=${window.GAME_CONFIG?.trackCardArtVersion || "1"}`, cells: 1, index: 0 };
  }
  const index = BACKGROUNDS.indexOf(background);
  if (index >= 0 && index < TRACK_CARD_ATLAS_CELLS) return { url: `assets/ui/track_cards.webp?v=${window.GAME_CONFIG?.trackCardArtVersion || "1"}`, cells: TRACK_CARD_ATLAS_CELLS, index };
  const url = getTrackTheme(background).art?.includes("background")
    ? `assets/tracks/${background.key}/background.webp`
    : images[background.imageKey]?.src;
  return { url, cells: 1, index: 0, crop: true };
}

function applyTrackBounds() {
  const dirtTop = getCurrentBackground().dirtTop;
  PATH_TOP = dirtTop ? dirtTop - FOOT_OFFSET_Y : DEFAULT_TRACK_TOP;
  // fenceBase is where the back fence meets the ground: racers can come up
  // until their shadow's centre sits just below it.
  const fenceBase = getCurrentBackground().fenceBase ?? getTrackTheme().fenceBase;
  TRACK_TOP = fenceBase ? Math.min(PATH_TOP, fenceBase + 4 - SHADOW_OFFSET_Y) : PATH_TOP;
  FINISH = Math.round(BASE_FINISH * (getTrackTheme().lengthScale || 1));
  CAMERA_MIN_ZOOM = EXPECTED_VIEW_WIDTH / (FINISH + CAMERA_PLAYER_MARGIN * 2);
  MONSTER_COURSE_START_X = FINISH / 3 + 120;
  preloadTrackArt(getCurrentBackground());
  preloadTrackArt(BACKGROUNDS[(state.backgroundIndex + 1) % BACKGROUNDS.length]);
}

// RACER_STARTS are laid out for the default band; spread them over this one.
function startYInTrack(y) {
  const t = (y - DEFAULT_TRACK_TOP) / (TRACK_BOTTOM - DEFAULT_TRACK_TOP);
  return PATH_TOP + t * (TRACK_BOTTOM - PATH_TOP);
}

function setBackground(key) {
  const index = BACKGROUNDS.findIndex(background => background.key === key);
  state.backgroundIndex = index === -1 ? 0 : index;
  applyTrackBounds();
  syncBackgroundMusic();
  updateBackgroundSelect();
  if (!state.running) drawScene(0);
}

function updateBackgroundSelect() {
  if (backgroundSelect) backgroundSelect.value = getCurrentBackground().key;
}

function getCurrentDifficulty() {
  return DIFFICULTIES.find(difficulty => difficulty.key === state.difficulty) || DIFFICULTIES[1];
}

function updateDifficultyButton() {
  if (!difficultySelect) return;
  difficultySelect.value = getCurrentDifficulty().key;
}

function updateSpecialsSelect() {
  if (!specialsSelect) return;
  specialsSelect.value = state.specials;
}

function setSpecials(key) {
  state.specials = SPECIALS.has(key) ? key : "none";
  updateSpecialsSelect();
  updateCharacterSelectOptions();
  if (!state.running) {
    resetRace(state.mode);
    drawScene(0);
  }
}

function isAllDollsMode() {
  return state.specials === "all-dolls";
}

function getVisibleCharacterEntries() {
  return Object.entries(characters).filter(([, character]) => isAllDollsMode() || !character.hidden);
}

function updateCharacterSelectOptions() {
  const visibleEntries = getVisibleCharacterEntries();
  for (let index = 0; index < characterSelects.length; index += 1) {
    const select = characterSelects[index];
    if (!select) continue;
    const previous = select.value;
    select.replaceChildren(...visibleEntries.map(([key, character]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = character.name;
      return option;
    }));
    const fallback = CHARACTER_FALLBACKS[index];
    select.value = visibleEntries.some(([key]) => key === previous) ? previous : fallback;
  }
}

function setDifficulty(key) {
  state.difficulty = DIFFICULTIES.some(difficulty => difficulty.key === key) ? key : "normal";
  updateDifficultyButton();
  if (!state.running) {
    resetRace(state.mode);
    drawScene(0);
  }
}

function toggleSettingsPanel() {
  settingsPanel?.classList.toggle("hidden");
}

function advanceBackground() {
  state.backgroundIndex = (state.backgroundIndex + 1) % BACKGROUNDS.length;
}

function getSelectedCharacter(select, fallback) {
  const character = characters[select?.value];
  // Hidden dolls can still race when "Random" lands on them in the menu.
  if (character) return character;
  return characters[fallback];
}

function getModeConfig() {
  return MODE_CONFIG[state.mode] || MODE_CONFIG.two;
}

function isModeAvailable(mode) {
  return !isTouchDevice() || hasConnectedController() || MOBILE_MODE_VALUES.has(mode);
}

function updateMobileModeAvailability() {
  const mobileLimited = isTouchDevice() && !hasConnectedController();
  for (const option of gameMode.options) {
    option.disabled = mobileLimited && !MOBILE_MODE_VALUES.has(option.value);
  }
  if (mobileLimited && !MOBILE_MODE_VALUES.has(gameMode.value)) {
    gameMode.value = "one-one-ai";
    state.mode = gameMode.value;
  }
}

function getHudRacers() {
  return state.racers.slice().sort((a, b) => a.playerIndex - b.playerIndex);
}

function racerTag(racer) {
  return racer.ai ? `AI ${racer.playerIndex + 1}` : `P${racer.playerIndex + 1}`;
}

function slotColor(index) {
  return PLAYER_SLOT_COLORS[index % PLAYER_SLOT_COLORS.length];
}

function updatePlayerLabels() {
  const racers = getHudRacers();
  hudElement?.classList.toggle("compact", racers.length > 4);
  for (let index = 0; index < playerHuds.length; index += 1) {
    const racer = racers[index];
    const card = playerHuds[index];
    if (!card) continue;
    card.classList.toggle("hidden", !racer);
    if (!racer) continue;
    ensureHudCardParts(card);
    const color = racer.ai ? "#7a7f8c" : slotColor(racer.playerIndex);
    card.style.setProperty("--slot-color", color);
    const badge = card.querySelector(".hud-badge");
    badge.classList.toggle("ai", racer.ai);
    badge.style.backgroundPosition = racer.ai ? "" : `${(racer.playerIndex % 8) * (100 / 7)}% 0`;
    const face = card.querySelector(".hud-face");
    const faceKey = `${racer.spriteKey}|${racer.outfit || 0}`;
    if (face.dataset.key !== faceKey) {
      face.dataset.key = faceKey;
      face.style.backgroundImage = `url("assets/portraits/${dollAssetKey(racer.spriteKey)}.webp")`;
      if (racer.outfit && window.DollOutfits) {
        DollOutfits.url(racer.spriteKey, "portrait", racer.outfit).then(src => {
          if (face.dataset.key === faceKey) face.style.backgroundImage = `url("${src}")`;
        });
      }
    }
    playerLabels[index].textContent = racer.ai ? `${racer.name} (CPU)` : racer.name;
    playerLabels[index].style.color = "";
  }
}

// Each HUD card shows the player's rosette (or the computer badge), a little
// portrait, then the name and place/status lines.
function ensureHudCardParts(card) {
  if (card.querySelector(".hud-badge")) return;
  const badge = document.createElement("span");
  badge.className = "hud-badge";
  const face = document.createElement("span");
  face.className = "hud-face";
  const text = document.createElement("span");
  text.className = "hud-text";
  text.append(...card.children);
  card.append(badge, face, text);
}

function ordinal(place) {
  const suffix = place % 100 >= 11 && place % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][place % 10] || "th";
  return `${place}${suffix}`;
}

function getRaceOrder() {
  if (state.done && state.finishOrder?.length) return state.finishOrder;
  return state.racers.slice().sort((a, b) => b.x - a.x);
}

function updateModeLabels() {
  updateMobileModeAvailability();
  const config = MODE_CONFIG[gameMode.value] || MODE_CONFIG.two;
  const totalRacers = Math.min(MAX_PLAYERS, config.humans + config.ais);
  for (let index = 1; index < characterSelects.length; index += 1) {
    const visible = index < totalRacers;
    if (characterSelectWraps[index]) characterSelectWraps[index].classList.toggle("hidden", !visible);
    if (!visible || !characterSelectLabels[index]) continue;
    characterSelectLabels[index].textContent = index < config.humans ? `Player ${index + 1}` : `AI ${index + 1}`;
  }
  updateControlInstructions();
}

function updateControlInstructions() {
  const config = MODE_CONFIG[gameMode.value] || MODE_CONFIG.two;
  if (isTouchDevice()) {
    const lines = hasConnectedController()
      ? ["P1: touch controls or controller 1"]
      : ["Swipe and hold to move", "Tap Jump or Hit"];
    if (hasConnectedController()) {
      for (let index = 1; index < config.humans; index += 1) {
        lines.push(`P${index + 1}: controller ${index + 1}`);
      }
    }
    for (let index = config.humans; index < config.humans + config.ais; index += 1) {
      lines.push(`AI ${index + 1}: computer`);
    }
    controls.replaceChildren(...lines.map(text => {
      const item = document.createElement("span");
      item.textContent = text;
      return item;
    }));
    return;
  }
  const lines = [];
  for (let index = 0; index < config.humans; index += 1) {
    lines.push(`P${index + 1}: ${controlDescription(index, config.humans)}`);
  }
  for (let index = config.humans; index < config.humans + config.ais; index += 1) {
    lines.push(`AI ${index + 1}: computer`);
  }
  controls.replaceChildren(...lines.map(text => {
    const item = document.createElement("span");
    item.textContent = text;
    return item;
  }));
}

function makeRacer(name, spriteKey, sheet, playerIndex, x, y, ai, color, maxSpeed, riderYOffset = DEFAULT_RIDER_Y_OFFSET, riderXOffset = DEFAULT_RIDER_X_OFFSET) {
  return {
    name,
    spriteKey,
    sheet,
    playerIndex,
    x,
    y,
    z: 0,
    vy: 0,
    speed: 0,
    cameraVelocityX: 0,
    moving: false,
    facing: 1,
    boost: 0,
    ai,
    color,
    maxSpeed,
    riderYOffset,
    riderXOffset,
    hitTimer: 0,
    frozenTimer: 0,
    speedBoostTimer: 0,
    speedBoostStacks: [],
    highJumpTimer: 0,
    highJumpStacks: [],
    empTimer: 0,
    oilTimer: 0,
    oilVelocity: 0,
    oilSticky: false,
    snowballs: 0,
    powerupMessage: "",
    finished: false,
    finishTime: 0,
    frameTime: 0,
    frame: 0,
    jumpStarted: false,
    onObstacle: false,
    jumpFrame: 0,
    landingTimer: 0,
    pushTimer: 0,
    pushCooldown: 0,
    mountBumpCooldown: 0,
    pushedTargets: new Set(),
    fallBackTimer: 0,
    fallBackFacing: 1,
    knockbackX: 0,
    horseTimer: isAlwaysMountedTrack() ? Infinity : 0,
    horseType: "horse",
    pegasusGliding: false,
    unicornBeamCooldown: 0,
    rideToys: [],
    moonBootsTimer: 0,
    castTimer: 0,
    castFacing: 0,
    spellAim: null,
    frogTimer: 0,
    frogPhase: 0,
    surfTimer: 0,
    surfLaneV: 0,
    surfPhase: 0,
    ghosts: [],
    ghostTimer: 0,
    sparkleTimer: 0,
    lastBody: null,
    toyDistance: 0,
    pogoPhase: 0,
    grabbedBy: null,
    aiWanderAhead: false
  };
}

function makeObstacles() {
  const hurdles = [];
  const amandaHazardInterval = getAmandaHazardInterval();
  const amandaHazardPhase = amandaHazardInterval > 0
    ? Math.floor(Math.random() * amandaHazardInterval)
    : -1;
  let x = 560;
  let index = 0;
  while (x < FINISH - 520) {
    const progress = x / FINISH;
    const minGap = progress < 0.35 ? 360 : progress < 0.7 ? 300 : 245;
    const wave = (Math.sin(index * 1.71) + 1) * 0.5;
    const gap = (minGap + wave * 120) * (getTrackTheme().hurdleGapScale || 1);
    const amandaHazard = amandaHazardInterval > 0 && index % amandaHazardInterval === amandaHazardPhase;
    hurdles.push({
      x,
      y: PATH_TOP + 28 + ((index * 53) % (TRACK_BOTTOM - PATH_TOP - 44)),
      w: HURDLE_W,
      h: 58,
      hitW: HURDLE_HIT_W,
      hitH: HURDLE_HIT_H,
      kind: "hurdle",
      amandaHazard,
      amandaState: "hidden",
      amandaTimer: 0,
      amandaReveal: 0,
      amandaCooldown: 0,
      amandaFacing: 1,
      amandaTarget: null
    });
    x += gap;
    index += 1;
  }
  return hurdles;
}

let wizardMountsUnlockedOn = null;

// Flying mounts share hold-to-glide physics and the legacy animation flag.
function updateRacerVerticalMotion(racer, mounted, jumpHeld, dt) {
  const holding = mounted && isFlyingMountType(racer.horseType) && jumpHeld && racer.z > 0;
  racer.z += racer.vy * dt;
  if (holding && racer.z >= PEGASUS_HOVER_Z) {
    racer.z = PEGASUS_HOVER_Z;
    racer.vy = 0;
    racer.pegasusGliding = true;
  } else {
    racer.pegasusGliding = false;
    racer.vy -= GRAVITY * (racer.moonBootsTimer > 0 ? MOON_BOOTS_GRAVITY_SCALE : 1) * dt;
  }
}

/* ── Audio glue ───────────────────────────────────────────────────────────────
 * One-shot effects are fired from the gameplay code that causes them; anything
 * continuous (footsteps, wingbeats, and snoring) is driven from
 * updateAudio() below, which runs once per frame at the end of update().
 * Volumes live in AUDIO_CONFIG at the top of audio.js.
 * ---------------------------------------------------------------------------*/

function startRace(mode = gameMode.value) {
  clearJoinPickers();
  stopMenuAnimationLoop();
  hideControllerPointers();
  updateMobileModeAvailability();
  mode = isModeAvailable(mode) ? mode : gameMode.value;
  resetRace(mode);
  state.running = true;
  startPanel.classList.add("hidden");
  pausePanel.classList.add("hidden");
  updateTouchControlsVisibility();
  GameAudio.unlock();
  startMusic();
  GameAudio.play("crowd_cheer_short");
  state.racers.forEach((racer, index) => {
    setTimeout(() => racerVoice(racer, "race_start", { chance: 0.6, priority: 1 }), 420 + index * 320);
  });
  requestAnimationFrame(loop);
}

function togglePause() {
  if (!state.running || state.done) return;
  state.paused = !state.paused;
  pausePanel.classList.toggle("hidden", !state.paused);
  updateTouchControlsVisibility();
  if (state.paused) clearTouchInput();
  if (state.paused) {
    openPauseSettings(false);
    updatePauseCorner();
    resetPauseMenuFocus();
    GameAudio.play("ui_pause");
    const pausedTrack = music;
    fadeMusicGain(pausedTrack, 0, PAUSE_MUSIC_FADE_MS, () => {
      if (state.paused && pausedTrack === music) pausedTrack.pause();
    });
    stopGameplayAudioLoops();
    startMenuAnimationLoop();
  } else {
    GameAudio.play("ui_unpause");
    stopMenuAnimationLoop();
    hideControllerPointers();
    startMusic({ fadeInMs: 220 });
    state.lastTime = 0;
    requestAnimationFrame(loop);
  }
}

/* Pause menu: D-pad/stick moves between the buttons, A picks one, Start or B
 * resumes. Buttons held when the menu opened (the Start that paused) are
 * ignored until released. */
const pauseMenu = { focus: 0, prev: new Map(), repeat: 0 };

// Everything the D-pad can reach: the card's buttons (and its sliders in
// settings), then the corner buttons.
function pauseMenuButtons() {
  return Array.from(pausePanel.querySelectorAll("button, input[type=range]")).filter(item => item.getClientRects().length > 0);
}

// Sliders show 0-100; sound effects reach twice their default at the top.
const PAUSE_SLIDER_SCALE = { master: 1, music: 1, sfx: 0.5 };

function openPauseSettings(open) {
  pauseSettings.classList.toggle("hidden", !open);
  pauseCard.classList.toggle("hidden", open);
  if (open) {
    for (const slider of pauseSettings.querySelectorAll("input[type=range]")) {
      slider.value = Math.round(GameAudio.getVolume(slider.dataset.bus) / PAUSE_SLIDER_SCALE[slider.dataset.bus] * 100);
    }
  }
  if (state.paused) setPauseMenuFocus(0);
}

function updatePauseCorner() {
  pauseSoundButton.classList.toggle("off", GameAudio.isMuted);
  pauseSoundButton.setAttribute("aria-pressed", String(!GameAudio.isMuted));
  pauseFullscreenButton.classList.toggle("on", Boolean(fullscreenElement()));
  pauseFullscreenButton.hidden = !canFullscreen();
}

function setPauseMenuFocus(index) {
  const buttons = pauseMenuButtons();
  if (!buttons.length) return;
  pauseMenu.focus = (index + buttons.length) % buttons.length;
  buttons.forEach((button, i) => button.classList.toggle("focused", i === pauseMenu.focus));
  buttons[pauseMenu.focus].focus({ preventScroll: true });
}

function resetPauseMenuFocus() {
  pauseMenu.prev.clear();
  pauseMenu.primed = false;
  setPauseMenuFocus(0);
}

function updatePauseMenu(dt) {
  const pads = connectedGamepads(navigator.getGamepads ? navigator.getGamepads() : []);
  pauseMenu.repeat -= dt;
  for (const pad of pads) {
    const prev = pauseMenu.prev.get(pad.index) || { buttons: [], dir: 0 };
    const pressed = button => Boolean(pad.buttons[button]?.pressed) && !prev.buttons[button] && pauseMenu.primed;
    const stickY = Math.abs(pad.axes[1] || 0) > 0.55 ? Math.sign(pad.axes[1]) : 0;
    const stickX = Math.abs(pad.axes[0] || 0) > 0.55 ? Math.sign(pad.axes[0]) : 0;
    const dpadY = (pad.buttons[13]?.pressed ? 1 : 0) - (pad.buttons[12]?.pressed ? 1 : 0);
    const dpadX = (pad.buttons[15]?.pressed ? 1 : 0) - (pad.buttons[14]?.pressed ? 1 : 0);
    const dirX = dpadX || stickX;
    const dir = dpadY || dirX || stickY;
    const focused = pauseMenuButtons()[pauseMenu.focus];
    if (pauseMenu.primed && dir && (dir !== prev.dir || pauseMenu.repeat <= 0)) {
      if (focused?.type === "range" && dirX && !dpadY) {
        // Left/right on a slider changes it.
        focused.value = clamp(Number(focused.value) + dirX * Number(focused.step || 5), 0, 100);
        focused.dispatchEvent(new Event("input"));
      } else {
        setPauseMenuFocus(pauseMenu.focus + dir);
        GameAudio.play("ui_hover");
      }
      pauseMenu.repeat = dir !== prev.dir ? 0.4 : 0.12;
    }
    const start = pressed(9);
    const back = pressed(1);
    const choose = pressed(0);
    pauseMenu.prev.set(pad.index, { buttons: pad.buttons.map(button => button.pressed), dir });
    if (back && !pauseSettings.classList.contains("hidden")) { openPauseSettings(false); return; }
    if (start || back) { togglePause(); return; }
    if (choose && focused?.type !== "range") { focused?.click(); return; }
  }
  pauseMenu.primed = true;
}

// On the finish screen, A or Start on any controller starts the next race now.
const finishMenu = { prev: new Map(), primed: false };

function resetFinishMenuInput() {
  finishMenu.prev.clear();
  finishMenu.primed = false;
}

function updateFinishMenu() {
  if (finishPanel.classList.contains("hidden")) return;
  for (const pad of connectedGamepads(navigator.getGamepads ? navigator.getGamepads() : [])) {
    const prev = finishMenu.prev.get(pad.index) || [];
    const pressed = button => Boolean(pad.buttons[button]?.pressed) && !prev[button] && finishMenu.primed;
    finishMenu.prev.set(pad.index, pad.buttons.map(button => button.pressed));
    if (pressed(0) || pressed(9)) {
      restartButton.click();
      return;
    }
  }
  finishMenu.primed = true;
}

function returnToMenu() {
  window.Lobby?.captureFromRace();
  clearNextRaceTimer();
  clearJoinPickers();
  state.running = false;
  state.done = false;
  state.paused = false;
  stopMusicTransitions();
  music.pause();
  nextMusic.pause();
  setMusicGain(music, 1);
  setMusicGain(nextMusic, 0);
  GameAudio.stopAll();
  GameAudio.play("ui_back");
  pausePanel.classList.add("hidden");
  finishPanel.classList.add("hidden");
  startPanel.classList.remove("hidden");
  clearTouchInput();
  updateTouchControlsVisibility();
  updateMobileModeAvailability();
  setBackground(startingBackground);
  resetRace(gameMode.value);
  drawScene(0);
  startMenuAnimationLoop();
  window.Lobby?.showSelect();
}

function fullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function canFullscreen() {
  const target = document.querySelector(".game-frame");
  return Boolean(target.requestFullscreen || target.webkitRequestFullscreen);
}

// Resolves to whether the frame is fullscreen afterwards. Browsers only allow
// entering fullscreen from a click/tap/key press, not a controller button.
function toggleFullscreen() {
  const target = document.querySelector(".game-frame");
  try {
    if (!fullscreenElement()) {
      const request = target.requestFullscreen?.() ?? target.webkitRequestFullscreen?.();
      return Promise.resolve(request).then(() => Boolean(fullscreenElement()), () => false);
    }
    const exit = document.exitFullscreen?.() ?? document.webkitExitFullscreen?.();
    return Promise.resolve(exit).then(() => Boolean(fullscreenElement()), () => Boolean(fullscreenElement()));
  } catch (error) {
    return Promise.resolve(Boolean(fullscreenElement()));
  }
}

function finishRace(winner) {
  // Places for the podium and the HUD, decided before the slots are compacted.
  state.finishOrder = state.racers.slice().sort((a, b) => (b === winner) - (a === winner) || b.x - a.x);
  clearJoinPickers();
  compactSlotsForNextRace();
  state.running = false;
  state.done = true;
  state.winner = winner;
  state.victoryStartTime = performance.now();
  clearTouchInput();
  updateTouchControlsVisibility();
  stopGameplayAudioLoops();
  const nextBackground = BACKGROUNDS[(state.backgroundIndex + 1) % BACKGROUNDS.length];
  beginBoardEndMusic(nextBackground);
  playVictoryAudio(winner);
  // The scene already says who won, so the strip is about what comes next.
  finishTitle.textContent = `Next race: ${nextBackground.name}`;
  finishText.textContent = getTrackTheme().unlocksWizardMounts && unlockWizardMounts()
    ? "Gryphons and broomsticks unlocked!"
    : "Get ready…";
  const nextCard = getTrackCard(nextBackground);
  const finishTrack = finishPanel.querySelector(".finish-track");
  finishTrack.style.backgroundImage = `url("${nextCard.url}")`;
  finishTrack.style.backgroundSize = nextCard.crop ? "cover" : `${nextCard.cells * 100}% 100%`;
  finishTrack.style.backgroundPosition = nextCard.cells > 1 ? `${(nextCard.index / (nextCard.cells - 1)) * 100}% 0` : "center";
  finishPanel.style.setProperty("--next-race-ms", `${NEXT_RACE_DELAY}ms`);
  finishPanel.classList.remove("hidden");
  finishPanel.classList.remove("celebration");
  void finishPanel.offsetWidth; // restart the countdown bar animation
  finishPanel.classList.add("celebration");
  resetFinishMenuInput();
  updatePlayerLabels();
  updateHud();
  startMenuAnimationLoop();
  clearNextRaceTimer();
  state.nextRaceTimer = setTimeout(() => {
    advanceBackground();
    startRace(state.mode);
  }, NEXT_RACE_DELAY);
}

function loop(time) {
  if (state.paused) return;
  const dt = Math.min(0.033, (time - (state.lastTime || time)) / 1000);
  state.lastTime = time;
  update(dt);
  drawScene(dt);
  if (state.running) requestAnimationFrame(loop);
}

function startMenuAnimationLoop() {
  if (menuAnimationFrame !== null) return;
  lastMenuFrameTime = 0;
  menuAnimationFrame = requestAnimationFrame(menuAnimationLoop);
}

function stopMenuAnimationLoop() {
  if (menuAnimationFrame === null) return;
  cancelAnimationFrame(menuAnimationFrame);
  menuAnimationFrame = null;
  lastMenuFrameTime = 0;
}

function menuAnimationLoop(time) {
  menuAnimationFrame = null;
  if (state.running && !state.paused) {
    hideControllerPointers();
    return;
  }
  const dt = Math.min(0.033, (time - (lastMenuFrameTime || time)) / 1000);
  lastMenuFrameTime = time;
  // The title/select screens (menu.js) cover the frame and handle their own
  // joining, so the canvas and the menu pointers rest while they show.
  if (isMenuOpen() && window.Lobby) {
    hideControllerPointers();
    menuAnimationFrame = requestAnimationFrame(menuAnimationLoop);
    return;
  }
  if (assetsReady && isMenuOpen()) pollPlayerJoinAndLeave(dt);
  // Pause and finish screens are driven with the D-pad and A, not a pointer.
  hideControllerPointers();
  if (state.paused) updatePauseMenu(dt);
  else if (state.done) updateFinishMenu();
  drawScene(dt);
  menuAnimationFrame = requestAnimationFrame(menuAnimationLoop);
}

function update(dt) {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  const racerCameraStartPositions = new Map(state.racers.map(racer => [racer, racer.x]));
  pollPlayerJoinAndLeave(dt, gamepads);
  // Only controllers that belong to a player pause; Start on a spare
  // controller asks to join instead.
  const startPressed = connectedGamepads(gamepads).some(pad => getSlotForPad(pad.index) !== -1 && pad.buttons[9]?.pressed);
  if (startPressed && !state.lastStartPressed) togglePause();
  state.lastStartPressed = startPressed;
  if (state.paused) return;

  for (const racer of state.racers) {
    if (racer.finished) continue;
    const input = racer.ai ? aiInput(racer) : playerInput(racer.playerIndex, gamepads);
    racer.hitTimer = Math.max(0, racer.hitTimer - dt);
    const previousFrozenTimer = racer.frozenTimer;
    racer.frozenTimer = Math.max(0, racer.frozenTimer - dt);
    if (previousFrozenTimer > 0 && racer.frozenTimer === 0) {
      if (!racer.empDizzy) sfx("frozen_break", racer.x);
      racer.empDizzy = false;
      racer.empLaser = false;
    }
    updateStackTimers(racer, dt);
    racer.empTimer = Math.max(0, racer.empTimer - dt);
    const previousOilTimer = racer.oilTimer;
    racer.oilTimer = Math.max(0, racer.oilTimer - dt);
    if (previousOilTimer > 0 && racer.oilTimer === 0) sfx("oil_slide_end", racer.x);
    racer.pushTimer = Math.max(0, racer.pushTimer - dt);
    racer.pushCooldown = Math.max(0, racer.pushCooldown - dt);
    racer.mountBumpCooldown = Math.max(0, racer.mountBumpCooldown - dt);
    racer.fallBackTimer = Math.max(0, racer.fallBackTimer - dt);
    if (Number.isFinite(racer.horseTimer)) {
      const previousHorseTimer = racer.horseTimer;
      racer.horseTimer = Math.max(0, racer.horseTimer - dt);
      if (previousHorseTimer > HORSE_FLASH_TIME && racer.horseTimer <= HORSE_FLASH_TIME) {
        sfx("mount_expire_warning", racer.x);
      }
      if (previousHorseTimer > 0 && racer.horseTimer === 0) {
        sfx("mount_expire_poof", racer.x);
        GameAudio.stopLoop(racerLoopId(racer, "mount"));
      }
    }
    racer.unicornBeamCooldown = Math.max(0, racer.unicornBeamCooldown - dt);
    if (racer.joinFlashTimer > 0) racer.joinFlashTimer = Math.max(0, racer.joinFlashTimer - dt);
    if (racer.horseTimer === 0) {
      racer.horseType = "horse";
      racer.pegasusGliding = false;
      // On the Horse Show a special mount running out leaves her on a horse,
      // unless a troll pulled her off and she hasn't got back on yet.
      if (isAlwaysMountedTrack() && !racer.dismounted) racer.horseTimer = Infinity;
    }

    // A quick cheer after scattering a candy pile, on the move (drawn in
    // her cheer pose; she doesn't stop).
    if (racer.celebrateTimer > 0) racer.celebrateTimer = Math.max(0, racer.celebrateTimer - dt);

    if (racer.grabbedBy) {
      racer.speed = 0;
      racer.moving = false;
      racer.frameTime += dt * 3.2;
      racer.frame = Math.floor(racer.frameTime) % 3;
      continue;
    }

    const mounted = isMounted(racer);
    const oilAffectsRacer = racer.oilTimer > 0 && (!mounted || !isHorsingAroundMode());
    if (racer.frozenTimer > 0 || racer.fallBackTimer > 0 || oilAffectsRacer) {
      input.horizontal = 0;
      input.vertical = 0;
      input.jump = false;
    }
    if (mounted && racer.horseType !== "unicorn" && !canMountedRacerThrowSnowballs(racer) && !isAlwaysMountedTrack()) input.push = false;
    const frog = racer.frogTimer > 0;
    const surfing = racer.surfTimer > 0 && !mounted && !frog && !(racer.frozenTimer > 0 || racer.fallBackTimer > 0 || oilAffectsRacer);
    if (frog || surfing) {
      input.jump = false;
      if (frog) input.push = false;
    }

    if (input.push && racer.pushCooldown === 0 && racer.pushTimer === 0) {
      racer.pushTimer = PUSH_ACTIVE_TIME;
      racer.pushCooldown = PUSH_COOLDOWN;
      racer.pushedTargets.clear();
      if (mounted && racer.horseType === "unicorn") {
        fireRainbowBeam(racer);
      } else if (racer.snowballs > 0) {
        launchSnowball(racer);
      } else {
        sfx("push_whoosh", racer.x);
        racerVoice(racer, "push", { chance: 0.2 });
      }
    }
    if (racer.playerIndex === 0) updateTouchControlsVisibility();

    const boostMult = canRacerUsePowerups(racer) ? getBoostMultiplier(racer) : 1;
    const runSpeed = mounted ? (racer.ai ? HORSE_AI_RUN_SPEED : HORSE_RUN_SPEED) : (racer.ai ? AI_RUN_SPEED : PLAYER_RUN_SPEED);
    let forward = input.horizontal * runSpeed * boostMult;
    if (oilAffectsRacer) {
      const oilProgress = racer.oilTimer / OIL_SLIDE_DURATION;
      forward = racer.oilVelocity * oilProgress;
      if (!racer.oilSticky) {
        racer.facing = racer.oilVelocity < 0 ? -1 : 1;
        racer.fallBackFacing = racer.oilVelocity < 0 ? -1 : 1;
      }
    }
    if (surfing) {
      // The wave carries her forward whatever the stick says.
      racer.facing = 1;
      forward = runSpeed * Math.max(boostMult, SURF_SPEED_SCALE);
    }
    let hopping = false;
    if (frog) {
      // A frog only moves while it hops.
      const previousPhase = racer.frogPhase;
      racer.frogPhase = (racer.frogPhase + dt * FROG_HOP_HZ) % 1;
      hopping = racer.frogPhase < 0.55;
      if (racer.frogPhase < previousPhase && Math.random() < 0.35) sfx("frog_ribbit", racer.x, { gain: 0.6 });
      forward *= hopping ? FROG_SPEED_SCALE : 0;
    }
    if (racer.hitTimer > 0) forward *= 0.35;
    racer.speed = forward;
    if (racer.cloudFalling && !racer.cloudRescued) {
      // Off the edge: no steering, just the speed she ran off with, legs
      // still going.
      forward = cloudFallForward(racer, dt);
      input.horizontal = 0;
      input.vertical = 0;
      if (cloudFallRescue(racer, input.jump)) input.jump = false;
      racer.speed = forward;
    }
    racer.moving = racer.cloudFalling || Math.abs(forward) > 1 || Math.abs(input.vertical) > 0.05;
    if (Math.abs(input.horizontal) > 0.05) {
      racer.facing = input.horizontal < 0 ? -1 : 1;
    }
    if (racer.finished || frog) racer.spellAim = null;
    updateSpellAim(racer, input, dt);
    if (racer.castTimer > 0 && racer.castFacing) racer.facing = racer.castFacing;

    const previousX = racer.x;
    const previousY = racer.y;
    const previousZ = racer.z;
    const normalMoveX = constrainHumanSeparationMove(racer, forward * dt);
    racer.x += normalMoveX + racer.knockbackX * dt;
    updateRacerPowerupEffects(racer, dt);
    if (racer.rideToys.length > 0) {
      racer.toyDistance += Math.abs(normalMoveX);
      const previousHop = Math.abs(Math.sin(racer.pogoPhase));
      racer.pogoPhase = (racer.pogoPhase + dt * POGO_BOUNCE_HZ * Math.PI) % (Math.PI * 2);
      if (racer.rideToys[0].type === "pogo" && racer.z === 0 && !isMounted(racer)
        && previousHop > 0.1 && Math.abs(Math.sin(racer.pogoPhase)) <= 0.1) {
        sfx("pogo_boing", racer.x, { gain: 0.6 });
      }
    }
    racer.x = clamp(racer.x, 40, FINISH);
    if (surfing) {
      // Sluggish steering, and the swell keeps nudging her up and down.
      racer.surfPhase += dt * 1.6;
      racer.surfLaneV += (input.vertical * PLAYER_LANE_SPEED * 0.7 - racer.surfLaneV) * Math.min(1, dt * SURF_LANE_RESPONSE);
      racer.y += (racer.surfLaneV + Math.sin(racer.surfPhase) * SURF_DRIFT) * dt;
    } else {
      racer.y += input.vertical * PLAYER_LANE_SPEED * (frog && !hopping ? 0 : 1) * dt;
    }
    racer.y = clamp(racer.y, TRACK_TOP, TRACK_BOTTOM);
    racer.knockbackX *= Math.pow(0.04, dt);
    if (Math.abs(racer.knockbackX) < 6) racer.knockbackX = 0;

    if (input.jump && (racer.z === 0 || racer.onObstacle) && !racer.jumpStarted && racer.landingTimer === 0) {
      const jumpPower = mounted ? getHorseJumpPower(racer) : getJumpPower(racer);
      racer.onObstacle = false;
      racer.jumpStarted = true;
      racer.jumpFrame = 0;
      racer.vy = jumpPower;
      if (racer.moonBootsTimer > 0) {
        spawnParticles(racer.x, racer.y + 54, 0, 10, { color: "#d9d3e6", kind: "puff", speed: 140, lift: 40, life: 0.8, size: 14, gravity: 0 });
        spawnParticles(racer.x, racer.y + 54, 0, 10, { color: MOON_BOOTS_COLOR, speed: 120, lift: 260, life: 0.7, gravity: 300 });
      } else if (racer.highJumpTimer > 0) {
        spawnParticles(racer.x, racer.y + 54, racer.z, 26, { color: POWERUP_GLOW_COLORS.jump, speed: 210, lift: 420, life: 0.6 });
        spawnParticles(racer.x, racer.y + 54, 0, 1, { color: POWERUP_GLOW_COLORS.jump, kind: "ring", life: 0.35, size: 50, gravity: 0, speed: 0, lift: 0 });
      }
      if (!mounted) {
        const boosted = racer.highJumpTimer > 0;
        racerVoice(racer, boosted ? "jump_big" : "jump", { chance: boosted ? 0.8 : 0.35 });
      }
    }
    updateRacerVerticalMotion(racer, mounted, input.jump, dt);
    if (racer.z > 38 && racer.vy >= 0) racer.jumpFrame = 1;
    if (racer.z > 0 && racer.vy < 0) racer.jumpFrame = racer.z <= LANDING_POSE_DISTANCE ? 2 : 1;
    if (racer.z < 0 && !racer.cloudFalling) {
      const impactSpeed = Math.abs(racer.vy);
      racer.z = 0;
      racer.vy = 0;
      if (racer.jumpStarted) {
        racer.landingTimer = mounted ? 0.16 : UNMOUNTED_LANDING_PAUSE_DURATION;
        if (mounted && racer.horseType === "moon_buggy") racer.roverLandTimer = ROVER_LANDING_TIME;
        if (!mounted) {
          const heavy = impactSpeed > 620;
          if (heavy) racerVoice(racer, "land", { chance: 0.3 });
        }
      }
      racer.jumpStarted = false;
    }
    checkCloudFall(racer);
    updateCloudFall(racer, dt);
    updateCloudFooting(racer, dt);
    racer.landingTimer = Math.max(0, racer.landingTimer - dt);
    racer.roverLandTimer = Math.max(0, (racer.roverLandTimer || 0) - dt);

    resolveObstacleCollisions(racer, previousX, previousY, previousZ);
    pogoStompMonsters(racer, previousZ, mounted);

    for (const powerup of state.powerups) {
      if (powerup.taken) continue;
      if (isPowerupDropping(powerup)) continue;
      if (!canRacerUsePowerups(racer)) continue;
      if (racer.ai && racer.x > getHumanLeadX()) continue;
      const reachX = powerup.loose ? LOOSE_MOUNT_PICKUP_X : 34;
      const close = Math.abs(racer.x - powerup.x) < reachX && Math.abs(racer.y + 54 - powerup.y) < 34 && racer.z < 80;
      if (close) {
        powerup.taken = applyPowerup(racer, powerup);
      }
    }

    if (racer.pushTimer > 0) performPushAttack(racer);

    racer.frameTime += dt * (racer.moving ? 9.5 : 3.2);
    racer.frame = Math.floor(racer.frameTime) % 3;

    if (racer.x >= FINISH) {
      racer.finished = true;
      racer.finishTime = performance.now();
      finishRace(racer);
      break;
    }
  }

  updateMonsters(dt);
  updateStormCloud(dt);
  updateRewardCloud(dt);
  updateProjectiles(dt);
  updateThrownLeftovers(dt);
  updateRainbowBeams(dt);
  updatePowerupDrops(dt);
  updateRunawayHorses(dt);
  updateBeachBalls(dt);
  updateParticles(dt);
  updateSpells(dt);
  updateEmpArcs(dt);
  updateWindupCars(dt);
  bumpMonstersWithSpecialMounts();
  bumpWithSkeletonHorses();
  pushRacers(dt);
  updateAmandaHazards(dt);
  updateAmandaAlly(dt);
  updateRacerCameraVelocities(racerCameraStartPositions, dt);
  updateCamera(dt);
  updateHud();
  updateAudio(dt);
}

function updateRacerCameraVelocities(startPositions, dt) {
  const elapsed = Math.max(dt, 0.0001);
  for (const racer of state.racers) {
    const startX = startPositions.get(racer);
    racer.cameraVelocityX = Number.isFinite(startX) ? (racer.x - startX) / elapsed : racer.speed || 0;
  }
}

function updateStackTimers(racer, dt) {
  racer.speedBoostStacks = racer.speedBoostStacks
    .map(timer => timer - dt)
    .filter(timer => timer > 0);
  racer.highJumpStacks = racer.highJumpStacks
    .map(timer => timer - dt)
    .filter(timer => timer > 0);
  racer.moonBootsTimer = Math.max(0, racer.moonBootsTimer - dt);
  racer.castTimer = Math.max(0, racer.castTimer - dt);
  racer.surfTimer = Math.max(0, racer.surfTimer - dt);
  if (racer.frogTimer > 0) {
    racer.frogTimer = Math.max(0, racer.frogTimer - dt);
    if (racer.frogTimer === 0) frogPoof(racer.x, racer.y + 54, false);
  }
  racer.rideToys = racer.rideToys
    .map(toy => ({ ...toy, timer: toy.timer - dt }))
    .filter(toy => toy.timer > 0);
  racer.speedBoostTimer = racer.speedBoostStacks.length > 0 ? Math.max(...racer.speedBoostStacks) : 0;
  racer.highJumpTimer = racer.highJumpStacks.length > 0 ? Math.max(...racer.highJumpStacks) : 0;
}

function getHumanRacers() {
  return state.racers.filter(racer => !racer.ai && !racer.finished);
}

function getHumanRange(exceptRacer = null, candidateX = 0) {
  const humanRacers = getHumanRacers();
  if (humanRacers.length === 0) return null;
  let min = Infinity;
  let max = -Infinity;
  for (const racer of humanRacers) {
    const x = racer === exceptRacer ? candidateX : racer.x;
    min = Math.min(min, x);
    max = Math.max(max, x);
  }
  return { min, max, span: max - min };
}

function getMaxVisibleHumanSpan() {
  return Math.max(120, getWorldViewportWidth() - RACER_VISIBLE_LEFT_MARGIN - RACER_VISIBLE_RIGHT_MARGIN);
}

function constrainHumanSeparationMove(racer, moveX) {
  if (racer.ai || racer.finished || moveX === 0) return moveX;
  if (state.cameraMode !== "clamp") return moveX;
  const current = getHumanRange();
  if (!current) return moveX;
  const maxSpan = getMaxVisibleHumanSpan();
  const nextX = clamp(racer.x + moveX, 40, FINISH);
  const next = getHumanRange(racer, nextX);
  const isTrailMovingBack = racer.x === current.min && moveX < 0;
  const isLeadMovingAhead = racer.x === current.max && moveX > 0;
  if (!next || next.span <= maxSpan) return moveX;

  if (!isTrailMovingBack && !isLeadMovingAhead) return moveX;

  racer.speed = 0;
  if (current.span >= maxSpan) return 0;
  if (isTrailMovingBack) return Math.max(0, current.max - maxSpan - racer.x);
  return Math.min(0, current.min + maxSpan - racer.x);
}

function getObstacleHitBounds(obstacle) {
  const left = obstacle.x - obstacle.hitW / 2;
  const right = obstacle.x + obstacle.hitW / 2;
  const centerY = obstacle.y + 18;
  const top = centerY - obstacle.hitH / 2;
  const bottom = centerY + obstacle.hitH / 2;
  return { left, right, top, bottom };
}

function resolveObstacleCollisions(racer, previousX, previousY, previousZ) {
  if (racer.surfTimer > 0 && !isMounted(racer)) {
    surfKnockMonsters(racer);
    racer.onObstacle = false;
    return; // the wave washes over hurdles
  }
  racer.onObstacle = false;
  for (const obstacle of state.obstacles) {
    const bounds = getObstacleHitBounds(obstacle);
    const previousFootLeft = previousX - PLAYER_FOOT_W / 2;
    const previousFootRight = previousX + PLAYER_FOOT_W / 2;
    const previousFootTop = previousY + 54 - PLAYER_FOOT_H / 2;
    const previousFootBottom = previousY + 54 + PLAYER_FOOT_H / 2;
    const footLeft = racer.x - PLAYER_FOOT_W / 2;
    const footRight = racer.x + PLAYER_FOOT_W / 2;
    const footTop = racer.y + 54 - PLAYER_FOOT_H / 2;
    const footBottom = racer.y + 54 + PLAYER_FOOT_H / 2;
    const footOverlapsX = footRight > bounds.left && footLeft < bounds.right;
    const footOverlapsY = footBottom > bounds.top && footTop < bounds.bottom;
    const landedOnTop = footOverlapsX && footOverlapsY && previousZ >= hurdleTopZ() && racer.z <= hurdleTopZ() && racer.vy <= 0;
    if (landedOnTop) {
      racer.z = hurdleTopZ();
      racer.vy = 0;
      racer.jumpStarted = false;
      racer.landingTimer = 0;
      racer.onObstacle = true;
      continue;
    }

    const groundedHit = footOverlapsY && racer.z < hurdleTopZ();
    const crossedFromLeft = previousFootRight <= bounds.left && footRight > bounds.left;
    const crossedFromRight = previousFootLeft >= bounds.right && footLeft < bounds.right;
    const crossedFromAbove = previousFootBottom <= bounds.top && footBottom > bounds.top;
    const crossedFromBelow = previousFootTop >= bounds.bottom && footTop < bounds.bottom;
    if (groundedHit && crossedFromLeft) {
      racer.x = bounds.left - PLAYER_FOOT_W / 2;
      racer.speed = 0;
    } else if (groundedHit && crossedFromRight) {
      racer.x = bounds.right + PLAYER_FOOT_W / 2;
      racer.speed = 0;
    } else if (footOverlapsX && racer.z < hurdleTopZ() && crossedFromAbove) {
      racer.y = bounds.top - 54 - PLAYER_FOOT_H / 2;
    } else if (footOverlapsX && racer.z < hurdleTopZ() && crossedFromBelow) {
      racer.y = bounds.bottom - 54 + PLAYER_FOOT_H / 2;
    }
  }
}

function performPushAttack(attacker) {
  // Riders push only where everyone rides (the Horse Show); a horse reaches further.
  const ridingPush = isMounted(attacker) && isAlwaysMountedTrack();
  if (isMounted(attacker) && !ridingPush) return;
  const reach = ridingPush ? PUSH_RANGE_X + MOUNTED_PUSH_EXTRA_RANGE : PUSH_RANGE_X;
  for (const other of state.racers) {
    if (other === attacker || other.finished || (isMounted(other) && !ridingPush) || attacker.pushedTargets.has(other)) continue;
    const dx = other.x - attacker.x;
    const dy = (other.y + 54) - (attacker.y + 54);
    const inFront = attacker.facing > 0 ? dx > 2 && dx < reach : dx < -2 && dx > -reach;
    if (!inFront || Math.abs(dy) > PUSH_RANGE_Y || Math.max(attacker.z, other.z) > 64) continue;
    applyPushHit(attacker, other, attacker.facing);
    attacker.pushedTargets.add(other);
  }
  const amanda = amandaAt(attacker.x + attacker.facing * reach * 0.6, attacker.y + 54, reach * 0.6 + AMANDA_HIT_RANGE_X);
  if (amanda && !attacker.pushedTargets.has(amanda) && attacker.z <= 64 && (amanda.x - attacker.x) * attacker.facing > -10) {
    hitAmanda(amanda, attacker.facing);
    attacker.pushedTargets.add(amanda);
  }
  const ally = state.amandaAlly;
  if (ally && !attacker.pushedTargets.has(ally)) {
    const dx = ally.x - attacker.x;
    const inFront = attacker.facing > 0 ? dx > 2 && dx < reach : dx < -2 && dx > -reach;
    if (inFront && Math.abs(ally.y - attacker.y) <= PUSH_RANGE_Y && Math.max(attacker.z, ally.z) <= 64) {
      pushAmandaAlly(ally, attacker, attacker.facing);
      attacker.pushedTargets.add(ally);
    }
  }
  for (const ball of state.beachBalls) {
    const dx = ball.x - attacker.x;
    const dy = ball.y - (attacker.y + 54);
    const inFront = attacker.facing > 0 ? dx > -10 && dx < reach + 30 : dx < 10 && dx > -reach - 30;
    if (!inFront || Math.abs(dy) > PUSH_RANGE_Y + 10 || attacker.pushedTargets.has(ball)) continue;
    kickBeachBall(ball, attacker.facing, dy);
    attacker.pushedTargets.add(ball);
  }
  for (const monster of state.monsters) {
    if (monster.state === "sleeping" || monster.state === "ground" || attacker.pushedTargets.has(monster)) continue;
    const dx = monster.x - attacker.x;
    const dy = (monster.y + 54) - (attacker.y + 54);
    const inFront = attacker.facing > 0 ? dx > 2 && dx < reach + 28 : dx < -2 && dx > -reach - 28;
    if (!inFront || Math.abs(dy) > PUSH_RANGE_Y + 18 || attacker.z > 64) continue;
    applyMonsterKnockback(monster, attacker.facing, { unhorse: true });
    attacker.pushedTargets.add(monster);
  }
}

function racerDepthScale(racer) {
  return 0.39 + ((racer.y - DEPTH_SCALE_TOP_Y) / (DEPTH_SCALE_BOTTOM_Y - DEPTH_SCALE_TOP_Y)) * 0.12;
}

// The throwing hand's world position for her current pose, from hands.js
// (tools/dolls/measure_hands.py), or null when it hasn't been measured.
function getThrowHand(racer) {
  const hands = window.DOLL_HANDS?.[dollAssetKey(racer.spriteKey)];
  if (!hands) return null;
  const scale = racerDepthScale(racer);
  const facing = racer.facing || 1;
  if (isMounted(racer) && racer.horseType !== "broom" && hands.ride) {
    const horseScale = scale * 1.08;
    const horseRow = racer.pegasusGliding ? 1 : isDrawnJumping(racer) ? 2 : racer.moving ? 1 : 0;
    const horseCol = racer.pegasusGliding || !isDrawnJumping(racer) ? racer.frame : racer.jumpFrame;
    const calibration = getMountFrameCalibration(racer.horseType, horseRow, horseCol);
    const riderScale = scale * 0.7;
    const horseBaseY = racer.y + 58 - SPRITE_ANCHOR_Y * horseScale - racer.z;
    const offsetX = -SPRITE_ANCHOR_X * riderScale + (9 + racer.riderXOffset) * scale
      + (calibration.seatX - MOUNT_SEAT_REFERENCE.x) * horseScale + hands.ride[0] * riderScale;
    const riderY = horseBaseY - 60 * scale + racer.riderYOffset * scale + (calibration.seatY - MOUNT_SEAT_REFERENCE.y) * horseScale;
    return { x: racer.x + facing * offsetX, y: riderY + hands.ride[1] * riderScale };
  }
  const toy = racer.rideToys?.[0]?.type;
  const toyHand = toy && getRideToySheet(racer) && !isMounted(racer) ? hands[toy === "skates" ? "skate" : "pogo"] : null;
  if (toyHand) {
    const frame = toy === "skates" ? 4 : 10; // the push cell of each toy
    const calibration = window.RIDE_TOY_FRAMES?.[dollAssetKey(racer.spriteKey)];
    const toyScale = scale * (calibration?.scale[frame] || 1);
    const anchorX = calibration?.anchorX[frame] || SPRITE_ANCHOR_X;
    return {
      x: racer.x + facing * (toyHand[0] - anchorX) * toyScale,
      y: racer.y + 54 - racer.z - (SPRITE_ANCHOR_Y - toyHand[1]) * toyScale
    };
  }
  return {
    x: racer.x + facing * (hands.stand[0] - SPRITE_ANCHOR_X) * scale,
    y: racer.y + 54 - racer.z - (SPRITE_ANCHOR_Y - hands.stand[1]) * scale
  };
}

function snowballDrawY(racer) {
  return racer.y + 54 - SNOWBALL_HAND_DRAW_Y_OFFSET * racerDepthScale(racer);
}

function applyPushHit(attacker, target, direction) {
  racerVoice(target, "hit", { chance: 0.75, priority: 1 });
  racerVoice(attacker, "taunt", { chance: 0.25 });
  target.grabbedBy = null;
  target.fallBackTimer = 0.55;
  target.fallBackFacing = attacker.x < target.x ? -1 : 1;
  target.hitTimer = 0.25;
  target.knockbackX = direction * PUSH_FORCE;
  target.vy = Math.max(target.vy, 160);
  target.jumpStarted = false;
}

function pushRacers(dt) {
  const racers = state.racers.filter(r => !r.finished && !isMounted(r) && !r.grabbedBy);
  for (let i = 0; i < racers.length; i += 1) {
    for (let j = i + 1; j < racers.length; j += 1) {
      const a = racers[i];
      const b = racers[j];
      const dx = b.x - a.x;
      const dy = (b.y + 54) - (a.y + 54);
      const minX = 48;
      const minY = 26;
      if (Math.abs(dx) >= minX || Math.abs(dy) >= minY) continue;
      const overlapX = minX - Math.abs(dx);
      const overlapY = minY - Math.abs(dy);
      const motion = Math.min(1.8, (Math.abs(a.speed) + Math.abs(b.speed) + Math.abs(a.y - b.y) / Math.max(dt, 0.016)) / 520);
      if (overlapX < overlapY) {
        const push = (overlapX / 2) * (0.75 + motion);
        const dir = dx >= 0 ? 1 : -1;
        a.x -= push * dir;
        b.x += push * dir;
      } else {
        const push = (overlapY / 2) * (0.75 + motion);
        const dir = dy >= 0 ? 1 : -1;
        a.y -= push * dir;
        b.y += push * dir;
      }
      a.x = clamp(a.x, 40, FINISH);
      b.x = clamp(b.x, 40, FINISH);
      a.y = clamp(a.y, TRACK_TOP, TRACK_BOTTOM);
      b.y = clamp(b.y, TRACK_TOP, TRACK_BOTTOM);
    }
  }
}

/* ── Players: bindings, drop-in join and leave ───────────────────────────────
 * Each human racer has a slot (racer.playerIndex, 0..7). A slot is bound to a
 * controller (state.slotPads holds its Gamepad.index) and/or a keyboard scheme
 * (state.slotKeys). Connected controllers are handed to slots that have none,
 * lowest slot first, which reproduces the old "controller N drives player N"
 * behaviour. A controller left over once every slot has one is a spare:
 * pressing A (or B/X/Y/Start) on it opens a join card where that player picks
 * a doll. On the menu the pick adds a player to the mode; mid-race the new
 * racer is dropped in at the back of the pack without pausing anyone else.
 * Holding Back/View for 1.5s (or unplugging for 5s) makes a player leave.
 * ---------------------------------------------------------------------------*/

function updateHud() {
  const racers = getHudRacers();
  for (let index = 0; index < playerStatuses.length; index += 1) {
    const racer = racers[index];
    if (!playerStatuses[index]) continue;
    if (!racer) {
      playerStatuses[index].textContent = "";
      continue;
    }
    const leaving = getLeaveHoldProgress(racer.playerIndex);
    const place = getRaceOrder().indexOf(racer) + 1;
    let text;
    if (state.done) text = racer === state.winner ? "Winner! 🏆" : `${ordinal(place)} place`;
    else if (leaving > 0) text = `Leaving ${Math.round(leaving * 100)}%`;
    else {
      const status = racerStatus(racer);
      text = status === "Racing" ? ordinal(place) : `${ordinal(place)} · ${status}`;
    }
    playerStatuses[index].textContent = text;
  }
}

function racerStatus(racer) {
  if (racer.oilTimer > 0) return `Oil ${Math.ceil(racer.oilTimer)}s`;
  if (isMounted(racer) && racer.horseType !== "horse") {
    const duration = Number.isFinite(racer.horseTimer) ? ` ${Math.ceil(racer.horseTimer)}s` : "";
    return `${racer.horseType[0].toUpperCase()}${racer.horseType.slice(1)}${duration}`;
  }
  if (isMounted(racer)) {
    const duration = Number.isFinite(racer.horseTimer) ? ` ${Math.ceil(racer.horseTimer)}s` : "";
    return `Horse${duration}`;
  }
  if (racer.snowballs > 0) return `Snowballs ${racer.snowballs}`;
  if (racer.speedBoostTimer > 0 && racer.highJumpTimer > 0) return `Boost x${racer.speedBoostStacks.length} + Jump x${racer.highJumpStacks.length}`;
  if (racer.speedBoostTimer > 0) return `Boost x${racer.speedBoostStacks.length} ${Math.ceil(racer.speedBoostTimer)}s`;
  if (racer.highJumpTimer > 0) return `Jump x${racer.highJumpStacks.length} ${Math.ceil(racer.highJumpTimer)}s`;
  if (racer.fallBackTimer > 0) return "Falling";
  if (racer.pushTimer > 0) return "Pushing";
  if (racer.hitTimer > 0) return "Recovering";
  return "Racing";
}

const legoCrossfadeCanvas = document.createElement("canvas");

// Height of the hurdle's top above its ground line (obstacle.y + 18), read
// from the art's opaque pixels as drawn in drawObstacle's 64×68 box.
function hurdleTopZ() {
  const art = getTrackArt("hurdle");
  if (!art) return HURDLE_TOP_Z;
  if (art.hurdleTopZ === undefined) {
    art.hurdleTopZ = HURDLE_TOP_Z;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 68;
      const g = canvas.getContext("2d", { willReadFrequently: true });
      g.drawImage(art, 0, 0, 64, 68);
      const alpha = g.getImageData(0, 0, 64, 68).data;
      for (let row = 0; row < 68; row += 1) {
        let solid = 0;
        for (let col = 0; col < 64; col += 1) if (alpha[(row * 64 + col) * 4 + 3] > 40) solid += 1;
        // The first row with real substance, not a stray antialiased pixel.
        if (solid >= 3) {
          art.hurdleTopZ = 60 - row;
          break;
        }
      }
    } catch (error) {
      // file:// pages can't read pixels; keep the picket height.
    }
  }
  return art.hurdleTopZ;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

window.addEventListener("keydown", event => {
  if (event.code === "Escape") {
    event.preventDefault();
    togglePause();
    return;
  }
  keys.add(event.code);
  if (!event.repeat) keysTapped.add(event.code);
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "ShiftLeft", "ShiftRight"].includes(event.code)) {
    event.preventDefault();
  }
});

window.addEventListener("keyup", event => keys.delete(event.code));
// A key held while the window loses focus never gets its keyup, so the racer
// would keep running; forget everything that was held.
window.addEventListener("blur", () => {
  keys.clear();
  clearTouchInput();
});
// Pause when the tab or iPad app is hidden, so the race doesn't carry on (and
// the music doesn't keep playing) while nobody is watching.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) return;
  keys.clear();
  clearTouchInput();
  if (state.running && !state.paused && !state.done) {
    togglePause();
    // The pause fade runs on requestAnimationFrame, which stops in hidden tabs.
    music.pause();
  }
});
window.addEventListener("resize", resizeCanvasToFrame);
window.visualViewport?.addEventListener("resize", resizeCanvasToFrame);
gameFrame.addEventListener("pointerdown", event => {
  if (!isTouchDevice() || !state.running || state.paused || state.done) return;
  if (touchInput.movePointerId !== null || isInteractiveTouchTarget(event.target)) return;
  event.preventDefault();
  gameFrame.setPointerCapture?.(event.pointerId);
  touchInput.movePointerId = event.pointerId;
  touchInput.startX = event.clientX;
  touchInput.startY = event.clientY;
  updateTouchMove(event);
});
gameFrame.addEventListener("pointermove", event => {
  if (!isTouchDevice() || event.pointerId !== touchInput.movePointerId) return;
  event.preventDefault();
  updateTouchMove(event);
});
gameFrame.addEventListener("pointerup", event => {
  if (!isTouchDevice()) return;
  event.preventDefault();
  clearTouchMove(event.pointerId);
});
gameFrame.addEventListener("pointercancel", event => {
  if (!isTouchDevice()) return;
  event.preventDefault();
  clearTouchMove(event.pointerId);
});
bindTouchActionButton(touchJumpButton, "jump");
bindTouchActionButton(touchPushButton, "push");
touchPauseButton.addEventListener("pointerdown", event => {
  if (!isTouchDevice()) return;
  event.preventDefault();
  clearTouchInput();
  togglePause();
});
mobileQuery.addEventListener?.("change", () => {
  clearTouchInput();
  updateMobileModeAvailability();
  updateModeLabels();
});
window.addEventListener("gamepadconnected", () => {
  updateMobileModeAvailability();
  updateModeLabels();
  if (!state.running || state.paused) startMenuAnimationLoop();
});
window.addEventListener("gamepaddisconnected", () => {
  updateMobileModeAvailability();
  updateModeLabels();
  if (!state.running || state.paused) startMenuAnimationLoop();
});
gameMode.addEventListener("change", () => {
  updateMobileModeAvailability();
  state.mode = gameMode.value;
  updateModeLabels();
});
for (const background of BACKGROUNDS) {
  if (backgroundSelect.querySelector(`option[value="${background.key}"]`)) continue;
  backgroundSelect.append(new Option(background.name, background.key));
}
backgroundSelect.addEventListener("change", () => setBackground(backgroundSelect.value));
settingsButton.addEventListener("click", toggleSettingsPanel);
difficultySelect.addEventListener("change", () => setDifficulty(difficultySelect.value));
specialsSelect.addEventListener("change", () => setSpecials(specialsSelect.value));
startButton.addEventListener("click", () => {
  if (assetsFailed) {
    window.location.reload();
    return;
  }
  if (assetsReady) startRace(gameMode.value);
});
fullscreenButton.addEventListener("click", toggleFullscreen);

// Menu chrome: the first click also unlocks audio, since browsers block
// playback until a trusted gesture.
for (const button of document.querySelectorAll("button")) {
  button.addEventListener("click", () => {
    GameAudio.unlock();
    if (button !== startButton) GameAudio.play("ui_click");
  });
}
for (const select of [...characterSelects, gameMode, difficultySelect, specialsSelect]) {
  select?.addEventListener("change", () => {
    GameAudio.unlock();
    GameAudio.play("ui_select_character");
  });
}
fullscreenButton.addEventListener("click", () => GameAudio.play("ui_fullscreen"));

restartButton.addEventListener("click", () => {
  clearNextRaceTimer();
  advanceBackground();
  startRace(state.mode);
});
resumeButton.addEventListener("click", togglePause);
pauseSoundButton.addEventListener("click", () => {
  GameAudio.setMuted(!GameAudio.isMuted);
  if (!GameAudio.isMuted) GameAudio.play("ui_click");
  updatePauseCorner();
});
pauseSettingsButton.addEventListener("click", () => {
  GameAudio.play("ui_click");
  openPauseSettings(pauseSettings.classList.contains("hidden"));
});
pauseFullscreenButton.addEventListener("click", () => {
  GameAudio.play("ui_fullscreen");
  toggleFullscreen().then(updatePauseCorner);
});
document.querySelector("#pauseSettingsDone").addEventListener("click", () => openPauseSettings(false));
for (const slider of pauseSettings.querySelectorAll("input[type=range]")) {
  slider.addEventListener("input", () => {
    GameAudio.setVolume(slider.dataset.bus, Number(slider.value) / 100 * PAUSE_SLIDER_SCALE[slider.dataset.bus]);
  });
  slider.addEventListener("change", () => GameAudio.play("ui_hover"));
}
document.addEventListener("fullscreenchange", updatePauseCorner);
document.addEventListener("webkitfullscreenchange", updatePauseCorner);
menuButton.addEventListener("click", returnToMenu);

updateCharacterSelectOptions();
waitForAssets();
