# @actionloop/core API Guide

## Table of Contents

- [Introduction](#introduction)
  - [Value Proposition](#value-proposition)
  - [Use Cases](#use-cases)
  - [When to Use actionloop](#when-to-use-actionloop)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
  - [PPALS Runtime Cycle](#ppals-runtime-cycle)
  - [Two-Graph Architecture](#two-graph-architecture)
  - [Actor Types](#actor-types)
  - [Comparison to Other Models](#comparison-to-other-models)
- [Procedural Graph](#procedural-graph)
  - [Creating a Procedural Graph](#creating-a-procedural-graph)
  - [Nodes and Transitions](#nodes-and-transitions)
  - [Procedures as Subgraphs](#procedures-as-subgraphs)
  - [Guard Conditions](#guard-conditions)
- [Predictive Graph](#predictive-graph)
  - [Creating a Predictive Graph](#creating-a-predictive-graph)
  - [Weight Updates](#weight-updates)
  - [Decay Algorithms](#decay-algorithms)
  - [Preloading Historical Data](#preloading-historical-data)
- [Workflow Engine](#workflow-engine)
  - [Creating a Workflow Engine](#creating-a-workflow-engine)
  - [Recording Transitions](#recording-transitions)
  - [Predicting Next Actions](#predicting-next-actions)
  - [Session Management](#session-management)
- [Workflow Builder](#workflow-builder)
  - [Creating a Workflow Builder](#creating-a-workflow-builder)
  - [Adding Nodes and Transitions](#adding-nodes-and-transitions)
  - [Building the Graph](#building-the-graph)
  - [Export Formats](#export-formats)
- [Workflow Validator](#workflow-validator)
  - [Creating a Workflow Validator](#creating-a-workflow-validator)
  - [Static Checks](#static-checks)
  - [Connectivity Validation](#connectivity-validation)
  - [CI/CD Integration](#cicd-integration)
- [Workflow Analyzer](#workflow-analyzer)
  - [Creating a Workflow Analyzer](#creating-a-workflow-analyzer)
  - [Loop Detection](#loop-detection)
  - [Bottleneck Analysis](#bottleneck-analysis)
  - [Automation Discovery](#automation-discovery)
- [Error Handling](#error-handling)
  - [Error Classes](#error-classes)
  - [Error Codes](#error-codes)
  - [Error Handling Patterns](#error-handling-patterns)
- [TypeScript Integration](#typescript-integration)
  - [Strict Typing](#strict-typing)
  - [Generic Type Parameters](#generic-type-parameters)
  - [Type Inference](#type-inference)
- [Performance Tips](#performance-tips)
- [Browser Compatibility](#browser-compatibility)
  - [Feature Detection](#feature-detection)
- [Integration with Ecosystem](#integration-with-ecosystem)
  - [With @actionloop/components](#with-actionloopcomponents)
  - [With @actionloop/platform](#with-actionloopplatform)
- [API Reference](#api-reference)
  - [Factory Functions](#factory-functions)
  - [ProceduralGraphInterface](#proceduralgraphinterface)
  - [PredictiveGraphInterface](#predictivegraphinterface)
  - [WorkflowEngineInterface](#workflowengineinterface)
  - [WorkflowBuilderInterface](#workflowbuilderinterface)
  - [WorkflowValidatorInterface](#workflowvalidatorinterface)
  - [WorkflowAnalyzerInterface](#workflowanalyzerinterface)
  - [Types](#types)
  - [Error Types](#error-types)
- [License](#license)

---

## Introduction

### Value Proposition

ActionLoop delivers the **Predictive Procedural Action Loop System (PPALS)**: a unified architecture that combines deterministic workflow rules with adaptive, data-driven predictions. Unlike traditional workflow engines that force a choice between rigid compliance and intelligent recommendations, ActionLoop lets you have both.

**Key Benefits:**

- **Accelerated User Journeys**: Reduce decision paralysis by showing users exactly what they can do next
- **Maintained Compliance**: Never suggest actions that violate business rules or regulatory requirements
- **Adaptive Learning**: Workflows improve automatically as patterns emerge from real user behavior
- **Reduced Support Load**: Users spend less time asking "what should I do next?"
- **Process Optimization**: Discover bottlenecks, loops, and automation opportunities hidden in behavior data
- **Context-Aware Recommendations**: Actions adapt to current application context and user path

### Use Cases

- **Multi-Step Onboarding**: Guide new users through complex registration and setup processes
- **E-Commerce Checkout**: Predict likely next steps while enforcing valid checkout sequences
- **Approval Workflows**: Route documents through approval chains with intelligent suggestions
- **Task Management**: Recommend next actions based on historical completion patterns
- **Form Wizards**: Suggest optimal paths through complex multi-page forms
- **Support Ticketing**: Route tickets and suggest resolutions based on past interactions

### When to Use actionloop

**Use @actionloop/core when:**

- You have multi-step workflows with defined valid transitions
- You want to combine business rule enforcement with adaptive recommendations
- You need sub-50ms recommendation latency for interactive UIs
- You want zero external dependencies for maximum compatibility
- You need to support browser, Node.js, or both environments

**Consider alternatives when:**

- Your workflow has no predictable patterns (fully random navigation)
- You don't need to enforce transition validity
- You only need simple linear wizards without branching

---

## Installation

```bash
npm install @actionloop/core
```

**Requirements:**

- Node. js ≥ 22. 0.0
- TypeScript ≥ 5.0 (for type definitions)
- ES2022+ environment (browser or Node.js)

---

## Quick Start

```ts
import {
	createProceduralGraph,
	createPredictiveGraph,
	createWorkflowEngine,
} from '@actionloop/core'

// 1. Define your workflow transitions
const transitions = [
	{ from: 'login', to: 'dashboard', weight: 1, actor: 'user' },
	{ from: 'dashboard', to: 'settings', weight: 1, actor: 'user' },
	{ from: 'dashboard', to: 'profile', weight: 1, actor: 'user' },
	{ from: 'settings', to: 'dashboard', weight: 1, actor: 'user' },
] as const

// 2. Create the static Procedural Graph
const procedural = createProceduralGraph({ transitions })

// 3. Create the dynamic Predictive Graph overlay
const predictive = createPredictiveGraph(procedural)

// 4. Create the Workflow Engine
const engine = createWorkflowEngine(procedural, predictive)

// 5. Record user transitions
engine.recordTransition('login', 'dashboard', {
	actor: 'user',
	sessionId: 'session-123',
	path: '/app/login',
})

// 6. Get predictions for next actions
const predictions = engine.predictNext('dashboard', {
	actor: 'user',
	sessionId: 'session-123',
	path: '/app/dashboard',
	count: 3,
})

console.log('Recommended next actions:', predictions)
// => ['settings', 'profile'] (ranked by learned weights)
```

---

## Core Concepts

### PPALS Runtime Cycle

The Predictive Procedural Action Loop System runs a continuous four-step cycle:

1. **Observe**: Capture each transition event with actor, timestamp, and session context
2. **Update**: Adjust Predictive Graph weights using recency, frequency, and decay rules
3. **Predict**: Merge static Procedural Graph priorities with dynamic Predictive Graph weights
4. **Recommend**: Return top-k valid actions, ensuring no invalid transitions are suggested

```text
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   OBSERVE   │────>│   UPDATE    │────>│   PREDICT   │────>│  RECOMMEND  │
│ transition  │     │  weights    │     │   merge     │     │   top-k     │
└─────────────┘     └─────��───────┘     └─────────────┘     └─────────────┘
       ^                                                            │
       └────────────────────────────────────────────────────────────┘
```

### Two-Graph Architecture

ActionLoop uses two complementary graph models:

| Graph | Purpose | Mutability | Contents |
|-------|---------|------------|----------|
| **Procedural Graph** | Define valid transitions | Static (read-only at runtime) | Nodes, transitions, guard conditions |
| **Predictive Graph** | Learn usage patterns | Dynamic (updated on each event) | Per-transition weights by actor |

The Procedural Graph guarantees compliance—predictions can never suggest invalid transitions. The Predictive Graph adds intelligence—ranking valid options by learned behavior.

### Actor Types

Every transition is tagged with an actor type: 

```ts
type Actor = 'user' | 'system' | 'automation'
```

- **user**: Human-initiated actions (clicks, form submissions)
- **system**: Platform-triggered events (timeouts, errors, notifications)
- **automation**: Robotic/LLM-triggered workflows (scheduled tasks, automated remediation)

Each actor type maintains separate weight tracks, enabling role-specific analytics and predictions.

### Comparison to Other Models

| Model | Similarity | Difference |
|-------|-----------|------------|
| Finite-State Machines | Deterministic transitions enforce valid paths | ActionLoop adds per-user weights and modular subgraphs |
| Markov Chains | Historical counts assign transition probabilities | ActionLoop preserves strict determinism and procedure boundaries |
| Process Mining | Derive workflow graphs from action logs | ActionLoop focuses on real-time guidance, not retrospective analysis |
| Petri Nets | Formal graph constructs for loops and branching | ActionLoop simplifies concurrency for UI-driven recommendations |

---

## Procedural Graph

The Procedural Graph is your single source of truth for valid workflow moves. 

### Creating a Procedural Graph

```ts
import { createProceduralGraph } from '@actionloop/core'

const procedural = createProceduralGraph({
	transitions: [
		{ from:  'login', to: 'dashboard', weight: 1, actor: 'user' },
		{ from: 'dashboard', to: 'checkout', weight: 1, actor: 'user' },
		{ from: 'checkout', to: 'confirmation', weight: 1, actor: 'user' },
		{ from: 'checkout', to: 'timeout', weight: 1, actor: 'system' },
	],
	procedures: [
		{ id:  'auth', actions: ['login', 'dashboard'] },
		{ id: 'purchase', actions: ['dashboard', 'checkout', 'confirmation'] },
	],
})
```

### Nodes and Transitions

**Nodes** represent discrete actions or system events: 

```ts
interface Node {
	readonly id: string
	readonly label?:  string
	readonly metadata?:  Readonly<Record<string, unknown>>
}
```

**Transitions** define allowed moves between nodes:

```ts
interface Transition {
	readonly from: string
	readonly to: string
	readonly weight: number
	readonly actor: Actor
	readonly metadata?:  TransitionMetadata
}

interface TransitionMetadata {
	readonly guard?: string
	readonly version?: string
	readonly relevantPaths?: readonly string[]
}
```

### Procedures as Subgraphs

Procedures group related actions into reusable subgraphs:

```ts
interface Procedure {
	readonly id: string
	readonly actions: readonly string[]
	readonly metadata?: Readonly<Record<string, unknown>>
}
```

Procedures connect via **shared nodes**—when the last action of one procedure matches the first action of another, users can flow seamlessly between workflows.

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
			guard: "cart.items.length > 0 && user.verified === true",
		},
	},
]
```

Guards are stored as metadata for documentation and validation.  Runtime evaluation is the application's responsibility.

---

## Predictive Graph

The Predictive Graph overlays dynamic weights on Procedural Graph transitions. 

### Creating a Predictive Graph

```ts
import { createPredictiveGraph } from '@actionloop/core'

const predictive = createPredictiveGraph(procedural, {
	decayAlgorithm: 'ewma',
	decayFactor: 0.9,
})
```

### Weight Updates

Weights are updated each time a transition is recorded:

```ts
// Internal weight update (handled by WorkflowEngine)
predictive.updateWeight('login', 'dashboard', 'user')
```

The Predictive Graph maintains separate weight tracks per actor type. 

### Decay Algorithms

Two decay strategies are supported:

**Half-Life Decay:**

```ts
const predictive = createPredictiveGraph(procedural, {
	decayAlgorithm: 'halflife',
	halfLifeMs: 86400000, // 24 hours
})
```

**EWMA (Exponentially Weighted Moving Average):**

```ts
const predictive = createPredictiveGraph(procedural, {
	decayAlgorithm: 'ewma',
	decayFactor: 0.9, // 0.0–1.0, higher = more recency bias
})
```

### Preloading Historical Data

Cold-start the Predictive Graph with historical records:

```ts
const predictive = createPredictiveGraph(procedural, {
	preloadRecords: [
		{ from: 'login', to: 'dashboard', actor: 'user', count: 100 },
		{ from:  'dashboard', to: 'settings', actor: 'user', count: 45 },
		{ from: 'checkout', to: 'timeout', actor: 'system', count: 12 },
	],
})
```

---

## Workflow Engine

The Workflow Engine bridges static rules and dynamic learning.

### Creating a Workflow Engine

```ts
import { createWorkflowEngine } from '@actionloop/core'

const engine = createWorkflowEngine(procedural, predictive, {
	onTransition: (from, to, context) => {
		console.log(`Transition:  ${from} -> ${to}`)
	},
	onPrediction: (node, predictions) => {
		console.log(`Predictions from ${node}:`, predictions)
	},
})
```

### Recording Transitions

```ts
engine.recordTransition('login', 'dashboard', {
	actor: 'user',
	sessionId:  'session-abc',
	path:  '/app/login',
})
```

Recording a transition: 

1. Validates against Procedural Graph (throws if invalid)
2. Logs actor, timestamp, session ID, and path
3. Updates Predictive Graph weight via decay-aware algorithm

### Predicting Next Actions

```ts
const predictions = engine. predictNext('dashboard', {
	actor:  'user',
	sessionId: 'session-abc',
	path: '/app/dashboard',
	count: 5,
})
// => ['settings', 'profile', 'logout', ... ] ranked by combined weight
```

Prediction: 

1. Fetches outgoing Procedural Graph transitions
2. Retrieves dynamic Predictive Graph weights
3. Scores and ranks using combined base + predictive weights
4. Returns top-k suggestions

### Session Management

```ts
// Start a session
const session = engine.startSession('user', 'session-123')

// Get session info
const info = engine.getSession('session-123')

// End a session
engine.endSession('session-123', 'completed')

// Resume across sessions
engine.resumeSession('session-123', {
	previousNode: 'checkout',
	actor: 'user',
})
```

Session end reasons: 

```ts
type SessionEndReason = 'completed' | 'abandoned' | 'timeout' | 'error'
```

---

## Workflow Builder

The Workflow Builder provides an API for assembling Procedural Graphs programmatically.

### Creating a Workflow Builder

```ts
import { createWorkflowBuilder } from '@actionloop/core'

const builder = createWorkflowBuilder()
```

### Adding Nodes and Transitions

```ts
// Add nodes
builder.addNode({ id: 'login', label: 'User Login' })
builder.addNode({ id: 'dashboard', label: 'Main Dashboard' })

// Add transitions
builder. addTransition({
	from: 'login',
	to: 'dashboard',
	weight:  1,
	actor: 'user',
})

// Add procedures
builder.addProcedure({
	id: 'auth',
	actions: ['login', 'dashboard'],
})
```

### Building the Graph

```ts
// Validate and build
const procedural = builder.build()

// Get validation results before building
const validation = builder.validate()
if (! validation.valid) {
	console.error('Validation errors:', validation.errors)
}
```

### Export Formats

```ts
// Export to JSON
const json = builder.toJSON()

// Export to YAML
const yaml = builder.toYAML()

// Import from JSON
builder.fromJSON(jsonData)

// Import from YAML
builder. fromYAML(yamlString)
```

---

## Workflow Validator

The Workflow Validator performs static analysis on Procedural Graph definitions.

### Creating a Workflow Validator

```ts
import { createWorkflowValidator } from '@actionloop/core'

const validator = createWorkflowValidator(procedural)
```

### Static Checks

```ts
const results = validator.runStaticChecks()

for (const result of results) {
	console.log(`[${result.severity}] ${result. message}`)
	if (result.suggestion) {
		console.log(`  Suggestion: ${result. suggestion}`)
	}
}
```

### Connectivity Validation

```ts
// Check for dangling nodes (no outgoing transitions)
const dangling = validator.findDanglingNodes()

// Check for unreachable nodes (no incoming transitions except start)
const unreachable = validator.findUnreachableNodes()

// Check for missing start/end nodes
const missing = validator.findMissingBoundaryNodes()
```

### CI/CD Integration

```ts
// Exit with error code if validation fails
const results = validator.runStaticChecks()
const errors = results.filter(r => r.severity === 'error')

if (errors. length > 0) {
	console.error('Validation failed:', errors)
	process.exit(1)
}
```

---

## Workflow Analyzer

The Workflow Analyzer inspects runtime logs to uncover patterns. 

### Creating a Workflow Analyzer

```ts
import { createWorkflowAnalyzer } from '@actionloop/core'

const analyzer = createWorkflowAnalyzer(procedural, predictive)
```

### Loop Detection

```ts
// Find hot loops (high-frequency circuits)
const hotLoops = analyzer. findHotLoops({ threshold: 10 })

// Find infinite loops (walks exceeding configured length)
const infiniteLoops = analyzer. findInfiniteLoops({ maxLength: 100 })

// Find unproductive loops (low progression metrics)
const unproductiveLoops = analyzer.findUnproductiveLoops()

// Find all strongly connected components using Tarjan's algorithm
const sccs = analyzer.findStronglyConnectedComponents()
```

### Bottleneck Analysis

```ts
// Find nodes with high incoming traffic and processing delays
const bottlenecks = analyzer. findBottlenecks({
	trafficThreshold: 100,
	delayThreshold: 5000,
})
```

### Automation Discovery

```ts
// Surface repetitive sequences suitable for automation
const opportunities = analyzer.findAutomationOpportunities({
	minRepetitions: 5,
	minSequenceLength: 3,
})

for (const opp of opportunities) {
	console.log(`Sequence: ${opp. sequence. join(' -> ')}`)
	console.log(`Frequency: ${opp. frequency}`)
	console.log(`Suggested automation: ${opp. suggestion}`)
}
```

---

## Error Handling

### Error Classes

```ts
import {
	ActionLoopError,
	ProceduralGraphError,
	PredictiveGraphError,
	WorkflowEngineError,
	ValidationError,
} from '@actionloop/core'
```

All errors extend the base `ActionLoopError` class.

### Error Codes

```ts
type ActionLoopErrorCode =
	// Graph errors
	| 'INVALID_TRANSITION'
	| 'NODE_NOT_FOUND'
	| 'DUPLICATE_NODE'
	| 'CYCLE_DETECTED'
	// Engine errors
	| 'SESSION_NOT_FOUND'
	| 'SESSION_EXPIRED'
	| 'INVALID_ACTOR'
	// Validation errors
	| 'DANGLING_NODE'
	| 'UNREACHABLE_NODE'
	| 'MISSING_START_NODE'
	| 'GUARD_SYNTAX_ERROR'
	// General
	| 'UNKNOWN'
```

### Error Handling Patterns

```ts
import { ActionLoopError, isActionLoopError } from '@actionloop/core'

try {
	engine.recordTransition('invalid', 'transition', context)
} catch (error) {
	if (isActionLoopError(error)) {
		switch (error.code) {
			case 'INVALID_TRANSITION':
				console.error('Transition not allowed:', error.message)
				break
			case 'NODE_NOT_FOUND': 
				console.error('Node does not exist:', error. message)
				break
			default:
				console. error('ActionLoop error:', error. message)
		}
	} else {
		throw error
	}
}
```

---

## TypeScript Integration

### Strict Typing

All interfaces use `readonly` modifiers for immutability:

```ts
interface Transition {
	readonly from: string
	readonly to:  string
	readonly weight: number
	readonly actor: Actor
	readonly metadata?: Readonly<TransitionMetadata>
}
```

### Generic Type Parameters

Custom metadata types are supported:

```ts
interface MyNodeMetadata {
	readonly category: string
	readonly priority: number
}

const procedural = createProceduralGraph<MyNodeMetadata>({
	transitions:  [... ],
	nodes: [
		{ id:  'task', metadata: { category: 'work', priority: 1 } },
	],
})
```

### Type Inference

Factory functions infer types from options:

```ts
// Type is inferred as WorkflowEngineInterface
const engine = createWorkflowEngine(procedural, predictive)

// Predictions are typed as readonly string[]
const predictions = engine.predictNext('node', context)
```

---

## Performance Tips

### 1. Preload Historical Data

```ts
// Minimize cold-start by preloading
const predictive = createPredictiveGraph(procedural, {
	preloadRecords:  historicalData,
})
```

### 2. Limit Prediction Count

```ts
// Only request what you'll display
const predictions = engine.predictNext('node', {
	... context,
	count: 3, // Don't request 100 if you show 3
})
```

### 3. Use Batch Operations

```ts
// Record multiple transitions efficiently
engine.recordTransitions([
	{ from: 'a', to: 'b', context },
	{ from: 'b', to: 'c', context },
	{ from: 'c', to: 'd', context },
])
```

### 4. Export Snapshots for Analysis

```ts
// Periodically export for offline analysis
const snapshot = predictive.export()
await saveToStorage(snapshot)
```

### 5. Monitor Memory Usage

```ts
// Check graph size
const stats = procedural.getStats()
console.log(`Nodes: ${stats. nodeCount}, Transitions: ${stats.transitionCount}`)
```

---

## Browser Compatibility

ActionLoop is pure TypeScript with zero external dependencies, compatible with all modern browsers and Node.js. 

### Feature Detection

```ts
import { isActionLoopSupported } from '@actionloop/core'

if (! isActionLoopSupported()) {
	console.warn('ActionLoop requires ES2022+ environment')
}
```

**Minimum Requirements:**

- Chrome 89+
- Firefox 89+
- Safari 15+
- Edge 89+
- Node.js 22+

---

## Integration with Ecosystem

### With @actionloop/components

```ts
// Vue 3 integration
import { ActionSection, ActionPalette } from '@actionloop/components/vue'
import { createWorkflowEngine } from '@actionloop/core'

const engine = createWorkflowEngine(procedural, predictive)

// Pass predictions to UI components
const predictions = engine.predictNext(currentNode, context)
```

### With @actionloop/platform

```ts
// Platform provides visual graph editing
import { startPlatform } from '@actionloop/platform'

startPlatform({
	procedural,
	predictive,
	engine,
	port: 3000,
})
```

---

## API Reference

### Factory Functions

#### createProceduralGraph\<TMetadata\>(options): ProceduralGraphInterface\<TMetadata\>

Create a static Procedural Graph. 

```ts
const procedural = createProceduralGraph({
	transitions: [...],
	procedures: [... ],
	nodes:  [... ],
})
```

#### createPredictiveGraph(procedural, options? ): PredictiveGraphInterface

Create a dynamic Predictive Graph overlay.

```ts
const predictive = createPredictiveGraph(procedural, {
	decayAlgorithm: 'ewma',
	decayFactor:  0.9,
	preloadRecords: [... ],
})
```

#### createWorkflowEngine(procedural, predictive, options?): WorkflowEngineInterface

Create a Workflow Engine for recording and prediction.

```ts
const engine = createWorkflowEngine(procedural, predictive, {
	onTransition: callback,
	onPrediction: callback,
})
```

#### createWorkflowBuilder(): WorkflowBuilderInterface

Create a builder for programmatic graph construction.

```ts
const builder = createWorkflowBuilder()
```

#### createWorkflowValidator(procedural): WorkflowValidatorInterface

Create a validator for static analysis.

```ts
const validator = createWorkflowValidator(procedural)
```

#### createWorkflowAnalyzer(procedural, predictive): WorkflowAnalyzerInterface

Create an analyzer for pattern detection.

```ts
const analyzer = createWorkflowAnalyzer(procedural, predictive)
```

---

### ProceduralGraphInterface

#### Accessor Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getNode(id)` | `Node \| undefined` | Get node by ID |
| `getTransitions(from)` | `readonly Transition[]` | Get outgoing transitions |
| `getTransitionsTo(to)` | `readonly Transition[]` | Get incoming transitions |
| `hasNode(id)` | `boolean` | Check if node exists |
| `hasTransition(from, to)` | `boolean` | Check if transition exists |
| `getStats()` | `GraphStats` | Get node/transition counts |

#### Validation Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `validate()` | `ValidationResult[]` | Run all validations |

#### Export Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `export()` | `ExportedProceduralGraph` | Export for serialization |

---

### PredictiveGraphInterface

#### Accessor Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getWeight(from, to, actor)` | `number` | Get transition weight |
| `getWeights(nodeId, actor)` | `readonly WeightedTransition[]` | Get all outgoing weights |
| `getModelId()` | `string` | Get unique model identifier |

#### Mutator Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `updateWeight(from, to, actor)` | `void` | Increment transition weight |
| `setWeight(from, to, actor, weight)` | `void` | Set explicit weight |
| `clear()` | `void` | Reset all weights |

#### Export Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `export()` | `ExportedPredictiveGraph` | Export for persistence |
| `import(data)` | `void` | Import from export |

---

### WorkflowEngineInterface

#### Core Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `recordTransition(from, to, context)` | `void` | Record a transition event |
| `recordTransitions(transitions)` | `void` | Batch record transitions |
| `predictNext(node, context)` | `readonly string[]` | Get predicted next actions |

#### Session Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `startSession(actor, sessionId?)` | `SessionInfo` | Start a new session |
| `getSession(sessionId)` | `SessionInfo \| undefined` | Get session info |
| `endSession(sessionId, reason)` | `void` | End a session |
| `resumeSession(sessionId, options)` | `void` | Resume an existing session |

#### Subscription Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `onTransition(callback)` | `Unsubscribe` | Subscribe to transitions |
| `onPrediction(callback)` | `Unsubscribe` | Subscribe to predictions |
| `onError(callback)` | `Unsubscribe` | Subscribe to errors |

#### Lifecycle Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `destroy()` | `void` | Cleanup resources |

---

### WorkflowBuilderInterface

#### Builder Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `addNode(node)` | `this` | Add a node |
| `addTransition(transition)` | `this` | Add a transition |
| `addProcedure(procedure)` | `this` | Add a procedure |
| `removeNode(id)` | `this` | Remove a node |
| `removeTransition(from, to)` | `this` | Remove a transition |

#### Validation Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `validate()` | `BuilderValidationResult` | Validate current state |
| `build()` | `ProceduralGraphInterface` | Build the graph |

#### Export Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `toJSON()` | `string` | Export as JSON |
| `toYAML()` | `string` | Export as YAML |
| `fromJSON(json)` | `this` | Import from JSON |
| `fromYAML(yaml)` | `this` | Import from YAML |

---

### WorkflowValidatorInterface

#### Validation Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `runStaticChecks()` | `readonly ValidationResult[]` | Run all checks |
| `findDanglingNodes()` | `readonly string[]` | Find nodes with no exits |
| `findUnreachableNodes()` | `readonly string[]` | Find unreachable nodes |
| `findMissingBoundaryNodes()` | `BoundaryCheck` | Check start/end nodes |
| `validateGuards()` | `readonly GuardValidationResult[]` | Validate guard syntax |

---

### WorkflowAnalyzerInterface

#### Analysis Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `findHotLoops(options?)` | `readonly LoopInfo[]` | Find high-frequency loops |
| `findInfiniteLoops(options?)` | `readonly LoopInfo[]` | Find excessive loops |
| `findUnproductiveLoops()` | `readonly LoopInfo[]` | Find low-value loops |
| `findBottlenecks(options?)` | `readonly BottleneckInfo[]` | Find traffic bottlenecks |
| `findAutomationOpportunities(options?)` | `readonly AutomationOpportunity[]` | Find automation candidates |
| `findStronglyConnectedComponents()` | `readonly SCC[]` | Find SCCs via Tarjan's |

---

### Types

```ts
// Actor types
type Actor = 'user' | 'system' | 'automation'

// Session types
interface SessionInfo {
	readonly id: string
	readonly actor: Actor
	readonly startTime: number
	readonly lastActivity: number
	readonly path?:  string
}

type SessionEndReason = 'completed' | 'abandoned' | 'timeout' | 'error'

// Context types
interface TransitionContext {
	readonly actor: Actor
	readonly sessionId:  string
	readonly path: string
}

interface PredictionContext extends TransitionContext {
	readonly count?:  number
}

// Graph types
interface Node {
	readonly id: string
	readonly label?: string
	readonly metadata?: Readonly<Record<string, unknown>>
}

interface Transition {
	readonly from: string
	readonly to: string
	readonly weight:  number
	readonly actor: Actor
	readonly metadata?: TransitionMetadata
}

interface TransitionMetadata {
	readonly guard?: string
	readonly version?:  string
	readonly relevantPaths?: readonly string[]
}

interface Procedure {
	readonly id: string
	readonly actions:  readonly string[]
	readonly metadata?: Readonly<Record<string, unknown>>
}

// Preload types
interface PreloadRecord {
	readonly from: string
	readonly to: string
	readonly actor: Actor
	readonly count: number
}

// Analysis types
interface LoopInfo {
	readonly nodes: readonly string[]
	readonly frequency: number
	readonly avgDuration: number
}

interface BottleneckInfo {
	readonly nodeId: string
	readonly incomingTraffic: number
	readonly avgDelay: number
}

interface AutomationOpportunity {
	readonly sequence: readonly string[]
	readonly frequency: number
	readonly suggestion: string
}

// Validation types
interface ValidationResult {
	readonly passed: boolean
	readonly message:  string
	readonly severity: 'error' | 'warning' | 'info'
	readonly suggestion?: string
}
```

---

### Error Types

```ts
interface ActionLoopErrorData {
	readonly code: ActionLoopErrorCode
	readonly message: string
	readonly cause?:  Error
}

type ActionLoopErrorCode =
	| 'INVALID_TRANSITION'
	| 'NODE_NOT_FOUND'
	| 'DUPLICATE_NODE'
	| 'CYCLE_DETECTED'
	| 'SESSION_NOT_FOUND'
	| 'SESSION_EXPIRED'
	| 'INVALID_ACTOR'
	| 'DANGLING_NODE'
	| 'UNREACHABLE_NODE'
	| 'MISSING_START_NODE'
	| 'GUARD_SYNTAX_ERROR'
	| 'UNKNOWN'
```

---

## License

MIT