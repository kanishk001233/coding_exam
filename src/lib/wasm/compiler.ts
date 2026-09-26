import { CCompiler, CompileResult, RunOptions, RunResult } from './types';
import { WorkerRunner } from './runner';

export class WasmCCompiler implements CCompiler {
  private static instance: WasmCCompiler | null = null;
  private runner: WorkerRunner | null = null;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  public static getInstance(): WasmCCompiler {
    if (!WasmCCompiler.instance) {
      WasmCCompiler.instance = new WasmCCompiler();
    }
    return WasmCCompiler.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve) => {
      this.runner = new WorkerRunner();
      // Simulate quick WASM module initialization and warm-up
      setTimeout(() => {
        this.initialized = true;
        resolve();
      }, 150);
    });

    return this.initPromise;
  }

  public isReady(): boolean {
    return this.initialized;
  }

  public async compile(code: string): Promise<CompileResult> {
    await this.initialize();
    if (!this.runner) {
      this.runner = new WorkerRunner();
    }
    return this.runner.compileCode(code);
  }

  public async run(
    executable: unknown,
    input: string,
    options?: RunOptions
  ): Promise<RunResult> {
    await this.initialize();
    if (!this.runner) {
      this.runner = new WorkerRunner();
    }
    return this.runner.runExecutable(executable, input, options);
  }
}

// Export singleton compiler instance
export const wasmCompiler = WasmCCompiler.getInstance();
