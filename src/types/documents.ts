/**
 * Documents Types
 * Citadel People Hub
 */

export type DocumentCategory =
  | 'Company Policy'
  | 'Employee Contract'
  | 'Identification'
  | 'Academic & Professional'
  | 'Medical & HMO'
  | 'Performance Appraisal'
  | 'PCCM Form / Template'
  | 'Educational Certificate'
  | 'Professional Certification'
  | 'CV/Resume'
  | 'National Identification'
  | 'Employment Letter'
  | 'Previous Employment Document'
  | 'Medical Fitness Certificate'
  | 'Other Supporting Document';

export type AccessLevel = 'Public' | 'Departmental' | 'Restricted_PCCM_Only' | 'PCCM_Only';

export interface HubDocument {
  id: string;
  employeeId?: string;
  employeeStaffId?: string;
  employeeName?: string;
  title: string;
  description?: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  category: DocumentCategory;
  accessLevel: AccessLevel;
  entityScope?: string; // e.g. "All Entities" or specific entity name
  departmentScope?: string;
  uploadedBy: string;
  uploadedById?: string;
  uploadedDate: string;
  version: string;
  versionNumber?: number;
  previousVersionId?: string;
  issueDate?: string;
  expiryDate?: string;
  downloadUrl?: string;
  isSensitive: boolean;
}

export interface EmployeeDocumentInput {
  title: string;
  description?: string;
  category: DocumentCategory;
  issueDate?: string;
  expiryDate?: string;
  version?: string;
}
