// /functions/api/chat.js - 启用对话记忆版本 (内联 getConfig)

// const { getConfig } = require('../auth');  <-- 移除这个导入

const HISTORY_TTL = 3600 * 24; 
const SESSION_COOKIE_NAME = 'chat_session_id';
const CONFIG_KEY = 'global_settings'; // 从 auth.js 复制的常量

/**
 * [内联] getConfig: 从 KV 存储中读取最新的配置。
 */
async function getConfig(env) {
    const raw = await env.CONFIG.get(CONFIG_KEY); 

    if (raw) {
        try { 
            return JSON.parse(raw); 
        } catch (e) { 
            console.error("Error parsing KV config:", e); 
        }
    }

    // 返回默认配置
    return {
        apiUrl: 'https://api.example.com/v1/models/gemini-pro:generateContent', 
        apiKey: 'YOUR_DEFAULT_AI_API_KEY', 
        welcomeMessage: '欢迎使用 AI 助手！请访问管理后台配置 API 接口。',
    };
}


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
    
    if (!sessionId) {
        sessionId = (Date.now() + Math.random()).toString(36).replace('.', '');
        
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

    const config = await getConfig(env); // <-- 现在调用的是内联函数
    const { sessionId, setCookieHeader } = getSessionData(request);

    try {
        const clientBody = await request.json();
        let history = [];

        // 1. 从 KV 加载历史记录 (env.HISTORY 绑定)
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

        // 4. 准备 API 接口 URL
        const url = `${config.apiUrl}?key=${config.apiKey}`; 

        // 5. 转发请求到 Gemini API
        const aiResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: geminiRequestBody, 
        });

        // 6. 处理 AI 响应
        if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (aiText) {
                // 7. 更新历史记录并保存到 KV
                const newUserMessage = clientBody.contents[0]; 
                const newAiResponse = { role: 'model', parts: [{ text: aiText }] }; 
                
                history.push(newUserMessage, newAiResponse);
                
                await env.HISTORY.put(sessionId, JSON.stringify(history), { expirationTtl: HISTORY_TTL });
            }
            
            // 8. 构造最终返回给客户端的响应对象
            const response = new Response(JSON.stringify(aiData), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

            // 9. 确保 Session ID Cookie 被设置
            if (setCookieHeader) {
                response.headers.set('Set-Cookie', setCookieHeader);
            }

            return response;

        } else {
            // 10. 错误路径：确保 Set-Cookie 头部也被设置
            const errorBody = await aiResponse.text();
            const errorResponse = new Response(errorBody, {
                status: aiResponse.status,
                headers: { 'Content-Type': aiResponse.headers.get('Content-Type') || 'application/json' }
            });
            
            if (setCookieHeader) {
                errorResponse.headers.set('Set-Cookie', setCookieHeader);
            }
            return errorResponse;
        }

    } catch (error) {
        console.error("AI Request Error:", error);
        return new Response(JSON.stringify({ error: "代理请求失败，或致命运行时错误。" }), { status: 500 });
    }
}
