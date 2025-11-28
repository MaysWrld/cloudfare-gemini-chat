// /functions/auth.js

// KV 中存储配置的唯一 Key
const CONFIG_KEY = 'global_settings'; 

/**
 * authenticateAdmin: 检查请求是否包含正确的管理员 Basic Auth 凭证。
 */
export function authenticateAdmin(request, env) {
    const authHeader = request.headers.get('Authorization');
    
    // 如果没有认证头或格式不正确，返回 401，并提示浏览器弹出登录框
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return new Response('Unauthorized: Missing Basic Auth Header', { 
            status: 401,
            headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' }
        });
    }

    const encoded = authHeader.replace('Basic ', '');
    try {
        const decoded = atob(encoded);
        const [user, pass] = decoded.split(':');

        // 比较 Pages Settings 中设置的 ADMIN_USER 和 ADMIN_PASS 环境变量
        if (user === env.ADMIN_USER && pass === env.ADMIN_PASS) {
            return null; // 认证成功，返回 null 表示继续执行
        } else {
            return new Response('Unauthorized: Invalid Credentials', {
                status: 401,
                headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' }
            });
        }
    } catch (e) {
        return new Response('Unauthorized: Invalid Encoding', { status: 401 });
    }
}

/**
 * getConfig: 从 KV 存储中读取最新的配置。
 */
export async function getConfig(env) {
    // env.CONFIG 变量名将在 Pages 设置中绑定到 CHAT_CONFIG KV
    const raw = await env.CONFIG.get(CONFIG_KEY); 
    if (raw) {
        try { return JSON.parse(raw); } catch (e) { console.error("Error parsing KV config:", e); }
    }
    // 如果 KV 中没有数据，返回默认配置
    return {
        apiUrl: 'https://api.example.com/v1/models/gemini-pro:generateContent', 
        apiKey: 'YOUR_DEFAULT_AI_API_KEY', 
        welcomeMessage: '欢迎使用 AI 助手！请在后台配置您的 API 接口。',
    };
}

export const SETTINGS = { CONFIG_KEY };
