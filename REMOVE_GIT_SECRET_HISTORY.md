# How to Remove Secrets from Git History (Surgical Guide)

## Problem
Your push is blocked because a secret (e.g., OpenAI API key) exists in your git history, not just the latest commit. GitHub will not allow pushes until the secret is fully removed from all history.

---

## Step-by-Step: Remove a Secret from All Git History

### 1. Install `git-filter-repo`
- **Recommended:** Use [git-filter-repo](https://github.com/newren/git-filter-repo) (faster and safer than BFG or filter-branch).
- On Windows, install via [Python pip](https://pypi.org/project/git-filter-repo/):
  ```sh
  pip install git-filter-repo
  ```

### 2. Remove the Secret from All History
- Replace `YOUR_SECRET` with your actual secret (e.g., your OpenAI API key):
  ```sh
  git filter-repo --replace-text <(echo 'YOUR_SECRET==>REMOVED_SECRET')
  ```
- **Example:**
  ```sh
  git filter-repo --replace-text <(echo 'REMOVED_SECRET==>REMOVED_SECRET')
  ```

### 3. Clean Up and Recommit
- After running the above, check that the secret is gone:
  ```sh
  git grep 'REMOVED_SECRET'
  ```
- If nothing is found, proceed.

### 4. Force Push to GitHub
- You **must** force-push to overwrite remote history:
  ```sh
  git push --force origin main
  ```

### 5. Invalidate Leaked Secrets
- Go to your OpenAI/Supabase/Clerk dashboards and **revoke/regenerate** any keys that were ever committed.

### 6. Add `.env` and Sensitive Files to `.gitignore`
- Ensure `.env` and any files with secrets are listed in `.gitignore` to prevent future leaks.

---

## References
- [GitHub: Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [git-filter-repo documentation](https://github.com/newren/git-filter-repo)

---

**This process is surgical, safe, and the industry standard for removing secrets from git history.**
