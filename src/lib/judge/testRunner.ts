import { wasmCompiler } from '../wasm/compiler';
import { TestCase, SubmissionStatus, SubmissionResult } from '../../types/database';
import { compareOutputs } from './outputCompare';

export interface JudgeEvaluationResult {
  status: SubmissionStatus;
  score: number;
  maxScore: number;
  percentage: number;
  totalExecutionTime: number;
  compileError?: string;
  results: SubmissionResult[];
}

export class TestJudge {
  public static async evaluateCode(
    code: string,
    testCases: TestCase[],
    timeLimitMs: number = 2000,
    memoryLimitMb: number = 64
  ): Promise<JudgeEvaluationResult> {
    const maxScore = testCases.reduce((sum, tc) => sum + (tc.marks || 0), 0);
    
    // 1. Compile C code
    const compileResult = await wasmCompiler.compile(code);
    if (!compileResult.success) {
      const results: SubmissionResult[] = testCases.map((tc) => ({
        id: Math.random().toString(36).substring(2, 9),
        test_case_id: tc.id,
        is_sample: tc.is_sample,
        status: 'compile_error',
        actual_output: '',
        expected_output: tc.is_sample ? tc.expected_output : undefined,
        execution_time: 0,
        error_message: compileResult.errors || 'Compilation failed',
        marks_awarded: 0,
        max_marks: tc.marks || 0,
      }));

      return {
        status: 'compile_error',
        score: 0,
        maxScore,
        percentage: 0,
        totalExecutionTime: 0,
        compileError: compileResult.errors || 'Compilation failed',
        results,
      };
    }

    // 2. Execute against all test cases sequentially
    const results: SubmissionResult[] = [];
    let totalScore = 0;
    let totalTime = 0;
    let overallStatus: SubmissionStatus = 'accepted';

    for (const testCase of testCases) {
      const runRes = await wasmCompiler.run(
        compileResult.executable,
        testCase.input || '',
        {
          timeoutMs: timeLimitMs,
          memoryLimitMb,
          outputLimitKb: 100,
        }
      );

      totalTime += runRes.executionTime;

      let caseStatus: SubmissionStatus = 'accepted';
      let marksAwarded = 0;
      let errorMessage: string | undefined = undefined;

      if (runRes.timedOut) {
        caseStatus = 'time_limit';
        errorMessage = 'Time Limit Exceeded';
      } else if (!runRes.success && runRes.stderr) {
        caseStatus = 'runtime_error';
        errorMessage = runRes.stderr;
      } else {
        const comp = compareOutputs(runRes.stdout, testCase.expected_output);
        if (comp.isMatch) {
          caseStatus = 'accepted';
          marksAwarded = testCase.marks || 0;
          totalScore += marksAwarded;
        } else {
          caseStatus = 'wrong_answer';
          errorMessage = comp.diffMessage;
        }
      }

      if (caseStatus !== 'accepted' && overallStatus === 'accepted') {
        overallStatus = caseStatus;
      }

      results.push({
        id: Math.random().toString(36).substring(2, 9),
        test_case_id: testCase.id,
        is_sample: testCase.is_sample,
        status: caseStatus,
        actual_output: runRes.stdout,
        // Only include expected output for sample test cases (Section 16 requirement)
        expected_output: testCase.is_sample ? testCase.expected_output : undefined,
        execution_time: runRes.executionTime,
        error_message: errorMessage,
        marks_awarded: marksAwarded,
        max_marks: testCase.marks || 0,
      });
    }

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : (overallStatus === 'accepted' ? 100 : 0);

    return {
      status: overallStatus,
      score: totalScore,
      maxScore,
      percentage,
      totalExecutionTime: totalTime,
      results,
    };
  }
}
