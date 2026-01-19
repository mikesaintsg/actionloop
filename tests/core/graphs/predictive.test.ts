/**
 * @mikesaintsg/actionloop
 *
 * Tests for PredictiveGraph.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
	createProceduralGraph,
	createPredictiveGraph,
	type ProceduralGraphInterface,
	type PredictiveGraphInterface,
} from '@mikesaintsg/actionloop'

describe('PredictiveGraph', () => {
	let procedural: ProceduralGraphInterface
	let predictive: PredictiveGraphInterface

	beforeEach(() => {
		procedural = createProceduralGraph({
			transitions: [
				{ from: 'a', to: 'b', weight: 1, actor: 'user' },
				{ from: 'a', to: 'c', weight: 1, actor: 'user' },
				{ from: 'b', to: 'c', weight: 1, actor: 'user' },
			],
			validateOnCreate: false,
		})
	})

	describe('creation', () => {
		it('creates predictive graph from procedural graph', () => {
			predictive = createPredictiveGraph(procedural)
			expect(predictive.getModelId()).toBeDefined()
		})

		it('accepts decay configuration', () => {
			predictive = createPredictiveGraph(procedural, {
				decayAlgorithm: 'ewma',
				decayFactor: 0.5,
			})
			const config = predictive.getDecayConfig()
			expect(config.algorithm).toBe('ewma')
			expect(config.decayFactor).toBe(0.5)
		})
	})

	describe('weight accessors', () => {
		beforeEach(() => {
			predictive = createPredictiveGraph(procedural)
		})

		it('getWeight returns 0 for untracked transition', () => {
			expect(predictive.getWeight('a', 'b', 'user')).toBe(0)
		})

		it('hasWeight returns false for untracked transition', () => {
			expect(predictive.hasWeight('a', 'b', 'user')).toBe(false)
		})
	})

	describe('weight mutators', () => {
		beforeEach(() => {
			predictive = createPredictiveGraph(procedural)
		})

		it('updateWeight increments transition weight', () => {
			predictive.updateWeight('a', 'b', 'user')
			expect(predictive.getWeight('a', 'b', 'user')).toBeGreaterThan(0)
		})

		it('setWeight sets explicit weight value', () => {
			predictive.setWeight('a', 'b', 'user', 5.0)
			expect(predictive.getWeight('a', 'b', 'user')).toBe(5.0)
		})

		it('updateWeight throws for invalid transition', () => {
			expect(() => predictive.updateWeight('a', 'z', 'user')).toThrow()
		})

		it('hasWeight returns true after update', () => {
			predictive.updateWeight('a', 'b', 'user')
			expect(predictive.hasWeight('a', 'b', 'user')).toBe(true)
		})
	})

	describe('weight retrieval', () => {
		beforeEach(() => {
			predictive = createPredictiveGraph(procedural)
			predictive.setWeight('a', 'b', 'user', 3.0)
			predictive.setWeight('a', 'c', 'user', 1.0)
		})

		it('getWeights returns all weighted transitions from node', () => {
			const weights = predictive.getWeights('a', 'user')
			expect(weights.length).toBe(2)
		})

		it('getWeights returns transitions sorted by weight', () => {
			const weights = predictive.getWeights('a', 'user')
			expect(weights[0]?.weight).toBeGreaterThanOrEqual(weights[1]?.weight ?? 0)
		})
	})

	describe('decay', () => {
		beforeEach(() => {
			predictive = createPredictiveGraph(procedural, {
				decayAlgorithm: 'ewma',
				decayFactor: 0.5,
			})
		})

		it('applyDecay reduces weights', () => {
			predictive.setWeight('a', 'b', 'user', 1.0)
			const beforeDecay = predictive.getWeight('a', 'b', 'user')
			predictive.applyDecay()
			const afterDecay = predictive.getWeight('a', 'b', 'user')
			expect(afterDecay).toBeLessThan(beforeDecay)
		})

		it('applyDecay returns count of decayed weights', () => {
			predictive.setWeight('a', 'b', 'user', 1.0)
			predictive.setWeight('a', 'c', 'user', 1.0)
			const count = predictive.applyDecay()
			expect(count).toBe(2)
		})
	})

	describe('clear', () => {
		beforeEach(() => {
			predictive = createPredictiveGraph(procedural)
			predictive.setWeight('a', 'b', 'user', 1.0)
			predictive.setWeight('a', 'c', 'system', 1.0)
		})

		it('clear removes all weights', () => {
			predictive.clear()
			expect(predictive.hasWeight('a', 'b', 'user')).toBe(false)
			expect(predictive.hasWeight('a', 'c', 'system')).toBe(false)
		})

		it('clearActor removes weights for specific actor', () => {
			predictive.clearActor('user')
			expect(predictive.hasWeight('a', 'b', 'user')).toBe(false)
			expect(predictive.hasWeight('a', 'c', 'system')).toBe(true)
		})
	})

	describe('preload', () => {
		it('preload seeds weights from historical data', () => {
			predictive = createPredictiveGraph(procedural)
			predictive.preload([
				{ from: 'a', to: 'b', actor: 'user', count: 10 },
			])
			expect(predictive.getWeight('a', 'b', 'user')).toBeGreaterThan(0)
		})
	})

	describe('export/import', () => {
		it('export returns serializable data', () => {
			predictive = createPredictiveGraph(procedural)
			predictive.setWeight('a', 'b', 'user', 1.0)
			const exported = predictive.export()
			expect(exported.version).toBe(1)
			expect(exported.modelId).toBe(predictive.getModelId())
			expect(exported.weights.length).toBe(1)
		})

		it('import restores weights from export', () => {
			predictive = createPredictiveGraph(procedural)
			predictive.setWeight('a', 'b', 'user', 5.0)
			const exported = predictive.export()

			// Create new predictive graph and import
			const newPredictive = createPredictiveGraph(procedural)
			newPredictive.import(exported)

			expect(newPredictive.getWeight('a', 'b', 'user')).toBe(5.0)
		})
	})

	describe('statistics', () => {
		it('getStats returns correct statistics', () => {
			predictive = createPredictiveGraph(procedural)
			predictive.updateWeight('a', 'b', 'user')
			predictive.updateWeight('a', 'c', 'user')

			const stats = predictive.getStats()
			expect(stats.nodeCount).toBe(3)
			expect(stats.transitionCount).toBe(3)
			expect(stats.totalWeightUpdates).toBe(2)
			expect(stats.modelId).toBe(predictive.getModelId())
		})
	})

	describe('subscriptions', () => {
		beforeEach(() => {
			predictive = createPredictiveGraph(procedural)
		})

		it('onWeightUpdate notifies on weight changes', () => {
			let called = false
			const unsubscribe = predictive.onWeightUpdate(() => {
				called = true
			})

			predictive.updateWeight('a', 'b', 'user')

			expect(called).toBe(true)
			unsubscribe()
		})

		it('onDecay notifies on decay', () => {
			let called = false
			const unsubscribe = predictive.onDecay(() => {
				called = true
			})

			predictive.setWeight('a', 'b', 'user', 1.0)
			predictive.applyDecay()

			expect(called).toBe(true)
			unsubscribe()
		})
	})

	describe('lifecycle', () => {
		it('destroy cleans up resources', () => {
			predictive = createPredictiveGraph(procedural)
			expect(() => predictive.destroy()).not.toThrow()
		})
	})
})
