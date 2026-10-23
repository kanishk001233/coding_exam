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

try {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  console.log('Tokenized tokens count:', tokens.length);
  const parser = new Parser(tokens);
  const ast = parser.parse();
  console.log('Parsed successfully!');
  const interpreter = new Interpreter('5\n1 2 3 4 5\n');
  const res = interpreter.execute(ast);
  console.log('Execution Result:', res);
} catch (e) {
  console.error('Caught Error:', e);
}
