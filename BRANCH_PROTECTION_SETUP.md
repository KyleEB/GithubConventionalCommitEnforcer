# Branch Protection Setup Guide

This guide will help you set up branch protection rules to **enforce conventional commits** by validating PR titles and requiring squash merges.

## 🎯 **Simple Approach**

This action uses a **simplified approach**:

1. ✅ **Validates PR titles** as conventional commits
2. ✅ **Requires squash merges** to main branch
3. ✅ **PR title becomes the commit message** when squashed

## 🛡️ Setting Up Branch Protection

### Step 1: Navigate to Repository Settings

1. Go to your GitHub repository
2. Click on **Settings** tab
3. Click on **Branches** in the left sidebar

### Step 2: Add Branch Protection Rule

1. Click **Add rule** button
2. In the **Branch name pattern** field, enter: `main` (or `master`)
3. Configure the following settings:

#### ✅ Required Settings:

**Require status checks to pass before merging**

- ✅ Check this box
- ✅ Check **"Require branches to be up to date before merging"**
- In the search box, type: `Conventional Commits Check`
- ✅ Select the **"Conventional Commits Check"** status check

**Require linear history**

- ✅ Check this box (CRITICAL - forces squash merges)

#### 🔧 Optional Settings:

**Require pull request reviews before merging**

- ✅ Check this box (recommended)
- Set **Required number of reviewers**: `1` or more
- ✅ Check **"Dismiss stale PR approvals when new commits are pushed"**
- ✅ Check **"Require review from code owners"** (if you have a CODEOWNERS file)

**Require conversation resolution before merging**

- ✅ Check this box (recommended)

**Require signed commits**

- ✅ Check this box (optional, for extra security)

**Include administrators**

- ✅ Check this box (applies rules to admins too)

### Step 3: Save the Rule

1. Click **Create** button
2. The branch protection rule is now active!

## 🧪 Testing the Protection

### Test 1: Valid PR Title (Should Work)

```bash
git checkout -b test-valid-pr
echo "test" > test.txt
git add test.txt
git commit -m "WIP: working on feature"
git push origin test-valid-pr
# Create PR with title: "feat: add test file" → Should be mergeable
```

### Test 2: Invalid PR Title (Should Be Blocked)

```bash
git checkout -b test-invalid-pr
echo "test" > test2.txt
git add test2.txt
git commit -m "WIP: working on feature"
git push origin test-invalid-pr
# Create PR with title: "Add test file" → Should be blocked from merging
```

## 🔍 How It Works

1. **Developer creates PR** with a title
2. **GitHub Action runs** and validates the PR title as a conventional commit
3. **If PR title is invalid:**
   - ❌ Action fails
   - ❌ Status check shows as "failed"
   - ❌ Branch protection blocks the merge
   - ✅ Action provides clear status check feedback
4. **If PR title is valid:**
   - ✅ Action passes
   - ✅ Status check shows as "passed"
   - ✅ Branch protection allows the merge
5. **When merging:**
   - ✅ Use **"Squash and Merge"** (forced by linear history requirement)
   - ✅ PR title becomes the commit message on main branch

## 📝 PR Title Examples

### ✅ **Valid PR Titles:**

- `feat: add user authentication system`
- `fix(auth): resolve login validation issue`
- `docs: update API documentation`
- `chore: update dependencies`
- `test: add unit tests for user service`

### ❌ **Invalid PR Titles:**

- `Add new feature`
- `Fix stuff`
- `WIP: working on feature`
- `Update the code`

## 🚨 Troubleshooting

### Issue: "No status checks found"

**Solution:** Make sure the workflow has run at least once and the job name matches exactly.

### Issue: "Branch is not up to date"

**Solution:** This is expected behavior. Users must rebase/merge the latest main branch.

### Issue: "Required status check is not set"

**Solution:**

1. Check that the workflow file is in `.github/workflows/`
2. Ensure the job has a `name` field
3. Run the workflow once to create the status check

### Issue: Action passes but PR title is still invalid

**Solution:** Check the action logs to see if there are any parsing errors.

## 📋 Status Check Names

The following status checks will be created:

- **Conventional Commits Check** - Main validation check

## 🔄 Updating Branch Protection

To modify branch protection rules:

1. Go to **Settings** → **Branches**
2. Click **Edit** next to your rule
3. Make changes and click **Save changes**

## 🗑️ Removing Branch Protection

To remove branch protection:

1. Go to **Settings** → **Branches**
2. Click **Delete** next to your rule
3. Confirm deletion

**⚠️ Warning:** Removing branch protection will allow all merges, including those with invalid PR titles!

## 🎯 **Key Benefits of This Approach**

1. **Simple**: Only validates PR titles, not individual commits
2. **Clean History**: Squash merges create linear commit history
3. **Conventional**: Every commit on main follows conventional commit format
4. **User-Friendly**: Clear feedback on PR titles
5. **Flexible**: Developers can use any commit messages in their feature branches

## 📚 Additional Resources

- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
- [GitHub Status Checks Documentation](https://docs.github.com/en/rest/commits/statuses)
- [Conventional Commits Specification](https://www.conventionalcommits.org/)
