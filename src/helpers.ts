/**
 * @mikesaintsg/actionloop
 *
 * Utility functions for ActionLoop.
 */

import type { Actor, Node, Transition } from './types.js'
import { VALID_ACTORS } from './constants.js'

// ============================================================================
// Environment Detection
// ============================================================================

/**
 * Check if ActionLoop is supported in the current environment.
 *
 * @returns True if environment supports ActionLoop
 */
export function isActionLoopSupported(): boolean {
	// Check for ES2022+ features
	try {
		// Check Map and Set
		if (typeof Map === 'undefined' || typeof Set === 'undefined') {
			return false
		}

		// Check for private fields support (ES2022)
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const testClass = class {
			#privateField = true
			hasPrivate(): boolean {
				return this.#privateField
			}
		}

		return true
	} catch {
		return false
	}
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a value is a valid Actor type.
 *
 * @param value - Value to check
 * @returns True if value is a valid Actor
 */
export function isActor(value: unknown): value is Actor {
	return typeof value === 'string' && VALID_ACTORS.has(value)
}

/**
 * Check if a value is a valid Node.
 *
 * @param value - Value to check
 * @returns True if value is a valid Node
 */
export function isNode(value: unknown): value is Node {
	if (value === null || typeof value !== 'object') {
		return false
	}

	const obj = value as Record<string, unknown>

	// Required property
	if (typeof obj.id !== 'string') {
		return false
	}

	// Optional properties with correct types if present
	if (obj.label !== undefined && typeof obj.label !== 'string') {
		return false
	}

	if (obj.type !== undefined) {
		const validTypes = new Set(['action', 'session', 'system', 'placeholder'])
		if (typeof obj.type !== 'string' || !validTypes.has(obj.type)) {
			return false
		}
	}

	return true
}

/**
 * Check if a value is a valid Transition.
 *
 * @param value - Value to check
 * @returns True if value is a valid Transition
 */
export function isTransition(value: unknown): value is Transition {
	if (value === null || typeof value !== 'object') {
		return false
	}

	const obj = value as Record<string, unknown>

	// Required properties
	if (typeof obj.from !== 'string') return false
	if (typeof obj.to !== 'string') return false
	if (typeof obj.weight !== 'number') return false
	if (!isActor(obj.actor)) return false

	return true
}

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generate a unique ID.
 *
 * @returns Unique string ID
 */
export function generateId(): string {
	const timestamp = Date.now().toString(36)
	const random = Math.random().toString(36).substring(2, 10)
	return `${timestamp}-${random}`
}

// ============================================================================
// Transition Key
// ============================================================================

/**
 * Create a transition key from source and target nodes.
 *
 * @param from - Source node ID
 * @param to - Target node ID
 * @returns Transition key string
 */
export function createTransitionKey(from: string, to: string): string {
	return `${from}->${to}`
}

/**
 * Parse a transition key into source and target nodes.
 *
 * @param key - Transition key
 * @returns Tuple of [from, to] or undefined if invalid
 */
export function parseTransitionKey(
	key: string,
): readonly [string, string] | undefined {
	const parts = key.split('->')
	const from = parts[0]
	const to = parts[1]
	if (parts.length !== 2 || !from || !to) {
		return undefined
	}
	return [from, to] as const
}

// ============================================================================
// Weight Key
// ============================================================================

/**
 * Create a weight key from transition and actor.
 *
 * @param from - Source node ID
 * @param to - Target node ID
 * @param actor - Actor type
 * @returns Weight key string
 */
export function createWeightKey(
	from: string,
	to: string,
	actor:  string,
): string {
	return `${from}::${to}::${actor}`
}

// ============================================================================
// Deep Freeze
// ============================================================================

/**
 * Deep freeze an object for immutability.
 *
 * @param obj - Object to freeze
 * @returns Frozen object
 */
export function deepFreeze<T>(obj: T): Readonly<T> {
	if (obj === null || typeof obj !== 'object') {
		return obj
	}

	Object.freeze(obj)

	for (const key of Object.keys(obj)) {
		const value = (obj as Record<string, unknown>)[key]
		if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
			deepFreeze(value)
		}
	}

	return obj as Readonly<T>
}

// ============================================================================
// Time Utilities
// ============================================================================

/**
 * Get current timestamp in milliseconds.
 *
 * @returns Current timestamp
 */
export function now(): number {
	return Date.now()
}

/**
 * Calculate time elapsed since a timestamp.
 *
 * @param since - Starting timestamp
 * @returns Elapsed time in milliseconds
 */
export function elapsed(since: number): number {
	return Date.now() - since
}

// ============================================================================
// Guard Validation
// ============================================================================

/**
 * Validate guard expression syntax.
 * Checks for balanced parentheses and properly terminated strings.
 *
 * @param guard - Guard expression string to validate
 * @returns True if syntax is valid (balanced parens and quotes)
 */
export function isValidGuardSyntax(guard: string): boolean {
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

// ============================================================================
// YAML Parsing
// ============================================================================

/**
 * Parse a YAML value string into the appropriate JavaScript type.
 * Handles quoted strings, numbers, and booleans.
 *
 * @param value - YAML value string
 * @returns Parsed value as string, number, or boolean
 */
export function parseYAMLValue(value: string): string | number | boolean {
	// Remove quotes
	if (
		(value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'"))
	) {
		return value.slice(1, -1)
	}

	// Parse numbers
	if (/^-?\d+(\.\d+)?$/.test(value)) {
		return parseFloat(value)
	}

	// Parse booleans
	if (value === 'true') return true
	if (value === 'false') return false

	return value
}
