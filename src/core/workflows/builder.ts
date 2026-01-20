/**
 * @mikesaintsg/actionloop
 *
 * Workflow Builder implementation - programmatic graph construction.
 */

import type {
	Actor,
	Unsubscribe,
} from '@mikesaintsg/core'
import type {
	Node,
	NodeInput,
	NodeType,
	Transition,
	TransitionInput,
	Procedure,
	ProcedureInput,
	BuilderValidationResult,
	ValidationResult,
	ValidationSeverity,
	GraphDefinition,
	WorkflowBuilderInterface,
	WorkflowBuilderOptions,
	ProceduralGraphInterface,
} from '../../types.js'
import { createProceduralGraph } from '../graphs/procedural.js'
import { ActionLoopError } from '../../errors.js'
import { createTransitionKey, deepFreeze, parseYAMLValue } from '../../helpers.js'

// ============================================================================
// Implementation
// ============================================================================

class WorkflowBuilder implements WorkflowBuilderInterface {
	readonly #nodes: Map<string, Node>
	readonly #transitions: Map<string, Transition>
	readonly #procedures: Map<string, Procedure>
	readonly #validateOnChange: boolean
	readonly #allowDuplicateNodes: boolean

	readonly #nodeAddedListeners: Set<(node: Node) => void>
	readonly #nodeRemovedListeners: Set<(nodeId: string) => void>
	readonly #transitionAddedListeners: Set<(transition:  Transition) => void>
	readonly #transitionRemovedListeners: Set<(from: string, to: string) => void>
	readonly #validationListeners: Set<
		(results: readonly ValidationResult[]) => void
	>

	constructor(options: WorkflowBuilderOptions = {}) {
		this.#nodes = new Map()
		this.#transitions = new Map()
		this.#procedures = new Map()
		this.#validateOnChange = options.validateOnChange ??  false
		this.#allowDuplicateNodes = options.allowDuplicateNodes ?? false

		this.#nodeAddedListeners = new Set()
		this.#nodeRemovedListeners = new Set()
		this.#transitionAddedListeners = new Set()
		this.#transitionRemovedListeners = new Set()
		this.#validationListeners = new Set()

		// Wire up hook subscriptions
		if (options.onNodeAdded) {
			this.#nodeAddedListeners.add(options.onNodeAdded)
		}
		if (options.onNodeRemoved) {
			this.#nodeRemovedListeners.add(options.onNodeRemoved)
		}
		if (options. onTransitionAdded) {
			this.#transitionAddedListeners.add(options.onTransitionAdded)
		}
		if (options.onTransitionRemoved) {
			this.#transitionRemovedListeners.add(options.onTransitionRemoved)
		}
		if (options.onValidation) {
			this.#validationListeners.add(options. onValidation)
		}
	}

	#emitValidation(): void {
		if (this.#validateOnChange) {
			const result = this.validate()
			for (const listener of this.#validationListeners) {
				listener([... result.errors, ...result.warnings])
			}
		}
	}

	// ---- Builder Methods ----

	addNode(input: NodeInput): this {
		if (!this.#allowDuplicateNodes && this.#nodes.has(input.id)) {
			throw new ActionLoopError(
				'DUPLICATE_NODE',
				`Node already exists: ${input.id}`,
				{ nodeId: input.id },
			)
		}

		const node: Node = deepFreeze(
			Object.assign(
				{ id: input.id },
				input.label !== undefined ? { label: input.label } : {},
				input.type !== undefined ? { type: input.type } : {},
				input.metadata !== undefined ? { metadata: input.metadata } : {},
			) as Node,
		)

		this.#nodes.set(node.id, node)

		for (const listener of this.#nodeAddedListeners) {
			listener(node)
		}

		this.#emitValidation()
		return this
	}

	addNodes(nodes: readonly NodeInput[]): this {
		for (const node of nodes) {
			this.addNode(node)
		}
		return this
	}

	removeNode(id: string): this {
		if (!this.#nodes.has(id)) {
			throw new ActionLoopError('NODE_NOT_FOUND', `Node not found: ${id}`, {
				nodeId: id,
			})
		}

		// Remove associated transitions
		const keysToRemove: string[] = []
		for (const [key, transition] of this.#transitions) {
			if (transition.from === id || transition.to === id) {
				keysToRemove.push(key)
			}
		}
		for (const key of keysToRemove) {
			const transition = this.#transitions.get(key)
			this.#transitions.delete(key)
			if (transition) {
				for (const listener of this.#transitionRemovedListeners) {
					listener(transition.from, transition.to)
				}
			}
		}

		this.#nodes.delete(id)

		for (const listener of this.#nodeRemovedListeners) {
			listener(id)
		}

		this.#emitValidation()
		return this
	}

	updateNode(id: string, updates: Partial<NodeInput>): this {
		const existing = this.#nodes.get(id)
		if (!existing) {
			throw new ActionLoopError('NODE_NOT_FOUND', `Node not found: ${id}`, {
				nodeId: id,
			})
		}

		const label = updates.label ?? existing.label
		const type = updates.type ?? existing.type
		const metadata = updates.metadata ?? existing.metadata

		const updated: Node = deepFreeze(
			Object.assign(
				{ id: existing.id },
				label !== undefined ? { label } : {},
				type !== undefined ? { type } : {},
				metadata !== undefined ? { metadata } : {},
			) as Node,
		)

		this.#nodes.set(id, updated)
		this.#emitValidation()
		return this
	}

	addTransition(input: TransitionInput): this {
		const key = createTransitionKey(input.from, input.to)

		if (this.#transitions.has(key)) {
			throw new ActionLoopError(
				'DUPLICATE_TRANSITION',
				`Transition already exists: ${input.from} -> ${input.to}`,
				{ transitionKey: key },
			)
		}

		// Auto-create nodes if they don't exist
		if (!this.#nodes.has(input.from)) {
			this.addNode({ id: input.from })
		}
		if (!this.#nodes.has(input.to)) {
			this.addNode({ id: input.to })
		}

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

		for (const listener of this.#transitionAddedListeners) {
			listener(transition)
		}

		this.#emitValidation()
		return this
	}

	addTransitions(transitions: readonly TransitionInput[]): this {
		for (const transition of transitions) {
			this.addTransition(transition)
		}
		return this
	}

	removeTransition(from: string, to: string): this {
		const key = createTransitionKey(from, to)

		if (!this.#transitions.has(key)) {
			throw new ActionLoopError(
				'INVALID_TRANSITION',
				`Transition not found: ${from} -> ${to}`,
				{ transitionKey: key },
			)
		}

		this.#transitions.delete(key)

		for (const listener of this.#transitionRemovedListeners) {
			listener(from, to)
		}

		this.#emitValidation()
		return this
	}

	updateTransition(
		from: string,
		to: string,
		updates: Partial<TransitionInput>,
	): this {
		const key = createTransitionKey(from, to)
		const existing = this.#transitions.get(key)

		if (!existing) {
			throw new ActionLoopError(
				'INVALID_TRANSITION',
				`Transition not found: ${from} -> ${to}`,
				{ transitionKey: key },
			)
		}

		const metadata = updates.metadata ?? existing.metadata
		const updated: Transition = deepFreeze(
			Object.assign(
				{
					from: existing.from,
					to: existing.to,
					weight: updates.weight ?? existing.weight,
					actor: updates.actor ?? existing.actor,
				},
				metadata !== undefined ? { metadata } : {},
			) as Transition,
		)

		this.#transitions.set(key, updated)
		this.#emitValidation()
		return this
	}

	addProcedure(input: ProcedureInput): this {
		if (this.#procedures.has(input.id)) {
			throw new ActionLoopError(
				'INVALID_PROCEDURE',
				`Procedure already exists: ${input.id}`,
			)
		}

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
		this.#emitValidation()
		return this
	}

	removeProcedure(id: string): this {
		if (!this.#procedures.has(id)) {
			throw new ActionLoopError(
				'INVALID_PROCEDURE',
				`Procedure not found: ${id}`,
			)
		}

		this.#procedures.delete(id)
		this.#emitValidation()
		return this
	}

	updateProcedure(id: string, updates: Partial<ProcedureInput>): this {
		const existing = this.#procedures.get(id)
		if (!existing) {
			throw new ActionLoopError(
				'INVALID_PROCEDURE',
				`Procedure not found: ${id}`,
			)
		}

		const metadata = updates.metadata ?? existing.metadata
		const updated: Procedure = deepFreeze(
			Object.assign(
				{
					id: existing.id,
					actions: updates.actions ?? existing.actions,
				},
				metadata !== undefined ? { metadata } : {},
			) as Procedure,
		)

		this.#procedures.set(id, updated)
		this.#emitValidation()
		return this
	}

	// ---- Accessor Methods ----

	getNodes(): readonly Node[] {
		return Array.from(this.#nodes.values())
	}

	getTransitions(): readonly Transition[] {
		return Array.from(this.#transitions. values())
	}

	getProcedures(): readonly Procedure[] {
		return Array.from(this.#procedures.values())
	}

	hasNode(id: string): boolean {
		return this.#nodes.has(id)
	}

	hasTransition(from: string, to:  string): boolean {
		const key = createTransitionKey(from, to)
		return this.#transitions.has(key)
	}

	// ---- Validation Methods ----

	validate(): BuilderValidationResult {
		const errors: ValidationResult[] = []
		const warnings: ValidationResult[] = []

		// Check for empty graph
		if (this.#nodes.size === 0) {
			errors.push({
				passed: false,
				message:  'Graph has no nodes',
				severity: 'error' as ValidationSeverity,
				suggestion: 'Add at least one node',
			})
		}

		if (this.#transitions. size === 0 && this. #nodes.size > 1) {
			errors.push({
				passed: false,
				message: 'Graph has no transitions',
				severity: 'error' as ValidationSeverity,
				suggestion: 'Add transitions to connect nodes',
			})
		}

		// Check for isolated nodes
		const connectedNodes = new Set<string>()
		for (const transition of this.#transitions. values()) {
			connectedNodes.add(transition.from)
			connectedNodes.add(transition.to)
		}

		for (const id of this.#nodes.keys()) {
			if (! connectedNodes.has(id) && this.#nodes.size > 1) {
				warnings.push({
					passed:  false,
					message: `Node '${id}' is isolated`,
					severity: 'warning' as ValidationSeverity,
					suggestion: 'Connect this node or remove it',
					nodeId:  id,
				})
			}
		}

		// Validate procedures reference existing nodes
		for (const procedure of this. #procedures.values()) {
			for (const action of procedure.actions) {
				if (!this.#nodes.has(action)) {
					errors.push({
						passed: false,
						message:  `Procedure '${procedure.id}' references unknown node '${action}'`,
						severity: 'error' as ValidationSeverity,
						suggestion: `Add node '${action}' or remove from procedure`,
					})
				}
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		}
	}

	isValid(): boolean {
		return this.validate().valid
	}

	// ---- Build Methods ----

	build(): ProceduralGraphInterface {
		const validation = this.validate()
		if (!validation.valid) {
			throw new ActionLoopError(
				'BUILD_FAILED',
				`Cannot build invalid graph: ${validation.errors[0]?.message ??  'Unknown error'}`,
			)
		}

		return createProceduralGraph({
			nodes: this.getNodes(),
			transitions: this.getTransitions(),
			procedures: this.getProcedures(),
			validateOnCreate: false, // Already validated
		})
	}

	clear(): this {
		this.#nodes.clear()
		this.#transitions.clear()
		this.#procedures.clear()
		return this
	}

	// ---- Subscription Methods ----

	onNodeAdded(callback: (node: Node) => void): Unsubscribe {
		this.#nodeAddedListeners. add(callback)
		return () => {
			this.#nodeAddedListeners.delete(callback)
		}
	}

	onNodeRemoved(callback: (nodeId: string) => void): Unsubscribe {
		this.#nodeRemovedListeners.add(callback)
		return () => {
			this.#nodeRemovedListeners.delete(callback)
		}
	}

	onTransitionAdded(callback: (transition: Transition) => void): Unsubscribe {
		this.#transitionAddedListeners.add(callback)
		return () => {
			this.#transitionAddedListeners.delete(callback)
		}
	}

	onTransitionRemoved(
		callback: (from: string, to: string) => void,
	): Unsubscribe {
		this.#transitionRemovedListeners.add(callback)
		return () => {
			this.#transitionRemovedListeners.delete(callback)
		}
	}

	onValidation(
		callback: (results: readonly ValidationResult[]) => void,
	): Unsubscribe {
		this.#validationListeners. add(callback)
		return () => {
			this.#validationListeners.delete(callback)
		}
	}

	// ---- Export/Import Methods ----

	toJSON(): string {
		const definition: GraphDefinition = {
			nodes: this.getNodes(),
			transitions: this.getTransitions(),
			procedures: this. getProcedures(),
		}
		return JSON.stringify(definition, null, 2)
	}

	toYAML(): string {
		// Simple YAML serialization without external dependencies
		const lines: string[] = []

		lines.push('nodes:')
		for (const node of this.#nodes.values()) {
			lines.push(`  - id: "${node.id}"`)
			if (node.label) {
				lines.push(`    label: "${node.label}"`)
			}
			if (node.type) {
				lines.push(`    type: "${node.type}"`)
			}
		}

		lines.push('')
		lines.push('transitions:')
		for (const transition of this.#transitions.values()) {
			lines.push(`  - from: "${transition.from}"`)
			lines.push(`    to: "${transition.to}"`)
			lines.push(`    weight: ${transition.weight}`)
			lines.push(`    actor: "${transition.actor}"`)
		}

		if (this.#procedures.size > 0) {
			lines.push('')
			lines.push('procedures:')
			for (const procedure of this.#procedures.values()) {
				lines.push(`  - id: "${procedure.id}"`)
				lines.push('    actions: ')
				for (const action of procedure.actions) {
					lines.push(`      - "${action}"`)
				}
			}
		}

		return lines.join('\n')
	}

	fromJSON(json: string): this {
		let definition: GraphDefinition
		try {
			definition = JSON.parse(json) as GraphDefinition
		} catch (error) {
			const data = error instanceof Error ? { cause: error } : undefined
			throw new ActionLoopError('IMPORT_FAILED', 'Failed to parse JSON', data)
		}

		return this.fromDefinition(definition)
	}

	fromYAML(yaml: string): this {
		// Simple YAML parsing without external dependencies
		// Supports basic structure only
		try {
			const nodes: NodeInput[] = []
			const transitions: TransitionInput[] = []
			const procedures: ProcedureInput[] = []

			let currentSection: 'nodes' | 'transitions' | 'procedures' | null = null
			let currentItem: Record<string, unknown> | null = null
			let currentActions: string[] = []

			const lines = yaml.split('\n')

			for (const line of lines) {
				const trimmed = line.trim()

				if (trimmed === '' || trimmed.startsWith('#')) {
					continue
				}

				if (trimmed === 'nodes:') {
					currentSection = 'nodes'
					continue
				}
				if (trimmed === 'transitions:') {
					currentSection = 'transitions'
					continue
				}
				if (trimmed === 'procedures:') {
					currentSection = 'procedures'
					continue
				}

				if (trimmed.startsWith('- ')) {
					// Save previous item
					if (currentItem && currentSection) {
						if (currentSection === 'nodes') {
							this.#saveNodeFromYAML(nodes, currentItem)
						} else if (currentSection === 'transitions') {
							this.#saveTransitionFromYAML(transitions, currentItem)
						} else if (currentSection === 'procedures') {
							this.#saveProcedureFromYAML(procedures, currentItem, currentActions)
							currentActions = []
						}
					}

					// Start new item
					const content = trimmed.slice(2)
					if (content.includes(':')) {
						const splitIndex = content.indexOf(':')
						const key = content.slice(0, splitIndex).trim()
						const value = content.slice(splitIndex + 1).trim()
						currentItem = {}
						currentItem[key] = parseYAMLValue(value)
					} else {
						// It's an array item for actions
						currentActions.push(parseYAMLValue(content) as string)
					}
				} else if (trimmed.includes(':') && currentItem) {
					const colonIndex = trimmed.indexOf(':')
					const key = trimmed.slice(0, colonIndex).trim()
					const value = trimmed.slice(colonIndex + 1).trim()

					if (key === 'actions') {
						// Skip, actions are parsed as array items
					} else {
						currentItem[key] = parseYAMLValue(value)
					}
				}
			}

			// Save last item
			if (currentItem && currentSection) {
				if (currentSection === 'nodes') {
					this.#saveNodeFromYAML(nodes, currentItem)
				} else if (currentSection === 'transitions') {
					this.#saveTransitionFromYAML(transitions, currentItem)
				} else if (currentSection === 'procedures') {
					this.#saveProcedureFromYAML(procedures, currentItem, currentActions)
				}
			}

			return this.fromDefinition({
				nodes,
				transitions,
				procedures,
			})
		} catch (error) {
			if (error instanceof ActionLoopError) {
				throw error
			}
			const data = error instanceof Error ? { cause: error } : undefined
			throw new ActionLoopError('IMPORT_FAILED', 'Failed to parse YAML', data)
		}
	}

	#saveNodeFromYAML(nodes: NodeInput[], item: Record<string, unknown>): void {
		const id = item.id
		if (typeof id !== 'string') return

		const node = Object.assign(
			{ id },
			typeof item.label === 'string' ? { label: item.label } : {},
			typeof item.type === 'string' ? { type: item.type as NodeType } : {},
		) as NodeInput
		nodes.push(node)
	}

	#saveTransitionFromYAML(transitions: TransitionInput[], item: Record<string, unknown>): void {
		const from = item.from
		const to = item.to
		const weight = item.weight
		const actor = item.actor

		if (
			typeof from !== 'string' ||
			typeof to !== 'string' ||
			typeof weight !== 'number' ||
			typeof actor !== 'string'
		) {
			return
		}

		transitions.push({
			from,
			to,
			weight,
			actor: actor as Actor,
		})
	}

	#saveProcedureFromYAML(
		procedures: ProcedureInput[],
		item: Record<string, unknown>,
		actions: string[],
	): void {
		const id = item.id
		if (typeof id !== 'string') return

		procedures.push({
			id,
			actions,
		})
	}

	fromDefinition(definition: GraphDefinition): this {
		this.clear()

		if (definition.nodes) {
			for (const node of definition.nodes) {
				this.addNode(node)
			}
		}

		for (const transition of definition.transitions) {
			this.addTransition(transition)
		}

		if (definition.procedures) {
			for (const procedure of definition.procedures) {
				this.addProcedure(procedure)
			}
		}

		return this
	}

	// ---- Lifecycle Methods ----

	destroy(): void {
		this.#nodeAddedListeners.clear()
		this.#nodeRemovedListeners.clear()
		this.#transitionAddedListeners.clear()
		this.#transitionRemovedListeners. clear()
		this.#validationListeners.clear()
		this.clear()
	}
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Workflow Builder.
 *
 * @param options - Optional builder configuration
 * @returns Workflow builder interface
 *
 * @example
 * ```ts
 * import { createWorkflowBuilder } from '@mikesaintsg/actionloop'
 *
 * const builder = createWorkflowBuilder()
 * builder.addNode({ id: 'login' })
 * builder.addTransition({ from: 'login', to: 'dashboard', weight: 1, actor: 'user' })
 * const graph = builder.build()
 * ```
 */
export function createWorkflowBuilder(
	options?:  WorkflowBuilderOptions,
): WorkflowBuilderInterface {
	return new WorkflowBuilder(options)
}
