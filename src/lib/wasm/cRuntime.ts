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

export class CPointer {
  target: any; // Map (scope), Array, or Object
  prop: string | number;
  offset: number;

  constructor(target: any, prop: string | number = '', offset: number = 0) {
    this.target = target;
    this.prop = prop;
    this.offset = offset;
  }

  get(): any {
    if (this.target instanceof Map) {
      const val = this.target.get(this.prop);
      if (Array.isArray(val)) {
        return val[this.offset];
      }
      if (val instanceof CPointer) {
        return val.get();
      }
      return val;
    }
    if (Array.isArray(this.target)) {
      const idx = Number(this.prop) + this.offset;
      if (!isNaN(idx)) {
        return this.target[idx];
      }
      return (this.target as any)[this.prop] !== undefined ? (this.target as any)[this.prop] : 0;
    }
    if (this.target && typeof this.target === 'object') {
      if (this.prop !== undefined && this.prop !== '') {
        return this.target[this.prop];
      }
      return this.target;
    }
    return 0;
  }

  set(val: any): void {
    if (this.target instanceof Map) {
      const current = this.target.get(this.prop);
      if (Array.isArray(current)) {
        current[this.offset] = val;
      } else if (current instanceof CPointer) {
        current.set(val);
      } else {
        this.target.set(this.prop, val);
      }
    } else if (Array.isArray(this.target)) {
      const idx = Number(this.prop) + this.offset;
      if (!isNaN(idx)) {
        this.target[idx] = val;
      } else {
        (this.target as any)[this.prop] = val;
      }
    } else if (this.target && typeof this.target === 'object') {
      if (this.prop !== undefined && this.prop !== '') {
        this.target[this.prop] = val;
      }
    }
  }
}

export interface StructField {
  name: string;
  type: string;
  isPointer: boolean;
  arraySizes: (ASTNode | null)[];
}

export interface StructDefinition {
  kind: 'struct' | 'union';
  name?: string;
  fields: StructField[];
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
  'struct', 'union', 'typedef', 'sizeof', 'const', 'static', 'bool', 'true', 'false'
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

      if ('(){}[];,.'.includes(char)) {
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
  private structDefs: Map<string, StructDefinition> = new Map();
  private typedefs: Set<string> = new Set();

  constructor(tokens: Token[]) {
    // Filter out preprocessor tokens for the parser
    this.tokens = tokens.filter(t => t.type !== TokenType.PREPROCESSOR);
  }

  public parse(): ASTNode {
    const program: ASTNode = {
      type: 'Program',
      body: [],
      structDefs: this.structDefs,
    };

    while (!this.isAtEnd()) {
      if (this.match(';')) continue;

      if (this.match('typedef')) {
        const td = this.parseTypedef();
        if (Array.isArray(td)) program.body.push(...td);
        else program.body.push(td);
      } else if (this.isStructOrUnionDefinition()) {
        const def = this.parseStructOrUnionDefinition();
        if (Array.isArray(def)) program.body.push(...def);
        else program.body.push(def);
      } else {
        const decl = this.parseDeclarationOrFunction();
        if (Array.isArray(decl)) program.body.push(...decl);
        else program.body.push(decl);
      }
    }

    return program;
  }

  private isStructOrUnionDefinition(): boolean {
    if (!this.check('struct') && !this.check('union')) return false;
    const next1 = this.peekNext();
    if (!next1) return false;
    if (next1.value === '{') return true;
    if (next1.type === TokenType.IDENTIFIER) {
      const next2 = this.tokens[this.current + 2];
      if (next2 && next2.value === '{') return true;
    }
    return false;
  }

  private parseStructFields(): StructField[] {
    this.consume('{', "Expect '{' before struct/union fields");
    const fields: StructField[] = [];

    while (!this.check('}') && !this.isAtEnd()) {
      const fieldType = this.consumeType();
      do {
        let isPointer = false;
        while (this.match('*')) isPointer = true;
        const nameToken = this.consume(TokenType.IDENTIFIER, "Expect member name");
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
        fields.push({
          name: nameToken.value,
          type: fieldType,
          isPointer,
          arraySizes,
        });
      } while (this.match(','));
      this.consume(';', "Expect ';' after struct member declaration");
    }

    this.consume('}', "Expect '}' after struct/union body");
    return fields;
  }

  private parseStructOrUnionDefinition(): ASTNode | ASTNode[] {
    const kind = this.advance().value as 'struct' | 'union';
    let tag = '';
    if (this.check(TokenType.IDENTIFIER)) {
      tag = this.advance().value;
    }
    const fields = this.parseStructFields();
    const structDef: StructDefinition = { kind, name: tag, fields };
    if (tag) {
      this.structDefs.set(`${kind} ${tag}`, structDef);
      this.structDefs.set(tag, structDef);
    }

    const defNode: ASTNode = {
      type: 'StructDefinition',
      kind,
      name: tag,
      fields,
    };

    if (this.match(';')) {
      return defNode;
    }

    // struct Point { int x, y; } p1, p2;
    const decls: ASTNode[] = [];
    const typeName = tag ? `${kind} ${tag}` : kind;
    do {
      let isPointer = false;
      while (this.match('*')) isPointer = true;
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
        varType: typeName,
        name,
        isPointer,
        arraySizes,
        initialValue,
        line: nameToken.line,
      });
    } while (this.match(','));
    this.consume(';', "Expect ';' after struct variable declaration");

    return [defNode, { type: 'VariableDeclarationList', declarations: decls }];
  }

  private parseTypedef(): ASTNode | ASTNode[] {
    if (this.isStructOrUnionDefinition()) {
      const kind = this.advance().value as 'struct' | 'union';
      let tag = '';
      if (this.check(TokenType.IDENTIFIER)) {
        tag = this.advance().value;
      }
      const fields = this.parseStructFields();
      const aliases: string[] = [];
      do {
        let isPtr = false;
        while (this.match('*')) isPtr = true;
        const aliasToken = this.consume(TokenType.IDENTIFIER, "Expect alias name in typedef");
        this.typedefs.add(aliasToken.value);
        aliases.push(aliasToken.value);
        const structDef: StructDefinition = { kind, name: aliasToken.value, fields };
        this.structDefs.set(aliasToken.value, structDef);
        if (tag) {
          this.structDefs.set(`${kind} ${tag}`, structDef);
          this.structDefs.set(tag, structDef);
        }
      } while (this.match(','));
      this.consume(';', "Expect ';' after typedef");
      return {
        type: 'TypedefStructDeclaration',
        kind,
        tag,
        aliases,
        fields,
      };
    }

    // Normal typedef: typedef existing_type [*] alias;
    const baseType = this.consumeType();
    const aliases: string[] = [];
    do {
      let isPtr = false;
      while (this.match('*')) isPtr = true;
      const aliasToken = this.consume(TokenType.IDENTIFIER, "Expect alias name in typedef");
      this.typedefs.add(aliasToken.value);
      aliases.push(aliasToken.value);
      if (this.structDefs.has(baseType)) {
        this.structDefs.set(aliasToken.value, this.structDefs.get(baseType)!);
      }
    } while (this.match(','));
    this.consume(';', "Expect ';' after typedef");
    return {
      type: 'TypedefDeclaration',
      baseType,
      aliases,
    };
  }

  private parseDeclarationOrFunction(): ASTNode | ASTNode[] {
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

    const decls: ASTNode[] = [{
      type: 'VariableDeclaration',
      varType: returnType,
      name,
      isPointer,
      arraySizes,
      initialValue,
      line: nameToken.line,
    }];

    while (this.match(',')) {
      let nextIsPtr = false;
      while (this.match('*')) nextIsPtr = true;
      const nextName = this.consume(TokenType.IDENTIFIER, "Expect variable name").value;
      const nextArraySizes: (ASTNode | null)[] = [];
      while (this.match('[')) {
        if (this.match(']')) {
          nextArraySizes.push(null);
        } else {
          const sizeExpr = this.parseExpression();
          this.consume(']', "Expect ']' after array size");
          nextArraySizes.push(sizeExpr);
        }
      }
      let nextInit: ASTNode | null = null;
      if (this.match('=')) {
        nextInit = this.parseInitializer();
      }
      decls.push({
        type: 'VariableDeclaration',
        varType: returnType,
        name: nextName,
        isPointer: nextIsPtr,
        arraySizes: nextArraySizes,
        initialValue: nextInit,
        line: nameToken.line,
      });
    }

    this.consume(';', "Expect ';' after variable declaration");

    if (decls.length === 1) return decls[0];
    return { type: 'VariableDeclarationList', declarations: decls };
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
    if (this.match(';')) {
      return { type: 'EmptyStatement' };
    }

    if (this.match('typedef')) {
      const td = this.parseTypedef();
      if (Array.isArray(td)) return { type: 'CompoundStatement', statements: td };
      return td;
    }

    if (this.isStructOrUnionDefinition()) {
      const def = this.parseStructOrUnionDefinition();
      if (Array.isArray(def)) return { type: 'CompoundStatement', statements: def };
      return def;
    }

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
          if (this.match('.')) {
            const memberToken = this.consume(TokenType.IDENTIFIER, "Expect member name after '.' in designated initializer");
            this.consume('=', "Expect '=' after designated initializer member");
            const val = this.parseInitializer();
            elements.push({
              type: 'DesignatedInitializer',
              member: memberToken.value,
              value: val,
            });
          } else {
            elements.push(this.parseInitializer());
          }
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
    // Check for cast expression: ( type [*] ) unary_expr
    if (this.check('(')) {
      const savedPos = this.current;
      this.advance(); // consume '('
      if (this.isTypeSpecifier(this.peek())) {
        try {
          const castType = this.consumeType();
          let isPointer = false;
          while (this.match('*')) { isPointer = true; }
          if (this.match(')')) {
            const right = this.parseUnary();
            return {
              type: 'CastExpression',
              castType,
              isPointer,
              argument: right,
            };
          }
        } catch {
          // Not a cast
        }
      }
      this.current = savedPos; // rewind
    }

    if (this.match('!', '~', '-', '+', '*', '&', '++', '--', 'sizeof')) {
      const operator = this.previous().value;
      if (operator === 'sizeof' && this.match('(')) {
        if (this.isTypeSpecifier(this.peek())) {
          const typeName = this.consumeType();
          while (this.match('*')) { /* pointer size */ }
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
      } else if (this.match('.') || this.match('->')) {
        const operator = this.previous().value;
        const propToken = this.consume(TokenType.IDENTIFIER, `Expect member identifier after '${operator}'`);
        expr = {
          type: 'MemberExpression',
          object: expr,
          property: { type: 'Identifier', name: propToken.value },
          computed: false,
          operator,
        };
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
    if (!token) return false;
    if (['int', 'char', 'float', 'double', 'void', 'long', 'short', 'unsigned', 'signed', 'bool'].includes(token.value)) {
      return true;
    }
    if (token.value === 'struct' || token.value === 'union') {
      return true;
    }
    if (token.type === TokenType.IDENTIFIER && this.typedefs.has(token.value)) {
      return true;
    }
    return false;
  }

  private consumeType(): string {
    while (this.match('const') || this.match('static')) {
      // skip qualifiers
    }

    if (this.check('struct') || this.check('union')) {
      const kind = this.advance().value;
      if (this.check(TokenType.IDENTIFIER)) {
        const tag = this.advance().value;
        return `${kind} ${tag}`;
      }
      return kind;
    }

    if (this.check(TokenType.IDENTIFIER) && this.typedefs.has(this.peek().value)) {
      return this.advance().value;
    }

    let typeName = '';
    while (this.isTypeSpecifier(this.peek()) && !['struct', 'union'].includes(this.peek().value)) {
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
  private structDefs: Map<string, StructDefinition> = new Map();
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
    if (val instanceof CPointer) {
      if (Array.isArray(val.target)) {
        let str = '';
        for (let i = Number(val.prop) + val.offset; i < val.target.length; i++) {
          const ch = val.target[i];
          if (ch === 0 || ch === '\0' || ch === null || ch === undefined) break;
          str += typeof ch === 'number' ? String.fromCharCode(ch) : String(ch)[0];
        }
        return str;
      }
      return this.toCString(val.target);
    }
    if (typeof val === 'string') {
      const nullIdx = val.indexOf('\0');
      return nullIdx !== -1 ? val.slice(0, nullIdx) : val;
    }
    if (Array.isArray(val)) {
      let str = '';
      for (let i = 0; i < val.length; i++) {
        const ch = val[i];
        if (ch === 0 || ch === '\0' || ch === null || ch === undefined) break;
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
              } else if (typeChar === 'p') {
                formatted += rawVal === null ? '(nil)' : '0x' + (Math.abs(typeof rawVal === 'number' ? rawVal : 12345678)).toString(16);
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
      call: (args: any[]) => this.toCString(args[0]).length
    });

    this.functions.set('strcmp', {
      type: 'BuiltinFunction',
      name: 'strcmp',
      call: (args: any[]) => {
        const s1 = this.toCString(args[0]);
        const s2 = this.toCString(args[1]);
        if (s1 === s2) return 0;
        return s1 < s2 ? -1 : 1;
      }
    });

    this.functions.set('strncmp', {
      type: 'BuiltinFunction',
      name: 'strncmp',
      call: (args: any[]) => {
        const n = Number(args[2]) || 0;
        const s1 = this.toCString(args[0]).slice(0, n);
        const s2 = this.toCString(args[1]).slice(0, n);
        if (s1 === s2) return 0;
        return s1 < s2 ? -1 : 1;
      }
    });

    this.functions.set('strcpy', {
      type: 'BuiltinFunction',
      name: 'strcpy',
      call: (args: any[], scope: Map<string, any>, astArgs: ASTNode[]) => {
        const dest = args[0];
        const src = this.toCString(args[1]);
        if (dest instanceof CPointer && Array.isArray(dest.target)) {
          const startIdx = Number(dest.prop) + dest.offset;
          for (let i = 0; i < src.length; i++) {
            dest.target[startIdx + i] = src.charCodeAt(i);
          }
          dest.target[startIdx + src.length] = 0;
          return dest;
        }
        if (astArgs && astArgs[0]) {
          this.assignTarget(astArgs[0], src, scope);
        }
        return dest || src;
      }
    });

    this.functions.set('strncpy', {
      type: 'BuiltinFunction',
      name: 'strncpy',
      call: (args: any[], scope: Map<string, any>, astArgs: ASTNode[]) => {
        const dest = args[0];
        const src = this.toCString(args[1]);
        const n = Number(args[2]) || 0;
        if (dest instanceof CPointer && Array.isArray(dest.target)) {
          const startIdx = Number(dest.prop) + dest.offset;
          for (let i = 0; i < n; i++) {
            dest.target[startIdx + i] = i < src.length ? src.charCodeAt(i) : 0;
          }
          return dest;
        }
        const copied = src.slice(0, n);
        if (astArgs && astArgs[0]) {
          this.assignTarget(astArgs[0], copied, scope);
        }
        return dest || copied;
      }
    });

    this.functions.set('strcat', {
      type: 'BuiltinFunction',
      name: 'strcat',
      call: (args: any[], scope: Map<string, any>, astArgs: ASTNode[]) => {
        const dest = args[0];
        const destStr = this.toCString(args[0]);
        const srcStr = this.toCString(args[1]);
        const combined = destStr + srcStr;
        if (dest instanceof CPointer && Array.isArray(dest.target)) {
          const startIdx = Number(dest.prop) + dest.offset;
          for (let i = 0; i < combined.length; i++) {
            dest.target[startIdx + i] = combined.charCodeAt(i);
          }
          dest.target[startIdx + combined.length] = 0;
          return dest;
        }
        if (astArgs && astArgs[0]) {
          this.assignTarget(astArgs[0], combined, scope);
        }
        return dest || combined;
      }
    });

    this.functions.set('strncat', {
      type: 'BuiltinFunction',
      name: 'strncat',
      call: (args: any[], scope: Map<string, any>, astArgs: ASTNode[]) => {
        const dest = args[0];
        const destStr = this.toCString(args[0]);
        const n = Number(args[2]) || 0;
        const srcStr = this.toCString(args[1]).slice(0, n);
        const combined = destStr + srcStr;
        if (dest instanceof CPointer && Array.isArray(dest.target)) {
          const startIdx = Number(dest.prop) + dest.offset;
          for (let i = 0; i < combined.length; i++) {
            dest.target[startIdx + i] = combined.charCodeAt(i);
          }
          dest.target[startIdx + combined.length] = 0;
          return dest;
        }
        if (astArgs && astArgs[0]) {
          this.assignTarget(astArgs[0], combined, scope);
        }
        return dest || combined;
      }
    });

    this.functions.set('strcspn', {
      type: 'BuiltinFunction',
      name: 'strcspn',
      call: (args: any[]) => {
        const s = this.toCString(args[0]);
        const reject = this.toCString(args[1]);
        for (let i = 0; i < s.length; i++) {
          if (reject.includes(s[i])) {
            return i;
          }
        }
        return s.length;
      }
    });

    this.functions.set('strspn', {
      type: 'BuiltinFunction',
      name: 'strspn',
      call: (args: any[]) => {
        const s = this.toCString(args[0]);
        const accept = this.toCString(args[1]);
        for (let i = 0; i < s.length; i++) {
          if (!accept.includes(s[i])) {
            return i;
          }
        }
        return s.length;
      }
    });

    this.functions.set('strchr', {
      type: 'BuiltinFunction',
      name: 'strchr',
      call: (args: any[]) => {
        const ptr = args[0];
        const s = this.toCString(ptr);
        const ch = typeof args[1] === 'number' ? String.fromCharCode(args[1]) : String(args[1] || '')[0];
        const idx = s.indexOf(ch);
        if (idx === -1) return null;
        if (ptr instanceof CPointer) {
          return new CPointer(ptr.target, ptr.prop, ptr.offset + idx);
        }
        if (Array.isArray(ptr)) {
          return new CPointer(ptr, 0, idx);
        }
        return s.slice(idx);
      }
    });

    this.functions.set('strrchr', {
      type: 'BuiltinFunction',
      name: 'strrchr',
      call: (args: any[]) => {
        const ptr = args[0];
        const s = this.toCString(ptr);
        const ch = typeof args[1] === 'number' ? String.fromCharCode(args[1]) : String(args[1] || '')[0];
        const idx = s.lastIndexOf(ch);
        if (idx === -1) return null;
        if (ptr instanceof CPointer) {
          return new CPointer(ptr.target, ptr.prop, ptr.offset + idx);
        }
        if (Array.isArray(ptr)) {
          return new CPointer(ptr, 0, idx);
        }
        return s.slice(idx);
      }
    });

    this.functions.set('strstr', {
      type: 'BuiltinFunction',
      name: 'strstr',
      call: (args: any[]) => {
        const ptr = args[0];
        const haystack = this.toCString(ptr);
        const needle = this.toCString(args[1]);
        if (!needle) return ptr;
        const idx = haystack.indexOf(needle);
        if (idx === -1) return null;
        if (ptr instanceof CPointer) {
          return new CPointer(ptr.target, ptr.prop, ptr.offset + idx);
        }
        if (Array.isArray(ptr)) {
          return new CPointer(ptr, 0, idx);
        }
        return haystack.slice(idx);
      }
    });

    this.functions.set('strpbrk', {
      type: 'BuiltinFunction',
      name: 'strpbrk',
      call: (args: any[]) => {
        const ptr = args[0];
        const s = this.toCString(ptr);
        const accept = this.toCString(args[1]);
        for (let i = 0; i < s.length; i++) {
          if (accept.includes(s[i])) {
            if (ptr instanceof CPointer) return new CPointer(ptr.target, ptr.prop, ptr.offset + i);
            if (Array.isArray(ptr)) return new CPointer(ptr, 0, i);
            return s.slice(i);
          }
        }
        return null;
      }
    });

    this.functions.set('strdup', {
      type: 'BuiltinFunction',
      name: 'strdup',
      call: (args: any[]) => {
        const s = this.toCString(args[0]);
        const arr: any = new Array(s.length + 1).fill(0);
        for (let i = 0; i < s.length; i++) {
          arr[i] = s.charCodeAt(i);
        }
        arr[s.length] = 0;
        return new CPointer(arr, 0, 0);
      }
    });

    this.functions.set('memset', {
      type: 'BuiltinFunction',
      name: 'memset',
      call: (args: any[]) => {
        const ptr = args[0];
        const val = Number(args[1]) || 0;
        const num = Number(args[2]) || 0;
        if (ptr instanceof CPointer && Array.isArray(ptr.target)) {
          const startIdx = Number(ptr.prop) + ptr.offset;
          for (let i = 0; i < num; i++) {
            ptr.target[startIdx + i] = val;
          }
          return ptr;
        }
        if (Array.isArray(ptr)) {
          for (let i = 0; i < num; i++) {
            ptr[i] = val;
          }
          return ptr;
        }
        return ptr;
      }
    });

    this.functions.set('memcpy', {
      type: 'BuiltinFunction',
      name: 'memcpy',
      call: (args: any[]) => {
        const dest = args[0];
        const src = args[1];
        const num = Number(args[2]) || 0;
        const getVal = (p: any, i: number) => {
          if (p instanceof CPointer && Array.isArray(p.target)) {
            return p.target[Number(p.prop) + p.offset + i];
          }
          if (Array.isArray(p)) return p[i];
          if (typeof p === 'string') return p.charCodeAt(i);
          return 0;
        };
        const setVal = (p: any, i: number, v: any) => {
          if (p instanceof CPointer && Array.isArray(p.target)) {
            p.target[Number(p.prop) + p.offset + i] = v;
          } else if (Array.isArray(p)) {
            p[i] = v;
          }
        };
        for (let i = 0; i < num; i++) {
          setVal(dest, i, getVal(src, i));
        }
        return dest;
      }
    });

    this.functions.set('memmove', {
      type: 'BuiltinFunction',
      name: 'memmove',
      call: (args: any[]) => {
        const dest = args[0];
        const src = args[1];
        const num = Number(args[2]) || 0;
        const temp: any[] = [];
        const getVal = (p: any, i: number) => {
          if (p instanceof CPointer && Array.isArray(p.target)) {
            return p.target[Number(p.prop) + p.offset + i];
          }
          if (Array.isArray(p)) return p[i];
          if (typeof p === 'string') return p.charCodeAt(i);
          return 0;
        };
        const setVal = (p: any, i: number, v: any) => {
          if (p instanceof CPointer && Array.isArray(p.target)) {
            p.target[Number(p.prop) + p.offset + i] = v;
          } else if (Array.isArray(p)) {
            p[i] = v;
          }
        };
        for (let i = 0; i < num; i++) {
          temp.push(getVal(src, i));
        }
        for (let i = 0; i < num; i++) {
          setVal(dest, i, temp[i]);
        }
        return dest;
      }
    });

    this.functions.set('memcmp', {
      type: 'BuiltinFunction',
      name: 'memcmp',
      call: (args: any[]) => {
        const s1 = args[0];
        const s2 = args[1];
        const num = Number(args[2]) || 0;
        const getVal = (p: any, i: number) => {
          if (p instanceof CPointer && Array.isArray(p.target)) {
            return p.target[Number(p.prop) + p.offset + i] || 0;
          }
          if (Array.isArray(p)) return p[i] || 0;
          if (typeof p === 'string') return p.charCodeAt(i) || 0;
          return 0;
        };
        for (let i = 0; i < num; i++) {
          const diff = getVal(s1, i) - getVal(s2, i);
          if (diff !== 0) return diff;
        }
        return 0;
      }
    });

    // stdlib memory management
    this.functions.set('malloc', {
      type: 'BuiltinFunction',
      name: 'malloc',
      call: (args: any[]) => {
        const bytes = Math.max(1, Number(args[0]) || 4);
        const arr: any = new Array(bytes).fill(0);
        return new CPointer(arr, 0, 0);
      }
    });

    this.functions.set('calloc', {
      type: 'BuiltinFunction',
      name: 'calloc',
      call: (args: any[]) => {
        const num = Math.max(1, Number(args[0]) || 1);
        const size = Math.max(1, Number(args[1]) || 4);
        const total = num * size;
        const arr: any = new Array(total).fill(0);
        return new CPointer(arr, 0, 0);
      }
    });

    this.functions.set('free', {
      type: 'BuiltinFunction',
      name: 'free',
      call: () => 0
    });

    this.functions.set('realloc', {
      type: 'BuiltinFunction',
      name: 'realloc',
      call: (args: any[]) => {
        const ptr = args[0];
        const newBytes = Math.max(1, Number(args[1]) || 4);
        if (ptr instanceof CPointer && Array.isArray(ptr.target)) {
          while (ptr.target.length < newBytes) ptr.target.push(0);
          return ptr;
        }
        if (Array.isArray(ptr)) {
          while (ptr.length < newBytes) ptr.push(0);
          return new CPointer(ptr, 0, 0);
        }
        const arr: any = new Array(newBytes).fill(0);
        return new CPointer(arr, 0, 0);
      }
    });
  }

  public isStructType(typeName: string): boolean {
    if (!typeName) return false;
    const clean = typeName.replace(/\s*\*+$/, '').trim();
    return this.structDefs.has(clean) ||
           this.structDefs.has(clean.replace(/^(struct|union)\s+/, '')) ||
           clean.startsWith('struct ') ||
           clean.startsWith('union ');
  }

  public getStructDef(typeName: string): StructDefinition | undefined {
    if (!typeName) return undefined;
    const clean = typeName.replace(/\s*\*+$/, '').trim();
    if (this.structDefs.has(clean)) return this.structDefs.get(clean);
    const bare = clean.replace(/^(struct|union)\s+/, '');
    if (this.structDefs.has(bare)) return this.structDefs.get(bare);
    if (this.structDefs.has(`struct ${bare}`)) return this.structDefs.get(`struct ${bare}`);
    if (this.structDefs.has(`union ${bare}`)) return this.structDefs.get(`union ${bare}`);
    return undefined;
  }

  private getFieldSize(f: StructField): number {
    if (f.isPointer) return 8;
    let baseSize = 4;
    if (f.type === 'char' || f.type === 'bool') baseSize = 1;
    else if (f.type === 'short') baseSize = 2;
    else if (f.type === 'double' || f.type === 'long long') baseSize = 8;
    else if (this.isStructType(f.type)) baseSize = 16;
    if (f.arraySizes && f.arraySizes.length > 0) {
      let count = 1;
      for (const s of f.arraySizes) {
        count *= s && s.type === 'Literal' ? Number(s.value) : 10;
      }
      return baseSize * count;
    }
    return baseSize;
  }

  public getStructSize(typeName: string): number {
    const def = this.getStructDef(typeName);
    if (def && def.fields) {
      if (def.kind === 'union') {
        let maxFieldSize = 4;
        for (const f of def.fields) {
          const fieldSize = this.getFieldSize(f);
          if (fieldSize > maxFieldSize) maxFieldSize = fieldSize;
        }
        return maxFieldSize;
      } else {
        let total = 0;
        for (const f of def.fields) {
          total += this.getFieldSize(f);
        }
        return Math.max(total, 4);
      }
    }
    return 16;
  }

  private instantiateType(typeName: string, scope: Map<string, any>): any {
    const def = this.getStructDef(typeName);
    const obj: Record<string, any> = {};
    if (def && def.fields) {
      for (const f of def.fields) {
        if (f.arraySizes && f.arraySizes.length > 0) {
          if (f.type === 'char' && f.arraySizes.length === 1) {
            obj[f.name] = '';
          } else {
            obj[f.name] = this.createNDArray(f.arraySizes, scope, 0, f.type);
          }
        } else if (f.isPointer) {
          obj[f.name] = null;
        } else if (this.isStructType(f.type)) {
          obj[f.name] = this.instantiateType(f.type, scope);
        } else {
          obj[f.name] = 0;
        }
      }
    }
    return obj;
  }

  private fillStruct(obj: any, initNode: ASTNode, structDef: StructDefinition | undefined, scope: Map<string, any>): void {
    if (!initNode || initNode.type !== 'ArrayInitializer' || !obj) return;
    const fields = structDef?.fields || [];
    let fieldIdx = 0;

    for (let i = 0; i < initNode.elements.length; i++) {
      const elem = initNode.elements[i];
      if (elem.type === 'DesignatedInitializer') {
        const val = this.evaluateExpression(elem.value, scope);
        obj[elem.member] = val;
      } else {
        if (fieldIdx < fields.length) {
          const field = fields[fieldIdx++];
          if (elem.type === 'ArrayInitializer') {
            if (Array.isArray(obj[field.name])) {
              this.fillNDArray(obj[field.name], elem, scope);
            } else if (typeof obj[field.name] === 'object' && obj[field.name] !== null) {
              const nestedDef = this.getStructDef(field.type);
              this.fillStruct(obj[field.name], elem, nestedDef, scope);
            }
          } else {
            obj[field.name] = this.evaluateExpression(elem, scope);
          }
        }
      }
    }
  }

  private createNDArray(sizes: (ASTNode | null)[], scope: Map<string, any>, depth: number = 0, elemType: string = 'int'): any[] {
    const sizeExpr = sizes[depth];
    const evaluatedSize = sizeExpr ? Number(this.evaluateExpression(sizeExpr, scope)) : 100;
    const currentSize = Math.max(1, !isNaN(evaluatedSize) && evaluatedSize > 0 ? Math.trunc(evaluatedSize) : 100);

    if (depth === sizes.length - 1) {
      if (this.isStructType(elemType)) {
        return Array.from({ length: currentSize }, () => this.instantiateType(elemType, scope));
      }
      return new Array(currentSize).fill(0);
    }

    return Array.from({ length: currentSize }, () => this.createNDArray(sizes, scope, depth + 1, elemType));
  }

  private fillNDArray(arr: any[], initNode: ASTNode, scope: Map<string, any>): void {
    if (!initNode || initNode.type !== 'ArrayInitializer') return;
    for (let i = 0; i < initNode.elements.length; i++) {
      const elem = initNode.elements[i];
      if (elem.type === 'ArrayInitializer') {
        if (Array.isArray(arr[i])) {
          this.fillNDArray(arr[i], elem, scope);
        } else if (typeof arr[i] === 'object' && arr[i] !== null) {
          this.fillStruct(arr[i], elem, undefined, scope);
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

    if (target.type === 'UnaryExpression' && target.operator === '*') {
      const ptr = this.evaluateExpression(target.argument, scope);
      if (ptr instanceof CPointer) {
        ptr.set(value);
      } else if (Array.isArray(ptr)) {
        ptr[0] = value;
      } else if (ptr && typeof ptr === 'object') {
        Object.assign(ptr, value);
      }
      return;
    }

    if (target.type === 'Identifier') {
      const targetScope = scope.has(target.name) ? scope : this.globalScope;
      const current = targetScope.get(target.name);
      if (current instanceof CPointer) {
        current.set(value);
      } else {
        targetScope.set(target.name, value);
      }
    } else if (target.type === 'MemberExpression') {
      if (target.object.type === 'MemberExpression') {
        const parentObj = this.evaluateExpression(target.object.object, scope);
        const parentProp = target.object.computed
          ? this.evaluateExpression(target.object.property, scope)
          : target.object.property.name;
        if (parentObj instanceof CPointer && Array.isArray(parentObj.target)) {
          const idx = Number(parentProp);
          if (!isNaN(idx)) {
            const targetIdx = Number(parentObj.prop) + parentObj.offset + idx;
            if (parentObj.target[targetIdx] === undefined || typeof parentObj.target[targetIdx] !== 'object' || parentObj.target[targetIdx] === null) {
              parentObj.target[targetIdx] = {};
            }
          }
        }
      }
      let obj = this.evaluateExpression(target.object, scope);
      const prop = target.computed
        ? this.evaluateExpression(target.property, scope)
        : target.property.name;
      if (obj instanceof CPointer) {
        const idx = Number(prop);
        if (!isNaN(idx)) {
          const indexedPtr = new CPointer(obj.target, obj.prop, obj.offset + idx);
          indexedPtr.set(value);
          return;
        }
        const targetObj = (obj.target && typeof obj.target === 'object') ? obj.target : obj.get();
        if (targetObj && typeof targetObj === 'object') {
          targetObj[prop] = value;
          return;
        }
        obj = obj.get();
      }
      if (obj !== null && obj !== undefined && (typeof obj === 'object' || Array.isArray(obj))) {
        obj[prop] = value;
      }
    } else if (target.type === 'BinaryExpression') {
      const ptr = this.evaluateExpression(target, scope);
      if (ptr instanceof CPointer) {
        ptr.set(value);
      }
    }
  }

  public execute(program: ASTNode): { stdout: string; stderr: string; exitCode: number } {
    // 0. Import struct definitions from parsed program
    if (program.structDefs) {
      for (const [k, v] of program.structDefs.entries()) {
        this.structDefs.set(k, v);
      }
    }

    // 1. Collect all function definitions and global declarations
    for (const item of program.body) {
      if (item.type === 'FunctionDefinition') {
        this.functions.set(item.name, item);
      } else if (item.type === 'StructDefinition' || item.type === 'TypedefStructDeclaration' || item.type === 'TypedefDeclaration') {
        this.executeStatement(item, this.globalScope);
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
      const rawArg = args[i] !== undefined ? args[i] : 0;
      // Structs passed by value (not by pointer) are copied
      let paramVal = (!param.isPointer && rawArg && typeof rawArg === 'object' && !(rawArg instanceof CPointer) && !Array.isArray(rawArg))
        ? { ...rawArg }
        : rawArg;
      if ((param.isPointer || param.isArray) && Array.isArray(rawArg)) {
        paramVal = new CPointer(rawArg, 0, 0);
      }
      localScope.set(param.name, paramVal);
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
      case 'EmptyStatement': {
        return null;
      }

      case 'CompoundStatement': {
        for (const s of stmt.statements) {
          const res = this.executeStatement(s, scope);
          if (res && (res.isReturn || res.isBreak || res.isContinue)) return res;
        }
        return null;
      }

      case 'StructDefinition': {
        const key = `${stmt.kind} ${stmt.name}`;
        this.structDefs.set(key, stmt as unknown as StructDefinition);
        if (stmt.name) {
          this.structDefs.set(stmt.name, stmt as unknown as StructDefinition);
        }
        return null;
      }

      case 'TypedefStructDeclaration': {
        const def: StructDefinition = { kind: stmt.kind, name: stmt.tag, fields: stmt.fields };
        if (stmt.tag) {
          this.structDefs.set(`${stmt.kind} ${stmt.tag}`, def);
          this.structDefs.set(stmt.tag, def);
        }
        for (const alias of stmt.aliases) {
          this.structDefs.set(alias, def);
        }
        return null;
      }

      case 'TypedefDeclaration': {
        if (this.structDefs.has(stmt.baseType)) {
          const baseDef = this.structDefs.get(stmt.baseType)!;
          for (const alias of stmt.aliases) {
            this.structDefs.set(alias, baseDef);
          }
        }
        return null;
      }

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
        if (stmt.isPointer) {
          if (stmt.initialValue) {
            val = this.evaluateExpression(stmt.initialValue, scope);
            if (Array.isArray(val)) {
              val = new CPointer(val, 0, 0);
            }
          } else {
            val = null;
          }
        } else if (stmt.arraySizes && stmt.arraySizes.length > 0) {
          val = this.createNDArray(stmt.arraySizes, scope, 0, stmt.varType);
          if (stmt.initialValue && stmt.initialValue.type === 'ArrayInitializer') {
            this.fillNDArray(val, stmt.initialValue, scope);
          }
        } else if (this.isStructType(stmt.varType)) {
          val = this.instantiateType(stmt.varType, scope);
          if (stmt.initialValue) {
            if (stmt.initialValue.type === 'ArrayInitializer') {
              const def = this.getStructDef(stmt.varType);
              this.fillStruct(val, stmt.initialValue, def, scope);
            } else {
              const rightVal = this.evaluateExpression(stmt.initialValue, scope);
              if (rightVal && typeof rightVal === 'object' && !(rightVal instanceof CPointer) && !Array.isArray(rightVal)) {
                val = { ...rightVal };
              } else {
                val = rightVal;
              }
            }
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

      case 'CastExpression': {
        let val = this.evaluateExpression(expr.argument, scope);
        if (expr.isPointer) {
          if (Array.isArray(val)) {
            val = new CPointer(val, 0, 0);
          }
          if (val instanceof CPointer && this.isStructType(expr.castType)) {
            const structSize = this.getStructSize(expr.castType);
            const totalBytes = Array.isArray(val.target) ? val.target.length : 16;
            const count = Math.max(1, Math.floor(totalBytes / structSize));
            val.target = Array.from({ length: count }, () => this.instantiateType(expr.castType, scope));
          }
          return val;
        }
        const t = expr.castType;
        if (['int', 'long', 'short'].includes(t)) {
          if (val instanceof CPointer || Array.isArray(val)) return 1;
          return Math.trunc(Number(val));
        }
        if (['float', 'double'].includes(t)) return Number(val);
        if (t === 'char') return Number(val) & 0xFF;
        return val;
      }

      case 'AssignmentExpression': {
        const rightVal = this.evaluateExpression(expr.right, scope);
        if (expr.left.type === 'Identifier') {
          const varName = expr.left.name;
          const currentVal = scope.has(varName) ? scope.get(varName) : (this.globalScope.get(varName) || 0);
          let finalVal = rightVal;
          if (Array.isArray(finalVal) && (currentVal instanceof CPointer || currentVal === null)) {
            finalVal = new CPointer(finalVal, 0, 0);
          }
          if (expr.operator === '+=') {
            if (currentVal instanceof CPointer && typeof rightVal === 'number') {
              finalVal = new CPointer(currentVal.target, currentVal.prop, currentVal.offset + rightVal);
            } else if (Array.isArray(currentVal) && typeof rightVal === 'number') {
              finalVal = new CPointer(currentVal, 0, rightVal);
            } else {
              finalVal = currentVal + rightVal;
            }
          } else if (expr.operator === '-=') {
            if (currentVal instanceof CPointer && typeof rightVal === 'number') {
              finalVal = new CPointer(currentVal.target, currentVal.prop, currentVal.offset - rightVal);
            } else if (Array.isArray(currentVal) && typeof rightVal === 'number') {
              finalVal = new CPointer(currentVal, 0, -rightVal);
            } else {
              finalVal = currentVal - rightVal;
            }
          }
          else if (expr.operator === '*=') finalVal = currentVal * rightVal;
          else if (expr.operator === '/=') finalVal = Math.trunc(currentVal / rightVal);
          else if (expr.operator === '%=') finalVal = currentVal % rightVal;
          else if (rightVal && typeof rightVal === 'object' && !(rightVal instanceof CPointer) && !Array.isArray(rightVal)) {
            finalVal = { ...rightVal };
          }

          if (scope.has(varName)) scope.set(varName, finalVal);
          else this.globalScope.set(varName, finalVal);
          return finalVal;
        } else if (expr.left.type === 'MemberExpression') {
          if (expr.left.object.type === 'MemberExpression') {
            const parentObj = this.evaluateExpression(expr.left.object.object, scope);
            const parentProp = expr.left.object.computed
              ? this.evaluateExpression(expr.left.object.property, scope)
              : expr.left.object.property.name;
            if (parentObj instanceof CPointer && Array.isArray(parentObj.target)) {
              const idx = Number(parentProp);
              if (!isNaN(idx)) {
                const targetIdx = Number(parentObj.prop) + parentObj.offset + idx;
                if (parentObj.target[targetIdx] === undefined || typeof parentObj.target[targetIdx] !== 'object' || parentObj.target[targetIdx] === null) {
                  parentObj.target[targetIdx] = {};
                }
              }
            }
          }
          let obj = this.evaluateExpression(expr.left.object, scope);
          const prop = expr.left.computed
            ? this.evaluateExpression(expr.left.property, scope)
            : expr.left.property.name;
          if (obj instanceof CPointer) {
            const idx = Number(prop);
            if (!isNaN(idx)) {
              const indexedPtr = new CPointer(obj.target, obj.prop, obj.offset + idx);
              let finalVal = rightVal;
              if (expr.operator === '+=') finalVal = indexedPtr.get() + rightVal;
              else if (expr.operator === '-=') finalVal = indexedPtr.get() - rightVal;
              else if (expr.operator === '*=') finalVal = indexedPtr.get() * rightVal;
              else if (expr.operator === '/=') finalVal = Math.trunc(indexedPtr.get() / rightVal);
              else if (expr.operator === '%=') finalVal = indexedPtr.get() % rightVal;
              indexedPtr.set(finalVal);
              return finalVal;
            }
            const targetObj = (obj.target && typeof obj.target === 'object') ? obj.target : obj.get();
            if (targetObj && typeof targetObj === 'object') {
              let finalVal = rightVal;
              if (expr.operator === '+=') finalVal = (targetObj[prop] || 0) + rightVal;
              else if (expr.operator === '-=') finalVal = (targetObj[prop] || 0) - rightVal;
              else if (expr.operator === '*=') finalVal = (targetObj[prop] || 0) * rightVal;
              else if (expr.operator === '/=') finalVal = Math.trunc((targetObj[prop] || 0) / rightVal);
              else if (expr.operator === '%=') finalVal = (targetObj[prop] || 0) % rightVal;
              targetObj[prop] = finalVal;
              return finalVal;
            }
            obj = obj.get();
          }
          let finalVal = rightVal;
          if (expr.operator === '+=') finalVal = (obj[prop] !== undefined ? obj[prop] : 0) + rightVal;
          else if (expr.operator === '-=') finalVal = (obj[prop] !== undefined ? obj[prop] : 0) - rightVal;
          else if (expr.operator === '*=') finalVal = (obj[prop] !== undefined ? obj[prop] : 0) * rightVal;
          else if (expr.operator === '/=') finalVal = Math.trunc((obj[prop] !== undefined ? obj[prop] : 0) / rightVal);
          else if (expr.operator === '%=') finalVal = (obj[prop] !== undefined ? obj[prop] : 0) % rightVal;
          else if (rightVal && typeof rightVal === 'object' && !(rightVal instanceof CPointer) && !Array.isArray(rightVal)) {
            finalVal = { ...rightVal };
          }

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
        } else if (expr.left.type === 'UnaryExpression' && expr.left.operator === '*') {
          const target = this.evaluateExpression(expr.left.argument, scope);
          let finalVal = rightVal;
          if (rightVal && typeof rightVal === 'object' && !(rightVal instanceof CPointer) && !Array.isArray(rightVal)) {
            finalVal = { ...rightVal };
          }
          if (target instanceof CPointer) {
            target.set(finalVal);
            return finalVal;
          } else if (Array.isArray(target)) {
            target[0] = finalVal;
            return finalVal;
          } else if (target && typeof target === 'object') {
            Object.assign(target, finalVal);
            return finalVal;
          }
          throw new RuntimeError("Cannot dereference non-pointer value in assignment");
        }
        throw new RuntimeError("Invalid lvalue in assignment");
      }

      case 'BinaryExpression': {
        const left = this.evaluateExpression(expr.left, scope);
        const right = this.evaluateExpression(expr.right, scope);

        switch (expr.operator) {
          case '+': {
            if (left instanceof CPointer && typeof right === 'number') {
              return new CPointer(left.target, left.prop, left.offset + right);
            }
            if (right instanceof CPointer && typeof left === 'number') {
              return new CPointer(right.target, right.prop, right.offset + left);
            }
            if (Array.isArray(left) && typeof right === 'number') {
              return new CPointer(left, 0, right);
            }
            if (Array.isArray(right) && typeof left === 'number') {
              return new CPointer(right, 0, left);
            }
            return left + right;
          }
          case '-': {
            if (left instanceof CPointer && typeof right === 'number') {
              return new CPointer(left.target, left.prop, left.offset - right);
            }
            if (Array.isArray(left) && typeof right === 'number') {
              return new CPointer(left, 0, -right);
            }
            const p1 = left instanceof CPointer ? left : (Array.isArray(left) ? new CPointer(left, 0, 0) : null);
            const p2 = right instanceof CPointer ? right : (Array.isArray(right) ? new CPointer(right, 0, 0) : null);
            if (p1 && p2 && p1.target === p2.target) {
              const idx1 = Number(p1.prop) + p1.offset;
              const idx2 = Number(p2.prop) + p2.offset;
              return idx1 - idx2;
            }
            return left - right;
          }
          case '*': return left * right;
          case '/': return typeof left === 'number' && Number.isInteger(left) && Number.isInteger(right) ? Math.trunc(left / right) : left / right;
          case '%': return left % right;
          case '==': {
            if (left instanceof CPointer && (right === null || right === 0)) return 0;
            if (right instanceof CPointer && (left === null || left === 0)) return 0;
            const p1 = left instanceof CPointer ? left : (Array.isArray(left) ? new CPointer(left, 0, 0) : null);
            const p2 = right instanceof CPointer ? right : (Array.isArray(right) ? new CPointer(right, 0, 0) : null);
            if (p1 && p2 && p1.target === p2.target) {
              return (p1.prop === p2.prop && p1.offset === p2.offset) ? 1 : 0;
            }
            return left == right ? 1 : 0;
          }
          case '!=': {
            if (left instanceof CPointer && (right === null || right === 0)) return 1;
            if (right instanceof CPointer && (left === null || left === 0)) return 1;
            const p1 = left instanceof CPointer ? left : (Array.isArray(left) ? new CPointer(left, 0, 0) : null);
            const p2 = right instanceof CPointer ? right : (Array.isArray(right) ? new CPointer(right, 0, 0) : null);
            if (p1 && p2 && p1.target === p2.target) {
              return (p1.prop !== p2.prop || p1.offset !== p2.offset) ? 1 : 0;
            }
            return left != right ? 1 : 0;
          }
          case '<': {
            const p1 = left instanceof CPointer ? left : (Array.isArray(left) ? new CPointer(left, 0, 0) : null);
            const p2 = right instanceof CPointer ? right : (Array.isArray(right) ? new CPointer(right, 0, 0) : null);
            if (p1 && p2 && p1.target === p2.target) {
              const idx1 = Number(p1.prop) + p1.offset;
              const idx2 = Number(p2.prop) + p2.offset;
              return idx1 < idx2 ? 1 : 0;
            }
            return left < right ? 1 : 0;
          }
          case '<=': {
            const p1 = left instanceof CPointer ? left : (Array.isArray(left) ? new CPointer(left, 0, 0) : null);
            const p2 = right instanceof CPointer ? right : (Array.isArray(right) ? new CPointer(right, 0, 0) : null);
            if (p1 && p2 && p1.target === p2.target) {
              const idx1 = Number(p1.prop) + p1.offset;
              const idx2 = Number(p2.prop) + p2.offset;
              return idx1 <= idx2 ? 1 : 0;
            }
            return left <= right ? 1 : 0;
          }
          case '>': {
            const p1 = left instanceof CPointer ? left : (Array.isArray(left) ? new CPointer(left, 0, 0) : null);
            const p2 = right instanceof CPointer ? right : (Array.isArray(right) ? new CPointer(right, 0, 0) : null);
            if (p1 && p2 && p1.target === p2.target) {
              const idx1 = Number(p1.prop) + p1.offset;
              const idx2 = Number(p2.prop) + p2.offset;
              return idx1 > idx2 ? 1 : 0;
            }
            return left > right ? 1 : 0;
          }
          case '>=': {
            const p1 = left instanceof CPointer ? left : (Array.isArray(left) ? new CPointer(left, 0, 0) : null);
            const p2 = right instanceof CPointer ? right : (Array.isArray(right) ? new CPointer(right, 0, 0) : null);
            if (p1 && p2 && p1.target === p2.target) {
              const idx1 = Number(p1.prop) + p1.offset;
              const idx2 = Number(p2.prop) + p2.offset;
              return idx1 >= idx2 ? 1 : 0;
            }
            return left >= right ? 1 : 0;
          }
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
            const isPtr = current instanceof CPointer || Array.isArray(current);
            if (isPtr) {
              const base = current instanceof CPointer ? current : new CPointer(current, 0, 0);
              const next = new CPointer(base.target, base.prop, expr.operator === '++' ? base.offset + 1 : base.offset - 1);
              if (expr.argument.type === 'Identifier') {
                const targetScope = scope.has(expr.argument.name) ? scope : this.globalScope;
                targetScope.set(expr.argument.name, next);
              } else {
                this.assignTarget(expr.argument, next, scope);
              }
              return next;
            }
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
            case '&': {
              const arg = expr.argument;
              if (arg.type === 'Identifier') {
                const varName = arg.name;
                const targetScope = scope.has(varName) ? scope : this.globalScope;
                const currentVal = targetScope.get(varName);
                if (typeof currentVal === 'object' && currentVal !== null && !(currentVal instanceof CPointer)) {
                  return currentVal;
                }
                return new CPointer(targetScope, varName);
              } else if (arg.type === 'MemberExpression') {
                let obj = this.evaluateExpression(arg.object, scope);
                if (obj instanceof CPointer) obj = obj.get();
                const prop = arg.computed
                  ? this.evaluateExpression(arg.property, scope)
                  : arg.property.name;
                return new CPointer(obj, prop);
              }
              return this.evaluateExpression(arg, scope);
            }
            case '*': {
              if (val instanceof CPointer) return val.get();
              if (Array.isArray(val)) return val[0];
              return val;
            }
            default:
              throw new RuntimeError(`Unsupported unary operator '${expr.operator}'`);
          }
        } else {
          // Postfix ++ / --
          const current = this.evaluateExpression(expr.argument, scope);
          const isPtr = current instanceof CPointer || Array.isArray(current);
          if (isPtr) {
            const base = current instanceof CPointer ? current : new CPointer(current, 0, 0);
            const next = new CPointer(base.target, base.prop, expr.operator === '++' ? base.offset + 1 : base.offset - 1);
            if (expr.argument.type === 'Identifier') {
              const targetScope = scope.has(expr.argument.name) ? scope : this.globalScope;
              targetScope.set(expr.argument.name, next);
            } else {
              this.assignTarget(expr.argument, next, scope);
            }
            return current;
          }
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
        if (expr.object.type === 'MemberExpression') {
          const parentObj = this.evaluateExpression(expr.object.object, scope);
          const parentProp = expr.object.computed
            ? this.evaluateExpression(expr.object.property, scope)
            : expr.object.property.name;
          if (parentObj instanceof CPointer && Array.isArray(parentObj.target)) {
            const idx = Number(parentProp);
            if (!isNaN(idx)) {
              const targetIdx = Number(parentObj.prop) + parentObj.offset + idx;
              if (parentObj.target[targetIdx] === undefined || typeof parentObj.target[targetIdx] !== 'object' || parentObj.target[targetIdx] === null) {
                parentObj.target[targetIdx] = {};
              }
            }
          }
        }
        let obj = this.evaluateExpression(expr.object, scope);
        const prop = expr.computed
          ? this.evaluateExpression(expr.property, scope)
          : expr.property.name;
        if (obj instanceof CPointer) {
          const idx = Number(prop);
          if (!isNaN(idx)) {
            const indexedPtr = new CPointer(obj.target, obj.prop, obj.offset + idx);
            return indexedPtr.get();
          }
          if (obj.target && typeof obj.target === 'object' && prop in obj.target) {
            return (obj.target as any)[prop];
          }
          const base = obj.get();
          if (base && typeof base === 'object' && prop in base) {
            return base[prop];
          }
          obj = base;
        }
        if (obj === undefined || obj === null) {
          throw new RuntimeError(`Cannot access member '${prop}' of null or undefined`);
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
        const t = expr.typeName;
        if (['char', 'bool'].includes(t)) return 1;
        if (['short'].includes(t)) return 2;
        if (['int', 'float', 'long'].includes(t)) return 4;
        if (['double', 'long long'].includes(t)) return 8;
        if (this.isStructType(t)) {
          const def = this.getStructDef(t);
          if (def && def.fields) {
            if (def.kind === 'union') {
              let maxFieldSize = 4;
              for (const f of def.fields) {
                const fieldSize = this.getFieldSize(f);
                if (fieldSize > maxFieldSize) maxFieldSize = fieldSize;
              }
              return maxFieldSize;
            } else {
              let total = 0;
              for (const f of def.fields) {
                total += this.getFieldSize(f);
              }
              return Math.max(total, 4);
            }
          }
          return 16;
        }
        return 4;
      }

      case 'SizeofExprExpression': {
        if (expr.argument.type === 'Identifier') {
          const varName = expr.argument.name;
          const val = scope.has(varName) ? scope.get(varName) : this.globalScope.get(varName);
          if (Array.isArray(val)) return val.length * 4;
          if (typeof val === 'string') return Math.max(val.length + 1, 1024);
          if (val && typeof val === 'object' && !(val instanceof CPointer)) return 16;
        }
        const val = this.evaluateExpression(expr.argument, scope);
        if (Array.isArray(val)) return val.length * 4;
        if (typeof val === 'string') return Math.max(val.length + 1, 1024);
        if (val && typeof val === 'object' && !(val instanceof CPointer)) return 16;
        return 4;
      }

      default:
        return 0;
    }
  }
}
