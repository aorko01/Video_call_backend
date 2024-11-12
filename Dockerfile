# Use the official Node.js image
FROM node:18

# Install cloudflared
RUN apt-get update && apt-get install -y curl && \
    curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && \
    dpkg -i cloudflared.deb && \
    rm cloudflared.deb

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
CMD ["./start.sh"]# Use the official Node.js image
FROM node:18

# Install cloudflared
RUN apt-get update && apt-get install -y curl && \
    curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && \
    dpkg -i cloudflared.deb && \
    rm cloudflared.deb

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
CMD ["./start.sh"]# Use the official Node.js image
FROM node:18

# Install cloudflared
RUN apt-get update && apt-get install -y curl && \
    curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && \
    dpkg -i cloudflared.deb && \
    rm cloudflared.deb

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