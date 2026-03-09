import {
  formatReportName,
  getGitHubStatus,
  getRecentWorkflowRuns,
  getRepoSlug,
  ghApiJson,
  writeReport,
} from './_git-utils.mjs';

const ghStatus = getGitHubStatus();
const lines = [`# CI Triage (${new Date().toISOString().slice(0, 10)})`, ''];

const rootCauseFromStep = (stepName = '') => {
  const s = stepName.toLowerCase();
  if (s.includes('lint') || s.includes('eslint')) return 'Lint/Style failures';
  if (s.includes('test') || s.includes('vitest')) return 'Test failures';
  if (s.includes('type') || s.includes('compile') || s.includes('build')) return 'Build/Type failures';
  if (s.includes('install') || s.includes('dependency')) return 'Dependency/install failures';
  return 'Unknown failure mode';
};

if (!ghStatus.authenticated) {
  lines.push(`- ${ghStatus.reason}`);
  lines.push('- Unable to summarize CI failures without GitHub API access.');
  } else {
    const runs = getRecentWorkflowRuns(15);
  if (runs.length === 0) {
    lines.push('- No workflow runs found.');
  } else {
    const failedRuns = runs.filter((run) => run.status === 'completed' && run.conclusion !== 'success');
    const flakyRuns = runs.filter((run) => (run.run_attempt ?? 1) > 1);
    const failureRate = runs.length === 0 ? 0 : Number(((failedRuns.length / runs.length) * 100).toFixed(1));
    const flakeRate = runs.length === 0 ? 0 : Number(((flakyRuns.length / runs.length) * 100).toFixed(1));

    lines.push('## Window');
    lines.push(`- Latest run: ${runs[0].name} #${runs[0].run_number} (${runs[0].status}/${runs[0].conclusion ?? 'n/a'})`);
    lines.push(`- Runs analyzed: ${runs.length}`);
    lines.push(`- Failure rate: ${failureRate}%`);
    lines.push(`- Retry/flaky signal rate: ${flakeRate}%`);

    lines.push('');
    lines.push('## Failures Grouped by Likely Root Cause');
    if (failedRuns.length === 0) {
      lines.push('- No failed runs in the recent CI window.');
    } else {
      const repoSlug = getRepoSlug();
      const grouped = new Map();

      for (const run of failedRuns) {
        let cause = 'Unknown failure mode';

        if (repoSlug) {
          const jobs = ghApiJson(`repos/${repoSlug}/actions/runs/${run.id}/jobs?per_page=100`)?.jobs ?? [];
          const failedJob = jobs.find((job) => job.conclusion === 'failure' || job.conclusion === 'timed_out');
          const failedStep = failedJob?.steps?.find((step) => step.conclusion === 'failure');
          if (failedStep?.name) {
            cause = rootCauseFromStep(failedStep.name);
          } else if (failedJob?.name) {
            cause = rootCauseFromStep(failedJob.name);
          }
        }

        const entries = grouped.get(cause) ?? [];
        entries.push(run);
        grouped.set(cause, entries);
      }

      for (const [cause, entries] of grouped.entries()) {
        lines.push(`- ${cause}: ${entries.length} run(s)`);
        for (const run of entries.slice(0, 3)) {
          lines.push(`  - ${run.name} #${run.run_number}: ${run.html_url}`);
        }
      }
    }

    lines.push('');
    lines.push('## Flaky Test Signals');
    if (flakyRuns.length === 0) {
      lines.push('- No retry/re-run signals found (run_attempt > 1).');
    } else {
      for (const run of flakyRuns.slice(0, 5)) {
        lines.push(`- ${run.name} #${run.run_number} had ${run.run_attempt} attempts: ${run.html_url}`);
      }
    }

    lines.push('');
    lines.push('## Top Minimal Fixes');
    lines.push('- Stabilize tests with deterministic fixtures/mocks for intermittent failures.');
    lines.push('- Keep CI steps aligned with local `bun run check` to reduce environment drift.');
    lines.push('- Add failure annotations for lint/test/typecheck step names to improve grouping precision.');
    if (failureRate > 20 || flakeRate > 20) {
      lines.push('- Route nightly alert to Slack on repeated failures (>20% window).');
      lines.push('- Auto-open triage issue for the dominant root cause to prevent silent regressions.');
    }
  }
}

const content = `${lines.join('\n')}\n`;
const outPath = writeReport(formatReportName('ci-triage'), content);
console.log(content);
console.log(`Saved to ${outPath}`);
