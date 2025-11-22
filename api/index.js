module.exports = async (req, res) => {
    const PROTECTOR_BASE_URL = 'http://fi11.bot-hosting.net:21270';
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'Webhook ID is missing.' });
    }

    const targetUrl = `${PROTECTOR_BASE_URL}/webhook/${id}`;

    const forwardHeaders = {};
    Object.keys(req.headers).forEach(key => {
        if (!['host', 'content-length', 'connection', 'accept-encoding'].includes(key.toLowerCase())) {
            forwardHeaders[key] = req.headers[key];
        }
    });

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    forwardHeaders['x-forwarded-for'] = clientIp;

    let bodyData;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        if (req.body && typeof req.body === 'object') {
            bodyData = JSON.stringify(req.body);
        } else {
            bodyData = req.body;
        }
    }

    try {
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                ...forwardHeaders,
                'Content-Type': req.headers['content-type'] || 'application/json'
            },
            body: bodyData
        });

        const responseBody = await response.text();
        
        res.status(response.status);

        response.headers.forEach((value, key) => {
            if (!['transfer-encoding', 'content-encoding', 'content-length'].includes(key.toLowerCase())) {
                res.setHeader(key, value);
            }
        });

        res.send(responseBody);

    } catch (error) {
        res.status(502).json({
            error: 'Failed to forward request to backend.',
            details: error.message
        });
    }
};
