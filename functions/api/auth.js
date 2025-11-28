// /functions/api/auth.js - 最终超健壮版本

const CONFIG_KEY = 'global_settings';
const ADMIN_COOKIE_NAME = 'admin_logged_in';

export function isAuthenticated(request) {
    // 🚨 关键修复：增加内部 try/catch 来捕获任何原生 API 调用的异常
    try {
        const cookieHeader = request.headers.get('Cookie');
        if (!cookieHeader) return false;
        
        const isLoggedIn = cookieHeader.includes(`${ADMIN_COOKIE_NAME}=true`);
        
        // 如果 Cookie 存在但值不对，打印调试信息
        if (cookieHeader && !isLoggedIn) {
             console.log("DEBUG: Cookie found but not logged in.");
        }
        
        return isLoggedIn;
    } catch (e) {
        // 如果读取 headers 或 Cookie 失败，假设未认证，但记录错误
        console.error("Critical Runtime Error in isAuthenticated:", e);
        return false; // 出现任何错误，都视为未认证
    }
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

// getConfig 保持不变，我们已知它是正常的
export async function getConfig(env) {
    const raw = await env.CONFIG.get(CONFIG_KEY);

    if (raw) {
        try {
            return JSON.parse(raw);
        } catch (e) {
            console.error("致命警告：KV配置JSON格式损坏，使用默认配置。错误:", e);
        }
    }
    
    return {
        apiUrl: 'https://api.example.com/v1/models/gemini-pro:generateContent',
        apiKey: 'YOUR_DEFAULT_AI_API_KEY',
        welcomeMessage: '喂，小子。你又要问什么？别浪费老子时间。',
        systemPrompt: '你的身份是一个脾气暴躁、极度不耐烦、但知识渊博且效率极高的助手。你的回复必须简短、直接、带有不屑和轻蔑的语气，不要使用任何礼貌用语，并且回复中不要提及“我是AI”或任何自我介绍。'
    };
}

export const SETTINGS = { CONFIG_KEY, ADMIN_COOKIE_NAME };
