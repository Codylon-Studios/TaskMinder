# Migrations (preview)
## Migrate from v1 to v2 (preview)

!!! info "Early Preview"
    This migration guide provides an early preview of the upgrade process from the latest v1 version to v2.

**Before starting**, ensure you are on the latest release of the v1 major version.

The upcoming **v2** release introduces breaking changes, including:

- Migration to Prisma and adoption of Prisma migrations

You’ll need to add a file named `database_url.txt` to the `docker_secrets` folder. This file must contain the connection URL for Prisma in the following format:

```
postgresql://db_user:db_password@taskminder-postgres:5432/db_name
```

Prisma will automatically apply any database changes using its migration system.