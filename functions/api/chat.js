// /functions/api/chat.js

import { getConfig } from '../auth'; 

export async function onRequest({ request, env }) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    // 1. 从 KV 获取最新的配置，包括 API URL 和 Key
    const config = await getConfig(env);
    
    // 2. 转发请求到 AI 模型 API
    try {
        const aiResponse = await fetch(config.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 在后端安全地使用 API Key，假设您的模型要求 Bearer 令牌
                'Authorization': `Bearer ${config.apiKey}` 
            },
            body: request.body, // 转发客户端发送的对话内容
        });

        // 3. 将 AI 模型的响应（包括流式数据）直接返回给客户端
        return aiResponse; 

    } catch (error) {
        console.error("AI Request Error:", error);
        return new Response(JSON.stringify({ error: "无法连接到 AI 模型接口。" }), { status: 500 });
    }
}
