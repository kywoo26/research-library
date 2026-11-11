The owner handed you this job and will not be asked anything until the pull request exists.
First run `node scripts/begin.mjs --harness=<claude|codex>` for the harness you run
under; if it stops, report why and end. Then invoke `research-source` and follow the hand-offs through `research-doc` and
`research-verify`. For a fix to an existing document or a stopped run you continue, start
from its ledger and draft (a document only on a pull request: `node scripts/checkout-doc.mjs <slug>` first), reopen the pinned source only where the ledger falls short, and
run `research-verify` on what you changed. A fix starts with `begin.mjs` too, and is measured
against the original `request` and `asks` plus what the owner changed since. For a refresh of an
existing document at a later date, recover its question and angle from the old document, frame the
comparison from current sources, and pin new versions for what the refreshed document says is true now.

Keep working files (scripts, fetched pages, renders) under `.research/<slug>/notes/`, not `/tmp`.

A new document is built from the request and the sources, not from earlier work. Unless the job
is a fix to that document, do not open earlier pull requests, branches or documents on the same
subject. `new-doc.mjs` refuses a slug that a pull request branch already uses.

Launch each review agent (`plan-review`, the two lenses, `recheck`) as a new agent, and wait for
its report before you edit what it reads. Do not reuse a finished reviewer: the run cannot count a
review it did not see start, and its report may not come back to you.

Where a skill would ask the owner, decide from the request and the source and record it in
`run.json` under `decided`; `needs_owner` holds only what `research-verify` leaves to the owner.

When the last round is done, write `commitSubject` and `commitBody` into `run.json` (the
Commits section of `AGENTS.md`) and run `node scripts/ship.mjs research/<slug>`. It runs the
gates and opens the pull request. Do not run git or gh yourself. If it refuses, fix what it names and run it again.

End with one short report: short sentences, one statement each, the actor named in each (you, a lens, the script, the owner), and what the owner
must do written as an instruction. Put the pull request first, then 한 일, 정한 것, 하실 일.
