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
  | 'PCCM Form / Template';

export type AccessLevel = 'Public' | 'Departmental' | 'Restricted_PCCM_Only' | 'PCCM_Only';

export interface HubDocument {
  id: string;
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
  uploadedDate: string;
  version: string;
  downloadUrl?: string;
  isSensitive: boolean;
}
