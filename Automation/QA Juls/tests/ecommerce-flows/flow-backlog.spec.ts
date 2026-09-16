import { test } from '../../fixtures/qa-test';
import { ecommerceScenarioBacklog } from '../../data/ecommerce-scenarios';

const futureFlowScenarios = ecommerceScenarioBacklog.filter((scenario) => scenario.flow !== 'signup');

test.describe('Ecommerce flow automation backlog', () => {
  for (const scenario of futureFlowScenarios) {
    test.skip(`${scenario.id} ${scenario.title}`, async () => {
      /*
       * This skipped test keeps the future coverage visible in Playwright reports
       * without pretending the selector/data strategy for each flow is complete.
       */
    });
  }
});
