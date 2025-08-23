# CentOS Docker Installation Fix

## Issue: CentOS uses Podman instead of Docker by default

**Run these commands on your VPS to get proper Docker:**

```bash
# Remove podman to avoid conflicts
sudo yum remove -y podman

# Add Docker repository
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Install Docker CE
sudo yum install -y docker-ce docker-ce-cli containerd.io

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create symlink for docker-compose
sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# Test Docker works
sudo docker run hello-world
```