// /functions/api/chat.js (Gemini API 兼容版)

import { getConfig } from '../auth'; 

export async function onRequest({ request, env }) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    const config = await getConfig(env);
    
    try {
        // *** 关键修改 1: 创建带 API Key 查询参数的 URL ***
        // Gemini API 认证要求 Key 必须作为查询参数 'key' 附加在 URL 上。
        const url = `${config.apiUrl}?key=${config.apiKey}`; 

        const aiResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // *** 关键修改 2: 移除 Authorization 头部 ***
            },
            body: request.body, // 转发客户端发送的对话内容
        });

        return aiResponse; 

    } catch (error) {
        console.error("AI Request Error:", error);
        return new Response(JSON.stringify({ error: "无法连接到 AI 模型接口。" }), { status: 500 });
    }
}
