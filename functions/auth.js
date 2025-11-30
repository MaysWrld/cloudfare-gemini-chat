// /functions/auth.js - 最终完整代码 (新增 Google Search Keys 读取和 Tool 指令)

const CONFIG_KEY = 'global_settings';
const ADMIN_COOKIE_NAME = 'admin_logged_in';

/**
 * 检查请求头中是否存在管理员认证的 Cookie。
 * @param {Request} request 
 * @returns {boolean}
 */
export function isAuthenticated(request) {
    const cookieHeader = request.headers.get('Cookie');
    if (!cookieHeader) return false;
    return cookieHeader.includes(`${ADMIN_COOKIE_NAME}=true`);
}

/**
 * 验证管理员登录凭据。
 */
export function validateCredentials(user, pass, env) {
    return user === env.ADMIN_USER && pass === env.ADMIN_PASS;
}

/**
 * 创建管理员认证 Cookie。
 */
export function createAuthCookie(request) {
    const isSecure = request.url.startsWith('https://');
    const cookie = `${ADMIN_COOKIE_NAME}=true; Max-Age=3600; Path=/; HttpOnly; SameSite=Strict${isSecure ? '; Secure' : ''}`;
    return { 'Set-Cookie': cookie };
}

/**
 * 从 KV 存储中获取配置，并提供默认值。
 */
export async function getConfig(env) {
    if (!env.CONFIG) {
        throw new Error('KV 绑定错误：环境变量 "CONFIG" 缺失。请在 Pages/Worker 设置中绑定 KV 命名空间。');
    }
    
    const raw = await env.CONFIG.get(CONFIG_KEY);
    let kvConfig = {}; 

    if (raw) {
        try {
            kvConfig = JSON.parse(raw);
        } catch (e) {
            console.error("Error parsing KV config:", e);
        }
    }
    
    // 🚀 核心：启用 Tool Calling 的 System Instruction (新增网页搜索)
    const defaultPersonaPrompt = "你现在是一个多功能AI助手，具备调用外部工具获取信息和图片的能力。当需要搜索最新事实或信息时，请调用 `search_web` 工具。当需要提供图片时，请调用 `search_image` 工具来获取互联网上公开可访问的图片URL。工具调用成功后，你必须将返回的URL严格包装在 <IMAGE_URL: [图片URL], [图片描述]> 格式的文本标记中。";

    // 确保所有字段都优先使用 KV 读取的值 (kvConfig)
    return {
        // UI 配置
        appTitle: kvConfig.appTitle || 'AI 助手', 
        welcomeMessage: kvConfig.welcomeMessage || '欢迎使用 AI 助手！',
        
        // AI 配置
        apiUrl: kvConfig.apiUrl || 'https://generativelanguage.googleapis.com/v1beta',
        apiKey: kvConfig.apiKey || 'YOUR_DEFAULT_AI_API_KEY',
        modelName: kvConfig.modelName || 'gemini-2.5-flash',
        temperature: parseFloat(kvConfig.temperature) || 0.7,
        personaPrompt: kvConfig.personaPrompt || defaultPersonaPrompt,

        // 🚀 新增：Google Search Keys
        googleSearchApiKey: kvConfig.googleSearchApiKey || '',
        googleCxId: kvConfig.googleCxId || '',
    };
}

export const SETTINGS = { CONFIG_KEY, ADMIN_COOKIE_NAME };
