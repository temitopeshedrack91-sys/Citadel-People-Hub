import type {
  OnboardingTask,
  OnboardingDepartment,
  OnboardingTimeline,
} from '../types';

export interface ParsedChecklistUpload {
  title?: string;
  category?: 'General' | 'ICT & Systems' | 'Legal & Corporate' | 'Pastoral & Ministry' | 'Operations & Facilities';
  targetAudience?: string;
  duration?: string;
  description?: string;
  tasks: OnboardingTask[];
  warnings: string[];
}

export const MAX_CHECKLIST_UPLOAD_BYTES = 1024 * 1024; // 1 MB
export const MAX_CHECKLIST_TASKS = 200;

const VALID_DEPARTMENTS: OnboardingDepartment[] = ['Manager', 'PCCM', 'IT', 'Finance', 'Mentor'];

const VALID_TIMELINES: OnboardingTimeline[] = [
  'Before Resumption',
  'Day 1',
  'Day 2',
  'Week 1',
  '1st Two Weeks',
  '1st Three Weeks',
  '1st Month',
  '60 Days',
  '90 Days',
  'Post-3-Months',
];

function sanitizeText(value: unknown, maxLength = 240): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

export function normalizeDepartment(raw?: string): OnboardingDepartment {
  const lower = (raw || '').trim().toLowerCase();
  if (!lower) return 'PCCM';
  if (lower.includes('manager') || lower.includes('hod') || lower.includes('supervisor') || lower.includes('line')) {
    return 'Manager';
  }
  if (lower.includes('it') || lower.includes('ict') || lower.includes('tech') || lower.includes('system')) {
    return 'IT';
  }
  if (lower.includes('fin') || lower.includes('account') || lower.includes('payroll')) {
    return 'Finance';
  }
  if (lower.includes('mentor') || lower.includes('buddy') || lower.includes('coach')) {
    return 'Mentor';
  }
  const exact = VALID_DEPARTMENTS.find((d) => d.toLowerCase() === lower);
  return exact || 'PCCM';
}

export function normalizeTimeline(raw?: string): OnboardingTimeline {
  const lower = (raw || '').trim().toLowerCase();
  if (!lower) return 'Week 1';
  const exact = VALID_TIMELINES.find((t) => t.toLowerCase() === lower);
  if (exact) return exact;
  if (lower.includes('before') || lower.includes('pre')) return 'Before Resumption';
  if (lower.includes('day 1') || lower.includes('first day') || lower === '1') return 'Day 1';
  if (lower.includes('day 2') || lower.includes('second day')) return 'Day 2';
  if (lower.includes('two week') || lower.includes('2 week') || lower.includes('14 day')) return '1st Two Weeks';
  if (lower.includes('three week') || lower.includes('3 week') || lower.includes('21 day')) return '1st Three Weeks';
  if (lower.includes('week 1') || lower.includes('first week') || lower.includes('7 day')) return 'Week 1';
  if (lower.includes('60') || lower.includes('month 2') || lower.includes('2nd month')) return '60 Days';
  if (lower.includes('90') || lower.includes('month 3') || lower.includes('3rd month') || lower.includes('probation')) {
    return '90 Days';
  }
  if (lower.includes('post') || lower.includes('after')) return 'Post-3-Months';
  if (lower.includes('month') || lower.includes('30')) return '1st Month';
  return 'Week 1';
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseCsvOrTsv(content: string, filename: string): ParsedChecklistUpload {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    throw new Error('The uploaded checklist file is empty.');
  }

  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const firstRow = parseDelimitedLine(lines[0], delimiter);
  const firstRowLower = firstRow.map((cell) => cell.toLowerCase());

  const hasHeader = firstRowLower.some(
    (cell) =>
      cell.includes('title') ||
      cell.includes('task') ||
      cell.includes('item') ||
      cell.includes('activity') ||
      cell.includes('department') ||
      cell.includes('owner') ||
      cell.includes('timeline')
  );

  let titleIdx = 0;
  let deptIdx = 1;
  let timelineIdx = 2;
  let roleIdx = 3;
  let descIdx = 4;

  if (hasHeader) {
    const findIdx = (patterns: string[]) =>
      firstRowLower.findIndex((h) => patterns.some((p) => h.includes(p)));

    const foundTitle = findIdx(['title', 'task', 'item', 'activity', 'checklist']);
    const foundDept = findIdx(['department', 'team', 'stakeholder', 'unit', 'owner']);
    const foundTimeline = findIdx(['timeline', 'due', 'milestone', 'when', 'day', 'week']);
    const foundRole = findIdx(['role', 'assignee', 'responsible']);
    const foundDesc = findIdx(['desc', 'note', 'detail', 'document', 'instruction']);

    if (foundTitle >= 0) titleIdx = foundTitle;
    if (foundDept >= 0) deptIdx = foundDept;
    if (foundTimeline >= 0) timelineIdx = foundTimeline;
    roleIdx = foundRole;
    descIdx = foundDesc;
  }

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const warnings: string[] = [];
  const tasks: OnboardingTask[] = [];

  for (let i = 0; i < dataLines.length; i += 1) {
    if (tasks.length >= MAX_CHECKLIST_TASKS) {
      warnings.push(`Checklist capped at ${MAX_CHECKLIST_TASKS} tasks.`);
      break;
    }
    const cols = parseDelimitedLine(dataLines[i], delimiter);
    const title = sanitizeText(cols[titleIdx], 180);
    if (!title) continue;

    const department = normalizeDepartment(cols[deptIdx]);
    const timeline = normalizeTimeline(cols[timelineIdx]);
    const assignedRole = roleIdx >= 0 ? sanitizeText(cols[roleIdx], 100) : '';
    const description = descIdx >= 0 ? sanitizeText(cols[descIdx], 300) : '';

    tasks.push({
      id: `upload-task-${Date.now()}-${tasks.length + 1}`,
      title,
      department,
      timeline,
      assignedRole: assignedRole || undefined,
      description: description || undefined,
      order: tasks.length + 1,
    });
  }

  if (tasks.length === 0) {
    throw new Error('No valid checklist tasks were found in the uploaded file.');
  }

  const cleanBaseName = sanitizeText(filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '), 120);
  return {
    title: cleanBaseName || 'Uploaded HR Onboarding Checklist',
    tasks,
    warnings,
  };
}

function parseJsonChecklist(content: string, filename: string): ParsedChecklistUpload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Invalid JSON checklist file. Please check the file syntax.');
  }

  const warnings: string[] = [];
  let rawTasks: unknown[] = [];
  let meta: Record<string, unknown> = {};

  if (Array.isArray(parsed)) {
    rawTasks = parsed;
  } else if (parsed && typeof parsed === 'object') {
    meta = parsed as Record<string, unknown>;
    if (Array.isArray(meta.tasks)) {
      rawTasks = meta.tasks;
    } else if (Array.isArray(meta.items)) {
      rawTasks = meta.items;
    }
  }

  if (rawTasks.length === 0) {
    throw new Error('JSON file must contain an array of tasks or a { "tasks": [...] } object.');
  }

  const tasks: OnboardingTask[] = [];
  for (const item of rawTasks) {
    if (tasks.length >= MAX_CHECKLIST_TASKS) {
      warnings.push(`Checklist capped at ${MAX_CHECKLIST_TASKS} tasks.`);
      break;
    }
    if (typeof item === 'string') {
      const title = sanitizeText(item, 180);
      if (title) {
        tasks.push({
          id: `upload-task-${Date.now()}-${tasks.length + 1}`,
          title,
          department: 'PCCM',
          timeline: 'Week 1',
          order: tasks.length + 1,
        });
      }
      continue;
    }
    if (item && typeof item === 'object') {
      const rec = item as Record<string, unknown>;
      const title = sanitizeText(rec.title ?? rec.task ?? rec.name, 180);
      if (!title) continue;
      tasks.push({
        id: `upload-task-${Date.now()}-${tasks.length + 1}`,
        title,
        department: normalizeDepartment(String(rec.department ?? rec.team ?? rec.owner ?? '')),
        timeline: normalizeTimeline(String(rec.timeline ?? rec.due ?? rec.milestone ?? '')),
        assignedRole: sanitizeText(rec.assignedRole ?? rec.role, 100) || undefined,
        description: sanitizeText(rec.description ?? rec.notes, 300) || undefined,
        order: tasks.length + 1,
      });
    }
  }

  if (tasks.length === 0) {
    throw new Error('No valid tasks were found inside the JSON file.');
  }

  const cleanBaseName = sanitizeText(filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '), 120);
  const validCategories = [
    'General',
    'ICT & Systems',
    'Legal & Corporate',
    'Pastoral & Ministry',
    'Operations & Facilities',
  ] as const;
  const rawCategory = sanitizeText(meta.category, 60);
  const matchedCategory = validCategories.find((c) => c.toLowerCase() === rawCategory.toLowerCase());

  return {
    title: sanitizeText(meta.title, 120) || cleanBaseName || 'Uploaded HR Onboarding Checklist',
    category: matchedCategory,
    targetAudience: sanitizeText(meta.targetAudience, 120) || undefined,
    duration: sanitizeText(meta.duration, 60) || undefined,
    description: sanitizeText(meta.description, 300) || undefined,
    tasks,
    warnings,
  };
}

function parsePlainTextChecklist(content: string, filename: string): ParsedChecklistUpload {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  if (lines.length === 0) {
    throw new Error('The uploaded text checklist file has no task lines.');
  }

  const warnings: string[] = [];
  const tasks: OnboardingTask[] = [];

  for (const line of lines) {
    if (tasks.length >= MAX_CHECKLIST_TASKS) {
      warnings.push(`Checklist capped at ${MAX_CHECKLIST_TASKS} tasks.`);
      break;
    }

    const cleaned = line
      .replace(/^[-*•]\s*(\[[ xX]\]\s*)?/, '')
      .replace(/^\d+[.)]\s*/, '')
      .trim();

    if (!cleaned) continue;

    // Optional pipe syntax: "Task title | Department | Timeline | Description"
    const parts = cleaned.split('|').map((p) => p.trim());
    const title = sanitizeText(parts[0], 180);
    if (!title) continue;

    tasks.push({
      id: `upload-task-${Date.now()}-${tasks.length + 1}`,
      title,
      department: normalizeDepartment(parts[1]),
      timeline: normalizeTimeline(parts[2]),
      description: sanitizeText(parts[3], 300) || undefined,
      order: tasks.length + 1,
    });
  }

  if (tasks.length === 0) {
    throw new Error('No valid checklist tasks were found in the uploaded text file.');
  }

  const cleanBaseName = sanitizeText(filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '), 120);
  return {
    title: cleanBaseName || 'Uploaded HR Onboarding Checklist',
    tasks,
    warnings,
  };
}

export function parseOnboardingChecklistFile(
  content: string,
  filename: string,
  byteSize?: number
): ParsedChecklistUpload {
  if (typeof byteSize === 'number' && byteSize > MAX_CHECKLIST_UPLOAD_BYTES) {
    throw new Error('Checklist file exceeds the 1 MB limit. Please upload a smaller file.');
  }

  const trimmed = (content || '').replace(/^\uFEFF/, '').trim();
  if (!trimmed) {
    throw new Error('The uploaded file is empty.');
  }

  const ext = (filename.split('.').pop() || '').toLowerCase();

  if (ext === 'json' || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return parseJsonChecklist(trimmed, filename);
  }

  if (ext === 'csv' || ext === 'tsv') {
    return parseCsvOrTsv(trimmed, filename);
  }

  // Heuristic: if plain text contains commas with a recognizable header row, parse as CSV
  const firstLine = trimmed.split(/\r?\n/)[0]?.toLowerCase() || '';
  if (firstLine.includes(',') && (firstLine.includes('task') || firstLine.includes('title') || firstLine.includes('department'))) {
    return parseCsvOrTsv(trimmed, filename);
  }

  return parsePlainTextChecklist(trimmed, filename);
}

export function generateSampleOnboardingCsv(): string {
  const rows = [
    ['Title', 'Department', 'Timeline', 'Assigned Role', 'Description'],
    ['Prepare workstation, official email & Microsoft 365 credentials', 'IT', 'Before Resumption', 'ICT Lead', 'Provision laptop, corporate email, and intranet login prior to Day 1'],
    ['Issue signed offer letter, Employee Handbook & NDA forms', 'PCCM', 'Before Resumption', 'HR Officer', 'Verify credentials, guarantor forms, and statutory bio-data dossier'],
    ['Welcome briefing & CGCC campus tour with department lead', 'Manager', 'Day 1', 'Line Manager', 'Introduce team members, reporting lines, and department workspace'],
    ['Setup payroll bank account, pension RSA & HMO enrollment', 'Finance', 'Week 1', 'Payroll Officer', 'Confirm bank details, PFA PIN, and medical cover registration'],
    ['Assign peer mentor & review 30/60/90-day KPI goals', 'Mentor', '1st Two Weeks', 'Assigned Buddy', 'Walk through CGCC SOPs and confirm probation performance targets'],
    ['Conduct 30-day progress & integration check-in', 'Manager', '1st Month', 'Line Manager', 'Review early deliverables and address onboarding blockers'],
    ['Complete 90-day probation confirmation assessment', 'PCCM', '90 Days', 'HR Manager', 'Compile line manager recommendation for permanent confirmation'],
  ];

  return rows
    .map((cols) => cols.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))
    .join('\n');
}
