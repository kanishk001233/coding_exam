import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Test, TestAttempt } from '../types/database';
import { mockDb } from './mockDb';

/**
 * Generates an aesthetic, publication-ready PDF assessment report for a test.
 * Features:
 * 1. Executive Summary & Test Metrics (Class Average, Total Attempts, Integrity Flags)
 * 2. Classroom Score Table (UID, Name, Scores, Anti-cheat flags, Submission Time)
 * 3. Detailed Individual Student Responses (Each question, status, test cases passed, code block)
 */
export function generateTestPDFReport(test: Test, attempts: TestAttempt[]) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const questions = test.questions || [];
  const maxPossibleMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  const submittedAttempts = attempts.filter((a) => a.status === 'submitted' || a.status === 'auto_submitted');
  const avgScore = submittedAttempts.length > 0
    ? Math.round(submittedAttempts.reduce((sum, a) => sum + a.score, 0) / submittedAttempts.length)
    : 0;
  const avgPct = maxPossibleMarks > 0 ? Math.round((avgScore / maxPossibleMarks) * 100) : 0;
  const totalFlags = attempts.reduce((sum, a) => sum + (a.tab_switch_count || 0) + (a.fullscreen_exit_count || 0), 0);

  // -------------------------------------------------------------
  // HEADER BANNER
  // -------------------------------------------------------------
  doc.setFillColor(30, 41, 59); // Slate 800 dark banner
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Decorative Indigo stripe
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.rect(0, 38, pageWidth, 2.5, 'F');

  // Title & Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(test.title || 'C Examination Report', margin, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(`Join Code: ${test.join_code}  |  Duration: ${test.duration_minutes} Mins  |  Total Questions: ${questions.length}  |  Total Marks: ${maxPossibleMarks}`, margin, 24);
  doc.text(`Generated On: ${new Date().toLocaleString()}  |  Evaluation Engine: Sandboxed WebAssembly C Compiler`, margin, 31);

  // -------------------------------------------------------------
  // 1. EXECUTIVE SUMMARY KPI CARDS
  // -------------------------------------------------------------
  let currentY = 47;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text('1. Executive Performance Summary', margin, currentY);
  currentY += 5;

  const cardWidth = (pageWidth - margin * 2 - 9) / 4;
  const cardHeight = 22;

  const kpis = [
    { label: 'TOTAL STUDENTS', value: `${attempts.length}`, sub: `${submittedAttempts.length} Submitted`, color: [79, 70, 229] },
    { label: 'CLASS AVERAGE', value: `${avgScore} / ${maxPossibleMarks}`, sub: `${avgPct}% Average Score`, color: [16, 185, 129] },
    { label: 'COMPLETION RATE', value: `${attempts.length > 0 ? Math.round((submittedAttempts.length / attempts.length) * 100) : 0}%`, sub: `${attempts.length - submittedAttempts.length} In Progress`, color: [14, 165, 233] },
    { label: 'INTEGRITY FLAGS', value: `${totalFlags}`, sub: 'Tab / Blur Violations', color: [244, 63, 94] },
  ];

  kpis.forEach((kpi, idx) => {
    const x = margin + idx * (cardWidth + 3);
    
    // Card background
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.roundedRect(x, currentY, cardWidth, cardHeight, 2, 2, 'FD');

    // Colored Accent bar
    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.rect(x, currentY, 2, cardHeight, 'F');

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 4.5, currentY + 6);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, x + 4.5, currentY + 13);

    // Subtext
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(kpi.sub, x + 4.5, currentY + 18.5);
  });

  currentY += cardHeight + 8;

  // -------------------------------------------------------------
  // 2. STUDENT SCORES & SUBMISSIONS SUMMARY TABLE
  // -------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Student Scores & Submissions Master Table', margin, currentY);
  currentY += 4;

  const tableHeaders = [
    '#',
    'UID',
    'Student Name',
    'Status',
    'Score',
    '%',
    ...questions.map((_, i) => `Q${i + 1}`),
    'Flags',
    'Submitted Time',
  ];

  const tableRows = attempts.map((att, idx) => {
    const latestSubs = mockDb.getLatestSubmissions(att.id);
    const qScores = questions.map((q) => {
      const sub = latestSubs.find((s) => s.question_id === q.id);
      return sub ? `${sub.score}` : '-';
    });

    const isSub = att.status === 'submitted' || att.status === 'auto_submitted';
    const pct = maxPossibleMarks > 0 ? `${Math.round((att.score / maxPossibleMarks) * 100)}%` : '0%';
    const flags = (att.tab_switch_count || 0) + (att.fullscreen_exit_count || 0);

    return [
      `${idx + 1}`,
      att.student_roll_no || 'N/A',
      att.student_name || 'N/A',
      isSub ? 'Submitted' : 'In Progress',
      `${att.score} / ${maxPossibleMarks}`,
      isSub ? pct : '-',
      ...qScores,
      `${flags}`,
      att.submitted_at ? new Date(att.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'In Exam',
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [tableHeaders],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: 'helvetica',
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { fontStyle: 'bold' },
      4: { fontStyle: 'bold', halign: 'center' },
      5: { halign: 'center' },
    },
  });

  // -------------------------------------------------------------
  // 3. INDIVIDUAL RESPONSES & CODE SNAPSHOTS
  // -------------------------------------------------------------
  attempts.forEach((att, attIdx) => {
    doc.addPage();
    let yPos = 18;

    // Student Header Box
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 22, 2, 2, 'FD');

    doc.setFillColor(79, 70, 229);
    doc.rect(margin, yPos, 3, 22, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`Student Response Report #${attIdx + 1}: ${att.student_name}`, margin + 6, yPos + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `UID: ${att.student_roll_no}   |   Status: ${att.status.toUpperCase()}   |   Total Score: ${att.score} / ${maxPossibleMarks} pts (${maxPossibleMarks > 0 ? Math.round((att.score / maxPossibleMarks) * 100) : 0}%)   |   Anti-Cheat Flags: ${att.tab_switch_count || 0}`,
      margin + 6,
      yPos + 16
    );

    yPos += 30;

    const latestSubs = mockDb.getLatestSubmissions(att.id);

    questions.forEach((q, qIdx) => {
      const sub = latestSubs.find((s) => s.question_id === q.id);

      // Check if page overflow
      if (yPos > pageHeight - 65) {
        doc.addPage();
        yPos = 18;
      }

      // Question Title Header
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, yPos, pageWidth - margin * 2, 8, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`Q${qIdx + 1}: ${q.title}`, margin + 3, yPos + 5.5);

      const statusText = sub ? `Score: ${sub.score}/${q.marks} pts  (${sub.status.toUpperCase()})` : 'Not Attempted (0 pts)';
      const statusColor = sub?.status === 'accepted' ? [16, 185, 129] : sub ? [239, 68, 68] : [148, 163, 184];
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.text(statusText, pageWidth - margin - 3, yPos + 5.5, { align: 'right' });

      yPos += 11;

      // Test Case Breakdown Table (if results exist)
      if (sub && sub.results && sub.results.length > 0) {
        const tcRows = sub.results.map((r, rIdx) => [
          `#${rIdx + 1} (${r.is_sample ? 'Sample' : 'Hidden'})`,
          r.status.toUpperCase(),
          `${r.execution_time}ms`,
          `${r.marks_awarded}/${r.max_marks} pts`,
          (r.error_message || r.actual_output || '').slice(0, 45).replace(/\n/g, ' ') || 'None',
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Case', 'Verdict', 'Time', 'Marks', 'Output / Error']],
          body: tcRows,
          theme: 'plain',
          styles: { fontSize: 7, cellPadding: 1.2, font: 'helvetica' },
          headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' },
          margin: { left: margin, right: margin },
        });

        yPos = (doc as any).lastAutoTable.finalY + 4;
      }

      // Code Snippet Box
      if (sub && sub.code) {
        if (yPos > pageHeight - 45) {
          doc.addPage();
          yPos = 18;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text('SUBMITTED SOURCE CODE (C99):', margin, yPos);
        yPos += 3;

        const codeLines = doc.splitTextToSize(sub.code, pageWidth - margin * 2 - 6);
        const codeBoxHeight = Math.min(codeLines.length * 3.2 + 6, 60);

        doc.setFillColor(15, 23, 42); // Dark terminal background
        doc.roundedRect(margin, yPos, pageWidth - margin * 2, codeBoxHeight, 1.5, 1.5, 'F');

        doc.setFont('courier', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(226, 232, 240);
        
        // Print lines that fit within box
        const maxLines = Math.floor((codeBoxHeight - 6) / 3.2);
        const visibleLines = codeLines.slice(0, maxLines);
        if (codeLines.length > maxLines) {
          visibleLines[visibleLines.length - 1] = '// ... (code truncated for PDF preview)';
        }

        doc.text(visibleLines, margin + 3, yPos + 5);
        yPos += codeBoxHeight + 8;
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text('No code submission recorded for this question.', margin, yPos + 3);
        yPos += 8;
      }
    });
  });

  // -------------------------------------------------------------
  // FOOTER ON ALL PAGES
  // -------------------------------------------------------------
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Confidential Assessment Report • ${test.title} • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  // Trigger download
  const cleanFilename = `${test.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Class_Results_Report.pdf`;
  doc.save(cleanFilename);
}
