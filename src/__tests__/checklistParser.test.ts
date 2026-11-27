import { describe, it, expect } from 'vitest';
import {
  parseOnboardingChecklistFile,
  generateSampleOnboardingCsv,
  normalizeDepartment,
  normalizeTimeline,
  MAX_CHECKLIST_UPLOAD_BYTES,
  MAX_CHECKLIST_TASKS,
} from '../utils/checklistParser';

describe('checklistParser', () => {
  it('parses the generated sample CSV cleanly in a round-trip', () => {
    const csv = generateSampleOnboardingCsv();
    const parsed = parseOnboardingChecklistFile(csv, 'CGCC_New_Hire_SOP.csv');

    expect(parsed.title).toBe('CGCC New Hire SOP');
    expect(parsed.tasks.length).toBe(7);
    expect(parsed.tasks[0].department).toBe('IT');
    expect(parsed.tasks[0].timeline).toBe('Before Resumption');
    expect(parsed.tasks[1].department).toBe('PCCM');
    expect(parsed.tasks[2].department).toBe('Manager');
    expect(parsed.tasks[3].department).toBe('Finance');
    expect(parsed.tasks[4].department).toBe('Mentor');
    expect(parsed.warnings).toEqual([]);
  });

  it('parses CSV with quoted commas, escaped quotes, and custom column aliases', () => {
    const csv = [
      'Task Name,Owner,When,Notes',
      '"Collect ""Signed"" Offer, Bio-Data & NDA",HR Team,Day 1,"Required by PCCM, stored in dossier"',
      '"Configure Office 365 & VPN",ICT Department,Pre-boarding,"Provision before resumption"',
      '"30-Day Performance Check-In",Line Manager,30 Days,"Confirm early KPI deliverables"',
    ].join('\n');

    const parsed = parseOnboardingChecklistFile(csv, 'custom_hr_pack.csv');
    expect(parsed.tasks).toHaveLength(3);
    expect(parsed.tasks[0].title).toBe('Collect "Signed" Offer, Bio-Data & NDA');
    expect(parsed.tasks[0].department).toBe('PCCM');
    expect(parsed.tasks[0].timeline).toBe('Day 1');
    expect(parsed.tasks[1].department).toBe('IT');
    expect(parsed.tasks[1].timeline).toBe('Before Resumption');
    expect(parsed.tasks[2].department).toBe('Manager');
    expect(parsed.tasks[2].timeline).toBe('1st Month');
  });

  it('parses structured JSON checklist templates including metadata', () => {
    const payload = JSON.stringify({
      title: 'CGCC Pastoral Induction Pack',
      category: 'Pastoral & Ministry',
      targetAudience: 'Associate Pastors & Ministers',
      duration: '3 Months',
      description: 'Official ministry induction checklist',
      tasks: [
        { title: 'Doctrine & Vision Orientation', department: 'Manager', timeline: 'Day 1' },
        { title: 'Payroll & Pension Setup', department: 'Finance', timeline: 'Week 1' },
      ],
    });

    const parsed = parseOnboardingChecklistFile(payload, 'pastoral.json');
    expect(parsed.title).toBe('CGCC Pastoral Induction Pack');
    expect(parsed.category).toBe('Pastoral & Ministry');
    expect(parsed.targetAudience).toBe('Associate Pastors & Ministers');
    expect(parsed.duration).toBe('3 Months');
    expect(parsed.tasks).toHaveLength(2);
  });

  it('parses Markdown/plain-text checklists with pipe-delimited metadata', () => {
    const md = [
      '# CGCC Quick Checklist',
      '- [ ] Issue staff ID badge | PCCM | Day 1 | Security desk registration',
      '- [ ] Setup laptop & email | ICT | Before Resumption | Standard workstation',
      '1. Assign onboarding buddy | Mentor | Week 1 | Peer support',
    ].join('\n');

    const parsed = parseOnboardingChecklistFile(md, 'quick_checklist.md');
    expect(parsed.tasks).toHaveLength(3);
    expect(parsed.tasks[0].title).toBe('Issue staff ID badge');
    expect(parsed.tasks[0].department).toBe('PCCM');
    expect(parsed.tasks[1].department).toBe('IT');
    expect(parsed.tasks[1].timeline).toBe('Before Resumption');
    expect(parsed.tasks[2].department).toBe('Mentor');
  });

  it('sanitizes HTML angle brackets and control characters', () => {
    const csv = 'Title,Department,Timeline\n"<script>alert(1)</script>Setup Email",IT,Day 1';
    const parsed = parseOnboardingChecklistFile(csv, 'safe.csv');
    expect(parsed.tasks[0].title).not.toContain('<');
    expect(parsed.tasks[0].title).not.toContain('>');
    expect(parsed.tasks[0].title).toContain('Setup Email');
  });

  it('rejects empty files and files exceeding 1 MB', () => {
    expect(() => parseOnboardingChecklistFile('   ', 'empty.csv')).toThrow(/empty/i);
    expect(() =>
      parseOnboardingChecklistFile('Title\nTask 1', 'huge.csv', MAX_CHECKLIST_UPLOAD_BYTES + 1)
    ).toThrow(/1 MB/i);
  });

  it('caps uploaded tasks at MAX_CHECKLIST_TASKS and emits a warning', () => {
    const lines = ['Title,Department,Timeline'];
    for (let i = 1; i <= MAX_CHECKLIST_TASKS + 15; i += 1) {
      lines.push(`Induction Task ${i},PCCM,Week 1`);
    }
    const parsed = parseOnboardingChecklistFile(lines.join('\n'), 'many.csv');
    expect(parsed.tasks).toHaveLength(MAX_CHECKLIST_TASKS);
    expect(parsed.warnings.length).toBeGreaterThan(0);
  });

  it('normalizes department and timeline aliases consistently', () => {
    expect(normalizeDepartment('HOD / Line Manager')).toBe('Manager');
    expect(normalizeDepartment('ICT Systems')).toBe('IT');
    expect(normalizeDepartment('Accounts & Payroll')).toBe('Finance');
    expect(normalizeDepartment('Onboarding Buddy')).toBe('Mentor');
    expect(normalizeDepartment('Human Resources')).toBe('PCCM');

    expect(normalizeTimeline('Pre-resumption')).toBe('Before Resumption');
    expect(normalizeTimeline('14 days')).toBe('1st Two Weeks');
    expect(normalizeTimeline('2nd month')).toBe('60 Days');
    expect(normalizeTimeline('Probation review')).toBe('90 Days');
  });
});
