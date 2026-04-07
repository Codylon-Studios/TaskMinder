# Staging

This documentation provides instructions for setting up a **local staging environment** using a Virtual Machine (VM).

### Why use a local VM for staging?

To save on costs, we host a VM on a local machine and expose it to the local network. This allows you to test server-specific configurations (like NGINX or environment quirks) using the VM's local IP address before pushing changes.

-----

## 1\. Prerequisites & VM Installation

This guide is tested on **macOS** (using UTM), but the steps are generally applicable to Linux users using KVM/QEMU.

### Download Ubuntu Server

1.  Download the latest **Ubuntu Server ISO** (not Desktop): [ubuntu.com/download/server](https://ubuntu.com/download/server).
2.  Install **UTM** (for macOS users).

### Create the Virtual Machine

1.  Open UTM and select **Create a New VM** -\> **Emulate**.
2.  Allocate at least **30GB of storage**.
3.  During the Ubuntu setup:
      * **LVM:** Enable LVM when prompted at the disk configuration screen.
      * **OpenSSH:** Select "Install OpenSSH server" when asked.
      * **Defaults:** Leave other settings as default (unless you need a specific keyboard layout).
4.  **Initial Reboot:** Once the installation finishes, you will see a `Failed unmounting cdrom.mount` error. This is normal.
      * Forcefully shut down the VM.
5.  **Adjust VM Settings:**
      * **Network:** Change the Network mode to **Bridged (Advanced)**. This allows the VM to receive an IP address from your router.
      * **Drives:** Find the Drive entry containing the `.iso` file and delete it to prevent the VM from booting into the installer again.
6.  **Start the VM:** Let the `cloud-init` scripts finish, press Enter, and log in with your credentials.

-----

## 2\. Remote Access

While you can use the UTM window, using your host machine's terminal is recommended for copy-pasting and custom shortcuts.

1.  **Get the IP:** Inside the VM, run `ip a`. Look for the `inet` address under your network interface (e.g., `192.168.1.50`).
2.  **Connect via SSH:**
      * Create an SSH key on your local machine if you haven't already.
      * Copy your key to the server or log in via password:
        ```bash
        ssh username@<local-vm-ip>
        ```

-----

## 3\. System Preparation

Follow [deployment.md](./deployment.md) **Step 2 (Install Required Packages)** to install:

  * Git, Curl, NGINX, Lua modules, UFW, and Fail2Ban.
  * Docker and Docker Compose.

**Exceptions for Staging:**

  * **Skip DNS Configuration:** You do not need a domain registrar.
  * **SSH Access:** You can skip the "Secure SSH access" (disabling passwords) if you prefer convenience for testing, though SSH keys are still recommended.

-----

## 4\. Clone and Configure NGINX

### Clone the Project

```bash
cd /opt
sudo git clone https://github.com/TaskMinder/TaskMinder.git
cd TaskMinder
```

### NGINX Setup (Staging Specific)

1.  **Skip SSL/Certbot:** Since we are using a local IP, we do not use Certbot or SSL certificates.
2.  **Gzip/Lua:** Follow the instructions in **Step 4** of `DEPLOYMENT.md` to update the global `/etc/nginx/nginx.conf` with Gzip and Lua settings.
3.  **Apply Staging Config:**
    Instead of the production config, use the staging-specific file:
    ```bash
    # Copy the staging configuration
    sudo cp /opt/TaskMinder/nginx.staging.config /etc/nginx/sites-available/taskminder

    # Enable and test
    sudo ln -s /etc/nginx/sites-available/taskminder /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    ```

-----

## 5\. Environment & Secrets

### Docker Secrets

Follow **Step 7** of `DEPLOYMENT.md` to create the `docker_secrets/` folder and all required `.txt` files.

### Staging Environment File

Create `.env.staging` in the project root:

```bash
NODE_ENV=STAGING
```

### Personal Data

Follow **Step 8** of `DEPLOYMENT.md` to set up your `personalData.html`.

-----

## 6\. Running the Application

In Staging, we use a specific flag to point to the staging environment file.

**Start the containers:**

```bash
cd /opt/TaskMinder
docker compose --env-file .env.staging up -d --build
```

**To update the environment:**

1.  `git pull origin main`
2.  `docker compose --env-file .env.staging up -d --build`

-----

## 7\. Accessing the App

You can now view your application by navigating to the VM's local IP address in your browser:

  * **App:** `http://<local-vm-ip>`