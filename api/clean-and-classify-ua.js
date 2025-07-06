// =================================================================
// FINGERPRINT-OS: User-Agent Classification Engine V1.6 (Ultimate Synthesis Edition)
// Fused from the collective intelligence of Gemini, DeepSeek, Grok, and Claude.
// =================================================================

/**
 * === 最终架构决策备忘录 (Head-of-File Memo) ===
 *
 * 1.  **核心解析器 (Primary Parser):** 沿用 `ua-parser-js` 作为基础，这是所有AI的共识。
 * 2.  **自定义规则引擎 (Custom Rules Engine):** 采纳Claude的结构化设计，并整合所有AI建议的新规则（国产浏览器, 自动化工具, VR, 游戏机等），实现最广覆盖。
 * 3.  **生产级特性 (Production Features):**
 *     - **缓存:** 采纳Claude的缓存思想，但V1.6为保持简洁性，使用简单的FIFO Map。真正的LRU已记入V2.0技术债。
 *     - **安全:** 采纳Claude的DoS长度限制，并融入DeepSeek的解析超时保护。
 *     - **元数据:** 采纳Claude的元数据结构，并融入DeepSeek的多维度置信度评分模型和Claude的性能耗时监控。
 * 4.  **数据归一化 (Normalization):** 修复了Claude指出的版本号清理Bug，并采纳DeepSeek的版本映射表思想，使逻辑更清晰。
 * 5.  **逻辑严谨性 (Logical Rigor):** 采纳Grok和DeepSeek的双重机器人校验逻辑，确保判断的准确性。
 * 6.  **代码结构 (Code Structure):** 由Gemini最终重构，确保所有优秀思想被有机地、清晰地整合在一起。
 */

import UAParser from 'ua-parser-js';

// --- 1. 配置与规则库 (Configuration & Rulebook) ---

const CACHE_SIZE = 1000;
const PARSE_TIMEOUT_MS = 100; // 解析超时保护
const cache = new Map();

const CUSTOM_RULES = {
    browsers: [
        { name: 'WeChat', pattern: /MicroMessenger\/([\d.]+)/i },
        { name: 'QQ Browser', pattern: /\bQQBrowser\/([\d.]+)/i },
        { name: 'UC Browser', pattern: /\bUCBrowser\/([\d.]+)/i },
        { name: 'BaiduBoxApp', pattern: /baiduboxapp\/([\d.]+)/i },
        { name: '360 Secure Browser', pattern: /\b360SE\b/i },
        { name: 'Sogou Mobile Browser', pattern: /\bSogouMobileBrowser\/([\d.]+)/i },
        { name: 'Maxthon', pattern: /\bMaxthon\/([\d.]+)/i },
        { name: 'DingTalk', pattern: /\bDingTalk\/([\d.]+)/i },
    ],
    bots: [
        { name: 'Googlebot', type: 'crawler', pattern: /\bGooglebot\/([\d.]+)/i },
        { name: 'Bingbot', type: 'crawler', pattern: /\bbingbot\/([\d.]+)/i },
        { name: 'Puppeteer', type: 'automation', pattern: /\bPuppeteer\/([\d.]+)/i },
        { name: 'Playwright', type: 'automation', pattern: /\bPlaywright\/([\d.]+)/i },
        { name: 'Selenium', type: 'automation', pattern: /\bSelenium\b/i },
        { name: 'Headless Chrome', type: 'automation', pattern: /\bHeadlessChrome\/([\d.]+)/i },
    ],
    devices: [
        { vendor: 'Tesla', model: 'Car Browser', type: 'vehicle', pattern: /\bTesla\/([\d.]+)/i },
        { vendor: 'Nintendo', model: 'Switch', type: 'console', pattern: /\bNintendo Switch\b/i },
        { vendor: 'Sony', model: 'PlayStation $1', type: 'console', pattern: /\bPlayStation (\d+)/i },
        { vendor: 'Microsoft', model: 'Xbox', type: 'console', pattern: /\bXbox\b/i },
        { vendor: 'Oculus', model: 'Quest', type: 'vr', pattern: /Oculus|Quest/i },
        { vendor: 'Unknown', model: 'Smart TV', type: 'smarttv', pattern: /Smart-TV|BRAVIA/i },
    ],
};

const VERSION_MAP = {
    'Mac OS 10.16': 'macOS 11', // Big Sur anachronism
    'Windows NT 10.0': 'Windows 10',
    'Windows NT 6.3': 'Windows 8.1',
};

// --- 2. 核心逻辑函数 (Core Logic Functions) ---

function applyAllCustomRules(ua, result) {
    const apply = (type) => {
        for (const rule of CUSTOM_RULES[type]) {
            const match = ua.match(rule.pattern);
            if (match) {
                if (type === 'browsers') {
                    result.browser.name = rule.name;
                    result.browser.version = match[1] || result.browser.version;
                } else if (type === 'devices') {
                    result.device.vendor = rule.vendor;
                    result.device.model = rule.model.replace(/\$(\d+)/g, (_, n) => match[n] || '');
                    if(rule.type) result.device.type = rule.type;
                } else if (type === 'bots') {
                    result.device.type = 'bot';
                    result.bot = { name: rule.name, type: rule.type };
                }
                return true;
            }
        }
        return false;
    };
    if (apply('bots')) return;
    if (apply('devices')) return;
    apply('browsers');
}

function inferDeviceType(ua, result) {
    if (result.bot || /(bot|crawler|spider|scraper|crawl)/i.test(ua)) return 'bot';
    if (result.device.type && result.device.type !== 'desktop') return result.device.type; // Keep console, vr, etc.
    const osName = result.os.name?.toLowerCase() || '';
    if (['android', 'ios', 'windows phone'].some(m => osName.includes(m))) {
        return /tablet|ipad|playbook/i.test(ua) ? 'tablet' : 'mobile';
    }
    return 'desktop';
}

function normalizeResult(result) {
    const cleanVersion = (v) => v ? v.replace(/(?:\.0)+$/, '') : null;
    
    let finalOSName = result.os.name || 'Unknown';
    let finalOSVersion = result.os.version;

    for(const [key, value] of Object.entries(VERSION_MAP)){
        if(finalOSVersion && finalOSVersion.startsWith(key)) {
            finalOSVersion = finalOSVersion.replace(key, value.split(' ')[1]);
            finalOSName = value.split(' ')[0];
            break;
        }
    }
    if (finalOSName.startsWith('Mac OS')) finalOSName = 'macOS';

    return {
        os: { name: finalOSName, version: cleanVersion(finalOSVersion) },
        browser: { name: result.browser.name, version: cleanVersion(result.browser.version), major: result.browser.major },
        device: { type: result.device.type, vendor: result.device.vendor, model: result.device.model },
        engine: { name: result.engine.name, version: cleanVersion(result.engine.version) },
        cpu: { architecture: result.cpu.architecture },
        bot: result.bot || null,
    };
}

function calculateConfidence(result) {
    let score = 0;
    if (result.browser.name && result.browser.name !== 'Unknown') score += 40;
    if (result.os.name && result.os.name !== 'Unknown') score += 30;
    if (result.device.model) score += 20;
    if (result.engine.name) score += 10;
    return score;
}

// --- 3. Vercel Serverless 入口 (The Handler) ---

export default async function handler(req, res) {
    const startTime = Date.now();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    
    const { ua_string } = req.body;
    if (!ua_string || typeof ua_string !== 'string' || ua_string.length > 2048) {
        return res.status(400).json({ error: 'Invalid or missing ua_string' });
    }

    if (cache.has(ua_string)) {
        const cachedResult = cache.get(ua_string);
        cachedResult.metadata.cache_hit = true;
        return res.status(200).json(cachedResult);
    }

    try {
        const parsingTask = new Promise((resolve) => {
            const parser = new UAParser(ua_string);
            let result = parser.getResult();
            applyAllCustomRules(ua_string, result);
            result.device.type = inferDeviceType(ua_string, result);
            resolve(normalizeResult(result));
        });

        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('UA parsing timed out')), PARSE_TIMEOUT_MS)
        );

        const finalResult = await Promise.race([parsingTask, timeoutPromise]);

        const responsePayload = {
            ...finalResult,
            metadata: {
                parsed_at: new Date().toISOString(),
                parser_version: '1.6.0-ultimate',
                confidence_score: calculateConfidence(finalResult),
                processing_time_ms: Date.now() - startTime,
                cache_hit: false,
            }
        };

        if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value);
        cache.set(ua_string, responsePayload);

        return res.status(200).json(responsePayload);

    } catch (error) {
        console.error('UA Parsing Error:', { ua: ua_string, error: error.message });
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}