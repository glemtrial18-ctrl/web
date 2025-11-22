module.exports = async (req, res) => {
    const PROTECTOR_BASE_URL = 'http://fi11.bot-hosting.net:21270';
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'Webhook ID is missing.' });
    }

    const targetUrl = `${PROTECTOR_BASE_URL}/webhook/${id}`;

    // 1. Prepare Headers
    const forwardHeaders = {};
    Object.keys(req.headers).forEach(key => {
        // Remove headers that confuse the connection or length
        if (!['host', 'content-length', 'connection', 'accept-encoding'].includes(key.toLowerCase())) {
            forwardHeaders[key] = req.headers[key];
        }
    });

    // 2. Add IP Forwarding
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    forwardHeaders['x-forwarded-for'] = clientIp;

    // 3. PREPARE BODY (The Fix for 422)
    let bodyData;
    
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        if (Buffer.isBuffer(req.body)) {
            // CASE A: It is a raw Buffer -> Convert to String
            bodyData = req.body.toString('utf8');
        } else if (typeof req.body === 'object') {
            // CASE B: Vercel parsed it to Object -> Convert back to JSON String
            bodyData = JSON.stringify(req.body);
        } else {
            // CASE C: It is already a string -> Send as is
            bodyData = req.body;
        }
    }

    try {
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                ...forwardHeaders,
                // Ensure we tell the backend this is JSON
                'Content-Type': req.headers['content-type'] || 'application/json'
            },
            body: bodyData
        });

        const responseBody = await response.text();
        
        res.status(response.status);

        // Forward headers back to you
        response.headers.forEach((value, key) => {
            if (!['transfer-encoding', 'content-encoding', 'content-length'].includes(key.toLowerCase())) {
                res.setHeader(key, value);
            }
        });

        res.send(responseBody);

    } catch (error) {
        console.error(error);
        res.status(502).json({
            error: 'Proxy Error',
            details: error.message
        });
    }
};
