# Document search that knows when to shut up

A retrieval system over a bank compliance manual. It answers by quoting the exact
passage — document, page, section — and **refuses to answer** when the manual doesn't
cover the question.

Everything runs locally: no API key, no external service, nothing leaves the machine.
That constraint is the point. A compliance manual doesn't get shipped to a third party
just to run a demo.

> **This repository is a write-up, not the source.** The code is private. I'm happy to
> walk through it, or run the tool live, in a conversation.

---

## Why this problem

The corpus is a bank compliance manual: client onboarding, transaction monitoring,
suspicious activity reporting, sanctions screening.

This is the domain where **making something up is not an option**. A wrong answer about
a filing deadline, or about whether a client may be told a report was filed about them,
isn't an inconvenience — it's a criminal offence. So the system has to be able to say
"I don't know", and that ability has to be **measured, not assumed**.

I spent six years on the operating end of this work: 30,000+ customer profiles reviewed,
6,000+ high-risk cases escalated. I know what a false positive costs, because it landed
on my desk.

*(The four bundled procedures are fictional, written for this demonstration. They
reproduce no real document and carry no regulatory weight.)*

---

## What it looks like

**Answering** — the passage, its document, its section, and how close the match is in
plain words rather than a cosine nobody can read:

![Answering with a cited passage](images/answer.png)

**Refusing** — the more interesting half. It says the closest passage fell below the bar,
states the bar, and shows that passage anyway so you can judge for yourself:

![Refusing, and showing the closest passage anyway](images/refusal.png)

Note what's happening in the second screenshot: the passage it found is *about* the
question — it's the confidentiality rule that answers it. The system still refused,
because 0.825 sat under the 0.84 bar. **That's a false refusal, and it's visible.**
Hiding it would make the demo look better and the tool worse.

---

## What was measured

Over 20 questions written **before** the retrieval engine existed, four of which have no
answer in the corpus.

| Engine | Correct passage ranked 1st | In the top 5 |
|---|---|---|
| Keywords (BM25) | 31 % [15–52] | 75 % [53–89] |
| **Embeddings** | **75 % [53–89]** | **88 % [70–97]** |
| Fusion of both | 50 % [30–70] | 56 % [34–74] |

*95 % intervals, n = 20. Embeddings beat keywords on first position — [53–89] against
[15–52], no overlap, so that one holds. Everything else on this table overlaps with
everything else: twenty questions cannot rank fusion against either of them, and saying
otherwise would be reading noise.*

At the chosen confidence bar (0.84), three of the four unanswerable questions are
correctly refused, at the cost of one good answer in sixteen.

**Four questions is not a measurement.** An earlier version of this page reported that as
"75 % correctly refused"; the 95 % interval on three out of four runs from 30 % to 95 %.
The figure has been withdrawn rather than dressed up, and every rate here now carries its
interval and its sample size. The retrieval figures rest on twenty questions — roughly
±18 points each.

The tool exposes the confidence bar in the interface, labelled by its effects — "answers
often, even when wrong" at one end, "answers only when confident" at the other. The
trade-off belongs to the business, not to whoever built the thing.

Also tested on **five real PDFs, 312 pages** of bank risk reports and course material:
618 passages indexed in 13 seconds, zero unreadable files.

---

## What I actually learned

**Conclusions don't transfer between corpora.** The same engine measured on a product
documentation corpus gave inverted results: keywords level with embeddings, fusion
winning instead of losing, an optimal chunk size twice as large. What transfers is the
method — never the settings. Anyone quoting you benchmark numbers without having seen
your documents is selling you someone else's results.

**A similarity score means nothing in absolute terms.** On one corpus every score sat
between 0.806 and 0.849; the correct passage ranked fourth, 0.007 behind the first.
Hence fusion by rank, never by score.

**Retrieval alone cannot say "I don't know."** An index always has a nearest neighbour —
it can't come back empty. Refusal is a design decision with a measurable cost, not a
property you get for free.

**Multilinguality is asymmetric.** A French question found its answer in an English
document (0.899). The reverse failed: an English question against this French manual
scored 0.813 and matched the wrong document, where the French phrasing of the same
question scored 0.902. "The model is multilingual" is not a claim you get to make in one
direction and assume in the other.

**A displayed number must follow the setting it describes.** The closeness labels were
hardcoded while the confidence bar was adjustable. Lower the bar and the tool would
answer using a passage it simultaneously labelled "distant". A user who reads that stops
trusting the tool, and is right to.

**"Never cited" means nothing over five questions.** The coverage panel counts where
answers actually come from, and stays silent until twenty questions have been asked.
Raising an alarm too early teaches people to ignore alarms.

---

## How it's built

Roughly 1,250 lines, two dependencies: a local embedding model and a PDF reader.

- **Reading** — PDF, Word, RTF, HTML, markdown, plain text. Files that yield no text
  (scanned PDFs) are reported as uncovered rather than silently indexed empty.
- **Chunking** — follows markdown headings, never cuts mid-paragraph, falls back to
  sentence boundaries when a PDF page arrives as one unbroken line. The heading
  breadcrumb is copied into the indexed text: without it, a passage reading "ten working
  days" can't be found by a question about enhanced due diligence.
- **Keyword search** — BM25, no dependency, accent-folded so *levée* and *levee* are the
  same word.
- **Semantic search** — `multilingual-e5-small`, run locally, with an on-disk cache.
- **Fusion** — Reciprocal Rank Fusion, combining by rank rather than by score.
- **Evaluation** — you write your own check questions, stored per folder, and the tool
  scores itself against them.

### What it deliberately doesn't do

- **No answer generation.** It retrieves and cites; it doesn't rephrase. Everything
  measured concerns retrieval, which is the ceiling on final answer quality anyway.
- **No reranker.** The obvious next step for first-position accuracy.
- **No OCR.** Scanned PDFs are flagged, not read.

---

**Arslane Chaouche Ramdane** — six years in AML/KYC and financial crime operations,
moving into AI transformation work. Happy to demo this live.
