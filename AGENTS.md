<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Store offline question packs and retryable session results in IndexedDB, scoped by user; only an unexpired downloaded Premium pack enables offline study.
- Register the generated PWA worker through src/lib/pwa.ts only, excluding development and preview contexts, to prevent stale preview caches.
- Display exam preparation as a recent-simulation performance index, never as a calibrated probability of passing.
- Legal citations are optional administrator-confirmed question data; never generate legal article numbers automatically.
