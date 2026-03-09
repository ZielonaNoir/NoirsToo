# Prompt Graph QA Summary

- URL: http://127.0.0.1:4173/prompt-panel.html?qa=1
- Session: qa-prompt-graph
- Timestamp: 2026-03-09T08:32:34.164Z

## Results

| Scenario | Status | Actual | Expected |
|---|---|---|---|
| Artifact: initial | PASS | .playwright-cli\page-2026-03-09T08-31-12-113Z.png .playwright-cli\page-2026-03-09T08-31-13-596Z.yml | captured |
| Pick start sets state to picking | PASS | found | picking |
| Mock select sets target selector | PASS | found | #qa-target |
| Artifact: pick-selected | PASS | .playwright-cli\page-2026-03-09T08-31-31-081Z.png .playwright-cli\page-2026-03-09T08-31-32-714Z.yml | captured |
| Inject empty keeps existing email | PASS | found | already@filled.dev |
| Inject empty fills blank fields | PASS | found | Dragon Operator |
| Artifact: inject-empty | PASS | .playwright-cli\page-2026-03-09T08-31-38-908Z.png .playwright-cli\page-2026-03-09T08-31-40-526Z.yml | captured |
| Inject force overwrites email | PASS | found | chaos@example.com |
| Inject result shows duration | PASS | found | ms |
| Artifact: inject-force | PASS | .playwright-cli\page-2026-03-09T08-31-46-130Z.png .playwright-cli\page-2026-03-09T08-31-47-643Z.yml | captured |
| Extract creates chips | PASS | found | camera |
| Extract creates prompt atoms | PASS | found | Prompt Atoms |
| Artifact: extract-tags | PASS | .playwright-cli\page-2026-03-09T08-32-00-079Z.png .playwright-cli\page-2026-03-09T08-32-03-092Z.yml | captured |
| Macro tag exists | PASS | found | Scene_Macro |
| Artifact: macro-fused | PASS | .playwright-cli\page-2026-03-09T08-32-17-325Z.png .playwright-cli\page-2026-03-09T08-32-20-975Z.yml | captured |
| Optimize renders best score | PASS | found | Best score: |
| Optimize renders best prompt | PASS | found | Best prompt: |
| Artifact: optimize | PASS | .playwright-cli\page-2026-03-09T08-32-31-191Z.png .playwright-cli\page-2026-03-09T08-32-32-720Z.yml | captured |
| Console: no unexpected errors | PASS | clean | clean |

## Artifacts

- console-2026-03-09T08-31-04-197Z.log
- console-2026-03-09T08-32-34-103Z.log
- page-2026-03-09T08-31-04-288Z.yml
- page-2026-03-09T08-31-05-874Z.yml
- page-2026-03-09T08-31-12-113Z.png
- page-2026-03-09T08-31-13-596Z.yml
- page-2026-03-09T08-31-19-541Z.yml
- page-2026-03-09T08-31-21-381Z.yml
- page-2026-03-09T08-31-23-871Z.yml
- page-2026-03-09T08-31-25-305Z.yml
- page-2026-03-09T08-31-27-773Z.yml
- page-2026-03-09T08-31-29-389Z.yml
- page-2026-03-09T08-31-31-081Z.png
- page-2026-03-09T08-31-32-714Z.yml
- page-2026-03-09T08-31-35-605Z.yml
- page-2026-03-09T08-31-37-201Z.yml
- page-2026-03-09T08-31-38-908Z.png
- page-2026-03-09T08-31-40-526Z.yml
- page-2026-03-09T08-31-43-197Z.yml
- page-2026-03-09T08-31-44-638Z.yml
- page-2026-03-09T08-31-46-130Z.png
- page-2026-03-09T08-31-47-643Z.yml
- page-2026-03-09T08-31-53-246Z.yml
- page-2026-03-09T08-31-55-484Z.yml
- page-2026-03-09T08-32-00-079Z.png
- page-2026-03-09T08-32-03-092Z.yml
- page-2026-03-09T08-32-08-021Z.yml
- page-2026-03-09T08-32-09-389Z.yml
- page-2026-03-09T08-32-17-325Z.png
- page-2026-03-09T08-32-20-975Z.yml
- page-2026-03-09T08-32-28-303Z.yml
- page-2026-03-09T08-32-29-682Z.yml
- page-2026-03-09T08-32-31-191Z.png
- page-2026-03-09T08-32-32-720Z.yml

## Known Limits

- This run uses `?qa=1` local bridge mode for deterministic panel-path validation.
