# TODO - Implement requested dashboard expansions

## Step 1: Token generate page + backend token generation endpoint
- [ ] Create `public/token-generate.html`
- [ ] Create `public/js/token-generate.js`
- [ ] Add `POST /api/token/generate` (username -> token)
- [ ] Add `GET /dashboard/token-generate` route to serve the page
- [ ] Add nav link updates to point to the correct route

## Step 2: Proper developer route alias + link fixes
- [ ] Add `/dashboard/developer-setting` alias route
- [ ] Update any nav link text/targets that point to typoed `/dashboard/DeverloperSetting`

## Step 3: VPN apply/connection wiring
- [ ] Verify VPN fields already exist in `services/configService.js`
- [ ] Extend VPN UI (`public/js/vpn.js` / `public/vpn.html`) with an “Apply/Connect” action
- [ ] Wire it to existing config endpoint (or add `POST /api/vpn/apply` if needed)

## Step 4: Token display on main dashboard
- [ ] Extend `public/status.html` to show latest generated token + copy link
- [ ] Extend `public/js/status.js` to populate it using a new endpoint (or existing response)

## Step 5: Verify routes and run server
- [ ] Start server and manually validate pages load
- [x] Implement token-generate page + /api/token/generate + /dashboard/token-generate
- [x] Add developer-setting alias route
- [x] Update status sidebar nav links
- [x] Add VPN Apply/Connect button wiring (best-effort)
- [x] Show latest generated token in main dashboard via localStorage

- [ ] Validate token generation -> token displayed on dashboard
- [ ] Validate VPN apply -> config updates

