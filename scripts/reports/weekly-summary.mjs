import {
  classifyTheme,
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
const since = getSinceArg('7 days ago');
const commits = getCommitsSince(since);
const ghStatus = getGitHubStatus();
const grouped = new Map();
const authorCounts = new Map();
let missingPrCount = 0;

for (const commit of commits) {
  const theme = classifyTheme(commit.subject);
  const items = grouped.get(theme) ?? [];
  items.push(commit);
  grouped.set(theme, items);

  authorCounts.set(commit.author, (authorCounts.get(commit.author) ?? 0) + 1);
  if (!extractPrNumber(commit.subject)) missingPrCount += 1;
}

const lines = [`# Weekly Engineering Summary (${nowIsoDate()})`, '', `Window: last ${since}`, ''];

if (commits.length === 0) {
  lines.push(`- No commits found for the last ${since}.`);
  lines.push('- PR link unavailable');
} else {
  lines.push('## By Theme');
  const sortedThemes = Array.from(grouped.keys()).sort();
  for (const theme of sortedThemes) {
    lines.push(`## ${theme}`);
    for (const commit of grouped.get(theme)) {
      const prNumber = extractPrNumber(commit.subject);
      lines.push(`- ${commit.subject} (${commit.shortHash})`);
      lines.push(`  Commit: ${commitLink(originUrl, commit.hash)}`);
      lines.push(`  PR: ${prLink(originUrl, prNumber)}`);
    }
    lines.push('');
  }

  lines.push('## By Author');
  for (const [author, count] of Array.from(authorCounts.entries()).sort((a, b) => b[1] - a[1])) {
    lines.push(`- ${author}: ${count} commit(s)`);
  }

  lines.push('');
  lines.push('## Risk Signals');
  if (missingPrCount > 0) {
    lines.push(`- ${missingPrCount} commit(s) do not include PR references.`);
  }
  if (authorCounts.size === 1 && commits.length >= 4) {
    lines.push('- Single-author concentration detected this week.');
  }
  if (missingPrCount === 0 && !(authorCounts.size === 1 && commits.length >= 4)) {
    lines.push('- No elevated delivery risk signals detected.');
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
const outPath = writeReport(formatReportName('weekly-summary'), content);
console.log(content);
console.log(`Saved to ${outPath}`);
