import { Test, Question, TestCase, TestAttempt, Submission, TestEvent, HelpRequest } from '../types/database';
import { supabase, isSupabaseConfigured } from './supabase';

export const INITIAL_QUESTION_BANK: Omit<Question, 'test_id'>[] = [
  {
    id: 'q-even-odd',
    title: 'Check Even or Odd',
    description: 'Write a C program to determine whether a given integer N is even or odd.',
    input_format: 'A single integer N.',
    output_format: 'Print "Even" if N is even, otherwise print "Odd".',
    constraints: '-10^6 <= N <= 10^6',
    starter_code: `#include <stdio.h>\n\nint main() {\n    //write your code here\n    return 0;\n}`,
    difficulty: 'easy',
    marks: 10,
    time_limit_ms: 2000,
    memory_limit_mb: 64,
    question_order: 1,
    test_cases: [
      {
        id: 'tc-eo-1',
        question_id: 'q-even-odd',
        input: '10',
        expected_output: 'Even',
        is_sample: true,
        marks: 2,
      },
      {
        id: 'tc-eo-2',
        question_id: 'q-even-odd',
        input: '7',
        expected_output: 'Odd',
        is_sample: true,
        marks: 2,
      },
      {
        id: 'tc-eo-3',
        question_id: 'q-even-odd',
        input: '0',
        expected_output: 'Even',
        is_sample: false,
        marks: 2,
      },
      {
        id: 'tc-eo-4',
        question_id: 'q-even-odd',
        input: '-4',
        expected_output: 'Even',
        is_sample: false,
        marks: 2,
      },
      {
        id: 'tc-eo-5',
        question_id: 'q-even-odd',
        input: '999',
        expected_output: 'Odd',
        is_sample: false,
        marks: 2,
      },
    ]
  },
  {
    id: 'q-sum-two',
    title: 'Sum of Two Numbers',
    description: 'Write a C program that reads two integers A and B, and prints their sum.',
    input_format: 'Two space-separated integers A and B.',
    output_format: 'Print a single integer: A + B.',
    constraints: '-10^5 <= A, B <= 10^5',
    starter_code: `#include <stdio.h>\n\nint main() {\n    //write your code here\n    return 0;\n}`,
    difficulty: 'easy',
    marks: 10,
    time_limit_ms: 2000,
    memory_limit_mb: 64,
    question_order: 2,
    test_cases: [
      {
        id: 'tc-st-1',
        question_id: 'q-sum-two',
        input: '10 20',
        expected_output: '30',
        is_sample: true,
        marks: 3,
      },
      {
        id: 'tc-st-2',
        question_id: 'q-sum-two',
        input: '-5 15',
        expected_output: '10',
        is_sample: true,
        marks: 3,
      },
      {
        id: 'tc-st-3',
        question_id: 'q-sum-two',
        input: '123 456',
        expected_output: '579',
        is_sample: false,
        marks: 2,
      },
      {
        id: 'tc-st-4',
        question_id: 'q-sum-two',
        input: '0 0',
        expected_output: '0',
        is_sample: false,
        marks: 2,
      },
    ]
  },
  {
    id: 'q-factorial',
    title: 'Factorial of a Number',
    description: 'Write a C program to calculate the factorial of a non-negative integer N (N!). Note: 0! = 1.',
    input_format: 'A single non-negative integer N.',
    output_format: 'Print the factorial of N.',
    constraints: '0 <= N <= 12',
    starter_code: `#include <stdio.h>\n\nint main() {\n    //write your code here\n    return 0;\n}`,
    difficulty: 'medium',
    marks: 15,
    time_limit_ms: 2000,
    memory_limit_mb: 64,
    question_order: 3,
    test_cases: [
      {
        id: 'tc-fact-1',
        question_id: 'q-factorial',
        input: '5',
        expected_output: '120',
        is_sample: true,
        marks: 5,
      },
      {
        id: 'tc-fact-2',
        question_id: 'q-factorial',
        input: '0',
        expected_output: '1',
        is_sample: false,
        marks: 5,
      },
      {
        id: 'tc-fact-3',
        question_id: 'q-factorial',
        input: '6',
        expected_output: '720',
        is_sample: false,
        marks: 5,
      },
    ]
  },
  {
    id: 'q-max-array',
    title: 'Maximum Element in Array',
    description: 'Given an integer array of size N, find and print the maximum value.',
    input_format: 'First line contains N. Second line contains N space-separated integers.',
    output_format: 'Print the maximum integer found in the array.',
    constraints: '1 <= N <= 1000, -10^5 <= array[i] <= 10^5',
    starter_code: `#include <stdio.h>\n\nint main() {\n    //write your code here\n    return 0;\n}`,
    difficulty: 'medium',
    marks: 15,
    time_limit_ms: 2000,
    memory_limit_mb: 64,
    question_order: 4,
    test_cases: [
      {
        id: 'tc-max-1',
        question_id: 'q-max-array',
        input: '5\n1 9 3 7 5',
        expected_output: '9',
        is_sample: true,
        marks: 5,
      },
      {
        id: 'tc-max-2',
        question_id: 'q-max-array',
        input: '4\n-10 -5 -20 -1',
        expected_output: '-1',
        is_sample: false,
        marks: 5,
      },
      {
        id: 'tc-max-3',
        question_id: 'q-max-array',
        input: '1\n42',
        expected_output: '42',
        is_sample: false,
        marks: 5,
      },
    ]
  },
  {
    id: 'q-prime',
    title: 'Check Prime Number',
    description: 'Determine if a given positive integer N is a prime number.',
    input_format: 'A single positive integer N.',
    output_format: 'Print "Prime" if N is prime, otherwise print "Not Prime".',
    constraints: '1 <= N <= 10^6',
    starter_code: `#include <stdio.h>\n\nint main() {\n    //write your code here\n    return 0;\n}`,
    difficulty: 'medium',
    marks: 15,
    time_limit_ms: 2000,
    memory_limit_mb: 64,
    question_order: 5,
    test_cases: [
      {
        id: 'tc-pr-1',
        question_id: 'q-prime',
        input: '7',
        expected_output: 'Prime',
        is_sample: true,
        marks: 5,
      },
      {
        id: 'tc-pr-2',
        question_id: 'q-prime',
        input: '10',
        expected_output: 'Not Prime',
        is_sample: true,
        marks: 5,
      },
      {
        id: 'tc-pr-3',
        question_id: 'q-prime',
        input: '1',
        expected_output: 'Not Prime',
        is_sample: false,
        marks: 5,
      },
    ]
  }
];

class DatabaseService {
  private testsKey = 'c_exam_tests_v2';
  private attemptsKey = 'c_exam_attempts_v2';
  private submissionsKey = 'c_exam_submissions_v2';
  private eventsKey = 'c_exam_events_v2';
  private codeDraftsKey = 'c_exam_drafts_v2';
  private questionBankKey = 'c_exam_question_bank_v2';
  private helpRequestsKey = 'c_exam_help_requests_v2';

  constructor() {
    this.init();
  }

  private init() {
    if (!localStorage.getItem(this.testsKey)) {
      localStorage.setItem(this.testsKey, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.attemptsKey)) {
      localStorage.setItem(this.attemptsKey, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.submissionsKey)) {
      localStorage.setItem(this.submissionsKey, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.eventsKey)) {
      localStorage.setItem(this.eventsKey, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.questionBankKey)) {
      localStorage.setItem(this.questionBankKey, JSON.stringify(INITIAL_QUESTION_BANK));
    }
    if (!localStorage.getItem(this.helpRequestsKey)) {
      localStorage.setItem(this.helpRequestsKey, JSON.stringify([]));
    }

    this.syncFromSupabase();
  }

  private lastFullSyncTime = 0;
  private syncPromise: Promise<void> | null = null;
  private lastMonitoringSyncTime = 0;
  private lastResultsSyncTime: Record<string, number> = {};

  public async syncFromSupabase(force = false): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    const now = Date.now();
    // Throttle full syncs to at most once per 30 seconds unless explicitly forced
    if (!force && now - this.lastFullSyncTime < 30000) {
      return;
    }
    // Deduplicate in-flight sync requests
    if (this.syncPromise) {
      return this.syncPromise;
    }

    this.syncPromise = this.doFullSync();
    try {
      await this.syncPromise;
    } finally {
      this.syncPromise = null;
      this.lastFullSyncTime = Date.now();
    }
  }

  private async doFullSync(): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      // 1. Fetch tests, questions, and test_cases directly
      const { data: testsData, error: testsError } = await supabase
        .from('tests')
        .select('*');

      if (!testsError && testsData && testsData.length > 0) {
        // Fetch all questions
        const { data: questionsData } = await supabase
          .from('questions')
          .select('*')
          .order('question_order', { ascending: true });

        // Fetch all test cases
        const { data: testCasesData } = await supabase
          .from('test_cases')
          .select('*');

        const tcMap = new Map<string, TestCase[]>();
        if (testCasesData) {
          for (const tc of testCasesData) {
            if (!tcMap.has(tc.question_id)) {
              tcMap.set(tc.question_id, []);
            }
            tcMap.get(tc.question_id)!.push(tc);
          }
        }

        const qMap = new Map<string, Question[]>();
        if (questionsData) {
          for (const q of questionsData) {
            const qCases = tcMap.get(q.id) || q.test_cases || [];
            const fullQ: Question = {
              ...q,
              test_cases: qCases,
            };
            if (!qMap.has(q.test_id)) {
              qMap.set(q.test_id, []);
            }
            qMap.get(q.test_id)!.push(fullQ);
          }
        }

        // Merge with local tests
        const existingLocalTests = this.getTests();
        const localTestMap = new Map<string, Test>(existingLocalTests.map(t => [t.id, t]));

        const combinedTests: Test[] = testsData.map((t: any) => {
          const supabaseQuestions = qMap.get(t.id);
          const localTest = localTestMap.get(t.id);
          const finalQuestions = (supabaseQuestions && supabaseQuestions.length > 0)
            ? supabaseQuestions
            : (localTest?.questions || []);

          return {
            ...localTest,
            ...t,
            questions: finalQuestions,
            total_marks: finalQuestions.reduce((sum, q) => sum + (q.marks || 0), 0) || t.total_marks || 0,
          };
        });

        for (const localTest of existingLocalTests) {
          if (!combinedTests.some(ct => ct.id === localTest.id)) {
            combinedTests.push(localTest);
          }
        }

        localStorage.setItem(this.testsKey, JSON.stringify(combinedTests));
      }

      const { data: attemptsData, error: attemptsError } = await supabase
        .from('test_attempts')
        .select('*');

      if (!attemptsError && attemptsData && attemptsData.length > 0) {
        localStorage.setItem(this.attemptsKey, JSON.stringify(attemptsData));
      }

      // Constrain submissions query to recent records to save bandwidth and logs
      const { data: subsData, error: subsError } = await supabase
        .from('submissions')
        .select(`
          *,
          resultsRecord:submission_results (*)
        `)
        .order('submitted_at', { ascending: false })
        .limit(200);

      if (!subsError && subsData && subsData.length > 0) {
        const normalizedSubs: Submission[] = subsData.map((s: any) => {
          let testCaseResults: any[] = [];
          if (s.resultsRecord) {
            if (Array.isArray(s.resultsRecord)) {
              if (s.resultsRecord.length > 0 && s.resultsRecord[0].results) {
                testCaseResults = s.resultsRecord[0].results;
              } else {
                testCaseResults = s.resultsRecord;
              }
            } else if (s.resultsRecord.results) {
              testCaseResults = s.resultsRecord.results;
            }
          } else if (s.results) {
            testCaseResults = Array.isArray(s.results) ? s.results : [];
          }

          return {
            ...s,
            results: testCaseResults,
          };
        });

        // Merge with existing local submissions so older local data is preserved
        const existingSubs = this.getSubmissions();
        const subMap = new Map<string, Submission>(existingSubs.map(s => [s.id, s]));
        for (const s of normalizedSubs) {
          subMap.set(s.id, s);
        }
        localStorage.setItem(this.submissionsKey, JSON.stringify(Array.from(subMap.values())));
      }

      // Constrain test events to recent records
      const { data: eventsData, error: eventsError } = await supabase
        .from('test_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (!eventsError && eventsData && eventsData.length > 0) {
        const existingEvents = this.getEvents();
        const eventMap = new Map<string, TestEvent>(existingEvents.map(e => [e.id, e]));
        for (const e of eventsData) {
          eventMap.set(e.id, e);
        }
        localStorage.setItem(this.eventsKey, JSON.stringify(Array.from(eventMap.values())));
      }

      const { data: helpData, error: helpError } = await supabase
        .from('help_requests')
        .select('*');

      if (!helpError && helpData && helpData.length > 0) {
        localStorage.setItem(this.helpRequestsKey, JSON.stringify(helpData));
      }
    } catch (err) {
      console.warn('Supabase sync warning:', err);
    }
  }

  /**
   * Lightweight targeted sync for live teacher monitoring.
   * Only fetches test_attempts and help_requests for the target test instead of scanning the whole DB.
   */
  public async syncLiveMonitoring(testId?: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    const now = Date.now();
    if (now - this.lastMonitoringSyncTime < 4000) return;
    this.lastMonitoringSyncTime = now;

    try {
      // 1. Fetch test_attempts
      let attQuery = supabase.from('test_attempts').select('*');
      if (testId) attQuery = attQuery.eq('test_id', testId);
      const { data: attemptsData } = await attQuery;

      if (attemptsData) {
        const existing = this.getAttempts();
        const map = new Map<string, TestAttempt>(existing.map(a => [a.id, a]));
        for (const a of attemptsData) {
          map.set(a.id, a);
        }
        localStorage.setItem(this.attemptsKey, JSON.stringify(Array.from(map.values())));
      }

      // 2. Fetch help_requests
      let helpQuery = supabase.from('help_requests').select('*');
      if (testId) helpQuery = helpQuery.eq('test_id', testId);
      const { data: helpData } = await helpQuery;

      if (helpData) {
        const existingHelp = this.getHelpRequests();
        const helpMap = new Map<string, HelpRequest>(existingHelp.map(h => [h.id, h]));
        for (const h of helpData) {
          helpMap.set(h.id, h);
        }
        localStorage.setItem(this.helpRequestsKey, JSON.stringify(Array.from(helpMap.values())));
      }
    } catch (err) {
      console.warn('syncLiveMonitoring error:', err);
    }
  }

  /**
   * Targeted sync for Results page: only fetches attempts & submissions for the specified test.
   */
  public async syncTestResults(testId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase || !testId) return;
    const now = Date.now();
    if (now - (this.lastResultsSyncTime[testId] || 0) < 8000) return;
    this.lastResultsSyncTime[testId] = now;

    try {
      const { data: attemptsData } = await supabase
        .from('test_attempts')
        .select('*')
        .eq('test_id', testId);

      if (attemptsData && attemptsData.length > 0) {
        const existing = this.getAttempts();
        const map = new Map<string, TestAttempt>(existing.map(a => [a.id, a]));
        for (const a of attemptsData) {
          map.set(a.id, a);
        }
        localStorage.setItem(this.attemptsKey, JSON.stringify(Array.from(map.values())));

        const attemptIds = attemptsData.map(a => a.id);
        const { data: subsData } = await supabase
          .from('submissions')
          .select(`*, resultsRecord:submission_results (*)`)
          .in('attempt_id', attemptIds);

        if (subsData) {
          const normalized = subsData.map((s: any) => {
            let testCaseResults: any[] = [];
            if (s.resultsRecord) {
              if (Array.isArray(s.resultsRecord)) {
                testCaseResults = s.resultsRecord.length > 0 && s.resultsRecord[0].results ? s.resultsRecord[0].results : s.resultsRecord;
              } else if (s.resultsRecord.results) {
                testCaseResults = s.resultsRecord.results;
              }
            } else if (s.results) {
              testCaseResults = Array.isArray(s.results) ? s.results : [];
            }
            return { ...s, results: testCaseResults };
          });

          const existingSubs = this.getSubmissions();
          const subMap = new Map<string, Submission>(existingSubs.map(s => [s.id, s]));
          for (const s of normalized) {
            subMap.set(s.id, s);
          }
          localStorage.setItem(this.submissionsKey, JSON.stringify(Array.from(subMap.values())));
        }
      }
    } catch (err) {
      console.warn('syncTestResults error:', err);
    }
  }

  /**
   * Targeted sync for a single student help request.
   */
  public async syncStudentHelpRequest(attemptId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase || !attemptId) return;
    try {
      const { data } = await supabase
        .from('help_requests')
        .select('*')
        .eq('attempt_id', attemptId);

      if (data) {
        const existing = this.getHelpRequests().filter(h => h.attempt_id !== attemptId);
        const combined = [...data, ...existing];
        localStorage.setItem(this.helpRequestsKey, JSON.stringify(combined));
        this.notifyHelpUpdate('update');
      }
    } catch (err) {
      console.warn('syncStudentHelpRequest error:', err);
    }
  }

  // Question Bank CRUD
  public getQuestionBank(): Omit<Question, 'test_id'>[] {
    try {
      const raw = localStorage.getItem(this.questionBankKey);
      return raw ? JSON.parse(raw) : INITIAL_QUESTION_BANK;
    } catch {
      return INITIAL_QUESTION_BANK;
    }
  }

  public saveQuestionBankQuestion(question: Omit<Question, 'test_id'>): Omit<Question, 'test_id'>[] {
    const bank = this.getQuestionBank();
    const existingIndex = bank.findIndex(q => q.id === question.id);
    if (existingIndex >= 0) {
      bank[existingIndex] = question;
    } else {
      bank.push(question);
    }
    localStorage.setItem(this.questionBankKey, JSON.stringify(bank));
    return bank;
  }

  public deleteQuestionBankQuestion(id: string): Omit<Question, 'test_id'>[] {
    const bank = this.getQuestionBank().filter(q => q.id !== id);
    localStorage.setItem(this.questionBankKey, JSON.stringify(bank));
    return bank;
  }

  // Tests CRUD
  public getTests(): Test[] {
    try {
      const raw = localStorage.getItem(this.testsKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public getTestByJoinCode(code: string): Test | undefined {
    const tests = this.getTests();
    return tests.find(t => t.join_code.trim().toUpperCase() === code.trim().toUpperCase());
  }

  public getTestById(id: string): Test | undefined {
    const tests = this.getTests();
    return tests.find(t => t.id === id);
  }

  public async saveTest(test: Test): Promise<Test> {
    const tests = this.getTests();
    const existingIndex = tests.findIndex(t => t.id === test.id);
    if (existingIndex >= 0) {
      tests[existingIndex] = test;
    } else {
      tests.unshift(test);
    }
    localStorage.setItem(this.testsKey, JSON.stringify(tests));

    if (isSupabaseConfigured && supabase) {
      try {
        const testPayload: Record<string, any> = {
          id: test.id,
          title: test.title,
          description: test.description,
          join_code: test.join_code,
          duration_minutes: test.duration_minutes,
          status: test.status,
          created_by: test.created_by,
          created_at: test.created_at,
          enable_tab_switch_tracking: test.enable_tab_switch_tracking !== false,
          enable_fullscreen_mode: test.enable_fullscreen_mode !== false,
          is_untimed: Boolean(test.is_untimed),
        };

        let { error: testErr } = await supabase.from('tests').upsert(testPayload);

        // Defensive fallback: If Supabase migration hasn't been executed yet, retry without is_untimed
        if (testErr && testErr.message && testErr.message.includes('is_untimed')) {
          delete testPayload.is_untimed;
          const retryRes = await supabase.from('tests').upsert(testPayload);
          testErr = retryRes.error;
        }

        if (testErr) {
          console.error('Supabase tests upsert failed:', testErr.message, testErr);
        }

        const currentQuestions = test.questions || [];
        const currentQIds = currentQuestions.map(q => q.id);

        // Fetch existing questions in Supabase for this test and delete any removed questions
        const { data: existingQs } = await supabase
          .from('questions')
          .select('id')
          .eq('test_id', test.id);

        if (existingQs && existingQs.length > 0) {
          const toDeleteQIds = existingQs
            .map(q => q.id)
            .filter(id => !currentQIds.includes(id));

          if (toDeleteQIds.length > 0) {
            await supabase.from('test_cases').delete().in('question_id', toDeleteQIds);
            await supabase.from('questions').delete().in('id', toDeleteQIds);
          }
        }

        // Upsert questions and test cases
        for (const q of currentQuestions) {
          const { error: qErr } = await supabase.from('questions').upsert({
            id: q.id,
            test_id: test.id,
            title: q.title,
            description: q.description,
            input_format: q.input_format,
            output_format: q.output_format,
            constraints: q.constraints,
            starter_code: q.starter_code,
            difficulty: q.difficulty,
            marks: q.marks,
            time_limit_ms: q.time_limit_ms,
            memory_limit_mb: q.memory_limit_mb,
            question_order: q.question_order,
            image_url: q.image_url || null,
            algorithm: q.algorithm || null,
          });

          if (qErr) {
            console.error('Supabase questions upsert failed:', qErr.message, qErr);
          }

          const currentTestCases = q.test_cases || [];
          const currentTcIds = currentTestCases.map(tc => tc.id);

          // Delete any removed test_cases for this question
          const { data: existingTCs } = await supabase
            .from('test_cases')
            .select('id')
            .eq('question_id', q.id);

          if (existingTCs && existingTCs.length > 0) {
            const toDeleteTcIds = existingTCs
              .map(tc => tc.id)
              .filter(id => !currentTcIds.includes(id));

            if (toDeleteTcIds.length > 0) {
              await supabase.from('test_cases').delete().in('id', toDeleteTcIds);
            }
          }

          for (const tc of currentTestCases) {
            const { error: tcErr } = await supabase.from('test_cases').upsert({
              id: tc.id,
              question_id: q.id,
              input: tc.input,
              expected_output: tc.expected_output,
              is_sample: tc.is_sample,
              marks: tc.marks,
            });

            if (tcErr) {
              console.error('Supabase test_cases upsert failed:', tcErr.message, tcErr);
            }
          }
        }
      } catch (e) {
        console.error('Supabase test upsert exception:', e);
      }
    }

    return test;
  }

  public generateUniqueJoinCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existing = this.getTests();
    if (existing.some(t => t.join_code?.toUpperCase() === code.toUpperCase())) {
      return this.generateUniqueJoinCode();
    }
    return code;
  }

  public async duplicateTest(sourceTestId: string, directSourceTest?: Test): Promise<Test | null> {
    let sourceTest = directSourceTest || this.getTestById(sourceTestId);

    // If Supabase is configured, always verify against Supabase questions table to ensure no questions are missed
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: qData } = await supabase
          .from('questions')
          .select('*')
          .eq('test_id', sourceTestId)
          .order('question_order', { ascending: true });

        if (qData && qData.length > 0) {
          const qIds = qData.map(q => q.id);
          const { data: tcData } = await supabase
            .from('test_cases')
            .select('*')
            .in('question_id', qIds);

          const tcMap = new Map<string, TestCase[]>();
          if (tcData) {
            for (const tc of tcData) {
              if (!tcMap.has(tc.question_id)) {
                tcMap.set(tc.question_id, []);
              }
              tcMap.get(tc.question_id)!.push(tc);
            }
          }

          const supabaseQuestions: Question[] = qData.map(q => ({
            ...q,
            test_cases: tcMap.get(q.id) || [],
          }));

          const localCount = sourceTest?.questions?.length || 0;
          if (!sourceTest || localCount < supabaseQuestions.length) {
            if (sourceTest) {
              sourceTest = { ...sourceTest, questions: supabaseQuestions };
            } else {
              const { data: tData } = await supabase.from('tests').select('*').eq('id', sourceTestId).single();
              sourceTest = {
                ...(tData || {}),
                id: sourceTestId,
                title: tData?.title || 'Assessment',
                join_code: tData?.join_code || this.generateUniqueJoinCode(),
                duration_minutes: tData?.duration_minutes || 45,
                status: 'draft',
                created_by: tData?.created_by || 'teacher-kanishk',
                created_at: new Date().toISOString(),
                questions: supabaseQuestions,
              };
            }
          }
        }
      } catch (err) {
        console.warn('Supabase fetch during duplicateTest:', err);
      }
    }

    if (!sourceTest) return null;

    const sourceQuestions = sourceTest.questions || [];
    const newTestId = 'test-' + Math.random().toString(36).substring(2, 9);
    const newJoinCode = this.generateUniqueJoinCode();

    // Deep clone all questions and their test cases, explicitly preserving image_url and algorithm
    const clonedQuestions: Question[] = sourceQuestions.map((q, qIndex) => {
      const newQuestionId = 'q-' + Math.random().toString(36).substring(2, 9);
      const clonedTestCases = (q.test_cases || []).map((tc, tcIndex) => ({
        id: 'tc-' + Math.random().toString(36).substring(2, 9) + '-' + tcIndex,
        question_id: newQuestionId,
        input: tc.input ?? '',
        expected_output: tc.expected_output ?? '',
        is_sample: Boolean(tc.is_sample),
        marks: tc.marks ?? 5,
      }));

      return {
        id: newQuestionId,
        test_id: newTestId,
        title: q.title || `Problem ${qIndex + 1}`,
        description: q.description || '',
        input_format: q.input_format || '',
        output_format: q.output_format || '',
        constraints: q.constraints || '',
        starter_code: q.starter_code || '#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}',
        difficulty: q.difficulty || 'easy',
        marks: q.marks ?? 10,
        time_limit_ms: q.time_limit_ms ?? 2000,
        memory_limit_mb: q.memory_limit_mb ?? 64,
        question_order: q.question_order ?? (qIndex + 1),
        image_url: q.image_url ? String(q.image_url).trim() : undefined,
        algorithm: q.algorithm ? String(q.algorithm).trim() : undefined,
        test_cases: clonedTestCases,
      };
    });

    const totalMarks = clonedQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);

    const newTest: Test = {
      ...sourceTest,
      id: newTestId,
      title: `${sourceTest.title || 'Assessment'} (Copy)`,
      description: sourceTest.description || '',
      join_code: newJoinCode,
      duration_minutes: sourceTest.duration_minutes || 45,
      status: 'draft',
      created_by: sourceTest.created_by || 'teacher-kanishk',
      created_at: new Date().toISOString(),
      questions: clonedQuestions,
      total_marks: totalMarks,
      enable_tab_switch_tracking: sourceTest.enable_tab_switch_tracking !== false,
      enable_fullscreen_mode: sourceTest.enable_fullscreen_mode !== false,
      is_untimed: Boolean(sourceTest.is_untimed),
    };

    await this.saveTest(newTest);
    return newTest;
  }

  public async deleteTest(id: string): Promise<void> {
    const tests = this.getTests().filter(t => t.id !== id);
    localStorage.setItem(this.testsKey, JSON.stringify(tests));

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: qData } = await supabase
          .from('questions')
          .select('id')
          .eq('test_id', id);

        if (qData && qData.length > 0) {
          const qIds = qData.map(q => q.id);
          await supabase.from('test_cases').delete().in('question_id', qIds);
          await supabase.from('questions').delete().in('id', qIds);
        }

        await supabase.from('tests').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase delete error:', e);
      }
    }
  }

  // Student Attempts CRUD
  public getAttempts(testId?: string): TestAttempt[] {
    try {
      const raw = localStorage.getItem(this.attemptsKey);
      const list: TestAttempt[] = raw ? JSON.parse(raw) : [];
      return testId ? list.filter(a => a.test_id === testId) : list;
    } catch {
      return [];
    }
  }

  public async saveAttempt(attempt: TestAttempt): Promise<TestAttempt> {
    const attempts = this.getAttempts();
    const existingIndex = attempts.findIndex(a => a.id === attempt.id);
    if (existingIndex >= 0) {
      attempts[existingIndex] = attempt;
    } else {
      attempts.push(attempt);
    }
    localStorage.setItem(this.attemptsKey, JSON.stringify(attempts));

    if (isSupabaseConfigured && supabase) {
      try {
        const { error: attErr } = await supabase.from('test_attempts').upsert({
          id: attempt.id,
          test_id: attempt.test_id,
          student_id: attempt.student_id,
          student_name: attempt.student_name,
          student_roll_no: attempt.student_roll_no,
          started_at: attempt.started_at,
          submitted_at: attempt.submitted_at,
          status: attempt.status,
          score: attempt.score,
          tab_switch_count: attempt.tab_switch_count || 0,
          fullscreen_exit_count: attempt.fullscreen_exit_count || 0,
        });
        if (attErr) {
          console.error('Supabase test_attempts upsert failed:', attErr.message, attErr);
        }
      } catch (e) {
        console.error('Supabase attempt upsert exception:', e);
      }
    }

    return attempt;
  }

  public async deleteAttempt(attemptId: string): Promise<void> {
    const attempts = this.getAttempts().filter(a => a.id !== attemptId);
    localStorage.setItem(this.attemptsKey, JSON.stringify(attempts));

    const subs = this.getSubmissions().filter(s => s.attempt_id !== attemptId);
    localStorage.setItem(this.submissionsKey, JSON.stringify(subs));

    const events = this.getEvents().filter(e => e.attempt_id !== attemptId);
    localStorage.setItem(this.eventsKey, JSON.stringify(events));

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('test_events').delete().eq('attempt_id', attemptId);
        await supabase.from('submissions').delete().eq('attempt_id', attemptId);
        await supabase.from('test_attempts').delete().eq('id', attemptId);
      } catch (e) {
        console.warn('Supabase deleteAttempt error:', e);
      }
    }
  }

  // Submissions CRUD
  public getSubmissions(attemptId?: string): Submission[] {
    try {
      const raw = localStorage.getItem(this.submissionsKey);
      const list: Submission[] = raw ? JSON.parse(raw) : [];
      return attemptId ? list.filter(s => s.attempt_id === attemptId) : list;
    } catch {
      return [];
    }
  }

  /**
   * Returns only the latest submission for each question for an attempt.
   */
  public getLatestSubmissions(attemptId?: string): Submission[] {
    const all = this.getSubmissions(attemptId);
    const map = new Map<string, Submission>();
    for (const sub of all) {
      const key = `${sub.attempt_id}_${sub.question_id}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, sub);
      } else {
        const existingTime = new Date(existing.submitted_at).getTime() || 0;
        const newTime = new Date(sub.submitted_at).getTime() || 0;
        if (newTime >= existingTime) {
          map.set(key, sub);
        }
      }
    }
    return Array.from(map.values());
  }

  /**
   * Calculates the total score for an attempt based strictly on the latest submission of each question.
   */
  public calculateAttemptScore(attemptId: string): number {
    const latestSubs = this.getLatestSubmissions(attemptId);
    return latestSubs.reduce((sum, s) => sum + (s.score || 0), 0);
  }

  public async saveSubmission(submission: Submission): Promise<Submission> {
    const subId = submission.id || `sub_${submission.attempt_id}_${submission.question_id}`;
    const normalizedSubmission: Submission = {
      ...submission,
      id: subId,
    };

    const subs = this.getSubmissions();
    const existingIndex = subs.findIndex(
      s => (s.id === subId) || (s.attempt_id === normalizedSubmission.attempt_id && s.question_id === normalizedSubmission.question_id)
    );
    if (existingIndex >= 0) {
      subs[existingIndex] = normalizedSubmission;
    } else {
      subs.push(normalizedSubmission);
    }
    localStorage.setItem(this.submissionsKey, JSON.stringify(subs));

    if (isSupabaseConfigured && supabase) {
      try {
        const { error: subErr } = await supabase.from('submissions').upsert({
          id: normalizedSubmission.id,
          attempt_id: normalizedSubmission.attempt_id,
          question_id: normalizedSubmission.question_id,
          student_id: normalizedSubmission.student_id,
          code: normalizedSubmission.code,
          language: normalizedSubmission.language,
          status: normalizedSubmission.status,
          score: normalizedSubmission.score,
          max_score: normalizedSubmission.max_score,
          submitted_at: normalizedSubmission.submitted_at,
          execution_time: normalizedSubmission.execution_time,
        }, { onConflict: 'id' });

        if (subErr) {
          console.error('Supabase submissions upsert failed:', subErr.message, subErr);
        }

        // Approach B: 1 row per submission with lightweight JSON results inside submission_results table
        if (normalizedSubmission.results && normalizedSubmission.results.length > 0) {
          const resultsPayload = normalizedSubmission.results.map((res) => ({
            test_case_id: res.test_case_id,
            is_sample: res.is_sample,
            status: res.status,
            actual_output: (res.actual_output || '').slice(0, 2048),
            expected_output: (res.expected_output || '').slice(0, 2048),
            execution_time: res.execution_time,
            error_message: (res.error_message || '').slice(0, 1024),
            marks_awarded: res.marks_awarded,
            max_marks: res.max_marks,
          }));

          const resRecordId = `res_${normalizedSubmission.id}`;

          const { error: resErr } = await supabase
            .from('submission_results')
            .upsert({
              id: resRecordId,
              submission_id: normalizedSubmission.id,
              results: resultsPayload,
            }, { onConflict: 'id' });

          if (resErr) {
            console.error('Supabase submission_results upsert failed:', resErr.message, resErr);
          }
        }
      } catch (e) {
        console.error('Supabase submission upsert exception:', e);
      }
    }

    return normalizedSubmission;
  }

  public logEvent(event: Omit<TestEvent, 'id'>): void {
    try {
      const raw = localStorage.getItem(this.eventsKey);
      const list: TestEvent[] = raw ? JSON.parse(raw) : [];
      const eventObj: TestEvent = {
        ...event,
        id: Math.random().toString(36).substring(2, 9),
      };
      list.push(eventObj);
      localStorage.setItem(this.eventsKey, JSON.stringify(list));

      if (isSupabaseConfigured && supabase) {
        supabase.from('test_events').insert({
          id: eventObj.id,
          attempt_id: eventObj.attempt_id,
          event_type: eventObj.event_type,
          timestamp: eventObj.timestamp,
          metadata: eventObj.metadata || {},
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  public getEvents(attemptId?: string): TestEvent[] {
    try {
      const raw = localStorage.getItem(this.eventsKey);
      const list: TestEvent[] = raw ? JSON.parse(raw) : [];
      return attemptId ? list.filter(e => e.attempt_id === attemptId) : list;
    } catch {
      return [];
    }
  }

  public saveCodeDraft(attemptId: string, questionId: string, code: string): void {
    try {
      const key = `${this.codeDraftsKey}_${attemptId}_${questionId}`;
      localStorage.setItem(key, JSON.stringify({ code, updatedAt: Date.now() }));
    } catch (e) {
      console.error(e);
    }
  }

  public getCodeDraft(attemptId: string, questionId: string): string | null {
    try {
      const key = `${this.codeDraftsKey}_${attemptId}_${questionId}`;
      const item = localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        if (parsed && typeof parsed.code === 'string') {
          return parsed.code;
        }
      }
      // If local draft is not present (e.g. reopened from new browser), check saved submission
      const subs = this.getSubmissions(attemptId);
      const prevSub = subs.find(s => s.question_id === questionId);
      if (prevSub && prevSub.code) {
        return prevSub.code;
      }
      return null;
    } catch {
      return null;
    }
  }

  public saveLastActiveQuestion(attemptId: string, questionIndex: number): void {
    try {
      localStorage.setItem(`c_exam_last_q_${attemptId}`, String(questionIndex));
    } catch {}
  }

  public getLastActiveQuestion(attemptId: string): number {
    try {
      const val = localStorage.getItem(`c_exam_last_q_${attemptId}`);
      return val !== null ? parseInt(val, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  public clearAttemptDrafts(attemptId: string): void {
    try {
      const prefix = `${this.codeDraftsKey}_${attemptId}`;
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      localStorage.removeItem(`c_exam_last_q_${attemptId}`);
    } catch (e) {
      console.error(e);
    }
  }

  public clearStorageAfterTest(attemptId: string): void {
    try {
      this.clearAttemptDrafts(attemptId);
      localStorage.removeItem(`c_exam_ai_state_${attemptId}`);
      localStorage.removeItem(`c_exam_last_q_${attemptId}`);
      
      // Clean up all localStorage keys associated with this attempt
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes(attemptId) || key.startsWith(`c_exam_ai_state_${attemptId}`))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => {
        try {
          localStorage.removeItem(k);
        } catch {}
      });
    } catch (e) {
      console.error('Error clearing test localStorage:', e);
    }
  }

  // Help Requests (Need Help Queue)
  public getHelpRequests(testId?: string): HelpRequest[] {
    try {
      const raw = localStorage.getItem(this.helpRequestsKey);
      const requests: HelpRequest[] = raw ? JSON.parse(raw) : [];
      if (testId) {
        return requests.filter(r => r.test_id === testId);
      }
      return requests;
    } catch {
      return [];
    }
  }

  public async requestHelp(payload: {
    test_id: string;
    attempt_id: string;
    student_name: string;
    student_roll_no: string;
    question_title?: string;
  }): Promise<HelpRequest> {
    const list = this.getHelpRequests();
    const existingIndex = list.findIndex(
      r => r.attempt_id === payload.attempt_id && r.status === 'pending'
    );

    let req: HelpRequest;
    if (existingIndex >= 0) {
      req = {
        ...list[existingIndex],
        question_title: payload.question_title || list[existingIndex].question_title,
        requested_at: new Date().toISOString(),
      };
      list[existingIndex] = req;
    } else {
      req = {
        id: 'help-' + Math.random().toString(36).substring(2, 9),
        test_id: payload.test_id,
        attempt_id: payload.attempt_id,
        student_name: payload.student_name,
        student_roll_no: payload.student_roll_no,
        question_title: payload.question_title,
        requested_at: new Date().toISOString(),
        status: 'pending',
      };
      list.unshift(req);
    }

    localStorage.setItem(this.helpRequestsKey, JSON.stringify(list));
    this.notifyHelpUpdate('new', req);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('help_requests').upsert(req);
      } catch (err) {
        console.warn('Supabase help_requests upsert error:', err);
      }
    }

    return req;
  }

  private notifyHelpUpdate(action: 'new' | 'cancel' | 'resolve' | 'delete' | 'clear' | 'update' = 'update', payload?: any): void {
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('codearena_help_update', { detail: { action, payload } }));
        const bc = (window as any).__codearena_help_bc || new BroadcastChannel('codearena_help_channel');
        (window as any).__codearena_help_bc = bc;
        bc.postMessage({ type: 'help_update', action, payload, timestamp: Date.now() });
      } catch {}
    }
  }

  public async cancelHelpRequest(attemptId: string): Promise<void> {
    const list = this.getHelpRequests().filter(
      r => !(r.attempt_id === attemptId && r.status === 'pending')
    );
    localStorage.setItem(this.helpRequestsKey, JSON.stringify(list));
    this.notifyHelpUpdate('cancel');

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('help_requests')
          .delete()
          .eq('attempt_id', attemptId)
          .eq('status', 'pending');
      } catch (err) {
        console.warn('Supabase help_requests delete error:', err);
      }
    }
  }

  public async resolveHelpRequest(id: string): Promise<void> {
    const list = this.getHelpRequests();
    const updated = list.map(r => (r.id === id ? { ...r, status: 'resolved' as const } : r));
    localStorage.setItem(this.helpRequestsKey, JSON.stringify(updated));
    this.notifyHelpUpdate('resolve', { id });

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('help_requests')
          .update({ status: 'resolved' })
          .eq('id', id);
      } catch (err) {
        console.warn('Supabase help_requests resolve error:', err);
      }
    }
  }

  public async deleteHelpRequest(id: string): Promise<void> {
    const list = this.getHelpRequests().filter(r => r.id !== id);
    localStorage.setItem(this.helpRequestsKey, JSON.stringify(list));
    this.notifyHelpUpdate('delete', { id });

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('help_requests')
          .delete()
          .eq('id', id);
      } catch (err) {
        console.warn('Supabase help_requests delete error:', err);
      }
    }
  }

  public async clearAllHelpRequests(testId?: string): Promise<void> {
    let list = this.getHelpRequests();
    if (testId) {
      list = list.filter(r => r.test_id !== testId);
    } else {
      list = [];
    }
    localStorage.setItem(this.helpRequestsKey, JSON.stringify(list));
    this.notifyHelpUpdate('clear');

    if (isSupabaseConfigured && supabase) {
      try {
        if (testId) {
          await supabase.from('help_requests').delete().eq('test_id', testId);
        } else {
          await supabase.from('help_requests').delete().neq('id', '');
        }
      } catch (err) {
        console.warn('Supabase help_requests clear error:', err);
      }
    }
  }

  public isHelpPending(attemptId: string): boolean {
    const list = this.getHelpRequests();
    return list.some(r => r.attempt_id === attemptId && r.status === 'pending');
  }
}

export const mockDb = new DatabaseService();
export const db = mockDb;
export { DatabaseService };
