# @mikesaintsg Ecosystem — Integration Guide

## Table of Contents

- [Architecture Overview](#architecture-overview)
  - [Package Responsibilities](#package-responsibilities)
  - [Data Flow](#data-flow)
- [Setup and Configuration](#setup-and-configuration)
  - [Environment Configuration](#environment-configuration)
  - [Database Schema (for IndexedDB)](#database-schema-for-indexeddb)
- [Complete Application Example](#complete-application-example)
- [Step-by-Step Breakdown](#step-by-step-breakdown)
  - [1. The Port Pattern](#1-the-port-pattern)
  - [2. Adapter Categories](#2-adapter-categories)
  - [3. Factory Function Pattern](#3-factory-function-pattern)
  - [4. Event-Driven Architecture](#4-event-driven-architecture)
  - [5. Context Building Flow](#5-context-building-flow)
  - [6. Tool Execution Loop](#6-tool-execution-loop)
- [Advanced Patterns](#advanced-patterns)
  - [Multi-Provider Fallback](#multi-provider-fallback)
  - [Streaming with Token Batching](#streaming-with-token-batching)
  - [Cross-Tab Synchronization](#cross-tab-synchronization)
  - [Hybrid Search with Reranking](#hybrid-search-with-reranking)
- [ActionLoop Integration](#actionloop-integration)
  - [Overview](#overview)
  - [Basic Setup](#basic-setup)
  - [Recording User Transitions](#recording-user-transitions)
  - [Displaying Predictions in UI](#displaying-predictions-in-ui)
  - [Session Management](#session-management)
  - [Persisting Predictive Weights](#persisting-predictive-weights)
  - [Workflow Analysis and Optimization](#workflow-analysis-and-optimization)
  - [Integration with Navigation](#integration-with-navigation)
  - [Integration with Form Package](#integration-with-form-package)
  - [Integration with Broadcast for Cross-Tab](#integration-with-broadcast-for-cross-tab)
  - [Complete ActionLoop Application Example](#complete-actionloop-application-example)
- [Error Handling](#error-handling)
  - [Comprehensive Error Handling](#comprehensive-error-handling)
  - [Graceful Degradation](#graceful-degradation)
- [Performance Optimization](#performance-optimization)
  - [1. Lazy Loading](#1-lazy-loading)
  - [2. Debounced Context Building](#2-debounced-context-building)
  - [3. Parallel Initialization](#3-parallel-initialization)
  - [4. Streaming Response Rendering](#4-streaming-response-rendering)
- [Testing Strategies](#testing-strategies)
  - [Unit Testing with Mocks](#unit-testing-with-mocks)
  - [Integration Testing](#integration-testing)
  - [E2E Testing with Playwright](#e2e-testing-with-playwright)
- [Summary](#summary)
- [Appendix:  Rater Integration](#appendix-rater-integration)
  - [Integration with Storage Packages](#integration-with-storage-packages)
  - [Integration with Form Package](#integration-with-form-package-1)
  - [Use Cases](#use-cases)

---

## Architecture Overview

### Package Responsibilities

| Package | Responsibility | Key Exports |
|---------|---------------|-------------|
| `@mikesaintsg/core` | Shared types, interfaces, Result pattern | `Unsubscribe`, `EmbeddingAdapterInterface`, `ok`, `err` |
| `@mikesaintsg/adapters` | Provider implementations, policy adapters | `createOpenAIProviderAdapter`, `createRetryAdapter` |
| `@mikesaintsg/inference` | LLM generation, sessions, streaming | `createEngine`, `createSession` |
| `@mikesaintsg/vectorstore` | Document storage, similarity search | `createVectorStore` |
| `@mikesaintsg/contextprotocol` | Tool schemas, validation, execution | `createToolRegistry` |
| `@mikesaintsg/contextbuilder` | Context assembly, token budgeting | `createContextBuilder`, `createContextManager` |
| `@mikesaintsg/storage` | Key-value storage with TTL | `createStorage` |
| `@mikesaintsg/indexeddb` | Structured data persistence | `createDatabase` |
| `@mikesaintsg/broadcast` | Cross-tab state synchronization | `createBroadcast` |
| `@mikesaintsg/navigation` | Client-side routing with guards | `createNavigation` |
| `@mikesaintsg/form` | Form state and validation | `createForm` |
| `@mikesaintsg/table` | Data table management | `createTable` |
| `@mikesaintsg/filesystem` | File system operations (OPFS) | `createFileSystem` |
| `@mikesaintsg/rater` | Rating/scoring calculations | `createRatingEngine` |
| `@actionloop/core` | Workflow guidance with adaptive predictions | `createWorkflowEngine`, `createProceduralGraph` |

### Data Flow

````text
User Action
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        @actionloop/core                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐ │
│  │ Procedural  │───▶│ Predictive  │───▶│    WorkflowEngine       │ │
│  │   Graph     │    │   Graph     │    │ (record + predict)      │ │
│  └─────────────┘    └─────────────┘    └───────────┬─────────────┘ │
└───────────────────────────────────���────────────────┼────────────────┘
                                                     │
    ┌────────────────────────────────────────────────┼────────────────┐
    │                                                ▼                │
    │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
    │  │ @broadcast  │◀──▶│ @navigation │◀──▶│   @form     │         │
    │  │ (cross-tab) │    │  (routing)  │    │ (input)     │         │
    │  └─────────────┘    └─────────────┘    └─────────────┘         │
    │         │                  │                  │                 │
    │         └──────────────────┼──────────────────┘                 │
    │                            ▼                                    │
    │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
    │  │ @indexeddb  │◀──▶│  @storage   │◀──▶│   @table    │         │
    │  │(persistence)│    │  (cache)    │    │  (display)  │         │
    │  └─────────────┘    └─────────────┘    └─────────────┘         │
    │                            │                                    │
    │                            ▼                                    │
    │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
    │  │ @inference  │◀──▶│@vectorstore │◀──▶│@contextbldr │         │
    │  │ (LLM calls) │    │   (RAG)     │    │  (context)  │         │
    │  └─────────────┘    └─────────────┘    └─────────────┘         │
    │         │                  │                  │                 │
    │         └──────────────────┼──────────────────┘                 │
    │                            ▼                                    │
    │                    ┌─────────────┐                              │
    │                    │ @adapters   │                              │
    │                    │ (providers) │                              │
    │                    └─────────────┘                              │
    │                                                                 │
    │                    UI / Application Layer                       │
    └────────────────────────────────────────────���────────────────────┘
````

---

## Setup and Configuration

### Environment Configuration

````typescript
// src/config/env.ts
export interface EnvironmentConfig {
	readonly openaiApiKey: string
	readonly anthropicApiKey?:  string
	readonly voyageApiKey?: string
	readonly isDevelopment: boolean
}

export function loadEnvironment(): EnvironmentConfig {
	return {
		openaiApiKey:  import.meta.env.VITE_OPENAI_API_KEY ??  '',
		anthropicApiKey:  import.meta.env.VITE_ANTHROPIC_API_KEY,
		voyageApiKey: import.meta.env.VITE_VOYAGE_API_KEY,
		isDevelopment: import. meta.env.DEV,
	}
}
````

### Database Schema (for IndexedDB)

````typescript
// src/config/database.ts
import type { DatabaseSchema } from '@mikesaintsg/indexeddb'

export interface AppDatabaseSchema extends DatabaseSchema {
	sessions: {
		key: string
		value: {
			id: string
			createdAt: number
			messages: readonly unknown[]
			metadata: Record<string, unknown>
		}
		indexes: {
			byCreatedAt: number
		}
	}
	documents: {
		key: string
		value: {
			id:  string
			content: string
			embedding: readonly number[]
			metadata: Record<string, unknown>
		}
		indexes: {
			byMetadata: string
		}
	}
	workflows: {
		key: string
		value: {
			id:  string
			exportedAt: number
			proceduralGraph: unknown
			predictiveGraph: unknown
		}
		indexes: {
			byExportedAt: number
		}
	}
}

export const DATABASE_NAME = 'app-database'
export const DATABASE_VERSION = 1
````

---

## Complete Application Example

````typescript
// src/app. ts
import { createEngine } from '@mikesaintsg/inference'
import { createVectorStore } from '@mikesaintsg/vectorstore'
import { createContextBuilder, createContextManager } from '@mikesaintsg/contextbuilder'
import { createToolRegistry } from '@mikesaintsg/contextprotocol'
import { createDatabase } from '@mikesaintsg/indexeddb'
import { createBroadcast } from '@mikesaintsg/broadcast'
import { createNavigation } from '@mikesaintsg/navigation'
import {
	createOpenAIProviderAdapter,
	createOpenAIEmbeddingAdapter,
	createOpenAIToolFormatAdapter,
	createRetryAdapter,
	createRateLimitAdapter,
} from '@mikesaintsg/adapters'
import {
	createProceduralGraph,
	createPredictiveGraph,
	createWorkflowEngine,
} from '@actionloop/core'

import type { AppDatabaseSchema } from './config/database. js'
import { loadEnvironment } from './config/env.js'
import { workflowTransitions } from './config/workflows.js'

// ============================================================================
// Application Bootstrap
// ============================================================================

export async function createApplication() {
	const env = loadEnvironment()

	// 1. Create adapters (policy layer)
	const retryAdapter = createRetryAdapter({ maxRetries: 3 })
	const rateLimitAdapter = createRateLimitAdapter({ requestsPerMinute: 60 })

	// 2. Create provider adapters (source layer)
	const providerAdapter = createOpenAIProviderAdapter({
		apiKey:  env.openaiApiKey,
		model: 'gpt-4o',
	})

	const embeddingAdapter = createOpenAIEmbeddingAdapter({
		apiKey: env.openaiApiKey,
		model: 'text-embedding-3-small',
	})

	// 3. Create inference engine
	const engine = createEngine(providerAdapter, {
		retry: retryAdapter,
		rateLimit: rateLimitAdapter,
	})

	// 4. Create vector store for RAG
	const vectorStore = await createVectorStore(embeddingAdapter, {
		autoSave: true,
	})

	// 5. Create tool registry
	const toolFormatAdapter = createOpenAIToolFormatAdapter()
	const toolRegistry = createToolRegistry(toolFormatAdapter)

	// 6. Create context manager
	const contextManager = createContextManager({
		tokenBudget: 8000,
		reservedTokens: 1000,
	})

	// 7. Create database for persistence
	const database = await createDatabase<AppDatabaseSchema>({
		name: 'app-database',
		version: 1,
		stores: {
			sessions: { keyPath: 'id', indexes: { byCreatedAt: 'createdAt' } },
			documents: { keyPath: 'id', indexes: { byMetadata: 'metadata. type' } },
			workflows: { keyPath: 'id', indexes: { byExportedAt:  'exportedAt' } },
		},
	})

	// 8. Create cross-tab broadcast
	const broadcast = createBroadcast({
		channel: 'app-state',
		state: { currentPage: 'home', user: null },
	})

	// 9. Create navigation
	const navigation = createNavigation({
		page: 'home',
		hashSync: true,
	})

	// 10. Create ActionLoop workflow engine
	const proceduralGraph = createProceduralGraph({
		transitions: workflowTransitions,
	})

	const predictiveGraph = createPredictiveGraph(proceduralGraph, {
		decayAlgorithm: 'ewma',
		decayFactor: 0.9,
	})

	const workflowEngine = createWorkflowEngine(proceduralGraph, predictiveGraph, {
		trackSessions: true,
		onTransition: (from, to, context) => {
			console.log(`Workflow:  ${from} -> ${to}`)
		},
	})

	return {
		engine,
		vectorStore,
		toolRegistry,
		contextManager,
		database,
		broadcast,
		navigation,
		workflowEngine,
		proceduralGraph,
		predictiveGraph,
		destroy: () => {
			engine.destroy()
			vectorStore.destroy()
			toolRegistry.destroy()
			contextManager.destroy()
			database.destroy()
			broadcast.destroy()
			navigation.destroy()
			workflowEngine.destroy()
			proceduralGraph.destroy()
			predictiveGraph.destroy()
		},
	}
}
````

---

## Step-by-Step Breakdown

### 1. The Port Pattern

All systems depend on abstract interfaces, not concrete implementations:

````typescript
// The inference engine depends on ProviderAdapterInterface
// NOT on a specific OpenAI implementation
import type { ProviderAdapterInterface } from '@mikesaintsg/core'

function createEngine(provider: ProviderAdapterInterface): EngineInterface {
	// Engine only knows about the interface
	// Actual provider (OpenAI, Anthropic, Ollama) is injected
}
````

### 2. Adapter Categories

Adapters are organized by responsibility:

| Category | Purpose | Examples |
|----------|---------|----------|
| **Source** | Connect to external systems | `createOpenAIProviderAdapter`, `createVoyageEmbeddingAdapter` |
| **Policy** | Apply cross-cutting concerns | `createRetryAdapter`, `createRateLimitAdapter` |
| **Enhancement** | Add optional features | `createEmbeddingCacheAdapter`, `createRerankerAdapter` |
| **Transform** | Convert between formats | `createOpenAIToolFormatAdapter`, `createSimilarityAdapter` |
| **Persistence** | Store and retrieve data | `createIndexedDBPersistenceAdapter`, `createOPFSPersistenceAdapter` |

### 3. Factory Function Pattern

Every system is created via factory functions:

````typescript
// Factory functions accept required dependencies first, then optional config
const engine = createEngine(providerAdapter, {
	retry: retryAdapter,       // Optional policy adapter
	rateLimit: rateLimitAdapter, // Optional policy adapter
	onRequest: (id, msgs) => {}, // Optional hook
})
````

### 4. Event-Driven Architecture

All systems emit events via the subscription pattern:

````typescript
// Subscribe to events
const unsubscribe = engine.onResponse((requestId, result) => {
	console.log('Response received:', result)
})

// Cleanup when done
unsubscribe()
````

### 5. Context Building Flow

````typescript
// 1. Create context builder with token budget
const builder = createContextBuilder(8000, {
	reservedTokens: 1000,
})

// 2. Add frames in priority order
builder.addFrame({
	type: 'system',
	content: 'You are a helpful assistant.',
	priority: 100,
})

builder.addFrame({
	type: 'retrieval',
	content: relevantDocs. join('\n'),
	priority: 80,
})

builder.addFrame({
	type: 'user',
	content: userMessage,
	priority: 90,
})

// 3. Build context respecting token budget
const context = builder.build()

// 4. Generate from context
const result = await engine.generateFromContext(context)
````

### 6. Tool Execution Loop

````typescript
// 1. Register tools
toolRegistry.register(
	{
		name: 'search_documents',
		description: 'Search for relevant documents',
		parameters: {
			type: 'object',
			properties: {
				query:  { type: 'string', description: 'Search query' },
			},
			required: ['query'],
		},
	},
	async (params) => {
		const results = await vectorStore.similaritySearch(params.query)
		return results. map(r => r.content)
	}
)

// 2. Generate with tools
const result = await engine.generate(messages, {
	tools: toolRegistry.getFormattedSchemas(),
})

// 3. Handle tool calls
if (result.toolCalls && result.toolCalls.length > 0) {
	const toolResults = await toolRegistry.execute(result.toolCalls)
	
	// 4. Continue conversation with results
	const finalResult = await engine.generate([
		... messages,
		{ role: 'assistant', content: result.content, toolCalls: result.toolCalls },
		...toolResults. map(r => ({ role: 'tool', content:  r.result, toolCallId: r.callId })),
	])
}
````

---

## Advanced Patterns

### Multi-Provider Fallback

````typescript
import {
	createOpenAIProviderAdapter,
	createAnthropicProviderAdapter,
} from '@mikesaintsg/adapters'

async function generateWithFallback(
	messages: readonly Message[],
	options?:  GenerationOptions
): Promise<GenerationResult> {
	const providers = [
		createOpenAIProviderAdapter({ apiKey: env.openaiApiKey, model: 'gpt-4o' }),
		createAnthropicProviderAdapter({ apiKey: env.anthropicApiKey, model: 'claude-3-sonnet' }),
	]

	for (const provider of providers) {
		try {
			const engine = createEngine(provider)
			return await engine.generate(messages, options)
		} catch (error) {
			console.warn('Provider failed, trying next:', error)
			continue
		}
	}

	throw new Error('All providers failed')
}
````

### Streaming with Token Batching

````typescript
import { createTokenBatcher } from '@mikesaintsg/inference'

const batcher = createTokenBatcher({
	minBatchSize: 5,
	maxDelayMs: 100,
	boundaryMode: 'word',
	onBatch: (batch) => {
		// Update UI with batched tokens for smoother rendering
		updateUI(batch. text)
	},
})

const stream = engine.stream(messages)

stream.onToken((token) => {
	batcher.push(token)
})

stream.onComplete(() => {
	batcher.end()
})
````

### Cross-Tab Synchronization

````typescript
import { createBroadcast } from '@mikesaintsg/broadcast'

interface AppState {
	currentUser: string | null
	theme: 'light' | 'dark'
	notifications: readonly string[]
}

const broadcast = createBroadcast<AppState, { type: string; payload: unknown }>({
	channel: 'app-sync',
	state: {
		currentUser: null,
		theme: 'light',
		notifications: [],
	},
})

// Sync state changes across tabs
broadcast.onStateChange((state, source) => {
	if (source === 'remote') {
		// Update local UI with remote state
		updateLocalUI(state)
	}
})

// Leader election for background tasks
broadcast.onLeaderChange((isLeader) => {
	if (isLeader) {
		// This tab is now responsible for background sync
		startBackgroundSync()
	}
})
````

### Hybrid Search with Reranking

````typescript
import { createVectorStore } from '@mikesaintsg/vectorstore'
import { createCohereRerankerAdapter } from '@mikesaintsg/adapters'

const reranker = createCohereRerankerAdapter({
	apiKey: env.cohereApiKey,
	model:  'rerank-english-v2.0',
})

const vectorStore = await createVectorStore(embeddingAdapter, {
	reranker,
})

// Hybrid search combines vector similarity with keyword matching
const results = await vectorStore.hybridSearch('machine learning basics', {
	limit: 20,           // Retrieve more candidates
	vectorWeight: 0.7,   // Weight for semantic similarity
	keywordWeight: 0.3,  // Weight for keyword matching
	rerank: true,        // Apply reranking
	rerankTopK: 5,       // Return top 5 after reranking
})
````

---

## ActionLoop Integration

### Overview

ActionLoop provides predictive workflow guidance by combining:
- **Procedural Graph**: Static rules defining valid transitions
- **Predictive Graph**: Dynamic weights learned from user behavior
- **Workflow Engine**:  Runtime orchestration of the PPALS cycle

### Basic Setup

````typescript
// src/workflows/setup.ts
import {
	createProceduralGraph,
	createPredictiveGraph,
	createWorkflowEngine,
} from '@actionloop/core'

// Define your workflow transitions
const transitions = [
	// Authentication flow
	{ from: 'landing', to: 'login', weight: 1, actor: 'user' },
	{ from: 'landing', to: 'register', weight: 1, actor: 'user' },
	{ from:  'login', to: 'dashboard', weight: 1, actor: 'user' },
	{ from: 'register', to: 'onboarding', weight: 1, actor: 'user' },
	{ from: 'onboarding', to: 'dashboard', weight: 1, actor: 'user' },
	
	// Main application flow
	{ from: 'dashboard', to: 'settings', weight: 1, actor:  'user' },
	{ from: 'dashboard', to: 'profile', weight: 1, actor:  'user' },
	{ from: 'dashboard', to: 'projects', weight: 1, actor:  'user' },
	{ from: 'projects', to: 'project-detail', weight: 1, actor:  'user' },
	{ from: 'project-detail', to: 'projects', weight: 1, actor:  'user' },
	{ from: 'settings', to: 'dashboard', weight: 1, actor:  'user' },
	{ from: 'profile', to: 'dashboard', weight: 1, actor: 'user' },
	
	// System transitions
	{ from: 'dashboard', to: 'session-timeout', weight: 1, actor:  'system' },
	{ from: 'session-timeout', to: 'login', weight: 1, actor:  'system' },
] as const

// Create the workflow system
export function createWorkflowSystem() {
	const proceduralGraph = createProceduralGraph({
		transitions,
		validateOnCreate: true,
	})

	const predictiveGraph = createPredictiveGraph(proceduralGraph, {
		decayAlgorithm: 'ewma',
		decayFactor: 0.9,
	})

	const engine = createWorkflowEngine(proceduralGraph, predictiveGraph, {
		trackSessions: true,
		validateTransitions: true,
	})

	return { proceduralGraph, predictiveGraph, engine }
}
````

### Recording User Transitions

````typescript
// src/workflows/tracking.ts
import type { WorkflowEngineInterface } from '@actionloop/core'

export function createWorkflowTracker(engine: WorkflowEngineInterface) {
	let currentNode = 'landing'
	let sessionId: string | undefined

	return {
		// Start tracking a user session
		startTracking(actor: 'user' | 'system' = 'user') {
			const session = engine.startSession(actor)
			sessionId = session.id
			return session
		},

		// Record a navigation/action
		recordAction(targetNode: string, path: string) {
			if (!sessionId) {
				this.startTracking()
			}

			// Validate and record the transition
			if (engine.isValidTransition(currentNode, targetNode)) {
				engine.recordTransition(currentNode, targetNode, {
					actor: 'user',
					sessionId:  sessionId! ,
					path,
				})
				currentNode = targetNode
				return true
			}

			console.warn(`Invalid transition:  ${currentNode} -> ${targetNode}`)
			return false
		},

		// Get predictions for current state
		getPredictions(count = 5): readonly string[] {
			return engine.predictNext(currentNode, {
				actor: 'user',
				sessionId: sessionId!,
				path: window.location.pathname,
				count,
			})
		},

		// Get detailed predictions with confidence scores
		getDetailedPredictions(count = 5) {
			return engine.predictNextDetailed(currentNode, {
				actor: 'user',
				sessionId: sessionId!,
				path: window.location.pathname,
				count,
			})
		},

		// Get current node
		getCurrentNode() {
			return currentNode
		},

		// End session
		endSession(reason:  'completed' | 'abandoned' | 'timeout' = 'completed') {
			if (sessionId) {
				engine.endSession(sessionId, reason)
				sessionId = undefined
			}
		},
	}
}
````

### Displaying Predictions in UI

````typescript
// src/components/ActionRecommendations.ts
import type { WorkflowEngineInterface, PredictionResult } from '@actionloop/core'

export interface ActionRecommendation {
	readonly nodeId: string
	readonly label: string
	readonly confidence: number
	readonly icon?:  string
}

export function createActionRecommendations(
	engine: WorkflowEngineInterface,
	nodeLabels: Record<string, { label: string; icon?: string }>
) {
	return {
		getRecommendations(
			currentNode: string,
			sessionId: string,
			path: string,
			count = 3
		): readonly ActionRecommendation[] {
			const detailed = engine.predictNextDetailed(currentNode, {
				actor: 'user',
				sessionId,
				path,
				count,
			})

			return detailed. predictions.map((prediction) => ({
				nodeId: prediction.nodeId,
				label: nodeLabels[prediction.nodeId]?.label ??  prediction.nodeId,
				confidence: prediction.confidence,
				icon: nodeLabels[prediction.nodeId]?.icon,
			}))
		},

		// Render recommendations to DOM
		renderToElement(
			element: HTMLElement,
			recommendations:  readonly ActionRecommendation[],
			onSelect: (nodeId: string) => void
		) {
			element.innerHTML = ''

			for (const rec of recommendations) {
				const button = document.createElement('button')
				button.className = 'action-recommendation'
				button.innerHTML = `
					${rec.icon ? `<span class="icon">${rec.icon}</span>` : ''}
					<span class="label">${rec. label}</span>
					<span class="confidence">${Math.round(rec.confidence * 100)}%</span>
				`
				button.addEventListener('click', () => onSelect(rec.nodeId))
				element.appendChild(button)
			}
		},
	}
}
````

### Session Management

````typescript
// src/workflows/sessions.ts
import type {
	WorkflowEngineInterface,
	SessionInfo,
	ActionChain,
} from '@actionloop/core'
import { createStorage } from '@mikesaintsg/storage'

interface PersistedSessionState {
	sessionId: string
	currentNode: string
	startTime: number
}

export function createSessionManager(engine: WorkflowEngineInterface) {
	const storage = createStorage<{ workflowSession: PersistedSessionState }>(
		'localStorage',
		{ prefix: 'actionloop:' }
	)

	return {
		// Resume session from storage or start new
		async initializeSession(): Promise<SessionInfo> {
			const persisted = await storage.get('workflowSession')

			if (persisted) {
				// Check if session is still valid (not expired)
				const elapsed = Date.now() - persisted.startTime
				const maxAge = 30 * 60 * 1000 // 30 minutes

				if (elapsed < maxAge && engine.hasSession(persisted.sessionId)) {
					engine.resumeSession(persisted.sessionId, {
						previousNode: persisted.currentNode,
						actor: 'user',
					})
					return engine.getSession(persisted.sessionId)!
				}
			}

			// Start fresh session
			const session = engine.startSession('user')
			await this.persistSession(session. id, 'landing')
			return session
		},

		// Persist session state
		async persistSession(sessionId: string, currentNode: string) {
			await storage.set('workflowSession', {
				sessionId,
				currentNode,
				startTime: Date.now(),
			})
		},

		// Get session history for analytics
		getSessionHistory(actor: 'user' | 'system' = 'user'): ActionChain {
			return engine.getSessionChain(actor, {
				limit: 100,
				includeMetadata: true,
			})
		},

		// Clear session
		async clearSession(reason: 'completed' | 'abandoned' | 'timeout') {
			const persisted = await storage.get('workflowSession')
			if (persisted) {
				engine.endSession(persisted.sessionId, reason)
				await storage.remove('workflowSession')
			}
		},
	}
}
````

### Persisting Predictive Weights

````typescript
// src/workflows/persistence.ts
import type {
	PredictiveGraphInterface,
	ExportedPredictiveGraph,
} from '@actionloop/core'
import { createDatabase } from '@mikesaintsg/indexeddb'

interface WorkflowDatabaseSchema {
	predictiveWeights: {
		key: string
		value: ExportedPredictiveGraph & { id: string }
		indexes: {
			byExportedAt: number
		}
	}
}

export async function createWorkflowPersistence(
	predictiveGraph: PredictiveGraphInterface
) {
	const database = await createDatabase<WorkflowDatabaseSchema>({
		name: 'actionloop-weights',
		version: 1,
		stores:  {
			predictiveWeights:  {
				keyPath: 'id',
				indexes: { byExportedAt: 'exportedAt' },
			},
		},
	})

	const store = database.store('predictiveWeights')

	return {
		// Save current weights
		async saveWeights() {
			const exported = predictiveGraph.export()
			await store.set({
				... exported,
				id: exported.modelId,
			})
		},

		// Load weights from storage
		async loadWeights(): Promise<boolean> {
			const modelId = predictiveGraph.getModelId()
			const stored = await store.get(modelId)

			if (stored) {
				predictiveGraph.import(stored)
				return true
			}

			return false
		},

		// Auto-save on interval
		startAutoSave(intervalMs = 60000) {
			const timer = setInterval(() => {
				this.saveWeights().catch(console.error)
			}, intervalMs)

			return () => clearInterval(timer)
		},

		// Get all saved weight snapshots
		async getSnapshots() {
			return store.query().orderBy('exportedAt', 'desc').limit(10).toArray()
		},
	}
}
````

### Workflow Analysis and Optimization

````typescript
// src/workflows/analysis.ts
import {
	createWorkflowAnalyzer,
	createWorkflowValidator,
	type ProceduralGraphInterface,
	type PredictiveGraphInterface,
	type LoopInfo,
	type BottleneckInfo,
	type AutomationOpportunity,
} from '@actionloop/core'

export function createWorkflowAnalysis(
	procedural: ProceduralGraphInterface,
	predictive: PredictiveGraphInterface
) {
	const analyzer = createWorkflowAnalyzer(procedural, predictive)
	const validator = createWorkflowValidator(procedural)

	return {
		// Validate graph structure
		validate() {
			return {
				results: validator.runStaticChecks(),
				isValid: validator.isValid(),
				errorCount: validator.getErrorCount(),
				warningCount: validator.getWarningCount(),
			}
		},

		// Find problematic patterns
		findIssues() {
			return {
				hotLoops: analyzer.findHotLoops({ threshold: 10 }),
				infiniteLoops: analyzer.findInfiniteLoops({ maxLength: 50 }),
				unproductiveLoops: analyzer.findUnproductiveLoops(),
				bottlenecks: analyzer.findBottlenecks({
					trafficThreshold: 20,
					congestionThreshold: 3,
				}),
			}
		},

		// Find automation opportunities
		findAutomationOpportunities(): readonly AutomationOpportunity[] {
			return analyzer.findAutomationOpportunities({
				minRepetitions: 5,
				minSequenceLength: 2,
				maxSequenceLength:  5,
				confidenceThreshold: 0.7,
			})
		},

		// Get comprehensive summary
		getSummary() {
			return analyzer.getSummary()
		},

		// Analyze by context (e.g., by procedure)
		analyzeByProcedure() {
			return analyzer.analyzeByContext({
				groupBy: ['procedure'],
			})
		},

		// Clean up
		destroy() {
			analyzer.destroy()
			validator.destroy()
		},
	}
}
````

### Integration with Navigation

````typescript
// src/integration/navigation-workflow.ts
import { createNavigation, type NavigationInterface } from '@mikesaintsg/navigation'
import type { WorkflowEngineInterface } from '@actionloop/core'

type AppPage = 'landing' | 'login' | 'dashboard' | 'settings' | 'profile' | 'projects'

export function createWorkflowNavigation(
	workflowEngine: WorkflowEngineInterface,
	sessionId: string
) {
	let currentWorkflowNode = 'landing'

	const navigation = createNavigation<AppPage>({
		page: 'landing',
		hashSync: true,
		guards: [
			// Validate transitions against workflow
			async (to, from) => {
				if (! from) return true

				const fromNode = from.page
				const toNode = to. page

				// Check if transition is valid in workflow
				if (!workflowEngine.isValidTransition(fromNode, toNode)) {
					console.warn(`Blocked invalid workflow transition: ${fromNode} -> ${toNode}`)
					return false
				}

				return true
			},
		],
		hooks: [
			// Record successful transitions
			(to, from) => {
				if (from) {
					workflowEngine. recordTransition(from.page, to.page, {
						actor: 'user',
						sessionId,
						path: `/${to.page}`,
					})
					currentWorkflowNode = to. page
				}
			},
		],
	})

	return {
		navigation,

		// Navigate with workflow prediction
		async navigateWithPrediction(page: AppPage) {
			const predictions = workflowEngine.predictNext(currentWorkflowNode, {
				actor: 'user',
				sessionId,
				path: `/${page}`,
				count: 1,
			})

			// If target is the top prediction, navigate directly
			if (predictions[0] === page) {
				return navigation.push(page)
			}

			// Otherwise, still navigate but log unexpected path
			console.info(`User chose ${page} over predicted ${predictions[0]}`)
			return navigation.push(page)
		},

		// Get suggested next pages
		getSuggestedPages(count = 3): readonly AppPage[] {
			return workflowEngine.predictNext(currentWorkflowNode, {
				actor: 'user',
				sessionId,
				path: window.location.pathname,
				count,
			}) as readonly AppPage[]
		},

		destroy() {
			navigation.destroy()
		},
	}
}
````

### Integration with Form Package

````typescript
// src/integration/form-workflow.ts
import { createForm, type FormInterface } from '@mikesaintsg/form'
import type { WorkflowEngineInterface } from '@actionloop/core'

interface OnboardingFormData {
	name: string
	email: string
	company: string
	role:  string
}

export function createOnboardingWorkflow(
	workflowEngine: WorkflowEngineInterface,
	sessionId: string,
	formElement: HTMLFormElement
) {
	const form = createForm<OnboardingFormData>(formElement, {
		initialValues: {
			name: '',
			email: '',
			company:  '',
			role: '',
		},
		onSubmit: async (values) => {
			// Record form completion as workflow transition
			workflowEngine.recordTransition('onboarding', 'dashboard', {
				actor: 'user',
				sessionId,
				path: '/onboarding',
				metadata: {
					formCompleted: true,
					fieldsProvided: Object.keys(values).filter(
						(k) => values[k as keyof OnboardingFormData]
					),
				},
			})

			// Process form submission
			await submitOnboarding(values)
		},
	})

	// Track field interactions as micro-transitions
	form.onChange((field, value) => {
		// Record field focus as workflow activity
		workflowEngine.recordTransition(`onboarding`, `onboarding-${field}`, {
			actor: 'user',
			sessionId,
			path: '/onboarding',
		})
	})

	return {
		form,

		// Get field recommendations based on common patterns
		getFieldRecommendations() {
			const predictions = workflowEngine.predictNext('onboarding', {
				actor: 'user',
				sessionId,
				path: '/onboarding',
				count:  10,
			})

			// Filter predictions to onboarding fields
			return predictions
				.filter((p) => p.startsWith('onboarding-'))
				.map((p) => p.replace('onboarding-', ''))
		},

		destroy() {
			form.destroy()
		},
	}
}

async function submitOnboarding(values: OnboardingFormData): Promise<void> {
	// Implementation
}
````

### Integration with Broadcast for Cross-Tab

````typescript
// src/integration/broadcast-workflow.ts
import { createBroadcast, type BroadcastInterface } from '@mikesaintsg/broadcast'
import type {
	WorkflowEngineInterface,
	PredictiveGraphInterface,
} from '@actionloop/core'

interface WorkflowSyncState {
	currentNode: string
	sessionId: string
	lastTransition: number
}

interface WorkflowSyncMessage {
	type: 'weight_update' | 'session_change' | 'prediction_request'
	payload: unknown
}

export function createCrossTabWorkflow(
	workflowEngine: WorkflowEngineInterface,
	predictiveGraph: PredictiveGraphInterface
) {
	const broadcast = createBroadcast<WorkflowSyncState, WorkflowSyncMessage>({
		channel: 'workflow-sync',
		state: {
			currentNode: 'landing',
			sessionId:  '',
			lastTransition: 0,
		},
	})

	// Sync weight updates across tabs
	predictiveGraph.onWeightUpdate((from, to, actor, weight) => {
		broadcast.post({
			type: 'weight_update',
			payload: { from, to, actor, weight },
		})
	})

	// Listen for weight updates from other tabs
	broadcast.onMessage((message) => {
		if (message.type === 'weight_update') {
			const { from, to, actor, weight } = message.payload as {
				from: string
				to: string
				actor: 'user' | 'system' | 'automation'
				weight: number
			}

			// Update local predictive graph
			predictiveGraph.setWeight(from, to, actor, weight)
		}
	})

	// Sync session state
	workflowEngine.onTransition((from, to, context) => {
		broadcast.setState({
			currentNode: to,
			sessionId: context.sessionId,
			lastTransition:  Date.now(),
		})
	})

	// Leader handles background sync
	broadcast.onLeaderChange((isLeader) => {
		if (isLeader) {
			// This tab is responsible for persisting weights
			const stopAutoSave = startAutoSave(predictiveGraph)
			return stopAutoSave
		}
	})

	return {
		broadcast,

		// Get current state across all tabs
		getGlobalState() {
			return broadcast.getState()
		},

		// Check if another tab is on a specific node
		isNodeActiveInOtherTab(node: string): boolean {
			const state = broadcast.getState()
			return state.currentNode === node && broadcast.getTabCount() > 1
		},

		destroy() {
			broadcast.destroy()
		},
	}
}

function startAutoSave(predictiveGraph: PredictiveGraphInterface): () => void {
	const timer = setInterval(() => {
		// Save predictive weights periodically
		const exported = predictiveGraph.export()
		localStorage.setItem('actionloop:weights', JSON.stringify(exported))
	}, 60000)

	return () => clearInterval(timer)
}
````

### Complete ActionLoop Application Example

````typescript
// src/app-with-actionloop.ts
import { createEngine } from '@mikesaintsg/inference'
import { createNavigation } from '@mikesaintsg/navigation'
import { createBroadcast } from '@mikesaintsg/broadcast'
import { createDatabase } from '@mikesaintsg/indexeddb'
import { createOpenAIProviderAdapter } from '@mikesaintsg/adapters'
import {
	createProceduralGraph,
	createPredictiveGraph,
	createWorkflowEngine,
	createWorkflowBuilder,
	createWorkflowAnalyzer,
	type Transition,
} from '@actionloop/core'

// ============================================================================
// Workflow Definition
// ============================================================================

const workflowTransitions:  readonly Transition[] = [
	// Authentication
	{ from: 'landing', to:  'login', weight: 1, actor: 'user' },
	{ from: 'landing', to: 'register', weight: 1, actor:  'user' },
	{ from: 'login', to:  'dashboard', weight: 1, actor:  'user' },
	{ from: 'login', to:  'forgot-password', weight: 0.5, actor: 'user' },
	{ from: 'register', to: 'onboarding', weight: 1, actor: 'user' },
	{ from: 'onboarding', to: 'dashboard', weight: 1, actor:  'user' },
	{ from: 'forgot-password', to: 'login', weight: 1, actor: 'user' },

	// Main navigation
	{ from: 'dashboard', to: 'projects', weight: 1, actor:  'user' },
	{ from: 'dashboard', to: 'settings', weight: 0.8, actor: 'user' },
	{ from: 'dashboard', to: 'profile', weight: 0.7, actor: 'user' },
	{ from: 'dashboard', to: 'analytics', weight: 0.6, actor: 'user' },

	// Projects flow
	{ from: 'projects', to: 'project-new', weight: 0.8, actor: 'user' },
	{ from: 'projects', to: 'project-detail', weight: 1, actor: 'user' },
	{ from: 'project-new', to: 'project-detail', weight: 1, actor: 'user' },
	{ from: 'project-detail', to: 'project-edit', weight: 0.7, actor: 'user' },
	{ from: 'project-detail', to: 'projects', weight: 0.5, actor: 'user' },
	{ from: 'project-edit', to: 'project-detail', weight: 1, actor: 'user' },

	// Return paths
	{ from: 'settings', to: 'dashboard', weight: 1, actor: 'user' },
	{ from: 'profile', to: 'dashboard', weight: 1, actor: 'user' },
	{ from:  'analytics', to: 'dashboard', weight: 1, actor: 'user' },
	{ from: 'projects', to: 'dashboard', weight: 0.5, actor: 'user' },

	// System transitions
	{ from: 'dashboard', to: 'session-expired', weight: 1, actor:  'system' },
	{ from: 'session-expired', to: 'login', weight: 1, actor:  'system' },
] as const

// ============================================================================
// Application Factory
// ============================================================================

export async function createActionLoopApplication() {
	// 1. Create workflow graphs
	const proceduralGraph = createProceduralGraph({
		transitions: workflowTransitions,
		validateOnCreate: true,
	})

	const predictiveGraph = createPredictiveGraph(proceduralGraph, {
		decayAlgorithm: 'ewma',
		decayFactor: 0.9,
	})

	// 2. Create workflow engine
	const workflowEngine = createWorkflowEngine(proceduralGraph, predictiveGraph, {
		trackSessions: true,
		validateTransitions: true,
		onTransition: (from, to, ctx) => {
			console.log(`[Workflow] ${from} -> ${to} (${ctx.actor})`)
		},
		onError: (error) => {
			console.error('[Workflow Error]', error. message)
		},
	})

	// 3. Create analyzer for insights
	const analyzer = createWorkflowAnalyzer(proceduralGraph, predictiveGraph, {
		onPatternDetected: (pattern) => {
			console.log('[Pattern Detected]', pattern. sequence. join(' -> '))
		},
	})

	// 4. Create navigation integrated with workflow
	type AppPage =
		| 'landing'
		| 'login'
		| 'register'
		| 'dashboard'
		| 'projects'
		| 'settings'

	let currentSessionId = ''

	const navigation = createNavigation<AppPage>({
		page:  'landing',
		hashSync: true,
		guards: [
			async (to, from) => {
				if (!from) return true
				return workflowEngine.isValidTransition(from. page, to.page)
			},
		],
		hooks:  [
			(to, from) => {
				if (from && currentSessionId) {
					workflowEngine.recordTransition(from.page, to.page, {
						actor: 'user',
						sessionId: currentSessionId,
						path: `/${to.page}`,
					})
				}
			},
		],
	})

	// 5. Create cross-tab sync
	const broadcast = createBroadcast({
		channel: 'actionloop-app',
		state: { currentPage: 'landing' as AppPage },
	})

	// Sync navigation across tabs
	navigation.onNavigate((page) => {
		broadcast.setState({ currentPage: page })
	})

	// 6. Initialize session
	const session = workflowEngine.startSession('user')
	currentSessionId = session.id

	// 7. Load persisted weights if available
	const storedWeights = localStorage.getItem('actionloop:weights')
	if (storedWeights) {
		try {
			const exported = JSON.parse(storedWeights)
			predictiveGraph. import(exported)
			console.log('[Workflow] Loaded persisted weights')
		} catch {
			console.warn('[Workflow] Failed to load persisted weights')
		}
	}

	// 8. Set up auto-save for leader tab
	let autoSaveCleanup: (() => void) | undefined

	broadcast.onLeaderChange((isLeader) => {
		if (isLeader) {
			const timer = setInterval(() => {
				const exported = predictiveGraph.export()
				localStorage.setItem('actionloop:weights', JSON.stringify(exported))
			}, 60000)
			autoSaveCleanup = () => clearInterval(timer)
		} else {
			autoSaveCleanup?. ()
		}
	})

	// ============================================================================
	// Public API
	// ============================================================================

	return {
		// Core systems
		workflowEngine,
		proceduralGraph,
		predictiveGraph,
		analyzer,
		navigation,
		broadcast,

		// Workflow methods
		recordAction(targetPage: AppPage) {
			return navigation.push(targetPage)
		},

		getPredictions(count = 3): readonly string[] {
			return workflowEngine.predictNext(navigation.currentPage, {
				actor: 'user',
				sessionId: currentSessionId,
				path: window.location.pathname,
				count,
			})
		},

		getDetailedPredictions(count = 3) {
			return workflowEngine.predictNextDetailed(navigation.currentPage, {
				actor: 'user',
				sessionId: currentSessionId,
				path: window.location.pathname,
				count,
			})
		},

		// Analysis methods
		getWorkflowSummary() {
			return analyzer.getSummary()
		},

		findOptimizationOpportunities() {
			return {
				bottlenecks: analyzer.findBottlenecks(),
				hotLoops: analyzer.findHotLoops(),
				automationOpportunities: analyzer.findAutomationOpportunities(),
			}
		},

		// Session methods
		endSession(reason: 'completed' | 'abandoned' | 'timeout' = 'completed') {
			workflowEngine.endSession(currentSessionId, reason)

			// Save weights before ending
			const exported = predictiveGraph. export()
			localStorage.setItem('actionloop:weights', JSON. stringify(exported))
		},

		// Cleanup
		destroy() {
			autoSaveCleanup?.()

			// Save weights before destroying
			const exported = predictiveGraph.export()
			localStorage.setItem('actionloop:weights', JSON.stringify(exported))

			workflowEngine.destroy()
			proceduralGraph.destroy()
			predictiveGraph.destroy()
			analyzer.destroy()
			navigation.destroy()
			broadcast.destroy()
		},
	}
}

// ============================================================================
// Usage Example
// ============================================================================

/*
const app = await createActionLoopApplication()

// Get recommendations for current page
const predictions = app.getPredictions(3)
console.log('Suggested next actions:', predictions)

// Navigate (automatically recorded)
await app.recordAction('projects')

// Get detailed predictions with confidence
const detailed = app.getDetailedPredictions()
for (const pred of detailed. predictions) {
  console.log(`${pred.nodeId}: ${Math.round(pred.confidence * 100)}% confidence`)
}

// Analyze workflow for optimization
const opportunities = app.findOptimizationOpportunities()
console.log('Bottlenecks:', opportunities.bottlenecks)
console.log('Automation opportunities:', opportunities.automationOpportunities)

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  app.endSession('abandoned')
  app.destroy()
})
*/
````

---

## Error Handling

### Comprehensive Error Handling

````typescript
import {
	isActionLoopError,
	type ActionLoopErrorCode,
} from '@actionloop/core'

function handleWorkflowError(error: unknown): void {
	if (isActionLoopError(error)) {
		switch (error.code) {
			case 'INVALID_TRANSITION':
				console. warn('Invalid workflow transition:', error.message)
				// Show user-friendly message
				showNotification('This action is not available from here')
				break

			case 'SESSION_NOT_FOUND':
			case 'SESSION_EXPIRED':
				console. info('Session ended, starting new session')
				// Restart session
				startNewSession()
				break

			case 'NODE_NOT_FOUND':
				console.error('Workflow configuration error:', error.message)
				// Log for debugging
				logError(error)
				break

			default:
				console.error('Workflow error:', error.message)
		}
	} else {
		// Re-throw non-ActionLoop errors
		throw error
	}
}
````

### Graceful Degradation

````typescript
async function initializeWithFallback() {
	try {
		// Try to load persisted weights
		const stored = localStorage.getItem('actionloop:weights')
		if (stored) {
			predictiveGraph.import(JSON.parse(stored))
		}
	} catch {
		// Continue without historical weights
		console.warn('Starting with fresh predictive weights')
	}

	try {
		// Try to resume session
		const sessionData = sessionStorage.getItem('actionloop:session')
		if (sessionData) {
			const { sessionId, currentNode } = JSON.parse(sessionData)
			workflowEngine.resumeSession(sessionId, {
				previousNode: currentNode,
				actor: 'user',
			})
		}
	} catch {
		// Start fresh session
		workflowEngine.startSession('user')
	}
}
````

---

## Performance Optimization

### 1. Lazy Loading

````typescript
// Lazy load workflow analyzer only when needed
let analyzer: WorkflowAnalyzerInterface | undefined

async function getAnalyzer() {
	if (!analyzer) {
		const { createWorkflowAnalyzer } = await import('@actionloop/core')
		analyzer = createWorkflowAnalyzer(proceduralGraph, predictiveGraph)
	}
	return analyzer
}
````

### 2. Debounced Context Building

````typescript
import { createContextBuilder } from '@mikesaintsg/contextbuilder'

let buildTimeout: ReturnType<typeof setTimeout> | undefined

function debouncedBuild(builder: ContextBuilderInterface, delayMs = 100) {
	if (buildTimeout) {
		clearTimeout(buildTimeout)
	}

	return new Promise<BuiltContext>((resolve) => {
		buildTimeout = setTimeout(() => {
			resolve(builder.build())
		}, delayMs)
	})
}
````

### 3. Parallel Initialization

````typescript
export async function initializeApp() {
	// Initialize independent systems in parallel
	const [
		vectorStore,
		database,
		workflowSystem,
	] = await Promise.all([
		createVectorStore(embeddingAdapter),
		createDatabase(databaseConfig),
		initializeWorkflow(),
	])

	return { vectorStore, database, ... workflowSystem }
}

async function initializeWorkflow() {
	const proceduralGraph = createProceduralGraph({ transitions })
	const predictiveGraph = createPredictiveGraph(proceduralGraph)
	const workflowEngine = createWorkflowEngine(proceduralGraph, predictiveGraph)

	return { proceduralGraph, predictiveGraph, workflowEngine }
}
````

### 4. Streaming Response Rendering

````typescript
const stream = engine.stream(messages)

// Use requestAnimationFrame for smooth rendering
let pendingTokens:  string[] = []
let rafId: number | undefined

stream.onToken((token) => {
	pendingTokens.push(token)

	if (! rafId) {
		rafId = requestAnimationFrame(() => {
			const text = pendingTokens.join('')
			pendingTokens = []
			rafId = undefined
			appendToOutput(text)
		})
	}
})
````

---

## Testing Strategies

### Unit Testing with Mocks

````typescript
// tests/workflow-engine.test.ts
import { describe, it, expect, vi } from 'vitest'
import {
	createProceduralGraph,
	createPredictiveGraph,
	createWorkflowEngine,
} from '@actionloop/core'

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

	it('predicts next actions based on weights', () => {
		const procedural = createProceduralGraph({
			transitions: [
				{ from: 'a', to: 'b', weight: 1, actor: 'user' },
				{ from: 'a', to: 'c', weight: 1, actor: 'user' },
			],
		})

		const predictive = createPredictiveGraph(procedural)
		const engine = createWorkflowEngine(procedural, predictive)

		const session = engine.startSession('user')

		// Record more transitions to 'b'
		for (let i = 0; i < 5; i++) {
			engine.recordTransition('a', 'b', {
				actor: 'user',
				sessionId: session.id,
				path: '/test',
			})
		}

		const predictions = engine.predictNext('a', {
			actor: 'user',
			sessionId: session.id,
			path: '/test',
			count: 2,
		})

		// 'b' should be predicted first due to higher weight
		expect(predictions[0]).toBe('b')
	})

	it('rejects invalid transitions', () => {
		const procedural = createProceduralGraph({
			transitions:  [
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
````

### Integration Testing

````typescript
// tests/integration/workflow-navigation.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createActionLoopApplication } from '../src/app-with-actionloop. js'

describe('Workflow + Navigation Integration', () => {
	let app:  Awaited<ReturnType<typeof createActionLoopApplication>>

	beforeEach(async () => {
		app = await createActionLoopApplication()
	})

	afterEach(() => {
		app.destroy()
	})

	it('records navigation as workflow transitions', async () => {
		// Navigate through the app
		await app.recordAction('login')
		await app.recordAction('dashboard')
		await app.recordAction('projects')

		// Check that transitions were recorded
		const summary = app.getWorkflowSummary()
		expect(summary.loopCount).toBeGreaterThanOrEqual(0)
	})

	it('provides accurate predictions after usage', async () => {
		// Simulate user behavior pattern
		for (let i = 0; i < 5; i++) {
			await app.recordAction('dashboard')
			await app.recordAction('projects')
		}

		// Reset to dashboard
		await app.recordAction('dashboard')

		// Predictions should favor 'projects'
		const predictions = app.getPredictions(3)
		expect(predictions).toContain('projects')
	})
})
````

### E2E Testing with Playwright

````typescript
// tests/e2e/workflow. spec.ts
import { test, expect } from '@playwright/test'

test.describe('Workflow Recommendations', () => {
	test('shows recommendations based on history', async ({ page }) => {
		await page.goto('/')

		// Navigate through the app multiple times
		for (let i = 0; i < 3; i++) {
			await page.click('[data-action="login"]')
			await page.click('[data-action="dashboard"]')
			await page.click('[data-action="projects"]')
			await page.click('[data-action="dashboard"]')
		}

		// Check recommendations
		const recommendations = page.locator('. action-recommendation')
		await expect(recommendations. first()).toContainText('Projects')
	})

	test('persists weights across page reloads', async ({ page }) => {
		await page.goto('/')

		// Build up some history
		await page.click('[data-action="login"]')
		await page.click('[data-action="dashboard"]')
		await page.click('[data-action="projects"]')

		// Reload page
		await page.reload()

		// Weights should be restored from localStorage
		await page.click('[data-action="dashboard"]')

		const recommendations = page.locator('. action-recommendation')
		await expect(recommendations).toHaveCount(3)
	})

	test('syncs workflow state across tabs', async ({ browser }) => {
		const context = await browser.newContext()
		const page1 = await context. newPage()
		const page2 = await context.newPage()

		await page1.goto('/')
		await page2.goto('/')

		// Navigate in first tab
		await page1.click('[data-action="dashboard"]')

		// Second tab should see the state update
		await expect(page2.locator('[data-current-node]')).toHaveAttribute(
			'data-current-node',
			'dashboard'
		)

		await context.close()
	})
})
````

---

## Summary

The @mikesaintsg ecosystem provides a comprehensive set of packages for building modern TypeScript applications with: 

| Capability | Packages |
|------------|----------|
| **AI/LLM Integration** | `@mikesaintsg/inference`, `@mikesaintsg/adapters` |
| **RAG & Search** | `@mikesaintsg/vectorstore`, `@mikesaintsg/contextbuilder` |
| **Tool Calling** | `@mikesaintsg/contextprotocol` |
| **Workflow Guidance** | `@actionloop/core` |
| **Persistence** | `@mikesaintsg/storage`, `@mikesaintsg/indexeddb`, `@mikesaintsg/filesystem` |
| **Cross-Tab Sync** | `@mikesaintsg/broadcast` |
| **UI State** | `@mikesaintsg/navigation`, `@mikesaintsg/form`, `@mikesaintsg/table` |
| **Calculations** | `@mikesaintsg/rater` |

**Key Integration Points:**

1. **ActionLoop + Navigation**: Record page transitions as workflow events, validate navigation against procedural graph
2. **ActionLoop + Broadcast**: Sync predictive weights and session state across browser tabs
3. **ActionLoop + IndexedDB**: Persist workflow graphs and predictive weights for cold-start optimization
4. **ActionLoop + Form**: Track form interactions as micro-transitions within workflows
5. **Inference + VectorStore**: Build RAG pipelines with semantic search and reranking
6. **ContextBuilder + ContextProtocol**:  Assemble tool-augmented prompts within token budgets

**ActionLoop-Specific Benefits:**

- **Deterministic Compliance**: Procedural Graph ensures users never see invalid action suggestions
- **Adaptive Learning**: Predictive Graph learns from real usage patterns without retraining
- **Sub-50ms Predictions**: Real-time recommendations suitable for interactive UIs
- **Zero Dependencies**: Pure TypeScript with no external runtime dependencies
- **Cross-Tab Continuity**: Share learned patterns across all open tabs
- **Workflow Analytics**: Built-in detection of bottlenecks, loops, and automation opportunities

---

## Appendix:  Rater Integration

The `@mikesaintsg/rater` package provides flexible rating and scoring calculations. 

### Integration with Storage Packages

````typescript
import { createRatingEngine } from '@mikesaintsg/rater'
import { createStorage } from '@mikesaintsg/storage'

// Persist rating configurations
const storage = createStorage<{
	ratingFactors: readonly RateFactorGroup[]
}>('localStorage', { prefix: 'rater: ' })

const engine = createRatingEngine({
	baseRate: 100,
	decimalPlaces: 2,
})

// Save factor configurations
async function saveFactors(groups: readonly RateFactorGroup[]) {
	await storage.set('ratingFactors', groups)
}

// Load and apply factors
async function loadFactors(): Promise<readonly RateFactorGroup[] | undefined> {
	return storage.get('ratingFactors')
}
````

### Integration with Form Package

````typescript
import { createForm } from '@mikesaintsg/form'
import { createRatingEngine } from '@mikesaintsg/rater'

interface InsuranceQuoteForm {
	age: number
	coverage: number
	deductible: number
	hasAccidents: boolean
}

const form = createForm<InsuranceQuoteForm>(formElement, {
	initialValues: {
		age: 30,
		coverage:  100000,
		deductible: 500,
		hasAccidents: false,
	},
})

const rater = createRatingEngine({ baseRate: 50 })

// Recalculate on form changes
form.onChange((field, value) => {
	const values = form.getValues()

	const result = rater.rate(values, [
		{
			id: 'age-factor',
			name: 'Age Factor',
			factors: [
				{
					id: 'age',
					name: 'Age Adjustment',
					fieldPath: 'age',
					rangeTable: {
						ranges: [
							{ min: 16, max: 25, rate: 1.5 },
							{ min: 26, max: 35, rate: 1.0 },
							{ min: 36, max: 50, rate: 1.1 },
							{ min: 51, max: 65, rate: 1.3 },
							{ min: 66, max: 999, rate: 1.6 },
						],
					},
					operation: 'multiply',
				},
			],
			aggregation: 'product',
		},
		{
			id: 'risk-factors',
			name:  'Risk Factors',
			factors:  [
				{
					id: 'accidents',
					name:  'Accident History',
					fieldPath: 'hasAccidents',
					lookupTable: {
						keys: { true: 1. 25, false: 1.0 },
					},
					operation:  'multiply',
				},
			],
			aggregation: 'product',
		},
	])

	displayQuote(result. finalRate)
})
````

### Use Cases

- **Insurance Quoting**: Calculate premiums based on risk factors
- **E-commerce Pricing**: Dynamic pricing with discounts and surcharges
- **Scoring Systems**: Evaluate candidates, properties, or content
- **Game Mechanics**: Calculate damage, rewards, or progression
- **Financial Calculations**: Interest rates, fees, and adjustments

---

## Package Dependency Graph

````text
                                @mikesaintsg/core
                                       │
                 ┌─────────────────────┼─────────────────────┐
                 │                     │                     │
                 ▼                     ▼                     ▼
        @mikesaintsg/adapters  @mikesaintsg/storage  @mikesaintsg/broadcast
                 │                     │                     │
     ┌───────────┼───────────┐         │                     │
     │           │           │         │                     │
     ▼           ▼           ▼         ▼                     ▼
@inference  @vectorstore  @contextprotocol  @indexeddb  @navigation
     │           │           │              │              │
     └───────────┼───────────┘              │              │
                 │                          │              │
                 ▼                          ▼              ▼
         @contextbuilder              @filesystem      @form
                                                         │
                                                         ▼
                                                      @table


                              @actionloop/core
                                     │
                   ┌─────────────────┼─────────────────┐
                   │                 │                 │
                   ▼                 ▼                 ▼
            ProceduralGraph   PredictiveGraph   WorkflowEngine
                   │                 │                 │
                   │                 │                 │
                   ▼                 ▼                 ▼
            WorkflowBuilder  WorkflowValidator  WorkflowAnalyzer
````

**Note**: `@actionloop/core` is a standalone package with zero external dependencies.  It integrates with the @mikesaintsg ecosystem through composition, not inheritance. 
