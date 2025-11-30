# Server Setup in Production v2

## What you'll need

* A valid domain (e.g. `taskminder.de`)
* A server running Ubuntu (≥ 24.04 LTS) with sudo or root access
* The codebase of TaskMinder from [https://github.com/Codylon-Studios/TaskMinder](https://github.com/Codylon-Studios/TaskMinder)

---

## 1. DNS Configuration

Before proceeding with the server setup, configure your domain to point to your Ubuntu server.

### Get Your Server's Public IP Address

On your server, run:

```bash
curl ifconfig.me
```

Copy the returned IP (e.g., `203.0.113.42`). Make sure the server is not behind a router. The following guide will use this example IP — **replace it with your actual IP**.

---

### Configure DNS Records

Go to your domain registrar’s DNS management page (e.g., Namecheap, GoDaddy, Cloudflare etc.) and add the following records:

| **Type** | **Name** | **Value**      | **TTL**          |
| -------- | -------- | -------------- | ---------------- |
| A        | @        | `203.0.113.42` | Automatic / 3600 |
| A        | www      | `203.0.113.42` | Automatic / 3600 |

> This assumes you're using `example.com` and want `www.example.com` to also work.

We also use a subdomain for monitoring (`monitoring.example.com`) and a subdomain for a status page.

We use [https://betterstack.com/](https://betterstack.com/) as it offers custom subdomains for the status page, but you may choose another provider. After setting up the status page, follow BetterStack’s instructions to configure the CNAME record.

For the monitoring page (`monitoring.example.com`), add the following record:

| **Type** | **Name**   | **Value**      |
| -------- | ---------- | -------------- |
| A        | monitoring | `203.0.113.42` |

---

### Wait for Propagation

DNS propagation can take a few minutes to several hours. Use tools like:

- [https://dnschecker.org](https://dnschecker.org)

Once your domain resolves to your server’s IP, proceed to the next step.

---

## 2. Install Required Packages

### Update and install dependencies:

This installs (if not already installed) Git, curl, NGINX, UFW, and Fail2Ban:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl nginx ufw fail2ban
```

### Install Docker and Docker Compose:

Follow the official Docker documentation to install Docker and Docker Compose:

🔗 [https://docs.docker.com/engine/install/ubuntu/](https://docs.docker.com/engine/install/ubuntu/)

### Enable and start Docker

```bash
sudo systemctl enable docker
sudo systemctl start docker
```

---

### Enable and configure firewall (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Secure SSH access

Edit `/etc/ssh/sshd_config`:

```bash
PermitRootLogin no
PasswordAuthentication no
```

Then restart SSH:

```bash
sudo systemctl restart ssh
```

### Configure Fail2Ban

```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

Check status:

```bash
sudo fail2ban-client status
```

---

## 3. Clone the Project from GitHub

```bash
cd /opt
sudo git clone https://github.com/Codylon-Studios/TaskMinder.git
cd TaskMinder
```

---

## 4. Configure NGINX

First, modify the `nginx.config` file to replace `taskminder.de` with your actual domain name.

```bash
vi nginx.config
```

or

```bash
nano nginx.config
```

Next, remove all `server` blocks that use `listen 443`—this is necessary to let Certbot handle SSL configuration properly. Keep only the `listen 80` block for now.

### Install Certbot and Obtain SSL Certificates

Install Certbot and its NGINX plugin:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Run Certbot to obtain SSL certificates (replace `example.com` and subdomains with your actual domains):

```bash
sudo certbot -d example.com -d www.example.com -d monitoring.example.com
```

Certbot will automatically update the configuration file at `/etc/nginx/sites-available/taskminder`. **Delete this file**, as you’ll be using your custom config instead.

Now that you know the location and filenames of the generated certificates, update your original `nginx.config` at `/opt/TaskMinder/nginx.config`. Replace the certificate paths with the correct ones provided by Certbot.

### Deploy Your Final NGINX Configuration

```bash
# Copy your updated configuration
sudo cp /opt/TaskMinder/nginx.config /etc/nginx/sites-available/taskminder

# Enable and test the configuration
sudo ln -s /etc/nginx/sites-available/taskminder /etc/nginx/sites-enabled/
sudo nginx -t

# Restart NGINX to apply changes
sudo systemctl restart nginx
```

---

## 5. Set Up Non-Root User

Running as root means a compromised container could gain full system access. It is highly recommended to run the server as a non-root user (least privilege). We’ll use the name `ubuntu` for this guide, but you may choose another name.

```bash
sudo adduser ubuntu
sudo usermod -aG sudo ubuntu
sudo usermod -aG docker ubuntu
```

If `adduser` fails, the user likely already exists (common on cloud providers like AWS or DigitalOcean). In that case, just add them to the `docker` group:

```bash
sudo usermod -aG docker ubuntu
```

Give the user access to the project folder:

```bash
sudo chown -R ubuntu:ubuntu /opt/TaskMinder
```

Log out and reconnect as the `ubuntu` user:

```bash
exit
ssh ubuntu@<your-ip-address>
```

---

## 6. Automated Backup Setup (via Cron)

### Make the Backup Script Executable

The `cron` service needs permission to run the script. You only need to do this once.

```bash
chmod +x /opt/TaskMinder/backup-cmds/db_backup.sh
```

### Add the Job to Crontab

This will schedule the script to run automatically.

Open the crontab editor for the current user:

```bash
   crontab -e
```

Add the following line to the bottom of the file, then save and exit:

```bash
   0 * * * * /opt/TaskMinder/backup-cmds/db_backup.sh >> /var/log/backup.log 2>&1
```

### Verify the Setup

Confirm the job was added successfully by listing the active cron jobs:

```bash
   crontab -l
```

You should see the line you just added.

---

## 7. Add Docker Secrets

Navigate back to the TaskMinder folder and create directories for secrets and backups:

```bash
cd /opt/TaskMinder
mkdir docker_secrets
mkdir db-backups
```

Before starting the application, create the following **text files inside the `docker_secrets/` folder**. These files are used as Docker secrets for configuration:

| **Filename**                | **Description**                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `db_name.txt`               | Name of the PostgreSQL database.                                                                               |
| `db_password.txt`           | Password for the PostgreSQL database user.                                                                     |
| `db_host.txt`               | Host for the database, usually postgres when running in docker.                                                |
| `db_user.txt`               | PostgreSQL database username.                                                                                  |
| `redis_port.txt`            | Redis port (default is `6379`).                                                                                |
| `session_secret.txt`        | Secure session secret (e.g., `ez829ebqhjui2638sbajk`).                                                         |
| `unsafe_deactivate_csp.txt` | Deactivates all csp headers when set to `true`, in production, set to `false`.                                 |
| `database_url.txt`          | Provides the database URL for Prisma ORM: `postgresql://db_user:db_password@taskminder-postgres:5432/db_name`. |

---

## 8. Setup `personalData.html`

1. **Navigate to the directory** where the example file is located:

   ```bash
   cd /path/to/project/frontend/src/snippets/personalData/
   ```

2. **Copy the example file to create the production file:**

   ```bash
   sudo cp personalData.html.example personalData.html
   ```

3. **Edit the new file with `vi` to update the personal data:**

   ```bash
   sudo vi personalData.html
   ```
---

## 9. Run Docker Compose and reset git changes

Navigate to the project root and build/start the containers:

```bash
cd /opt/TaskMinder
docker compose up -d --build
```

Reset git changes:

```bash
git reset --hard
```

And build/start the containers again:
```bash
docker compose up -d --build
```

---

## 10. TaskMinder Deployment Complete

Your TaskMinder server should now be running at:

- **[https://example.com](https://example.com)**
- **[https://www.example.com](https://www.example.com)**
- **[https://monitoring.example.com](https://monitoring.example.com)**

---

## 11. What's Next?

- Create an account to set up a class and add your subjects, teams, and timetable.
- Visit [https://monitoring.example.com](https://monitoring.example.com) to change the default password **"admin"** to a secure one. You’ll be prompted to do this upon your first login.

---

## 12. Subsequent Updates

This guide covers minor version upgrades.
For **major version upgrades**, please refer to the relevant migration guides to check for any breaking changes.
Before upgrading, inform users about the upcoming server maintenance, as the server will be temporarily unavailable during the update (HTTP 503 status).

1. Navigate to the root folder of the project and stop the Docker Compose process:

   ```bash
   docker compose down
   ```

2. Pull the latest changes from the `main` branch on GitHub:

   ```bash
   git pull origin main
   ```

3. Rebuild and restart the Docker containers:

   ```bash
   docker compose up -d --build
   ```
---
