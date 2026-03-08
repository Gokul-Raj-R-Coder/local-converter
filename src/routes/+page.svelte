<script lang="ts">

  import { FFmpeg } from '@ffmpeg/ffmpeg';
  import { fetchFile } from '@ffmpeg/util';
  import { onMount } from 'svelte';

  let ffmpeg = new FFmpeg();
  let ready = false;
  let converting = false;
  let progress = 0;
  let downloadUrl = '';
  let fileToConvert: File | null = null;
  let dragging = false;
  let outputFormat = 'mp4';
  let fileName = '';
  let trimStart = '';
  let trimEnd = '';
  let videoDuration = 0;
  let durationDisplay = '';
  let errorMessage = '';

  const formats = [
    { value: 'mp4',  label: 'MP4',  mime: 'video/mp4' },
    { value: 'webm', label: 'WebM', mime: 'video/webm' },
    { value: 'avi',  label: 'AVI',  mime: 'video/x-msvideo' },
    { value: 'mov',  label: 'MOV',  mime: 'video/quicktime' },
    { value: 'gif',  label: 'GIF',  mime: 'image/gif' },
    { value: 'mp3',  label: 'MP3',  mime: 'audio/mpeg' },
  ];

  onMount(async () => {
    ffmpeg.on('progress', ({ progress: p }) => {
      progress = Math.round(p * 100);
    });
    try {
      await ffmpeg.load();
      ready = true;
    } catch (e) {
      errorMessage = 'Failed to load the conversion engine. Try refreshing the page, or use a modern browser like Chrome or Firefox.';
    }
  });

  function handleFile(file: File) {
    fileToConvert = file;
    fileName = file.name;
    downloadUrl = '';
    progress = 0;
    trimStart = '';
    trimEnd = '';
    videoDuration = 0;
    durationDisplay = '';

    // Use browser's native video element to probe duration
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = url;
    video.onloadedmetadata = () => {
      videoDuration = video.duration;
      const h = Math.floor(videoDuration / 3600);
      const m = Math.floor((videoDuration % 3600) / 60);
      const s = Math.floor(videoDuration % 60);
      durationDisplay = [h, m, s]
        .map(v => String(v).padStart(2, '0'))
        .join(':');
      URL.revokeObjectURL(url);
    };
  }

  function onFileInput(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.[0]) handleFile(input.files[0]);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    dragging = true;
  }

  function onDragLeave() {
    dragging = false;
  }

  async function convertFile() {
    if (!fileToConvert) return;
    converting = true;
    downloadUrl = '';
    errorMessage = '';

    const selectedFormat = formats.find(f => f.value === outputFormat)!;
    const outputName = `output.${outputFormat}`;

    try {
      await ffmpeg.writeFile('input', await fetchFile(fileToConvert));

      // Build trim args — -ss/-to go BEFORE -i for fast seeking
      const trimArgs: string[] = [];
      if (trimStart) trimArgs.push('-ss', trimStart);
      if (trimEnd)   trimArgs.push('-to', trimEnd);

      if (outputFormat === 'gif') {
        await ffmpeg.exec([
          ...trimArgs,
          '-i', 'input',
          '-vf', 'fps=15,scale=480:-1:flags=lanczos,palettegen=stats_mode=diff',
          'palette.png'
        ]);
        await ffmpeg.exec([
          ...trimArgs,
          '-i', 'input',
          '-i', 'palette.png',
          '-lavfi', 'fps=15,scale=480:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3',
          'output.gif'
        ]);
      } else {
        await ffmpeg.exec([...trimArgs, '-i', 'input', '-crf', '23', outputName]);
      }

      const data = await ffmpeg.readFile(outputName);
      // @ts-ignore
      downloadUrl = URL.createObjectURL(new Blob([data.buffer], { type: selectedFormat.mime }));
    } catch (e: any) {
      // Map common ffmpeg errors to friendly messages
      const msg: string = e?.message ?? String(e);
      if (msg.includes('No such file')) {
        errorMessage = 'Conversion failed — the output file was not created. This usually means the input format is unsupported. Try a different source file or output format.';
      } else if (msg.includes('Invalid data') || msg.includes('moov atom')) {
        errorMessage = 'This file appears to be corrupted or incomplete. Try re-downloading or re-exporting the original.';
      } else if (msg.includes('Encoder') || msg.includes('codec')) {
        errorMessage = `The ${outputFormat.toUpperCase()} format is not supported for this file type. Try MP4 or WebM instead.`;
      } else if (msg.includes('out of memory') || msg.includes('OOM')) {
        errorMessage = 'Your browser ran out of memory. Try a smaller file (under 500MB) or close other tabs and retry.';
      } else {
        errorMessage = 'Something went wrong during conversion. Try a different file or output format. If the problem persists, refresh the page.';
      }
    } finally {
      converting = false;
      progress = 0;
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
</script>

<main>
  <div class="bg-grid"></div>

  <div class="container">
    <header>
      <div class="logo">⚡</div>
      <h1>LocalConvert</h1>
      <p class="tagline">Fast, private file conversion — entirely in your browser.</p>
      <span class="badge">🔒 Zero uploads · No limits · 100% private</span>
    </header>

    {#if !ready}
      {#if errorMessage}
        <div class="error-card">
          <div class="error-icon">⚠</div>
          <div class="error-text">
            <h3>Engine failed to load</h3>
            <p>{errorMessage}</p>
          </div>
        </div>
      {:else}
        <div class="loading-card">
          <div class="spinner"></div>
          <p>Loading WebAssembly engine…</p>
          <span>This only happens once</span>
        </div>
      {/if}
    {:else}
      <div class="card">
        <!-- Drop Zone -->
        <div
          class="drop-zone"
          class:dragging
          class:has-file={fileToConvert}
          on:drop={onDrop}
          on:dragover={onDragOver}
          on:dragleave={onDragLeave}
          role="button"
          tabindex="0"
        >
          {#if fileToConvert}
            <div class="file-info">
              <div class="file-icon">🎬</div>
              <div class="file-details">
                <strong>{fileName}</strong>
                <span>{formatBytes(fileToConvert.size)}</span>
              </div>
              <button class="clear-btn" on:click={() => { fileToConvert = null; fileName = ''; downloadUrl = ''; }}>✕</button>
            </div>
          {:else}
            <div class="drop-prompt">
              <div class="drop-icon">↑</div>
              <p>Drag & drop your file here</p>
              <span>or</span>
              <label class="browse-btn">
                Browse files
                <input type="file" on:change={onFileInput} hidden />
              </label>
            </div>
          {/if}
        </div>

        <!-- Format Selection -->
        <div class="format-row">
          <span class="format-label">Convert to:</span>
          <div class="format-pills">
            {#each formats as fmt}
              <button
                class="pill"
                class:active={outputFormat === fmt.value}
                on:click={() => outputFormat = fmt.value}
              >
                {fmt.label}
              </button>
            {/each}
          </div>
        </div>

        <!-- Trim Controls -->
        {#if fileToConvert && videoDuration > 0}
          <div class="trim-section">
            <div class="trim-header">
              <span class="format-label">✂ Trim clip</span>
              {#if durationDisplay}
                <span class="duration-badge">Duration: {durationDisplay}</span>
              {/if}
            </div>
            <div class="trim-inputs">
              <div class="trim-field">
                <label for="trim-start">Start</label>
                <input
                  id="trim-start"
                  type="text"
                  placeholder="00:00:00"
                  bind:value={trimStart}
                  class="time-input"
                />
              </div>
              <div class="trim-arrow">→</div>
              <div class="trim-field">
                <label for="trim-end">End</label>
                <input
                  id="trim-end"
                  type="text"
                  placeholder={durationDisplay || '00:00:00'}
                  bind:value={trimEnd}
                  class="time-input"
                />
              </div>
              {#if trimStart || trimEnd}
                <button class="clear-trim" on:click={() => { trimStart = ''; trimEnd = ''; }}>
                  Clear
                </button>
              {/if}
            </div>
            <p class="trim-hint">Leave blank to convert the full file. Format: HH:MM:SS</p>
          </div>
        {/if}

        <!-- Convert Button -->
        <button
          class="convert-btn"
          disabled={!fileToConvert || converting}
          on:click={convertFile}
        >
          {#if converting}
            <div class="progress-bar" style="width: {progress}%"></div>
            <span class="btn-label">Converting… {progress}%</span>
          {:else}
            <span class="btn-label">Convert to {outputFormat.toUpperCase()}</span>
          {/if}
        </button>
      </div>

      <!-- Error -->
      {#if errorMessage && !converting}
        <div class="error-card" style="margin-top: 16px;">
          <div class="error-icon">⚠</div>
          <div class="error-text">
            <h3>Conversion failed</h3>
            <p>{errorMessage}</p>
          </div>
          <button class="retry-btn" on:click={() => errorMessage = ''}>Dismiss</button>
        </div>
      {/if}

      <!-- Success -->
      {#if downloadUrl}
        <div class="success-card">
          <div class="success-icon">✓</div>
          <div class="success-text">
            <h3>Conversion complete</h3>
            <p>Your file is ready to download.</p>
          </div>
          <a href={downloadUrl} download="converted_file.{outputFormat}">
            <button class="download-btn">Download .{outputFormat}</button>
          </a>
        </div>
      {/if}
    {/if}
  </div>
</main>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');

  :global(body) {
    margin: 0;
    background: #080b12;
    color: #e8eaf0;
    font-family: 'Syne', sans-serif;
    min-height: 100vh;
  }

  main {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    position: relative;
    overflow: hidden;
  }

  .bg-grid {
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(99, 179, 237, 0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(99, 179, 237, 0.04) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
    z-index: 0;
  }

  .container {
    width: 100%;
    max-width: 560px;
    position: relative;
    z-index: 1;
  }

  header {
    text-align: center;
    margin-bottom: 36px;
  }

  .logo {
    font-size: 36px;
    margin-bottom: 8px;
    display: block;
  }

  h1 {
    font-size: 42px;
    font-weight: 800;
    margin: 0 0 8px;
    letter-spacing: -1.5px;
    background: linear-gradient(135deg, #e8eaf0 0%, #63b3ed 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .tagline {
    color: #8892a4;
    font-size: 15px;
    margin: 0 0 14px;
    font-weight: 400;
  }

  .badge {
    display: inline-block;
    background: rgba(99, 179, 237, 0.1);
    border: 1px solid rgba(99, 179, 237, 0.25);
    color: #63b3ed;
    padding: 5px 14px;
    border-radius: 20px;
    font-size: 12px;
    font-family: 'DM Mono', monospace;
    letter-spacing: 0.3px;
  }

  .card {
    background: #0f1520;
    border: 1px solid #1e2a3a;
    border-radius: 16px;
    padding: 28px;
    box-shadow: 0 24px 60px rgba(0,0,0,0.4);
  }

  /* Drop Zone */
  .drop-zone {
    border: 2px dashed #1e2a3a;
    border-radius: 12px;
    padding: 36px 24px;
    text-align: center;
    transition: all 0.2s ease;
    cursor: pointer;
    margin-bottom: 24px;
    background: #080b12;
  }

  .drop-zone.dragging {
    border-color: #63b3ed;
    background: rgba(99, 179, 237, 0.05);
    transform: scale(1.01);
  }

  .drop-zone.has-file {
    border-style: solid;
    border-color: #1e2a3a;
    padding: 20px 24px;
  }

  .drop-prompt p {
    margin: 8px 0 6px;
    color: #8892a4;
    font-size: 15px;
  }

  .drop-prompt span {
    color: #4a5568;
    font-size: 13px;
  }

  .drop-icon {
    font-size: 28px;
    color: #2d3a4f;
    margin-bottom: 4px;
    transition: transform 0.2s;
  }

  .drop-zone.dragging .drop-icon {
    transform: translateY(-4px);
    color: #63b3ed;
  }

  .browse-btn {
    display: inline-block;
    margin-top: 12px;
    padding: 8px 18px;
    background: #1e2a3a;
    border: 1px solid #2d3a4f;
    border-radius: 8px;
    color: #e8eaf0;
    font-family: 'Syne', sans-serif;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }

  .browse-btn:hover {
    background: #2d3a4f;
    border-color: #63b3ed;
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: 12px;
    text-align: left;
  }

  .file-icon {
    font-size: 28px;
    flex-shrink: 0;
  }

  .file-details {
    flex: 1;
    overflow: hidden;
  }

  .file-details strong {
    display: block;
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #e8eaf0;
  }

  .file-details span {
    font-size: 12px;
    color: #63b3ed;
    font-family: 'DM Mono', monospace;
  }

  .clear-btn {
    background: #1e2a3a;
    border: none;
    color: #8892a4;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    flex-shrink: 0;
    transition: all 0.15s;
  }

  .clear-btn:hover {
    background: #2d3a4f;
    color: #e8eaf0;
  }

  /* Format Pills */
  .format-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .format-label {
    font-size: 13px;
    color: #8892a4;
    white-space: nowrap;
    font-family: 'DM Mono', monospace;
  }

  .format-pills {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .pill {
    padding: 5px 12px;
    border-radius: 6px;
    border: 1px solid #1e2a3a;
    background: transparent;
    color: #8892a4;
    font-family: 'DM Mono', monospace;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .pill:hover {
    border-color: #63b3ed;
    color: #e8eaf0;
  }

  .pill.active {
    background: #63b3ed;
    border-color: #63b3ed;
    color: #080b12;
    font-weight: 500;
  }

  /* Convert Button */
  .convert-btn {
    width: 100%;
    padding: 14px;
    border-radius: 10px;
    border: none;
    background: linear-gradient(135deg, #3182ce, #63b3ed);
    color: #fff;
    font-family: 'Syne', sans-serif;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: all 0.2s;
    letter-spacing: 0.3px;
  }

  .convert-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(99, 179, 237, 0.3);
  }

  .convert-btn:disabled {
    background: #1e2a3a;
    color: #4a5568;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .progress-bar {
    position: absolute;
    inset: 0;
    background: rgba(255,255,255,0.15);
    transition: width 0.3s ease;
    border-radius: 10px;
  }

  .btn-label {
    position: relative;
    z-index: 1;
  }

  /* Success */
  .success-card {
    margin-top: 16px;
    background: #0a1a12;
    border: 1px solid #1a3a28;
    border-radius: 16px;
    padding: 20px 24px;
    display: flex;
    align-items: center;
    gap: 16px;
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .success-icon {
    width: 40px;
    height: 40px;
    background: #16a34a;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
    color: white;
  }

  .success-text {
    flex: 1;
  }

  .success-text h3 {
    margin: 0 0 2px;
    font-size: 15px;
    font-weight: 700;
    color: #4ade80;
  }

  .success-text p {
    margin: 0;
    font-size: 13px;
    color: #6b9e7a;
  }

  .download-btn {
    padding: 9px 18px;
    background: #16a34a;
    border: none;
    border-radius: 8px;
    color: white;
    font-family: 'Syne', sans-serif;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s;
  }

  .download-btn:hover {
    background: #15803d;
    transform: translateY(-1px);
  }

  /* Error */
  .error-card {
    background: #1a0a0a;
    border: 1px solid #3a1a1a;
    border-radius: 16px;
    padding: 20px 24px;
    display: flex;
    align-items: flex-start;
    gap: 14px;
    animation: slideUp 0.3s ease;
  }

  .error-icon {
    font-size: 20px;
    flex-shrink: 0;
    color: #f87171;
    margin-top: 1px;
  }

  .error-text {
    flex: 1;
  }

  .error-text h3 {
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 700;
    color: #f87171;
  }

  .error-text p {
    margin: 0;
    font-size: 13px;
    color: #9e6b6b;
    line-height: 1.5;
  }

  .retry-btn {
    background: transparent;
    border: 1px solid #3a1a1a;
    color: #9e6b6b;
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    white-space: nowrap;
    align-self: flex-start;
    transition: all 0.15s;
    flex-shrink: 0;
  }

  .retry-btn:hover {
    border-color: #f87171;
    color: #f87171;
  }

  /* Trim Controls */
  .trim-section {
    margin-bottom: 20px;
    padding: 16px;
    background: #080b12;
    border: 1px solid #1e2a3a;
    border-radius: 10px;
  }

  .trim-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .duration-badge {
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    color: #63b3ed;
    background: rgba(99, 179, 237, 0.1);
    padding: 3px 8px;
    border-radius: 4px;
  }

  .trim-inputs {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    flex-wrap: wrap;
  }

  .trim-field {
    display: flex;
    flex-direction: column;
    gap: 5px;
    flex: 1;
    min-width: 100px;
  }

  .trim-field label {
    font-size: 11px;
    color: #4a5568;
    font-family: 'DM Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .time-input {
    background: #0f1520;
    border: 1px solid #1e2a3a;
    border-radius: 7px;
    color: #e8eaf0;
    font-family: 'DM Mono', monospace;
    font-size: 14px;
    padding: 8px 12px;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.15s;
    outline: none;
  }

  .time-input:focus {
    border-color: #63b3ed;
  }

  .time-input::placeholder {
    color: #2d3a4f;
  }

  .trim-arrow {
    color: #2d3a4f;
    font-size: 16px;
    padding-bottom: 10px;
    flex-shrink: 0;
  }

  .clear-trim {
    background: transparent;
    border: 1px solid #1e2a3a;
    color: #4a5568;
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    padding: 8px 12px;
    border-radius: 7px;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
    align-self: flex-end;
  }

  .clear-trim:hover {
    border-color: #63b3ed;
    color: #8892a4;
  }

  .trim-hint {
    margin: 10px 0 0;
    font-size: 11px;
    color: #2d3a4f;
    font-family: 'DM Mono', monospace;
  }

  /* Loading */
  .loading-card {
    background: #0f1520;
    border: 1px solid #1e2a3a;
    border-radius: 16px;
    padding: 48px;
    text-align: center;
  }

  .spinner {
    width: 36px;
    height: 36px;
    border: 3px solid #1e2a3a;
    border-top-color: #63b3ed;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 16px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading-card p {
    margin: 0 0 6px;
    font-size: 15px;
    font-weight: 600;
    color: #e8eaf0;
  }

  .loading-card span {
    font-size: 12px;
    color: #4a5568;
    font-family: 'DM Mono', monospace;
  }
</style>
