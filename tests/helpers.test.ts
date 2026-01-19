/**
 * @mikesaintsg/actionloop
 *
 * Tests for helper functions.
 */

import { describe, it, expect } from 'vitest'
import {
	isActor,
	isNode,
	isTransition,
	createTransitionKey,
	parseTransitionKey,
	deepFreeze,
	generateId,
} from '@mikesaintsg/actionloop'

describe('helpers', () => {
	describe('isActor', () => {
		it('validates user actor', () => {
			expect(isActor('user')).toBe(true)
		})

		it('validates system actor', () => {
			expect(isActor('system')).toBe(true)
		})

		it('validates automation actor', () => {
			expect(isActor('automation')).toBe(true)
		})

		it('rejects invalid actor', () => {
			expect(isActor('invalid')).toBe(false)
		})

		it('rejects non-string values', () => {
			expect(isActor(123)).toBe(false)
			expect(isActor(null)).toBe(false)
			expect(isActor(undefined)).toBe(false)
			expect(isActor({})).toBe(false)
		})
	})

	describe('isNode', () => {
		it('validates node with id only', () => {
			expect(isNode({ id: 'test' })).toBe(true)
		})

		it('validates node with all properties', () => {
			expect(isNode({
				id: 'test',
				label: 'Test Node',
				type: 'action',
				metadata: { description: 'A test node' },
			})).toBe(true)
		})

		it('rejects node without id', () => {
			expect(isNode({ label: 'Test' })).toBe(false)
		})

		it('rejects non-object values', () => {
			expect(isNode(null)).toBe(false)
			expect(isNode('string')).toBe(false)
			expect(isNode(123)).toBe(false)
		})

		it('rejects node with invalid type', () => {
			expect(isNode({ id: 'test', type: 'invalid' })).toBe(false)
		})
	})

	describe('isTransition', () => {
		it('validates complete transition', () => {
			expect(isTransition({
				from: 'a',
				to: 'b',
				weight: 1,
				actor: 'user',
			})).toBe(true)
		})

		it('rejects transition without from', () => {
			expect(isTransition({ to: 'b', weight: 1, actor: 'user' })).toBe(false)
		})

		it('rejects transition without to', () => {
			expect(isTransition({ from: 'a', weight: 1, actor: 'user' })).toBe(false)
		})

		it('rejects transition with invalid actor', () => {
			expect(isTransition({ from: 'a', to: 'b', weight: 1, actor: 'invalid' })).toBe(false)
		})

		it('rejects non-object values', () => {
			expect(isTransition(null)).toBe(false)
			expect(isTransition('string')).toBe(false)
		})
	})

	describe('createTransitionKey', () => {
		it('creates consistent keys', () => {
			expect(createTransitionKey('a', 'b')).toBe('a->b')
		})

		it('handles node ids with special characters', () => {
			expect(createTransitionKey('node-1', 'node-2')).toBe('node-1->node-2')
		})
	})

	describe('parseTransitionKey', () => {
		it('parses valid transition key', () => {
			const result = parseTransitionKey('a->b')
			expect(result).toEqual(['a', 'b'])
		})

		it('returns undefined for invalid key', () => {
			expect(parseTransitionKey('invalid')).toBe(undefined)
			expect(parseTransitionKey('')).toBe(undefined)
			expect(parseTransitionKey('->')).toBe(undefined)
		})

		it('reverses createTransitionKey', () => {
			const key = createTransitionKey('start', 'end')
			const [from, to] = parseTransitionKey(key) ?? []
			expect(from).toBe('start')
			expect(to).toBe('end')
		})
	})

	describe('deepFreeze', () => {
		it('freezes object', () => {
			const obj = { a: 1 }
			const frozen = deepFreeze(obj)
			expect(Object.isFrozen(frozen)).toBe(true)
		})

		it('freezes nested objects', () => {
			const obj = { a: { b: { c: 1 } } }
			const frozen = deepFreeze(obj)
			expect(Object.isFrozen(frozen)).toBe(true)
			expect(Object.isFrozen(frozen.a)).toBe(true)
			expect(Object.isFrozen(frozen.a.b)).toBe(true)
		})

		it('returns primitives unchanged', () => {
			expect(deepFreeze(123)).toBe(123)
			expect(deepFreeze('string')).toBe('string')
			expect(deepFreeze(null)).toBe(null)
		})
	})

	describe('generateId', () => {
		it('generates unique IDs', () => {
			const id1 = generateId()
			const id2 = generateId()
			expect(id1).not.toBe(id2)
		})

		it('generates string IDs', () => {
			const id = generateId()
			expect(typeof id).toBe('string')
		})

		it('generates non-empty IDs', () => {
			const id = generateId()
			expect(id.length).toBeGreaterThan(0)
		})
	})
})
