# FinanceBrain Hybrid Retrieval — Per-Question Analysis

**Run:** 2026-05-19 | **Adapter:** hybrid | **K:** 5 | **138 questions**

**Hit Rate@5:** 101/138 = 73.2% | **Recall:** 51.8% | **MRR:** 0.509 | **R-Prec:** 31.8% | **MAP:** 0.499

## Failure Buckets

| ID | Label |
|---|---|
| B1_WRONG_QUARTER | B1 — Wrong quarter / date: retrieves right company+topic but wrong specific time period |
| B2_FORM_TYPE | B2 — Wrong SEC form type: retrieves right company+period, wrong filing type (8-K vs 10-Q vs 10-K) |
| B3_SPECIFIC_TWEET | B3 — Specific tweet needle: needs one exact tweet among many topically similar ones |
| B4_RECAP_ARTICLE | B4 — Recap article vs primary source: system correctly finds primary source but question gold points to year-in-review summary |
| B5_TEMPORAL_FORM | B5 — Time-series form type: temporal series needs 8-K press releases, retrieves 10-Q/10-K filings |
| B6_MULTI_SOURCE | B6 — Multi-source price+filing: requires price data + filing together, system finds neither |

---

## financials (20 questions)

### ✅ financials-01

**Question:** What was NVIDIA's revenue, gross margin, operating income, diluted non-GAAP EPS, and GAAP EPS for Q3 FY2025 (period ending October 2024)?

**Gold slugs (2):** financials/nvda-2024-10-27, sec/nvda/8-k-2024-11-20

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** financials/nvda-2024-10-27, sec/nvda/8-k-2025-08-27, financials/nvda-2025-10-26, sec/nvda/8-k-2024-11-20, sec/nvda/8-k-2025-11-19

### ✅ financials-02

**Question:** What was Meta Platforms' GAAP operating income, operating margin, net income, and diluted EPS for Q4 2024?

**Gold slugs (1):** financials/meta-2024-12-31

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** financials/meta-2024-12-31, sec/meta/8-k-2025-01-29, financials/meta-2024-09-30, sec/meta/10-k-2025-01-30, financials/meta-2025-12-31

### ✅ financials-03

**Question:** What were Microsoft's diluted EPS, net income, and net margin for Q3 FY2025 (period ending March 2025)?

**Gold slugs (1):** financials/msft-2025-03-31

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** financials/msft-2025-03-31, financials/msft-2025-06-30, financials/msft-2026-03-31, sec/msft/8-k-2025-04-30, financials/msft-2025-09-30

### ✅ financials-04

**Question:** What was Apple's revenue, gross profit, gross margin, and diluted EPS for Q1 FY2024 (holiday quarter ending December 2023)?

**Gold slugs (1):** financials/aapl-2023-12-30

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** financials/aapl-2023-12-30, financials/aapl-2024-09-28, financials/aapl-2024-12-28, sec/aapl/10-q-2024-02-02, sec/aapl/8-k-2025-01-30

### ✅ financials-05

**Question:** What was NVIDIA's cash position, total assets, total debt, and stockholders equity at the end of Q4 FY2025 (January 2025)?

**Gold slugs (1):** financials/nvda-2025-01-26

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** financials/nvda-2025-01-26, sec/nvda/8-k-2025-02-26, sec/nvda/8-k-2025-02-26, sec/nvda/8-k-2026-02-25, sec/nvda/8-k-2025-05-28

### ✅ financials-06

**Question:** What was Alphabet's cash and short-term investments, total debt, and stockholders equity at end of Q4 2024?

**Gold slugs (1):** financials/googl-2024-12-31

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** financials/googl-2024-12-31, sec/googl/8-k-2025-02-04, sec/googl/8-k-2024-04-25, sec/googl/8-k-2024-07-23, sec/googl/8-k-2025-10-29

### ✅ financials-07

**Question:** What was Meta Platforms' cash and short-term investments, total assets, and stockholders equity at end of Q4 2024?

**Gold slugs (1):** financials/meta-2024-12-31

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** financials/meta-2024-12-31, financials/meta-2024-09-30, sec/meta/8-k-2025-01-29, sec/meta/8-k-2024-10-30, sec/meta/8-k-2026-01-28

### ✅ financials-08

**Question:** How much total debt did Apple carry versus stockholders equity at end of Q4 FY2024 (September 2024), and what was net debt?

**Gold slugs (1):** financials/aapl-2024-09-28

**Result:** Hit ✓ | Recall: 100% | MRR: 0.33 | First hit rank: #3

**Retrieved (top 5):** financials/aapl-2025-09-27, financials/aapl-2024-12-28, financials/aapl-2024-09-28, sec/aapl/8-k-2025-10-30, sec/aapl/8-k-2025-01-30

### ✅ financials-09

**Question:** What was NVIDIA's operating cash flow, capital expenditures, and free cash flow in Q3 FY2025?

**Gold slugs (1):** financials/nvda-2024-10-27

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** financials/nvda-2024-10-27, sec/nvda/8-k-2025-11-19, sec/nvda/8-k-2025-02-26, financials/nvda-2023-10-29, financials/nvda-2025-10-26

### ✅ financials-10

**Question:** What were Microsoft's operating cash flow, capital expenditures, and free cash flow in Q4 FY2024 (June 2024)?

**Gold slugs (2):** financials/msft-2024-06-30, sec/MSFT/8-k-2024-07-30

**Result:** Hit ✓ | Recall: 50% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** financials/msft-2024-06-30, financials/msft-2024-03-31, financials/msft-2025-06-30, financials/msft-2024-09-30, financials/msft-2023-06-30

### ✅ financials-11

**Question:** What was Meta Platforms' operating cash flow, capex, and free cash flow in Q3 2024?

**Gold slugs (1):** financials/meta-2024-09-30

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** financials/meta-2024-09-30, sec/meta/8-k-2024-10-30, financials/meta-2025-09-30, financials/meta-2023-09-30, sec/meta/8-k-2024-07-31

### ✅ financials-12

**Question:** How much did NVIDIA spend on stock buybacks and what was stock-based compensation in Q3 FY2025?

**Gold slugs (1):** financials/nvda-2024-10-27

**Result:** Hit ✓ | Recall: 100% | MRR: 0.50 | First hit rank: #2

**Retrieved (top 5):** financials/nvda-2022-10-30, financials/nvda-2024-10-27, sec/nvda/8-k-2024-08-28, sec/nvda/8-k-2025-08-27, sec/nvda/8-k-2025-05-28

### ✅ financials-13

**Question:** What was Apple's stock buyback spend and diluted shares outstanding in Q1 FY2024 (holiday quarter ending December 2023)?

**Gold slugs (1):** financials/aapl-2023-12-30

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** financials/aapl-2023-12-30, financials/aapl-2024-09-28, financials/aapl-2024-12-28, financials/aapl-2024-06-29, financials/aapl-2022-12-31

### ✅ financials-14

**Question:** What was Alphabet's capital expenditure and stock buyback spend in Q4 2024?

**Gold slugs (1):** financials/googl-2024-12-31

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** financials/googl-2024-12-31, financials/googl-2023-12-31, financials/googl-2024-09-30, financials/googl-2025-12-31, transcripts/googl-2024-q4

### ❌ financials-15

**Question:** What was NVIDIA's revenue breakdown by business segment in Q3 FY2025 — Data Center, Gaming, Automotive, and Professional Visualization?

**Gold slugs (1):** sec/nvda/8-k-2024-11-20

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** sec/nvda/10-q-2023-11-21, sec/nvda/10-q-2024-05-29, sec/nvda/10-q-2023-05-26, sec/nvda/10-q-2022-05-27, sec/nvda/10-q-2023-08-28

**Failure bucket:** B2_FORM_TYPE — B2 — Wrong SEC form type: retrieves right company+period, wrong filing type (8-K vs 10-Q vs 10-K)

**Diagnosis:** Gold is a 8-K press release. System retrieves 10-Q instead. 8-k Either not indexed properly or there is no quarter information in the 8-k filing.

### ✅ financials-16

**Question:** What was Microsoft's revenue for each of its three reportable segments in Q3 FY2025, and what was Azure growth?

**Gold slugs (1):** sec/msft/8-k-2025-04-30

**Result:** Hit ✓ | Recall: 100% | MRR: 0.20 | First hit rank: #5

**Retrieved (top 5):** sec/msft/8-k-2025-10-29, transcripts/msft-2022-q2, transcripts/msft-2024-q2, transcripts/msft-2025-q2, sec/msft/8-k-2025-04-30

### ✅ financials-17

**Question:** What was Alphabet's Google Services and Google Cloud revenue and operating income in Q4 2024?

**Gold slugs (1):** sec/googl/8-k-2025-02-04

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** sec/googl/8-k-2025-02-04, transcripts/googl-2024-q4, sec/googl/8-k-2026-02-04, sec/googl/8-k-2025-10-29, sec/googl/8-k-2024-07-23

### ✅ financials-18

**Question:** What was NVIDIA's year-over-year revenue and operating income growth from Q3 FY2024 (October 2023) to Q3 FY2025 (October 2024)?

**Gold slugs (2):** financials/nvda-2023-10-29, financials/nvda-2024-10-27

**Result:** Hit ✓ | Recall: 50% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** financials/nvda-2024-10-27, sec/nvda/8-k-2025-02-26, sec/nvda/10-k-2025-02-26, sec/nvda/8-k-2025-08-27, sec/nvda/8-k-2024-08-28

### ✅ financials-19

**Question:** How did Meta Platforms' operating margin and revenue change quarter-over-quarter from Q3 2024 to Q4 2024?

**Gold slugs (2):** financials/meta-2024-09-30, financials/meta-2024-12-31

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** financials/meta-2024-09-30, financials/meta-2024-12-31, sec/meta/8-k-2024-10-30, sec/meta/8-k-2025-01-29, financials/meta-2025-09-30

### ✅ financials-20

**Question:** How did Microsoft's gross margin and operating margin change quarter-over-quarter from Q4 FY2024 (June 2024) to Q3 FY2025 (March 2025)?

**Gold slugs (2):** financials/msft-2024-06-30, financials/msft-2025-03-31

**Result:** Hit ✓ | Recall: 50% | MRR: 0.50 | First hit rank: #2

**Retrieved (top 5):** financials/msft-2024-03-31, financials/msft-2025-03-31, financials/msft-2023-03-31, sec/msft/8-k-2024-04-25, sec/msft/8-k-2025-04-30

## transcript (20 questions)

### ❌ transcript-01

**Question:** What next-quarter revenue guidance has NVIDIA given across recent earnings calls?

**Gold slugs (2):** transcripts/NVDA-2024-Q3, transcripts/NVDA-2025-Q1

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** sec/nvda/8-k-2025-05-28, sec/nvda/8-k-2025-08-27, sec/nvda/8-k-2024-11-20, transcripts/nvda-2025-q4, transcripts/nvda-2022-q1

**Failure bucket:** B1_WRONG_QUARTER — B1 — Wrong quarter / date: retrieves right company+topic but wrong specific time period

**Diagnosis:** System retrieves NVDA-2024-Q3 documents on the right topic but from the wrong quarter. The question does not contain a specific date anchor, so vector similarity cannot distinguish the intended quarter from adjacent ones.

### ❌ transcript-02

**Question:** What has Jensen Huang said across earnings calls about the revenue opportunity for cloud providers running NVIDIA infrastructure?

**Gold slugs (1):** transcripts/NVDA-2025-Q1

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** transcripts/nvda-2026-q2, transcripts/nvda-2023-q3, transcripts/nvda-2024-q1, transcripts/nvda-2024-q4, transcripts/nvda-2023-q4

**Failure bucket:** B1_WRONG_QUARTER — B1 — Wrong quarter / date: retrieves right company+topic but wrong specific time period

**Diagnosis:** System retrieves NVDA-2025-Q1 documents on the right topic but from the wrong quarter. The question does not contain a specific date anchor, so vector similarity cannot distinguish the intended quarter from adjacent ones.

### ✅ transcript-03

**Question:** How has NVIDIA described its China and export-control situation across earnings calls — revenue exposure, expected declines, and the H20 ban impact?

**Gold slugs (3):** transcripts/NVDA-2024-Q3, transcripts/NVDA-2025-Q2, transcripts/NVDA-2026-Q1

**Result:** Hit ✓ | Recall: 33% | MRR: 0.25 | First hit rank: #4

**Retrieved (top 5):** sec/nvda/10-k-2024-02-21, transcripts/nvda-2024-q4, sec/nvda/10-q-2023-05-26, transcripts/nvda-2026-q1, sec/nvda/10-q-2024-08-28

### ✅ transcript-04

**Question:** How has Meta's annual capex guidance changed across earnings calls as AI infrastructure demand grew?

**Gold slugs (3):** transcripts/META-2024-Q1, transcripts/META-2024-Q2, transcripts/META-2024-Q4

**Result:** Hit ✓ | Recall: 33% | MRR: 0.20 | First hit rank: #5

**Retrieved (top 5):** transcripts/meta-2022-q3, transcripts/meta-2025-q1, transcripts/meta-2023-q4, transcripts/meta-2023-q4, transcripts/meta-2024-q4

### ✅ transcript-05

**Question:** What has Alphabet signaled about its capital expenditure trajectory across earnings calls, and what specific 2025 commitment did it announce?

**Gold slugs (2):** transcripts/GOOGL-2023-Q4, transcripts/GOOGL-2024-Q4

**Result:** Hit ✓ | Recall: 50% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** transcripts/googl-2024-q4, sec/googl/10-k-2026-02-05, transcripts/googl-2025-q4, transcripts/googl-2025-q1, sec/googl/10-k-2026-02-05

### ✅ transcript-06

**Question:** What has NVIDIA disclosed across earnings calls about Blackwell production challenges, ramp timeline, and the scale at which hyperscalers are deploying Blackwell?

**Gold slugs (2):** transcripts/NVDA-2025-Q2, transcripts/NVDA-2026-Q1

**Result:** Hit ✓ | Recall: 50% | MRR: 0.33 | First hit rank: #3

**Retrieved (top 5):** transcripts/nvda-2025-q1, transcripts/nvda-2025-q3, transcripts/nvda-2025-q2, transcripts/nvda-2025-q4, transcripts/nvda-2025-q3

### ✅ transcript-07

**Question:** What specific named customers and their GPU cluster sizes has Jensen Huang cited across NVIDIA earnings calls?

**Gold slugs (3):** transcripts/NVDA-2024-Q3, transcripts/NVDA-2025-Q1, transcripts/NVDA-2026-Q1

**Result:** Hit ✓ | Recall: 33% | MRR: 0.50 | First hit rank: #2

**Retrieved (top 5):** transcripts/nvda-2024-q1, transcripts/nvda-2025-q1, transcripts/nvda-2022-q4, transcripts/nvda-2023-q3, transcripts/nvda-2026-q4

### ✅ transcript-08

**Question:** What has Meta said across earnings calls about its MTIA custom AI chip — what workloads it runs, the rollout timeline, and why Meta is building its own silicon?

**Gold slugs (1):** transcripts/META-2024-Q4

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** transcripts/meta-2024-q4, transcripts/meta-2026-q1, transcripts/meta-2024-q4, transcripts/meta-2025-q2, transcripts/meta-2025-q4

### ✅ transcript-09

**Question:** What custom silicon chips has Microsoft named across earnings calls, and what data center capacity milestones has it cited?

**Gold slugs (2):** transcripts/MSFT-2024-Q3, transcripts/MSFT-2025-Q2

**Result:** Hit ✓ | Recall: 50% | MRR: 0.50 | First hit rank: #2

**Retrieved (top 5):** transcripts/msft-2026-q2, transcripts/msft-2025-q2, transcripts/msft-2025-q3, transcripts/msft-2024-q2, transcripts/msft-2026-q2

### ✅ transcript-10

**Question:** How has Google described its TPU technology and named AI customers on Google Cloud across earnings calls?

**Gold slugs (2):** transcripts/GOOGL-2023-Q4, transcripts/GOOGL-2024-Q4

**Result:** Hit ✓ | Recall: 50% | MRR: 0.25 | First hit rank: #4

**Retrieved (top 5):** transcripts/googl-2026-q1, transcripts/googl-2026-q1, transcripts/googl-2024-q3, transcripts/googl-2024-q4, transcripts/googl-2025-q4

### ✅ transcript-11

**Question:** What has Apple disclosed across earnings calls about its active device count, paid subscriptions, and major product launches?

**Gold slugs (2):** transcripts/AAPL-2023-Q4, transcripts/AAPL-2024-Q1

**Result:** Hit ✓ | Recall: 100% | MRR: 0.50 | First hit rank: #2

**Retrieved (top 5):** transcripts/aapl-2023-q1, transcripts/aapl-2023-q4, transcripts/aapl-2022-q3, transcripts/aapl-2023-q3, transcripts/aapl-2024-q1

### ❌ transcript-12

**Question:** What GPU throughput or performance numbers has NVIDIA cited across earnings calls to illustrate generational improvement?

**Gold slugs (2):** transcripts/NVDA-2024-Q3, transcripts/NVDA-2025-Q1

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** transcripts/nvda-2026-q3, transcripts/nvda-2026-q1, transcripts/nvda-2024-q1, transcripts/nvda-2026-q4, transcripts/nvda-2026-q4

**Failure bucket:** B1_WRONG_QUARTER — B1 — Wrong quarter / date: retrieves right company+topic but wrong specific time period

**Diagnosis:** System retrieves NVDA-2024-Q3 documents on the right topic but from the wrong quarter. The question does not contain a specific date anchor, so vector similarity cannot distinguish the intended quarter from adjacent ones.

### ❌ transcript-13

**Question:** On Microsoft's Q3 FY2024 earnings call, what did the company disclose about GitHub Copilot subscriber count and Fortune 500 enterprise adoption?

**Gold slugs (1):** transcripts/MSFT-2024-Q3

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** transcripts/msft-2026-q3, transcripts/msft-2025-q4, transcripts/msft-2024-q1, transcripts/msft-2024-q4, transcripts/msft-2026-q1

**Failure bucket:** B1_WRONG_QUARTER — B1 — Wrong quarter / date: retrieves right company+topic but wrong specific time period

**Diagnosis:** System retrieves MSFT-2024-Q3 documents on the right topic but from the wrong quarter. The question does not contain a specific date anchor, so vector similarity cannot distinguish the intended quarter from adjacent ones.

### ✅ transcript-14

**Question:** What has Meta disclosed across earnings calls about AI-driven content recommendations and the impact of AI on its advertising systems?

**Gold slugs (2):** transcripts/META-2024-Q1, transcripts/META-2024-Q4

**Result:** Hit ✓ | Recall: 50% | MRR: 0.20 | First hit rank: #5

**Retrieved (top 5):** transcripts/meta-2024-q2, transcripts/meta-2023-q2, transcripts/meta-2025-q2, transcripts/meta-2022-q2, transcripts/meta-2024-q1

### ❌ transcript-15

**Question:** What have companies disclosed across earnings calls about the compute scale required to train their next-generation AI models?

**Gold slugs (3):** transcripts/META-2024-Q2, transcripts/META-2024-Q4, transcripts/NVDA-2025-Q1

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** transcripts/nvda-2025-q2, transcripts/nvda-2025-q3, transcripts/msft-2025-q1, transcripts/meta-2023-q1, transcripts/meta-2026-q1

**Failure bucket:** B1_WRONG_QUARTER — B1 — Wrong quarter / date: retrieves right company+topic but wrong specific time period

**Diagnosis:** System retrieves META-2024-Q2 documents on the right topic but from the wrong quarter. The question does not contain a specific date anchor, so vector similarity cannot distinguish the intended quarter from adjacent ones.

### ✅ transcript-16

**Question:** What has Alphabet disclosed across earnings calls about its data center buildout, subsea cables, and cloud infrastructure investment scale?

**Gold slugs (2):** transcripts/GOOGL-2023-Q4, transcripts/GOOGL-2024-Q4

**Result:** Hit ✓ | Recall: 50% | MRR: 0.25 | First hit rank: #4

**Retrieved (top 5):** sec/googl/10-k-2026-02-05, transcripts/googl-2025-q4, sec/googl/10-q-2022-04-27, transcripts/googl-2024-q4, transcripts/googl-2025-q4

### ✅ transcript-17

**Question:** What has Meta said across earnings calls about the physical scale of its AI infrastructure buildout?

**Gold slugs (2):** transcripts/META-2024-Q2, transcripts/META-2024-Q4

**Result:** Hit ✓ | Recall: 100% | MRR: 0.33 | First hit rank: #3

**Retrieved (top 5):** transcripts/meta-2026-q1, transcripts/meta-2022-q3, transcripts/meta-2024-q4, transcripts/meta-2024-q2, transcripts/meta-2024-q4

### ❌ transcript-18

**Question:** What has Google management said across earnings calls about the pace of AI workload adoption on Google Cloud — developer counts, compute consumption, and enterprise customers?

**Gold slugs (2):** transcripts/GOOGL-2023-Q4, transcripts/GOOGL-2024-Q4

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** transcripts/googl-2023-q2, transcripts/googl-2025-q4, transcripts/googl-2023-q2, transcripts/googl-2024-q2, transcripts/googl-2023-q3

**Failure bucket:** B1_WRONG_QUARTER — B1 — Wrong quarter / date: retrieves right company+topic but wrong specific time period

**Diagnosis:** System retrieves GOOGL-2023-Q4 documents on the right topic but from the wrong quarter. The question does not contain a specific date anchor, so vector similarity cannot distinguish the intended quarter from adjacent ones.

### ✅ transcript-19

**Question:** What has Microsoft management said across earnings calls about Azure AI capacity, demand versus supply dynamics, and AI's contribution to Azure growth?

**Gold slugs (2):** transcripts/MSFT-2024-Q3, transcripts/MSFT-2025-Q2

**Result:** Hit ✓ | Recall: 50% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** transcripts/msft-2024-q3, transcripts/msft-2026-q1, transcripts/msft-2024-q2, transcripts/msft-2023-q4, transcripts/msft-2024-q4

### ✅ transcript-20

**Question:** What have the major hyperscalers committed to spending on AI infrastructure, and how have those commitments scaled over successive earnings calls?

**Gold slugs (5):** transcripts/META-2024-Q2, transcripts/META-2024-Q4, transcripts/GOOGL-2023-Q4, transcripts/GOOGL-2024-Q4, transcripts/NVDA-2026-Q1

**Result:** Hit ✓ | Recall: 20% | MRR: 0.50 | First hit rank: #2

**Retrieved (top 5):** substack/the-ai-semiconductor-landscape-2025, transcripts/meta-2024-q4, substack/ai-compute-warehouses-will-disrupt-global-energy-grids, substack/the-q1-ai-capex-roundup-further-loosening, substack/mckinseys-cost-of-compute-ai-infrastructure

## sec (15 questions)

### ✅ sec-01

**Question:** What were NVIDIA's full-year FY2025 revenue and Data Center revenue, and what Q1 FY2026 guidance did the company give in its earnings press release?

**Gold slugs (1):** sec/NVDA/8-k-2025-02-26

**Result:** Hit ✓ | Recall: 100% | MRR: 0.33 | First hit rank: #3

**Retrieved (top 5):** sec/nvda/8-k-2025-05-28, sec/nvda/8-k-2025-08-27, sec/nvda/8-k-2025-02-26, sec/nvda/8-k-2026-02-25, sec/nvda/10-q-2024-05-29

### ❌ sec-02

**Question:** Which cloud providers were named in NVIDIA's earnings press release as deploying GB200 NVL72 systems?

**Gold slugs (2):** sec/NVDA/8-k-2025-02-26, sec/NVDA/8-k-2024-11-20

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** transcripts/nvda-2024-q1, transcripts/nvda-2025-q3, sec/nvda/8-k-2023-11-21, sec/nvda/8-k-2026-02-25, transcripts/nvda-2025-q2

**Failure bucket:** B2_FORM_TYPE — B2 — Wrong SEC form type: retrieves right company+period, wrong filing type (8-K vs 10-Q vs 10-K)

**Diagnosis:** Topic was mentioned but it did not locate the topic in 8-k. It located the topic in earnings transcripts

### ❌ sec-03

**Question:** What did NVIDIA's earnings press release say about the xAI Colossus cluster and sovereign AI supercomputer deployments?

**Gold slugs (1):** sec/NVDA/8-k-2024-11-20

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** transcripts/nvda-2026-q2, transcripts/nvda-2024-q3, transcripts/nvda-2025-q2, transcripts/nvda-2025-q1, transcripts/nvda-2026-q4

**Failure bucket:** B2_FORM_TYPE — B2 — Wrong SEC form type: retrieves right company+period, wrong filing type (8-K vs 10-Q vs 10-K)

**Diagnosis:** Topic was mentioned but it did not locate the topic in 8-k. It located the topic in earnings transcripts.

### ❌ sec-04

**Question:** What were the growth rates for Microsoft's sub-segments — LinkedIn, Dynamics 365, and Search & news ads — in its Q3 FY2025 earnings press release?

**Gold slugs (1):** sec/MSFT/8-k-2025-04-30

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** transcripts/msft-2025-q2, transcripts/msft-2022-q4, transcripts/msft-2022-q2, transcripts/msft-2026-q2, transcripts/msft-2026-q2

**Failure bucket:** B2_FORM_TYPE — B2 — Wrong SEC form type: retrieves right company+period, wrong filing type (8-K vs 10-Q vs 10-K)

**Diagnosis:** Gold is a 8-K press release. System retrieves earnings transcript instead. The query semantics do not signal which SEC form type is needed — the retrieval system treats all SEC docs as equally relevant for the topic.

### ✅ sec-05

**Question:** What were Meta's full-year 2024 revenue, operating income, free cash flow, and capex from its earnings press release, and what Q1 2025 guidance did it provide?

**Gold slugs (1):** sec/META/8-k-2025-01-29

**Result:** Hit ✓ | Recall: 100% | MRR: 0.25 | First hit rank: #4

**Retrieved (top 5):** sec/meta/8-k-2024-07-31, sec/meta/8-k-2026-01-28, financials/meta-2024-12-31, sec/meta/8-k-2025-01-29, sec/meta/8-k-2024-10-30

### ✅ sec-06

**Question:** What does Alphabet's FY2024 10-K say is the primary risk from its revenue concentration in digital advertising?

**Gold slugs (1):** sec/GOOGL/10-k-2025-02-05

**Result:** Hit ✓ | Recall: 100% | MRR: 0.50 | First hit rank: #2

**Retrieved (top 5):** sec/googl/10-k-2023-02-03, sec/googl/10-k-2025-02-05, sec/googl/10-k-2026-02-05, sec/googl/10-k-2024-01-31, sec/googl/10-k-2025-02-05

### ✅ sec-07

**Question:** What were Google Services and Google Cloud operating income and margins for full-year FY2024 per the annual report?

**Gold slugs (1):** sec/GOOGL/10-k-2025-02-05

**Result:** Hit ✓ | Recall: 100% | MRR: 0.20 | First hit rank: #5

**Retrieved (top 5):** sec/googl/10-k-2024-01-31, sec/googl/8-k-2025-02-04, sec/googl/8-k-2026-02-04, sec/googl/8-k-2024-07-23, sec/googl/10-k-2025-02-05

### ✅ sec-08

**Question:** When did Microsoft acquire Activision Blizzard and for what terms?

**Gold slugs (1):** sec/MSFT/10-k-2024-07-30

**Result:** Hit ✓ | Recall: 100% | MRR: 0.25 | First hit rank: #4

**Retrieved (top 5):** sec/msft/8-k-2022-01-18, sec/msft/8-k-2023-10-13, sec/msft/8-k-2022-01-18, sec/msft/10-k-2024-07-30, sec/msft/8-k-2023-10-16

### ✅ sec-09

**Question:** Which named automotive, healthcare, robotics, and telecom partners appeared in NVIDIA's recent earnings press releases?

**Gold slugs (2):** sec/NVDA/8-k-2025-02-26, sec/NVDA/8-k-2024-11-20

**Result:** Hit ✓ | Recall: 50% | MRR: 0.50 | First hit rank: #2

**Retrieved (top 5):** sec/nvda/8-k-2022-02-16, sec/nvda/8-k-2025-02-26, sec/nvda/8-k-2025-11-19, transcripts/nvda-2025-q2, sec/nvda/8-k-2025-02-26

### ❌ sec-10

**Question:** What was Apple's geographic revenue breakdown in Q1 FY2025, and which region declined year-over-year?

**Gold slugs (1):** sec/AAPL/8-k-2025-01-30

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** sec/aapl/10-q-2024-02-02, sec/aapl/10-q-2023-02-03, sec/aapl/10-q-2025-01-31, sec/aapl/10-k-2023-11-03, sec/aapl/10-q-2025-05-02

**Failure bucket:** B2_FORM_TYPE — B2 — Wrong SEC form type: retrieves right company+period, wrong filing type (8-K vs 10-Q vs 10-K)

**Diagnosis:** Gold is a 8-K press release. System retrieves 10-Q instead. The query semantics do not signal which SEC form type is needed — the retrieval system treats all SEC docs as equally relevant for the topic.

### ❌ sec-11

**Question:** How much money did Meta lose in Reality Labs in FY2024?

**Gold slugs (2):** sec/META/10-k-2025-01-30, sec/META/8-k-2025-01-29

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** sec/meta/8-k-2024-10-30, sec/meta/8-k-2024-07-31, sec/meta/8-k-2024-04-24, transcripts/meta-2024-q3, sec/meta/8-k-2024-02-01

**Failure bucket:** B2_FORM_TYPE — B2 — Wrong SEC form type: retrieves right company+period, wrong filing type (8-K vs 10-Q vs 10-K)

**Diagnosis:** Gold is a 10-K annual report. System retrieves sec instead. The query semantics do not signal which SEC form type is needed — the retrieval system treats all SEC docs as equally relevant for the topic.

### ✅ sec-12

**Question:** What were Meta's geographic revenue growth rates in Q3 2024 per its quarterly filing, and which region grew fastest?

**Gold slugs (1):** sec/META/10-q-2024-10-31

**Result:** Hit ✓ | Recall: 100% | MRR: 0.33 | First hit rank: #3

**Retrieved (top 5):** sec/meta/10-q-2025-10-30, sec/meta/10-q-2024-08-01, sec/meta/10-q-2024-10-31

### ✅ sec-13

**Question:** What categories of risk does Meta disclose in its most recent 10-K and 10-Q?

**Gold slugs (2):** sec/META/10-k-2025-01-30, sec/META/10-q-2024-10-31

**Result:** Hit ✓ | Recall: 50% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** sec/meta/10-k-2025-01-30, sec/meta/10-k-2024-02-02, sec/meta/10-k-2023-02-02, sec/meta/10-k-2022-02-03, sec/meta/10-k-2026-01-29

### ✅ sec-14

**Question:** What was Google's employee headcount at end of 2024 and end of 2025?

**Gold slugs (2):** sec/GOOGL/10-k-2025-02-05, sec/GOOGL/10-k-2026-02-05

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** sec/googl/10-k-2026-02-05, sec/googl/8-k-2026-02-04, transcripts/googl-2025-q1, sec/googl/10-k-2025-02-05, sec/googl/10-q-2025-04-25

### ❌ sec-15

**Question:** What was Microsoft Cloud revenue and Azure growth in Q3 FY2025 per the earnings press release?

**Gold slugs (1):** sec/MSFT/8-k-2025-04-30

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** transcripts/msft-2025-q2, sec/msft/8-k-2023-04-25, sec/msft/8-k-2026-04-29, sec/msft/8-k-2026-04-29, transcripts/msft-2026-q2

**Failure bucket:** B2_FORM_TYPE — B2 — Wrong SEC form type: retrieves right company+period, wrong filing type (8-K vs 10-Q vs 10-K)

**Diagnosis:** Gold is a 8-K press release. System retrieves earnings transcript instead. The query semantics do not signal which SEC form type is needed — the retrieval system treats all SEC docs as equally relevant for the topic.

## portfolio (5 questions)

### ✅ portfolio-01

**Question:** What are the five largest long equity positions by NAV weight in the portfolio, and what is the combined NAV weight of the top three?

**Gold slugs (1):** portfolio/holdings-2026-05-12

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** portfolio/holdings-2026-05-12, sec/googl/10-q-2025-07-24, price/nvda-cy2023-q3, price/nvda-cy2025-q1, sec/nvda/8-k-2025-05-28

### ✅ portfolio-02

**Question:** What is the composition and total unrealized P&L of the short book?

**Gold slugs (1):** portfolio/holdings-2026-05-12

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** portfolio/holdings-2026-05-12, social/dylan522p/2039463905786048795, sec/msft/8-k-2026-01-28, sec/googl/10-q-2025-04-25, sec/msft/8-k-2026-04-29

### ✅ portfolio-03

**Question:** Which long equity positions are the biggest P&L winners and losers in dollar terms, and what is the count of profitable vs underwater positions across the 21 long holdings?

**Gold slugs (1):** portfolio/holdings-2026-05-12

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** portfolio/holdings-2026-05-12, analyst-estimates/wolf, analyst-estimates/aapl, price/nvda-cy2025-q1, price/nvda-cy2022-q1

### ✅ portfolio-04

**Question:** How is the long book distributed across thematic clusters, and which cluster has the largest combined NAV exposure?

**Gold slugs (1):** portfolio/holdings-2026-05-12

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** portfolio/holdings-2026-05-12, transcripts/msft-2026-q1, substack/ai-vs-everything-we-care-about-2025about, substack/ai-trends-2025-lookback-and-2026-meta-trends, substack/ai-report-nuggets-and-commentary-2026-ai-trends

### ✅ portfolio-05

**Question:** Which portfolio positions have already exceeded analyst consensus price targets, and which have the most upside remaining to consensus?

**Gold slugs (7):** portfolio/holdings-2026-05-12, analyst-estimates/WOLF, analyst-estimates/WYFI, analyst-estimates/RKLB, analyst-estimates/NVDA, analyst-estimates/MSFT, analyst-estimates/GOOGL

**Result:** Hit ✓ | Recall: 43% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** analyst-estimates/wolf, analyst-estimates/wyfi, analyst-estimates/nvda, analyst-estimates/rddt, analyst-estimates/asts

## news (15 questions)

### ❌ news-01

**Question:** When did the Trump administration ban H20 chip exports to China, and what charge did NVIDIA take?

**Gold slugs (1):** substack/ai-in-2025-recap-the-year-the-old-rules-ai-trends

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** sec/nvda/10-k-2026-02-25, transcripts/nvda-2026-q1, sec/nvda/10-q-2025-05-28, sec/nvda/8-k-2025-08-27, sec/nvda/10-q-2025-05-28

**Failure bucket:** B4_RECAP_ARTICLE — B4 — Recap article vs primary source: system correctly finds primary source but question gold points to year-in-review summary

**Diagnosis:** Gold points to a year-in-review recap article. The system correctly retrieves primary-source articles covering the same events/facts, which are semantically closer to the query than the recap. The recap is a derived summary; primary sources outrank it in vector space.

### ❌ news-02

**Question:** When did the Trump administration rescind Biden's AI Diffusion Rule, and what policy reversal occurred in December 2025 around China chip exports?

**Gold slugs (1):** substack/ai-in-2025-recap-the-year-the-old-rules-ai-trends

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** substack/how-trump-china-and-trade-wars-will, substack/milestones-of-china-in-ai-of-2025-deepseek-qwen, substack/how-china-built-a-parallel-ai-chip-ecosystem-semiconductors-huawei-ai, substack/how-trump-china-and-trade-wars-will, sec/nvda/10-k-2026-02-25

**Failure bucket:** B4_RECAP_ARTICLE — B4 — Recap article vs primary source: system correctly finds primary source but question gold points to year-in-review summary

**Diagnosis:** Gold points to a year-in-review recap article. The system correctly retrieves primary-source articles covering the same events/facts, which are semantically closer to the query than the recap. The recap is a derived summary; primary sources outrank it in vector space.

### ✅ news-03

**Question:** When did Dylan Patel publicly address the Alibaba Megaspeed chip diversion through Malaysia and Singapore, and what did he say?

**Gold slugs (1):** social/dylan522p/1976771063942926649

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** social/dylan522p/1976771063942926649, social/dylan522p/1882772529850548511, social/dylan522p/1976771063942926649, social/dylan522p/1988685122015752489, social/dylan522p/1930421315175100479

### ✅ news-04

**Question:** When did TSMC exit its stake in Arm, and for how much?

**Gold slugs (1):** social/dylan522p/2051109332750835754

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** social/dylan522p/2051109332750835754, substack/tsmc-the-quiet-titan, substack/tsmc-role-in-the-global-ai-and-geopolitical-future, substack/tsmc-the-quiet-titan, substack/tsmc-role-in-the-global-ai-and-geopolitical-future

### ✅ news-05

**Question:** When did Johny Srouji become Apple's Chief Hardware Officer, and what happened to John Ternus?

**Gold slugs (1):** social/dylan522p/2046373494380794338

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** social/dylan522p/2046373494380794338, sec/aapl/8-k-2026-04-20, transcripts/aapl-2026-q2, transcripts/aapl-2026-q2, sec/aapl/8-k-2026-04-20

### ✅ news-06

**Question:** How large was the AI code-generation startup market by end of 2025, and which companies led on ARR growth?

**Gold slugs (1):** substack/ai-in-2025-recap-the-year-the-old-rules-ai-trends

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** substack/ai-in-2025-recap-the-year-the-old-rules-ai-trends, substack/ai-in-2025-recap-the-year-the-old-rules-ai-trends, substack/an-ai-overview-2025-by-the-numbers-in-infographics-curated, substack/is-agi-a-hoax-of-silicon-valley, substack/top-generative-ai-startups-im-watching

### ✅ news-07

**Question:** What did both OpenAI and Google DeepMind achieve at the International Math Olympiad in 2025, and what were the top AIME 2025 model scores?

**Gold slugs (1):** substack/ai-in-2025-recap-the-year-the-old-rules-ai-trends

**Result:** Hit ✓ | Recall: 100% | MRR: 0.33 | First hit rank: #3

**Retrieved (top 5):** substack/its-all-in-the-math, substack/the-top-six-rivals-competing-with, substack/ai-in-2025-recap-the-year-the-old-rules-ai-trends, substack/all-of-googles-ai-products-and-tools-gemini-2025, substack/how-to-use-notebooklm-for-personalized

### ✅ news-08

**Question:** What did a report cited by Dylan Patel reveal about Meta's token consumption in 2026?

**Gold slugs (1):** social/dylan522p/2042416273599185254

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** social/dylan522p/2042416273599185254, financials/meta-2026-03-31, sec/meta/8-k-2026-01-28, transcripts/meta-2025-q4, sec/meta/8-k-2025-10-29

### ✅ news-09

**Question:** What open source release did NVIDIA make for AI inference in April 2026, as reported by Dylan Patel?

**Gold slugs (1):** social/dylan522p/2040213520411709565

**Result:** Hit ✓ | Recall: 100% | MRR: 0.50 | First hit rank: #2

**Retrieved (top 5):** transcripts/nvda-2026-q1, social/dylan522p/2040213520411709565, transcripts/nvda-2022-q3, transcripts/nvda-2022-q1, sec/nvda/8-k-2025-05-28

### ✅ news-10

**Question:** What did Dylan Patel reveal about Claude Code spending at SemiAnalysis, and how did Anthropic's Opus 4.7 change the economics?

**Gold slugs (1):** social/dylan522p/2047104466512400639

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** social/dylan522p/2047104466512400639, social/dylan522p/2047403831844081936, substack/vibe-coding-a-mobile-app-with-claude-opus-4-5, substack/openai-momentum-is-spiraling-down-ipo-2027, social/dylan522p/2020950282088427645

### ✅ news-11

**Question:** What throughput improvement did SemiAnalysis InferenceMAX show for open-source models running on Blackwell?

**Gold slugs (1):** social/dylan522p/2002135815233970295

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** social/dylan522p/2002135815233970295, social/dylan522p/1976692462912782835, social/dylan522p/2023449823442354595, transcripts/nvda-2025-q3, transcripts/nvda-2025-q4

### ❌ news-12

**Question:** What did Dylan Patel say about Microsoft's data center model after Q2 FY2026 earnings?

**Gold slugs (1):** social/dylan522p/2017344503196103130

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** social/dylan522p/1894050388145508586, transcripts/msft-2025-q3, financials/msft-2025-12-31, transcripts/msft-2025-q4, transcripts/msft-2023-q4

**Failure bucket:** B3_SPECIFIC_TWEET — B3 — Specific tweet needle: needs one exact tweet among many topically similar ones

**Diagnosis:** Gold is a specific tweet ID (social/dylan522p/2017344503196103130). Many topically similar Dylan Patel tweets exist in the corpus. Vector similarity finds tweets on the same broad topic but cannot identify the specific tweet without a unique phrase or date anchor.

### ✅ news-13

**Question:** What did the 2025 AI recap report about OpenAI's corporate restructuring, valuation, and ownership split?

**Gold slugs (1):** substack/ai-in-2025-recap-the-year-the-old-rules-ai-trends

**Result:** Hit ✓ | Recall: 100% | MRR: 0.50 | First hit rank: #2

**Retrieved (top 5):** substack/openai-decoded-for-2025, substack/ai-in-2025-recap-the-year-the-old-rules-ai-trends, substack/can-humanity-survive-openai, substack/openai-decoded-for-2025, substack/can-humanity-survive-openai

### ❌ news-14

**Question (revised):** According to the 2025 AI year-end recap, what thesis did the DeepSeek R1 launch break, and how did NVIDIA stock perform by September 2025 compared to its pre-DeepSeek level?

**Gold slugs (1):** substack/ai-in-2025-recap-the-year-the-old-rules-ai-trends

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** substack/china-deepseek-ai-founder-background, substack/was-deepseek-such-a-big-deal-open-source-ai, substack/was-deepseek-such-a-big-deal-open-source-ai, substack/china-deepseek-ai-founder-background

**Failure bucket:** B4_RECAP_ARTICLE — question revised to ask for year-end retrospective framing unique to the recap ("scaling thesis broken" + September 2025 recovery). Primary DeepSeek articles cover the launch but not the 9-month hindsight view.


### ❌ news-15

**Question:** What did the 2025 AI recap say about Meta's capex and how its open source AI strategy performed?

**Gold slugs (1):** substack/ai-in-2025-recap-the-year-the-old-rules-ai-trends

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** transcripts/meta-2023-q1, transcripts/meta-2024-q4, transcripts/meta-2025-q1, transcripts/meta-2023-q4, transcripts/meta-2024-q2

**Failure bucket:** B4_RECAP_ARTICLE — B4 — Recap article vs primary source: system correctly finds primary source but question gold points to year-in-review summary

**Diagnosis:** Gold points to a year-in-review recap article. The system correctly retrieves primary-source articles covering the same events/facts, which are semantically closer to the query than the recap. The recap is a derived summary; primary sources outrank it in vector space.

## product (15 questions)

### ✅ product-01

**Question:** What is the NVIDIA Blackwell GB200 NVL72 system and what are its key performance specs?

**Gold slugs (2):** transcripts/NVDA-2025-Q2, sec/NVDA/8-k-2025-02-26

**Result:** Hit ✓ | Recall: 50% | MRR: 0.50 | First hit rank: #2

**Retrieved (top 5):** substack/nvidias-woodstock-of-ai-conference, transcripts/nvda-2025-q2, social/dylan522p/1813441589995532471, transcripts/nvda-2025-q4, transcripts/nvda-2025-q2

### ❌ product-02

**Question:** What is NVIDIA Spectrum-X Ethernet, what performance advantage does it claim, and how fast is it growing?

**Gold slugs (1):** transcripts/NVDA-2025-Q2

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** transcripts/nvda-2026-q4, transcripts/nvda-2024-q2, transcripts/nvda-2026-q2, transcripts/nvda-2024-q3, transcripts/nvda-2023-q3

**Failure bucket:** B1_WRONG_QUARTER — B1 — Wrong quarter / date: retrieves right company+topic but wrong specific time period

**Diagnosis:** System retrieves NVDA-2025-Q2 documents on the right topic but from the wrong quarter. The question does not contain a specific date anchor, so vector similarity cannot distinguish the intended quarter from adjacent ones.

### ✅ product-03

**Question:** What is NVIDIA's Isaac robotics platform and which companies are using it?

**Gold slugs (1):** transcripts/NVDA-2025-Q2

**Result:** Hit ✓ | Recall: 100% | MRR: 0.20 | First hit rank: #5

**Retrieved (top 5):** transcripts/nvda-2026-q1, transcripts/nvda-2024-q1, transcripts/nvda-2022-q3, sec/nvda/10-k-2022-03-18, transcripts/nvda-2025-q2

### ✅ product-04

**Question:** What is Microsoft 365 Copilot and what enterprise adoption numbers has Microsoft disclosed?

**Gold slugs (1):** transcripts/MSFT-2025-Q2

**Result:** Hit ✓ | Recall: 100% | MRR: 0.50 | First hit rank: #2

**Retrieved (top 5):** transcripts/msft-2025-q4, transcripts/msft-2025-q2, transcripts/msft-2024-q3, transcripts/msft-2024-q4, transcripts/msft-2026-q1

### ✅ product-05

**Question:** What is Microsoft Fabric and what are its key adoption metrics?

**Gold slugs (1):** transcripts/MSFT-2025-Q2

**Result:** Hit ✓ | Recall: 100% | MRR: 0.33 | First hit rank: #3

**Retrieved (top 5):** transcripts/msft-2025-q3, transcripts/msft-2024-q3, transcripts/msft-2025-q2, transcripts/msft-2024-q4, transcripts/msft-2023-q4

### ✅ product-06

**Question:** What is Microsoft's Phi family of small language models and what are its deployment numbers?

**Gold slugs (1):** transcripts/MSFT-2025-Q2

**Result:** Hit ✓ | Recall: 100% | MRR: 0.20 | First hit rank: #5

**Retrieved (top 5):** transcripts/msft-2024-q4, substack/will-2024-be-the-year-of-small-language, transcripts/msft-2026-q1, transcripts/msft-2025-q3, transcripts/msft-2025-q2

### ❌ product-07

**Question (revised):** How many developers were actively using Google Gemini models as of Alphabet's Q4 2024 earnings call, and how had that count changed from six months prior?

**Gold slugs (1):** transcripts/GOOGL-2024-Q4

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** sec/googl/10-k-2025-02-05, substack/gemini-2-and-the-rise-of-multi-modal, transcripts/googl-2024-q1, substack/using-notebooklm-with-gemini-2026, transcripts/googl-2023-q4

**Failure bucket:** B1_WRONG_QUARTER — question revised to ask for the specific 4.4M developer count disclosed on the Q4 2024 call ("double from 6 months prior"). This metric is absent from the substack articles retrieved, making the transcript the unique answer source.


### ❌ product-08

**Question:** What is Google Circle to Search and how widely is it deployed?

**Gold slugs (1):** transcripts/GOOGL-2024-Q4

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** transcripts/googl-2024-q1, transcripts/googl-2023-q4, transcripts/googl-2024-q3, transcripts/googl-2025-q4, transcripts/googl-2024-q2

**Failure bucket:** B1_WRONG_QUARTER — B1 — Wrong quarter / date: retrieves right company+topic but wrong specific time period

**Diagnosis:** System retrieves GOOGL-2024-Q4 documents on the right topic but from the wrong quarter. The question does not contain a specific date anchor, so vector similarity cannot distinguish the intended quarter from adjacent ones.

### ❌ product-09

**Question:** What is Waymo and what scale has it reached?

**Gold slugs (2):** transcripts/GOOGL-2024-Q4, sec/GOOGL/10-k-2025-02-05

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** transcripts/googl-2025-q4, substack/wayve-partners-with-microsoft-to, transcripts/googl-2025-q3, transcripts/googl-2025-q2, transcripts/googl-2025-q1

**Failure bucket:** B1_WRONG_QUARTER — B1 — Wrong quarter / date: retrieves right company+topic but wrong specific time period

**Diagnosis:** System retrieves GOOGL-2024-Q4 documents on the right topic but from the wrong quarter. The question does not contain a specific date anchor, so vector similarity cannot distinguish the intended quarter from adjacent ones.

### ✅ product-10

**Question:** What is Meta AI and what scale has it reached?

**Gold slugs (1):** transcripts/META-2024-Q4

**Result:** Hit ✓ | Recall: 100% | MRR: 0.20 | First hit rank: #5

**Retrieved (top 5):** transcripts/meta-2024-q1, transcripts/meta-2026-q1, transcripts/meta-2024-q1, substack/what-is-metas-new-ai-supercomputer, transcripts/meta-2024-q4

### ❌ product-11

**Question:** What is Threads and what growth metrics has Meta disclosed?

**Gold slugs (1):** transcripts/META-2024-Q4

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** transcripts/meta-2023-q2, transcripts/meta-2024-q2, sec/meta/8-k-2025-01-29, transcripts/meta-2023-q2, transcripts/meta-2024-q2

**Failure bucket:** B1_WRONG_QUARTER — B1 — Wrong quarter / date: retrieves right company+topic but wrong specific time period

**Diagnosis:** System retrieves META-2024-Q4 documents on the right topic but from the wrong quarter. The question does not contain a specific date anchor, so vector similarity cannot distinguish the intended quarter from adjacent ones.

### ✅ product-12

**Question:** What are Ray-Ban Meta AI glasses and what is Zuckerberg's thesis for their success?

**Gold slugs (1):** transcripts/META-2024-Q4

**Result:** Hit ✓ | Recall: 100% | MRR: 0.20 | First hit rank: #5

**Retrieved (top 5):** transcripts/meta-2025-q2, transcripts/meta-2024-q1, transcripts/meta-2025-q4, transcripts/meta-2023-q4, transcripts/meta-2024-q4

### ❌ product-13

**Question:** What is Apple Vision Pro and what operating system does it run?

**Gold slugs (2):** sec/AAPL/10-k-2025-10-31, transcripts/AAPL-2024-Q1

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** substack/apples-pro-vision-a-step-forward, substack/apples-wwdc-blew-me-away, substack/apples-wwdc-blew-me-away, transcripts/aapl-2023-q4, transcripts/nvda-2025-q1

**Failure bucket:** B1_WRONG_QUARTER — B1 — Wrong quarter / date: retrieves right company+topic but wrong specific time period

**Diagnosis:** System retrieves AAPL documents on the right topic but from the wrong quarter. The question does not contain a specific date anchor, so vector similarity cannot distinguish the intended quarter from adjacent ones.

### ✅ product-14

**Question:** What products make up Apple's Services segment?

**Gold slugs (1):** sec/AAPL/10-k-2025-10-31

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** sec/aapl/10-k-2025-10-31, sec/aapl/10-k-2023-11-03, transcripts/aapl-2025-q4, sec/aapl/10-q-2022-01-28, sec/aapl/8-k-2023-11-02

### ✅ product-15

**Question:** What is the iPhone lineup in FY2025 and which Mac chips power the current Mac lineup?

**Gold slugs (1):** sec/AAPL/10-k-2025-10-31

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** sec/aapl/10-k-2025-10-31, sec/aapl/10-k-2025-10-31, transcripts/aapl-2025-q2, sec/aapl/10-q-2025-05-02, transcripts/aapl-2023-q4

## supply-chain (15 questions)

### ❌ supply-01

**Question:** Which foundries does NVIDIA use to manufacture its chips, and what memory suppliers does it rely on?

**Gold slugs (1):** sec/NVDA/10-k-2025-02-26

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** sec/nvda/10-k-2024-02-21, sec/nvda/10-k-2023-02-24, sec/nvda/10-k-2022-03-18, transcripts/nvda-2026-q3, sec/nvda/10-k-2022-03-18

**Failure bucket:** B2_FORM_TYPE — B2 — Wrong SEC form type: retrieves right company+period, wrong filing type (8-K vs 10-Q vs 10-K)

**Diagnosis:** Gold is a 10-K annual report. System retrieves sec instead. The query semantics do not signal which SEC form type is needed — the retrieval system treats all SEC docs as equally relevant for the topic.

### ✅ supply-02

**Question:** What packaging technology does NVIDIA use for its AI chips, and what supply risk does this create?

**Gold slugs (2):** sec/NVDA/10-k-2025-02-26, social/dylan522p/1820200553512841239

**Result:** Hit ✓ | Recall: 50% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** sec/nvda/10-k-2025-02-26, sec/nvda/10-k-2026-02-25, transcripts/nvda-2025-q2, sec/nvda/10-q-2024-05-29, transcripts/nvda-2024-q4

### ✅ supply-03

**Question:** What lead times has NVIDIA disclosed for its supply chain, and where is production geographically concentrated?

**Gold slugs (2):** sec/NVDA/10-k-2025-02-26, sec/NVDA/10-k-2026-02-25

**Result:** Hit ✓ | Recall: 50% | MRR: 0.33 | First hit rank: #3

**Retrieved (top 5):** transcripts/nvda-2023-q1, sec/nvda/10-k-2024-02-21, sec/nvda/10-k-2026-02-25, sec/nvda/10-k-2024-02-21, transcripts/nvda-2024-q4

### ✅ supply-04

**Question:** How does HBM memory procurement work for AI accelerators, and what does NVIDIA's B300 GPU change about HBM content?

**Gold slugs (2):** social/dylan522p/1839034283589075239, transcripts/NVDA-2026-Q1

**Result:** Hit ✓ | Recall: 50% | MRR: 0.50 | First hit rank: #2

**Retrieved (top 5):** substack/why-memory-defines-ai-hardware-supremacy-hbm, transcripts/nvda-2026-q1, substack/why-memory-defines-ai-hardware-supremacy-hbm, social/dylan522p/1955285178492080370, substack/the-ai-semiconductor-landscape-2025

### ❌ supply-05

**Question:** What does the Blackwell GB300 BOM reveal about NVIDIA's supply chain partners beyond TSMC?

**Gold slugs (1):** social/dylan522p/1871878908272128182

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** transcripts/nvda-2025-q3, transcripts/nvda-2025-q2, social/dylan522p/1820200553512841239, substack/nvidias-woodstock-of-ai-conference, transcripts/nvda-2026-q1

**Failure bucket:** B3_SPECIFIC_TWEET — B3 — Specific tweet needle: needs one exact tweet among many topically similar ones

**Diagnosis:** Gold is a specific tweet ID (social/dylan522p/1871878908272128182). Many topically similar Dylan Patel tweets exist in the corpus. Vector similarity finds tweets on the same broad topic but cannot identify the specific tweet without a unique phrase or date anchor.

### ✅ supply-06

**Question:** Which NVIDIA products are subject to US export controls requiring licenses for shipment to China?

**Gold slugs (1):** sec/NVDA/10-k-2025-02-26

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** sec/nvda/10-k-2025-02-26, sec/nvda/10-q-2024-08-28, sec/nvda/10-q-2024-11-20, sec/nvda/10-k-2024-02-21, sec/nvda/8-k-2025-01-17

### ✅ supply-07

**Question:** What was the supply chain and financial impact of the April 2025 H20 export ban on NVIDIA?

**Gold slugs (2):** transcripts/NVDA-2026-Q1, sec/NVDA/10-k-2026-02-25

**Result:** Hit ✓ | Recall: 100% | MRR: 0.50 | First hit rank: #2

**Retrieved (top 5):** sec/nvda/10-q-2023-05-26, sec/nvda/10-k-2026-02-25, sec/nvda/10-q-2025-05-28, sec/nvda/10-k-2024-02-21, transcripts/nvda-2026-q1

### ✅ supply-08

**Question:** How does NVIDIA quantify the long-term supply and competitive risk from losing China market access?

**Gold slugs (2):** transcripts/NVDA-2026-Q1, sec/NVDA/10-k-2025-02-26

**Result:** Hit ✓ | Recall: 50% | MRR: 0.33 | First hit rank: #3

**Retrieved (top 5):** sec/nvda/10-q-2022-11-18, sec/nvda/10-q-2023-05-26, sec/nvda/10-k-2025-02-26, sec/nvda/10-q-2022-08-31, sec/nvda/10-k-2025-02-26

### ❌ supply-09

**Question:** What impact did export controls have on NVIDIA's gross margins in FY2026?

**Gold slugs (1):** sec/NVDA/10-k-2026-02-25

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** sec/nvda/10-q-2025-05-28, sec/nvda/8-k-2025-05-28, sec/nvda/10-q-2024-05-29, sec/nvda/8-k-2026-02-25, sec/nvda/10-q-2022-11-18

**Failure bucket:** B2_FORM_TYPE — B2 — Wrong SEC form type: retrieves right company+period, wrong filing type (8-K vs 10-Q vs 10-K)

**Diagnosis:** Gold is a 10-K annual report. System retrieves 10-Q instead. The query semantics do not signal which SEC form type is needed — the retrieval system treats all SEC docs as equally relevant for the topic.

### ✅ supply-10

**Question:** What manufacturing challenges did NVIDIA face during the Blackwell ramp and how did yields improve?

**Gold slugs (2):** transcripts/NVDA-2025-Q2, transcripts/NVDA-2026-Q1

**Result:** Hit ✓ | Recall: 50% | MRR: 0.25 | First hit rank: #4

**Retrieved (top 5):** transcripts/nvda-2025-q4, transcripts/nvda-2025-q3, transcripts/nvda-2025-q3, transcripts/nvda-2025-q2, sec/nvda/10-q-2024-05-29

### ✅ supply-11

**Question:** What is the Blackwell GB200 deployment pace at major hyperscalers, and what does GB300 change about manufacturing?

**Gold slugs (1):** transcripts/NVDA-2026-Q1

**Result:** Hit ✓ | Recall: 100% | MRR: 0.50 | First hit rank: #2

**Retrieved (top 5):** transcripts/nvda-2025-q1, transcripts/nvda-2026-q1, transcripts/nvda-2026-q2, transcripts/nvda-2026-q1, social/dylan522p/1820200553512841239

### ✅ supply-12

**Question:** What did Dylan Patel's August 2024 analysis reveal about Blackwell's supply chain complexity and the CoWoS packaging variants?

**Gold slugs (1):** social/dylan522p/1820200553512841239

**Result:** Hit ✓ | Recall: 100% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** social/dylan522p/1820200553512841239, social/dylan522p/1819693289689198800, transcripts/nvda-2025-q3, transcripts/nvda-2025-q2, transcripts/nvda-2025-q2

### ✅ supply-13

**Question:** How is NVIDIA diversifying its supply chain geographically, and what US manufacturing partnerships has it announced?

**Gold slugs (2):** sec/NVDA/10-k-2026-02-25, sec/NVDA/8-k-2025-02-26

**Result:** Hit ✓ | Recall: 50% | MRR: 0.50 | First hit rank: #2

**Retrieved (top 5):** transcripts/nvda-2026-q1, sec/nvda/10-k-2026-02-25, sec/nvda/8-k-2026-02-25, transcripts/nvda-2025-q3, sec/nvda/10-k-2024-02-21

### ❌ supply-14

**Question:** What is NVIDIA's software and services revenue run rate, and how does it reduce supply chain risk?

**Gold slugs (1):** transcripts/NVDA-2025-Q2

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** transcripts/nvda-2022-q4, sec/nvda/10-k-2024-02-21, sec/nvda/10-q-2023-11-21, transcripts/nvda-2024-q2, sec/nvda/10-q-2023-08-28

**Failure bucket:** B1_WRONG_QUARTER — B1 — Wrong quarter / date: retrieves right company+topic but wrong specific time period

**Diagnosis:** System retrieves NVDA-2025-Q2 documents on the right topic but from the wrong quarter. The question does not contain a specific date anchor, so vector similarity cannot distinguish the intended quarter from adjacent ones.

### ❌ supply-15

**Question:** Which companies make up the assembly and contract manufacturing layer of NVIDIA's Blackwell supply chain?

**Gold slugs (1):** social/dylan522p/1871878908272128182

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** transcripts/nvda-2025-q2, sec/nvda/10-k-2023-02-24, transcripts/nvda-2025-q3, sec/nvda/10-k-2024-02-21, sec/nvda/10-k-2026-02-25

**Failure bucket:** B3_SPECIFIC_TWEET — B3 — Specific tweet needle: needs one exact tweet among many topically similar ones

**Diagnosis:** Gold is a specific tweet ID (social/dylan522p/1871878908272128182). Many topically similar Dylan Patel tweets exist in the corpus. Vector similarity finds tweets on the same broad topic but cannot identify the specific tweet without a unique phrase or date anchor.

## time-series (20 questions)

### ✅ time-series-01

**Question:** How has NVIDIA's gross margin trended from Q3 FY2024 through Q4 FY2026?

**Gold slugs (10):** financials/NVDA-2023-10-29, financials/NVDA-2024-01-28, financials/NVDA-2024-04-28, financials/NVDA-2024-07-28, financials/NVDA-2024-10-27, financials/NVDA-2025-01-26, financials/NVDA-2025-04-27, financials/NVDA-2025-07-27, financials/NVDA-2025-10-26, financials/NVDA-2026-01-25

**Result:** Hit ✓ | Recall: 10% | MRR: 0.20 | First hit rank: #5

**Retrieved (top 5):** sec/nvda/8-k-2025-11-19, sec/nvda/8-k-2026-02-25, sec/nvda/8-k-2025-02-26, sec/nvda/8-k-2025-08-27, financials/nvda-2024-10-27

### ✅ time-series-02

**Question:** How did Meta Platforms' operating margin change quarter by quarter from Q1 2022 through Q4 2024?

**Gold slugs (12):** financials/META-2022-03-31, financials/META-2022-06-30, financials/META-2022-09-30, financials/META-2022-12-31, financials/META-2023-03-31, financials/META-2023-06-30, financials/META-2023-09-30, financials/META-2023-12-31, financials/META-2024-03-31, financials/META-2024-06-30, financials/META-2024-09-30, financials/META-2024-12-31

**Result:** Hit ✓ | Recall: 17% | MRR: 0.33 | First hit rank: #3

**Retrieved (top 5):** sec/meta/8-k-2022-02-02, sec/meta/8-k-2022-10-26, financials/meta-2024-12-31, financials/meta-2024-06-30, sec/meta/10-k-2025-01-30

### ❌ time-series-03

**Question:** What was Google Cloud's quarterly revenue from Q1 2022 through Q4 2024?

**Gold slugs (12):** sec/GOOGL/8-k-2022-04-26, sec/GOOGL/8-k-2022-07-26, sec/GOOGL/8-k-2022-10-25, sec/GOOGL/8-k-2023-02-02, sec/GOOGL/8-k-2023-04-25, sec/GOOGL/8-k-2023-07-25, sec/GOOGL/8-k-2023-10-24, sec/GOOGL/8-k-2024-01-30, sec/GOOGL/8-k-2024-04-25, sec/GOOGL/8-k-2024-07-23, sec/GOOGL/8-k-2024-10-29, sec/GOOGL/8-k-2025-02-04

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** sec/googl/10-k-2025-02-05, sec/googl/10-q-2025-10-30, sec/googl/10-q-2024-04-26, sec/googl/10-q-2025-10-30, sec/googl/10-q-2026-04-30

**Failure bucket:** B5_TEMPORAL_FORM — B5 — Time-series form type: temporal series needs 8-K press releases, retrieves 10-Q/10-K filings

**Diagnosis:** Time-series question with 12 gold 8-K press releases spanning multiple quarters. System retrieves 10-Q or 10-K filings instead of the quarterly earnings press releases. These form types have overlapping content but different granularity — 10-Q has quarterly MD&A, 8-K has the earnings release table with segment-level KPIs.

### ✅ time-series-04

**Question:** What was NVIDIA's Data Center segment revenue in each quarter from Q2 FY2023 through Q4 FY2026?

**Gold slugs (15):** sec/NVDA/8-k-2022-08-24, sec/NVDA/8-k-2022-11-16, sec/NVDA/8-k-2023-02-22, sec/NVDA/8-k-2023-05-24, sec/NVDA/8-k-2023-08-23, sec/NVDA/8-k-2023-11-21, sec/NVDA/8-k-2024-02-21, sec/NVDA/8-k-2024-05-22, sec/NVDA/8-k-2024-08-28, sec/NVDA/8-k-2024-11-20, sec/NVDA/8-k-2025-02-26, sec/NVDA/8-k-2025-05-28, sec/NVDA/8-k-2025-08-27, sec/NVDA/8-k-2025-11-19, sec/NVDA/8-k-2026-02-25

**Result:** Hit ✓ | Recall: 27% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** sec/nvda/8-k-2025-08-27, sec/nvda/10-q-2025-08-27, sec/nvda/8-k-2025-05-28, sec/nvda/8-k-2026-02-25, sec/nvda/8-k-2025-11-19

### ❌ time-series-05

**Question:** What was Apple's Services segment revenue in each quarter from Q1 FY2022 through Q3 FY2025?

**Gold slugs (12):** sec/AAPL/8-k-2022-01-27, sec/AAPL/8-k-2022-07-28, sec/AAPL/8-k-2022-10-27, sec/AAPL/8-k-2023-02-02, sec/AAPL/8-k-2023-05-04, sec/AAPL/8-k-2023-11-02, sec/AAPL/8-k-2024-02-01, sec/AAPL/8-k-2024-08-01, sec/AAPL/8-k-2024-10-31, sec/AAPL/8-k-2025-01-30, sec/AAPL/8-k-2025-05-01, sec/AAPL/8-k-2025-07-31

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** sec/aapl/10-q-2025-08-01, sec/aapl/10-q-2025-01-31, sec/aapl/10-q-2025-05-02, sec/aapl/10-q-2026-01-30, transcripts/aapl-2022-q4

**Failure bucket:** B5_TEMPORAL_FORM — B5 — Time-series form type: temporal series needs 8-K press releases, retrieves 10-Q/10-K filings

**Diagnosis:** Time-series question with 12 gold 8-K press releases spanning multiple quarters. System retrieves 10-Q or 10-K filings instead of the quarterly earnings press releases. These form types have overlapping content but different granularity — 10-Q has quarterly MD&A, 8-K has the earnings release table with segment-level KPIs.

### ❌ time-series-06

**Question:** What was Meta Platforms' Family daily active people (DAP) count in each quarter from Q4 2021 through Q1 2026?

**Gold slugs (18):** sec/META/8-k-2022-02-02, sec/META/8-k-2022-04-27, sec/META/8-k-2022-07-27, sec/META/8-k-2022-10-26, sec/META/8-k-2023-02-01, sec/META/8-k-2023-04-26, sec/META/8-k-2023-07-26, sec/META/8-k-2023-10-25, sec/META/8-k-2024-02-01, sec/META/8-k-2024-04-24, sec/META/8-k-2024-07-31, sec/META/8-k-2024-10-30, sec/META/8-k-2025-01-29, sec/META/8-k-2025-04-30, sec/META/8-k-2025-07-30, sec/META/8-k-2025-10-29, sec/META/8-k-2026-01-28, sec/META/8-k-2026-04-29

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** sec/meta/10-q-2022-10-27, sec/meta/10-q-2022-04-28, sec/meta/10-k-2024-02-02

**Failure bucket:** B5_TEMPORAL_FORM — B5 — Time-series form type: temporal series needs 8-K press releases, retrieves 10-Q/10-K filings

**Diagnosis:** Time-series question with 18 gold 8-K press releases spanning multiple quarters. System retrieves 10-Q or 10-K filings instead of the quarterly earnings press releases. These form types have overlapping content but different granularity — 10-Q has quarterly MD&A, 8-K has the earnings release table with segment-level KPIs.

### ✅ time-series-07

**Question:** How did NVIDIA's total quarterly revenue evolve from Q1 FY2022 through Q4 FY2026?

**Gold slugs (20):** financials/NVDA-2021-05-02, financials/NVDA-2021-08-01, financials/NVDA-2021-10-31, financials/NVDA-2022-01-30, financials/NVDA-2022-05-01, financials/NVDA-2022-07-31, financials/NVDA-2022-10-30, financials/NVDA-2023-01-29, financials/NVDA-2023-04-30, financials/NVDA-2023-07-30, financials/NVDA-2023-10-29, financials/NVDA-2024-01-28, financials/NVDA-2024-04-28, financials/NVDA-2024-07-28, financials/NVDA-2024-10-27, financials/NVDA-2025-01-26, financials/NVDA-2025-04-27, financials/NVDA-2025-07-27, financials/NVDA-2025-10-26, financials/NVDA-2026-01-25

**Result:** Hit ✓ | Recall: 10% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** financials/nvda-2025-04-27, sec/nvda/8-k-2025-05-28, financials/nvda-2026-01-25, sec/nvda/8-k-2025-08-27, sec/nvda/8-k-2026-02-25

### ✅ time-series-08

**Question:** What was Microsoft's Intelligent Cloud segment revenue in each quarter from Q2 FY2022 through Q3 FY2026?

**Gold slugs (18):** sec/MSFT/8-k-2022-01-25, sec/MSFT/8-k-2022-04-26, sec/MSFT/8-k-2022-07-26, sec/MSFT/8-k-2022-10-25, sec/MSFT/8-k-2023-01-24, sec/MSFT/8-k-2023-04-25, sec/MSFT/8-k-2023-07-25, sec/MSFT/8-k-2023-10-24, sec/MSFT/8-k-2024-01-30, sec/MSFT/8-k-2024-04-25, sec/MSFT/8-k-2024-07-30, sec/MSFT/8-k-2024-10-30, sec/MSFT/8-k-2025-01-29, sec/MSFT/8-k-2025-04-30, sec/MSFT/8-k-2025-07-30, sec/MSFT/8-k-2025-10-29, sec/MSFT/8-k-2026-01-28, sec/MSFT/8-k-2026-04-29

**Result:** Hit ✓ | Recall: 11% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** sec/msft/8-k-2022-07-26, sec/msft/8-k-2026-01-28, transcripts/msft-2023-q1, transcripts/msft-2026-q1, transcripts/msft-2022-q2

### ✅ time-series-09

**Question:** How has Alphabet's GAAP operating margin changed quarter by quarter from Q1 2022 through Q1 2026?

**Gold slugs (17):** financials/GOOGL-2022-03-31, financials/GOOGL-2022-06-30, financials/GOOGL-2022-09-30, financials/GOOGL-2022-12-31, financials/GOOGL-2023-03-31, financials/GOOGL-2023-06-30, financials/GOOGL-2023-09-30, financials/GOOGL-2023-12-31, financials/GOOGL-2024-03-31, financials/GOOGL-2024-06-30, financials/GOOGL-2024-09-30, financials/GOOGL-2024-12-31, financials/GOOGL-2025-03-31, financials/GOOGL-2025-06-30, financials/GOOGL-2025-09-30, financials/GOOGL-2025-12-31, financials/GOOGL-2026-03-31

**Result:** Hit ✓ | Recall: 6% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** financials/googl-2026-03-31, sec/googl/8-k-2026-04-29, sec/googl/10-q-2022-04-27, sec/googl/8-k-2026-04-29, sec/googl/8-k-2023-02-02

### ✅ time-series-10

**Question:** What was Apple's quarterly revenue and gross margin from Q1 FY2022 through Q2 FY2026?

**Gold slugs (18):** financials/AAPL-2021-12-25, financials/AAPL-2022-03-26, financials/AAPL-2022-06-25, financials/AAPL-2022-09-24, financials/AAPL-2022-12-31, financials/AAPL-2023-04-01, financials/AAPL-2023-07-01, financials/AAPL-2023-09-30, financials/AAPL-2023-12-30, financials/AAPL-2024-03-30, financials/AAPL-2024-06-29, financials/AAPL-2024-09-28, financials/AAPL-2024-12-28, financials/AAPL-2025-03-29, financials/AAPL-2025-06-28, financials/AAPL-2025-09-27, financials/AAPL-2025-12-27, financials/AAPL-2026-03-28

**Result:** Hit ✓ | Recall: 11% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** financials/aapl-2026-03-28, financials/aapl-2025-12-27, sec/aapl/10-q-2026-01-30, sec/aapl/10-q-2026-05-01, sec/aapl/10-q-2022-04-29

### ✅ time-series-11

**Question:** How has GitHub Copilot's adoption and scale grown across Microsoft earnings calls?

**Gold slugs (6):** transcripts/MSFT-2022-Q1, transcripts/MSFT-2023-Q2, transcripts/MSFT-2024-Q3, transcripts/MSFT-2026-Q1, transcripts/MSFT-2026-Q2, transcripts/MSFT-2026-Q3

**Result:** Hit ✓ | Recall: 33% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** transcripts/msft-2026-q3, transcripts/msft-2025-q4, transcripts/msft-2026-q1, transcripts/msft-2026-q1, transcripts/msft-2024-q4

### ✅ time-series-12

**Question:** What was Meta's Reality Labs quarterly revenue and operating loss from Q1 2024 through Q1 2026?

**Gold slugs (9):** sec/META/8-k-2024-04-24, sec/META/8-k-2024-07-31, sec/META/8-k-2024-10-30, sec/META/8-k-2025-01-29, sec/META/8-k-2025-04-30, sec/META/8-k-2025-07-30, sec/META/8-k-2026-04-29, sec/META/10-k-2025-01-30, sec/META/10-q-2024-10-31

**Result:** Hit ✓ | Recall: 33% | MRR: 0.33 | First hit rank: #3

**Retrieved (top 5):** sec/meta/10-k-2026-01-29, sec/meta/10-q-2026-04-30, sec/meta/10-k-2025-01-30, sec/meta/8-k-2024-10-30, sec/meta/8-k-2026-04-29

### ✅ time-series-13

**Question:** What was NVIDIA's Gaming segment revenue in each quarter from Q3 FY2023 through Q4 FY2026?

**Gold slugs (13):** sec/NVDA/8-k-2022-11-16, sec/NVDA/8-k-2023-05-24, sec/NVDA/8-k-2023-08-23, sec/NVDA/8-k-2023-11-21, sec/NVDA/8-k-2024-02-21, sec/NVDA/8-k-2024-05-22, sec/NVDA/8-k-2024-08-28, sec/NVDA/8-k-2024-11-20, sec/NVDA/8-k-2025-02-26, sec/NVDA/8-k-2025-05-28, sec/NVDA/8-k-2025-08-27, sec/NVDA/8-k-2025-11-19, sec/NVDA/8-k-2026-02-25

**Result:** Hit ✓ | Recall: 23% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** sec/nvda/8-k-2025-08-27, sec/nvda/8-k-2025-05-28, sec/nvda/10-q-2025-11-19, sec/nvda/8-k-2026-02-25, sec/nvda/8-k-2025-08-27

### ✅ time-series-14

**Question:** How has NVIDIA's Data Center revenue grown as a percentage of total revenue from Q1 FY2025 through Q4 FY2026?

**Gold slugs (16):** sec/NVDA/8-k-2024-05-22, sec/NVDA/8-k-2024-08-28, sec/NVDA/8-k-2024-11-20, sec/NVDA/8-k-2025-02-26, sec/NVDA/8-k-2025-05-28, sec/NVDA/8-k-2025-08-27, sec/NVDA/8-k-2025-11-19, sec/NVDA/8-k-2026-02-25, financials/NVDA-2024-04-28, financials/NVDA-2024-07-28, financials/NVDA-2024-10-27, financials/NVDA-2025-01-26, financials/NVDA-2025-04-27, financials/NVDA-2025-07-27, financials/NVDA-2025-10-26, financials/NVDA-2026-01-25

**Result:** Hit ✓ | Recall: 25% | MRR: 0.50 | First hit rank: #2

**Retrieved (top 5):** sec/nvda/10-k-2025-02-26, sec/nvda/8-k-2026-02-25, sec/nvda/8-k-2025-02-26, sec/nvda/8-k-2025-05-28, sec/nvda/8-k-2025-08-27

### ✅ time-series-15

**Question:** How has Meta's most prominently stated risk in its annual 10-K filings evolved from FY2021 through FY2025?

**Gold slugs (5):** sec/META/10-k-2022-02-03, sec/META/10-k-2023-02-02, sec/META/10-k-2024-02-02, sec/META/10-k-2025-01-30, sec/META/10-k-2026-01-29

**Result:** Hit ✓ | Recall: 60% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** sec/meta/10-k-2022-02-03, sec/meta/10-k-2024-02-02, sec/meta/10-k-2023-02-02, sec/meta/10-k-2024-02-02, sec/meta/10-k-2022-02-03

### ✅ time-series-16

**Question:** When was Blackwell announced, when did first deliveries begin, and how has Blackwell revenue contribution tracked across quarters?

**Gold slugs (12):** substack/nvidias-woodstock-of-ai-conference, transcripts/NVDA-2024-Q4, sec/NVDA/8-k-2024-05-22, transcripts/NVDA-2025-Q1, sec/NVDA/10-q-2024-05-29, transcripts/NVDA-2025-Q2, sec/NVDA/8-k-2024-11-20, sec/NVDA/8-k-2025-02-26, sec/NVDA/8-k-2025-05-28, sec/NVDA/8-k-2025-08-27, sec/NVDA/8-k-2025-11-19, sec/NVDA/8-k-2026-02-25

**Result:** Hit ✓ | Recall: 8% | MRR: 0.50 | First hit rank: #2

**Retrieved (top 5):** transcripts/nvda-2025-q4, transcripts/nvda-2025-q1, transcripts/nvda-2025-q3, transcripts/nvda-2026-q2, transcripts/nvda-2025-q3

### ❌ time-series-17

**Question:** When was the NVIDIA H100 announced, when were first deliveries, and what was the impact of export controls?

**Gold slugs (8):** sec/NVDA/8-k-2022-05-25, sec/NVDA/8-k-2022-08-31, sec/NVDA/8-k-2022-09-01, sec/NVDA/8-k-2022-11-16, sec/NVDA/8-k-2023-02-22, sec/NVDA/8-k-2023-08-23, sec/NVDA/8-k-2023-10-17, sec/NVDA/8-k-2025-02-26

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** sec/nvda/10-k-2025-02-26, transcripts/nvda-2023-q3, sec/nvda/10-q-2024-08-28, sec/nvda/10-k-2024-02-21, sec/nvda/10-q-2024-11-20

**Failure bucket:** B5_TEMPORAL_FORM — B5 — Time-series form type: temporal series needs 8-K press releases, retrieves 10-Q/10-K filings

**Diagnosis:** Time-series question with 8 gold 8-K press releases spanning multiple quarters. System retrieves 10-Q or 10-K filings instead of the quarterly earnings press releases. These form types have overlapping content but different granularity — 10-Q has quarterly MD&A, 8-K has the earnings release table with segment-level KPIs.

### ✅ time-series-18

**Question:** When was Apple Vision Pro announced, when did it launch, and what product and ecosystem milestones did Apple disclose in subsequent quarters?

**Gold slugs (7):** substack/apples-wwdc-blew-me-away, transcripts/AAPL-2023-Q3, sec/AAPL/10-q-2023-08-04, transcripts/AAPL-2024-Q1, transcripts/AAPL-2024-Q3, transcripts/AAPL-2024-Q4, transcripts/AAPL-2025-Q4

**Result:** Hit ✓ | Recall: 43% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** transcripts/aapl-2023-q3, transcripts/aapl-2024-q2, transcripts/aapl-2023-q3, transcripts/aapl-2024-q1, transcripts/aapl-2024-q4

### ✅ time-series-19

**Question:** What was NVIDIA's Automotive segment revenue in each quarter from Q4 FY2022 through Q4 FY2026?

**Gold slugs (16):** sec/NVDA/8-k-2022-02-16, sec/NVDA/8-k-2022-05-25, sec/NVDA/8-k-2022-11-16, sec/NVDA/8-k-2023-02-22, sec/NVDA/8-k-2023-05-24, sec/NVDA/8-k-2023-08-23, sec/NVDA/8-k-2023-11-21, sec/NVDA/8-k-2024-02-21, sec/NVDA/8-k-2024-05-22, sec/NVDA/8-k-2024-08-28, sec/NVDA/8-k-2024-11-20, sec/NVDA/8-k-2025-02-26, sec/NVDA/8-k-2025-05-28, sec/NVDA/8-k-2025-08-27, sec/NVDA/8-k-2025-11-19, sec/NVDA/8-k-2026-02-25

**Result:** Hit ✓ | Recall: 25% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** sec/nvda/8-k-2022-02-16, sec/nvda/8-k-2026-02-25, transcripts/nvda-2024-q4, sec/nvda/8-k-2025-08-27, sec/nvda/8-k-2025-02-26

### ❌ time-series-20

**Question:** What was Google's YouTube advertising revenue each quarter from Q1 2022 through Q2 2024?

**Gold slugs (10):** sec/GOOGL/8-k-2022-04-26, sec/GOOGL/8-k-2022-07-26, sec/GOOGL/8-k-2022-10-25, sec/GOOGL/8-k-2023-02-02, sec/GOOGL/8-k-2023-04-25, sec/GOOGL/8-k-2023-07-25, sec/GOOGL/8-k-2023-10-24, sec/GOOGL/8-k-2024-01-30, sec/GOOGL/8-k-2024-04-25, sec/GOOGL/8-k-2024-07-23

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** sec/googl/10-q-2024-10-30, sec/googl/10-q-2025-10-30, sec/googl/10-q-2025-07-24, sec/googl/10-q-2024-07-24, sec/googl/10-q-2022-04-27

**Failure bucket:** B5_TEMPORAL_FORM — B5 — Time-series form type: temporal series needs 8-K press releases, retrieves 10-Q/10-K filings

**Diagnosis:** Time-series question with 10 gold 8-K press releases spanning multiple quarters. System retrieves 10-Q or 10-K filings instead of the quarterly earnings press releases. These form types have overlapping content but different granularity — 10-Q has quarterly MD&A, 8-K has the earnings release table with segment-level KPIs.

## market-reactions (13 questions)

### ✅ market-reactions-01

**Question:** What was the market reaction to NVIDIA's Q1 FY2024 earnings announced May 24, 2023?

**Gold slugs (3):** price/NVDA-CY2023-Q2, sec/NVDA/8-k-2023-05-24, transcripts/NVDA-2024-Q1

**Result:** Hit ✓ | Recall: 67% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** sec/nvda/8-k-2023-05-24, financials/nvda-2023-04-30, transcripts/nvda-2024-q1, sec/nvda/8-k-2024-05-22, sec/nvda/8-k-2024-05-22

### ✅ market-reactions-02

**Question:** What was the market reaction to Meta's Q3 2022 earnings announced October 26, 2022?

**Gold slugs (2):** price/META-CY2022-Q4, sec/META/8-k-2022-10-26

**Result:** Hit ✓ | Recall: 50% | MRR: 0.50 | First hit rank: #2

**Retrieved (top 5):** price/meta-cy2022-q3, sec/meta/8-k-2022-10-26, price/meta-cy2022-q1, financials/meta-2022-09-30, transcripts/meta-2022-q3

### ✅ market-reactions-03

**Question:** What was the market reaction to Meta's Year of Efficiency announcement on February 1, 2023?

**Gold slugs (2):** price/META-CY2023-Q1, sec/META/8-k-2023-02-01

**Result:** Hit ✓ | Recall: 50% | MRR: 0.25 | First hit rank: #4

**Retrieved (top 5):** transcripts/meta-2022-q4, sec/meta/8-k-2023-03-14, transcripts/meta-2022-q4, sec/meta/8-k-2023-02-01, transcripts/meta-2023-q4

### ❌ market-reactions-04

**Question:** What was NVIDIA's stock market reaction to the DeepSeek R1 announcement in January 2025?

**Gold slugs (2):** price/NVDA-CY2025-Q1, substack/ai-in-2025-recap-the-year-the-old-rules-ai-trends

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** substack/china-deepseek-ai-founder-background, substack/nvidias-brutal-start-to-2025-explained, substack/nvidias-brutal-start-to-2025-explained, substack/china-deepseek-ai-founder-background, substack/its-all-in-the-math

**Failure bucket:** B4_RECAP_ARTICLE — B4 — Recap article vs primary source: system correctly finds primary source but question gold points to year-in-review summary

**Diagnosis:** Gold points to a year-in-review recap article. The system correctly retrieves primary-source articles covering the same events/facts, which are semantically closer to the query than the recap. The recap is a derived summary; primary sources outrank it in vector space.

### ✅ market-reactions-05

**Question:** What was the market reaction to Microsoft's Q2 FY2023 earnings and the OpenAI investment announcement on January 24–25, 2023?

**Gold slugs (2):** price/MSFT-CY2023-Q1, sec/MSFT/8-k-2023-01-24

**Result:** Hit ✓ | Recall: 50% | MRR: 0.25 | First hit rank: #4

**Retrieved (top 5):** sec/msft/8-k-2026-01-28, transcripts/msft-2023-q2, financials/msft-2022-12-31, sec/msft/8-k-2023-01-24, sec/msft/8-k-2025-01-29

### ✅ market-reactions-06

**Question:** What was the market reaction to NVIDIA's H100 export control restriction announced August 31, 2022?

**Gold slugs (3):** price/NVDA-CY2022-Q3, sec/NVDA/8-k-2022-08-31, sec/NVDA/8-k-2022-09-01

**Result:** Hit ✓ | Recall: 33% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** sec/nvda/8-k-2022-09-01, sec/nvda/10-k-2024-02-21, sec/nvda/10-k-2024-02-21, sec/nvda/10-q-2024-08-28, sec/nvda/10-q-2022-08-31

### ✅ market-reactions-07

**Question:** What was the market reaction to Meta's Q3 2023 earnings reported October 25, 2023, despite strong 40% operating margins?

**Gold slugs (2):** price/META-CY2023-Q4, sec/META/8-k-2023-10-25

**Result:** Hit ✓ | Recall: 50% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** sec/meta/8-k-2023-10-25, financials/meta-2023-09-30, transcripts/meta-2023-q3, sec/meta/8-k-2022-10-26, sec/meta/8-k-2024-10-30

### ✅ market-reactions-08

**Question:** What was the market reaction to NVIDIA's Q4 FY2024 earnings reported February 21, 2024?

**Gold slugs (2):** price/NVDA-CY2024-Q1, sec/NVDA/8-k-2024-02-21

**Result:** Hit ✓ | Recall: 50% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** sec/nvda/8-k-2024-02-21, transcripts/nvda-2024-q4, financials/nvda-2024-01-28, sec/nvda/8-k-2025-02-26, sec/nvda/8-k-2023-02-22

### ✅ market-reactions-09

**Question:** What was the market reaction to NVIDIA's Q1 FY2025 earnings and 10-for-1 stock split announcement on May 22, 2024?

**Gold slugs (2):** price/NVDA-CY2024-Q2, sec/NVDA/8-k-2024-05-22

**Result:** Hit ✓ | Recall: 50% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** sec/nvda/8-k-2024-05-22, sec/nvda/8-k-2024-05-22, sec/nvda/8-k-2025-05-28, sec/nvda/8-k-2025-05-28, transcripts/nvda-2025-q1

### ❌ market-reactions-10

**Question:** What was the market reaction to the H20 export ban on April 9, 2025?

**Gold slugs (3):** price/NVDA-CY2025-Q2, sec/NVDA/8-k-2025-05-28, transcripts/NVDA-2026-Q1

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** social/dylan522p/1960817396048126387, sec/nvda/10-k-2026-02-25, sec/nvda/8-k-2025-04-15, sec/nvda/8-k-2025-04-15, sec/nvda/10-q-2025-05-28

**Failure bucket:** B6_MULTI_SOURCE — B6 — Multi-source price+filing: requires price data + filing together, system finds neither

**Diagnosis:** Question requires two independent document types — price data (`price/*`) and a specific event filing. The retrieval system runs a single unified query; it finds documents near the event description but cannot simultaneously satisfy both the price-data need and the filing need.

### ✅ market-reactions-11

**Question:** When NVIDIA reported its first AI supercycle earnings on May 25, 2023, how did Microsoft's stock react?

**Gold slugs (2):** price/MSFT-CY2023-Q2, sec/NVDA/8-k-2023-05-24

**Result:** Hit ✓ | Recall: 50% | MRR: 0.25 | First hit rank: #4

**Retrieved (top 5):** substack/nvidia-earnings-the-era-of-ai-chips, substack/nvidia-is-the-fish-that-learned-to, substack/nvidias-brutal-start-to-2025-explained, price/msft-cy2023-q2, substack/nvidias-market-cap-overtakes-google

### ❌ market-reactions-12

**Question:** When Alphabet announced ~$75B in 2025 capex on February 4, 2025, how did NVIDIA's stock react the next day?

**Gold slugs (2):** price/NVDA-CY2025-Q1, sec/GOOGL/8-k-2025-02-04

**Result:** Miss ✗ | Recall: 0%

**Retrieved (top 5):** substack/nvidias-brutal-start-to-2025-explained, substack/nvidia-rise-earnings-have-we-hit-peak-ai-summer, substack/nvidias-market-cap-overtakes-google, financials/nvda-2025-01-26, transcripts/googl-2024-q4

**Failure bucket:** B6_MULTI_SOURCE — B6 — Multi-source price+filing: requires price data + filing together, system finds neither

**Diagnosis:** Question requires two independent document types — price data (`price/*`) and a specific event filing. The retrieval system runs a single unified query; it finds documents near the event description but cannot simultaneously satisfy both the price-data need and the filing need.

### ✅ market-reactions-13

**Question:** When Meta raised its 2024 capex guidance to $37-40B on July 31, 2024, how did NVIDIA's stock react?

**Gold slugs (2):** price/NVDA-CY2024-Q3, sec/META/8-k-2024-07-31

**Result:** Hit ✓ | Recall: 50% | MRR: 1.00 | First hit rank: #1

**Retrieved (top 5):** price/nvda-cy2024-q3, price/nvda-cy2024-q2, price/nvda-cy2024-q1, price/nvda-cy2024-q4, sec/nvda/8-k-2023-08-23

---

## Summary of Failures

| Bucket | Count | Root Cause |
|---|---|---|
| B1_WRONG_QUARTER | 13 | retrieves right company+topic but wrong specific time period |
| B2_FORM_TYPE | 9 | retrieves right company+period, wrong filing type (8-K vs 10-Q vs 10-K) |
| B4_RECAP_ARTICLE | 5 | system correctly finds primary source but question gold points to year-in-review summary |
| B5_TEMPORAL_FORM | 5 | temporal series needs 8-K press releases, retrieves 10-Q/10-K filings |
| B3_SPECIFIC_TWEET | 3 | needs one exact tweet among many topically similar ones |
| B6_MULTI_SOURCE | 2 | requires price data + filing together, system finds neither |

**Total misses:** 37/138 | **Total hits:** 101/138

## Required System Changes

| Priority | Bucket | System fix needed |
|---|---|---|
| 1 | B2, B5 | Form-type awareness: detect SEC form intent from query semantics, filter/boost 8-K vs 10-Q vs 10-K at retrieval time |
| 2 | B1 | Date-range filtering: extract quarter/year from question and pass as / to  |
| 3 | B5 | Temporal K scaling: for  questions, retrieve K×4 candidates before form filtering to ensure coverage across the quarter range |
| 4 | B4 | Source recency vs synthesis signal: primary-source articles outrank recap summaries in vector space; recap articles need a synthesis/summary boost or a separate retrieval pass |
| 5 | B3 | Tweet date anchoring: add date range filtering to social/tweet retrieval to reduce the candidate pool to the relevant time window |
| 6 | B6 | Two-pass retrieval: for market-reactions questions, run separate passes for price data and event filings, then union the top-K |
