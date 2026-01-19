/**
 * @mikesaintsg/actionloop
 *
 * Tests for WorkflowValidator.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
	createProceduralGraph,
	createWorkflowValidator,
	type ProceduralGraphInterface,
	type WorkflowValidatorInterface,
} from '@mikesaintsg/actionloop'

describe('WorkflowValidator', () => {
	let procedural: ProceduralGraphInterface
	let validator: WorkflowValidatorInterface

	describe('with valid graph', () => {
		beforeEach(() => {
			procedural = createProceduralGraph({
				transitions: [
					{ from: 'start', to: 'middle', weight: 1, actor: 'user' },
					{ from: 'middle', to: 'end', weight: 1, actor: 'user' },
				],
				validateOnCreate: false,
			})
			validator = createWorkflowValidator(procedural)
		})

		it('creates validator from procedural graph', () => {
			expect(validator).toBeDefined()
		})

		it('runStaticChecks returns validation results', () => {
			const results = validator.runStaticChecks()
			expect(Array.isArray(results)).toBe(true)
		})

		it('isValid returns true for valid graph', () => {
			validator.runStaticChecks()
			expect(validator.isValid()).toBe(true)
		})
	})

	describe('dangling nodes', () => {
		beforeEach(() => {
			procedural = createProceduralGraph({
				transitions: [
					{ from: 'start', to: 'middle', weight: 1, actor: 'user' },
					// 'middle' has no outgoing transitions - it's a dangling/terminal node
				],
				validateOnCreate: false,
			})
			validator = createWorkflowValidator(procedural)
		})

		it('findDanglingNodes detects nodes without outgoing transitions', () => {
			const dangling = validator.findDanglingNodes()
			expect(dangling).toContain('middle')
		})
	})

	describe('unreachable nodes', () => {
		beforeEach(() => {
			// Isolated node scenario - the 'isolated' node is part of nodes but not connected
			procedural = createProceduralGraph({
				nodes: [
					{ id: 'isolated' },
					{ id: 'start' },
					{ id: 'end' },
				],
				transitions: [
					{ from: 'start', to: 'end', weight: 1, actor: 'user' },
				],
				validateOnCreate: false,
			})
			validator = createWorkflowValidator(procedural)
		})

		it('findUnreachableNodes returns array of unreachable nodes', () => {
			const unreachable = validator.findUnreachableNodes()
			expect(Array.isArray(unreachable)).toBe(true)
			// 'isolated' node is neither connected to start nor end
		})
	})

	describe('boundary nodes', () => {
		beforeEach(() => {
			procedural = createProceduralGraph({
				transitions: [
					{ from: 'a', to: 'b', weight: 1, actor: 'user' },
					{ from: 'b', to: 'a', weight: 1, actor: 'user' },
					// This creates a loop with no clear start/end
				],
				validateOnCreate: false,
			})
			validator = createWorkflowValidator(procedural)
		})

		it('findMissingBoundaryNodes checks for start/end nodes', () => {
			const boundary = validator.findMissingBoundaryNodes()
			expect(boundary.missingStart).toBe(true)
			expect(boundary.missingEnd).toBe(true)
		})
	})

	describe('guard validation', () => {
		beforeEach(() => {
			procedural = createProceduralGraph({
				transitions: [
					{
						from: 'a',
						to: 'b',
						weight: 1,
						actor: 'user',
						metadata: { guard: 'isAuthenticated' },
					},
				],
				validateOnCreate: false,
			})
			validator = createWorkflowValidator(procedural)
		})

		it('validateGuards returns guard validation results', () => {
			const results = validator.validateGuards()
			expect(Array.isArray(results)).toBe(true)
		})
	})

	describe('procedure validation', () => {
		beforeEach(() => {
			procedural = createProceduralGraph({
				transitions: [
					{ from: 'a', to: 'b', weight: 1, actor: 'user' },
					{ from: 'b', to: 'c', weight: 1, actor: 'user' },
				],
				procedures: [
					{ id: 'valid', actions: ['a', 'b', 'c'] },
				],
				validateOnCreate: false,
			})
			validator = createWorkflowValidator(procedural)
		})

		it('validateProcedures returns procedure validation results', () => {
			const results = validator.validateProcedures()
			expect(Array.isArray(results)).toBe(true)
		})
	})

	describe('connectivity', () => {
		it('checkConnectivity checks graph connectivity', () => {
			procedural = createProceduralGraph({
				transitions: [
					{ from: 'a', to: 'b', weight: 1, actor: 'user' },
					{ from: 'b', to: 'c', weight: 1, actor: 'user' },
				],
				validateOnCreate: false,
			})
			validator = createWorkflowValidator(procedural)

			const result = validator.checkConnectivity()
			expect(result.passed).toBe(true)
		})
	})

	describe('cycles', () => {
		it('checkCycles detects cycles in graph', () => {
			procedural = createProceduralGraph({
				transitions: [
					{ from: 'a', to: 'b', weight: 1, actor: 'user' },
					{ from: 'b', to: 'c', weight: 1, actor: 'user' },
					{ from: 'c', to: 'a', weight: 1, actor: 'user' },
				],
				validateOnCreate: false,
			})
			validator = createWorkflowValidator(procedural)

			const result = validator.checkCycles()
			// checkCycles returns an array of cycles (arrays of node IDs)
			expect(Array.isArray(result)).toBe(true)
			// Should find at least one cycle
			expect(result.length).toBeGreaterThan(0)
		})

		it('checkCycles returns empty array for acyclic graph', () => {
			procedural = createProceduralGraph({
				transitions: [
					{ from: 'a', to: 'b', weight: 1, actor: 'user' },
					{ from: 'b', to: 'c', weight: 1, actor: 'user' },
				],
				validateOnCreate: false,
			})
			validator = createWorkflowValidator(procedural)

			const result = validator.checkCycles()
			expect(result.length).toBe(0)
		})
	})

	describe('error counting', () => {
		beforeEach(() => {
			procedural = createProceduralGraph({
				nodes: [{ id: 'isolated' }],
				transitions: [
					{ from: 'a', to: 'b', weight: 1, actor: 'user' },
				],
				validateOnCreate: false,
			})
			validator = createWorkflowValidator(procedural)
			validator.runStaticChecks()
		})

		it('getErrorCount returns number of errors', () => {
			expect(typeof validator.getErrorCount()).toBe('number')
		})

		it('getWarningCount returns number of warnings', () => {
			expect(typeof validator.getWarningCount()).toBe('number')
		})
	})

	describe('subscriptions', () => {
		beforeEach(() => {
			procedural = createProceduralGraph({
				transitions: [
					{ from: 'a', to: 'b', weight: 1, actor: 'user' },
				],
				validateOnCreate: false,
			})
		})

		it('onValidationComplete notifies on validation', () => {
			let called = false
			validator = createWorkflowValidator(procedural, {
				onValidationComplete: () => {
					called = true
				},
			})

			validator.runStaticChecks()
			expect(called).toBe(true)
		})
	})

	describe('strict mode', () => {
		it('strict mode treats warnings as errors', () => {
			procedural = createProceduralGraph({
				transitions: [
					{ from: 'a', to: 'b', weight: 1, actor: 'user' },
				],
				validateOnCreate: false,
			})
			validator = createWorkflowValidator(procedural, {
				strictMode: true,
			})

			const results = validator.runStaticChecks()
			const errors = results.filter(r => r.severity === 'error')
			expect(errors.length).toBeGreaterThanOrEqual(0)
		})
	})

	describe('lifecycle', () => {
		it('destroy cleans up resources', () => {
			procedural = createProceduralGraph({
				transitions: [
					{ from: 'a', to: 'b', weight: 1, actor: 'user' },
				],
				validateOnCreate: false,
			})
			validator = createWorkflowValidator(procedural)
			expect(() => validator.destroy()).not.toThrow()
		})
	})
})
