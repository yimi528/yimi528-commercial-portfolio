# DOAI Makers Conference Website

[简体中文](README.md) | **English**

> Contributed account integration, information architecture changes, and business-page iterations to an existing conference website.

[Back to Portfolio](../../README.en.md)

## Project Overview

| Item | Description |
| --- | --- |
| Business context | A conference website serving attendees, makers, and partners |
| Overall product | Conference information, contests, registration, teams, personal dashboard, and operations management |
| My contributions | Sign-in and notification UI integration, conference overview restructuring, separate venue and partnership pages, contest navigation fixes, and content consistency updates |
| Technologies | React, TypeScript, Tailwind CSS, Node.js / Express, Vercel |
| Commits covered | October 21–23, 2026; this is not the full development timeline |
| Source code | The original repository is private; this case study documents my contributions |

## Screenshots

These are browser screenshots of a local preview of committed version `2e07d6c`, captured on November 2, 2026. Desktop screenshots use a 1440 × 1120 viewport; the mobile screenshot uses 390 × 1100. The screenshots retain the original Chinese interface.

Attendance figures, exposure figures, and partnership prices shown on the pages are event plans or partnership proposals, not actual operating results or my development income. Venue images are illustrative assets used in the original pages.

### Conference Overview · Content Structure and Navigation

Organized the conference summary, dates, locations, and six ways to participate into sections and cards. Venue, contest, and partnership entry points lead to their respective pages. See contributions 2 and 3 below.

![Conference overview: summary, information cards, and six ways to participate](images/conference-desktop.png)

### Venue Guide · Floor Navigation and Location Cards

Separated the venue guide from the conference overview, organized content by venue and floor, and supported links from activity entry points to specific floors. The screenshot shows floor navigation and location cards. See contributions 2 and 3 below.

![Venue guide: floor navigation, space descriptions, and location cards](images/venue-desktop.png)

### Partnerships · A Dedicated Path for Partners

Moved partnership information out of the conference overview, presenting benefits and budgets by tier with a contact entry point. See contribution 2 below.

![Partnership page: four tiers of benefits, budgets, and a contact entry point](images/partnership-desktop.png)

### Sign-In · Integration with the Existing Account System

Connected the phone-number and verification-code sign-in flow, including agreement confirmation, code requests, and sign-in feedback. The screenshot shows an empty, unsubmitted form. See contribution 1 below.

![Sign-in dialog: phone number, SMS verification code, and agreement confirmation](images/login-desktop.png)

### Mobile · Conference Overview at a Narrow Viewport

The same conference overview on a mobile viewport, showing navigation, the summary, information cards, and participation entry points.

<img src="images/conference-mobile.png" width="390" alt="Mobile conference overview: navigation, summary, information cards, and participation entry points" />

## Business Problem

The website serves several audiences: attendees need event information and registration, makers need contest and personal information, and partners need partnership options. During event preparation, dates, venues, and organizer details also change and must remain consistent across pages.

My work focused on connecting the existing account system and turning lengthy conference materials into clearer pages and navigation paths.

## My Contributions

### 1. Integrating the Existing Account System

**Problem:** The conference website and the existing account website run in different site contexts. The frontend needed sign-in, profile retrieval, sign-out, and session handling between them.

**Work completed:**

- Connected verification-code requests, sign-in, current-user retrieval, and sign-out.
- Implemented a same-origin account bridge in Express, using an HttpOnly cookie for the conference session and server-side requests to the existing account service.
- Mapped account profiles to the conference's user model, handling avatar URLs and missing fields.
- Updated the sign-in dialog, navigation, personal dashboard, and notification-related interfaces, passing API errors through for UI feedback.

**Delivered:** An account integration flow and supporting interfaces within the existing website, reusing its established account service.

Commit: `eb14b27` · October 21, 2026.

### 2. Restructuring the Conference Overview and Separating User Paths

**Problem:** Conference information, venue details, and partnership proposals were concentrated on a long page. Different audiences had to search through the same page for relevant information.

**Work completed:**

- Rebuilt the conference overview from conference materials, adjusting content groups and presentation.
- Split the venue guide into a dedicated page with its route and return path.
- Created a separate partnership page, organizing tiers, benefits, and contact entry points.
- Refined cards, spacing, and interaction entry points for consistency with the rest of the website.

**Delivered:** Separate paths for the conference overview, venue guide, and partnership information, allowing attendees and partners to reach relevant pages directly.

Commits: `b2dc5a2`, `bf9fc02`, `86a9be0` · October 22–23, 2026.

### 3. Fixing Navigation and Venue Deep Links

**Problem:** The contest section had navigation errors, and activity entry points in the conference overview needed to lead to the appropriate venue or floor.

**Work completed:**

- Fixed three navigation issues in the contest section.
- Updated the destinations for the six participation entry points to route activities to the appropriate floor guides.
- Updated routes, the guide, and entry-point components together, fixing cases where different entry points led to the same content.

**Delivered:** Explicit destinations for contest and conference navigation, with more specific links into venue information.

Commits: `a4dcb58`, `f57136d` · October 22–23, 2026.

### 4. Keeping Event Information Consistent

**Problem:** Changes to event dates, organizers, and venue arrangements required updates across page content, data files, and sharing metadata.

**Work completed:**

- Applied the event date change across pages, data files, and SEO metadata.
- Aligned organizer, supporting-organization, and satellite-event information.
- Corrected session-to-floor mappings and the wording used to describe the two venues.

**Delivered:** Coordinated content updates and venue corrections to support ongoing event preparation.

Commits: `b040e17`, `ad1c65b`, `1241839`, `888ee7c`, `2e07d6c` · October 22–23, 2026.

## Technical Decisions and Tradeoffs

| Decision | Rationale and Tradeoffs |
| --- | --- |
| Reuse the existing account service | Connects the conference website to the established user system; requires cross-site session handling and profile mapping |
| Use a server-side, same-origin account bridge | The browser calls local endpoints while the server handles session forwarding; adds cookie, timeout, and upstream-error handling |
| Separate pages by user task | Gives conference information, venue guidance, and partnerships their own destinations; requires consistent entry points, return paths, and context |
| Support links to specific venue floors | Takes visitors directly from activity entry points to relevant guide content; requires keeping links and venue data in sync |

## Deliverables

This phase delivered account integration and iterations to the conference overview, venue guide, partnership page, and navigation. This case study covers the committed changes listed above, authored by `yimi528`.

The original repository is private. The short commit hashes identify the original changes and provide reference points for discussing implementation during interviews.
