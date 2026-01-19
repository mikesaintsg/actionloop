/**
 * @mikesaintsg/actionloop
 *
 * Predictive Graph implementation - dynamic weight overlay.
 */

import type {
	Actor,
	DecayAlgorithm,
	DecayConfig,
	WeightedTransition,
	PreloadRecord,
	PredictiveGraphStats,
	ExportedPredictiveGraph,
	ExportedWeight,
	PredictiveGraphInterface,
	PredictiveGraphOptions,
	ProceduralGraphInterface,
	Unsubscribe,
} from '../../types.js'
import { ActionLoopError } from '../../errors.js'
import { createWeightKey, generateId, deepFreeze, now } from '../../helpers.js'

// ============================================================================
// Weight Entry
// ============================================================================

interface WeightEntry {
	weight: number
	lastUpdated: number
	updateCount: number
}

// ============================================================================
// Implementation
// ============================================================================

class PredictiveGraph implements PredictiveGraphInterface {
	readonly #procedural: ProceduralGraphInterface
	readonly #weights: Map<string, WeightEntry>
	readonly #modelId: string
	readonly #decayConfig: DecayConfig
	readonly #minWeight: number

	readonly #weightUpdateListeners: Set<
		(from: string, to:  string, actor: Actor, weight: number) => void
	>
	readonly #decayListeners: Set<(decayedCount: number) => void>

	#totalUpdates: number
	#lastUpdateTime: number

	constructor(
		procedural: ProceduralGraphInterface,
		options: PredictiveGraphOptions = {}
	) {
		this.#procedural = procedural
		this.#weights = new Map()
		this.#modelId = generateId()
		this.#minWeight = options.minWeight ??  0.001
		this.#totalUpdates = 0
		this.#lastUpdateTime = now()

		this.#decayConfig = deepFreeze({
			algorithm: options.decayAlgorithm ??  'ewma',
			halfLifeMs: options.halfLifeMs,
			decayFactor: options.decayFactor ?? 0.9,
			minWeight: this.#minWeight,
		})

		this.#weightUpdateListeners = new Set()
		this.#decayListeners = new Set()

		// Wire up hook subscriptions
		if (options.onWeightUpdate) {
			this.#weightUpdateListeners.add(options.onWeightUpdate)
		}
		if (options.onDecay) {
			this.#decayListeners.add(options.onDecay)
		}

		// Preload historical records
		if (options.preloadRecords) {
			this.preload(options.preloadRecords)
		}
	}

	#calculateDecay(entry: WeightEntry, currentTime: number): number {
		const elapsed = currentTime - entry.lastUpdated

		switch (this.#decayConfig.algorithm) {
			case 'halflife':  {
				const halfLife = this.#decayConfig.halfLifeMs ??  86400000 // 24 hours default
				const decay = Math.pow(0.5, elapsed / halfLife)
				return Math.max(entry.weight * decay, this.#minWeight)
			}

			case 'ewma': {
				const factor = this.#decayConfig.decayFactor ??  0.9
				// Apply decay based on time intervals (1 hour = 1 decay step)
				const steps = Math.floor(elapsed / 3600000)
				if (steps === 0) return entry.weight
				const decay = Math.pow(factor, steps)
				return Math. max(entry.weight * decay, this. #minWeight)
			}

			case 'linear': {
				const decayRate = 0.001 // Weight loss per hour
				const hours = elapsed / 3600000
				return Math.max(entry. weight - decayRate * hours, this.#minWeight)
			}

			case 'none':
			default:
				return entry. weight
		}
	}

	// ---- Accessor Methods ----

	getWeight(from: string, to: string, actor: Actor): number {
		// Validate transition exists in procedural graph
		if (!this.#procedural.hasTransition(from, to)) {
			return 0
		}

		const key = createWeightKey(from, to, actor)
		const entry = this. #weights.get(key)

		if (!entry) {
			return 0
		}

		return this.#calculateDecay(entry, now())
	}

	getWeights(nodeId: string, actor: Actor): readonly WeightedTransition[] {
		const transitions = this.#procedural.getTransitions(nodeId)
		const currentTime = now()
		const result: WeightedTransition[] = []

		for (const transition of transitions) {
			const key = createWeightKey(nodeId, transition.to, actor)
			const entry = this. #weights.get(key)

			const predictiveWeight = entry
				? this.#calculateDecay(entry, currentTime)
				: 0

			result.push({
				to: transition.to,
				weight: transition.weight + predictiveWeight,
				baseWeight: transition.weight,
				predictiveWeight,
			})
		}

		// Sort by combined weight descending
		result. sort((a, b) => b.weight - a.weight)

		return result
	}

	getModelId(): string {
		return this.#modelId
	}

	getDecayConfig(): DecayConfig {
		return this.#decayConfig
	}

	getStats(): PredictiveGraphStats {
		const proceduralStats = this.#procedural. getStats()

		return deepFreeze({
			... proceduralStats,
			totalWeightUpdates: this.#totalUpdates,
			lastUpdateTime:  this.#lastUpdateTime,
			modelId: this.#modelId,
		})
	}

	hasWeight(from: string, to:  string, actor: Actor): boolean {
		const key = createWeightKey(from, to, actor)
		return this.#weights.has(key)
	}

	// ---- Mutator Methods ----

	updateWeight(from: string, to:  string, actor: Actor): void {
		// Validate transition exists
		if (!this. #procedural.hasTransition(from, to)) {
			throw new ActionLoopError(
				'INVALID_TRANSITION',
				`Cannot update weight for invalid transition: ${from} -> ${to}`,
				{ transitionKey: `${from}::${to}` }
			)
		}

		const key = createWeightKey(from, to, actor)
		const currentTime = now()
		const existing = this.#weights.get(key)

		let newWeight: number
		if (existing) {
			// Apply decay then increment
			const decayed = this.#calculateDecay(existing, currentTime)
			newWeight = decayed + 1
		} else {
			newWeight = 1
		}

		this.#weights.set(key, {
			weight:  newWeight,
			lastUpdated: currentTime,
			updateCount: (existing?. updateCount ??  0) + 1,
		})

		this.#totalUpdates++
		this. #lastUpdateTime = currentTime

		// Emit weight update
		for (const listener of this.#weightUpdateListeners) {
			listener(from, to, actor, newWeight)
		}
	}

	setWeight(from: string, to: string, actor: Actor, weight:  number): void {
		// Validate transition exists
		if (! this.#procedural.hasTransition(from, to)) {
			throw new ActionLoopError(
				'INVALID_TRANSITION',
				`Cannot set weight for invalid transition: ${from} -> ${to}`,
				{ transitionKey: `${from}::${to}` }
			)
		}

		const key = createWeightKey(from, to, actor)
		const currentTime = now()
		const existing = this. #weights.get(key)

		this.#weights.set(key, {
			weight:  Math.max(weight, this.#minWeight),
			lastUpdated: currentTime,
			updateCount:  (existing?.updateCount ?? 0) + 1,
		})

		this.#lastUpdateTime = currentTime

		// Emit weight update
		for (const listener of this.#weightUpdateListeners) {
			listener(from, to, actor, weight)
		}
	}

	applyDecay(): number {
		const currentTime = now()
		let decayedCount = 0

		for (const [key, entry] of this.#weights) {
			const decayed = this.#calculateDecay(entry, currentTime)

			if (decayed < this.#minWeight) {
				this.#weights.delete(key)
				decayedCount++
			} else if (decayed !== entry.weight) {
				this.#weights.set(key, {
					weight: decayed,
					lastUpdated: currentTime,
					updateCount: entry.updateCount,
				})
				decayedCount++
			}
		}

		// Emit decay event
		for (const listener of this.#decayListeners) {
			listener(decayedCount)
		}

		return decayedCount
	}

	clear(): void {
		this.#weights. clear()
		this.#totalUpdates = 0
	}

	clearActor(actor: Actor): void {
		const keysToDelete:  string[] = []

		for (const key of this.#weights.keys()) {
			if (key.endsWith(`::${actor}`)) {
				keysToDelete.push(key)
			}
		}

		for (const key of keysToDelete) {
			this.#weights.delete(key)
		}
	}

	// ---- Preload Methods ----

	preload(records:  readonly PreloadRecord[]): void {
		const currentTime = now()

		for (const record of records) {
			// Validate transition exists
			if (! this.#procedural.hasTransition(record.from, record.to)) {
				continue // Skip invalid transitions silently during preload
			}

			const key = createWeightKey(record.from, record.to, record. actor)
			const existing = this.#weights.get(key)

			this.#weights.set(key, {
				weight: (existing?. weight ?? 0) + record.count,
				lastUpdated: currentTime,
				updateCount:  (existing?.updateCount ?? 0) + record.count,
			})
		}
	}

	// ---- Subscription Methods ----

	onWeightUpdate(
		callback: (from: string, to:  string, actor: Actor, weight: number) => void
	): Unsubscribe {
		this. #weightUpdateListeners.add(callback)
		return () => {
			this. #weightUpdateListeners.delete(callback)
		}
	}

	onDecay(callback: (decayedCount:  number) => void): Unsubscribe {
		this. #decayListeners.add(callback)
		return () => {
			this. #decayListeners.delete(callback)
		}
	}

	// ---- Export/Import Methods ----

	export(): ExportedPredictiveGraph {
		const weights:  ExportedWeight[] = []

		for (const [key, entry] of this. #weights) {
			const parts = key.split('::')
			if (parts.length === 3) {
				weights.push({
					from: parts[0],
					to:  parts[1],
					actor: parts[2] as Actor,
					weight: entry.weight,
					lastUpdated: entry. lastUpdated,
					updateCount: entry.updateCount,
				})
			}
		}

		return deepFreeze({
			version: 1,
			exportedAt: now(),
			modelId: this.#modelId,
			weights,
			decayConfig: this. #decayConfig,
		})
	}

	import(data: ExportedPredictiveGraph): void {
		// Validate model compatibility
		if (data.version !== 1) {
			throw new ActionLoopError(
				'MODEL_MISMATCH',
				`Incompatible model version:  expected 1, got ${data.version}`
			)
		}

		this.clear()

		for (const weight of data.weights) {
			const key = createWeightKey(weight.from, weight.to, weight.actor)
			this.#weights.set(key, {
				weight: weight. weight,
				lastUpdated: weight. lastUpdated,
				updateCount: weight.updateCount,
			})
		}
	}

	// ---- Lifecycle Methods ----

	destroy(): void {
		this.#weightUpdateListeners.clear()
		this.#decayListeners.clear()
		this.#weights. clear()
	}
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Predictive Graph overlay.
 *
 * @param procedural - The underlying procedural graph
 * @param options - Optional decay and preload configuration
 * @returns Predictive graph interface
 *
 * @example
 * ```ts
 * import { createPredictiveGraph } from '@mikesaintsg/actionloop'
 *
 * const predictive = createPredictiveGraph(procedural, {
 *   decayAlgorithm: 'ewma',
 *   decayFactor: 0.9,
 * })
 * ```
 */
export function createPredictiveGraph(
	procedural: ProceduralGraphInterface,
	options?:  PredictiveGraphOptions
): PredictiveGraphInterface {
	return new PredictiveGraphImpl(procedural, options)
}
