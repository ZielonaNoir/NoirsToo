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

const sections = {
  Features: [],
  Fixes: [],
  Performance: [],
  Refactor: [],
  Tests: [],
  Docs: [],
  Chore: [],
};

for (const commit of commits) {
  const theme = classifyTheme(commit.subject);
  sections[theme].push(commit);
}

const lines = [`# Weekly Release Notes (${nowIsoDate()})`, ''];

if (commits.length === 0) {
  lines.push('- No merged commits in the last 7 days.');
  lines.push('- PR link unavailable');
} else {
  for (const [section, entries] of Object.entries(sections)) {
    if (!entries.length) continue;
    lines.push(`## ${section}`);
    for (const commit of entries) {
      const prNumber = extractPrNumber(commit.subject);
      lines.push(`- ${commit.subject}`);
      lines.push(`  Commit: ${commitLink(originUrl, commit.hash)}`);
      lines.push(`  PR: ${prLink(originUrl, prNumber)}`);
    }
    lines.push('');
  }
}

const content = `${lines.join('\n')}\n`;
const outPath = writeReport('release-notes-weekly.md', content);
console.log(content);
console.log(`Saved to ${outPath}`);

