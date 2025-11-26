// /functions/api/config.js - 最终完整代码

import { getConfig } from '../auth'; 

/**
 * Pages Function 入口
 * 处理 /api/config 路由请求，返回非敏感的公共配置（如欢迎语）。
 * 此接口不需要认证。
 */
export async function onRequest({ request, env }) {
    // 只允许 GET 请求
    if (request.method !== 'GET') {
        return new Response('Method Not Allowed', { status: 405 });
    }
    
    // 从 KV 获取全部配置
    const config = await getConfig(env);
    
    // 只返回非敏感信息（例如：欢迎语），API Key 等敏感信息不会暴露
    const publicConfig = {
        welcomeMessage: config.welcomeMessage,
    };

    // 如果 welcomeMessage 字段不存在，说明配置尚未完全写入或 KV 读取失败
    if (!publicConfig.welcomeMessage) {
        // 返回一个 404/400 状态，让前端知道配置未加载
         return new Response(JSON.stringify({ 
            error: "Public configuration (welcome message) not found in KV." 
        }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 成功返回 JSON
    return new Response(JSON.stringify(publicConfig), { 
        headers: { 'Content-Type': 'application/json' } 
    });
}
