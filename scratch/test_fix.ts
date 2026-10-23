import { Lexer, Parser, Interpreter, CPointer } from '../src/lib/wasm/cRuntime.ts';

// Monkey patch Interpreter to test the proposed fixes
const origExecuteStatement = (Interpreter.prototype as any).executeStatement;
const origEvaluateExpression = (Interpreter.prototype as any).evaluateExpression;
const origCallFunction = (Interpreter.prototype as any).callFunction;

(Interpreter.prototype as any).callFunction = function(funcNode: any, args: any[], callingScope: any, astArgs: any[] = []) {
  if (funcNode.type === 'BuiltinFunction') {
    return funcNode.call(args, callingScope, astArgs);
  }
  const localScope = new Map<string, any>(this.globalScope);
  for (let i = 0; i < funcNode.params.length; i++) {
    const param = funcNode.params[i];
    const rawArg = args[i] !== undefined ? args[i] : 0;
    let paramVal = (!param.isPointer && rawArg && typeof rawArg === 'object' && !(rawArg instanceof CPointer) && !Array.isArray(rawArg))
      ? { ...rawArg }
      : rawArg;
    // Parameter array/pointer decay
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
};

(Interpreter.prototype as any).executeStatement = function(stmt: any, scope: any) {
  if (stmt.type === 'VariableDeclaration') {
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
      scope.set(stmt.name, val);
      return null;
    }
  }
  return origExecuteStatement.call(this, stmt, scope);
};

(Interpreter.prototype as any).evaluateExpression = function(expr: any, scope: any) {
  if (expr.type === 'AssignmentExpression' && expr.left.type === 'Identifier') {
    const varName = expr.left.name;
    const currentVal = scope.has(varName) ? scope.get(varName) : (this.globalScope.get(varName) || 0);
    const rightVal = this.evaluateExpression(expr.right, scope);
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
    if (expr.operator === '=') {
      if (scope.has(varName)) scope.set(varName, finalVal);
      else this.globalScope.set(varName, finalVal);
      return finalVal;
    }
    if (['+=', '-='].includes(expr.operator)) {
      if (scope.has(varName)) scope.set(varName, finalVal);
      else this.globalScope.set(varName, finalVal);
      return finalVal;
    }
  }

  if (expr.type === 'BinaryExpression') {
    if (['<', '<=', '>', '>=', '==', '!='].includes(expr.operator)) {
      const left = this.evaluateExpression(expr.left, scope);
      const right = this.evaluateExpression(expr.right, scope);
      const p1 = left instanceof CPointer ? left : (Array.isArray(left) ? new CPointer(left, 0, 0) : null);
      const p2 = right instanceof CPointer ? right : (Array.isArray(right) ? new CPointer(right, 0, 0) : null);
      if (p1 && p2 && p1.target === p2.target) {
        const idx1 = Number(p1.prop) + p1.offset;
        const idx2 = Number(p2.prop) + p2.offset;
        if (expr.operator === '<') return idx1 < idx2 ? 1 : 0;
        if (expr.operator === '<=') return idx1 <= idx2 ? 1 : 0;
        if (expr.operator === '>') return idx1 > idx2 ? 1 : 0;
        if (expr.operator === '>=') return idx1 >= idx2 ? 1 : 0;
        if (expr.operator === '==') return idx1 === idx2 ? 1 : 0;
        if (expr.operator === '!=') return idx1 !== idx2 ? 1 : 0;
      }
    }
  }

  if (expr.type === 'UnaryExpression') {
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
        return expr.prefix ? next : current;
      }
    }
  }

  return origEvaluateExpression.call(this, expr, scope);
};

const code = `#include <stdio.h>

void reverseArray(int *arr, int n) {
    int *left = arr;
    int *right = arr + n - 1;

    while (left < right) {
        int temp = *left;
        *left = *right;
        *right = temp;

        left++;
        right--;
    }
}

int main(void) {
    int n, arr[1000];

    scanf("%d", &n);

    for (int i = 0; i < n; i++) {
        scanf("%d", &arr[i]);
    }

    reverseArray(arr, n);

    for (int i = 0; i < n; i++) {
        printf("%d ", arr[i]);

    }

    return 0;
}
`;

const lexer = new Lexer(code);
const tokens = lexer.tokenize();
const parser = new Parser(tokens);
const ast = parser.parse();

const interpreter = new Interpreter('5\n1 2 3 4 5\n');
const res = interpreter.execute(ast);
console.log('Execution result stdout:');
console.log(JSON.stringify(res.stdout));
console.log('Execution exitCode:', res.exitCode);
