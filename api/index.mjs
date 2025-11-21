// api/index.js

module.exports = async (req, res) => {
    // --- CONFIGURATION ---
    const targetBaseUrl = 'http://65.108.39.249:21270';
    // ---------------------

    // 1. Set CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    // Handle Preflight
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    // 2. Construct Target URL
    const path = (req.url === '/' || req.url === '') ? '/api/heartbeat/status' : req.url;
    const targetUrl = targetBaseUrl + path;

    // 3. Prepare Headers
    const forwardHeaders = {};
    Object.keys(req.headers).forEach(key => {
        // Filter out headers that cause issues
        if (!['host', 'content-length', 'connection', 'accept-encoding'].includes(key.toLowerCase())) {
            forwardHeaders[key] = req.headers[key];
        }
    });

    // 4. PREPARE BODY (THE FIX for 422 Errors)
    let bodyData;
    
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        if (req.body && typeof req.body === 'object') {
            // If Vercel already parsed it, turn it back to JSON string
            bodyData = JSON.stringify(req.body);
        } else {
            // If it's already a string or buffer, pass it raw
            bodyData = req.body;
        }
    }

    console.log(`[PROXY] ${req.method} -> ${targetUrl}`);

    try {
        // Note: 'fetch' is native in Node.js 18+. Ensure your Vercel project uses Node 18 or 20.
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                ...forwardHeaders,
                // Force JSON if not present, otherwise trust the client
                'Content-Type': req.headers['content-type'] || 'application/json'
            },
            body: bodyData
        });

        // 5. Handle Response
        const data = await response.text();
        
        console.log(`[Response] Status: ${response.status}`);

        // Forward headers back to client
        response.headers.forEach((value, key) => {
             if (!['transfer-encoding', 'content-encoding', 'content-length'].includes(key.toLowerCase())) {
                res.setHeader(key, value);
            }
        });

        // Send back exactly what the bot sent
        return res.status(response.status).send(data);

    } catch (error) {
        console.error(`[ERROR] Proxy Failed:`, error);
        return res.status(502).json({
            status: "error",
            message: "Vercel Proxy Error",
            details: error.message
        });
    }
};
