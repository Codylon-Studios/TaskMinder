# Server Setup in Production
## What you'll need

* A valid domain (e.g. `codylon.de`)
* A server running Ubuntu (≥ 20.04.6 LTS) with sudo or root access
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

> This assumes you're using `yourdomain.com` and want `www.yourdomain.com` to also work.

We also use a subdomain for monitoring (`monitoring.yourdomain.com`) and a subdomain for a status page.

We use [https://betterstack.com/](https://betterstack.com/) as it offers custom subdomains for the status page, but you may choose another provider. After setting up the status page, follow BetterStack’s instructions to configure the CNAME record.

For the monitoring page (`monitoring.yourdomain.com`), add the following record:

| **Type** | **Name**   | **Value**      |
| -------- | ---------- | -------------- |
| A        | monitoring | `203.0.113.42` |

---

### Wait for Propagation

DNS propagation can take a few minutes to several hours. Use tools like:

* [https://dnschecker.org](https://dnschecker.org)

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

> Note: This folder will be used later for Docker secrets and configuration.

---

## 4. Configure NGINX

### Modify and copy your NGINX config file
Modify the ngnix.config to replace codylon.de with your actual domain.

```bash
vi nginx.config
```
or
```bash
nano nginx.config
```
Then copy/paste the file:
```bash
sudo cp /opt/TaskMinder/nginx.config /etc/nginx/sites-available/taskminder
```

### Enable the NGINX site

```bash
sudo ln -s /etc/nginx/sites-available/taskminder /etc/nginx/sites-enabled/
```

### Test and restart NGINX

```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## 5. Secure with Let's Encrypt (SSL)

Don't forget to change `yourdomain.com` to your actual domain.

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx --redirect -d yourdomain.com -d www.yourdomain.com -d monitoring.yourdomain.com
```

---

## 6. Set Up Non-Root User

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

## 7. Add Docker Secrets

Navigate back to the TaskMinder folder and create directories for secrets and backups:

```bash
cd /opt/TaskMinder
mkdir docker_secrets
mkdir db-backups
```

Before starting the application, create the following **text files inside the `docker_secrets/` folder**. These files are used as Docker secrets for configuration:

| **Filename**         | **Description**                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------- |
| `classcode.txt`      | Custom class code required to access content.                                            |
| `db_name.txt`        | Name of the PostgreSQL database.                                                         |
| `db_password.txt`    | Password for the PostgreSQL database user.                                               |
| `db_user.txt`        | PostgreSQL database username.                                                            |
| `dsb_activated.txt`  | Whether DSB is enabled (`true` or `false`). If `false`, the next two files can be dummy values. |
| `dsb_password.txt`   | DSB login password.                                                                      |
| `dsb_user.txt`       | DSB login username.                                                                      |
| `redis_port.txt`     | Redis port (default is `6379`).                                                          |
| `session_secret.txt` | Secure session secret (e.g., `ez829ebqhjui2638sbajk`).                                   |

> ⚠️ Make sure there are **no trailing newlines** in these files if your secrets are parsed line-by-line in containers.

---

## 8. Run Docker Compose

Navigate to the project root and build/start the containers:

```bash
cd /opt/TaskMinder
sudo docker compose up -d --build
```

---

## 9. TaskMinder Deployment Complete

Your TaskMinder server should now be running at:

* **[https://yourdomain.com](https://yourdomain.com)**
* **[https://www.yourdomain.com](https://www.yourdomain.com)**
* **[https://monitoring.yourdomain.com](https://monitoring.yourdomain.com)**

---

## 10. What's Next?

* Create an account to add your subjects, teams, and timetable.
* Visit [https://monitoring.yourdomain.com](https://monitoring.yourdomain.com) to change the default password **"admin"** to a secure one. You’ll be prompted to do this upon your first login.

---

## 11. Subsequent Updates
run:
```bash
cd /opt/Taskminder
./deploy.sh
```
to automatically pull the changes from the github repository, build and restart Docker containers.