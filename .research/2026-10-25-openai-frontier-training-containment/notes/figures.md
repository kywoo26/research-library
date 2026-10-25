# Figures in w1 (OpenAI, Securing our frontier model training environment)

- Diagram (§Our new approach to model containment, image, no figure number). One logical sandbox: the agent reaches offline web search ("Search over an internal web index"), offline web cache ("Stored copies of web pages", "No live fetch on a cache miss"), a message board ("Shared only with allowed teammates") and "Other tools and resources". Outside the containment boundary, blocked: "Live internet" (External APIs, Real accounts and services), "Other sandboxes" (Unauthorized communication with other isolated agents), "OpenAI infrastructure" (Virtual machines, GPUs, and supporting services). Alt text: "An agent inside one logical sandbox can use an offline search index, offline web cache, and a message board shared with allowed teammates for multi-agent teams. A boxed plus sign indicates other tools and resources. Connections to the live internet and OpenAI infrastructure, and unauthorized communication with other isolated agents, are blocked." Retrieved from images.ctfassets.net (…/securing-our-frontier-model-training-environment-diagram-desktop-light.png), embedded in the document as webp.

- Chart "Red-teaming findings versus tokens spent" (§Red-teaming containment at scale, anchor id urgent-high-candidate-findings-vs-tokens-spent). Step line (interpolate step-after). x axis "Tokens spent (billions)" 0 to 400; y axis "Deduplicated candidate findings" 0 to 300. Data from the page's Vega-Lite spec, 258 points, fields cumulative_tokens and cumulative_findings. Caption: "We plot the cumulative number of high-priority candidate findings against the number of tokens spent by our red-teaming agents." The chart is identical in the 2026-10-23T19:51:40Z archive snapshot.
  Points (findings at or before the token count, read from the spec values):
  - 0 billion tokens: 20 findings (first point: cumulative_tokens 0, cumulative_findings 20)
  - 25 billion: 115
  - 50 billion: 140
  - 75 billion: 159
  - 100 billion: 186
  - 150 billion: 252
  - 200 billion: 264
  - 250 billion: 268
  - 300 billion: 270
  - 350 billion: 272
  - last point: 379.9 billion tokens (cumulative_tokens 379899978389), 276 findings
  - 276 findings first reached at 360.2 billion tokens (cumulative_tokens 360185757559)
  - 200 findings first reached at 102.5 billion tokens; 250 at 112.3 billion; 270 at 288.0 billion
  - findings added: 0 to 100 billion +166, 100 to 150 billion +66, 150 to 380 billion +24
  Summary lines (for quoting):
  - cumulative findings at 0, 25, 50, 75, 100, 150, 200, 250, 300, 350 billion tokens: 20, 115, 140, 159, 186, 252, 264, 268, 270, 272
  - last point of the chart: 379.9 billion tokens and 276 deduplicated candidate findings
  - findings reach 200 at 102.5 billion tokens and 250 at 112.3 billion tokens

- Links in §Escaping hardened virtual machines (hrefs read from the article HTML; the text copy w1.txt keeps only the link labels):
  - CVE-2026-24834 links to https://github.com/kata-containers/kata-containers/security/advisories/GHSA-wwj6-vghv-5p64
  - Kata privilege isolation links to https://github.com/kata-containers/kata-containers/pull/13615
  - Kata filesystem isolation links to https://github.com/kata-containers/kata-containers/pull/13587
  - gVisor (file-descriptor handling) links to https://github.com/google/gvisor/pull/13816
  - Moby/Docker (syscall filters) links to https://github.com/moby/profiles/pull/39
  - "improve kernel security" links to the OpenAI page /index/expanding-daybreak-as-the-cyber-defense-window-narrows/
  - CVE-2026-74753 links to https://github.com/torvalds/linux/commit/fa091f46c3833fb22384f10eade2b4e1e1d0b278
  - CVE-2026-80521 links to https://github.com/torvalds/linux/commit/594d905195024b228c962627ae5ae7c17bd582a4
  - CVE-2026-80841 links to https://github.com/torvalds/linux/commit/992cc9f94ca924089a506ba9b327caa9af797529
  - eight of these links go to GitHub (three Kata, one gVisor, one Moby, three Linux kernel commits)
