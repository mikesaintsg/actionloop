/**
 * @mikesaintsg/actionloop
 *
 * Activity Tracker implementation for engagement-aware dwell time tracking.
 */

import type {
	Unsubscribe,
	ActivityTrackerInterface,
	ActivityTrackerOptions,
	DwellRecord,
	EngagementState,
	PartialDwellRecord,
} from '@mikesaintsg/core'

import { now } from '../helpers.js'
import {
	DEFAULT_IDLE_THRESHOLD_MS,
	DEFAULT_AWAY_THRESHOLD_MS,
	ENGAGEMENT_SCORE_WEIGHTS,
} from '../constants.js'

// ============================================================================
// ActivityTracker Implementation
// ============================================================================

/**
 * ActivityTracker tracks user engagement and dwell time per node.
 *
 * Uses browser APIs to detect:
 * - Pointer/keyboard activity for idle detection
 * - Document visibility for away detection
 * - Time spent on each node with active/idle breakdown
 */
class ActivityTracker implements ActivityTrackerInterface {
	// Configuration
	readonly #idleThreshold: number
	readonly #awayThreshold: number
	readonly #trackVisibility: boolean

	// State
	#currentNodeId: string | undefined
	#enterTime = 0
	#activeTime = 0
	#idleTime = 0
	#lastActivityTime = 0
	#engagement: EngagementState = 'unknown'
	#dwellHistory: DwellRecord[] = []

	// Listeners
	readonly #engagementListeners = new Set<(state: EngagementState, nodeId: string) => void>()
	readonly #dwellListeners = new Set<(record: DwellRecord) => void>()

	// Timer
	#idleTimer: ReturnType<typeof setTimeout> | undefined
	#activityCheckInterval: ReturnType<typeof setInterval> | undefined

	// Bound handlers for cleanup
	#handleActivity: () => void
	#handleVisibility: () => void

	constructor(options?: ActivityTrackerOptions) {
		this.#idleThreshold = options?.idleThreshold ?? DEFAULT_IDLE_THRESHOLD_MS
		this.#awayThreshold = options?.awayThreshold ?? DEFAULT_AWAY_THRESHOLD_MS
		this.#trackVisibility = options?.trackVisibility ?? true

		// Bind handlers
		this.#handleActivity = this.#onActivity.bind(this)
		this.#handleVisibility = this.#onVisibilityChange.bind(this)

		// Register hook callbacks from options
		if (options?.onEngagementChange) {
			this.#engagementListeners.add(options.onEngagementChange)
		}
		if (options?.onDwellComplete) {
			this.#dwellListeners.add(options.onDwellComplete)
		}

		// Setup event listeners if in browser
		if (typeof window !== 'undefined') {
			this.#setupEventListeners()
		}
	}

	// ============================================================================
	// Subscription Methods
	// ============================================================================

	onEngagementChange(callback: (state: EngagementState, nodeId: string) => void): Unsubscribe {
		this.#engagementListeners.add(callback)
		return () => this.#engagementListeners.delete(callback)
	}

	onDwellComplete(callback: (record: DwellRecord) => void): Unsubscribe {
		this.#dwellListeners.add(callback)
		return () => this.#dwellListeners.delete(callback)
	}

	// ============================================================================
	// Node Tracking Methods
	// ============================================================================

	enterNode(nodeId: string): void {
		// Exit current node if any
		if (this.#currentNodeId) {
			this.exitNode()
		}

		const timestamp = now()
		this.#currentNodeId = nodeId
		this.#enterTime = timestamp
		this.#activeTime = 0
		this.#idleTime = 0
		this.#lastActivityTime = timestamp
		this.#setEngagement('active')
		this.#resetIdleTimer()
	}

	exitNode(): DwellRecord | undefined {
		if (!this.#currentNodeId) {
			return undefined
		}

		const exitTime = now()

		// Account for final time period
		const timeSinceLastActivity = exitTime - this.#lastActivityTime
		if (this.#engagement === 'active') {
			this.#activeTime += timeSinceLastActivity
		} else {
			this.#idleTime += timeSinceLastActivity
		}

		const record: DwellRecord = {
			nodeId: this.#currentNodeId,
			enterTime: this.#enterTime,
			exitTime,
			activeTime: this.#activeTime,
			idleTime: this.#idleTime,
			engagement: this.#calculateOverallEngagement(),
			engagementScore: this.#calculateEngagementScore(),
		}

		this.#dwellHistory.push(record)
		this.#notifyDwellComplete(record)

		// Reset state
		this.#currentNodeId = undefined
		this.#clearIdleTimer()

		return record
	}

	// ============================================================================
	// Accessor Methods
	// ============================================================================

	getEngagementState(): EngagementState {
		return this.#engagement
	}

	getCurrentNodeId(): string | undefined {
		return this.#currentNodeId
	}

	getCurrentDwell(): PartialDwellRecord | undefined {
		if (!this.#currentNodeId) {
			return undefined
		}

		const currentTime = now()
		const timeSinceLastActivity = currentTime - this.#lastActivityTime
		let activeTime = this.#activeTime
		let idleTime = this.#idleTime

		if (this.#engagement === 'active') {
			activeTime += timeSinceLastActivity
		} else {
			idleTime += timeSinceLastActivity
		}

		return {
			nodeId: this.#currentNodeId,
			enterTime: this.#enterTime,
			activeTime,
			idleTime,
			engagement: this.#engagement,
		}
	}

	getDwellHistory(): readonly DwellRecord[] {
		return [...this.#dwellHistory]
	}

	getTotalActiveTime(): number {
		return this.#dwellHistory.reduce((sum, r) => sum + r.activeTime, 0)
	}

	getTotalIdleTime(): number {
		return this.#dwellHistory.reduce((sum, r) => sum + r.idleTime, 0)
	}

	clearHistory(): void {
		this.#dwellHistory = []
	}

	// ============================================================================
	// Lifecycle Methods
	// ============================================================================

	destroy(): void {
		// Exit current node to finalize dwell record
		if (this.#currentNodeId) {
			this.exitNode()
		}

		// Clear timers
		this.#clearIdleTimer()
		if (this.#activityCheckInterval) {
			clearInterval(this.#activityCheckInterval)
		}

		// Remove event listeners
		if (typeof window !== 'undefined') {
			this.#removeEventListeners()
		}

		// Clear listeners
		this.#engagementListeners.clear()
		this.#dwellListeners.clear()
	}

	// ============================================================================
	// Private Methods
	// ============================================================================

	#setupEventListeners(): void {
		// Activity events
		window.addEventListener('pointermove', this.#handleActivity, { passive: true })
		window.addEventListener('pointerdown', this.#handleActivity, { passive: true })
		window.addEventListener('keydown', this.#handleActivity, { passive: true })
		window.addEventListener('scroll', this.#handleActivity, { passive: true })

		// Visibility events
		if (this.#trackVisibility) {
			document.addEventListener('visibilitychange', this.#handleVisibility)
		}
	}

	#removeEventListeners(): void {
		window.removeEventListener('pointermove', this.#handleActivity)
		window.removeEventListener('pointerdown', this.#handleActivity)
		window.removeEventListener('keydown', this.#handleActivity)
		window.removeEventListener('scroll', this.#handleActivity)

		if (this.#trackVisibility) {
			document.removeEventListener('visibilitychange', this.#handleVisibility)
		}
	}

	#onActivity(): void {
		if (!this.#currentNodeId) return

		const timestamp = now()
		const timeSinceLastActivity = timestamp - this.#lastActivityTime

		// Account for time since last activity based on previous state
		if (this.#engagement === 'active') {
			this.#activeTime += timeSinceLastActivity
		} else {
			this.#idleTime += timeSinceLastActivity
		}

		this.#lastActivityTime = timestamp

		// Transition to active if not already
		if (this.#engagement !== 'active') {
			this.#setEngagement('active')
		}

		this.#resetIdleTimer()
	}

	#onVisibilityChange(): void {
		if (!this.#currentNodeId) return

		if (typeof document !== 'undefined') {
			if (document.visibilityState === 'hidden') {
				this.#onBecameAway()
			} else {
				this.#onActivity()
			}
		}
	}

	#onBecameIdle(): void {
		if (!this.#currentNodeId) return

		const timestamp = now()
		const timeSinceLastActivity = timestamp - this.#lastActivityTime

		if (this.#engagement === 'active') {
			this.#activeTime += timeSinceLastActivity
		}

		this.#lastActivityTime = timestamp
		this.#setEngagement('idle')

		// Set timer to transition to away
		this.#idleTimer = setTimeout(() => {
			this.#onBecameAway()
		}, this.#awayThreshold - this.#idleThreshold)
	}

	#onBecameAway(): void {
		if (!this.#currentNodeId) return

		const timestamp = now()
		const timeSinceLastActivity = timestamp - this.#lastActivityTime

		if (this.#engagement === 'idle') {
			this.#idleTime += timeSinceLastActivity
		} else if (this.#engagement === 'active') {
			this.#activeTime += timeSinceLastActivity
		}

		this.#lastActivityTime = timestamp
		this.#setEngagement('away')
		this.#clearIdleTimer()
	}

	#setEngagement(state: EngagementState): void {
		if (state !== this.#engagement && this.#currentNodeId) {
			this.#engagement = state
			this.#notifyEngagementChange(state, this.#currentNodeId)
		}
	}

	#resetIdleTimer(): void {
		this.#clearIdleTimer()
		this.#idleTimer = setTimeout(() => {
			this.#onBecameIdle()
		}, this.#idleThreshold)
	}

	#clearIdleTimer(): void {
		if (this.#idleTimer) {
			clearTimeout(this.#idleTimer)
			this.#idleTimer = undefined
		}
	}

	#calculateOverallEngagement(): EngagementState {
		const total = this.#activeTime + this.#idleTime
		if (total === 0) return 'unknown'

		const activeRatio = this.#activeTime / total
		if (activeRatio >= 0.7) return 'active'
		if (activeRatio >= 0.3) return 'idle'
		return 'away'
	}

	#calculateEngagementScore(): number {
		const total = this.#activeTime + this.#idleTime
		if (total === 0) return 0

		// Score based on active ratio with diminishing returns for very long dwells
		const activeRatio = this.#activeTime / total
		const durationFactor = Math.min(1, Math.log10(total / 1000 + 1) / 2)

		return Math.round(
			(activeRatio * ENGAGEMENT_SCORE_WEIGHTS.active +
				(1 - activeRatio) * ENGAGEMENT_SCORE_WEIGHTS.idle) *
				durationFactor *
				100,
		) / 100
	}

	#notifyEngagementChange(state: EngagementState, nodeId: string): void {
		for (const listener of this.#engagementListeners) {
			listener(state, nodeId)
		}
	}

	#notifyDwellComplete(record: DwellRecord): void {
		for (const listener of this.#dwellListeners) {
			listener(record)
		}
	}
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an activity tracker for engagement-aware predictions.
 *
 * @param options - Activity tracker configuration
 * @returns Activity tracker interface
 *
 * @example
 * ```ts
 * import { createActivityTracker } from '@mikesaintsg/actionloop'
 *
 * const activity = createActivityTracker({
 *   idleThreshold: 30000,
 *   awayThreshold: 300000,
 *   onEngagementChange: (state, nodeId) => {
 *     console.log(`Engagement: ${state} on ${nodeId}`)
 *   },
 * })
 *
 * // Use with workflow engine
 * const engine = createWorkflowEngine(procedural, predictive, {
 *   activity,
 * })
 * ```
 */
export function createActivityTracker(
	options?: ActivityTrackerOptions,
): ActivityTrackerInterface {
	return new ActivityTracker(options)
}

/**
 * Check if activity tracking is supported in current environment.
 *
 * @returns true if browser environment with required APIs
 */
export function isActivityTrackingSupported(): boolean {
	return (
		typeof document !== 'undefined' &&
		typeof document.visibilityState !== 'undefined' &&
		typeof window !== 'undefined' &&
		typeof window.addEventListener === 'function'
	)
}
