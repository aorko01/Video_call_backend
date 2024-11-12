#!/bin/bash
set -e

# Start the Node.js application in the background
echo "Starting Node.js application..."
nodemon src/index.js &
NODE_PID=$!

# Give the Node.js application some time to start
sleep 5

# Start cloudflared tunnel
echo "Starting Cloudflare tunnel..."
cloudflared tunnel --config /etc/cloudflared/config.yml run &
CLOUDFLARED_PID=$!

# Monitor both processes
while true; do
    if ! kill -0 $NODE_PID 2>/dev/null; then
        echo "Node.js application crashed!"
        exit 1
    fi
    if ! kill -0 $CLOUDFLARED_PID 2>/dev/null; then
        echo "Cloudflared tunnel crashed!"
        exit 1
    fi
    sleep 1
done