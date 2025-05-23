# Release Notes

All changes are grouped by type and the latest version appears first.

---

## \[v1.0.0] – 2025-05-23

### Added

* Fetch, edit, and store timetable and subjects from the frontend.
* Ability to add and edit teams.
* Privacy Policy including *Impressum*, *Datenschutzinformation*, and contact email.
* Forced login or class code entry before accessing content.
* Copy class code button for easy sharing.
* Server monitoring tools to track system health and performance metrics.

### Changed

* Migrated codebase from JavaScript to TypeScript for improved type safety and maintainability.
* External content fetching moved from client-side to server-side.
* SEO improvements to enhance discoverability.
* Mobile navigation improved with off-canvas menu and direct login/logout buttons.
* File compression enabled to reduce load times.
* Documentation migrated from Notion to self-hosted MkDocs.
* Bumped core packages, including major upgrade to Express v5.
* Strengthened Content Security Policy (CSP) headers.
* Established and enforced new code standards.

### Fixed

* Backup table command issues resolved.

### Security

* Added server-side rate limiter to prevent abuse.
* Implemented CSRF middleware to protect against cross-site request forgery attacks.

### Removed

* Previous license replaced with updated terms (see LICENSE file).

---
