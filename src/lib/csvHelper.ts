import { Question, TestCase } from '../types/database';

/**
 * Parses raw CSV content with proper quoting / multiline escaping support.
 */
export function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (insideQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // Skip the escaped quote
      } else if (char === '"') {
        insideQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r' && nextChar === '\n') {
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++; // skip \n
      } else if (char === '\n' || char === '\r') {
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Standard CSV Template Headers
 */
export const CSV_HEADERS = [
  'question_title',
  'marks',
  'difficulty',
  'constraints',
  'description',
  'input_format',
  'output_format',
  'template_code',
  // Sample test cases (1 to 4)
  'sample_1_input',
  'sample_1_expected_output',
  'sample_1_marks',
  'sample_2_input',
  'sample_2_expected_output',
  'sample_2_marks',
  'sample_3_input',
  'sample_3_expected_output',
  'sample_3_marks',
  'sample_4_input',
  'sample_4_expected_output',
  'sample_4_marks',
  // Hidden test cases (1 to 5)
  'hidden_1_input',
  'hidden_1_expected_output',
  'hidden_1_marks',
  'hidden_2_input',
  'hidden_2_expected_output',
  'hidden_2_marks',
  'hidden_3_input',
  'hidden_3_expected_output',
  'hidden_3_marks',
  'hidden_4_input',
  'hidden_4_expected_output',
  'hidden_4_marks',
  'hidden_5_input',
  'hidden_5_expected_output',
  'hidden_5_marks',
];

/**
 * Creates and triggers a download for a sample CSV template with pre-filled question examples.
 */
export function downloadSampleCSVTemplate() {
  const sampleRow1 = [
    'Sum of Two Integers',
    '10',
    'easy',
    '1 <= A, B <= 10^5',
    'Given two integers A and B, compute and print their sum.',
    'Two space-separated integers A and B.',
    'Print a single integer representing the sum.',
    `#include <stdio.h>\\n\\nint main() {\\n    int a, b;\\n    if (scanf("%d %d", &a, &b) == 2) {\\n        printf("%d\\\\n", a + b);\\n    }\\n    return 0;\\n}`,
    // Sample 1
    '3 5',
    '8',
    '2',
    // Sample 2
    '100 200',
    '300',
    '2',
    // Sample 3
    '0 0',
    '0',
    '1',
    // Sample 4
    '',
    '',
    '',
    // Hidden 1
    '1000 5000',
    '6000',
    '1',
    // Hidden 2
    '99999 1',
    '100000',
    '1',
    // Hidden 3
    '45 55',
    '100',
    '1',
    // Hidden 4
    '123 321',
    '444',
    '1',
    // Hidden 5
    '100000 100000',
    '200000',
    '1',
  ];

  const sampleRow2 = [
    'Find Array Maximum',
    '15',
    'medium',
    '1 <= N <= 1000\\n-10^4 <= arr[i] <= 10^4',
    'Given an array of N integers, find and print the maximum element.',
    'First line contains integer N. Second line contains N integers.',
    'Print the maximum value found in the array.',
    `#include <stdio.h>\\n\\nint main() {\\n    int n;\\n    scanf("%d", &n);\\n    int maxVal;\\n    scanf("%d", &maxVal);\\n    for (int i = 1; i < n; i++) {\\n        int x;\\n        scanf("%d", &x);\\n        if (x > maxVal) maxVal = x;\\n    }\\n    printf("%d\\\\n", maxVal);\\n    return 0;\\n}`,
    // Sample 1
    '5\\n1 9 3 7 5',
    '9',
    '3',
    // Sample 2
    '4\\n-10 -5 -20 -1',
    '-1',
    '3',
    // Sample 3
    '1\\n42',
    '42',
    '2',
    // Sample 4
    '',
    '',
    '',
    // Hidden 1
    '6\\n10 20 30 40 50 60',
    '60',
    '2',
    // Hidden 2
    '3\\n100 0 -100',
    '100',
    '2',
    // Hidden 3
    '5\\n5 5 5 5 5',
    '5',
    '1',
    // Hidden 4
    '4\\n-1000 -2000 -3000 -500',
    '-500',
    '1',
    // Hidden 5
    '2\\n999 1000',
    '1000',
    '1',
  ];

  const escapeCSV = (str: string) => {
    if (!str) return '""';
    const formatted = str.replace(/"/g, '""');
    return `"${formatted}"`;
  };

  const csvContent = [
    CSV_HEADERS.map(escapeCSV).join(','),
    sampleRow1.map(escapeCSV).join(','),
    sampleRow2.map(escapeCSV).join(','),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'c_test_questions_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Converts parsed CSV rows into structured Question objects.
 */
export function parseCSVToQuestions(csvText: string): Question[] {
  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    throw new Error('The uploaded CSV file is empty or missing data rows.');
  }

  const headerRow = rows[0].map((h) => h.toLowerCase().trim().replace(/[\s-]/g, '_'));
  const questions: Question[] = [];

  const getCol = (row: string[], colName: string): string => {
    const idx = headerRow.indexOf(colName.toLowerCase());
    if (idx !== -1 && idx < row.length) {
      return (row[idx] || '').replace(/\\n/g, '\n');
    }
    return '';
  };

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0 || !row.some((cell) => cell.trim().length > 0)) continue;

    const title = getCol(row, 'question_title') || getCol(row, 'title') || `Custom Question ${r}`;
    const marks = parseInt(getCol(row, 'marks') || '10', 10) || 10;
    const rawDiff = (getCol(row, 'difficulty') || 'easy').toLowerCase();
    const difficulty: 'easy' | 'medium' | 'hard' =
      rawDiff === 'hard' ? 'hard' : rawDiff === 'medium' ? 'medium' : 'easy';
    const constraints = getCol(row, 'constraints') || '1 <= N <= 10^5';
    const description = getCol(row, 'description') || getCol(row, 'des') || 'Solve the given problem.';
    const inputFormat = getCol(row, 'input_format') || getCol(row, 'ip') || '';
    const outputFormat = getCol(row, 'output_format') || getCol(row, 'op') || '';
    const starterCode =
      getCol(row, 'template_code') ||
      getCol(row, 'starter_code') ||
      getCol(row, 'template') ||
      `#include <stdio.h>\n\nint main() {\n    // Write your code here\n    \n    return 0;\n}`;

    const testCases: TestCase[] = [];

    // 1. Parse up to 4 Sample Test Cases
    for (let s = 1; s <= 4; s++) {
      const input = getCol(row, `sample_${s}_input`) || getCol(row, `sample_testcase_${s}_input`) || getCol(row, `sample_case_${s}_input`);
      const expected = getCol(row, `sample_${s}_expected_output`) || getCol(row, `sample_${s}_output`) || getCol(row, `sample_testcase_${s}_output`);
      const tcMarks = parseInt(getCol(row, `sample_${s}_marks`) || '2', 10) || 2;

      if (expected.trim().length > 0 || input.trim().length > 0) {
        testCases.push({
          id: `tc-sample-${r}-${s}-${Math.random().toString(36).substring(2, 7)}`,
          question_id: '',
          input: input,
          expected_output: expected,
          is_sample: true,
          marks: tcMarks,
        });
      }
    }

    // 2. Parse up to 5 Hidden Test Cases
    for (let h = 1; h <= 5; h++) {
      const input = getCol(row, `hidden_${h}_input`) || getCol(row, `hidden_testcase_${h}_input`) || getCol(row, `hidden_case_${h}_input`);
      const expected = getCol(row, `hidden_${h}_expected_output`) || getCol(row, `hidden_${h}_output`) || getCol(row, `hidden_testcase_${h}_output`);
      const tcMarks = parseInt(getCol(row, `hidden_${h}_marks`) || '2', 10) || 2;

      if (expected.trim().length > 0 || input.trim().length > 0) {
        testCases.push({
          id: `tc-hidden-${r}-${h}-${Math.random().toString(36).substring(2, 7)}`,
          question_id: '',
          input: input,
          expected_output: expected,
          is_sample: false,
          marks: tcMarks,
        });
      }
    }

    // Fallback if no test cases provided in CSV
    if (testCases.length === 0) {
      testCases.push({
        id: `tc-sample-${r}-1`,
        question_id: '',
        input: '10',
        expected_output: '10',
        is_sample: true,
        marks: 5,
      });
      testCases.push({
        id: `tc-hidden-${r}-1`,
        question_id: '',
        input: '20',
        expected_output: '20',
        is_sample: false,
        marks: 5,
      });
    }

    const question: Question = {
      id: `q-csv-${r}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      test_id: '',
      title,
      description,
      difficulty,
      marks,
      input_format: inputFormat,
      output_format: outputFormat,
      constraints,
      starter_code: starterCode,
      time_limit_ms: 2000,
      memory_limit_mb: 64,
      question_order: r,
      test_cases: testCases,
    };

    questions.push(question);
  }

  return questions;
}