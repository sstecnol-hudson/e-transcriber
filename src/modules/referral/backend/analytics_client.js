// src/modules/referral/backend/analytics_client.js
// Sends learning data to a GitHub repository using GraphQL mutations.
// Uses the personal access token provided by the user (GITHUB_TOKEN).

// You can set the token via an environment variable or directly in the constant below.
// For security, prefer the .env approach (require('dotenv').config()).

// src/modules/referral/backend/config.js provides configuration values
import { GITHUB_TOKEN, REPO_OWNER, REPO_NAME, TARGET_PATH, DEFAULT_BRANCH } from "./config.js";


/**
 * Helper to perform a GraphQL request to the GitHub API.
 * @param {string} query GraphQL query or mutation string.
 * @param {object} variables Variables object.
 */
async function githubGraphQL(query, variables = {}) {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`GitHub GraphQL request failed: ${response.status} ${txt}`);
  }
  const result = await response.json();
  if (result.errors) {
    throw new Error(`GitHub GraphQL errors: ${JSON.stringify(result.errors)}`);
  }
  return result.data;
}

/**
 * Retrieves the latest commit OID (sha) of the default branch.
 */
async function getHeadOid() {
  const query = `
    query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        defaultBranchRef {
          name
          target {
            ... on Commit { oid }
          }
        }
      }
    }
  `;
  const data = await githubGraphQL(query, { owner: REPO_OWNER, name: REPO_NAME });
  return data.repository.defaultBranchRef.target.oid;
}

/**
 * Sends the learning JSON payload to the repo, creating or updating the target file.
 * @param {string} jsonString JSON string to be stored.
 * @returns {{status:string, message?:string}}
 */
export async function sendLearningData(jsonString) {
  try {
    const headOid = await getHeadOid();
    const contentBase64 = btoa(unescape(encodeURIComponent(jsonString)));
    const mutation = `
      mutation($input: CreateCommitOnBranchInput!) {
        createCommitOnBranch(input: $input) {
          commit { oid }
        }
      }
    `;
    const input = {
      branch: { repositoryNameWithOwner: `${REPO_OWNER}/${REPO_NAME}`, branchName: DEFAULT_BRANCH },
      message: { headline: "Add learning data (auto)" },
      expectedHeadOid: headOid,
      fileChanges: {
        additions: [{
          path: TARGET_PATH,
          contents: contentBase64,
        }],
      },
    };
    await githubGraphQL(mutation, { input });
    return { status: "ok" };
  } catch (err) {
    console.error("Analytics send error:", err);
    return { status: "error", message: err.message };
  }
}
