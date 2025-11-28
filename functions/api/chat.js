// /functions/api/chat.js - 最终稳定且启用对话记忆版本 (升级支持 System Prompt)

import { getConfig } from '../auth'; // 注意：使用导入，不使用内联

const HISTORY_TTL = 3600 * 24;
const SESSION_COOKIE_NAME = 'chat_session_id';

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

    // 1. 获取配置和会话数据
    const config = await getConfig(env);
    const { sessionId, setCookieHeader } = getSessionData(request);

    try {
        const clientBody = await request.json();
        let history = [];

        // 2. 加载历史记录
        const historyJson = await env.HISTORY.get(sessionId);
        if (historyJson) {
            history = JSON.parse(historyJson);
        }
        
        // 3. 整合历史记录和用户新消息
        const contents = [...history, ...clientBody.contents];
        
        // 🌟 关键修改 A: 获取系统提示词
        const systemPrompt = config.systemPrompt || ''; // 如果配置不存在，默认为空
        
        // 🌟 关键修改 B: 构建包含 systemInstruction 的请求体
        const geminiRequestBodyObject = { 
            contents: contents,
            // 只有当 systemPrompt 有值时，才添加 config 字段
            ...(systemPrompt && { 
                config: {
                    systemInstruction: systemPrompt 
                } 
            })
        };

        const geminiRequestBody = JSON.stringify(geminiRequestBodyObject);
        
        const url = `${config.apiUrl}?key=${config.apiKey}`; 

        // 4. 发送请求给 Gemini API
        const aiResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: geminiRequestBody, 
        });

        // 5. 处理响应和保存历史记录
        if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (aiText) {
                const newUserMessage = clientBody.contents[0]; 
                const newAiResponse = { role: 'model', parts: [{ text: aiText }] }; 
                
                // 将新的问答对存入历史记录
                history.push(newUserMessage, newAiResponse);
                
                await env.HISTORY.put(sessionId, JSON.stringify(history), { expirationTtl: HISTORY_TTL });
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
            // ... 错误处理逻辑保持不变 ...
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
