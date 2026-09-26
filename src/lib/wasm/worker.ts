import { Lexer, Parser, Interpreter, ASTNode } from './cRuntime';

export interface WorkerInputMessage {
  type: 'COMPILE' | 'RUN';
  id: string;
  code?: string;
  ast?: ASTNode;
  input?: string;
  options?: {
    timeoutMs?: number;
    memoryLimitMb?: number;
    outputLimitKb?: number;
  };
}

export interface WorkerOutputMessage {
  type: 'COMPILE_RESULT' | 'RUN_RESULT' | 'ERROR';
  id: string;
  success: boolean;
  errors?: string;
  ast?: ASTNode;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  executionTime?: number;
  timedOut?: boolean;
}

self.onmessage = (event: MessageEvent<WorkerInputMessage>) => {
  const { type, id, code, ast, input, options } = event.data;

  try {
    if (type === 'COMPILE') {
      if (!code) {
        self.postMessage({
          type: 'COMPILE_RESULT',
          id,
          success: false,
          errors: 'No source code provided',
        });
        return;
      }

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const parsedAst = parser.parse();

      self.postMessage({
        type: 'COMPILE_RESULT',
        id,
        success: true,
        ast: parsedAst,
      });
      return;
    }

    if (type === 'RUN') {
      const startTime = performance.now();
      let targetAst = ast;

      if (!targetAst && code) {
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        targetAst = parser.parse();
      }

      if (!targetAst) {
        self.postMessage({
          type: 'RUN_RESULT',
          id,
          success: false,
          stdout: '',
          stderr: 'Executable AST not found',
          exitCode: 1,
          executionTime: 0,
          timedOut: false,
        });
        return;
      }

      const interpreter = new Interpreter(input || '', options?.outputLimitKb || 100);
      const result = interpreter.execute(targetAst);
      const endTime = performance.now();

      self.postMessage({
        type: 'RUN_RESULT',
        id,
        success: result.exitCode === 0,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        executionTime: Math.round(endTime - startTime),
        timedOut: false,
      });
    }
  } catch (err: any) {
    self.postMessage({
      type: type === 'COMPILE' ? 'COMPILE_RESULT' : 'RUN_RESULT',
      id,
      success: false,
      errors: err.message || String(err),
      stderr: err.message || String(err),
      stdout: '',
      exitCode: 1,
      executionTime: 0,
      timedOut: false,
    });
  }
};
