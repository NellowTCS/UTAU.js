---
title: "Import / Export"
description: "Score file import and export via utaformatix-3"
---

## Import

Import scores from any supported file format. The import pipeline:

```text
File or bytes  -->  utaformatix-3 parser  -->  UfData  -->  Score
```

### Supported Formats

| Extension            | Format                  | Import | Export |
|----------------------|-------------------------|--------|--------|
| `.ust`               | UTAU Sequence Text      | Yes    | Yes    |
| `.ustx`              | OpenUTU USTX            | Yes    | Yes    |
| `.vsqx`              | Vocaloid SQ             | Yes    | Yes    |
| `.vsq`               | Vocaloid SQ (legacy)    | Yes    | Yes    |
| `.vpr`               | Vocaloid 5 Project      | Yes    | Yes    |
| `.svp`               | SynthV Project          | Yes    | Yes    |
| `.s5p`               | SynthV S5P              | Yes    | Yes    |
| `.ccs`               | CeVIO Creative Studio   | Yes    | Yes    |
| `.dv`                | AHS VOICEROID           | Yes    | Yes    |
| `.mid` / `.midi`     | Standard MIDI           | Yes    | Yes    |
| `.musicxml` / `.xml` | MusicXML                | Yes    | Yes    |
| `.ppsf`              | Piapro Studio           | Yes    | No     |
| `.tssln`             | TSSLN                   | Yes    | Yes    |
| `.ufdata`            | UTAU Format Data (JSON) | Yes    | Yes    |

### Import from File

```typescript
import { importScoreFromFile } from "ichikara";

// Browser file input
const input = document.querySelector('input[type="file"]');
input.addEventListener("change", async () => {
  const score = await importScoreFromFile(input.files[0]);
  // score is ready for rendering
});
```

### Import from Bytes

```typescript
import { importScoreFromBytes } from "ichikara";

const response = await fetch("song.ustx");
const buf = new Uint8Array(await response.arrayBuffer());
const score = await importScoreFromBytes(buf, "song.ustx");
```

### Import Options

```typescript
const score = await importScoreFromFile(file, {
  trackIndex: 0,   // Import first track
  pitch: true,     // Include pitch-bend data
});
```

## Export

Export a Score to any supported format:

### Export as Bytes

```typescript
import { exportScoreToBytes } from "ichikara";

const bytes = await exportScoreToBytes(score, {
  format: "ustx",
  projectName: "My Song",
});
```

### Export as Blob

```typescript
const blob = await exportScoreToBlob(score, { format: "mid" });
```

### Download in Browser

```typescript
import { downloadScore } from "ichikara";

await downloadScore(score, {
  format: "ustx",
  projectName: "exported-song",
});
```

### Low-Level: Direct UfData Conversion

```typescript
import { scoreToUfData, ufDataToScore } from "ichikara";

const ufData = scoreToUfData(score);
// Manipulate ufData directly...
const scoreBack = ufDataToScore(ufData);
```
