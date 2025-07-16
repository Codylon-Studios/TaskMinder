# Release Notes

All changes are grouped by type and the latest version appears first.

---

## \[v1.2.2] - 2025-07-14

### Changed

* change domain to taskminder.de, update email to info@taskminder.de
* update default leagl information

### Fixed

* fix nginx config file and setup guide in documentation

---

## \[v1.2.1] - 2025-07-14

### Added

* add codylon.de migration toast

### Changed

* Increase timeout to 5 seconds
* migrate to extern sh script

### Fixed

* sometimes no homework & events appear on their own site
* fix cache stringify issue

---

## \[v1.2.0] - 2025-06-10

### Breaking Change - License

Users must review and comply with the updated license terms before updating or continuing use.

### Added

* Migrated runtime environment from Node.js to [Bun](https://bun.sh) for improved performance and native support for TypeScript.
* Updated all scripts and tooling to be compatible with Bun.

### Changed

* Replaced `npm` scripts with `bun` equivalents.
* Adjusted build and deployment pipelines to support Bun.
* run linting and formatting tools in frontend
* LICENSE changes to clarify ownership and permissions

### Removed

* Removed `package-lock.json` in favor of Bun’s dependency manager.

---

## \[v1.1.2] - 2025-06-08

### Added

* Rich text support in homework and events.
* Added release notes for v.1.1.1 and v1.1.2
* Linting and Formatting tools -  ESLint and Prettier.

### Changed

* Impressum and DSGVO updates
* UI improvements

### Fixed

* Resolved an issue where logged-in users were unable to join multiple teams within the same class.

### Security

* Bump packages to close security iusses.

---

## \[v1.1.1] - 2025-06-04

### Fixed

* fix redis cache not working correctly

---

## \[v1.1.0] - 2025-06-03

### Added

* .env.example file

### Changed

* Moved docs to host on readthedocs
* Migrate to prisma ORM, add migrations

### Fixed

* wrong joinedTeamsData saved locally
* edit toggle btn doesn't always show up when logged in

---

## \[v1.0.1] - 2025-05-25

### Added

* Support for multiline event and homework descriptions.
* `.sql` dump compression to reduce storage usage.
* Collapsible long events to improve UI/UX.
* Production documentation updates for:
  * User permission details.
  * Switched the order of NGINX and Certbot setup.
* `trust proxy` enabled for Express Rate Limit compatibility ([source](https://express-rate-limit.mintlify.app/guides/troubleshooting-proxy-issues)).

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
