/**
 * @mikesaintsg/actionloop
 *
 * Factory functions for creating ActionLoop instances.
 * All factory functions are centralized here per project conventions.
 */

import type {
	ActivityTrackerInterface,
	ActivityTrackerOptions,
} from '@mikesaintsg/core'
import type {
	ProceduralGraphInterface,
	ProceduralGraphOptions,
	PredictiveGraphInterface,
	PredictiveGraphOptions,
	WorkflowEngineInterface,
	WorkflowEngineOptions,
	WorkflowBuilderInterface,
	WorkflowBuilderOptions,
	WorkflowValidatorInterface,
	WorkflowValidatorOptions,
	WorkflowAnalyzerInterface,
	WorkflowAnalyzerOptions,
	ActionLoopContextFormatterInterface,
	ContextFormatterOptions,
} from './types.js'
import { ProceduralGraph } from './core/graphs/ProceduralGraph'
import { PredictiveGraph } from './core/graphs/PredictiveGraph'
import { WorkflowEngine } from './core/workflows/WorkflowEngine'
import { WorkflowBuilder } from './core/workflows/WorkflowBuilder'
import { WorkflowValidator } from './core/workflows/WorkflowValidator'
import { WorkflowAnalyzer } from './core/workflows/WorkflowAnalyzer'
import { ActivityTracker } from './core/ActivityTracker.js'
import { ContextFormatter } from './core/ContextFormatter.js'

// ============================================================================
// Graph Factory Functions
// ============================================================================

/**
 * Create a Procedural Graph.
 *
 * @param options - Graph configuration with transitions and optional nodes/procedures
 * @returns Procedural graph interface
 *
 * @example
 * ```ts
 * import { createProceduralGraph } from '@mikesaintsg/actionloop'
 *
 * const graph = createProceduralGraph({
 *   transitions: [
 *     { from: 'login', to: 'dashboard', weight: 1, actor: 'user' },
 *   ],
 * })
 * ```
 */
export function createProceduralGraph(
	options: ProceduralGraphOptions,
): ProceduralGraphInterface {
	return new ProceduralGraph(options)
}

/**
 * Create a Predictive Graph overlay.
 *
 * @param procedural - The underlying procedural graph (required first param)
 * @param options - Optional decay, cold-start, and persistence configuration
 * @returns Predictive graph interface
 *
 * @example
 * ```ts
 * import { createPredictiveGraph } from '@mikesaintsg/actionloop'
 *
 * const predictive = createPredictiveGraph(procedural, {
 *   decayAlgorithm: 'ewma',
 *   decayFactor: 0.9,
 *   coldStart: {
 *     strategy: 'procedural-weight',
 *     warmupThreshold: 100,
 *   },
 * })
 * ```
 */
export function createPredictiveGraph(
	procedural: ProceduralGraphInterface,
	options?: PredictiveGraphOptions,
): PredictiveGraphInterface {
	return new PredictiveGraph(procedural, options)
}

// ============================================================================
// Workflow Factory Functions
// ============================================================================

/**
 * Create a Workflow Engine.
 *
 * @param procedural - The static procedural graph (required first param)
 * @param predictive - The dynamic predictive graph overlay (required second param)
 * @param options - Optional engine configuration with opt-in adapters
 * @returns Workflow engine interface
 *
 * @example
 * ```ts
 * import { createWorkflowEngine, createActivityTracker } from '@mikesaintsg/actionloop'
 *
 * const activity = createActivityTracker({ idleThreshold: 30000 })
 *
 * const engine = createWorkflowEngine(procedural, predictive, {
 *   activity,
 *   validateTransitions: true,
 *   onTransition: (from, to, ctx) => console.log(`${from} -> ${to}`),
 * })
 * ```
 */
export function createWorkflowEngine(
	procedural: ProceduralGraphInterface,
	predictive: PredictiveGraphInterface,
	options?: WorkflowEngineOptions,
): WorkflowEngineInterface {
	return new WorkflowEngine(procedural, predictive, options)
}

/**
 * Create a Workflow Builder.
 *
 * @param options - Optional builder configuration
 * @returns Workflow builder interface
 *
 * @example
 * ```ts
 * import { createWorkflowBuilder } from '@mikesaintsg/actionloop'
 *
 * const builder = createWorkflowBuilder()
 * builder.addNode({ id: 'login' })
 * builder.addTransition({ from: 'login', to: 'dashboard', weight: 1, actor: 'user' })
 * const graph = builder.build()
 * ```
 */
export function createWorkflowBuilder(
	options?: WorkflowBuilderOptions,
): WorkflowBuilderInterface {
	return new WorkflowBuilder(options)
}

/**
 * Create a Workflow Validator.
 *
 * @param procedural - The procedural graph to validate (required first param)
 * @param options - Optional validator configuration
 * @returns Workflow validator interface
 *
 * @example
 * ```ts
 * import { createWorkflowValidator } from '@mikesaintsg/actionloop'
 *
 * const validator = createWorkflowValidator(procedural, { strictMode: true })
 * const results = validator.runStaticChecks()
 * ```
 */
export function createWorkflowValidator(
	procedural: ProceduralGraphInterface,
	options?: WorkflowValidatorOptions,
): WorkflowValidatorInterface {
	return new WorkflowValidator(procedural, options)
}

/**
 * Create a Workflow Analyzer.
 *
 * @param procedural - The procedural graph to analyze (required first param)
 * @param predictive - The predictive graph with runtime weights (required second param)
 * @param options - Optional analyzer configuration
 * @returns Workflow analyzer interface
 *
 * @example
 * ```ts
 * import { createWorkflowAnalyzer } from '@mikesaintsg/actionloop'
 *
 * const analyzer = createWorkflowAnalyzer(procedural, predictive)
 * const loops = analyzer.findHotLoops()
 * ```
 */
export function createWorkflowAnalyzer(
	procedural: ProceduralGraphInterface,
	predictive: PredictiveGraphInterface,
	options?: WorkflowAnalyzerOptions,
): WorkflowAnalyzerInterface {
	return new WorkflowAnalyzer(procedural, predictive, options)
}

// ============================================================================
// Activity & Context Factory Functions
// ============================================================================

/**
 * Create an Activity Tracker for engagement-aware predictions.
 *
 * @param options - Activity tracker configuration
 * @returns Activity tracker interface
 *
 * @example
 * ```ts
 * import { createActivityTracker } from '@mikesaintsg/actionloop'
 *
 * const activity = createActivityTracker({
 *   idleThreshold: 30000,
 *   awayThreshold: 300000,
 *   onEngagementChange: (state, nodeId) => {
 *     console.log(`Engagement: ${state} on ${nodeId}`)
 *   },
 * })
 *
 * // Use with workflow engine
 * const engine = createWorkflowEngine(procedural, predictive, {
 *   activity,
 * })
 * ```
 */
export function createActivityTracker(
	options?: ActivityTrackerOptions,
): ActivityTrackerInterface {
	return new ActivityTracker(options)
}

/**
 * Create an ActionLoop context formatter for LLM integration.
 *
 * @param options - Optional formatter configuration
 * @returns Context formatter interface
 *
 * @example
 * ```ts
 * import { createActionLoopContextFormatter } from '@mikesaintsg/actionloop'
 *
 * const formatter = createActionLoopContextFormatter({
 *   maxRecentEvents: 10,
 *   includePatterns: true,
 *   getNodeLabel: (nodeId) => graph.getNode(nodeId)?.label ?? nodeId,
 * })
 *
 * const predictions = engine.predictNextDetailed(currentNode, context)
 * const events = await engine.getEvents({ sessionId, limit: 20 })
 * const llmContext = formatter.format(predictions, events)
 *
 * // Use in prompt
 * const prompt = formatter.toNaturalLanguage(llmContext)
 * ```
 */
export function createActionLoopContextFormatter(
	options?: ContextFormatterOptions,
): ActionLoopContextFormatterInterface {
	return new ContextFormatter(options)
}
