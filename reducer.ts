import { Event } from './event';

/**
 * Reducer type per formal semantics section 7
 * F : S × E → S
 *
 * Requirements:
 * - Deterministic: same inputs always produce same output
 * - Total: defined for all valid inputs
 * - Replayable: produces same result on replay
 * - Pure: no side effects, no external state access
 * - Terminating: always completes
 */
export type Reducer<S = unknown> = (state: S, event: Event) => S;

/**
 * Reducer family - versioned by epoch
 * Supports semantic evolution per section 24
 */
export interface ReducerFamily {
  [eventType: string]: Reducer;
}

/**
 * Reducer registry with epoch support
 */
export class ReducerRegistry {
  private epochs: Map<number, ReducerFamily> = new Map();
  private currentEpoch: number = 0;

  /**
   * Register reducer for event type in epoch
   */
  register(eventType: string, reducer: Reducer, epoch: number = 0): void {
    if (!this.epochs.has(epoch)) {
      this.epochs.set(epoch, {});
    }

    const family = this.epochs.get(epoch)!;
    family[eventType] = reducer;

    this.currentEpoch = Math.max(this.currentEpoch, epoch);
  }

  /**
   * Register multiple reducers
   */
  registerBatch(reducers: Record<string, Reducer>, epoch: number = 0): void {
    Object.entries(reducers).forEach(([type, reducer]) => {
      this.register(type, reducer, epoch);
    });
  }

  /**
   * Get reducer for event type and epoch
   */
  getReducer(eventType: string, epoch: number): Reducer | undefined {
    return this.epochs.get(epoch)?.[eventType];
  }

  /**
   * Get all reducers for epoch
   */
  getFamily(epoch: number): ReducerFamily | undefined {
    return this.epochs.get(epoch);
  }

  /**
   * Get current epoch
   */
  getCurrentEpoch(): number {
    return this.currentEpoch;
  }

  /**
   * Apply reducer per transition semantics section 9
   * (S_t, E_t, F) → S_{t+1}
   * where S_{t+1} = F(S_t, E_t)
   */
  apply<S>(state: S, event: Event): S {
    const reducer = this.getReducer(event.type, event.epoch);

    if (!reducer) {
      throw new Error(
        `No reducer found for event type '${event.type}' in epoch ${event.epoch}`
      );
    }

    // Ensure reducer doesn't mutate input
    return reducer(this.deepFreeze(state), event);
  }

  /**
   * Deep freeze to enforce reducer purity
   */
  private deepFreeze<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Object.isFrozen(obj)) {
      return obj;
    }

    Object.freeze(obj);

    if (Array.isArray(obj)) {
      obj.forEach((item) => this.deepFreeze(item));
    } else {
      Object.values(obj).forEach((value) => this.deepFreeze(value));
    }

    return obj;
  }
}
