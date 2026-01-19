# Phase 1: Foundation

> **Status:** 🔄 In Progress
> **Started:** 2026-01-19
> **Target:** 2026-01-20
> **Depends on:** None

---

## Session Context

> **Purpose:** Quick orientation for models starting mid-project.

```
Current Deliverable: 1.2 Helper Functions
Checklist Progress: 8/12 items complete
Last Completed: Type definitions in src/types.ts
Next Task: Refine helper functions and type guards
Blockers: None
```

---

## Objective

Establish project foundation with complete type definitions, helper functions, error handling, and project structure. By end of phase, the library should have all public types defined as the source of truth for implementation.

---

## Progress Summary

| Metric          | Value     |
|-----------------|-----------|
| Deliverables    | 2/5       |
| Checklist Items | 8/12      |
| Tests Passing   | —         |
| Quality Gates   | ⏳ Pending |

---

## Deliverables

| #   | Deliverable            | Status    | Assignee | Notes                     |
|-----|------------------------|-----------|----------|---------------------------|
| 1.1 | Type Definitions       | ✅ Done    | —        | All types in src/types.ts |
| 1.2 | Helper Functions       | 🔄 Active | —        | Type guards, utilities    |
| 1.3 | Error Handling         | ✅ Done    | —        | ActionLoopError class     |
| 1.4 | Project Configuration  | ✅ Done    | —        | tsconfig, eslint, vite    |
| 1.5 | Unit tests for helpers | ⏳ Pending | —        | tests/helpers.test.ts     |

**Status Legend:**
- ✅ Done
- 🔄 Active
- ⏳ Pending
- 🚫 Blocked

---

## Type Dependencies

> **Purpose:** Track which types must exist before implementation.

| Deliverable | Required Types                           | Status |
|-------------|------------------------------------------|--------|
| 1.1         | All core types                           | ✅ Done |
| 1.2         | Unsubscribe, Actor, Node, Transition     | ✅ Done |
| 1.3         | ActionLoopErrorCode, ActionLoopErrorData | ✅ Done |

---

## Current Focus: 1.2 Helper Functions

### Requirements

1. Type guard functions for all core types
2. Utility functions for common operations
3. Transition key generation/parsing
4. Deep freeze utility for immutability

### Interface Contract

```typescript
// From src/helpers.ts
export function isActor(value: unknown): value is Actor
export function isNode(value: unknown): value is Node
export function isTransition(value: unknown): value is Transition
export function createTransitionKey(from: string, to: string): string
export function parseTransitionKey(key: string): readonly [string, string]
export function deepFreeze<T extends object>(obj: T): Readonly<T>
export function generateId(): string
```

### Implementation Order

1. `src/types.ts` — ✅ Complete
2. `src/helpers.ts` — 🔄 Refine type guards
3. `src/errors.ts` — ✅ Complete
4. `src/index.ts` — Update exports
5. `tests/helpers.test.ts` — Unit tests

### Implementation Checklist

**Types:**
- [x] Define all core data types (Node, Transition, Procedure)
- [x] Define all context types (TransitionContext, PredictionContext)
- [x] Define all session types (SessionInfo, SessionEndReason)
- [x] Define all options interfaces
- [x] Define all behavioral interfaces
- [x] Define all subscription interfaces
- [x] Define error types (ActionLoopErrorCode, ActionLoopErrorData)

**Helpers:**
- [x] Implement `isActor` type guard
- [ ] Implement `isNode` type guard
- [ ] Implement `isTransition` type guard
- [x] Implement `createTransitionKey`
- [x] Implement `parseTransitionKey`
- [x] Implement `deepFreeze`
- [x] Implement `generateId`

**Errors:**
- [x] Create ActionLoopError class
- [x] Implement `isActionLoopError` type guard
- [x] Implement `createActionLoopError` factory

**Exports:**
- [ ] Update barrel export in `src/index.ts`

**Tests:**
- [ ] Create `tests/helpers.test.ts`
- [ ] Test all type guards
- [ ] Test transition key functions
- [ ] Test deepFreeze utility

### Acceptance Criteria

```typescript
describe('helpers', () => {
	it('isActor validates actor types', () => {
		expect(isActor('user')).toBe(true)
		expect(isActor('system')).toBe(true)
		expect(isActor('automation')).toBe(true)
		expect(isActor('invalid')).toBe(false)
	})

	it('createTransitionKey generates consistent keys', () => {
		expect(createTransitionKey('a', 'b')).toBe('a->b')
	})

	it('parseTransitionKey reverses createTransitionKey', () => {
		const [from, to] = parseTransitionKey('a->b')
		expect(from).toBe('a')
		expect(to).toBe('b')
	})
})
```

### Blocked By

- Nothing currently

### Blocks

- 2.1 (ProceduralGraph) — needs helper functions
- 2.2 (PredictiveGraph) — needs helper functions

---

## Files Created/Modified

> **Purpose:** Track all file changes in this phase for review.

| File               | Action   | Deliverable |
|--------------------|----------|-------------|
| `src/types.ts`     | Created  | 1.1         |
| `src/helpers.ts`   | Created  | 1.2         |
| `src/errors.ts`    | Created  | 1.3         |
| `src/index.ts`     | Created  | 1.4         |
| `tsconfig.json`    | Created  | 1.4         |
| `eslint.config.ts` | Created  | 1.4         |
| `vite.config.ts`   | Created  | 1.4         |
| `vitest.config.ts` | Created  | 1.4         |
| `package.json`     | Modified | 1.4         |

---

## Quality Gates (Phase-Specific)

> **Instructions:** Run after EACH deliverable, not just at phase end.

```powershell
npm run check    # Typecheck (no emit)
npm run format   # Lint and autofix
npm run build    # Build library
npm test         # Unit tests
```

**Current Status:**

| Gate             | Last Run   | Result      |
|------------------|------------|-------------|
| `npm run check`  | 2026-01-19 | ❌ 39 errors |
| `npm run format` | —          | ⏳           |
| `npm run build`  | —          | ⏳           |
| `npm test`       | —          | ⏳           |

---

## Test Coverage Requirements

| Component  | Min Coverage | Current |
|------------|--------------|---------|
| helpers.ts | 80%          | —       |
| errors.ts  | 80%          | —       |

---

## Notes

> **Instructions:** Add observations, gotchas, and decisions during implementation.

- Type definitions are comprehensive but implementations have TypeScript errors to fix
- Use `#` private fields, not `private` keyword
- All interfaces use `readonly` modifiers for immutability
- Subscription interfaces return `Unsubscribe` function

---

## Rollback Notes

> **Purpose:** If something goes wrong, how to recover.

**Safe State:** Initial project setup with package.json
**Files to Revert:** src/types.ts, src/helpers.ts, src/errors.ts
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
  - [ ] Phase 1 status → ✅ Complete
  - [ ] Current Session State updated
  - [ ] Session Log entry added
