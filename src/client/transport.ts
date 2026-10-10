/**
 * Page-transport base for this plugin's own host routes.
 *
 * WHY THIS EXISTS (Lead-verified against DSH 0.2.0-rc.2, not inferred):
 *
 * The host registers this plugin's route as an ABSOLUTE prefix
 * (`ctx.webServer.register({ kind: 'prefix', path: '/dsh-task-gantt/api' })`),
 * but the page may not be served from the origin root: a reverse proxy can
 * mount the GUI at a sub-path (`https://host/dataops/proxy/3080/`), and the
 * desktop shell serves the page from `dsh-app://app/`. In both cases a
 * root-absolute URL (`fetch('/dsh-task-gantt/api/timeline')`) leaves the page
 * prefix behind and 404s.
 *
 * DSH's own client does exactly this — the canonical snippet lives in the
 * shipped bundle (`@deepseek-ai/dsh-client-*` stream transport):
 *
 * ```js
 * // The mux route is registered absolute; a page resolves its document-relative
 * // form against its own document base. A shell-owned Host on another origin
 * // supplies that base through the transport.
 * const url = new URL(REMOTE_STREAM_MUX_PATH.slice(1),
 *   globalThis.__DSH_TRANSPORT__?.streamBaseUrl ?? document.baseURI)
 * ```
 * (source: `/Applications/DeepSeek Harness.app/Contents/Resources/app.asar`,
 * `stream-client.js` — grep `streamBaseUrl ?? document.baseURI`.)
 *
 * Two rules follow, and both are load-bearing:
 *  1. `.slice(1)` — the leading slash is STRIPPED, so the path is
 *     document-relative and keeps the page prefix;
 *  2. the base is `__DSH_TRANSPORT__.streamBaseUrl` first (a shell-owned Host on
 *     another origin), then `document.baseURI`.
 *
 * dsh-better-sidebar's own `hostRouteUrl()` is the same helper wrapped in a
 * service method; when the service is mounted we prefer it, so this plugin
 * follows whatever transport it was handed.
 *
 * Owner: Lead (cross-half utility; `shell`/`ui` consume it).
 */

/** The shell-injected transport facts DSH publishes on the page. */
interface DshTransportFacts {
  streamBaseUrl?: string
}

/** Minimal face of the mounted better-sidebar service we read here. */
interface HostRouteUrlProvider {
  hostRouteUrl?(path: string): string
}

/** The route prefix without its leading slash (document-relative form). */
function documentRelative(path: string): string {
  return path.startsWith('/') ? path.slice(1) : path
}

/**
 * Resolve one of this plugin's host routes against the page's transport base.
 *
 * @param path - the route path as registered on the host, with or without a
 *   leading slash (e.g. `/dsh-task-gantt/api/timeline`).
 * @param sidebar - the mounted better-sidebar service when it exposes
 *   `hostRouteUrl` (preferred: it already knows the shell transport).
 * @returns an absolute URL string when a base is resolvable, otherwise the
 *   document-relative path (safe for a same-origin root-served page).
 */
export function resolveHostRoute(path: string, sidebar?: HostRouteUrlProvider | undefined): string {
  if (typeof sidebar?.hostRouteUrl === 'function') {
    try {
      return sidebar.hostRouteUrl(path)
    } catch {
      // A service that throws here must not break the panel: fall through to
      // the page-derived base below.
    }
  }
  const globals = globalThis as { __DSH_TRANSPORT__?: DshTransportFacts; document?: Document }
  const base = globals.__DSH_TRANSPORT__?.streamBaseUrl ?? globals.document?.baseURI
  if (base === undefined || base === '') return documentRelative(path)
  try {
    return new URL(documentRelative(path), base).toString()
  } catch {
    return documentRelative(path)
  }
}
