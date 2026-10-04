$ErrorActionPreference = "Stop"

if (-not (Test-Path "mobile")) {
  Write-Error "mobile/ not found. Run Phase 1 first."
}

Set-Location mobile
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test -- --runInBand
