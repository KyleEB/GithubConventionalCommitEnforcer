const core = require("@actions/core");
const github = require("@actions/github");
const conventionalCommitsParser = require("conventional-commits-parser");

// bad commit test

async function run() {
  try {
    // Get inputs
    const token = core.getInput("token", { required: true });
    const targetBranch = core.getInput("target-branch") || "main";
    const allowedTypes =
      core.getInput("allowed-types") ||
      "feat,fix,docs,style,refactor,perf,test,build,ci,chore,revert";
    const commentOnSuccess = core.getInput("comment-on-success") === "true";

    const allowedTypesArray = allowedTypes
      .split(",")
      .map((type) => type.trim());

    // Initialize GitHub client
    const octokit = github.getOctokit(token);
    const context = github.context;

    // Only validate PRs targeting the protected branch
    if (context.eventName === "pull_request") {
      await validatePRTitle(
        octokit,
        context,
        targetBranch,
        allowedTypesArray,
        commentOnSuccess
      );
    } else {
      core.info(
        `Event ${context.eventName} not supported. This action only works on pull requests.`
      );
      return;
    }
  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

async function validatePRTitle(
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

  const prTitle = pr.title;
  core.info(`Validating PR title: "${prTitle}"`);

  // Parse the PR title as a conventional commit
  const parsed = conventionalCommitsParser.sync(prTitle);

  // Check if it's a conventional commit
  if (!parsed.type || !parsed.subject) {
    core.setOutput("valid", "false");
    core.setOutput(
      "invalid-commits",
      JSON.stringify([
        {
          title: prTitle,
          reason: "PR title does not follow conventional commit format",
        },
      ])
    );

    // Create PR comment
    const commentBody = createPRTitleFailureComment(prTitle, allowedTypes);
    await octokit.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.issue.number,
      body: commentBody,
    });

    core.setFailed(
      `PR title "${prTitle}" does not follow conventional commit format!`
    );
    return;
  }

  // Check if type is allowed
  if (!allowedTypes.includes(parsed.type)) {
    core.setOutput("valid", "false");
    core.setOutput(
      "invalid-commits",
      JSON.stringify([
        {
          title: prTitle,
          reason: `Type '${
            parsed.type
          }' is not allowed. Allowed types: ${allowedTypes.join(", ")}`,
        },
      ])
    );

    // Create PR comment
    const commentBody = createPRTitleFailureComment(
      prTitle,
      allowedTypes,
      `Type '${parsed.type}' is not allowed`
    );
    await octokit.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.issue.number,
      body: commentBody,
    });

    core.setFailed(
      `PR title "${prTitle}" uses disallowed type '${parsed.type}'!`
    );
    return;
  }

  // PR title is valid
  core.setOutput("valid", "true");
  core.setOutput("total-commits", "1");
  core.info(
    `✅ PR title follows conventional commit format: ${parsed.type}${
      parsed.scope ? `(${parsed.scope})` : ""
    }: ${parsed.subject}`
  );

  // Create success comment if requested
  if (commentOnSuccess) {
    const commentBody = createPRTitleSuccessComment(
      prTitle,
      parsed,
      allowedTypes
    );
    await octokit.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.issue.number,
      body: commentBody,
    });
  }
}

function createPRTitleFailureComment(
  prTitle,
  allowedTypes,
  specificReason = null
) {
  const reason =
    specificReason || "PR title does not follow conventional commit format";

  return `## ❌ Conventional Commit Required

Your PR title **"${prTitle}"** ${reason.toLowerCase()}.

### Conventional Commit Format
PR titles must follow this pattern:
\`\`\`
type(scope): description
\`\`\`

**Allowed Types:** ${allowedTypes.join(", ")}

**Examples:**
- \`feat: add user authentication\`
- \`fix(auth): resolve login validation issue\`
- \`docs: update API documentation\`
- \`chore: update dependencies\`

### How to Fix
1. **Edit your PR title** to follow the conventional commit format
2. **Use Squash and Merge** when merging (this will use your PR title as the commit message)
3. **Ensure branch protection** requires "Conventional Commits Check" status check

The PR title will become the commit message when you squash merge! 🎯`;
}

function createPRTitleSuccessComment(prTitle, parsed, allowedTypes) {
  const scope = parsed.scope ? `(${parsed.scope})` : "";

  return `## ✅ Conventional Commit Validated

Your PR title **"${prTitle}"** follows the conventional commit format perfectly!

**Parsed as:** \`${parsed.type}${scope}: ${parsed.subject}\`

**Allowed Types:** ${allowedTypes.join(", ")}

When you **Squash and Merge** this PR, the commit message will be: \`${prTitle}\`

Great job maintaining clean commit history! 🎉`;
}

// Run the action
run();
