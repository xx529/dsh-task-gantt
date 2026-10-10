/**
 * Display-metadata verification for dsh-task-gantt — `node scripts/verify-meta.mjs`.
 *
 * The host builds a plugin's display row (title / description / icon) in
 * `readPluginMeta()` + `dictionariesOf()` + `iconOf()`, compiled into
 * `/Applications/DeepSeek Harness.app/Contents/Resources/app.asar`. Every rule
 * below is transcribed from that archived source, and every failure mode there
 * is **silent**: a bad locale file becomes an `error` diagnostic and the row
 * degrades to a plain text line, with nothing naming this plugin in the log.
 * The single most expensive one: if `locale/en.json` does not resolve, the whole
 * `locale/` directory is skipped without a word — so a package can "declare"
 * localization for months and never show any of it.
 *
 * Two classes of check, because the host uses two different resolution paths:
 *
 *  1. LOCALE — resolved through **Node's ESM resolver**, i.e. through
 *     `exports` in package.json. `exports["./locale/*.json"]` must exist or the
 *     anchor silently does not resolve. Asserted with `import.meta.resolve`,
 *     which is the same call the host's `resolvePluginResource()` makes.
 *  2. ICON — read from **disk, relative to `package.json`** (not through
 *     `exports`), realpath-contained, ≤ 256 KiB, SVG/PNG/JPEG/WebP.
 *
 * Why this is not folded into `verify-build.mjs`: that script owns the two
 * shipped *code* artifacts; this one owns the *display* surface. Both run in
 * `pnpm run check`.
 *
 * Exit codes: 0 = the host would render this plugin's metadata, 1 = a rule is
 * violated, 2 = package files missing.
 */
import { readFileSync, readdirSync, existsSync, statSync, realpathSync } from 'node:fs'
import { dirname, resolve, relative, isAbsolute, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url)).replace(/\/scripts$/, '')
const selfUrl = import.meta.url

const failures = []
const pass = []
const fail = (message) => failures.push(message)

/** Host: `{#LANGUAGE_ID}` — "must use a language id as its filename". */
const LANGUAGE_ID = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/
/** Host: `MAX_ICON_BYTES`. */
const MAX_ICON_BYTES = 256 * 1024
/** Host: `{#ICON_MEDIA_TYPES}`. */
const MEDIA_TYPES = new Map([
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
])

// --- host validators, transcribed ----------------------------------------
/** Host: `objectOf` — "`${path}` must be an object". */
function objectOf(value, path) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${path} must be an object`)
  return value
}
/** Host: `textOf` — "`${path}` must be a non-empty string" (blank THROWS). */
function textOf(value, path) {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${path} must be a non-empty string`)
  return value
}
/** Host: `readObject`. */
function readObject(file) {
  try {
    return objectOf(JSON.parse(readFileSync(file, 'utf8')), file)
  } catch (error) {
    throw new Error(`${file}: ${String(error)}`)
  }
}

const manifestPath = resolve(root, 'package.json')
if (!existsSync(manifestPath)) {
  console.error('[verify-meta] package.json missing')
  process.exit(2)
}
const manifest = readObject(manifestPath)

// --- 1. locale, resolved exactly the way the host resolves it --------------
const englishRel = 'locale/en.json'
const englishPath = resolve(root, englishRel)
if (!existsSync(englishPath)) {
  fail(`${englishRel} does not exist — the host anchors locale discovery on it, so the whole locale/ directory would be skipped silently`)
} else {
  // The host resolves `<pkg>/locale/en.json` as a module specifier, so this is
  // the decisive check: it fails with ERR_PACKAGE_PATH_NOT_EXPORTED when
  // `exports` does not expose `./locale/*.json`.
  try {
    const resolved = fileURLToPath(import.meta.resolve(`${manifest.name}/${englishRel}`, selfUrl))
    if (resolved !== realpathSync(englishPath)) fail(`${englishRel} resolves to ${resolved}, expected ${realpathSync(englishPath)}`)
    else pass.push(`${manifest.name}/${englishRel} resolves through exports (${resolved})`)
  } catch (error) {
    fail(`${manifest.name}/${englishRel} does not resolve (${error.code ?? error.message}) — add "./locale/*.json" to package.json exports, otherwise the host reads no locale at all`)
  }

  const dictionaries = new Map()
  for (const entry of readdirSync(dirname(englishPath), { withFileTypes: true })) {
    if (!entry.name.endsWith('.json')) continue
    const language = entry.name.slice(0, -5)
    if (!LANGUAGE_ID.test(language)) {
      fail(`locale/${entry.name} must use a language id as its filename`)
      continue
    }
    const id = language.toLowerCase()
    if (dictionaries.has(id)) {
      fail(`locale/${entry.name} duplicates locale ${id}`)
      continue
    }
    try {
      const parsed = readObject(resolve(root, 'locale', entry.name))
      const meta = parsed.meta === undefined ? undefined : objectOf(parsed.meta, `locale/${entry.name}: meta`)
      dictionaries.set(id, {
        title: textOf(meta?.title, `locale/${entry.name}: meta.title`),
        description: textOf(meta?.description, `locale/${entry.name}: meta.description`),
      })
    } catch (error) {
      fail(String(error))
    }
  }
  if (dictionaries.size > 0) {
    for (const [id, fields] of dictionaries) {
      if (fields.title === undefined && fields.description === undefined) {
        fail(`locale/${id}.json defines neither meta.title nor meta.description — the host falls back to package.json, so the file is dead weight`)
      }
    }
    pass.push(`locale dictionaries: ${[...dictionaries.keys()].join(', ')}`)
  }
}

// --- 2. package.json fallback must itself be resolvable --------------------
try {
  const resolved = fileURLToPath(import.meta.resolve(`${manifest.name}/package.json`, selfUrl))
  pass.push(`${manifest.name}/package.json resolves (fallback title/description) → ${resolved}`)
} catch (error) {
  fail(`${manifest.name}/package.json does not resolve (${error.code ?? error.message}) — export "./package.json"; the host falls back to it for any locale gap`)
}

// --- 3. icon, read from disk relative to the manifest ---------------------
if (manifest.icon === undefined) {
  fail('package.json#icon is missing — the plugin row renders without artwork')
} else if (typeof manifest.icon !== 'string' || manifest.icon.trim() === '') {
  fail('package.json#icon must be a non-empty string')
} else {
  const mediaType = MEDIA_TYPES.get(extname(manifest.icon).toLowerCase())
  if (mediaType === undefined) {
    fail('package.json#icon must be SVG, PNG, JPEG, or WebP')
  } else {
    try {
      // The host realpaths and contains the icon inside the manifest directory —
      // this is the traversal guard, so an icon pointing outside the package is
      // rejected even if it exists.
      const file = realpathSync(resolve(root, manifest.icon))
      const local = relative(realpathSync(root), file)
      if (local === '..' || local.startsWith(`..${sep}`) || isAbsolute(local)) throw new Error('icon must remain inside its manifest directory')
      const stat = statSync(file)
      if (!stat.isFile()) throw new Error('icon must be a regular file')
      const bytes = readFileSync(file).length
      if (bytes > MAX_ICON_BYTES) throw new Error(`icon is ${bytes} bytes, over the ${MAX_ICON_BYTES}-byte limit`)
      pass.push(`icon ${manifest.icon} → ${mediaType}, ${bytes} bytes (limit ${MAX_ICON_BYTES})`)
      if (manifest.files !== undefined && Array.isArray(manifest.files)) {
        // npm treats a `files` entry as a package-relative path, with or without
        // the leading `./`, and a trailing `/*` as a directory wildcard.
        const normalize = (p) => p.replace(/^\.\//, '')
        const icon = normalize(manifest.icon)
        const shipped = manifest.files.map(normalize).some((pattern) => {
          if (pattern === icon) return true
          if (pattern.endsWith('/*')) return icon.startsWith(pattern.slice(0, -1))
          return false
        })
        if (!shipped) fail(`package.json#icon (${manifest.icon}) is not covered by \`files\` — the icon works in the repo but vanishes from the published package`)
      }
    } catch (error) {
      fail(`package.json#icon: ${String(error)}`)
    }
  }
}

// --- report ---------------------------------------------------------------
if (failures.length > 0) {
  console.error(`[verify-meta] FAIL (${failures.length}):`)
  for (const line of failures) console.error(`  - ${line}`)
  process.exit(1)
}
console.log('[verify-meta] OK')
for (const line of pass) console.log(`  ${line}`)
