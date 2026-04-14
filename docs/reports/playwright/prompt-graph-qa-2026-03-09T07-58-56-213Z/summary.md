# Prompt Graph QA Summary

- URL: http://127.0.0.1:4173/prompt-panel.html?qa=1
- Session: qa-prompt-graph
- Timestamp: 2026-03-09T08:00:16.821Z

## Results

| Scenario | Status | Actual | Expected |
|---|---|---|---|
| Artifact: initial | PASS | .playwright-cli\page-2026-03-09T07-59-07-538Z.png .playwright-cli\page-2026-03-09T07-59-09-045Z.yml | captured |
| Pick start sets state to picking | FAIL | missing | state: picking |
| Mock select sets target selector | PASS | found | #qa-target |
| Artifact: pick-selected | PASS | .playwright-cli\page-2026-03-09T07-59-18-978Z.png .playwright-cli\page-2026-03-09T07-59-20-601Z.yml | captured |
| Inject empty keeps existing email | PASS | found | already@filled.dev |
| Inject empty fills blank fields | PASS | found | Dragon Operator |
| Artifact: inject-empty | PASS | .playwright-cli\page-2026-03-09T07-59-26-758Z.png .playwright-cli\page-2026-03-09T07-59-28-605Z.yml | captured |
| Inject force overwrites email | PASS | found | chaos@example.com |
| Inject result shows duration | PASS | found | ms |
| Artifact: inject-force | PASS | .playwright-cli\page-2026-03-09T07-59-37-324Z.png .playwright-cli\page-2026-03-09T07-59-40-355Z.yml | captured |
| Extract creates chips | FAIL | missing | chip |
| Extract creates prompt atoms | PASS | found | Prompt Atoms |
| Artifact: extract-tags | PASS | .playwright-cli\page-2026-03-09T07-59-49-391Z.png .playwright-cli\page-2026-03-09T07-59-51-232Z.yml | captured |
| Macro tag exists | FAIL | missing | Scene Macro |
| Artifact: macro-fused | PASS | .playwright-cli\page-2026-03-09T07-59-59-692Z.png .playwright-cli\page-2026-03-09T08-00-01-249Z.yml | captured |
| Optimize renders best score | PASS | found | Best score: |
| Optimize renders best prompt | PASS | found | Best prompt: |
| Artifact: optimize | PASS | .playwright-cli\page-2026-03-09T08-00-13-060Z.png .playwright-cli\page-2026-03-09T08-00-14-782Z.yml | captured |
| Console: no unexpected errors | PASS | clean | clean |

## Artifacts

- console-2026-03-05T08-28-03-556Z.log
- console-2026-03-05T08-29-05-772Z.log
- console-2026-03-05T08-29-48-011Z.log
- console-2026-03-05T08-33-14-710Z.log
- console-2026-03-05T08-37-18-254Z.log
- console-2026-03-05T08-38-59-302Z.log
- console-2026-03-05T08-40-20-753Z.log
- console-2026-03-09T07-25-05-174Z.log
- console-2026-03-09T07-29-33-461Z.log
- console-2026-03-09T07-30-06-555Z.log
- console-2026-03-09T07-51-03-009Z.log
- console-2026-03-09T07-53-14-341Z.log
- console-2026-03-09T07-53-42-345Z.log
- console-2026-03-09T07-55-09-312Z.log
- console-2026-03-09T07-57-08-367Z.log
- console-2026-03-09T07-57-52-918Z.log
- console-2026-03-09T07-59-04-143Z.log
- console-2026-03-09T08-00-16-667Z.log
- page-2026-03-05T08-28-04-354Z.yml
- page-2026-03-05T08-28-06-109Z.yml
- page-2026-03-05T08-28-07-755Z.png
- page-2026-03-05T08-28-12-137Z.yml
- page-2026-03-05T08-29-07-203Z.yml
- page-2026-03-05T08-29-08-981Z.yml
- page-2026-03-05T08-29-10-919Z.png
- page-2026-03-05T08-29-12-537Z.yml
- page-2026-03-05T08-29-49-052Z.yml
- page-2026-03-05T08-29-50-983Z.yml
- page-2026-03-05T08-29-52-676Z.png
- page-2026-03-05T08-29-54-438Z.yml
- page-2026-03-05T08-33-15-613Z.yml
- page-2026-03-05T08-37-19-069Z.yml
- page-2026-03-05T08-37-19-294Z.yml
- page-2026-03-05T08-37-21-071Z.png
- page-2026-03-05T08-37-23-183Z.yml
- page-2026-03-05T08-37-53-125Z.yml
- page-2026-03-05T08-37-57-006Z.yml
- page-2026-03-05T08-38-15-575Z.png
- page-2026-03-05T08-38-17-507Z.yml
- page-2026-03-05T08-38-28-698Z.yml
- page-2026-03-05T08-38-34-429Z.yml
- page-2026-03-05T08-38-41-465Z.png
- page-2026-03-05T08-38-43-516Z.yml
- page-2026-03-05T08-38-51-724Z.yml
- page-2026-03-05T08-38-54-717Z.yml
- page-2026-03-05T08-39-01-212Z.png
- page-2026-03-05T08-39-03-302Z.yml
- page-2026-03-05T08-40-21-589Z.yml
- page-2026-03-09T07-25-06-929Z.yml
- page-2026-03-09T07-29-33-535Z.yml
- page-2026-03-09T07-29-35-157Z.png
- page-2026-03-09T07-29-36-722Z.yml
- page-2026-03-09T07-30-06-633Z.yml
- page-2026-03-09T07-35-46-502Z.png
- page-2026-03-09T07-51-03-094Z.yml
- page-2026-03-09T07-53-15-855Z.yml
- page-2026-03-09T07-53-42-420Z.yml
- page-2026-03-09T07-55-09-400Z.yml
- page-2026-03-09T07-55-28-669Z.yml
- page-2026-03-09T07-55-30-385Z.png
- page-2026-03-09T07-55-32-147Z.yml
- page-2026-03-09T07-55-48-882Z.yml
- page-2026-03-09T07-55-50-729Z.yml
- page-2026-03-09T07-56-06-513Z.yml
- page-2026-03-09T07-56-08-440Z.yml
- page-2026-03-09T07-56-10-079Z.png
- page-2026-03-09T07-56-12-398Z.yml
- page-2026-03-09T07-56-15-352Z.yml
- page-2026-03-09T07-56-16-969Z.yml
- page-2026-03-09T07-56-18-644Z.png
- page-2026-03-09T07-56-20-167Z.yml
- page-2026-03-09T07-56-22-714Z.yml
- page-2026-03-09T07-56-24-874Z.yml
- page-2026-03-09T07-56-26-571Z.png
- page-2026-03-09T07-56-28-091Z.yml
- page-2026-03-09T07-57-08-454Z.yml
- page-2026-03-09T07-57-10-079Z.yml
- page-2026-03-09T07-57-11-679Z.png
- page-2026-03-09T07-57-13-314Z.yml
- page-2026-03-09T07-57-15-824Z.yml
- page-2026-03-09T07-57-17-369Z.yml
- page-2026-03-09T07-57-52-997Z.yml
- page-2026-03-09T07-57-54-600Z.yml
- page-2026-03-09T07-57-56-182Z.png
- page-2026-03-09T07-57-57-642Z.yml
- page-2026-03-09T07-58-00-256Z.yml
- page-2026-03-09T07-58-06-870Z.yml
- page-2026-03-09T07-58-09-334Z.yml
- page-2026-03-09T07-58-13-412Z.yml
- page-2026-03-09T07-58-14-986Z.png
- page-2026-03-09T07-58-16-441Z.yml
- page-2026-03-09T07-58-19-018Z.yml
- page-2026-03-09T07-58-22-820Z.yml
- page-2026-03-09T07-58-24-959Z.png
- page-2026-03-09T07-58-26-686Z.yml
- page-2026-03-09T07-58-29-257Z.yml
- page-2026-03-09T07-58-30-989Z.yml
- page-2026-03-09T07-58-32-556Z.png
- page-2026-03-09T07-58-34-163Z.yml
- page-2026-03-09T07-59-04-222Z.yml
- page-2026-03-09T07-59-05-872Z.yml
- page-2026-03-09T07-59-07-538Z.png
- page-2026-03-09T07-59-09-045Z.yml
- page-2026-03-09T07-59-11-739Z.yml
- page-2026-03-09T07-59-13-334Z.yml
- page-2026-03-09T07-59-15-802Z.yml
- page-2026-03-09T07-59-17-234Z.yml
- page-2026-03-09T07-59-18-978Z.png
- page-2026-03-09T07-59-20-601Z.yml
- page-2026-03-09T07-59-23-458Z.yml
- page-2026-03-09T07-59-25-175Z.yml
- page-2026-03-09T07-59-26-758Z.png
- page-2026-03-09T07-59-28-605Z.yml
- page-2026-03-09T07-59-31-202Z.yml
- page-2026-03-09T07-59-32-960Z.yml
- page-2026-03-09T07-59-37-324Z.png
- page-2026-03-09T07-59-40-355Z.yml
- page-2026-03-09T07-59-45-600Z.yml
- page-2026-03-09T07-59-47-303Z.yml
- page-2026-03-09T07-59-49-391Z.png
- page-2026-03-09T07-59-51-232Z.yml
- page-2026-03-09T07-59-56-543Z.yml
- page-2026-03-09T07-59-58-021Z.yml
- page-2026-03-09T07-59-59-692Z.png
- page-2026-03-09T08-00-01-249Z.yml
- page-2026-03-09T08-00-09-733Z.yml
- page-2026-03-09T08-00-11-429Z.yml
- page-2026-03-09T08-00-13-060Z.png
- page-2026-03-09T08-00-14-782Z.yml

## Known Limits

- This run uses `?qa=1` local bridge mode for deterministic panel-path validation.
