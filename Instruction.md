# WASM-Based C Coding Test Platform — Development Instructions

## 1. Project Overview

Build a lightweight online coding-test platform for approximately **25–30 students**.

The platform is intended for classroom use and must allow students to:

* Join a coding test using a test code
* View coding questions
* Write C code in a browser-based editor
* Run C code directly on their own computer
* See program output
* Submit solutions
* Automatically save submissions
* Work under a test timer

Teachers must be able to:

* Create tests
* Add coding questions
* Add sample and hidden test cases
* Generate a test/join code
* Monitor students
* View submissions
* View scores
* Export results

## 2. Critical Architecture Requirement

DO NOT use:

* Paid code-execution APIs
* Judge0 cloud API
* Any external paid compiler API
* Docker on the teacher's PC
* A central server for compiling student programs
* A server-side GCC installation
* A backend service that executes arbitrary student code

The C code must execute **inside the student's browser** using WebAssembly.

Architecture:

```text
                    SUPABASE
             ┌─────────────────────┐
             │ Authentication      │
             │ Tests               │
             │ Questions           │
             │ Test Cases          │
             │ Submissions         │
             │ Results             │
             └──────────┬──────────┘
                        │
              Internet / Network
                        │
       ┌────────────────┼────────────────┐
       ↓                ↓                ↓
  Student 1        Student 2        Student 30
  Browser          Browser          Browser
       │                │                │
       ↓                ↓                ↓
  C Compiler        C Compiler        C Compiler
    WASM               WASM              WASM
       │                │                │
       ↓                ↓                ↓
  Local execution  Local execution  Local execution
```

The backend should primarily store and retrieve data.

---

# 3. Recommended Technology Stack

## Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* Monaco Editor

## Backend

Use Supabase for:

* PostgreSQL database
* Authentication
* Row Level Security
* Realtime where useful

## C Execution

Use a **WebAssembly-based C compiler/runtime**.

The compiler must run inside the browser.

Possible implementation approaches should be evaluated during development:

1. Clang/GCC compiled to WebAssembly
2. Existing browser-compatible C compiler/runtime
3. WebAssembly-based toolchain such as a WASM build of Clang/LLVM

Do NOT assume a package is suitable simply because it is called a "WASM compiler".

Before implementation, verify that it can:

* Compile C
* Execute the resulting program
* Accept stdin
* Produce stdout
* Work in Chrome/Edge
* Run without a backend
* Work offline after the required WASM assets are loaded

---

# 4. Important Security Requirement

Student code is untrusted.

Never execute arbitrary C code directly using:

```text
eval()
child_process
exec()
spawn()
shell commands
server-side gcc
```

The browser-side WASM runtime must be isolated.

Implement:

* Execution timeout
* Memory limits where supported
* Output-size limits
* Infinite-loop protection
* Process termination
* No unrestricted filesystem access
* No network access from student programs

Example:

```text
Student Code
     ↓
WASM Compiler
     ↓
WASM Runtime
     ↓
Execution limits
     ↓
stdout/stderr
```

If the selected WASM runtime cannot safely terminate infinite loops or impose suitable resource limits, do not treat it as production-ready.

---

# 5. Project Structure

Use the following structure:

```text
coding-test-platform/
│
├── src/
│   ├── components/
│   │   ├── CodeEditor.tsx
│   │   ├── TestTimer.tsx
│   │   ├── QuestionPanel.tsx
│   │   ├── OutputPanel.tsx
│   │   ├── TestHeader.tsx
│   │   └── StudentList.tsx
│   │
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── TeacherDashboard.tsx
│   │   ├── CreateTest.tsx
│   │   ├── TestEditor.tsx
│   │   ├── JoinTest.tsx
│   │   ├── StudentTest.tsx
│   │   ├── Results.tsx
│   │   └── Submission.tsx
│   │
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── wasm/
│   │   │   ├── compiler.ts
│   │   │   ├── runner.ts
│   │   │   └── types.ts
│   │   └── judge/
│   │       ├── testRunner.ts
│   │       └── outputCompare.ts
│   │
│   ├── hooks/
│   │   ├── useTest.ts
│   │   ├── useTimer.ts
│   │   └── useCode.ts
│   │
│   ├── types/
│   │   └── database.ts
│   │
│   └── App.tsx
│
├── public/
│   └── wasm/
│
├── supabase/
│   └── migrations/
│
├── package.json
└── README.md
```

---

# 6. Database Design

Create the following tables.

## users/profiles

```sql
profiles
---------
id
name
email
role
roll_no
created_at
```

Role:

```text
teacher
student
```

---

## tests

```sql
tests
---------
id
title
description
join_code
duration_minutes
start_time
end_time
status
created_by
created_at
```

Status:

```text
draft
scheduled
live
ended
```

---

## questions

```sql
questions
---------
id
test_id
title
description
difficulty
marks
time_limit_ms
memory_limit_mb
question_order
created_at
```

Difficulty:

```text
easy
medium
hard
```

---

## test_cases

```sql
test_cases
---------
id
question_id
input
expected_output
is_sample
marks
created_at
```

Important:

`is_sample = true`

means the student can see the test case.

`is_sample = false`

means it is a hidden test case.

---

## test_attempts

```sql
test_attempts
---------
id
test_id
student_id
started_at
submitted_at
status
score
```

Status:

```text
in_progress
submitted
auto_submitted
```

---

## submissions

```sql
submissions
---------
id
attempt_id
question_id
student_id
code
language
status
score
submitted_at
execution_time
```

Status examples:

```text
accepted
wrong_answer
compile_error
runtime_error
time_limit
memory_limit
```

---

## submission_results

```sql
submission_results
---------
id
submission_id
test_case_id
status
actual_output
expected_output
execution_time
error_message
```

---

# 7. Student Test Flow

The complete student flow should be:

```text
Student opens platform
        ↓
Enter test code
        ↓
Enter name / roll number
        ↓
Join test
        ↓
Test instructions
        ↓
Start Test
        ↓
Timer starts
        ↓
Question 1
        ↓
Write C code
        ↓
Run Code
        ↓
Browser WASM compiler
        ↓
Program executes locally
        ↓
Show output
        ↓
Submit
        ↓
Run hidden test cases
        ↓
Calculate score
        ↓
Save result
```

---

# 8. Code Editor

Use Monaco Editor.

Default language:

```text
C
```

Default template:

```c
#include <stdio.h>

int main() {

    // Write your code here

    return 0;
}
```

Editor features:

* Syntax highlighting
* Line numbers
* Auto indentation
* Basic autocomplete
* Dark/light theme
* Code reset
* Copy/paste handling according to test settings

---

# 9. Run Code vs Submit

These must be separate operations.

## Run Code

Runs only visible/sample input.

Example:

```text
Input:
10

Expected:
Even
```

Student clicks:

```text
RUN CODE
```

The browser executes the program.

Output:

```text
Even
```

---

## Submit

Submission runs all hidden test cases.

Example:

```text
Visible Tests
    ↓
Student can see

Hidden Tests
    ↓
Student cannot see

          ↓

WASM execution

          ↓

Output comparison

          ↓

Score
```

Never send hidden expected outputs to the frontend before submission.

---

# 10. WASM Compiler Interface

Create an abstraction so the rest of the application does not depend directly on the compiler implementation.

Example:

```ts
export interface CompileResult {
    success: boolean;
    errors?: string;
    executable?: unknown;
}

export interface RunResult {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
    executionTime: number;
    timedOut: boolean;
}

export interface CCompiler {
    initialize(): Promise<void>;

    compile(
        code: string
    ): Promise<CompileResult>;

    run(
        executable: unknown,
        input: string,
        options?: {
            timeoutMs?: number;
            memoryLimitMb?: number;
            outputLimitKb?: number;
        }
    ): Promise<RunResult>;
}
```

This is important.

If the WASM compiler is changed later, the rest of the application should not need to be rewritten.

---

# 11. WASM Initialization

Do not initialize the compiler every time the student clicks Run.

Initialize it once.

```text
Student opens test
        ↓
Load WASM compiler
        ↓
Initialize
        ↓
Compiler Ready
        ↓
Student can Run Code
```

Show:

```text
Initializing C compiler...
```

Then:

```text
✓ C Compiler Ready
```

Store the initialized compiler instance in memory.

---

# 12. Loading WASM

WASM files should preferably be served from:

```text
/public/wasm/
```

Example:

```text
public/
└── wasm/
    ├── compiler.wasm
    ├── runtime.wasm
    └── supporting-assets/
```

Do not download the compiler from an unknown third-party URL every time Run Code is clicked.

Prefer bundling/versioning the required WASM assets with the application.

---

# 13. Execution Limits

Every execution must have limits.

Example configuration:

```ts
const EXECUTION_LIMITS = {
    timeoutMs: 2000,
    maxOutputBytes: 1024 * 100,
    memoryLimitMb: 64
};
```

For classroom tests, start with:

```text
CPU timeout: 2 seconds
Output: 100 KB
Memory: 64 MB where supported
```

These values should be configurable per question.

---

# 14. Infinite Loop Handling

Example student code:

```c
#include <stdio.h>

int main() {

    while(1) {
        printf("Hello");
    }

    return 0;
}
```

The platform must NOT freeze the browser.

Expected result:

```text
Time Limit Exceeded
```

The execution environment must terminate the program.

---

# 15. Output Comparison

Do not simply compare raw strings.

Normalize basic formatting.

Example:

Expected:

```text
10
20
30
```

Actual:

```text
10
20
30
```

Result:

```text
Accepted
```

Trailing spaces and final newline differences should normally not cause failure.

Implement:

```ts
function normalizeOutput(output: string): string {
    return output
        .replace(/\r\n/g, "\n")
        .trim();
}
```

For exact-output questions, use:

```text
normalize(actual) === normalize(expected)
```

Later, support special judges for floating-point problems.

---

# 16. Hidden Test Cases

Hidden test cases must not be exposed to students.

Do not load:

```text
expected_output
```

for hidden tests into the browser before submission.

For a fully client-side judge, recognize an important limitation:

> If hidden test cases and expected answers are sent to the student's browser, technically skilled students can inspect them.

Therefore, use hidden cases mainly as a classroom deterrent, not as a secure anti-cheating mechanism.

If stronger security is required later, a server-side judge will be necessary.

---

# 17. Test Timer

Timer must be based on server timestamps, not only browser time.

When student starts:

```text
started_at = server timestamp
```

Calculate:

```text
remaining =
test_end_time - current_server_adjusted_time
```

Do not trust:

```text
Date.now()
```

alone.

Students should not be able to extend the test by changing their computer clock.

---

# 18. Auto Save

Save code periodically.

Example:

```text
Every 5–10 seconds
        ↓
Save current code
        ↓
Supabase
```

Also save when:

* Student changes question
* Student clicks Run
* Student clicks Submit
* Browser/page visibility changes

Use debouncing so you don't create excessive database requests.

---

# 19. Submission Rules

When a student submits:

```text
Disable Submit button
        ↓
Compile
        ↓
Run test cases
        ↓
Calculate score
        ↓
Store submission
        ↓
Show result
```

Prevent accidental duplicate submissions.

---

# 20. Teacher Dashboard

Teacher should have:

```text
Dashboard
│
├── Create Test
├── Question Bank
├── Active Tests
├── Past Tests
└── Results
```

Active test view:

```text
C Loops & Arrays Test

Students: 28 / 30

Student        Status          Score
-------------------------------------
Rahul          In Progress     -
Aman           Submitted       42
Priya          In Progress     -
Simran         Submitted       48
```

---

# 21. Question Creation

Teacher should be able to enter:

```text
Question Title

Description

Input Format

Output Format

Constraints

Starter Code

Difficulty

Marks

Time Limit

Sample Test Cases

Hidden Test Cases
```

Example:

```text
Title:
Check Even or Odd

Description:
Write a C program to determine whether
a given integer is even or odd.

Input:
One integer N.

Output:
Print "Even" if N is even,
otherwise print "Odd".

Marks:
5

Difficulty:
Easy
```

---

# 22. Question Bank

Create reusable questions.

Example:

```text
C Basics
├── Hello World
├── Sum of Two Numbers
├── Even or Odd
└── Largest of Three

Loops
├── Factorial
├── Prime Number
├── Fibonacci
└── Palindrome

Arrays
├── Maximum Element
├── Minimum Element
├── Second Largest
├── Reverse Array
└── Array Rotation
```

Teacher can select questions when creating a test.

---

# 23. Student Identification

For classroom use, don't require complicated registration.

Recommended:

```text
Test Code
Name
Roll Number
```

Example:

```text
Test Code: C2026A

Name: Rahul Sharma
Roll No: 23

[ JOIN TEST ]
```

If authentication is required, use Supabase Auth.

---

# 24. Anti-Cheating Features

Implement basic classroom controls:

* Full-screen mode
* Detect tab switching
* Detect visibility changes
* Disable right-click optionally
* Randomize question order
* Randomize test case order
* Auto-submit on timeout
* Track suspicious events

Store:

```text
test_events
-----------
id
attempt_id
event_type
timestamp
metadata
```

Example events:

```text
TAB_SWITCH
FULLSCREEN_EXIT
TEST_SUBMITTED
TIMEOUT
```

Do not claim these features can completely prevent cheating.

---

# 25. Realtime Monitoring

Use Supabase Realtime for:

```text
Student joined
Student started
Student submitted
Student finished
```

Teacher dashboard can update automatically.

Example:

```text
Students Online: 27

● 24 Active
● 2 Submitted
● 1 Disconnected
```

---

# 26. Results

After the test:

```text
Student
-----------
Score: 42/50
Percentage: 84%

Q1  ✓  5/5
Q2  ✓  5/5
Q3  ✗  0/10
Q4  ✓  10/10
Q5  ✓  10/10
Q6  ✓  12/20
```

Teacher:

```text
Class Average: 71%

Question Performance

Question       Success Rate
----------------------------
Even/Odd          96%
Prime             88%
Palindrome        79%
Array Sum         72%
Second Largest    48%
```

This allows the teacher to identify topics that need more teaching.

---

# 27. Export

Allow teacher to export:

```text
CSV
```

Columns:

```text
Roll No
Name
Test
Score
Percentage
Q1
Q2
Q3
Q4
Q5
Submitted At
```

---

# 28. Supabase Security

Enable Row Level Security.

Students should NOT be able to:

* Modify questions
* Modify marks
* Modify test cases
* Modify other students' submissions
* Modify scores

Teachers should be able to manage their own tests.

Never put the Supabase service-role key in the frontend.

Only use the public/anon key in the browser with proper RLS.

---

# 29. Important Limitation of Fully Client-Side Judging

Understand this before building.

If:

```text
Question
+
Hidden Input
+
Expected Output
```

are all delivered to the browser, a student can potentially inspect them.

Therefore:

```text
Client-side judging
=
Excellent for lightweight classroom use

NOT
=
High-security competitive programming judge
```

For 25–30 trusted classroom students, this architecture is appropriate.

If the platform later needs serious competitive-exam security, move judging to an isolated server.

---

# 30. Development Phases

## Phase 1 — UI

Build:

* Teacher login
* Student join page
* Test page
* Question panel
* Monaco editor
* Timer
* Output panel

Do not implement judging yet.

---

## Phase 2 — Supabase

Implement:

* Profiles
* Tests
* Questions
* Test cases
* Attempts
* Submissions

Test with dummy data.

---

## Phase 3 — WASM Compiler

Before connecting it to the entire application, create a separate page:

```text
WASM C Compiler Test

[ C Code Editor ]

[ RUN ]

Output:
Hello World
```

Test:

### Test 1

```c
#include <stdio.h>

int main() {
    printf("Hello World");
    return 0;
}
```

Expected:

```text
Hello World
```

### Test 2

```c
#include <stdio.h>

int main() {
    int a, b;
    scanf("%d %d", &a, &b);
    printf("%d", a + b);
    return 0;
}
```

Input:

```text
10 20
```

Expected:

```text
30
```

### Test 3 — Compile Error

```c
#include <stdio.h>

int main() {
    printf("Hello")
    return 0;
}
```

Expected:

```text
Compilation Error
```

### Test 4 — Infinite Loop

```c
#include <stdio.h>

int main() {
    while(1) {}
    return 0;
}
```

Expected:

```text
Time Limit Exceeded
```

Do not continue until these tests work reliably.

---

# 31. Phase 4 — Automatic Judging

Implement:

```text
Run sample test
        ↓
Compile
        ↓
Execute
        ↓
Capture stdout
        ↓
Compare output
```

Then:

```text
Submit
   ↓
Compile
   ↓
Run hidden tests
   ↓
Calculate score
   ↓
Save submission
```

---

# 32. Phase 5 — Teacher Dashboard

Implement:

* Create test
* Add questions
* Add test cases
* Generate join code
* Start test
* Monitor students
* End test
* View results
* Export CSV

---

# 33. Phase 6 — Classroom Testing

Test with:

```text
1 student
        ↓
5 students
        ↓
10 students
        ↓
30 students
```

Measure:

* WASM loading time
* Browser RAM
* CPU usage
* Compilation time
* Execution time
* Supabase requests
* Network usage

Only after this should the platform be used for an actual test.

---

# 34. Performance Requirements

The platform should not require your teacher PC to stay powerful.

Target:

```text
Teacher PC:
Browser + dashboard only

Student PC:
Browser + WASM compiler

Supabase:
Database/auth/realtime
```

The teacher's computer should NOT compile student programs.

---

# 35. MVP Feature List

The first usable release must contain only:

### Teacher

* Login
* Create test
* Add questions
* Add test cases
* Generate test code
* Start/end test
* View submissions
* View scores

### Student

* Join test
* View questions
* C editor
* Run code
* View output
* Submit
* Timer
* Auto-save

### System

* WASM C execution
* Sample test cases
* Hidden test cases
* Automatic scoring
* Supabase storage

Do not add unnecessary features before this works.

---

# 36. Definition of Done

The MVP is complete when:

1. Teacher can create a test.
2. Teacher can add a C question.
3. Teacher can add sample and hidden test cases.
4. Student can join using a test code.
5. Student gets a timer.
6. Student can write C code.
7. C code compiles in the student's browser.
8. Student can provide input.
9. Program executes locally through WASM.
10. Output is displayed.
11. Compile errors are displayed.
12. Infinite loops are terminated.
13. Student can submit.
14. Hidden tests are evaluated.
15. Score is calculated.
16. Submission is saved in Supabase.
17. Teacher can see results.
18. 25–30 students can use the platform without requiring the teacher's PC to compile their code.
19. No paid API is required.
20. No server-side arbitrary code execution is required.

---

# 37. Core Principle

Keep the architecture simple:

```text
             SUPABASE
        Data + Authentication
                 │
                 │
        ┌────────┴────────┐
        │                 │
     Teacher           Students
     Browser            Browsers
        │                 │
        │             WASM C Compiler
        │                 │
        │             Local Execution
        │                 │
        └────── Results ──┘
```

The platform is a **classroom coding-test system**, not a full HackerRank replacement.

Optimize for:

* Zero/near-zero cost
* Low server requirements
* 25–30 simultaneous users
* C programming
* Simple teacher workflow
* Fast classroom testing
* Student-side execution
* Easy future expansion
