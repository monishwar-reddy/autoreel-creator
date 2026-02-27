# AutoReel Creator 🎬

**AutoReel Creator** is a lightning-fast, incredibly powerful web application that empowers users to effortlessly turn their raw photos into stunning, cinematic music videos natively straight from their browser. Oh... and it also rips audio directly from YouTube and Facebook practically instantaneously. ⚡

Try it here 👉 [AutoReel Creator Live Demo](https://autoreel-creator-2026.netlify.app/)

## 🚀 Key Features

*   **100% Native Browser Extrusion**: We completely completely ditched clunky cloud rendering and WASM ffmpeg servers! AutoReel Creator utilizes hyper-optimized native modern Browser APIs (`WebCodecs`, `WebAudio`) to construct high-definition MP4 videos frame-by-frame on your device, achieving final video export within mere *seconds*. 
*   **Insane Scraping Back-end**: Found a song you love on Facebook or YouTube? Just paste the link! This project houses a custom Node.js Backend equipped with a `yt-dlp-exec` engine to instantly scrape the raw CDN media files directly from social media APIs—bypassing cumbersome CORS, lockouts, and downloading the track dynamically straight into your video editing loop. 
*   **Music Selection Pipeline**: An integrated iTunes music search lets you browse thousands of popular albums immediately by language or keywords. It automatically trims and merges background tracks perfectly to match the length of your photo slides.
*   **Cinematic "Styles"**: We provide custom CSS transformation layers (Zoom, Pan, Fade) rendering beautiful animated Ken-Burns transitions entirely offline.

## 🛠️ Architecture

This is a monolithic repository split logically into two distinct components:

1. **Frontend UI Engine (Vite + React.js):**
    * Uses `WebCodecs` (`VideoEncoder`, `VideoFrame`) and `WebAudio` (`AudioContext`, `AudioData`) inside `App.jsx` to render frames flawlessly.
    * Uses `mp4-muxer` to construct and download the `.mp4` file.
2. **Backend Media Proxy Extraction (`server.js`):**
    * Operates gracefully as a dedicated Node.js `yt-dlp` scraping server.
    * Capable of proxy-piping the social media audio chunks to skip mixed-content security blocks. 

## 🌐 Deployment 

To push this live to the world, **do not attempt a one-click host**.

*   Deploy **Frontend (`App.jsx`)** to a static host (Netlify, Vercel). 
*   Deploy **Backend (`server.js`)** to a sustained container (Render, Railway, Heroku) using the provided `render.yaml`.
*   Connect the two by updating the `VITE_API_URL` environment variable on your static host!
