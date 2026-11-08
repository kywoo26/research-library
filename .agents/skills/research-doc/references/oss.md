# Reading a repository for the document

A repository answers three things in different places. Its intent lives in the README, the
docs, the license, the CI gates, the rules it writes for contributors and what it refuses to
do. Its structure lives where parts are declared and wired: registries, manifests, entry
points. What it measured lives in its benchmarks and evaluations, which count as
self-reported. Take from each what the asks need.

## Large code paths

One request path can cross files of hundreds of KB. Measure before opening:

```bash
git -C <checkout> ls-tree -r -l <commit> -- <paths> | awk '{s+=$4} END {print s}'
```

When loading it would leave no room to write, hand the path to a helper agent. Ask it for
extraction, not conclusions: each hop described, with a verbatim quote and a `file:line`
locator, in `notes/mechanism.md`. A helper that reports "the README contradicts the
code" hands you a finding you did not verify. Reopen a quote at its locator before it goes
into `evidence.jsonl`.

## Tracing a path

Trace the path the reader needs to understand, at the depth they need. The hops with their
quotes and locators go to `evidence.jsonl` and the fold, where the gate checks each quote at
its locator. The visible chapter explains the path in Korean, beside a diagram. Write locators
from the repository root (`sub/pkg/src/thing.ts:806`, not `src/thing.ts:806`), because
verification runs `git show <commit>:<path>`. A grand traversal with invented middle steps is
worse than a short true one, and both pass every gate.

## What code shows and what it does not

When a claim leans on what another function does, open that function. Code reading shows
what the code is written to do. A run shows what it did in your setup. Neither shows what it
does in someone else's environment. Say which of the three a sentence rests on:

```
✗ 릴레이가 끊기면 자동 재접속한다
✓ 끊기면 1초 간격으로 다시 접속하도록 짜여 있다. 이 경로를 확인하는 테스트는 없어서 실제 동작은 돌려 봐야 안다.
```

An absence claim has no line to cite. Its evidence is the search that came back empty, kept
as a command someone can rerun. A sentence taken from the project's own docs says what the
maintainers wrote; phrase it that way, or open the implementation.

## Adoption, when the request asks

- **License.** Read the whole `LICENSE` file. A badge or an API value of `NOASSERTION` often
  hides a preamble with carve-outs.
- **Maintenance.** Commit and release history needs a full clone (`../../research-source/SKILL.md`
  §3). Issue response time is in no checkout.
- **Dependencies.** A vendor API, a runtime version, a paid service.
- **Extension points.** Where you have to cut when requirements drift.
- **Tests and releases.** Whether tests exist, what they cover, how regular releases are.
- **Footprint.** What installing it leaves behind: edited config, injected hooks, outbound
  calls, files outside the repo, and whether anything removes them.
- **Reversibility.** What backing out requires.

## README against code

Check the few things the asks turn on. Asked in general whether the docs match the code, you
will flag nearly everything, and a list like that says nothing.

## What was read

The sources chapter says it in a sentence or two, with what each gap costs:

```
커밋 <sha> 의 코드를 읽었다. <N>개 파일 중 <M>개를 열었고, <디렉터리> 는 열지 않아서 <장>의 설명은 그 경로를 빼고 한 것이다.
```
