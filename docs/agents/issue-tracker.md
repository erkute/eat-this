# Issue tracker: GitHub (privates Ticket-Repo)

Tickets für Eat This liegen als GitHub-Issues im **privaten** Repo `erkute/eat-this-tickets`, nicht in diesem Code-Repo. Das Code-Repo `erkute/eat-this` ist öffentlich: dort nie Issues anlegen.

- Jeder `gh issue …`-Befehl trägt `-R erkute/eat-this-tickets`; `gh` würde sonst aus `git remote` das öffentliche Repo nehmen.
- Ein PR im Code-Repo verweist auf ein Ticket als `erkute/eat-this-tickets#<n>`, nie als nacktes `#<n>`; der Link bleibt für Fremde unsichtbar.
- Security-Befunde gehören nur ins Ticket-Repo, nie in PR-Texte, Commits oder Kommentare im Code-Repo.
- Tickets schreiben wir auf Deutsch, in Alltagssprache: Was merken die Nutzer, was soll danach gelten.
- Neben den Rollen aus `triage-labels.md` gibt es Themen-Labels (`design`, `content`, `seo`, `infra`, `accessibility`) und Dringlichkeit (`p0` sofort, `p1` diese Woche, `p2` diesen Monat).

## Conventions

Installiert ist `gh` 2.87, darum gelten für Unter-Tickets und Abhängigkeiten die `gh api`-Wege.

- **Create an issue**: `gh issue create -R erkute/eat-this-tickets --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> -R erkute/eat-this-tickets --json number,title,body,labels,comments`.
- **List issues**: `gh issue list -R erkute/eat-this-tickets --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Make an issue a sub-issue of a parent**: `gh api --method POST repos/erkute/eat-this-tickets/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>` (database id, as in **Blocking** below). Without sub-issues, put `Part of #<parent>` at the top of the child body.
- **Blocking**: GitHub's native issue dependencies. Add an edge with `gh api --method POST repos/erkute/eat-this-tickets/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/erkute/eat-this-tickets/issues/<n> --jq .id`, _not_ the `#number` or `node_id`). Where dependencies aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Count open blockers**: `gh api repos/erkute/eat-this-tickets/issues/<n> --jq .issue_dependencies_summary.blocked_by` (open blockers only; 0 means startable).
- **Comment on an issue**: `gh issue comment <number> -R erkute/eat-this-tickets --body "..."`
- **Apply / remove labels**: `gh issue edit <number> -R erkute/eat-this-tickets --add-label "..."` / `--remove-label "..."`
- **Close**: post the explanation with `gh issue comment`, then `gh issue close <number> -R erkute/eat-this-tickets`. On an already-closed issue, `gh issue close --comment` drops the comment and still exits 0.

File issues only into `erkute/eat-this-tickets`. Never into `erkute/eat-this` or `mattpocock/skills`.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## When a skill says "publish to the issue tracker"

Create a GitHub issue in `erkute/eat-this-tickets`.

## When a skill says "fetch the relevant ticket"

Read it as in **Read an issue** above.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `gh issue create -R erkute/eat-this-tickets --label wayfinder:map` (create the label first if missing).
- **Child ticket**: an issue linked to the map as a sub-issue (see **Make an issue a sub-issue of a parent**). Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: see **Blocking** under Conventions.
- **Frontier query**: list the map's open children, drop any with an open blocker (see **Count open blockers**) or an assignee; first in map order wins.
- **Claim**: `gh issue edit <n> -R erkute/eat-this-tickets --add-assignee @me`, the session's first write.
- **Resolve**: `gh issue comment <n> -R erkute/eat-this-tickets --body "<answer>"`, then `gh issue close <n> -R erkute/eat-this-tickets`, then append a context pointer (gist + link) to the map's Decisions-so-far.
