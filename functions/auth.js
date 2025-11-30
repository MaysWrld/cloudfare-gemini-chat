// /functions/auth.js - 最终完整代码

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
    // 检查是否存在 'admin_logged_in=true'
    return cookieHeader.includes(`${ADMIN_COOKIE_NAME}=true`);
}

/**
 * 验证管理员登录凭据。
 * @param {string} user - 用户名
 * @param {string} pass - 密码
 * @param {Object} env - Worker 环境变量 (ADMIN_USER, ADMIN_PASS)
 * @returns {boolean}
 */
export function validateCredentials(user, pass, env) {
    // 依赖 Pages Secrets: ADMIN_USER 和 ADMIN_PASS
    return user === env.ADMIN_USER && pass === env.ADMIN_PASS;
}

/**
 * 创建管理员认证 Cookie。
 * @param {Request} request 
 * @returns {HeadersInit}
 */
export function createAuthCookie(request) {
    const isSecure = request.url.startsWith('https://');
    // 设置 Max-Age=3600 (1小时)，HttpOnly, SameSite=Strict
    const cookie = `${ADMIN_COOKIE_NAME}=true; Max-Age=3600; Path=/; HttpOnly; SameSite=Strict${isSecure ? '; Secure' : ''}`;
    return { 'Set-Cookie': cookie };
}

/**
 * 从 KV 存储中获取配置，并提供默认值，包括图文指令。
 * @param {Object} env - Worker 环境变量 (CONFIG KV 绑定)
 * @returns {Promise<Object>}
 */
export async function getConfig(env) {
    const raw = await env.CONFIG.get(CONFIG_KEY);
    let config = {};

    if (raw) {
        try {
            config = JSON.parse(raw);
        } catch (e) {
            console.error("Error parsing KV config:", e);
        }
    }
    
    // 🚀 核心：默认的图文并茂系统指令 (System Instruction)
    const defaultPersonaPrompt = `你现在具备图文并茂的回复能力。当用户问到需要视觉解释的事物时，请你直接在文本中插入一个图片占位符。占位符格式**必须是**：<IMAGE_URL: [图片URL], [图片描述]>。你必须尽力在回复中插入一个**互联网上公开可访问**的图片链接 (URL)。如果找不到合适的链接，请使用一个通用占位符链接，如：https://via.placeholder.com/600x400.png?text=图+${[图片描述]}。你不需要做任何搜索或工具调用，直接将这个结构作为纯文本输出。`;

    return {
        // 基础 API 配置
        apiUrl: config.apiUrl || 'https://api.example.com/v1/models/gemini-pro:generateContent',
        apiKey: config.apiKey || 'YOUR_DEFAULT_AI_API_KEY',
        
        // AI 模型配置
        modelName: config.modelName || 'gemini-2.5-flash',
        temperature: parseFloat(config.temperature) || 0.7, // 确保是浮点数
        
        // 聊天界面配置
        welcomeMessage: config.welcomeMessage || '欢迎使用 AI 助手！请访问管理后台配置 API 接口。',
        
        // 系统指令 (System Instruction)
        personaPrompt: config.personaPrompt || defaultPersonaPrompt,
    };
}

export const SETTINGS = { CONFIG_KEY, ADMIN_COOKIE_NAME };
