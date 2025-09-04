import * as core from "@actions/core";
import * as github from "@actions/github";
import conventionalCommitsParser from "conventional-commits-parser";

// Mock the modules
jest.mock("@actions/core");
jest.mock("@actions/github");
jest.mock("conventional-commits-parser");

describe("Integration Tests - GitHub Conventional Commit Enforcer", () => {
  let mockOctokit;
  let mockContext;
  let mockCore;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock core module
    mockCore = {
      getInput: jest.fn(),
      setFailed: jest.fn(),
      setOutput: jest.fn(),
      info: jest.fn(),
    };
    core.getInput = mockCore.getInput;
    core.setFailed = mockCore.setFailed;
    core.setOutput = mockCore.setOutput;
    core.info = mockCore.info;

    // Mock GitHub context
    mockContext = {
      eventName: "pull_request",
      repo: {
        owner: "test-owner",
        repo: "test-repo",
      },
      issue: {
        number: 123,
      },
    };
    github.context = mockContext;

    // Mock octokit
    mockOctokit = {
      rest: {
        pulls: {
          get: jest.fn(),
        },
      },
    };
    github.getOctokit = jest.fn().mockReturnValue(mockOctokit);

    // Mock conventional commits parser
    conventionalCommitsParser.sync = jest.fn();
  });

  describe("Complete workflow scenarios", () => {
    it("should handle a complete valid PR workflow", async () => {
      // Arrange - Simulate a complete valid PR
      mockCore.getInput
        .mockReturnValueOnce("test-token")
        .mockReturnValueOnce("main")
        .mockReturnValueOnce(
          "feat,fix,docs,style,refactor,perf,test,build,ci,chore,revert"
        );

      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "feat(auth): add user authentication system",
          base: { ref: "main" },
        },
      });

      conventionalCommitsParser.sync.mockReturnValue({
        type: "feat",
        subject: "add user authentication system",
        scope: "auth",
      });

      // Act
      const index = await import("../src/index.js");
      await index.run();

      // Assert - Complete workflow validation
      expect(mockCore.getInput).toHaveBeenCalledWith("token", {
        required: true,
      });
      expect(mockCore.getInput).toHaveBeenCalledWith("target-branch");
      expect(mockCore.getInput).toHaveBeenCalledWith("allowed-types");
      expect(mockOctokit.rest.pulls.get).toHaveBeenCalledWith({
        owner: "test-owner",
        repo: "test-repo",
        pull_number: 123,
      });
      expect(mockCore.info).toHaveBeenCalledWith(
        'Validating PR title: "feat(auth): add user authentication system"'
      );
      expect(mockCore.setOutput).toHaveBeenCalledWith("valid", "true");
      expect(mockCore.setOutput).toHaveBeenCalledWith("total-commits", "1");
      expect(mockCore.info).toHaveBeenCalledWith(
        "✅ PR title follows conventional commit format: feat(auth): add user authentication system"
      );
    });

    it("should handle a complete invalid PR workflow", async () => {
      // Arrange - Simulate a complete invalid PR
      mockCore.getInput
        .mockReturnValueOnce("test-token")
        .mockReturnValueOnce("main")
        .mockReturnValueOnce(
          "feat,fix,docs,style,refactor,perf,test,build,ci,chore,revert"
        );

      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "Add new feature without conventional format",
          base: { ref: "main" },
        },
      });

      conventionalCommitsParser.sync.mockReturnValue({
        type: null,
        subject: null,
      });

      // Act
      const index = await import("../src/index.js");
      await index.run();

      // Assert - Complete workflow validation
      expect(mockCore.setOutput).toHaveBeenCalledWith("valid", "false");
      expect(mockCore.setOutput).toHaveBeenCalledWith(
        "invalid-commits",
        JSON.stringify([
          {
            title: "Add new feature without conventional format",
            reason: "PR title does not follow conventional commit format",
          },
        ])
      );
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        'PR title "Add new feature without conventional format" does not follow conventional commit format!'
      );
    });

    it("should handle PR targeting different branch", async () => {
      // Arrange - PR targeting develop instead of main
      mockCore.getInput
        .mockReturnValueOnce("test-token")
        .mockReturnValueOnce("main")
        .mockReturnValueOnce("feat,fix,docs");

      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "feat: add new feature",
          base: { ref: "develop" },
        },
      });

      // Act
      const index = await import("../src/index.js");
      await index.run();

      // Assert
      expect(mockCore.info).toHaveBeenCalledWith(
        "PR targets develop, not main. Skipping validation."
      );
      expect(mockCore.setOutput).not.toHaveBeenCalledWith(
        "valid",
        expect.any(String)
      );
    });

    it("should handle disallowed commit type", async () => {
      // Arrange - PR with disallowed type
      mockCore.getInput
        .mockReturnValueOnce("test-token")
        .mockReturnValueOnce("main")
        .mockReturnValueOnce("feat,fix"); // Only allow feat and fix

      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "docs: update documentation",
          base: { ref: "main" },
        },
      });

      conventionalCommitsParser.sync.mockReturnValue({
        type: "docs",
        subject: "update documentation",
      });

      // Act
      const index = await import("../src/index.js");
      await index.run();

      // Assert
      expect(mockCore.setOutput).toHaveBeenCalledWith("valid", "false");
      expect(mockCore.setOutput).toHaveBeenCalledWith(
        "invalid-commits",
        JSON.stringify([
          {
            title: "docs: update documentation",
            reason: "Type 'docs' is not allowed. Allowed types: feat, fix",
          },
        ])
      );
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        "PR title \"docs: update documentation\" uses disallowed type 'docs'!"
      );
    });
  });

  describe("Real-world commit type scenarios", () => {
    beforeEach(() => {
      mockCore.getInput
        .mockReturnValueOnce("test-token")
        .mockReturnValueOnce("main")
        .mockReturnValueOnce(
          "feat,fix,docs,style,refactor,perf,test,build,ci,chore,revert"
        );
    });

    it("should handle feat commits", async () => {
      // Arrange
      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "feat: add new user dashboard",
          base: { ref: "main" },
        },
      });

      conventionalCommitsParser.sync.mockReturnValue({
        type: "feat",
        subject: "add new user dashboard",
      });

      // Act
      const index = await import("../src/index.js");
      await index.run();

      // Assert
      expect(mockCore.setOutput).toHaveBeenCalledWith("valid", "true");
    });

    it("should handle fix commits", async () => {
      // Arrange
      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "fix: resolve memory leak in user service",
          base: { ref: "main" },
        },
      });

      conventionalCommitsParser.sync.mockReturnValue({
        type: "fix",
        subject: "resolve memory leak in user service",
      });

      // Act
      const index = await import("../src/index.js");
      await index.run();

      // Assert
      expect(mockCore.setOutput).toHaveBeenCalledWith("valid", "true");
    });

    it("should handle docs commits", async () => {
      // Arrange
      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "docs: update API documentation",
          base: { ref: "main" },
        },
      });

      conventionalCommitsParser.sync.mockReturnValue({
        type: "docs",
        subject: "update API documentation",
      });

      // Act
      const index = await import("../src/index.js");
      await index.run();

      // Assert
      expect(mockCore.setOutput).toHaveBeenCalledWith("valid", "true");
    });

    it("should handle style commits", async () => {
      // Arrange
      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "style: fix code formatting issues",
          base: { ref: "main" },
        },
      });

      conventionalCommitsParser.sync.mockReturnValue({
        type: "style",
        subject: "fix code formatting issues",
      });

      // Act
      const index = await import("../src/index.js");
      await index.run();

      // Assert
      expect(mockCore.setOutput).toHaveBeenCalledWith("valid", "true");
    });

    it("should handle refactor commits", async () => {
      // Arrange
      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "refactor: restructure user authentication module",
          base: { ref: "main" },
        },
      });

      conventionalCommitsParser.sync.mockReturnValue({
        type: "refactor",
        subject: "restructure user authentication module",
      });

      // Act
      const index = await import("../src/index.js");
      await index.run();

      // Assert
      expect(mockCore.setOutput).toHaveBeenCalledWith("valid", "true");
    });

    it("should handle perf commits", async () => {
      // Arrange
      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "perf: optimize database queries",
          base: { ref: "main" },
        },
      });

      conventionalCommitsParser.sync.mockReturnValue({
        type: "perf",
        subject: "optimize database queries",
      });

      // Act
      const index = await import("../src/index.js");
      await index.run();

      // Assert
      expect(mockCore.setOutput).toHaveBeenCalledWith("valid", "true");
    });

    it("should handle test commits", async () => {
      // Arrange
      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "test: add unit tests for user service",
          base: { ref: "main" },
        },
      });

      conventionalCommitsParser.sync.mockReturnValue({
        type: "test",
        subject: "add unit tests for user service",
      });

      // Act
      const index = await import("../src/index.js");
      await index.run();

      // Assert
      expect(mockCore.setOutput).toHaveBeenCalledWith("valid", "true");
    });

    it("should handle build commits", async () => {
      // Arrange
      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "build: update webpack configuration",
          base: { ref: "main" },
        },
      });

      conventionalCommitsParser.sync.mockReturnValue({
        type: "build",
        subject: "update webpack configuration",
      });

      // Act
      const index = await import("../src/index.js");
      await index.run();

      // Assert
      expect(mockCore.setOutput).toHaveBeenCalledWith("valid", "true");
    });

    it("should handle ci commits", async () => {
      // Arrange
      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "ci: update GitHub Actions workflow",
          base: { ref: "main" },
        },
      });

      conventionalCommitsParser.sync.mockReturnValue({
        type: "ci",
        subject: "update GitHub Actions workflow",
      });

      // Act
      const index = await import("../src/index.js");
      await index.run();

      // Assert
      expect(mockCore.setOutput).toHaveBeenCalledWith("valid", "true");
    });

    it("should handle chore commits", async () => {
      // Arrange
      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "chore: update dependencies",
          base: { ref: "main" },
        },
      });

      conventionalCommitsParser.sync.mockReturnValue({
        type: "chore",
        subject: "update dependencies",
      });

      // Act
      const index = await import("../src/index.js");
      await index.run();

      // Assert
      expect(mockCore.setOutput).toHaveBeenCalledWith("valid", "true");
    });

    it("should handle revert commits", async () => {
      // Arrange
      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "revert: revert user authentication changes",
          base: { ref: "main" },
        },
      });

      conventionalCommitsParser.sync.mockReturnValue({
        type: "revert",
        subject: "revert user authentication changes",
      });

      // Act
      const index = await import("../src/index.js");
      await index.run();

      // Assert
      expect(mockCore.setOutput).toHaveBeenCalledWith("valid", "true");
    });
  });

  describe("Complex commit scenarios", () => {
    beforeEach(() => {
      mockCore.getInput
        .mockReturnValueOnce("test-token")
        .mockReturnValueOnce("main")
        .mockReturnValueOnce(
          "feat,fix,docs,style,refactor,perf,test,build,ci,chore,revert"
        );
    });

    it("should handle commits with scope and breaking change", async () => {
      // Arrange
      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "feat(auth)!: completely rewrite authentication system",
          base: { ref: "main" },
        },
      });

      conventionalCommitsParser.sync.mockReturnValue({
        type: "feat",
        subject: "completely rewrite authentication system",
        scope: "auth",
        breaking: true,
      });

      // Act
      const index = await import("../src/index.js");
      await index.run();

      // Assert
      expect(mockCore.setOutput).toHaveBeenCalledWith("valid", "true");
    });

    it("should handle commits with long descriptions", async () => {
      // Arrange
      const longDescription =
        "implement comprehensive user management system with role-based access control and audit logging";
      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: `feat: ${longDescription}`,
          base: { ref: "main" },
        },
      });

      conventionalCommitsParser.sync.mockReturnValue({
        type: "feat",
        subject: longDescription,
      });

      // Act
      const index = await import("../src/index.js");
      await index.run();

      // Assert
      expect(mockCore.setOutput).toHaveBeenCalledWith("valid", "true");
    });

    it("should handle commits with special characters", async () => {
      // Arrange
      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "fix: resolve issue with \"quoted\" strings and 'apostrophes'",
          base: { ref: "main" },
        },
      });

      conventionalCommitsParser.sync.mockReturnValue({
        type: "fix",
        subject: "resolve issue with \"quoted\" strings and 'apostrophes'",
      });

      // Act
      const index = await import("../src/index.js");
      await index.run();

      // Assert
      expect(mockCore.setOutput).toHaveBeenCalledWith("valid", "true");
    });

    it("should handle commits with numbers and symbols", async () => {
      // Arrange
      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "feat: add support for API v2.0 endpoints",
          base: { ref: "main" },
        },
      });

      conventionalCommitsParser.sync.mockReturnValue({
        type: "feat",
        subject: "add support for API v2.0 endpoints",
      });

      // Act
      const index = await import("../src/index.js");
      await index.run();

      // Assert
      expect(mockCore.setOutput).toHaveBeenCalledWith("valid", "true");
    });
  });

  describe("Error scenarios", () => {
    it("should handle GitHub API rate limiting", async () => {
      // Arrange
      mockCore.getInput.mockReturnValue("test-token");
      mockOctokit.rest.pulls.get.mockRejectedValue(
        new Error("API rate limit exceeded")
      );

      // Act
      const index = await import("../src/index.js");
      await index.run();

      // Assert
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        "Action failed: API rate limit exceeded"
      );
    });

    it("should handle network connectivity issues", async () => {
      // Arrange
      mockCore.getInput.mockReturnValue("test-token");
      mockOctokit.rest.pulls.get.mockRejectedValue(new Error("Network error"));

      // Act
      const index = await import("../src/index.js");
      await index.run();

      // Assert
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        "Action failed: Network error"
      );
    });

    it("should handle invalid GitHub token", async () => {
      // Arrange
      mockCore.getInput.mockReturnValue("invalid-token");
      mockOctokit.rest.pulls.get.mockRejectedValue(
        new Error("Bad credentials")
      );

      // Act
      const index = await import("../src/index.js");
      await index.run();

      // Assert
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        "Action failed: Bad credentials"
      );
    });

    it("should handle PR not found", async () => {
      // Arrange
      mockCore.getInput.mockReturnValue("test-token");
      mockOctokit.rest.pulls.get.mockRejectedValue(new Error("Not Found"));

      // Act
      const index = await import("../src/index.js");
      await index.run();

      // Assert
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        "Action failed: Not Found"
      );
    });
  });
});
