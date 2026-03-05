import {
  commitLink,
  extractPrNumber,
  getCommitsSince,
  getOriginHttpUrl,
  nowIsoDate,
  prLink,
  writeReport,
} from './_git-utils.mjs';

const originUrl = getOriginHttpUrl();
const commits = getCommitsSince('24 hours ago');

const lines = [`# Standup Update (${nowIsoDate()})`, ''];

if (commits.length === 0) {
  lines.push('- No commits in the last 24 hours.');
  lines.push('- PR link unavailable');
} else {
  for (const commit of commits) {
    const prNumber = extractPrNumber(commit.subject);
    lines.push(
      `- ${commit.shortHash}: ${commit.subject} (${commit.author}, ${commit.date})`,
    );
    lines.push(`  Commit: ${commitLink(originUrl, commit.hash)}`);
    lines.push(`  PR: ${prLink(originUrl, prNumber)}`);
  }
}

const content = `${lines.join('\n')}\n`;
const outPath = writeReport('standup-last-24h.md', content);
console.log(content);
console.log(`Saved to ${outPath}`);

