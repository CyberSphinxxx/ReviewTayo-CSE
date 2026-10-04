#!/usr/bin/env bash
set -euo pipefail

if [ ! -d "mobile" ]; then
  echo "mobile/ not found. Run Phase 1 first."
  exit 1
fi

cd mobile
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test -- --runInBand
