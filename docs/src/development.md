# Development Setup Guide

!!! warning "Docs for develop branch"
    This guide outlines the current development process and is intended for contributing to the develop branch. It may differ from the steps used in the latest stable release.

This guide outlines the steps necessary to set up your development environment for **TaskMinder**. This includes installing nodeJS, npm, python3, mkdocs-material, redis, and PostgreSQL.

!!! warning "License Notice"
    **Please make sure to review [our license](./license.md) before contributing to the project!**  
    In brief:

    - Properly credit Codylon Studios
    - Commercial use is prohibited
    - Your project must use the same license terms

!!! info
    Windows is currently not supported, as the primary development and testing of this tool are carried out on Linux and macOS platforms. This may result in compatibility issues or unexpected behavior when attempting to run the server on Windows.

---

### Installing Redis and PostgreSQL

Recommended versions: PostgreSQL 14.0+ and Redis 7.x (Community Edition < v8).

=== "Linux (Ubuntu/Debian)"

    Follow this guide to install Redis CE (< v8): [Install Redis on Linux]. Return here once complete.

    [Install Redis on Linux]: https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-redis/install-redis-on-linux/

    Download PostgreSQL here: [Download page of PostgreSQL]. Return here once installed.

    [Download page of PostgreSQL]: https://www.postgresql.org/download/

    Don’t forget to start and enable both services to run at system startup:

    ```zsh
    # Redis setup is covered in the installation guide
    sudo systemctl enable redis-server
    sudo systemctl start redis-server
    # PostgreSQL setup – this part is often not included in guides
    sudo systemctl enable postgresql
    sudo systemctl start postgresql
    ```

=== "macOS"

    Follow this guide to install Redis CE (< v8): [Install Redis on MacOS]. Return here once finished.

    [Install Redis on MacOS]: https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-redis/install-redis-on-mac-os/

    Download PostgreSQL here: [Download page of PostgreSQL]. Return here once finished.

    [Download page of PostgreSQL]: https://www.postgresql.org/download/macosx/

    Service startup instructions are included in the respective guides.

=== "GitHub Codespaces"

    Since Codespaces run on Ubuntu, the setup is similar to the Linux instructions.  
    Auto-starting services on boot is skipped to save memory and runtime.

    Install and start Redis:

    ```zsh
    sudo apt-get update
    sudo apt-get install redis
    sudo service redis-server start
    ```

    Install and start PostgreSQL:

    ```zsh
    sudo apt-get update
    sudo apt-get -y install postgresql
    sudo service postgresql start
    ```

---

### Installing NodeJS and npm

NodeJS and npm are required. *(Skip this step in GitHub Codespaces, as they are pre-installed.)*

To check if they're already installed, run:

```zsh
node --version
```

```zsh
npm --version
```

You should see at least Node v20.19.0 and npm v10.8.2. Refer to [NodeJS Versions] for compatibility details.

[NodeJS Versions]: https://nodejs.org/en/about/previous-releases

If not installed, download from [NodeJS Download].

[NodeJS Download]: https://nodejs.org/en/download

---

### Clone Repository and Install npm Packages

Visit the repo at [https://github.com/Codylon-Studios/TaskMinder](https://github.com/Codylon-Studios/TaskMinder) and fork it.

Then, on your local machine, choose a directory and run:

```zsh
git clone https://github.com/YOUR_GITHUB_USERNAME/TaskMinder.git
cd TaskMinder
```

Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username.

Install all dependencies:

```zsh
npm install
```

---

### Initialize the Database

Before using the database, you need to log into the PostgreSQL terminal (`psql`) and create a database. It's also recommended to change the default `postgres` password.

Replace `your_db_name` with your actual database name.

=== "Linux"

    ```zsh
    sudo -u postgres psql
    \password
    ```
    ```sql
    CREATE DATABASE your_db_name;
    ```

=== "macOS"

    ```zsh
    psql postgres
    \password
    ```
    ```sql
    CREATE DATABASE your_db_name;
    ```

=== "GitHub Codespaces"

    ```sh
    sudo su postgres
    psql postgres
    \password
    ```
    ```sql
    CREATE DATABASE your_db_name;
    ```

---

### Create the `.env` File

To securely manage credentials, create a `.env` file in the root directory of your project. Replace all placeholder values (e.g., `your_*`) with your actual credentials.

You can use the `.env.example` file located in the root folder as a reference.

* `SESSION_SECRET` and `CLASSCODE` should be secure and consistent values. For local development, you can use simpler values if needed.
* `DSB_USER` and `DSB_PASSWORD` are the login credentials for [DSBmobile](https://www.dsbmobile.de), used to fetch substitution plan data and integrate it into the timetable.
  If you don’t have valid credentials, you can leave placeholders and set `DSB_ACTIVATED=false` to disable this feature.

---

###  Setup mkdocs-material (documentation)
Follow this video guide:  
📺 [How to set up Material for MkDocs](https://www.youtube.com/watch?v=xlABhbnNrfI)  
You only need the installation part (timestamp 3:49–5:53).

---

### Applying databse changes

Run `npx prisma migrate dev` to apply schema changes from previously pulled commits to your local database.
You should also run this command during development if the schema has been modified.

If you make changes to the schema while developing—especially on a feature branch—don’t forget to generate a migration file. Otherwise, your changes might be lost or overwritten when switching branches (e.g., to `develop` or `main`).


### Start the Server

Run this command to compile the typescript code and start the development server, ru
```zsh
npm run dev-build
```

*Notes*:

* You can manually compile the code by running `npm run build`, or use `npm run build:fe` and `npm run build:be` to compile the frontend and backend separately. After building, start the server with `npm run dev`.

* We recommend using linting tools to maintain code quality. To use ESLint on this project, simply run: `npx eslint .`.

* As a best practice, format your code using Prettier. You can run `npx prettier --write PATH/TO/FILE_OR_FOLDER` to format specific files or directories, or use `npx prettier . --write` to format the entire project.

* When updating the Prisma schema, remember to run `npx prisma generate` to regenerate the client and TypeScript types in `node_modules/`.
  Before committing your changes, make sure to run `npx prisma migrate dev` to create and apply the necessary migration files to your local database—skipping this step may result in broken or inconsistent code.

---
