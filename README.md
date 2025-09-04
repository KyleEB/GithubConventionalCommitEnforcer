# GitHub Conventional Commit Enforcer

A GitHub Action that enforces conventional commits on merges to protected branches like `main`. This action ensures that all commits merged to your target branch follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

## Features

- ✅ Validates all commits in pull requests
- 🚫 Blocks merges with non-conventional commits
- 💬 Provides helpful feedback on PR comments
- 🔧 Easy to configure and customize
- 📝 Supports all conventional commit types

## How It Works

The action runs on two key events:
1. **Push to protected branch** - Validates merge commits being pushed directly to the target branch
2. **Pull request to protected branch** - Validates commits that would be merged to the target branch

For each event, the action:
1. Fetches relevant commits (merge commits or PR commits)
2. Validates each commit message against conventional commit format
3. Fails the check if any commits don't follow the format
4. Comments on PRs with details about invalid commits
5. Provides guidance on how to fix the commits

## Conventional Commit Format

Commits must follow this pattern:

```
type(scope): description

[optional body]

[optional footer]
```

### Supported Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files
- `revert`: Reverts a previous commit

### Examples

✅ **Valid commits:**

- `feat: add user authentication system`
- `fix(auth): resolve login validation issue`
- `docs: update API documentation`
- `chore: update dependencies`
- `test: add unit tests for user service`

❌ **Invalid commits:**

- `updated the code`
- `fix stuff`
- `WIP: working on feature`
- `commit message`

## Setup

### Option 1: Use as Reusable Action (Recommended)

Add this to your `.github/workflows/conventional-commits.yml`:

```yaml
name: Conventional Commits Check

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  check-commits:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Enforce Conventional Commits
        uses: your-username/github-conventional-commit-enforcer@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          base-branch: main
          allowed-types: feat,fix,docs,style,refactor,perf,test,build,ci,chore,revert
          strict-mode: false
          comment-on-success: true
```

### Option 2: Self-Hosted Action

1. Copy the action files to your repository
2. Install dependencies: `npm install`
3. Build the action: `npm run build`
4. Use the local action in your workflow

### 3. Configure Branch Protection (Optional)

To enforce this check on merges, set up branch protection rules:

1. Go to your repository Settings → Branches
2. Add a rule for your main branch
3. Check "Require status checks to pass before merging"
4. Add "Conventional Commits Check" as a required status check

## Action Inputs

| Input                | Description                                     | Required | Default                                                        |
| -------------------- | ----------------------------------------------- | -------- | -------------------------------------------------------------- |
| `token`              | GitHub token for API access                     | Yes      | `${{ github.token }}`                                          |
| `target-branch`      | Target branch to protect                        | No       | `main`                                                         |
| `allowed-types`      | Comma-separated list of allowed commit types    | No       | `feat,fix,docs,style,refactor,perf,test,build,ci,chore,revert` |
| `strict-mode`        | Enable strict mode for more rigorous validation | No       | `false`                                                        |
| `comment-on-success` | Comment on PR even when validation passes       | No       | `false`                                                        |

## Action Outputs

| Output            | Description                                    |
| ----------------- | ---------------------------------------------- |
| `valid`           | Whether all commits are valid (`true`/`false`) |
| `invalid-commits` | JSON array of invalid commits                  |
| `total-commits`   | Total number of commits checked                |

## Configuration

### Customizing Commit Types

To modify the allowed commit types, use the `allowed-types` input parameter:

```yaml
- name: Enforce Conventional Commits
  uses: your-username/github-conventional-commit-enforcer@v1
  with:
    allowed-types: feat,fix,docs,chore
```

### Customizing the Workflow

The workflow can be customized by:

- Changing the target branch to protect
- Enabling strict mode for more rigorous validation
- Controlling when comments are posted
- Using action outputs in subsequent steps

## Troubleshooting

### Common Issues

1. **Action fails on first run**: This is normal if you have existing non-conventional commits. Update your commit messages and push again.

2. **Commits not being validated**: Ensure the action has access to your repository and the workflow file is in the correct location.

3. **False positives**: Check that your commit messages don't have extra spaces or special characters.

### Updating Commit Messages

If you need to update existing commits:

```bash
# Interactive rebase to edit commits
git rebase -i HEAD~n  # where n is the number of commits to edit

# Or amend the last commit
git commit --amend -m "feat: your new message"
```

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - see LICENSE file for details.
