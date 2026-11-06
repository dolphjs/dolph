# DolphJS brand kit

The @ dolphin mark: a dolphin silhouette curled into an @, a nod to the decorators at the heart of DolphJS.

## Colours

| Token | Hex | Use |
|---|---|---|
| Teal | `#1E5B70` | Primary mark on light backgrounds |
| Teal light | `#5FB3C9` | Mark and accents on dark backgrounds |
| Ink | `#0B1A20` | Dark site background, text on light |
| Mist | `#F3F6F7` | Light background, mark on teal |

## Files

- `favicon.ico` (16/32/48) and `svg/favicon.svg` (switches to light teal in dark mode)
- `png/` favicons, `apple-touch-icon.png` (180), Android 192/512, maskable 192/512, `mstile-150x150.png`, 1024px masters
- `svg/` mark in teal / light / white / black, rounded app tile, full-bleed square, lockups (light and dark backgrounds)
- `site.webmanifest`, `browserconfig.xml`

## Install

Copy `favicon.ico`, `svg/favicon.svg`, everything in `png/`, `site.webmanifest` and `browserconfig.xml` to your site's public root (for Astro: `public/`). Then add to `<head>`:

```html
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="msapplication-config" content="/browserconfig.xml">
<meta name="theme-color" content="#0B1A20">
```

For Starlight, put the same tags in `head` in `astro.config.mjs` and set `favicon: '/favicon.svg'`.

## Notes

- The lockup SVGs use live text (Space Grotesk). Convert the text to outlines in a vector editor before using them where the font isn't loaded.
- These curves were generated, not hand-drawn. Have a designer refine the final paths before a print run or merch.
