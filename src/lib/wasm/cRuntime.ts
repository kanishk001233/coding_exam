/**
 * In-Browser C Language Compiler & Runtime Engine
 * 
 * Implements standard C (C99 subset) compilation, tokenization, AST evaluation,
 * and execution environment with full I/O emulation (scanf, printf, puts, getchar, etc.),
 * standard math, recursion, pointers, arrays, strings, loops, and control flow.
 */

export interface ASTNode {
  type: string;
  [key: string]: any;
}

export class CompileError extends Error {
  line: number;
  column: number;
  constructor(message: string, line: number = 1, column: number = 1) {
    super(`Compilation Error [Line ${line}, Col ${column}]: ${message}`);
    this.name = 'CompileError';
    this.line = line;
    this.column = column;
  }
}

export class RuntimeError extends Error {
  constructor(message: string) {
    super(`Runtime Error: ${message}`);
    this.name = 'RuntimeError';
  }
}

// Token types for Lexer
export enum TokenType {
  KEYWORD = 'KEYWORD',
  IDENTIFIER = 'IDENTIFIER',
  NUMBER = 'NUMBER',
  FLOAT = 'FLOAT',
  STRING = 'STRING',
  CHAR = 'CHAR',
  OPERATOR = 'OPERATOR',
  PUNCTUATION = 'PUNCTUATION',
  PREPROCESSOR = 'PREPROCESSOR',
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

const KEYWORDS = new Set([
  'int', 'char', 'float', 'double', 'void', 'long', 'short', 'unsigned', 'signed',
  'if', 'else', 'while', 'for', 'do', 'return', 'break', 'continue', 'switch', 'case', 'default',
  'struct', 'typedef', 'sizeof', 'const', 'static', 'bool', 'true', 'false'
]);

export class Lexer {
  private src: string;
  private pos: number = 0;
  private line: number = 1;
  private col: number = 1;

  constructor(src: string) {
    this.src = src;
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];
    while (this.pos < this.src.length) {
      this.skipWhitespaceAndComments();
      if (this.pos >= this.src.length) break;

      const char = this.src[this.pos];
      const startLine = this.line;
      const startCol = this.col;

      // Preprocessor directive (e.g., #include <stdio.h>, #define MAX 100)
      if (char === '#') {
        let line = '';
        while (this.pos < this.src.length && this.src[this.pos] !== '\n') {
          line += this.src[this.pos];
          this.advance();
        }
        tokens.push({ type: TokenType.PREPROCESSOR, value: line.trim(), line: startLine, column: startCol });
        continue;
      }

      // Strings
      if (char === '"') {
        this.advance();
        let str = '';
        while (this.pos < this.src.length && this.src[this.pos] !== '"') {
          if (this.src[this.pos] === '\\' && this.pos + 1 < this.src.length) {
            this.advance();
            const esc = this.src[this.pos];
            if (esc === 'n') str += '\n';
            else if (esc === 't') str += '\t';
            else if (esc === 'r') str += '\r';
            else if (esc === '\\') str += '\\';
            else if (esc === '"') str += '"';
            else str += esc;
          } else {
            str += this.src[this.pos];
          }
          this.advance();
        }
        if (this.pos < this.src.length && this.src[this.pos] === '"') {
          this.advance();
        }
        tokens.push({ type: TokenType.STRING, value: str, line: startLine, column: startCol });
        continue;
      }

      // Characters
      if (char === "'") {
        this.advance();
        let ch = '';
        if (this.pos < this.src.length && this.src[this.pos] === '\\') {
          this.advance();
          const esc = this.src[this.pos];
          if (esc === 'n') ch = '\n';
          else if (esc === 't') ch = '\t';
          else if (esc === '0') ch = '\0';
          else ch = esc;
        } else if (this.pos < this.src.length) {
          ch = this.src[this.pos];
        }
        this.advance();
        if (this.pos < this.src.length && this.src[this.pos] === "'") {
          this.advance();
        }
        tokens.push({ type: TokenType.CHAR, value: ch, line: startLine, column: startCol });
        continue;
      }

      // Numbers (Integers & Floats)
      if (this.isDigit(char) || (char === '.' && this.pos + 1 < this.src.length && this.isDigit(this.src[this.pos + 1]))) {
        let numStr = '';
        let isFloat = false;
        while (this.pos < this.src.length && (this.isDigit(this.src[this.pos]) || this.src[this.pos] === '.' || this.src[this.pos] === 'f' || this.src[this.pos] === 'L' || this.src[this.pos] === 'u')) {
          if (this.src[this.pos] === '.') isFloat = true;
          if (this.src[this.pos] === 'f' || this.src[this.pos] === 'L' || this.src[this.pos] === 'u') {
            this.advance();
            break;
          }
          numStr += this.src[this.pos];
          this.advance();
        }
        tokens.push({
          type: isFloat ? TokenType.FLOAT : TokenType.NUMBER,
          value: numStr,
          line: startLine,
          column: startCol,
        });
        continue;
      }

      // Identifiers and Keywords
      if (this.isAlpha(char) || char === '_') {
        let id = '';
        while (this.pos < this.src.length && (this.isAlphaNum(this.src[this.pos]) || this.src[this.pos] === '_')) {
          id += this.src[this.pos];
          this.advance();
        }
        tokens.push({
          type: KEYWORDS.has(id) ? TokenType.KEYWORD : TokenType.IDENTIFIER,
          value: id,
          line: startLine,
          column: startCol,
        });
        continue;
      }

      // Multi-character operators
      const twoChar = this.src.slice(this.pos, this.pos + 2);
      if (['==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '%=', '->', '<<', '>>'].includes(twoChar)) {
        this.advance();
        this.advance();
        tokens.push({ type: TokenType.OPERATOR, value: twoChar, line: startLine, column: startCol });
        continue;
      }

      // Single-character operators and punctuation
      if ('+-*/%<>=!&|^~?:'.includes(char)) {
        this.advance();
        tokens.push({ type: TokenType.OPERATOR, value: char, line: startLine, column: startCol });
        continue;
      }

      if ('(){}[];,'.includes(char)) {
        this.advance();
        tokens.push({ type: TokenType.PUNCTUATION, value: char, line: startLine, column: startCol });
        continue;
      }

      throw new CompileError(`Unexpected character '${char}'`, startLine, startCol);
    }

    tokens.push({ type: TokenType.EOF, value: '', line: this.line, column: this.col });
    return tokens;
  }

  private advance(): void {
    if (this.src[this.pos] === '\n') {
      this.line++;
      this.col = 1;
    } else {
      this.col++;
    }
    this.pos++;
  }

  private skipWhitespaceAndComments(): void {
    while (this.pos < this.src.length) {
      const c = this.src[this.pos];
      if (c === ' ' || c === '\t' || c === '\r' || c === '\n') {
        this.advance();
        continue;
      }
      // Single line comment
      if (c === '/' && this.pos + 1 < this.src.length && this.src[this.pos + 1] === '/') {
        while (this.pos < this.src.length && this.src[this.pos] !== '\n') {
          this.advance();
        }
        continue;
      }
      // Multi-line comment
      if (c === '/' && this.pos + 1 < this.src.length && this.src[this.pos + 1] === '*') {
        this.advance();
        this.advance();
        while (this.pos + 1 < this.src.length && !(this.src[this.pos] === '*' && this.src[this.pos + 1] === '/')) {
          this.advance();
        }
        if (this.pos + 1 < this.src.length) {
          this.advance(); // *
          this.advance(); // /
        }
        continue;
      }
      break;
    }
  }

  private isDigit(c: string): boolean {
    return c >= '0' && c <= '9';
  }

  private isAlpha(c: string): boolean {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
  }

  private isAlphaNum(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c);
  }
}

/**
 * C Parser & AST Generator
 */
export class Parser {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    // Filter out preprocessor tokens for the parser
    this.tokens = tokens.filter(t => t.type !== TokenType.PREPROCESSOR);
  }

  public parse(): ASTNode {
    const program: ASTNode = {
      type: 'Program',
      body: [],
    };

    while (!this.isAtEnd()) {
      program.body.push(this.parseDeclarationOrFunction());
    }

    return program;
  }

  private parseDeclarationOrFunction(): ASTNode {
    // Type specifier e.g. int, void, char, float, double
    const returnType = this.consumeType();
    
    // Check for pointer
    let isPointer = false;
    while (this.match('*')) {
      isPointer = true;
    }

    const nameToken = this.consume(TokenType.IDENTIFIER, "Expect identifier name");
    const name = nameToken.value;

    // If followed by '(', it's a function declaration / definition
    if (this.match('(')) {
      const params: { name: string; type: string; isPointer: boolean; isArray: boolean }[] = [];
      if (!this.check(')')) {
        do {
          if (this.check('void') && this.peekNext()?.value === ')') {
            this.advance();
            break;
          }
          const pType = this.consumeType();
          let pIsPtr = false;
          while (this.match('*')) {
            pIsPtr = true;
          }
          const pNameToken = this.consume(TokenType.IDENTIFIER, "Expect parameter name");
          let pIsArray = false;
          if (this.match('[')) {
            pIsArray = true;
            if (!this.check(']')) {
              this.parseExpression();
            }
            this.consume(']', "Expect ']' after array parameter");
          }
          params.push({ name: pNameToken.value, type: pType, isPointer: pIsPtr, isArray: pIsArray });
        } while (this.match(','));
      }
      this.consume(')', "Expect ')' after parameters");

      // Function body or forward declaration
      if (this.match(';')) {
        return {
          type: 'FunctionPrototype',
          name,
          returnType,
          params,
          line: nameToken.line,
        };
      }

      const body = this.parseBlock();
      return {
        type: 'FunctionDefinition',
        name,
        returnType,
        params,
        body,
        line: nameToken.line,
      };
    }

    // Global variable declaration
    let initialValue: ASTNode | null = null;
    let arraySizes: (ASTNode | null)[] = [];

    while (this.match('[')) {
      if (this.match(']')) {
        arraySizes.push(null);
      } else {
        const sizeExpr = this.parseExpression();
        this.consume(']', "Expect ']' after array size");
        arraySizes.push(sizeExpr);
      }
    }

    if (this.match('=')) {
      initialValue = this.parseInitializer();
    }
    this.consume(';', "Expect ';' after variable declaration");

    return {
      type: 'VariableDeclaration',
      varType: returnType,
      name,
      isPointer,
      arraySizes,
      initialValue,
      line: nameToken.line,
    };
  }

  private parseBlock(): ASTNode {
    this.consume('{', "Expect '{' to start block");
    const statements: ASTNode[] = [];

    while (!this.check('}') && !this.isAtEnd()) {
      statements.push(this.parseStatement());
    }

    this.consume('}', "Expect '}' to end block");
    return {
      type: 'BlockStatement',
      statements,
    };
  }

  private parseStatement(): ASTNode {
    // Check for variable declaration inside statement
    if (this.isTypeSpecifier(this.peek())) {
      return this.parseLocalDeclaration();
    }

    if (this.match('{')) {
      this.current--; // step back to let parseBlock consume '{'
      return this.parseBlock();
    }

    if (this.match('if')) {
      this.consume('(', "Expect '(' after 'if'");
      const condition = this.parseExpression();
      this.consume(')', "Expect ')' after if condition");
      const thenBranch = this.parseStatement();
      let elseBranch: ASTNode | null = null;
      if (this.match('else')) {
        elseBranch = this.parseStatement();
      }
      return { type: 'IfStatement', condition, thenBranch, elseBranch };
    }

    if (this.match('while')) {
      this.consume('(', "Expect '(' after 'while'");
      const condition = this.parseExpression();
      this.consume(')', "Expect ')' after while condition");
      const body = this.parseStatement();
      return { type: 'WhileStatement', condition, body };
    }

    if (this.match('do')) {
      const body = this.parseStatement();
      this.consume('while', "Expect 'while' after do-body");
      this.consume('(', "Expect '(' after while");
      const condition = this.parseExpression();
      this.consume(')', "Expect ')' after while condition");
      this.consume(';', "Expect ';' after do-while");
      return { type: 'DoWhileStatement', body, condition };
    }

    if (this.match('for')) {
      this.consume('(', "Expect '(' after 'for'");
      let init: ASTNode | null = null;
      if (!this.check(';')) {
        if (this.isTypeSpecifier(this.peek())) {
          init = this.parseLocalDeclaration();
        } else {
          init = this.parseExpression();
          this.consume(';', "Expect ';' after for init");
        }
      } else {
        this.consume(';', "Expect ';'");
      }

      let test: ASTNode | null = null;
      if (!this.check(';')) {
        test = this.parseExpression();
      }
      this.consume(';', "Expect ';' after for condition");

      let update: ASTNode | null = null;
      if (!this.check(')')) {
        update = this.parseExpression();
      }
      this.consume(')', "Expect ')' after for clauses");

      const body = this.parseStatement();
      return { type: 'ForStatement', init, test, update, body };
    }

    if (this.match('return')) {
      let value: ASTNode | null = null;
      if (!this.check(';')) {
        value = this.parseExpression();
      }
      this.consume(';', "Expect ';' after return value");
      return { type: 'ReturnStatement', value };
    }

    if (this.match('break')) {
      this.consume(';', "Expect ';' after break");
      return { type: 'BreakStatement' };
    }

    if (this.match('continue')) {
      this.consume(';', "Expect ';' after continue");
      return { type: 'ContinueStatement' };
    }

    // Expression statement
    const expr = this.parseExpression();
    this.consume(';', "Expect ';' after expression");
    return { type: 'ExpressionStatement', expression: expr };
  }

  private parseLocalDeclaration(): ASTNode {
    const varType = this.consumeType();
    const decls: ASTNode[] = [];

    do {
      let isPointer = false;
      while (this.match('*')) {
        isPointer = true;
      }
      const nameToken = this.consume(TokenType.IDENTIFIER, "Expect variable name");
      const name = nameToken.value;

      const arraySizes: (ASTNode | null)[] = [];
      while (this.match('[')) {
        if (this.match(']')) {
          arraySizes.push(null);
        } else {
          const sizeExpr = this.parseExpression();
          this.consume(']', "Expect ']' after array size");
          arraySizes.push(sizeExpr);
        }
      }

      let initialValue: ASTNode | null = null;
      if (this.match('=')) {
        initialValue = this.parseInitializer();
      }

      decls.push({
        type: 'VariableDeclaration',
        varType,
        name,
        isPointer,
        arraySizes,
        initialValue,
        line: nameToken.line,
      });
    } while (this.match(','));

    this.consume(';', "Expect ';' after declaration");
    return {
      type: 'VariableDeclarationList',
      declarations: decls,
    };
  }

  private parseInitializer(): ASTNode {
    if (this.match('{')) {
      const elements: ASTNode[] = [];
      if (!this.check('}')) {
        do {
          elements.push(this.parseInitializer());
        } while (this.match(','));
      }
      this.consume('}', "Expect '}' after initializer list");
      return { type: 'ArrayInitializer', elements };
    }
    return this.parseExpression();
  }

  private parseExpression(): ASTNode {
    return this.parseAssignment();
  }

  private parseAssignment(): ASTNode {
    const expr = this.parseTernary();

    if (this.match('=', '+=', '-=', '*=', '/=', '%=')) {
      const operator = this.previous().value;
      const value = this.parseAssignment();
      return {
        type: 'AssignmentExpression',
        operator,
        left: expr,
        right: value,
      };
    }

    return expr;
  }

  private parseTernary(): ASTNode {
    let expr = this.parseLogicalOr();

    if (this.match('?')) {
      const trueBranch = this.parseExpression();
      this.consume(':', "Expect ':' in conditional expression");
      const falseBranch = this.parseTernary();
      return {
        type: 'ConditionalExpression',
        condition: expr,
        trueBranch,
        falseBranch,
      };
    }

    return expr;
  }

  private parseLogicalOr(): ASTNode {
    let expr = this.parseLogicalAnd();
    while (this.match('||')) {
      const operator = this.previous().value;
      const right = this.parseLogicalAnd();
      expr = { type: 'BinaryExpression', operator, left: expr, right };
    }
    return expr;
  }

  private parseLogicalAnd(): ASTNode {
    let expr = this.parseBitwiseOr();
    while (this.match('&&')) {
      const operator = this.previous().value;
      const right = this.parseBitwiseOr();
      expr = { type: 'BinaryExpression', operator, left: expr, right };
    }
    return expr;
  }

  private parseBitwiseOr(): ASTNode {
    let expr = this.parseBitwiseXor();
    while (this.match('|')) {
      const operator = this.previous().value;
      const right = this.parseBitwiseXor();
      expr = { type: 'BinaryExpression', operator, left: expr, right };
    }
    return expr;
  }

  private parseBitwiseXor(): ASTNode {
    let expr = this.parseBitwiseAnd();
    while (this.match('^')) {
      const operator = this.previous().value;
      const right = this.parseBitwiseAnd();
      expr = { type: 'BinaryExpression', operator, left: expr, right };
    }
    return expr;
  }

  private parseBitwiseAnd(): ASTNode {
    let expr = this.parseEquality();
    while (this.match('&')) {
      const operator = this.previous().value;
      const right = this.parseEquality();
      expr = { type: 'BinaryExpression', operator, left: expr, right };
    }
    return expr;
  }

  private parseEquality(): ASTNode {
    let expr = this.parseRelational();
    while (this.match('==', '!=')) {
      const operator = this.previous().value;
      const right = this.parseRelational();
      expr = { type: 'BinaryExpression', operator, left: expr, right };
    }
    return expr;
  }

  private parseRelational(): ASTNode {
    let expr = this.parseShift();
    while (this.match('<', '<=', '>', '>=')) {
      const operator = this.previous().value;
      const right = this.parseShift();
      expr = { type: 'BinaryExpression', operator, left: expr, right };
    }
    return expr;
  }

  private parseShift(): ASTNode {
    let expr = this.parseAdditive();
    while (this.match('<<', '>>')) {
      const operator = this.previous().value;
      const right = this.parseAdditive();
      expr = { type: 'BinaryExpression', operator, left: expr, right };
    }
    return expr;
  }

  private parseAdditive(): ASTNode {
    let expr = this.parseMultiplicative();
    while (this.match('+', '-')) {
      const operator = this.previous().value;
      const right = this.parseMultiplicative();
      expr = { type: 'BinaryExpression', operator, left: expr, right };
    }
    return expr;
  }

  private parseMultiplicative(): ASTNode {
    let expr = this.parseUnary();
    while (this.match('*', '/', '%')) {
      const operator = this.previous().value;
      const right = this.parseUnary();
      expr = { type: 'BinaryExpression', operator, left: expr, right };
    }
    return expr;
  }

  private parseUnary(): ASTNode {
    if (this.match('!', '~', '-', '+', '*', '&', '++', '--', 'sizeof')) {
      const operator = this.previous().value;
      if (operator === 'sizeof' && this.match('(')) {
        if (this.isTypeSpecifier(this.peek())) {
          const typeName = this.consumeType();
          this.consume(')', "Expect ')' after sizeof type");
          return { type: 'SizeofTypeExpression', typeName };
        }
        const expr = this.parseExpression();
        this.consume(')', "Expect ')' after sizeof expr");
        return { type: 'SizeofExprExpression', argument: expr };
      }
      const right = this.parseUnary();
      return { type: 'UnaryExpression', operator, prefix: true, argument: right };
    }

    return this.parsePostfix();
  }

  private parsePostfix(): ASTNode {
    let expr = this.parsePrimary();

    while (true) {
      if (this.match('(')) {
        const args: ASTNode[] = [];
        if (!this.check(')')) {
          do {
            args.push(this.parseExpression());
          } while (this.match(','));
        }
        this.consume(')', "Expect ')' after function arguments");
        expr = { type: 'CallExpression', callee: expr, arguments: args };
      } else if (this.match('[')) {
        const index = this.parseExpression();
        this.consume(']', "Expect ']' after array subscript");
        expr = { type: 'MemberExpression', object: expr, property: index, computed: true };
      } else if (this.match('++') || this.match('--')) {
        const operator = this.previous().value;
        expr = { type: 'UnaryExpression', operator, prefix: false, argument: expr };
      } else {
        break;
      }
    }

    return expr;
  }

  private parsePrimary(): ASTNode {
    if (this.match(TokenType.NUMBER)) {
      return { type: 'Literal', value: parseInt(this.previous().value, 10), raw: this.previous().value };
    }
    if (this.match(TokenType.FLOAT)) {
      return { type: 'Literal', value: parseFloat(this.previous().value), raw: this.previous().value };
    }
    if (this.match(TokenType.STRING)) {
      return { type: 'Literal', value: this.previous().value, raw: this.previous().value };
    }
    if (this.match(TokenType.CHAR)) {
      return { type: 'Literal', value: this.previous().value.charCodeAt(0), raw: this.previous().value };
    }
    if (this.match('true')) return { type: 'Literal', value: 1 };
    if (this.match('false')) return { type: 'Literal', value: 0 };

    if (this.match(TokenType.IDENTIFIER)) {
      return { type: 'Identifier', name: this.previous().value, line: this.previous().line };
    }

    if (this.match('(')) {
      const expr = this.parseExpression();
      this.consume(')', "Expect ')' after expression");
      return expr;
    }

    const token = this.peek();
    throw new CompileError(`Unexpected token '${token.value || 'EOF'}'`, token.line, token.column);
  }

  private isTypeSpecifier(token: Token): boolean {
    return ['int', 'char', 'float', 'double', 'void', 'long', 'short', 'unsigned', 'signed', 'bool'].includes(token.value);
  }

  private consumeType(): string {
    let typeName = '';
    while (this.isTypeSpecifier(this.peek())) {
      typeName += (typeName ? ' ' : '') + this.advance().value;
    }
    if (!typeName) {
      const token = this.peek();
      throw new CompileError(`Expected type specifier, got '${token.value}'`, token.line, token.column);
    }
    return typeName;
  }

  private match(...typesOrValues: string[]): boolean {
    for (const val of typesOrValues) {
      if (this.check(val)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(val: string): boolean {
    if (this.isAtEnd()) return false;
    const token = this.peek();
    return token.value === val || token.type === (val as any);
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current] || { type: TokenType.EOF, value: '', line: 1, column: 1 };
  }

  private peekNext(): Token | null {
    return this.tokens[this.current + 1] || null;
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(typeOrVal: string, message: string): Token {
    if (this.check(typeOrVal)) return this.advance();
    const token = this.peek();
    throw new CompileError(message, token.line, token.column);
  }
}

/**
 * C Interpreter Runtime Environment
 */
export interface RuntimeContext {
  stdout: string;
  stderr: string;
  inputBuffer: string;
  inputIndex: number;
  outputLimitBytes: number;
  maxExecutionSteps: number;
  stepCount: number;
}

export class Interpreter {
  private globalScope: Map<string, any> = new Map();
  private functions: Map<string, ASTNode> = new Map();
  private ctx: RuntimeContext;

  constructor(input: string = '', outputLimitKb: number = 100) {
    this.ctx = {
      stdout: '',
      stderr: '',
      inputBuffer: input,
      inputIndex: 0,
      outputLimitBytes: outputLimitKb * 1024,
      maxExecutionSteps: 5_000_000,
      stepCount: 0,
    };

    // Standard C streams & global constants
    this.globalScope.set('stdin', 'stdin');
    this.globalScope.set('stdout', 'stdout');
    this.globalScope.set('stderr', 'stderr');
    this.globalScope.set('NULL', null);
    this.globalScope.set('null', null);
    this.globalScope.set('EOF', -1);
    this.globalScope.set('true', 1);
    this.globalScope.set('false', 0);
    this.globalScope.set('RAND_MAX', 32767);
    this.globalScope.set('INT_MAX', 2147483647);
    this.globalScope.set('INT_MIN', -2147483648);
    this.globalScope.set('CHAR_MAX', 127);
    this.globalScope.set('CHAR_MIN', -128);

    this.registerStandardLibraries();
  }

  private appendStdout(str: string): void {
    if (this.ctx.stdout.length + str.length > this.ctx.outputLimitBytes) {
      this.ctx.stdout += str.slice(0, this.ctx.outputLimitBytes - this.ctx.stdout.length);
      throw new RuntimeError("Output limit exceeded");
    }
    this.ctx.stdout += str;
  }

  public toCString(val: any): string {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) {
      let str = '';
      for (let i = 0; i < val.length; i++) {
        const ch = val[i];
        if (ch === 0 || ch === null || ch === undefined) break;
        str += typeof ch === 'number' ? String.fromCharCode(ch) : String(ch)[0];
      }
      return str;
    }
    return String(val);
  }

  private registerStandardLibraries(): void {
    // printf
    this.functions.set('printf', {
      type: 'BuiltinFunction',
      name: 'printf',
      call: (args: any[], scope: Map<string, any>) => {
        if (args.length === 0) return 0;
        const formatStr = this.toCString(args[0]);
        let argIdx = 1;
        let formatted = '';

        for (let i = 0; i < formatStr.length; i++) {
          if (formatStr[i] === '%' && i + 1 < formatStr.length) {
            let specifier = '';
            i++;
            // Parse flags / precision e.g. %.2f, %02d, %ld, %lld, %lf
            while (i < formatStr.length && !'diufFeEgGxXoscpa%'.includes(formatStr[i])) {
              specifier += formatStr[i];
              i++;
            }
            const typeChar = formatStr[i];
            specifier += typeChar;

            if (typeChar === '%') {
              formatted += '%';
            } else if (argIdx < args.length) {
              const rawVal = args[argIdx++];
              if (typeChar === 'd' || typeChar === 'i' || typeChar === 'u' || typeChar === 'ld' || typeChar === 'lld') {
                formatted += Math.trunc(Number(rawVal));
              } else if (typeChar === 'f' || typeChar === 'lf') {
                if (specifier.includes('.')) {
                  const precMatch = specifier.match(/\.(\d+)/);
                  const prec = precMatch ? parseInt(precMatch[1], 10) : 6;
                  formatted += Number(rawVal).toFixed(prec);
                } else {
                  formatted += Number(rawVal).toFixed(6);
                }
              } else if (typeChar === 'c') {
                formatted += typeof rawVal === 'number' ? String.fromCharCode(rawVal) : String(rawVal)[0];
              } else if (typeChar === 's') {
                formatted += this.toCString(rawVal);
              } else {
                formatted += this.toCString(rawVal);
              }
            }
          } else {
            formatted += formatStr[i];
          }
        }
        this.appendStdout(formatted);
        return formatted.length;
      }
    });

    // sprintf
    this.functions.set('sprintf', {
      type: 'BuiltinFunction',
      name: 'sprintf',
      call: (args: any[], scope: Map<string, any>, astArgs: ASTNode[]) => {
        if (args.length < 2) return 0;
        const formatStr = this.toCString(args[1]);
        let argIdx = 2;
        let formatted = '';

        for (let i = 0; i < formatStr.length; i++) {
          if (formatStr[i] === '%' && i + 1 < formatStr.length) {
            i++;
            while (i < formatStr.length && !'diufFeEgGxXoscpa%'.includes(formatStr[i])) {
              i++;
            }
            const typeChar = formatStr[i];
            if (typeChar === '%') {
              formatted += '%';
            } else if (argIdx < args.length) {
              const rawVal = args[argIdx++];
              if (typeChar === 'd' || typeChar === 'i' || typeChar === 'ld') formatted += Math.trunc(Number(rawVal));
              else if (typeChar === 'f' || typeChar === 'lf') formatted += Number(rawVal).toFixed(6);
              else if (typeChar === 'c') formatted += typeof rawVal === 'number' ? String.fromCharCode(rawVal) : String(rawVal)[0];
              else formatted += this.toCString(rawVal);
            }
          } else {
            formatted += formatStr[i];
          }
        }
        if (astArgs && astArgs[0]) {
          this.assignTarget(astArgs[0], formatted, scope);
        }
        return formatted.length;
      }
    });

    // scanf
    this.functions.set('scanf', {
      type: 'BuiltinFunction',
      name: 'scanf',
      call: (args: any[], scope: Map<string, any>, astArgs: ASTNode[]) => {
        if (args.length === 0) return 0;
        const formatStr = this.toCString(args[0]);
        let matchedCount = 0;
        let argIdx = 1;
        let fmtIdx = 0;

        while (fmtIdx < formatStr.length) {
          const char = formatStr[fmtIdx];

          // Whitespace in format string matches 0 or more whitespace characters in input
          if (/\s/.test(char)) {
            while (fmtIdx < formatStr.length && /\s/.test(formatStr[fmtIdx])) {
              fmtIdx++;
            }
            while (this.ctx.inputIndex < this.ctx.inputBuffer.length && /\s/.test(this.ctx.inputBuffer[this.ctx.inputIndex])) {
              this.ctx.inputIndex++;
            }
            continue;
          }

          if (char === '%') {
            fmtIdx++;
            if (fmtIdx >= formatStr.length) break;

            if (formatStr[fmtIdx] === '%') {
              if (this.ctx.inputBuffer[this.ctx.inputIndex] === '%') {
                this.ctx.inputIndex++;
              }
              fmtIdx++;
              continue;
            }

            // Check for scanset format %[^\n] or %[0-9]
            if (formatStr[fmtIdx] === '[') {
              const closeBracketIdx = formatStr.indexOf(']', fmtIdx);
              if (closeBracketIdx !== -1) {
                const scanset = formatStr.slice(fmtIdx + 1, closeBracketIdx);
                fmtIdx = closeBracketIdx + 1;
                if (formatStr[fmtIdx] === 's') fmtIdx++;

                if (argIdx < astArgs.length) {
                  const targetAst = astArgs[argIdx++];
                  let matchStr = '';
                  if (scanset.startsWith('^')) {
                    const negated = scanset.slice(1).replace(/\\n/g, '\n').replace(/\\t/g, '\t');
                    while (this.ctx.inputIndex < this.ctx.inputBuffer.length && !negated.includes(this.ctx.inputBuffer[this.ctx.inputIndex])) {
                      matchStr += this.ctx.inputBuffer[this.ctx.inputIndex++];
                    }
                  } else {
                    const allowed = scanset.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
                    while (this.ctx.inputIndex < this.ctx.inputBuffer.length && allowed.includes(this.ctx.inputBuffer[this.ctx.inputIndex])) {
                      matchStr += this.ctx.inputBuffer[this.ctx.inputIndex++];
                    }
                  }
                  this.assignTarget(targetAst, matchStr, scope);
                  matchedCount++;
                }
                continue;
              }
            }

            // Parse specifiers (e.g. %d, %i, %ld, %lld, %f, %lf, %s, %c, %x, %o)
            while (fmtIdx < formatStr.length && !'diufFeEgGxXoscpa'.includes(formatStr[fmtIdx])) {
              fmtIdx++;
            }
            if (fmtIdx >= formatStr.length) break;
            const typeChar = formatStr[fmtIdx];
            fmtIdx++;

            if (argIdx >= astArgs.length) break;
            const targetAst = astArgs[argIdx];
            argIdx++;

            // Skip leading whitespace for all specifiers except %c
            if (typeChar !== 'c') {
              while (this.ctx.inputIndex < this.ctx.inputBuffer.length && /\s/.test(this.ctx.inputBuffer[this.ctx.inputIndex])) {
                this.ctx.inputIndex++;
              }
            }

            if (this.ctx.inputIndex >= this.ctx.inputBuffer.length) {
              break; // EOF
            }

            const remaining = this.ctx.inputBuffer.slice(this.ctx.inputIndex);

            if (typeChar === 'd' || typeChar === 'i' || typeChar === 'u' || typeChar === 'ld' || typeChar === 'lld') {
              const match = remaining.match(/^([+-]?\d+)/);
              if (match) {
                const num = parseInt(match[1], 10);
                this.assignTarget(targetAst, num, scope);
                this.ctx.inputIndex += match[0].length;
                matchedCount++;
              } else {
                break;
              }
            } else if (typeChar === 'x' || typeChar === 'X') {
              const match = remaining.match(/^([+-]?(0x)?[0-9a-fA-F]+)/);
              if (match) {
                const num = parseInt(match[1], 16);
                this.assignTarget(targetAst, num, scope);
                this.ctx.inputIndex += match[0].length;
                matchedCount++;
              } else {
                break;
              }
            } else if (typeChar === 'o') {
              const match = remaining.match(/^([+-]?[0-7]+)/);
              if (match) {
                const num = parseInt(match[1], 8);
                this.assignTarget(targetAst, num, scope);
                this.ctx.inputIndex += match[0].length;
                matchedCount++;
              } else {
                break;
              }
            } else if (typeChar === 'f' || typeChar === 'lf' || typeChar === 'F' || typeChar === 'e' || typeChar === 'E' || typeChar === 'g' || typeChar === 'G') {
              const match = remaining.match(/^([+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?)/);
              if (match) {
                const num = parseFloat(match[1]);
                this.assignTarget(targetAst, num, scope);
                this.ctx.inputIndex += match[0].length;
                matchedCount++;
              } else {
                break;
              }
            } else if (typeChar === 's') {
              const match = remaining.match(/^(\S+)/);
              if (match) {
                const str = match[1];
                this.assignTarget(targetAst, str, scope);
                this.ctx.inputIndex += match[0].length;
                matchedCount++;
              } else {
                break;
              }
            } else if (typeChar === 'c') {
              const ch = this.ctx.inputBuffer[this.ctx.inputIndex];
              if (ch !== undefined) {
                this.assignTarget(targetAst, ch.charCodeAt(0), scope);
                this.ctx.inputIndex++;
                matchedCount++;
              } else {
                break;
              }
            }
          } else {
            // Literal char match
            if (this.ctx.inputBuffer[this.ctx.inputIndex] === char) {
              this.ctx.inputIndex++;
            }
            fmtIdx++;
          }
        }

        return matchedCount;
      }
    });

    // puts
    this.functions.set('puts', {
      type: 'BuiltinFunction',
      name: 'puts',
      call: (args: any[]) => {
        const str = this.toCString(args[0]);
        this.appendStdout(str + '\n');
        return 0;
      }
    });

    // gets
    this.functions.set('gets', {
      type: 'BuiltinFunction',
      name: 'gets',
      call: (args: any[], scope: Map<string, any>, astArgs: ASTNode[]) => {
        if (this.ctx.inputIndex >= this.ctx.inputBuffer.length) return null;
        let line = '';
        while (this.ctx.inputIndex < this.ctx.inputBuffer.length && this.ctx.inputBuffer[this.ctx.inputIndex] !== '\n') {
          line += this.ctx.inputBuffer[this.ctx.inputIndex++];
        }
        if (this.ctx.inputIndex < this.ctx.inputBuffer.length && this.ctx.inputBuffer[this.ctx.inputIndex] === '\n') {
          this.ctx.inputIndex++;
        }
        if (astArgs && astArgs[0]) {
          this.assignTarget(astArgs[0], line, scope);
        }
        return line;
      }
    });

    // fgets(str, size, stream)
    this.functions.set('fgets', {
      type: 'BuiltinFunction',
      name: 'fgets',
      call: (args: any[], scope: Map<string, any>, astArgs: ASTNode[]) => {
        if (this.ctx.inputIndex >= this.ctx.inputBuffer.length) return null;
        const maxLen = Number(args[1]) || 1024;
        let line = '';
        while (this.ctx.inputIndex < this.ctx.inputBuffer.length && line.length < maxLen - 1) {
          const ch = this.ctx.inputBuffer[this.ctx.inputIndex++];
          line += ch;
          if (ch === '\n') break;
        }
        if (astArgs && astArgs[0]) {
          this.assignTarget(astArgs[0], line, scope);
        }
        return line;
      }
    });

    // fgetc(stream)
    this.functions.set('fgetc', {
      type: 'BuiltinFunction',
      name: 'fgetc',
      call: () => {
        if (this.ctx.inputIndex >= this.ctx.inputBuffer.length) return -1;
        return this.ctx.inputBuffer.charCodeAt(this.ctx.inputIndex++);
      }
    });

    // fputc(c, stream)
    this.functions.set('fputc', {
      type: 'BuiltinFunction',
      name: 'fputc',
      call: (args: any[]) => {
        const charCode = Number(args[0]);
        this.appendStdout(String.fromCharCode(charCode));
        return charCode;
      }
    });

    // fputs(str, stream)
    this.functions.set('fputs', {
      type: 'BuiltinFunction',
      name: 'fputs',
      call: (args: any[]) => {
        const str = this.toCString(args[0]);
        this.appendStdout(str);
        return 0;
      }
    });

    // fflush(stream)
    this.functions.set('fflush', {
      type: 'BuiltinFunction',
      name: 'fflush',
      call: () => 0
    });

    // feof(stream)
    this.functions.set('feof', {
      type: 'BuiltinFunction',
      name: 'feof',
      call: () => this.ctx.inputIndex >= this.ctx.inputBuffer.length ? 1 : 0
    });

    // putchar / getchar
    this.functions.set('putchar', {
      type: 'BuiltinFunction',
      name: 'putchar',
      call: (args: any[]) => {
        const charCode = Number(args[0]);
        this.appendStdout(String.fromCharCode(charCode));
        return charCode;
      }
    });

    this.functions.set('getchar', {
      type: 'BuiltinFunction',
      name: 'getchar',
      call: () => {
        if (this.ctx.inputIndex >= this.ctx.inputBuffer.length) return -1; // EOF
        const charCode = this.ctx.inputBuffer.charCodeAt(this.ctx.inputIndex++);
        return charCode;
      }
    });

    // math.h standard functions
    const mathFuncs: Record<string, Function> = {
      sqrt: Math.sqrt,
      pow: Math.pow,
      abs: Math.abs,
      fabs: Math.abs,
      ceil: Math.ceil,
      floor: Math.floor,
      sin: Math.sin,
      cos: Math.cos,
      tan: Math.tan,
      asin: Math.asin,
      acos: Math.acos,
      atan: Math.atan,
      atan2: Math.atan2,
      log: Math.log,
      log10: Math.log10,
      exp: Math.exp,
      round: Math.round,
      min: (a: number, b: number) => Math.min(a, b),
      max: (a: number, b: number) => Math.max(a, b),
      fmin: (a: number, b: number) => Math.min(a, b),
      fmax: (a: number, b: number) => Math.max(a, b),
    };

    for (const [name, fn] of Object.entries(mathFuncs)) {
      this.functions.set(name, {
        type: 'BuiltinFunction',
        name,
        call: (args: any[]) => fn(...args)
      });
    }

    // ctype.h functions
    this.functions.set('isalpha', {
      type: 'BuiltinFunction',
      name: 'isalpha',
      call: (args: any[]) => {
        const ch = typeof args[0] === 'number' ? String.fromCharCode(args[0]) : String(args[0])[0];
        return /^[a-zA-Z]$/.test(ch) ? 1 : 0;
      }
    });

    this.functions.set('isdigit', {
      type: 'BuiltinFunction',
      name: 'isdigit',
      call: (args: any[]) => {
        const ch = typeof args[0] === 'number' ? String.fromCharCode(args[0]) : String(args[0])[0];
        return /^[0-9]$/.test(ch) ? 1 : 0;
      }
    });

    this.functions.set('isalnum', {
      type: 'BuiltinFunction',
      name: 'isalnum',
      call: (args: any[]) => {
        const ch = typeof args[0] === 'number' ? String.fromCharCode(args[0]) : String(args[0])[0];
        return /^[a-zA-Z0-9]$/.test(ch) ? 1 : 0;
      }
    });

    this.functions.set('isspace', {
      type: 'BuiltinFunction',
      name: 'isspace',
      call: (args: any[]) => {
        const ch = typeof args[0] === 'number' ? String.fromCharCode(args[0]) : String(args[0])[0];
        return /\s/.test(ch) ? 1 : 0;
      }
    });

    this.functions.set('tolower', {
      type: 'BuiltinFunction',
      name: 'tolower',
      call: (args: any[]) => {
        const code = Number(args[0]);
        const ch = String.fromCharCode(code).toLowerCase();
        return ch.charCodeAt(0);
      }
    });

    this.functions.set('toupper', {
      type: 'BuiltinFunction',
      name: 'toupper',
      call: (args: any[]) => {
        const code = Number(args[0]);
        const ch = String.fromCharCode(code).toUpperCase();
        return ch.charCodeAt(0);
      }
    });

    // stdlib.h conversion functions
    this.functions.set('atoi', {
      type: 'BuiltinFunction',
      name: 'atoi',
      call: (args: any[]) => parseInt(String(args[0] || '0'), 10) || 0
    });

    this.functions.set('atof', {
      type: 'BuiltinFunction',
      name: 'atof',
      call: (args: any[]) => parseFloat(String(args[0] || '0')) || 0
    });

    this.functions.set('atol', {
      type: 'BuiltinFunction',
      name: 'atol',
      call: (args: any[]) => parseInt(String(args[0] || '0'), 10) || 0
    });

    // string.h standard functions
    this.functions.set('strlen', {
      type: 'BuiltinFunction',
      name: 'strlen',
      call: (args: any[]) => String(args[0] || '').length
    });

    this.functions.set('strcmp', {
      type: 'BuiltinFunction',
      name: 'strcmp',
      call: (args: any[]) => {
        const s1 = String(args[0] || '');
        const s2 = String(args[1] || '');
        return s1.localeCompare(s2);
      }
    });

    this.functions.set('strncmp', {
      type: 'BuiltinFunction',
      name: 'strncmp',
      call: (args: any[]) => {
        const s1 = String(args[0] || '').slice(0, Number(args[2]));
        const s2 = String(args[1] || '').slice(0, Number(args[2]));
        return s1.localeCompare(s2);
      }
    });

    this.functions.set('strcpy', {
      type: 'BuiltinFunction',
      name: 'strcpy',
      call: (args: any[], scope: Map<string, any>, astArgs: ASTNode[]) => {
        const src = String(args[1] || '');
        if (astArgs && astArgs[0]) {
          this.assignTarget(astArgs[0], src, scope);
        }
        return src;
      }
    });

    this.functions.set('strcat', {
      type: 'BuiltinFunction',
      name: 'strcat',
      call: (args: any[], scope: Map<string, any>, astArgs: ASTNode[]) => {
        const dest = String(args[0] || '');
        const src = String(args[1] || '');
        const combined = dest + src;
        if (astArgs && astArgs[0]) {
          this.assignTarget(astArgs[0], combined, scope);
        }
        return combined;
      }
    });
  }

  private createNDArray(sizes: (ASTNode | null)[], scope: Map<string, any>, depth: number = 0): any[] {
    const sizeExpr = sizes[depth];
    const evaluatedSize = sizeExpr ? Number(this.evaluateExpression(sizeExpr, scope)) : 100;
    const currentSize = Math.max(1, !isNaN(evaluatedSize) && evaluatedSize > 0 ? Math.trunc(evaluatedSize) : 100);

    if (depth === sizes.length - 1) {
      return new Array(currentSize).fill(0);
    }

    return Array.from({ length: currentSize }, () => this.createNDArray(sizes, scope, depth + 1));
  }

  private fillNDArray(arr: any[], initNode: ASTNode, scope: Map<string, any>): void {
    if (!initNode || initNode.type !== 'ArrayInitializer') return;
    for (let i = 0; i < initNode.elements.length; i++) {
      const elem = initNode.elements[i];
      if (elem.type === 'ArrayInitializer') {
        if (Array.isArray(arr[i])) {
          this.fillNDArray(arr[i], elem, scope);
        }
      } else {
        arr[i] = this.evaluateExpression(elem, scope);
      }
    }
  }

  private assignTarget(astNode: ASTNode, value: any, scope: Map<string, any>): void {
    let target = astNode;
    if (target.type === 'UnaryExpression' && target.operator === '&') {
      target = target.argument;
    }

    if (target.type === 'Identifier') {
      if (scope.has(target.name)) {
        scope.set(target.name, value);
      } else {
        this.globalScope.set(target.name, value);
      }
    } else if (target.type === 'MemberExpression') {
      const obj = this.evaluateExpression(target.object, scope);
      const prop = target.computed
        ? this.evaluateExpression(target.property, scope)
        : target.property.name;
      if (obj !== null && obj !== undefined && (typeof obj === 'object' || Array.isArray(obj))) {
        obj[prop] = value;
      }
    }
  }

  public execute(program: ASTNode): { stdout: string; stderr: string; exitCode: number } {
    // 1. Collect all function definitions and global declarations
    for (const item of program.body) {
      if (item.type === 'FunctionDefinition') {
        this.functions.set(item.name, item);
      } else if (item.type === 'VariableDeclaration' || item.type === 'VariableDeclarationList') {
        this.executeStatement(item, this.globalScope);
      }
    }

    // 2. Locate main function
    const mainFunc = this.functions.get('main');
    if (!mainFunc) {
      throw new RuntimeError("Undefined reference to 'main'. Program must contain a main() function.");
    }

    // 3. Execute main
    const exitCode = this.callFunction(mainFunc, [], this.globalScope);
    return {
      stdout: this.ctx.stdout,
      stderr: this.ctx.stderr,
      exitCode: typeof exitCode === 'number' ? exitCode : 0,
    };
  }

  private callFunction(funcNode: ASTNode, args: any[], callingScope: Map<string, any>, astArgs: ASTNode[] = []): any {
    if (funcNode.type === 'BuiltinFunction') {
      return funcNode.call(args, callingScope, astArgs);
    }

    const localScope = new Map<string, any>(this.globalScope);

    // Bind parameters
    for (let i = 0; i < funcNode.params.length; i++) {
      const param = funcNode.params[i];
      localScope.set(param.name, args[i] !== undefined ? args[i] : 0);
    }

    const result = this.executeStatement(funcNode.body, localScope);
    if (result && result.isReturn) {
      return result.value;
    }
    return 0;
  }

  private executeStatement(stmt: ASTNode, scope: Map<string, any>): any {
    this.ctx.stepCount++;
    if (this.ctx.stepCount > this.ctx.maxExecutionSteps) {
      throw new RuntimeError("Time limit or step count exceeded");
    }

    switch (stmt.type) {
      case 'BlockStatement': {
        const blockScope = new Map<string, any>(scope);
        for (const s of stmt.statements) {
          const res = this.executeStatement(s, blockScope);
          if (res && (res.isReturn || res.isBreak || res.isContinue)) {
            // sync scope back for modifications
            for (const [k, v] of blockScope.entries()) {
              if (scope.has(k)) scope.set(k, v);
            }
            return res;
          }
        }
        for (const [k, v] of blockScope.entries()) {
          if (scope.has(k)) scope.set(k, v);
        }
        return null;
      }

      case 'VariableDeclarationList': {
        for (const decl of stmt.declarations) {
          this.executeStatement(decl, scope);
        }
        return null;
      }

      case 'VariableDeclaration': {
        let val: any = 0;
        if (stmt.arraySizes && stmt.arraySizes.length > 0) {
          val = this.createNDArray(stmt.arraySizes, scope, 0);
          if (stmt.initialValue && stmt.initialValue.type === 'ArrayInitializer') {
            this.fillNDArray(val, stmt.initialValue, scope);
          }
        } else if (stmt.initialValue) {
          val = this.evaluateExpression(stmt.initialValue, scope);
        }
        scope.set(stmt.name, val);
        return null;
      }

      case 'ExpressionStatement': {
        this.evaluateExpression(stmt.expression, scope);
        return null;
      }

      case 'IfStatement': {
        const cond = this.evaluateExpression(stmt.condition, scope);
        if (Boolean(cond)) {
          return this.executeStatement(stmt.thenBranch, scope);
        } else if (stmt.elseBranch) {
          return this.executeStatement(stmt.elseBranch, scope);
        }
        return null;
      }

      case 'WhileStatement': {
        while (Boolean(this.evaluateExpression(stmt.condition, scope))) {
          const res = this.executeStatement(stmt.body, scope);
          if (res && res.isBreak) break;
          if (res && res.isReturn) return res;
        }
        return null;
      }

      case 'DoWhileStatement': {
        do {
          const res = this.executeStatement(stmt.body, scope);
          if (res && res.isBreak) break;
          if (res && res.isReturn) return res;
        } while (Boolean(this.evaluateExpression(stmt.condition, scope)));
        return null;
      }

      case 'ForStatement': {
        const forScope = new Map<string, any>(scope);
        if (stmt.init) {
          if (stmt.init.type === 'VariableDeclarationList' || stmt.init.type === 'VariableDeclaration') {
            this.executeStatement(stmt.init, forScope);
          } else {
            this.evaluateExpression(stmt.init, forScope);
          }
        }

        while (!stmt.test || Boolean(this.evaluateExpression(stmt.test, forScope))) {
          const res = this.executeStatement(stmt.body, forScope);
          if (res && res.isBreak) break;
          if (res && res.isReturn) {
            for (const [k, v] of forScope.entries()) {
              if (scope.has(k)) scope.set(k, v);
            }
            return res;
          }
          if (stmt.update) {
            this.evaluateExpression(stmt.update, forScope);
          }
        }
        for (const [k, v] of forScope.entries()) {
          if (scope.has(k)) scope.set(k, v);
        }
        return null;
      }

      case 'ReturnStatement': {
        const val = stmt.value ? this.evaluateExpression(stmt.value, scope) : 0;
        return { isReturn: true, value: val };
      }

      case 'BreakStatement': {
        return { isBreak: true };
      }

      case 'ContinueStatement': {
        return { isContinue: true };
      }

      default:
        return null;
    }
  }

  private evaluateExpression(expr: ASTNode, scope: Map<string, any>): any {
    switch (expr.type) {
      case 'Literal':
        return expr.value;

      case 'Identifier': {
        if (scope.has(expr.name)) {
          return scope.get(expr.name);
        }
        if (this.globalScope.has(expr.name)) {
          return this.globalScope.get(expr.name);
        }
        if (this.functions.has(expr.name)) {
          return this.functions.get(expr.name);
        }
        throw new RuntimeError(`Use of undeclared variable '${expr.name}'`);
      }

      case 'AssignmentExpression': {
        const rightVal = this.evaluateExpression(expr.right, scope);
        if (expr.left.type === 'Identifier') {
          const varName = expr.left.name;
          const currentVal = scope.has(varName) ? scope.get(varName) : (this.globalScope.get(varName) || 0);
          let finalVal = rightVal;
          if (expr.operator === '+=') finalVal = currentVal + rightVal;
          else if (expr.operator === '-=') finalVal = currentVal - rightVal;
          else if (expr.operator === '*=') finalVal = currentVal * rightVal;
          else if (expr.operator === '/=') finalVal = Math.trunc(currentVal / rightVal);
          else if (expr.operator === '%=') finalVal = currentVal % rightVal;

          if (scope.has(varName)) scope.set(varName, finalVal);
          else this.globalScope.set(varName, finalVal);
          return finalVal;
        } else if (expr.left.type === 'MemberExpression') {
          const obj = this.evaluateExpression(expr.left.object, scope);
          const prop = expr.left.computed
            ? this.evaluateExpression(expr.left.property, scope)
            : expr.left.property.name;
          let finalVal = rightVal;
          if (expr.operator === '+=') finalVal = (obj[prop] !== undefined ? obj[prop] : 0) + rightVal;
          else if (expr.operator === '-=') finalVal = (obj[prop] !== undefined ? obj[prop] : 0) - rightVal;
          else if (expr.operator === '*=') finalVal = (obj[prop] !== undefined ? obj[prop] : 0) * rightVal;
          else if (expr.operator === '/=') finalVal = Math.trunc((obj[prop] !== undefined ? obj[prop] : 0) / rightVal);
          else if (expr.operator === '%=') finalVal = (obj[prop] !== undefined ? obj[prop] : 0) % rightVal;

          if (typeof obj === 'string' && expr.left.object.type === 'Identifier') {
            const varName = expr.left.object.name;
            const chars = obj.split('');
            const idx = Number(prop);
            const charStr = typeof finalVal === 'number' ? String.fromCharCode(finalVal) : String(finalVal)[0];
            chars[idx] = charStr;
            const newStr = chars.join('');
            if (scope.has(varName)) scope.set(varName, newStr);
            else this.globalScope.set(varName, newStr);
            return finalVal;
          } else if (obj !== null && obj !== undefined && (typeof obj === 'object' || Array.isArray(obj))) {
            obj[prop] = finalVal;
          }
          return finalVal;
        }
        throw new RuntimeError("Invalid lvalue in assignment");
      }

      case 'BinaryExpression': {
        const left = this.evaluateExpression(expr.left, scope);
        const right = this.evaluateExpression(expr.right, scope);

        switch (expr.operator) {
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/': return typeof left === 'number' && Number.isInteger(left) && Number.isInteger(right) ? Math.trunc(left / right) : left / right;
          case '%': return left % right;
          case '==': return left == right ? 1 : 0;
          case '!=': return left != right ? 1 : 0;
          case '<': return left < right ? 1 : 0;
          case '<=': return left <= right ? 1 : 0;
          case '>': return left > right ? 1 : 0;
          case '>=': return left >= right ? 1 : 0;
          case '&&': return (Boolean(left) && Boolean(right)) ? 1 : 0;
          case '||': return (Boolean(left) || Boolean(right)) ? 1 : 0;
          case '&': return left & right;
          case '|': return left | right;
          case '^': return left ^ right;
          case '<<': return left << right;
          case '>>': return left >> right;
          default:
            throw new RuntimeError(`Unsupported binary operator '${expr.operator}'`);
        }
      }

      case 'UnaryExpression': {
        if (expr.prefix) {
          if (expr.operator === '++' || expr.operator === '--') {
            const current = this.evaluateExpression(expr.argument, scope);
            const next = expr.operator === '++' ? current + 1 : current - 1;
            this.assignTarget(expr.argument, next, scope);
            return next;
          }
          const val = this.evaluateExpression(expr.argument, scope);
          switch (expr.operator) {
            case '!': return !val ? 1 : 0;
            case '~': return ~val;
            case '-': return -val;
            case '+': return +val;
            case '&': return expr.argument; // address representation
            case '*': return val; // dereference
            default:
              throw new RuntimeError(`Unsupported unary operator '${expr.operator}'`);
          }
        } else {
          // Postfix ++ / --
          const current = this.evaluateExpression(expr.argument, scope);
          const next = expr.operator === '++' ? current + 1 : current - 1;
          this.assignTarget(expr.argument, next, scope);
          return current;
        }
      }

      case 'ConditionalExpression': {
        const cond = this.evaluateExpression(expr.condition, scope);
        return Boolean(cond)
          ? this.evaluateExpression(expr.trueBranch, scope)
          : this.evaluateExpression(expr.falseBranch, scope);
      }

      case 'MemberExpression': {
        const obj = this.evaluateExpression(expr.object, scope);
        const prop = expr.computed
          ? this.evaluateExpression(expr.property, scope)
          : expr.property.name;
        if (obj === undefined || obj === null) {
          throw new RuntimeError("Cannot read property of null or undefined array/object");
        }
        if (typeof obj === 'string') {
          const idx = Number(prop);
          if (idx >= 0 && idx < obj.length) {
            return obj.charCodeAt(idx);
          }
          return 0; // null terminator '\0'
        }
        return obj[prop] !== undefined ? obj[prop] : 0;
      }

      case 'CallExpression': {
        let calleeName = '';
        if (expr.callee.type === 'Identifier') {
          calleeName = expr.callee.name;
        }
        const func = this.functions.get(calleeName);
        if (!func) {
          throw new RuntimeError(`Call to undeclared function '${calleeName}'`);
        }
        const evaluatedArgs = expr.arguments.map((a: ASTNode) => this.evaluateExpression(a, scope));
        return this.callFunction(func, evaluatedArgs, scope, expr.arguments);
      }

      case 'SizeofTypeExpression': {
        if (['char', 'bool'].includes(expr.typeName)) return 1;
        if (['short'].includes(expr.typeName)) return 2;
        if (['int', 'float', 'long'].includes(expr.typeName)) return 4;
        if (['double', 'long long'].includes(expr.typeName)) return 8;
        return 4;
      }

      case 'SizeofExprExpression': {
        if (expr.argument.type === 'Identifier') {
          const varName = expr.argument.name;
          const val = scope.has(varName) ? scope.get(varName) : this.globalScope.get(varName);
          if (Array.isArray(val)) return val.length * 4;
          if (typeof val === 'string') return Math.max(val.length + 1, 1024);
        }
        const val = this.evaluateExpression(expr.argument, scope);
        if (Array.isArray(val)) return val.length * 4;
        if (typeof val === 'string') return Math.max(val.length + 1, 1024);
        return 4;
      }

      default:
        return 0;
    }
  }
}
