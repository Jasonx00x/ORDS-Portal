#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "Starting ORDS Portal preview..."
echo
echo "Keep this terminal window open while showing the portal."
echo "Portal URL: http://127.0.0.1:4173/portal.html"
echo

node preview-server.mjs
