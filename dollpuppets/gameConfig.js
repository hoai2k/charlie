const GAME_CONFIG = {
  enable_hand_tracking: true,
  enable_laughter_detection: true,
  enable_tongue_out_detection: true,
  enable_tongue_color_detection: true,
  enable_tongue_blendshape_detection: false,
  enable_kiss_gesture: true,
  // Tuned from local debug captures: a real tongue-out scored about 0.61 color ratio,
  // while open/puckered false positives were rejected by the open, pucker, smile, and dark-mouth guards below.
  tongue_out_threshold: 0.55,
  tongue_out_release_threshold: 0.32,
  // Tongue-out is an intentional expression, so require a visible hold instead of a transient color hit.
  tongue_out_hold_ms: 700,
  tongue_color_min_mouth_open: 0.2,
  // Real tongue-out lowered both lower-lip blendshapes around 0.60; the false-positive set stayed below 0.42.
  tongue_color_min_lower_down: 0.45,
  tongue_color_max_pucker: 0.24,
  tongue_color_max_smile: 0.2,
  // Neutral open-mouth false positives showed a dark mouth cavity around 0.13; real tongue-out was near 0.02.
  tongue_color_max_dark_ratio: 0.08,
  tongue_color_min_ratio: 0.12,
  tongue_color_target_ratio: 0.32,
  kiss_particle_hold_ms: 500,
  // Kiss particles should come from a deliberate pucker, not the quick pucker/open shapes that happen during speech.
  kiss_pucker_threshold: 0.62,
  kiss_max_mouth_open: 0.22,
  kiss_max_lower_down: 0.18,
  kiss_max_smile: 0.18,
  kiss_max_stretch: 0.18,
  kiss_min_pucker_dominance: 0.26,
  kiss_particle_fast_open_hold_ms: 650,
  kiss_particle_fast_open_threshold: 0.58,
  kiss_bubble_hold_ms: 1000,
  kiss_particle_spread: 1.6,
  kiss_bubble_target_head_size: 0.5,
  kiss_bubble_slow_growth_per_second: 0.045,
  kiss_bubble_pop_mouth_ms: 500,
  hand_pose_action_hold_ms: 1000,
  hand_pose_heart_start_head_size: 0.33,
  hand_pose_heart_end_head_size: 1,
  hand_pose_heart_duration_ms: 1000
};

export default GAME_CONFIG;
