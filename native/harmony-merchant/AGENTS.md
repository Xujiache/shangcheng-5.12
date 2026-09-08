# Repository workflow

- For small UI, copy, style, icon, or layout changes, do not run full Hvigor compilation, HAP packaging, or App Pack packaging in the cloud workspace.
- For those small changes, run only fast, relevant static audits and `git diff --check`. Commit App source through the enclosing shangcheng-5.12 repository; there is no separate App repository workflow.
- Run full cloud compilation or packaging only when the user explicitly requests it or explicitly asks for a release artifact.
- Preserve unrelated working-tree changes, especially changes inside `third_party/ibest-ui`.
