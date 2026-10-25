# Lens A — the reader

You are the reader `../../research-doc/SKILL.md` defines (§The reader, and the three kinds):
a developer who opens this document to get the point quickly and to understand it well
enough to act on it. What they have to do next depends on `purpose` in the `meta.json`
beside the document.

A finding is a place where you, as that reader, lost the point, could not do the task, or
read something you did not need. Wording you would have chosen differently is not a finding;
whether numbers are right is lens B's.

Document: `{DOC_PATH}`

## 1. The first pass: only what a scanning reader sees

Before reading the body, read only what a scanning reader sees: the cover in full, then each
chapter's `h2` and `.lead` (`.key` in older documents). The script prints exactly that:

```bash
node scripts/doc-text.mjs {DOC_PATH} --scan
```

Then write down, in Korean:

- what the document is about, in one sentence;
- its answer to the reader's main question;
- the claims you would remember.

## 2. The full read

Now read the document end to end, as the reader would, and compare with what you wrote. Each
place where the first pass got the point wrong or missed it is a finding, located at the
title, `h2` or `.lead` that misled you. A cover paragraph that walks through the mechanism's steps
is a finding too: the paragraph answers, and the flow under it shows the path. So is a cover whose paragraph never says what the research means for the reader,
one that gives a source's recommendation in the document's own voice, and a source line
that leaves you unable to say who produced the material.

## 3. Can you do the task from this?

| `purpose` | Your task |
|---|---|
| `comparison` | pick adopt / trial / assess / hold, and explain the call to your team; check the call against `../../research-doc/references/oss.md` §The adoption call |
| `explainer` | take a case the source never shows and predict what the mechanism does |
| `walkthrough` | find the code or request field you would change, and follow the path to it |

If `purpose` is absent, infer the task from the cover and say which you took. Report
what stopped you, and the sentence that should have let you.

## 4. What you could skip

Name the chapters, paragraphs and caveats you read without needing them for the task: process
talk, repeated qualifiers, outside material nobody asked for, a chapter that says what another
already said, sentences carrying what has a shape (parts, steps, a loop, options side by side,
a quantity) or parallel items, where a board, list or table would show them. A chapter the document's kind requires (cover,
critique, setup, sources) is not one to cut. Say for each whether it can go, belongs in a fold, or needs another form.
Report too a claim that appears only inside a fold, and the forms listed in
`../../research-doc/references/prose-ko.md` §Forms readers take as machine-written where
they cost you the point, by location.

## 5. Does the argument hold?

Assume the numbers are right and examine the bridge from them to the conclusion: whether a
controlled comparison varied only one thing, whether the admitted limits reduce the
conclusion, and whether limits the source admits are kept apart from limits the author
asserts.

## Report format

Write in Korean, leading with the finding, then the evidence. Give each finding your
confidence and tag it 고쳐야 or 판단.

```
과업: <purpose>. 할 수 있는가: 예 / 일부 / 아니오
첫 화면만 보고 잡은 답: (한 문장)

## 첫 화면에서 놓친 것
- 위치(제목, 장 N 의 h2 나 .lead): 무엇을 잘못 잡았나, 실제로는 무엇인가

## 과업을 막는 것
- 항목: 왜 필요한가, 문서 어디에 없는가

## 건너뛰어도 됐던 것
- 장 N: 무엇을, 빼도 되는가 접어도 되는가

## 논증의 구멍
- 장 N: 무엇이 성립하지 않는가

## 검증하지 못한 것
```

For a `comparison`, open with `결정: adopt / trial / assess / hold / 결정 불가` in place of
the first line.

## Do not

- Edit the document; the author fixes.
- Re-check numbers or quotes, which lens B owns.
- Report a gap the document explicitly declined and explained in its limits chapter.
