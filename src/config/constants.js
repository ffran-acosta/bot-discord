export const DISCONNECT_TIMEOUT_MS = 3_600_000;
export const EMPTY_CHANNEL_TIMEOUT_MS = 3_600_000;
export const NOW_PLAYING_REFRESH_MS = 5_000;
export const QUEUE_PAGE_SIZE = 10;
export const QUEUE_COLLECTOR_TIMEOUT_MS = 120_000;
export const MAX_PLAYLIST_TRACKS = 200;
export const AUTOPLAY_HISTORY_SIZE = 10;
export const PROGRESS_BAR_WIDTH = 14;
/** Guardado periódico de colas (para no perderlas ante un crash). */
export const QUEUE_SAVE_INTERVAL_MS = 60_000;

export const RETRY_DELAY_MS = 800;
export const PLAY_START_DELAY_MS = 400;
export const AUTOPLAY_DELAY_MS = 300;
export const BOT_KICK_GRACE_MS = 3_000;
export const NODE_RETRY_DELAY_MS = 500;
/** Espera a Lavalink antes de rejoin tras restart (Discord ready suele llegar antes que los nodos). */
export const LAVALINK_RESTORE_WAIT_MS = 45_000;
export const LAVALINK_RESTORE_POLL_MS = 400;
/** Espera en /play si el pool está vacío o reconectando. */
export const LAVALINK_PLAY_WAIT_MS = 20_000;
export const PREVIOUS_RESTART_THRESHOLD_MS = 3_000;

/** Timeout del fetch a la API pública de nodos. */
export const LAVALINK_API_TIMEOUT_MS = 8_000;
export const LAVALINK_RECONNECT_TRIES = 6;
export const LAVALINK_RECONNECT_INTERVAL_MS = 15_000;
export const LAVALINK_REST_TIMEOUT_MS = 20_000;

/** Mantenimiento del pool de nodos (lavalinkPool). */
export const LAVALINK_POOL_REFRESH_MS = 3_600_000;
export const LAVALINK_POOL_EMERGENCY_COOLDOWN_MS = 300_000;
export const LAVALINK_POOL_EMERGENCY_DEBOUNCE_MS = 2_500;
export const LAVALINK_POOL_WATCHDOG_MS = 300_000;
export const LAVALINK_POOL_FLAP_WINDOW_MS = 90_000;
export const LAVALINK_POOL_FLAP_CLOSES_THRESHOLD = 5;
