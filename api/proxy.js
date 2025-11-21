import crypto from 'crypto';

export default async function handler(req, res) {
    const allowedPublicKeys = (process.env.PROXY_ALLOWED_PUBLIC_KEYS || '').split(',');
    const targetBaseUrl = 'http://65.108.39.249:21270';
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    const incomingPublicKey = req.headers['x-public-key'];
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!incomingPublicKey || !allowedPublicKeys.includes(incomingPublicKey)) {
        const serverUrl = req.url;
        const redirectDelay = 5;
        const cookieDays = 1;
        const secureLabel = 'ct_secure_token';
        const secretSalt = 'a9b8c7d6e5f4g3h2i1j0';
        const userAgent = req.headers['user-agent'] || '';
        
        const secureKey = crypto.createHash('md5').update(clientIp + userAgent + secretSalt).digest('hex');

        const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta http-equiv="cache-control" content="no-cache">
        <meta http-equiv="cache-control" content="private">
        <meta http-equiv="expires" content="0" />
        <title>DDoS protection | CleanTalk</title>
        <style type="text/css">
            .main_t {height: 100%; width: 100%;}
            .main_t td {text-align: center;}
            .main_t td.info {height: 100%; text-align: center; vertical-align: top; padding-top: 5em;}
            .sign { color: #ccc; margin-top: 5em;}
            .sign a { color: #ccc; }
        </style>
        <script>
        function hrefOnclickEvent() {
            document.location = '${serverUrl}';
        }
        </script>
        </head>
        <body>
            <table class="main_t">
                <tr>
                    <td class="info">
                        <h1>DDoS protection is activated for your IP <a href="http://cleantalk.org/blacklists/${clientIp}" target="_new">${clientIp}</a></h1>
                        <div id="human_info" style="display: none">
                            <p>Please click bellow to pass protection,</p>
                            <button onclick="hrefOnclickEvent()">Click</button>
                            <p>Or you will be automatically redirected to the requested page after ${redirectDelay} seconds.</p>
                        </div>
                        <div id="js_info">
                            <p>To continue working with web-site, please make sure that you have enabled JavaScript.</p>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td class="sign">
                        DDoS protection by <span style="color: #49C73B;">Clean</span><span style="color: #349EBF;">Talk</span><br />
                    </td>
                </tr>
            </table>
            <script type="text/javascript">
                document.getElementById("js_info").style.display = "none";
                document.getElementById("human_info").style.display = "block";
                var date = new Date();
                var days = ${cookieDays};
                date.setTime(date.getTime() + (days * 24*60*60*1000));
                const ctSecure = location.protocol === "https:" ? "; secure" : "";
                document.cookie = "${secureLabel}" + "=" + escape("${secureKey}") + "; expires=" + date.toGMTString() + "; path=/; samesite=lax" + ctSecure;
                setTimeout(function(){
                    window.location.reload(true);
                }, ${redirectDelay} * 1000);
            </script>
        </body>
        </html>`;

        return res.status(403).send(html);
    }

    const path = (req.url === '/' || req.url === '') ? '/api/heartbeat/status' : req.url;
    const targetUrl = targetBaseUrl + path;

    const forwardHeaders = {};
    Object.keys(req.headers).forEach(key => {
        if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'x-public-key') {
            forwardHeaders[key] = req.headers[key];
        }
    });
    forwardHeaders['X-API-Key'] = process.env.PROXY_PRIVATE_API_KEY;

    try {
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: forwardHeaders,
            body: (req.method !== 'GET' && req.method !== 'HEAD') ? JSON.stringify(req.body) : undefined
        });

        const data = await response.text();
        
        response.headers.forEach((value, key) => {
            if (key.toLowerCase() !== 'transfer-encoding') {
                res.setHeader(key, value);
            }
        });

        return res.status(response.status).send(data);

    } catch (error) {
        return res.status(502).send('Proxy error: ' + error.message);
    }
}
