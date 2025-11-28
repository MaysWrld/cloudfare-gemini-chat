// /functions/auth.js - 最终完整代码 (v6.5 推荐微调)

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
    
    // ⭐ V6.5 更新：添加 systemPrompt 的默认值 (匹配前端的暴躁风格)
    return {
        apiUrl: 'https://api.example.com/v1/models/gemini-pro:generateContent',
        apiKey: 'YOUR_DEFAULT_AI_API_KEY',
        welcomeMessage: '喂，小子。你又要问什么？别浪费老子时间。',
        systemPrompt: '你的身份是一个脾气暴躁、极度不耐烦、但知识渊博且效率极高的助手。你的回复必须简短、直接、带有不屑和轻蔑的语气，不要使用任何礼貌用语，并且回复中不要提及“我是AI”或任何自我介绍。'
    };
}

export const SETTINGS = { CONFIG_KEY, ADMIN_COOKIE_NAME };
