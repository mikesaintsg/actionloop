/**
 * @mikesaintsg/actionloop
 *
 * Utility functions for ActionLoop.
 */

import type { IsActionLoopSupported } from './types.js'

// ============================================================================
// Environment Detection
// ============================================================================

/**
 * Check if ActionLoop is supported in the current environment.
 *
 * @returns True if environment supports ActionLoop
 */
export const isActionLoopSupported: IsActionLoopSupported = (): boolean => {
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
export function createTransitionKey(from: string, to:  string): string {
	return `${from}:: ${to}`
}

/**
 * Parse a transition key into source and target nodes.
 *
 * @param key - Transition key
 * @returns Tuple of [from, to] or undefined if invalid
 */
export function parseTransitionKey(
	key: string
): readonly [string, string] | undefined {
	const parts = key.split('::')
	if (parts.length !== 2 || parts[0] === '' || parts[1] === '') {
		return undefined
	}
	return [parts[0], parts[1]] as const
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
	actor:  string
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
