# GitHub Actions Setup - Step by Step

## Step 1: Go to Your Repository
1. Open browser and go to: https://github.com/amrhas82/addypin
2. Make sure you're logged into your GitHub account

## Step 2: Create .github/workflows Directory
1. Click "Add file" → "Create new file"
2. In the filename box, type: `.github/workflows/deploy.yml`
3. GitHub will automatically create the directories

## Step 3: Add the Workflow Content
Copy and paste this exact content into the file:

```yaml
name: Deploy AddyPin to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build the application
        run: npm run build

      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USERNAME }}
          password: ${{ secrets.SSH_PASSWORD }}
          port: 22
          timeout: 60s
          command_timeout: 30m
          script: |
            cd /opt/addypin/addypin-repo
            git fetch origin
            git reset --hard origin/main
            npm ci --omit=dev
            npm run build
            cp dist/index.js ./index.js
            systemctl stop addypin
            cp -r /opt/addypin/addypin-repo /opt/addypin/app-new
            rm -rf /opt/addypin/app-old
            mv /opt/addypin/app /opt/addypin/app-old
            mv /opt/addypin/app-new /opt/addypin/app
            systemctl start addypin
            sleep 10
            curl -f https://addypin.com/api/stats || {
              systemctl stop addypin
              mv /opt/addypin/app /opt/addypin/app-failed
              mv /opt/addypin/app-old /opt/addypin/app
              systemctl start addypin
              exit 1
            }
```

## Step 4: Commit the File
1. Scroll down to "Commit new file"
2. Add commit message: "Add GitHub Actions deployment workflow"
3. Click "Commit new file"

## Step 5: Add Repository Secrets
1. Go to repository Settings tab
2. Click "Secrets and variables" → "Actions"
3. Click "New repository secret" and add:
   - Name: `SSH_HOST` Value: `155.94.144.191`
   - Name: `SSH_USERNAME` Value: `root`
   - Name: `SSH_PASSWORD` Value: `4R1ilBJM18jt9f2TAu`

## Step 6: Trigger Deployment
1. Make any small change to trigger the workflow
2. Go to "Actions" tab to watch it run