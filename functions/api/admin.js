// /functions/api/admin.js - 最终修复版

import { isAuthenticated, getConfig, SETTINGS } from '../auth'; 

export async function onRequest({ request, env }) {
    if (!isAuthenticated(request)) {
        return new Response('Unauthorized Access. Please login via /api/login.', { status: 401 });
    }
    
    if (request.method === 'GET') {
        const config = await getConfig(env);
        return new Response(JSON.stringify(config), { 
            headers: { 'Content-Type': 'application/json' } 
        });
    }

    if (request.method === 'POST') {
        try {
            const newConfig = await request.json();
            
            const saveConfig = {
                apiUrl: newConfig.apiUrl || '',
                apiKey: newConfig.apiKey || '',
                welcomeMessage: newConfig.welcomeMessage || '欢迎使用 AI 助手！',
            };

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
