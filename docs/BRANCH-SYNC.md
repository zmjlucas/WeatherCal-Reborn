# Main-to-dev synchronization SOP

`main` holds published code and accepts changes through checked pull requests.
`dev` is the development branch: local edits, local checks, then a normal push
are allowed. Both branches block force pushes and deletion.

Keep `dev` up to date with `main` after a release or a hotfix. A branch can be
ahead and behind at the same time: release merge commits exist on `main` until
they are brought back to `dev`. That count alone does not mean code was lost.

## After a release PR

1. Merge the `dev` → `main` PR using **Create a merge commit**. Preserve the
   history of this long-lived branch; do not squash or rebase the release PR.
2. Wait for **Check and build Scriptable scripts** to pass on the new `main`
   commit. Publishing a GitHub release remains a separate operation.
3. Check **Sync main back to dev** in Actions. It runs after a successful
   `main` push check. The workflow is enabled when its file exists on `main`.
4. Bring the remote result into your local checkout before continuing:

   ```sh
   git status --short
   git fetch origin
   git switch dev
   git merge --ff-only origin/dev
   ```

   Start with a clean working tree. If the fast-forward fails because local
   work diverged, keep your commits and use the manual procedure below.

## What Actions does

- If `dev` already contains `main`, it succeeds without changing anything.
- If `dev` is an ancestor of `main`, it fast-forwards `dev` to that exact,
  checked `main` commit. This creates no additional commit or new code.
- If both branches have their own commits, it fails with a link to this SOP.
  A developer must merge and test the combined result locally.
- The latest push run of `check.yml` for the exact target SHA must have
  completed successfully. An old workflow completion cannot authorize a newer
  `main` commit. A concurrent push to `dev` cannot be overwritten: the API
  update uses `force: false` and the branch also blocks force pushes.

The job reads its script only from protected `main`. It uses the built-in
`GITHUB_TOKEN`, with `contents: write` and `actions: read`; it needs no PAT,
GitHub App secret, or bypass permission. It does not execute code from `dev`.
Bot updates made with this token do not trigger another push workflow. This is
intentional: the target is the unchanged commit whose `main` push checks have
already passed. The job does not open PRs, publish releases, or resolve conflicts.

To retry after a transient error or a completed check, run from `main`:

```sh
gh workflow run sync-main-to-dev.yml --ref main
gh run list --workflow sync-main-to-dev.yml --limit 5
```

## Manual merge when branches diverge

Use this for a hotfix on `main`, a failed automatic fast-forward, or local work
created before the automatic synchronization finished. Run each stage only
after the preceding stage succeeds.

### 1. Inspect and update

```sh
git status --short
git fetch origin
git switch dev
git merge --ff-only origin/dev
git log --oneline --left-right origin/main...HEAD
```

Stop if the working tree is dirty; commit or otherwise save that work first.
If local `dev` and `origin/dev` have diverged, inspect both sides and merge
`origin/dev` normally, resolving conflicts and testing before continuing.
Do not reset away local commits or force push.

### 2. Merge main and validate

```sh
git merge --no-commit origin/main
git diff --cached --stat
pnpm install --frozen-lockfile
pnpm check
pnpm docs:check
```

For a divergent merge, `--no-commit` leaves the merge pending for inspection.
For a fast-forward, Git moves the branch immediately and no merge commit is
needed; the checks still run before pushing. If dependencies were already
installed from the same lockfile, the install step can be skipped.

On conflicts, inspect each affected file, resolve it, and stage only those
files. Rerun both checks after resolving. To abandon a pending merge, use
`git merge --abort`. A failed check means stop and investigate; do not push.
These automated checks do not replace Scriptable/iPhone acceptance for an
actual release.

### 3. Commit a pending merge

After the checks pass, inspect the staged paths. Never include `.superpowers/`
or `docs/superpowers/`. Stage only explicit conflict resolutions if needed.

```sh
git diff --cached --name-only
git status
```

If Git reports that a merge is still in progress, commit it:

```sh
git commit -m "chore(branches): sync main into dev"
```

Skip the commit when Git already fast-forwarded or reported up to date.

### 4. Check for races and push

```sh
git fetch origin
git merge-base --is-ancestor origin/main HEAD
git merge-base --is-ancestor origin/dev HEAD
git push origin dev
```

Both ancestry commands must succeed. If either fails, the corresponding
remote branch advanced: merge that branch into local `dev`, inspect and rerun
both checks before pushing. If the push itself is rejected, fetch and repeat
that same process. Never use `--force` or `--force-with-lease` on `dev`.

### 5. Verify

```sh
git fetch origin
git rev-list --left-right --count origin/main...origin/dev
```

The first number must be **0**: `main` has no commits missing from `dev`.
The second number may be positive because development continues on `dev`.
For a human push, also check the new `dev` CI run. If `main` advanced during
verification, synchronize the newer commit before treating the result as current.

## References

- [GitHub: long-running branches and merge methods](https://docs.github.com/en/pull-requests/reference/pull-request-merges)
- [GitHub: GITHUB_TOKEN and workflow triggers](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)
- [GitHub: non-forced reference updates](https://docs.github.com/en/rest/git/refs#update-a-reference)
