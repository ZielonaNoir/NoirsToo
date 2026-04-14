# Prompt Graph QA Summary

- URL: http://127.0.0.1:4173/prompt-panel.html?qa=1
- Session: qa-prompt-graph
- Timestamp: 2026-03-09T08:02:12.561Z

## Results

| Scenario | Status | Actual | Expected |
|---|---|---|---|
| Artifact: initial | PASS | .playwright-cli\page-2026-03-09T08-00-59-265Z.png .playwright-cli\page-2026-03-09T08-01-00-740Z.yml | captured |
| Pick start sets state to picking | PASS | found | picking |
| Mock select sets target selector | PASS | found | #qa-target |
| Artifact: pick-selected | PASS | .playwright-cli\page-2026-03-09T08-01-11-293Z.png .playwright-cli\page-2026-03-09T08-01-12-947Z.yml | captured |
| Inject empty keeps existing email | PASS | found | already@filled.dev |
| Inject empty fills blank fields | PASS | found | Dragon Operator |
| Artifact: inject-empty | PASS | .playwright-cli\page-2026-03-09T08-01-18-547Z.png .playwright-cli\page-2026-03-09T08-01-20-100Z.yml | captured |
| Inject force overwrites email | PASS | found | chaos@example.com |
| Inject result shows duration | PASS | found | ms |
| Artifact: inject-force | PASS | .playwright-cli\page-2026-03-09T08-01-33-893Z.png .playwright-cli\page-2026-03-09T08-01-35-526Z.yml | captured |
| Extract creates chips | PASS | found | extract_camera_motion_cinematic_tone |
| Extract creates prompt atoms | PASS | found | Prompt Atoms |
| Artifact: extract-tags | PASS | .playwright-cli\page-2026-03-09T08-01-43-965Z.png .playwright-cli\page-2026-03-09T08-01-47-938Z.yml | captured |
| Macro tag exists | PASS | found | Scene_Macro |
| Artifact: macro-fused | PASS | .playwright-cli\page-2026-03-09T08-01-56-463Z.png .playwright-cli\page-2026-03-09T08-01-58-096Z.yml | captured |
| Optimize renders best score | PASS | found | Best score: |
| Optimize renders best prompt | PASS | found | Best prompt: |
| Artifact: optimize | PASS | .playwright-cli\page-2026-03-09T08-02-09-281Z.png .playwright-cli\page-2026-03-09T08-02-10-792Z.yml | captured |
| Console: no unexpected errors | PASS | clean | clean |

## Artifacts

- console-2026-03-09T08-00-56-068Z.log
- console-2026-03-09T08-02-12-501Z.log
- page-2026-03-09T08-00-56-144Z.yml
- page-2026-03-09T08-00-57-673Z.yml
- page-2026-03-09T08-00-59-265Z.png
- page-2026-03-09T08-01-00-740Z.yml
- page-2026-03-09T08-01-03-342Z.yml
- page-2026-03-09T08-01-05-111Z.yml
- page-2026-03-09T08-01-07-694Z.yml
- page-2026-03-09T08-01-09-390Z.yml
- page-2026-03-09T08-01-11-293Z.png
- page-2026-03-09T08-01-12-947Z.yml
- page-2026-03-09T08-01-15-517Z.yml
- page-2026-03-09T08-01-16-980Z.yml
- page-2026-03-09T08-01-18-547Z.png
- page-2026-03-09T08-01-20-100Z.yml
- page-2026-03-09T08-01-22-660Z.yml
- page-2026-03-09T08-01-32-201Z.yml
- page-2026-03-09T08-01-33-893Z.png
- page-2026-03-09T08-01-35-526Z.yml
- page-2026-03-09T08-01-40-873Z.yml
- page-2026-03-09T08-01-42-335Z.yml
- page-2026-03-09T08-01-43-965Z.png
- page-2026-03-09T08-01-47-938Z.yml
- page-2026-03-09T08-01-53-034Z.yml
- page-2026-03-09T08-01-54-760Z.yml
- page-2026-03-09T08-01-56-463Z.png
- page-2026-03-09T08-01-58-096Z.yml
- page-2026-03-09T08-02-06-006Z.yml
- page-2026-03-09T08-02-07-685Z.yml
- page-2026-03-09T08-02-09-281Z.png
- page-2026-03-09T08-02-10-792Z.yml

## Known Limits

- This run uses `?qa=1` local bridge mode for deterministic panel-path validation.
