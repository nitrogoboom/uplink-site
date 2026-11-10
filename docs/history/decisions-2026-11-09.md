# Owner decisions on the Fable 5.2 review

*November 9, 2026*

The review ([`recommendations-fable-5.2-2026-11-09.md`](recommendations-fable-5.2-2026-11-09.md), "Decisions for you") left six choices to the owner. Four were asked and answered on November 9, 2026. Each answer is the review's own pick.

| Decision | Answer | What follows |
| --- | --- | --- |
| Wheel grid on Home | Remove it | One fold rule for every page: a section is at least one screen tall, and may grow. The grid's CSS, its script, and its tests go. A short window that runs a little past one screen is expected, not a bug. |
| French | `/fr/` addresses | French pages get their own addresses (Astro's i18n routing), not a Settings switch. Copy files become `src/data/copy/en/` and `fr/` when French starts. `CLAUDE.md`'s "EN/FR goes in Settings" no longer holds. |
| The `?` shortcut | Remove it | The shortcut, its on/off switch, its copy, and its lines in the privacy and accessibility pages go. The gear still opens Settings. |
| Phone hero captions | Try HTML captions on a preview | Built on a pull request and left open. The owner looks on a phone and keeps or drops it. |

Not asked, because the review's pick is to change nothing now:

- **Error reports:** keep the endpoint; add an alert at launch.
- **Light drawing copies:** keep committing them.

Also settled the same day:

- **Leftover branches and work folders:** deleted when their last change was more than a day older than the latest merge to `main`. The forms branch (pull request #38), `404-comic-draft` and `archive/editing-room` stay.
- **Previews:** `wrangler preview` (an open beta) replaced the alias script after a trial on pull request #135.
- **Standing permission, for the review's CSS, script and markup work:** the agent runs commands and merges its own pull requests. A change to the look that the owner hasn't decided stays open with a preview.
