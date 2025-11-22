// api/webhook.js

// 1. Disable parsing to prevent interference
module.exports.config = {
    api: {
        bodyParser: false,
    },
};

module.exports.default = async (req, res) => {
    const PROTECTOR_BASE_URL = 'http://fi11.bot-hosting.net:21270';
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'No ID provided' });
    }

    const targetUrl = `${PROTECTOR_BASE_URL}/webhook/${id}`;

    // --- HARDCODED DEBUG PAYLOAD ---
    // We ignore req.body and send a known valid Discord payload.
    const debugPayload = JSON.stringify({
        content: "✅ Connection Test: Vercel -> Backend is working.",
        username: "Proxy Debugger"
    });
    // -------------------------------

    console.log(`[TEST] Sending Hardcoded Payload to: ${targetUrl}`);

    try {
        // We do NOT forward client headers. We create fresh ones.
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Vercel-Proxy/1.0',
                'Accept': 'application/json'
            },
            body: debugPayload
        });

        const responseText = await response.text();
        
        console.log(`[TEST RESULT] Status: ${response.status}`);
        console.log(`[TEST RESULT] Body: ${responseText}`);

        // Send the backend's response to you
        res.status(response.status).send(`BACKEND STATUS: ${response.status}\nBACKEND REPLY: ${responseText}`);

    } catch (error) {
        res.status(502).json({ error: error.message });
    }
};
