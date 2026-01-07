# Development Setup Guide

!!! warning "Docs for develop branch"  
    This guide outlines the current development process and is intended for contributing to the develop branch. It may differ from the steps used in the latest stable release.

This guide outlines the steps necessary to set up your development environment for **TaskMinder**. This includes installing bun, python3, mkdocs-material, redis, PostgreSQL with optional setup for ClamAV and Ghostscript.

!!! warning "License Notice"
    **Please make sure to review [our license](./license.md) before contributing to the project!**  
    In brief:

    - Properly credit the Authors
    - Commercial use is prohibited
    - Your project must use the same license terms

!!! info
    Windows is currently not supported, as the primary development and testing of this tool are carried out on Linux and macOS platforms. This may result in compatibility issues or unexpected behavior when attempting to run the server on Windows.

---

### Installing Redis and PostgreSQL

Recommended versions: PostgreSQL 14.0+ and Redis v8+ (Redis Open Source).

=== "Linux (Ubuntu/Debian)"

    Follow this guide to install Redis Open Source: [Install Redis on Linux]. Return here once complete.

    [Install Redis on Linux]: https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/apt/

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

    Follow this guide to install Redis Open Source: [Install Redis on MacOS]. Return here once finished.

    [Install Redis on MacOS]: https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/homebrew/

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

### Installing Bun

Bun is required for this project.

To check if it's already installed, run:

```zsh
bun --version
```

You should see at least Bun 1.3.5 (last checked: January 5th, 2026).

[Bun Versions]: https://bun.sh/blog

If not installed, retrieve the download instuctions from the [Bun Download Page]. For Github Codespaces, follow the `npm`instructions under the Mac/Linux Tab.

[Bun Download Page]: https://bun.sh/docs/installation

---

### Installing ClamAV and Ghostscript - optional

This step installs the tools that scan files uploaded to the server. This is optional for development environments, as you typically wouldn't enable scanning in that context. However, if you're developing or testing upload functionality, please install these tools to ensure your code changes work correctly with the scanning pipeline.

=== "Linux (Ubuntu/Debian) and GitHub Codespaces"
    **Install ClamAV via apt package manager**

    ```bash
    sudo apt install clamav clamav-daemon -y
    ```

    * `clamav`: the command-line scanner (`clamscan`)
    * `clamav-daemon`: runs the `clamd` background service for faster scanning


    **Stop the daemon before updating virus definitions**

    ```bash
    # Github Codespaces
    sudo service clamav-freshclam stop
    
    # Ubuntu/Debian (Linux)
    sudo systemctl stop clamav-freshclam
    ```


    **Update virus definitions**

    ```bash
    sudo freshclam
    ```

    *(This fetches the latest virus signatures from ClamAV’s servers.)*


    **Start services**

    ```bash
    # Github Codespaces
    sudo service clamav-freshclam start
    sudo service clamav-daemon start

    # Ubuntu/Debian (Linux)
    sudo systemctl enable clamav-freshclam
    sudo systemctl start clamav-freshclam
    sudo systemctl enable clamav-daemon
    sudo systemctl start clamav-daemon
    ```

    **Install Ghostscript via apt package manager**

    ```bash
    sudo apt install ghostscript -y
    gs --version
    ```

    Ghostscript should at least return version 10.02.1 (last checked: November 7th, 2025).

=== "MacOS"
    **Install ClamAV via Homebrew**
    ```bash
    brew install clamav
    ```
    
    **Verify the installation**
    ```bash
    brew list clamav
    clamscan --version
    ```
    You should see binaries like `clamd`, `clamdscan`, `clamscan`, and configuration files in `/opt/homebrew/etc/clamav/`. The version of ClamAV should at least be 1.5.1 (last checked: January 5th, 2026).
    
    **Copy sample configuration files**
    
    ClamAV ships with sample configuration files that you'll need to customize:
    ```bash
    cd /opt/homebrew/etc/clamav
    cp clamd.conf.sample clamd.conf
    cp freshclam.conf.sample freshclam.conf
    ```
    
    **Configure clamd.conf**
    ```bash
    nano /opt/homebrew/etc/clamav/clamd.conf
    ```
    Edit or uncomment these lines:
    ```ini
    # Where the database files are stored
    DatabaseDirectory /opt/homebrew/var/lib/clamav
    
    # Temporary directory
    TemporaryDirectory /tmp
    
    # Log file location
    LogFile /opt/homebrew/var/log/clamav/clamd.log
    LogFileMaxSize 5M
    
    # Local socket (used by clamdscan)
    LocalSocket /opt/homebrew/var/run/clamav/clamd.sock
    FixStaleSocket yes
    
    # Run as daemon
    Foreground no
    ```
    
    **Configure freshclam.conf**
    ```bash
    nano /opt/homebrew/etc/clamav/freshclam.conf
    ```
    Edit these lines:
    ```ini
    DatabaseDirectory /opt/homebrew/var/lib/clamav
    UpdateLogFile /opt/homebrew/var/log/clamav/freshclam.log
    DatabaseOwner _clamav
    Checks 12
    ```
    
    **Create required directories**
    ```bash
    sudo mkdir -p /opt/homebrew/var/lib/clamav
    sudo mkdir -p /opt/homebrew/var/log/clamav
    sudo mkdir -p /opt/homebrew/var/run/clamav
    sudo chown -R $(whoami) /opt/homebrew/var/{lib,log,run}/clamav
    ```
    
    **Download virus definitions**
    ```bash
    freshclam
    ```
    This downloads the latest virus definitions to `/opt/homebrew/var/lib/clamav`.
    
    **Start the ClamAV daemon**
    ```bash
    brew services start clamav
    ```
    
    **Note:** Homebrew services don't automatically update virus definitions. Remember to run `freshclam` regularly to keep your definitions current.

    **Install Ghostscript via Homebrew**
    ```bash
    brew install ghostscript
    gs --version
    ```
    Ghostscript should at least return version 10.06.0 (last checked: January 5th, 2026).

---

### Clone Repository and Install Bun Packages

Visit the repo at [https://github.com/Codylon-Studios/TaskMinder](https://github.com/Codylon-Studios/TaskMinder) and fork it.

Then, on your local machine, choose a directory and run:

```zsh
git clone https://github.com/YOUR_GITHUB_USERNAME/TaskMinder.git
cd TaskMinder
```

Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username.

Install all dependencies:

```zsh
bun install
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

To securely manage credentials, create a `.env` file in the root directory of your project.

You can use the `.env.example` file located in the root folder as a reference.

---

### Setup mkdocs-material (documentation) - optional

Follow this video guide:  
📺 [How to set up Material for MkDocs](https://www.youtube.com/watch?v=xlABhbnNrfI)  
You only need the installation part (timestamp 3:49–5:53).

---

### Set Up `personalData.html` File

From the project root, navigate to `frontend/src/snippets/personalData/personalData.html.example`. This file provides a template for personal data that will be dynamically injected into frontend pages like the privacy policy or imprint.

Create a new file in the same directory named `personalData.html` (i.e., `frontend/src/snippets/personalData/personalData.html`). Copy the contents of the `.example` file into it, and modify the data as needed. Accurate data isn't required during development, but it's recommended to keep it roughly aligned with production.

---

### Applying database changes

Run `bunx prisma migrate dev` to apply schema changes from previously pulled commits to your local database.
You should also run this command during development if the schema has been modified.

If you make changes to the schema while developing—especially on a feature branch—don’t forget to generate a migration file. Otherwise, your changes might be lost or overwritten when switching branches (e.g., to `develop` or `main`).

---

### Start the Server

Run this command to compile the typescript code and start the development server:

```zsh
bun run build
bun run dev
```

_Notes_:

- You can manually compile the code by running `bun run build`, or use `bun run build:fe` and `bun run build:be` to compile the frontend and backend separately. After building, start the server with `bun run dev`.

- We use linting/formatting tools to maintain code quality. To use ESLint and Prettier (frontend only) on this project, simply run: `bun run lint`.

- When updating the Prisma schema, remember to run `bunx prisma generate` to regenerate the client and TypeScript types in `node_modules/`.
  Before committing your changes, make sure to run `bunx prisma migrate dev` to create and apply the necessary migration files to your local database—skipping this step may result in broken or inconsistent code.

---
