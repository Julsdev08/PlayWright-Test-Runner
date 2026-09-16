import { ActionCategory } from '../config/project-config.types';

export type ApprovalManifest = {
  schemaVersion: 1;
  projectSlug: string;
  approvedAt: string;
  approvedBy?: string;
  approvedTestIds: string[];
  approvedActionCategories: ActionCategory[];
  productionWriteApproved: boolean;
  notes?: string;
};

export type ApprovalDecision = {
  testId: string;
  allowed: boolean;
  classification: 'safe-read-only' | 'approved-write' | 'blocked';
  reason: string;
};

