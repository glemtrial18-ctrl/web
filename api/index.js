// api/webhook.js

// 1. Disable Auto-Parsing
module.exports.config = {
    api: {
        bodyParser: false,
    },
};

module.exports.default = async (req, res) => {
    const PROTECTOR_BASE_URL = 'http://fi11.bot-hosting.net:21270';
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'Missing ID' });
    }

    const targetUrl = `${PROTECTOR_BASE_URL}/webhook/${id}`;

    // 2. Capture Raw Data
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);
    const bodyString = rawBody.toString('utf8');

    // --- DEBUG LOGGING ---
    console.log(`[INCOMING] Method: ${req.method}`);
    console.log(`[INCOMING] ID: ${id}`);
    console.log(`[INCOMING] Body Type: ${typeof bodyString}`);
    console.log(`[INCOMING] Raw Body Payload:`, bodyString); // <--- CHECK THIS IN VERCEL LOGS
    // ---------------------

    // 3. Forward Headers
    const forwardHeaders = {};
    Object.keys(req.headers).forEach(key => {
        if (!['host', 'content-length', 'connection', 'accept-encoding', 'content-encoding'].includes(key.toLowerCase())) {
            forwardHeaders[key] = req.headers[key];
        }
    });
    forwardHeaders['x-forwarded-for'] = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    try {
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                ...forwardHeaders,
                'Content-Type': req.headers['content-type'] || 'application/json'
            },
            body: rawBody
        });

        const responseBody = await response.text();
        
        console.log(`[BACKEND RESPONSE] Status: ${response.status}`);
        console.log(`[BACKEND RESPONSE] Body: ${responseBody}`);

        res.status(response.status);
        res.send(responseBody);

    } catch (error) {
        console.error("Proxy Error:", error);
        res.status(502).json({ error: error.message });
    }
};
