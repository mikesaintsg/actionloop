/**
 * @mikesaintsg/actionloop
 *
 * Error classes and utilities for ActionLoop.
 */

import type {
	ActionLoopErrorCode,
	ActionLoopErrorData,
	ActionLoopErrorInterface,
	IsActionLoopError,
	CreateActionLoopError,
} from './types.js'

// ============================================================================
// Error Class
// ============================================================================

/**
 * Base error class for all ActionLoop errors.
 */
export class ActionLoopError extends Error implements ActionLoopErrorInterface {
	readonly code: ActionLoopErrorCode
	readonly nodeId?: string
	readonly transitionKey?: string
	readonly sessionId?: string
	override readonly cause?: Error

	constructor(
		code: ActionLoopErrorCode,
		message: string,
		data?: Partial<Omit<ActionLoopErrorData, 'code' | 'message'>>,
	) {
		super(message)
		this.name = 'ActionLoopError'
		this.code = code

		// Only assign if defined (exactOptionalPropertyTypes)
		if (data?.nodeId !== undefined) {
			this.nodeId = data.nodeId
		}
		if (data?.transitionKey !== undefined) {
			this.transitionKey = data.transitionKey
		}
		if (data?.sessionId !== undefined) {
			this.sessionId = data.sessionId
		}
		if (data?.cause !== undefined) {
			this.cause = data.cause
		}

		// Maintains proper stack trace in V8 environments
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, ActionLoopError)
		}
	}
}

// ============================================================================
// Type Guard
// ============================================================================

/**
 * Check if an error is an ActionLoop error.
 *
 * @param error - The error to check
 * @returns True if the error is an ActionLoopError
 *
 * @example
 * ```ts
 * try {
 *   engine.recordTransition('a', 'b', context)
 * } catch (error) {
 *   if (isActionLoopError(error)) {
 *     console.log('ActionLoop error:', error.code)
 *   }
 * }
 * ```
 */
export const isActionLoopError: IsActionLoopError = (
	error: unknown,
): error is ActionLoopErrorInterface => {
	return error instanceof ActionLoopError
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an ActionLoop error.
 *
 * @param code - Error code
 * @param message - Error message
 * @param data - Optional additional error data
 * @returns ActionLoopError instance
 */
export const createActionLoopError: CreateActionLoopError = (
	code: ActionLoopErrorCode,
	message: string,
	data?: Partial<Omit<ActionLoopErrorData, 'code' | 'message'>>,
): ActionLoopErrorInterface => {
	return new ActionLoopError(code, message, data)
}
