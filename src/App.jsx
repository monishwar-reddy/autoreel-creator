import React, { useState, useRef, useEffect } from 'react';
import {
  Upload, Film, Music, Settings, Download, Play, Pause, ChevronRight,
  ChevronLeft, Image as ImageIcon, Wand2, Smartphone, Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

const STEPS = ['Upload Photos', 'Choose Music', 'Select Style', 'Preview & Export'];

// Mock styles available
const STYLES = [
  { id: 'cinematic', name: 'Cinematic', desc: 'Smooth pans and zooms, slow transitions' },
  { id: 'romantic', name: 'Romantic', desc: 'Soft fades, warm color filters' },
  { id: 'energetic', name: 'Energetic', desc: 'Fast cuts synced to beats, flash effects' },
  { id: 'minimal', name: 'Minimal', desc: 'Clean slides, no extra effects' }
];

// Mock built-in songs using locally downloaded samples to avoid browser blocking
const LANGUAGES = ['English', 'Telugu', 'Hindi', 'Tamil', 'Spanish', 'French', 'Korean'];
const BUILT_IN_MUSIC = [
  { id: 'en1', name: 'Pop Sunset (Sample)', language: 'English', url: '/audio/english1.mp3' },
  { id: 'te1', name: 'Telugu Folk (Sample)', language: 'Telugu', url: '/audio/telugu1.mp3' },
  { id: 'hi1', name: 'Bollywood Romance (Sample)', language: 'Hindi', url: '/audio/hindi1.mp3' },
  { id: 'ta1', name: 'Kollywood Beat (Sample)', language: 'Tamil', url: '/audio/tamil1.mp3' },
  { id: 'es1', name: 'Latin Groove (Sample)', language: 'Spanish', url: '/audio/spanish1.mp3' },
  { id: 'fr1', name: 'French Cafe (Sample)', language: 'French', url: '/audio/french1.mp3' },
  { id: 'kr1', name: 'K-Pop Energy (Sample)', language: 'Korean', url: '/audio/korean1.mp3' }
];

const ASPECT_RATIOS = [
  { id: 'vertical', name: 'Vertical (9:16)', icon: <Smartphone size={32} />, width: 1080, height: 1920 },
  { id: 'square', name: 'Square (1:1)', icon: <div style={{ width: 32, height: 32, border: '2px solid currentColor', borderRadius: 4 }} />, width: 1080, height: 1080 },
  { id: 'landscape', name: 'Landscape (16:9)', icon: <Monitor size={32} />, width: 1920, height: 1080 }
];

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [photos, setPhotos] = useState([]);
  const [selectedMusic, setSelectedMusic] = useState(null); // { name, url, file }
  const [selectedStyle, setSelectedStyle] = useState('cinematic');
  const [aspectRatio, setAspectRatio] = useState('vertical');

  // Preload FFmpeg upon App load (Steps 1-3 give it plenty of time to download)
  useEffect(() => {
    import('@ffmpeg/ffmpeg').then(async ({ FFmpeg }) => {
      import('@ffmpeg/util').then(async ({ toBlobURL }) => {
        if (!window.__ffmpeg) {
          try {
            const ffmpeg = new FFmpeg();
            // Assign immediately to prevent race conditions during load
            window.__ffmpeg = ffmpeg;
            await ffmpeg.load({
              coreURL: await toBlobURL(`https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js`, 'text/javascript'),
              wasmURL: await toBlobURL(`https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm`, 'application/wasm'),
            });
            console.log('Global FFmpeg preloaded in background');
          } catch (e) {
            console.error('Quiet FFmpeg preload error', e);
          }
        }
      });
    });
  }, []);

  // Handlers
  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  return (
    <div className="container">
      <header style={{ textAlign: 'center', marginBottom: '3rem', paddingTop: '1rem' }}>
        <h1 style={{ fontSize: '3rem', margin: 0 }} className="text-gradient">AutoReel Creator</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>AI-Powered Cinematic Video Slideshows</p>
      </header>

      {/* Stepper */}
      <div className="stepper">
        {STEPS.map((step, index) => (
          <div key={step} className={`step-item ${currentStep === index ? 'active' : ''} ${currentStep > index ? 'completed' : ''}`}>
            <div className="step-circle">{index + 1}</div>
            <div className="step-label">{step}</div>
          </div>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="glass-card"
        >
          {currentStep === 0 && (
            <UploadStep photos={photos} setPhotos={setPhotos} />
          )}
          {currentStep === 1 && (
            <MusicStep selectedMusic={selectedMusic} setSelectedMusic={setSelectedMusic} />
          )}
          {currentStep === 2 && (
            <StyleStep
              selectedStyle={selectedStyle} setSelectedStyle={setSelectedStyle}
              aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
            />
          )}
          {currentStep === 3 && (
            <PreviewStep
              photos={photos} music={selectedMusic}
              style={selectedStyle} aspectRatio={aspectRatio}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between" style={{ marginTop: '2rem' }}>
        <button
          className="btn btn-secondary"
          onClick={prevStep}
          disabled={currentStep === 0}
          style={{ visibility: currentStep === 0 ? 'hidden' : 'visible' }}
        >
          <ChevronLeft size={20} /> Back
        </button>

        {currentStep < 3 && (
          <button
            className={`btn btn-primary ${currentStep === 0 && photos.length === 0 ? 'btn-disabled' : ''}`}
            onClick={nextStep}
            disabled={currentStep === 0 && photos.length === 0}
          >
            Continue <ChevronRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// STEP 1: UPLOAD PHOTOS
// ============================================================================
function UploadStep({ photos, setPhotos }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
      const newPhotos = newFiles.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        url: URL.createObjectURL(file)
      }));
      setPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  const removePhoto = (id) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="animate-fade-in">
      <h2>Upload your photos</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        Select multiple photos. We'll automatically adjust and order them for the best experience.
      </p>

      <label
        className={`upload-zone flex flex-col items-center justify-center ${isDragging ? 'drag-active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files) {
            handleFileChange({ target: { files: e.dataTransfer.files } });
          }
        }}
      >
        <ImageIcon size={48} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
        <h3 style={{ marginBottom: '0.5rem' }}>Drag & Drop photos here</h3>
        <p style={{ color: 'var(--text-secondary)' }}>or click to browse from device</p>
        <input
          type="file"
          multiple
          accept="image/*"
          className="input-file-hidden"
          onChange={handleFileChange}
        />
      </label>

      {photos.length > 0 && (
        <div className="photo-grid">
          {photos.map((photo, index) => (
            <div key={photo.id} className="photo-item" style={{ position: 'relative' }}>
              <img src={photo.url} alt={`Upload ${index}`} />
              <button
                onClick={(e) => { e.preventDefault(); removePhoto(photo.id); }}
                style={{
                  position: 'absolute', top: 4, right: 4,
                  background: 'rgba(0,0,0,0.7)', color: 'white',
                  border: 'none', borderRadius: '50%', width: 24, height: 24,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STEP 2: CHOOSE MUSIC
// ============================================================================
function MusicStep({ selectedMusic, setSelectedMusic }) {
  const [playing, setPlaying] = useState(null);
  const [activeLang, setActiveLang] = useState('Telugu');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [socialLink, setSocialLink] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedVideo, setExtractedVideo] = useState(null);
  const audioRef = useRef(new Audio());

  useEffect(() => {
    return () => {
      audioRef.current.pause();
      audioRef.current.src = '';
    };
  }, []);

  // Fetch from iTunes API
  const searchMusic = async (term) => {
    if (!term) return;
    setIsLoading(true);
    try {
      // Use Vite proxy for CORS bypass on iTunes API
      const response = await axios.get('/itunes-api/search', {
        params: { term: term, media: 'music', limit: 30 }
      });

      const tracks = response.data.results
        .filter(t => t.previewUrl) // Must have preview
        .map(t => ({
          id: t.trackId.toString(),
          name: t.trackName,
          artist: t.artistName,
          thumb: t.artworkUrl60,
          // Route the iTunes audio URL through our Vite proxy to avoid strict CORS drawing rules later
          url: t.previewUrl.replace('https://audio-ssl.itunes.apple.com', '/itunes-audio')
        }));

      setResults(tracks);
    } catch (error) {
      console.error("Music fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load based on pill language
  useEffect(() => {
    searchMusic(activeLang === 'All' ? 'popular' : activeLang);
  }, [activeLang]);

  // Handle enter key in search
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchMusic(searchQuery);
      setActiveLang(''); // clear pill highlight
    }
  };

  const togglePlay = (music, e) => {
    if (e) e.stopPropagation();
    if (playing === music.id) {
      audioRef.current.pause();
      setPlaying(null);
    } else {
      audioRef.current.src = music.url;
      if (!music.url.startsWith('blob:') && !music.url.startsWith('data:')) {
        audioRef.current.crossOrigin = "anonymous";
      } else {
        audioRef.current.crossOrigin = null;
      }
      audioRef.current.play().catch(console.log);
      setPlaying(music.id);
    }
  };

  const handleCustomUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setSelectedMusic({ id: 'custom', name: file.name, url, file });
    }
  };

  const handleExtractAudio = async () => {
    if (!socialLink) return;
    setIsExtracting(true);

    try {
      // Hit our new robust server engine which uses python yt-dlp to grab real audio streams
      const response = await fetch(`${API_BASE}/api/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: socialLink })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to extract video info.');

      const realResult = {
        id: 'social_' + Date.now(),
        name: data.title,
        artist: 'Social Extraction',
        thumb: data.thumbnail,
        url: data.audioUrl, // Real audio stream endpoint!
        title: data.title,
        downloadUrl: data.videoUrl // Real original video MP4 link!
      };

      setExtractedVideo(realResult);
      setSelectedMusic(realResult);
      setSocialLink('');
    } catch (e) {
      console.error(e);
      alert(e.message || 'Extraction failed. Ensure the link is a valid public video.');
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <h2>Choose Background Music</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        Search for millions of songs, upload your own, or extract from social media.
      </p>

      {/* Import from Social Media */}
      <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
        <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Film size={18} /> past music link
        </h4>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="past link"
            value={socialLink}
            onChange={(e) => setSocialLink(e.target.value)}
            style={{ flex: 1, minWidth: '200px', padding: '0.8rem 1rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
          />
          <button className="btn btn-primary" onClick={handleExtractAudio} disabled={isExtracting || !socialLink}>
            {isExtracting ? 'Extracting...' : 'Extract Audio'}
          </button>
        </div>
        {extractedVideo && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>✓ Audio Extracted Successfully</span>
            <a href={extractedVideo.downloadUrl} download="Original_Video_Extract.mp4" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}>
              <Download size={14} style={{ marginRight: '0.3rem' }} /> Download Original Video
            </a>
          </div>
        )}
      </div>

      {/* Custom Upload */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <label className={`glass-card ${selectedMusic?.id === 'custom' ? 'selected' : ''}`} style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', borderStyle: 'dashed', flex: 1, margin: 0 }}>
          <Upload size={24} style={{ color: 'var(--text-secondary)' }} />
          <div style={{ textAlign: 'left', flex: 1 }}>
            <h4 style={{ margin: 0 }}>{selectedMusic?.id === 'custom' ? selectedMusic.name : 'Upload Custom Audio'}</h4>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>MP3, WAV, etc. from your device</p>
          </div>
          <input type="file" accept="audio/*,.mp3,.wav,.mpeg,.m4a" className="input-file-hidden" onChange={handleCustomUpload} onClick={e => e.stopPropagation()} />
        </label>

        {selectedMusic?.id === 'custom' && (
          <button
            className="btn btn-secondary glass-card"
            style={{ borderRadius: '50%', padding: '1rem', height: '100%' }}
            onClick={(e) => togglePlay(selectedMusic, e)}
          >
            {playing === 'custom' ? <Pause size={24} /> : <Play size={24} />}
          </button>
        )}
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2" style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search any song or artist..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, padding: '0.8rem 1rem', borderRadius: '2rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
        />
        <button type="submit" className="btn btn-primary" style={{ borderRadius: '2rem' }}>Search</button>
      </form>

      {/* Categories */}
      <div className="flex gap-2" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {['Telugu', 'Hindi', 'English', 'Tamil', 'Punjabi', 'Spanish'].map(lang => (
          <button
            key={lang}
            className={`btn ${activeLang === lang ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '2rem' }}
            onClick={() => setActiveLang(lang)}
          >
            {lang}
          </button>
        ))}
      </div>

      {/* Results List */}
      <div className="flex flex-col gap-3" style={{ maxHeight: '40vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Searching iTunes library...</div>
        ) : results.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No songs found.</div>
        ) : (
          results.map(music => (
            <div
              key={music.id}
              className={`glass-card ${selectedMusic?.id === music.id ? 'selected' : ''}`}
              style={{ padding: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              onClick={() => setSelectedMusic(music)}
            >
              <div className="flex items-center gap-4">
                <img src={music.thumb} alt="cover" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
                <div style={{ textAlign: 'left', maxWidth: '300px' }}>
                  <h4 style={{ margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{music.name}</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {music.artist}
                  </p>
                </div>
              </div>

              <button
                className="btn btn-secondary"
                style={{ borderRadius: '50%', padding: '0.5rem' }}
                onClick={(e) => togglePlay(music, e)}
              >
                {playing === music.id ? <Pause size={18} /> : <Play size={18} />}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// STEP 3: SELECT STYLE
// ============================================================================
function StyleStep({ selectedStyle, setSelectedStyle, aspectRatio, setAspectRatio }) {
  return (
    <div className="animate-fade-in">
      <h2>Customize Production</h2>

      <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>Video Style</h3>
      <div className="selection-grid">
        {STYLES.map(style => (
          <div
            key={style.id}
            className={`glass-card selection-card ${selectedStyle === style.id ? 'selected' : ''}`}
            onClick={() => setSelectedStyle(style.id)}
          >
            <Wand2 size={32} style={{ marginBottom: '1rem', color: selectedStyle === style.id ? 'var(--primary)' : 'var(--text-secondary)' }} />
            <h4 style={{ marginBottom: '0.5rem' }}>{style.name}</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{style.desc}</p>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Aspect Ratio</h3>
      <div className="selection-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {ASPECT_RATIOS.map(ar => (
          <div
            key={ar.id}
            className={`glass-card selection-card ${aspectRatio === ar.id ? 'selected' : ''}`}
            onClick={() => setAspectRatio(ar.id)}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: aspectRatio === ar.id ? 'var(--primary)' : 'var(--text-secondary)' }}>
              {ar.icon}
            </div>
            <h4>{ar.name}</h4>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// STEP 4: PREVIEW PIPELINE (Canvas rendering simulation)
// ============================================================================
function PreviewStep({ photos, music, style, aspectRatio }) {
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const animRef = useRef(null);
  const isPlayingRef = useRef(false);
  const isExportingRef = useRef(false);

  // Settings definition
  const format = ASPECT_RATIOS.find(a => a.id === aspectRatio);

  // Render loop reference variables
  const stateRef = useRef({
    startTime: 0,
    photos: [], // will hold loaded Image objects
    audioEl: null,
    durationPerPhoto: 3000 // default ms per photo
  });

  // Init canvas and load images
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      // Create audio element if music is selected
      if (music) {
        const audio = new Audio();
        // Don't set crossOrigin for Blob or Data URIs, it can crash local file decoding in some browsers
        if (!music.url.startsWith('blob:') && !music.url.startsWith('data:')) {
          audio.crossOrigin = "anonymous";
        }
        audio.src = music.url;
        audio.loop = false;
        stateRef.current.audioEl = audio;

        // Auto-scale video to perfectly match music length
        await new Promise(resolve => {
          audio.addEventListener('loadedmetadata', resolve, { once: true });
          audio.addEventListener('error', resolve, { once: true });
        });

        // Length based on photos (3 seconds each)
        stateRef.current.durationPerPhoto = 3000;
      }

      // Load all image objects
      const loadedImages = [];
      for (const p of photos) {
        const img = new Image();
        img.src = p.url;
        await new Promise(r => img.onload = r);
        loadedImages.push(img);
      }
      if (!isMounted) return;
      stateRef.current.photos = loadedImages;

      // Draw first frame
      drawFrame(0);

      // Auto-play the video on initialization
      if (!isPlayingRef.current) {
        stateRef.current.startTime = performance.now();
        if (stateRef.current.audioEl) stateRef.current.audioEl.play().catch(e => console.log("Autoplay blocked:", e));
        setIsPlaying(true);
        isPlayingRef.current = true;
        renderLoop();
      }
    };
    init();

    return () => {
      isMounted = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (stateRef.current.audioEl) {
        stateRef.current.audioEl.pause();
        stateRef.current.audioEl.src = '';
      }
    };
  }, [photos, music]);

  const togglePreview = () => {
    if (isPlayingRef.current) {
      cancelAnimationFrame(animRef.current);
      if (stateRef.current.audioEl) stateRef.current.audioEl.pause();
      setIsPlaying(false);
      isPlayingRef.current = false;
    } else {
      // Re-sync start time logic so it resumes from progress
      const totalDuration = photos.length * stateRef.current.durationPerPhoto;
      const currentMs = (progress / 100) * totalDuration;
      stateRef.current.startTime = performance.now() - currentMs;

      if (stateRef.current.audioEl) {
        stateRef.current.audioEl.currentTime = currentMs / 1000;
        stateRef.current.audioEl.play().catch(e => console.log(e));
      }
      setIsPlaying(true);
      isPlayingRef.current = true;
      renderLoop();
    }
  };

  const handleSeek = (e) => {
    const newProgress = parseFloat(e.target.value);
    const totalDuration = photos.length * stateRef.current.durationPerPhoto;
    const currentMs = (newProgress / 100) * totalDuration;

    setProgress(newProgress);

    // Update playhead
    stateRef.current.startTime = performance.now() - currentMs;

    if (stateRef.current.audioEl) {
      stateRef.current.audioEl.currentTime = currentMs / 1000;
    }

    drawFrame(currentMs); // Redraw immediately
  };

  const renderLoop = () => {
    const time = performance.now() - stateRef.current.startTime;
    const totalDuration = photos.length * stateRef.current.durationPerPhoto;

    // Looping slideshow
    const currentTime = time % totalDuration;

    drawFrame(currentTime);
    setProgress((currentTime / totalDuration) * 100);

    if (isPlayingRef.current || isExportingRef.current) {
      animRef.current = requestAnimationFrame(renderLoop);
    }
  };

  // The actual render logic, drawing to canvas
  const drawFrame = (timeMs) => {
    const canvas = canvasRef.current;
    if (!canvas || stateRef.current.photos.length === 0) return;
    const ctx = canvas.getContext('2d');

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // Find current photo index
    const index = Math.floor(timeMs / stateRef.current.durationPerPhoto);
    const photo = stateRef.current.photos[Math.min(index, stateRef.current.photos.length - 1)];

    // Find next photo for transition (if any)
    const nextPhoto = stateRef.current.photos[Math.min(index + 1, stateRef.current.photos.length - 1)];

    const photoTime = timeMs % stateRef.current.durationPerPhoto;
    let progress = photoTime / stateRef.current.durationPerPhoto; // 0 to 1

    // Simulated Ken Burns Effect (zoom & pan)
    let scale = 1.0;
    let dx = 0;
    let dy = 0;

    if (style === 'cinematic') {
      scale = 1.0 + (progress * 0.1); // zoom in 10%
      dx = (progress * 0.05) * width; // slight pan
    } else if (style === 'energetic') {
      // Zoom pulse on beats (simulated by modulo)
      scale = 1.0 + Math.sin(progress * Math.PI * 4) * 0.05;
    }

    // Render a single image with "cover" properties and background blur
    const renderImage = (img, imgScale, dx, dy, opacity) => {
      ctx.globalAlpha = opacity;

      // Calculate aspect fill
      const imgRatio = img.width / img.height;
      const canvasRatio = width / height;
      let drawW, drawH;

      if (imgRatio > canvasRatio) {
        drawH = height;
        drawW = img.width * (height / img.height);
      } else {
        drawW = width;
        drawH = img.height * (width / img.width);
      }

      // Apply transforms
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(imgScale, imgScale);
      ctx.translate(-width / 2, -height / 2);

      // Draw Blurred Background
      ctx.filter = 'blur(40px) brightness(0.5)';
      ctx.drawImage(img, (width - drawW) / 2 + dx, (height - drawH) / 2 + dy, drawW, drawH);

      // Draw Crisp Image (object-fit contain)
      ctx.filter = 'none';
      let containW, containH;
      if (imgRatio > canvasRatio) {
        containW = width;
        containH = img.height * (width / img.width);
      } else {
        containH = height;
        containW = img.width * (height / img.height);
      }

      // Draw aesthetic border for styles
      if (style === 'romantic') {
        ctx.shadowColor = 'rgba(255, 100, 150, 0.5)';
        ctx.shadowBlur = 30;
      }

      ctx.drawImage(img, (width - containW) / 2, (height - containH) / 2, containW, containH);
      ctx.restore();
    };

    // Transitions
    if (photoTime > stateRef.current.durationPerPhoto - 500 && index < stateRef.current.photos.length - 1) {
      // Crossfade transition (last 500ms)
      const transProgress = (photoTime - (stateRef.current.durationPerPhoto - 500)) / 500;

      if (style === 'energetic') {
        // Flash transition
        renderImage(photo, scale, dx, dy, 1);
        ctx.fillStyle = `rgba(255, 255, 255, ${transProgress})`;
        ctx.fillRect(0, 0, width, height);
      } else {
        // Normal crossfade
        renderImage(photo, scale, dx, dy, 1 - transProgress);
        renderImage(nextPhoto, 1.0, 0, 0, transProgress);
      }
    } else {
      // Normal display
      renderImage(photo, scale, dx, dy, 1);
    }

    // Overlays
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, width, height); // slight dark overlay

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 60px Inter';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 10;

    // Add text captions
    if (style === 'romantic') {
      ctx.font = 'italic 70px "Times New Roman"';
      ctx.fillStyle = '#ffb3c6';
      ctx.fillText("Our Memories", width / 2, height - 100);
    } else if (style === 'energetic') {
      ctx.font = '900 80px sans-serif';
      if (Math.floor(timeMs / 250) % 2 === 0) ctx.fillText("VIBES", width / 2, height / 2);
    } else {
      ctx.fillText("AutoReel Creator", width / 2, height - 80);
    }
  };

  // Ultra-Fast Export functionality via WebCodecs & Offline Rendering
  const handleExport = async () => {
    setIsExporting(true);
    isExportingRef.current = true;

    // Auto-pause UI during export
    if (isPlayingRef.current) togglePreview();

    try {
      const width = canvasRef.current.width;
      const height = canvasRef.current.height;

      // 1. Setup mp4-muxer
      const muxer = new Muxer({
        target: new ArrayBufferTarget(),
        video: { codec: 'avc', width, height },
        audio: music ? { codec: 'aac', sampleRate: 44100, numberOfChannels: 2 } : undefined,
        fastStart: 'in-memory'
      });

      // 2. Setup WebCodecs Video Encoder
      const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: e => console.error(e)
      });

      videoEncoder.configure({
        codec: 'avc1.4d002a', // H264 Main Profile
        width,
        height,
        bitrate: 5_000_000,
      });

      // 3. Render frames extremely fast (Offline)
      const fps = 30;
      const totalTimeMs = photos.length * stateRef.current.durationPerPhoto;
      const totalFrames = Math.ceil((totalTimeMs / 1000) * fps);

      for (let i = 0; i < totalFrames; i++) {
        const timeMs = (i / fps) * 1000;

        // Render explicitly to canvas for this time slice
        drawFrame(timeMs);

        // Grab frame into hardware encoder
        const frame = new VideoFrame(canvasRef.current, { timestamp: timeMs * 1000 }); // microseconds
        videoEncoder.encode(frame, { keyFrame: i % 30 === 0 });
        frame.close();

        // Prevent browser lockup and allow encoding buffer to flush (WebCodecs queue management)
        if (i % 20 === 0) {
          setProgress((i / totalFrames) * 100);
          await new Promise(r => setTimeout(r, 0));
        }
      }

      await videoEncoder.flush();

      // 4. Encode Audio (Instant, bypasses FFmpeg entirely)
      if (music) {
        setIsConverting(true);
        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
          // If custom file, we use music.url (which is a blob) or fetch standard URL.
          const response = await fetch(music.url);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

          const audioEncoder = new AudioEncoder({
            output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
            error: e => console.error(e)
          });

          audioEncoder.configure({
            codec: 'mp4a.40.2',
            sampleRate: 44100,
            numberOfChannels: 2,
            bitrate: 128000
          });

          const leftChannel = audioBuffer.getChannelData(0);
          const rightChannel = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : leftChannel;

          // Only encode exactly the amount of audio we need for the video length
          const totalSamplesWeNeed = Math.min(
            leftChannel.length,
            Math.floor((totalTimeMs / 1000) * 44100)
          );

          const framesPerChunk = 44100; // 1 second chunks
          for (let offset = 0; offset < totalSamplesWeNeed; offset += framesPerChunk) {
            const frameCount = Math.min(framesPerChunk, totalSamplesWeNeed - offset);

            const planarData = new Float32Array(frameCount * 2);
            planarData.set(leftChannel.subarray(offset, offset + frameCount), 0);
            planarData.set(rightChannel.subarray(offset, offset + frameCount), frameCount);

            const audioData = new AudioData({
              format: 'f32-planar',
              sampleRate: 44100,
              numberOfFrames: frameCount,
              numberOfChannels: 2,
              timestamp: (offset / 44100) * 1_000_000,
              data: planarData
            });

            audioEncoder.encode(audioData);
            audioData.close();

            if (offset % (framesPerChunk * 5) === 0) await new Promise(r => setTimeout(r, 0));
          }
          await audioEncoder.flush();
        } catch (err) {
          console.error("Native audio encode failed. Muxing video without audio.", err);
        }
        setIsConverting(false);
      }

      muxer.finalize();
      const buffer = muxer.target.buffer;

      // Helper for downloaded
      const downloadBlob = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
      };

      downloadBlob(new Blob([buffer], { type: 'video/mp4' }), `AutoReel_${style}_${Date.now()}.mp4`);

    } catch (e) {
      console.error(e);
      alert("Ultra-fast export failed.");
    } finally {
      setIsExporting(false);
      isExportingRef.current = false;
      setProgress(100);

      // Auto-resume UI
      setTimeout(() => {
        setProgress(0);
        togglePreview();
      }, 500);
    }
  };

  return (
    <div className="animate-fade-in text-center">
      <h2>Preview & Download</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        Rendering HD Video • {format.name} • {photos.length} photos
      </p>

      <div className="preview-container" style={{ position: 'relative', overflow: 'hidden', borderRadius: '1rem', background: '#000', marginBottom: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
        <canvas
          ref={canvasRef}
          width={format.width}
          height={format.height}
          className="video-preview"
          style={{ width: '100%', height: 'auto', maxHeight: '50vh', objectFit: 'contain', display: 'block', aspectRatio: `${format.width}/${format.height}` }}
        />

        {/* Timeline Scrubber */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '0.5rem', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress}
            onChange={handleSeek}
            style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--primary)' }}
          />
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <button className="btn btn-secondary" onClick={togglePreview}>
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          {isPlaying ? 'Pause Preview' : 'Play Preview'}
        </button>

        <button
          className="btn btn-primary"
          onClick={handleExport}
          disabled={isExporting || isConverting}
        >
          {isConverting ? (
            <><div className="loader" style={{ width: 20, height: 20, borderWidth: 2 }} /> Converting to MP4...</>
          ) : isExporting ? (
            <><div className="loader" style={{ width: 20, height: 20, borderWidth: 2 }} /> Rendering...</>
          ) : (
            <><Download size={20} /> Export Video (MP4)</>
          )}
        </button>
      </div>

      {(isExporting || isConverting) && (
        <p style={{ color: 'var(--primary)', marginTop: '1rem', fontSize: '0.9rem' }}>
          {isConverting
            ? "Transcoding and Packaging your video. Please do not close the window."
            : "Rendering video frame-by-frame... Please wait."}
        </p>
      )}
    </div>
  );
}
