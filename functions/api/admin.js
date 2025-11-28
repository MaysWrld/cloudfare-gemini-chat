// /functions/api/admin.js - 升级版：支持保存 AI 风格指令和应用标题

import { isAuthenticated, getConfig, SETTINGS } from '../auth'; 

export async function onRequest({ request, env }) {
    
    // 1. 检查认证状态
    if (!isAuthenticated(request)) {
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
            
            // ------------------ 🚨 关键改动：新增配置字段 🚨 ------------------
            const saveConfig = {
                // 原有字段
                apiUrl: newConfig.apiUrl || '',
                apiKey: newConfig.apiKey || '',
                welcomeMessage: newConfig.welcomeMessage || '欢迎使用 AI 助手！',
                
                // 新增字段
                appTitle: newConfig.appTitle || 'AI 助手', // 默认值
                personaPrompt: newConfig.personaPrompt || '你是一个友好的AI助手。', // 默认值
            };
            // -------------------------------------------------------------------------

            // 假设 env.CONFIG 是您的 KV 绑定
            // 假设 SETTINGS.CONFIG_KEY 是保存配置的 KV 键名
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
