import './styles.css'
import {
	createProceduralGraph,
	createPredictiveGraph,
	createWorkflowEngine,
	createWorkflowBuilder,
	createWorkflowValidator,
	createWorkflowAnalyzer,
	type Node,
	type Transition,
	type ValidationResult,
} from '@mikesaintsg/actionloop'

// ============================================================================
// Demo Data
// ============================================================================

const transitions = [
	{ from: 'login', to: 'dashboard', weight: 1, actor: 'user' as const },
	{ from: 'dashboard', to: 'settings', weight: 1, actor: 'user' as const },
	{ from: 'dashboard', to: 'profile', weight: 1, actor: 'user' as const },
	{ from: 'dashboard', to: 'checkout', weight: 1, actor: 'user' as const },
	{ from: 'settings', to: 'dashboard', weight: 1, actor: 'user' as const },
	{ from: 'profile', to: 'dashboard', weight: 1, actor: 'user' as const },
	{ from: 'checkout', to: 'payment', weight: 1, actor: 'user' as const },
	{ from: 'checkout', to: 'dashboard', weight: 1, actor: 'user' as const },
	{ from: 'payment', to: 'confirmation', weight: 1, actor: 'user' as const },
	{ from: 'confirmation', to: 'dashboard', weight: 1, actor: 'user' as const },
]

// ============================================================================
// State
// ============================================================================

interface AppState {
	currentNode: string
	sessionId: string
	transitionHistory: Array<{ from: string; to: string; time: Date }>
	predictions: string[]
}

const state: AppState = {
	currentNode: 'login',
	sessionId: '',
	transitionHistory: [],
	predictions: [],
}

// ============================================================================
// ActionLoop Setup
// ============================================================================

const procedural = createProceduralGraph({
	transitions,
	validateOnCreate: true,
})

const predictive = createPredictiveGraph(procedural, {
	decayAlgorithm: 'ewma',
	decayFactor: 0.9,
})

const engine = createWorkflowEngine(procedural, predictive, {
	validateTransitions: true,
	trackSessions: true,
})

const validator = createWorkflowValidator(procedural)
const analyzer = createWorkflowAnalyzer(procedural, predictive)

// Start session
const session = engine.startSession('user')
state.sessionId = session.id

// ============================================================================
// Render Functions
// ============================================================================

function render(): void {
	const app = document.getElementById('app')
	if (!app) return

	// Update predictions
	state.predictions = [...engine.predictNext(state.currentNode, {
		actor: 'user',
		sessionId: state.sessionId,
		path: `/${state.currentNode}`,
		count: 5,
	})]

	const validTransitions = engine.getValidTransitions(state.currentNode)
	const stats = procedural.getStats()
	const summary = analyzer.getSummary()

	app.innerHTML = `
		<div class="container">
			<header>
				<h1>🔄 ActionLoop Showcase</h1>
				<p class="subtitle">Predictive Procedural Action Loop System</p>
			</header>

			<div class="grid">
				<section class="card current-state">
					<h2>📍 Current State</h2>
					<div class="state-display">
						<span class="node-badge current">${state.currentNode}</span>
					</div>
					<div class="session-info">
						<small>Session: ${state.sessionId.slice(0, 8)}...</small>
					</div>
				</section>

				<section class="card predictions">
					<h2>🔮 Predictions</h2>
					<p class="description">Ranked next actions based on learned patterns:</p>
					<div class="prediction-list">
						${state.predictions.length > 0
							? state.predictions.map((p, i) => `
								<button class="prediction-btn" data-target="${p}">
									<span class="rank">${i + 1}</span>
									<span class="name">${p}</span>
								</button>
							`).join('')
							: '<p class="empty">No predictions (end node)</p>'
						}
					</div>
				</section>

				<section class="card valid-actions">
					<h2>✅ Valid Actions</h2>
					<p class="description">All allowed transitions from current node:</p>
					<div class="action-list">
						${validTransitions.map((t: Transition) => `
							<button class="action-btn" data-target="${t.to}">
								${t.to}
							</button>
						`).join('')}
					</div>
				</section>

				<section class="card history">
					<h2>📜 Transition History</h2>
					<div class="history-list">
						${state.transitionHistory.length > 0
							? state.transitionHistory.slice(-5).reverse().map(h => `
								<div class="history-item">
									<span class="from">${h.from}</span>
									<span class="arrow">→</span>
									<span class="to">${h.to}</span>
									<span class="time">${h.time.toLocaleTimeString()}</span>
								</div>
							`).join('')
							: '<p class="empty">No transitions recorded</p>'
						}
					</div>
				</section>

				<section class="card graph-viz">
					<h2>📊 Workflow Graph</h2>
					<div class="graph-display">
						${renderGraph()}
					</div>
				</section>

				<section class="card stats">
					<h2>📈 Statistics</h2>
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
							<span class="value">${summary.loopCount}</span>
							<span class="label">Loops</span>
						</div>
						<div class="stat">
							<span class="value">${summary.sccCount}</span>
							<span class="label">SCCs</span>
						</div>
					</div>
				</section>
			</div>

			<section class="card tools">
				<h2>🛠️ Tools</h2>
				<div class="tool-buttons">
					<button id="btn-validate">Validate Graph</button>
					<button id="btn-analyze">Analyze Patterns</button>
					<button id="btn-export">Export Weights</button>
					<button id="btn-reset">Reset Session</button>
				</div>
				<div id="tool-output" class="tool-output"></div>
			</section>

			<footer>
				<p>@mikesaintsg/actionloop — Zero dependency workflow prediction</p>
			</footer>
		</div>
	`

	attachEventListeners()
}

function renderGraph(): string {
	const nodes = procedural.getNodes()
	const allTransitions = procedural.getAllTransitions()

	return `
		<div class="graph-nodes">
			${nodes.map((n: Node) => `
				<span class="graph-node ${n.id === state.currentNode ? 'active' : ''}">
					${n.id}
				</span>
			`).join('')}
		</div>
		<div class="graph-edges">
			${allTransitions.slice(0, 6).map((t: Transition) => `
				<span class="graph-edge">${t.from} → ${t.to}</span>
			`).join('')}
			${allTransitions.length > 6 ? `<span class="graph-edge">+${allTransitions.length - 6} more</span>` : ''}
		</div>
	`
}

function attachEventListeners(): void {
	// Prediction and action buttons
	document.querySelectorAll('[data-target]').forEach(btn => {
		btn.addEventListener('click', (e) => {
			const target = (e.currentTarget as HTMLElement).dataset.target
			if (target) {
				navigate(target)
			}
		})
	})

	// Tool buttons
	document.getElementById('btn-validate')?.addEventListener('click', () => {
		const results = validator.runStaticChecks()
		const output = document.getElementById('tool-output')
		if (output) {
			if (results.length === 0) {
				output.innerHTML = '<div class="success">✅ Graph is valid! No issues found.</div>'
			} else {
				output.innerHTML = results.map((r: ValidationResult) =>
					`<div class="${r.severity}">⚠️ [${r.severity}] ${r.message}</div>`
				).join('')
			}
		}
	})

	document.getElementById('btn-analyze')?.addEventListener('click', () => {
		const loops = analyzer.findHotLoops()
		const bottlenecks = analyzer.findBottlenecks()
		const opportunities = analyzer.findAutomationOpportunities()
		const output = document.getElementById('tool-output')
		if (output) {
			output.innerHTML = `
				<div class="info">🔍 Analysis Results:</div>
				<div class="info">• Hot loops: ${loops.length}</div>
				<div class="info">• Bottlenecks: ${bottlenecks.length}</div>
				<div class="info">• Automation opportunities: ${opportunities.length}</div>
			`
		}
	})

	document.getElementById('btn-export')?.addEventListener('click', () => {
		const exported = predictive.export()
		const output = document.getElementById('tool-output')
		if (output) {
			output.innerHTML = `
				<div class="info">📦 Exported ${exported.weights.length} weights</div>
				<pre>${JSON.stringify(exported, null, 2).slice(0, 500)}...</pre>
			`
		}
	})

	document.getElementById('btn-reset')?.addEventListener('click', () => {
		engine.endSession(state.sessionId, 'abandoned')
		const newSession = engine.startSession('user')
		state.sessionId = newSession.id
		state.currentNode = 'login'
		state.transitionHistory = []
		predictive.clear()
		render()
		const output = document.getElementById('tool-output')
		if (output) {
			output.innerHTML = '<div class="success">🔄 Session reset. Starting fresh.</div>'
		}
	})
}

function navigate(to: string): void {
	const from = state.currentNode

	try {
		engine.recordTransition(from, to, {
			actor: 'user',
			sessionId: state.sessionId,
			path: `/${to}`,
		})

		state.transitionHistory.push({
			from,
			to,
			time: new Date(),
		})

		state.currentNode = to
		render()
	} catch (error) {
		const output = document.getElementById('tool-output')
		if (output) {
			output.innerHTML = `<div class="error">❌ Invalid transition: ${from} → ${to}</div>`
		}
	}
}

// ============================================================================
// Builder Demo
// ============================================================================

function demonstrateBuilder(): void {
	const builder = createWorkflowBuilder()

	builder
		.addNode({ id: 'start', label: 'Start' })
		.addNode({ id: 'middle', label: 'Middle' })
		.addNode({ id: 'end', label: 'End' })
		.addTransition({ from: 'start', to: 'middle', weight: 1, actor: 'user' })
		.addTransition({ from: 'middle', to: 'end', weight: 1, actor: 'user' })

	const json = builder.toJSON()
	// eslint-disable-next-line no-console
	console.log('Builder JSON output:', json)

	const validation = builder.validate()
	// eslint-disable-next-line no-console
	console.log('Builder validation:', validation)

	builder.destroy()
}

// ============================================================================
// Initialize
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
	render()
	demonstrateBuilder()

	// Log to console for demo purposes
	// eslint-disable-next-line no-console
	console.log('ActionLoop Showcase initialized')
	// eslint-disable-next-line no-console
	console.log('Procedural graph:', procedural.getStats())
	// eslint-disable-next-line no-console
	console.log('Engine session:', session.id)
})
