# @mikesaintsg/actionloop API Guide

> **Predictive Procedural Action Loop System (PPALS) — Combine deterministic workflow rules with adaptive, data-driven predictions to guide users through complex multi-step workflows.**

---

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Core Concepts](#core-concepts)
5. [Procedural Graph](#procedural-graph)
6. [Predictive Graph](#predictive-graph)
7. [Workflow Engine](#workflow-engine)
8. [Workflow Builder](#workflow-builder)
9. [Workflow Validator](#workflow-validator)
10. [Workflow Analyzer](#workflow-analyzer)
11. [Error Handling](#error-handling)
12. [TypeScript Integration](#typescript-integration)
13. [Performance Tips](#performance-tips)
14. [Browser Compatibility](#browser-compatibility)
15. [Integration with Ecosystem](#integration-with-ecosystem)
16. [API Reference](#api-reference)
17. [License](#license)

---

## Introduction

### Value Proposition

`@mikesaintsg/actionloop` provides:

- **Deterministic Compliance** — ProceduralGraph defines all valid transitions; predictions never violate rules
- **Adaptive Learning** — PredictiveGraph learns from usage patterns to rank recommendations
- **Sub-50ms Predictions** — Optimized for real-time interactive UIs
- **Session Management** — Track user journeys with cross-session continuity
- **Pattern Analysis** — Discover bottlenecks, loops, and automation opportunities
- **Zero Dependencies** — Built entirely on native TypeScript APIs

### Use Cases

| Use Case              | Feature                                                          |
|-----------------------|------------------------------------------------------------------|
| Multi-step onboarding | Guide users through registration with contextual suggestions     |
| E-commerce checkout   | Predict likely next steps while enforcing valid sequences        |
| Approval workflows    | Route documents with intelligent next-action recommendations     |
| Form wizards          | Suggest optimal paths through complex multi-page forms           |
| Task management       | Recommend actions based on historical completion patterns        |
| Support ticketing     | Route tickets and suggest resolutions based on past interactions |

### When to Use actionloop

| Scenario                                            | Use actionloop | Use alternatives |
|-----------------------------------------------------|----------------|------------------|
| Multi-step workflows with defined valid transitions | ✅              |                  |
| Need to enforce business rules on navigation        | ✅              |                  |
| Want adaptive recommendations without ML training   | ✅              |                  |
| Need sub-50ms recommendation latency                | ✅              |                  |
| Simple linear wizards without branching             |                | ✅                |
| Fully random navigation patterns                    |                | ✅                |
| Server-side only workflow orchestration             |                | ✅                |

---

## Installation

```bash
npm install @mikesaintsg/actionloop
```

**Requirements:**
- Node.js ≥ 22.0.0
- TypeScript ≥ 5.0 (for type definitions)
- ES2022+ environment (browser or Node.js)

---

## Quick Start

```ts
import {
	createProceduralGraph,
	createPredictiveGraph,
	createWorkflowEngine,
} from '@mikesaintsg/actionloop'

// 1. Define your workflow transitions
const transitions = [
	{ from: 'login', to: 'dashboard', weight: 1, actor: 'user' },
	{ from: 'dashboard', to: 'settings', weight: 1, actor: 'user' },
	{ from: 'dashboard', to: 'profile', weight: 1, actor: 'user' },
	{ from: 'settings', to: 'dashboard', weight: 1, actor: 'user' },
	{ from: 'profile', to: 'dashboard', weight: 1, actor: 'user' },
] as const

// 2. Create the static ProceduralGraph
const procedural = createProceduralGraph({ transitions })

// 3. Create the dynamic PredictiveGraph overlay
const predictive = createPredictiveGraph(procedural)

// 4. Create the WorkflowEngine
const engine = createWorkflowEngine(procedural, predictive)

// 5. Start a session and record transitions
const session = engine.startSession('user')

engine.recordTransition('login', 'dashboard', {
	actor: 'user',
	sessionId: session.id,
	path: '/app/dashboard',
})

// 6. Get predictions for next actions
const predictions = engine.predictNext('dashboard', {
	actor: 'user',
	sessionId: session.id,
	path: '/app/dashboard',
	count: 3,
})

console.log('Recommended actions:', predictions)
// => ['settings', 'profile'] ranked by learned weights

// 7. Cleanup when done
engine.destroy()
```

---

## Core Concepts

### PPALS Runtime Cycle

The Predictive Procedural Action Loop System runs a continuous four-step cycle:

```text
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   OBSERVE   │────▶│   UPDATE    │────▶│   PREDICT   │────▶│  RECOMMEND  │
│ transition  │     │  weights    │     │   merge     │     │   top-k     │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       ▲                                                            │
       └────────────────────────────────────────────────────────────┘
```

1. **Observe**: Capture each transition event with actor, timestamp, and session context
2. **Update**: Adjust PredictiveGraph weights using recency, frequency, and decay rules
3. **Predict**: Merge static ProceduralGraph priorities with dynamic PredictiveGraph weights
4. **Recommend**: Return top-k valid actions, ensuring no invalid transitions are suggested

### Two-Graph Architecture

ActionLoop uses two complementary graph models:

```text
┌─────────────────────────────────────────────────────────────────┐
│                      ProceduralGraph                            │
│  ┌─────────┐      ┌─────────┐      ┌─────────┐                 │
│  │  login  │─────▶│dashboard│─────▶│ settings│                 │
│  └─────────┘      └────┬────┘      └─────────┘                 │
│                        │                                        │
│                        ▼                                        │
│                   ┌─────────┐                                   │
│                   │ profile │                                   │
│                   └─────────┘                                   │
│                                                                 │
│  Static rules: defines ALL valid transitions                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PredictiveGraph                            │
│                                                                 │
│  login ──[w: 0.9]──▶ dashboard ──[w: 0.7]──▶ settings           │
│                              └──[w: 0.2]──▶ profile             │
│                                                                 │
│  Dynamic weights: learned from usage patterns                   │
└─────────────────────────────────────────────────────────────────┘
```

| Graph               | Purpose                  | Mutability                      | Contents                               |
|---------------------|--------------------------|---------------------------------|----------------------------------------|
| **ProceduralGraph** | Define valid transitions | Static (immutable at runtime)   | Nodes, transitions, procedures, guards |
| **PredictiveGraph** | Learn usage patterns     | Dynamic (updated on each event) | Per-transition weights by actor        |

### Actor Types

Every transition is tagged with an actor type for role-specific analytics:

```ts
type Actor = 'user' | 'system' | 'automation'
```

- **user**: Human-initiated actions (clicks, form submissions)
- **system**: Platform-triggered events (timeouts, errors, notifications)
- **automation**: Robotic/LLM-triggered workflows (scheduled tasks, bots)

Each actor maintains separate weight tracks, enabling role-specific predictions.

### Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                    WorkflowEngineInterface                       │
│  recordTransition() │ predictNext() │ startSession()            │
├─────────────────────────────────────────────────────────────────┤
│  ProceduralGraph              │           PredictiveGraph       │
│  - Node definitions           │           - Weight tracking     │
│  - Transition rules           │           - Decay algorithms    │
│  - Procedure subgraphs        │           - Actor separation    │
├─────────────────────────────────────────────────────────────────┤
│  WorkflowBuilder   │   WorkflowValidator   │   WorkflowAnalyzer │
│  - Graph assembly  │   - Static checks     │   - Loop detection │
│  - JSON/YAML I/O   │   - Guard validation  │   - Bottlenecks    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Procedural Graph

The ProceduralGraph is your single source of truth for valid workflow moves.

### Creating a Procedural Graph

```ts
import { createProceduralGraph } from '@mikesaintsg/actionloop'

const procedural = createProceduralGraph({
	transitions: [
		{ from: 'login', to: 'dashboard', weight: 1, actor: 'user' },
		{ from: 'dashboard', to: 'checkout', weight: 1, actor: 'user' },
		{ from: 'checkout', to: 'confirmation', weight: 1, actor: 'user' },
		{ from: 'checkout', to: 'timeout', weight: 1, actor: 'system' },
	],
	procedures: [
		{ id: 'auth', actions: ['login', 'dashboard'] },
		{ id: 'purchase', actions: ['dashboard', 'checkout', 'confirmation'] },
	],
	validateOnCreate: true,
})
```

### Nodes and Transitions

**Nodes** represent discrete actions or system events:

```ts
interface Node {
	readonly id: string
	readonly label?: string
	readonly type?: 'action' | 'session' | 'system' | 'placeholder'
	readonly metadata?: Readonly<NodeMetadata>
}
```

**Transitions** define allowed moves between nodes:

```ts
interface Transition {
	readonly from: string
	readonly to: string
	readonly weight: number
	readonly actor: Actor
	readonly metadata?: Readonly<TransitionMetadata>
}
```

### Procedures as Subgraphs

Procedures group related actions into reusable subgraphs:

```ts
interface Procedure {
	readonly id: string
	readonly actions: readonly string[]
	readonly metadata?: Readonly<ProcedureMetadata>
}
```

Procedures connect via **shared nodes**—when the last action of one procedure matches the first of another, users flow seamlessly between workflows.

### Guard Conditions

Guard conditions enforce prerequisites on transitions:

```ts
const transitions = [
	{
		from: 'checkout',
		to: 'payment',
		weight: 1,
		actor: 'user',
		metadata: {
			guard: 'cart.items.length > 0 && user.verified === true',
		},
	},
]
```

Guards are stored as metadata for documentation and validation. Runtime evaluation is the application's responsibility.

---

## Predictive Graph

The PredictiveGraph overlays dynamic weights on ProceduralGraph transitions.

### Creating a Predictive Graph

```ts
import { createPredictiveGraph } from '@mikesaintsg/actionloop'

const predictive = createPredictiveGraph(procedural, {
	decayAlgorithm: 'ewma',
	decayFactor: 0.9,
	minWeight: 0.01,
})
```

### Weight Updates

Weights are updated each time a transition is recorded:

```ts
// Internal weight update (handled by WorkflowEngine)
predictive.updateWeight('login', 'dashboard', 'user')

// Manual weight setting
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

**EWMA** — Exponentially weighted moving average:

```ts
const predictive = createPredictiveGraph(procedural, {
	decayAlgorithm: 'ewma',
	decayFactor: 0.9, // Higher = more recency bias
})
```

**Linear** — Constant weight loss over time:

```ts
const predictive = createPredictiveGraph(procedural, {
	decayAlgorithm: 'linear',
})
```

**None** — Weights accumulate indefinitely:

```ts
const predictive = createPredictiveGraph(procedural, {
	decayAlgorithm: 'none',
})
```

### Preloading Historical Data

Cold-start the PredictiveGraph with historical records:

```ts
const predictive = createPredictiveGraph(procedural, {
	preloadRecords: [
		{ from: 'login', to: 'dashboard', actor: 'user', count: 100 },
		{ from: 'dashboard', to: 'settings', actor: 'user', count: 45 },
		{ from: 'checkout', to: 'timeout', actor: 'system', count: 12 },
	],
})
```

---

## Workflow Engine

The WorkflowEngine bridges static rules and dynamic learning.

### Creating a Workflow Engine

```ts
import { createWorkflowEngine } from '@mikesaintsg/actionloop'

const engine = createWorkflowEngine(procedural, predictive, {
	validateTransitions: true,
	trackSessions: true,
	onTransition: (from, to, context) => {
		console.log(`Transition: ${from} -> ${to}`)
	},
	onError: (error) => {
		console.error(`Error: ${error.message}`)
	},
})
```

### Recording Transitions

```ts
engine.recordTransition('login', 'dashboard', {
	actor: 'user',
	sessionId: session.id,
	path: '/app/dashboard',
})
```

Recording a transition:
1. Validates against ProceduralGraph (throws if invalid and `validateTransitions` is true)
2. Logs actor, timestamp, session ID, and path
3. Updates PredictiveGraph weight via decay-aware algorithm
4. Emits `onTransition` callback

### Predicting Next Actions

```ts
// Simple prediction (returns node IDs)
const predictions = engine.predictNext('dashboard', {
	actor: 'user',
	sessionId: session.id,
	path: '/app/dashboard',
	count: 5,
})
// => ['settings', 'profile', 'logout']

// Detailed prediction (includes confidence scores)
const detailed = engine.predictNextDetailed('dashboard', {
	actor: 'user',
	sessionId: session.id,
	path: '/app/dashboard',
	count: 5,
})
// => { predictions: [...], currentNode: 'dashboard', computedAt: 1234567890 }
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

## Workflow Builder

The WorkflowBuilder provides an API for assembling ProceduralGraphs programmatically.

### Creating a Workflow Builder

```ts
import { createWorkflowBuilder } from '@mikesaintsg/actionloop'

const builder = createWorkflowBuilder({
	validateOnChange: true,
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
	.addTransition({ from: 'dashboard', to: 'settings', weight: 1, actor: 'user' })
	.addTransition({ from: 'settings', to: 'dashboard', weight: 1, actor: 'user' })
```

### Building the Graph

```ts
// Validate before building
const validation = builder.validate()
if (!validation.valid) {
	console.error('Validation errors:', validation.errors)
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
	transitions: [...],
	procedures: [...],
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
})
```

### Static Checks

```ts
const results = validator.runStaticChecks()

for (const result of results) {
	console.log(`[${result.severity}] ${result.message}`)
	if (result.suggestion) {
		console.log(`  Suggestion: ${result.suggestion}`)
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

### CI/CD Integration

```ts
// Exit with error code if validation fails
const results = validator.runStaticChecks()
const errorCount = validator.getErrorCount()

if (errorCount > 0) {
	console.error(`Validation failed with ${errorCount} errors`)
	process.exit(1)
}
```

---

## Workflow Analyzer

The WorkflowAnalyzer inspects runtime patterns to uncover optimization opportunities.

### Creating a Workflow Analyzer

```ts
import { createWorkflowAnalyzer } from '@mikesaintsg/actionloop'

const analyzer = createWorkflowAnalyzer(procedural, predictive, {
	onPatternDetected: (pattern) => {
		console.log('Pattern found:', pattern.sequence.join(' -> '))
	},
})
```

### Loop Detection

```ts
// Find hot loops (high-frequency circuits)
const hotLoops = analyzer.findHotLoops({ threshold: 10 })

// Find infinite loops (walks exceeding configured length)
const infiniteLoops = analyzer.findInfiniteLoops({ maxLength: 100 })

// Find unproductive loops (low progression metrics)
const unproductiveLoops = analyzer.findUnproductiveLoops()

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
	console.log(`Bottleneck at ${b.nodeId}: ${b.congestionScore} congestion score`)
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
	console.log(`Sequence: ${opp.sequence.join(' -> ')}`)
	console.log(`Frequency: ${opp.frequency}`)
	console.log(`Type: ${opp.automationType}`)
	console.log(`Suggestion: ${opp.suggestion}`)
}
```

### Analysis Summary

```ts
const summary = analyzer.getSummary()

console.log(`Loops: ${summary.loopCount}`)
console.log(`Bottlenecks: ${summary.bottleneckCount}`)
console.log(`Automation opportunities: ${summary.automationOpportunityCount}`)
console.log(`Average path length: ${summary.avgPathLength}`)
```

---

## Error Handling

### Error Classes

All errors extend the base `ActionLoopError` class:

```ts
import { ActionLoopError, isActionLoopError } from '@mikesaintsg/actionloop'

try {
	engine.recordTransition('invalid', 'transition', context)
} catch (error) {
	if (isActionLoopError(error)) {
		console.error(`[${error.code}]: ${error.message}`)
	}
}
```

### Error Codes

| Code                 | Description            | Common Cause                   | Recovery                            |
|----------------------|------------------------|--------------------------------|-------------------------------------|
| `INVALID_TRANSITION` | Transition not allowed | Recording undefined transition | Check ProceduralGraph definition    |
| `NODE_NOT_FOUND`     | Node does not exist    | Referencing missing node       | Verify node ID                      |
| `DUPLICATE_NODE`     | Node already exists    | Adding existing node           | Use `updateNode()` instead          |
| `SESSION_NOT_FOUND`  | Session does not exist | Invalid session ID             | Start new session                   |
| `SESSION_EXPIRED`    | Session has timed out  | Exceeding session timeout      | Resume or start new session         |
| `DANGLING_NODE`      | Node has no exits      | Missing outgoing transitions   | Add transitions or mark as end node |
| `UNREACHABLE_NODE`   | Node cannot be reached | No incoming transitions        | Add transitions or remove node      |
| `BUILD_FAILED`       | Graph build failed     | Invalid builder state          | Check validation errors             |
| `IMPORT_FAILED`      | Import parse error     | Malformed JSON/YAML            | Validate import data                |
| `UNKNOWN`            | Unknown error          | Unexpected condition           | Check logs, report bug              |

### Error Handling Patterns

```ts
// Pattern 1: Try-catch with error code check
try {
	engine.recordTransition(from, to, context)
} catch (error) {
	if (isActionLoopError(error)) {
		switch (error.code) {
			case 'INVALID_TRANSITION':
				console.warn('Transition not allowed:', error.message)
				break
			case 'SESSION_NOT_FOUND':
				engine.startSession('user')
				break
			default:
				throw error
		}
	}
}

// Pattern 2: Error callback
const engine = createWorkflowEngine(procedural, predictive, {
	onError: (error) => {
		console.error(`[${error.code}]: ${error.message}`)
		// Log to monitoring service
	},
})
```

---

## TypeScript Integration

### Generic Type Parameters

Custom metadata types are supported:

```ts
interface MyNodeMetadata {
	readonly category: string
	readonly priority: number
}

// Nodes with custom metadata
const node: Node = {
	id: 'task',
	label: 'Task',
	metadata: { category: 'work', priority: 1 },
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
```

### Strict Typing

All interfaces use `readonly` modifiers for immutability:

```ts
interface Transition {
	readonly from: string
	readonly to: string
	readonly weight: number
	readonly actor: Actor
	readonly metadata?: Readonly<TransitionMetadata>
}
```

---

## Performance Tips

1. **Preload historical data** — Minimize cold-start by preloading common patterns:

```ts
const predictive = createPredictiveGraph(procedural, {
	preloadRecords: historicalData,
})
```

2. **Limit prediction count** — Only request what you'll display:

```ts
const predictions = engine.predictNext('node', {
	...context,
	count: 3, // Don't request 100 if you show 3
})
```

3. **Use batch operations** — Record multiple transitions efficiently:

```ts
engine.recordTransitions([
	{ from: 'a', to: 'b', context },
	{ from: 'b', to: 'c', context },
	{ from: 'c', to: 'd', context },
])
```

4. **Export snapshots periodically** — Persist weights for cold-start optimization:

```ts
setInterval(() => {
	const snapshot = predictive.export()
	saveToStorage(snapshot)
}, 60000)
```

5. **Monitor graph size** — Check statistics for memory concerns:

```ts
const stats = procedural.getStats()
console.log(`Nodes: ${stats.nodeCount}, Transitions: ${stats.transitionCount}`)
```

---

## Browser Compatibility

| Browser | Minimum Version | Notes        |
|---------|-----------------|--------------|
| Chrome  | 89+             | Full support |
| Firefox | 89+             | Full support |
| Safari  | 15+             | Full support |
| Edge    | 89+             | Full support |
| Node.js | 22+             | Full support |

### Feature Detection

```ts
import { isActionLoopSupported } from '@mikesaintsg/actionloop'

if (!isActionLoopSupported()) {
	console.warn('ActionLoop requires ES2022+ environment')
}
```

---

## Integration with Ecosystem

### With @mikesaintsg/navigation

```ts
import { createNavigation } from '@mikesaintsg/navigation'
import { createWorkflowEngine } from '@mikesaintsg/actionloop'

const engine = createWorkflowEngine(procedural, predictive)

const navigation = createNavigation({
	page: 'landing',
	guards: [
		async (to, from) => {
			// Validate transitions against workflow
			if (from && !engine.isValidTransition(from.page, to.page)) {
				return false
			}
			return true
		},
	],
	hooks: [
		(to, from) => {
			// Record transitions
			if (from) {
				engine.recordTransition(from.page, to.page, context)
			}
		},
	],
})
```

### With @mikesaintsg/indexeddb

```ts
import { createDatabase } from '@mikesaintsg/indexeddb'
import { createPredictiveGraph } from '@mikesaintsg/actionloop'

const database = await createDatabase({ name: 'workflow', version: 1 })
const store = database.store('weights')

// Save weights periodically
setInterval(async () => {
	const exported = predictiveGraph.export()
	await store.set({ id: 'current', ...exported })
}, 60000)

// Load on startup
const stored = await store.get('current')
if (stored) {
	predictiveGraph.import(stored)
}
```

### With @mikesaintsg/broadcast

```ts
import { createBroadcast } from '@mikesaintsg/broadcast'

const broadcast = createBroadcast({
	channel: 'workflow-sync',
	state: { currentNode: 'landing' },
})

// Sync workflow state across tabs
engine.onTransition((from, to, context) => {
	broadcast.setState({ currentNode: to })
})

// Listen for changes from other tabs
broadcast.onStateChange((state, source) => {
	if (source === 'remote') {
		console.log('Other tab navigated to:', state.currentNode)
	}
})
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
| `validateOnCreate` | `boolean`                    |          | `false` | Validate on creation      |
| `onValidation`     | `ValidationCallback`         |          | —       | Validation event callback |

#### createPredictiveGraph(procedural, options?): PredictiveGraphInterface

Creates a dynamic PredictiveGraph overlay.

**Parameters:**

| Parameter        | Type                       | Required | Default  | Description                    |
|------------------|----------------------------|----------|----------|--------------------------------|
| `procedural`     | `ProceduralGraphInterface` | ✅        | —        | Underlying procedural graph    |
| `decayAlgorithm` | `DecayAlgorithm`           |          | `'ewma'` | Weight decay algorithm         |
| `decayFactor`    | `number`                   |          | `0.9`    | Decay factor (0.0–1.0)         |
| `halfLifeMs`     | `number`                   |          | —        | Half-life for halflife decay   |
| `minWeight`      | `number`                   |          | `0.01`   | Minimum weight threshold       |
| `preloadRecords` | `readonly PreloadRecord[]` |          | —        | Historical data for cold-start |

#### createWorkflowEngine(procedural, predictive, options?): WorkflowEngineInterface

Creates a WorkflowEngine for recording and prediction.

**Parameters:**

| Parameter             | Type                       | Required | Default | Description               |
|-----------------------|----------------------------|----------|---------|---------------------------|
| `procedural`          | `ProceduralGraphInterface` | ✅        | —       | Procedural graph          |
| `predictive`          | `PredictiveGraphInterface` | ✅        | —       | Predictive graph          |
| `validateTransitions` | `boolean`                  |          | `true`  | Validate on record        |
| `trackSessions`       | `boolean`                  |          | `true`  | Enable session tracking   |
| `maxSessionDuration`  | `number`                   |          | —       | Max session duration (ms) |
| `onTransition`        | `TransitionCallback`       |          | —       | Transition event callback |
| `onPrediction`        | `PredictionCallback`       |          | —       | Prediction event callback |
| `onSessionStart`      | `SessionCallback`          |          | —       | Session start callback    |
| `onSessionEnd`        | `SessionEndCallback`       |          | —       | Session end callback      |
| `onError`             | `ErrorCallback`            |          | —       | Error event callback      |

#### createWorkflowBuilder(options?): WorkflowBuilderInterface

Creates a builder for programmatic graph construction.

#### createWorkflowValidator(procedural, options?): WorkflowValidatorInterface

Creates a validator for static analysis.

#### createWorkflowAnalyzer(procedural, predictive, options?): WorkflowAnalyzerInterface

Creates an analyzer for pattern detection.

---

### ProceduralGraphInterface

#### Accessor Methods

| Method                    | Returns                  | Description                |
|---------------------------|--------------------------|----------------------------|
| `getNode(id)`             | `Node \| undefined`      | Get node by ID             |
| `getNodes()`              | `readonly Node[]`        | Get all nodes              |
| `hasNode(id)`             | `boolean`                | Check if node exists       |
| `getTransitions(from)`    | `readonly Transition[]`  | Get outgoing transitions   |
| `getTransitionsTo(to)`    | `readonly Transition[]`  | Get incoming transitions   |
| `hasTransition(from, to)` | `boolean`                | Check if transition exists |
| `getProcedure(id)`        | `Procedure \| undefined` | Get procedure by ID        |
| `getProcedures()`         | `readonly Procedure[]`   | Get all procedures         |
| `getStats()`              | `GraphStats`             | Get graph statistics       |
| `isStartNode(id)`         | `boolean`                | Check if node is start     |
| `isEndNode(id)`           | `boolean`                | Check if node is end       |

#### Validation Methods

| Method       | Returns                       | Description             |
|--------------|-------------------------------|-------------------------|
| `validate()` | `readonly ValidationResult[]` | Run all validations     |
| `isValid()`  | `boolean`                     | Check if graph is valid |

#### Export Methods

| Method     | Returns                   | Description              |
|------------|---------------------------|--------------------------|
| `export()` | `ExportedProceduralGraph` | Export for serialization |

#### Lifecycle Methods

| Method      | Returns | Description       |
|-------------|---------|-------------------|
| `destroy()` | `void`  | Cleanup resources |

---

### PredictiveGraphInterface

#### Accessor Methods

| Method                       | Returns                         | Description                 |
|------------------------------|---------------------------------|-----------------------------|
| `getWeight(from, to, actor)` | `number`                        | Get transition weight       |
| `getWeights(nodeId, actor)`  | `readonly WeightedTransition[]` | Get all outgoing weights    |
| `getModelId()`               | `string`                        | Get unique model identifier |
| `getDecayConfig()`           | `DecayConfig`                   | Get decay configuration     |
| `getStats()`                 | `PredictiveGraphStats`          | Get statistics              |

#### Mutator Methods

| Method                               | Returns  | Description                 |
|--------------------------------------|----------|-----------------------------|
| `updateWeight(from, to, actor)`      | `void`   | Increment transition weight |
| `setWeight(from, to, actor, weight)` | `void`   | Set explicit weight         |
| `applyDecay()`                       | `number` | Apply decay to all weights  |
| `clear()`                            | `void`   | Reset all weights           |
| `clearActor(actor)`                  | `void`   | Clear weights for actor     |

#### Preload Methods

| Method             | Returns | Description                |
|--------------------|---------|----------------------------|
| `preload(records)` | `void`  | Preload historical records |

#### Export/Import Methods

| Method         | Returns                   | Description            |
|----------------|---------------------------|------------------------|
| `export()`     | `ExportedPredictiveGraph` | Export for persistence |
| `import(data)` | `void`                    | Import from export     |

---

### WorkflowEngineInterface

#### Core Methods

| Method                                | Returns                 | Description                |
|---------------------------------------|-------------------------|----------------------------|
| `recordTransition(from, to, context)` | `void`                  | Record a transition        |
| `recordTransitions(transitions)`      | `void`                  | Batch record transitions   |
| `predictNext(node, context)`          | `readonly string[]`     | Get predicted next actions |
| `predictNextDetailed(node, context)`  | `DetailedPrediction`    | Get detailed predictions   |
| `isValidTransition(from, to)`         | `boolean`               | Validate a transition      |
| `getValidTransitions(from)`           | `readonly Transition[]` | Get valid transitions      |

#### Session Methods

| Method                              | Returns                    | Description                |
|-------------------------------------|----------------------------|----------------------------|
| `startSession(actor, sessionId?)`   | `SessionInfo`              | Start a new session        |
| `getSession(sessionId)`             | `SessionInfo \| undefined` | Get session info           |
| `getActiveSession(actor)`           | `SessionInfo \| undefined` | Get active session         |
| `hasSession(sessionId)`             | `boolean`                  | Check if session exists    |
| `endSession(sessionId, reason)`     | `void`                     | End a session              |
| `resumeSession(sessionId, options)` | `void`                     | Resume an existing session |
| `getSessionChain(actor, options?)`  | `ActionChain`              | Get session history        |

#### Subscription Methods

| Method                     | Returns       | Description                 |
|----------------------------|---------------|-----------------------------|
| `onTransition(callback)`   | `Unsubscribe` | Subscribe to transitions    |
| `onPrediction(callback)`   | `Unsubscribe` | Subscribe to predictions    |
| `onSessionStart(callback)` | `Unsubscribe` | Subscribe to session starts |
| `onSessionEnd(callback)`   | `Unsubscribe` | Subscribe to session ends   |
| `onError(callback)`        | `Unsubscribe` | Subscribe to errors         |

#### Graph Access

| Method                 | Returns                    | Description                     |
|------------------------|----------------------------|---------------------------------|
| `getProceduralGraph()` | `ProceduralGraphInterface` | Get underlying procedural graph |
| `getPredictiveGraph()` | `PredictiveGraphInterface` | Get underlying predictive graph |

---

### Types

```ts
/** Actor types */
type Actor = 'user' | 'system' | 'automation'

/** Decay algorithms */
type DecayAlgorithm = 'halflife' | 'ewma' | 'linear' | 'none'

/** Session end reasons */
type SessionEndReason = 'completed' | 'abandoned' | 'timeout' | 'error'

/** Validation severity */
type ValidationSeverity = 'error' | 'warning' | 'info'

/** Loop types */
type LoopType = 'hot' | 'infinite' | 'unproductive' | 'hierarchical' | 'automatable'

/** Automation types */
type AutomationType = 'robotic' | 'llm' | 'scheduled' | 'triggered'
```

---

## License

MIT
