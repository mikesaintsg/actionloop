/**
 * @mikesaintsg/actionloop
 *
 * ActionLoop Context Formatter for LLM integration.
 */

import type { TransitionEvent, EngagementState } from '@mikesaintsg/core'

import type {
	ActionLoopContextFormatterInterface,
	ActionLoopLLMContext,
	ContextFormatterOptions,
	DetailedPrediction,
	FormattedPrediction,
	ActivitySummary,
	PatternInsights,
	ConfidenceFactors,
} from '../types.js'

import {
	DEFAULT_MAX_RECENT_EVENTS,
	DEFAULT_TOP_PREDICTIONS,
	BOTTLENECK_DWELL_THRESHOLD_MS,
} from '../constants.js'

// ============================================================================
// ContextFormatter Implementation
// ============================================================================

/**
 * Context formatter for converting ActionLoop state to LLM-consumable context.
 */
class ContextFormatter implements ActionLoopContextFormatterInterface {
	readonly #maxRecentEvents: number
	readonly #includePatterns: boolean
	readonly #includeDwell: boolean
	readonly #getNodeLabel: (nodeId: string) => string

	constructor(options?: ContextFormatterOptions) {
		this.#maxRecentEvents = options?.maxRecentEvents ?? DEFAULT_MAX_RECENT_EVENTS
		this.#includePatterns = options?.includePatterns ?? false
		this.#includeDwell = options?.includeDwell ?? true
		this.#getNodeLabel = options?.getNodeLabel ?? ((nodeId: string) => nodeId)
	}

	format(
		predictions: DetailedPrediction,
		events: readonly TransitionEvent[],
		overrideOptions?: ContextFormatterOptions,
	): ActionLoopLLMContext {
		const maxEvents = overrideOptions?.maxRecentEvents ?? this.#maxRecentEvents
		const includePatterns = overrideOptions?.includePatterns ?? this.#includePatterns
		const includeDwell = overrideOptions?.includeDwell ?? this.#includeDwell
		const getLabel = overrideOptions?.getNodeLabel ?? this.#getNodeLabel

		// Get recent events
		const recentEvents = events.slice(-maxEvents)

		// Format predictions
		const formattedPredictions: FormattedPrediction[] = predictions.predictions
			.slice(0, DEFAULT_TOP_PREDICTIONS)
			.map((p) => ({
				nodeId: p.nodeId,
				label: getLabel(p.nodeId),
				confidencePercent: Math.round(p.confidence * 100),
				reasoning: formatReasoning(p.factors),
			}))

		// Format activity summary
		const recentActivity: ActivitySummary[] = recentEvents.map((e) => {
			const activity: ActivitySummary = {
				from: e.from,
				to: e.to,
				actor: e.actor,
				timestamp: e.timestamp,
			}

			// Only add optional properties when they have values
			if (includeDwell && e.dwell?.activeTime) {
				(activity as { dwellSeconds: number }).dwellSeconds = Math.round(e.dwell.activeTime / 1000)
			}
			if (e.engagement) {
				(activity as { engagement: EngagementState }).engagement = e.engagement
			}

			return activity
		})

		// Determine current engagement from most recent event
		const lastEvent = recentEvents[recentEvents.length - 1]
		const currentEngagement: EngagementState = lastEvent?.engagement ?? 'unknown'

		// Build result object
		const result: ActionLoopLLMContext = {
			currentNode: predictions.currentNode,
			predictions: formattedPredictions,
			warmupComplete: predictions.warmupComplete,
			transitionCount: predictions.transitionCount,
			recentActivity,
			engagement: currentEngagement,
		}

		// Add patterns if requested (avoid undefined assignment with exactOptionalPropertyTypes)
		if (includePatterns) {
			(result as { patterns: PatternInsights }).patterns = extractPatterns(events)
		}

		return result
	}

	toNaturalLanguage(context: ActionLoopLLMContext): string {
		const lines: string[] = []

		lines.push(`Current location: ${context.currentNode}`)
		lines.push(`User engagement: ${context.engagement}`)

		if (context.warmupComplete && context.predictions.length > 0) {
			lines.push('')
			lines.push('Predicted next actions (based on learned patterns):')
			for (const p of context.predictions.slice(0, 3)) {
				lines.push(`  - ${p.label}: ${p.confidencePercent}% likely (${p.reasoning})`)
			}
		} else if (!context.warmupComplete) {
			lines.push('')
			lines.push('Note: Predictions will improve with more usage data.')
		}

		if (context.recentActivity.length > 0) {
			lines.push('')
			lines.push('Recent activity:')
			for (const activity of context.recentActivity.slice(-5)) {
				const dwellInfo = activity.dwellSeconds
					? ` (${activity.dwellSeconds}s dwell)`
					: ''
				lines.push(`  - ${activity.from} → ${activity.to}${dwellInfo}`)
			}
		}

		if (context.patterns) {
			lines.push('')
			lines.push('Pattern insights:')
			if (context.patterns.frequentPaths.length > 0) {
				lines.push(`  - Frequent paths: ${context.patterns.frequentPaths.join(', ')}`)
			}
			if (context.patterns.bottlenecks.length > 0) {
				lines.push(`  - Bottlenecks: ${context.patterns.bottlenecks.join(', ')}`)
			}
			if (context.patterns.automationCandidates.length > 0) {
				lines.push(`  - Automation candidates: ${context.patterns.automationCandidates.join(', ')}`)
			}
			if (context.patterns.avgSessionMinutes > 0) {
				lines.push(`  - Avg session duration: ${context.patterns.avgSessionMinutes} minutes`)
			}
		}

		return lines.join('\n')
	}

	toJSON(context: ActionLoopLLMContext): string {
		return JSON.stringify(context, null, 2)
	}
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format confidence factors into human-readable reasoning.
 */
function formatReasoning(factors: ConfidenceFactors): string {
	const parts: string[] = []

	if (factors.frequency > 0.7) {
		parts.push('frequently visited')
	}
	if (factors.recency > 0.7) {
		parts.push('recently accessed')
	}
	if (factors.engagement > 0.7) {
		parts.push('high engagement')
	}
	if (factors.sampleSize > 0.7) {
		parts.push('strong pattern')
	}

	return parts.length > 0 ? parts.join(', ') : 'based on workflow structure'
}

/**
 * Extract pattern insights from transition events.
 */
function extractPatterns(events: readonly TransitionEvent[]): PatternInsights {
	if (events.length === 0) {
		return {
			frequentPaths: [],
			bottlenecks: [],
			automationCandidates: [],
			avgSessionMinutes: 0,
		}
	}

	// Count transition frequencies
	const transitionCounts = new Map<string, number>()
	const nodeDwellTimes = new Map<string, number[]>()
	const sessionTimes = new Map<string, { start: number; end: number }>()

	for (const event of events) {
		// Count transitions
		const key = `${event.from}→${event.to}`
		transitionCounts.set(key, (transitionCounts.get(key) ?? 0) + 1)

		// Track dwell times per node
		if (event.dwell) {
			const dwells = nodeDwellTimes.get(event.from) ?? []
			dwells.push(event.dwell.activeTime + event.dwell.idleTime)
			nodeDwellTimes.set(event.from, dwells)
		}

		// Track session times
		const session = sessionTimes.get(event.sessionId)
		if (session) {
			session.end = event.timestamp
		} else {
			sessionTimes.set(event.sessionId, { start: event.timestamp, end: event.timestamp })
		}
	}

	// Find frequent paths (top 3 transitions)
	const sortedTransitions = [...transitionCounts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 3)
	const frequentPaths = sortedTransitions.map(([path]) => path)

	// Find bottlenecks (nodes with high average dwell time)
	const bottlenecks: string[] = []
	for (const [nodeId, dwells] of nodeDwellTimes) {
		const avgDwell = dwells.reduce((a, b) => a + b, 0) / dwells.length
		if (avgDwell > BOTTLENECK_DWELL_THRESHOLD_MS) {
			bottlenecks.push(nodeId)
		}
	}

	// Find automation candidates (repeated sequences)
	const automationCandidates: string[] = []
	const sequenceFreq = findRepeatedSequences(events)
	for (const [sequence, count] of sequenceFreq) {
		if (count >= 3) {
			automationCandidates.push(sequence)
		}
	}

	// Calculate average session duration
	let totalSessionTime = 0
	for (const session of sessionTimes.values()) {
		totalSessionTime += session.end - session.start
	}
	const avgSessionMinutes = sessionTimes.size > 0
		? Math.round((totalSessionTime / sessionTimes.size) / 60000)
		: 0

	return {
		frequentPaths: frequentPaths.slice(0, 5),
		bottlenecks: bottlenecks.slice(0, 5),
		automationCandidates: automationCandidates.slice(0, 5),
		avgSessionMinutes,
	}
}

/**
 * Find repeated sequences in events.
 */
function findRepeatedSequences(
	events: readonly TransitionEvent[],
): Map<string, number> {
	const sequences = new Map<string, number>()

	// Look for 2-3 step repeated sequences
	for (let len = 2; len <= 3; len++) {
		for (let i = 0; i <= events.length - len; i++) {
			const seq = events
				.slice(i, i + len)
				.map((e) => e.to)
				.join('→')
			sequences.set(seq, (sequences.get(seq) ?? 0) + 1)
		}
	}

	return sequences
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an ActionLoop context formatter for LLM integration.
 *
 * @param options - Optional formatter configuration
 * @returns Context formatter interface
 *
 * @example
 * ```ts
 * import { createActionLoopContextFormatter } from '@mikesaintsg/actionloop'
 *
 * const formatter = createActionLoopContextFormatter({
 *   maxRecentEvents: 10,
 *   includePatterns: true,
 *   getNodeLabel: (nodeId) => graph.getNode(nodeId)?.label ?? nodeId,
 * })
 *
 * const predictions = engine.predictNextDetailed(currentNode, context)
 * const events = await engine.getEvents({ sessionId, limit: 20 })
 * const llmContext = formatter.format(predictions, events)
 *
 * // Use in prompt
 * const prompt = formatter.toNaturalLanguage(llmContext)
 * ```
 */
export function createActionLoopContextFormatter(
	options?: ContextFormatterOptions,
): ActionLoopContextFormatterInterface {
	return new ContextFormatter(options)
}
