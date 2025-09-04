# Quick Start Guide

Get conventional commit enforcement up and running in your repository in under 5 minutes!

## 1. Create Workflow File

Create `.github/workflows/conventional-commits.yml` in your repository:

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
          target-branch: main
```

## 2. Push and Test

1. Commit and push this file:

   ```bash
   git add .github/workflows/conventional-commits.yml
   git commit -m "ci: add conventional commits workflow"
   git push
   ```

2. Create a pull request with a non-conventional commit to test the action

## 3. That's It! 🎉

The action will now:

- ✅ Run on every PR
- ✅ Validate all commits
- ✅ Block merges with invalid commits
- ✅ Provide helpful feedback

## Customization Examples

### Restrict to Specific Commit Types

```yaml
- name: Enforce Conventional Commits
  uses: your-username/github-conventional-commit-enforcer@v1
  with:
    allowed-types: feat,fix,docs,chore
```

### Enable Success Comments

```yaml
- name: Enforce Conventional Commits
  uses: your-username/github-conventional-commit-enforcer@v1
  with:
    comment-on-success: true
```

### Use Different Target Branch

```yaml
- name: Enforce Conventional Commits
  uses: your-username/github-conventional-commit-enforcer@v1
  with:
    target-branch: develop
```

## Need Help?

- 📖 [Full Documentation](README.md)
- 🐛 [Report Issues](https://github.com/your-username/github-conventional-commit-enforcer/issues)
- 💡 [Request Features](https://github.com/your-username/github-conventional-commit-enforcer/issues)
