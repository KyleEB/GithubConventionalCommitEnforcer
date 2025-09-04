const core = require("@actions/core");
const github = require("@actions/github");
const { execSync } = require("child_process");
const conventionalCommitsParser = require("conventional-commits-parser");

// another bad commit test

async function run() {
  try {
    // Get inputs
    const token = core.getInput("token", { required: true });
    const targetBranch = core.getInput("target-branch") || "main";
    const allowedTypes =
      core.getInput("allowed-types") ||
      "feat,fix,docs,style,refactor,perf,test,build,ci,chore,revert";
    const strictMode = core.getInput("strict-mode") === "true";
    const commentOnSuccess = core.getInput("comment-on-success") === "true";

    const allowedTypesArray = allowedTypes
      .split(",")
      .map((type) => type.trim());

    // Initialize GitHub client
    const octokit = github.getOctokit(token);
    const context = github.context;

    // Check if this is a push to the target branch (merge commit)
    if (
      context.eventName === "push" &&
      context.ref === `refs/heads/${targetBranch}`
    ) {
      await validateMergeCommits(
        octokit,
        context,
        allowedTypesArray,
        commentOnSuccess
      );
    } else if (context.eventName === "pull_request") {
      // For PRs, validate the merge commit that would be created
      await validatePRMergeCommit(
        octokit,
        context,
        targetBranch,
        allowedTypesArray,
        commentOnSuccess
      );
    } else {
      core.info(
        `Event ${context.eventName} not supported. This action only works on pushes to ${targetBranch} and pull requests.`
      );
      return;
    }
  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

async function validateMergeCommits(
  octokit,
  context,
  allowedTypes,
  commentOnSuccess
) {
  // Get the commits that were just pushed (not all commits on the branch)
  const { data: commits } = await octokit.rest.repos.compareCommits({
    owner: context.repo.owner,
    repo: context.repo.repo,
    base: context.payload.before,
    head: context.sha,
  });

  if (!commits.commits || commits.commits.length === 0) {
    core.info("No commits to validate");
    core.setOutput("valid", "true");
    core.setOutput("total-commits", "0");
    return;
  }

  let hasInvalidCommits = false;
  const invalidCommits = [];
  const validCommits = [];

  // Validate each commit
  for (const commit of commits.commits) {
    const message = commit.commit.message;
    const parsed = conventionalCommitsParser.sync(message);

    // Check if it's a conventional commit
    if (!parsed.type || !parsed.subject) {
      hasInvalidCommits = true;
      invalidCommits.push({
        sha: commit.sha,
        message: message.split("\n")[0],
        fullMessage: message,
      });
      core.error(
        `❌ Invalid commit: ${commit.sha.substring(0, 7)} - ${
          message.split("\n")[0]
        }`
      );
    } else {
      // Check if type is allowed
      if (!allowedTypes.includes(parsed.type)) {
        hasInvalidCommits = true;
        invalidCommits.push({
          sha: commit.sha,
          message: message.split("\n")[0],
          fullMessage: message,
          reason: `Type '${
            parsed.type
          }' is not allowed. Allowed types: ${allowedTypes.join(", ")}`,
        });
        core.error(
          `❌ Disallowed type: ${commit.sha.substring(0, 7)} - ${
            message.split("\n")[0]
          } (type: ${parsed.type})`
        );
      } else {
        validCommits.push({
          sha: commit.sha,
          message: message.split("\n")[0],
          type: parsed.type,
          scope: parsed.scope,
          subject: parsed.subject,
        });
        core.info(
          `✅ Valid commit: ${commit.sha.substring(0, 7)} - ${
            message.split("\n")[0]
          }`
        );
      }
    }
  }

  // Set outputs
  core.setOutput("valid", (!hasInvalidCommits).toString());
  core.setOutput("total-commits", commits.commits.length.toString());
  core.setOutput("invalid-commits", JSON.stringify(invalidCommits));

  if (hasInvalidCommits) {
    core.setFailed(
      "Conventional commits validation failed on merge to target branch!"
    );
  } else {
    core.info("✅ All merge commits follow conventional commit format!");
  }
}

async function validatePRMergeCommit(
  octokit,
  context,
  targetBranch,
  allowedTypes,
  commentOnSuccess
) {
  // Get PR information
  const { data: pr } = await octokit.rest.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: context.issue.number,
  });

  // Only validate if PR targets the protected branch
  if (pr.base.ref !== targetBranch) {
    core.info(
      `PR targets ${pr.base.ref}, not ${targetBranch}. Skipping validation.`
    );
    return;
  }

  // Get commits that would be merged
  const { data: commits } = await octokit.rest.pulls.listCommits({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: context.issue.number,
  });

  if (commits.length === 0) {
    core.info("No commits to validate");
    core.setOutput("valid", "true");
    core.setOutput("total-commits", "0");
    return;
  }

  let hasInvalidCommits = false;
  const invalidCommits = [];
  const validCommits = [];

  // Validate each commit
  for (const commit of commits) {
    const message = commit.commit.message;
    const parsed = conventionalCommitsParser.sync(message);

    // Check if it's a conventional commit
    if (!parsed.type || !parsed.subject) {
      hasInvalidCommits = true;
      invalidCommits.push({
        sha: commit.sha,
        message: message.split("\n")[0],
        fullMessage: message,
      });
      core.error(
        `❌ Invalid commit: ${commit.sha.substring(0, 7)} - ${
          message.split("\n")[0]
        }`
      );
    } else {
      // Check if type is allowed
      if (!allowedTypes.includes(parsed.type)) {
        hasInvalidCommits = true;
        invalidCommits.push({
          sha: commit.sha,
          message: message.split("\n")[0],
          fullMessage: message,
          reason: `Type '${
            parsed.type
          }' is not allowed. Allowed types: ${allowedTypes.join(", ")}`,
        });
        core.error(
          `❌ Disallowed type: ${commit.sha.substring(0, 7)} - ${
            message.split("\n")[0]
          } (type: ${parsed.type})`
        );
      } else {
        validCommits.push({
          sha: commit.sha,
          message: message.split("\n")[0],
          type: parsed.type,
          scope: parsed.scope,
          subject: parsed.subject,
        });
        core.info(
          `✅ Valid commit: ${commit.sha.substring(0, 7)} - ${
            message.split("\n")[0]
          }`
        );
      }
    }
  }

  // Set outputs
  core.setOutput("valid", (!hasInvalidCommits).toString());
  core.setOutput("total-commits", commits.length.toString());
  core.setOutput("invalid-commits", JSON.stringify(invalidCommits));

  // Create PR comment
  if (hasInvalidCommits || commentOnSuccess) {
    const commentBody = hasInvalidCommits
      ? createFailureComment(invalidCommits, allowedTypes)
      : createSuccessComment(validCommits, allowedTypes);

    await octokit.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.issue.number,
      body: commentBody,
    });
  }

  if (hasInvalidCommits) {
    core.setFailed(
      "Conventional commits validation failed! This PR cannot be merged to the protected branch."
    );
  } else {
    core.info("✅ All commits follow conventional commit format!");
  }
}

function createFailureComment(invalidCommits, allowedTypes) {
  const commitList = invalidCommits
    .map((commit) => {
      const reason = commit.reason ? ` (${commit.reason})` : "";
      return `- \`${commit.sha.substring(0, 7)}\`: ${commit.message}${reason}`;
    })
    .join("\n");

  return `## ❌ Conventional Commits Required

This PR contains commits that don't follow conventional commit format. Please update the following commits:

${commitList}

### Conventional Commit Format
Commits must follow this pattern:
\`\`\`
type(scope): description

[optional body]

[optional footer]
\`\`\`

**Allowed Types:** ${allowedTypes.join(", ")}

**Examples:**
- \`feat: add new user authentication\`
- \`fix(auth): resolve login validation issue\`
- \`docs: update API documentation\`
- \`chore: update dependencies\`

Please amend your commits using \`git commit --amend\` or create new commits with the correct format.`;
}

function createSuccessComment(validCommits, allowedTypes) {
  const commitSummary = validCommits
    .map((commit) => {
      const scope = commit.scope ? `(${commit.scope})` : "";
      return `- \`${commit.sha.substring(0, 7)}\`: ${commit.type}${scope}: ${
        commit.subject
      }`;
    })
    .join("\n");

  return `## ✅ Conventional Commits Validation Passed

All commits in this PR follow the conventional commit format:

${commitSummary}

**Allowed Types:** ${allowedTypes.join(", ")}

Great job maintaining clean commit history! 🎉`;
}

// Run the action
run();
