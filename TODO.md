# TODO

## Goal
Fix Vercel error: `Error: No entrypoint found...` by configuring the correct Node entry.

## Steps
- [ ] Update `vercel.json` to explicitly define the Node entrypoint (pointing to root `server.js`).
- [ ] Ensure case consistency: use `server.js` (lowercase) as the entry file.
- [ ] Re-deploy / re-run build to confirm the error is gone.

