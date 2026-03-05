import path from 'node:path';
import {
  commitLink,
  formatReportName,
  getChangedFilesForCommit,
  getChangedFilesSince,
  getCommitsSince,
  getGitHubStatus,
  getOriginHttpUrl,
  getRecentIssues,
  getSinceArg,
  run,
  writeReport,
} from './_git-utils.mjs';

const since = getSinceArg('24 hours ago');
const commits = getCommitsSince(since);
const changedFiles = getChangedFilesSince(since);
const originUrl = getOriginHttpUrl();
const ghStatus = getGitHubStatus();

const testFiles = run('git ls-files "tests/**/*" "**/*.test.ts" "**/*.spec.ts"', '')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

const looksLikeCodePath = (file) =>
  /^(components|entrypoints|lib|utils|types|scripts)\//.test(file) &&
  !/\.(md|txt|json|lock)$/i.test(file) &&
  !/(^|\/)tests\//.test(file) &&
  !/\.(test|spec)\.[jt]s$/i.test(file);

const normalizeName = (filePath) => {
  const base = path.basename(filePath).toLowerCase();
  return base
    .replace(/\.[^.]+$/, '')
    .replace(/[-_.]/g, '');
};

const hasMatchingTest = (filePath) => {
  const name = normalizeName(filePath);
  return testFiles.some((testFile) => normalizeName(testFile).includes(name));
};

const riskySubject = (subject) => /wip|hotfix|temp|hack|quick|urgent/i.test(subject);
const riskyFile = (file) => /config|auth|payment|inject|framework|content|background/i.test(file);

const lines = [
  `# Ops Risk Scan (${new Date().toISOString().slice(0, 10)})`,
  '',
  `Window: last ${since}`,
  '',
  '## Potential Bug Signals',
];

if (commits.length === 0) {
  lines.push('- No commits found in this window.');
} else {
  for (const commit of commits) {
    const files = getChangedFilesForCommit(commit.hash);
    const commitRisks = [];

    if (riskySubject(commit.subject)) {
      commitRisks.push('subject suggests urgent/temporary change');
    }
    if (files.length >= 8) {
      commitRisks.push(`large change set (${files.length} files)`);
    }
    if (files.some((file) => riskyFile(file)) && !files.some((file) => /tests\//.test(file) || /\.(test|spec)\./.test(file))) {
      commitRisks.push('sensitive paths changed without adjacent tests');
    }

    lines.push(`- ${commit.shortHash}: ${commit.subject}`);
    lines.push(`  Commit: ${commitLink(originUrl, commit.hash)}`);

    if (commitRisks.length > 0) {
      lines.push(`  Risk: ${commitRisks.join('; ')}`);
      lines.push('  Minimal fix: add focused test(s) for touched logic and split risky refactors into smaller commits.');
    } else {
      lines.push('  Risk: low signal from commit metadata.');
    }
  }
}

const untestedPaths = changedFiles.filter((file) => looksLikeCodePath(file) && !hasMatchingTest(file));
lines.push('');
lines.push('## Untested Paths (Heuristic)');
if (untestedPaths.length === 0) {
  lines.push('- No obvious untested paths detected from filename matching heuristics.');
} else {
  for (const file of untestedPaths.slice(0, 20)) {
    lines.push(`- ${file}`);
  }
  if (untestedPaths.length > 20) {
    lines.push(`- ...and ${untestedPaths.length - 20} more`);
  }
  lines.push('- Minimal fix: add focused unit tests for these files or document why runtime/manual coverage is sufficient.');
}

lines.push('');
lines.push('## New Issue Triage Suggestions');
if (!ghStatus.authenticated) {
  lines.push(`- ${ghStatus.reason}`);
} else {
  const issues = getRecentIssues(10, 'open');
  if (issues.length === 0) {
    lines.push('- No open issues found.');
  } else {
    const topAuthor = commits[0]?.author ?? 'unassigned';
    for (const issue of issues) {
      const title = issue.title.toLowerCase();
      const suggestedPriority = /crash|data loss|security|payment/.test(title)
        ? 'P1'
        : /bug|fail|error|regression/.test(title)
          ? 'P2'
          : 'P3';
      const suggestedLabels = [];
      if (/bug|error|regression|fail/.test(title)) suggestedLabels.push('bug');
      if (/perf|slow|latency/.test(title)) suggestedLabels.push('performance');
      if (/doc|readme/.test(title)) suggestedLabels.push('documentation');
      if (suggestedLabels.length === 0) suggestedLabels.push('triage');

      lines.push(`- #${issue.number} ${issue.title}`);
      lines.push(`  URL: ${issue.html_url}`);
      lines.push(`  Suggested owner: ${topAuthor}`);
      lines.push(`  Suggested priority: ${suggestedPriority}`);
      lines.push(`  Suggested labels: ${suggestedLabels.join(', ')}`);
    }
  }
}

const content = `${lines.join('\n')}\n`;
const outPath = writeReport(formatReportName('ops-scan'), content);
console.log(content);
console.log(`Saved to ${outPath}`);
