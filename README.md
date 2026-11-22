# RiiFFS photobooth frontend

Portrait camera booth with smile-triggered capture, Lunar Blush/Pulse treatments, animated 3D bottles, selfie segmentation, and QR photo delivery.

## Local development

Use Node 22. Run `npm ci`, copy `.env.example` to `.env`, then `npm run dev` (port 8080). Start the [backend](https://github.com/DaveSeidman/riffs.photobooth.be) separately on port 8000. Run `npm test` and `npm run build` to check changes.

Camera access requires localhost or HTTPS. The development test photos are intentionally excluded from Git; the live experience uses the camera. F1 opens the operator controls. In the live preview, use B / P / A keys to switch Blush / Pulse / Auto, including with the F1 panel open. Shortcuts ignore text fields and Ctrl/Cmd/Alt combinations. Manual selection pauses automatic cycling; Auto resumes it. After capture, B / P still select the generated treatment. Pulse uses a cyan neon outline; Blush uses pink.

## GitHub Pages deployment

`.github/workflows/deploy-pages.yml` tests, builds, and deploys every push to `main`; it can also be run manually from Actions. Pages uses GitHub Actions as its publishing source. The workflow derives the asset base path and public URL from Pages configuration, including a future custom domain.

Set the repository **Actions variable** `VITE_API_URL` to the deployed backend HTTPS origin (without a trailing slash), then rerun the workflow. Without this variable, the site is a camera/visual preview and generation requests use an intentionally unavailable placeholder. Never store `FAL_KEY` in frontend variables.

Set backend `ALLOWED_ORIGINS` to the Pages site's origin (initially `https://daveseidman.github.io`). If a custom domain is added later, update CORS and rerun deployment.

## Render deployment

Create a **Static Site** from this repository, branch `main`, with no root directory override:

- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Node version: `22`
- `VITE_API_URL`: the backend's public HTTPS origin, with no trailing slash.
- `VITE_PUBLIC_APP_URL`: this site's public HTTPS origin (use the final custom domain once attached).

Alternatively create a Render Blueprint from `render.yaml`. Vite variables are baked into the build, so redeploy after changing them. Never put the FAL key in frontend variables.

Add a custom domain such as `riffs.lightboxlive.io` in Render, follow its DNS instructions, and wait for HTTPS verification. Add that exact origin to backend `ALLOWED_ORIGINS`. Leave `VITE_BASE_PATH` unset for a subdomain deployment.

## Existing Every installation

The existing Every frontend uses GitHub Pages at `photobooth.lightboxlive.io/every/`; its backend is a separate Render service. A new custom domain attached to that backend serves the same application, not a separate RiiFFS deployment. Use a new static site and backend in the existing Render account to retain Every. Repurposing the Every backend requires changing its repository/environment and replaces the existing application. Local November 8 backup records show its disk was deleted, so restore persistent storage before reusing it for QR photos.

## Blush fluid

Blush reuses the GPU velocity/pressure solver, dye advection, pink palette, and fluid-driven dust from the adjacent lunar-tracking project. Its source and license notice are included here, so deployment does not depend on that folder. The booth supplies tracked face motion in place of the tracking installation's skeleton joints. Simulation targets run below display resolution and pause while Pulse is fully visible. Floating-point WebGL2 render targets are required for the fluid effect.

Face tracking runs in a dedicated worker; the relighting interpolates head shapes and light position at rendering frequency.

## Pulse starfield

Pulse reuses the seeded particle layout, star shaders, eclipse palette, nebula shader, and rigid sky rotation from lunar-tracking's Starfield.jsx. The booth renders 45,000 fixed particles into a viewport-sized texture (longest side capped at 2048), then composites it through the existing silhouette window. Brightness does not pulse, and stars have no independent drift. Skeleton attraction, celestial props, and the tracking installation's postprocessing are omitted from this background-only pass. The field pauses while Blush is fully visible.

## Camera-lit orbit bottles

The orbit bottles use MeshTransmissionMaterial with a live 64-pixel-per-face cube environment. A separate environment scene wraps the camera texture around the glass and lifts bright pixels to simulate HDR lighting, alongside restrained studio strips. It is a lighting approximation from an LDR camera, not measured HDR capture. F1 → Light → Camera reflections toggles the experiment; Camera light adjusts the feed contribution. The static studio environment remains available when disabled.

## Generation interstitial videos

Place `blush.mp4` and `pulse.mp4` in `public/riiffs/`. The generation screen plays the selected video muted, looping and inline below the corner logos, with a separate progress/message footer. Missing videos fall back to a themed background. Use browser-compatible MP4 encoding (H.264). The bar is a labeled time-based estimate and stays below completion until the result arrives. Fragrance selection requires a bottle click/tap or B/P keypress; leaning no longer submits a photo.

## Review route

Open `#/review` on the deployed frontend and enter the backend `REVIEW_TOKEN` access code. Compare source/result images, inspect the exact archived prompt and model settings, and save likeness, quality, bottle accuracy, issue tags, and notes. Older generations explicitly show missing prompt/input provenance. The gallery is loaded separately and does not start the camera.
