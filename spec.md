# DocFill AI

## Current State
DocFill AI v7.5 is a full-stack document automation platform with:
- Bento Box dashboard with profile completeness, document stats, and navigation
- Template library (US: N-400, N-600, G-1145; Jamaica: N1, R1; Haiti: DS-2029, I-821)
- PDF upload with semantic field mapping, coordinate-based filling, split-screen mapping view
- Missing Info Drawer with "Save to Master Profile" support
- Exact label mapping (PDF field label as primary, semantic subtext)
- Privacy Mode, batch ZIP generation, language toggle for Haitian forms
- Sidebar nav: Dashboard, Master Profile, Document History, API Settings, Templates

## Requested Changes (Diff)

### Add
- **Public Form Search Bar** on Dashboard/Templates view with placeholder: "Search for a public form (e.g., 'IRS W9' or 'California Rental Agreement')"
- **Public Library toggle** to switch view between "My Uploads" and "Global Public Forms"
- **Static library of direct-download URLs** for public domain PDFs from .gov and .edu sources (W-9, W-4, I-9, N-400, SS-5, 1040, CA rental agreement, etc.)
- **Search logic** that queries the local URL library and returns matches
- **"Use Official Version" button** on matched results that fetches the PDF via HTTP outcalls (or simulated fetch) and loads it directly into the app's workspace
- **"Source Verified" badge** on documents sourced from official .gov / .edu domains
- **"Trending Forms" section** below the search bar showing top 5 most downloaded public templates (with download count display)
- **"Download & Fill" CTA** prominently shown once a template is selected
- After fetching a public form, automatically run the Recognition Protocol (field scanning) on it
- **`publicFormLibrary.ts`** -- a curated static map of form name → direct URL + metadata (source domain, category, field count estimate)

### Modify
- **DashboardPage** -- add the search bar, Public Library toggle, and Trending Forms section
- **TemplatesPage** -- integrate search and Public Library toggle, show "Source Verified" badge on fetched forms
- **UploadPage** -- accept a pre-fetched PDF blob (from public library fetch) so the Recognition Protocol runs automatically without manual upload

### Remove
- Nothing removed

## Implementation Plan
1. Create `src/frontend/src/lib/publicFormLibrary.ts` -- static array of public forms with: id, name, category, sourceUrl, domain, downloadCount, tags[]
2. Create `src/frontend/src/lib/publicFormFetch.ts` -- async function that fetches a PDF from a given URL and returns an ArrayBuffer (uses fetch(); since this is client-side, CORS may block some .gov URLs -- use a simulated/mock fetch that returns a placeholder ArrayBuffer for demo purposes, with a note that a backend proxy would be used in production)
3. Update `DashboardPage.tsx` -- add search bar with Public Library toggle, Trending Forms section (top 5 by downloadCount), search result list with "Use Official Version" button and "Source Verified" badge
4. Update `TemplatesPage.tsx` -- integrate Public Library toggle and search; show verified badge on gov-sourced templates
5. Update `UploadPage.tsx` -- accept an optional pre-loaded PDF (passed via navigation state or context) and auto-trigger Recognition Protocol
6. Wire "Download & Fill" as a prominent CTA once a form is selected from public library
