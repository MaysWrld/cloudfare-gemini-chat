// /functions/api/admin.js - 最终修复版

import { isAuthenticated, getConfig, SETTINGS } from '../auth'; 

export async function onRequest({ request, env }) {
    
    // 1. 检查认证状态
    if (!isAuthenticated(request)) {
        // ✨ 修改：认证失败时返回 JSON 格式的 401 Unauthorized 响应
        return new Response(JSON.stringify({ error: 'Unauthorized Access. Please log in.' }), { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    // 2. 认证成功，处理 GET 请求（读取配置）
    if (request.method === 'GET') {
        const config = await getConfig(env);
        return new Response(JSON.stringify(config), { 
            headers: { 'Content-Type': 'application/json' } 
        });
    }

    // 3. 认证成功，处理 POST 请求（保存配置）
    if (request.method === 'POST') {
        try {
            const newConfig = await request.json();
            
            // 保留您的原有的数据清理/结构化逻辑
            const saveConfig = {
                apiUrl: newConfig.apiUrl || '',
                apiKey: newConfig.apiKey || '',
                welcomeMessage: newConfig.welcomeMessage || '欢迎使用 AI 助手！',
            };

            // 假设 env.CONFIG 是您的 KV 绑定
            await env.CONFIG.put(SETTINGS.CONFIG_KEY, JSON.stringify(saveConfig));

            return new Response(JSON.stringify({ message: "配置已成功保存！" }), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            });

        } catch (error) {
            console.error("Config save error:", error);
            return new Response(JSON.stringify({ error: "保存配置失败，请检查 KV 绑定或数据格式。" }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }
    }

    return new Response('Method Not Allowed', { status: 405 });
}
