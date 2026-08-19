---
title: "Installation"
description: "Install Ichikara via npm or use it directly in the browser"
---

## npm

```bash
npm install ichikara
```

## Browser (CDN)

```html
<script type="module">
import { renderScore, femaleVoice, japanese } from "https://unpkg.com/ichikara/dist/index.mjs";
</script>
```

## Build from Source

```bash
git clone https://github.com/NellowTCS/Ichikara.git --recurse-submodules
cd Build
npm install
npm run build
```

The `--recurse-submodules` flag is required for CMUDict (English G2P data).

## Requirements

- **Node.js 18+** for server-side rendering
- **Any modern browser** (Chrome, Firefox, Safari, Edge) for browser usage
- No native dependencies - pure JavaScript/TypeScript
