// /functions/api/chat.js - 最终稳定且启用对话记忆版本 (已集成动态风格指令)

import { getConfig } from '../auth'; 

const HISTORY_TTL = 3600 * 24;
const SESSION_COOKIE_NAME = 'chat_session_id';
const MAX_HISTORY_MESSAGES = 10; // 限制历史记录，防止超出上下文窗口

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

export async function onRequest({ request, env }) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    const config = await getConfig(env);
    const { sessionId, setCookieHeader } = getSessionData(request);

    try {
        const clientBody = await request.json();
        let history = [];

        const historyJson = await env.HISTORY.get(sessionId);
        if (historyJson) {
            history = JSON.parse(historyJson);
        }
        
        // ------------------ 🚨 关键改动：集成动态风格指令 🚨 ------------------
        // 从 config 中读取指令，如果 KV 中没有，则使用默认值
        const personaPrompt = config.personaPrompt || "你是一个友好的AI助手。"; 
        
        // 1. 构造系统指令消息 (以 user 身份发送，并让 AI 确认)
        const systemInstruction = {
            role: "user", 
            parts: [{ text: `系统指令：${personaPrompt}` }]
        };
        const systemResponse = { 
            role: "model", 
            parts: [{ text: "好的，收到指令，我们将以该风格进行对话。" }] 
        };
        
        // 2. 组合内容：将系统指令、确认回复放在历史记录之前
        // 注意：这里的 history 是旧的历史记录
        const contents = [
            systemInstruction,
            systemResponse,
            ...history, 
            ...clientBody.contents // 用户的最新消息
        ];
        // -------------------------------------------------------------------------
        
        const geminiRequestBody = JSON.stringify({ contents: contents });
        const url = `${config.apiUrl}?key=${config.apiKey}`; 

        const aiResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: geminiRequestBody, 
        });

        if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (aiText) {
                const newUserMessage = clientBody.contents[0]; 
                const newAiResponse = { role: 'model', parts: [{ text: aiText }] };
                
                // 将新消息和回复加入历史
                history.push(newUserMessage, newAiResponse);
                
                // 限制历史记录长度
                const finalHistory = history.slice(-MAX_HISTORY_MESSAGES);
                
                await env.HISTORY.put(sessionId, JSON.stringify(finalHistory), { expirationTtl: HISTORY_TTL });
            }
            
            const response = new Response(JSON.stringify(aiData), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

            if (setCookieHeader) {
                response.headers.set('Set-Cookie', setCookieHeader);
            }

            return response;

        } else {
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
