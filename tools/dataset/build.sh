#!/usr/bin/env bash
# Bangun ulang seluruh dataset: render lembar di Chromium, lalu efek pindai dan manipulasi di Python.
# Pakai: CHROME=/path/ke/chrome ./build.sh   (CHROME opsional bila Playwright sudah memasang browsernya)
set -euo pipefail
cd "$(dirname "$0")"
node render.js ${CHROME:+--chrome "$CHROME"}
python3 finish.py
