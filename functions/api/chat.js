// /functions/api/chat.js - 启用对话记忆版本

import { getConfig } from '../auth'; 

const HISTORY_TTL = 3600 * 24; // 历史记录有效期 24 小时 (秒)
const SESSION_COOKIE_NAME = 'chat_session_id';

/**
 * 从 Cookie 中获取或生成一个唯一的 Session ID
 */
function getSessionId(request) {
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) {
        const cookies = cookieHeader.split(';').map(c => c.trim().split('='));
        const sessionId = cookies.find(([name]) => name === SESSION_COOKIE_NAME)?.[1];
        if (sessionId) return sessionId;
    }
    // 如果没有，生成一个新的 UUID (简易版)
    return crypto.randomUUID(); 
}

/**
 * Pages Function 入口
 */
export async function onRequest({ request, env }) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    const config = await getConfig(env);
    const sessionId = getSessionId(request);

    try {
        const clientBody = await request.json();
        let history = [];

        // 1. 从 KV 加载历史记录 (使用新的 env.HISTORY 绑定)
        const historyJson = await env.HISTORY.get(sessionId);
        if (historyJson) {
            history = JSON.parse(historyJson);
        }
        
        // 2. 构造完整的 contents 数组 (历史 + 当前问题)
        // 确保 contents 数组中的每一个元素都有 role 和 parts 字段
        const contents = [...history, ...clientBody.contents];

        // 3. 构造 Gemini API 请求体 (使用完整的 history)
        const geminiRequestBody = JSON.stringify({
            contents: contents,
        });

        const url = `${config.apiUrl}?key=${config.apiKey}`; 

        // 4. 转发请求到 Gemini API
        const aiResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: geminiRequestBody, 
        });

        // 5. 处理 AI 响应
        if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (aiText) {
                // 6. 更新历史记录并保存到 KV
                const newUserMessage = clientBody.contents[0];
                const newAiResponse = { role: 'model', parts: [{ text: aiText }] };
                
                history.push(newUserMessage, newAiResponse);
                
                // 将更新后的历史记录写回 KV (设置有效期)
                await env.HISTORY.put(sessionId, JSON.stringify(history), { expirationTtl: HISTORY_TTL });
            }
            
            // 7. 返回 Gemini API 的原始响应，但附带设置 Session ID 的头部
            const response = new Response(JSON.stringify(aiData), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

            // 设置 Session ID Cookie
            const cookie = `${SESSION_COOKIE_NAME}=${sessionId}; Max-Age=${HISTORY_TTL}; Path=/; HttpOnly; SameSite=Strict`;
            response.headers.set('Set-Cookie', cookie);

            return response;

        } else {
            // 8. 转发错误响应
            return aiResponse; 
        }

    } catch (error) {
        console.error("AI Request Error:", error);
        return new Response(JSON.stringify({ error: "代理请求失败，无法连接到 AI 模型接口。" }), { status: 500 });
    }
}
