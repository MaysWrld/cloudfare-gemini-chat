// /functions/auth.js - 最终完整代码 (确保所有配置字段被正确读取和返回)

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
    // 增强检查：如果 KV 命名空间未绑定，直接抛出明确错误
    if (!env.CONFIG) {
        // 这个错误应该在 admin.html 中被捕获并提示给用户
        throw new Error('KV 绑定错误：环境变量 "CONFIG" 缺失。请在 Pages/Worker 设置中绑定 KV 命名空间。');
    }
    
    const raw = await env.CONFIG.get(CONFIG_KEY);
    let kvConfig = {}; // 存储从 KV 原始读取的配置

    if (raw) {
        try {
            kvConfig = JSON.parse(raw);
        } catch (e) {
            console.error("Error parsing KV config:", e);
        }
    }
    
    // 核心修复：移除模板字符串插值，确保 [图片描述] 是字面量
    // 这个默认 Prompt 只在 KV 中没有 personaPrompt 时才使用
    const defaultPersonaPrompt = "你现在具备图文并茂的回复能力。当用户问到需要视觉解释的事物时，请你直接在文本中插入一个图片占位符。占位符格式**必须是**：<IMAGE_URL: [图片URL], [图片描述]>。你必须尽力在回复中插入一个**互联网上公开可访问**的图片链接 (URL)。如果找不到合适的链接，请使用一个通用占位符链接，如：https://via.placeholder.com/600x400.png?text=图+[图片描述]。你不需要做任何搜索或工具调用，直接将这个结构作为纯文本输出。";

    // 🚀 确保所有字段都优先使用 KV 读取的值 (kvConfig)，如果 KV 中没有，才使用默认值
    return {
        // UI 配置
        appTitle: kvConfig.appTitle || 'AI 助手', // 确保优先使用 KV 值
        welcomeMessage: kvConfig.welcomeMessage || '欢迎使用 AI 助手！请访问管理后台配置 API 接口。',
        
        // AI 配置
        apiUrl: kvConfig.apiUrl || 'https://generativelanguage.googleapis.com/v1beta',
        apiKey: kvConfig.apiKey || 'YOUR_DEFAULT_AI_API_KEY',
        modelName: kvConfig.modelName || 'gemini-2.5-flash',
        temperature: parseFloat(kvConfig.temperature) || 0.7,
        personaPrompt: kvConfig.personaPrompt || defaultPersonaPrompt,
    };
}

export const SETTINGS = { CONFIG_KEY, ADMIN_COOKIE_NAME };
