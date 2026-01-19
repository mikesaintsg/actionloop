# ActionLoop

## 1. Executive Summary

ActionLoop is a **Predictive Procedural Action Loop System (PPALS)** that unites deterministic business procedures with adaptive predictions to guide users through complex, multistep workflows. The framework combines static rule enforcement with dynamic weight learning to deliver real-time, context-aware recommendations without violating business constraints.

**Core Architecture:**
- **ProceduralGraph**: Static, deterministic graph encoding all valid workflow transitions
- **PredictiveGraph**: Dynamic overlay tracking frequency, recency, and actor-specific weights
- **WorkflowEngine**: Runtime orchestrator executing the continuous observe-update-predict-recommend cycle

**Business Value:**
- **Accelerated User Journeys**: Reduce decision paralysis with contextual next-step recommendations
- **Maintained Compliance**: Predictions never violate ProceduralGraph rules
- **Adaptive Learning**: Workflows improve automatically as usage patterns emerge
- **Process Optimization**: Discover bottlenecks, loops, and automation opportunities
- **Sub-50ms Latency**:  Real-time recommendations suitable for interactive UIs

**Package Ecosystem:**
```bash
npm install @actionloop/core @actionloop/engine
npm install @actionloop/builder @actionloop/validator @actionloop/analyzer
npm install @actionloop/components @actionloop/platform
npm install -g @actionloop/contributor
```

---

## 2. Introduction & Motivation

Multistep processes often follow rigid procedures but still leave users guessing what to do next. Most workflow platforms force a choice between: 

- **Rigid Compliance**: Hard-coded flows that never break rules but feel brittle
- **Adaptive Intelligence**: Data-driven recommendations that improve UX but risk rule violations

ActionLoop's two-graph architecture delivers both.  The ProceduralGraph defines every allowed path to guarantee correctness. At runtime, the PredictiveGraph learns which transitions users take most often, ranking suggestions by frequency, recency, and context—while never proposing anything outside the static rules.

By embedding recommendations directly into applications via the `@actionloop/components` package, teams surface intelligent guidance exactly where users need it. 

---

## 3. Architectural Overview

```text
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│ ProceduralGraph │────▶│ PredictiveGraph  │────▶│  WorkflowEngine    │
│ (static rules)  │     │ (dynamic weights)│     │  recordTransition()│
└─────────────────┘     └──────────────────┘     │  predictNext()     │
         │                        │              └────────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        ActionLoop Tools                              │
│  WorkflowBuilder │ WorkflowValidator │ WorkflowAnalyzer              │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│               ActionLoop Platform & Components                       │
│  Vue:  ActionSection, ActionPalette, GraphView                        │
│  React: ActionSection, ActionPalette, RecommendationList             │
│  Vanilla:  Web Components with TypeScript definitions                 │
└──────────────────────────────────────────────────────────────────────┘
```

**Core Packages:**
| Package | Purpose |
|---------|---------|
| `@actionloop/core` | ProceduralGraph and PredictiveGraph classes |
| `@actionloop/engine` | WorkflowEngine orchestration |
| `@actionloop/builder` | Interactive graph creation and export |
| `@actionloop/validator` | Static analysis and compliance checks |
| `@actionloop/analyzer` | Loop detection, bottleneck analysis, SCC algorithms |
| `@actionloop/components` | Framework-agnostic UI components |
| `@actionloop/platform` | Vue 3 GUI for design, validation, and visualization |
| `@actionloop/contributor` | Development toolkit and CLI |

---

## 4. Theoretical Foundations

Every workflow is modeled as **interconnected subgraphs** (procedures). Each subgraph contains: 

- **Nodes**: Discrete user actions or system events
- **Transitions**:  Directed links defining legal moves between nodes
- **Loops**: Shared nodes across subgraphs enabling continuous workflows

The ProceduralGraph captures all valid action sequences.  The PredictiveGraph brings it to life by ranking outgoing transitions based on frequency, recency, and actor context. 

### Comparison to Other Models

| Model | Similarity | Difference |
|-------|------------|------------|
| Finite-State Machines | Deterministic transitions enforce valid paths | Layer per-user weights and modular subgraphs |
| Markov Chains | Historical counts assign transition probabilities | Preserve strict determinism; no memoryless assumption |
| Process Mining | Derive workflow graphs from action logs | Focus on real-time guidance, not retrospective analysis |
| Petri Nets | Formal graph constructs for loops and branching | Simplify concurrency for UI-driven recommendations |

---

## 5. ProceduralGraph

The ProceduralGraph is the single source of truth for valid workflow moves. 

### Type Definitions

```typescript
interface Node {
  readonly id: string
  readonly label?:  string
  readonly metadata?:  Readonly<{
    availablePaths?:  readonly string[]
    isStart?: boolean
    isEnd?: boolean
  }>
}

interface Transition {
  readonly from: string
  readonly to:  string
  readonly weight:  number
  readonly actor:  'user' | 'system' | 'automation'
  readonly metadata?: Readonly<{
    guard?: string
    version?: string
    relevantPaths?: readonly string[]
  }>
}

interface Procedure {
  readonly id: string
  readonly actions: readonly string[]
  readonly metadata?: Readonly<{
    primaryPaths?: readonly string[]
  }>
}
```

### API

```typescript
import { ProceduralGraph } from '@actionloop/core'

const graph = new ProceduralGraph(procedures, transitions)
graph.validate() // Throws on structural errors
```

### Modeling Guidelines

1. **Nodes**:  Tag start/end nodes; include path metadata for context
2. **Transitions**: Annotate with base weight, actor type, and guard conditions
3. **Procedures**: Model as connected subgraphs; share nodes to form loops
4. **Versioning**: Export definitions to JSON/YAML with version metadata

---

## 6. PredictiveGraph

The PredictiveGraph adapts over time while respecting ProceduralGraph constraints.

### Characteristics

- **Transition Weights**: Track frequency and recency per transition
- **Decay Rules**: Stale patterns fade via configurable half-life or EWMA
- **Cold-Start Seeding**: Preload common paths to avoid empty results
- **Actor Separation**: Maintain distinct weight tracks for user, system, and automation

### API

```typescript
import { PredictiveGraph } from '@actionloop/core'

const predictive = new PredictiveGraph(proceduralGraph, {
  preloadRecords: [
    { from: 'login', to: 'dashboard', actor: 'user', count: 100 }
  ]
})

predictive.updateWeight('login', 'dashboard', 'user')
const weights = predictive.getWeights('login', 'user')
```

### Constraints

- Only overlays transitions defined in ProceduralGraph
- Timestamps drive decay—older events count for less
- Metadata must remain PII-free

---

## 7.  PPALS Runtime Cycle

The Predictive Procedural Action Loop System runs a continuous four-step cycle:

```text
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌───────────┐
│ OBSERVE │────▶│ UPDATE  │────▶│ PREDICT │────▶│ RECOMMEND │
│         │     │ WEIGHTS │     │         │     │           │
└─────────┘     └─────────┘     └─────────┘     └───────────┘
     ▲                                                 │
     └─────────────────────────────────────────────────┘
```

1. **Observe**:  Capture transition event with actor, timestamp, session, and path
2. **Update**: Apply decay-aware weight updates to PredictiveGraph
3. **Predict**:  Merge static ProceduralGraph priorities with dynamic weights
4. **Recommend**: Return top-k valid actions in <50ms

### Constraints

- Weight updates only apply to ProceduralGraph-defined transitions
- Actor contexts maintain separate weight tracks
- ProceduralGraph is time-agnostic; session data lives in PredictiveGraph
- Must support concurrent access without corrupting state

---

## 8. WorkflowEngine

The WorkflowEngine bridges static rules and dynamic learning.

### API

```typescript
import { WorkflowEngine } from '@actionloop/engine'

const engine = new WorkflowEngine(proceduralGraph, predictiveGraph)

// Record a transition
engine.recordTransition('login', 'dashboard', {
  actor: 'user',
  sessionId: 'session-123',
  path: '/app/dashboard'
})

// Predict next actions
const recommendations = engine.predictNext('dashboard', {
  actor: 'user',
  sessionId:  'session-123',
  path:  '/app/dashboard',
  count: 5
})
```

### Session Management

```typescript
interface SessionManager {
  startSession(actor: string, sessionId?:  string): SessionInfo
  endSession(sessionId: string, reason:  SessionEndReason): void
  getActiveSession(actor: string): SessionInfo | null
  getSessionChain(actor: string, options?: ChainOptions): ActionChain
}
```

### Event Sourcing

- **Immutable Events**: Each transition creates an immutable event
- **Cross-Session Continuity**:  Chains persist across session boundaries
- **Temporal Ordering**: Strict chronological order across all sessions
- **Chain Truncation**: Configurable strategies for memory optimization

---

## 9. Dynamic Graph Management

ActionLoop supports runtime graph loading, unloading, and network synchronization.

### Weight Management

```typescript
interface WeightEvictionPolicy {
  readonly strategy: 'lru' | 'frequency' | 'recency' | 'relevance' | 'composite'
  readonly thresholds:  Readonly<{
    memoryLimit: number
    accessThreshold: number
    ageThreshold: number
  }>
  readonly preserveRules: readonly string[]
}
```

### Network Synchronization

```typescript
interface GraphSource {
  readonly endpoint: string
  readonly authentication?:  AuthConfig
  readonly caching:  CacheConfig
  readonly updateFrequency: number
  readonly priority: number
}

// Fetch and apply updates
await engine.fetchGraphUpdates(graphSource)
await engine.syncWithRemote(remoteEndpoint)
```

### Capabilities

- **Modular Procedures**: Load/unload procedure subgraphs dynamically
- **Relevance-Based Loading**: Only load weights relevant to current context
- **Incremental Updates**: Apply changes without full reconstruction
- **Conflict Resolution**: Handle local/remote definition conflicts

---

## 10. Development Toolchain

### WorkflowBuilder

Interactive graph creation with drag-and-drop interface. 

```typescript
import { WorkflowBuilder } from '@actionloop/builder'

const builder = new WorkflowBuilder()
builder.addNode({ id: 'login', label: 'Login' })
builder.addNode({ id: 'dashboard' })
builder.addTransition({ from: 'login', to: 'dashboard', weight: 1, actor: 'user' })

const graph = builder. build()
builder.exportToYaml('workflow. yaml')
```

### WorkflowValidator

Static analysis for structural integrity. 

```typescript
import { WorkflowValidator } from '@actionloop/validator'

const validator = new WorkflowValidator(proceduralGraph)
validator.runStaticChecks() // Detects dangling nodes, unreachable states, guard violations
```

Integrate into CI pipelines to block invalid deployments.

### WorkflowAnalyzer

Batch and streaming analysis using graph algorithms.

```typescript
import { WorkflowAnalyzer } from '@actionloop/analyzer'

const analyzer = new WorkflowAnalyzer(proceduralGraph, predictiveGraph)
const loops = analyzer.findHotLoops()
const bottlenecks = analyzer.findBottlenecks()
const automationOpportunities = analyzer. findAutomationOpportunities()

// Context-aware analysis
const contextualAnalysis = analyzer.analyzeByContext({
  groupBy: ['actor', 'path'],
  timeRange:  { start: Date.now() - 86400000, end:  Date.now() }
})
```

**Algorithms:**
- **SCC Detection**: Kosaraju's and Tarjan's algorithms for strongly connected components
- **Edge Classification**: DFS-based tree, back, cross, and forward edge detection
- **Loop Analysis**: Hot loops, infinite loops, unproductive loops, hierarchical loops

---

## 11. UI Components

The `@actionloop/components` package provides framework-agnostic components.

### Installation

```typescript
// Vue 3
import { ActionSection, ActionPalette, GraphView } from '@actionloop/components/vue'

// React
import { ActionSection, ActionPalette, GraphView } from '@actionloop/components/react'

// Vanilla JavaScript
import { ActionSection, ActionPalette, GraphView } from '@actionloop/components/vanilla'
```

### Core Components

| Component | Purpose |
|-----------|---------|
| `ActionSection` | Page-specific container for node-related recommendations |
| `ActionPalette` | Global overlay for system-wide actions and shortcuts |
| `RecommendationList` | Renders top-k suggestions with confidence scoring |
| `GraphView` | Interactive Petri net visualization |
| `ActionButton` | Individual action with customizable styling |
| `WorkflowStatus` | Current workflow position and progress indicator |

### Characteristics

- **Zero Dependencies**: No external UI library dependencies
- **Tree Shakeable**:  Modular exports for optimal bundle sizes
- **Accessible**: WCAG 2.1 AA compliant with keyboard and screen reader support
- **Performant**: Optimized for <50ms recommendation rendering
- **Themeable**: CSS custom properties for flexible styling

---

## 12. ActionLoop Platform

The `@actionloop/platform` package provides a Vue 3 GUI for workflow development.

```bash
npm install -g @actionloop/platform
npx @actionloop/platform
```

### Features

- **Workflow Builder**: Interactive graph creation via drag-and-drop
- **Workflow Validator**: Real-time validation with visual feedback
- **Workflow Analyzer**: Live analysis with Petri net overlays
- **Graph Visualization**: Dynamic token flow and recommendation display
- **Export/Import**: Graph definitions and reports in JSON/YAML formats

---

## 13. Contributor Toolkit

The `@actionloop/contributor` package provides CLI tools for ecosystem development.

```bash
# Initialize new project
npx @actionloop/contributor init my-project --template=browser|node|react|vue

# Development lifecycle
contributor setup      # Configure environment
contributor validate   # Check structure and dependencies
contributor audit      # Production readiness validation
contributor context    # Manage perspective documentation
contributor scaffold   # Generate components and utilities
```

### Architecture Principles

- **Zero Runtime Dependencies**: Only Node.js built-ins for runtime
- **Source of Truth**: Contributor package. json manages all ecosystem versions
- **Essential Scripts**: Every project supports build, test, format, type-check, clean
- **Template System**: Browser, Node, React, Vue templates with working examples

---

## 14. TypeScript Implementation Example

```typescript
import { ProceduralGraph, PredictiveGraph } from '@actionloop/core'
import { WorkflowEngine } from '@actionloop/engine'

// Define actor type
type Actor = 'user' | 'system' | 'automation'

// Define transitions
const transitions = [
  { from:  'login', to: 'dashboard', weight: 1, actor: 'user' as Actor },
  { from: 'dashboard', to: 'profile', weight: 1, actor: 'user' as Actor },
  { from:  'dashboard', to: 'settings', weight: 1, actor: 'user' as Actor },
  { from:  'profile', to: 'dashboard', weight: 1, actor: 'user' as Actor },
  { from: 'settings', to: 'dashboard', weight: 1, actor: 'user' as Actor },
  { from:  'dashboard', to: 'logout', weight: 1, actor: 'system' as Actor },
] as const

// Define procedures
const procedures = [
  { id:  'auth', actions: ['login', 'logout'] },
  { id: 'navigation', actions: ['dashboard', 'profile', 'settings'] },
] as const

// Build graphs
const procedural = new ProceduralGraph([... procedures], [... transitions])
const predictive = new PredictiveGraph(procedural)
const engine = new WorkflowEngine(procedural, predictive)

// Record user behavior
engine.recordTransition('login', 'dashboard', {
  actor: 'user',
  sessionId: 'session-001',
  path:  '/app/dashboard'
})

// Get recommendations
const nextActions = engine.predictNext('dashboard', {
  actor: 'user',
  sessionId: 'session-001',
  path: '/app/dashboard',
  count: 3
})

console.log('Recommended actions:', nextActions)
// ['profile', 'settings', 'logout']
```

---

## 15. Graph Visualization

```text
         [login]
            │
       user │ weight:  1
            ▼
      ┌──[dashboard]──┐
      │       │       │
 user │  user │  system│
      ▼       ▼       ▼
 [profile] [settings] [logout]
      │       │
 user │  user │
      └───────┴───────▶ [dashboard]
                          (loop)
```

- Solid lines: User-driven transitions
- Dashed lines: System-driven transitions
- Numbers: Base ProceduralGraph weights (PredictiveGraph adjusts dynamically)

---

## 16. Restrictions & Constraints

- **Zero External Dependencies**: Pure TypeScript ES modules
- **Cross-Platform**: Browser and Node.js without polyfills
- **PII-Free Metadata**: No personally identifiable information in graph data
- **Deterministic Predictions**: Never violate ProceduralGraph rules
- **Latency Requirements**: <50ms for interactive UI recommendations
- **Thread Safety**: Support concurrent access without state corruption

---

## 17. Development Guidelines

### TypeScript Standards

- Use `readonly` for parameters and return types
- Avoid `any` and non-null assertions
- Write user-defined type guards with `is` prefix
- Validate at edges (accept `unknown`, narrow, then use)
- Named exports only; no default exports

### Naming Conventions

| Category | Prefixes |
|----------|----------|
| Accessors | `get`, `peek`, `at`, `has`, `is` |
| Mutators | `set`, `update`, `append`, `remove`, `clear` |
| Transformers | `to`, `as`, `clone` |
| Constructors | `from`, `create`, `of` |
| Lifecycle | `destroy` |
| Events | `on` (return cleanup function `() => void`) |

### Quality Gates

```bash
npm run build      # Zero TypeScript errors
npm run test       # All tests pass
npm run format     # Code formatted
npm run type-check # Strict type compliance
npm run clean      # Build artifacts removed
```

---

## 18. Roadmap

- **Multi-Tenant Graphs**:  Isolated customer graphs with real-time replication
- **Automated Loop Resolution**: LLM and robotic agent integration for loop exits
- **Graph Compression**: Archive low-traffic paths dynamically
- **Guard Conditions**: Rich prerequisite validation with UI gating
- **Monitoring & Observability**: Standardized event schemas and dashboard templates
- **UI Ecosystem**: Marketplace for community-contributed widgets and extensions

---

## 19. Glossary

| Term | Definition |
|------|------------|
| **PPALS** | Predictive Procedural Action Loop System—continuous observe-update-predict-recommend cycle |
| **ProceduralGraph** | Static map of valid transitions (deterministic rules) |
| **PredictiveGraph** | Dynamic overlay of per-transition weights (adaptive learning) |
| **WorkflowEngine** | Runtime orchestrator bridging graphs and UI |
| **Transition** | Directed link from one node to another with weight and actor |
| **Actor** | Entity performing action:  `user`, `system`, or `automation` |
| **SCC** | Strongly Connected Component—circuit in the graph |
| **Guard** | Precondition expression that must evaluate true for transition |

---

## 20.  Conclusion

ActionLoop unites deterministic business rules with adaptive, data-driven guidance. By defining every valid transition in a ProceduralGraph and overlaying dynamic weights in a PredictiveGraph, teams deliver workflows that are both reliable and intuitive. 

The modular package ecosystem enables incremental adoption—start with core graphs, add engine orchestration, layer in UI components, and scale to full platform visualization as needed. 

**Next Steps:**
1. Install `@actionloop/core` and `@actionloop/engine`
2. Define your ProceduralGraph with procedures and transitions
3. Initialize the WorkflowEngine and record first transitions
4. Integrate `@actionloop/components` into your UI
5. Use `@actionloop/analyzer` to discover optimization opportunities