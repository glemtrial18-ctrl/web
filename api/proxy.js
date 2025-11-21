// api/proxy.js
export default async function handler(req, res) {
    // 1. Get the ID from the URL
    const { id } = req.query;
    
    if (!id) {
        return res.status(400).json({ error: "Webhook ID is missing" });
    }

    // 2. Define your Bot URL (Direct IP is safer)
    const targetUrl = `http://65.108.39.249:21270/webhook/${id}`;

    try {
        // 3. Forward the request to the Bot
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                "Content-Type": "application/json",
                // Pass headers if needed, mostly just Content-Type is enough
            },
            body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
        });

        // 4. Get response from Bot
        const data = await response.text();

        // 5. Send it back to the user
        res.status(response.status).send(data);

    } catch (error) {
        // Log error for debugging
        console.error("Proxy Error:", error);
        res.status(502).json({
            error: "Proxy Connection Failed",
            details: error.message
        });
    }
}
