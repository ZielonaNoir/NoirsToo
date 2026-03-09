# Prompt Graph QA Summary

- URL: http://127.0.0.1:4173/prompt-panel.html?qa=1
- Session: qa-prompt-graph
- Timestamp: 2026-03-09T08:03:40.183Z

## Results

| Scenario | Status | Actual | Expected |
|---|---|---|---|
| Artifact: initial | PASS | .playwright-cli\page-2026-03-09T08-02-32-130Z.png .playwright-cli\page-2026-03-09T08-02-33-677Z.yml | captured |
| Pick start sets state to picking | PASS | found | picking |
| Mock select sets target selector | PASS | found | #qa-target |
| Artifact: pick-selected | PASS | .playwright-cli\page-2026-03-09T08-02-46-231Z.png .playwright-cli\page-2026-03-09T08-02-47-782Z.yml | captured |
| Inject empty keeps existing email | PASS | found | already@filled.dev |
| Inject empty fills blank fields | PASS | found | Dragon Operator |
| Artifact: inject-empty | PASS | .playwright-cli\page-2026-03-09T08-02-53-614Z.png .playwright-cli\page-2026-03-09T08-02-55-165Z.yml | captured |
| Inject force overwrites email | PASS | found | chaos@example.com |
| Inject result shows duration | PASS | found | ms |
| Artifact: inject-force | PASS | .playwright-cli\page-2026-03-09T08-03-00-674Z.png .playwright-cli\page-2026-03-09T08-03-02-244Z.yml | captured |
| Extract creates chips | PASS | found | extract_camera_motion_cinematic_tone |
| Extract creates prompt atoms | PASS | found | Prompt Atoms |
| Artifact: extract-tags | PASS | .playwright-cli\page-2026-03-09T08-03-10-522Z.png .playwright-cli\page-2026-03-09T08-03-15-769Z.yml | captured |
| Macro tag exists | PASS | found | Scene_Macro |
| Artifact: macro-fused | PASS | .playwright-cli\page-2026-03-09T08-03-24-280Z.png .playwright-cli\page-2026-03-09T08-03-25-906Z.yml | captured |
| Optimize renders best score | PASS | found | Best score: |
| Optimize renders best prompt | PASS | found | Best prompt: |
| Artifact: optimize | PASS | .playwright-cli\page-2026-03-09T08-03-37-128Z.png .playwright-cli\page-2026-03-09T08-03-38-619Z.yml | captured |
| Console: no unexpected errors | PASS | clean | clean |

## Artifacts

- console-2026-03-09T08-02-28-790Z.log
- console-2026-03-09T08-03-40-127Z.log
- page-2026-03-09T08-02-28-866Z.yml
- page-2026-03-09T08-02-30-523Z.yml
- page-2026-03-09T08-02-32-130Z.png
- page-2026-03-09T08-02-33-677Z.yml
- page-2026-03-09T08-02-36-338Z.yml
- page-2026-03-09T08-02-40-419Z.yml
- page-2026-03-09T08-02-43-086Z.yml
- page-2026-03-09T08-02-44-612Z.yml
- page-2026-03-09T08-02-46-231Z.png
- page-2026-03-09T08-02-47-782Z.yml
- page-2026-03-09T08-02-50-343Z.yml
- page-2026-03-09T08-02-51-845Z.yml
- page-2026-03-09T08-02-53-614Z.png
- page-2026-03-09T08-02-55-165Z.yml
- page-2026-03-09T08-02-57-665Z.yml
- page-2026-03-09T08-02-59-107Z.yml
- page-2026-03-09T08-03-00-674Z.png
- page-2026-03-09T08-03-02-244Z.yml
- page-2026-03-09T08-03-07-368Z.yml
- page-2026-03-09T08-03-08-872Z.yml
- page-2026-03-09T08-03-10-522Z.png
- page-2026-03-09T08-03-15-769Z.yml
- page-2026-03-09T08-03-21-098Z.yml
- page-2026-03-09T08-03-22-713Z.yml
- page-2026-03-09T08-03-24-280Z.png
- page-2026-03-09T08-03-25-906Z.yml
- page-2026-03-09T08-03-33-999Z.yml
- page-2026-03-09T08-03-35-518Z.yml
- page-2026-03-09T08-03-37-128Z.png
- page-2026-03-09T08-03-38-619Z.yml

## Known Limits

- This run uses `?qa=1` local bridge mode for deterministic panel-path validation.
