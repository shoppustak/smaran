# Phase 5: Schedule Protection - Context

**Gathered:** 2026-07-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Schedule Protection helps busy purohits manage high-demand periods (like festival seasons) and prevents double-bookings.

- **On-Demand Day-Sheet (PROT-01):** The purohit can query their upcoming agenda via text command: `"my week"` or `"इस हफ्ते"`. The bot returns a formatted text reply listing all scheduled events in the next 7 days, grouped by date and Muhurat Window.
- **Muhurat Windows:** The day is divided into segments:
  - Morning (सुबह): 06:00 - 12:00
  - Afternoon (दोपहर): 12:00 - 16:00
  - Evening (शाम): 16:00 - 20:00
  - Night (रात): 20:00 - 06:00
- **Double-Booking Prevention (PROT-02):** When a new event is being saved (during ingestion confirmation), the system checks if the purohit already has another event scheduled for the same Gregorian date and overlapping Muhurat Window.
- **Collision Override Flow:** If an overlap occurs, the write gate catches it and sends an interactive warning card: `"चेतावनी: इस समय पर पहले से एक अनुष्ठान बुक है..."`. The purohit can select `हाँ, सहेजें` (to override and force-book) or `रद्द करें` (to cancel).

</domain>

<decisions>
## Implementation Decisions

### Muhurat Window Granularity
- **D-01:** Muhurat windows are evaluated on the date and time string parameters stored with the event/job records. If no explicit time is extracted from a voice/photo note, it defaults to the `Morning` window.

### Webhook Interception
- **D-02:** Overrides use unique action button IDs `booking-force:${jobId}`. The webhook routes this action to `confirmJob` with `force = true` parameter set.

</decisions>

<canonical_refs>
## Canonical References

- `docs/smaran-blueprint-v3.md` Part 5, State 4 (Protect: on-demand day-sheets and collision checks)
- `.planning/ROADMAP.md` Phase 5 details and success criteria
- `.planning/REQUIREMENTS.md` PROT-01, PROT-02

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `code/artifacts/api-server/src/lib/ingest.ts`: Contains the database insert logic (`confirmJob`) where the collision query will be integrated.
- `code/artifacts/api-server/src/routes/whatsapp.ts`: Webhook text-parser where `"my week"` / `"इस हफ्ते"` commands will be matched.

</code_context>
