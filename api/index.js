module.exports = async (req, res) => {
    const PROTECTOR_BASE_URL = 'http://fi11.bot-hosting.net:21270';
    const { id } = req.query;

    // 1. Basic Validation
    if (!id) {
        return res.status(400).json({ error: 'Webhook ID is missing from URL parameters.' });
    }

    const targetUrl = `${PROTECTOR_BASE_URL}/webhook/${id}`;

    // 2. Prepare Headers
    // We filter out headers that Vercel adds which might confuse the backend
    const forwardHeaders = {};
    Object.keys(req.headers).forEach(key => {
        if (!['host', 'content-length', 'connection', 'accept-encoding', 'content-encoding'].includes(key.toLowerCase())) {
            forwardHeaders[key] = req.headers[key];
        }
    });

    // Add IP forwarding so the bot knows who the real user is
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    forwardHeaders['x-forwarded-for'] = clientIp;

    // 3. PREPARE BODY (THE FIX FOR 422 ERROR)
    let bodyData;
    
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        if (Buffer.isBuffer(req.body)) {
            // Case A: Raw Buffer from Roblox -> Convert to String
            bodyData = req.body.toString('utf8');
        } else if (typeof req.body === 'object') {
            // Case B: Vercel parsed it automatically -> Convert back to JSON String
            bodyData = JSON.stringify(req.body);
        } else {
            // Case C: Already a string -> Send as is
            bodyData = req.body;
        }
    }

    try {
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                ...forwardHeaders,
                // Force Content-Type to JSON so the backend accepts it
                'Content-Type': 'application/json'
            },
            body: bodyData
        });

        const responseBody = await response.text();
        
        // 4. Return Response to Roblox
        res.status(response.status);

        // Forward allowed headers back
        response.headers.forEach((value, key) => {
            if (!['transfer-encoding', 'content-encoding', 'content-length'].includes(key.toLowerCase())) {
                res.setHeader(key, value);
            }
        });

        res.send(responseBody);

    } catch (error) {
        console.error("Proxy Error:", error);
        res.status(502).json({
            error: 'Failed to reach backend.',
            details: error.message
        });
    }
};
