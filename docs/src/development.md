# Development Setup Guide

This guide outlines the steps necessary to set up your development environment for **TaskMinder**. This includes installing NodeJS, npm, Python 3 (for documentation), Redis, and PostgreSQL.

!!! warning "License Notice"
    **Please make sure to review [our license](./license.md) before contributing to the project!**  
    In brief:

    - Properly credit Codylon Studios
    - Commercial use is prohibited
    - Your project must use the same license terms

!!! info
    Although Windows setup instructions are provided, primary development and testing are done on Linux/macOS. Windows setups are not actively maintained or thoroughly tested, so you may encounter unexpected issues.

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

=== "Windows"

    Follow the installation guide for Redis CE (< v8): [Install Redis on Windows]. Return here once finished.

    [Install Redis on Windows]: https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-redis/install-redis-on-windows/

    Download PostgreSQL here: [Download page of PostgreSQL]. After installation, remember the superuser password (usually `postgres`).

    [Download page of PostgreSQL]: https://www.postgresql.org/download/windows/

    Instructions for starting the services are included in the installation guides.

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

=== "Windows"

    Open the SQL Shell (psql):

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

To securely manage credentials, create a `.env` file in your project root directory. Replace placeholders (`your_*`) with your actual values.

```env
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=your_db_name
DB_HOST=localhost
NODE_ENV=DEVELOPMENT
REDIS_HOST=redis
REDIS_PORT=6379
SESSION_SECRET=your_session_secret
DSB_USER=your_dsb_user
DSB_PASSWORD=your_dsb_password
CLASSCODE=your_classcode
```

- `SESSION_SECRET` and `CLASSCODE` should be secure, consistent passwords.
- `DSB_USER` and `DSB_PASSWORD` are credentials for [DSBmobile](https://www.dsbmobile.de), used to fetch substitution data. If unavailable, you may use placeholders.

---

### Start the Server

Use the following command to start the server with auto-reloading:

```zsh
nodemon server.js
```

Alternatively, you can use:

```zsh
node menu.js
```

!!! info
    The following steps describe initial table setup. This process will be replaced by an admin interface in future versions.

---

### Initialize Tables

Once the server is running, the `eventType` and `team` tables will exist but be empty. You can populate them with:

```sh
sudo -u postgres psql
\c your_db_name
```

```sql
INSERT INTO team (name) VALUES ('Team One');
INSERT INTO team (name) VALUES ('Team Two');
...
INSERT INTO "eventType" (name, color) VALUES ('Event Type One', '#123456');
INSERT INTO "eventType" (name, color) VALUES ('Event Type Two', '#abcdef');
...
```

---

### Add Required Files

Since the subject and timetable files are excluded from git (via `.gitignore`), you must recreate them manually. Refer to [File Structure](/docs/filestructure) for details.

---

### Docs Development

To work on documentation using `mkdocs`, follow this video guide:  
📺 [How to set up Material for MkDocs](https://www.youtube.com/watch?v=xlABhbnNrfI)  
You only need the installation part (timestamp 3:49–5:53).