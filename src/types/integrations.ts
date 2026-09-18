/**
 * Future Integration Readiness Types
 * Citadel People Hub
 */

export interface IntegrationStatus {
  id: string;
  name: string;
  category: 'Database & Auth' | 'Microsoft 365' | 'Hardware' | 'Deployment';
  provider: string;
  status: 'Ready_For_Connection' | 'Architected' | 'Configured' | 'Testing';
  description: string;
  features: string[];
  requiredEnvVars: string[];
  documentationLink?: string;
}
