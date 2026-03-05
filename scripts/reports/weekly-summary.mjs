import {
  classifyTheme,
  commitLink,
  extractPrNumber,
  getCommitsSince,
  getOriginHttpUrl,
  nowIsoDate,
  prLink,
  writeReport,
} from './_git-utils.mjs';

const originUrl = getOriginHttpUrl();
const commits = getCommitsSince('7 days ago');
const grouped = new Map();

for (const commit of commits) {
  const theme = classifyTheme(commit.subject);
  const items = grouped.get(theme) ?? [];
  items.push(commit);
  grouped.set(theme, items);
}

const lines = [`# Weekly Engineering Summary (${nowIsoDate()})`, ''];

if (commits.length === 0) {
  lines.push('- No commits found for the last 7 days.');
  lines.push('- PR link unavailable');
} else {
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
}

const content = `${lines.join('\n')}\n`;
const outPath = writeReport('weekly-summary.md', content);
console.log(content);
console.log(`Saved to ${outPath}`);

