import * as core from "@actions/core";
import * as github from "@actions/github";
import conventionalCommitsParser from "conventional-commits-parser";

// Mock the modules
jest.mock("@actions/core");
jest.mock("@actions/github");
jest.mock("conventional-commits-parser");

// Import the module under test after mocking
import * as index from "../index.js";

describe("GitHub Conventional Commit Enforcer", () => {
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

  describe("run function", () => {
    it("should validate PR title when event is pull_request", async () => {
      // Arrange
      mockCore.getInput
        .mockReturnValueOnce("test-token") // token
        .mockReturnValueOnce("main") // target-branch
        .mockReturnValueOnce("feat,fix,docs"); // allowed-types

      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "feat: add new feature",
          base: { ref: "main" },
        },
      });

      conventionalCommitsParser.sync.mockReturnValue({
        type: "feat",
        subject: "add new feature",
        scope: null,
      });

      // Act
      await index.run();

      // Assert
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
    });

    it("should skip validation for non-pull_request events", async () => {
      // Arrange
      mockContext.eventName = "push";
      mockCore.getInput.mockReturnValue("test-token");

      // Act
      await index.run();

      // Assert
      expect(mockCore.info).toHaveBeenCalledWith(
        "Event push not supported. This action only works on pull requests."
      );
      expect(mockOctokit.rest.pulls.get).not.toHaveBeenCalled();
    });

    it("should handle missing token input", async () => {
      // Arrange
      mockCore.getInput.mockImplementation((name) => {
        if (name === "token") {
          throw new Error("Input required and not supplied: token");
        }
        return "main";
      });

      // Act
      await index.run();

      // Assert
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        "Action failed: Input required and not supplied: token"
      );
    });

    it("should use default values for optional inputs", async () => {
      // Arrange
      mockCore.getInput
        .mockReturnValueOnce("test-token") // token
        .mockReturnValueOnce(undefined) // target-branch (should default to 'main')
        .mockReturnValueOnce(undefined); // allowed-types (should use default)

      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "feat: add new feature",
          base: { ref: "main" },
        },
      });

      conventionalCommitsParser.sync.mockReturnValue({
        type: "feat",
        subject: "add new feature",
      });

      // Act
      await index.run();

      // Assert
      expect(mockCore.getInput).toHaveBeenCalledWith("target-branch");
      expect(mockCore.getInput).toHaveBeenCalledWith("allowed-types");
    });

    it("should handle GitHub API errors", async () => {
      // Arrange
      mockCore.getInput.mockReturnValue("test-token");
      mockOctokit.rest.pulls.get.mockRejectedValue(new Error("API Error"));

      // Act
      await index.run();

      // Assert
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        "Action failed: API Error"
      );
    });
  });

  describe("validatePRTitle function", () => {
    beforeEach(() => {
      mockCore.getInput
        .mockReturnValueOnce("test-token") // token
        .mockReturnValueOnce("main") // target-branch
        .mockReturnValueOnce(
          "feat,fix,docs,style,refactor,perf,test,build,ci,chore,revert"
        ); // allowed-types
    });

    it("should validate a valid conventional commit PR title", async () => {
      // Arrange
      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "feat: add new feature",
          base: { ref: "main" },
        },
      });

      conventionalCommitsParser.sync.mockReturnValue({
        type: "feat",
        subject: "add new feature",
        scope: null,
      });

      // Act
      await index.run();

      // Assert
      expect(mockCore.setOutput).toHaveBeenCalledWith("valid", "true");
      expect(mockCore.setOutput).toHaveBeenCalledWith("total-commits", "1");
      expect(mockCore.info).toHaveBeenCalledWith(
        "✅ PR title follows conventional commit format: feat: add new feature"
      );
    });

    it("should validate a conventional commit with scope", async () => {
      // Arrange
      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "feat(auth): add user authentication",
          base: { ref: "main" },
        },
      });

      conventionalCommitsParser.sync.mockReturnValue({
        type: "feat",
        subject: "add user authentication",
        scope: "auth",
      });

      // Act
      await index.run();

      // Assert
      expect(mockCore.setOutput).toHaveBeenCalledWith("valid", "true");
      expect(mockCore.info).toHaveBeenCalledWith(
        "✅ PR title follows conventional commit format: feat(auth): add user authentication"
      );
    });

    it("should skip validation when PR targets different branch", async () => {
      // Arrange
      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "feat: add new feature",
          base: { ref: "develop" },
        },
      });

      // Act
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

    it("should fail for non-conventional commit format", async () => {
      // Arrange
      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "Add new feature",
          base: { ref: "main" },
        },
      });

      conventionalCommitsParser.sync.mockReturnValue({
        type: null,
        subject: null,
      });

      // Act
      await index.run();

      // Assert
      expect(mockCore.setOutput).toHaveBeenCalledWith("valid", "false");
      expect(mockCore.setOutput).toHaveBeenCalledWith(
        "invalid-commits",
        JSON.stringify([
          {
            title: "Add new feature",
            reason: "PR title does not follow conventional commit format",
          },
        ])
      );
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        'PR title "Add new feature" does not follow conventional commit format!'
      );
    });

    it("should fail for disallowed commit type", async () => {
      // Arrange
      mockCore.getInput.mockReset();
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

    it("should handle allowed types with spaces and trim them", async () => {
      // Arrange
      mockCore.getInput.mockReset();
      mockCore.getInput
        .mockReturnValueOnce("test-token")
        .mockReturnValueOnce("main")
        .mockReturnValueOnce("feat, fix, docs "); // Types with spaces

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
      await index.run();

      // Assert
      expect(mockCore.setOutput).toHaveBeenCalledWith("valid", "true");
    });

    it("should handle conventional commit with breaking change", async () => {
      // Arrange
      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "feat!: breaking change",
          base: { ref: "main" },
        },
      });

      conventionalCommitsParser.sync.mockReturnValue({
        type: "feat",
        subject: "breaking change",
        breaking: true,
      });

      // Act
      await index.run();

      // Assert
      expect(mockCore.setOutput).toHaveBeenCalledWith("valid", "true");
    });

    it("should handle conventional commit with footer", async () => {
      // Arrange
      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "fix: resolve issue\n\nCloses #123",
          base: { ref: "main" },
        },
      });

      // Act
      await index.run();

      // Assert
      expect(mockCore.setOutput).toHaveBeenCalledWith("valid", "true");
    });

    it("should log PR title being validated", async () => {
      // Arrange
      const prTitle = "feat: add new feature";
      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: prTitle,
          base: { ref: "main" },
        },
      });

      conventionalCommitsParser.sync.mockReturnValue({
        type: "feat",
        subject: "add new feature",
      });

      // Act
      await index.run();

      // Assert
      expect(mockCore.info).toHaveBeenCalledWith(
        `Validating PR title: "${prTitle}"`
      );
    });
  });

  describe("Edge cases and error handling", () => {
    beforeEach(() => {
      mockCore.getInput
        .mockReturnValueOnce("test-token") // token
        .mockReturnValueOnce("main") // target-branch
        .mockReturnValueOnce(
          "feat,fix,docs,style,refactor,perf,test,build,ci,chore,revert"
        ); // allowed-types
    });

    it("should handle empty PR title", async () => {
      // Arrange
      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "",
          base: { ref: "main" },
        },
      });

      conventionalCommitsParser.sync.mockReturnValue({
        type: null,
        subject: null,
      });

      // Act
      await index.run();

      // Assert
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        'PR title "" does not follow conventional commit format!'
      );
    });

    it("should handle PR title with only type", async () => {
      // Arrange
      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "feat",
          base: { ref: "main" },
        },
      });

      conventionalCommitsParser.sync.mockReturnValue({
        type: "feat",
        subject: null,
      });

      // Act
      await index.run();

      // Assert
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        'PR title "feat" does not follow conventional commit format!'
      );
    });

    it("should handle PR title with only subject", async () => {
      // Arrange
      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "add new feature",
          base: { ref: "main" },
        },
      });

      conventionalCommitsParser.sync.mockReturnValue({
        type: null,
        subject: "add new feature",
      });

      // Act
      await index.run();

      // Assert
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        'PR title "add new feature" does not follow conventional commit format!'
      );
    });

    it("should handle case sensitivity in commit types", async () => {
      // Arrange
      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: "Feat: add new feature",
          base: { ref: "main" },
        },
      });

      // Act
      await index.run();

      // Assert - case-insensitive matching should allow "Feat" as it matches "feat"
      expect(mockCore.setOutput).toHaveBeenCalledWith("valid", "true");
    });

    it("should handle very long PR titles", async () => {
      // Arrange
      const longTitle = `feat: ${"a".repeat(1000)}`;
      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          title: longTitle,
          base: { ref: "main" },
        },
      });

      conventionalCommitsParser.sync.mockReturnValue({
        type: "feat",
        subject: "a".repeat(1000),
      });

      // Act
      await index.run();

      // Assert
      expect(mockCore.setOutput).toHaveBeenCalledWith("valid", "true");
    });
  });
});
