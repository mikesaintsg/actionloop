/**
 * @mikesaintsg/actionloop
 *
 * Factory functions for creating ActionLoop instances.
 */

import type {
	CreateProceduralGraph,
	CreatePredictiveGraph,
	CreateWorkflowEngine,
	CreateWorkflowBuilder,
	CreateWorkflowValidator,
	CreateWorkflowAnalyzer,
	CreateActivityTracker,
	CreateActionLoopContextFormatter,
} from './types.js'

// ============================================================================
// Re-exports from implementations
// ============================================================================

// These factory functions are implemented in their respective modules
// and re-exported here for centralized access

export { createProceduralGraph } from './core/graphs/procedural.js'
export { createPredictiveGraph } from './core/graphs/predictive.js'
export { createWorkflowEngine } from './core/workflows/engine.js'
export { createWorkflowBuilder } from './core/workflows/builder.js'
export { createWorkflowValidator } from './core/workflows/validator.js'
export { createWorkflowAnalyzer } from './core/workflows/analyzer.js'
export { createActivityTracker } from './core/ActivityTracker.js'
export { createActionLoopContextFormatter } from './core/ContextFormatter.js'

// ============================================================================
// Type Exports (for documentation)
// ============================================================================

export type {
	CreateProceduralGraph,
	CreatePredictiveGraph,
	CreateWorkflowEngine,
	CreateWorkflowBuilder,
	CreateWorkflowValidator,
	CreateWorkflowAnalyzer,
	CreateActivityTracker,
	CreateActionLoopContextFormatter,
}
