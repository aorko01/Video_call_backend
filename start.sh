#!/bin/bash
set -e

# Start the Node.js application in the background
echo "Starting Node.js application..."
nodemon src/index.js &
NODE_PID=$!

# Give the Node.js application some time to start
sleep 5

# Start Cloudflare tunnel
echo "Starting Cloudflare tunnel..."
cloudflared tunnel --config /etc/cloudflared/config.yml run &
CLOUDFLARED_PID=$!

# Function to handle script termination
cleanup() {
    echo "Cleaning up processes..."
    if kill -0 $NODE_PID 2>/dev/null; then
        kill $NODE_PID
    fi
    if kill -0 $CLOUDFLARED_PID 2>/dev/null; then
        kill $CLOUDFLARED_PID
    fi
    exit 0
}

# Trap signals to clean up when the script is terminated
trap cleanup SIGINT SIGTERM

# Monitor both processes
while true; do
    if ! kill -0 $NODE_PID 2>/dev/null; then
        echo "Node.js application crashed!"
        cleanup
    fi
    if ! kill -0 $CLOUDFLARED_PID 2>/dev/null; then
        echo "Cloudflared tunnel crashed!"
        cleanup
    fi
    sleep 1
done
