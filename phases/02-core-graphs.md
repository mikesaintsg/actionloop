# Phase 2: Core Graphs

> **Status:** ✅ Complete
> **Started:** 2026-01-19
> **Completed:** 2026-01-19
> **Depends on:** Phase 1 (Foundation) ✅

---

## Session Context

> **Purpose:** Quick orientation for models starting mid-project.

```
Current Deliverable: Complete
Checklist Progress: 16/16 items complete
Last Completed: Unit tests for graphs
Next Task: Phase 3 - Workflow Systems
Blockers: None
```

---

## Objective

Implement the two core graph systems: ProceduralGraph (static transition rules) and PredictiveGraph (dynamic weight learning). By end of phase, both graphs should be fully functional with all accessor, mutator, and export methods implemented.

---

## Progress Summary

| Metric          | Value       |
|-----------------|-------------|
| Deliverables    | 4/4         |
| Checklist Items | 16/16       |
| Tests Passing   | 48/48       |
| Quality Gates   | ✅ All Pass |

---

## Deliverables

| #   | Deliverable             | Status  | Assignee | Notes                                        |
|-----|-------------------------|---------|----------|----------------------------------------------|
| 2.1 | ProceduralGraph         | ✅ Done | —        | Static graph implementation                  |
| 2.2 | PredictiveGraph         | ✅ Done | —        | Dynamic weight overlay                       |
| 2.3 | Graph factory functions | ✅ Done | —        | createProceduralGraph, createPredictiveGraph |
| 2.4 | Unit tests for graphs   | ✅ Done | —        | 48 tests passing                             |

**Status Legend:**
- ✅ Done
- 🔄 Active
- ⏳ Pending
- 🚫 Blocked

---

## Type Dependencies

> **Purpose:** Track which types must exist before implementation.

| Deliverable | Required Types                                            | Status |
|-------------|-----------------------------------------------------------|--------|
| 2.1         | ProceduralGraphInterface, Node, Transition, Procedure     | ✅ Done |
| 2.2         | PredictiveGraphInterface, WeightedTransition, DecayConfig | ✅ Done |
| 2.3         | ProceduralGraphOptions, PredictiveGraphOptions            | ✅ Done |

---

## Current Focus: 2.1 ProceduralGraph

### Requirements

1. Store nodes, transitions, and procedures
2. Provide accessor methods for graph queries
3. Validate graph structure on creation (optional)
4. Support export for serialization
5. Implement subscription pattern for validation events

### Interface Contract

```typescript
// From src/types.ts — DO NOT MODIFY without updating this doc
export interface ProceduralGraphInterface
	extends ProceduralGraphSubscriptions, Destroyable {
	// Accessors
	getNode(id: string): Node | undefined
	getNodes(): readonly Node[]
	hasNode(id: string): boolean
	getTransitions(from: string): readonly Transition[]
	getTransitionsTo(to: string): readonly Transition[]
	hasTransition(from: string, to: string): boolean
	getTransition(from: string, to: string): Transition | undefined
	getProcedure(id: string): Procedure | undefined
	getProcedures(): readonly Procedure[]
	getStats(): GraphStats
	isStartNode(id: string): boolean
	isEndNode(id: string): boolean
	getStartNodes(): readonly string[]
	getEndNodes(): readonly string[]
	
	// Validation
	validate(): readonly ValidationResult[]
	isValid(): boolean
	
	// Export
	export(): ExportedProceduralGraph
}
```

### Implementation Order

1. `src/types.ts` — ✅ Interface defined
2. `src/core/graphs/procedural.ts` — Implementation
3. `src/helpers.ts` — Add any needed helpers
4. `src/factories.ts` — Add createProceduralGraph
5. `src/index.ts` — Update barrel exports
6. `tests/core/graphs/procedural.test.ts` — Unit tests

### Implementation Checklist

**ProceduralGraph (2.1):**
- [x] Create ProceduralGraph class with private fields
- [x] Implement constructor with options parsing
- [x] Implement node accessor methods (getNode, getNodes, hasNode)
- [x] Implement transition accessor methods (getTransitions, hasTransition)
- [x] Implement procedure accessor methods (getProcedure, getProcedures)
- [x] Implement boundary detection (isStartNode, isEndNode, getStartNodes, getEndNodes)
- [x] Implement getStats()
- [x] Implement validate() with validation rules
- [x] Implement export() serialization
- [x] Implement destroy() cleanup
- [x] Wire up subscription methods (onValidation)

**PredictiveGraph (2.2):**
- [x] Create PredictiveGraph class with private fields
- [x] Implement constructor with procedural graph and options
- [x] Implement weight accessor methods (getWeight, getWeights, hasWeight)
- [x] Implement weight mutator methods (updateWeight, setWeight)
- [x] Implement decay algorithm (applyDecay)
- [x] Implement clear methods (clear, clearActor)
- [x] Implement preload() for historical data
- [x] Implement export/import for persistence
- [x] Implement getModelId(), getDecayConfig(), getStats()
- [x] Implement destroy() cleanup
- [x] Wire up subscription methods (onWeightUpdate, onDecay)

**Factories (2.3):**
- [x] Add createProceduralGraph to src/core/graphs/procedural.ts
- [x] Add createPredictiveGraph to src/core/graphs/predictive.ts

**Exports:**
- [x] Update barrel export in `src/index.ts`

### Acceptance Criteria

```typescript
describe('ProceduralGraph', () => {
	it('creates graph from transitions', () => {
		const graph = createProceduralGraph({
			transitions: [
				{ from: 'a', to: 'b', weight: 1, actor: 'user' },
			],
		})
		expect(graph.hasNode('a')).toBe(true)
		expect(graph.hasNode('b')).toBe(true)
		expect(graph.hasTransition('a', 'b')).toBe(true)
	})

	it('identifies start and end nodes', () => {
		const graph = createProceduralGraph({
			transitions: [
				{ from: 'start', to: 'middle', weight: 1, actor: 'user' },
				{ from: 'middle', to: 'end', weight: 1, actor: 'user' },
			],
		})
		expect(graph.isStartNode('start')).toBe(true)
		expect(graph.isEndNode('end')).toBe(true)
	})
})

describe('PredictiveGraph', () => {
	it('updates weights on transitions', () => {
		const procedural = createProceduralGraph({ transitions })
		const predictive = createPredictiveGraph(procedural)
		
		predictive.updateWeight('a', 'b', 'user')
		expect(predictive.getWeight('a', 'b', 'user')).toBeGreaterThan(0)
	})

	it('applies decay to weights', () => {
		const predictive = createPredictiveGraph(procedural, {
			decayAlgorithm: 'ewma',
			decayFactor: 0.5,
		})
		predictive.setWeight('a', 'b', 'user', 1.0)
		predictive.applyDecay()
		expect(predictive.getWeight('a', 'b', 'user')).toBeLessThan(1.0)
	})
})
```

### Blocked By

- Phase 1 (Foundation) — helper functions, error handling

### Blocks

- 3.1 (WorkflowEngine) — needs both graphs
- 3.2 (WorkflowValidator) — needs ProceduralGraph
- 3.3 (WorkflowAnalyzer) — needs both graphs

---

## Files Created/Modified

> **Purpose:** Track all file changes in this phase for review.

| File                                   | Action   | Deliverable |
|----------------------------------------|----------|-------------|
| `src/core/graphs/procedural.ts`        | Modified | 2.1         |
| `src/core/graphs/predictive.ts`        | Modified | 2.2         |
| `src/factories.ts`                     | Created  | 2.3         |
| `src/index.ts`                         | Modified | 2.3         |
| `tests/core/graphs/procedural.test.ts` | Created  | 2.4         |
| `tests/core/graphs/predictive.test.ts` | Created  | 2.4         |

---

## Quality Gates (Phase-Specific)

```powershell
npm run check    # Typecheck (no emit)
npm run format   # Lint and autofix
npm run build    # Build library
npm test         # Unit tests
```

**Current Status:**

| Gate             | Last Run   | Result  |
|------------------|------------|---------|
| `npm run check`  | 2026-01-19 | ✅ Pass |
| `npm run format` | 2026-01-19 | ✅ Pass |
| `npm run build`  | 2026-01-19 | ✅ Pass |
| `npm test`       | 2026-01-19 | ✅ Pass |

---

## Test Coverage Requirements

| Component     | Min Coverage | Current |
|---------------|--------------|---------|
| procedural.ts | 80%          | ✅ 100% |
| predictive.ts | 80%          | ✅ 100% |

---

## Notes

> **Instructions:** Add observations, gotchas, and decisions during implementation.

- ProceduralGraph should auto-create nodes from transitions if not explicitly provided
- PredictiveGraph only allows weights on transitions defined in ProceduralGraph
- Use Maps for O(1) lookups on nodes and transitions
- Generate unique model ID for PredictiveGraph on creation
- Remember: Use `#` private fields, not `private` keyword

---

## Rollback Notes

> **Purpose:** If something goes wrong, how to recover.

**Safe State:** End of Phase 1
**Files to Revert:** src/core/graphs/*.ts, src/factories.ts
**Dependencies:** None

---

## Phase Completion Criteria

All of the following must be true:

- [x] All deliverables marked ✅ Done
- [x] `npm run check` passes
- [x] `npm run format` passes
- [x] `npm run build` passes
- [x] `npm test` passes
- [x] No `it.todo()` remaining in phase scope
- [x] All files in "Files Created/Modified" reviewed
- [x] PLAN.md updated:
  - [x] Phase 2 status → ✅ Complete
  - [x] Current Session State updated
  - [x] Session Log entry added
