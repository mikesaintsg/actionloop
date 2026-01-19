# Phase 3: Workflow Systems

> **Status:** ✅ Complete
> **Started:** 2026-01-19
> **Completed:** 2026-01-19
> **Depends on:** Phase 2 (Core Graphs) ✅

---

## Session Context

> **Purpose:** Quick orientation for models starting mid-project.

```
Current Deliverable: 3.6 Unit tests
Checklist Progress: 24/24 items complete
Last Completed: All workflow system tests
Next Task: Update documentation
Blockers: None
```

---

## Objective

Implement the four workflow systems: WorkflowEngine (recording and prediction), WorkflowBuilder (graph construction), WorkflowValidator (static analysis), and WorkflowAnalyzer (pattern detection). By end of phase, all systems should be fully functional with complete APIs.

---

## Progress Summary

| Metric          | Value       |
|-----------------|-------------|
| Deliverables    | 6/6         |
| Checklist Items | 24/24       |
| Tests Passing   | 85/85       |
| Quality Gates   | ✅ All Pass |

---

## Deliverables

| #   | Deliverable       | Status  | Assignee | Notes                           |
|-----|-------------------|---------|----------|---------------------------------|
| 3.1 | WorkflowEngine    | ✅ Done | —        | Recording, prediction, sessions |
| 3.2 | WorkflowBuilder   | ✅ Done | —        | Graph construction, JSON/YAML   |
| 3.3 | WorkflowValidator | ✅ Done | —        | Static analysis, guards         |
| 3.4 | WorkflowAnalyzer  | ✅ Done | —        | Loops, bottlenecks, automation  |
| 3.5 | Factory functions | ✅ Done | —        | All create* functions           |
| 3.6 | Unit tests        | ✅ Done | —        | tests/core/workflows/           |

**Status Legend:**
- ✅ Done
- 🔄 Active
- ⏳ Pending
- 🚫 Blocked

---

## Type Dependencies

> **Purpose:** Track which types must exist before implementation.

| Deliverable | Required Types                                              | Status |
|-------------|-------------------------------------------------------------|--------|
| 3.1         | WorkflowEngineInterface, SessionInfo, TransitionContext     | ✅ Done |
| 3.2         | WorkflowBuilderInterface, NodeInput, TransitionInput        | ✅ Done |
| 3.3         | WorkflowValidatorInterface, ValidationResult, BoundaryCheck | ✅ Done |
| 3.4         | WorkflowAnalyzerInterface, LoopInfo, BottleneckInfo         | ✅ Done |

---

## Current Focus: 3.1 WorkflowEngine

### Requirements

1. Bridge ProceduralGraph and PredictiveGraph
2. Record transitions with validation
3. Predict next actions with merged weights
4. Manage user sessions with cross-session continuity
5. Support batch operations
6. Emit events via subscription pattern

### Interface Contract

```typescript
// From src/types.ts — DO NOT MODIFY without updating this doc
export interface WorkflowEngineInterface
	extends WorkflowEngineSubscriptions, Destroyable {
	// Core
	recordTransition(from: string, to: string, context: TransitionContext): void
	recordTransitions(transitions: readonly BatchTransition[]): void
	predictNext(node: string, context: PredictionContext): readonly string[]
	predictNextDetailed(node: string, context: PredictionContext): DetailedPrediction
	isValidTransition(from: string, to: string): boolean
	getValidTransitions(from: string): readonly Transition[]
	
	// Sessions
	startSession(actor: Actor, sessionId?: string): SessionInfo
	getSession(sessionId: string): SessionInfo | undefined
	getActiveSession(actor: Actor): SessionInfo | undefined
	hasSession(sessionId: string): boolean
	endSession(sessionId: string, reason: SessionEndReason): void
	resumeSession(sessionId: string, options: SessionResumeOptions): void
	getSessionChain(actor: Actor, options?: ChainOptions): ActionChain
	truncateChain(sessionId: string, strategy?: TruncationStrategy): void
	
	// Graph Access
	getProceduralGraph(): ProceduralGraphInterface
	getPredictiveGraph(): PredictiveGraphInterface
}
```

### Implementation Order

1. `src/types.ts` — ✅ Interface defined
2. `src/core/workflows/engine.ts` — Implementation
3. `src/core/workflows/builder.ts` — Implementation
4. `src/core/workflows/validator.ts` — Implementation
5. `src/core/workflows/analyzer.ts` — Implementation
6. `src/factories.ts` — Add factory functions
7. `src/index.ts` — Update barrel exports
8. `tests/core/workflows/*.test.ts` — Unit tests

### Implementation Checklist

**WorkflowEngine (3.1):**
- [x] Create WorkflowEngine class with private fields
- [x] Implement constructor with procedural, predictive, and options
- [x] Implement recordTransition with validation
- [x] Implement recordTransitions for batch operations
- [x] Implement predictNext with weight merging
- [x] Implement predictNextDetailed with confidence scores
- [x] Implement isValidTransition
- [x] Implement session management (start, get, end, resume)
- [x] Implement getSessionChain for history
- [x] Wire up all subscription methods
- [x] Implement destroy() cleanup

**WorkflowBuilder (3.2):**
- [x] Create WorkflowBuilder class with private fields
- [x] Implement node operations (add, remove, update)
- [x] Implement transition operations (add, remove, update)
- [x] Implement procedure operations (add, remove, update)
- [x] Implement validate() with BuilderValidationResult
- [x] Implement build() to create ProceduralGraph
- [x] Implement toJSON() and fromJSON()
- [x] Implement toYAML() and fromYAML()
- [x] Implement clear() method
- [x] Wire up subscription methods

**WorkflowValidator (3.3):**
- [x] Create WorkflowValidator class with private fields
- [x] Implement runStaticChecks()
- [x] Implement findDanglingNodes()
- [x] Implement findUnreachableNodes()
- [x] Implement findMissingBoundaryNodes()
- [x] Implement validateGuards()
- [x] Implement validateProcedures()
- [x] Implement checkConnectivity()
- [x] Implement checkCycles()
- [x] Implement isValid(), getErrorCount(), getWarningCount()

**WorkflowAnalyzer (3.4):**
- [x] Create WorkflowAnalyzer class with private fields
- [x] Implement findHotLoops() with threshold detection
- [x] Implement findInfiniteLoops() with walk limiting
- [x] Implement findUnproductiveLoops()
- [x] Implement findStronglyConnectedComponents() (Tarjan's algorithm)
- [x] Implement findBottlenecks() with traffic analysis
- [x] Implement findAutomationOpportunities()
- [x] Implement getSummary()
- [x] Implement analyzeByContext() for grouped analysis
- [x] Wire up subscription methods (onAnalysisComplete, onPatternDetected)

**Factories (3.5):**
- [x] Add createWorkflowEngine to src/core/workflows/engine.ts
- [x] Add createWorkflowBuilder to src/core/workflows/builder.ts
- [x] Add createWorkflowValidator to src/core/workflows/validator.ts
- [x] Add createWorkflowAnalyzer to src/core/workflows/analyzer.ts

**Exports:**
- [x] Update barrel export in `src/index.ts`

### Acceptance Criteria

```typescript
describe('WorkflowEngine', () => {
	it('records transitions and updates weights', () => {
		const engine = createWorkflowEngine(procedural, predictive)
		const session = engine.startSession('user')
		
		engine.recordTransition('a', 'b', {
			actor: 'user',
			sessionId: session.id,
			path: '/test',
		})
		
		const weight = predictive.getWeight('a', 'b', 'user')
		expect(weight).toBeGreaterThan(0)
	})

	it('predicts next actions based on weights', () => {
		const engine = createWorkflowEngine(procedural, predictive)
		
		// Record some transitions to build up weights
		for (let i = 0; i < 5; i++) {
			engine.recordTransition('a', 'b', context)
		}
		
		const predictions = engine.predictNext('a', context)
		expect(predictions[0]).toBe('b')
	})

	it('validates transitions before recording', () => {
		const engine = createWorkflowEngine(procedural, predictive, {
			validateTransitions: true,
		})
		
		expect(() => {
			engine.recordTransition('a', 'invalid', context)
		}).toThrow()
	})
})

describe('WorkflowBuilder', () => {
	it('builds valid procedural graph', () => {
		const builder = createWorkflowBuilder()
		builder
			.addNode({ id: 'a' })
			.addNode({ id: 'b' })
			.addTransition({ from: 'a', to: 'b', weight: 1, actor: 'user' })
		
		const graph = builder.build()
		expect(graph.hasTransition('a', 'b')).toBe(true)
	})

	it('exports and imports JSON', () => {
		const builder = createWorkflowBuilder()
		builder.addTransition({ from: 'a', to: 'b', weight: 1, actor: 'user' })
		
		const json = builder.toJSON()
		const builder2 = createWorkflowBuilder().fromJSON(json)
		
		expect(builder2.hasTransition('a', 'b')).toBe(true)
	})
})
```

### Blocked By

- Phase 2 (Core Graphs) — ✅ Complete

### Blocks

- Phase 4 (Polish) — needs all systems complete

---

## Files Created/Modified

> **Purpose:** Track all file changes in this phase for review.

| File                                     | Action   | Deliverable |
|------------------------------------------|----------|-------------|
| `src/core/workflows/engine.ts`           | Modified | 3.1         |
| `src/core/workflows/builder.ts`          | Modified | 3.2         |
| `src/core/workflows/validator.ts`        | Modified | 3.3         |
| `src/core/workflows/analyzer.ts`         | Modified | 3.4         |
| `src/factories.ts`                       | Modified | 3.5         |
| `src/index.ts`                           | Modified | 3.5         |
| `tests/core/workflows/engine.test.ts`    | Created  | 3.6         |
| `tests/core/workflows/builder.test.ts`   | Created  | 3.6         |
| `tests/core/workflows/validator.test.ts` | Created  | 3.6         |
| `tests/core/workflows/analyzer.test.ts`  | Created  | 3.6         |

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

| Component    | Min Coverage | Current |
|--------------|--------------|---------|
| engine.ts    | 80%          | ✅ 100% |
| builder.ts   | 80%          | ✅ 100% |
| validator.ts | 80%          | ✅ 100% |
| analyzer.ts  | 80%          | ✅ 100% |

---

## Notes

> **Instructions:** Add observations, gotchas, and decisions during implementation.

- WorkflowEngine is the main entry point for most use cases
- Sessions should persist across recordTransition calls
- Prediction should merge ProceduralGraph base weights with PredictiveGraph dynamic weights
- WorkflowAnalyzer uses graph algorithms (Tarjan's SCC, DFS edge classification)
- Remember: Use `#` private fields, not `private` keyword

---

## Rollback Notes

> **Purpose:** If something goes wrong, how to recover.

**Safe State:** End of Phase 2
**Files to Revert:** src/core/workflows/*.ts, src/factories.ts
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
  - [x] Phase 3 status → ✅ Complete
  - [x] Current Session State updated
  - [x] Session Log entry added
