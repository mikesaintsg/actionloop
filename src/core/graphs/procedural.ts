/**
 * @mikesaintsg/actionloop
 *
 * Procedural Graph implementation - static graph of valid transitions.
 */

import type {
	Node,
	NodeInput,
	Transition,
	TransitionInput,
	Procedure,
	ProcedureInput,
	GraphStats,
	ValidationResult,
	ValidationSeverity,
	ExportedProceduralGraph,
	ProceduralGraphInterface,
	ProceduralGraphOptions,
	Unsubscribe,
	Actor,
} from '../../types.js'
import { ActionLoopError } from '../../errors.js'
import { createTransitionKey, deepFreeze, now } from '../../helpers.js'
import { EXPORT_VERSION } from '../../constants.js'

// ============================================================================
// Implementation
// ============================================================================

class ProceduralGraph implements ProceduralGraphInterface {
	readonly #nodes: Map<string, Node>
	readonly #transitions:  Map<string, Transition>
	readonly #outgoing: Map<string, Set<string>>
	readonly #incoming:  Map<string, Set<string>>
	readonly #procedures: Map<string, Procedure>
	readonly #validationListeners: Set<
		(results: readonly ValidationResult[]) => void
	>

	constructor(options: ProceduralGraphOptions) {
		this. #nodes = new Map()
		this.#transitions = new Map()
		this.#outgoing = new Map()
		this.#incoming = new Map()
		this.#procedures = new Map()
		this.#validationListeners = new Set()

		// Wire up hook subscriptions
		if (options.onValidation) {
			this.#validationListeners.add(options.onValidation)
		}

		// Add nodes if provided
		if (options.nodes) {
			for (const node of options.nodes) {
				this. #addNode(node)
			}
		}

		// Add transitions (required)
		for (const transition of options.transitions) {
			this.#addTransition(transition)
		}

		// Add procedures if provided
		if (options.procedures) {
			for (const procedure of options.procedures) {
				this.#addProcedure(procedure)
			}
		}

		// Validate on create if requested
		if (options.validateOnCreate !== false) {
			const results = this.validate()
			const errors = results.filter((r) => r.severity === 'error')
			const firstError = errors[0]
			if (firstError) {
				throw new ActionLoopError(
					'BUILD_FAILED',
					`Procedural graph validation failed with ${errors.length} error(s): ${firstError.message}`,
				)
			}
		}
	}

	#addNode(input: NodeInput): void {
		const node: Node = deepFreeze(
			Object.assign(
				{ id: input.id },
				input.label !== undefined ? { label: input.label } : {},
				input.type !== undefined ? { type: input.type } : {},
				input.metadata !== undefined ? { metadata: input.metadata } : {},
			) as Node,
		)
		this.#nodes.set(node.id, node)

		if (!this.#outgoing.has(node.id)) {
			this.#outgoing.set(node.id, new Set())
		}
		if (!this.#incoming.has(node.id)) {
			this.#incoming.set(node.id, new Set())
		}
	}

	#addTransition(input: TransitionInput): void {
		// Ensure nodes exist
		if (!this.#nodes.has(input.from)) {
			this.#addNode({ id: input.from })
		}
		if (!this.#nodes.has(input.to)) {
			this.#addNode({ id: input.to })
		}

		const key = createTransitionKey(input.from, input.to)
		const transition: Transition = deepFreeze(
			Object.assign(
				{
					from: input.from,
					to: input.to,
					weight: input.weight,
					actor: input.actor,
				},
				input.metadata !== undefined ? { metadata: input.metadata } : {},
			) as Transition,
		)

		this.#transitions.set(key, transition)

		// Update adjacency
		this.#outgoing.get(input.from)?.add(input.to)
		this.#incoming.get(input.to)?.add(input.from)
	}

	#addProcedure(input: ProcedureInput): void {
		const procedure: Procedure = deepFreeze(
			Object.assign(
				{
					id: input.id,
					actions: input.actions,
				},
				input.metadata !== undefined ? { metadata: input.metadata } : {},
			) as Procedure,
		)
		this.#procedures.set(procedure.id, procedure)
	}

	// ---- Accessor Methods ----

	getNode(id: string): Node | undefined {
		return this.#nodes.get(id)
	}

	getNodes(): readonly Node[] {
		return Array.from(this.#nodes. values())
	}

	hasNode(id: string): boolean {
		return this.#nodes.has(id)
	}

	getTransitions(from: string): readonly Transition[] {
		const targets = this.#outgoing.get(from)
		if (!targets) {
			return []
		}

		const result: Transition[] = []
		for (const to of targets) {
			const key = createTransitionKey(from, to)
			const transition = this.#transitions. get(key)
			if (transition) {
				result. push(transition)
			}
		}
		return result
	}

	getTransitionsTo(to: string): readonly Transition[] {
		const sources = this.#incoming. get(to)
		if (!sources) {
			return []
		}

		const result: Transition[] = []
		for (const from of sources) {
			const key = createTransitionKey(from, to)
			const transition = this.#transitions.get(key)
			if (transition) {
				result.push(transition)
			}
		}
		return result
	}

	getAllTransitions(): readonly Transition[] {
		return Array.from(this.#transitions. values())
	}

	hasTransition(from:  string, to: string): boolean {
		const key = createTransitionKey(from, to)
		return this.#transitions. has(key)
	}

	getTransition(from: string, to: string): Transition | undefined {
		const key = createTransitionKey(from, to)
		return this.#transitions.get(key)
	}

	getProcedure(id: string): Procedure | undefined {
		return this.#procedures.get(id)
	}

	getProcedures(): readonly Procedure[] {
		return Array. from(this.#procedures.values())
	}

	hasProcedure(id: string): boolean {
		return this.#procedures.has(id)
	}

	getStats(): GraphStats {
		const actorCounts:  Record<Actor, number> = {
			user: 0,
			system: 0,
			automation: 0,
		}

		for (const transition of this.#transitions.values()) {
			actorCounts[transition.actor]++
		}

		return deepFreeze({
			nodeCount: this.#nodes.size,
			transitionCount:  this.#transitions. size,
			procedureCount: this. #procedures.size,
			actorCounts,
		})
	}

	isStartNode(id: string): boolean {
		const incoming = this.#incoming.get(id)
		return incoming === undefined || incoming.size === 0
	}

	isEndNode(id: string): boolean {
		const outgoing = this.#outgoing. get(id)
		return outgoing === undefined || outgoing. size === 0
	}

	getStartNodes(): readonly string[] {
		const result: string[] = []
		for (const [id, incoming] of this.#incoming) {
			if (incoming.size === 0) {
				result.push(id)
			}
		}
		return result
	}

	getEndNodes(): readonly string[] {
		const result:  string[] = []
		for (const [id, outgoing] of this.#outgoing) {
			if (outgoing. size === 0) {
				result. push(id)
			}
		}
		return result
	}

	// ---- Validation Methods ----

	validate(): readonly ValidationResult[] {
		const results: ValidationResult[] = []

		// Check for dangling nodes
		for (const [id, outgoing] of this. #outgoing) {
			if (outgoing.size === 0) {
				const incoming = this.#incoming.get(id)
				if (incoming && incoming.size > 0) {
					results.push({
						passed: false,
						message: `Node '${id}' has no outgoing transitions (dead end)`,
						severity: 'warning' as ValidationSeverity,
						suggestion: 'Add outgoing transitions or mark as terminal node',
						nodeId: id,
					})
				}
			}
		}

		// Check for unreachable nodes
		const startNodes = this.getStartNodes()
		if (startNodes.length === 0 && this.#nodes.size > 0) {
			results.push({
				passed: false,
				message: 'No start nodes found (all nodes have incoming transitions)',
				severity: 'warning' as ValidationSeverity,
				suggestion: 'Ensure at least one node has no incoming transitions',
			})
		}

		// Check for isolated nodes
		for (const id of this.#nodes.keys()) {
			const incoming = this.#incoming.get(id)
			const outgoing = this. #outgoing.get(id)
			if (
				(! incoming || incoming.size === 0) &&
				(!outgoing || outgoing.size === 0)
			) {
				results.push({
					passed: false,
					message:  `Node '${id}' is isolated (no connections)`,
					severity: 'error' as ValidationSeverity,
					suggestion:  'Connect this node or remove it',
					nodeId:  id,
				})
			}
		}

		// Validate procedures
		for (const procedure of this.#procedures.values()) {
			for (const action of procedure.actions) {
				if (! this.#nodes.has(action)) {
					results. push({
						passed: false,
						message: `Procedure '${procedure.id}' references unknown node '${action}'`,
						severity: 'error' as ValidationSeverity,
						suggestion: `Add node '${action}' or remove from procedure`,
					})
				}
			}
		}

		// Emit validation results
		for (const listener of this.#validationListeners) {
			listener(results)
		}

		return results
	}

	isValid(): boolean {
		const results = this.validate()
		return results.every((r) => r.severity !== 'error')
	}

	// ---- Subscription Methods ----

	onValidation(
		callback: (results: readonly ValidationResult[]) => void,
	): Unsubscribe {
		this. #validationListeners.add(callback)
		return () => {
			this. #validationListeners.delete(callback)
		}
	}

	// ---- Export Methods ----

	export(): ExportedProceduralGraph {
		return deepFreeze({
			version: EXPORT_VERSION,
			exportedAt: now(),
			nodes: this.getNodes(),
			transitions: this.getAllTransitions(),
			procedures: this.getProcedures(),
		})
	}

	// ---- Lifecycle Methods ----

	destroy(): void {
		this.#validationListeners.clear()
	}
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Procedural Graph.
 *
 * @param options - Graph configuration with transitions and optional nodes/procedures
 * @returns Procedural graph interface
 *
 * @example
 * ```ts
 * import { createProceduralGraph } from '@mikesaintsg/actionloop'
 *
 * const graph = createProceduralGraph({
 *   transitions: [
 *     { from: 'login', to: 'dashboard', weight: 1, actor: 'user' },
 *   ],
 * })
 * ```
 */
export function createProceduralGraph(
	options: ProceduralGraphOptions,
): ProceduralGraphInterface {
	return new ProceduralGraph(options)
}
