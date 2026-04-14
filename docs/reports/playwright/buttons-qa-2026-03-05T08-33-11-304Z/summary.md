# Popup Button QA Summary

- URL: http://127.0.0.1:4173/popup.html
- Session: qa-buttons
- Timestamp: 2026-03-05T08:39:03.387Z

## Results

| Scenario | Status | Actual | Expected |
|---|---|---|---|
| Initial state: main button disabled | PASS | true | true |
| Initial state: config button exists | PASS | true | true |
| After input: main button enabled | PASS | true | true |
| Success flow: synthesizing shown | FAIL | false | true |
| Success flow: harmony shown | FAIL | false | true |
| Success flow: auto reset | PASS | true | true |
| Error flow: dissonance shown | FAIL | false | true |
| Config click: URL unchanged | PASS | http://127.0.0.1:4173/popup.html | http://127.0.0.1:4173/popup.html |
| Console: no new functional errors | PASS | no functional error | no functional error |

## Artifacts

- console-2026-03-05T08-28-03-556Z.log
- console-2026-03-05T08-29-05-772Z.log
- console-2026-03-05T08-29-48-011Z.log
- console-2026-03-05T08-33-14-710Z.log
- console-2026-03-05T08-37-18-254Z.log
- console-2026-03-05T08-38-59-302Z.log
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

## Notes

- `favicon.ico 404` is treated as low-priority noise and not a button failure.
