// /functions/api/chat.js - Streaming Version
// 依赖于 auth.js 导出的 getConfig, getHistory, saveHistory 函数

import { GoogleGenAI } from '@google/genai';
// 假设 auth.js 导出 getConfig, getHistory, saveHistory
import { getConfig, getHistory, saveHistory } from '../auth'; 

const SESSION_COOKIE_NAME = 'chat_session_id';

function getSessionId(request) {
    const cookieHeader = request.headers.get('Cookie');
    if (!cookieHeader) return null;
    
    const cookies = cookieHeader.split(';').map(c => c.trim().split('='));
    const sessionId = cookies.find(([name]) => name === SESSION_COOKIE_NAME)?.[1];
    
    if (sessionId) return sessionId;

    // 如果不存在，生成一个新的 Session ID
    const newSessionId = crypto.randomUUID();
    return newSessionId;
}

export async function onRequest({ request, env }) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    const sessionId = getSessionId(request);

    try {
        const config = await getConfig(env);
        if (!config || !config.apiKey) {
            return new Response(JSON.stringify({ error: "API key is not configured in admin panel." }), { status: 500 });
        }
        
        const requestBody = await request.json();
        const userContents = requestBody.contents;

        // 1. 获取聊天历史
        let history = await getHistory(env, sessionId);
        let contents = [...history, ...userContents];

        // 2. 初始化 Gemini 客户端
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        
        // 3. 开始流式请求
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash', // 使用的模型，可从配置中读取
            contents: contents,
            config: {
                systemInstruction: config.systemInstruction, // 从配置中读取系统指令
            }
        });

        // 4. 创建流式响应对象 (TransformStream)
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        // 5. 异步处理流并发送给前端
        async function streamResponse() {
            let fullResponseText = "";
            let newHistoryEntry = { role: "model", parts: [{ text: "" }] };

            try {
                for await (const chunk of responseStream) {
                    const chunkText = chunk.text;
                    if (chunkText) {
                        // 写入流，前端立即接收
                        await writer.write(encoder.encode(chunkText));
                        fullResponseText += chunkText;
                    }
                }

                // 6. 响应结束后，更新历史记录
                newHistoryEntry.parts[0].text = fullResponseText;
                contents.push(newHistoryEntry);
                // 限制历史记录长度，避免 KV 存储过大
                const MAX_HISTORY_LENGTH = 20; 
                const trimmedContents = contents.slice(contents.length - MAX_HISTORY_LENGTH);
                
                await saveHistory(env, sessionId, trimmedContents);

            } catch (error) {
                console.error("Streaming error:", error);
                await writer.write(encoder.encode(`\n[STREAM ERROR: ${error.message || 'API stream failed.'}]`));
            } finally {
                await writer.close();
            }
        }

        // 立即开始流式处理
        streamResponse();

        // 7. 返回流式响应
        const headers = { 
            'Content-Type': 'text/plain; charset=utf-8',
        };
        // 仅在 Cookie 不存在时设置新的 Session ID Cookie
        if (!request.headers.get('Cookie')?.includes(`${SESSION_COOKIE_NAME}=${sessionId}`)) {
             headers['Set-Cookie'] = `${SESSION_COOKIE_NAME}=${sessionId}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${60 * 60 * 24 * 30}`; // 30天有效期
        }

        return new Response(readable, { headers });

    } catch (error) {
        console.error("API Chat Setup Error:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
}
