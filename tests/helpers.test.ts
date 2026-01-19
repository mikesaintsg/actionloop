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
	createWeightKey,
	deepFreeze,
	generateId,
	now,
	elapsed,
	isActionLoopSupported,
	isValidGuardSyntax,
	parseYAMLValue,
} from '@mikesaintsg/actionloop'

describe('helpers', () => {
	// ========================================================================
	// Environment Detection
	// ========================================================================

	describe('isActionLoopSupported', () => {
		it('returns true in modern environment', () => {
			expect(isActionLoopSupported()).toBe(true)
		})
	})

	// ========================================================================
	// Type Guards
	// ========================================================================

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

		it('rejects empty string', () => {
			expect(isActor('')).toBe(false)
		})

		it('rejects case-sensitive variations', () => {
			expect(isActor('User')).toBe(false)
			expect(isActor('SYSTEM')).toBe(false)
			expect(isActor('Automation')).toBe(false)
		})

		it('rejects arrays', () => {
			expect(isActor(['user'])).toBe(false)
		})

		it('rejects functions', () => {
			expect(isActor(() => 'user')).toBe(false)
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

		it('validates all valid node types', () => {
			expect(isNode({ id: 'test', type: 'action' })).toBe(true)
			expect(isNode({ id: 'test', type: 'session' })).toBe(true)
			expect(isNode({ id: 'test', type: 'system' })).toBe(true)
			expect(isNode({ id: 'test', type: 'placeholder' })).toBe(true)
		})

		it('rejects node with numeric id', () => {
			expect(isNode({ id: 123 })).toBe(false)
		})

		it('rejects node with numeric label', () => {
			expect(isNode({ id: 'test', label: 123 })).toBe(false)
		})

		it('rejects arrays', () => {
			expect(isNode([{ id: 'test' }])).toBe(false)
		})

		it('validates empty id string', () => {
			expect(isNode({ id: '' })).toBe(true)
		})

		it('rejects undefined', () => {
			expect(isNode(undefined)).toBe(false)
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

		it('rejects transition without weight', () => {
			expect(isTransition({ from: 'a', to: 'b', actor: 'user' })).toBe(false)
		})

		it('rejects transition without actor', () => {
			expect(isTransition({ from: 'a', to: 'b', weight: 1 })).toBe(false)
		})

		it('rejects transition with invalid actor', () => {
			expect(isTransition({ from: 'a', to: 'b', weight: 1, actor: 'invalid' })).toBe(false)
		})

		it('rejects non-object values', () => {
			expect(isTransition(null)).toBe(false)
			expect(isTransition('string')).toBe(false)
		})

		it('validates transition with all actor types', () => {
			expect(isTransition({ from: 'a', to: 'b', weight: 1, actor: 'user' })).toBe(true)
			expect(isTransition({ from: 'a', to: 'b', weight: 1, actor: 'system' })).toBe(true)
			expect(isTransition({ from: 'a', to: 'b', weight: 1, actor: 'automation' })).toBe(true)
		})

		it('validates transition with zero weight', () => {
			expect(isTransition({ from: 'a', to: 'b', weight: 0, actor: 'user' })).toBe(true)
		})

		it('validates transition with negative weight', () => {
			expect(isTransition({ from: 'a', to: 'b', weight: -1, actor: 'user' })).toBe(true)
		})

		it('validates transition with decimal weight', () => {
			expect(isTransition({ from: 'a', to: 'b', weight: 0.5, actor: 'user' })).toBe(true)
		})

		it('rejects transition with string weight', () => {
			expect(isTransition({ from: 'a', to: 'b', weight: '1', actor: 'user' })).toBe(false)
		})

		it('rejects undefined', () => {
			expect(isTransition(undefined)).toBe(false)
		})

		it('rejects arrays', () => {
			expect(isTransition([{ from: 'a', to: 'b', weight: 1, actor: 'user' }])).toBe(false)
		})
	})

	// ========================================================================
	// Key Generation
	// ========================================================================

	describe('createTransitionKey', () => {
		it('creates consistent keys', () => {
			expect(createTransitionKey('a', 'b')).toBe('a->b')
		})

		it('handles node ids with special characters', () => {
			expect(createTransitionKey('node-1', 'node-2')).toBe('node-1->node-2')
		})

		it('handles empty strings', () => {
			expect(createTransitionKey('', '')).toBe('->')
		})

		it('handles spaces in node ids', () => {
			expect(createTransitionKey('node 1', 'node 2')).toBe('node 1->node 2')
		})

		it('handles unicode characters', () => {
			expect(createTransitionKey('登录', '仪表盘')).toBe('登录->仪表盘')
		})

		it('handles self-loop keys', () => {
			expect(createTransitionKey('a', 'a')).toBe('a->a')
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

		it('returns undefined for key with multiple arrows', () => {
			expect(parseTransitionKey('a->b->c')).toBe(undefined)
		})

		it('returns undefined for key with only from', () => {
			expect(parseTransitionKey('a->')).toBe(undefined)
		})

		it('returns undefined for key with only to', () => {
			expect(parseTransitionKey('->b')).toBe(undefined)
		})

		it('handles keys with special characters', () => {
			const result = parseTransitionKey('node-1->node-2')
			expect(result).toEqual(['node-1', 'node-2'])
		})
	})

	describe('createWeightKey', () => {
		it('creates weight key with all components', () => {
			expect(createWeightKey('a', 'b', 'user')).toBe('a::b::user')
		})

		it('handles empty strings', () => {
			expect(createWeightKey('', '', '')).toBe('::::')
		})

		it('handles special characters', () => {
			expect(createWeightKey('node-1', 'node-2', 'system')).toBe('node-1::node-2::system')
		})
	})

	// ========================================================================
	// Deep Freeze
	// ========================================================================

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

		it('handles undefined', () => {
			expect(deepFreeze(undefined)).toBe(undefined)
		})

		it('handles boolean', () => {
			expect(deepFreeze(true)).toBe(true)
			expect(deepFreeze(false)).toBe(false)
		})

		it('freezes arrays', () => {
			const arr = [1, 2, { a: 3 }]
			const frozen = deepFreeze(arr)
			expect(Object.isFrozen(frozen)).toBe(true)
			expect(Object.isFrozen(frozen[2])).toBe(true)
		})

		it('handles already frozen objects', () => {
			const obj = Object.freeze({ a: 1 })
			const frozen = deepFreeze(obj)
			expect(Object.isFrozen(frozen)).toBe(true)
		})

		it('handles objects with circular references', () => {
			// Deep freeze should handle circular refs gracefully
			const obj: Record<string, unknown> = { a: 1 }
			obj.self = obj
			// Should not throw
			expect(() => deepFreeze(obj)).not.toThrow()
		})

		it('returns same reference', () => {
			const obj = { a: 1 }
			const frozen = deepFreeze(obj)
			expect(frozen).toBe(obj)
		})
	})

	// ========================================================================
	// ID Generation
	// ========================================================================

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

		it('generates many unique IDs', () => {
			const ids = new Set<string>()
			for (let i = 0; i < 1000; i++) {
				ids.add(generateId())
			}
			expect(ids.size).toBe(1000)
		})

		it('generates IDs with hyphen separator', () => {
			const id = generateId()
			expect(id).toContain('-')
		})
	})

	// ========================================================================
	// Time Utilities
	// ========================================================================

	describe('now', () => {
		it('returns current timestamp', () => {
			const before = Date.now()
			const result = now()
			const after = Date.now()
			expect(result).toBeGreaterThanOrEqual(before)
			expect(result).toBeLessThanOrEqual(after)
		})

		it('returns number', () => {
			expect(typeof now()).toBe('number')
		})
	})

	describe('elapsed', () => {
		it('calculates elapsed time', () => {
			const start = Date.now() - 100
			const result = elapsed(start)
			expect(result).toBeGreaterThanOrEqual(100)
			expect(result).toBeLessThan(200) // Allow some margin
		})

		it('returns 0 for current time', () => {
			const now = Date.now()
			const result = elapsed(now)
			expect(result).toBeGreaterThanOrEqual(0)
			expect(result).toBeLessThan(10) // Should be very small
		})

		it('returns negative for future time', () => {
			const future = Date.now() + 1000
			const result = elapsed(future)
			expect(result).toBeLessThan(0)
		})
	})

	// ========================================================================
	// Guard Validation
	// ========================================================================

	describe('isValidGuardSyntax', () => {
		it('validates empty string', () => {
			expect(isValidGuardSyntax('')).toBe(true)
		})

		it('validates simple expression', () => {
			expect(isValidGuardSyntax('x > 0')).toBe(true)
		})

		it('validates balanced parentheses', () => {
			expect(isValidGuardSyntax('(a && b)')).toBe(true)
			expect(isValidGuardSyntax('((a) && (b))')).toBe(true)
			expect(isValidGuardSyntax('(((nested)))')).toBe(true)
		})

		it('rejects unbalanced parentheses - extra open', () => {
			expect(isValidGuardSyntax('(a && b')).toBe(false)
			expect(isValidGuardSyntax('((a)')).toBe(false)
		})

		it('rejects unbalanced parentheses - extra close', () => {
			expect(isValidGuardSyntax('a && b)')).toBe(false)
			expect(isValidGuardSyntax('(a))')).toBe(false)
		})

		it('validates double-quoted strings', () => {
			expect(isValidGuardSyntax('name == "test"')).toBe(true)
			expect(isValidGuardSyntax('"hello world"')).toBe(true)
		})

		it('validates single-quoted strings', () => {
			expect(isValidGuardSyntax("name == 'test'")).toBe(true)
			expect(isValidGuardSyntax("'hello world'")).toBe(true)
		})

		it('rejects unterminated double-quoted string', () => {
			expect(isValidGuardSyntax('name == "test')).toBe(false)
			expect(isValidGuardSyntax('"unclosed')).toBe(false)
		})

		it('rejects unterminated single-quoted string', () => {
			expect(isValidGuardSyntax("name == 'test")).toBe(false)
			expect(isValidGuardSyntax("'unclosed")).toBe(false)
		})

		it('handles parentheses inside strings', () => {
			expect(isValidGuardSyntax('msg == "(hello)"')).toBe(true)
			expect(isValidGuardSyntax("msg == '(world)'")).toBe(true)
		})

		it('handles quotes inside opposite quotes', () => {
			expect(isValidGuardSyntax("msg == \"it's fine\"")).toBe(true)
			expect(isValidGuardSyntax('msg == \'say "hello"\'')).toBe(true)
		})

		it('handles complex expressions', () => {
			expect(isValidGuardSyntax('(user.role == "admin") && (user.active == true)')).toBe(true)
			expect(isValidGuardSyntax('((a || b) && (c || d))')).toBe(true)
		})

		it('handles multiple strings', () => {
			expect(isValidGuardSyntax('a == "x" && b == "y"')).toBe(true)
		})
	})

	// ========================================================================
	// YAML Parsing
	// ========================================================================

	describe('parseYAMLValue', () => {
		it('parses double-quoted string', () => {
			expect(parseYAMLValue('"hello"')).toBe('hello')
			expect(parseYAMLValue('"hello world"')).toBe('hello world')
		})

		it('parses single-quoted string', () => {
			expect(parseYAMLValue("'hello'")).toBe('hello')
			expect(parseYAMLValue("'hello world'")).toBe('hello world')
		})

		it('parses integer', () => {
			expect(parseYAMLValue('42')).toBe(42)
			expect(parseYAMLValue('0')).toBe(0)
		})

		it('parses negative integer', () => {
			expect(parseYAMLValue('-42')).toBe(-42)
			expect(parseYAMLValue('-1')).toBe(-1)
		})

		it('parses float', () => {
			expect(parseYAMLValue('3.14')).toBe(3.14)
			expect(parseYAMLValue('0.5')).toBe(0.5)
		})

		it('parses negative float', () => {
			expect(parseYAMLValue('-3.14')).toBe(-3.14)
		})

		it('parses boolean true', () => {
			expect(parseYAMLValue('true')).toBe(true)
		})

		it('parses boolean false', () => {
			expect(parseYAMLValue('false')).toBe(false)
		})

		it('returns unquoted string as-is', () => {
			expect(parseYAMLValue('hello')).toBe('hello')
			expect(parseYAMLValue('hello-world')).toBe('hello-world')
		})

		it('handles empty quoted string', () => {
			expect(parseYAMLValue('""')).toBe('')
			expect(parseYAMLValue("''")).toBe('')
		})

		it('handles quoted numbers as strings', () => {
			expect(parseYAMLValue('"42"')).toBe('42')
			expect(parseYAMLValue("'3.14'")).toBe('3.14')
		})

		it('handles quoted booleans as strings', () => {
			expect(parseYAMLValue('"true"')).toBe('true')
			expect(parseYAMLValue("'false'")).toBe('false')
		})

		it('handles empty string', () => {
			expect(parseYAMLValue('')).toBe('')
		})

		it('handles string that looks like number but is not', () => {
			expect(parseYAMLValue('1.2.3')).toBe('1.2.3')
			expect(parseYAMLValue('12abc')).toBe('12abc')
		})

		it('handles partial quotes', () => {
			// Single quote at start only
			expect(parseYAMLValue('"hello')).toBe('"hello')
			expect(parseYAMLValue("'hello")).toBe("'hello")
			// Quote at end only
			expect(parseYAMLValue('hello"')).toBe('hello"')
			expect(parseYAMLValue("hello'")).toBe("hello'")
		})
	})
})
