# Project Plan: @mikesaintsg/actionloop

> **Status:** Phase 4 of 4 — Polish
> **Last Updated:** 2026-01-19
> **Next Milestone:** Documentation, showcase, edge cases

---

## Quick Context

> **Purpose:** This section helps models quickly orient when starting a new session.

| Field              | Value                         |
|--------------------|-------------------------------|
| **Package name**   | `@mikesaintsg/actionloop`     |
| **Environment**    | `isomorphic`                  |
| **Type**           | `library`                     |
| **Sandbox folder** | `showcase/`                   |

### Current Session State

```
Phase: 4 of 4 (Polish)
Active Deliverable: 4.1 Documentation
Checklist Progress: 0/16 items complete
Last Action: Extracted types, helpers, constants to centralized files
Next Action: Begin Phase 4 - Documentation and polish
Blockers: None
```

> **Instructions:** Update this section at the END of each session with the model.

---

## Vision

ActionLoop delivers the **Predictive Procedural Action Loop System (PPALS)**: a unified architecture that combines deterministic workflow rules with adaptive, data-driven predictions. It guides users through complex workflows by suggesting valid next actions ranked by learned behavior patterns, while never violating business rules defined in the procedural graph.

---

## Non-Goals

Explicit boundaries. What we are NOT building:

- ❌ Visual workflow editor or drag-and-drop UI
- ❌ Server-side workflow orchestration engine
- ❌ Machine learning model training infrastructure
- ❌ Database or persistence layer (use ecosystem packages)
- ❌ UI components for displaying recommendations
- ❌ Authentication or authorization logic

---

## Success Criteria

How we know the project is complete:

- [ ] All six core systems implemented (ProceduralGraph, PredictiveGraph, WorkflowEngine, WorkflowBuilder, WorkflowValidator, WorkflowAnalyzer)
- [ ] All factory functions exported and documented
- [ ] Full test coverage for public API (>80%)
- [ ] Sub-50ms prediction latency verified
- [ ] Zero external dependencies
- [ ] Integration examples with @mikesaintsg/navigation, @mikesaintsg/indexeddb, @mikesaintsg/broadcast
- [ ] Showcase demo in showcase/ folder

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    WorkflowEngineInterface                       │
│  recordTransition() │ predictNext() │ startSession()            │
├─────────────────────────────────────────────────────────────────┤
│  ProceduralGraphInterface     │     PredictiveGraphInterface    │
│  - Node definitions           │     - Weight tracking           │
│  - Transition rules           │     - Decay algorithms          │
│  - Procedure subgraphs        │     - Actor separation          │
├─────────────────────────────────────────────────────────────────┤
│  WorkflowBuilder   │   WorkflowValidator   │   WorkflowAnalyzer │
│  - Graph assembly  │   - Static checks     │   - Loop detection │
│  - JSON/YAML I/O   │   - Guard validation  │   - Bottlenecks    │
└─────────────────────────────────────────────────────────────────┘
```

### Components

| Component         | Purpose                           | Location                          |
|-------------------|-----------------------------------|-----------------------------------|
| ProceduralGraph   | Static graph of valid transitions | `src/core/graphs/procedural.ts`   |
| PredictiveGraph   | Dynamic weight overlay            | `src/core/graphs/predictive.ts`   |
| WorkflowEngine    | Runtime orchestration             | `src/core/workflows/engine.ts`    |
| WorkflowBuilder   | Programmatic graph construction   | `src/core/workflows/builder.ts`   |
| WorkflowValidator | Static analysis                   | `src/core/workflows/validator.ts` |
| WorkflowAnalyzer  | Pattern detection                 | `src/core/workflows/analyzer.ts`  |

### Key Interfaces

| Interface                  | Purpose                  | Depends On                                         |
|----------------------------|--------------------------|----------------------------------------------------|
| ProceduralGraphInterface   | Static transition rules  | —                                                  |
| PredictiveGraphInterface   | Dynamic weight learning  | ProceduralGraphInterface                           |
| WorkflowEngineInterface    | Recording and prediction | ProceduralGraphInterface, PredictiveGraphInterface |
| WorkflowBuilderInterface   | Graph construction       | —                                                  |
| WorkflowValidatorInterface | Static validation        | ProceduralGraphInterface                           |
| WorkflowAnalyzerInterface  | Pattern analysis         | ProceduralGraphInterface, PredictiveGraphInterface |

---

## Phases

| # | Phase            | Status      | Description                          | File                            |
|---|------------------|-------------|--------------------------------------|---------------------------------|
| 1 | Foundation       | ✅ Complete | Types, project structure, helpers    | `phases/01-foundation.md`       |
| 2 | Core Graphs      | ✅ Complete | ProceduralGraph, PredictiveGraph     | `phases/02-core-graphs.md`      |
| 3 | Workflow Systems | ✅ Complete | Engine, Builder, Validator, Analyzer | `phases/03-workflow-systems.md` |
| 4 | Polish           | 🔄 Active   | Docs, showcase, edge cases           | `phases/04-polish.md`           |

**Status Legend:**
- ✅ Complete
- 🔄 Active
- ⏳ Pending

---

## Type Inventory

> **Purpose:** Track all public types. Update when adding interfaces to `src/types.ts`.

| Type Name                    | Category   | Status | Phase |
|------------------------------|------------|--------|-------|
| `Unsubscribe`                | Utility    | ✅ Done | 1     |
| `Destroyable`                | Utility    | ✅ Done | 1     |
| `Actor`                      | Data       | ✅ Done | 1     |
| `Node`                       | Data       | ✅ Done | 1     |
| `Transition`                 | Data       | ✅ Done | 1     |
| `Procedure`                  | Data       | ✅ Done | 1     |
| `TransitionContext`          | Data       | ✅ Done | 1     |
| `PredictionContext`          | Data       | ✅ Done | 1     |
| `SessionInfo`                | Data       | ✅ Done | 1     |
| `DecayConfig`                | Data       | ✅ Done | 1     |
| `ValidationResult`           | Data       | ✅ Done | 1     |
| `LoopInfo`                   | Data       | ✅ Done | 1     |
| `BottleneckInfo`             | Data       | ✅ Done | 1     |
| `AutomationOpportunity`      | Data       | ✅ Done | 1     |
| `ProceduralGraphOptions`     | Options    | ✅ Done | 1     |
| `PredictiveGraphOptions`     | Options    | ✅ Done | 1     |
| `WorkflowEngineOptions`      | Options    | ✅ Done | 1     |
| `WorkflowBuilderOptions`     | Options    | ✅ Done | 1     |
| `WorkflowValidatorOptions`   | Options    | ✅ Done | 1     |
| `WorkflowAnalyzerOptions`    | Options    | ✅ Done | 1     |
| `ProceduralGraphInterface`   | Behavioral | ✅ Done | 2     |
| `PredictiveGraphInterface`   | Behavioral | ✅ Done | 2     |
| `WorkflowEngineInterface`    | Behavioral | ✅ Done | 3     |
| `WorkflowBuilderInterface`   | Behavioral | ✅ Done | 3     |
| `WorkflowValidatorInterface` | Behavioral | ✅ Done | 3     |
| `WorkflowAnalyzerInterface`  | Behavioral | ✅ Done | 3     |
| `ActionLoopErrorCode`        | Data       | ✅ Done | 1     |
| `ActionLoopErrorData`        | Data       | ✅ Done | 1     |

**Categories:**
- **Behavioral** — Interfaces with methods (use `Interface` suffix)
- **Options** — Configuration objects (use `Options` suffix)
- **Data** — Pure data structures (no suffix)
- **Subscriptions** — Event subscription interfaces (use `Subscriptions` suffix)
- **Utility** — Shared utility types

---

## Decisions Log

> **Instructions:** Log architectural decisions here. Never remove entries.

### 2026-01-19: Two-Graph Architecture
**Decision:** Separate static rules (ProceduralGraph) from dynamic weights (PredictiveGraph)
**Rationale:** Ensures predictions never violate business rules; allows weight persistence without affecting compliance
**Alternatives rejected:** Single graph with weight annotations (risks rule violations during decay)
**Impacts:** Phases 2-3, all factory functions

### 2026-01-19: Actor-Based Weight Separation
**Decision:** Maintain separate weight tracks per actor type (user, system, automation)
**Rationale:** Enables role-specific analytics and prevents cross-contamination of patterns
**Alternatives rejected:** Single weight track with actor metadata (loses granularity)
**Impacts:** PredictiveGraph implementation, prediction algorithms

### 2026-01-19: Factory Function Pattern
**Decision:** All systems created via `create*` factory functions, not constructors
**Rationale:** Consistent with ecosystem patterns; enables future internal refactoring
**Alternatives rejected:** Direct class instantiation (exposes internal structure)
**Impacts:** All public APIs

---

## Open Questions

> **Instructions:** Add questions during work. Resolve with decisions or remove when answered.

- [ ] Should guard conditions support async evaluation?
- [ ] Should we add a `resetSession()` method or just use `endSession()` + `startSession()`?
- [ ] What should the default `maxSessionDuration` be?

---

## Session Log

> **Purpose:** Track work across multiple sessions. Append new entries at the top.

### 2026-01-19 Session 4

**Started:** Code structure refactoring per instructions
**Completed:**
- Extracted types to centralized files per copilot-instructions.md
  - Created `src/constants.ts` with all magic numbers
  - Created `src/factories.ts` for factory function exports
  - Moved internal types (`WeightEntry`, `SessionEntry`) to `types.ts`
- Updated all implementation files to import from centralized files
- Updated `src/index.ts` with proper barrel exports
- Verified all quality gates pass

**Quality Gates:**
- `npm run check` ✅ passes
- `npm run format` ✅ passes
- `npm run build` ✅ passes
- `npm test` ✅ 159 tests pass

**Blockers Discovered:**
- None

**Ended:** Code structure compliant with instructions, ready for Phase 4

### 2026-01-19 Session 3

**Started:** Phase 3 - Workflow Systems
**Completed:**
- Phase 3: Workflow Systems (all deliverables)
  - Verified WorkflowEngine implementation (26 tests)
  - Verified WorkflowBuilder implementation (28 tests)
  - Verified WorkflowValidator implementation (16 tests)
  - Verified WorkflowAnalyzer implementation (15 tests)
  - All factory functions verified
  - All barrel exports verified

**Quality Gates:**
- `npm run check` ✅ passes
- `npm run format` ✅ passes
- `npm run build` ✅ passes
- `npm test` ✅ 159 tests pass

**Blockers Discovered:**
- None

**Ended:** Phase 3 complete, ready for Phase 4

### 2026-01-19 Session 2

**Started:** Phase 1 & 2 implementation
**Completed:**
- Phase 1: Foundation (all deliverables)
  - Fixed all TypeScript compilation errors
  - Fixed exactOptionalPropertyTypes issues
  - Added type guards (isActor, isNode, isTransition)
  - Created 26 unit tests for helpers
- Phase 2: Core Graphs (all deliverables)
  - Fixed ProceduralGraph implementation
  - Fixed PredictiveGraph implementation
  - Fixed factory function references
  - Created 48 unit tests for graphs

**Quality Gates:**
- `npm run check` ✅ passes
- `npm run format` ✅ passes
- `npm run build` ✅ passes
- `npm test` ✅ 74 tests pass

**Blockers Discovered:**
- None

**Ended:** Phase 2 complete, ready for Phase 3

### 2026-01-19 Session 1

**Started:** Phase 1, Deliverable 1.1
**Completed:**
- Initial project structure created
- Type definitions in src/types.ts (comprehensive)
- Error classes in src/errors.ts
- Helper functions in src/helpers.ts
- Stub implementations for all core components

**Blockers Discovered:**
- None

**Ended:** Phase 1, Deliverable 1.1 — types complete, implementations need refinement

---

## References

- [PPALS Whitepaper](./guides/whitepaper.md)
- [API Guide](./guides/actionloop.md)
- [Ecosystem Concept](./guides/concept.md)
- [Integration Guide](./guides/integration.md)
