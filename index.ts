#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import {
  ProofFlowEngine,
  ReducerRegistry,
  ImmutableEvent,
  stateHash,
  canonicalize
} from '../index';

interface CLICommand {
  name: string;
  description: string;
  execute(args: string[]): Promise<void>;
}

const PROOF_FLOW_DIR = '.proof-flow';
const STATE_FILE = path.join(PROOF_FLOW_DIR, 'state.json');
const EVENTS_FILE = path.join(PROOF_FLOW_DIR, 'events.jsonl');
const REGISTRY_FILE = path.join(PROOF_FLOW_DIR, 'registry.js');

/**
 * Ensure proof-flow directory exists
 */
function ensureDir(): void {
  if (!fs.existsSync(PROOF_FLOW_DIR)) {
    fs.mkdirSync(PROOF_FLOW_DIR, { recursive: true });
  }
}

/**
 * Load state from file
 */
function loadState(): any {
  if (!fs.existsSync(STATE_FILE)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

/**
 * Save state to file
 */
function saveState(state: any): void {
  ensureDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Load events from JSONL file
 */
function loadEvents(): ImmutableEvent[] {
  if (!fs.existsSync(EVENTS_FILE)) {
    return [];
  }
  const lines = fs.readFileSync(EVENTS_FILE, 'utf8').split('\n');
  return lines
    .filter(line => line.trim())
    .map(line => {
      const json = JSON.parse(line);
      return new ImmutableEvent({
        ...json,
        hash: ''
      });
    });
}

/**
 * Append event to JSONL file
 */
function appendEvent(event: ImmutableEvent): void {
  ensureDir();
  fs.appendFileSync(
    EVENTS_FILE,
    JSON.stringify(event.toJSON()) + '\n',
    'utf8'
  );
}

/**
 * Create a basic reducer registry
 */
function createRegistry(): ReducerRegistry {
  const registry = new ReducerRegistry();

  // Example reducer: increment counter
  registry.register('INCREMENT', (state, event) => {
    return {
      ...state,
      counter: (state.counter || 0) + (event.payload.amount || 1)
    };
  });

  // Example reducer: set value
  registry.register('SET_VALUE', (state, event) => {
    return {
      ...state,
      [event.payload.key]: event.payload.value
    };
  });

  // Example reducer: reset
  registry.register('RESET', () => {
    return {};
  });

  return registry;
}

/**
 * Command: init
 */
const initCommand: CLICommand = {
  name: 'init',
  description: 'Initialize a new proof-flow project',
  async execute() {
    ensureDir();

    if (!fs.existsSync(STATE_FILE)) {
      saveState({});
      console.log(`✓ Initialized state at ${STATE_FILE}`);
    }

    if (!fs.existsSync(EVENTS_FILE)) {
      fs.writeFileSync(EVENTS_FILE, '', 'utf8');
      console.log(`✓ Initialized events at ${EVENTS_FILE}`);
    }

    console.log('✓ Proof-Flow project initialized');
  }
};

/**
 * Command: exec
 */
const execCommand: CLICommand = {
  name: 'exec',
  description: 'Execute an event',
  async execute(args) {
    if (args.length < 2) {
      console.error('Usage: proof-flow exec <eventType> <payload-json>');
      process.exit(1);
    }

    const eventType = args[0];
    const payloadStr = args[1];

    let payload;
    try {
      payload = JSON.parse(payloadStr);
    } catch (e) {
      console.error('Invalid JSON payload:', payloadStr);
      process.exit(1);
    }

    const state = loadState();
    const registry = createRegistry();
    const engine = new ProofFlowEngine(state, registry);

    // Load existing events
    const events = loadEvents();
    for (const event of events) {
      engine.execute(event);
    }

    // Create and execute new event
    const lastEvent = events[events.length - 1];
    const newEvent = new ImmutableEvent({
      id: `event-${Date.now()}`,
      type: eventType,
      payload,
      timestamp: Date.now(),
      prevHash: lastEvent?.hash,
      epoch: 0
    });

    const result = engine.execute(newEvent);

    // Persist
    appendEvent(newEvent);
    saveState(result.state);

    console.log('✓ Event executed');
    console.log(`  Event ID: ${newEvent.id}`);
    console.log(`  State Hash: ${result.stateHash.substring(0, 16)}...`);
    console.log(`  Events: ${result.eventCount}`);
  }
};

/**
 * Command: status
 */
const statusCommand: CLICommand = {
  name: 'status',
  description: 'Show current state and status',
  async execute() {
    const state = loadState();
    const events = loadEvents();

    console.log('Proof-Flow Status');
    console.log('=================');
    console.log(`Events: ${events.length}`);
    console.log(`State Hash: ${stateHash(state).substring(0, 16)}...`);
    console.log('\nCurrent State:');
    console.log(JSON.stringify(state, null, 2));
  }
};

/**
 * Command: replay
 */
const replayCommand: CLICommand = {
  name: 'replay',
  description: 'Replay all events and verify consistency',
  async execute() {
    const state = loadState();
    const events = loadEvents();
    const registry = createRegistry();
    const engine = new ProofFlowEngine({}, registry);

    for (const event of events) {
      engine.execute(event);
    }

    const result = engine.replay();
    const consistent = engine.verifyReplayEquivalence();

    console.log('Replay Verification');
    console.log('===================');
    console.log(`Events replayed: ${result.eventCount}`);
    console.log(`Original state hash: ${stateHash(state).substring(0, 16)}...`);
    console.log(`Replayed state hash: ${result.stateHash.substring(0, 16)}...`);
    console.log(`Replay consistent: ${consistent ? '✓ YES' : '✗ NO'}`);

    if (!consistent) {
      process.exit(1);
    }
  }
};

/**
 * Command: log
 */
const logCommand: CLICommand = {
  name: 'log',
  description: 'Show event log',
  async execute(args) {
    const events = loadEvents();
    const limit = args[0] ? parseInt(args[0]) : 10;

    console.log('Event Log (latest first)');
    console.log('=======================');

    for (let i = Math.min(limit, events.length) - 1; i >= 0; i--) {
      const event = events[i];
      console.log(`\n${i + 1}. ${event.type} (${event.id})`);
      console.log(`   Timestamp: ${new Date(event.timestamp).toISOString()}`);
      console.log(`   Payload: ${JSON.stringify(event.payload)}`);
    }

    if (events.length === 0) {
      console.log('(no events)');
    }
  }
};

/**
 * Command: help
 */
const helpCommand: CLICommand = {
  name: 'help',
  description: 'Show help',
  async execute() {
    console.log('Proof-Flow CLI');
    console.log('==============\n');

    const commands = [
      initCommand,
      execCommand,
      statusCommand,
      replayCommand,
      logCommand,
      helpCommand
    ];

    for (const cmd of commands) {
      console.log(`  ${cmd.name.padEnd(10)} ${cmd.description}`);
    }

    console.log('\nUsage:');
    console.log('  proof-flow <command> [args...]');
  }
};

/**
 * Main CLI
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    await helpCommand.execute([]);
    return;
  }

  const commands = [
    initCommand,
    execCommand,
    statusCommand,
    replayCommand,
    logCommand,
    helpCommand
  ];

  const cmd = args[0];
  const cmdArgs = args.slice(1);

  const command = commands.find(c => c.name === cmd);

  if (!command) {
    console.error(`Unknown command: ${cmd}`);
    process.exit(1);
  }

  try {
    await command.execute(cmdArgs);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
