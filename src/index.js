import * as core from "@actions/core";
import * as github from "@actions/github";

async function run() {
  try {
    // Get inputs
    const token = core.getInput("token", { required: true });
    const targetBranch = core.getInput("target-branch") || "main";
    const allowedTypes =
      core.getInput("allowed-types") ||
      "feat,fix,docs,style,refactor,perf,test,build,ci,chore,revert";

    const allowedTypesArray = allowedTypes
      .split(",")
      .map((type) => type.trim());

    // Initialize GitHub client
    const octokit = github.getOctokit(token);
    const context = github.context;

    // Only validate PRs targeting the protected branch
    if (context.eventName === "pull_request") {
      await validatePRTitle(octokit, context, targetBranch, allowedTypesArray);
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

async function validatePRTitle(octokit, context, targetBranch, allowedTypes) {
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

  // Parse the PR title as a conventional commit using regex
  // Format: type(scope): description or type: description
  // Handle multi-line titles by taking only the first line
  const firstLine = prTitle.split("\n")[0];
  const conventionalCommitRegex =
    /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?(!)?:\s+(.+)$/i;
  const match = firstLine.match(conventionalCommitRegex);

  if (!match) {
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

    core.setFailed(
      `PR title "${prTitle}" does not follow conventional commit format!`
    );
    return;
  }

  // Extract components from regex match
  const originalType = match[1]; // Keep original case for error messages
  const type = originalType.toLowerCase(); // Normalize to lowercase for comparison
  const scope = match[2] ? match[2].slice(1, -1) : null; // Remove parentheses
  const subject = match[4];

  // Check if type is allowed
  if (!allowedTypes.includes(type)) {
    core.setOutput("valid", "false");
    core.setOutput(
      "invalid-commits",
      JSON.stringify([
        {
          title: prTitle,
          reason: `Type '${originalType}' is not allowed. Allowed types: ${allowedTypes.join(
            ", "
          )}`,
        },
      ])
    );

    core.setFailed(
      `PR title "${prTitle}" uses disallowed type '${originalType}'!`
    );
    return;
  }

  // PR title is valid
  core.setOutput("valid", "true");
  core.setOutput("total-commits", "1");
  core.info(
    `✅ PR title follows conventional commit format: ${type}${
      scope ? `(${scope})` : ""
    }: ${subject}`
  );
}

// Export the run function for testing
export { run };

// Run the action
run();
