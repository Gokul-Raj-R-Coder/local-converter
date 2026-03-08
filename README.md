# ⚡ LocalConvert

![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)
![Built with Svelte](https://img.shields.io/badge/built%20with-Svelte-FF3E00?logo=svelte&logoColor=white)
![Powered by ffmpeg.wasm](https://img.shields.io/badge/powered%20by-ffmpeg.wasm-007ACC)
![Zero uploads](https://img.shields.io/badge/uploads-zero-brightgreen)

**Free, private file conversion — entirely in your browser.**

> No account. No upload. No file size limits. Your files never leave your device.

## 🚀 [Try it now → local-converter-bhwl.vercel.app](https://local-converter-bhwl.vercel.app)

---

## Why LocalConvert?

You've probably used CloudConvert, Zamzar, or similar tools and run into this:

| The problem with most converters | LocalConvert |
|---|---|
| ❌ Must create an account | ✅ No account needed |
| ❌ Uploads your file to their server | ✅ File never leaves your device |
| ❌ 100MB file size limit on free tier | ✅ No size limits |
| ❌ Slow — wait for upload + processing | ✅ Runs on your own CPU |
| ❌ Pay for bulk conversions | ✅ Always free |
| ❌ Your files stored on someone's server | ✅ 100% private |

LocalConvert runs the entire conversion inside your browser using WebAssembly — the same technology that powers browser-based games and desktop-class apps in the browser.

---

## What can it do?

**Supported output formats:** MP4 · WebM · AVI · MOV · GIF · MP3

**Works with most common video and audio inputs:** MP4, MOV, MKV, AVI, WebM, and more.

**Extra features:**
- ✂️ **Trim** — set a start and end time to extract just the clip you need
- 🎨 **High-quality GIF export** — two-pass palette encoding, no dithering artifacts
- 📊 **Live progress bar** — see exactly how far along the conversion is
- 🖱️ **Drag & drop** — drop a file straight onto the page

---

## How to use it

1. Go to **[local-converter-bhwl.vercel.app](https://local-converter-bhwl.vercel.app)**
2. Drop your file or click Browse
3. Pick an output format
4. Optionally set trim start/end times
5. Click Convert — done

No signup, no waiting, no limits.

---

## Supported browsers

| Browser | Status |
|---|---|
| Chrome / Edge | ✅ Full support |
| Firefox | ✅ Full support |
| Safari | ⚠️ May have issues (SharedArrayBuffer restrictions) |
| Mobile | ⚠️ Works but slow on large files |

Chrome or Edge recommended for best performance.

---

## 💛 Support this project

LocalConvert is free and open source. If it saved you time, a small tip means a lot:

- ☕ [Buy me a coffee](https://buymeacoffee.com/gokulrajr) — for international supporters
- 🇮🇳 UPI: `your_upi@bank` — for Indian users (zero fees)
- ⭐ [Star this repo](https://github.com/Gokul-Raj-R-Coder/local-converter) — free and helps others find it

---

## For developers

### How it works under the hood

Traditional converters upload your file to a remote server, process it, then send it back. LocalConvert works differently:

```
Your file → ffmpeg.wasm (runs inside your browser tab) → Converted file
                  ↑
          No server involved
```

When the page loads, the ffmpeg WebAssembly binary (~30MB) downloads once and is cached by the browser. All subsequent conversions happen entirely on your machine — as fast as your CPU allows.

### Tech stack

| Technology | Purpose |
|---|---|
| [Svelte](https://svelte.dev) + TypeScript | Frontend framework |
| [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) | In-browser video/audio processing |
| [Vite](https://vitejs.dev) | Build tool |
| [Vercel](https://vercel.com) | Deployment |

### Run locally

```bash
git clone https://github.com/Gokul-Raj-R-Coder/local-converter.git
cd local-converter
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Requires Node.js 18+.

> The CORS headers required for WebAssembly threading are pre-configured in `vite.config.ts` for local dev and `vercel.json` for production.

### Deploy your own

Add `vercel.json` to your project root:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}
```

Then run `vercel` to deploy.

### Known limitations

- Files over ~500MB may crash on low-memory devices
- ffmpeg.wasm supports a subset of codecs vs desktop ffmpeg — obscure formats may fail
- Safari restricts SharedArrayBuffer, which can cause slower or failed conversions

### Roadmap

- [ ] Batch conversion (multiple files at once)
- [ ] Quality slider (control output file size)
- [ ] Image conversion (HEIC → JPG, AVIF → PNG)
- [ ] Desktop app via Tauri (no RAM constraint)

---

## License

MIT — free to fork, modify, and deploy your own version.
