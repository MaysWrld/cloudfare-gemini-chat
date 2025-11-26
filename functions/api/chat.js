// /functions/api/chat.js - 最终稳定且启用对话记忆版本

import { getConfig } from '../auth'; 

const HISTORY_TTL = 3600 * 24; // 历史记录有效期 24 小时 (秒)
const SESSION_COOKIE_NAME = 'chat_session_id';

/**
 * 从 Cookie 中获取或生成一个唯一的 Session ID，并设置 Set-Cookie 头部。
 * @returns {{ sessionId: string, setCookieHeader: string | null }}
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
        // 使用更具兼容性的ID生成方法 (修复点)
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

    const config = await getConfig(env);
    // 获取或生成 Session ID 和 Set-Cookie 头部
    const { sessionId, setCookieHeader } = getSessionData(request);

    try {
        const clientBody = await request.json();
        let history = [];

        // 1. 从 KV 加载历史记录 (使用 env.HISTORY 绑定)
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

        // 4. 准备 API 接口 URL (Gemini 兼容的 Key 查询参数)
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
                
                // 将更新后的历史记录写回 KV (设置有效期)
                await env.HISTORY.put(sessionId, JSON.stringify(history), { expirationTtl: HISTORY_TTL });
            }
            
            // 8. 构造最终返回给客户端的响应对象 (成功路径)
            const response = new Response(JSON.stringify(aiData), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

            // 9. 确保 Session ID Cookie 被设置 (修复点：无论成功失败，只要需要就设置)
            if (setCookieHeader) {
                response.headers.set('Set-Cookie', setCookieHeader);
            }

            return response;

        } else {
            // 10. 如果 AI API 返回错误状态（非 200/ok）
            
            // 复制错误响应的内容和状态
            const errorBody = await aiResponse.text();
            const errorResponse = new Response(errorBody, {
                status: aiResponse.status,
                headers: { 'Content-Type': aiResponse.headers.get('Content-Type') || 'application/json' }
            });
            
            // 确保 Session ID Cookie 被设置 (修复点：即使是错误响应，也要建立会话)
            if (setCookieHeader) {
                errorResponse.headers.set('Set-Cookie', setCookieHeader);
            }
            return errorResponse;
        }

    } catch (error) {
        console.error("AI Request Error:", error);
        return new Response(JSON.stringify({ error: "代理请求失败，无法连接到 AI 模型接口。" }), { status: 500 });
    }
}
