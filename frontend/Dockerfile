# Frontend is pre-built during CI/CD workflow
# This Dockerfile only serves the built files with Nginx
FROM nginx:alpine AS production

# Copy pre-built files (built during workflow)
COPY . /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]