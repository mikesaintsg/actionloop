/**
 * @mikesaintsg/actionloop
 *
 * Workflow Engine implementation - runtime engine for PPALS.
 */

import type {
	Actor,
	Unsubscribe,
	ActivityTrackerInterface,
	EventStorePersistenceAdapterInterface,
	TransitionEvent,
	EventFilter,
} from '@mikesaintsg/core'
import type {
	Transition,
	TransitionContext,
	PredictionContext,
	BatchTransition,
	SessionInfo,
	SessionEndReason,
	SessionResumeOptions,
	ChainOptions,
	ActionChain,
	ActionEvent,
	ActionEventType,
	TruncationStrategy,
	DetailedPrediction,
	PredictionResult,
	ConfidenceFactors,
	TransitionCallback,
	PredictionCallback,
	SessionCallback,
	SessionEndCallback,
	ErrorCallback,
	WorkflowEngineInterface,
	WorkflowEngineOptions,
	ProceduralGraphInterface,
	PredictiveGraphInterface,
	ActionLoopErrorInterface,
	SessionEntry,
} from '../../types.js'
import { ActionLoopError } from '../../errors.js'
import { generateId, now } from '../../helpers.js'
import {
	DEFAULT_SESSION_TIMEOUT_MS,
	DEFAULT_PREDICTION_COUNT,
	DEFAULT_MAX_EVENTS,
	FREQUENCY_SCALE_FACTOR,
	SAMPLE_SIZE_SCALE_FACTOR,
} from '../../constants.js'

// ============================================================================
// Implementation
// ============================================================================

class WorkflowEngine implements WorkflowEngineInterface {
	readonly #procedural: ProceduralGraphInterface
	readonly #predictive: PredictiveGraphInterface
	readonly #sessions: Map<string, SessionEntry>
	readonly #actorSessions: Map<Actor, string>
	readonly #validateTransitions: boolean
	readonly #trackSessions: boolean
	readonly #sessionTimeoutMs: number
	readonly #activity: ActivityTrackerInterface | undefined
	readonly #eventPersistence: EventStorePersistenceAdapterInterface | undefined

	readonly #transitionListeners: Set<TransitionCallback>
	readonly #predictionListeners: Set<PredictionCallback>
	readonly #sessionStartListeners: Set<SessionCallback>
	readonly #sessionEndListeners: Set<SessionEndCallback>
	readonly #errorListeners: Set<ErrorCallback>

	constructor(
		procedural: ProceduralGraphInterface,
		predictive: PredictiveGraphInterface,
		_options: WorkflowEngineOptions = {},
	) {
		this.#procedural = procedural
		this.#predictive = predictive
		this.#sessions = new Map()
		this.#actorSessions = new Map()
		this.#validateTransitions = _options.validateTransitions !== false
		this.#trackSessions = _options.trackSessions !== false
		this.#sessionTimeoutMs = _options.sessionTimeoutMs ?? DEFAULT_SESSION_TIMEOUT_MS
		this.#activity = _options.activity
		this.#eventPersistence = _options.eventPersistence

		this.#transitionListeners = new Set()
		this.#predictionListeners = new Set()
		this.#sessionStartListeners = new Set()
		this.#sessionEndListeners = new Set()
		this.#errorListeners = new Set()

		// Wire up hook subscriptions
		if (_options.onTransition) {
			this.#transitionListeners.add(_options.onTransition)
		}
		if (_options.onPrediction) {
			this.#predictionListeners.add(_options.onPrediction)
		}
		if (_options.onSessionStart) {
			this.#sessionStartListeners.add(_options.onSessionStart)
		}
		if (_options.onSessionEnd) {
			this.#sessionEndListeners.add(_options.onSessionEnd)
		}
		if (_options.onError) {
			this.#errorListeners.add(_options.onError)
		}
	}

	#emitError(error: ActionLoopErrorInterface): void {
		for (const listener of this.#errorListeners) {
			listener(error)
		}
	}

	#updateSession(sessionId: string, from: string, to:  string): void {
		const session = this.#sessions.get(sessionId)
		if (!session?.active) return

		const currentTime = now()
		const lastEvent = session.events[session.events. length - 1]

		const event: ActionEvent = {
			id: generateId(),
			sessionId,
			actor: session.info.actor,
			from,
			to,
			timestamp: currentTime,
			duration: lastEvent ?  currentTime - lastEvent.timestamp : 0,
			sessionElapsed: currentTime - session.info.startTime,
			eventType: 'transition' as ActionEventType,
		}

		session. events.push(event)

		// Update session info
		const updatedInfo:  SessionInfo = {
			...session.info,
			lastActivity: currentTime,
			nodeHistory: [... (session.info.nodeHistory ??  []), to],
		}
		session.info = updatedInfo
	}

	// ---- Core Methods ----

	recordTransition(from: string, to:  string, context: TransitionContext): void {
		// Validate transition
		if (this.#validateTransitions) {
			if (!this.#procedural.hasTransition(from, to)) {
				const error = new ActionLoopError(
					'INVALID_TRANSITION',
					`Transition not allowed: ${from} -> ${to}`,
					{ transitionKey: `${from}::${to}` },
				)
				this.#emitError(error)
				throw error
			}
		}

		// Update predictive weights
		this.#predictive.updateWeight(from, to, context.actor)

		// Update session if tracking
		if (this.#trackSessions && context.sessionId) {
			this.#updateSession(context. sessionId, from, to)
		}

		// Emit transition event
		for (const listener of this.#transitionListeners) {
			listener(from, to, context)
		}
	}

	recordTransitions(transitions: readonly BatchTransition[]): void {
		for (const { from, to, context } of transitions) {
			this.recordTransition(from, to, context)
		}
	}

	predictNext(node: string, context: PredictionContext): readonly string[] {
		const count = context.count ?? DEFAULT_PREDICTION_COUNT

		// Get weighted transitions
		const weighted = this.#predictive.getWeights(node, context.actor)

		// Take top-k
		const predictions = weighted.slice(0, count).map((w) => w.to)

		// Emit prediction event
		for (const listener of this.#predictionListeners) {
			listener(node, predictions, context)
		}

		return predictions
	}

	predictNextDetailed(
		node: string,
		context: PredictionContext,
	): DetailedPrediction {
		const count = context.count ?? DEFAULT_PREDICTION_COUNT
		const weighted = this.#predictive.getWeights(node, context.actor)
		const warmupComplete = this.#predictive.isWarmupComplete()
		const transitionCount = this.#predictive.getTransitionCount()

		const predictions: PredictionResult[] = weighted
			.slice(0, count)
			.map((w) => {
				const confidence = w.weight > 0 ? Math.min(1, w.predictiveWeight / w.weight) : 0
				const factors: ConfidenceFactors = {
					frequency: Math.min(1, w.predictiveWeight / FREQUENCY_SCALE_FACTOR),
					recency: 0.5, // Default value - could be enhanced with recency tracking
					engagement: 0.5, // Default value - could be enhanced with engagement data
					sampleSize: Math.min(1, transitionCount / SAMPLE_SIZE_SCALE_FACTOR),
				}

				return {
					nodeId: w.to,
					score: w.weight,
					baseWeight: w.baseWeight,
					predictiveWeight: w.predictiveWeight,
					confidence,
					factors,
				}
			})

		return {
			predictions,
			currentNode: node,
			context,
			computedAt: now(),
			warmupComplete,
			transitionCount,
		}
	}

	// ---- Validation Methods ----

	isValidTransition(from: string, to:  string): boolean {
		return this.#procedural.hasTransition(from, to)
	}

	getValidTransitions(from: string): readonly Transition[] {
		return this.#procedural.getTransitions(from)
	}

	// ---- Session Methods ----

	startSession(actor: Actor, sessionId?:  string): SessionInfo {
		const id = sessionId ?? generateId()
		const currentTime = now()

		// Check for existing active session
		const existingId = this.#actorSessions.get(actor)
		if (existingId) {
			const existing = this.#sessions.get(existingId)
			if (existing?. active) {
				// End existing session
				this.endSession(existingId, 'abandoned')
			}
		}

		const info: SessionInfo = {
			id,
			actor,
			startTime: currentTime,
			lastActivity: currentTime,
			nodeHistory:  [],
		}

		const entry: SessionEntry = {
			info,
			events: [
				{
					id: generateId(),
					sessionId:  id,
					actor,
					from:  '',
					to: '',
					timestamp: currentTime,
					sessionElapsed: 0,
					eventType: 'session_start' as ActionEventType,
				},
			],
			active:  true,
		}

		this.#sessions.set(id, entry)
		this.#actorSessions.set(actor, id)

		// Emit session start
		for (const listener of this.#sessionStartListeners) {
			listener(info)
		}

		return info
	}

	getSession(sessionId:  string): SessionInfo | undefined {
		return this.#sessions.get(sessionId)?.info
	}

	getActiveSession(actor: Actor): SessionInfo | undefined {
		const sessionId = this.#actorSessions. get(actor)
		if (! sessionId) return undefined

		const session = this.#sessions.get(sessionId)
		if (!session?. active) return undefined

		// Check for timeout
		const elapsed = now() - session.info.lastActivity
		if (elapsed > this.#sessionTimeoutMs) {
			this. endSession(sessionId, 'timeout')
			return undefined
		}

		return session.info
	}

	hasSession(sessionId:  string): boolean {
		return this.#sessions.has(sessionId)
	}

	endSession(sessionId: string, reason: SessionEndReason): void {
		const session = this.#sessions.get(sessionId)
		if (!session) {
			throw new ActionLoopError('SESSION_NOT_FOUND', `Session not found: ${sessionId}`, {
				sessionId,
			})
		}

		if (! session.active) {
			throw new ActionLoopError(
				'SESSION_ALREADY_ENDED',
				`Session already ended: ${sessionId}`,
				{ sessionId },
			)
		}

		const currentTime = now()

		// Add end event
		session.events.push({
			id: generateId(),
			sessionId,
			actor: session.info. actor,
			from: '',
			to: '',
			timestamp: currentTime,
			sessionElapsed: currentTime - session.info.startTime,
			eventType: 'session_end' as ActionEventType,
			metadata: { reason },
		})

		session.active = false

		// Clear active session mapping
		if (this.#actorSessions.get(session.info. actor) === sessionId) {
			this.#actorSessions.delete(session.info.actor)
		}

		// Emit session end
		for (const listener of this.#sessionEndListeners) {
			listener(session.info, reason)
		}
	}

	resumeSession(sessionId: string, options: SessionResumeOptions): void {
		const session = this.#sessions.get(sessionId)
		if (!session) {
			throw new ActionLoopError('SESSION_NOT_FOUND', `Session not found: ${sessionId}`, {
				sessionId,
			})
		}

		const currentTime = now()

		// Reactivate session
		session.active = true
		session.info = Object.assign(
			{},
			session.info,
			{ lastActivity: currentTime },
			options.path !== undefined ? { path: options.path } : {},
		)

		// Update actor mapping
		this.#actorSessions.set(options.actor, sessionId)
	}

	getSessionChain(actor: Actor, options?: ChainOptions): ActionChain {
		const limit = options?.limit ??  100
		const events:  ActionEvent[] = []
		const sessionIds = new Set<string>()
		let totalDuration = 0

		// Collect events from all sessions for this actor
		for (const [id, session] of this.#sessions) {
			if (session.info.actor !== actor) continue

			// Apply time range filter
			if (options?.startTime || options?.endTime) {
				const sessionStart = session.info.startTime
				const sessionEnd =
					session.events[session.events.length - 1]?. timestamp ??  sessionStart

				if (options. startTime && sessionEnd < options.startTime) continue
				if (options.endTime && sessionStart > options.endTime) continue
			}

			sessionIds.add(id)

			for (const event of session.events) {
				if (event.eventType === 'transition') {
					events.push(event)
				}
			}

			const lastEvent = session.events[session.events. length - 1]
			if (lastEvent) {
				totalDuration += lastEvent.sessionElapsed
			}
		}

		// Sort by timestamp and limit
		events. sort((a, b) => a.timestamp - b.timestamp)
		const limitedEvents = events. slice(-limit)

		return {
			events: limitedEvents,
			sessionIds:  Array.from(sessionIds),
			totalDuration,
		}
	}

	truncateChain(sessionId: string, strategy?: TruncationStrategy): void {
		const session = this.#sessions.get(sessionId)
		if (!session) {
			throw new ActionLoopError('SESSION_NOT_FOUND', `Session not found: ${sessionId}`, {
				sessionId,
			})
		}

		const strat = strategy ?? 'recency'
		const maxEvents = DEFAULT_MAX_EVENTS

		if (session.events.length <= maxEvents) return

		switch (strat) {
			case 'recency':
				// Keep most recent events
				session.events.splice(0, session.events.length - maxEvents)
				break

			case 'frequency':
				// Keep events with high-frequency transitions (simplified)
				session.events.splice(0, session.events.length - maxEvents)
				break

			case 'hybrid':
				// Combination strategy
				session.events.splice(0, session.events.length - maxEvents)
				break
		}
	}

	// ---- Subscription Methods ----

	onTransition(callback: TransitionCallback): Unsubscribe {
		this. #transitionListeners.add(callback)
		return () => {
			this. #transitionListeners.delete(callback)
		}
	}

	onPrediction(callback:  PredictionCallback): Unsubscribe {
		this. #predictionListeners.add(callback)
		return () => {
			this. #predictionListeners.delete(callback)
		}
	}

	onSessionStart(callback: SessionCallback): Unsubscribe {
		this.#sessionStartListeners.add(callback)
		return () => {
			this.#sessionStartListeners.delete(callback)
		}
	}

	onSessionEnd(callback: SessionEndCallback): Unsubscribe {
		this.#sessionEndListeners.add(callback)
		return () => {
			this.#sessionEndListeners.delete(callback)
		}
	}

	onError(callback:  ErrorCallback): Unsubscribe {
		this.#errorListeners.add(callback)
		return () => {
			this.#errorListeners.delete(callback)
		}
	}

	// ---- Graph Access ----

	getProceduralGraph(): ProceduralGraphInterface {
		return this.#procedural
	}

	getPredictiveGraph(): PredictiveGraphInterface {
		return this.#predictive
	}

	getActivityTracker(): ActivityTrackerInterface | undefined {
		return this.#activity
	}

	// ---- Event Methods (requires eventPersistence adapter) ----

	async getEvents(filter: EventFilter): Promise<readonly TransitionEvent[]> {
		if (!this.#eventPersistence) {
			return []
		}
		return this.#eventPersistence.load(filter)
	}

	async getEventCount(filter?: EventFilter): Promise<number> {
		if (!this.#eventPersistence) {
			return 0
		}
		return this.#eventPersistence.getCount(filter)
	}

	// ---- Lifecycle Methods ----

	destroy(): void {
		this.#transitionListeners.clear()
		this.#predictionListeners.clear()
		this.#sessionStartListeners.clear()
		this.#sessionEndListeners. clear()
		this.#errorListeners.clear()
		this.#sessions.clear()
		this.#actorSessions.clear()
	}
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Workflow Engine.
 *
 * @param procedural - The static procedural graph
 * @param predictive - The dynamic predictive graph overlay
 * @param options - Optional engine configuration
 * @returns Workflow engine interface
 *
 * @example
 * ```ts
 * import { createWorkflowEngine } from '@mikesaintsg/actionloop'
 *
 * const engine = createWorkflowEngine(procedural, predictive, {
 *   onTransition: (from, to, ctx) => console.log(`${from} -> ${to}`),
 * })
 * ```
 */
export function createWorkflowEngine(
	procedural: ProceduralGraphInterface,
	predictive: PredictiveGraphInterface,
	options?:  WorkflowEngineOptions,
): WorkflowEngineInterface {
	return new WorkflowEngine(procedural, predictive, options)
}
