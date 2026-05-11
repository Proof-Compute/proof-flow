#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { ProofFlow } from './index';

interface SessionFile {
  name: string;
  initialState: unknown;
  events: Array<any>;
  reducers: Record<string, string>;
}

class ProofFlowCLI {
  private proofFlow: ProofFlow | null = null;
  private sessionFile: string | null = null;
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  private prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }

  private log(message: string): void {
    console.log(message);
  }

  private error(message: string): void {
    console.error(`❌ Error: ${message}`);
  }

  private success(message: string): void {
    console.log(`✅ ${message}`);
  }

  async init(): Promise<void> {
    this.log('');
    this.log('🚀 Proof-Flow CLI - Deterministic Causal Reduction System');
    this.log('');

    const name = await this.prompt('Enter system name (default: proof-flow): ');
    const systemName = name.trim() || 'proof-flow';

    const stateInput = await this.prompt('Enter initial state (JSON): ');
    let initialState: unknown;

    try {
      initialState = JSON.parse(stateInput);
    } catch {
      this.error('Invalid JSON for initial state');
      await this.init();
      return;
    }

    try {
      this.proofFlow = new ProofFlow(initialState, systemName);
      this.success(`System '${systemName}' initialized`);
      this.printInfo();
    } catch (err) {
      this.error((err as Error).message);
      await this.init();
    }
  }

  async createSession(): Promise<void> {
    const name = await this.prompt('Enter session name: ');
    this.sessionFile = path.join(process.cwd(), `${name}.pf.json`);
    this.log(`Session will be saved to: ${this.sessionFile}`);
  }

  async registerReducer(): Promise<void> {
    if (!this.proofFlow) {
      this.error('System not initialized');
      return;
    }

    const eventType = await this.prompt('Event type: ');
    const reducerCode = await this.prompt(
      'Reducer function (JavaScript, receives state and event): '
    );

    try {
      // Create reducer function from user code
      // eslint-disable-next-line no-new-func
      const reducer = new Function('state', 'event', reducerCode);

      this.proofFlow.on(eventType, (state, event) => {
        return reducer(state, event);
      });

      this.success(`Registered reducer for '${eventType}'`);
    } catch (err) {
      this.error(`Failed to register reducer: ${(err as Error).message}`);
    }
  }

  async emitEvent(): Promise<void> {
    if (!this.proofFlow) {
      this.error('System not initialized');
      return;
    }

    const type = await this.prompt('Event type: ');
    const payloadInput = await this.prompt('Event payload (JSON): ');

    try {
      const payload = JSON.parse(payloadInput);
      const snapshot = this.proofFlow.emit({ type, payload });
      this.success('Event emitted');
      this.log(`State hash: ${snapshot.stateHash}`);
    } catch (err) {
      this.error((err as Error).message);
    }
  }

  private printInfo(): void {
    if (!this.proofFlow) return;

    const info = this.proofFlow.getInfo();
    this.log('');
    this.log('📊 System Info:');
    this.log(`   Name: ${info.name}`);
    this.log(`   Events: ${info.eventCount}`);
    this.log(`   State Hash: ${info.stateHash}`);
    this.log(`   Epoch: ${info.epoch}`);
    this.log('');
  }

  async viewState(): Promise<void> {
    if (!this.proofFlow) {
      this.error('System not initialized');
      return;
    }

    try {
      const state = this.proofFlow.exportState();
      this.log('');
      this.log('📦 Current State:');
      this.log(state);
      this.log('');
    } catch (err) {
      this.error((err as Error).message);
    }
  }

  async viewHistory(): Promise<void> {
    if (!this.proofFlow) {
      this.error('System not initialized');
      return;
    }

    try {
      const history = this.proofFlow.exportHistory();
      this.log('');
      this.log('📜 Execution History:');
      this.log(history);
      this.log('');
    } catch (err) {
      this.error((err as Error).message);
    }
  }

  async verify(): Promise<void> {
    if (!this.proofFlow) {
      this.error('System not initialized');
      return;
    }

    try {
      const isValid = this.proofFlow.verifyReplay();
      if (isValid) {
        this.success('Replay verification passed - system is deterministic');
      } else {
        this.error('Replay verification failed - non-determinism detected');
      }
    } catch (err) {
      this.error((err as Error).message);
    }
  }

  async saveSession(): Promise<void> {
    if (!this.proofFlow || !this.sessionFile) {
      this.error('System not initialized or session not created');
      return;
    }

    try {
      const session: SessionFile = {
        name: this.proofFlow.getInfo().name,
        initialState: this.proofFlow.getHistory()[0].state,
        events: this.proofFlow.getEvents(),
        reducers: {},
      };

      fs.writeFileSync(this.sessionFile, JSON.stringify(session, null, 2));
      this.success(`Session saved to ${this.sessionFile}`);
    } catch (err) {
      this.error((err as Error).message);
    }
  }

  private printHelp(): void {
    this.log('');
    this.log('📋 Available Commands:');
    this.log('  init       - Initialize new system');
    this.log('  session    - Create new session');
    this.log('  reducer    - Register reducer');
    this.log('  emit       - Emit event');
    this.log('  info       - Show system info');
    this.log('  state      - View current state');
    this.log('  history    - View execution history');
    this.log('  verify     - Verify replay equivalence');
    this.log('  save       - Save session');
    this.log('  help       - Show this help');
    this.log('  exit       - Exit CLI');
    this.log('');
  }

  async run(): Promise<void> {
    this.printHelp();

    if (!this.proofFlow) {
      await this.init();
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const command = await this.prompt('proof-flow> ');

      switch (command.trim().toLowerCase()) {
        case 'init':
          await this.init();
          break;
        case 'session':
          await this.createSession();
          break;
        case 'reducer':
          await this.registerReducer();
          break;
        case 'emit':
          await this.emitEvent();
          break;
        case 'info':
          this.printInfo();
          break;
        case 'state':
          await this.viewState();
          break;
        case 'history':
          await this.viewHistory();
          break;
        case 'verify':
          await this.verify();
          break;
        case 'save':
          await this.saveSession();
          break;
        case 'help':
          this.printHelp();
          break;
        case 'exit':
        case 'quit':
          this.log('Goodbye! 👋');
          this.rl.close();
          process.exit(0);
          break;
        default:
          this.error(`Unknown command: ${command}`);
          this.log('Type "help" for available commands');
      }
    }
  }
}

const cli = new ProofFlowCLI();
cli.run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
