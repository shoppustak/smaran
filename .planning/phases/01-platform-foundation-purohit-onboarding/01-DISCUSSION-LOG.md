# Phase 1: Platform Foundation & Purohit Onboarding - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-14
**Phase:** 1-Platform Foundation & Purohit Onboarding
**Areas discussed:** Utility templates, Wow-moment family capture, Onboarding flow mechanics, Geocoding approach

---

## Utility templates — resolved a real requirements-wording tension

| Option | Description | Selected |
|--------|-------------|----------|
| Free-form only in Phase 1 | Onboarding is 100% inside the purohit's own session; defer all Utility-template infra to Phase 4 | ✓ |
| Build template infra now anyway | Submit and get at least one Utility template approved during Phase 1 even though the core flow doesn't strictly need it | |

**User's choice:** Free-form only in Phase 1 (recommended option).
**Notes:** Surfaced during pre-discussion analysis: ONBD-01's exact wording ("use registered
Utility templates, not free-form broadcast") appears to describe Phase 4's cold outbound, not
Phase 1's session-bound replies — the purohit messages first via the landing page `wa.me` link,
so all onboarding replies land inside his free 24h session where Meta allows free-form text.
User confirmed this reading; ONBD-01's wording is treated as imprecise for Phase 1 specifically.

---

## Wow-moment family capture

| Option | Description | Selected |
|--------|-------------|----------|
| Real family, typed/free-text | Ask for one real family+event during onboarding, parse with minimal extraction, write to yajmans/events on confirm | |
| Canned example, no real data yet | Show a generic demo card resolving real Vedika data against a placeholder family; nothing written to yajmans/events | ✓ |

**User's choice:** Canned example, no real data yet.
**Notes:** Keeps Phase 1 free of any text-extraction/NLU logic — that capability is entirely
Phase 2's scope. The date resolution itself (Vedika call) is still real, only the family
identity in the card is a placeholder.

---

## Onboarding flow mechanics

| Option | Description | Selected |
|--------|-------------|----------|
| Resume where they left off | Persist partial state keyed by phone_number; resume at next unanswered field | ✓ |
| Restart from scratch | Don't persist partial progress; any new message restarts the full sequence | |

**User's choice:** Resume where they left off.

Second question in this area:

| Option | Description | Selected |
|--------|-------------|----------|
| Format check only | Regex-validate UPI ID shape, no live verification API | ✓ |
| Live verification via a UPI API | Call a paid verification API before accepting the UPI ID | |

**User's choice:** Format check only.
**Notes:** Matches the $0-infra posture from the deployment work and avoids anything
resembling a payment-gateway dependency, even a verification-only one.

---

## Geocoding approach

| Option | Description | Selected |
|--------|-------------|----------|
| OpenStreetMap Nominatim | Free, no API key, single GET returns lat/lon directly | ✓ |
| Google Maps Geocoding API | More accurate, requires paid billing account | |

**User's choice:** Neither presented option directly — user asked for a comparison against
Mappls (used in the sibling streethawk project) instead, based on prior hands-on experience
("had to add eLoc to lat/long resolved — but it worked fine").

**Follow-up:** Read `/Users/maulik/streethawk/minibag/packages/shared/services/mappls.js`
to verify the user's recollection against actual code before answering. Confirmed: Mappls'
Place Search returns an `eLoc`, not lat/long directly — a second resolution hop is needed
(streethawk does it via a routing-API roundabout), plus OAuth client-credentials token
management and a paid key. Presented a second round with this context:

| Option | Description | Selected |
|--------|-------------|----------|
| Nominatim | Simpler fit for city-level-only need, no eLoc indirection, no OAuth | ✓ |
| Mappls, for stack consistency | Reuse the same provider as streethawk, accept the extra hop/paid key for consistency | |

**User's choice:** Nominatim.
**Notes:** Mappls' venue-level precision (the reason it's right for streethawk's vendor/RP
matching) buys nothing extra for Smaran's need — city name → lat/long for Vedika's Panchang
timing + a coarse `locality_key`, not precise venue matching.

---

## Claude's Discretion

- Exact onboarding question phrasing/order (Hindi/Hinglish tone, field sequencing beyond
  "name, city, UPI, calendar system") — no explicit preference given.
- Internal state-machine representation (column on `purohits` vs. separate table) — not
  discussed; left to the planner, constrained only by D-03's phone_number-keyed resume
  requirement.

## Deferred Ideas

- Full voice/photo ingestion pipeline — already roadmapped as Phase 2 (ING-01/02/03), not a
  new deferral, just reconfirmed as out of Phase 1 scope during the wow-moment discussion.
- Utility template infra — already roadmapped as Phase 4 (BRAIN-01), reconfirmed during the
  templates discussion as explicitly NOT needed in Phase 1.
