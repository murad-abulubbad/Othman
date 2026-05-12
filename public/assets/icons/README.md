# PWA Icon Requirements

Place all icon files in this directory (`/public/assets/icons/`).

## Required Icon Sizes

| File | Size | Purpose |
|------|------|---------|
| `favicon.ico` | 16x16, 32x32, 48x48 | Browser tab icon |
| `favicon-16x16.png` | 16x16 | Legacy browsers |
| `favicon-32x32.png` | 32x32 | Desktop browsers |
| `apple-touch-icon.png` | 180x180 | iOS default |
| `apple-touch-icon-152x152.png` | 152x152 | iPad |
| `apple-touch-icon-167x167.png` | 167x167 | iPad Pro |
| `apple-touch-icon-180x180.png` | 180x180 | iPhone retina |
| `icon-72x72.png` | 72x72 | Android low density |
| `icon-96x96.png` | 96x96 | Android medium density |
| `icon-128x128.png` | 128x128 | Chrome Web Store |
| `icon-144x144.png` | 144x144 | Android high density |
| `icon-152x152.png` | 152x152 | Android/Chrome OS |
| `icon-192x192.png` | 192x192 | PWA install prompt |
| `icon-384x384.png` | 384x384 | Splash screen |
| `icon-512x512.png` | 512x512 | Store listing |
| `cart-96x96.png` | 96x96 | Cart shortcut icon |

## Design Guidelines

1. **Format**: PNG with transparency (except for maskable icons)
2. **Safe Zone**: Keep logo within center 60% for maskable icons
3. **Background**: Fill entire icon with brand color (#0a0a1a for dark theme)
4. **Logo**: Use your O.F.G logo, ensure it's visible at small sizes

## Generate Icons Automatically

Use this tool to generate all sizes from your logo:

```bash
npx pwa-asset-generator logo.png ./assets/icons --path-override /assets/icons --background "#0a0a1a"
```

Or use online tools:
- [PWA Asset Generator](https://pwa-asset-generator.nicepkg.cn/)
- [Favicon.io](https://favicon.io/)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

## Testing

After deploying, test your PWA:

1. **Chrome DevTools** → Application → Manifest
2. **Lighthouse** audit for PWA compliance
3. **iOS Safari** → Share → Add to Home Screen
4. **Android Chrome** → Menu → Add to Home Screen
