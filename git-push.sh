#!/bin/bash

# Simple git push script - foundation

echo "Git Push to Staging"
echo "=================="

# Add all changes
git add .

# Get commit message
echo -n "Commit message: "
read MESSAGE

# Commit with the message
git commit -m "$MESSAGE"

# Push to staging branch
git push origin staging

echo "Done!"