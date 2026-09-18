/**
 * Employee Data Model
 * Citadel People Hub
 */

export type EmploymentType = 'Full-Time' | 'Part-Time' | 'Contract' | 'Intern' | 'Probationary';
export type ContractStatus = 'Permanent' | 'Fixed-Term' | 'Probation' | 'Notice-Period' | 'Inactive';
export type Gender = 'Male' | 'Female';

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
}

export interface NextOfKin {
  name: string;
  relationship: string;
  phone: string;
  address: string;
}

export interface Qualification {
  id: string;
  degree: string;
  institution: string;
  yearCompleted: number;
  fieldOfStudy: string;
}

export interface Certification {
  id: string;
  name: string;
  issuingBody: string;
  yearObtained: number;
  expiryDate?: string;
}

export interface BankPayrollInfo {
  bankName: string;
  accountNumber: string;
  accountName: string;
  bvn?: string; // Bank Verification Number (Sensitive)
  salaryGrade: string;
  basicSalary?: number; // Restricted to PCCM
  currency: string;
}

export interface PensionHMOBenefits {
  pfaName: string; // Pension Fund Administrator
  rsaPin: string;  // Retirement Savings Account PIN
  hmoProvider: string;
  hmoPlan: string;
  hmoIdNumber: string;
  lifeInsurancePolicyNo?: string;
}

export type EmployeeStatus =
  | 'Active'
  | 'Probation'
  | 'Confirmed'
  | 'On Leave'
  | 'Suspended'
  | 'Resigned'
  | 'Terminated'
  | 'Retired'
  | 'Inactive';

export interface Employee {
  id: string;
  staffId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  profilePhoto?: string;
  dateOfBirth: string; // Sensitive
  gender: Gender;
  phone: string;
  email: string;
  address: string; // Sensitive
  emergencyContact: EmergencyContact;
  nextOfKin: NextOfKin; // Sensitive
  
  // Organizational Placement
  entityId: string;
  entityName: string;
  departmentId: string;
  departmentName: string;
  jobTitle: string;
  gradeLevel: string; // e.g. L1, L2, Lead, Mgr, Exec
  employmentType: EmploymentType;
  employmentDate: string;
  confirmationDate?: string;
  managerId?: string;
  managerName?: string;
  contractStatus: ContractStatus;
  yearsOfService: number;

  // Professional Credentials
  qualifications: Qualification[];
  certifications: Certification[];

  // Sensitive Financial & Benefits Information
  bankPayroll: BankPayrollInfo;
  pensionHmo: PensionHMOBenefits;

  status: EmployeeStatus;
  notes?: string;
}

// Sensitive field categories
export type SensitiveFieldCategory =
  | 'salary'
  | 'bank'
  | 'pension'
  | 'address'
  | 'dateOfBirth'
  | 'nextOfKin'
  | 'disciplinary';
