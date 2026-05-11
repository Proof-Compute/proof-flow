# Proof-Flow

A deterministic causal reduction system with replay equivalence and consensus-compatible execution.

**Based on:** [Proof-Flow Formal Operational Semantics v1.0](./FORMAL_SEMANTICS.md)

## Features

- **Deterministic Execution**: Pure reducers with no side effects
- **Causal Event Streams**: Immutable events forming a DAG with causal ordering
- **Replay Equivalence**: Verify execution consistency across replays
- **State Commitment**: SHA256 hashing for consensus
- **CLI Tool**: Execute events, inspect state, replay history
- **TypeScript**: Full type safety

## Installation

```bash
npm install proof-flow
```

Or globally for CLI:

```bash
npm install -g proof-flow
```

## Quick Start

### CLI Usage

Initialize a project:

```bash
proof-flow init
```

Execute an event:

```bash
proof-flow exec INCREMENT '{"amount": 1}'
```

Check status:

```bash
proof-flow status
```

View event log:

```bash
proof-flow log
```

Replay and verify:

```bash
proof-flow replay
```

### Programmatic Usage

```typescript
import {
  ProofFlowEngine,
  ReducerRegistry,
  ImmutableEvent
} from 'proof-flow';

// Create a reducer registry
const registry = new ReducerRegistry();

registry.register('INCREMENT', (state, event) => ({
  ...state,
  count: (state.count || 0) + event.payload.amount
}));

// Create the engine with initial state
const engine = new ProofFlowEngine({ count: 0 }, registry);

// Create and execute an event
const event = new ImmutableEvent({
  id: 'event-1',
  type: 'INCREMENT',
  payload: { amount: 5 },
  timestamp: Date.now(),
  epoch: 0
});

const result = engine.execute(event);

console.log(result.state);      // { count: 5 }
console.log(result.stateHash);  // SHA256 hash
console.log(result.eventCount); // 1

// Verify replay equivalence
const isConsistent = engine.verifyReplayEquivalence();
console.log(isConsistent); // true
```

## Core Concepts

### Canonicalization

All state must be canonical (deterministically serializable):

```typescript
import { canonicalize, stateHash } from 'proof-flow';

const state = { b: 2, a: 1 };
const canonical = canonicalize(state); // { a: 1, b: 2 }
const hash = stateHash(state);         // SHA256 hash
```

### Events

Immutable events with causal ordering:

```typescript
import { ImmutableEvent } from 'proof-flow';

const event = new ImmutableEvent({
  id: 'event-123',
  type: 'USER_CREATED',
  payload: { name: 'Alice' },
  timestamp: Date.now(),
  prevHash: previousEventHash, // Causal link
  epoch: 1
});

const hash = event.hash; // Automatically computed
```

### Reducers

Pure functions that evolve state:

```typescript
import { createReducer } from 'proof-flow';

const counterReducer = createReducer((state, event) => ({
  ...state,
  counter: (state.counter || 0) + event.payload.amount
}));

const registry = new ReducerRegistry();
registry.register('ADD', counterReducer);
```

### Execution

Deterministic reduction with verification:

```typescript
// Single event
const result1 = engine.execute(event);

// Sequence of events
const result2 = engine.executeSequence([event1, event2, event3]);

// Replay from initial state
const result3 = engine.replay();

// Verify replay equivalence (core safety property)
const isValid = engine.verifyReplayEquivalence();
```

## Formal Semantics

This implementation follows the formal semantics defined in **Proof-Flow Formal Operational Semantics v1.0**.

Key invariants:

- **Core Reduction**: `S_{t+1} = F(S_t, E_t)`
- **Replay Equivalence**: `Exec(S_0, Σ) = Replay(S_0, Σ)`
- **State Hash**: `H_s(S) = SHA256(Canonical(S))`
- **Causal Ordering**: `E_i ≺ E_j iff E_j.prevHash = H(E_i)`

## API Reference

### ProofFlowEngine

```typescript
class ProofFlowEngine<S> {
  constructor(initialState: S, registry: ReducerRegistry<S>);
  
  // Execute single event
  execute(event: ImmutableEvent): ExecutionResult<S>;
  
  // Execute sequence
  executeSequence(events: ImmutableEvent[]): ExecutionResult<S>;
  
  // Replay from initial state
  replay(): ExecutionResult<S>;
  
  // Verify replay equivalence
  verifyReplayEquivalence(): boolean;
  
  // State access
  getState(): S;
  getStateHash(): string;
  getEvents(): CausalEventStream;
  getExecutionLog(): Array<...>;
  
  // Consensus
  wouldFork(otherStateHash: string): boolean;
}
```

### ReducerRegistry

```typescript
class ReducerRegistry<S> {
  register(eventType: string, reducer: Reducer<S>): void;
  
  registerWithEffects(eventType: string, reducer: ReducerWithEffects<S>): void;
  
  apply(state: S, event: Event): S;
  
  applyWithEffects(state: S, event: Event): [S, EffectIntent[]];
}
```

### Canonicalization

```typescript
function canonicalize(value: any): any;
function isCanonical(value: any): boolean;
function canonicalBytes(value: any): Buffer;
function stateHash(state: any): string;
function eventHash(event: any): string;
```

### Events

```typescript
class ImmutableEvent {
  readonly id: string;
  readonly type: string;
  readonly payload: any;
  readonly timestamp: number;
  readonly prevHash?: string;
  readonly epoch?: number;
  readonly hash: string;
  
  causallyComesBefore(other: ImmutableEvent): boolean;
}

class CausalEventStream {
  add(event: ImmutableEvent): void;
  get(id: string): ImmutableEvent | undefined;
  all(): ImmutableEvent[];
  topoSort(): ImmutableEvent[]; // Topological sort
  clone(): CausalEventStream;
}
```

## CLI Commands

```
proof-flow init              Initialize a new project
proof-flow exec <type> <json> Execute an event
proof-flow status            Show current state
proof-flow log [limit]       Show event log
proof-flow replay            Replay and verify
proof-flow help              Show help
```

## Testing

```bash
npm test
```



## References

- [Proof-Flow Formal Operational Semantics v1.0](./FORMAL_SEMANTICS.md)
- [Event Sourcing Pattern](https://martinfowler.com/eaaDev/EventSourcing.html)
- [Deterministic Replay](https://en.wikipedia.org/wiki/Deterministic_Replay)
