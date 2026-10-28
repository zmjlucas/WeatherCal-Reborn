const { test } = require('node:test');
const assert = require('node:assert/strict');
const syncMainToDev = require('./sync-main-to-dev.cjs');

const MAIN = 'a'.repeat(40);
const DEV = 'b'.repeat(40);
const NEW_DEV = 'c'.repeat(40);

function fixture(overrides = {}) {
  const state = {
    main: MAIN, dev: DEV, updates: [], comparisons: [], runQueries: [],
    comparison: { ahead_by: 0, behind_by: 1 },
    runs: [{ head_sha: MAIN, head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success' }],
    ...overrides,
  };
  const context = {
    repo: { owner: 'owner', repo: 'widget' },
    ref: 'refs/heads/main', eventName: 'workflow_dispatch', payload: {},
  };
  const github = { rest: {
    git: {
      getRef: async ({ ref }) => ({ data: { object: { sha: state[ref.slice(6)] } } }),
      updateRef: async (request) => {
        state.updates.push(request);
        assert.equal(request.ref, 'heads/dev');
        assert.equal(request.force, false);
        if (state.race) {
          state.dev = NEW_DEV;
          throw Object.assign(new Error('Update is not a fast forward'), { status: 422 });
        }
        state.dev = request.sha;
        return { data: { object: { sha: request.sha } } };
      },
    },
    repos: {
      compareCommits: async (request) => {
        state.comparisons.push(request);
        return { data: state.comparison };
      },
    },
    actions: {
      listWorkflowRuns: async (request) => {
        state.runQueries.push(request);
        return { data: { workflow_runs: state.runs } };
      },
    },
  } };
  return { state, context, github };
}

test('fast-forwards dev to a main commit validated by its own push workflow', async () => {
  const f = fixture();
  const result = await syncMainToDev(f);
  assert.equal(f.state.dev, MAIN);
  assert.equal(result.status, 'updated');
  assert.deepEqual(f.state.comparisons, [{ owner: 'owner', repo: 'widget', base: MAIN, head: DEV }]);
  assert.deepEqual(f.state.runQueries, [{
    owner: 'owner', repo: 'widget', workflow_id: 'check.yml', branch: 'main',
    event: 'push', head_sha: MAIN, per_page: 1,
  }]);
});

test('does nothing when dev already contains main, including newer development commits', async () => {
  const f = fixture({ comparison: { ahead_by: 7, behind_by: 0 } });
  const result = await syncMainToDev(f);
  assert.equal(result.status, 'current');
  assert.equal(f.state.dev, DEV);
  assert.equal(f.state.updates.length, 0);
});

test('does nothing when both branches point to the same commit', async () => {
  const f = fixture({ dev: MAIN, comparison: { ahead_by: 0, behind_by: 0 } });
  assert.equal((await syncMainToDev(f)).status, 'current');
  assert.equal(f.state.updates.length, 0);
});

test('divergence requires the manual merge SOP and preserves both branches', async () => {
  const f = fixture({ comparison: { ahead_by: 7, behind_by: 3 } });
  await assert.rejects(syncMainToDev(f), /diverged.*BRANCH-SYNC/);
  assert.equal(f.state.dev, DEV);
  assert.equal(f.state.main, MAIN);
  assert.equal(f.state.updates.length, 0);
});

for (const [name, runs] of [
  ['missing check', []],
  ['failed check', [{ head_sha: MAIN, head_branch: 'main', event: 'push', status: 'completed', conclusion: 'failure' }]],
  ['pending check', [{ head_sha: MAIN, head_branch: 'main', event: 'push', status: 'in_progress', conclusion: null }]],
  ['PR check', [{ head_sha: MAIN, head_branch: 'main', event: 'pull_request', status: 'completed', conclusion: 'success' }]],
  ['old commit check', [{ head_sha: DEV, head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success' }]],
  ['different branch check', [{ head_sha: MAIN, head_branch: 'dev', event: 'push', status: 'completed', conclusion: 'success' }]],
]) {
  test(`refuses to update dev with a ${name}`, async () => {
    const f = fixture({ runs });
    await assert.rejects(syncMainToDev(f), /successful.*push.*check/);
    assert.equal(f.state.updates.length, 0);
    assert.equal(f.state.dev, DEV);
  });
}

test('a concurrent dev push is preserved when the server rejects the fast-forward', async () => {
  const f = fixture({ race: true });
  await assert.rejects(syncMainToDev(f), /fast forward/);
  assert.equal(f.state.dev, NEW_DEV);
  assert.equal(f.state.updates.length, 1);
});

test('manual dispatch from another branch cannot write dev', async () => {
  const f = fixture();
  f.context.ref = 'refs/heads/dev';
  await assert.rejects(syncMainToDev(f), /main/);
  assert.equal(f.state.updates.length, 0);
});

test('an older completed main workflow cannot move dev to a newer unchecked main', async () => {
  const f = fixture();
  f.context.eventName = 'workflow_run';
  f.context.payload.workflow_run = {
    head_sha: DEV, head_branch: 'main', event: 'push', conclusion: 'success',
    head_repository: { full_name: 'owner/widget' },
  };
  assert.equal((await syncMainToDev(f)).status, 'stale');
  assert.equal(f.state.updates.length, 0);
});

test('accepts a successful push workflow for the current main in this repository', async () => {
  const f = fixture();
  f.context.eventName = 'workflow_run';
  f.context.payload.workflow_run = {
    head_sha: MAIN, head_branch: 'main', event: 'push', conclusion: 'success',
    head_repository: { full_name: 'owner/widget' },
  };
  assert.equal((await syncMainToDev(f)).status, 'updated');
  assert.equal(f.state.dev, MAIN);
});

test('a workflow from another repository cannot authorize synchronization', async () => {
  const f = fixture();
  f.context.eventName = 'workflow_run';
  f.context.payload.workflow_run = {
    head_sha: MAIN, head_branch: 'main', event: 'push', conclusion: 'success',
    head_repository: { full_name: 'someone/fork' },
  };
  await assert.rejects(syncMainToDev(f), /successful main push/);
  assert.equal(f.state.updates.length, 0);
});
