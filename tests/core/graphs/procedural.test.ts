/**
 * @mikesaintsg/actionloop
 *
 * Tests for ProceduralGraph.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
	createProceduralGraph,
	type ProceduralGraphInterface,
} from '@mikesaintsg/actionloop'

describe('ProceduralGraph', () => {
	let graph: ProceduralGraphInterface

	describe('creation', () => {
		it('creates graph from transitions', () => {
			graph = createProceduralGraph({
				transitions: [
					{ from: 'a', to: 'b', weight: 1, actor: 'user' },
				],
				validateOnCreate: false,
			})
			expect(graph.hasNode('a')).toBe(true)
			expect(graph.hasNode('b')).toBe(true)
			expect(graph.hasTransition('a', 'b')).toBe(true)
		})

		it('auto-creates nodes from transitions', () => {
			graph = createProceduralGraph({
				transitions: [
					{ from: 'start', to: 'middle', weight: 1, actor: 'user' },
					{ from: 'middle', to: 'end', weight: 1, actor: 'user' },
				],
				validateOnCreate: false,
			})
			expect(graph.hasNode('start')).toBe(true)
			expect(graph.hasNode('middle')).toBe(true)
			expect(graph.hasNode('end')).toBe(true)
		})

		it('accepts explicit nodes', () => {
			graph = createProceduralGraph({
				nodes: [
					{ id: 'explicit', label: 'Explicit Node' },
				],
				transitions: [
					{ from: 'explicit', to: 'other', weight: 1, actor: 'user' },
				],
				validateOnCreate: false,
			})
			const node = graph.getNode('explicit')
			expect(node?.label).toBe('Explicit Node')
		})
	})

	describe('node accessors', () => {
		beforeEach(() => {
			graph = createProceduralGraph({
				nodes: [
					{ id: 'a', label: 'Node A' },
					{ id: 'b', label: 'Node B' },
				],
				transitions: [
					{ from: 'a', to: 'b', weight: 1, actor: 'user' },
				],
				validateOnCreate: false,
			})
		})

		it('getNode returns node by id', () => {
			const node = graph.getNode('a')
			expect(node?.id).toBe('a')
			expect(node?.label).toBe('Node A')
		})

		it('getNode returns undefined for unknown id', () => {
			expect(graph.getNode('unknown')).toBe(undefined)
		})

		it('getNodes returns all nodes', () => {
			const nodes = graph.getNodes()
			expect(nodes.length).toBe(2)
		})

		it('hasNode returns true for existing node', () => {
			expect(graph.hasNode('a')).toBe(true)
		})

		it('hasNode returns false for unknown node', () => {
			expect(graph.hasNode('unknown')).toBe(false)
		})
	})

	describe('transition accessors', () => {
		beforeEach(() => {
			graph = createProceduralGraph({
				transitions: [
					{ from: 'a', to: 'b', weight: 1, actor: 'user' },
					{ from: 'a', to: 'c', weight: 2, actor: 'system' },
					{ from: 'b', to: 'c', weight: 1, actor: 'user' },
				],
				validateOnCreate: false,
			})
		})

		it('getTransitions returns outgoing transitions', () => {
			const transitions = graph.getTransitions('a')
			expect(transitions.length).toBe(2)
		})

		it('getTransitionsTo returns incoming transitions', () => {
			const transitions = graph.getTransitionsTo('c')
			expect(transitions.length).toBe(2)
		})

		it('hasTransition returns true for existing transition', () => {
			expect(graph.hasTransition('a', 'b')).toBe(true)
		})

		it('hasTransition returns false for unknown transition', () => {
			expect(graph.hasTransition('a', 'z')).toBe(false)
		})

		it('getTransition returns transition by from/to', () => {
			const transition = graph.getTransition('a', 'b')
			expect(transition?.weight).toBe(1)
			expect(transition?.actor).toBe('user')
		})

		it('getAllTransitions returns all transitions', () => {
			const all = graph.getAllTransitions()
			expect(all.length).toBe(3)
		})
	})

	describe('boundary detection', () => {
		it('identifies start nodes', () => {
			graph = createProceduralGraph({
				transitions: [
					{ from: 'start', to: 'middle', weight: 1, actor: 'user' },
					{ from: 'middle', to: 'end', weight: 1, actor: 'user' },
				],
				validateOnCreate: false,
			})
			expect(graph.isStartNode('start')).toBe(true)
			expect(graph.isStartNode('middle')).toBe(false)
		})

		it('identifies end nodes', () => {
			graph = createProceduralGraph({
				transitions: [
					{ from: 'start', to: 'middle', weight: 1, actor: 'user' },
					{ from: 'middle', to: 'end', weight: 1, actor: 'user' },
				],
				validateOnCreate: false,
			})
			expect(graph.isEndNode('end')).toBe(true)
			expect(graph.isEndNode('middle')).toBe(false)
		})

		it('getStartNodes returns all start nodes', () => {
			graph = createProceduralGraph({
				transitions: [
					{ from: 'start1', to: 'middle', weight: 1, actor: 'user' },
					{ from: 'start2', to: 'middle', weight: 1, actor: 'user' },
				],
				validateOnCreate: false,
			})
			const startNodes = graph.getStartNodes()
			expect(startNodes.length).toBe(2)
			expect(startNodes).toContain('start1')
			expect(startNodes).toContain('start2')
		})

		it('getEndNodes returns all end nodes', () => {
			graph = createProceduralGraph({
				transitions: [
					{ from: 'start', to: 'end1', weight: 1, actor: 'user' },
					{ from: 'start', to: 'end2', weight: 1, actor: 'user' },
				],
				validateOnCreate: false,
			})
			const endNodes = graph.getEndNodes()
			expect(endNodes.length).toBe(2)
		})
	})

	describe('procedures', () => {
		beforeEach(() => {
			graph = createProceduralGraph({
				transitions: [
					{ from: 'a', to: 'b', weight: 1, actor: 'user' },
					{ from: 'b', to: 'c', weight: 1, actor: 'user' },
				],
				procedures: [
					{ id: 'proc1', actions: ['a', 'b', 'c'] },
				],
				validateOnCreate: false,
			})
		})

		it('getProcedure returns procedure by id', () => {
			const proc = graph.getProcedure('proc1')
			expect(proc?.id).toBe('proc1')
			expect(proc?.actions).toEqual(['a', 'b', 'c'])
		})

		it('getProcedures returns all procedures', () => {
			const procs = graph.getProcedures()
			expect(procs.length).toBe(1)
		})

		it('hasProcedure returns true for existing procedure', () => {
			expect(graph.hasProcedure('proc1')).toBe(true)
		})
	})

	describe('statistics', () => {
		it('returns correct stats', () => {
			graph = createProceduralGraph({
				transitions: [
					{ from: 'a', to: 'b', weight: 1, actor: 'user' },
					{ from: 'b', to: 'c', weight: 1, actor: 'system' },
				],
				procedures: [
					{ id: 'proc1', actions: ['a', 'b'] },
				],
				validateOnCreate: false,
			})
			const stats = graph.getStats()
			expect(stats.nodeCount).toBe(3)
			expect(stats.transitionCount).toBe(2)
			expect(stats.procedureCount).toBe(1)
			expect(stats.actorCounts.user).toBe(1)
			expect(stats.actorCounts.system).toBe(1)
		})
	})

	describe('export', () => {
		it('exports graph for serialization', () => {
			graph = createProceduralGraph({
				transitions: [
					{ from: 'a', to: 'b', weight: 1, actor: 'user' },
				],
				validateOnCreate: false,
			})
			const exported = graph.export()
			expect(exported.version).toBe(1)
			expect(exported.nodes.length).toBe(2)
			expect(exported.transitions.length).toBe(1)
		})
	})

	describe('validation', () => {
		it('validate returns validation results', () => {
			graph = createProceduralGraph({
				transitions: [
					{ from: 'a', to: 'b', weight: 1, actor: 'user' },
				],
				validateOnCreate: false,
			})
			const results = graph.validate()
			expect(Array.isArray(results)).toBe(true)
		})

		it('isValid returns true for valid graph', () => {
			graph = createProceduralGraph({
				transitions: [
					{ from: 'a', to: 'b', weight: 1, actor: 'user' },
				],
				validateOnCreate: false,
			})
			expect(graph.isValid()).toBe(true)
		})
	})

	describe('subscription', () => {
		it('onValidation subscribes to validation events', () => {
			graph = createProceduralGraph({
				transitions: [
					{ from: 'a', to: 'b', weight: 1, actor: 'user' },
				],
				validateOnCreate: false,
			})

			let _called = false
			const unsubscribe = graph.onValidation(() => {
				_called = true
			})

			// Trigger validation
			graph.validate()

			expect(typeof unsubscribe).toBe('function')
			unsubscribe()
		})
	})

	describe('lifecycle', () => {
		it('destroy cleans up resources', () => {
			graph = createProceduralGraph({
				transitions: [
					{ from: 'a', to: 'b', weight: 1, actor: 'user' },
				],
				validateOnCreate: false,
			})
			expect(() => graph.destroy()).not.toThrow()
		})
	})
})
