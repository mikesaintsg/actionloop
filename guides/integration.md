# @mikesaintsg/actionloop — Integration Guide

> **Purpose:** Integration patterns for using ActionLoop with other packages and frameworks.

---

## Table of Contents

1. [Overview](#overview)
2. [Basic Setup](#basic-setup)
3. [Recording Transitions](#recording-transitions)
4. [Displaying Predictions](#displaying-predictions)
5. [Session Management](#session-management)
6. [Persisting Weights](#persisting-weights)
7. [Cross-Tab Synchronization](#cross-tab-synchronization)
8. [Navigation Integration](#navigation-integration)
9. [Form Integration](#form-integration)
10. [Testing Strategies](#testing-strategies)
11. [Performance Optimization](#performance-optimization)
12. [Error Handling](#error-handling)

---

## Overview

ActionLoop provides predictive workflow guidance through:

- **ProceduralGraph**: Static rules defining valid transitions
- **PredictiveGraph**: Dynamic weights learned from user behavior
- **WorkflowEngine**: Runtime orchestration of the PPALS cycle

### Key Integration Points

| Integration Point | Purpose                                    |
|-------------------|--------------------------------------------|
| Navigation        | Record page transitions as workflow events |
| Persistence       | Save/load predictive weights               |
| Cross-Tab Sync    | Share state across browser tabs            |
| Forms             | Track form interactions as transitions     |
| Analytics         | Export workflow patterns for analysis      |

---

## Basic Setup

```typescript
import {
createProceduralGraph,
createPredictiveGraph,
createWorkflowEngine,
} from '@mikesaintsg/actionloop'

// 1. Define workflow transitions
const transitions = [
{ from: 'landing', to: 'login', weight: 1, actor: 'user' },
{ from: 'landing', to: 'register', weight: 1, actor: 'user' },
{ from: 'login', to: 'dashboard', weight: 1, actor: 'user' },
{ from: 'register', to: 'onboarding', weight: 1, actor: 'user' },
{ from: 'onboarding', to: 'dashboard', weight: 1, actor: 'user' },
{ from: 'dashboard', to: 'settings', weight: 1, actor: 'user' },
{ from: 'dashboard', to: 'profile', weight: 1, actor: 'user' },
{ from: 'dashboard', to: 'projects', weight: 1, actor: 'user' },
] as const

// 2. Create procedural graph (static rules)
const procedural = createProceduralGraph({
transitions,
validateOnCreate: true,
})

// 3. Create predictive graph (dynamic weights)
const predictive = createPredictiveGraph(procedural, {
decayAlgorithm: 'ewma',
decayFactor: 0.9,
})

// 4. Create workflow engine
const engine = createWorkflowEngine(procedural, predictive, {
trackSessions: true,
validateTransitions: true,
})
```

---

## Recording Transitions

Record user actions as they navigate through your application:

```typescript
// Start a session
const session = engine.startSession('user')

// Record transitions
engine.recordTransition('landing', 'login', {
actor: 'user',
sessionId: session.id,
path: '/login',
})

engine.recordTransition('login', 'dashboard', {
actor: 'user',
sessionId: session.id,
path: '/dashboard',
})

// Get predictions for current state
const predictions = engine.predictNext('dashboard', {
actor: 'user',
sessionId: session.id,
path: '/dashboard',
count: 3,
})
// => ['projects', 'settings', 'profile'] ranked by learned weights
```

---

## Displaying Predictions

### Simple List

```typescript
const predictions = engine.predictNext('dashboard', {
actor: 'user',
sessionId: session.id,
path: '/dashboard',
count: 5,
})

predictions.forEach(nodeId => {
console.log(`Suggested: ${nodeId}`)
})
```

### With Confidence Scores

```typescript
const detailed = engine.predictNextDetailed('dashboard', {
actor: 'user',
sessionId: session.id,
path: '/dashboard',
count: 5,
})

detailed.predictions.forEach(prediction => {
console.log(`${prediction.nodeId}: ${Math.round(prediction.confidence * 100)}%`)
})
```

### Rendering to DOM

```typescript
function renderPredictions(container: HTMLElement, predictions: readonly string[]) {
container.innerHTML = ''

predictions.forEach(nodeId => {
const button = document.createElement('button')
button.textContent = nodeId
button.onclick = () => navigateTo(nodeId)
container.appendChild(button)
})
}
```

---

## Session Management

### Starting Sessions

```typescript
// Start with auto-generated ID
const session = engine.startSession('user')

// Start with custom ID
const customSession = engine.startSession('user', 'session-123')
```

### Tracking Session History

```typescript
const chain = engine.getSessionChain('user', {
limit: 100,
includeMetadata: true,
})

console.log(`Session events: ${chain.events.length}`)
console.log(`Total duration: ${chain.totalDuration}ms`)
```

### Ending Sessions

```typescript
// End with reason
engine.endSession(session.id, 'completed')
engine.endSession(session.id, 'abandoned')
engine.endSession(session.id, 'timeout')
```

### Resuming Sessions

```typescript
// Resume from storage
engine.resumeSession('session-123', {
previousNode: 'dashboard',
actor: 'user',
})
```

---

## Persisting Weights

### Saving to localStorage

```typescript
function saveWeights() {
const exported = predictive.export()
localStorage.setItem('actionloop:weights', JSON.stringify(exported))
}

function loadWeights() {
const stored = localStorage.getItem('actionloop:weights')
if (stored) {
predictive.import(JSON.parse(stored))
}
}
```

### Saving to IndexedDB

```typescript
async function saveToIndexedDB(db: IDBDatabase) {
const exported = predictive.export()
const tx = db.transaction('weights', 'readwrite')
const store = tx.objectStore('weights')
await store.put({ id: 'current', ...exported })
}

async function loadFromIndexedDB(db: IDBDatabase) {
const tx = db.transaction('weights', 'readonly')
const store = tx.objectStore('weights')
const stored = await store.get('current')
if (stored) {
predictive.import(stored)
}
}
```

### Auto-Save on Interval

```typescript
const autoSave = setInterval(() => {
saveWeights()
}, 60000) // Every minute

// Cleanup
clearInterval(autoSave)
```

---

## Cross-Tab Synchronization

Share workflow state across browser tabs using BroadcastChannel:

```typescript
const channel = new BroadcastChannel('actionloop-sync')

// Broadcast weight updates
predictive.onWeightUpdate((from, to, actor, weight) => {
channel.postMessage({ type: 'weight', from, to, actor, weight })
})

// Listen for updates from other tabs
channel.onmessage = (event) => {
if (event.data.type === 'weight') {
const { from, to, actor, weight } = event.data
predictive.setWeight(from, to, actor, weight)
}
}

// Cleanup
channel.close()
```

---

## Navigation Integration

Validate and record navigation events:

```typescript
// Navigation guard
function canNavigate(from: string, to: string): boolean {
return engine.isValidTransition(from, to)
}

// Navigation hook
function onNavigate(from: string, to: string) {
engine.recordTransition(from, to, {
actor: 'user',
sessionId: currentSessionId,
path: `/${to}`,
})
}

// Usage
function navigate(to: string) {
const from = getCurrentPage()

if (!canNavigate(from, to)) {
console.warn(`Invalid transition: ${from} -> ${to}`)
return false
}

// Perform navigation
window.history.pushState({}, '', `/${to}`)

// Record transition
onNavigate(from, to)

return true
}
```

---

## Form Integration

Track form interactions as micro-transitions:

```typescript
// Track form field focus
form.addEventListener('focusin', (event) => {
const field = event.target as HTMLInputElement
if (field.name) {
engine.recordTransition(currentStep, `${currentStep}-${field.name}`, {
actor: 'user',
sessionId: session.id,
path: window.location.pathname,
})
}
})

// Track form submission
form.addEventListener('submit', () => {
engine.recordTransition(currentStep, nextStep, {
actor: 'user',
sessionId: session.id,
path: window.location.pathname,
metadata: { formCompleted: true },
})
})
```

---

## Testing Strategies

### Unit Testing

```typescript
import { describe, it, expect } from 'vitest'
import {
createProceduralGraph,
createPredictiveGraph,
createWorkflowEngine,
} from '@mikesaintsg/actionloop'

describe('WorkflowEngine', () => {
it('records transitions and updates weights', () => {
const procedural = createProceduralGraph({
transitions: [
{ from: 'a', to: 'b', weight: 1, actor: 'user' },
],
})
const predictive = createPredictiveGraph(procedural)
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

it('rejects invalid transitions', () => {
const procedural = createProceduralGraph({
transitions: [
{ from: 'a', to: 'b', weight: 1, actor: 'user' },
],
})
const predictive = createPredictiveGraph(procedural)
const engine = createWorkflowEngine(procedural, predictive, {
validateTransitions: true,
})

const session = engine.startSession('user')

expect(() => {
engine.recordTransition('a', 'c', {
actor: 'user',
sessionId: session.id,
path: '/test',
})
}).toThrow()
})
})
```

### Integration Testing

```typescript
describe('Workflow Integration', () => {
it('provides accurate predictions after usage', () => {
// Setup
const engine = createWorkflowEngine(procedural, predictive)
const session = engine.startSession('user')

// Simulate user behavior
for (let i = 0; i < 5; i++) {
engine.recordTransition('dashboard', 'projects', {
actor: 'user',
sessionId: session.id,
path: '/projects',
})
engine.recordTransition('projects', 'dashboard', {
actor: 'user',
sessionId: session.id,
path: '/dashboard',
})
}

// Get predictions
const predictions = engine.predictNext('dashboard', {
actor: 'user',
sessionId: session.id,
path: '/dashboard',
count: 3,
})

// 'projects' should be the top prediction
expect(predictions[0]).toBe('projects')
})
})
```

---

## Performance Optimization

### Lazy Loading

```typescript
let engine: WorkflowEngineInterface | undefined

async function getEngine() {
if (!engine) {
const { createWorkflowEngine } = await import('@mikesaintsg/actionloop')
engine = createWorkflowEngine(procedural, predictive)
}
return engine
}
```

### Debounced Predictions

```typescript
let predictionTimeout: ReturnType<typeof setTimeout> | undefined

function debouncedPredict(node: string, callback: (predictions: string[]) => void) {
if (predictionTimeout) {
clearTimeout(predictionTimeout)
}

predictionTimeout = setTimeout(() => {
const predictions = engine.predictNext(node, context)
callback([...predictions])
}, 100)
}
```

### Batch Recording

```typescript
const pendingTransitions: BatchTransition[] = []

function queueTransition(from: string, to: string, context: TransitionContext) {
pendingTransitions.push({ from, to, context })
}

function flushTransitions() {
if (pendingTransitions.length > 0) {
engine.recordTransitions(pendingTransitions)
pendingTransitions.length = 0
}
}

// Flush periodically or on page unload
setInterval(flushTransitions, 5000)
window.addEventListener('beforeunload', flushTransitions)
```

---

## Error Handling

```typescript
import { isActionLoopError } from '@mikesaintsg/actionloop'

try {
engine.recordTransition('invalid', 'transition', context)
} catch (error) {
if (isActionLoopError(error)) {
switch (error.code) {
case 'INVALID_TRANSITION':
console.warn('Invalid transition:', error.message)
break
case 'SESSION_NOT_FOUND':
console.info('Session expired, starting new session')
startNewSession()
break
case 'NODE_NOT_FOUND':
console.error('Configuration error:', error.message)
break
default:
console.error('Workflow error:', error.message)
}
} else {
throw error
}
}
```

### Graceful Degradation

```typescript
async function initializeWithFallback() {
try {
// Try to load persisted weights
const stored = localStorage.getItem('actionloop:weights')
if (stored) {
predictive.import(JSON.parse(stored))
}
} catch {
console.warn('Starting with fresh predictive weights')
}

try {
// Try to resume session
const sessionData = sessionStorage.getItem('actionloop:session')
if (sessionData) {
const { sessionId, currentNode } = JSON.parse(sessionData)
engine.resumeSession(sessionId, {
previousNode: currentNode,
actor: 'user',
})
}
} catch {
engine.startSession('user')
}
}
```

---

## Cleanup

Always destroy the engine when done:

```typescript
// Application shutdown
window.addEventListener('beforeunload', () => {
// Save weights
const exported = predictive.export()
localStorage.setItem('actionloop:weights', JSON.stringify(exported))

// End session
engine.endSession(session.id, 'abandoned')

// Cleanup
engine.destroy()
})
```
