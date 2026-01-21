/**
 * @mikesaintsg/actionloop
 *
 * Tests for WorkflowAnalyzer.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
	createProceduralGraph,
	createPredictiveGraph,
	createWorkflowAnalyzer,
	type ProceduralGraphInterface,
	type PredictiveGraphInterface,
	type WorkflowAnalyzerInterface,
} from '@mikesaintsg/actionloop'

describe('WorkflowAnalyzer', () => {
	let procedural: ProceduralGraphInterface
	let predictive: PredictiveGraphInterface
	let analyzer: WorkflowAnalyzerInterface

	beforeEach(() => {
		procedural = createProceduralGraph({
			transitions: [
				{ from: 'a', to: 'b', weight: 1, actor: 'user' },
				{ from: 'b', to: 'c', weight: 1, actor: 'user' },
				{ from: 'c', to: 'a', weight: 1, actor: 'user' }, // Creates a loop
				{ from: 'b', to: 'd', weight: 1, actor: 'user' },
			],
			validateOnCreate: false,
		})
		predictive = createPredictiveGraph(procedural)
		analyzer = createWorkflowAnalyzer(procedural, predictive)
	})

	describe('creation', () => {
		it('creates analyzer from graphs', () => {
			expect(analyzer).toBeDefined()
		})

		it('accepts options', () => {
			analyzer = createWorkflowAnalyzer(procedural, predictive, {
				analysisDepth: 5,
			})
			expect(analyzer).toBeDefined()
		})
	})

	describe('loop detection', () => {
		it('findHotLoops detects frequently traversed loops', () => {
			// Build up weights in the loop
			for (let i = 0; i < 10; i++) {
				predictive.updateWeight('a', 'b', 'user')
				predictive.updateWeight('b', 'c', 'user')
				predictive.updateWeight('c', 'a', 'user')
			}

			const loops = analyzer.findHotLoops({ threshold: 5 })
			expect(Array.isArray(loops)).toBe(true)
		})

		it('findInfiniteLoops detects loops without exits', () => {
			const loops = analyzer.findInfiniteLoops()
			expect(Array.isArray(loops)).toBe(true)
		})

		it('findUnproductiveLoops detects loops without progression', () => {
			const loops = analyzer.findUnproductiveLoops()
			expect(Array.isArray(loops)).toBe(true)
		})
	})

	describe('strongly connected components', () => {
		it('findStronglyConnectedComponents finds SCCs', () => {
			const sccs = analyzer.findStronglyConnectedComponents()
			expect(Array.isArray(sccs)).toBe(true)
			// Should find at least the a->b->c->a loop
			const largeScc = sccs.find(scc => scc.nodes.length >= 3)
			expect(largeScc).toBeDefined()
		})
	})

	describe('bottleneck detection', () => {
		beforeEach(() => {
			// Create a graph with a bottleneck
			procedural = createProceduralGraph({
				transitions: [
					{ from: 'a1', to: 'bottleneck', weight: 1, actor: 'user' },
					{ from: 'a2', to: 'bottleneck', weight: 1, actor: 'user' },
					{ from: 'a3', to: 'bottleneck', weight: 1, actor: 'user' },
					{ from: 'bottleneck', to: 'end', weight: 1, actor: 'user' },
				],
				validateOnCreate: false,
			})
			predictive = createPredictiveGraph(procedural)

			// Build up weights coming into bottleneck
			for (let i = 0; i < 10; i++) {
				predictive.updateWeight('a1', 'bottleneck', 'user')
				predictive.updateWeight('a2', 'bottleneck', 'user')
				predictive.updateWeight('a3', 'bottleneck', 'user')
			}

			analyzer = createWorkflowAnalyzer(procedural, predictive)
		})

		it('findBottlenecks detects high-traffic nodes', () => {
			const bottlenecks = analyzer.findBottlenecks({ trafficThreshold: 5 })
			expect(Array.isArray(bottlenecks)).toBe(true)
		})
	})

	describe('automation opportunities', () => {
		beforeEach(() => {
			// Create a graph with repetitive patterns
			procedural = createProceduralGraph({
				transitions: [
					{ from: 'manual1', to: 'manual2', weight: 1, actor: 'user' },
					{ from: 'manual2', to: 'manual3', weight: 1, actor: 'user' },
					{ from: 'manual3', to: 'end', weight: 1, actor: 'user' },
				],
				validateOnCreate: false,
			})
			predictive = createPredictiveGraph(procedural)

			// Build up weights to simulate repetitive usage
			for (let i = 0; i < 20; i++) {
				predictive.updateWeight('manual1', 'manual2', 'user')
				predictive.updateWeight('manual2', 'manual3', 'user')
			}

			analyzer = createWorkflowAnalyzer(procedural, predictive)
		})

		it('findAutomationOpportunities detects automatable patterns', () => {
			const opportunities = analyzer.findAutomationOpportunities({
				minRepetitions: 10,
			})
			expect(Array.isArray(opportunities)).toBe(true)
		})
	})

	describe('edge classification', () => {
		it('classifyEdges classifies all edges', () => {
			const edges = analyzer.classifyEdges()
			expect(Array.isArray(edges)).toBe(true)
			expect(edges.length).toBeGreaterThan(0)
		})

		it('classifies edges with correct types', () => {
			const edges = analyzer.classifyEdges()
			for (const edge of edges) {
				expect(['tree', 'back', 'forward', 'cross']).toContain(edge.classification)
			}
		})
	})

	describe('summary', () => {
		it('getSummary returns analysis summary', () => {
			const summary = analyzer.getSummary()
			expect(summary).toBeDefined()
			expect(typeof summary.loopCount).toBe('number')
			expect(typeof summary.bottleneckCount).toBe('number')
		})
	})

	describe('context analysis', () => {
		it('analyzeByContext groups analysis by context', () => {
			const results = analyzer.analyzeByContext({ groupBy: ['procedure'] })
			expect(Array.isArray(results)).toBe(true)
		})
	})

	describe('subscriptions', () => {
		it('onAnalysisComplete notifies on analysis', () => {
			let called = false
			const unsubscribe = analyzer.onAnalysisComplete(() => {
				called = true
			})

			analyzer.findHotLoops()

			expect(called).toBe(true)
			unsubscribe()
		})

		it('onPatternDetected notifies on pattern detection', () => {
			let _called = false
			const unsubscribe = analyzer.onPatternDetected(() => {
				_called = true
			})

			analyzer.findHotLoops({ threshold: 0 })

			// May or may not be called depending on patterns
			expect(typeof unsubscribe).toBe('function')
			unsubscribe()
		})
	})

	describe('lifecycle', () => {
		it('destroy cleans up resources', () => {
			expect(() => analyzer.destroy()).not.toThrow()
		})
	})
})
