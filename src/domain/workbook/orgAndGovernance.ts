/**
 * Citadel People Hub — Organization Structure, Scope, Roles & Governance Engine
 *
 * Covers Workbook Sheets:
 * - Sheet 1: Start Here (priorities & no-credentials safety rule)
 * - Sheet 2: Project Scope (central HRIS, Oct 4 2026 launch, 3 user groups)
 * - Sheet 3: Org Structure (3 entities, 15 departments, 5 Business Heads, GEC Shared Services)
 * - Sheet 4: Roles & Permissions (5 roles, entity/department/self scoping, approval gates)
 * - Sheet 21: Security & Compliance Controls
 * - Sheet 23: V1 Launch Priorities (October 4, 2026)
 * - Sheet 24: Future Roadmap
 * - Cross-sheet Ambiguities, Contradictions & Blank-Sheet Register
 */

import type {
  EntityShortCode,
  FutureRoadmapSpec,
  GovernanceAction,
  GovernanceDecision,
  OrgDepartmentSpec,
  OrgEntitySpec,
  ProjectScopeSpec,
  RoleGovernanceSpec,
  SecurityControlSpec,
  V1PrioritySpec,
  WorkbookAmbiguityFlag,
  WorkbookRole,
} from './types';

// ============================================================================
// SHEET 2: PROJECT SCOPE
// ============================================================================

export const WORKBOOK_PROJECT_SCOPE: ProjectScopeSpec = {
  primaryObjective:
    'Have all HR protocols, processes, and employee information in one central HRIS hold.',
  expectedOutcomes: [
    'A fully integrated end-to-end employee life-cycle management system',
    'Easy to use for HR, leadership, and staff',
    'Efficient employee self-service',
    'Proper work and approval flows',
    'Attractive, production-grade user interface',
  ],
  userGroups: [
    'The Citadel Global Community Church (CGCC)',
    'The Citadel Holdings',
    'The Citadel School of Government (CSOG)',
  ],
  targetLaunchDate: '2026-10-04',
  v1Included: [
    'Organization Structure & GEC Reporting Hierarchy (Sheet 3)',
    'Role-Based Permissions & HR Approval Gates (Sheet 4)',
    'Employee Master Data — 24 Mandatory Sensitive Fields & Staged Change Approvals (Sheet 5)',
    'Leave Management — 6 Policy Types, Eligibility & Routing (Sheet 7)',
    'Attendance — 5 Entity/Unit Shifts, 10-Min Grace Period & Biometric Compliance (Sheet 8)',
    'Recruitment 10-Stage Workflow & 2-Stage Interviews (Sheets 9–11)',
    'Onboarding, Lifecycle, Offboarding & HR Documents (Sheets 12–16)',
    'Notifications, Reports & CSV Export, Security & Legacy Bio-Data Migration Validator (Sheets 6, 17, 20–22)',
  ],
  v1Excluded: [
    'Live Microsoft 365 Entra ID / Exchange / SharePoint OAuth provisioning (pending tenant configuration on Sheet 18)',
    'Phase 2 employee self-service fields (Years of Service automation, Qualifications, Certifications) where deferred by HR',
    'Autonomous AI decision-making (AI remains human-approval-gated per Sheet 19)',
  ],
  successMetric: 'Functionality of the portal across CGCC, Citadel Holdings, and CSOG',
};

// ============================================================================
// SHEET 3: ORGANIZATION STRUCTURE (3 ENTITIES, 15 DEPARTMENTS, 5 BUSINESS HEADS)
// ============================================================================

export const WORKBOOK_ENTITIES: OrgEntitySpec[] = [
  {
    id: 'entity-cgcc',
    shortCode: 'CGCC',
    name: 'Citadel Global Community Church (CGCC)',
    businessHeads: ['Pastor Christian Ike', 'Pastor Biola Adeyoola', 'Pastor Segun Bakare'],
    allBusinessHeadsInGec: true,
  },
  {
    id: 'entity-csog',
    shortCode: 'CSOG',
    name: 'Citadel School of Government',
    businessHeads: ['Mr. Omoaholo Omoakhalen'],
    allBusinessHeadsInGec: true,
  },
  {
    id: 'entity-holdings',
    shortCode: 'HOLDINGS',
    name: 'Citadel Holdings',
    businessHeads: ['Ms. Olufisayo Bakare'],
    allBusinessHeadsInGec: true,
  },
];

export const WORKBOOK_DEPARTMENTS: OrgDepartmentSpec[] = [
  // CGCC (8 Departments)
  {
    id: 'dept-cgcc-fin',
    entityId: 'entity-cgcc',
    entityShortCode: 'CGCC',
    entityName: 'Citadel Global Community Church (CGCC)',
    departmentName: 'Finance',
    priority: 'Must Have',
    departmentHeadTitle: 'Finance & Account Manager',
    headEmail: null,
    reportsTo: 'Group Executive Council (GEC)',
    isGecSharedService: true,
    notes: 'Also part of the Group Executive Council (GEC) under shared services.',
  },
  {
    id: 'dept-cgcc-pccm',
    entityId: 'entity-cgcc',
    entityShortCode: 'CGCC',
    entityName: 'Citadel Global Community Church (CGCC)',
    departmentName: 'HR',
    priority: 'Must Have',
    departmentHeadTitle: 'People, Culture & Change Manager',
    headEmail: 's.afuwape@thecitadelglobal.org',
    reportsTo: 'Group Executive Council (GEC)',
    isGecSharedService: true,
    notes: 'Also part of the Group Executive Council (GEC) under shared services.',
  },
  {
    id: 'dept-cgcc-fac',
    entityId: 'entity-cgcc',
    entityShortCode: 'CGCC',
    entityName: 'Citadel Global Community Church (CGCC)',
    departmentName: 'Facilities',
    priority: 'Must Have',
    departmentHeadTitle: 'Facilities & Resource Manager',
    headEmail: null,
    reportsTo: 'Pastor Christian Ike',
    isGecSharedService: true,
    notes: 'Reports to Pastor Ike. Also part of the GEC under shared services.',
  },
  {
    id: 'dept-cgcc-sec',
    entityId: 'entity-cgcc',
    entityShortCode: 'CGCC',
    entityName: 'Citadel Global Community Church (CGCC)',
    departmentName: 'Security',
    priority: 'Must Have',
    departmentHeadTitle: 'Chief Security Officer',
    headEmail: 'olubunmi.ojo@thecitadelglobal.org',
    reportsTo: 'Pastor Christian Ike',
    isGecSharedService: true,
    notes: 'Reports to Pastor Ike. Also part of the GEC under shared services.',
  },
  {
    id: 'dept-cgcc-so',
    entityId: 'entity-cgcc',
    entityShortCode: 'CGCC',
    entityName: 'Citadel Global Community Church (CGCC)',
    departmentName: "S.O.'s Office/Admin",
    priority: 'Must Have',
    departmentHeadTitle: 'Pastor, Planning & Operations',
    headEmail: 'b.adeyoola@thecitadelglobal.org',
    reportsTo: 'Pastor Biola Adeyoola',
    isGecSharedService: true,
    notes: 'Also part of the Group Executive Council (GEC) under shared services.',
  },
  {
    id: 'dept-cgcc-proto',
    entityId: 'entity-cgcc',
    entityShortCode: 'CGCC',
    entityName: 'Citadel Global Community Church (CGCC)',
    departmentName: 'Protocol',
    priority: 'Must Have',
    departmentHeadTitle: 'Pastor, Planning & Operations',
    headEmail: 'b.adeyoola@thecitadelglobal.org',
    reportsTo: 'Pastor Biola Adeyoola',
    isGecSharedService: true,
    notes: 'Also part of the Group Executive Council (GEC) under shared services.',
  },
  {
    id: 'dept-cgcc-ict',
    entityId: 'entity-cgcc',
    entityShortCode: 'CGCC',
    entityName: 'Citadel Global Community Church (CGCC)',
    departmentName: 'ICT',
    priority: 'Must Have',
    departmentHeadTitle: 'ICT Manager',
    headEmail: null,
    reportsTo: 'Pastor Segun Bakare',
    isGecSharedService: true,
    notes: 'Reports to Pastor Segun. Also part of the GEC under shared services.',
  },
  {
    id: 'dept-cgcc-trans',
    entityId: 'entity-cgcc',
    entityShortCode: 'CGCC',
    entityName: 'Citadel Global Community Church (CGCC)',
    departmentName: 'Transport & Logistics',
    priority: 'Important',
    departmentHeadTitle: 'Transport Lead',
    headEmail: 'j.osumili@thecitadelglobal.org',
    reportsTo: 'Facilities & Resource Manager',
    isGecSharedService: false,
    notes: 'Reports to the Facilities Manager.',
  },

  // Citadel School of Government (2 Departments)
  {
    id: 'dept-csog-acad',
    entityId: 'entity-csog',
    entityShortCode: 'CSOG',
    entityName: 'Citadel School of Government',
    departmentName: 'Academy & Programmes',
    priority: 'Important',
    departmentHeadTitle: 'Academy Liaison Officer',
    headEmail: 'clementina.busayo@citadelschoolofgovernment.org',
    reportsTo: 'Director School of Government (Mr. Omoaholo Omoakhalen)',
    isGecSharedService: false,
    notes: 'Reports to the Director School of Government who is the Business Head.',
  },
  {
    id: 'dept-csog-ops',
    entityId: 'entity-csog',
    entityShortCode: 'CSOG',
    entityName: 'Citadel School of Government',
    departmentName: 'Admin & Operations',
    priority: 'Important',
    departmentHeadTitle: 'Admin & Operations Officer',
    headEmail: 'fatima.pedro-lawrence@citadelschoolofgovernment.org',
    reportsTo: 'Director School of Government (Mr. Omoaholo Omoakhalen)',
    isGecSharedService: false,
    notes: 'Reports to the Director School of Government.',
  },

  // Citadel Holdings (5 Departments)
  {
    id: 'dept-ch-book',
    entityId: 'entity-holdings',
    entityShortCode: 'HOLDINGS',
    entityName: 'Citadel Holdings',
    departmentName: 'Bookshop',
    priority: 'Important',
    departmentHeadTitle: 'Bookshop Officer',
    headEmail: null,
    reportsTo: 'Business Manager (Citadel Holdings)',
    isGecSharedService: false,
    notes: 'Reports to the Business Manager.',
  },
  {
    id: 'dept-ch-cafe',
    entityId: 'entity-holdings',
    entityShortCode: 'HOLDINGS',
    entityName: 'Citadel Holdings',
    departmentName: 'Cafe',
    priority: 'Important',
    departmentHeadTitle: 'Cafe Supervisor',
    headEmail: null,
    reportsTo: 'Business Manager (Citadel Holdings)',
    isGecSharedService: false,
    notes: 'Reports to the Business Manager.',
  },
  {
    id: 'dept-ch-work',
    entityId: 'entity-holdings',
    entityShortCode: 'HOLDINGS',
    entityName: 'Citadel Holdings',
    departmentName: 'Workstation',
    priority: 'Important',
    departmentHeadTitle: 'Workstation Supervisor',
    headEmail: null,
    reportsTo: 'Business Manager (Citadel Holdings)',
    isGecSharedService: false,
    notes: 'Reports to the Business Manager.',
  },
  {
    id: 'dept-ch-asabi',
    entityId: 'entity-holdings',
    entityShortCode: 'HOLDINGS',
    entityName: 'Citadel Holdings',
    departmentName: 'Asabi Aladire',
    priority: 'Important',
    departmentHeadTitle: 'Shop Attendant',
    headEmail: null,
    reportsTo: 'Business Manager (Citadel Holdings)',
    isGecSharedService: false,
    notes: 'Reports to the Business Manager.',
  },
  {
    id: 'dept-ch-sales',
    entityId: 'entity-holdings',
    entityShortCode: 'HOLDINGS',
    entityName: 'Citadel Holdings',
    departmentName: 'Sales & Business Development',
    priority: 'Must Have',
    departmentHeadTitle: 'Business Manager',
    headEmail: null,
    reportsTo: 'CEO / Business Head (Ms. Olufisayo Bakare)',
    isGecSharedService: false,
    notes: 'Reports to the CEO.',
  },
];

export function resolveEntityByCodeOrName(input?: string | null): OrgEntitySpec | null {
  if (!input) return null;
  const q = input.trim().toLowerCase();
  return (
    WORKBOOK_ENTITIES.find(
      (e) =>
        e.id.toLowerCase() === q ||
        e.shortCode.toLowerCase() === q ||
        e.name.toLowerCase() === q ||
        e.name.toLowerCase().includes(q) ||
        q.includes(e.shortCode.toLowerCase())
    ) || null
  );
}

export function resolveDepartmentBelongsToEntity(
  entityNameOrId: string,
  departmentNameOrId: string
): { valid: boolean; entity: OrgEntitySpec | null; department: OrgDepartmentSpec | null; error?: string } {
  const entity = resolveEntityByCodeOrName(entityNameOrId);
  if (!entity) {
    return { valid: false, entity: null, department: null, error: `Unknown entity "${entityNameOrId}".` };
  }
  const q = departmentNameOrId.trim().toLowerCase();
  const aliasMap: Record<string, string> = {
    'people, culture & change': 'hr',
    'people, culture and change': 'hr',
    pccm: 'hr',
    'citadel workstation': 'workstation',
    "s.o.'s office / admin": "s.o.'s office/admin",
  };
  const normalizedQ = aliasMap[q] || q;

  const dept = WORKBOOK_DEPARTMENTS.find(
    (d) =>
      d.id.toLowerCase() === normalizedQ ||
      d.departmentName.toLowerCase() === normalizedQ ||
      d.departmentName.toLowerCase().includes(normalizedQ)
  );

  if (!dept) {
    return {
      valid: false,
      entity,
      department: null,
      error: `Department "${departmentNameOrId}" does not exist in Sheet 3 Org Structure.`,
    };
  }
  if (dept.entityId !== entity.id) {
    return {
      valid: false,
      entity,
      department: dept,
      error: `Department "${dept.departmentName}" belongs to ${dept.entityName}, not ${entity.name}.`,
    };
  }
  return { valid: true, entity, department: dept };
}

export function getReportingChainForDepartment(departmentId: string): string[] {
  const dept = WORKBOOK_DEPARTMENTS.find((d) => d.id === departmentId);
  if (!dept) return [];
  const entity = WORKBOOK_ENTITIES.find((e) => e.id === dept.entityId);
  const chain: string[] = [dept.departmentHeadTitle];

  if (dept.id === 'dept-cgcc-trans') {
    chain.push('Facilities & Resource Manager', 'Pastor Christian Ike (Business Head / GEC)');
  } else if (
    dept.entityShortCode === 'HOLDINGS' &&
    dept.id !== 'dept-ch-sales'
  ) {
    chain.push('Business Manager (Sales & Business Development)', 'Ms. Olufisayo Bakare (CEO / GEC)');
  } else {
    chain.push(dept.reportsTo);
    if (entity && !dept.reportsTo.toLowerCase().includes('gec')) {
      chain.push('Group Executive Council (GEC)');
    }
  }
  return chain;
}

export function getDepartmentsByEntity(entityShortCode: EntityShortCode): OrgDepartmentSpec[] {
  return WORKBOOK_DEPARTMENTS.filter((d) => d.entityShortCode === entityShortCode);
}

// ============================================================================
// SHEET 4: ROLES & PERMISSIONS GOVERNANCE ENGINE
// ============================================================================

export const WORKBOOK_ROLE_SPECS: Record<WorkbookRole, RoleGovernanceSpec> = {
  SUPER_ADMIN_HR: {
    role: 'SUPER_ADMIN_HR',
    label: 'Super Admin / HR',
    scope: 'ALL_ENTITIES',
    priority: 'Must Have',
    createEditSummary: 'Can create and edit all parts of the platform',
    approvalRequirement: 'NONE',
    reportingOrGecNote: 'Part of the GEC',
    isGecMember: true,
    allowedActions: [
      'VIEW_PLATFORM',
      'EDIT_ANY_MODULE',
      'EDIT_ENTITY_UNIT',
      'EDIT_TEAM_PERFORMANCE',
      'UPLOAD_OWN_PROFILE_OR_DOCS',
      'APPROVE_HR_CHANGE',
      'APPROVE_TECHNICAL_CHANGE',
      'EXPORT_REPORTS',
    ],
  },
  BUSINESS_HEAD: {
    role: 'BUSINESS_HEAD',
    label: 'Business Head',
    scope: 'OWN_ENTITY',
    priority: 'Must Have',
    createEditSummary: 'Limited access to create and edit only respective business unit part of the platform',
    approvalRequirement: 'HR_SUPER_ADMIN_APPROVAL',
    reportingOrGecNote: 'Part of the GEC',
    isGecMember: true,
    allowedActions: [
      'VIEW_PLATFORM',
      'EDIT_ENTITY_UNIT',
      'EDIT_TEAM_PERFORMANCE',
      'UPLOAD_OWN_PROFILE_OR_DOCS',
      'EXPORT_REPORTS',
    ],
  },
  DEPARTMENT_HEAD: {
    role: 'DEPARTMENT_HEAD',
    label: 'Department Head',
    scope: 'OWN_DEPARTMENT_TEAM',
    priority: 'Must Have',
    createEditSummary: 'Can only create/edit team member performance',
    approvalRequirement: 'HR_SUPER_ADMIN_APPROVAL',
    reportingOrGecNote: 'Department heads report to Business heads',
    isGecMember: false,
    allowedActions: [
      'VIEW_PLATFORM',
      'EDIT_TEAM_PERFORMANCE',
      'UPLOAD_OWN_PROFILE_OR_DOCS',
    ],
  },
  EMPLOYEE: {
    role: 'EMPLOYEE',
    label: 'Employee',
    scope: 'OWN_RECORDS',
    priority: 'Important',
    createEditSummary:
      'Can only view own records and upload relevant employee information and documents (e.g., CVs, certificates)',
    approvalRequirement: 'HR_SUPER_ADMIN_APPROVAL',
    reportingOrGecNote: 'Reports to department heads',
    isGecMember: false,
    allowedActions: ['VIEW_PLATFORM', 'UPLOAD_OWN_PROFILE_OR_DOCS'],
  },
  SYSTEM_ADMIN: {
    role: 'SYSTEM_ADMIN',
    label: 'System Administrator (Optional)',
    scope: 'TECHNICAL_CONFIGURATION',
    priority: 'Must Have',
    createEditSummary: 'Can create and edit all technical and backend functions',
    approvalRequirement: 'SUPER_ADMIN_APPROVAL',
    reportingOrGecNote: 'Technical infrastructure configuration & backend administration',
    isGecMember: false,
    allowedActions: ['VIEW_PLATFORM', 'EDIT_TECHNICAL_BACKEND'],
  },
};

export function mapAppRoleToWorkbookRole(appRole?: string | null): WorkbookRole {
  const upper = (appRole || '').trim().toUpperCase();
  if (
    upper === 'PCCM_SUPER_ADMIN' ||
    upper === 'HR_STAFF' ||
    upper === 'HR' ||
    upper === 'SUPER_ADMIN' ||
    upper === 'ADMIN'
  ) {
    return 'SUPER_ADMIN_HR';
  }
  if (upper === 'SYSTEM_ADMIN' || upper === 'SYSADMIN') {
    return 'SYSTEM_ADMIN';
  }
  if (upper === 'BUSINESS_HEAD') {
    return 'BUSINESS_HEAD';
  }
  if (upper === 'DEPARTMENT_HEAD' || upper === 'MANAGER') {
    return 'DEPARTMENT_HEAD';
  }
  return 'EMPLOYEE';
}

export function evaluateWorkbookPermission(params: {
  actorRole: WorkbookRole;
  action: GovernanceAction;
  actorEntityId?: string;
  targetEntityId?: string;
  actorDepartmentId?: string;
  targetDepartmentId?: string;
  actorEmployeeId?: string;
  targetEmployeeId?: string;
}): GovernanceDecision {
  const spec = WORKBOOK_ROLE_SPECS[params.actorRole];
  if (!spec) {
    return { allowed: false, requiresApproval: false, reason: 'Unrecognized workbook role.' };
  }

  if (!spec.allowedActions.includes(params.action)) {
    return {
      allowed: false,
      requiresApproval: false,
      reason: `${spec.label} is not permitted to perform ${params.action}.`,
    };
  }

  // Scope boundary checks per Sheet 4
  if (spec.scope === 'OWN_ENTITY' && params.targetEntityId && params.actorEntityId) {
    if (params.targetEntityId !== params.actorEntityId) {
      return {
        allowed: false,
        requiresApproval: false,
        reason: `Business Head scope violation: restricted to own entity (${params.actorEntityId}).`,
      };
    }
  }

  if (spec.scope === 'OWN_DEPARTMENT_TEAM' && params.targetDepartmentId && params.actorDepartmentId) {
    if (params.targetDepartmentId !== params.actorDepartmentId) {
      return {
        allowed: false,
        requiresApproval: false,
        reason: `Department Head scope violation: restricted to own department/team (${params.actorDepartmentId}).`,
      };
    }
  }

  if (spec.scope === 'OWN_RECORDS' && params.targetEmployeeId && params.actorEmployeeId) {
    if (String(params.targetEmployeeId) !== String(params.actorEmployeeId)) {
      return {
        allowed: false,
        requiresApproval: false,
        reason: 'Employee scope violation: restricted to own records only.',
      };
    }
  }

  const isMutation = params.action !== 'VIEW_PLATFORM' && params.action !== 'EXPORT_REPORTS';
  if (isMutation && spec.approvalRequirement !== 'NONE') {
    return {
      allowed: true,
      requiresApproval: true,
      approverRole: 'SUPER_ADMIN_HR',
      reason:
        spec.approvalRequirement === 'SUPER_ADMIN_APPROVAL'
          ? 'Allowed with mandatory Super Admin approval before production change takes effect.'
          : 'Allowed with mandatory HR / Super Admin approval before change takes effect.',
    };
  }

  return {
    allowed: true,
    requiresApproval: false,
    reason: `Authorized directly for ${spec.label}.`,
  };
}

// ============================================================================
// SHEET 1 RULE 4 & SHEET 21: SECURITY & NO-CREDENTIALS GUARD
// ============================================================================

const FORBIDDEN_CREDENTIAL_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: 'Bank PIN / ATM PIN', regex: /\b(?:atm|bank|card)[\s_-]*pin\b/i },
  { label: 'Account Password', regex: /\b(?:password|passwd|passcode)\s*[:=]/i },
  { label: 'Secret / API Token', regex: /\b(?:secret_key|api_key|private_key|bearer\s+[a-z0-9._-]{16,})\b/i },
];

export function detectForbiddenCredentials(text: string): string[] {
  if (!text) return [];
  return FORBIDDEN_CREDENTIAL_PATTERNS.filter((p) => p.regex.test(text)).map((p) => p.label);
}

export const WORKBOOK_SECURITY_CONTROLS: SecurityControlSpec[] = [
  {
    id: 'sec-rbac',
    requirement: 'Strict Role & Scope Isolation (Sheet 4)',
    currentPractice: 'Manual spreadsheets & Google Docs',
    requiredForV1: true,
    owner: 'HR / ICT',
    riskIfMissing: 'Cross-entity data leakage between CGCC, CSOG, and Holdings',
    implementedInApp: true,
  },
  {
    id: 'sec-sensitive-masking',
    requirement: 'Mask All 24 Sensitive Employee Master Fields (Sheet 5)',
    currentPractice: 'Shared Excel bio-data workbook',
    requiredForV1: true,
    owner: 'HR / PCCM',
    riskIfMissing: 'Unauthorized exposure of salary, bank, pension, BVN, DOB, and home address',
    implementedInApp: true,
  },
  {
    id: 'sec-approval-gates',
    requirement: 'HR/Super Admin Approval Gate on Self-Service & Business Unit Edits (Sheets 4 & 5)',
    currentPractice: 'Email & ad-hoc edits',
    requiredForV1: true,
    owner: 'HR / Super Admin',
    riskIfMissing: 'Unverified changes to Staff ID, contact records, or team configurations',
    implementedInApp: true,
  },
  {
    id: 'sec-no-credentials',
    requirement: 'Block Passwords, Bank PINs & Secrets in Uploads/Imports (Sheet 1 Rule 4)',
    currentPractice: 'Policy guideline only',
    requiredForV1: true,
    owner: 'System Administrator',
    riskIfMissing: 'Credential leakage in uploaded HR files or notes',
    implementedInApp: true,
  },
  {
    id: 'sec-audit-log',
    requirement: 'Immutable Audit Trail for Approvals, Lifecycle & Data Exports',
    currentPractice: 'None',
    requiredForV1: true,
    owner: 'System Administrator / HR',
    riskIfMissing: 'No compliance traceability for HR and GEC audits',
    implementedInApp: true,
  },
];

// ============================================================================
// SHEET 23: V1 LAUNCH PRIORITIES (OCTOBER 4, 2026) & SHEET 24: FUTURE ROADMAP
// ============================================================================

export const WORKBOOK_V1_PRIORITIES: V1PrioritySpec[] = [
  {
    id: 'v1-org',
    feature: 'Multi-Entity Org Structure & GEC Reporting Lines (Sheet 3)',
    businessValue: 'Unifies CGCC, CSOG, and Citadel Holdings with 15 departments & GEC shared services',
    october4Target: true,
    priority: 'Must Have',
    dependencies: 'Confirm TBD Head Emails for 9 departments',
    acceptanceCriteria: 'All 3 entities, 15 departments, and 5 Business Heads mapped with valid entity-department scoping',
    implementationStatus: 'Implemented',
  },
  {
    id: 'v1-rbac',
    feature: '5-Role Governance & Approval-Gated Edits (Sheet 4)',
    businessValue: 'Enforces entity/team/self boundaries and HR approval before changes commit',
    october4Target: true,
    priority: 'Must Have',
    dependencies: 'Org Structure',
    acceptanceCriteria: 'Super Admin/HR, Business Head, Department Head, Employee, and System Admin rules enforced with tests',
    implementationStatus: 'Implemented',
  },
  {
    id: 'v1-emp',
    feature: 'Employee Master Data (24 Fields) & Staged Self-Service Approvals (Sheet 5)',
    businessValue: 'Replaces 40-record Excel bio-data sheet with validated, auditable HR records',
    october4Target: true,
    priority: 'Must Have',
    dependencies: 'Data Migration Validator (Sheets 6 & 22)',
    acceptanceCriteria: '11 employee-editable fields require HR approval; 13 HR-only fields locked; completeness tracked',
    implementationStatus: 'Implemented',
  },
  {
    id: 'v1-leave',
    feature: 'Leave Policy Engine — 6 Types, Eligibility & Direct-HR Routing (Sheet 7)',
    businessValue: 'Replaces Google Doc leave form with automated balance, attachment & approval routing',
    october4Target: true,
    priority: 'Must Have',
    dependencies: 'Employee Confirmation & Service Years (Sheet 5 & 14)',
    acceptanceCriteria: 'Annual 21d (Confirmed + >=1yr), Sick 10d, Maternity 90d, Paternity 14d, Exam 21d (Direct HR), Compassionate 5d (Direct HR)',
    implementationStatus: 'Implemented',
  },
  {
    id: 'v1-attendance',
    feature: 'Shift Schedules, 10-Min Grace Period & Biometric Compliance (Sheet 8)',
    businessValue: 'Enforces 9am-4pm / Facilities 7am-4pm schedules and CSOG event-day overrides',
    october4Target: true,
    priority: 'Must Have',
    dependencies: 'Biometric terminal model/export confirmation',
    acceptanceCriteria: 'Grace period (10 min), late/early/overtime calculations, and CSOG event-day override verified',
    implementationStatus: 'Implemented',
  },
  {
    id: 'v1-recruitment',
    feature: '10-Stage Recruitment Pipeline & Two-Stage Interviews (Sheets 9–11)',
    businessValue: 'Standardizes manpower requests, approvals, automated candidate notices & dual-stage interviews',
    october4Target: true,
    priority: 'Important',
    dependencies: 'HR confirmation of blank Assessments & Interview scorecard weights',
    acceptanceCriteria: 'Stage progression blocks skipped approvals and requires Technical (Physical) + Competency (Virtual) interviews',
    implementationStatus: 'Implemented',
  },
  {
    id: 'v1-m365',
    feature: 'Microsoft 365 Live Integration (Entra ID, Exchange, Teams, SharePoint) (Sheet 18)',
    businessValue: 'Single sign-on, automated organizational emails & Teams virtual interview scheduling',
    october4Target: true,
    priority: 'Important',
    dependencies: 'Tenant ID, Client ID, Admin consent from Citadel ICT (Sheet 18 currently blank)',
    acceptanceCriteria: 'Live OAuth/Graph API credentials supplied by Citadel ICT admin',
    implementationStatus: 'Partial (Awaiting Client Config)',
  },
];

export const WORKBOOK_FUTURE_ROADMAP: FutureRoadmapSpec[] = [
  {
    id: 'road-qualifications',
    feature: 'Employee Self-Service Qualifications & Certifications Portal (Sheet 5 Phase 2)',
    whyItMatters: 'Marked Phase 2 in Sheet 5; allows staff to maintain academic & professional credentials with HR verification',
    suggestedPhase: 'Phase 2',
    dependency: 'Core Employee Master Data & Document Expiry Engine',
    owner: 'HR / PCCM',
    notes: 'Schema & staged approval support already built; rollout gated by HR priority.',
  },
  {
    id: 'road-yos-awards',
    feature: 'Automated Years-of-Service Milestones & Long-Service Recognition (Sheet 5 Phase 2)',
    whyItMatters: 'Marked Phase 2 in Sheet 5; automatically calculates tenure milestones and notifies GEC/HR',
    suggestedPhase: 'Phase 2',
    dependency: 'Clean Employment Dates migrated from Excel Bio Data Form',
    owner: 'HR / PCCM',
    notes: 'Tenure calculator already active for Sheet 7 Annual Leave (>=1 year) eligibility.',
  },
  {
    id: 'road-ai-copilot',
    feature: 'Governed HR AI Assistant (CV Drafting, Policy Q&A, Anomaly Summaries) (Sheet 19)',
    whyItMatters: 'Accelerates HR screening and policy lookup while enforcing strict human-in-the-loop approval',
    suggestedPhase: 'Phase 2',
    dependency: 'HR sign-off on Sheet 19 use cases and data access boundaries',
    owner: 'HR & System Admin',
    notes: 'Policy guard & role boundaries implemented; live LLM API activation awaits HR approval.',
  },
  {
    id: 'road-biometric-realtime',
    feature: 'Direct Push Biometric Hardware Daemon (ZKTeco / Campus Terminals) (Sheet 8)',
    whyItMatters: 'Eliminates manual biometric CSV uploads once hardware vendor & network endpoints are confirmed',
    suggestedPhase: 'Future',
    dependency: 'Hardware model & campus IP provisioning by ICT',
    owner: 'ICT / Facilities',
    notes: 'Sheet 8 shows Current Method = N/A and Biometric = YES; CSV import + shift engine ready for V1.',
  },
];

// ============================================================================
// EXPLICIT AMBIGUITIES, CONTRADICTIONS & BLANK-SHEET DECISIONS REGISTER
// ============================================================================

export const WORKBOOK_AMBIGUITIES_REGISTER: WorkbookAmbiguityFlag[] = [
  {
    id: 'amb-col-c-validation',
    sheetNumber: 3,
    sheetName: 'Org Structure / Roles & Permissions / Employee Data',
    severity: 'Data Anomaly',
    summary:
      'Excel dropdown validation ("Must Have,Important,Phase 2,Future") was applied to Column C across all sheets, overwriting Business Head (Sheet 3), View (Sheet 4), and Employee Can Edit? (Sheet 5) with priority labels.',
    chosenInterpretation:
      'Extracted actual Business Head names from Sheet 3 rows 21–26, role view scopes from Sheet 4 Column B (Scope), and field-level editability from Sheet 5 Column F (Notes), while preserving Column C as the feature priority.',
    needsUserDecision: false,
  },
  {
    id: 'amb-staff-id-editable',
    sheetNumber: 5,
    sheetName: 'Employee Data',
    severity: 'Contradiction',
    summary:
      'Row 5 (Staff ID) states "Employee can edit. HR Approves", which risks breaking payroll, biometric, and audit linkages if an employee alters their primary identifier.',
    chosenInterpretation:
      'Implemented Staff ID as a staged Employee Change Request that NEVER mutates the live Staff ID until HR/Super Admin explicitly approves it, and flagged it for HR confirmation.',
    needsUserDecision: true,
  },
  {
    id: 'amb-sick-leave-advance',
    sheetNumber: 7,
    sheetName: 'Leave Management',
    severity: 'Contradiction',
    summary:
      'Sick Leave (Row 6) states "ALL leave should be planned in advance", which contradicts unplanned acute medical illness.',
    chosenInterpretation:
      'Enforced advance-planning strictly on Annual, Maternity, Paternity, and Exam Leave, while treating same-day/retroactive Sick Leave as a non-blocking advisory warning (still requiring a Medical Note and Confirmed status).',
    needsUserDecision: true,
  },
  {
    id: 'amb-maternity-paternity-gender',
    sheetNumber: 7,
    sheetName: 'Leave Management',
    severity: 'Ambiguity',
    summary:
      'Maternity Leave (3 months) and Paternity Leave (2 weeks) only specify "Confirmed Employees only" without explicitly stating gender or exact calendar vs working days (90 vs 84 days).',
    chosenInterpretation:
      'Mapped 3 months = 90 calendar days (Female confirmed employees) and 2 weeks = 14 days (Male confirmed employees), and Exam Leave 3 weeks = 21 days.',
    needsUserDecision: true,
  },
  {
    id: 'amb-holdings-shifts',
    sheetNumber: 8,
    sheetName: 'Attendance',
    severity: 'Contradiction',
    summary:
      'Citadel Workstation (Row 7) and Asabi Aladire (Row 8) note "Works different schedule", yet both list 9:00 am - 4:00 pm (identical to CGCC). Also Bookshop, Cafe, and Sales & Business Development are omitted from Sheet 8.',
    chosenInterpretation:
      'Implemented exact 9:00 am - 4:00 pm with 10-minute grace period for Workstation & Asabi Aladire (and Facilities 7:00 am - 4:00 pm) with fallback to 9:00 am - 4:00 pm for unlisted Holdings units, flagging actual shift hours for HR confirmation.',
    needsUserDecision: true,
  },
  {
    id: 'amb-tbd-head-emails',
    sheetNumber: 3,
    sheetName: 'Org Structure',
    severity: 'Ambiguity',
    summary:
      '9 of 15 department heads have "TBD" for Head Email (Finance, Facilities, ICT, Bookshop, Cafe, Workstation, Asabi Aladire, Sales & Business Development).',
    chosenInterpretation:
      'Stored headEmail as nullable (TBD badge in UI) and routed approvals by employee manager_id / role rather than hardcoded emails until HR supplies official addresses.',
    needsUserDecision: true,
  },
  {
    id: 'amb-dept-head-vs-leave',
    sheetNumber: 4,
    sheetName: 'Roles & Permissions vs Leave Management',
    severity: 'Contradiction',
    summary:
      'Sheet 4 states Department Head "Can only create/edit team member performance", whereas Sheet 7 assigns Line Manager/Supervisor as Stage 1 approver for Annual, Sick, Maternity, and Paternity leave.',
    chosenInterpretation:
      'Scoped Department Head create/edit rights to team performance while preserving Stage 1 Leave Review & Resignation Endorsement per Sheet 7 and HR feedback, with HR holding final approval.',
    needsUserDecision: true,
  },
  {
    id: 'amb-blank-sheets-10-24',
    sheetNumber: 10,
    sheetName: 'Sheets 10–24 (15 Unpopulated Template Sheets)',
    severity: 'Blank Template',
    summary:
      'Sheets 10–24 (Assessments, Interview Process, Pre-Onboarding, Onboarding, Employee Lifecycle, Offboarding, Documents, Notifications & Email, Microsoft 365, AI Assistant, Reports & Analytics, Security, Data Migration, V1 Priorities, Future Roadmap) contain column schemas only and zero populated data rows (and Sheet 2 rows 9–10 for V1 include/exclude are also blank).',
    chosenInterpretation:
      'Inferred each module purpose from its column headers and surrounding populated sheets (Sheets 1–9), built full working data structures, validation rules, calculators, and interactive screens matching every schema, and left tenant-specific credentials (M365) & policy sign-offs clearly flagged for HR.',
    needsUserDecision: true,
  },
];
