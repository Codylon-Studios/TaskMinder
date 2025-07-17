# Migrations (Preview)

## Migrating from v1 to v2

!!! info "Early Preview"
This guide provides an early look at the migration process from the latest v1 release to the upcoming v2 version.

**Before you begin**, make sure you're running the latest v1 release.

The **v2** release includes **breaking changes**, such as:

* Significant changes to the database structure for multiple classes (manual adjustments required)

**Important:**

* Read this migration guide thoroughly multiple times before beginning.
* Always **back up your database** before proceeding.

### Step 1: Pull the Latest v2 Release

Manually pull the latest v2 release from the `main` branch (do **not** use a script for this step).

### Step 2: Modify the Prisma Migration File

Navigate to `backend/src/prisma/migrations/`, open the relevant `.sql` file, and adjust the following:

* **INSERT and UPDATE statements** to recreate the previous single class setup
* **Account settings** to assign an admin and set the permission of others to 0

📝 *Detailed instructions are included as comments within the `.sql` file.*


### Step 3: Remove Unused Docker Secrets

Delete the following files from your Docker secrets folder:

* `classcode.txt`
* `dsb_user.txt`
* `dsb_password.txt`
* `dsb_activated.txt`

### Step 4: Rebuild and Restart Containers

Before restarting, it’s recommended to:

* Check your system for security or package updates
* Ensure your Nginx configuration and UFW firewall are still functioning correctly

Then run:

```bash
docker compose up --build
```
