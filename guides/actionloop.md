# @mikesaintsg/actionloop API Guide

> **Predictive Procedural Action Loop System (PPALS) — Combine deterministic workflow rules with adaptive, data-driven predictions to guide users through complex multi-step workflows with activity-aware intelligence.**

**Version:** 2.0.0 | **Tests:** 280+ passing | **Bundle:** Zero dependencies

---

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Core Concepts](#core-concepts)
5. [Procedural Graph](#procedural-graph)
6. [Predictive Graph](#predictive-graph)
7. [Workflow Engine](#workflow-engine)
8. [Activity Tracking](#activity-tracking)
9. [Confidence Scoring](#confidence-scoring)
10. [Event Persistence](#event-persistence)
11. [Weight Persistence](#weight-persistence)
12. [Cold-Start Strategies](#cold-start-strategies)
13. [Workflow Builder](#workflow-builder)
14. [Workflow Validator](#workflow-validator)
15. [Workflow Analyzer](#workflow-analyzer)
16. [Graph Versioning](#graph-versioning)
17. [Multi-Tenancy](#multi-tenancy)
18. [Error Handling](#error-handling)
19. [TypeScript Integration](#typescript-integration)
20. [Performance Tips](#performance-tips)
21. [Browser Compatibility](#browser-compatibility)
22. [Integration with Ecosystem](#integration-with-ecosystem)
23. [API Reference](#api-reference)
24. [License](#license)

---

## Introduction

### Value Proposition

`@mikesaintsg/actionloop` provides: 

- **Deterministic Compliance** — ProceduralGraph defines all valid transitions; predictions never violate rules
- **Adaptive Learning** — PredictiveGraph learns from usage patterns to rank recommendations
- **Activity-Aware Intelligence** — Track active/idle time to weight predictions by engagement, not just frequency
- **Confidence Scoring** — Know how reliable predictions are with sample size and recency factors
- **Pluggable Persistence** — Opt-in adapters for event sourcing and weight storage
- **Cold-Start Handling** — Graceful degradation when historical data is insufficient
- **Sub-50ms Predictions** — Optimized for real-time interactive UIs
- **Zero Dependencies** — Built entirely on native TypeScript APIs

### Use Cases

| Use Case | Feature |
|----------|---------|
| Multi-step onboarding | Guide users through registration with contextual suggestions |
| E-commerce checkout | Predict likely next steps while enforcing valid sequences |
| Account management | Intelligent navigation with activity-aware recommendations |
| Approval workflows | Route documents with confidence-scored next-action suggestions |
| Form wizards | Suggest optimal paths through complex multi-page forms |
| Task management | Recommend actions based on engagement patterns, not just clicks |
| Support ticketing | Route tickets with audit-ready event trails |
| SaaS applications | Multi-tenant workflow isolation with namespace support |

### When to Use actionloop

| Scenario | Use actionloop | Use alternatives |
|----------|----------------|------------------|
| Multi-step workflows with defined valid transitions | ✅ | |
| Need to enforce business rules on navigation | ✅ | |
| Want adaptive recommendations without ML training | ✅ | |
| Need sub-50ms recommendation latency | ✅ | |
| Require audit trails for compliance | ✅ | |
| Need activity-aware predictions (not just click count) | ✅ | |
| Simple linear wizards without branching | | ✅ |
| Fully random navigation patterns | | ✅ |
| Server-side only workflow orchestration | | ✅ |

---

## Installation

```bash
npm install @mikesaintsg/actionloop
```

For persistence adapters: 

```bash
npm install @mikesaintsg/adapters
```

**Requirements:**

- Node.js ≥ 22. 0.0
- TypeScript ≥ 5.0 (for type definitions)
- ES2022+ environment (browser or Node.js)

---

## Quick Start

```ts
import {
	createProceduralGraph,
	createPredictiveGraph,
	createWorkflowEngine,
	createActivityTracker,
} from '@mikesaintsg/actionloop'

// 1. Define your workflow transitions
const transitions = [
	{ from: 'login', to: 'dashboard', weight: 1, actor: 'user' },
	{ from: 'dashboard', to: 'settings', weight: 1, actor: 'user' },
	{ from: 'dashboard', to: 'profile', weight: 1, actor: 'user' },
	{ from: 'dashboard', to: 'billing', weight: 1, actor: 'user' },
	{ from: 'settings', to: 'dashboard', weight: 1, actor: 'user' },
	{ from: 'profile', to: 'dashboard', weight: 1, actor: 'user' },
	{ from: 'billing', to: 'dashboard', weight: 1, actor: 'user' },
] as const

// 2. Create the static ProceduralGraph
const procedural = createProceduralGraph({ transitions })

// 3. Create the dynamic PredictiveGraph overlay
const predictive = createPredictiveGraph(procedural, {
	decayAlgorithm: 'ewma',
	decayFactor: 0.9,
	coldStart: {
		strategy: 'procedural-weight',
		warmupThreshold: 50,
	},
})

// 4. Create the activity tracker for engagement-aware predictions
const activity = createActivityTracker({
	idleThreshold: 30000,
	awayThreshold: 300000,
})

// 5. Create the WorkflowEngine
const engine = createWorkflowEngine(procedural, predictive, {
	activity,
	trackSessions: true,
	validateTransitions: true,
})

// 6. Start a session and record transitions
const session = engine.startSession('user')

engine.recordTransition('login', 'dashboard', {
	actor: 'user',
	sessionId: session.id,
	path: '/app/dashboard',
})

// 7. Get predictions with confidence scores
const predictions = engine.predictNextDetailed('dashboard', {
	actor: 'user',
	sessionId:  session.id,
	path: '/app/dashboard',
	count: 3,
})

console.log('Recommended actions:', predictions.predictions)
// => [
//   { nodeId: 'billing', confidence: 0.85, factors: { ...  } },
//   { nodeId: 'settings', confidence: 0.62, factors: { ...  } },
//   { nodeId: 'profile', confidence:  0.41, factors: { ...  } },
// ]

// 8. Check if predictions are "warm" (have sufficient data)
if (predictions.warmupComplete) {
	showConfidentSuggestions(predictions)
} else {
	showDefaultNavigation()
}

// 9. Cleanup when done
engine.destroy()
activity.destroy()
```

### With Persistence

```ts
import {
	createIndexedDBEventPersistenceAdapter,
	createIndexedDBWeightPersistenceAdapter,
} from '@mikesaintsg/adapters'

// Create persistence adapters
const eventPersistence = createIndexedDBEventPersistenceAdapter({
	databaseName: 'my-app-events',
})

const weightPersistence = createIndexedDBWeightPersistenceAdapter({
	databaseName:  'my-app-weights',
	autoSaveInterval: 60000,
})

// Use in graphs
const predictive = createPredictiveGraph(procedural, {
	persistence: weightPersistence,
})

const engine = createWorkflowEngine(procedural, predictive, {
	eventPersistence,
})

// Weights auto-save; events persist for audit trail
```

---

## Core Concepts

### PPALS Runtime Cycle

The Predictive Procedural Action Loop System runs a continuous five-step cycle: 

```text
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   OBSERVE   │────▶│   RECORD    │────▶│   UPDATE    │────▶│   PREDICT   │────▶│  RECOMMEND  │
│ transition  │     │   event     │     │  weights    │     │   merge     │     │   top-k     │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       ▲                                                                               │
       └───────────────────────────────────────────────────────────────────────────────┘
```

1. **Observe**:  Capture each transition event with actor, timestamp, session context, and engagement state
2. **Record**: Store immutable event via persistence adapter (if configured)
3. **Update**:  Adjust PredictiveGraph weights using recency, frequency, dwell time, and decay rules
4. **Predict**:  Merge static ProceduralGraph priorities with dynamic PredictiveGraph weights and confidence factors
5. **Recommend**: Return top-k valid actions with confidence scores, ensuring no invalid transitions are suggested

### Two-Graph Architecture

ActionLoop uses two complementary graph models:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                          ProceduralGraph                                    │
│  ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐           │
│  │  login  │─────▶│dashboard│─────▶│ settings│      │ billing │           │
│  └─────────┘      └────┬────┘      └─────────┘      └─────────┘           │
│                        │                 ▲               ▲                 │
│                        ├─────────────────┴───────────────┘                 │
│                        ▼                                                   │
│                   ┌─────────┐                                              │
│                   │ profile │                                              │
│                   └─────────┘                                              │
│                                                                            │
│  Static rules:  defines ALL valid transitions                               │
└────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                          PredictiveGraph                                    │
│                                                                            │
│  login ──[w:  0.9]──▶ dashboard ──[w: 0.85, c: 0.92]──▶ billing             │
│                              ├──[w: 0.62, c: 0.78]──▶ settings             │
│                              └──[w:  0.41, c: 0.65]──▶ profile              │
│                                                                            │
│  Dynamic weights with confidence:  learned from usage + engagement patterns │
└────────────────────────────────────────────────────────────────────────────┘
```

| Graph | Purpose | Mutability | Contents |
|-------|---------|------------|----------|
| **ProceduralGraph** | Define valid transitions | Static (immutable at runtime) | Nodes, transitions, procedures, guards |
| **PredictiveGraph** | Learn usage patterns | Dynamic (updated on each event) | Per-transition weights by actor with confidence |

### Adapter Architecture

ActionLoop follows the ecosystem adapter pattern for pluggable behavior:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                        WorkflowEngineInterface                              │
│  recordTransition() │ predictNext() │ predictNextDetailed() │ startSession()│
├────────────────────────────────────────────────────────────────────────────┤
│                           Required Parameters                               │
│  ┌──────────────────────────┐    ┌──────────────────────────┐              │
│  │    ProceduralGraph       │    │    PredictiveGraph       │              │
│  │    (first param)         │    │    (second param)        │              │
│  └──────────────────────────┘    └──────────────────────────┘              │
├────────────────────────────────────────────────────────────────────────────┤
│                           Opt-In Adapters                                   │
│  ┌──────────────────────────┐    ┌──────────────────────────┐              │
│  │  ActivityTrackerInterface │    │ EventStorePersistence    │              │
│  │  (engagement tracking)   │    │ AdapterInterface         │              │
│  └──────────────────────────┘    └──────────────────────────┘              │
│                                                                            │
│  ┌──────────────────────────┐                                              │
│  │  WeightPersistence       │ ← Configured on PredictiveGraph              │
│  │  AdapterInterface        │                                              │
│  └──────────────────────────┘                                              │
└────────────────────────────────────────────────────────────────────────────┘
```

| Adapter | Category | Purpose | Package |
|---------|----------|---------|---------|
| `ActivityTrackerInterface` | Enhancement | Engagement tracking | `actionloop` |
| `EventStorePersistenceAdapterInterface` | Persistence | Event audit trail | `core` (interface), `adapters` (impl) |
| `WeightPersistenceAdapterInterface` | Persistence | Weight storage | `core` (interface), `adapters` (impl) |

### Actor Types

Every transition is tagged with an actor type for role-specific analytics:

```ts
type Actor = 'user' | 'system' | 'automation'
```

- **user**: Human-initiated actions (clicks, form submissions)
- **system**:  Platform-triggered events (timeouts, errors, notifications)
- **automation**: Robotic/LLM-triggered workflows (scheduled tasks, bots)

Each actor maintains separate weight tracks, enabling role-specific predictions.

### Engagement States

Activity tracking provides engagement context for each transition:

```ts
type EngagementState = 'active' | 'idle' | 'away' | 'unknown'
```

- **active**: User is actively interacting (mouse, keyboard, touch)
- **idle**: No interaction for `idleThreshold` (default: 30s)
- **away**: Tab not visible or no interaction for `awayThreshold` (default: 5min)
- **unknown**: Tracking not available or disabled

Engagement state affects weight calculations—active time counts more than idle time. 

---

## Procedural Graph

The ProceduralGraph is your single source of truth for valid workflow moves. 

### Creating a Procedural Graph

```ts
import { createProceduralGraph } from '@mikesaintsg/actionloop'

const procedural = createProceduralGraph({
	transitions: [
		{ from:  'login', to: 'dashboard', weight: 1, actor: 'user' },
		{ from: 'dashboard', to: 'checkout', weight: 1, actor: 'user' },
		{ from: 'checkout', to: 'confirmation', weight: 1, actor: 'user' },
		{ from: 'checkout', to: 'timeout', weight: 1, actor: 'system' },
	],
	procedures: [
		{ id: 'auth', actions: ['login', 'dashboard'] },
		{ id: 'purchase', actions: ['dashboard', 'checkout', 'confirmation'] },
	],
	version: {
		version: '1.0.0',
		createdAt: Date. now(),
		breaking: false,
	},
	validateOnCreate: true,
})
```

### Nodes and Transitions

**Nodes** represent discrete actions or system events:

```ts
interface Node {
	readonly id: string
	readonly label?:  string
	readonly type?:  NodeType
	readonly metadata?:  Readonly<NodeMetadata>
}

type NodeType = 'action' | 'session' | 'system' | 'placeholder'

interface NodeMetadata {
	readonly availablePaths?:  readonly string[]
	readonly description?: string
	readonly category?: string
	readonly tags?: readonly string[]
}
```

**Transitions** define allowed moves between nodes:

```ts
interface Transition {
	readonly from: string
	readonly to:  string
	readonly weight: number
	readonly actor: Actor
	readonly metadata?:  Readonly<TransitionMetadata>
}

interface TransitionMetadata {
	readonly guard?: string
	readonly version?: string
	readonly relevantPaths?: readonly string[]
	readonly description?: string
}
```

### Procedures as Subgraphs

Procedures group related actions into reusable subgraphs:

```ts
interface Procedure {
	readonly id:  string
	readonly actions: readonly string[]
	readonly metadata?: Readonly<ProcedureMetadata>
}

interface ProcedureMetadata {
	readonly primaryPaths?: readonly string[]
	readonly description?: string
	readonly version?: string
}
```

Procedures connect via **shared nodes**—when the last action of one procedure matches the first of another, users flow seamlessly between workflows.

### Guard Conditions

Guard conditions enforce prerequisites on transitions:

```ts
const transitions = [
	{
		from: 'checkout',
		to:  'payment',
		weight: 1,
		actor: 'user',
		metadata: {
			guard: 'cart. items.length > 0 && user.verified === true',
			description: 'User must have items in cart and be verified',
		},
	},
]
```

Guards are stored as metadata for documentation and validation.  Runtime evaluation is the application's responsibility—use the `WorkflowValidator` to check guard syntax.

---

## Predictive Graph

The PredictiveGraph overlays dynamic weights on ProceduralGraph transitions.

### Creating a Predictive Graph

```ts
import { createPredictiveGraph } from '@mikesaintsg/actionloop'

const predictive = createPredictiveGraph(procedural, {
	decayAlgorithm: 'ewma',
	decayFactor:  0.9,
	minWeight: 0.01,
	coldStart: {
		strategy: 'hybrid',
		warmupThreshold: 100,
		preloadRecords: [
			{ from: 'login', to: 'dashboard', actor: 'user', count: 50 },
		],
	},
	onWeightUpdate: (from, to, actor, weight) => {
		console.log(`Weight updated: ${from} → ${to} (${actor}): ${weight}`)
	},
})
```

### With Persistence

```ts
import { createIndexedDBWeightPersistenceAdapter } from '@mikesaintsg/adapters'

const persistence = createIndexedDBWeightPersistenceAdapter({
	databaseName: 'my-app-weights',
	autoSaveInterval: 60000,
})

const predictive = createPredictiveGraph(procedural, {
	persistence,
	decayAlgorithm: 'ewma',
})

// On startup, load existing weights
await predictive.loadWeights()

// Weights auto-save based on interval, or manually: 
await predictive. saveWeights()
```

### Weight Updates

Weights are updated each time a transition is recorded, incorporating engagement data:

```ts
// Automatic update via WorkflowEngine (recommended)
engine.recordTransition('login', 'dashboard', {
	actor: 'user',
	sessionId:  session.id,
	path: '/app/dashboard',
})

// Manual weight operations (advanced use)
predictive.updateWeight('login', 'dashboard', 'user')
predictive.updateWeightWithEngagement('login', 'dashboard', 'user', 0.85)
predictive.setWeight('login', 'dashboard', 'user', 0.75)
```

### Decay Algorithms

Four decay strategies are supported:

```ts
type DecayAlgorithm = 'halflife' | 'ewma' | 'linear' | 'none'
```

**Half-Life Decay** — Weights decay by 50% over configured period: 

```ts
const predictive = createPredictiveGraph(procedural, {
	decayAlgorithm: 'halflife',
	halfLifeMs: 86400000, // 24 hours
})
```

**EWMA** — Exponentially weighted moving average (recommended):

```ts
const predictive = createPredictiveGraph(procedural, {
	decayAlgorithm: 'ewma',
	decayFactor: 0.9, // Higher = more recency bias
})
```

**Linear** — Constant weight loss over time:

```ts
const predictive = createPredictiveGraph(procedural, {
	decayAlgorithm:  'linear',
})
```

**None** — Weights accumulate indefinitely:

```ts
const predictive = createPredictiveGraph(procedural, {
	decayAlgorithm:  'none',
})
```

---

## Workflow Engine

The WorkflowEngine bridges static rules, dynamic learning, and optional adapters.

### Creating a Workflow Engine

```ts
import { createWorkflowEngine } from '@mikesaintsg/actionloop'

const engine = createWorkflowEngine(procedural, predictive, {
	validateTransitions: true,
	trackSessions: true,
	maxSessionDuration: 3600000,
	sessionTimeoutMs: 1800000,
	onTransition: (from, to, context) => {
		console.log(`Transition: ${from} → ${to}`)
	},
	onError: (error) => {
		console.error(`Error: ${error. message}`)
	},
})
```

### With Adapters

```ts
import { createActivityTracker } from '@mikesaintsg/actionloop'
import { createIndexedDBEventPersistenceAdapter } from '@mikesaintsg/adapters'

const activity = createActivityTracker({
	idleThreshold: 30000,
	awayThreshold: 300000,
})

const eventPersistence = createIndexedDBEventPersistenceAdapter({
	databaseName: 'my-app-events',
})

const engine = createWorkflowEngine(procedural, predictive, {
	activity,
	eventPersistence,
	validateTransitions: true,
	trackSessions: true,
})
```

### Recording Transitions

```ts
engine.recordTransition('login', 'dashboard', {
	actor: 'user',
	sessionId:  session.id,
	path: '/app/dashboard',
	metadata: {
		referrer: 'email-campaign',
	},
})
```

Recording a transition: 

1. Validates against ProceduralGraph (throws if invalid and `validateTransitions` is true)
2. Captures current engagement state from ActivityTracker (if configured)
3. Persists event via EventStorePersistenceAdapter (if configured)
4. Computes dwell time from previous transition
5. Updates PredictiveGraph weight via decay-aware algorithm with engagement weighting
6. Emits `onTransition` callback

### Predicting Next Actions

```ts
// Simple prediction (returns node IDs)
const predictions = engine.predictNext('dashboard', {
	actor: 'user',
	sessionId: session.id,
	path:  '/app/dashboard',
	count: 5,
})
// => ['billing', 'settings', 'profile']

// Detailed prediction (includes confidence scores)
const detailed = engine.predictNextDetailed('dashboard', {
	actor:  'user',
	sessionId: session.id,
	path: '/app/dashboard',
	count: 5,
})
// => {
//   predictions: [
//     { nodeId: 'billing', score: 0.85, confidence: 0.92, factors: { ... } },
//     { nodeId:  'settings', score: 0.62, confidence: 0.78, factors: { ... } },
//   ],
//   currentNode: 'dashboard',
//   warmupComplete: true,
//   transitionCount: 1547,
//   computedAt: 1705672800000,
// }
```

### Session Management

```ts
// Start a session
const session = engine.startSession('user')

// Get session info
const info = engine.getSession(session.id)

// Get active session for actor
const active = engine.getActiveSession('user')

// End a session
engine.endSession(session.id, 'completed')

// Resume across page loads
engine.resumeSession(session.id, {
	previousNode: 'checkout',
	actor: 'user',
})

// Get session history
const chain = engine.getSessionChain('user', {
	limit: 100,
	includeMetadata: true,
})
```

Session end reasons: 

```ts
type SessionEndReason = 'completed' | 'abandoned' | 'timeout' | 'error'
```

---

## Activity Tracking

Activity tracking enables engagement-aware predictions that weight transitions by attention, not just click count.

### Creating an Activity Tracker

```ts
import { createActivityTracker } from '@mikesaintsg/actionloop'

const activity = createActivityTracker({
	idleThreshold: 30000,
	awayThreshold: 300000,
	trackVisibility: true,
	onEngagementChange: (state, nodeId) => {
		console.log(`Engagement changed to ${state} on ${nodeId}`)
	},
	onDwellComplete: (record) => {
		console.log(`Dwell on ${record.nodeId}:  ${record.activeTime}ms active`)
	},
})
```

### Dwell Records

Each time a user transitions between nodes, a dwell record is created: 

```ts
interface DwellRecord {
	readonly nodeId: string
	readonly enterTime: number
	readonly exitTime: number
	readonly activeTime: number
	readonly idleTime: number
	readonly engagementScore: number
}
```

The `engagementScore` (0.0–1.0) represents the ratio of active time to total dwell time. 

### Using Activity Data

Activity data is automatically incorporated when you pass the tracker to `WorkflowEngine`:

```ts
const engine = createWorkflowEngine(procedural, predictive, {
	activity,
})

// Transitions now include engagement data automatically
engine.recordTransition('dashboard', 'billing', context)
```

### Manual Activity Tracking

For advanced use cases: 

```ts
// Start tracking a node
activity.enterNode('dashboard')

// Get current engagement state
const state = activity.getEngagementState()

// Get current incomplete dwell
const partialDwell = activity.getCurrentDwell()

// Complete the dwell (called automatically by engine)
const record = activity.exitNode()

// Get all dwell history
const history = activity.getDwellHistory()
```

### Feature Detection

```ts
import { isActivityTrackingSupported } from '@mikesaintsg/actionloop'

if (isActivityTrackingSupported()) {
	const activity = createActivityTracker()
	// Use activity tracker
} else {
	// Node. js or unsupported browser—omit activity adapter
	const engine = createWorkflowEngine(procedural, predictive)
}
```

---

## Confidence Scoring

Confidence scoring tells you how reliable predictions are, enabling smart UX decisions.

### Understanding Confidence

Every detailed prediction includes confidence information:

```ts
interface PredictionResult {
	readonly nodeId: string
	readonly score: number
	readonly baseWeight: number
	readonly predictiveWeight: number
	readonly confidence: number
	readonly factors: ConfidenceFactors
}

interface ConfidenceFactors {
	/** Weight based on historical frequency (0.0–1.0) */
	readonly frequency: number
	/** Weight based on recent activity (0.0–1.0) */
	readonly recency: number
	/** Weight based on engagement quality (0.0–1.0) */
	readonly engagement:  number
	/** Weight based on sample size reliability (0.0–1.0) */
	readonly sampleSize: number
}
```

### Confidence Thresholds

```ts
const detailed = engine.predictNextDetailed('dashboard', context)

for (const prediction of detailed.predictions) {
	if (prediction.confidence >= 0.8) {
		showPrimarySuggestion(prediction)
	} else if (prediction.confidence >= 0.5) {
		showSecondarySuggestion(prediction)
	} else {
		showWithCaveat(prediction)
	}
}
```

### Warmup Detection

Predictions include warmup status to indicate data sufficiency:

```ts
interface DetailedPrediction {
	readonly predictions: readonly PredictionResult[]
	readonly currentNode: string
	readonly context: PredictionContext
	readonly computedAt: number
	readonly warmupComplete: boolean
	readonly transitionCount:  number
}
```

```ts
const detailed = engine.predictNextDetailed('dashboard', context)

if (!detailed.warmupComplete) {
	showDefaultNavigation()
} else {
	showPredictiveSuggestions(detailed. predictions)
}
```

---

## Event Persistence

Event persistence provides a complete, immutable audit trail of all transitions. 

### Enabling Event Persistence

```ts
import { createIndexedDBEventPersistenceAdapter } from '@mikesaintsg/adapters'

const eventPersistence = createIndexedDBEventPersistenceAdapter({
	databaseName:  'my-app-events',
	storeName: 'transitions',
})

const engine = createWorkflowEngine(procedural, predictive, {
	eventPersistence,
})
```

### Transition Events

Every recorded transition creates an immutable event:

```ts
interface TransitionEvent {
	readonly id: string
	readonly timestamp: number
	readonly sessionId: string
	readonly actor: Actor
	readonly from: string
	readonly to: string
	readonly path: string
	readonly dwell?:  DwellRecord
	readonly engagement:  EngagementState
	readonly namespace?: string
	readonly metadata?: Readonly<Record<string, unknown>>
}
```

### Querying Events

```ts
// Get events for a session
const sessionEvents = await engine.getEvents({
	sessionId:  'session-123',
})

// Get events in a time range
const recentEvents = await engine.getEvents({
	startTime: Date.now() - 86400000,
	endTime:  Date.now(),
})

// Get events for a specific actor
const userEvents = await engine. getEvents({
	actor: 'user',
	limit: 1000,
})

// Get event count
const count = await engine.getEventCount({ actor: 'user' })
```

### Available Adapters

| Adapter | Use Case |
|---------|----------|
| `createIndexedDBEventPersistenceAdapter` | Browser apps with persistent audit trail |
| `createInMemoryEventPersistenceAdapter` | Testing or ephemeral tracking |

### Without Event Persistence

If you omit the `eventPersistence` adapter, transitions are tracked in memory only: 

```ts
const engine = createWorkflowEngine(procedural, predictive)
// No event persistence—getEvents() returns empty
```

---

## Weight Persistence

Weight persistence saves learned patterns for fast cold-start. 

### Enabling Weight Persistence

```ts
import { createIndexedDBWeightPersistenceAdapter } from '@mikesaintsg/adapters'

const persistence = createIndexedDBWeightPersistenceAdapter({
	databaseName: 'my-app-weights',
	autoSaveInterval: 60000, // Auto-save every minute
})

const predictive = createPredictiveGraph(procedural, {
	persistence,
})

// On startup, load existing weights
const loaded = await predictive. loadWeights()
if (loaded) {
	console.log('Weights restored from storage')
}
```

### Manual Save/Load

```ts
// Save current weights
await predictive.saveWeights()

// Load weights
const loaded = await predictive.loadWeights()

// Export for backup
const exported = predictive.export()

// Import from backup
predictive.import(exported)
```

### Available Adapters

| Adapter | Use Case |
|---------|----------|
| `createIndexedDBWeightPersistenceAdapter` | Browser apps with persistent learning |
| `createInMemoryWeightPersistenceAdapter` | Testing |

---

## Cold-Start Strategies

Cold-start handling ensures graceful behavior when historical data is insufficient.

### Strategy Types

```ts
type ColdStartStrategy = 'uniform' | 'procedural-weight' | 'preload' | 'hybrid'
```

**Uniform** — Equal probability for all valid transitions: 

```ts
const predictive = createPredictiveGraph(procedural, {
	coldStart: {
		strategy: 'uniform',
		warmupThreshold: 100,
	},
})
```

**Procedural Weight** — Use base weights from ProceduralGraph: 

```ts
const predictive = createPredictiveGraph(procedural, {
	coldStart: {
		strategy: 'procedural-weight',
		warmupThreshold: 100,
	},
})
```

**Preload** — Seed with historical data: 

```ts
const predictive = createPredictiveGraph(procedural, {
	coldStart: {
		strategy: 'preload',
		warmupThreshold:  50,
		preloadRecords: [
			{ from:  'login', to: 'dashboard', actor: 'user', count: 500 },
		],
	},
})
```

**Hybrid** — Combine preload with procedural fallback:

```ts
const predictive = createPredictiveGraph(procedural, {
	coldStart: {
		strategy: 'hybrid',
		warmupThreshold: 100,
		preloadRecords: [
			{ from: 'login', to:  'dashboard', actor: 'user', count: 200 },
		],
	},
})
```

### Checking Warmup Status

```ts
const detailed = engine.predictNextDetailed('dashboard', context)

if (detailed.warmupComplete) {
	console.log(`Based on ${detailed.transitionCount} transitions`)
} else {
	console.log(`Only ${detailed.transitionCount} transitions recorded`)
}
```

---

## Workflow Builder

The WorkflowBuilder provides an API for assembling ProceduralGraphs programmatically. 

### Creating a Workflow Builder

```ts
import { createWorkflowBuilder } from '@mikesaintsg/actionloop'

const builder = createWorkflowBuilder({
	validateOnChange: true,
	onNodeAdded: (node) => console.log(`Added: ${node.id}`),
})
```

### Adding Nodes and Transitions

```ts
// Add nodes
builder.addNode({ id: 'login', label: 'User Login' })
builder.addNode({ id: 'dashboard', label: 'Main Dashboard' })

// Add transitions
builder.addTransition({
	from: 'login',
	to: 'dashboard',
	weight: 1,
	actor: 'user',
})

// Add procedures
builder.addProcedure({
	id: 'auth',
	actions: ['login', 'dashboard'],
})

// Chain operations
builder
	.addNode({ id: 'settings' })
	.addTransition({ from:  'dashboard', to: 'settings', weight: 1, actor: 'user' })
	.addTransition({ from: 'settings', to:  'dashboard', weight: 1, actor: 'user' })
```

### Bulk Operations

```ts
// Add multiple nodes
builder. addNodes([
	{ id: 'profile' },
	{ id: 'billing' },
	{ id: 'support' },
])

// Add multiple transitions
builder.addTransitions([
	{ from: 'dashboard', to: 'profile', weight: 1, actor: 'user' },
	{ from: 'dashboard', to: 'billing', weight: 1, actor: 'user' },
	{ from: 'dashboard', to: 'support', weight: 1, actor: 'user' },
])
```

### Building the Graph

```ts
// Validate before building
const validation = builder.validate()
if (!validation.valid) {
	console.error('Validation errors:', validation.errors)
	console.warn('Validation warnings:', validation.warnings)
}

// Build the procedural graph
const procedural = builder.build()
```

### Export Formats

```ts
// Export to JSON
const json = builder.toJSON()

// Export to YAML
const yaml = builder.toYAML()

// Import from JSON
builder.fromJSON(jsonString)

// Import from YAML
builder.fromYAML(yamlString)

// Import from definition object
builder.fromDefinition({
	transitions: [... ],
	procedures: [...],
	version: '1.0.0',
})
```

---

## Workflow Validator

The WorkflowValidator performs static analysis on ProceduralGraph definitions.

### Creating a Workflow Validator

```ts
import { createWorkflowValidator } from '@mikesaintsg/actionloop'

const validator = createWorkflowValidator(procedural, {
	strictMode: true,
	validateGuards: true,
	customRules: [
		{
			name: 'require-descriptions',
			description: 'All transitions must have descriptions',
			severity: 'warning',
			validate: (graph) => {
				const transitions = graph.getAllTransitions()
				const missing = transitions.filter(t => !t.metadata?. description)
				return {
					passed: missing.length === 0,
					message: `${missing.length} transitions missing descriptions`,
					severity: 'warning',
				}
			},
		},
	],
})
```

### Static Checks

```ts
const results = validator.runStaticChecks()

for (const result of results) {
	console.log(`[${result.severity}] ${result.message}`)
	if (result.suggestion) {
		console.log(`  Suggestion: ${result. suggestion}`)
	}
}
```

### Connectivity Validation

```ts
// Find dangling nodes (no outgoing transitions)
const dangling = validator.findDanglingNodes()

// Find unreachable nodes (no incoming transitions except start)
const unreachable = validator.findUnreachableNodes()

// Check for missing start/end nodes
const boundary = validator.findMissingBoundaryNodes()

// Check graph connectivity
const connectivity = validator.checkConnectivity()

// Detect cycles
const cycles = validator.checkCycles()
```

### Guard Validation

```ts
const guardResults = validator.validateGuards()

for (const result of guardResults) {
	if (!result.valid) {
		console.error(`Invalid guard on ${result.transitionKey}:  ${result.error}`)
	}
}
```

### CI/CD Integration

```ts
// Exit with error code if validation fails
const results = validator.runStaticChecks()
const errorCount = validator.getErrorCount()

if (errorCount > 0) {
	console.error(`Validation failed with ${errorCount} errors`)
	process.exit(1)
}

console.log(`Validation passed with ${validator.getWarningCount()} warnings`)
process.exit(0)
```

---

## Workflow Analyzer

The WorkflowAnalyzer inspects runtime patterns to uncover optimization opportunities.

### Creating a Workflow Analyzer

```ts
import { createWorkflowAnalyzer } from '@mikesaintsg/actionloop'

const analyzer = createWorkflowAnalyzer(procedural, predictive, {
	onPatternDetected: (pattern) => {
		console.log('Pattern found:', pattern.sequence. join(' → '))
	},
})
```

### Loop Detection

```ts
// Find hot loops (high-frequency circuits)
const hotLoops = analyzer. findHotLoops({ threshold: 10, minFrequency: 5 })

// Find infinite loops (walks exceeding configured length)
const infiniteLoops = analyzer. findInfiniteLoops({ maxLength: 100 })

// Find unproductive loops (low progression metrics)
const unproductiveLoops = analyzer.findUnproductiveLoops()

// Find hierarchical loops (nested across procedures)
const hierarchicalLoops = analyzer. findHierarchicalLoops()

// Find automatable loops (candidates for automation)
const automatableLoops = analyzer.findAutomatableLoops()

// Find all strongly connected components (Tarjan's algorithm)
const sccs = analyzer.findStronglyConnectedComponents()
```

### Bottleneck Analysis

```ts
const bottlenecks = analyzer.findBottlenecks({
	trafficThreshold: 100,
	delayThreshold: 5000,
	congestionThreshold: 3,
})

for (const b of bottlenecks) {
	console.log(`Bottleneck at ${b.nodeId}:`)
	console.log(`  Incoming: ${b.incomingTraffic}`)
	console.log(`  Outgoing:  ${b.outgoingTraffic}`)
	console.log(`  Avg Delay: ${b.avgDelay}ms`)
	console.log(`  Congestion Score: ${b.congestionScore}`)
}
```

### Automation Discovery

```ts
const opportunities = analyzer.findAutomationOpportunities({
	minRepetitions: 5,
	minSequenceLength: 3,
	maxSequenceLength: 10,
	confidenceThreshold: 0.7,
})

for (const opp of opportunities) {
	console.log(`Sequence:  ${opp.sequence.join(' → ')}`)
	console.log(`Frequency: ${opp. frequency}`)
	console.log(`Type: ${opp. automationType}`)
	console.log(`Confidence: ${(opp.confidence * 100).toFixed(1)}%`)
	console.log(`Suggestion: ${opp. suggestion}`)
}
```

### Analysis Summary

```ts
const summary = analyzer. getSummary()

console.log(`Loops:  ${summary.loopCount}`)
console.log(`Bottlenecks:  ${summary.bottleneckCount}`)
console.log(`Automation Opportunities: ${summary.automationOpportunityCount}`)
console.log(`SCCs: ${summary. sccCount}`)
console.log(`Average Path Length: ${summary. avgPathLength}`)
```

---

## Graph Versioning

Graph versioning enables safe schema evolution and rollback capabilities.

### Version Metadata

```ts
interface GraphVersion {
	readonly version: string
	readonly createdAt: number
	readonly migratedFrom?: string
	readonly breaking: boolean
}
```

### Creating Versioned Graphs

```ts
const procedural = createProceduralGraph({
	transitions: [...],
	version: {
		version: '2.0.0',
		createdAt: Date.now(),
		migratedFrom: '1.5.0',
		breaking: true,
	},
})
```

### Checking Version Compatibility

```ts
const currentVersion = procedural. getVersion()
const storedVersion = await loadStoredVersion()

if (currentVersion?. version !== storedVersion?.version) {
	if (currentVersion?.breaking) {
		console.warn('Breaking version change detected')
		await migrateData(storedVersion. version, currentVersion.version)
	}
}
```

---

## Multi-Tenancy

Multi-tenancy enables isolated workflow graphs per tenant in SaaS applications.

### Namespace Configuration

```ts
const engine = createWorkflowEngine(procedural, predictive, {
	namespace: 'tenant-abc',
	isolationLevel: 'strict',
})
```

### Isolation Levels

```ts
type IsolationLevel = 'strict' | 'shared-procedural'
```

- **strict**:  Completely isolated—each tenant has separate procedural and predictive graphs
- **shared-procedural**: Shared ProceduralGraph (workflow rules), isolated PredictiveGraph (learned weights)

### Shared Procedural Example

```ts
// Single procedural graph for all tenants
const sharedProcedural = createProceduralGraph({ transitions })

// Per-tenant predictive graphs
const tenantAPredictive = createPredictiveGraph(sharedProcedural)
const tenantBPredictive = createPredictiveGraph(sharedProcedural)

// Per-tenant engines
const tenantAEngine = createWorkflowEngine(sharedProcedural, tenantAPredictive, {
	namespace: 'tenant-a',
	isolationLevel: 'shared-procedural',
})

const tenantBEngine = createWorkflowEngine(sharedProcedural, tenantBPredictive, {
	namespace: 'tenant-b',
	isolationLevel: 'shared-procedural',
})
```

---

## Error Handling

### Error Classes

All errors extend the ecosystem base error class: 

```ts
import { ActionLoopError, isActionLoopError } from '@mikesaintsg/actionloop'

try {
	engine.recordTransition('invalid', 'transition', context)
} catch (error) {
	if (isActionLoopError(error)) {
		console. error(`[${error.code}]:  ${error.message}`)
		if (error.nodeId) console.error(`  Node: ${error.nodeId}`)
		if (error.transitionKey) console.error(`  Transition: ${error.transitionKey}`)
		if (error.sessionId) console.error(`  Session: ${error.sessionId}`)
	}
}
```

### Error Codes

| Code | Description | Common Cause | Recovery |
|------|-------------|--------------|----------|
| `INVALID_TRANSITION` | Transition not allowed | Recording undefined transition | Check ProceduralGraph definition |
| `NODE_NOT_FOUND` | Node does not exist | Referencing missing node | Verify node ID |
| `DUPLICATE_NODE` | Node already exists | Adding existing node | Use `updateNode()` instead |
| `DUPLICATE_TRANSITION` | Transition already exists | Adding existing transition | Use `updateTransition()` instead |
| `SESSION_NOT_FOUND` | Session does not exist | Invalid session ID | Start new session |
| `SESSION_EXPIRED` | Session has timed out | Exceeding session timeout | Resume or start new session |
| `SESSION_ALREADY_ENDED` | Session was already ended | Double-ending session | Check session state first |
| `DANGLING_NODE` | Node has no exits | Missing outgoing transitions | Add transitions or mark as end node |
| `UNREACHABLE_NODE` | Node cannot be reached | No incoming transitions | Add transitions or remove node |
| `MISSING_START_NODE` | No start nodes defined | All nodes have incoming | Mark at least one as start |
| `MISSING_END_NODE` | No end nodes defined | All nodes have outgoing | Mark at least one as end |
| `GUARD_SYNTAX_ERROR` | Invalid guard expression | Malformed guard string | Check guard syntax |
| `BUILD_FAILED` | Graph build failed | Invalid builder state | Check validation errors |
| `IMPORT_FAILED` | Import parse error | Malformed JSON/YAML | Validate import data |
| `EXPORT_FAILED` | Export serialization error | Circular references | Check graph structure |
| `MODEL_MISMATCH` | Imported weights don't match graph | Graph changed after export | Re-export or migrate |
| `INSUFFICIENT_DATA` | Not enough data for analysis | Cold-start condition | Record more transitions |
| `UNKNOWN` | Unknown error | Unexpected condition | Check logs, report bug |

### Error Handling Patterns

```ts
// Pattern 1: Try-catch with error code check
try {
	engine. recordTransition(from, to, context)
} catch (error) {
	if (isActionLoopError(error)) {
		switch (error.code) {
			case 'INVALID_TRANSITION':
				console.warn('Transition not allowed:', error.message)
				showInvalidTransitionUI()
				break
			case 'SESSION_NOT_FOUND':
				const newSession = engine.startSession('user')
				engine.recordTransition(from, to, { ... context, sessionId:  newSession.id })
				break
			case 'SESSION_EXPIRED':
				engine.resumeSession(context.sessionId, { previousNode: from, actor: 'user' })
				engine.recordTransition(from, to, context)
				break
			default:
				throw error
		}
	}
}

// Pattern 2: Error callback
const engine = createWorkflowEngine(procedural, predictive, {
	onError: (error) => {
		trackError(error. code, error.message, {
			nodeId:  error.nodeId,
			sessionId: error.sessionId,
		})
	},
})
```

---

## TypeScript Integration

### Generic Type Parameters

Custom metadata types are supported throughout: 

```ts
interface MyNodeMetadata extends NodeMetadata {
	readonly category: 'navigation' | 'action' | 'system'
	readonly priority: number
	readonly requiredRole?:  string
}

const node:  Node = {
	id:  'admin-settings',
	label:  'Admin Settings',
	metadata: {
		category: 'action',
		priority:  1,
		requiredRole: 'admin',
	},
}
```

### Type Inference

Factory functions infer types from options:

```ts
// Types are inferred from options
const engine = createWorkflowEngine(procedural, predictive)

// Predictions are typed as readonly string[]
const predictions = engine.predictNext('node', context)

// Detailed predictions include full type information
const detailed = engine.predictNextDetailed('node', context)
// detailed.predictions[0].factors.frequency is typed as number
```

### Strict Typing

All interfaces use `readonly` modifiers for immutability: 

```ts
interface Transition {
	readonly from: string
	readonly to: string
	readonly weight: number
	readonly actor:  Actor
	readonly metadata?:  Readonly<TransitionMetadata>
}
```

### Type Guards

```ts
import { isActionLoopError, isTransition, isNode } from '@mikesaintsg/actionloop'

function processItem(item: unknown): void {
	if (isNode(item)) {
		console.log(`Node: ${item.id}`)
	} else if (isTransition(item)) {
		console. log(`Transition: ${item.from} → ${item.to}`)
	}
}
```

---

## Performance Tips

1. **Limit prediction count** — Only request what you'll display: 

```ts
const predictions = engine.predictNext('node', {
	... context,
	count: 3,
})
```

2. **Use batch operations** — Record multiple transitions efficiently:

```ts
engine.recordTransitions([
	{ from:  'a', to: 'b', context },
	{ from: 'b', to: 'c', context },
	{ from: 'c', to: 'd', context },
])
```

3. **Use weight persistence** — Avoid cold-start on page reload:

```ts
const persistence = createIndexedDBWeightPersistenceAdapter({
	autoSaveInterval: 60000,
})

const predictive = createPredictiveGraph(procedural, { persistence })
await predictive.loadWeights()
```

4. **Skip event persistence if not needed** — Omit adapter for faster writes:

```ts
const engine = createWorkflowEngine(procedural, predictive)
// No eventPersistence = in-memory only
```

5. **Monitor graph size** — Check statistics for memory concerns:

```ts
const stats = procedural.getStats()
console.log(`Nodes: ${stats.nodeCount}, Transitions: ${stats.transitionCount}`)

const pStats = predictive.getStats()
console.log(`Weight updates: ${pStats. totalWeightUpdates}`)
```

6. **Use appropriate decay algorithm** — EWMA is fastest for most cases:

```ts
const predictive = createPredictiveGraph(procedural, {
	decayAlgorithm: 'ewma',
})
```

7. **Lazy-load activity tracker** — Only initialize when needed:

```ts
let activity: ActivityTrackerInterface | undefined

function getActivityTracker(): ActivityTrackerInterface {
	if (!activity) {
		activity = createActivityTracker({ idleThreshold: 30000 })
	}
	return activity
}
```

---

## Browser Compatibility

| Browser | Minimum Version | Notes                               |
|---------|-----------------|-------------------------------------|
| Chrome  | 89+             | Full support                        |
| Firefox | 89+             | Full support                        |
| Safari  | 15+             | Full support                        |
| Edge    | 89+             | Full support                        |
| Node.js | 22+             | Full support (no activity tracking) |

### Feature Detection

```ts
import { isActionLoopSupported, isActivityTrackingSupported } from '@mikesaintsg/actionloop'

if (! isActionLoopSupported()) {
	console.warn('ActionLoop requires ES2022+ environment')
}

if (!isActivityTrackingSupported()) {
	console.warn('Activity tracking requires browser environment')
}
```

---

## Integration with Ecosystem

### With @mikesaintsg/navigation

```ts
import { createNavigation } from '@mikesaintsg/navigation'
import { createWorkflowEngine } from '@mikesaintsg/actionloop'

const engine = createWorkflowEngine(procedural, predictive, { activity })

const navigation = createNavigation({
	page: 'landing',
	guards: [
		async (to, from) => {
			if (from && ! engine.isValidTransition(from. page, to.page)) {
				console.warn(`Blocked:  ${from.page} → ${to.page}`)
				return false
			}
			return true
		},
	],
	hooks: [
		(to, from) => {
			if (from) {
				engine. recordTransition(from.page, to. page, {
					actor: 'user',
					sessionId: currentSession.id,
					path: to.path,
				})
			}
		},
	],
})

// Use predictions to suggest navigation
const suggestions = engine.predictNext(navigation.getPage(), {
	actor: 'user',
	sessionId:  currentSession.id,
	path: navigation.getPath(),
	count: 3,
})
```

### With @mikesaintsg/indexeddb

```ts
import { createDatabase } from '@mikesaintsg/indexeddb'

interface WorkflowSchema {
	sessions: SessionInfo
}

const database = await createDatabase<WorkflowSchema>({
	name:  'workflow',
	version: 1,
	stores: {
		sessions: { keyPath: 'id' },
	},
})

// Persist sessions
engine.onSessionStart((session) => {
	database.store('sessions').set(session)
})

engine.onSessionEnd((session) => {
	database.store('sessions').set(session)
})
```

### With @mikesaintsg/broadcast

```ts
import { createBroadcast } from '@mikesaintsg/broadcast'

interface WorkflowState {
	currentNode: string
	sessionId: string
	predictions: readonly string[]
}

const broadcast = createBroadcast<WorkflowState>({
	channel: 'workflow-sync',
	state: { currentNode: 'landing', sessionId: '', predictions: [] },
})

engine.onTransition((from, to, context) => {
	const predictions = engine.predictNext(to, {
		actor: context.actor,
		sessionId: context. sessionId,
		path: context.path,
		count: 3,
	})

	broadcast.setState({
		currentNode: to,
		sessionId: context. sessionId,
		predictions,
	})
})

broadcast.onStateChange((state, source) => {
	if (source === 'remote') {
		console.log('Other tab navigated to:', state.currentNode)
		updateUIWithPredictions(state. predictions)
	}
})
```

### LLM Integration with ActionLoop Context Formatter

ActionLoop can provide rich behavioral context to LLMs through the context formatter:

```ts
import {
	createWorkflowEngine,
	createActionLoopContextFormatter,
} from '@mikesaintsg/actionloop'
import { createContextBuilder } from '@mikesaintsg/contextbuilder'
import { createEngine } from '@mikesaintsg/inference'

// Create context formatter
const formatter = createActionLoopContextFormatter({
	maxRecentEvents: 10,
	includePatterns: true,
	getNodeLabel: (nodeId) => graph.getNode(nodeId)?.label ?? nodeId,
})

// Get predictions and events
const predictions = engine.predictNextDetailed(currentNode, {
	actor: 'user',
	sessionId,
	path: window.location.pathname,
	count: 5,
})

const events = await engine.getEvents({ sessionId, limit: 20 })

// Format for LLM consumption
const llmContext = formatter.format(predictions, events)

// Add to context builder
const builder = createContextBuilder(tokenCounter, { budget: { maxTokens: 4000 } })

builder.addFrame({
	id: 'actionloop-context',
	type: 'context',
	priority: 'high',
	content: formatter.toNaturalLanguage(llmContext),
	metadata: { source: 'actionloop' },
})

// LLM now has awareness of:
// - Current location
// - Predicted next actions with confidence
// - User engagement patterns
// - Recent activity history
```

#### ActionLoopLLMContext Structure

```ts
interface ActionLoopLLMContext {
	/** Current node/location */
	readonly currentNode: string
	/** Predictions with confidence */
	readonly predictions: readonly FormattedPrediction[]
	/** Whether predictions are reliable */
	readonly warmupComplete: boolean
	/** Total transitions recorded */
	readonly transitionCount: number
	/** Recent activity summary */
	readonly recentActivity: readonly ActivitySummary[]
	/** Current engagement state */
	readonly engagement: EngagementState
	/** Pattern insights (if analyzer available) */
	readonly patterns?: PatternInsights
}

interface FormattedPrediction {
	readonly nodeId: string
	readonly label: string
	readonly confidencePercent: number
	readonly reasoning: string
}
```

#### Natural Language Output Example

```
Current location: account-detail
User engagement: active

Predicted next actions (based on learned patterns):
  - Billing: 85% likely (frequently visited, recently accessed)
  - Settings: 62% likely (frequently visited)
  - Support: 41% likely (based on workflow structure)

Pattern insights:
  - Frequent paths: dashboard → accounts → account-detail
  - Bottlenecks: billing (high dwell time)
```

---

## API Reference

### Factory Functions

#### createProceduralGraph(options): ProceduralGraphInterface

Creates a static ProceduralGraph. 

**Parameters:**

| Parameter          | Type                         | Required | Default | Description               |
|--------------------|------------------------------|----------|---------|---------------------------|
| `transitions`      | `readonly TransitionInput[]` | ✅        | —       | Workflow transitions      |
| `nodes`            | `readonly NodeInput[]`       |          | —       | Explicit node definitions |
| `procedures`       | `readonly ProcedureInput[]`  |          | —       | Procedure subgraphs       |
| `version`          | `GraphVersion`               |          | —       | Graph version metadata    |
| `validateOnCreate` | `boolean`                    |          | `false` | Validate on creation      |
| `onValidation`     | `ValidationCallback`         |          | —       | Validation event callback |

#### createPredictiveGraph(procedural, options? ): PredictiveGraphInterface

Creates a dynamic PredictiveGraph overlay.

**Parameters:**

| Parameter        | Type                                | Required | Default  | Description                 |
|------------------|-------------------------------------|----------|----------|-----------------------------|
| `procedural`     | `ProceduralGraphInterface`          | ✅        | —        | Underlying procedural graph |
| `persistence`    | `WeightPersistenceAdapterInterface` |          | —        | Opt-in weight persistence   |
| `decayAlgorithm` | `DecayAlgorithm`                    |          | `'ewma'` | Weight decay algorithm      |
| `decayFactor`    | `number`                            |          | `0.9`    | Decay factor (0.0–1.0)      |
| `halfLifeMs`     | `number`                            |          | —        | Half-life for decay         |
| `minWeight`      | `number`                            |          | `0.01`   | Minimum weight threshold    |
| `coldStart`      | `ColdStartConfig`                   |          | —        | Cold-start configuration    |
| `onWeightUpdate` | callback                            |          | —        | Weight update event         |
| `onDecay`        | callback                            |          | —        | Decay event                 |

#### createWorkflowEngine(procedural, predictive, options? ): WorkflowEngineInterface

Creates a WorkflowEngine. 

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `procedural` | `ProceduralGraphInterface` | ✅ | — | Static procedural graph |
| `predictive` | `PredictiveGraphInterface` | ✅ | — | Dynamic predictive graph |
| `activity` | `ActivityTrackerInterface` | | — | Opt-in activity tracking |
| `eventPersistence` | `EventStorePersistenceAdapterInterface` | | — | Opt-in event persistence |
| `validateTransitions` | `boolean` | | `true` | Validate on record |
| `trackSessions` | `boolean` | | `true` | Enable session tracking |
| `maxSessionDuration` | `number` | | — | Max session length (ms) |
| `sessionTimeoutMs` | `number` | | — | Idle timeout (ms) |
| `namespace` | `string` | | — | Multi-tenant namespace |
| `isolationLevel` | `IsolationLevel` | | `'strict'` | Tenant isolation level |
| `onTransition` | `TransitionCallback` | | — | Transition event |
| `onPrediction` | `PredictionCallback` | | — | Prediction event |
| `onSessionStart` | `SessionCallback` | | — | Session start event |
| `onSessionEnd` | `SessionEndCallback` | | — | Session end event |
| `onError` | `ErrorCallback` | | — | Error event |

#### createActivityTracker(config? ): ActivityTrackerInterface

Creates an activity tracker for engagement-aware predictions.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `idleThreshold` | `number` | | `30000` | Idle threshold (ms) |
| `awayThreshold` | `number` | | `300000` | Away threshold (ms) |
| `trackVisibility` | `boolean` | | `true` | Use Page Visibility API |
| `onEngagementChange` | callback | | — | Engagement change event |
| `onDwellComplete` | callback | | — | Dwell complete event |

#### createWorkflowBuilder(options? ): WorkflowBuilderInterface

Creates a workflow builder for programmatic graph construction.

#### createWorkflowValidator(procedural, options?): WorkflowValidatorInterface

Creates a workflow validator for static analysis.

#### createWorkflowAnalyzer(procedural, predictive, options?): WorkflowAnalyzerInterface

Creates a workflow analyzer for pattern detection.

#### createActionLoopContextFormatter(options?): ActionLoopContextFormatterInterface

Creates a context formatter for LLM integration.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `maxRecentEvents` | `number` | | `10` | Max events to include |
| `includePatterns` | `boolean` | | `false` | Include pattern analysis |
| `includeDwell` | `boolean` | | `true` | Include dwell times |
| `getNodeLabel` | `(nodeId: string) => string` | | identity | Node label resolver |

**Returns:** `ActionLoopContextFormatterInterface`

| Method | Returns | Description |
|--------|---------|-------------|
| `format(predictions, events, options?)` | `ActionLoopLLMContext` | Format state for LLM |
| `toNaturalLanguage(context)` | `string` | Convert to natural language |
| `toJSON(context)` | `string` | Convert to JSON string |

### ProceduralGraphInterface

#### Accessor Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getNode(id)` | `Node \| undefined` | Get node by ID |
| `getNodes()` | `readonly Node[]` | Get all nodes |
| `hasNode(id)` | `boolean` | Check if node exists |
| `getTransitions(from)` | `readonly Transition[]` | Get outgoing transitions |
| `getTransitionsTo(to)` | `readonly Transition[]` | Get incoming transitions |
| `getAllTransitions()` | `readonly Transition[]` | Get all transitions |
| `hasTransition(from, to)` | `boolean` | Check if transition exists |
| `getTransition(from, to)` | `Transition \| undefined` | Get specific transition |
| `getProcedure(id)` | `Procedure \| undefined` | Get procedure by ID |
| `getProcedures()` | `readonly Procedure[]` | Get all procedures |
| `hasProcedure(id)` | `boolean` | Check if procedure exists |
| `getStats()` | `GraphStats` | Get graph statistics |
| `isStartNode(id)` | `boolean` | Check if start node |
| `isEndNode(id)` | `boolean` | Check if end node |
| `getStartNodes()` | `readonly string[]` | Get all start nodes |
| `getEndNodes()` | `readonly string[]` | Get all end nodes |
| `getVersion()` | `GraphVersion \| undefined` | Get graph version |

#### Validation Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `validate()` | `readonly ValidationResult[]` | Run all validations |
| `isValid()` | `boolean` | Check if graph is valid |

#### Export Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `export()` | `ExportedProceduralGraph` | Export for serialization |

#### Lifecycle Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `destroy()` | `void` | Cleanup resources |

### PredictiveGraphInterface

#### Accessor Methods

| Method                       | Returns                         | Description                   |
|------------------------------|---------------------------------|-------------------------------|
| `getWeight(from, to, actor)` | `number`                        | Get transition weight         |
| `getWeights(nodeId, actor)`  | `readonly WeightedTransition[]` | Get all weighted transitions  |
| `getModelId()`               | `string`                        | Get model identifier          |
| `getDecayConfig()`           | `DecayConfig`                   | Get decay configuration       |
| `getStats()`                 | `PredictiveGraphStats`          | Get statistics                |
| `hasWeight(from, to, actor)` | `boolean`                       | Check if weight exists        |
| `getTransitionCount()`       | `number`                        | Get total transition count    |
| `isWarmupComplete()`         | `boolean`                       | Check if warmup threshold met |

#### Mutator Methods

| Method                                               | Returns  | Description                |
|------------------------------------------------------|----------|----------------------------|
| `updateWeight(from, to, actor)`                      | `void`   | Increment weight           |
| `updateWeightWithEngagement(from, to, actor, score)` | `void`   | Update with engagement     |
| `setWeight(from, to, actor, weight)`                 | `void`   | Set explicit weight        |
| `applyDecay()`                                       | `number` | Apply decay to all weights |
| `clear()`                                            | `void`   | Clear all weights          |
| `clearActor(actor)`                                  | `void`   | Clear weights for actor    |

#### Preload Methods

| Method             | Returns | Description                |
|--------------------|---------|----------------------------|
| `preload(records)` | `void`  | Preload historical records |

#### Persistence Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `saveWeights()` | `Promise<void>` | Save to persistence adapter |
| `loadWeights()` | `Promise<boolean>` | Load from persistence adapter |

#### Export/Import Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `export()` | `ExportedPredictiveGraph` | Export for persistence |
| `import(data)` | `void` | Import from export |

### WorkflowEngineInterface

#### Core Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `recordTransition(from, to, context)` | `void` | Record a transition |
| `recordTransitions(transitions)` | `void` | Record multiple transitions |
| `predictNext(node, context)` | `readonly string[]` | Get predicted next nodes |
| `predictNextDetailed(node, context)` | `DetailedPrediction` | Get detailed predictions |

#### Validation Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `isValidTransition(from, to)` | `boolean` | Validate without recording |
| `getValidTransitions(from)` | `readonly Transition[]` | Get valid transitions |

#### Session Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `startSession(actor, sessionId?)` | `SessionInfo` | Start new session |
| `getSession(sessionId)` | `SessionInfo \| undefined` | Get session by ID |
| `getActiveSession(actor)` | `SessionInfo \| undefined` | Get active session |
| `hasSession(sessionId)` | `boolean` | Check if session exists |
| `endSession(sessionId, reason)` | `void` | End a session |
| `resumeSession(sessionId, options)` | `void` | Resume session |
| `getSessionChain(actor, options?)` | `ActionChain` | Get session history |
| `truncateChain(sessionId, strategy?)` | `void` | Truncate session chain |

#### Event Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getEvents(filter)` | `Promise<readonly TransitionEvent[]>` | Get events |
| `getEventCount(filter?)` | `Promise<number>` | Get event count |

#### Subscription Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `onTransition(callback)` | `Unsubscribe` | Subscribe to transitions |
| `onPrediction(callback)` | `Unsubscribe` | Subscribe to predictions |
| `onSessionStart(callback)` | `Unsubscribe` | Subscribe to session start |
| `onSessionEnd(callback)` | `Unsubscribe` | Subscribe to session end |
| `onError(callback)` | `Unsubscribe` | Subscribe to errors |

#### Graph Access

| Method | Returns | Description |
|--------|---------|-------------|
| `getProceduralGraph()` | `ProceduralGraphInterface` | Get procedural graph |
| `getPredictiveGraph()` | `PredictiveGraphInterface` | Get predictive graph |
| `getActivityTracker()` | `ActivityTrackerInterface \| undefined` | Get activity tracker |

#### Lifecycle Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `destroy()` | `void` | Cleanup resources |

### ActivityTrackerInterface

#### Node Tracking

| Method | Returns | Description |
|--------|---------|-------------|
| `enterNode(nodeId)` | `void` | Start tracking node |
| `exitNode()` | `DwellRecord \| undefined` | Complete dwell record |

#### Accessor Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getEngagementState()` | `EngagementState` | Get current state |
| `getCurrentNodeId()` | `string \| undefined` | Get current node |
| `getCurrentDwell()` | `PartialDwellRecord \| undefined` | Get incomplete dwell |
| `getDwellHistory()` | `readonly DwellRecord[]` | Get all dwells |
| `getTotalActiveTime()` | `number` | Get total active time |
| `getTotalIdleTime()` | `number` | Get total idle time |

#### Mutator Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `clearHistory()` | `void` | Clear dwell history |

#### Subscription Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `onEngagementChange(callback)` | `Unsubscribe` | Subscribe to changes |
| `onDwellComplete(callback)` | `Unsubscribe` | Subscribe to dwells |

#### Lifecycle Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `destroy()` | `void` | Cleanup resources |

### Types

```ts
/** Actor types */
type Actor = 'user' | 'system' | 'automation'

/** Engagement states */
type EngagementState = 'active' | 'idle' | 'away' | 'unknown'

/** Decay algorithms */
type DecayAlgorithm = 'halflife' | 'ewma' | 'linear' | 'none'

/** Cold-start strategies */
type ColdStartStrategy = 'uniform' | 'procedural-weight' | 'preload' | 'hybrid'

/** Session end reasons */
type SessionEndReason = 'completed' | 'abandoned' | 'timeout' | 'error'

/** Isolation levels */
type IsolationLevel = 'strict' | 'shared-procedural'

/** Node types */
type NodeType = 'action' | 'session' | 'system' | 'placeholder'
```

### Error Types

```ts
/** ActionLoop error codes */
type ActionLoopErrorCode =
	| 'INVALID_TRANSITION'
	| 'NODE_NOT_FOUND'
	| 'DUPLICATE_NODE'
	| 'DUPLICATE_TRANSITION'
	| 'CYCLE_DETECTED'
	| 'DISCONNECTED_GRAPH'
	| 'SESSION_NOT_FOUND'
	| 'SESSION_EXPIRED'
	| 'SESSION_ALREADY_ENDED'
	| 'INVALID_ACTOR'
	| 'INVALID_CONTEXT'
	| 'DANGLING_NODE'
	| 'UNREACHABLE_NODE'
	| 'MISSING_START_NODE'
	| 'MISSING_END_NODE'
	| 'GUARD_SYNTAX_ERROR'
	| 'INVALID_PROCEDURE'
	| 'BUILD_FAILED'
	| 'IMPORT_FAILED'
	| 'EXPORT_FAILED'
	| 'ANALYSIS_FAILED'
	| 'INSUFFICIENT_DATA'
	| 'MODEL_MISMATCH'
	| 'WEIGHT_OVERFLOW'
	| 'UNKNOWN'

/** ActionLoop error interface */
interface ActionLoopErrorInterface extends Error {
	readonly code: ActionLoopErrorCode
	readonly nodeId?: string
	readonly transitionKey?: string
	readonly sessionId?: string
	readonly cause?: Error
}
```

---

## License

MIT
