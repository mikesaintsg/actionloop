/**
 * @mikesaintsg/actionloop
 *
 * Tests for ActionLoopContextFormatter.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
	createActionLoopContextFormatter,
	type ActionLoopContextFormatterInterface,
	type DetailedPrediction,
	type ConfidenceFactors,
} from '@mikesaintsg/actionloop'
import type { TransitionEvent, EngagementState } from '@mikesaintsg/core'

describe('ActionLoopContextFormatter', () => {
	let formatter: ActionLoopContextFormatterInterface

	const createMockPrediction = (overrides?: Partial<DetailedPrediction>): DetailedPrediction => {
		const factors: ConfidenceFactors = {
			frequency: 0.8,
			recency: 0.6,
			engagement: 0.7,
			sampleSize: 0.5,
		}

		return {
			predictions: [
				{
					nodeId: 'dashboard',
					score: 5.0,
					baseWeight: 1.0,
					predictiveWeight: 4.0,
					confidence: 0.8,
					factors,
				},
				{
					nodeId: 'settings',
					score: 3.0,
					baseWeight: 1.0,
					predictiveWeight: 2.0,
					confidence: 0.6,
					factors,
				},
			],
			currentNode: 'login',
			context: {
				actor: 'user',
				sessionId: 'session-1',
				path: '/app',
				count: 5,
			},
			computedAt: Date.now(),
			warmupComplete: true,
			transitionCount: 150,
			...overrides,
		}
	}

	const createMockEvents = (count = 3): readonly TransitionEvent[] => {
		const events: TransitionEvent[] = []
		const baseTime = Date.now() - 10000

		for (let i = 0; i < count; i++) {
			events.push({
				id: `event-${i}`,
				timestamp: baseTime + i * 1000,
				sessionId: 'session-1',
				actor: 'user',
				from: `node-${i}`,
				to: `node-${i + 1}`,
				path: '/app',
				engagement: 'active' as EngagementState,
				dwell: {
					nodeId: `node-${i}`,
					enterTime: baseTime + i * 1000 - 500,
					exitTime: baseTime + i * 1000,
					activeTime: 450,
					idleTime: 50,
					engagement: 'active' as EngagementState,
					engagementScore: 0.9,
				},
			})
		}

		return events
	}

	beforeEach(() => {
		formatter = createActionLoopContextFormatter({
			maxRecentEvents: 10,
			includePatterns: false,
			includeDwell: true,
		})
	})

	describe('creation', () => {
		it('creates formatter with default options', () => {
			const defaultFormatter = createActionLoopContextFormatter()
			expect(defaultFormatter).toBeDefined()
		})

		it('creates formatter with custom options', () => {
			const customFormatter = createActionLoopContextFormatter({
				maxRecentEvents: 5,
				includePatterns: true,
				getNodeLabel: (id) => `Label: ${id}`,
			})
			expect(customFormatter).toBeDefined()
		})
	})

	describe('format', () => {
		it('formats predictions and events into LLM context', () => {
			const predictions = createMockPrediction()
			const events = createMockEvents()

			const context = formatter.format(predictions, events)

			expect(context.currentNode).toBe('login')
			expect(context.predictions).toHaveLength(2)
			expect(context.warmupComplete).toBe(true)
			expect(context.transitionCount).toBe(150)
			expect(context.recentActivity).toHaveLength(3)
		})

		it('includes engagement state from most recent event', () => {
			const predictions = createMockPrediction()
			const events = createMockEvents()

			const context = formatter.format(predictions, events)

			expect(context.engagement).toBe('active')
		})

		it('formats predictions with confidence percentages', () => {
			const predictions = createMockPrediction()
			const events = createMockEvents()

			const context = formatter.format(predictions, events)

			expect(context.predictions[0]?.confidencePercent).toBe(80)
			expect(context.predictions[0]?.nodeId).toBe('dashboard')
		})

		it('limits predictions to top 5', () => {
			const manyPredictions = createMockPrediction({
				predictions: Array(10).fill(null).map((_, i) => ({
					nodeId: `node-${i}`,
					score: 10 - i,
					baseWeight: 1,
					predictiveWeight: 9 - i,
					confidence: 0.9 - i * 0.05,
					factors: {
						frequency: 0.8,
						recency: 0.6,
						engagement: 0.7,
						sampleSize: 0.5,
					},
				})),
			})
			const events = createMockEvents()

			const context = formatter.format(manyPredictions, events)

			expect(context.predictions).toHaveLength(5)
		})

		it('uses custom node label resolver', () => {
			const customFormatter = createActionLoopContextFormatter({
				getNodeLabel: (id) => `Custom: ${id}`,
			})
			const predictions = createMockPrediction()
			const events = createMockEvents()

			const context = customFormatter.format(predictions, events)

			expect(context.predictions[0]?.label).toBe('Custom: dashboard')
		})

		it('includes dwell times in activity summary', () => {
			const predictions = createMockPrediction()
			const events = createMockEvents()

			const context = formatter.format(predictions, events)

			// Dwell seconds should be included
			const activityWithDwell = context.recentActivity.find(a => a.dwellSeconds !== undefined)
			expect(activityWithDwell).toBeDefined()
		})

		it('excludes patterns when not requested', () => {
			const predictions = createMockPrediction()
			const events = createMockEvents()

			const context = formatter.format(predictions, events)

			expect(context.patterns).toBeUndefined()
		})

		it('includes patterns when requested', () => {
			const patternFormatter = createActionLoopContextFormatter({
				includePatterns: true,
			})
			const predictions = createMockPrediction()
			const events = createMockEvents(10)

			const context = patternFormatter.format(predictions, events)

			expect(context.patterns).toBeDefined()
			expect(context.patterns?.frequentPaths).toBeDefined()
		})

		it('allows override options per call', () => {
			const predictions = createMockPrediction()
			const events = createMockEvents(20)

			const context = formatter.format(predictions, events, {
				maxRecentEvents: 5,
			})

			expect(context.recentActivity).toHaveLength(5)
		})
	})

	describe('toNaturalLanguage', () => {
		it('formats context as natural language text', () => {
			const predictions = createMockPrediction()
			const events = createMockEvents()
			const context = formatter.format(predictions, events)

			const text = formatter.toNaturalLanguage(context)

			expect(text).toContain('Current location: login')
			expect(text).toContain('User engagement: active')
			expect(text).toContain('Predicted next actions')
		})

		it('shows warmup note when not complete', () => {
			const predictions = createMockPrediction({ warmupComplete: false })
			const events = createMockEvents()
			const context = formatter.format(predictions, events)

			const text = formatter.toNaturalLanguage(context)

			expect(text).toContain('Predictions will improve with more usage data')
		})

		it('includes pattern insights when available', () => {
			const patternFormatter = createActionLoopContextFormatter({
				includePatterns: true,
			})
			const predictions = createMockPrediction()
			const events = createMockEvents(10)
			const context = patternFormatter.format(predictions, events)

			const text = patternFormatter.toNaturalLanguage(context)

			expect(text).toContain('Pattern insights')
		})
	})

	describe('toJSON', () => {
		it('formats context as JSON string', () => {
			const predictions = createMockPrediction()
			const events = createMockEvents()
			const context = formatter.format(predictions, events)

			const json = formatter.toJSON(context)
			const parsed = JSON.parse(json)

			expect(parsed.currentNode).toBe('login')
			expect(parsed.predictions).toHaveLength(2)
		})

		it('produces valid JSON with all fields', () => {
			const predictions = createMockPrediction()
			const events = createMockEvents()
			const context = formatter.format(predictions, events)

			const json = formatter.toJSON(context)

			expect(() => JSON.parse(json)).not.toThrow()
		})
	})

	describe('reasoning formatting', () => {
		it('formats high frequency as "frequently visited"', () => {
			const predictions = createMockPrediction()
			const events = createMockEvents()
			const context = formatter.format(predictions, events)

			expect(context.predictions[0]?.reasoning).toContain('frequently visited')
		})
	})
})
