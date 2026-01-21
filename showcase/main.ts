import './styles.css'
import {
	createProceduralGraph,
	createPredictiveGraph,
	createWorkflowEngine,
	createWorkflowBuilder,
	createWorkflowValidator,
	createWorkflowAnalyzer,
	createActivityTracker,
	createActionLoopContextFormatter,
	type Transition,
	type ValidationResult,
	type PredictionResult,
	type DetailedPrediction,
	type LoopInfo,
	type BottleneckInfo,
	type AutomationOpportunity,
} from '@mikesaintsg/actionloop'

// ============================================================================
// Scenario Definitions - Real-World Use Cases
// ============================================================================

interface ScenarioConfig {
	id: string
	name: string
	icon: string
	description: string
	nodes: { id: string; label: string; icon: string }[]
	transitions: { from: string; to: string; weight: number; actor: 'user' | 'system' | 'automation' }[]
	preloadRecords?: { from: string; to: string; actor: 'user' | 'system' | 'automation'; count: number }[]
	startNode: string
}

const SCENARIOS: ScenarioConfig[] = [
	{
		id: 'ecommerce',
		name: 'E-Commerce Checkout',
		icon: '🛒',
		description: 'Cyclical checkout flow - users can browse, buy, and return for more',
		startNode: 'browse',
		nodes: [
			{ id: 'browse', label: 'Browse Products', icon: '🛍️' },
			{ id: 'product', label: 'Product Details', icon: '📦' },
			{ id: 'cart', label: 'Shopping Cart', icon: '🛒' },
			{ id: 'shipping', label: 'Shipping Info', icon: '🚚' },
			{ id: 'payment', label: 'Payment', icon: '💳' },
			{ id: 'review', label: 'Order Review', icon: '📋' },
			{ id: 'confirm', label: 'Confirmation', icon: '✅' },
		],
		transitions: [
			// Browse cycle - users explore products
			{ from: 'browse', to: 'product', weight: 2, actor: 'user' },
			{ from: 'browse', to: 'cart', weight: 1, actor: 'user' },
			{ from: 'product', to: 'browse', weight: 1, actor: 'user' },
			{ from: 'product', to: 'cart', weight: 2, actor: 'user' },
			// Cart can go back or forward
			{ from: 'cart', to: 'browse', weight: 1, actor: 'user' },
			{ from: 'cart', to: 'shipping', weight: 2, actor: 'user' },
			// Checkout flow with back navigation
			{ from: 'shipping', to: 'cart', weight: 1, actor: 'user' },
			{ from: 'shipping', to: 'payment', weight: 2, actor: 'user' },
			{ from: 'payment', to: 'shipping', weight: 1, actor: 'user' },
			{ from: 'payment', to: 'review', weight: 2, actor: 'user' },
			{ from: 'review', to: 'payment', weight: 1, actor: 'user' },
			{ from: 'review', to: 'confirm', weight: 3, actor: 'user' },
			// After confirmation, loop back to browse (continue shopping)
			{ from: 'confirm', to: 'browse', weight: 2, actor: 'user' },
		],
		preloadRecords: [
			{ from: 'browse', to: 'product', actor: 'user', count: 200 },
			{ from: 'product', to: 'cart', actor: 'user', count: 80 },
			{ from: 'cart', to: 'shipping', actor: 'user', count: 60 },
			{ from: 'shipping', to: 'payment', actor: 'user', count: 55 },
			{ from: 'payment', to: 'review', actor: 'user', count: 50 },
			{ from: 'review', to: 'confirm', actor: 'user', count: 48 },
			{ from: 'confirm', to: 'browse', actor: 'user', count: 30 },
		],
	},
	{
		id: 'saas',
		name: 'SaaS Dashboard',
		icon: '📊',
		description: 'Cyclical navigation through account management features',
		startNode: 'dashboard',
		nodes: [
			{ id: 'dashboard', label: 'Dashboard', icon: '📊' },
			{ id: 'analytics', label: 'Analytics', icon: '📈' },
			{ id: 'reports', label: 'Reports', icon: '📄' },
			{ id: 'settings', label: 'Settings', icon: '⚙️' },
			{ id: 'billing', label: 'Billing', icon: '💰' },
			{ id: 'team', label: 'Team', icon: '👥' },
			{ id: 'profile', label: 'Profile', icon: '👤' },
		],
		transitions: [
			// Dashboard is the hub - all roads lead back
			{ from: 'dashboard', to: 'analytics', weight: 2, actor: 'user' },
			{ from: 'dashboard', to: 'reports', weight: 1, actor: 'user' },
			{ from: 'dashboard', to: 'settings', weight: 1, actor: 'user' },
			{ from: 'dashboard', to: 'billing', weight: 1, actor: 'user' },
			{ from: 'dashboard', to: 'team', weight: 1, actor: 'user' },
			// Analytics cycle
			{ from: 'analytics', to: 'dashboard', weight: 1, actor: 'user' },
			{ from: 'analytics', to: 'reports', weight: 2, actor: 'user' },
			{ from: 'reports', to: 'dashboard', weight: 1, actor: 'user' },
			{ from: 'reports', to: 'analytics', weight: 1, actor: 'user' },
			// Settings area with loops
			{ from: 'settings', to: 'dashboard', weight: 1, actor: 'user' },
			{ from: 'settings', to: 'profile', weight: 2, actor: 'user' },
			{ from: 'settings', to: 'billing', weight: 1, actor: 'user' },
			{ from: 'profile', to: 'settings', weight: 1, actor: 'user' },
			{ from: 'profile', to: 'dashboard', weight: 1, actor: 'user' },
			// Billing
			{ from: 'billing', to: 'dashboard', weight: 1, actor: 'user' },
			{ from: 'billing', to: 'settings', weight: 1, actor: 'user' },
			// Team
			{ from: 'team', to: 'dashboard', weight: 1, actor: 'user' },
			{ from: 'team', to: 'settings', weight: 1, actor: 'user' },
		],
		preloadRecords: [
			{ from: 'dashboard', to: 'analytics', actor: 'user', count: 200 },
			{ from: 'analytics', to: 'reports', actor: 'user', count: 120 },
			{ from: 'dashboard', to: 'billing', actor: 'user', count: 80 },
			{ from: 'settings', to: 'profile', actor: 'user', count: 60 },
			{ from: 'analytics', to: 'dashboard', actor: 'user', count: 150 },
		],
	},
	{
		id: 'support',
		name: 'Support Ticketing',
		icon: '🎫',
		description: 'Cyclical ticket lifecycle - tickets can reopen and escalate',
		startNode: 'inbox',
		nodes: [
			{ id: 'inbox', label: 'Ticket Inbox', icon: '📥' },
			{ id: 'triage', label: 'Triage', icon: '🔍' },
			{ id: 'assigned', label: 'Assigned', icon: '👤' },
			{ id: 'in_progress', label: 'In Progress', icon: '🔧' },
			{ id: 'waiting', label: 'Waiting Response', icon: '⏳' },
			{ id: 'escalated', label: 'Escalated', icon: '⚠️' },
			{ id: 'resolved', label: 'Resolved', icon: '✅' },
			{ id: 'closed', label: 'Closed', icon: '📁' },
		],
		transitions: [
			// Ticket intake
			{ from: 'inbox', to: 'triage', weight: 2, actor: 'user' },
			{ from: 'inbox', to: 'triage', weight: 1, actor: 'automation' },
			// Triage to assignment
			{ from: 'triage', to: 'assigned', weight: 2, actor: 'user' },
			{ from: 'triage', to: 'assigned', weight: 1, actor: 'automation' },
			{ from: 'triage', to: 'inbox', weight: 1, actor: 'user' },
			// Assignment to work
			{ from: 'assigned', to: 'in_progress', weight: 2, actor: 'user' },
			{ from: 'assigned', to: 'triage', weight: 1, actor: 'user' },
			// In progress - multiple paths
			{ from: 'in_progress', to: 'waiting', weight: 1, actor: 'user' },
			{ from: 'in_progress', to: 'escalated', weight: 1, actor: 'user' },
			{ from: 'in_progress', to: 'resolved', weight: 2, actor: 'user' },
			// Waiting - can return to in_progress or resolve
			{ from: 'waiting', to: 'in_progress', weight: 2, actor: 'user' },
			{ from: 'waiting', to: 'resolved', weight: 1, actor: 'user' },
			{ from: 'waiting', to: 'closed', weight: 1, actor: 'system' },
			// Escalation can return to normal flow
			{ from: 'escalated', to: 'in_progress', weight: 1, actor: 'user' },
			{ from: 'escalated', to: 'resolved', weight: 2, actor: 'user' },
			// Resolution to closure
			{ from: 'resolved', to: 'closed', weight: 2, actor: 'user' },
			{ from: 'resolved', to: 'closed', weight: 1, actor: 'automation' },
			{ from: 'resolved', to: 'in_progress', weight: 1, actor: 'user' },
			// Closed tickets can reopen (cyclical)
			{ from: 'closed', to: 'inbox', weight: 1, actor: 'user' },
		],
		preloadRecords: [
			{ from: 'inbox', to: 'triage', actor: 'automation', count: 500 },
			{ from: 'triage', to: 'assigned', actor: 'automation', count: 450 },
			{ from: 'assigned', to: 'in_progress', actor: 'user', count: 400 },
			{ from: 'in_progress', to: 'resolved', actor: 'user', count: 350 },
			{ from: 'resolved', to: 'closed', actor: 'automation', count: 340 },
			{ from: 'in_progress', to: 'escalated', actor: 'user', count: 30 },
			{ from: 'closed', to: 'inbox', actor: 'user', count: 20 },
		],
	},
	{
		id: 'onboarding',
		name: 'User Onboarding',
		icon: '🚀',
		description: 'Cyclical onboarding - users can revisit steps and return to tutorial',
		startNode: 'welcome',
		nodes: [
			{ id: 'welcome', label: 'Welcome', icon: '👋' },
			{ id: 'create_account', label: 'Create Account', icon: '📝' },
			{ id: 'verify_email', label: 'Verify Email', icon: '📧' },
			{ id: 'setup_profile', label: 'Setup Profile', icon: '👤' },
			{ id: 'preferences', label: 'Preferences', icon: '⚙️' },
			{ id: 'tutorial', label: 'Tutorial', icon: '📚' },
			{ id: 'complete', label: 'Complete!', icon: '🎉' },
		],
		transitions: [
			// Forward flow
			{ from: 'welcome', to: 'create_account', weight: 2, actor: 'user' },
			{ from: 'create_account', to: 'verify_email', weight: 2, actor: 'user' },
			{ from: 'verify_email', to: 'setup_profile', weight: 2, actor: 'user' },
			{ from: 'setup_profile', to: 'preferences', weight: 2, actor: 'user' },
			{ from: 'preferences', to: 'tutorial', weight: 2, actor: 'user' },
			{ from: 'tutorial', to: 'complete', weight: 2, actor: 'user' },
			// Back navigation (users can go back)
			{ from: 'create_account', to: 'welcome', weight: 1, actor: 'user' },
			{ from: 'verify_email', to: 'create_account', weight: 1, actor: 'user' },
			{ from: 'setup_profile', to: 'verify_email', weight: 1, actor: 'user' },
			{ from: 'preferences', to: 'setup_profile', weight: 1, actor: 'user' },
			{ from: 'tutorial', to: 'preferences', weight: 1, actor: 'user' },
			// Skip paths
			{ from: 'preferences', to: 'complete', weight: 1, actor: 'user' },
			// Cyclical - completed users can revisit tutorial or settings
			{ from: 'complete', to: 'tutorial', weight: 1, actor: 'user' },
			{ from: 'complete', to: 'preferences', weight: 1, actor: 'user' },
			// System can resend verification
			{ from: 'verify_email', to: 'verify_email', weight: 1, actor: 'system' },
		],
		preloadRecords: [
			{ from: 'welcome', to: 'create_account', actor: 'user', count: 1000 },
			{ from: 'create_account', to: 'verify_email', actor: 'user', count: 900 },
			{ from: 'verify_email', to: 'setup_profile', actor: 'user', count: 800 },
			{ from: 'setup_profile', to: 'preferences', actor: 'user', count: 750 },
			{ from: 'preferences', to: 'tutorial', actor: 'user', count: 500 },
			{ from: 'preferences', to: 'complete', actor: 'user', count: 200 },
			{ from: 'tutorial', to: 'complete', actor: 'user', count: 480 },
			{ from: 'complete', to: 'tutorial', actor: 'user', count: 50 },
		],
	},
]

// ============================================================================
// Application State
// ============================================================================

interface TransitionRecord {
	from: string
	to: string
	time: Date
	actor: 'user' | 'system' | 'automation'
}

interface AppState {
	activeScenario: ScenarioConfig
	currentNode: string
	sessionId: string
	transitionHistory: TransitionRecord[]
	predictions: readonly PredictionResult[]
	detailedPrediction: DetailedPrediction | undefined
	engagementState: string
	activeTime: number
	idleTime: number
	actorMode: 'user' | 'system' | 'automation'
	showAnalysis: boolean
	analysisResults: {
		loops: readonly LoopInfo[]
		bottlenecks: readonly BottleneckInfo[]
		opportunities: readonly AutomationOpportunity[]
	}
}

const state: AppState = {
	activeScenario: SCENARIOS[0]!,
	currentNode: SCENARIOS[0]!.startNode,
	sessionId: '',
	transitionHistory: [],
	predictions: [],
	detailedPrediction: undefined,
	engagementState: 'active',
	activeTime: 0,
	idleTime: 0,
	actorMode: 'user',
	showAnalysis: false,
	analysisResults: {
		loops: [],
		bottlenecks: [],
		opportunities: [],
	},
}

// ============================================================================
// ActionLoop Instances
// ============================================================================

let procedural = createProceduralGraph({
	transitions: state.activeScenario.transitions,
	validateOnCreate: true,
})

let predictive = createPredictiveGraph(procedural, {
	decayAlgorithm: 'ewma',
	decayFactor: 0.9,
	coldStart: state.activeScenario.preloadRecords ? {
		strategy: 'preload',
		warmupThreshold: 50,
		preloadRecords: state.activeScenario.preloadRecords,
	} : {
		strategy: 'procedural-weight',
		warmupThreshold: 50,
	},
})

let engine = createWorkflowEngine(procedural, predictive, {
	validateTransitions: true,
	trackSessions: true,
})

let validator = createWorkflowValidator(procedural)
let analyzer = createWorkflowAnalyzer(procedural, predictive)

const activity = createActivityTracker({
	idleThreshold: 10000,
	awayThreshold: 30000,
	onEngagementChange: (newState, nodeId) => {
		state.engagementState = newState
		updateEngagementDisplay(newState, nodeId)
	},
})

const contextFormatter = createActionLoopContextFormatter({
	maxRecentEvents: 10,
	includePatterns: true,
	includeDwell: true,
	getNodeLabel: (nodeId: string) => {
		const node = state.activeScenario.nodes.find(n => n.id === nodeId)
		return node?.label ?? nodeId
	},
})

// Start session
let session = engine.startSession('user')
state.sessionId = session.id
activity.enterNode(state.currentNode)

// ============================================================================
// Scenario Switching
// ============================================================================

function switchScenario(scenarioId: string): void {
	const scenario = SCENARIOS.find(s => s.id === scenarioId)
	if (!scenario) return

	// Clean up old instances
	engine.destroy()
	predictive.destroy()
	procedural.destroy()
	validator.destroy()
	analyzer.destroy()

	// Update state
	state.activeScenario = scenario
	state.currentNode = scenario.startNode
	state.transitionHistory = []
	state.showAnalysis = false

	// Create new instances
	procedural = createProceduralGraph({
		transitions: scenario.transitions,
		validateOnCreate: true,
	})

	predictive = createPredictiveGraph(procedural, {
		decayAlgorithm: 'ewma',
		decayFactor: 0.9,
		coldStart: scenario.preloadRecords ? {
			strategy: 'preload',
			warmupThreshold: 50,
			preloadRecords: scenario.preloadRecords,
		} : {
			strategy: 'procedural-weight',
			warmupThreshold: 50,
		},
	})

	engine = createWorkflowEngine(procedural, predictive, {
		validateTransitions: true,
		trackSessions: true,
	})

	validator = createWorkflowValidator(procedural)
	analyzer = createWorkflowAnalyzer(procedural, predictive)

	// Start new session
	session = engine.startSession('user')
	state.sessionId = session.id

	// Update activity tracker
	activity.exitNode()
	activity.enterNode(state.currentNode)

	render()
}

// ============================================================================
// Engagement Display Update
// ============================================================================

function updateEngagementDisplay(newState: string, nodeId: string): void {
	const engagementEl = document.getElementById('engagement-state')
	if (engagementEl) {
		engagementEl.textContent = `${getEngagementIcon(newState)} ${newState.toUpperCase()}`
		engagementEl.className = `engagement-badge ${newState}`
	}

	const dwellInfo = activity.getCurrentDwell()
	if (dwellInfo) {
		state.activeTime = dwellInfo.activeTime
		state.idleTime = dwellInfo.idleTime
		updateDwellDisplay()
	}

	console.log(`Engagement changed to ${newState} on ${nodeId}`)
}

function updateDwellDisplay(): void {
	const activeEl = document.getElementById('active-time')
	const idleEl = document.getElementById('idle-time')
	if (activeEl) activeEl.textContent = formatDuration(state.activeTime)
	if (idleEl) idleEl.textContent = formatDuration(state.idleTime)
}

function getEngagementIcon(engagement: string): string {
	switch (engagement) {
		case 'active': return '🟢'
		case 'idle': return '🟡'
		case 'away': return '🔴'
		default: return '⚪'
	}
}

function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
	return `${(ms / 60000).toFixed(1)}m`
}

// ============================================================================
// Render Functions
// ============================================================================

function render(): void {
	const app = document.getElementById('app')
	if (!app) return

	// Update predictions with detailed data
	state.detailedPrediction = engine.predictNextDetailed(state.currentNode, {
		actor: state.actorMode,
		sessionId: state.sessionId,
		path: `/${state.currentNode}`,
		count: 5,
	})
	state.predictions = state.detailedPrediction.predictions

	const validTransitions = engine.getValidTransitions(state.currentNode)
	const stats = procedural.getStats()
	const predictiveStats = predictive.getStats()
	const currentNodeInfo = state.activeScenario.nodes.find(n => n.id === state.currentNode)

	app.innerHTML = `
		<div class="container">
			<header>
				<h1>🔄 ActionLoop Showcase</h1>
				<p class="subtitle">Predictive Procedural Action Loop System — Real-World Examples</p>
			</header>

			<!-- Scenario Tabs -->
			<nav class="scenario-tabs">
				${SCENARIOS.map(s => `
					<button
						class="scenario-tab ${s.id === state.activeScenario.id ? 'active' : ''}"
						data-scenario="${s.id}"
					>
						<span class="tab-icon">${s.icon}</span>
						<span class="tab-name">${s.name}</span>
					</button>
				`).join('')}
			</nav>

			<div class="scenario-description">
				<strong>${state.activeScenario.icon} ${state.activeScenario.name}</strong>
				<span>${state.activeScenario.description}</span>
			</div>

			<div class="grid">
				<!-- Current State & Engagement -->
				<section class="card current-state">
					<h2>📍 Current Location</h2>
					<div class="state-display">
						<span class="node-icon">${currentNodeInfo?.icon ?? '📍'}</span>
						<span class="node-badge current">${currentNodeInfo?.label ?? state.currentNode}</span>
					</div>
					<div class="engagement-info">
						<div class="engagement-row">
							<span class="label">Engagement:</span>
							<span id="engagement-state" class="engagement-badge ${state.engagementState}">
								${getEngagementIcon(state.engagementState)} ${state.engagementState.toUpperCase()}
							</span>
						</div>
						<div class="dwell-stats">
							<div class="dwell-stat">
								<span class="dwell-label">Active:</span>
								<span id="active-time" class="dwell-value">${formatDuration(state.activeTime)}</span>
							</div>
							<div class="dwell-stat">
								<span class="dwell-label">Idle:</span>
								<span id="idle-time" class="dwell-value">${formatDuration(state.idleTime)}</span>
							</div>
						</div>
					</div>
					<div class="session-info">
						<small>Session: ${state.sessionId.slice(0, 8)}...</small>
					</div>
				</section>

				<!-- Predictions with Confidence -->
				<section class="card predictions">
					<h2>🔮 AI Predictions</h2>
					<div class="warmup-status ${state.detailedPrediction?.warmupComplete ? 'warm' : 'cold'}">
						${state.detailedPrediction?.warmupComplete
		? '✅ Predictions are reliable (warm)'
		: `⏳ Warming up (${state.detailedPrediction?.transitionCount ?? 0}/50 transitions)`
}
					</div>
					<div class="prediction-list">
						${state.predictions.length > 0
		? state.predictions.map((p, i) => renderPrediction(p, i)).join('')
		: '<p class="empty">No predictions (end node or cold start)</p>'
}
					</div>
				</section>

				<!-- Actor Mode Selection -->
				<section class="card actor-mode">
					<h2>👤 Actor Mode</h2>
					<p class="description">Select who is performing actions:</p>
					<div class="actor-buttons">
						<button class="actor-btn ${state.actorMode === 'user' ? 'active' : ''}" data-actor="user">
							👤 User
						</button>
						<button class="actor-btn ${state.actorMode === 'system' ? 'active' : ''}" data-actor="system">
							⚙️ System
						</button>
						<button class="actor-btn ${state.actorMode === 'automation' ? 'active' : ''}" data-actor="automation">
							🤖 Automation
						</button>
					</div>
					<div class="actor-description">
						${getActorDescription(state.actorMode)}
					</div>
				</section>

				<!-- Valid Actions Grid -->
				<section class="card valid-actions">
					<h2>✅ Available Actions</h2>
					<p class="description">All valid transitions from current location:</p>
					<div class="action-grid">
						${validTransitions.map((t: Transition) => {
		const targetNode = state.activeScenario.nodes.find(n => n.id === t.to)
		const prediction = state.predictions.find(p => p.nodeId === t.to)
		return `
								<button class="action-card" data-target="${t.to}">
									<span class="action-icon">${targetNode?.icon ?? '📍'}</span>
									<span class="action-name">${targetNode?.label ?? t.to}</span>
									<span class="action-actor">${getActorBadge(t.actor)}</span>
									${prediction ? `<span class="action-confidence">${Math.round(prediction.confidence * 100)}%</span>` : ''}
								</button>
							`
	}).join('')}
					</div>
				</section>

				<!-- Transition History -->
				<section class="card history">
					<h2>📜 Journey History</h2>
					<div class="history-list">
						${state.transitionHistory.length > 0
		? state.transitionHistory.slice(-8).reverse().map(renderHistoryItem).join('')
		: '<p class="empty">No transitions recorded yet. Click an action to start!</p>'
}
					</div>
				</section>

				<!-- Graph Statistics -->
				<section class="card stats">
					<h2>📈 Graph Statistics</h2>
					<div class="stats-grid">
						<div class="stat">
							<span class="value">${stats.nodeCount}</span>
							<span class="label">Nodes</span>
						</div>
						<div class="stat">
							<span class="value">${stats.transitionCount}</span>
							<span class="label">Transitions</span>
						</div>
						<div class="stat">
							<span class="value">${predictiveStats.totalWeightUpdates}</span>
							<span class="label">Weight Updates</span>
						</div>
						<div class="stat highlight">
							<span class="value">${predictiveStats.warmupComplete ? '✓' : '...'}</span>
							<span class="label">Warm Status</span>
						</div>
					</div>
					<div class="actor-stats">
						<span class="actor-stat">👤 User: ${stats.actorCounts.user}</span>
						<span class="actor-stat">⚙️ System: ${stats.actorCounts.system}</span>
						<span class="actor-stat">🤖 Auto: ${stats.actorCounts.automation}</span>
					</div>
				</section>
			</div>

			<!-- Workflow Visualization -->
			<section class="card workflow-viz">
				<h2>🗺️ Workflow Map</h2>
				<div class="workflow-nodes">
					${state.activeScenario.nodes.map(n => `
						<div class="workflow-node ${n.id === state.currentNode ? 'current' : ''} ${state.predictions.some(p => p.nodeId === n.id) ? 'predicted' : ''}">
							<span class="wf-icon">${n.icon}</span>
							<span class="wf-label">${n.label}</span>
						</div>
					`).join('')}
				</div>
			</section>

			<!-- Tools Section -->
			<section class="card tools">
				<h2>🛠️ Developer Tools</h2>
				<div class="tool-buttons">
					<button id="btn-validate">🔍 Validate Graph</button>
					<button id="btn-analyze">📊 Analyze Patterns</button>
					<button id="btn-context">🤖 LLM Context</button>
					<button id="btn-export">📦 Export Weights</button>
					<button id="btn-builder">🏗️ Builder Demo</button>
					<button id="btn-reset">🔄 Reset Session</button>
				</div>
				<div id="tool-output" class="tool-output"></div>
			</section>

			<!-- Analysis Results (shown when analysis is run) -->
			${state.showAnalysis ? renderAnalysisResults() : ''}

			<footer>
				<p>@mikesaintsg/actionloop — Zero dependency workflow prediction engine</p>
				<p class="footer-stats">
					${state.transitionHistory.length} transitions recorded •
					${state.predictions.length} predictions available •
					${state.detailedPrediction?.transitionCount ?? 0} total weight updates
				</p>
			</footer>
		</div>
	`

	attachEventListeners()
}

function renderPrediction(p: PredictionResult, index: number): string {
	const nodeInfo = state.activeScenario.nodes.find(n => n.id === p.nodeId)
	const confidencePercent = Math.round(p.confidence * 100)
	const confidenceClass = confidencePercent >= 70 ? 'high' : confidencePercent >= 40 ? 'medium' : 'low'

	return `
		<button class="prediction-btn" data-target="${p.nodeId}">
			<span class="rank">${index + 1}</span>
			<span class="pred-icon">${nodeInfo?.icon ?? '📍'}</span>
			<span class="pred-info">
				<span class="pred-name">${nodeInfo?.label ?? p.nodeId}</span>
				<span class="pred-factors">
					Score: ${p.score.toFixed(2)} • Base: ${p.baseWeight.toFixed(1)} • Predictive: ${p.predictiveWeight.toFixed(2)}
				</span>
			</span>
			<span class="confidence-bar ${confidenceClass}">
				<span class="confidence-fill" style="width: ${confidencePercent}%"></span>
				<span class="confidence-text">${confidencePercent}%</span>
			</span>
		</button>
	`
}

function renderHistoryItem(h: TransitionRecord): string {
	const fromNode = state.activeScenario.nodes.find(n => n.id === h.from)
	const toNode = state.activeScenario.nodes.find(n => n.id === h.to)

	return `
		<div class="history-item">
			<span class="from">${fromNode?.icon ?? ''} ${fromNode?.label ?? h.from}</span>
			<span class="arrow">→</span>
			<span class="to">${toNode?.icon ?? ''} ${toNode?.label ?? h.to}</span>
			<span class="actor-badge ${h.actor}">${getActorBadge(h.actor)}</span>
			<span class="time">${h.time.toLocaleTimeString()}</span>
		</div>
	`
}

function renderAnalysisResults(): string {
	return `
		<section class="card analysis-results">
			<h2>📊 Workflow Analysis</h2>
			<div class="analysis-grid">
				<div class="analysis-section">
					<h3>🔄 Hot Loops (${state.analysisResults.loops.length})</h3>
					${state.analysisResults.loops.length > 0
		? state.analysisResults.loops.map(loop => `
							<div class="analysis-item loop">
								<span class="loop-type">${loop.loopType}</span>
								<span class="loop-nodes">${loop.nodes.join(' → ')}</span>
								<span class="loop-freq">Freq: ${loop.frequency.toFixed(1)}</span>
							</div>
						`).join('')
		: '<p class="empty">No hot loops detected</p>'
}
				</div>
				<div class="analysis-section">
					<h3>⚠️ Bottlenecks (${state.analysisResults.bottlenecks.length})</h3>
					${state.analysisResults.bottlenecks.length > 0
		? state.analysisResults.bottlenecks.map(bn => `
							<div class="analysis-item bottleneck">
								<span class="bn-node">${bn.nodeId}</span>
								<span class="bn-traffic">In: ${bn.incomingTraffic.toFixed(0)} / Out: ${bn.outgoingTraffic.toFixed(0)}</span>
								<span class="bn-congestion">Congestion: ${bn.congestionScore.toFixed(1)}x</span>
							</div>
						`).join('')
		: '<p class="empty">No bottlenecks detected</p>'
}
				</div>
				<div class="analysis-section">
					<h3>🤖 Automation Opportunities (${state.analysisResults.opportunities.length})</h3>
					${state.analysisResults.opportunities.length > 0
		? state.analysisResults.opportunities.map(opp => `
							<div class="analysis-item opportunity">
								<span class="opp-type">${opp.automationType}</span>
								<span class="opp-sequence">${opp.sequence.join(' → ')}</span>
								<span class="opp-confidence">Confidence: ${Math.round(opp.confidence * 100)}%</span>
							</div>
						`).join('')
		: '<p class="empty">No automation opportunities detected</p>'
}
				</div>
			</div>
		</section>
	`
}

function getActorDescription(actor: string): string {
	switch (actor) {
		case 'user': return 'Human-initiated actions (clicks, form submissions)'
		case 'system': return 'Platform-triggered events (timeouts, errors, notifications)'
		case 'automation': return 'Robotic/LLM-triggered workflows (scheduled tasks, bots)'
		default: return ''
	}
}

function getActorBadge(actor: string): string {
	switch (actor) {
		case 'user': return '👤'
		case 'system': return '⚙️'
		case 'automation': return '🤖'
		default: return '❓'
	}
}

function attachEventListeners(): void {
	// Scenario tabs
	document.querySelectorAll('[data-scenario]').forEach(btn => {
		btn.addEventListener('click', (e) => {
			const scenarioId = (e.currentTarget as HTMLElement).dataset.scenario
			if (scenarioId) {
				switchScenario(scenarioId)
			}
		})
	})

	// Prediction and action buttons
	document.querySelectorAll('[data-target]').forEach(btn => {
		btn.addEventListener('click', (e) => {
			const target = (e.currentTarget as HTMLElement).dataset.target
			if (target) {
				navigate(target)
			}
		})
	})

	// Actor mode buttons
	document.querySelectorAll('[data-actor]').forEach(btn => {
		btn.addEventListener('click', (e) => {
			const actor = (e.currentTarget as HTMLElement).dataset.actor as 'user' | 'system' | 'automation'
			if (actor) {
				state.actorMode = actor
				render()
			}
		})
	})

	// Tool buttons
	document.getElementById('btn-validate')?.addEventListener('click', () => {
		const results = validator.runStaticChecks()
		const output = document.getElementById('tool-output')
		if (output) {
			if (results.length === 0) {
				output.innerHTML = '<div class="success">✅ Graph is valid! No structural issues found.</div>'
			} else {
				output.innerHTML = `
					<div class="info">🔍 Validation Results: ${results.length} issue(s) found</div>
					${results.map((r: ValidationResult) =>
		`<div class="${r.severity}">
							${r.severity === 'error' ? '❌' : r.severity === 'warning' ? '⚠️' : 'ℹ️'}
							[${r.severity.toUpperCase()}] ${r.message}
							${r.suggestion ? `<br><small>💡 ${r.suggestion}</small>` : ''}
						</div>`,
	).join('')}
				`
			}
		}
	})

	document.getElementById('btn-analyze')?.addEventListener('click', () => {
		const loops = analyzer.findHotLoops()
		const bottlenecks = analyzer.findBottlenecks()
		const opportunities = analyzer.findAutomationOpportunities()
		const sccs = analyzer.findStronglyConnectedComponents()
		const summary = analyzer.getSummary()

		state.analysisResults = { loops, bottlenecks, opportunities }
		state.showAnalysis = true

		const output = document.getElementById('tool-output')
		if (output) {
			output.innerHTML = `
				<div class="success">📊 Analysis complete! Scroll down to see detailed results.</div>
				<div class="info">
					<strong>Summary:</strong><br>
					• ${loops.length} hot loop(s) detected<br>
					• ${bottlenecks.length} bottleneck(s) identified<br>
					• ${opportunities.length} automation opportunit(ies)<br>
					• ${sccs.length} strongly connected component(s)<br>
					• Average path length: ${summary.avgPathLength.toFixed(2)}
				</div>
			`
		}

		render()
	})

	document.getElementById('btn-context')?.addEventListener('click', () => {
		const predictions = engine.predictNextDetailed(state.currentNode, {
			actor: state.actorMode,
			sessionId: state.sessionId,
			path: `/${state.currentNode}`,
			count: 5,
		})

		// Simulate events for context formatting
		const mockEvents = state.transitionHistory.slice(-10).map((h, i) => ({
			id: `event-${i}`,
			sessionId: state.sessionId,
			actor: h.actor,
			from: h.from,
			to: h.to,
			path: `/${h.to}`,
			timestamp: h.time.getTime(),
			dwell: {
				nodeId: h.from,
				enterTime: h.time.getTime() - 5000,
				exitTime: h.time.getTime(),
				activeTime: 4000,
				idleTime: 1000,
				engagement: 'active' as const,
				engagementScore: 0.8,
			},
			engagement: 'active' as const,
		}))

		const llmContext = contextFormatter.format(predictions, mockEvents)
		const naturalLanguage = contextFormatter.toNaturalLanguage(llmContext)
		const jsonContext = contextFormatter.toJSON(llmContext)

		const output = document.getElementById('tool-output')
		if (output) {
			output.innerHTML = `
				<div class="success">🤖 LLM Context Generated!</div>
				<div class="info"><strong>Natural Language (for system prompts):</strong></div>
				<pre>${escapeHtml(naturalLanguage)}</pre>
				<div class="info"><strong>JSON Context (for tool integration):</strong></div>
				<pre>${escapeHtml(jsonContext.slice(0, 800))}${jsonContext.length > 800 ? '\n... (truncated)' : ''}</pre>
			`
		}
	})

	document.getElementById('btn-export')?.addEventListener('click', () => {
		const exported = predictive.export()
		const output = document.getElementById('tool-output')
		if (output) {
			const jsonStr = JSON.stringify(exported, null, 2)
			output.innerHTML = `
				<div class="success">📦 Exported predictive graph weights</div>
				<div class="info">
					• Model ID: ${exported.modelId}<br>
					• ${exported.weights.length} weight entries<br>
					• Total transitions: ${exported.transitionCount}<br>
					• Warmup threshold: ${exported.warmupThreshold}<br>
					• Decay: ${exported.decayConfig.algorithm} (factor: ${exported.decayConfig.decayFactor})
				</div>
				<pre>${escapeHtml(jsonStr.slice(0, 1000))}${jsonStr.length > 1000 ? '\n... (truncated)' : ''}</pre>
			`
		}
	})

	document.getElementById('btn-builder')?.addEventListener('click', () => {
		demonstrateBuilder()
	})

	document.getElementById('btn-reset')?.addEventListener('click', () => {
		// End current session
		try {
			engine.endSession(state.sessionId, 'abandoned')
		} catch {
			// Session may already be ended
		}

		// Reset activity tracker
		activity.exitNode()
		activity.clearHistory()

		// Start new session
		const newSession = engine.startSession('user')
		state.sessionId = newSession.id
		state.currentNode = state.activeScenario.startNode
		state.transitionHistory = []
		state.activeTime = 0
		state.idleTime = 0
		state.showAnalysis = false

		// Clear predictive weights for fresh start
		predictive.clear()

		// Re-preload for the scenario
		if (state.activeScenario.preloadRecords) {
			predictive.preload(state.activeScenario.preloadRecords)
		}

		// Enter new node
		activity.enterNode(state.currentNode)

		render()

		const output = document.getElementById('tool-output')
		if (output) {
			output.innerHTML = '<div class="success">🔄 Session reset! Starting fresh with preloaded patterns.</div>'
		}
	})
}

function escapeHtml(text: string): string {
	const div = document.createElement('div')
	div.textContent = text
	return div.innerHTML
}

function navigate(to: string): void {
	const from = state.currentNode

	// Check if this transition is valid for the current actor
	const validTransitions = engine.getValidTransitions(from)
	const transition = validTransitions.find(t => t.to === to)

	if (!transition) {
		const output = document.getElementById('tool-output')
		if (output) {
			output.innerHTML = `<div class="error">❌ Invalid transition: ${from} → ${to}</div>`
		}
		return
	}

	// Use the transition's actor if it doesn't match current mode
	const actorToUse = transition.actor

	try {
		// Exit current node (captures dwell time)
		const dwellRecord = activity.exitNode()
		if (dwellRecord) {
			state.activeTime = dwellRecord.activeTime
			state.idleTime = dwellRecord.idleTime
		}

		// Record transition
		engine.recordTransition(from, to, {
			actor: actorToUse,
			sessionId: state.sessionId,
			path: `/${to}`,
		})

		// Update history
		state.transitionHistory.push({
			from,
			to,
			time: new Date(),
			actor: actorToUse,
		})

		// Update current node
		state.currentNode = to

		// Enter new node
		activity.enterNode(to)

		render()
	} catch (error) {
		const output = document.getElementById('tool-output')
		if (output) {
			const message = error instanceof Error ? error.message : 'Unknown error'
			output.innerHTML = `<div class="error">❌ Transition failed: ${message}</div>`
		}
	}
}

// ============================================================================
// Builder Demo
// ============================================================================

function demonstrateBuilder(): void {
	const builder = createWorkflowBuilder({
		validateOnChange: true,
		onNodeAdded: (node) => console.log('Node added:', node.id),
		onTransitionAdded: (transition) => console.log('Transition added:', `${transition.from} → ${transition.to}`),
	})

	// Build a simple approval workflow
	builder
		.addNode({ id: 'draft', label: 'Draft' })
		.addNode({ id: 'submitted', label: 'Submitted' })
		.addNode({ id: 'review', label: 'Under Review' })
		.addNode({ id: 'approved', label: 'Approved' })
		.addNode({ id: 'rejected', label: 'Rejected' })
		.addTransition({ from: 'draft', to: 'submitted', weight: 1, actor: 'user' })
		.addTransition({ from: 'submitted', to: 'review', weight: 1, actor: 'system' })
		.addTransition({ from: 'review', to: 'approved', weight: 2, actor: 'user' })
		.addTransition({ from: 'review', to: 'rejected', weight: 1, actor: 'user' })
		.addTransition({ from: 'rejected', to: 'draft', weight: 1, actor: 'user' })
		.addProcedure({
			id: 'approval-flow',
			actions: ['draft', 'submitted', 'review', 'approved'],
		})

	const validation = builder.validate()
	const jsonOutput = builder.toJSON()
	const yamlOutput = builder.toYAML()

	const output = document.getElementById('tool-output')
	if (output) {
		output.innerHTML = `
			<div class="success">🏗️ Builder Demo: Approval Workflow Created!</div>
			<div class="info">
				<strong>Validation:</strong> ${validation.valid ? '✅ Valid' : '❌ Invalid'}<br>
				• Nodes: ${builder.getNodes().length}<br>
				• Transitions: ${builder.getTransitions().length}<br>
				• Procedures: ${builder.getProcedures().length}<br>
				${validation.errors.length > 0 ? `• Errors: ${validation.errors.length}` : ''}
				${validation.warnings.length > 0 ? `• Warnings: ${validation.warnings.length}` : ''}
			</div>
			<div class="info"><strong>JSON Export:</strong></div>
			<pre>${escapeHtml(jsonOutput.slice(0, 600))}${jsonOutput.length > 600 ? '\n...' : ''}</pre>
			<div class="info"><strong>YAML Export:</strong></div>
			<pre>${escapeHtml(yamlOutput.slice(0, 400))}${yamlOutput.length > 400 ? '\n...' : ''}</pre>
		`
	}

	// Build the graph to verify it works
	if (validation.valid) {
		const builtGraph = builder.build()
		console.log('Built graph stats:', builtGraph.getStats())
		builtGraph.destroy()
	}

	builder.destroy()
}

// ============================================================================
// Dwell Time Update Interval
// ============================================================================

setInterval(() => {
	const dwellInfo = activity.getCurrentDwell()
	if (dwellInfo) {
		state.activeTime = dwellInfo.activeTime
		state.idleTime = dwellInfo.idleTime
		updateDwellDisplay()
	}
}, 1000)

// ============================================================================
// Initialize
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
	render()

	console.log('🔄 ActionLoop Showcase initialized')
	console.log('📊 Active scenario:', state.activeScenario.name)
	console.log('📈 Procedural graph stats:', procedural.getStats())
	console.log('🎯 Session started:', session.id)
	console.log('🔮 Warmup status:', predictive.isWarmupComplete() ? 'Complete' : 'In progress')
})
