/**
 * @mikesaintsg/actionloop
 *
 * Constants for ActionLoop.
 */

// ============================================================================
// Actor Constants
// ============================================================================

/** Valid actor types */
export const VALID_ACTORS = new Set<string>(['user', 'system', 'automation'])

// ============================================================================
// Default Values
// ============================================================================

/** Default session timeout in milliseconds (30 minutes) */
export const DEFAULT_SESSION_TIMEOUT_MS = 1800000

/** Default decay factor for EWMA algorithm */
export const DEFAULT_DECAY_FACTOR = 0.9

/** Default minimum weight threshold */
export const DEFAULT_MIN_WEIGHT = 0.001

/** Default half-life for halflife decay algorithm (24 hours) */
export const DEFAULT_HALF_LIFE_MS = 86400000

/** Default prediction count */
export const DEFAULT_PREDICTION_COUNT = 5

/** Default max events per session */
export const DEFAULT_MAX_EVENTS = 50

/** Default max sequence length for automation discovery */
export const DEFAULT_MAX_SEQUENCE_LENGTH = 10

/** Default min sequence length for automation discovery */
export const DEFAULT_MIN_SEQUENCE_LENGTH = 2

/** Default min repetitions for automation discovery */
export const DEFAULT_MIN_REPETITIONS = 5

/** Default traffic threshold for bottleneck detection */
export const DEFAULT_TRAFFIC_THRESHOLD = 10

/** Default delay threshold for bottleneck detection (5 seconds) */
export const DEFAULT_DELAY_THRESHOLD_MS = 5000

/** Default hot loop threshold */
export const DEFAULT_HOT_LOOP_THRESHOLD = 5

// ============================================================================
// Activity Tracker Constants
// ============================================================================

/** Default idle threshold in milliseconds (30 seconds) */
export const DEFAULT_IDLE_THRESHOLD_MS = 30000

/** Default away threshold in milliseconds (5 minutes) */
export const DEFAULT_AWAY_THRESHOLD_MS = 300000

/** Engagement score weights for calculating overall score */
export const ENGAGEMENT_SCORE_WEIGHTS = {
	active: 1.0,
	idle: 0.3,
	away: 0.0,
} as const

// ============================================================================
// Context Formatter Constants
// ============================================================================

/** Default maximum recent events to include in context */
export const DEFAULT_MAX_RECENT_EVENTS = 10

/** Default top predictions to include in formatted context */
export const DEFAULT_TOP_PREDICTIONS = 5

// ============================================================================
// Export Version
// ============================================================================

/** Current export format version */
export const EXPORT_VERSION = 1
