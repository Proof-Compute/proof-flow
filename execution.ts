import { Canonicalization } from './canonicalization';
import { Event, EventStore } from './event';
import { ReducerRegistry } from './reducer';

/**
 * Execution engine per formal semantics section 10-11
 *
 * Global execution semantics:
 * Exec(S_0, Σ) = F_n(⋯ F_2(F_1(S_0, E_1), E_2) ⋯, E_n)
 *
 * Replay Equivalence Theorem:
 * Exec(S_0, Σ) = Replay(S_0, Σ) and H_s(S_n) = H_s(S_n')
 */
export interface ExecutionSnapshot {
  state: unknown;
  stateHash: string;
  eventCount: number;
  epoch: number;
  timestamp: number;
}

export class ExecutionEngine {
  private state: unknown;
  private eventStore: EventStore;
  private reducerRegistry: ReducerRegistry;
  private history: ExecutionSnapshot[] = [];
  private currentEpoch: number = 0;

  constructor(
    initialState: unknown,
    eventStore: EventStore,
    reducerRegistry: ReducerRegistry
  ) {
    // Validate initial state is canonical
    if (!Canonicalization.isCanonical(initialState)) {
      throw new Error('Initial state is not canonical');
    }

    this.state = initialState;
    this.eventStore = eventStore;
    this.reducerRegistry = reducerRegistry;

    // Record initial snapshot
    this.recordSnapshot();
  }

  /**
   * Execute single event per transition semantics
   * (S_t, E_t, F) → S_{t+1}
   */
  execute(event: Event): ExecutionSnapshot {
    // Update epoch if needed
    if (event.epoch > this.currentEpoch) {
      this.currentEpoch = event.epoch;
    }

    // Apply reducer
    this.state = this.reducerRegistry.apply(this.state, event);

    // Validate resulting state is canonical
    if (!Canonicalization.isCanonical(this.state)) {
      throw new Error(
        `Reducer for '${event.type}' produced non-canonical state`
      );
    }

    // Record snapshot
    return this.recordSnapshot();
  }

  /**
   * Execute all pending events in order
   * Ensures replay equivalence
   */
  executePending(): ExecutionSnapshot {
    const pendingCount = this.eventStore.size() - this.history.length + 1;

    if (pendingCount <= 0) {
      return this.getLatestSnapshot()!;
    }

    const allEvents = this.eventStore.getEvents();
    for (let i = this.history.length - 1; i < allEvents.length; i++) {
      this.execute(allEvents[i]);
    }

    return this.getLatestSnapshot()!;
  }

  /**
   * Replay all events from initial state
   * Verifies replay equivalence theorem
   */
  replay(initialState: unknown): ExecutionSnapshot {
    if (!Canonicalization.isCanonical(initialState)) {
      throw new Error('Initial state is not canonical');
    }

    let state = initialState;
    const allEvents = this.eventStore.getEvents();

    for (const event of allEvents) {
      state = this.reducerRegistry.apply(state, event);

      if (!Canonicalization.isCanonical(state)) {
        throw new Error(
          `Replay: Reducer for '${event.type}' produced non-canonical state`
        );
      }
    }

    // Verify equivalence
    const expectedHash = Canonicalization.hash(this.state);
    const replayHash = Canonicalization.hash(state);

    if (expectedHash !== replayHash) {
      throw new Error(
        `Replay verification failed: state hashes do not match\n` +
          `Expected: ${expectedHash}\n` +
          `Got: ${replayHash}`
      );
    }

    return {
      state,
      stateHash: replayHash,
      eventCount: allEvents.length,
      epoch: this.currentEpoch,
      timestamp: Date.now(),
    };
  }

  /**
   * Get current state
   */
  getState(): unknown {
    return this.state;
  }

  /**
   * Get current state hash
   */
  getStateHash(): string {
    return Canonicalization.hash(this.state);
  }

  /**
   * Get execution history
   */
  getHistory(): ExecutionSnapshot[] {
    return [...this.history];
  }

  /**
   * Get latest snapshot
   */
  getLatestSnapshot(): ExecutionSnapshot | undefined {
    return this.history[this.history.length - 1];
  }

  /**
   * Get snapshot at index
   */
  getSnapshotAt(index: number): ExecutionSnapshot | undefined {
    return this.history[index];
  }

  /**
   * Record execution snapshot
   */
  private recordSnapshot(): ExecutionSnapshot {
    const snapshot: ExecutionSnapshot = {
      state: this.state,
      stateHash: Canonicalization.hash(this.state),
      eventCount: this.eventStore.size(),
      epoch: this.currentEpoch,
      timestamp: Date.now(),
    };

    this.history.push(snapshot);
    return snapshot;
  }

  /**
   * Verify determinism by replaying and comparing hashes
   */
  verifyDeterminism(initialState: unknown): boolean {
    try {
      const replayResult = this.replay(initialState);
      return replayResult.stateHash === this.getStateHash();
    } catch {
      return false;
    }
  }
}
