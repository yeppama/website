# Da verificare (needs_validation)

These are prioritized leads with no severity, not vulnerabilities. Each one stays open until the owner checks the stated setting. Order: NV1 (client token) → NV3 (Vercel forks) → NV2 (scope script).


## NV1 — Client store Storefront token published in public repo docs before its Headless-channel scopes were audited

`client-store-storefront-token-published-before-scope-audit`

docs/PLAN-8.md:127-129 at f9f0ff6 commits the client-transfer store's domain (into-industries-ayehghmw.myshopify.com) and its Storefront public token (32 hex characters, prefix 752615, with no shpat_/shpss_ private prefix). The token has been in history since cd996fc (2026-10-16), and docs/STORIA.md:37 points readers to it. .gitignore:17-18 says the repository is public. The project's own finding (PLAN-8.md:97-102, SICUREZZA.md:168) is that a Headless channel on the dev store had the customer scopes (unauthenticated_read_customers / unauthenticated_write_customers) enabled by default, and that these were removed only on the dev store on 2026-10-30. For the client store, the scope list is explicitly deferred to phase 8c. The Appendix B creation steps (PLAN-8.md:204-205, written 2026-10-16, before that finding) say only 'permessi su prodotti, inventario, carrello' and do not say to switch the customer scopes off. If the defaults are still on, anyone reading the repo can use this token to call customerCreate on the client store (junk accounts, which can be registered to third-party addresses) and then customerRecover, so that password-recovery emails go out from the store. Reading a customer still needs a customerAccessToken (SICUREZZA.md:171), so no customer list is exposed. Today the store is empty: no catalog, test gateway only, a password page that cannot be removed, no real customers (PLAN-8.md:129-130, 210-211). So the present impact is account and email abuse plus reputation harm to the store before transfer. It grows once the client takes the store over with real customers. Calibration: in the Hydrogen-style baseline a public Storefront token is meant to be disclosed, so publishing it is not the defect by itself. The defect is publishing it before its authority was bounded, since no shipped build needs this token yet (storeConfig.js:181-183 still holds the dev store).

**Root cause claimed:** The client store's public Storefront token was disclosed in the public repo (PLAN-8.md:129, since 2026-10-16) before the control that limits its authority was applied. That control is reducing the store's Headless-channel scopes to the four the site uses. It was done for the dev store on 2026-10-30, but for the client store it is explicitly deferred to 8c (SICUREZZA.md:168). The Appendix B setup steps did not tell the operator to turn off the customer scopes, which the project later found to be on by default.

**Trace**

- `entrypoint` `docs/PLAN-8.md:129` (§6 Prossimo passo): The client store's Storefront public token (32 hex, prefix 752615) is committed in a public repository (first added in cd996fc on 2026-10-16), so any anonymous reader of the repo gets it.
- `propagation` `docs/PLAN-8.md:101` (§4 scope del canale Headless): The two customer scopes were on by default on the dev store's Headless channel (found 2026-10-30). The client store 'will have' real customers. Scopes have to be set by hand.
- `propagation` `docs/PLAN-8.md:204` (Appendice B passo 4): The client store's Headless channel setup (2026-10-16, before the default-scope finding) lists only product, inventory and cart permissions. Nothing says to disable the customer scopes, so the defaults may still be in place.
- `propagation` `docs/SICUREZZA.md:168` (Checklist riga 4): The scope reduction was verified only on the dev store. For the client store the list 'va rifatta' at 8c, so its current state is unverified.
- `sink` `docs/SICUREZZA.md:171` (Checklist riga 7): The project's own statement: with write_customers active, anyone holding the token can create accounts and trigger password-recovery emails from the store. Customer reads still need a customerAccessToken.

**Verified evidence**
- `docs/PLAN-8.md:127`: Names into-industries-ayehghmw.myshopify.com as the store to be transferred to the client.
- `docs/STORIA.md:37`: Points to the client store token in PLAN-8.md §6.
- `.gitignore:18`: States that the repository is public ('in un repository pubblico'), in the comment that starts at line 17.
- `docs/PLAN-8.md:101`: Customer scopes were found enabled by default on a fresh Headless channel.
- `docs/PLAN-8.md:130`: The client store has an empty catalog and was checked only read-only. Settings such as payments and shipping cannot be checked with the public token, which bounds today's impact (no real customers yet).
- `src/config/storeConfig.js:182`: The shipped build still targets the dev store domain/token, so the client token does not yet need to be public.
- `scripts/check-scopes.mjs:11`: The scope probe is meant to be re-run against the client store at 8c, which confirms it has not been run against that store yet.

**Blockers**
- The client store's current Headless-channel Storefront API scope list is set in Shopify admin and cannot be seen in source or git history.
- Whether unauthenticated_write_customers is on cannot be probed non-destructively: a probe would have to write. Only the store owner reading the admin screen can settle it.
- scripts/check-scopes.mjs cannot be run in this source-only audit: it needs live network access, and it reads only storeConfig's dev-store domain/token while ignoring VITE_SHOPIFY_*.

**Local plan:** No local or source-only check settles this. Source establishes only the disclosure (PLAN-8.md:129 at HEAD and since cd996fc) and that the client-store scope audit has not been done (SICUREZZA.md:168, check-scopes.mjs:11). Do not run probes against the client store from the audit environment.

**Owner check (read-only, no audit traffic against the deployment):** The store owner, read-only, opens Shopify admin for into-industries-ayehghmw → Sales channels → Headless → the storefront whose public token starts with 752615 → Storefront API permissions. They record every enabled scope out of the 16. Expected: only unauthenticated_read_product_listings, unauthenticated_read_checkouts, unauthenticated_write_checkouts and unauthenticated_read_content. If unauthenticated_read_customers or unauthenticated_write_customers (or any other unused scope) is on, the finding is confirmed: disable those scopes now, without waiting for 8c. Also check Customers in admin for accounts not created by the agency since 2026-10-16. Then, optionally, the owner runs the read-only probes of check-scopes.mjs against the client domain from their own machine, to confirm the probeable scopes are off. Rotating the token is not needed once scopes are minimal, because the token is public by design. If it is rotated, put the new token in the same 8c commit as storeConfig and the CSP connect-src. Removing it from docs/PLAN-8.md does not remove it from git history.

## NV2 — Public repo with Vercel Git integration may build fork-PR code with Preview-scoped env and serve it unauthenticated on project preview URLs

`vercel-git-integration:fork-pr-preview-build-untrusted-code`

The repository is public by the user's choice (docs/CONSEGNA.md:91). The site deploys through the Vercel Git integration, and every pushed branch gets a preview (README.md:52, CONTEXT.md:15). The docs say the user removed Vercel preview deployment protection (docs/STORIA.md:7), and that previews were seen opening without login on 2026-10-30 (docs/PER-L-UTENTE.md:102-103). README.md:52-53 still says previews are login-protected, which is documentation drift. The source documents push-to-branch previews only. Whether Vercel also builds pull requests from forks is a hosted setting (Git Fork Protection) that source cannot show; in current Vercel defaults it requires authorization for outside contributors. If fork PR builds run without authorization, the PR author's npm prebuild (package.json:10: scripts/generate-theme.js, scripts/validate-config.mjs) and vite.config.js run inside a Vercel build with the Preview-scoped env and system variables. The result is served without login on a *.vercel.app preview URL. The only source-documented project env vars are the VITE_SHOPIFY_* values (docs/PLAN-8.md:58-59), which are public and inlined into the bundle anyway, and the Storefront token is hard-coded (src/config/storeConfig.js:183). The source-visible outcome is therefore low impact: attacker-authored content served on a per-deployment project preview subdomain, a different origin from production, so frame-ancestors 'self' gives it no production trust. A higher impact needs a hosted fact source cannot show: a non-public variable in the Preview or Development scope, or OIDC federation trusted by a cloud. No GitHub workflow consumes Vercel previews or holds secrets: ci.yml and e2e.yml use pull_request with contents: read, no pull_request_target, and no secrets.

**Root cause claimed:** Authorization for building PR code is delegated entirely to hosted Vercel settings: fork PR authorization, Preview env scoping, and deployment protection. The build hooks (package.json prebuild, vite.config.js) are contributor-controlled. The in-repo isProduction gate (vite.config.js:61-62) only selects build output and authorizes nothing. Correction: vercel.json is read from the deployed commit, so adding git.deploymentEnabled or ignoreCommand there would not stop a fork PR, whose author can edit it. The control must be hosted.

**Trace**

- `entrypoint` `README.md:52` (Vercel Git integration): Deploys go through the Vercel Git integration, and every push to a branch creates a preview. Whether fork pull requests from outside contributors are also built is not stated and depends on hosted Git Fork Protection.
- `propagation` `vercel.json:1` (Vercel project config in repo): Only headers are defined: no git.deploymentEnabled, ignoreCommand or buildCommand override. Any such in-repo setting would be editable by the PR author anyway.
- `propagation` `package.json:10` (npm prebuild): prebuild runs npm run tokens (scripts/generate-theme.js) and validate:config (scripts/validate-config.mjs). This is repository Node code that the PR author controls, and it runs in the Vercel build environment.
- `propagation` `vite.config.js:61` (isProduction): isProduction reads VERCEL_ENV and VERCEL_GIT_COMMIT_REF and only selects content and the override define. It is contributor-editable and is not an authorization boundary.
- `sink` `docs/STORIA.md:7` (Preview deployment exposure): Records that the user removed Vercel preview protection, so the built output would be served without login on a project-owned preview URL.

**Verified evidence**
- `docs/CONSEGNA.md:91`: The repository is public and unlicensed by the user's deliberate choice (2026-10-29).
- `docs/PER-L-UTENTE.md:102`: Says previews were verified opening without login on 2026-10-30 (continues at line 103).
- `README.md:52`: Still says previews are protected by Vercel login, which contradicts docs/STORIA.md:7 and docs/PER-L-UTENTE.md:102 (documentation drift).
- `docs/PLAN-8.md:58`: The only documented Vercel env vars are VITE_SHOPIFY_DOMAIN, STOREFRONT_TOKEN and API_VERSION, with Preview and Production scopes kept separate. All are public and inlined into the client bundle.
- `vite.config.js:87`: The VITE_COMMERCE_OVERRIDE define is computed by contributor-controlled config from build env, so it is not a trust boundary.
- `.github/workflows/ci.yml:9`: CI uses pull_request, not pull_request_target, with read-only permissions and no secrets. No GitHub-side privileged consumer of PR code or of Vercel previews exists.

**Blockers**
- Whether Vercel Git Fork Protection ('Require authorization for fork PR deployments' or equivalent) is enabled for this project is a hosted setting that source cannot show.
- The full inventory of env vars in the Preview and Development scopes is not visible in source, including any non-VITE or non-public value, and so is whether OIDC federation (VERCEL_OIDC_TOKEN) is enabled with any external cloud trust.
- The current preview Deployment Protection state is known only from prose, and the docs contradict each other (README.md:52 vs docs/STORIA.md:7 and docs/PER-L-UTENTE.md:102).

**Local plan:** No local step can decide this, because every decisive fact is hosted. Source review is complete: vercel.json holds only headers, prebuild and vite.config.js are repository code, workflows use pull_request with contents: read and no secrets, and the only documented env vars are public VITE_SHOPIFY_* values.

**Owner check (read-only, no audit traffic against the deployment):** The owner checks the Vercel dashboard for this project read-only, without opening or deploying a test PR. (1) Settings > Git: record whether fork PR deployments require authorization. (2) Settings > Environment Variables: list every variable whose scope includes Preview or Development, and flag any value that is not a public VITE_SHOPIFY_* value. (3) Settings > Security/OIDC: record whether OIDC federation is enabled and whether any external cloud role trusts it. (4) Settings > Deployment Protection: record whether Vercel Authentication or a password covers preview deployments. The finding is real at low severity if (1) is off, which allows unauthenticated attacker content on project preview URLs. It is higher if (1) is off and (2) or (3) shows a non-public credential. It is rejected if (1) is on. Fix: enable fork PR authorization, keep non-public secrets and OIDC trust out of the Preview scope, re-enable preview protection if client review allows it, and correct README.md:52.

## NV3 — Scope audit script ignores VITE_SHOPIFY_* overrides and can audit a different token than the build ships

`check-scopes-ignores-env-token-override`

The runtime Shopify provider takes domain, Storefront token and API version from VITE_SHOPIFY_DOMAIN / VITE_SHOPIFY_STOREFRONT_TOKEN / VITE_SHOPIFY_API_VERSION when they are set, falling back to storeConfig.commerce.shopify (src/commerce/index.js:57-59). storeConfig.js:180 documents these env vars as the way to swap domain and token without a commit, and the sibling operator check scripts/catalog/check.mjs:26-28 honors them. scripts/check-scopes.mjs:23 (npm run check:scopes, package.json:25) reads only storeConfig.commerce.shopify. If a build gets its token from env, the manual scope audit probes the committed dev-store token and can report a clean result while the token actually shipped has unused scopes enabled, such as unauthenticated_read_customers. The script exists to catch exactly that regression. This is an assurance and tooling gap, not a directly exploitable flaw: the token is public by design, as in the Hydrogen baseline, and its real authority is set in Shopify admin. Two things reduce the exposure. First, the CSP connect-src in vercel.json:8 is hard-coded to into-industries-dev.myshopify.com, so overriding only the domain through env would break the cart in the browser. The silent case left is an env token override, against the same domain or alongside a CSP edit. Second, docs/PLAN-8.md:104 plans the 8c switch as a single commit, which would avoid the env path.

**Root cause claimed:** Sibling controls are not equivalent. scripts/check-scopes.mjs:23 destructures domain, storefrontToken and apiVersion from storeConfig.commerce.shopify only. The runtime (src/commerce/index.js:57-59) and scripts/catalog/check.mjs:26-28 resolve VITE_SHOPIFY_* first.

**Trace**

- `entrypoint` `src/config/storeConfig.js:180` (commerce.shopify comment): Documents that VITE_SHOPIFY_* env vars replace the committed domain and token without a commit (operator/build-env input)
- `propagation` `src/commerce/index.js:58` (getProvider (shopify branch)): Shipped token = env.VITE_SHOPIFY_STOREFRONT_TOKEN || commerce.shopify.storefrontToken; domain and apiVersion are overridden the same way at lines 57 and 59
- `propagation` `scripts/catalog/check.mjs:27` (module top token resolution): Sibling operator check resolves --token, then process.env.VITE_SHOPIFY_STOREFRONT_TOKEN, then storeConfig
- `sink` `scripts/check-scopes.mjs:23` (module top): Scope audit uses only the storeConfig domain, token and apiVersion. It probes the committed token, not an env-supplied shipped token, and reports the result at lines 63-78

**Verified evidence**
- `scripts/check-scopes.mjs:11`: States that at phase 8c the script is rerun against the client store and must give the same result
- `src/commerce/index.js:57`: Domain override from VITE_SHOPIFY_DOMAIN
- `package.json:25`: check:scopes runs node scripts/check-scopes.mjs with no env or flag handling
- `vercel.json:8`: CSP connect-src hard-coded to the dev store domain, so a domain-only env override breaks browser requests. A token-only override stays silent
- `docs/PLAN-8.md:104`: Plan says 8c changes domain, public token and connect-src in a single commit, which would avoid the env path. Whether env is actually used is a deployment fact

**Blockers**
- Whether Vercel Production or Preview environments set VITE_SHOPIFY_STOREFRONT_TOKEN, VITE_SHOPIFY_DOMAIN or VITE_SHOPIFY_API_VERSION is not visible in the repository. If none is set, the shipped token equals the audited one and there is no divergence.
- The admin-side scopes of any env-supplied token are set in Shopify admin and cannot be observed from source.

**Local plan:** Source fix: in scripts/check-scopes.mjs replace line 23 with `const cfg = storeConfig.commerce.shopify; const domain = process.env.VITE_SHOPIFY_DOMAIN || cfg.domain; const storefrontToken = process.env.VITE_SHOPIFY_STOREFRONT_TOKEN || cfg.storefrontToken; const apiVersion = process.env.VITE_SHOPIFY_API_VERSION || cfg.apiVersion`. Use `||` to match runtime semantics (an empty string falls back). Also print which source was used for each value, without printing the token itself. Regression test, in an approved sandbox only, with no network and fetch stubbed: run with VITE_SHOPIFY_DOMAIN=example.invalid and assert that the 'Negozio:' line reports example.invalid and that the stubbed fetch received the env token in X-Shopify-Storefront-Access-Token.

**Owner check (read-only, no audit traffic against the deployment):** Owner opens Vercel project settings, then Environment Variables, and checks whether VITE_SHOPIFY_STOREFRONT_TOKEN, VITE_SHOPIFY_DOMAIN or VITE_SHOPIFY_API_VERSION is set for Production and Preview. This is read-only. If any is set, owner exports the same values locally, runs npm run check:scopes with the fixed script, and confirms that only the required scopes respond and every NON_USATI probe reports 'spento'. Owner also confirms in Shopify admin (Headless channel) that unauthenticated_write_customers is off, since the script deliberately does not probe it.
