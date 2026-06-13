// test/analytics_client.test.js
/** @jest-environment jsdom */
import { sendLearningData } from "../src/modules/referral/backend/analytics_client.js";

// Mock fetch globally — response must satisfy both GraphQL calls:
// 1. getHeadOid  → data.repository.defaultBranchRef.target.oid
// 2. createCommitOnBranch → data.createCommitOnBranch.commit.oid
global.fetch = jest.fn(() => Promise.resolve({
  ok: true,
  json: async () => ({
    data: {
      repository: {
        defaultBranchRef: {
          name: "main",
          target: { oid: "abc123" }
        }
      },
      createCommitOnBranch: {
        commit: { oid: "def456" }
      }
    }
  })
}));

describe('Analytics client', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('sendLearningData sends request and returns ok', async () => {
    const payload = JSON.stringify({ test: true });
    const result = await sendLearningData(payload);
    // 2 fetch calls: one for getHeadOid query, one for the commit mutation
    expect(fetch).toHaveBeenCalledTimes(2);
    const args = fetch.mock.calls[0];
    expect(args[0]).toBe('https://api.github.com/graphql');
    const options = args[1];
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.headers['Authorization']).toMatch(/^Bearer /);
    expect(result).toEqual({ status: 'ok' });
  });
});
