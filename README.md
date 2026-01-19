# @mikesaintsg/actionloop

> **Predictive Procedural Action Loop System (PPALS) — Combine deterministic workflow rules with adaptive predictions to guide users through complex multi-step workflows.**

[![npm version](https://img.shields.io/npm/v/@mikesaintsg/actionloop.svg)](https://www.npmjs.com/package/@mikesaintsg/actionloop)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@mikesaintsg/actionloop)](https://bundlephobia.com/package/@mikesaintsg/actionloop)
[![license](https://img.shields.io/npm/l/@mikesaintsg/actionloop.svg)](LICENSE)
[![tests](https://img.shields.io/badge/tests-231%20passing-brightgreen)](./tests)

---

## Features

- ✅ **Deterministic Compliance** — ProceduralGraph defines all valid transitions; predictions never violate rules
- ✅ **Adaptive Learning** — PredictiveGraph learns from usage patterns to rank recommendations
- ✅ **Sub-50ms Predictions** — Optimized for real-time interactive UIs
- ✅ **Session Management** — Track user journeys with cross-session continuity
- ✅ **Pattern Analysis** — Discover bottlenecks, loops, and automation opportunities
- ✅ **Zero Dependencies** — Built entirely on native TypeScript APIs
- ✅ **TypeScript First** — Full type safety with strict typing and readonly interfaces
- ✅ **Tree-shakeable** — ESM-only, import what you need
- ✅ **Isomorphic** — Works in browser and Node.js environments

---

## Installation

```bash
npm install @mikesaintsg/actionloop
```

---

## Quick Start

```ts
import {
	createProceduralGraph,
	createPredictiveGraph,
	createWorkflowEngine,
} from '@mikesaintsg/actionloop'

// Define workflow transitions
const transitions = [
	{ from: 'login', to: 'dashboard', weight: 1, actor: 'user' },
	{ from: 'dashboard', to: 'settings', weight: 1, actor: 'user' },
	{ from: 'dashboard', to: 'profile', weight: 1, actor: 'user' },
] as const

// Create graphs and engine
const procedural = createProceduralGraph({ transitions })
const predictive = createPredictiveGraph(procedural)
const engine = createWorkflowEngine(procedural, predictive)

// Start session and record transitions
const session = engine.startSession('user')
engine.recordTransition('login', 'dashboard', {
	actor: 'user',
	sessionId: session.id,
	path: '/dashboard',
})

// Get predictions
const predictions = engine.predictNext('dashboard', {
	actor: 'user',
	sessionId: session.id,
	path: '/dashboard',
	count: 3,
})

console.log('Recommended actions:', predictions)
// => ['settings', 'profile'] ranked by learned weights

// Cleanup
engine.destroy()
```

---

## Documentation

📚 **[Full API Guide](./guides/actionloop.md)** — Comprehensive documentation with examples

### Key Sections

- [Introduction](./guides/actionloop.md#introduction) — Value proposition and use cases
- [Quick Start](./guides/actionloop.md#quick-start) — Get started in minutes
- [Core Concepts](./guides/actionloop.md#core-concepts) — PPALS cycle and two-graph architecture
- [Procedural Graph](./guides/actionloop.md#procedural-graph) — Static transition rules
- [Predictive Graph](./guides/actionloop.md#predictive-graph) — Dynamic weight learning
- [Workflow Engine](./guides/actionloop.md#workflow-engine) — Recording and prediction
- [Error Handling](./guides/actionloop.md#error-handling) — Error codes and recovery
- [API Reference](./guides/actionloop.md#api-reference) — Complete API documentation

---

## API Overview

### Factory Functions

| Function                                                   | Description                                         |
|------------------------------------------------------------|-----------------------------------------------------|
| `createProceduralGraph(options)`                           | Create a static procedural graph                    |
| `createPredictiveGraph(procedural, options?)`              | Create a dynamic predictive graph overlay           |
| `createWorkflowEngine(procedural, predictive, options?)`   | Create workflow engine for recording and prediction |
| `createWorkflowBuilder(options?)`                          | Create builder for programmatic graph construction  |
| `createWorkflowValidator(procedural, options?)`            | Create validator for static analysis                |
| `createWorkflowAnalyzer(procedural, predictive, options?)` | Create analyzer for pattern detection               |

### WorkflowEngine Interface

| Method                                | Description                              |
|---------------------------------------|------------------------------------------|
| `recordTransition(from, to, context)` | Record a transition event                |
| `predictNext(node, context)`          | Get predicted next actions               |
| `predictNextDetailed(node, context)`  | Get detailed predictions with confidence |
| `startSession(actor, sessionId?)`     | Start a new session                      |
| `endSession(sessionId, reason)`       | End a session                            |
| `onTransition(callback)`              | Subscribe to transitions                 |
| `destroy()`                           | Cleanup resources                        |

---

## Examples

### Basic Usage

```ts
import {
	createProceduralGraph,
	createPredictiveGraph,
	createWorkflowEngine,
} from '@mikesaintsg/actionloop'

const procedural = createProceduralGraph({
	transitions: [
		{ from: 'login', to: 'dashboard', weight: 1, actor: 'user' },
		{ from: 'dashboard', to: 'checkout', weight: 1, actor: 'user' },
	],
})

const predictive = createPredictiveGraph(procedural, {
	decayAlgorithm: 'ewma',
	decayFactor: 0.9,
})

const engine = createWorkflowEngine(procedural, predictive)
```

### With Session Management

```ts
const session = engine.startSession('user')

engine.recordTransition('login', 'dashboard', {
	actor: 'user',
	sessionId: session.id,
	path: '/app/dashboard',
})

// Get session history
const chain = engine.getSessionChain('user', { limit: 100 })

// End session
engine.endSession(session.id, 'completed')
```

### Error Handling

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

### Workflow Analysis

```ts
import { createWorkflowAnalyzer } from '@mikesaintsg/actionloop'

const analyzer = createWorkflowAnalyzer(procedural, predictive)

// Find bottlenecks
const bottlenecks = analyzer.findBottlenecks({ trafficThreshold: 100 })

// Find automation opportunities
const opportunities = analyzer.findAutomationOpportunities({
	minRepetitions: 5,
	confidenceThreshold: 0.7,
})
```

---

## Architecture

ActionLoop uses a **two-graph architecture** to separate concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                      ProceduralGraph                            │
│  Static rules: defines ALL valid transitions (deterministic)   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PredictiveGraph                            │
│  Dynamic weights: learned from usage patterns (adaptive)       │
└─────────────────────────────────────────────────────────────────┘
```

- **ProceduralGraph**: Immutable at runtime, encodes every allowed path
- **PredictiveGraph**: Learns from user behavior, ranks suggestions by frequency and recency
- **WorkflowEngine**: Orchestrates the PPALS cycle (Observe → Update → Predict → Recommend)

---

## Ecosystem Integration

| Package                   | Integration                                            |
|---------------------------|--------------------------------------------------------|
| `@mikesaintsg/navigation` | Validate routes and record transitions on navigate     |
| `@mikesaintsg/indexeddb`  | Persist predictive weights for cold-start optimization |
| `@mikesaintsg/broadcast`  | Sync workflow state across browser tabs                |
| `@mikesaintsg/storage`    | Cache session state in localStorage/sessionStorage     |
| `@mikesaintsg/form`       | Track form interactions as micro-transitions           |

See [Integration with Ecosystem](./guides/actionloop.md#integration-with-ecosystem) for details.

---

## Browser Support

| Browser | Minimum Version |
|---------|-----------------|
| Chrome  | 89+             |
| Firefox | 89+             |
| Safari  | 15+             |
| Edge    | 89+             |
| Node.js | 22+             |

---

## Development

```bash
# Install dependencies
npm install

# Type check
npm run check

# Lint and format
npm run format

# Build
npm run build

# Run tests
npm test

# Build showcase demo
npm run show
```

---

## Contributing

Contributions are welcome! Please read the contributing guidelines first.

---

## License

MIT © [mikesaintsg](https://github.com/mikesaintsg)
