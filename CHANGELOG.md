# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2026-01-19

### Added

#### Core Systems
- **ProceduralGraph**: Static graph defining valid transitions, nodes, and procedures
  - Node and transition management
  - Procedure subgraph support
  - Start/end node detection
  - Graph validation and export

- **PredictiveGraph**: Dynamic weight overlay for behavioral predictions
  - Per-actor weight tracking (user, system, automation)
  - EWMA decay algorithm support
  - Weight import/export for persistence
  - Historical data preloading

- **WorkflowEngine**: Runtime orchestration engine
  - Transition recording with validation
  - Ranked next-action predictions
  - Session management with timeout handling
  - Event subscription system

- **WorkflowBuilder**: Programmatic graph construction
  - Fluent builder API
  - JSON/YAML import/export
  - Inline validation

- **WorkflowValidator**: Static analysis and validation
  - Dead-end detection
  - Orphan node detection
  - Guard expression validation
  - Cyclical dependency checking

- **WorkflowAnalyzer**: Pattern detection and analysis
  - Hot loop detection
  - Bottleneck identification
  - Automation opportunity discovery
  - Strongly connected component analysis

#### Type System
- Comprehensive TypeScript interfaces
- Strict typing with no `any`, `!`, or unsafe `as`
- ESM-only with `.js` extensions
- Full TSDoc documentation

#### Helpers
- Type guards: `isActor`, `isNode`, `isTransition`
- Key generation: `createTransitionKey`, `parseTransitionKey`, `createWeightKey`
- Utilities: `generateId`, `now`, `elapsed`, `deepFreeze`
- Validation: `isValidGuardSyntax`, `parseYAMLValue`

#### Tests
- 231 unit tests covering all systems
- Edge case coverage for helpers
- Browser-based testing with Playwright

#### Documentation
- API guide in guides/actionloop.md
- PPALS whitepaper in guides/whitepaper.md
- Integration guide in guides/integration.md
- Interactive showcase demo

### Technical Notes

- Zero runtime dependencies
- Isomorphic (browser + Node.js)
- Sub-50ms prediction latency target
- Private fields using `#` syntax
- Factory function pattern for all systems
