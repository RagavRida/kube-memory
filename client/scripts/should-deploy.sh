#!/usr/bin/env bash
# Exit 1 = build proceeds; Exit 0 = skip (Vercel cancels deployment)
if echo "${VERCEL_GIT_COMMIT_MESSAGE:-}" | grep -qiE '^deploy'; then
  exit 1
fi
exit 0
