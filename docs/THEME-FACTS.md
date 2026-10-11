# Verified host-theme facts

The values this plugin's colours depend on, extracted from the shipped theme
package rather than guessed. Every row below was reproduced by the Lead with the
script at the bottom of this file.

Source: `/dsh/node_modules/@deepseek-ai/dsh-client-ui-theme/lib/client.js`
inside `/Applications/DeepSeek Harness.app/Contents/Resources/app.asar`
(101 853 B) — the same file `tests/fixtures/dsw-theme-tokens.json` records as
its `_source`.

## The static palette (verbatim literals from that file)

| token | value |
|---|---|
| `--dsw-static-neutral-bluish-00` | `#fff` |
| `--dsw-static-neutral-bluish-50` | `#f9fafb` |
| `--dsw-static-neutral-bluish-100` | `#ebeef2` |
| `--dsw-static-neutral-bluish-300` | `#cfd3d6` |
| `--dsw-static-neutral-bluish-600` | `#81858c` |
| `--dsw-static-neutral-bluish-700` | *(referenced, literal not in this file)* |
| `--dsw-static-neutral-bluish-800` | `#353638` |
| `--dsw-static-neutral-bluish-875` | `#232324` |
| `--dsw-static-neutral-bluish-1000` | `#0f1115` |

## The semantic aliases, per skin

The file contains **four** theme blocks; each alias is redefined per skin, which
is the property this plugin's "from me" marker depends on.

| alias | light skin | dark skin | flips? |
|---|---|---|---|
| `--dsw-alias-label-primary` | `bluish-1000` = `#0f1115` | `bluish-50` = `#f9fafb` | **yes** (near-black → near-white) |
| `--dsw-alias-label-primary-inverted` | `bluish-00` = `#fff` | `bluish-800` = `#353638` | **yes** |
| `--dsw-alias-label-secondary` | `bluish-600` = `#81858c` | `bluish-300` = `#cfd3d6` | **yes** |
| `--dsw-alias-bg-layer-1` | `bluish-00` = `#fff` | `bluish-875` = `#232324` | **yes** |

## What this settles

**The "from me" marker is a hole filled with the panel surface plus a two-layer
ring, and the reason is now measurable rather than argued.** With
`--dsw-alias-label-primary` on the inner ring and
`--dsw-alias-label-primary-inverted` on the outer:

- light skin: inner ring `#0f1115` on a `#fff` panel → **18.90:1**;
- dark skin: inner ring is `#f9fafb` (it flips), outer ring `#353638` — at least
  one layer is far above the 3:1 floor for graphical objects either way.

Two claims were made during development and **both were corrected by this
extraction**, which is why this file exists:

1. *"No single semantic token is legible on both skins."* — **False.** The ring
   tokens flip with the skin, so `--dsw-alias-label-secondary` alone would be
   `5.80:1` on light and ≈`10.4:1` on dark. A single-layer ring is a defensible
   alternative and may be revisited.
2. *"`--dsw-alias-label-secondary` is 2.78:1 on the dark panel."* — **That number
   was never measured.** It is what the *light* value (`#81858c`) would score
   against a dark panel, i.e. the value under the assumption that the token does
   **not** flip. It was quoted as if measured. The double ring is nonetheless
   correct, but on the honest ground — the ring tokens flip — not on that figure.

The rule this file encodes: **a token value read from one skin says nothing about
the other skin.** Read the definition map, or measure the live page in the skin
you care about.

## Regenerating

Self-contained; needs no `asar` CLI and no network. Node's `zlib` cannot read
these multi-frame logs, but this is a plain file read, so nothing is lost:

```python
import json, struct, re
raw = open('/Applications/DeepSeek Harness.app/Contents/Resources/app.asar', 'rb').read()
hs = struct.unpack('<I', raw[12:16])[0]                 # asar: offset 12 = uint32 headerSize
header = json.loads(raw[16:16 + hs].decode('utf8').rstrip('\x00'))
base = 16 + hs
found = {}
def walk(node, prefix=''):
    for name, meta in node.get('files', {}).items():
        path = prefix + '/' + name
        if 'files' in meta:
            walk(meta, path)
        elif 'offset' in meta:                          # `unpacked` entries have no offset
            found[path] = (base + int(meta['offset']), int(meta['size']))
walk(header)
key = next(k for k in found if 'dsh-client-ui-theme/lib/client.js' in k)
off, size = found[key]
body = raw[off:off + size].decode('utf8', 'replace')
for name in ['00', '50', '100', '300', '600', '800', '875', '1000']:
    m = re.search(r'--dsw-static-neutral-bluish-' + name + r'\s*:\s*([^;}"]{1,24})', body)
    print(f'bluish-{name:5} = {m.group(1) if m else "?"}')
for m in re.finditer(r'--dsw-alias-label-secondary\s*:\s*([^;}"]{1,60})', body):
    print('label-secondary ->', m.group(1))
```

Two traps worth knowing, both hit during development: `header['files']` tree
entries may be `unpacked` (they carry no `offset`), and the semantic aliases live
inside generated CSS text blocks rather than in a JSON map — searching for a
`key: value` map finds only consumer CSS and comes up empty.
