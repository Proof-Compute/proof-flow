# Proof-Flow

**Deterministic causal reduction system for verifiable event-sourced state**

A TypeScript/Node.js implementation of the formal operational semantics defined in the Proof-Flow specification. All execution is deterministic, replayable, and formally verifiable.

## Features

✨ **Deterministic Execution** - Pure reducers with canonical state  
🔗 **Causal Event Streams** - Immutable events with causal ordering  
🎯 **Replay Equivalence** - Verify determinism through replay  
🔐 **State Hashing** - SHA256 commitments for state verification  
📊 **Execution History** - Complete audit trail of all state transitions  
🎮 **Interactive CLI** - Query, emit events, verify system properties  
📦 **TypeScript** - Full type safety and IDE support  

## Installation

```bash
npm install proof-flow
```

Or use the CLI:

```bash
npm install -g proof-flow
proof-flow
```

## Quick Start

### Programmatic Usage

```typescript
import { ProofFlow } from 'proof-flow';

// Initialize with canonical initial state
const pf = new ProofFlow({ counter: 0, name: 'app' });

// Register reducers (pure functions)
pf.on('INCREMENT', (state: any, event) => ({
  ...state,
  counter: state.counter + event.payload.amount,
}));

pf.on('SET_NAME', (state: any, event) => ({
  ...state,
  name: event.payload.name,
}));

// Emit events
pf.emit({ type: 'INCREMENT', payload: { amount: 1 } });
pf.emit({ type: 'SET_NAME', payload: { name: 'my-app' } });

// Query state
console.log(pf.getState());
// { counter: 1, name: 'my-app' }

// Get state hash for commitment
console.log(pf.getStateHash());
// abc123...

// Verify replay equivalence
const isValid = pf.verifyReplay();
console.log(isValid); // true
```

### CLI Usage

```bash
$ proof-flow

🚀 Proof-Flow CLI - Deterministic Causal Reduction System

Enter system name (default: proof-flow): my-system
Enter initial state (JSON): {"counter": 0}

✅ System 'my-system' initialized

📊 System Info:
   Name: my-system
   Events: 0
   State Hash: abc123...
   Epoch: 0

proof-flow> reducer
Event type: INCREMENT
Reducer function: state.counter += event.payload.amount; return state;
✅ Registered reducer for 'INCREMENT'

proof-flow> emit
Event type: INCREMENT
Event payload (JSON): {"amount": 5}
✅ Event emitted
State hash: def456...

proof-flow> state
📦 Current State:
{
  "counter": 5
}

proof-flow> verify
✅ Replay verification passed - system is deterministic
```

## API Reference

### ProofFlow

Main class for managing a deterministic reduction system.

#### `new ProofFlow(initialState, name?)`

Create a new Proof-Flow system.

```typescript
const pf = new ProofFlow({ count: 0 }, 'myapp');
```

#### `on(eventType, reducer, epoch?)`

Register a reducer for an event type.

```typescript
pf.on('INCREMENT', (state, event) => ({
  ...state,
  count: state.count + 1,
}));
```

#### `emit(event)`

Emit an event and execute its reducer.

```typescript
const snapshot = pf.emit({
  type: 'INCREMENT',
  payload: { amount: 5 },
});
```

#### `getState()`

Get current state.

```typescript
const state = pf.getState();
```

#### `getStateHash()`

Get SHA256 hash of current state for commitment.

```typescript
const hash = pf.getStateHash(); // '5ab3...'
```

#### `getEvents()`

Get all emitted events in causal order.

```typescript
const events = pf.getEvents();
```

#### `getHistory()`

Get execution snapshots showing state evolution.

```typescript
const history = pf.getHistory();
history.forEach(snap => {
  console.log(`State hash: ${snap.stateHash}, Event count: ${snap.eventCount}`);
});
```

#### `verifyReplay()`

Verify replay equivalence theorem - ensures determinism.

```typescript
if (pf.verifyReplay()) {
  console.log('System is deterministic ✅');
}
```

#### `getInfo()`

Get system metadata.

```typescript
const info = pf.getInfo();
// { name: 'myapp', eventCount: 5, stateHash: '5ab3...', epoch: 0 }
```

### Canonicalization

Core determinism guarantee.

#### `Canonicalization.serialize(state)`

Serialize state to canonical byte representation.

```typescript
const bytes = Canonicalization.serialize(state);
```

#### `Canonicalization.hash(state)`

Compute SHA256 hash of canonical state.

```typescript
const hash = Canonicalization.hash(state);
```

#### `Canonicalization.isCanonical(state)`

Check if state is canonical.

```typescript
if (Canonicalization.isCanonical(state)) {
  console.log('State is valid');
}
```

## Formal Semantics

Proof-Flow implements the formal operational semantics from the specification:

- **Canonical State**: All state is deterministically serializable as UTF-8 JSON with ordered keys
- **Event Streams**: Immutable events form a causal DAG with prevHash linking
- **Reducers**: Pure, total, deterministic functions F: (S, E) → S
- **Execution**: Recursive reducer application over event sequence
- **Replay Equivalence**: Exec(S₀, Σ) = Replay(S₀, Σ) verified automatically
- **State Commitment**: SHA256(canonical(state)) for verifiable commitments

## Constraints & Rules

### Reducer Purity

Reducers MUST NOT:
- Mutate external state
- Access nondeterministic clocks
- Use random entropy
- Depend on runtime-local memory
- Mutate inputs

```typescript
// ❌ WRONG - impure
pf.on('BAD', (state) => {
  state.counter++; // Mutation!
  return state;
});

// ✅ RIGHT - pure
pf.on('GOOD', (state, event) => ({
  ...state,
  counter: state.counter + 1,
}));
```

### Canonical State

State MUST NOT contain:
- `NaN` or `Infinity`
- `undefined` values
- Functions or cyclic references
- Non-deterministic types

### Event Ordering

Events are processed in causal order. The prevHash field maintains the causal chain:

```
Event₁ ← prevHash=0000...
Event₂ ← prevHash=hash(Event₁)
Event₃ ← prevHash=hash(Event₂)
...
```

## Examples

### Counter

```typescript
const counter = new ProofFlow({ value: 0 });

counter.on('INCREMENT', (s, e) => ({ value: s.value + 1 }));
counter.on('DECREMENT', (s, e) => ({ value: s.value - 1 }));
counter.on('RESET', (s, e) => ({ value: 0 }));

counter.emit({ type: 'INCREMENT', payload: {} });
counter.emit({ type: 'INCREMENT', payload: {} });
counter.emit({ type: 'DECREMENT', payload: {} });

console.log(counter.getState()); // { value: 1 }
```

### User Registry

```typescript
const users = new ProofFlow({ data: {} });

users.on('ADD_USER', (s, e) => ({
  data: {
    ...s.data,
    [e.payload.id]: { name: e.payload.name, created: e.timestamp },
  },
}));

users.on('REMOVE_USER', (s, e) => {
  const { [e.payload.id]: _, ...rest } = s.data;
  return { data: rest };
});

users.emit({ type: 'ADD_USER', payload: { id: '1', name: 'Alice' } });
users.emit({ type: 'ADD_USER', payload: { id: '2', name: 'Bob' } });

console.log(users.getState());
// { data: { '1': { name: 'Alice', created: 1234... }, '2': { name: 'Bob', created: 1234... } } }
```

## Testing

```bash
npm test
```


## References

- [Proof-Flow Formal Operational Semantics v1.0](./SEMANTICS.md)
- Event Sourcing patterns
- Deterministic computation
- Causal consistency
