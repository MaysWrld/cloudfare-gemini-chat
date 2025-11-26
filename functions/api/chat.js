// /functions/api/chat.js - 隔离 getConfig 调试版本

import { getConfig } from '../auth'; 

const HISTORY_TTL = 3600 * 24; // 历史记录有效期 24 小时 (秒)
const SESSION_COOKIE_NAME = 'chat_session_id';

/**
 * 从 Cookie 中获取或生成一个唯一的 Session ID，并设置 Set-Cookie 头部。
 */
function getSessionData(request) {
    const cookieHeader = request.headers.get('Cookie');
    let sessionId;
    let setCookieHeader = null;

    if (cookieHeader) {
        const cookies = cookieHeader.split(';').map(c => c.trim().split('='));
        const existingSessionId = cookies.find(([name]) => name === SESSION_COOKIE_NAME)?.[1];
        if (existingSessionId) {
            sessionId = existingSessionId;
        }
    }
    
    // 如果没有或无效，则生成一个新的
    if (!sessionId) {
        sessionId = (Date.now() + Math.random()).toString(36).replace('.', '');
        
        // 构造 Set-Cookie 头部
        const isSecure = request.url.startsWith('https://');
        setCookieHeader = `${SESSION_COOKIE_NAME}=${sessionId}; Max-Age=${HISTORY_TTL}; Path=/; HttpOnly; SameSite=Strict${isSecure ? '; Secure' : ''}`;
    }

    return { sessionId, setCookieHeader };
}

/**
 * Pages Function 入口
 */
export async function onRequest({ request, env }) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    // *** 隔离 getConfig 语句 (嫌疑人A) ***
    // const config = await getConfig(env); // 原始代码，现在被跳过
    const config = { apiUrl: 'DEBUG_URL', apiKey: 'DEBUG_KEY' }; // 使用虚拟配置，以避免 env.CONFIG 绑定错误

    const { sessionId, setCookieHeader } = getSessionData(request);

    try {
        // --- 测试点 A: 检查是否能成功运行到 try 块内 ---
        const TEST_RESPONSE = new Response(JSON.stringify({ debug: "header_test_A_ok" }), { 
            status: 501, 
            headers: { 'X-Debug-A': 'CodeReachedHere' } 
        });
        return TEST_RESPONSE;
        // ------------------------------------------------

        const clientBody = await request.json();
        let history = [];

        // 1. 从 KV 加载历史记录 (使用 env.HISTORY 绑定)
        // 注意：如果 env.HISTORY 绑定错误，代码会在这里出错
        const historyJson = await env.HISTORY.get(sessionId);
        if (historyJson) {
            history = JSON.parse(historyJson);
        }
        
        // 2. 构造完整的 contents 数组 (历史 + 当前问题)
        const contents = [...history, ...clientBody.contents];

        // 3. 构造 Gemini API 请求体
        const geminiRequestBody = JSON.stringify({
            contents: contents,
        });

        // 4. 准备 API 接口 URL (使用 DEBUG_URL)
        const url = `${config.apiUrl}?key=${config.apiKey}`; 

        // 5. 转发请求到 Gemini API (此段代码理论上不会运行)
        const aiResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: geminiRequestBody, 
        });

        // ... (以下代码理论上不会运行) ...

        return new Response(JSON.stringify({ error: "Debug mode active" }), { status: 500 });

    } catch (error) {
        console.error("AI Request Error:", error);
        return new Response(JSON.stringify({ error: "代理请求失败，或致命运行时错误。" }), { status: 500 });
    }
}
