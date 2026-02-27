import express from 'express';
import cors from 'cors';
import https from 'https';
import youtubedl from 'yt-dlp-exec';

const app = express();
app.use(cors());
app.use(express.json());

// Extraction Endpoint
app.post('/api/extract', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });

    try {
        const rawInfo = await youtubedl(url, {
            dumpJson: true,
            noCheckCertificates: true,
            noWarnings: true,
            // Minimal fetch for incredible speed
            skipDownload: true,
            addHeader: [
                'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36)'
            ]
        });

        // If output is string, parse it
        const info = typeof rawInfo === 'string' ? JSON.parse(rawInfo) : rawInfo;

        // Instead of dealing with CORS errors directly in the browser, 
        // we pipe the direct CDN link over our own server!
        const rawAudioUrl = info.url || (info.formats && info.formats.find(f => f.acodec !== 'none')?.url) || info.entries?.[0]?.url;
        const rawVideoUrl = info.url || (info.formats && info.formats.find(f => f.vcodec !== 'none')?.url) || info.entries?.[0]?.url;

        const domain = req.get('host');
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;

        res.json({
            title: info.title || 'Extracted Media',
            thumbnail: info.thumbnail || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=100&h=100&fit=crop',
            audioUrl: rawAudioUrl ? `${protocol}://${domain}/api/proxy?url=${encodeURIComponent(rawAudioUrl)}` : null,
            videoUrl: rawVideoUrl ? `${protocol}://${domain}/api/proxy?url=${encodeURIComponent(rawVideoUrl)}` : null
        });
    } catch (e) {
        console.error("Extraction error", e.message || e);
        // Determine if it was a non-video post
        if (e.message && e.message.includes('Unsupported URL')) {
            return res.status(400).json({ error: 'This link does not contain a supported video or audio track. Please link directly to a video.' });
        }
        if (e.message && e.message.includes('cookies')) {
            return res.status(400).json({ error: 'Facebook blocked extraction because this post is private or requires login. Please try testing with a public YouTube link instead (e.g. https://www.youtube.com/watch?v=jNQXAC9IVRw)' });
        }
        res.status(500).json({ error: 'Could not extract media. The video may be private, restricted, or requires login.' });
    }
});

// Proxy Endpoint to bypass browser CORS on direct CDN links
app.get('/api/proxy', (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('URL required');

    // Follow up to 3 redirects, passing everything along
    const makeRequest = (urlToFetch) => {
        https.get(urlToFetch, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36)'
            }
        }, (proxyRes) => {
            if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
                return makeRequest(proxyRes.headers.location);
            }
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        }).on('error', (err) => {
            res.status(500).send('Proxy error: ' + err.message);
        });
    }

    makeRequest(targetUrl);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Extraction Server running on port ${PORT}`));
