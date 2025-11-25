// /functions/api/admin.js

import { authenticateAdmin, getConfig, SETTINGS } from '../auth'; 

export async function onRequest({ request, env }) {
    // 1. 认证检查：如果失败，立刻返回 401 响应
    const authResponse = authenticateAdmin(request, env);
    if (authResponse) return authResponse;

    if (request.method === 'GET') {
        // GET 请求：读取配置并返回给前端表单
        const config = await getConfig(env);
        return new Response(JSON.stringify(config), { 
            headers: { 'Content-Type': 'application/json' } 
        });
    } 
    
    if (request.method === 'POST') {
        // POST 请求：接收前端新数据，写入 KV
        try {
            const newConfig = await request.json();
            const updatedConfig = {
                apiUrl: newConfig.apiUrl,
                apiKey: newConfig.apiKey,
                welcomeMessage: newConfig.welcomeMessage
            };
            
            // 将配置写入 KV
            await env.CONFIG.put(SETTINGS.CONFIG_KEY, JSON.stringify(updatedConfig));

            return new Response(JSON.stringify({ success: true, message: '配置已更新。' }), { 
                headers: { 'Content-Type': 'application/json' }, 
                status: 200 
            });
        } catch (e) {
            return new Response(JSON.stringify({ success: false, error: '无效的 JSON 格式或写入失败。' }), { status: 400 });
        }
    }

    return new Response('Method Not Allowed', { status: 405 });
}
