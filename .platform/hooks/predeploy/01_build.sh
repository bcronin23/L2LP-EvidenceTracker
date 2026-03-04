#!/bin/bash
set -e

echo "==> Installing root dependencies"
npm ci

echo "==> Building client"
cd client
npm ci
npm run build
cd ..

echo "==> Building server (if TypeScript build exists)"
# If your server has a build step, keep this. If not, it won't break.
npm run build:server || true

echo "==> Build finished"
