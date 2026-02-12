# Test SSH Connection from GitHub Actions

## Create Simple SSH Test Workflow

1. Go to: https://github.com/hamr0/addypin
2. Create new file: `.github/workflows/test-ssh.yml`
3. Add this content:

```yaml
name: Test SSH Connection

on:
  workflow_dispatch:

jobs:
  test-ssh:
    runs-on: ubuntu-latest
    steps:
      - name: Test SSH Connection
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USERNAME }}
          password: ${{ secrets.SSH_PASSWORD }}
          port: 22
          timeout: 60s
          script: |
            echo "SSH connection successful"
            whoami
            pwd
            ls -la /opt/addypin/
            systemctl status addypin --no-pager
```

4. Commit the file
5. Go to Actions tab → "Test SSH Connection" → "Run workflow"

This will test if SSH connection works at all from GitHub Actions to your VPS.