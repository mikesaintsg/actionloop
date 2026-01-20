/**
 * @mikesaintsg/actionloop
 *
 * Type definitions for the ActionLoop Predictive Procedural Action Loop System (PPALS).
 * All public types and interfaces are defined here as the SOURCE OF TRUTH.
 *
 * This package provides:
 * - ProceduralGraph: Static graph of valid transitions
 * - PredictiveGraph:  Dynamic weight overlay for adaptive predictions
 * - WorkflowEngine: Runtime engine for recording and prediction
 * - WorkflowBuilder:  Programmatic graph construction
 * - WorkflowValidator: Static analysis and validation
 * - WorkflowAnalyzer: Pattern detection and optimization
 * - ActivityTracker:  Engagement-aware dwell time tracking
 *
 * Adapter interfaces are defined in @mikesaintsg/core and implemented in @mikesaintsg/adapters.
 */

import type {
	Unsubscribe,
	Destroyable,
	SubscriptionToHook,
	// Shared ActionLoop types from core
	Actor,
	EngagementState,
	DwellRecord,
	TransitionEvent,
	EventFilter,
	ExportedPredictiveGraph,
	DecayAlgorithm,
	DecayConfig,
	ActivityTrackerInterface,
	ActivityTrackerOptions,
	EventStorePersistenceAdapterInterface,
	WeightPersistenceAdapterInterface,
} from '@mikesaintsg/core'

// ============================================================================
// Node Types
// ============================================================================

/** Node type classification */
export type NodeType = 'action' | 'session' | 'system' | 'placeholder'

/** Node metadata */
export interface NodeMetadata {
	readonly availablePaths?:  readonly string[]
	readonly description?: string
	readonly category?: string
	readonly tags?: readonly string[]
}

/** Workflow node definition */
export interface Node {
	readonly id: string
	readonly label?:  string
	readonly type?:  NodeType
	readonly metadata?:  Readonly<NodeMetadata>
}

/** Node input for builder operations */
export interface NodeInput {
	readonly id: string
	readonly label?: string
	readonly type?:  NodeType
	readonly metadata?: Readonly<NodeMetadata>
}

// ============================================================================
// Transition Types
// ============================================================================

/** Transition metadata */
export interface TransitionMetadata {
	readonly guard?: string
	readonly version?: string
	readonly relevantPaths?: readonly string[]
	readonly description?:  string
}

/** Enhanced transition metadata with session chain support */
export interface EnhancedTransitionMetadata extends TransitionMetadata {
	readonly duration?: number
	readonly sessionElapsed?: number
	readonly chainLink?: ChainLink
}

/** Chain link for cross-session continuity */
export interface ChainLink {
	readonly previousSession?: string
	readonly gapDuration?: number
}

/** Workflow transition definition */
export interface Transition {
	readonly from: string
	readonly to:  string
	readonly weight:  number
	readonly actor: Actor
	readonly metadata?:  Readonly<TransitionMetadata>
}

/** Enhanced transition with extended metadata */
export interface EnhancedTransition {
	readonly from:  string
	readonly to: string
	readonly weight: number
	readonly actor: Actor
	readonly metadata?:  Readonly<EnhancedTransitionMetadata>
}

/** Transition input for builder operations */
export interface TransitionInput {
	readonly from: string
	readonly to: string
	readonly weight: number
	readonly actor: Actor
	readonly metadata?:  Readonly<TransitionMetadata>
}

/** Weighted transition result from predictive graph */
export interface WeightedTransition {
	readonly to: string
	readonly weight: number
	readonly baseWeight: number
	readonly predictiveWeight: number
}

// ============================================================================
// Procedure Types
// ============================================================================

/** Procedure metadata */
export interface ProcedureMetadata {
	readonly primaryPaths?: readonly string[]
	readonly description?: string
	readonly version?: string
}

/** Procedure definition (subgraph of related actions) */
export interface Procedure {
	readonly id: string
	readonly actions: readonly string[]
	readonly metadata?: Readonly<ProcedureMetadata>
}

/** Procedure input for builder operations */
export interface ProcedureInput {
	readonly id: string
	readonly actions:  readonly string[]
	readonly metadata?: Readonly<ProcedureMetadata>
}

// ============================================================================
// Context Types
// ============================================================================

/** Base context for all engine operations */
export interface BaseContext {
	readonly actor: Actor
	readonly sessionId: string
	readonly path: string
}

/** Context for recording transitions */
export interface TransitionContext extends BaseContext {
	readonly timestamp?:  number
	readonly metadata?: Readonly<Record<string, unknown>>
}

/** Context for predicting next actions */
export interface PredictionContext extends BaseContext {
	readonly count?:  number
	readonly includeWeights?: boolean
}

/** Batch transition for recording multiple transitions */
export interface BatchTransition {
	readonly from: string
	readonly to: string
	readonly context: TransitionContext
}

// ============================================================================
// Session Types
// ============================================================================

/** Session end reasons */
export type SessionEndReason = 'completed' | 'abandoned' | 'timeout' | 'error'

/** Session information */
export interface SessionInfo {
	readonly id: string
	readonly actor: Actor
	readonly startTime: number
	readonly lastActivity: number
	readonly path?:  string
	readonly nodeHistory?: readonly string[]
}

/** Extended session info with activity data */
export interface ActivitySessionInfo extends SessionInfo {
	readonly dwellHistory:  readonly DwellRecord[]
	readonly totalActiveTime: number
	readonly totalIdleTime: number
	readonly currentEngagement: EngagementState
}

/** Session resume options */
export interface SessionResumeOptions {
	readonly previousNode:  string
	readonly actor: Actor
	readonly path?:  string
}

/** Chain options for retrieving action chains */
export interface ChainOptions {
	readonly limit?: number
	readonly startTime?: number
	readonly endTime?: number
	readonly includeMetadata?: boolean
	readonly includeDwell?: boolean
}

/** Action chain representing session history */
export interface ActionChain {
	readonly events: readonly ActionEvent[]
	readonly sessionIds: readonly string[]
	readonly totalDuration: number
	readonly totalActiveTime?:  number
	readonly totalIdleTime?: number
}

/** Action event in the chain */
export interface ActionEvent {
	readonly id: string
	readonly sessionId: string
	readonly actor: Actor
	readonly from: string
	readonly to: string
	readonly timestamp: number
	readonly duration?:  number
	readonly sessionElapsed:  number
	readonly eventType: ActionEventType
	readonly engagement?:  EngagementState
	readonly dwell?: DwellRecord
	readonly metadata?: Readonly<Record<string, unknown>>
}

/** Action event types */
export type ActionEventType = 'transition' | 'session_start' | 'session_end'

/** Placeholder event for chain compression */
export interface PlaceholderEvent {
	readonly id:  string
	readonly type: 'placeholder'
	readonly originalEventCount: number
	readonly timeSpan: TimeSpan
	readonly compressionRatio: number
	readonly keyTransitions: readonly string[]
}

/** Time span for placeholder events */
export interface TimeSpan {
	readonly start: number
	readonly end:  number
}

/** Chain truncation strategy */
export type TruncationStrategy = 'frequency' | 'recency' | 'hybrid'

// ============================================================================
// Preload Types
// ============================================================================

/** Preload record for cold-start seeding */
export interface PreloadRecord {
	readonly from: string
	readonly to: string
	readonly actor: Actor
	readonly count: number
	readonly path?:  string
}

// ============================================================================
// Cold-Start Types
// ============================================================================

/** Cold-start strategy types */
export type ColdStartStrategy = 'uniform' | 'procedural-weight' | 'preload' | 'hybrid'

/** Cold-start configuration */
export interface ColdStartConfig {
	/** Strategy for handling insufficient data */
	readonly strategy: ColdStartStrategy
	/** Minimum transitions before predictions are considered "warm" */
	readonly warmupThreshold: number
	/** Preloaded records for initial state (used with 'preload' and 'hybrid' strategies) */
	readonly preloadRecords?:  readonly PreloadRecord[]
}

// ============================================================================
// Confidence Types
// ============================================================================

/** Confidence factors breakdown */
export interface ConfidenceFactors {
	/** Weight based on historical frequency (0.0–1.0) */
	readonly frequency:  number
	/** Weight based on recent activity (0.0–1.0) */
	readonly recency: number
	/** Weight based on engagement quality (0.0–1.0) */
	readonly engagement:  number
	/** Weight based on sample size reliability (0.0–1.0) */
	readonly sampleSize: number
}

/** Prediction result with confidence */
export interface PredictionResult {
	readonly nodeId: string
	readonly score: number
	readonly baseWeight: number
	readonly predictiveWeight: number
	readonly confidence:  number
	readonly factors: ConfidenceFactors
}

/** Detailed prediction response */
export interface DetailedPrediction {
	readonly predictions: readonly PredictionResult[]
	readonly currentNode: string
	readonly context: PredictionContext
	readonly computedAt: number
	readonly warmupComplete: boolean
	readonly transitionCount: number
}

// ============================================================================
// Graph Statistics Types
// ============================================================================

/** Graph statistics */
export interface GraphStats {
	readonly nodeCount: number
	readonly transitionCount:  number
	readonly procedureCount: number
	readonly actorCounts:  Readonly<Record<Actor, number>>
}

/** Predictive graph statistics */
export interface PredictiveGraphStats extends GraphStats {
	readonly totalWeightUpdates: number
	readonly lastUpdateTime: number
	readonly modelId: string
	readonly warmupComplete: boolean
}

// ============================================================================
// Graph Version Types
// ============================================================================

/** Graph version metadata */
export interface GraphVersion {
	readonly version: string
	readonly createdAt: number
	readonly migratedFrom?: string
	readonly breaking:  boolean
}

/** Migration function type */
export type GraphMigration = (
	oldGraph: ExportedProceduralGraph,
	oldVersion: string
) => ExportedProceduralGraph

// ============================================================================
// Multi-Tenancy Types
// ============================================================================

/** Isolation level for multi-tenant deployments */
export type IsolationLevel = 'strict' | 'shared-procedural'

// ============================================================================
// Validation Types
// ============================================================================

/** Validation severity levels */
export type ValidationSeverity = 'error' | 'warning' | 'info'

/** Validation result */
export interface ValidationResult {
	readonly passed: boolean
	readonly message:  string
	readonly severity: ValidationSeverity
	readonly suggestion?: string
	readonly nodeId?: string
	readonly transitionKey?: string
}

/** Builder validation result */
export interface BuilderValidationResult {
	readonly valid: boolean
	readonly errors: readonly ValidationResult[]
	readonly warnings: readonly ValidationResult[]
}

/** Guard validation result */
export interface GuardValidationResult {
	readonly transitionKey:  string
	readonly guard: string
	readonly valid: boolean
	readonly error?: string
}

/** Boundary check result */
export interface BoundaryCheck {
	readonly hasStartNodes: boolean
	readonly hasEndNodes: boolean
	readonly startNodes: readonly string[]
	readonly endNodes:  readonly string[]
	readonly missingStart: boolean
	readonly missingEnd: boolean
}

/** Custom validation rule */
export interface ValidationRule {
	readonly name: string
	readonly description: string
	readonly severity: ValidationSeverity
	readonly validate: (graph: ProceduralGraphInterface) => ValidationResult
}

// ============================================================================
// Analysis Types
// ============================================================================

/** Loop information from analysis */
export interface LoopInfo {
	readonly nodes: readonly string[]
	readonly frequency: number
	readonly avgDuration: number
	readonly loopType: LoopType
	readonly exitTransitions: readonly string[]
}

/** Loop types */
export type LoopType = 'hot' | 'infinite' | 'unproductive' | 'hierarchical' | 'automatable'

/** Loop detection options */
export interface LoopDetectionOptions {
	readonly threshold?:  number
	readonly maxLength?: number
	readonly minFrequency?: number
}

/** Bottleneck information from analysis */
export interface BottleneckInfo {
	readonly nodeId: string
	readonly incomingTraffic: number
	readonly outgoingTraffic: number
	readonly avgDelay: number
	readonly maxDelay:  number
	readonly congestionScore: number
}

/** Bottleneck detection options */
export interface BottleneckDetectionOptions {
	readonly trafficThreshold?: number
	readonly delayThreshold?: number
	readonly congestionThreshold?: number
}

/** Automation opportunity from analysis */
export interface AutomationOpportunity {
	readonly sequence: readonly string[]
	readonly frequency: number
	readonly avgDuration: number
	readonly automationType: AutomationType
	readonly suggestion:  string
	readonly confidence: number
}

/** Automation types */
export type AutomationType = 'robotic' | 'llm' | 'scheduled' | 'triggered'

/** Automation discovery options */
export interface AutomationDiscoveryOptions {
	readonly minRepetitions?: number
	readonly minSequenceLength?: number
	readonly maxSequenceLength?: number
	readonly confidenceThreshold?: number
}

/** Strongly connected component */
export interface SCC {
	readonly id: string
	readonly nodes: readonly string[]
	readonly entryPoints: readonly string[]
	readonly exitPoints:  readonly string[]
}

/** Edge classification from DFS */
export type EdgeClassification = 'tree' | 'back' | 'forward' | 'cross'

/** Classified edge */
export interface ClassifiedEdge {
	readonly from: string
	readonly to: string
	readonly classification: EdgeClassification
}

/** Context analysis options */
export interface ContextAnalysisOptions {
	readonly groupBy:  readonly ContextGrouping[]
	readonly timeRange?:  TimeRange
	readonly actorFilter?: readonly Actor[]
}

/** Context grouping dimensions */
export type ContextGrouping = 'actor' | 'path' | 'session' | 'procedure'

/** Time range for analysis */
export interface TimeRange {
	readonly start: number
	readonly end: number
}

/** Contextual analysis result */
export interface ContextualAnalysisResult {
	readonly groupKey: string
	readonly groupValue: string
	readonly patterns: readonly PatternInfo[]
	readonly recommendations: readonly string[]
}

/** Pattern information */
export interface PatternInfo {
	readonly sequence: readonly string[]
	readonly frequency: number
	readonly avgDuration: number
	readonly actors: readonly Actor[]
}

/** Analysis summary */
export interface AnalysisSummary {
	readonly loopCount: number
	readonly bottleneckCount:  number
	readonly automationOpportunityCount: number
	readonly sccCount: number
	readonly avgPathLength: number
	readonly mostFrequentPaths: readonly PatternInfo[]
}

// ============================================================================
// Export/Import Types
// ============================================================================

/** Exported procedural graph for serialization */
export interface ExportedProceduralGraph {
	readonly version: number
	readonly exportedAt: number
	readonly graphVersion?:  GraphVersion
	readonly nodes: readonly Node[]
	readonly transitions: readonly Transition[]
	readonly procedures:  readonly Procedure[]
}

/** Exported weight entry */
export interface ExportedWeight {
	readonly from: string
	readonly to: string
	readonly actor: Actor
	readonly weight: number
	readonly lastUpdated: number
	readonly updateCount: number
}

/** Graph definition for import (JSON/YAML) */
export interface GraphDefinition {
	readonly nodes?:  readonly NodeInput[]
	readonly transitions:  readonly TransitionInput[]
	readonly procedures?:  readonly ProcedureInput[]
	readonly version?: string
}

// ============================================================================
// Callback Types
// ============================================================================

/** Transition callback */
export type TransitionCallback = (
	from: string,
	to: string,
	context: TransitionContext
) => void

/** Prediction callback */
export type PredictionCallback = (
	node: string,
	predictions: readonly string[],
	context: PredictionContext
) => void

/** Session callback */
export type SessionCallback = (session: SessionInfo) => void

/** Session end callback */
export type SessionEndCallback = (
	session: SessionInfo,
	reason: SessionEndReason
) => void

/** Validation callback */
export type ValidationCallback = (results: readonly ValidationResult[]) => void

/** Error callback */
export type ErrorCallback = (error: ActionLoopErrorInterface) => void

// ============================================================================
// Subscription Interfaces
// ============================================================================

/** Procedural graph subscriptions */
export interface ProceduralGraphSubscriptions {
	onValidation(callback: ValidationCallback): Unsubscribe
}

/** Predictive graph subscriptions */
export interface PredictiveGraphSubscriptions {
	onWeightUpdate(
		callback: (from: string, to:  string, actor: Actor, weight:  number) => void
	): Unsubscribe
	onDecay(callback: (decayedCount: number) => void): Unsubscribe
}

/** Workflow engine subscriptions */
export interface WorkflowEngineSubscriptions {
	onTransition(callback: TransitionCallback): Unsubscribe
	onPrediction(callback: PredictionCallback): Unsubscribe
	onSessionStart(callback: SessionCallback): Unsubscribe
	onSessionEnd(callback:  SessionEndCallback): Unsubscribe
	onError(callback: ErrorCallback): Unsubscribe
}

/** Workflow builder subscriptions */
export interface WorkflowBuilderSubscriptions {
	onNodeAdded(callback: (node: Node) => void): Unsubscribe
	onNodeRemoved(callback: (nodeId: string) => void): Unsubscribe
	onTransitionAdded(callback: (transition:  Transition) => void): Unsubscribe
	onTransitionRemoved(callback: (from: string, to:  string) => void): Unsubscribe
	onValidation(callback: ValidationCallback): Unsubscribe
}

/** Workflow validator subscriptions */
export interface WorkflowValidatorSubscriptions {
	onValidationComplete(
		callback: (results: readonly ValidationResult[]) => void
	): Unsubscribe
}

/** Workflow analyzer subscriptions */
export interface WorkflowAnalyzerSubscriptions {
	onAnalysisComplete(
		callback: (analysisType: string, results: unknown) => void
	): Unsubscribe
	onPatternDetected(callback: (pattern: PatternInfo) => void): Unsubscribe
}

// ============================================================================
// Options Interfaces
// ============================================================================

/** Procedural graph options */
export interface ProceduralGraphOptions
	extends SubscriptionToHook<ProceduralGraphSubscriptions> {
	readonly nodes?: readonly NodeInput[]
	readonly transitions:  readonly TransitionInput[]
	readonly procedures?:  readonly ProcedureInput[]
	readonly version?: GraphVersion
	readonly validateOnCreate?: boolean
}

/** Predictive graph options */
export interface PredictiveGraphOptions
	extends SubscriptionToHook<PredictiveGraphSubscriptions> {
	// Algorithm configuration
	readonly decayAlgorithm?: DecayAlgorithm
	readonly decayFactor?: number
	readonly halfLifeMs?: number
	readonly minWeight?: number

	// Cold-start configuration
	readonly coldStart?: ColdStartConfig

	// Opt-in persistence adapter
	readonly persistence?: WeightPersistenceAdapterInterface
}

/** Workflow engine options */
export interface WorkflowEngineOptions
	extends SubscriptionToHook<WorkflowEngineSubscriptions> {
	// Opt-in adapters
	readonly activity?: ActivityTrackerInterface
	readonly eventPersistence?: EventStorePersistenceAdapterInterface

	// Session configuration
	readonly trackSessions?: boolean
	readonly maxSessionDuration?: number
	readonly sessionTimeoutMs?: number

	// Validation configuration
	readonly validateTransitions?: boolean

	// Multi-tenancy configuration
	readonly namespace?: string
	readonly isolationLevel?: IsolationLevel
}

/** Workflow builder options */
export interface WorkflowBuilderOptions
	extends SubscriptionToHook<WorkflowBuilderSubscriptions> {
	readonly validateOnChange?: boolean
	readonly allowDuplicateNodes?: boolean
}

/** Workflow validator options */
export interface WorkflowValidatorOptions
	extends SubscriptionToHook<WorkflowValidatorSubscriptions> {
	readonly strictMode?: boolean
	readonly validateGuards?: boolean
	readonly customRules?: readonly ValidationRule[]
}

/** Workflow analyzer options */
export interface WorkflowAnalyzerOptions
	extends SubscriptionToHook<WorkflowAnalyzerSubscriptions> {
	readonly enableStreaming?: boolean
	readonly batchSize?: number
	readonly analysisDepth?: number
}

// ============================================================================
// Error Types
// ============================================================================

/** ActionLoop error codes */
export type ActionLoopErrorCode =
	// Graph errors
	| 'INVALID_TRANSITION'
	| 'NODE_NOT_FOUND'
	| 'DUPLICATE_NODE'
	| 'DUPLICATE_TRANSITION'
	| 'CYCLE_DETECTED'
	| 'DISCONNECTED_GRAPH'
	// Engine errors
	| 'SESSION_NOT_FOUND'
	| 'SESSION_EXPIRED'
	| 'SESSION_ALREADY_ENDED'
	| 'INVALID_ACTOR'
	| 'INVALID_CONTEXT'
	// Validation errors
	| 'DANGLING_NODE'
	| 'UNREACHABLE_NODE'
	| 'MISSING_START_NODE'
	| 'MISSING_END_NODE'
	| 'GUARD_SYNTAX_ERROR'
	| 'INVALID_PROCEDURE'
	// Builder errors
	| 'BUILD_FAILED'
	| 'IMPORT_FAILED'
	| 'EXPORT_FAILED'
	// Analyzer errors
	| 'ANALYSIS_FAILED'
	| 'INSUFFICIENT_DATA'
	// Predictive errors
	| 'MODEL_MISMATCH'
	| 'WEIGHT_OVERFLOW'
	// Persistence errors
	| 'PERSISTENCE_FAILED'
	| 'LOAD_FAILED'
	| 'SAVE_FAILED'
	// General
	| 'UNKNOWN'

/** ActionLoop error data */
export interface ActionLoopErrorData {
	readonly code: ActionLoopErrorCode
	readonly message: string
	readonly cause?:  Error
	readonly nodeId?: string
	readonly transitionKey?:  string
	readonly sessionId?: string
}

/** ActionLoop error class type */
export type ActionLoopErrorInterface = Error & ActionLoopErrorData

// ============================================================================
// Behavioral Interfaces
// ============================================================================

/**
 * Procedural Graph interface - static graph of valid transitions.
 *
 * Encodes every allowed action transition, serving as the single source
 * of truth for workflow compliance.
 */
export interface ProceduralGraphInterface
	extends ProceduralGraphSubscriptions,
		Destroyable {
	// ---- Accessor Methods ----

	/** Get node by ID */
	getNode(id: string): Node | undefined

	/** Get all nodes */
	getNodes(): readonly Node[]

	/** Check if node exists */
	hasNode(id: string): boolean

	/** Get outgoing transitions from a node */
	getTransitions(from: string): readonly Transition[]

	/** Get incoming transitions to a node */
	getTransitionsTo(to: string): readonly Transition[]

	/** Get all transitions */
	getAllTransitions(): readonly Transition[]

	/** Check if transition exists */
	hasTransition(from: string, to: string): boolean

	/** Get transition by from/to */
	getTransition(from: string, to: string): Transition | undefined

	/** Get procedure by ID */
	getProcedure(id: string): Procedure | undefined

	/** Get all procedures */
	getProcedures(): readonly Procedure[]

	/** Check if procedure exists */
	hasProcedure(id: string): boolean

	/** Get graph statistics */
	getStats(): GraphStats

	/** Check if node is a start node (no incoming transitions) */
	isStartNode(id: string): boolean

	/** Check if node is an end node (no outgoing transitions) */
	isEndNode(id: string): boolean

	/** Get all start nodes */
	getStartNodes(): readonly string[]

	/** Get all end nodes */
	getEndNodes(): readonly string[]

	/** Get graph version */
	getVersion(): GraphVersion | undefined

	// ---- Validation Methods ----

	/** Run all validations */
	validate(): readonly ValidationResult[]

	/** Check if graph is valid */
	isValid(): boolean

	// ---- Export Methods ----

	/** Export for serialization */
	export(): ExportedProceduralGraph
}

/**
 * Predictive Graph interface - dynamic weight overlay.
 *
 * Overlays dynamic weights on Procedural Graph transitions,
 * learning from usage patterns to improve predictions.
 */
export interface PredictiveGraphInterface
	extends PredictiveGraphSubscriptions,
		Destroyable {
	// ---- Accessor Methods ----

	/** Get weight for a specific transition and actor */
	getWeight(from: string, to: string, actor:  Actor): number

	/** Get all weighted transitions from a node for an actor */
	getWeights(nodeId: string, actor: Actor): readonly WeightedTransition[]

	/** Get model identifier */
	getModelId(): string

	/** Get decay configuration */
	getDecayConfig(): DecayConfig

	/** Get statistics */
	getStats(): PredictiveGraphStats

	/** Check if weight exists */
	hasWeight(from: string, to: string, actor: Actor): boolean

	/** Get total transition count across all weights */
	getTransitionCount(): number

	/** Check if warmup threshold has been met */
	isWarmupComplete(): boolean

	// ---- Mutator Methods ----

	/** Increment transition weight (applies decay) */
	updateWeight(from: string, to: string, actor: Actor): void

	/** Update weight with engagement factor */
	updateWeightWithEngagement(
		from: string,
		to: string,
		actor:  Actor,
		engagementScore: number
	): void

	/** Set explicit weight value */
	setWeight(from: string, to: string, actor: Actor, weight:  number): void

	/** Apply decay to all weights */
	applyDecay(): number

	/** Clear all weights */
	clear(): void

	/** Clear weights for specific actor */
	clearActor(actor: Actor): void

	// ---- Preload Methods ----

	/** Preload historical records */
	preload(records: readonly PreloadRecord[]): void

	// ---- Persistence Methods ----

	/** Save weights to persistence adapter (requires persistence option) */
	saveWeights(): Promise<void>

	/** Load weights from persistence adapter (requires persistence option) */
	loadWeights(): Promise<boolean>

	// ---- Export/Import Methods ----

	/** Export for persistence */
	export(): ExportedPredictiveGraph

	/** Import from export */
	import(data: ExportedPredictiveGraph): void
}

/**
 * Workflow Engine interface - runtime engine for PPALS.
 *
 * Bridges static Procedural Graph rules and dynamic Predictive Graph
 * learning to power the observe-update-predict-recommend cycle.
 */
export interface WorkflowEngineInterface
	extends WorkflowEngineSubscriptions,
		Destroyable {
	// ---- Core Methods ----

	/** Record a transition event */
	recordTransition(from: string, to:  string, context: TransitionContext): void

	/** Record multiple transitions in batch */
	recordTransitions(transitions: readonly BatchTransition[]): void

	/** Predict next actions from current node */
	predictNext(node: string, context:  PredictionContext): readonly string[]

	/** Get detailed prediction with confidence scores */
	predictNextDetailed(
		node: string,
		context: PredictionContext
	): DetailedPrediction

	// ---- Validation Methods ----

	/** Validate a transition without recording */
	isValidTransition(from: string, to:  string): boolean

	/** Get valid transitions from a node */
	getValidTransitions(from: string): readonly Transition[]

	// ---- Session Methods ----

	/** Start a new session */
	startSession(actor: Actor, sessionId?:  string): SessionInfo

	/** Get session by ID */
	getSession(sessionId:  string): SessionInfo | undefined

	/** Get active session for actor */
	getActiveSession(actor:  Actor): SessionInfo | undefined

	/** Check if session exists */
	hasSession(sessionId: string): boolean

	/** End a session */
	endSession(sessionId:  string, reason:  SessionEndReason): void

	/** Resume an existing session */
	resumeSession(sessionId: string, options:  SessionResumeOptions): void

	/** Get session action chain */
	getSessionChain(actor: Actor, options?: ChainOptions): ActionChain

	/** Truncate session chain */
	truncateChain(sessionId: string, strategy?:  TruncationStrategy): void

	// ---- Event Methods (requires eventPersistence adapter) ----

	/** Get events matching filter */
	getEvents(filter: EventFilter): Promise<readonly TransitionEvent[]>

	/** Get count of events matching filter */
	getEventCount(filter?:  EventFilter): Promise<number>

	// ---- Graph Access ----

	/** Get underlying procedural graph */
	getProceduralGraph(): ProceduralGraphInterface

	/** Get underlying predictive graph */
	getPredictiveGraph(): PredictiveGraphInterface

	/** Get activity tracker (if configured) */
	getActivityTracker(): ActivityTrackerInterface | undefined
}

/**
 * Workflow Builder interface - programmatic graph construction.
 *
 * Provides an API for assembling Procedural Graphs with
 * real-time validation and multiple export formats.
 */
export interface WorkflowBuilderInterface
	extends WorkflowBuilderSubscriptions,
		Destroyable {
	// ---- Builder Methods ----

	/** Add a node */
	addNode(node: NodeInput): this

	/** Add multiple nodes */
	addNodes(nodes: readonly NodeInput[]): this

	/** Remove a node */
	removeNode(id: string): this

	/** Update a node */
	updateNode(id:  string, updates:  Partial<NodeInput>): this

	/** Add a transition */
	addTransition(transition: TransitionInput): this

	/** Add multiple transitions */
	addTransitions(transitions: readonly TransitionInput[]): this

	/** Remove a transition */
	removeTransition(from: string, to:  string): this

	/** Update a transition */
	updateTransition(
		from: string,
		to: string,
		updates:  Partial<TransitionInput>
	): this

	/** Add a procedure */
	addProcedure(procedure: ProcedureInput): this

	/** Remove a procedure */
	removeProcedure(id: string): this

	/** Update a procedure */
	updateProcedure(id: string, updates: Partial<ProcedureInput>): this

	// ---- Accessor Methods ----

	/** Get current nodes */
	getNodes(): readonly Node[]

	/** Get current transitions */
	getTransitions(): readonly Transition[]

	/** Get current procedures */
	getProcedures(): readonly Procedure[]

	/** Check if node exists */
	hasNode(id: string): boolean

	/** Check if transition exists */
	hasTransition(from:  string, to: string): boolean

	// ---- Validation Methods ----

	/** Validate current state */
	validate(): BuilderValidationResult

	/** Check if current state is valid */
	isValid(): boolean

	// ---- Build Methods ----

	/** Build the procedural graph */
	build(): ProceduralGraphInterface

	/** Clear all nodes, transitions, and procedures */
	clear(): this

	// ---- Export/Import Methods ----

	/** Export as JSON string */
	toJSON(): string

	/** Export as YAML string */
	toYAML(): string

	/** Import from JSON string */
	fromJSON(json: string): this

	/** Import from YAML string */
	fromYAML(yaml: string): this

	/** Import from graph definition */
	fromDefinition(definition: GraphDefinition): this
}

/**
 * Workflow Validator interface - static analysis.
 *
 * Performs comprehensive static checks on Procedural Graph
 * definitions to enforce structural and guard-logic correctness.
 */
export interface WorkflowValidatorInterface
	extends WorkflowValidatorSubscriptions,
		Destroyable {
	// ---- Validation Methods ----

	/** Run all static checks */
	runStaticChecks(): readonly ValidationResult[]

	/** Find dangling nodes (no outgoing transitions) */
	findDanglingNodes(): readonly string[]

	/** Find unreachable nodes (no incoming transitions except start) */
	findUnreachableNodes(): readonly string[]

	/** Check for missing boundary nodes */
	findMissingBoundaryNodes(): BoundaryCheck

	/** Validate guard condition syntax */
	validateGuards(): readonly GuardValidationResult[]

	/** Validate procedure definitions */
	validateProcedures(): readonly ValidationResult[]

	/** Check graph connectivity */
	checkConnectivity(): ValidationResult

	/** Check for cycles (if disallowed) */
	checkCycles(): readonly string[][]

	// ---- State Methods ----

	/** Check if graph passes all validations */
	isValid(): boolean

	/** Get error count */
	getErrorCount(): number

	/** Get warning count */
	getWarningCount(): number

	/** Get all results */
	getResults(): readonly ValidationResult[]
}

/**
 * Workflow Analyzer interface - pattern detection.
 *
 * Inspects runtime logs and graph snapshots to uncover
 * looping patterns, bottlenecks, and automation candidates.
 */
export interface WorkflowAnalyzerInterface
	extends WorkflowAnalyzerSubscriptions,
		Destroyable {
	// ---- Loop Detection Methods ----

	/** Find hot loops (high-frequency circuits) */
	findHotLoops(options?: LoopDetectionOptions): readonly LoopInfo[]

	/** Find infinite loops (walks exceeding configured length) */
	findInfiniteLoops(options?: LoopDetectionOptions): readonly LoopInfo[]

	/** Find unproductive loops (low progression metrics) */
	findUnproductiveLoops(): readonly LoopInfo[]

	/** Find hierarchical loops (nested across procedures) */
	findHierarchicalLoops(): readonly LoopInfo[]

	/** Find automatable loops */
	findAutomatableLoops(): readonly LoopInfo[]

	// ---- SCC Detection Methods ----

	/** Find strongly connected components using Tarjan's algorithm */
	findStronglyConnectedComponents(): readonly SCC[]

	/** Find strongly connected components using Kosaraju's algorithm */
	findSCCKosaraju(): readonly SCC[]

	// ---- Edge Classification Methods ----

	/** Classify edges via DFS */
	classifyEdges(): readonly ClassifiedEdge[]

	// ---- Bottleneck Detection Methods ----

	/** Find bottleneck nodes */
	findBottlenecks(options?: BottleneckDetectionOptions): readonly BottleneckInfo[]

	// ---- Automation Discovery Methods ----

	/** Find automation opportunities */
	findAutomationOpportunities(
		options?: AutomationDiscoveryOptions
	): readonly AutomationOpportunity[]

	// ---- Context Analysis Methods ----

	/** Analyze by context dimensions */
	analyzeByContext(
		options:  ContextAnalysisOptions
	): readonly ContextualAnalysisResult[]

	/** Compare patterns across contexts */
	compareContexts(context1: string, context2: string): readonly PatternInfo[]

	// ---- Statistics Methods ----

	/** Get analysis summary */
	getSummary(): AnalysisSummary
}

// ============================================================================
// Factory Function Types
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
export type CreateProceduralGraph = (
	options: ProceduralGraphOptions
) => ProceduralGraphInterface

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
export type CreatePredictiveGraph = (
	procedural: ProceduralGraphInterface,
	options?: PredictiveGraphOptions
) => PredictiveGraphInterface

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
export type CreateWorkflowEngine = (
	procedural: ProceduralGraphInterface,
	predictive: PredictiveGraphInterface,
	options?: WorkflowEngineOptions
) => WorkflowEngineInterface

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
 * builder.addTransition({ from: 'login', to:  'dashboard', weight: 1, actor: 'user' })
 * const graph = builder.build()
 * ```
 */
export type CreateWorkflowBuilder = (
	options?: WorkflowBuilderOptions
) => WorkflowBuilderInterface

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
export type CreateWorkflowValidator = (
	procedural: ProceduralGraphInterface,
	options?: WorkflowValidatorOptions
) => WorkflowValidatorInterface

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
export type CreateWorkflowAnalyzer = (
	procedural: ProceduralGraphInterface,
	predictive:  PredictiveGraphInterface,
	options?: WorkflowAnalyzerOptions
) => WorkflowAnalyzerInterface

/**
 * Create an Activity Tracker.
 *
 * @param config - Optional activity tracker configuration
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
 * ```
 */
export type CreateActivityTracker = (
	config?: ActivityTrackerOptions
) => ActivityTrackerInterface

// ============================================================================
// Utility Function Types
// ============================================================================

/** Check if ActionLoop is supported in current environment */
export type IsActionLoopSupported = () => boolean

/** Check if activity tracking is supported in current environment */
export type IsActivityTrackingSupported = () => boolean

/** Check if error is an ActionLoop error */
export type IsActionLoopError = (error: unknown) => error is ActionLoopErrorInterface

/** Create an ActionLoop error */
export type CreateActionLoopError = (
	code: ActionLoopErrorCode,
	message: string,
	data?:  Partial<Omit<ActionLoopErrorData, 'code' | 'message'>>
) => ActionLoopErrorInterface

// ============================================================================
// Type Guards
// ============================================================================

/** Check if value is a Node */
export type IsNode = (value: unknown) => value is Node

/** Check if value is a Transition */
export type IsTransition = (value:  unknown) => value is Transition

/** Check if value is a Procedure */
export type IsProcedure = (value: unknown) => value is Procedure

/** Check if value is a SessionInfo */
export type IsSessionInfo = (value: unknown) => value is SessionInfo

/** Check if value is a DwellRecord */
export type IsDwellRecord = (value: unknown) => value is DwellRecord

// ============================================================================
// Internal Implementation Types
// ============================================================================

/**
 * Weight entry for predictive graph weight storage.
 * @internal Used by PredictiveGraph implementation
 */
export interface WeightEntry {
	readonly weight: number
	readonly lastUpdated: number
	readonly updateCount: number
}

/**
 * Session entry for engine session storage.
 * @internal Used by WorkflowEngine implementation
 */
export interface SessionEntry {
	info: SessionInfo
	readonly events: ActionEvent[]
	active: boolean
}

/**
 * Activity state for internal tracking.
 * @internal Used by ActivityTracker implementation
 */
export interface ActivityState {
	currentNodeId: string | undefined
	enterTime: number
	activeTime: number
	idleTime: number
	lastActivityTime: number
	engagement: EngagementState
}

/** Formatted ActionLoop context for LLM consumption */
export interface ActionLoopLLMContext {
	/** Current node/location */
	readonly currentNode: string
	/** Predictions with confidence */
	readonly predictions: readonly FormattedPrediction[]
	/** Whether predictions are reliable */
	readonly warmupComplete: boolean
	/** Total transitions recorded */
	readonly transitionCount:  number
	/** Recent activity summary */
	readonly recentActivity: readonly ActivitySummary[]
	/** Current engagement state */
	readonly engagement: EngagementState
	/** Pattern insights (if analyzer available) */
	readonly patterns?:  PatternInsights
}

/** Formatted prediction for LLM */
export interface FormattedPrediction {
	readonly nodeId: string
	readonly label: string
	readonly confidencePercent: number
	readonly reasoning: string
}

/** Activity summary for LLM */
export interface ActivitySummary {
	readonly from: string
	readonly to: string
	readonly actor: string
	readonly timestamp: number
	readonly dwellSeconds?:  number
	readonly engagement?: EngagementState
}

/** Pattern insights for LLM */
export interface PatternInsights {
	readonly frequentPaths:  readonly string[]
	readonly bottlenecks: readonly string[]
	readonly automationCandidates: readonly string[]
	readonly avgSessionMinutes:  number
}

/** Context formatter options */
export interface ContextFormatterOptions {
	/** Maximum recent events to include */
	readonly maxRecentEvents?: number
	/** Include pattern analysis */
	readonly includePatterns?: boolean
	/** Include dwell times */
	readonly includeDwell?: boolean
	/** Node label resolver */
	readonly getNodeLabel?: (nodeId: string) => string
}

/** ActionLoop context formatter interface */
export interface ActionLoopContextFormatterInterface {
	/** Format ActionLoop state for LLM context */
	format(
		predictions: DetailedPrediction,
		events: readonly TransitionEvent[],
		options?:  ContextFormatterOptions
	): ActionLoopLLMContext

	/** Format as natural language for system prompt */
	toNaturalLanguage(context: ActionLoopLLMContext): string

	/** Format as structured JSON for tool context */
	toJSON(context: ActionLoopLLMContext): string
}

/**
 * Factory for context formatter.
 */
export type CreateActionLoopContextFormatter = (
	options?:  ContextFormatterOptions
) => ActionLoopContextFormatterInterface
