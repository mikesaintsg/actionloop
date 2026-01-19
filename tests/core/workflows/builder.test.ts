/**
 * @mikesaintsg/actionloop
 *
 * Tests for WorkflowBuilder.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
	createWorkflowBuilder,
	type WorkflowBuilderInterface,
} from '@mikesaintsg/actionloop'

describe('WorkflowBuilder', () => {
	let builder: WorkflowBuilderInterface

	beforeEach(() => {
		builder = createWorkflowBuilder()
	})

	describe('creation', () => {
		it('creates empty builder', () => {
			expect(builder.getNodes()).toHaveLength(0)
			expect(builder.getTransitions()).toHaveLength(0)
		})

		it('accepts options', () => {
			builder = createWorkflowBuilder({
				validateOnChange: true,
				allowDuplicateNodes: false,
			})
			expect(builder).toBeDefined()
		})
	})

	describe('node operations', () => {
		it('addNode adds a node', () => {
			builder.addNode({ id: 'test' })
			expect(builder.hasNode('test')).toBe(true)
		})

		it('addNode with label', () => {
			builder.addNode({ id: 'test', label: 'Test Node' })
			const nodes = builder.getNodes()
			const node = nodes.find(n => n.id === 'test')
			expect(node?.label).toBe('Test Node')
		})

		it('addNode throws for duplicate when not allowed', () => {
			builder.addNode({ id: 'test' })
			expect(() => builder.addNode({ id: 'test' })).toThrow()
		})

		it('removeNode removes a node', () => {
			builder.addNode({ id: 'test' })
			builder.removeNode('test')
			expect(builder.hasNode('test')).toBe(false)
		})

		it('updateNode updates node properties', () => {
			builder.addNode({ id: 'test', label: 'Old' })
			builder.updateNode('test', { label: 'New' })
			const nodes = builder.getNodes()
			const node = nodes.find(n => n.id === 'test')
			expect(node?.label).toBe('New')
		})

		it('getNodes returns all nodes', () => {
			builder.addNode({ id: 'a' })
			builder.addNode({ id: 'b' })
			expect(builder.getNodes()).toHaveLength(2)
		})
	})

	describe('transition operations', () => {
		it('addTransition adds a transition', () => {
			builder.addTransition({ from: 'a', to: 'b', weight: 1, actor: 'user' })
			expect(builder.hasTransition('a', 'b')).toBe(true)
		})

		it('addTransition auto-creates nodes', () => {
			builder.addTransition({ from: 'a', to: 'b', weight: 1, actor: 'user' })
			expect(builder.hasNode('a')).toBe(true)
			expect(builder.hasNode('b')).toBe(true)
		})

		it('removeTransition removes a transition', () => {
			builder.addTransition({ from: 'a', to: 'b', weight: 1, actor: 'user' })
			builder.removeTransition('a', 'b')
			expect(builder.hasTransition('a', 'b')).toBe(false)
		})

		it('updateTransition updates transition properties', () => {
			builder.addTransition({ from: 'a', to: 'b', weight: 1, actor: 'user' })
			builder.updateTransition('a', 'b', { weight: 5 })
			const transitions = builder.getTransitions()
			const transition = transitions.find(t => t.from === 'a' && t.to === 'b')
			expect(transition?.weight).toBe(5)
		})

		it('getTransitions returns all transitions', () => {
			builder.addTransition({ from: 'a', to: 'b', weight: 1, actor: 'user' })
			builder.addTransition({ from: 'b', to: 'c', weight: 1, actor: 'user' })
			expect(builder.getTransitions()).toHaveLength(2)
		})
	})

	describe('procedure operations', () => {
		beforeEach(() => {
			builder.addTransition({ from: 'a', to: 'b', weight: 1, actor: 'user' })
			builder.addTransition({ from: 'b', to: 'c', weight: 1, actor: 'user' })
		})

		it('addProcedure adds a procedure', () => {
			builder.addProcedure({ id: 'proc1', actions: ['a', 'b', 'c'] })
			const procedures = builder.getProcedures()
			expect(procedures.some(p => p.id === 'proc1')).toBe(true)
		})

		it('removeProcedure removes a procedure', () => {
			builder.addProcedure({ id: 'proc1', actions: ['a', 'b'] })
			builder.removeProcedure('proc1')
			const procedures = builder.getProcedures()
			expect(procedures.some(p => p.id === 'proc1')).toBe(false)
		})

		it('getProcedures returns all procedures', () => {
			builder.addProcedure({ id: 'proc1', actions: ['a', 'b'] })
			builder.addProcedure({ id: 'proc2', actions: ['b', 'c'] })
			expect(builder.getProcedures()).toHaveLength(2)
		})
	})

	describe('validation', () => {
		it('validate returns validation results', () => {
			builder.addTransition({ from: 'a', to: 'b', weight: 1, actor: 'user' })
			const result = builder.validate()
			expect(result.valid).toBeDefined()
		})

		it('isValid returns boolean validity', () => {
			builder.addTransition({ from: 'a', to: 'b', weight: 1, actor: 'user' })
			expect(typeof builder.isValid()).toBe('boolean')
		})
	})

	describe('build', () => {
		it('build creates ProceduralGraph', () => {
			builder.addTransition({ from: 'a', to: 'b', weight: 1, actor: 'user' })
			const graph = builder.build()
			expect(graph.hasTransition('a', 'b')).toBe(true)
		})

		it('build creates graph with nodes', () => {
			builder.addNode({ id: 'a', label: 'Node A' })
			builder.addTransition({ from: 'a', to: 'b', weight: 1, actor: 'user' })
			const graph = builder.build()
			expect(graph.getNode('a')?.label).toBe('Node A')
		})
	})

	describe('serialization', () => {
		beforeEach(() => {
			builder.addNode({ id: 'a', label: 'Node A' })
			builder.addTransition({ from: 'a', to: 'b', weight: 1, actor: 'user' })
		})

		it('toJSON exports to JSON string', () => {
			const json = builder.toJSON()
			expect(typeof json).toBe('string')
			expect(JSON.parse(json)).toBeDefined()
		})

		it('fromJSON imports from JSON string', () => {
			const json = builder.toJSON()
			const newBuilder = createWorkflowBuilder().fromJSON(json)
			expect(newBuilder.hasTransition('a', 'b')).toBe(true)
		})

		it('toYAML exports to YAML string', () => {
			const yaml = builder.toYAML()
			expect(typeof yaml).toBe('string')
		})
	})

	describe('clear', () => {
		it('clear removes all nodes, transitions, and procedures', () => {
			builder.addNode({ id: 'a' })
			builder.addTransition({ from: 'a', to: 'b', weight: 1, actor: 'user' })
			builder.addProcedure({ id: 'proc1', actions: ['a', 'b'] })

			builder.clear()

			expect(builder.getNodes()).toHaveLength(0)
			expect(builder.getTransitions()).toHaveLength(0)
			expect(builder.getProcedures()).toHaveLength(0)
		})
	})

	describe('subscriptions', () => {
		it('onNodeAdded notifies on node added', () => {
			let called = false
			const unsubscribe = builder.onNodeAdded(() => {
				called = true
			})

			builder.addNode({ id: 'test' })

			expect(called).toBe(true)
			unsubscribe()
		})

		it('onNodeRemoved notifies on node removed', () => {
			let called = false
			builder.addNode({ id: 'test' })
			const unsubscribe = builder.onNodeRemoved(() => {
				called = true
			})

			builder.removeNode('test')

			expect(called).toBe(true)
			unsubscribe()
		})

		it('onTransitionAdded notifies on transition added', () => {
			let called = false
			const unsubscribe = builder.onTransitionAdded(() => {
				called = true
			})

			builder.addTransition({ from: 'a', to: 'b', weight: 1, actor: 'user' })

			expect(called).toBe(true)
			unsubscribe()
		})
	})

	describe('lifecycle', () => {
		it('destroy cleans up resources', () => {
			expect(() => builder.destroy()).not.toThrow()
		})
	})
})
