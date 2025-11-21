export default async function handler(req, res) {
    // --- CONFIGURATION ---
    const targetBaseUrl = 'http://65.108.39.249:21270';
    // ---------------------

    // 1. Set CORS Headers (Allows access from anywhere)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    // Handle Preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    // 2. Construct the Target URL
    // If root path /, check heartbeat, otherwise preserve path
    const path = (req.url === '/' || req.url === '') ? '/api/heartbeat/status' : req.url;
    const targetUrl = targetBaseUrl + path;

    console.log(`[DEBUG] Proxying request to: ${targetUrl}`);

    // 3. Prepare Headers to forward
    const forwardHeaders = {};
    Object.keys(req.headers).forEach(key => {
        // Filter out headers that confuse the connection
        if (!['host', 'content-length', 'connection'].includes(key.toLowerCase())) {
            forwardHeaders[key] = req.headers[key];
        }
    });

    // 4. Execute Request
    try {
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                ...forwardHeaders,
                // Ensure we tell the bot we are sending JSON if applicable
                'Content-Type': req.headers['content-type'] || 'application/json'
            },
            // Only send body if it's not GET/HEAD
            body: (req.method !== 'GET' && req.method !== 'HEAD') ? JSON.stringify(req.body) : undefined
        });

        // 5. Handle Response from Bot
        const data = await response.text();
        
        console.log(`[DEBUG] Bot responded with status: ${response.status}`);

        // Forward response headers from bot to user
        response.headers.forEach((value, key) => {
             if (key.toLowerCase() !== 'transfer-encoding') {
                res.setHeader(key, value);
            }
        });

        return res.status(response.status).send(data);

    } catch (error) {
        // 6. Error Handling (Pure Debug output)
        console.error(`[ERROR] Proxy Failed:`, error);

        return res.status(502).json({
            status: "error",
            message: "Vercel could not reach the Bot.",
            debug_details: {
                target: targetUrl,
                error_message: error.message,
                error_code: error.code || "UNKNOWN"
            }
        });
    }
}
