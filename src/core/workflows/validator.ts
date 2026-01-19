/**
 * @mikesaintsg/actionloop
 *
 * Workflow Validator implementation - static analysis.
 */

import type {
	ValidationResult,
	ValidationSeverity,
	ValidationRule,
	GuardValidationResult,
	BoundaryCheck,
	WorkflowValidatorInterface,
	WorkflowValidatorOptions,
	ProceduralGraphInterface,
	Unsubscribe,
} from '../../types.js'
import { createTransitionKey } from '../../helpers.js'

// ============================================================================
// Implementation
// ============================================================================

class WorkflowValidator implements WorkflowValidatorInterface {
	readonly #procedural: ProceduralGraphInterface
	readonly #strictMode: boolean
	readonly #validateGuards: boolean
	readonly #customRules: readonly ValidationRule[]
	readonly #results: ValidationResult[]

	readonly #validationCompleteListeners: Set<
		(results: readonly ValidationResult[]) => void
	>

	constructor(
		procedural: ProceduralGraphInterface,
		options: WorkflowValidatorOptions = {}
	) {
		this.#procedural = procedural
		this.#strictMode = options.strictMode ?? false
		this.#validateGuards = options. validateGuards ?? true
		this.#customRules = options.customRules ?? []
		this.#results = []

		this.#validationCompleteListeners = new Set()

		if (options.onValidationComplete) {
			this.#validationCompleteListeners.add(options.onValidationComplete)
		}
	}

	// ---- Validation Methods ----

	runStaticChecks(): readonly ValidationResult[] {
		this.#results. length = 0

		// Check for dangling nodes
		const dangling = this.findDanglingNodes()
		for (const nodeId of dangling) {
			this.#results.push({
				passed: false,
				message: `Node '${nodeId}' has no outgoing transitions (dead end)`,
				severity: (this.#strictMode ? 'error' : 'warning') as ValidationSeverity,
				suggestion: 'Add outgoing transitions or mark as terminal node',
				nodeId,
			})
		}

		// Check for unreachable nodes
		const unreachable = this.findUnreachableNodes()
		for (const nodeId of unreachable) {
			this.#results.push({
				passed: false,
				message: `Node '${nodeId}' is unreachable from any start node`,
				severity: 'error' as ValidationSeverity,
				suggestion: 'Add incoming transitions or remove this node',
				nodeId,
			})
		}

		// Check boundary nodes
		const boundary = this.findMissingBoundaryNodes()
		if (boundary.missingStart) {
			this.#results.push({
				passed: false,
				message: 'Graph has no start nodes (all nodes have incoming transitions)',
				severity: (this.#strictMode ? 'error' : 'warning') as ValidationSeverity,
				suggestion: 'Ensure at least one node has no incoming transitions',
			})
		}

		// Validate guards if enabled
		if (this.#validateGuards) {
			const guardResults = this.validateGuards()
			for (const guard of guardResults) {
				if (!guard.valid) {
					this.#results.push({
						passed: false,
						message: `Invalid guard expression: ${guard.error}`,
						severity: 'error' as ValidationSeverity,
						suggestion: 'Fix the guard syntax',
						transitionKey: guard.transitionKey,
					})
				}
			}
		}

		// Validate procedures
		const procedureResults = this.validateProcedures()
		this.#results.push(...procedureResults)

		// Check connectivity
		const connectivity = this.checkConnectivity()
		if (!connectivity.passed) {
			this.#results.push(connectivity)
		}

		// Run custom rules
		for (const rule of this.#customRules) {
			const result = rule.validate(this. #procedural)
			this.#results.push(result)
		}

		// Emit validation complete
		for (const listener of this.#validationCompleteListeners) {
			listener(this.#results)
		}

		return this. #results
	}

	findDanglingNodes(): readonly string[] {
		const dangling: string[] = []
		const nodes = this.#procedural.getNodes()

		for (const node of nodes) {
			const outgoing = this.#procedural.getTransitions(node. id)
			const incoming = this.#procedural. getTransitionsTo(node.id)

			// A dangling node has incoming transitions but no outgoing
			if (outgoing.length === 0 && incoming.length > 0) {
				dangling.push(node.id)
			}
		}

		return dangling
	}

	findUnreachableNodes(): readonly string[] {
		const startNodes = this.#procedural. getStartNodes()
		if (startNodes.length === 0) {
			return [] // Can't determine reachability without start nodes
		}

		// BFS from all start nodes
		const reachable = new Set<string>(startNodes)
		const queue = [...startNodes]

		while (queue.length > 0) {
			const current = queue.shift()
			if (! current) continue

			const transitions = this.#procedural.getTransitions(current)
			for (const transition of transitions) {
				if (!reachable.has(transition.to)) {
					reachable.add(transition.to)
					queue.push(transition.to)
				}
			}
		}

		// Find unreachable nodes
		const unreachable: string[] = []
		const nodes = this.#procedural.getNodes()

		for (const node of nodes) {
			if (!reachable.has(node.id)) {
				unreachable.push(node.id)
			}
		}

		return unreachable
	}

	findMissingBoundaryNodes(): BoundaryCheck {
		const startNodes = this.#procedural. getStartNodes()
		const endNodes = this.#procedural.getEndNodes()

		return {
			hasStartNodes: startNodes.length > 0,
			hasEndNodes: endNodes.length > 0,
			startNodes,
			endNodes,
			missingStart: startNodes.length === 0 && this.#procedural.getNodes().length > 0,
			missingEnd: endNodes.length === 0 && this.#procedural.getNodes().length > 0,
		}
	}

	validateGuards(): readonly GuardValidationResult[] {
		const results: GuardValidationResult[] = []
		const transitions = this.#procedural.getAllTransitions()

		for (const transition of transitions) {
			const guard = transition.metadata?. guard
			if (!guard) continue

			const key = createTransitionKey(transition. from, transition.to)

			// Basic syntax validation (no actual evaluation)
			const valid = this.#isValidGuardSyntax(guard)

			results.push({
				transitionKey: key,
				guard,
				valid,
				error: valid ? undefined : 'Invalid guard expression syntax',
			})
		}

		return results
	}

	#isValidGuardSyntax(guard: string): boolean {
		// Basic syntax checks - ensure balanced parentheses and quotes
		let parenCount = 0
		let inString = false
		let stringChar = ''

		for (const char of guard) {
			if (inString) {
				if (char === stringChar) {
					inString = false
				}
			} else {
				if (char === '"' || char === "'") {
					inString = true
					stringChar = char
				} else if (char === '(') {
					parenCount++
				} else if (char === ')') {
					parenCount--
					if (parenCount < 0) return false
				}
			}
		}

		return parenCount === 0 && !inString
	}

	validateProcedures(): readonly ValidationResult[] {
		const results: ValidationResult[] = []
		const procedures = this.#procedural.getProcedures()

		for (const procedure of procedures) {
			// Check all actions exist
			for (const action of procedure.actions) {
				if (!this.#procedural.hasNode(action)) {
					results.push({
						passed: false,
						message: `Procedure '${procedure.id}' references unknown node '${action}'`,
						severity: 'error' as ValidationSeverity,
						suggestion: `Add node '${action}' or remove from procedure`,
					})
				}
			}

			// Check actions are connected in sequence
			for (let i = 0; i < procedure.actions.length - 1; i++) {
				const from = procedure.actions[i]
				const to = procedure.actions[i + 1]

				if (!this.#procedural.hasTransition(from, to)) {
					results.push({
						passed: false,
						message:  `Procedure '${procedure.id}' has disconnected actions:  '${from}' -> '${to}'`,
						severity: 'warning' as ValidationSeverity,
						suggestion: `Add transition from '${from}' to '${to}'`,
					})
				}
			}
		}

		return results
	}

	checkConnectivity(): ValidationResult {
		const nodes = this.#procedural.getNodes()
		if (nodes.length === 0) {
			return {
				passed: true,
				message: 'Empty graph is trivially connected',
				severity: 'info' as ValidationSeverity,
			}
		}

		// Check if graph is weakly connected (ignoring edge direction)
		const visited = new Set<string>()
		const adjacency = new Map<string, Set<string>>()

		// Build undirected adjacency
		for (const node of nodes) {
			adjacency.set(node.id, new Set())
		}

		const transitions = this.#procedural.getAllTransitions()
		for (const transition of transitions) {
			adjacency.get(transition.from)?.add(transition.to)
			adjacency.get(transition.to)?.add(transition.from)
		}

		// BFS from first node
		const startNode = nodes[0]. id
		const queue = [startNode]
		visited.add(startNode)

		while (queue.length > 0) {
			const current = queue.shift()
			if (! current) continue

			const neighbors = adjacency.get(current) ??  new Set()
			for (const neighbor of neighbors) {
				if (!visited.has(neighbor)) {
					visited.add(neighbor)
					queue.push(neighbor)
				}
			}
		}

		const isConnected = visited.size === nodes.length

		return {
			passed: isConnected,
			message: isConnected
				? 'Graph is fully connected'
				: `Graph is disconnected:  ${nodes.length - visited.size} node(s) unreachable`,
			severity: isConnected ? ('info' as ValidationSeverity) : ('error' as ValidationSeverity),
		}
	}

	checkCycles(): readonly string[][] {
		const cycles: string[][] = []
		const nodes = this.#procedural. getNodes()
		const visited = new Set<string>()
		const recursionStack = new Set<string>()
		const path:  string[] = []

		const dfs = (nodeId: string): void => {
			visited.add(nodeId)
			recursionStack.add(nodeId)
			path.push(nodeId)

			const transitions = this.#procedural.getTransitions(nodeId)
			for (const transition of transitions) {
				if (! visited.has(transition.to)) {
					dfs(transition.to)
				} else if (recursionStack.has(transition.to)) {
					// Found a cycle
					const cycleStart = path.indexOf(transition.to)
					const cycle = [... path.slice(cycleStart), transition.to]
					cycles.push(cycle)
				}
			}

			path.pop()
			recursionStack.delete(nodeId)
		}

		for (const node of nodes) {
			if (!visited.has(node.id)) {
				dfs(node.id)
			}
		}

		return cycles
	}

	// ---- State Methods ----

	isValid(): boolean {
		if (this.#results.length === 0) {
			this.runStaticChecks()
		}
		return this.getErrorCount() === 0
	}

	getErrorCount(): number {
		return this.#results. filter((r) => r.severity === 'error').length
	}

	getWarningCount(): number {
		return this.#results. filter((r) => r.severity === 'warning').length
	}

	getResults(): readonly ValidationResult[] {
		if (this.#results.length === 0) {
			this.runStaticChecks()
		}
		return this.#results
	}

	// ---- Subscription Methods ----

	onValidationComplete(
		callback: (results: readonly ValidationResult[]) => void
	): Unsubscribe {
		this. #validationCompleteListeners. add(callback)
		return () => {
			this.#validationCompleteListeners.delete(callback)
		}
	}

	// ---- Lifecycle Methods ----

	destroy(): void {
		this.#validationCompleteListeners.clear()
		this.#results.length = 0
	}
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Workflow Validator.
 *
 * @param procedural - The procedural graph to validate
 * @param options - Optional validator configuration
 * @returns Workflow validator interface
 *
 * @example
 * ```ts
 * import { createWorkflowValidator } from '@mikesaintsg/actionloop'
 *
 * const validator = createWorkflowValidator(procedural)
 * const results = validator.runStaticChecks()
 * ```
 */
export function createWorkflowValidator(
	procedural: ProceduralGraphInterface,
	options?:  WorkflowValidatorOptions
): WorkflowValidatorInterface {
	return new WorkflowValidatorImpl(procedural, options)
}
