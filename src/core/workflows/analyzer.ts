/**
 * @mikesaintsg/actionloop
 *
 * Workflow Analyzer implementation - pattern detection.
 */

import type {
	LoopInfo,
	LoopType,
	LoopDetectionOptions,
	BottleneckInfo,
	BottleneckDetectionOptions,
	AutomationOpportunity,
	AutomationType,
	AutomationDiscoveryOptions,
	SCC,
	ClassifiedEdge,
	EdgeClassification,
	ContextAnalysisOptions,
	ContextualAnalysisResult,
	PatternInfo,
	AnalysisSummary,
	WorkflowAnalyzerInterface,
	WorkflowAnalyzerOptions,
	ProceduralGraphInterface,
	PredictiveGraphInterface,
	Unsubscribe,
} from '../../types.js'

// ============================================================================
// Implementation
// ============================================================================

class WorkflowAnalyzer implements WorkflowAnalyzerInterface {
	readonly #procedural: ProceduralGraphInterface
	readonly #predictive: PredictiveGraphInterface
	readonly #analysisDepth: number

	readonly #analysisCompleteListeners: Set<
		(analysisType: string, results: unknown) => void
	>
	readonly #patternDetectedListeners: Set<(pattern: PatternInfo) => void>

	constructor(
		procedural: ProceduralGraphInterface,
		predictive: PredictiveGraphInterface,
		options: WorkflowAnalyzerOptions = {}
	) {
		this.#procedural = procedural
		this. #predictive = predictive
		this.#analysisDepth = options.analysisDepth ?? 10

		this.#analysisCompleteListeners = new Set()
		this.#patternDetectedListeners = new Set()

		if (options.onAnalysisComplete) {
			this.#analysisCompleteListeners.add(options.onAnalysisComplete)
		}
		if (options.onPatternDetected) {
			this.#patternDetectedListeners.add(options.onPatternDetected)
		}
	}

	#emitAnalysisComplete(type:  string, results: unknown): void {
		for (const listener of this.#analysisCompleteListeners) {
			listener(type, results)
		}
	}

	#emitPatternDetected(pattern: PatternInfo): void {
		for (const listener of this.#patternDetectedListeners) {
			listener(pattern)
		}
	}

	// ---- Loop Detection Methods ----

	findHotLoops(options?:  LoopDetectionOptions): readonly LoopInfo[] {
		const threshold = options?.threshold ?? 5
		const sccs = this.findStronglyConnectedComponents()
		const loops:  LoopInfo[] = []

		for (const scc of sccs) {
			if (scc.nodes.length < 2) continue

			// Calculate frequency based on predictive weights
			let totalWeight = 0
			let transitionCount = 0

			for (const nodeId of scc.nodes) {
				const weights = this.#predictive.getWeights(nodeId, 'user')
				for (const weight of weights) {
					if (scc.nodes.includes(weight.to)) {
						totalWeight += weight.predictiveWeight
						transitionCount++
					}
				}
			}

			const avgWeight = transitionCount > 0 ? totalWeight / transitionCount : 0

			if (avgWeight >= threshold) {
				loops.push({
					nodes: scc.nodes,
					frequency: avgWeight,
					avgDuration: 0, // Would need session data
					loopType: 'hot' as LoopType,
					exitTransitions: scc.exitPoints,
				})
			}
		}

		this.#emitAnalysisComplete('hotLoops', loops)
		return loops
	}

	findInfiniteLoops(options?: LoopDetectionOptions): readonly LoopInfo[] {
		const maxLength = options?.maxLength ?? 100
		const sccs = this. findStronglyConnectedComponents()
		const loops: LoopInfo[] = []

		for (const scc of sccs) {
			// Check if SCC has no exit transitions
			if (scc. exitPoints.length === 0 && scc.nodes.length > 0) {
				loops.push({
					nodes: scc.nodes,
					frequency: 0,
					avgDuration:  0,
					loopType: 'infinite' as LoopType,
					exitTransitions: [],
				})
			}
		}

		this.#emitAnalysisComplete('infiniteLoops', loops)
		return loops
	}

	findUnproductiveLoops(): readonly LoopInfo[] {
		const sccs = this.findStronglyConnectedComponents()
		const loops: LoopInfo[] = []

		for (const scc of sccs) {
			if (scc.nodes.length < 2) continue

			// Check for low progression (high loop-back, low forward movement)
			let loopBackWeight = 0
			let forwardWeight = 0

			for (const nodeId of scc.nodes) {
				const weights = this.#predictive.getWeights(nodeId, 'user')
				for (const weight of weights) {
					if (scc.nodes.includes(weight.to)) {
						loopBackWeight += weight.predictiveWeight
					} else {
						forwardWeight += weight.predictiveWeight
					}
				}
			}

			// Unproductive if loop-back significantly outweighs forward
			if (loopBackWeight > forwardWeight * 3) {
				loops.push({
					nodes: scc.nodes,
					frequency: loopBackWeight,
					avgDuration:  0,
					loopType: 'unproductive' as LoopType,
					exitTransitions: scc.exitPoints,
				})
			}
		}

		this.#emitAnalysisComplete('unproductiveLoops', loops)
		return loops
	}

	findHierarchicalLoops(): readonly LoopInfo[] {
		// Find nested loops by detecting SCCs that contain other SCCs
		const sccs = this.findStronglyConnectedComponents()
		const loops: LoopInfo[] = []

		for (const outer of sccs) {
			for (const inner of sccs) {
				if (outer === inner) continue
				if (inner.nodes.length >= outer.nodes.length) continue

				// Check if inner is subset of outer
				const isNested = inner.nodes.every((n) => outer.nodes.includes(n))
				if (isNested) {
					loops.push({
						nodes: inner.nodes,
						frequency: 0,
						avgDuration:  0,
						loopType: 'hierarchical' as LoopType,
						exitTransitions: inner.exitPoints,
					})
				}
			}
		}

		this.#emitAnalysisComplete('hierarchicalLoops', loops)
		return loops
	}

	findAutomatableLoops(): readonly LoopInfo[] {
		const sccs = this.findStronglyConnectedComponents()
		const loops: LoopInfo[] = []

		for (const scc of sccs) {
			if (scc.nodes.length < 2) continue

			// Check for repetitive patterns with system actors
			let systemWeight = 0
			let userWeight = 0

			for (const nodeId of scc.nodes) {
				const systemWeights = this.#predictive.getWeights(nodeId, 'system')
				const userWeights = this.#predictive.getWeights(nodeId, 'user')

				for (const w of systemWeights) {
					if (scc.nodes.includes(w.to)) {
						systemWeight += w.predictiveWeight
					}
				}
				for (const w of userWeights) {
					if (scc.nodes.includes(w. to)) {
						userWeight += w.predictiveWeight
					}
				}
			}

			// Automatable if system weight is significant or user pattern is repetitive
			if (systemWeight > 0 || userWeight > 10) {
				loops.push({
					nodes: scc.nodes,
					frequency: Math.max(systemWeight, userWeight),
					avgDuration: 0,
					loopType:  'automatable' as LoopType,
					exitTransitions: scc.exitPoints,
				})
			}
		}

		this.#emitAnalysisComplete('automatableLoops', loops)
		return loops
	}

	// ---- SCC Detection Methods ----

	findStronglyConnectedComponents(): readonly SCC[] {
		// Tarjan's algorithm
		const nodes = this.#procedural.getNodes()
		const sccs: SCC[] = []

		let index = 0
		const indices = new Map<string, number>()
		const lowlinks = new Map<string, number>()
		const onStack = new Set<string>()
		const stack:  string[] = []

		const strongConnect = (nodeId: string): void => {
			indices.set(nodeId, index)
			lowlinks.set(nodeId, index)
			index++
			stack.push(nodeId)
			onStack.add(nodeId)

			const transitions = this.#procedural.getTransitions(nodeId)
			for (const transition of transitions) {
				if (!indices.has(transition.to)) {
					strongConnect(transition.to)
					lowlinks.set(
						nodeId,
						Math.min(lowlinks.get(nodeId)!, lowlinks.get(transition.to)!)
					)
				} else if (onStack.has(transition.to)) {
					lowlinks.set(
						nodeId,
						Math.min(lowlinks.get(nodeId)!, indices.get(transition.to)!)
					)
				}
			}

			// If nodeId is a root node, pop the stack and generate an SCC
			if (lowlinks.get(nodeId) === indices.get(nodeId)) {
				const sccNodes: string[] = []
				let w:  string | undefined

				do {
					w = stack.pop()
					if (w) {
						onStack.delete(w)
						sccNodes.push(w)
					}
				} while (w !== nodeId)

				if (sccNodes.length > 0) {
					// Find entry and exit points
					const entryPoints:  string[] = []
					const exitPoints: string[] = []

					for (const n of sccNodes) {
						const incoming = this.#procedural.getTransitionsTo(n)
						const outgoing = this.#procedural. getTransitions(n)

						for (const t of incoming) {
							if (! sccNodes.includes(t.from)) {
								entryPoints. push(n)
								break
							}
						}

						for (const t of outgoing) {
							if (!sccNodes.includes(t.to)) {
								exitPoints.push(t.to)
							}
						}
					}

					sccs.push({
						id: `scc-${sccs.length}`,
						nodes: sccNodes,
						entryPoints: [... new Set(entryPoints)],
						exitPoints: [...new Set(exitPoints)],
					})
				}
			}
		}

		for (const node of nodes) {
			if (!indices.has(node.id)) {
				strongConnect(node.id)
			}
		}

		return sccs
	}

	findSCCKosaraju(): readonly SCC[] {
		// Kosaraju's algorithm
		const nodes = this.#procedural.getNodes()
		const visited = new Set<string>()
		const finishOrder:  string[] = []

		// First DFS to compute finish order
		const dfs1 = (nodeId: string): void => {
			visited.add(nodeId)
			const transitions = this.#procedural.getTransitions(nodeId)
			for (const t of transitions) {
				if (!visited.has(t.to)) {
					dfs1(t.to)
				}
			}
			finishOrder.push(nodeId)
		}

		for (const node of nodes) {
			if (!visited.has(node.id)) {
				dfs1(node.id)
			}
		}

		// Build reverse graph
		const reverseAdj = new Map<string, string[]>()
		for (const node of nodes) {
			reverseAdj.set(node. id, [])
		}
		const transitions = this.#procedural.getAllTransitions()
		for (const t of transitions) {
			reverseAdj.get(t. to)?.push(t.from)
		}

		// Second DFS on reverse graph
		visited.clear()
		const sccs: SCC[] = []

		const dfs2 = (nodeId: string, sccNodes: string[]): void => {
			visited.add(nodeId)
			sccNodes.push(nodeId)
			const neighbors = reverseAdj.get(nodeId) ?? []
			for (const neighbor of neighbors) {
				if (!visited.has(neighbor)) {
					dfs2(neighbor, sccNodes)
				}
			}
		}

		while (finishOrder.length > 0) {
			const nodeId = finishOrder.pop()!
			if (!visited.has(nodeId)) {
				const sccNodes: string[] = []
				dfs2(nodeId, sccNodes)

				if (sccNodes.length > 0) {
					sccs.push({
						id: `scc-${sccs.length}`,
						nodes: sccNodes,
						entryPoints: [],
						exitPoints: [],
					})
				}
			}
		}

		return sccs
	}

	// ---- Edge Classification Methods ----

	classifyEdges(): readonly ClassifiedEdge[] {
		const nodes = this.#procedural.getNodes()
		const classified: ClassifiedEdge[] = []

		const discovered = new Map<string, number>()
		const finished = new Map<string, number>()
		let time = 0

		const dfs = (nodeId: string, parent: string | null): void => {
			discovered.set(nodeId, time++)

			const transitions = this.#procedural.getTransitions(nodeId)
			for (const t of transitions) {
				let classification:  EdgeClassification

				if (! discovered.has(t.to)) {
					// Tree edge
					classification = 'tree'
					classified.push({ from: t.from, to: t.to, classification })
					dfs(t.to, nodeId)
				} else if (!finished.has(t.to)) {
					// Back edge (to ancestor)
					classification = 'back'
					classified.push({ from: t.from, to: t.to, classification })
				} else if (discovered.get(nodeId)! < discovered.get(t.to)!) {
					// Forward edge
					classification = 'forward'
					classified.push({ from: t. from, to: t.to, classification })
				} else {
					// Cross edge
					classification = 'cross'
					classified.push({ from: t.from, to: t. to, classification })
				}
			}

			finished.set(nodeId, time++)
		}

		for (const node of nodes) {
			if (!discovered.has(node.id)) {
				dfs(node.id, null)
			}
		}

		return classified
	}

	// ---- Bottleneck Detection Methods ----

	findBottlenecks(options?:  BottleneckDetectionOptions): readonly BottleneckInfo[] {
		const trafficThreshold = options?.trafficThreshold ?? 10
		const delayThreshold = options?.delayThreshold ?? 5000
		const bottlenecks: BottleneckInfo[] = []

		const nodes = this.#procedural.getNodes()

		for (const node of nodes) {
			const incoming = this.#procedural.getTransitionsTo(node. id)
			const outgoing = this.#procedural.getTransitions(node.id)

			// Calculate traffic based on predictive weights
			let incomingTraffic = 0
			let outgoingTraffic = 0

			for (const t of incoming) {
				const weights = this.#predictive.getWeights(t.from, 'user')
				const w = weights.find((w) => w.to === node.id)
				if (w) {
					incomingTraffic += w.predictiveWeight
				}
			}

			for (const t of outgoing) {
				const weights = this.#predictive.getWeights(node.id, 'user')
				const w = weights.find((w) => w.to === t.to)
				if (w) {
					outgoingTraffic += w.predictiveWeight
				}
			}

			// Bottleneck if high incoming and low outgoing ratio
			const congestionScore =
				outgoingTraffic > 0 ?  incomingTraffic / outgoingTraffic : incomingTraffic

			if (incomingTraffic >= trafficThreshold && congestionScore > 2) {
				bottlenecks.push({
					nodeId: node.id,
					incomingTraffic,
					outgoingTraffic,
					avgDelay: 0, // Would need session timing data
					maxDelay: 0,
					congestionScore,
				})
			}
		}

		this. #emitAnalysisComplete('bottlenecks', bottlenecks)
		return bottlenecks
	}

	// ---- Automation Discovery Methods ----

	findAutomationOpportunities(
		options?: AutomationDiscoveryOptions
	): readonly AutomationOpportunity[] {
		const minRepetitions = options?.minRepetitions ?? 5
		const minSequenceLength = options?.minSequenceLength ?? 2
		const maxSequenceLength = options?.maxSequenceLength ?? 10
		const opportunities: AutomationOpportunity[] = []

		// Find repetitive sequences in SCCs
		const sccs = this.findStronglyConnectedComponents()

		for (const scc of sccs) {
			if (scc.nodes.length < minSequenceLength) continue
			if (scc.nodes. length > maxSequenceLength) continue

			// Calculate total frequency
			let totalWeight = 0
			for (const nodeId of scc. nodes) {
				const weights = this.#predictive.getWeights(nodeId, 'user')
				for (const w of weights) {
					totalWeight += w.predictiveWeight
				}
			}

			const avgFrequency = totalWeight / scc. nodes.length

			if (avgFrequency >= minRepetitions) {
				// Determine automation type
				let automationType: AutomationType = 'robotic'
				if (avgFrequency > 20) {
					automationType = 'scheduled'
				} else if (avgFrequency > 10) {
					automationType = 'triggered'
				}

				const confidence = Math.min(avgFrequency / 20, 1)

				opportunities. push({
					sequence: scc.nodes,
					frequency: avgFrequency,
					avgDuration: 0,
					automationType,
					suggestion: `Automate sequence:  ${scc.nodes.join(' -> ')}`,
					confidence,
				})

				// Emit pattern detected
				this.#emitPatternDetected({
					sequence: scc.nodes,
					frequency: avgFrequency,
					avgDuration: 0,
					actors: ['user'],
				})
			}
		}

		this.#emitAnalysisComplete('automationOpportunities', opportunities)
		return opportunities
	}

	// ---- Context Analysis Methods ----

	analyzeByContext(
		options:  ContextAnalysisOptions
	): readonly ContextualAnalysisResult[] {
		// Simplified context analysis - would need session data for full implementation
		const results: ContextualAnalysisResult[] = []

		for (const grouping of options.groupBy) {
			if (grouping === 'procedure') {
				const procedures = this.#procedural.getProcedures()

				for (const procedure of procedures) {
					const patterns:  PatternInfo[] = []

					// Calculate frequency for procedure
					let totalWeight = 0
					for (let i = 0; i < procedure.actions.length - 1; i++) {
						const from = procedure.actions[i]
						const weights = this.#predictive.getWeights(from, 'user')
						const w = weights.find((w) => w.to === procedure.actions[i + 1])
						if (w) {
							totalWeight += w.predictiveWeight
						}
					}

					patterns.push({
						sequence: procedure.actions,
						frequency: totalWeight,
						avgDuration: 0,
						actors: ['user'],
					})

					results.push({
						groupKey: 'procedure',
						groupValue: procedure.id,
						patterns,
						recommendations: totalWeight > 10
							? ['High usage - consider optimization']
							: [],
					})
				}
			}
		}

		this.#emitAnalysisComplete('contextAnalysis', results)
		return results
	}

	compareContexts(
		context1: string,
		context2: string
	): readonly PatternInfo[] {
		// Simplified comparison - would need full context tracking
		return []
	}

	// ---- Statistics Methods ----

	getSummary(): AnalysisSummary {
		const loops = this.findHotLoops()
		const bottlenecks = this.findBottlenecks()
		const opportunities = this.findAutomationOpportunities()
		const sccs = this.findStronglyConnectedComponents()

		// Calculate average path length
		const nodes = this.#procedural.getNodes()
		let totalPathLength = 0
		let pathCount = 0

		for (const node of nodes) {
			const transitions = this.#procedural.getTransitions(node.id)
			totalPathLength += transitions.length
			pathCount++
		}

		const avgPathLength = pathCount > 0 ? totalPathLength / pathCount : 0

		// Get most frequent paths
		const patterns:  PatternInfo[] = []
		for (const scc of sccs. slice(0, 5)) {
			let freq = 0
			for (const nodeId of scc.nodes) {
				const weights = this.#predictive.getWeights(nodeId, 'user')
				for (const w of weights) {
					freq += w.predictiveWeight
				}
			}
			patterns.push({
				sequence: scc.nodes,
				frequency: freq / scc.nodes.length,
				avgDuration: 0,
				actors: ['user'],
			})
		}

		patterns.sort((a, b) => b.frequency - a.frequency)

		return {
			loopCount: loops.length,
			bottleneckCount: bottlenecks.length,
			automationOpportunityCount: opportunities.length,
			sccCount: sccs.length,
			avgPathLength,
			mostFrequentPaths: patterns.slice(0, 5),
		}
	}

	// ---- Subscription Methods ----

	onAnalysisComplete(
		callback:  (analysisType: string, results: unknown) => void
	): Unsubscribe {
		this.#analysisCompleteListeners.add(callback)
		return () => {
			this.#analysisCompleteListeners.delete(callback)
		}
	}

	onPatternDetected(callback: (pattern: PatternInfo) => void): Unsubscribe {
		this.#patternDetectedListeners.add(callback)
		return () => {
			this.#patternDetectedListeners.delete(callback)
		}
	}

	// ---- Lifecycle Methods ----

	destroy(): void {
		this.#analysisCompleteListeners.clear()
		this.#patternDetectedListeners.clear()
	}
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Workflow Analyzer.
 *
 * @param procedural - The procedural graph to analyze
 * @param predictive - The predictive graph with runtime weights
 * @param options - Optional analyzer configuration
 * @returns Workflow analyzer interface
 *
 * @example
 * ```ts
 * import { createWorkflowAnalyzer } from '@mikesaintsg/actionloop'
 *
 * const analyzer = createWorkflowAnalyzer(procedural, predictive)
 * const loops = analyzer.findHotLoops()
 * ```
 */
export function createWorkflowAnalyzer(
	procedural:  ProceduralGraphInterface,
	predictive: PredictiveGraphInterface,
	options?: WorkflowAnalyzerOptions
): WorkflowAnalyzerInterface {
	return new WorkflowAnalyzerImpl(procedural, predictive, options)
}
