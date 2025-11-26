// /functions/api/chat.js - 适用于 Gemini API 的最终完整版本

import { getConfig } from '../auth'; 

/**
 * Pages Function 入口
 * 处理 /api/chat 路由上的请求，并将请求代理到配置的 AI 模型接口。
 */
export async function onRequest({ request, env }) {
    // 1. 检查请求方法
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    // 2. 获取配置
    // 注意：/api/chat 是一个公开接口，不应该在这里做认证检查
    const config = await getConfig(env);
    
    // 检查是否有配置信息，特别是 API Key
    if (!config.apiKey || !config.apiUrl) {
        return new Response(JSON.stringify({ 
            error: "API 接口或密钥未配置，请访问 /admin.html 进行设置。", 
            status: 400 
        }), { 
            status: 400, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }

    try {
        // *** 核心代理逻辑 ***
        
        // Gemini API 认证要求 Key 必须作为查询参数 'key' 附加在 URL 上。
        const url = `${config.apiUrl}?key=${config.apiKey}`; 

        // 转发请求到 AI 模型 API
        const aiResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // *** 关键：不设置 Authorization 头部 ***
            },
            // 使用 request.body 转发客户端发送的 JSON 内容
            body: request.body, 
        });

        // 返回 AI 接口的原始响应（包括状态码、头部和内容）
        return aiResponse; 

    } catch (error) {
        console.error("AI Request Error:", error);
        return new Response(JSON.stringify({ error: "代理请求失败，无法连接到 AI 模型接口。" }), { status: 500 });
    }
}
