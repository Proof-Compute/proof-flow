import { ProofFlow } from './index';

/**
 * Example: Simple counter application
 */
function counterExample() {
  console.log('\n=== Counter Example ===\n');

  const counter = new ProofFlow({ count: 0, history: [] });

  // Register reducers
  counter.on('INCREMENT', (state: any, event) => ({
    count: state.count + 1,
    history: [
      ...state.history,
      { action: 'increment', timestamp: event.timestamp },
    ],
  }));

  counter.on('DECREMENT', (state: any, event) => ({
    count: state.count - 1,
    history: [
      ...state.history,
      { action: 'decrement', timestamp: event.timestamp },
    ],
  }));

  counter.on('RESET', (state: any, event) => ({
    count: 0,
    history: [...state.history, { action: 'reset', timestamp: event.timestamp }],
  }));

  // Emit events
  counter.emit({ type: 'INCREMENT', payload: {} });
  counter.emit({ type: 'INCREMENT', payload: {} });
  counter.emit({ type: 'DECREMENT', payload: {} });

  console.log('Final state:', counter.getState());
  console.log('State hash:', counter.getStateHash());
  console.log('Events:', counter.getEvents().length);
  console.log('Replay valid:', counter.verifyReplay());
}

/**
 * Example: User registry
 */
function userRegistryExample() {
  console.log('\n=== User Registry Example ===\n');

  const users = new ProofFlow({ users: [] as any[] });

  users.on('ADD_USER', (state: any, event) => ({
    users: [
      ...state.users,
      {
        id: event.payload.id,
        name: event.payload.name,
        created: event.timestamp,
      },
    ],
  }));

  users.on('UPDATE_USER', (state: any, event) => ({
    users: state.users.map((u: any) =>
      u.id === event.payload.id ? { ...u, ...event.payload } : u
    ),
  }));

  users.on('DELETE_USER', (state: any, event) => ({
    users: state.users.filter((u: any) => u.id !== event.payload.id),
  }));

  // Emit events
  users.emit({
    type: 'ADD_USER',
    payload: { id: 'user1', name: 'Alice' },
  });
  users.emit({
    type: 'ADD_USER',
    payload: { id: 'user2', name: 'Bob' },
  });
  users.emit({
    type: 'UPDATE_USER',
    payload: { id: 'user1', name: 'Alice Smith' },
  });

  console.log('Final state:', counter.getState());
  console.log('User count:', (users.getState() as any).users.length);
  console.log('Replay valid:', users.verifyReplay());
}

/**
 * Example: Todo list
 */
function todoExample() {
  console.log('\n=== Todo List Example ===\n');

  const todos = new ProofFlow({ items: [], nextId: 1 });

  todos.on('ADD_TODO', (state: any, event) => ({
    items: [
      ...state.items,
      {
        id: state.nextId,
        title: event.payload.title,
        completed: false,
        created: event.timestamp,
      },
    ],
    nextId: state.nextId + 1,
  }));

  todos.on('TOGGLE_TODO', (state: any, event) => ({
    ...state,
    items: state.items.map((t: any) =>
      t.id === event.payload.id ? { ...t, completed: !t.completed } : t
    ),
  }));

  todos.on('DELETE_TODO', (state: any, event) => ({
    ...state,
    items: state.items.filter((t: any) => t.id !== event.payload.id),
  }));

  // Emit events
  todos.emit({ type: 'ADD_TODO', payload: { title: 'Buy milk' } });
  todos.emit({ type: 'ADD_TODO', payload: { title: 'Write code' } });
  todos.emit({ type: 'TOGGLE_TODO', payload: { id: 1 } });

  const state = todos.getState() as any;
  console.log('Final state:', state);
  console.log('Completed:', state.items.filter((t: any) => t.completed).length);
  console.log('Total:', state.items.length);
  console.log('Replay valid:', todos.verifyReplay());
}

// Run examples
if (require.main === module) {
  counterExample();
  userRegistryExample();
  todoExample();
}

export { counterExample, userRegistryExample, todoExample };
