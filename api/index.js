// api/webhook.js

// 1. Disable Vercel Parsing (Required for Roblox)
module.exports.config = {
    api: {
        bodyParser: false,
    },
};

module.exports.default = async (req, res) => {
    const PROTECTOR_BASE_URL = 'http://fi11.bot-hosting.net:21270';
    const { id } = req.query;

    if (!id) {
        console.error("[ERROR] No ID provided");
        return res.status(400).json({ error: 'No ID provided' });
    }

    const targetUrl = `${PROTECTOR_BASE_URL}/webhook/${id}`;

    // 2. Read Raw Data
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);

    // Debug Log: See if data reached Vercel
    console.log(`[PROXY IN] Method: ${req.method}, ID: ${id}, Size: ${rawBody.length} bytes`);

    try {
        // 3. Forward to Backend
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Roblox/Proxy',
                'X-Forwarded-For': req.headers['x-forwarded-for'] || req.socket.remoteAddress
            },
            body: rawBody
        });

        const responseText = await response.text();
        
        // Debug Log: See what the backend said
        console.log(`[BACKEND REPLY] Status: ${response.status}`);
        console.log(`[BACKEND REPLY] Body: ${responseText}`);

        res.status(response.status);
        if (response.headers.get('content-type')) {
            res.setHeader('Content-Type', response.headers.get('content-type'));
        }
        res.send(responseText);

    } catch (error) {
        console.error("[PROXY ERROR]", error);
        res.status(502).json({ error: error.message });
    }
};
