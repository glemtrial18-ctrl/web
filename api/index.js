// api/webhook.js

// 1. DISABLE VERCEL AUTO-PARSING (Crucial for Roblox)
module.exports.config = {
    api: {
        bodyParser: false,
    },
};

module.exports.default = async (req, res) => {
    const PROTECTOR_BASE_URL = 'http://fi11.bot-hosting.net:21270';
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'No ID provided in URL' });
    }

    const targetUrl = `${PROTECTOR_BASE_URL}/webhook/${id}`;

    // 2. READ RAW DATA (Manual Buffer handling)
    // This prevents Vercel from corrupting the JSON
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);

    // 3. SET HEADERS
    // We force these headers to ensure the backend accepts the request
    const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Roblox/VercelProxy',
        'X-Forwarded-For': req.headers['x-forwarded-for'] || req.socket.remoteAddress
    };

    try {
        // 4. FORWARD TO BACKEND
        const response = await fetch(targetUrl, {
            method: req.method, // Uses POST/PATCH from Roblox
            headers: headers,
            body: rawBody       // Sends the raw bytes exactly as Roblox sent them
        });

        const responseText = await response.text();
        
        // 5. RETURN RESULT
        res.status(response.status);
        // Forward content-type back so Roblox knows if it got JSON back
        if (response.headers.get('content-type')) {
            res.setHeader('Content-Type', response.headers.get('content-type'));
        }
        res.send(responseText);

    } catch (error) {
        // Handle connection errors (e.g., Backend offline)
        res.status(502).json({ error: error.message });
    }
};
