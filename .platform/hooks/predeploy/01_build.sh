#!/bin/bash
set -euxo pipefail
cd /var/app/staging
npm ci
npm run build
