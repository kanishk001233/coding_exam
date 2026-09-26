import { CompileResult, RunOptions, RunResult } from './types';
import WorkerScript from './worker?worker';

export class WorkerRunner {
  private worker: Worker | null = null;
  private isBusy: boolean = false;

  constructor() {
    this.initWorker();
  }

  private initWorker(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.worker = new WorkerScript();
  }

  public async compileCode(code: string): Promise<CompileResult> {
    return new Promise((resolve) => {
      if (!this.worker) {
        this.initWorker();
      }

      const id = Math.random().toString(36).substring(2, 9);
      const timeout = setTimeout(() => {
        this.initWorker();
        resolve({
          success: false,
          errors: 'Compilation timed out',
        });
      }, 5000);

      const handleMessage = (event: MessageEvent) => {
        if (event.data.id === id && event.data.type === 'COMPILE_RESULT') {
          clearTimeout(timeout);
          this.worker?.removeEventListener('message', handleMessage);
          if (event.data.success) {
            resolve({
              success: true,
              executable: event.data.ast,
            });
          } else {
            resolve({
              success: false,
              errors: event.data.errors || 'Syntax error',
            });
          }
        }
      };

      this.worker!.addEventListener('message', handleMessage);
      this.worker!.postMessage({
        type: 'COMPILE',
        id,
        code,
      });
    });
  }

  public async runExecutable(
    executable: unknown,
    input: string,
    options: RunOptions = {}
  ): Promise<RunResult> {
    const timeoutMs = options.timeoutMs || 2000;

    return new Promise((resolve) => {
      if (!this.worker) {
        this.initWorker();
      }

      const id = Math.random().toString(36).substring(2, 9);
      let isDone = false;

      // Timeout watchdog: Terminate worker if it runs longer than timeoutMs
      const timer = setTimeout(() => {
        if (!isDone) {
          isDone = true;
          this.initWorker(); // Force-kill worker to stop infinite loops safely!
          resolve({
            success: false,
            stdout: '',
            stderr: 'Time Limit Exceeded (execution exceeded limit of ' + timeoutMs + 'ms)',
            exitCode: 124,
            executionTime: timeoutMs,
            timedOut: true,
          });
        }
      }, timeoutMs);

      const handleMessage = (event: MessageEvent) => {
        if (event.data.id === id && event.data.type === 'RUN_RESULT') {
          if (!isDone) {
            isDone = true;
            clearTimeout(timer);
            this.worker?.removeEventListener('message', handleMessage);

            resolve({
              success: event.data.success,
              stdout: event.data.stdout || '',
              stderr: event.data.stderr || '',
              exitCode: event.data.exitCode !== undefined ? event.data.exitCode : 0,
              executionTime: event.data.executionTime || 0,
              timedOut: false,
            });
          }
        }
      };

      this.worker!.addEventListener('message', handleMessage);
      this.worker!.postMessage({
        type: 'RUN',
        id,
        ast: executable,
        input,
        options,
      });
    });
  }

  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
