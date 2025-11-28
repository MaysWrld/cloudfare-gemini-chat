// /functions/auth.js - 最终完整代码 (已修复 JSON 解析错误导致的 500 缺陷)

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
            // 成功，立即返回解析后的配置
            return JSON.parse(raw);
        } catch (e) {
            console.error("致命警告：KV配置JSON格式损坏，使用默认配置。错误:", e);
            // 发生了异常，不执行任何操作，让函数继续执行到最后的默认 return
        }
    }
    
    // 只有当 raw 为空 或 JSON 解析失败时，才执行这里的默认配置返回
    return {
        apiUrl: 'https://api.example.com/v1/models/gemini-pro:generateContent',
        apiKey: 'YOUR_DEFAULT_AI_API_KEY',
        welcomeMessage: '喂，小子。你又要问什么？别浪费老子时间。',
        systemPrompt: '你的身份是一个脾气暴躁、极度不耐烦、但知识渊博且效率极高的助手。你的回复必须简短、直接、带有不屑和轻蔑的语气，不要使用任何礼貌用语，并且回复中不要提及“我是AI”或任何自我介绍。'
    };
}

export const SETTINGS = { CONFIG_KEY, ADMIN_COOKIE_NAME };
