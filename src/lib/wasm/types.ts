export interface CompileResult {
  success: boolean;
  errors?: string;
  executable?: unknown;
}

export interface RunResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  timedOut: boolean;
  error?: string;
}

export interface RunOptions {
  timeoutMs?: number;
  memoryLimitMb?: number;
  outputLimitKb?: number;
}

export interface CCompiler {
  initialize(): Promise<void>;
  isReady(): boolean;
  compile(code: string): Promise<CompileResult>;
  run(executable: unknown, input: string, options?: RunOptions): Promise<RunResult>;
}
