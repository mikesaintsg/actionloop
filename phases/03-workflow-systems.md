# Phase 3: Workflow Systems

> **Status:** 🔄 In Progress
> **Started:** 2026-01-19
> **Target:** —
> **Depends on:** Phase 2 (Core Graphs) ✅

---

## Session Context

> **Purpose:** Quick orientation for models starting mid-project.

```
Current Deliverable: 3.1 WorkflowEngine
Checklist Progress: 0/24 items complete
Last Completed: Phase 2 Core Graphs
Next Task: Verify existing WorkflowEngine implementation
Blockers: None
```

---

## Objective

Implement the four workflow systems: WorkflowEngine (recording and prediction), WorkflowBuilder (graph construction), WorkflowValidator (static analysis), and WorkflowAnalyzer (pattern detection). By end of phase, all systems should be fully functional with complete APIs.

---

## Progress Summary

| Metric          | Value     |
|-----------------|-----------|
| Deliverables    | 0/6       |
| Checklist Items | 0/24      |
| Tests Passing   | —         |
| Quality Gates   | ⏳ Pending |

---

## Deliverables

| #   | Deliverable       | Status    | Assignee | Notes                           |
|-----|-------------------|-----------|----------|---------------------------------|
| 3.1 | WorkflowEngine    | ⏳ Pending | —        | Recording, prediction, sessions |
| 3.2 | WorkflowBuilder   | ⏳ Pending | —        | Graph construction, JSON/YAML   |
| 3.3 | WorkflowValidator | ⏳ Pending | —        | Static analysis, guards         |
| 3.4 | WorkflowAnalyzer  | ⏳ Pending | —        | Loops, bottlenecks, automation  |
| 3.5 | Factory functions | ⏳ Pending | —        | All create* functions           |
| 3.6 | Unit tests        | ⏳ Pending | —        | tests/core/workflows/           |

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
- [ ] Create WorkflowEngine class with private fields
- [ ] Implement constructor with procedural, predictive, and options
- [ ] Implement recordTransition with validation
- [ ] Implement recordTransitions for batch operations
- [ ] Implement predictNext with weight merging
- [ ] Implement predictNextDetailed with confidence scores
- [ ] Implement isValidTransition
- [ ] Implement session management (start, get, end, resume)
- [ ] Implement getSessionChain for history
- [ ] Wire up all subscription methods
- [ ] Implement destroy() cleanup

**WorkflowBuilder (3.2):**
- [ ] Create WorkflowBuilder class with private fields
- [ ] Implement node operations (add, remove, update)
- [ ] Implement transition operations (add, remove, update)
- [ ] Implement procedure operations (add, remove, update)
- [ ] Implement validate() with BuilderValidationResult
- [ ] Implement build() to create ProceduralGraph
- [ ] Implement toJSON() and fromJSON()
- [ ] Implement toYAML() and fromYAML()
- [ ] Implement clear() method
- [ ] Wire up subscription methods

**WorkflowValidator (3.3):**
- [ ] Create WorkflowValidator class with private fields
- [ ] Implement runStaticChecks()
- [ ] Implement findDanglingNodes()
- [ ] Implement findUnreachableNodes()
- [ ] Implement findMissingBoundaryNodes()
- [ ] Implement validateGuards()
- [ ] Implement validateProcedures()
- [ ] Implement checkConnectivity()
- [ ] Implement checkCycles()
- [ ] Implement isValid(), getErrorCount(), getWarningCount()

**WorkflowAnalyzer (3.4):**
- [ ] Create WorkflowAnalyzer class with private fields
- [ ] Implement findHotLoops() with threshold detection
- [ ] Implement findInfiniteLoops() with walk limiting
- [ ] Implement findUnproductiveLoops()
- [ ] Implement findStronglyConnectedComponents() (Tarjan's algorithm)
- [ ] Implement findBottlenecks() with traffic analysis
- [ ] Implement findAutomationOpportunities()
- [ ] Implement getSummary()
- [ ] Implement analyzeByContext() for grouped analysis
- [ ] Wire up subscription methods (onAnalysisComplete, onPatternDetected)

**Factories (3.5):**
- [ ] Add createWorkflowEngine to src/factories.ts
- [ ] Add createWorkflowBuilder to src/factories.ts
- [ ] Add createWorkflowValidator to src/factories.ts
- [ ] Add createWorkflowAnalyzer to src/factories.ts

**Exports:**
- [ ] Update barrel export in `src/index.ts`

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

| Gate             | Last Run | Result |
|------------------|----------|--------|
| `npm run check`  | —        | ⏳      |
| `npm run format` | —        | ⏳      |
| `npm run build`  | —        | ⏳      |
| `npm test`       | —        | ⏳      |

---

## Test Coverage Requirements

| Component    | Min Coverage | Current |
|--------------|--------------|---------|
| engine.ts    | 80%          | —       |
| builder.ts   | 80%          | —       |
| validator.ts | 80%          | —       |
| analyzer.ts  | 80%          | —       |

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

- [ ] All deliverables marked ✅ Done
- [ ] `npm run check` passes
- [ ] `npm run format` passes
- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] No `it.todo()` remaining in phase scope
- [ ] All files in "Files Created/Modified" reviewed
- [ ] PLAN.md updated:
  - [ ] Phase 3 status → ✅ Complete
  - [ ] Current Session State updated
  - [ ] Session Log entry added
