/** Advance dev only to an existing, checked main commit; never create a merge. */
module.exports = async function syncMainToDev({ github, context }) {
  const { owner, repo } = context.repo;
  const sop = `https://github.com/${owner}/${repo}/blob/main/docs/BRANCH-SYNC.md`;
  if (context.ref !== 'refs/heads/main') {
    throw new Error('Run synchronization from main only.');
  }
  if (context.eventName === 'workflow_run') {
    const run = context.payload.workflow_run;
    if (run?.event !== 'push' || run.head_branch !== 'main' || run.conclusion !== 'success'
        || run.head_repository?.full_name !== `${owner}/${repo}`) {
      throw new Error('Synchronization requires a successful main push workflow from this repository.');
    }
  } else if (context.eventName !== 'workflow_dispatch') {
    throw new Error('Unsupported synchronization event.');
  }

  const [mainRef, devRef] = await Promise.all([
    github.rest.git.getRef({ owner, repo, ref: 'heads/main' }),
    github.rest.git.getRef({ owner, repo, ref: 'heads/dev' }),
  ]);
  const main = mainRef.data.object.sha;
  const dev = devRef.data.object.sha;
  if (context.eventName === 'workflow_run' && context.payload.workflow_run.head_sha !== main) {
    return { status: 'stale', message: 'main has advanced; its newer push check will handle synchronization.' };
  }
  const { data: comparison } = await github.rest.repos.compareCommits({ owner, repo, base: main, head: dev });
  if (comparison.behind_by === 0) {
    return { status: 'current', message: `dev already contains main (${main}). No update needed.` };
  }
  if (comparison.ahead_by !== 0) {
    throw new Error(`main and dev have diverged. Merge and test locally using ${sop}`);
  }

  const { data } = await github.rest.actions.listWorkflowRuns({
    owner, repo, workflow_id: 'check.yml', branch: 'main', event: 'push', head_sha: main, per_page: 1,
  });
  const check = data.workflow_runs[0];
  if (check?.head_sha !== main || check.head_branch !== 'main' || check.event !== 'push'
      || check.status !== 'completed' || check.conclusion !== 'success') {
    throw new Error(`Wait for a successful main push run of check.yml at ${main}, then rerun this workflow.`);
  }

  // GitHub rejects a non-fast-forward if a developer pushes new work after our read.
  // Never use force:true or turn this into an automatic divergent merge.
  await github.rest.git.updateRef({ owner, repo, ref: 'heads/dev', sha: main, force: false });
  return { status: 'updated', message: `Fast-forwarded dev from ${dev} to checked main ${main}.` };
};
