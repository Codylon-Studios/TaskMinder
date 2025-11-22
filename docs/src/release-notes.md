# Release Notes

All changes are grouped by type and the latest version appears first.

---

## \[v2.2.2] - 2025-11-23

### Fixed
* Certain lessons were not displayed in timetable
* "Heute kein Unterricht" (or the blue info box in general) did not always display immediately
* Improve production deployment regarding permissions (least privilege)
* Change host volume to named volume in docker compose to avoid permission errors
* Correct docs at db migration
* Adding/editing/checking homework will lead to displaying all homework (ignoring filters) of the last 90 days - fixed
* Explanation for test class is now wrapped in an info box

---

## \[v2.2.1] - 2025-11-16

### Fixed
* BigInts were not correctly serialized to JSON at /get_upload_metadata
* ClamAV did not work in production as intended
* Add object "self" to CSP headers to support upload viewing

---

## \[v2.2.0] - 2025-11-16

### Added
* Add feature to upload files
* Timetable announcer, e.g. "Nächste Stunde Geographie in 48min in Raum 40983."
* Randomly select one homework (spin wheel), exclude/include homework in selection (like vocab)
* Add easter egg in devTools
* Add "Angemeldet als..." in offcanvas
* Socket events for many real-time changes
* Add loading bar to simulate progress
* Add frontend feedback for timetable changes
* Move events and homework further along (1 week)

### Fixed
* Fix bug where an account could not be deleted due to too early checks in backend
* Fix bug where teams could not be deleted due to wrong css selector in frontend
* Fix big where cache could return invalid or outdated data
* Fix bug where substitution cache would return No Data due to inconsistent thrid-party response
* Fix bug where "Neuer Nutzername" at change name is type=password

### Changed
* Different text styles for more or less important things, misc. UI changes
* Marking of text now adapts to background of event, etc.
* Improved data loading to skip file calling when previously called (up to 2x less requests and data transferred)
* Use substitutionData when auto selecting date at addHomework, etc.
* /main links smaller (arrows)
* Improved out-of-bounds checks and additional barrier checks in the backend
* Improved caching for all relevant tables if one related thing is updated
* Migrate from custom logger to winston
* Require bun v1.3.2 (> v1.3) in development and production (no breaking changes)
* Renaming files in backend for readability
* Monitoring /metrics endpoint exposed to local network instead of public route
* Bump loki, prometheus, grafana, promtail (no breaking changes)
* Bump redis to v8 (no breaking changes)
* Increased deletion for homework from 60 to 90 days

### Security
* Package bumping
* Close security issue with validator.js (removed)

### Removed
* Remove unused packages
* Remove unused domain names from nginx config

---

## \[v2.1.0] - 2025-09-27

### Added
* Add `prisma.config.ts` to Dockerfile
* Add event cleanup cron job (365 days)
* Tests for services in backend
* Accessibility features
* ToS

### Fixed
* Fix bug where a joined class user (not logged in) visiting `/join` or `/` would get the hardcoded `10d - className` value
* Fixed check for team/subject (now validates specific `teamId`, `subjectId`, and `classId`)

### Changed
* Update documentation
* Scripts improvements through `GITCMD` and `DOCKERCMD`
* Frontend improvements
* Improve SEO
* Change `classCode`, `className`, upgrade test classes to normal classes

### Removed
* Remove unused packages

---

## \[v2.0.0] - 2025-08-16

### Breaking Change
- Database structure (please refer to the migration guide on docs.taskminder.de)

### Added
- Functionality to create new classes (account required)
- Functionality to log out, delete account, change password and username
- Add autocomplete for due date and team selection as soon as subject is selected
- QR Code sharing of class code
- Copy paste for event/homework descriptions
- Add prisma transactions for safer database handling
- Add homework check animation
- Add sharing events with calendar
- Add soft deletion of accounts wth 30d auto delete from db
- Add permission levels (0,1,2,3) for classes with different permission levels
- Default setting for unregistered user and individual permissions for registered users
- Functionality to kick members from class
- Add 404 page

### Changed
- Change formatter to eslint formatting instead of prettier
- Improve data loading on frontend side
- Improve production handling by introducing build and run stages in Dockerfile
- Rename tables for more generic usage
- Update nginx config for domain change and redirection
- Change calendar month view: show 2 weeks before & after selected, not the whole month
- Improve displayed dates (strings like tomorrow or weekdays)
- Move session check and class check to extra middleware with single source of truth check with db with redis caching
- Move vaidation (zod) layer from controller to seperate middleware

### Fixed
#### Frontend
- Show more button on rich textarea not showing up
- No 404 result
- Multiple toast containers which overlap
- Homework checking is buggy on frontend
- Class settings: made more collapsible

#### Backend
- Server not restarting on change
- Move type packages to devDependencies in package.json
- Error on requesting unknown route

### Security
- Package bumping

### Removed
- Timetable validator, ajv package
- Compression package, compression now handeled by nginx

---

## \[v1.2.2] - 2025-07-14

### Changed

* change domain to taskminder.de, update email to info@taskminder.de
* update default legal information

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

- Migrated runtime environment from Node.js to [Bun](https://bun.sh) for improved performance and native support for TypeScript.
- Updated all scripts and tooling to be compatible with Bun.

### Changed

- Replaced `npm` scripts with `bun` equivalents.
- Adjusted build and deployment pipelines to support Bun.
- run linting and formatting tools in frontend
- LICENSE changes to clarify ownership and permissions

### Removed

- Removed `package-lock.json` in favor of Bun’s dependency manager.

---

## \[v1.1.2] - 2025-06-08

### Added

- Rich text support in homework and events.
- Added release notes for v.1.1.1 and v1.1.2
- Linting and Formatting tools - ESLint and Prettier.

### Changed

- Impressum and DSGVO updates
- UI improvements

### Fixed

- Resolved an issue where logged-in users were unable to join multiple teams within the same class.

### Security

- Bump packages to close security iusses.

---

## \[v1.1.1] - 2025-06-04

### Fixed

- fix redis cache not working correctly

---

## \[v1.1.0] - 2025-06-03

### Added

- .env.example file

### Changed

- Moved docs to host on readthedocs
- Migrate to prisma ORM, add migrations

### Fixed

- wrong joinedTeamsData saved locally
- edit toggle btn doesn't always show up when logged in

---

## \[v1.0.1] - 2025-05-25

### Added

- Support for multiline event and homework descriptions.
- `.sql` dump compression to reduce storage usage.
- Collapsible long events to improve UI/UX.
- Production documentation updates for:
  - User permission details.
  - Switched the order of NGINX and Certbot setup.
- `trust proxy` enabled for Express Rate Limit compatibility ([source](https://express-rate-limit.mintlify.app/guides/troubleshooting-proxy-issues)).

### Changed

- Resized "Copy Classcode" button for better mobile experience.
- Updated NGINX configuration for improved compatibility and performance.

### Fixed

- Timetable now properly displays when no substitutions are available.
- Backup table issue resolved by referencing the correct `.env` variable.
- Duplicate display issue corrected in UI.

### Security

- Bump packages to close securtity iusses.
- Escaping html to reduce attack risks.

---

## \[v1.0.0] – 2025-05-23

### Added

- Fetch, edit, and store timetable and subjects from the frontend.
- Ability to add and edit teams.
- Privacy Policy including _Impressum_, _Datenschutzinformation_, and contact email.
- Forced login or class code entry before accessing content.
- Copy class code button for easy sharing.
- Server monitoring tools to track system health and performance metrics.

### Changed

- Migrated codebase from JavaScript to TypeScript for improved type safety and maintainability.
- External content fetching moved from client-side to server-side.
- SEO improvements to enhance discoverability.
- Mobile navigation improved with off-canvas menu and direct login/logout buttons.
- File compression enabled to reduce load times.
- Documentation migrated from Notion to self-hosted MkDocs.
- Bumped core packages, including major upgrade to Express v5.
- Strengthened Content Security Policy (CSP) headers.
- Established and enforced new code standards.

### Fixed

- Backup table command issues resolved.

### Security

- Added server-side rate limiter to prevent abuse.
- Implemented CSRF middleware to protect against cross-site request forgery attacks.

### Removed

- Previous license replaced with updated terms (see LICENSE file).

---
