# GitHub Conventional Commit Enforcer

A GitHub Action that enforces conventional commit format on PR titles for squash merges to protected branches like `main`. This action ensures that all commits merged to your target branch follow the [Conventional Commits](https://www.conventionalcommits.org/) specification by validating PR titles.

## Features

- ✅ Validates PR titles as conventional commits
- 🚫 Blocks merges with non-conventional PR titles
- ✅ Provides clear validation feedback through status checks
- 🔧 Easy to configure and customize
- 📝 Supports all conventional commit types
- 🎯 Simple approach: PR title → commit message

## How It Works

The action uses a **simple and effective approach**:

1. **Developer creates PR** with a title
2. **Action validates PR title** as a conventional commit
3. **If PR title is invalid:**
   - ❌ Action fails and blocks the merge
   - ✅ Provides clear status check feedback
4. **If PR title is valid:**
   - ✅ Action passes and allows the merge
5. **When merging:**
   - ✅ Use **"Squash and Merge"** (enforced by branch protection)
   - ✅ PR title becomes the commit message on main branch

**Result:** Every commit on main follows conventional commit format! 🎯

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

✅ **Valid PR titles:**

- `feat: add user authentication system`
- `fix(auth): resolve login validation issue`
- `docs: update API documentation`
- `chore: update dependencies`
- `test: add unit tests for user service`

❌ **Invalid PR titles:**

- `Add new feature`
- `Fix stuff`
- `WIP: working on feature`
- `Update the code`

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
```

### Option 2: Self-Hosted Action

1. Copy the action files to your repository
2. Install dependencies: `yarn install`
3. Build the action: `yarn build`
4. Use the local action in your workflow

### 3. Configure Branch Protection (REQUIRED)

⚠️ **IMPORTANT:** Without branch protection, the action will NOT prevent merges with invalid commits!

To actually enforce conventional commits, you MUST set up branch protection:

1. Go to your repository **Settings** → **Branches**
2. Click **Add rule** for your main branch
3. ✅ Check **"Require status checks to pass before merging"**
4. ✅ Check **"Require branches to be up to date before merging"**
5. Search for and select **"Conventional Commits Check"** as a required status check
6. Click **Create**

📖 **Detailed Setup Guide:** See [BRANCH_PROTECTION_SETUP.md](BRANCH_PROTECTION_SETUP.md) for complete instructions.

## Action Inputs

| Input           | Description                                     | Required | Default                                                        |
| --------------- | ----------------------------------------------- | -------- | -------------------------------------------------------------- |
| `token`         | GitHub token for API access                     | Yes      | `${{ github.token }}`                                          |
| `target-branch` | Target branch to protect                        | No       | `main`                                                         |
| `allowed-types` | Comma-separated list of allowed commit types    | No       | `feat,fix,docs,style,refactor,perf,test,build,ci,chore,revert` |
| `strict-mode`   | Enable strict mode for more rigorous validation | No       | `false`                                                        |

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
- Configuring validation behavior
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
