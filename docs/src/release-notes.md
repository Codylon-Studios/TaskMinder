# Release Notes

All changes are grouped by type and the latest version appears first.

---

## \[v1.0.1] - 2025-05-24

### Added

* Support for multiline event and homework descriptions.
* `.sql` dump compression to reduce storage usage.
* Collapsible long events to improve UI/UX.
* Production documentation updates for:
  * User permission details.
  * Switched the order of NGINX and Certbot setup.
* `trust proxy` enabled for Express Rate Limit compatibility ([source](https://express-rate-limit.mintlify.app/guides/troubleshooting-proxy-issues)).
* HTML escaping

### Changed

* Resized "Copy Classcode" button for better mobile experience.
* Updated NGINX configuration for improved compatibility and performance.

### Fixed

* Timetable now properly displays when no substitutions are available.
* Backup table issue resolved by referencing the correct `.env` variable.
* Duplicate display issue corrected in UI.

### Security

* Bump packages to close securtity iusses.
* Escaping html to reduce attack risks.

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
