#!/usr/bin/env node

const { execSync } = require("child_process");
const conventionalCommitsParser = require("conventional-commits-parser");

// Get the base and head commits for the PR
const baseRef = process.env.GITHUB_BASE_REF || "main";
const headRef = process.env.GITHUB_HEAD_REF || "HEAD";

try {
  // Get all commits between base and head
  const commits = execSync(`git log --oneline ${baseRef}..${headRef}`, {
    encoding: "utf8",
  });

  if (!commits.trim()) {
    console.log("No commits to validate");
    process.exit(0);
  }

  const commitLines = commits.trim().split("\n");
  let hasInvalidCommits = false;
  const invalidCommits = [];

  for (const line of commitLines) {
    const [hash, ...messageParts] = line.split(" ");
    const message = messageParts.join(" ");

    // Parse the commit message using conventional-commits-parser
    const parsed = conventionalCommitsParser(message);

    // Check if it's a conventional commit
    if (!parsed.type || !parsed.subject) {
      hasInvalidCommits = true;
      invalidCommits.push({ hash, message });
      console.error(`❌ Invalid commit: ${hash} - ${message}`);
    } else {
      console.log(`✅ Valid commit: ${hash} - ${message}`);
    }
  }

  if (hasInvalidCommits) {
    console.error("\n❌ Conventional commits validation failed!");
    console.error(
      "The following commits do not follow conventional commit format:"
    );
    invalidCommits.forEach((commit) => {
      console.error(`  ${commit.hash}: ${commit.message}`);
    });
    console.error(
      "\nPlease update your commits to follow the conventional commit format."
    );
    console.error("Format: type(scope): description");
    console.error(
      "Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert"
    );
    process.exit(1);
  } else {
    console.log("\n✅ All commits follow conventional commit format!");
    process.exit(0);
  }
} catch (error) {
  console.error("Error validating commits:", error.message);
  process.exit(1);
}
