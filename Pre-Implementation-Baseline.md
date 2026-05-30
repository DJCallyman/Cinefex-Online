# Pre-Implementation Baseline — Issues 127+ Original Layout Work (Path A)

**Date**: 2026-05-30 (executing plan)
**Operator**: opencode (build mode)
**User decisions**: 
- Path A (client-side concat) first
- Rollback the 637156b changes to issues/127/readingView1.html
- Combined archival = what "Original Layout" shows for 127+
- Debug instrumentation allowed
- "Do both": functional + styling polish in one pass
- Defaults A–D accepted:
  - A: Debug via both `?debug=archival` and `localStorage.cinefexDebugArchival='1'`
  - B: No extra loading indicator during gallery fetch (current spinner is fine)
  - C: Silent degradation for missing galleries (console note only)
  - D: Do NOT commit the rolled-back readingView1.html (keep as untracked working-tree change due to gitignore)

## Recorded State Before Any Changes

### Commit under partial rollback
- 637156b450365683118fd0a1fcc1c98652a4a3a1
- Touched: .gitignore, index.html (old vanilla), issues/127/readingView1.html
- **No manuscript files were ever touched in this commit or any other.**

### Rollback source verification
- `git show 637156b^:issues/127/readingView1.html | wc -l` → 1185 lines (hybrid format with .img-all + raw text)
- Current post-637156b version on disk before rollback: ~287 lines (reflowed rewrite)

### Git status at plan execution start
(Truncated for brevity — many uncommitted changes from ongoing React work + public/ symlinks. The `issues/` tree is gitignored so changes inside it do not appear unless `-f` is used.)

### Data counts
- Issues 127–169: 43 issues
- Articles in 127+: 191 total
- Articles with imageGallery present: 188
- Known missing galleries: 143/4, 158/3, 158/5, 169/7, 169/8

### Known name-lookup issues in manifests (will be fixed as drive-by in Phase 2)
- Issue 145 article 4 "The Finest hours"
- Issue 146 article 4 "The 5th wave"

## Baseline Commands Run
- `git status --porcelain`
- `git show 637156b --stat`
- `git show 637156b^:issues/127/readingView1.html | wc -l`
- `npm run typecheck && npm run lint` (baseline before edits)

## Next Step
Phase 1 rollback will now be executed using:
`git checkout 637156b^ -- issues/127/readingView1.html`

This will restore the original hybrid reading view for issue 127 article 1. The file will appear as an untracked/modified change because `issues/` is in .gitignore (expected per decision D).

---
**End of baseline record.** Proceed with implementation.
