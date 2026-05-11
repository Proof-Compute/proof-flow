import { Canonicalization } from './canonicalization';

/**
 * Event definition per formal semantics section 5
 * E = (id, type, payload, timestamp, causal)
 */
export interface Event {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  prevHash: string; // For causal ordering per section 6
  epoch: number;
}

/**
 * Event manager - immutable event stream
 */
export class EventStore {
  private events: Event[] = [];
  private hashChain: Map<string, string> = new Map();

  /**
   * Append event maintaining causal DAG
   * E_j.prevHash = H(E_i) iff E_i ≺ E_j
   */
  append(event: Omit<Event, 'prevHash'>): Event {
    const prevHash =
      this.events.length > 0
        ? Canonicalization.hash(this.events[this.events.length - 1])
        : '0'.repeat(64);

    const fullEvent: Event = {
      ...event,
      prevHash,
    };

    // Validate causal ordering
    if (this.events.length > 0) {
      const lastEvent = this.events[this.events.length - 1];
      if (fullEvent.prevHash !== Canonicalization.hash(lastEvent)) {
        throw new Error('Causal chain broken - prevHash mismatch');
      }
    }

    this.events.push(fullEvent);
    return fullEvent;
  }

  /**
   * Get all events in causal order
   */
  getEvents(): Event[] {
    return [...this.events];
  }

  /**
   * Get event by ID
   */
  getEvent(id: string): Event | undefined {
    return this.events.find((e) => e.id === id);
  }

  /**
   * Get events by type
   */
  getEventsByType(type: string): Event[] {
    return this.events.filter((e) => e.type === type);
  }

  /**
   * Validate causal ordering forms a DAG
   */
  validateCausality(): boolean {
    for (let i = 1; i < this.events.length; i++) {
      const current = this.events[i];
      const previous = this.events[i - 1];
      if (current.prevHash !== Canonicalization.hash(previous)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get event stream signature
   */
  getStreamHash(): string {
    if (this.events.length === 0) {
      return '0'.repeat(64);
    }
    return Canonicalization.hash(this.events);
  }

  /**
   * Clear events (for testing)
   */
  clear(): void {
    this.events = [];
    this.hashChain.clear();
  }

  /**
   * Get size
   */
  size(): number {
    return this.events.length;
  }
}
