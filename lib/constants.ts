// client/lib/constants.ts

export const WS_PORT = 8765;
export const HTTP_PORT = 8766;

export const BASE_DELAY = 1000;
export const MAX_DELAY = 15000;
export const MAX_RETRIES = 10;

export const SENSITIVITY_MIN = 0.5;
export const SENSITIVITY_MAX = 3.0;
export const SENSITIVITY_DEFAULT = 1.5;

export type MediaAction = "play_pause" | "next" | "prev" | "vol_up" | "vol_down" | "mute";
export type GestureName = "swipe_left" | "swipe_right" | "swipe_up" | "swipe_down" | "pinch_in" | "pinch_out";
