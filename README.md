# RiiFFS photobooth frontend

Portrait camera booth with smile-triggered capture, Lunar Blush/Pulse treatments, animated 3D bottles, selfie segmentation, and QR photo delivery.

## Local development

Use Node 22. Run `npm ci`, copy `.env.example` to `.env`, then `npm run dev` (port 8080). Start the [backend](https://github.com/DaveSeidman/riffs.photobooth.be) separately on port 8000. Run `npm test` and `npm run build` to check changes.

Camera access requires localhost or HTTPS. The development test photos are intentionally excluded from Git; the live experience uses the camera. F1 opens the operator controls.

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
