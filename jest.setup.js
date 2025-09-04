// Jest setup file for mocking GitHub Actions environment
process.env.GITHUB_TOKEN = "test-token";
process.env.GITHUB_REPOSITORY = "test-owner/test-repo";
process.env.GITHUB_EVENT_NAME = "pull_request";
process.env.GITHUB_HEAD_REF = "feature-branch";
process.env.GITHUB_BASE_REF = "main";
