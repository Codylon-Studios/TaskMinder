# Migrations

> ℹ️ **Info**
>
> This guide walks you through migrating from the latest **v1 (v1.2.2)** release to the **v2** release.

---

### Before You Begin

- Ensure you’re running the **latest v1 (v1.2.2)** release.

- Be aware that **v2 introduces breaking changes**, including:
      - Significant database structure changes across multiple classes (manual intervention required).

- Carefully read this guide **at least once** before starting the process.

- Always **back up your database** before proceeding.

---

### Step 0: Stop All Running Containers

To prevent user access during the migration, shut down all containers:

```bash
docker compose down
```

Once stopped, users will receive a **503 Service Unavailable** error. Notify them in advance of the planned downtime.

---

### Step 1: Pull the Latest v2 Release

Manually fetch the latest v2 code from the `main` branch:

```bash
git pull origin main
```

Do **not** use automated update scripts for this step.

---

### Step 2: Drop the `_prisma_migrations` Table

The initial migration (`0_init`) has changed. To allow Prisma to re-run migrations, drop the `_prisma_migrations` table.

1. Start the PostgreSQL container and open a shell:

   ```bash
   docker compose up -d postgres
   docker ps
   ```

   Copy the container ID of the PostgreSQL instance and run:

   ```bash
   docker exec -it <CONTAINER_ID> bash
   ```

2. Connect to the database and drop the migration table:

   ```bash
   psql -U postgres
   \c taskminder
   DROP TABLE _prisma_migrations;
   \q
   exit
   ```

3. Stop the PostgreSQL container:

   ```bash
   docker compose down
   ```

---

### Step 2.1: Start & Build the New Service

1. Temporarily **comment out** the following line entrypoint.sh: `bunx prisma migrate resolve --applied 0_init`

2. Temporarily **comment** the following line in entrypoint.sh: `bunx prisma migrate deploy`

3. Build and start the service:

      ```bash
         docker compose up --build
      ```

4. Wait until `0_init` is marked as applied (this will be displayed in the logs), then **stop the process** (`Ctrl+C`).

5. **Re-comment** this line: `bunx prisma migrate resolve --applied 0_init`

6. **Comment out** this line: `bunx prisma migrate deploy`

---

### Step 2.2: Edit the SQL Migration File

Update the generated `.sql` migration file to include your **specific values**. There is an INSERT and an UPDATE statement which have to be changed. The commands assume default values, change them. In `UPDATE "account"`, `USERNAME` must be a valid, existing value in the table.

---

### Step 3: Start All Services

Start all services and rebuild containers:

```bash
docker compose up -d --build
```

---

### Step 4: Reset Git Changes

To ensure clean future updates, reset the modified migration file:

```bash
git restore backend/src/prisma/migrations/20250804114621_migrate_to_multiple_classes/migration.sql
```

---

### Step 5: Drop `_prisma_migrations` Again & Mark Migrations as Applied

Prisma validates migration checksums. Any change to a migration file (like editing defaults) will cause mismatches and failures in future deployments.

1. Drop the `_prisma_migrations` table again (refer to Step 2).
2. Temporarily **comment out** these lines in entrypoint.sh :
      - `bunx prisma migrate resolve --applied 0_init`
      - `bunx prisma migrate resolve --applied 20250804114621_migrate_to_multiple_classes`

3. Also **comment**:
      - `bunx prisma migrate deploy`

---

### Step 6: Rebuild & Restart All Containers

1. **Stop all containers:**

   ```bash
   docker compose down
   ```

2. **(Optional but recommended) Apply system updates.**

   **Ubuntu:**

   * `sudo apt update`
     Fetches the latest package information from the configured repositories. It doesn’t upgrade packages but updates the local cache with the newest available versions.
   * `sudo apt list --upgradable`
     Displays a list of packages that have newer versions available for installation.
   * `sudo apt upgrade`
     Installs the available updates for all installed packages.
   * `sudo apt autoremove`
     Removes packages that were automatically installed as dependencies and are no longer needed.

3. **Clean `backup.log` file**
   Navigate to `home/ubuntu/backup.log` and delete all lines in the file:

   ```bash
   :1,$d
   ```

4. **Verify:**

   * **Nginx** configuration
   * **UFW** firewall rules

5. **Rebuild and start all services:**

   ```bash
   docker compose up -d --build
   ```

---

### Step 7: Final Git Reset

Reset any remaining Git changes:

```bash
git reset --hard
```

---
