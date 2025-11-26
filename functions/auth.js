// /functions/auth.js - 最终完整代码

const CONFIG_KEY = 'global_settings';
const ADMIN_COOKIE_NAME = 'admin_logged_in';

export function isAuthenticated(request) {
    const cookieHeader = request.headers.get('Cookie');
    if (!cookieHeader) return false;
    return cookieHeader.includes(`${ADMIN_COOKIE_NAME}=true`);
}

export function validateCredentials(user, pass, env) {
    // 依赖 Pages Secrets: ADMIN_USER 和 ADMIN_PASS
    return user === env.ADMIN_USER && pass === env.ADMIN_PASS;
}

export function createAuthCookie(request, env) {
    const isSecure = request.url.startsWith('https://');
    const cookie = `${ADMIN_COOKIE_NAME}=true; Max-Age=3600; Path=/; HttpOnly; SameSite=Strict${isSecure ? '; Secure' : ''}`;
    return { 'Set-Cookie': cookie };
}

export async function getConfig(env) {
    const raw = await env.CONFIG.get(CONFIG_KEY);

    if (raw) {
        try {
            return JSON.parse(raw);
        } catch (e) {
            console.error("Error parsing KV config:", e);
        }
    }
    return {
        apiUrl: 'https://api.example.com/v1/models/gemini-pro:generateContent',
        apiKey: 'YOUR_DEFAULT_AI_API_KEY',
        welcomeMessage: '欢迎使用 AI 助手！请访问管理后台配置 API 接口。',
    };
}

export const SETTINGS = { CONFIG_KEY, ADMIN_COOKIE_NAME };
