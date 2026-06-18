---
title: "Installation"
description: "Install UTAU.js via npm or use it directly in the browser"
---

## npm

```bash
npm install utaujs
```

## Browser (CDN)

```html
<script type="module">
import { renderScore, femaleVoice, japanese } from "https://unpkg.com/utaujs/dist/index.mjs";
</script>
```

## Build from Source

```bash
git clone https://github.com/NellowTCS/UTAU.js.git --recurse-submodules
cd UTAU.js
npm install
npm run build
```

The `--recurse-submodules` flag is required for CMUDict (English G2P data).

## Requirements

- **Node.js 18+** for server-side rendering
- **Any modern browser** (Chrome, Firefox, Safari, Edge) for browser usage
- No native dependencies - pure JavaScript/TypeScript
