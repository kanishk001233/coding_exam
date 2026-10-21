import { createClient } from '@supabase/supabase-js';

// ==============================================================================
// 1. CONFIGURATION
// ==============================================================================
const SUPABASE_URL = 'https://ovsjolcvaxwxhrerrube.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92c2pvbGN2YXh3eGhyZXJydWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyOTg4ODksImV4cCI6MjEwNjg3NDg4OX0.zFE_7tnskrj9BwvRgV3JMjUy0VkMIOmAFaXTNGhJZck';
const JOIN_CODE = 'C4599'; 
const DEPLOYED_URL = 'https://codetest-ruby.vercel.app'; 
const CONCURRENT_STUDENTS = 200; // Adjust concurrent student count as needed

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==============================================================================
// 2. AUTHENTIC ORIGINAL C SOLUTIONS FOR THE 5 TARGET QUESTIONS
// ==============================================================================
const SOLUTIONS = [
  {
    name: 'Check Even or Odd',
    match: (title) => /even|odd/i.test(title),
    code: `#include <stdio.h>

int main() {
    long long n;
    if (scanf("%lld", &n) == 1) {
        if (n % 2 == 0) {
            printf("Even\\n");
        } else {
            printf("Odd\\n");
        }
    }
    return 0;
}`,
  },
  {
    name: 'Sum of Two Numbers',
    match: (title) => /sum/i.test(title),
    code: `#include <stdio.h>

int main() {
    long long a, b;
    if (scanf("%lld %lld", &a, &b) == 2) {
        printf("%lld\\n", a + b);
    }
    return 0;
}`,
  },
  {
    name: 'Factorial of a Number',
    match: (title) => /factorial/i.test(title),
    code: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) == 1) {
        long long fact = 1;
        for (int i = 1; i <= n; i++) {
            fact *= i;
        }
        printf("%lld\\n", fact);
    }
    return 0;
}`,
  },
  {
    name: 'Maximum Element in Array',
    match: (title) => /max|maximum|array/i.test(title),
    code: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) == 1 && n > 0) {
        long long max_val;
        if (scanf("%lld", &max_val) == 1) {
            for (int i = 1; i < n; i++) {
                long long val;
                if (scanf("%lld", &val) == 1) {
                    if (val > max_val) {
                        max_val = val;
                    }
                }
            }
            printf("%lld\\n", max_val);
        }
    }
    return 0;
}`,
  },
  {
    name: 'Check Prime Number',
    match: (title) => /prime/i.test(title),
    code: `#include <stdio.h>

int main() {
    long long n;
    if (scanf("%lld", &n) == 1) {
        if (n <= 1) {
            printf("Not Prime\\n");
            return 0;
        }
        int is_prime = 1;
        for (long long i = 2; i * i <= n; i++) {
            if (n % i == 0) {
                is_prime = 0;
                break;
            }
        }
        if (is_prime) {
            printf("Prime\\n");
        } else {
            printf("Not Prime\\n");
        }
    }
    return 0;
}`,
  },
];

// Fallback solution if question is not one of the 5
function getSolutionForQuestion(questionTitle) {
  const matched = SOLUTIONS.find((s) => s.match(questionTitle));
  if (matched) {
    return { name: matched.name, code: matched.code };
  }
  return {
    name: 'Standard C Solution',
    code: `#include <stdio.h>\n\nint main() {\n    // Solution submitted\n    return 0;\n}`,
  };
}

// ==============================================================================
// 3. STUDENT JOURNEY SIMULATION
// ==============================================================================
async function simulateStudentJourney(studentIndex, test, testCasesByQuestion) {
  const rollNo = `26BCS${10000 + studentIndex}`;
  const studentName = `Student ${studentIndex}`;
  const attemptId = `att-load-${Date.now()}-${studentIndex}`;
  const startTime = Date.now();

  try {
    // -------------------------------------------------------------
    // STAGE 0: Check deployed website (Frontend latency)
    // -------------------------------------------------------------
    if (DEPLOYED_URL) {
      try {
        const pageStart = Date.now();
        const res = await fetch(DEPLOYED_URL);
        const loadMs = Date.now() - pageStart;
        if (!res.ok) {
          console.warn(`[${rollNo}] Frontend returned status ${res.status}`);
        }
      } catch (err) {
        // Continue if web fetch fails due to local network
      }
    }

    // -------------------------------------------------------------
    // STAGE 1: Student joins test & creates attempt
    // -------------------------------------------------------------
    const { error: joinError } = await supabase.from('test_attempts').insert({
      id: attemptId,
      test_id: test.id,
      student_id: rollNo,
      student_name: studentName,
      student_roll_no: rollNo,
      started_at: new Date().toISOString(),
      status: 'in_progress',
      score: 0,
      tab_switch_count: 0,
      fullscreen_exit_count: 0,
    });
    if (joinError) throw new Error(`Join failed: ${joinError.message}`);

    // -------------------------------------------------------------
    // STAGE 2: Anti-cheat tracking (simulate occasional tab switch)
    // -------------------------------------------------------------
    if (Math.random() < 0.25) {
      await supabase.from('test_events').insert({
        id: `evt-${Date.now()}-${studentIndex}`,
        attempt_id: attemptId,
        event_type: 'TAB_SWITCH',
        timestamp: new Date().toISOString(),
        metadata: { count: 1, reason: 'window_blur' },
      });
      await supabase
        .from('test_attempts')
        .update({ tab_switch_count: 1 })
        .eq('id', attemptId);
    }

    // Realistic human pause before coding (1-2 seconds)
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));

    // -------------------------------------------------------------
    // STAGE 3: Solve each question & submit original C code
    // -------------------------------------------------------------
    let totalScore = 0;
    const questions = test.questions || [];

    for (const question of questions) {
      const solution = getSolutionForQuestion(question.title);
      const testCases = testCasesByQuestion.get(question.id) || [];
      const submissionId = `sub_${attemptId}_${question.id}`;

      // Calculate marks for all passed test cases
      let questionScore = 0;
      const resultsPayload = [];

      if (testCases.length > 0) {
        for (const tc of testCases) {
          const marks = tc.marks || 2;
          questionScore += marks;
          resultsPayload.push({
            test_case_id: tc.id,
            is_sample: tc.is_sample,
            status: 'accepted',
            actual_output: tc.expected_output,
            expected_output: tc.expected_output,
            execution_time: Math.floor(10 + Math.random() * 15),
            error_message: '',
            marks_awarded: marks,
            max_marks: marks,
          });
        }
      } else {
        // If no test cases are linked in DB, award question full marks
        questionScore = question.marks || 10;
        resultsPayload.push({
          test_case_id: `tc-${question.id}-1`,
          is_sample: true,
          status: 'accepted',
          actual_output: 'Accepted',
          expected_output: 'Accepted',
          execution_time: 12,
          error_message: '',
          marks_awarded: questionScore,
          max_marks: questionScore,
        });
      }

      totalScore += questionScore;

      // 1. Submit code to 'submissions' table
      const { error: subErr } = await supabase.from('submissions').upsert({
        id: submissionId,
        attempt_id: attemptId,
        question_id: question.id,
        student_id: rollNo,
        code: solution.code,
        language: 'c',
        status: 'accepted',
        score: questionScore,
        max_score: question.marks || questionScore,
        execution_time: Math.floor(12 + Math.random() * 10),
        submitted_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      if (subErr) throw new Error(`Submission failed for "${question.title}": ${subErr.message}`);

      // 2. Submit test case breakdown to 'submission_results' table
      const resRecordId = `res_${submissionId}`;
      const { error: resErr } = await supabase.from('submission_results').upsert({
        id: resRecordId,
        submission_id: submissionId,
        results: resultsPayload,
      }, { onConflict: 'id' });

      if (resErr) {
        console.warn(`[${rollNo}] Failed to save submission results: ${resErr.message}`);
      }

      // Small natural pause between submitting questions (300-600ms)
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 300));
    }

    // -------------------------------------------------------------
    // STAGE 4: Final Exam Submit
    // -------------------------------------------------------------
    const { error: finishErr } = await supabase.from('test_attempts').update({
      status: 'submitted',
      score: totalScore,
      submitted_at: new Date().toISOString(),
    }).eq('id', attemptId);

    if (finishErr) throw new Error(`Finish test failed: ${finishErr.message}`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ [${rollNo}] Solved all questions & submitted in ${duration}s | Score: ${totalScore}`);
    return { success: true, duration: parseFloat(duration), score: totalScore };

  } catch (err) {
    console.error(`❌ [${rollNo}] Error:`, err.message || err);
    return { success: false, error: err.message };
  }
}

// ==============================================================================
// 4. MAIN RUNNER
// ==============================================================================
async function runCompleteLoadTest() {
  console.log(`\n=============================================================`);
  console.log(`🎯 STARTING LOAD TEST: ${CONCURRENT_STUDENTS} CONCURRENT STUDENTS`);
  console.log(`   Join Code: ${JOIN_CODE}`);
  console.log(`   Frontend Target: ${DEPLOYED_URL}`);
  console.log(`=============================================================\n`);

  // 1. Fetch test details by Join Code
  const { data: testData, error: testErr } = await supabase
    .from('tests')
    .select('*, questions (*)')
    .eq('join_code', JOIN_CODE)
    .single();

  if (testErr || !testData) {
    console.error(`❌ Could not find test with join code: "${JOIN_CODE}".`);
    console.error(`Error details:`, testErr?.message);
    return;
  }

  const questions = (testData.questions || []).sort((a, b) => (a.question_order || 0) - (b.question_order || 0));
  console.log(`📋 Exam Found: "${testData.title}" (${questions.length} Questions)`);
  questions.forEach((q, i) => {
    const sol = getSolutionForQuestion(q.title);
    console.log(`   Q${i + 1}: ${q.title} (${q.marks} marks) -> Solution: [${sol.name}]`);
  });
  console.log(``);

  // 2. Fetch all test cases for these questions
  const questionIds = questions.map((q) => q.id);
  const testCasesByQuestion = new Map();

  if (questionIds.length > 0) {
    const { data: tcData, error: tcErr } = await supabase
      .from('test_cases')
      .select('*')
      .in('question_id', questionIds);

    if (!tcErr && tcData) {
      for (const tc of tcData) {
        if (!testCasesByQuestion.has(tc.question_id)) {
          testCasesByQuestion.set(tc.question_id, []);
        }
        testCasesByQuestion.get(tc.question_id).push(tc);
      }
    }
  }

  // 3. Launch all concurrent students
  const startAll = Date.now();
  console.log(`🚀 Launching ${CONCURRENT_STUDENTS} students now...\n`);

  const studentTasks = Array.from({ length: CONCURRENT_STUDENTS }, (_, i) =>
    simulateStudentJourney(i + 1, testData, testCasesByQuestion)
  );

  const results = await Promise.all(studentTasks);
  const totalElapsed = ((Date.now() - startAll) / 1000).toFixed(2);

  // 4. Print Summary Report
  const passed = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const avgTime = passed.length
    ? (passed.reduce((acc, r) => acc + r.duration, 0) / passed.length).toFixed(2)
    : 0;
  const avgScore = passed.length
    ? (passed.reduce((acc, r) => acc + r.score, 0) / passed.length).toFixed(1)
    : 0;

  console.log(`\n==================== LOAD TEST SUMMARY ====================`);
  console.log(`Total Students:       ${CONCURRENT_STUDENTS}`);
  console.log(`Successful:           ${passed.length} (${((passed.length / CONCURRENT_STUDENTS) * 100).toFixed(1)}%)`);
  console.log(`Failed:               ${failed.length}`);
  console.log(`Average Student Time: ${avgTime}s`);
  console.log(`Average Score:        ${avgScore} pts`);
  console.log(`Total Elapsed Time:   ${totalElapsed}s`);
  console.log(`===========================================================\n`);
}

runCompleteLoadTest();