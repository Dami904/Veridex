# Veridex Demo — Voiceover Script

A continuous narration meant to run under footage that doesn't follow any particular
click order — no "now click this" cues. Written in short paragraphs so you can cut,
reorder, or trim segments to match whatever the recording actually shows.

Pace guide: ~150 words/minute for a natural, unhurried voiceover.
Core script ≈ 230 words ≈ 90 seconds. Extension paragraphs below add ~30–45s each.

---

## Core script (~90s)

Most research tools give you a list of papers and leave the reading to you. Veridex reads them for you — and more than that, it tells you when they disagree.

Give it a research question, and it goes out to real peer-reviewed sources — PubMed, CrossRef, Europe PMC — and pulls in every study it can find. Then a pipeline of specialized agents takes over. One reads each paper and extracts the actual structured claim: sample size, effect direction, statistical significance. Another compares studies that answer the same question but land on opposite conclusions, and tries to isolate exactly why — a different dosage, a different population, a different model organism. And a final agent writes the plain-language summary — but it's not allowed to invent a single number. Every figure in that summary was already computed deterministically before the AI ever touched it.

That contradiction graph you're looking at isn't cosmetic. Every connection is a real disagreement between two real studies, and clicking into one shows you exactly why the Arbiter agent resolved it the way it did — or flagged it as genuinely unresolved, because sometimes the honest answer is "we don't know yet."

This isn't limited to one narrow topic either — ask it about a drug's effect on lifespan, a supplement's effect on cognition, or a lifestyle factor's effect on disease risk, and it runs the same rigor every time. And when you're done, it exports straight into a PRISMA-compliant report with real citations, because a synthesis that can't leave the app isn't actually useful to anyone doing real research.

Veridex doesn't tell you what to believe. It shows you what the evidence actually says — including the parts that disagree with each other.

---

## Optional extension paragraphs (splice in for a longer cut)

**On the "why does it disagree" moment** — use over a shot of hovering a contradiction link:
"Take metformin and lifespan — one study says it helps, another says the opposite. Both are right. Low-dose metformin extended lifespan in mice; the same drug at a high dose caused kidney failure and shortened it. Same drug, same species, opposite outcome — and Veridex is the one telling you it's the dose, not the drug."

**On scope / "it handles the weird questions too"** — use over a shot of typing a query:
"And it's not squeamish about what counts as a real research question. Ask it whether coffee shortens your life or extends it, whether a supplement everyone's hyping actually does anything in a controlled trial — if there's real peer-reviewed literature on it, Veridex will go find it, structure it, and tell you honestly if the evidence is thin instead of pretending it isn't."

**On the refusal-to-fabricate guarantee** — use over a shot of the Evidence Matrix:
"If Veridex can't find enough real literature to answer a question honestly, it says so — it will not manufacture a study that doesn't exist just to give you a tidy answer."

---

# Appendix: 5 kinds of questions Veridex is built to answer

For inspiration if you're narrating over footage of someone typing a query — these are verified live against the real PubMed/CrossRef/Europe PMC APIs, not guessed:

1. **Life-extension interventions** — *"Does a ketogenic diet extend lifespan in mice?"*
2. **Neuro/cognitive & psychiatric interventions** — *"Does psilocybin microdosing improve depression and creativity?"*
3. **Sexual & reproductive health** — *"Does masturbation frequency affect prostate cancer risk?"* (the codebase literally has a hardcoded search-term fix for this exact question — a good "the devs thought of everything" beat if you want it)
4. **Diet vs. disease-risk flip-flops** — *"Does coffee consumption increase or decrease all-cause mortality?"*
5. **Dose-response toxicology** — *"Is red wine good or bad for your heart depending on how much you drink?"* (weakest literature coverage of the five — good if you want to show the honest "insufficient evidence" refusal instead of a full matrix)

---

# Alternative: click-synced live-demo version

If you ever want to run this live instead of narrating over a recording, there's a
click-by-click version of this script with `[ACTION]`/`[NARRATOR]` cues available —
just ask and I'll bring it back.
