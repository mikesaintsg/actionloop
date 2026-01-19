/**
 * @mikesaintsg/actionloop
 *
 * Tests for WorkflowEngine.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
	createProceduralGraph,
	createPredictiveGraph,
	createWorkflowEngine,
	type ProceduralGraphInterface,
	type PredictiveGraphInterface,
	type WorkflowEngineInterface,
} from '@mikesaintsg/actionloop'

describe('WorkflowEngine', () => {
	let procedural: ProceduralGraphInterface
	let predictive: PredictiveGraphInterface
	let engine: WorkflowEngineInterface

	beforeEach(() => {
		procedural = createProceduralGraph({
			transitions: [
				{ from: 'login', to: 'dashboard', weight: 1, actor: 'user' },
				{ from: 'dashboard', to: 'settings', weight: 1, actor: 'user' },
				{ from: 'dashboard', to: 'profile', weight: 1, actor: 'user' },
				{ from: 'settings', to: 'dashboard', weight: 1, actor: 'user' },
				{ from: 'profile', to: 'dashboard', weight: 1, actor: 'user' },
			],
			validateOnCreate: false,
		})
		predictive = createPredictiveGraph(procedural)
	})

	describe('creation', () => {
		it('creates engine with procedural and predictive graphs', () => {
			engine = createWorkflowEngine(procedural, predictive)
			expect(engine.getProceduralGraph()).toBe(procedural)
			expect(engine.getPredictiveGraph()).toBe(predictive)
		})

		it('accepts options', () => {
			engine = createWorkflowEngine(procedural, predictive, {
				validateTransitions: true,
				trackSessions: true,
			})
			expect(engine).toBeDefined()
		})
	})

	describe('transition validation', () => {
		beforeEach(() => {
			engine = createWorkflowEngine(procedural, predictive)
		})

		it('isValidTransition returns true for valid transition', () => {
			expect(engine.isValidTransition('login', 'dashboard')).toBe(true)
		})

		it('isValidTransition returns false for invalid transition', () => {
			expect(engine.isValidTransition('login', 'profile')).toBe(false)
		})

		it('getValidTransitions returns all valid transitions from node', () => {
			const transitions = engine.getValidTransitions('dashboard')
			expect(transitions.length).toBe(2)
		})
	})

	describe('recording transitions', () => {
		beforeEach(() => {
			engine = createWorkflowEngine(procedural, predictive)
		})

		it('recordTransition records a valid transition', () => {
			const session = engine.startSession('user')

			engine.recordTransition('login', 'dashboard', {
				actor: 'user',
				sessionId: session.id,
				path: '/dashboard',
			})

			const weight = predictive.getWeight('login', 'dashboard', 'user')
			expect(weight).toBeGreaterThan(0)
		})

		it('recordTransition throws for invalid transition when validation enabled', () => {
			engine = createWorkflowEngine(procedural, predictive, {
				validateTransitions: true,
			})

			const session = engine.startSession('user')

			expect(() => {
				engine.recordTransition('login', 'profile', {
					actor: 'user',
					sessionId: session.id,
					path: '/profile',
				})
			}).toThrow()
		})

		it('recordTransitions handles batch operations', () => {
			const session = engine.startSession('user')

			engine.recordTransitions([
				{
					from: 'login',
					to: 'dashboard',
					context: { actor: 'user', sessionId: session.id, path: '/dashboard' },
				},
				{
					from: 'dashboard',
					to: 'settings',
					context: { actor: 'user', sessionId: session.id, path: '/settings' },
				},
			])

			expect(predictive.getWeight('login', 'dashboard', 'user')).toBeGreaterThan(0)
			expect(predictive.getWeight('dashboard', 'settings', 'user')).toBeGreaterThan(0)
		})
	})

	describe('predictions', () => {
		beforeEach(() => {
			engine = createWorkflowEngine(procedural, predictive)
		})

		it('predictNext returns ordered predictions', () => {
			// Build up weights
			const session = engine.startSession('user')
			for (let i = 0; i < 5; i++) {
				engine.recordTransition('dashboard', 'settings', {
					actor: 'user',
					sessionId: session.id,
					path: '/settings',
				})
			}

			const predictions = engine.predictNext('dashboard', { actor: 'user', sessionId: session.id, path: '/dashboard' })
			expect(predictions.length).toBeGreaterThan(0)
			expect(predictions[0]).toBe('settings')
		})

		it('predictNextDetailed returns detailed prediction info', () => {
			const session = engine.startSession('user')
			engine.recordTransition('dashboard', 'settings', {
				actor: 'user',
				sessionId: session.id,
				path: '/settings',
			})

			const detailed = engine.predictNextDetailed('dashboard', { actor: 'user', sessionId: session.id, path: '/dashboard' })
			expect(detailed.currentNode).toBe('dashboard')
			expect(detailed.predictions.length).toBeGreaterThan(0)
		})
	})

	describe('session management', () => {
		beforeEach(() => {
			engine = createWorkflowEngine(procedural, predictive)
		})

		it('startSession creates a new session', () => {
			const session = engine.startSession('user')
			expect(session.id).toBeDefined()
			expect(session.actor).toBe('user')
		})

		it('startSession accepts custom session ID', () => {
			const session = engine.startSession('user', 'custom-id')
			expect(session.id).toBe('custom-id')
		})

		it('getSession returns session by ID', () => {
			const created = engine.startSession('user')
			const retrieved = engine.getSession(created.id)
			expect(retrieved).toBeDefined()
			expect(retrieved?.id).toBe(created.id)
		})

		it('getSession returns undefined for unknown ID', () => {
			expect(engine.getSession('unknown')).toBe(undefined)
		})

		it('getActiveSession returns current session for actor', () => {
			const session = engine.startSession('user')
			const active = engine.getActiveSession('user')
			expect(active?.id).toBe(session.id)
		})

		it('hasSession returns true for existing session', () => {
			const session = engine.startSession('user')
			expect(engine.hasSession(session.id)).toBe(true)
		})

		it('hasSession returns false for unknown session', () => {
			expect(engine.hasSession('unknown')).toBe(false)
		})

		it('endSession ends an active session', () => {
			const session = engine.startSession('user')
			engine.endSession(session.id, 'completed')
			expect(engine.getActiveSession('user')).toBe(undefined)
		})

		it('endSession throws for unknown session', () => {
			expect(() => engine.endSession('unknown', 'completed')).toThrow()
		})
	})

	describe('session chain', () => {
		beforeEach(() => {
			engine = createWorkflowEngine(procedural, predictive)
		})

		it('getSessionChain returns action chain for actor', () => {
			const session = engine.startSession('user')
			engine.recordTransition('login', 'dashboard', {
				actor: 'user',
				sessionId: session.id,
				path: '/dashboard',
			})

			const chain = engine.getSessionChain('user')
			expect(chain.events.length).toBeGreaterThan(0)
		})

		it('truncateChain removes events based on strategy', () => {
			const session = engine.startSession('user')
			for (let i = 0; i < 5; i++) {
				engine.recordTransition('login', 'dashboard', {
					actor: 'user',
					sessionId: session.id,
					path: '/dashboard',
				})
			}

			engine.truncateChain(session.id, 'recency')
			const chain = engine.getSessionChain('user')
			expect(chain.events.length).toBeLessThanOrEqual(5)
		})
	})

	describe('subscriptions', () => {
		beforeEach(() => {
			engine = createWorkflowEngine(procedural, predictive)
		})

		it('onTransition notifies on transitions', () => {
			let called = false
			const unsubscribe = engine.onTransition(() => {
				called = true
			})

			const session = engine.startSession('user')
			engine.recordTransition('login', 'dashboard', {
				actor: 'user',
				sessionId: session.id,
				path: '/dashboard',
			})

			expect(called).toBe(true)
			unsubscribe()
		})

		it('onPrediction notifies on predictions', () => {
			let called = false
			const unsubscribe = engine.onPrediction(() => {
				called = true
			})

			const session = engine.startSession('user')
			engine.predictNext('dashboard', { actor: 'user', sessionId: session.id, path: '/dashboard' })

			expect(called).toBe(true)
			unsubscribe()
		})

		it('onSessionStart notifies on session start', () => {
			let called = false
			const unsubscribe = engine.onSessionStart(() => {
				called = true
			})

			engine.startSession('user')

			expect(called).toBe(true)
			unsubscribe()
		})

		it('onSessionEnd notifies on session end', () => {
			let called = false
			const unsubscribe = engine.onSessionEnd(() => {
				called = true
			})

			const session = engine.startSession('user')
			engine.endSession(session.id, 'completed')

			expect(called).toBe(true)
			unsubscribe()
		})
	})

	describe('lifecycle', () => {
		it('destroy cleans up resources', () => {
			engine = createWorkflowEngine(procedural, predictive)
			expect(() => engine.destroy()).not.toThrow()
		})
	})
})
