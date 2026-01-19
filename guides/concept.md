# @mikesaintsg/actionloop — Conceptual Architecture

> **Purpose:** Comprehensive architectural overview of the ActionLoop Predictive Procedural Action Loop System (PPALS).

---

## Overview

ActionLoop delivers a **Predictive Procedural Action Loop System (PPALS)**: a unified architecture that combines deterministic workflow rules with adaptive, data-driven predictions. It guides users through complex workflows by suggesting valid next actions ranked by learned behavior patterns.

---

## Two-Graph Architecture

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
│                   │projects │                                   │
│                   └─────────┘                                   │
│                                                                 │
│  Static rules: defines ALL valid transitions                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PredictiveGraph                            │
│                                                                 │
│  login ──[w: 0.9]──▶ dashboard ──[w:0.7]──▶ projects            │
│                              └──[w:0.2]──▶ settings             │
│                                                                 │
│  Dynamic weights: learned from usage patterns                   │
└─────────────────────────────────────────────────────────────────┘
```

| Graph               | Purpose                  | Mutability                      | Contents                               |
|---------------------|--------------------------|---------------------------------|----------------------------------------|
| **ProceduralGraph** | Define valid transitions | Static (immutable at runtime)   | Nodes, transitions, procedures, guards |
| **PredictiveGraph** | Learn usage patterns     | Dynamic (updated on each event) | Per-transition weights by actor        |

---

## PPALS Runtime Cycle

The WorkflowEngine orchestrates a continuous four-step cycle:

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

---

## Core Components

| Component           | Purpose                           | Factory Function            |
|---------------------|-----------------------------------|-----------------------------|
| **ProceduralGraph** | Static graph of valid transitions | `createProceduralGraph()`   |
| **PredictiveGraph** | Dynamic weight overlay            | `createPredictiveGraph()`   |
| **WorkflowEngine**  | Runtime orchestration             | `createWorkflowEngine()`    |
| **WorkflowBuilder** | Programmatic graph construction   | `createWorkflowBuilder()`   |
| **WorkflowValidator** | Static analysis                 | `createWorkflowValidator()` |
| **WorkflowAnalyzer** | Pattern detection                | `createWorkflowAnalyzer()`  |

---

## Actor Types

Every transition is tagged with an actor type for role-specific analytics:

```typescript
type Actor = 'user' | 'system' | 'automation'
```

- **user**: Human-initiated actions (clicks, form submissions)
- **system**: Platform-triggered events (timeouts, errors, notifications)
- **automation**: Robotic/LLM-triggered workflows (scheduled tasks, bots)

Each actor maintains separate weight tracks, enabling role-specific predictions.

---

## Decay Algorithms

PredictiveGraph supports multiple decay strategies to keep recommendations fresh:

| Algorithm    | Description                                  | Use Case                     |
|--------------|----------------------------------------------|------------------------------|
| **halflife** | Weights decay by 50% over configured period  | Time-sensitive recommendations |
| **ewma**     | Exponentially weighted moving average        | Balanced recency bias        |
| **linear**   | Constant weight loss over time               | Simple decay model           |
| **none**     | Weights accumulate indefinitely              | Historical analysis          |

---

## Key Design Decisions

1. **Zero Dependencies**: Pure TypeScript with no external runtime dependencies
2. **Two-Graph Separation**: Static rules (compliance) separate from dynamic weights (learning)
3. **Actor-Based Tracking**: Separate prediction paths for user, system, and automation
4. **Sub-50ms Predictions**: Optimized for real-time interactive UIs
5. **Export/Import**: Full serialization support for persistence and transfer
6. **Subscription Pattern**: Event-driven architecture with `on*` methods returning `Unsubscribe`
7. **Factory Functions**: All systems created via `create*` functions, not constructors
8. **Immutable Types**: All interfaces use `readonly` modifiers

---

## Ecosystem Integration

ActionLoop integrates with the `@mikesaintsg` ecosystem:

| Package                     | Integration                                                                 |
|-----------------------------|-----------------------------------------------------------------------------|
| `@mikesaintsg/navigation`   | Validate routes against ProceduralGraph, record transitions on navigate    |
| `@mikesaintsg/broadcast`    | Sync PredictiveGraph weights and session state across tabs                 |
| `@mikesaintsg/indexeddb`    | Persist ExportedPredictiveGraph for cold-start optimization                |
| `@mikesaintsg/storage`      | Cache session state in localStorage/sessionStorage                         |
| `@mikesaintsg/form`         | Track form interactions as micro-transitions                               |

---

## Package Boundaries

| Responsibility                    | Owned By                   |
|-----------------------------------|----------------------------|
| Valid transition rules            | ProceduralGraph            |
| Learned usage weights             | PredictiveGraph            |
| Transition recording & prediction | WorkflowEngine             |
| Graph construction API            | WorkflowBuilder            |
| Static graph validation           | WorkflowValidator          |
| Pattern detection & analysis      | WorkflowAnalyzer           |
| UI components                     | Application layer          |
| Persistence                       | Ecosystem packages         |

---

## Error Codes

| Code                 | Description            | Common Cause                   |
|----------------------|------------------------|--------------------------------|
| `INVALID_TRANSITION` | Transition not allowed | Recording undefined transition |
| `NODE_NOT_FOUND`     | Node does not exist    | Referencing missing node       |
| `DUPLICATE_NODE`     | Node already exists    | Adding existing node           |
| `SESSION_NOT_FOUND`  | Session does not exist | Invalid session ID             |
| `SESSION_EXPIRED`    | Session has timed out  | Exceeding session timeout      |
| `DANGLING_NODE`      | Node has no exits      | Missing outgoing transitions   |
| `UNREACHABLE_NODE`   | Node cannot be reached | No incoming transitions        |
| `BUILD_FAILED`       | Graph build failed     | Invalid builder state          |
| `IMPORT_FAILED`      | Import parse error     | Malformed JSON/YAML            |

---

## Comparison to Other Models

| Model                 | Similarity                                        | Difference                                              |
|-----------------------|---------------------------------------------------|---------------------------------------------------------|
| Finite-State Machines | Deterministic transitions enforce valid paths     | Layer per-user weights and modular subgraphs            |
| Markov Chains         | Historical counts assign transition probabilities | Preserve strict determinism; no memoryless assumption   |
| Process Mining        | Derive workflow graphs from action logs           | Focus on real-time guidance, not retrospective analysis |
| Petri Nets            | Formal graph constructs for loops and branching   | Simplify concurrency for UI-driven recommendations      |

---

## Summary

ActionLoop provides a complete workflow guidance system:

- **ProceduralGraph**: Defines what's allowed (compliance)
- **PredictiveGraph**: Learns what's likely (intelligence)
- **WorkflowEngine**: Bridges rules and learning (orchestration)
- **WorkflowBuilder**: Constructs graphs programmatically (tooling)
- **WorkflowValidator**: Ensures graph correctness (quality)
- **WorkflowAnalyzer**: Discovers patterns and opportunities (optimization)

All components work together to deliver sub-50ms predictions that never violate business rules while continuously improving based on user behavior.
