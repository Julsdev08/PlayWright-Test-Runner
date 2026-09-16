import { WebsiteProjectConfig } from '../config/project-config.types';
import { ProposedTestCase } from '../planning/test-case.types';
import { ApprovalDecision, ApprovalManifest } from './approval.types';

export function evaluateApproval(
  testCase: ProposedTestCase,
  config: WebsiteProjectConfig,
  manifest?: ApprovalManifest
): ApprovalDecision {
  if (testCase.actionCategory === 'blocked') {
    return blocked(testCase.testId, 'The test is blocked by missing requirements or an unresolved expectation.');
  }

  if (config.actions.prohibited.includes(testCase.actionCategory)) {
    return blocked(testCase.testId, `${testCase.actionCategory} actions are prohibited by project configuration.`);
  }

  if (!config.actions.allowed.includes(testCase.actionCategory)) {
    return blocked(testCase.testId, `${testCase.actionCategory} actions are not explicitly allowed.`);
  }

  if (testCase.actionCategory === 'read-only') {
    if (config.testEnvironment === 'production' && !config.productionSafety.allowReadOnly) {
      return blocked(testCase.testId, 'Read-only production testing is disabled.');
    }
    return {
      testId: testCase.testId,
      allowed: true,
      classification: 'safe-read-only',
      reason: 'Read-only test is allowed by project safety policy.'
    };
  }

  if (config.testEnvironment === 'production' && !config.productionSafety.allowWriteActions) {
    return blocked(testCase.testId, 'Production write actions are disabled by project safety policy.');
  }

  if (!manifest) return blocked(testCase.testId, 'An explicit approval manifest is required for write actions.');
  if (manifest.projectSlug !== config.projectSlug) return blocked(testCase.testId, 'Approval manifest belongs to a different project.');
  if (!manifest.approvedTestIds.includes(testCase.testId)) return blocked(testCase.testId, 'Test ID is not explicitly approved.');
  if (!manifest.approvedActionCategories.includes(testCase.actionCategory)) {
    return blocked(testCase.testId, `${testCase.actionCategory} is not approved in the manifest.`);
  }
  if (config.testEnvironment === 'production' && !manifest.productionWriteApproved) {
    return blocked(testCase.testId, 'Production write approval is missing.');
  }

  return {
    testId: testCase.testId,
    allowed: true,
    classification: 'approved-write',
    reason: 'Test ID and action category are explicitly approved.'
  };
}

function blocked(testId: string, reason: string): ApprovalDecision {
  return { testId, allowed: false, classification: 'blocked', reason };
}

