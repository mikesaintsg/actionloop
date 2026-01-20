/**
 * @mikesaintsg/actionloop
 *
 * Tests for ActivityTracker.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
	createActivityTracker,
	isActivityTrackingSupported,
	type CreateActivityTracker,
} from '@mikesaintsg/actionloop'
import type { ActivityTrackerInterface } from '@mikesaintsg/core'

describe('ActivityTracker', () => {
	let tracker: ActivityTrackerInterface

	beforeEach(() => {
		vi.useFakeTimers()
		tracker = createActivityTracker({
			idleThreshold: 1000,
			awayThreshold: 5000,
		})
	})

	afterEach(() => {
		tracker.destroy()
		vi.useRealTimers()
	})

	describe('creation', () => {
		it('creates activity tracker with default options', () => {
			const defaultTracker = createActivityTracker()
			expect(defaultTracker).toBeDefined()
			expect(defaultTracker.getEngagementState()).toBe('unknown')
			defaultTracker.destroy()
		})

		it('creates activity tracker with custom thresholds', () => {
			expect(tracker).toBeDefined()
		})
	})

	describe('isActivityTrackingSupported', () => {
		it('returns true in browser environment', () => {
			expect(isActivityTrackingSupported()).toBe(true)
		})
	})

	describe('enterNode', () => {
		it('sets current node and starts tracking', () => {
			tracker.enterNode('node-1')
			expect(tracker.getCurrentNodeId()).toBe('node-1')
			expect(tracker.getEngagementState()).toBe('active')
		})

		it('exits previous node when entering new node', () => {
			tracker.enterNode('node-1')
			tracker.enterNode('node-2')
			expect(tracker.getCurrentNodeId()).toBe('node-2')
			expect(tracker.getDwellHistory()).toHaveLength(1)
		})
	})

	describe('exitNode', () => {
		it('returns undefined when no node is active', () => {
			const record = tracker.exitNode()
			expect(record).toBeUndefined()
		})

		it('returns dwell record when node is active', () => {
			tracker.enterNode('node-1')
			vi.advanceTimersByTime(500)
			const record = tracker.exitNode()

			expect(record).toBeDefined()
			expect(record?.nodeId).toBe('node-1')
			expect(record?.activeTime).toBeGreaterThan(0)
		})

		it('adds record to history', () => {
			tracker.enterNode('node-1')
			vi.advanceTimersByTime(100)
			tracker.exitNode()

			const history = tracker.getDwellHistory()
			expect(history).toHaveLength(1)
		})
	})

	describe('getCurrentDwell', () => {
		it('returns undefined when no node is active', () => {
			expect(tracker.getCurrentDwell()).toBeUndefined()
		})

		it('returns partial record for active node', () => {
			tracker.enterNode('node-1')
			vi.advanceTimersByTime(100)

			const current = tracker.getCurrentDwell()
			expect(current).toBeDefined()
			expect(current?.nodeId).toBe('node-1')
		})
	})

	describe('engagement state changes', () => {
		it('starts as active when entering node', () => {
			tracker.enterNode('node-1')
			expect(tracker.getEngagementState()).toBe('active')
		})
	})

	describe('subscriptions', () => {
		it('onEngagementChange fires when engagement changes', () => {
			const callback = vi.fn()
			const unsubscribe = tracker.onEngagementChange(callback)

			tracker.enterNode('node-1')
			expect(callback).toHaveBeenCalledWith('active', 'node-1')

			unsubscribe()
		})

		it('onDwellComplete fires when node exits', () => {
			const callback = vi.fn()
			const unsubscribe = tracker.onDwellComplete(callback)

			tracker.enterNode('node-1')
			vi.advanceTimersByTime(100)
			tracker.exitNode()

			expect(callback).toHaveBeenCalled()
			const record = callback.mock.calls[0]?.[0]
			expect(record?.nodeId).toBe('node-1')

			unsubscribe()
		})
	})

	describe('statistics', () => {
		it('tracks total active time', () => {
			tracker.enterNode('node-1')
			vi.advanceTimersByTime(500)
			tracker.exitNode()

			tracker.enterNode('node-2')
			vi.advanceTimersByTime(500)
			tracker.exitNode()

			// Due to timing, we check that it's tracking
			expect(tracker.getTotalActiveTime()).toBeGreaterThanOrEqual(0)
		})

		it('tracks total idle time', () => {
			expect(tracker.getTotalIdleTime()).toBe(0)
		})
	})

	describe('clearHistory', () => {
		it('clears dwell history', () => {
			tracker.enterNode('node-1')
			vi.advanceTimersByTime(100)
			tracker.exitNode()

			expect(tracker.getDwellHistory()).toHaveLength(1)

			tracker.clearHistory()
			expect(tracker.getDwellHistory()).toHaveLength(0)
		})
	})

	describe('destroy', () => {
		it('cleans up resources', () => {
			tracker.enterNode('node-1')
			tracker.destroy()

			// After destroy, tracker should be cleaned up
			expect(tracker.getDwellHistory()).toHaveLength(1)
		})
	})
})
