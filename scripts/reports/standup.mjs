import {
  commitLink,
  extractPrNumber,
  formatReportName,
  getGitHubStatus,
  getCommitsSince,
  getSinceArg,
  getOriginHttpUrl,
  nowIsoDate,
  prLink,
  writeReport,
} from './_git-utils.mjs';

const originUrl = getOriginHttpUrl();
const since = getSinceArg('24 hours ago');
const commits = getCommitsSince(since);
const ghStatus = getGitHubStatus();

const lines = [`# Standup Update (${nowIsoDate()})`, '', `Window: last ${since}`, ''];

if (commits.length === 0) {
  lines.push(`- No commits in the last ${since}.`);
  lines.push('- PR link unavailable');
} else {
  let missingPrCount = 0;
  const authorCounts = new Map();

  for (const commit of commits) {
    const prNumber = extractPrNumber(commit.subject);
    if (!prNumber) missingPrCount += 1;
    authorCounts.set(commit.author, (authorCounts.get(commit.author) ?? 0) + 1);

    lines.push(
      `- ${commit.shortHash}: ${commit.subject} (${commit.author}, ${commit.date})`,
    );
    lines.push(`  Commit: ${commitLink(originUrl, commit.hash)}`);
    lines.push(`  PR: ${prLink(originUrl, prNumber)}`);
  }

  lines.push('');
  lines.push('## Risk Signals');
  if (missingPrCount > 0) {
    lines.push(`- ${missingPrCount} commit(s) do not reference a PR number.`);
  }
  if (authorCounts.size === 1 && commits.length >= 3) {
    lines.push('- High concentration: all changes are from one author in this window.');
  }
  if (missingPrCount === 0 && !(authorCounts.size === 1 && commits.length >= 3)) {
    lines.push('- No elevated risk signals detected.');
  }
}

lines.push('');
lines.push('## GitHub Data');
if (ghStatus.authenticated) {
  lines.push('- GitHub API access: available');
} else {
  lines.push(`- ${ghStatus.reason}`);
}

const content = `${lines.join('\n')}\n`;
const outPath = writeReport(formatReportName('standup'), content);
console.log(content);
console.log(`Saved to ${outPath}`);
