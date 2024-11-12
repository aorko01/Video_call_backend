# Use the official Node.js image
FROM node:18

# Install curl and determine the architecture
RUN apt-get update && apt-get install -y curl && \
    ARCH=$(dpkg --print-architecture) && \
    if [ "$ARCH" = "amd64" ]; then \
        curl -L --output cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 && \
        mv cloudflared /usr/local/bin/cloudflared; \
    elif [ "$ARCH" = "arm64" ]; then \
        curl -L --output cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 && \
        mv cloudflared /usr/local/bin/cloudflared; \
    else \
        echo "Unsupported architecture: $ARCH" && exit 1; \
    fi && \
    chmod +x /usr/local/bin/cloudflared

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies and nodemon globally
RUN npm install
RUN npm install -g nodemon

# Copy the rest of the application code
COPY . .

# Copy cloudflare config
COPY cloudflared /etc/cloudflared/

# Copy startup script
COPY start.sh .
RUN chmod +x start.sh

# Expose the application port
EXPOSE 3000

# Use the startup script
CMD ["./start.sh"]
