/**
 * Output Normalization & Comparison Utility
 * Conforms to Section 15 of Instruction.md
 */

export function normalizeOutput(output: string): string {
  if (!output) return '';
  return output
    .replace(/\r\n/g, '\n') // Normalize Windows CRLF to standard LF
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trimEnd()) // Remove trailing spaces on each line
    .join('\n')
    .trim(); // Trim leading and trailing newlines
}

export interface CompareResult {
  isMatch: boolean;
  actualNormalized: string;
  expectedNormalized: string;
  diffMessage?: string;
}

export function compareOutputs(actual: string, expected: string): CompareResult {
  const normActual = normalizeOutput(actual);
  const normExpected = normalizeOutput(expected);

  if (normActual === normExpected) {
    return {
      isMatch: true,
      actualNormalized: normActual,
      expectedNormalized: normExpected,
    };
  }

  // Attempt floating-point token comparison if numeric
  const actualTokens = normActual.split(/\s+/).filter(Boolean);
  const expectedTokens = normExpected.split(/\s+/).filter(Boolean);

  if (actualTokens.length === expectedTokens.length && actualTokens.length > 0) {
    let allTokensMatch = true;
    for (let i = 0; i < actualTokens.length; i++) {
      const a = actualTokens[i];
      const e = expectedTokens[i];
      if (a === e) continue;

      const numA = parseFloat(a);
      const numE = parseFloat(e);
      if (!isNaN(numA) && !isNaN(numE) && Math.abs(numA - numE) < 1e-4) {
        continue;
      }

      allTokensMatch = false;
      break;
    }

    if (allTokensMatch) {
      return {
        isMatch: true,
        actualNormalized: normActual,
        expectedNormalized: normExpected,
      };
    }
  }

  return {
    isMatch: false,
    actualNormalized: normActual,
    expectedNormalized: normExpected,
    diffMessage: `Expected: "${normExpected}"\nGot: "${normActual}"`,
  };
}
