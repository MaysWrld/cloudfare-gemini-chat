// /functions/auth.js - 最终完整代码 (Cookie 验证 + KV 核心)

// 配置常量
const CONFIG_KEY = 'global_settings'; // KV 中存储配置的键名
const ADMIN_COOKIE_NAME = 'admin_logged_in'; // 用于网页登录的 Cookie 名称

/**
 * isAuthenticated: 检查请求是否包含正确的身份验证 Cookie。
 * (用于 /api/admin 保护)
 */
export function isAuthenticated(request) {
    const cookieHeader = request.headers.get('Cookie');
    if (!cookieHeader) return false;

    // 检查是否存在 admin_logged_in=true 标记
    return cookieHeader.includes(`${ADMIN_COOKIE_NAME}=true`);
}

/**
 * validateCredentials: 检查用户名和密码是否匹配 Pages Secrets。
 * (用于 /api/login 验证)
 */
export function validateCredentials(user, pass, env) {
    // 比较 Pages Settings 中设置的 ADMIN_USER 和 ADMIN_PASS 环境变量
    return user === env.ADMIN_USER && pass === env.ADMIN_PASS;
}

/**
 * createAuthCookie: 返回一个安全的、设置为登录成功的 Set-Cookie 头部。
 * (用于 /api/login 成功后设置)
 */
export function createAuthCookie(request, env) {
    const isSecure = request.url.startsWith('https://'); // 检查是否为 HTTPS
    
    // 设置一个 HttpOnly 的安全 Cookie，有效期为 1 小时 (3600 秒)
    const cookie = `${ADMIN_COOKIE_NAME}=true; Max-Age=3600; Path=/; HttpOnly; SameSite=Strict${isSecure ? '; Secure' : ''}`;
    
    return { 'Set-Cookie': cookie };
}

/**
 * getConfig: 从 KV 存储中读取最新的配置。
 * (用于所有 API 接口获取配置，包括 /api/config 读取欢迎语)
 */
export async function getConfig(env) {
    // 1. 从 KV 绑定变量 env.CONFIG 中获取配置
    const raw = await env.CONFIG.get(CONFIG_KEY); 

    if (raw) {
        try { 
            // 2. 如果成功获取，尝试解析 JSON
            return JSON.parse(raw); 
        } catch (e) { 
            // 3. 解析失败，打印错误
            console.error("Error parsing KV config:", e); 
        }
    }

    // 4. 如果读取失败或解析失败，返回默认配置
    return {
        apiUrl: 'https://api.example.com/v1/models/gemini-pro:generateContent', 
        apiKey: 'YOUR_DEFAULT_AI_API_KEY', 
        welcomeMessage: '欢迎使用 AI 助手！请访问管理后台配置 API 接口。',
    };
}

export const SETTINGS = { CONFIG_KEY, ADMIN_COOKIE_NAME };
