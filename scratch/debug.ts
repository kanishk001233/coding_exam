import { Lexer, Parser, Interpreter } from '../src/lib/wasm/cRuntime.ts';

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

const origExecute = (Interpreter.prototype as any).evaluateExpression;
(Interpreter.prototype as any).evaluateExpression = function(expr: any, scope: any) {
  if (expr.type === 'AssignmentExpression' && expr.left.type === 'UnaryExpression') {
    const target = this.evaluateExpression(expr.left.argument, scope);
    console.log('Dereference assignment target:', expr.left.argument, 'resolved to:', target, 'type:', typeof target, 'isCPointer:', target instanceof Object);
  }
  return origExecute.call(this, expr, scope);
};

const interpreter = new Interpreter('5\n1 2 3 4 5\n');
try {
  interpreter.execute(ast);
} catch (e: any) {
  console.log('Error caught:', e.message);
  console.log(e.stack);
}
