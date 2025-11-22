// 1. TELL VERCEL NOT TO PARSE THE BODY
// This is the most important part. It stops Vercel from corrupting the data.
module.exports.config = {
    api: {
        bodyParser: false,
    },
};

module.exports.default = async (req, res) => {
    const PROTECTOR_BASE_URL = 'http://fi11.bot-hosting.net:21270';
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'Webhook ID is missing from URL parameters.' });
    }

    const targetUrl = `${PROTECTOR_BASE_URL}/webhook/${id}`;

    // 2. READ RAW DATA MANUALLY
    // Since we disabled the parser, we grab the raw chunks of data
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);

    // 3. PREPARE HEADERS
    const forwardHeaders = {};
    Object.keys(req.headers).forEach(key => {
        // Clean up headers that might confuse the backend
        if (!['host', 'content-length', 'connection', 'accept-encoding', 'content-encoding'].includes(key.toLowerCase())) {
            forwardHeaders[key] = req.headers[key];
        }
    });

    // Add IP forwarding
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    forwardHeaders['x-forwarded-for'] = clientIp;

    try {
        // 4. SEND RAW DATA TO BACKEND
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                ...forwardHeaders,
                // Ensure Content-Type is passed correctly. 
                // If Roblox didn't send one, default to JSON.
                'Content-Type': req.headers['content-type'] || 'application/json'
            },
            body: rawBody // Send the raw bytes exactly as received
        });

        const responseBody = await response.text();
        
        // 5. RETURN RESPONSE
        res.status(response.status);

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
