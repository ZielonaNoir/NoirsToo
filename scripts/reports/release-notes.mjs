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

const lines = [`# Weekly Release Notes (${nowIsoDate()})`, '', `Window: last ${since}`, ''];

if (commits.length === 0) {
  lines.push(`- No merged commits in the last ${since}.`);
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

lines.push('## Release Risks');
const missingPr = commits.filter((commit) => !extractPrNumber(commit.subject)).length;
if (missingPr > 0) {
  lines.push(`- ${missingPr} entry/entries are missing PR references.`);
} else {
  lines.push('- All entries include PR references.');
}

lines.push('');
lines.push('## GitHub Data');
if (ghStatus.authenticated) {
  lines.push('- GitHub API access: available');
} else {
  lines.push(`- ${ghStatus.reason}`);
}

const content = `${lines.join('\n')}\n`;
const outPath = writeReport(formatReportName('release-notes-weekly'), content);
const changelogDraftPath = writeReport(formatReportName('changelog-highlights'), content);
console.log(content);
console.log(`Saved to ${outPath}`);
console.log(`Saved to ${changelogDraftPath}`);
