// /functions/api/chat.js - 使用原生 Fetch API 实现 Streaming

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
    // Cloudflare 环境下，crypto 是全局可用的
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
        if (!config || !config.apiKey || !config.apiUrl) {
            return new Response(JSON.stringify({ error: "API key or URL is not configured in admin panel." }), { status: 500 });
        }
        
        const requestBody = await request.json();
        const userContents = requestBody.contents;
        
        // 1. 获取聊天历史
        let history = await getHistory(env, sessionId);
        let contents = [...history, ...userContents];

        // 2. 构造请求体 (启用 Streaming)
        const geminiRequestBody = {
            contents: contents,
            config: {
                // systemInstruction: config.systemInstruction, // 从配置中读取
            }
        };

        // 3. 开始 Fetch Streaming 请求
        const geminiResponse = await fetch(
            `${config.apiUrl}?key=${config.apiKey}`, // URL 包含 Key
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(geminiRequestBody)
            }
        );

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            throw new Error(`Gemini API returned status ${geminiResponse.status}: ${errorText}`);
        }

        // 4. 创建流式响应对象 (TransformStream)
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();
        
        const reader = geminiResponse.body.getReader();

        // 5. 异步处理流并发送给前端
        async function streamResponse() {
            let fullResponseText = "";
            let newHistoryEntry = { role: "model", parts: [{ text: "" }] };

            try {
                // 持续读取 Gemini 的响应流
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    
                    // 解析 Gemini API 返回的 JSON 块
                    const jsonChunks = chunk.split('\n').filter(s => s.trim() !== '');
                    
                    for (const jsonString of jsonChunks) {
                         try {
                            const data = JSON.parse(jsonString);
                            const chunkText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                            
                            if (chunkText) {
                                // 写入流，前端立即接收
                                await writer.write(encoder.encode(chunkText));
                                fullResponseText += chunkText;
                            }
                        } catch (e) {
                            // 忽略无法解析的块，或在调试时记录错误
                            // console.error("Error parsing chunk:", e, jsonString);
                        }
                    }
                }

                // 6. 响应结束后，更新历史记录
                newHistoryEntry.parts[0].text = fullResponseText;
                contents.push(newHistoryEntry);
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
        const decoder = new TextDecoder();
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
        return new Response(JSON.stringify({ error: `Internal Server Error: ${error.message}` }), { status: 500 });
    }
}
