// /functions/api/admin.js - 修正版：允许 GET 请求（读取配置）免认证访问

import { isAuthenticated, getConfig, SETTINGS } from '../auth'; 

export async function onRequest({ request, env }) {
    
    // ------------------ 修正点 1: 处理 GET 请求 (读取配置) ------------------
    if (request.method === 'GET') {
        // GET 请求不需要认证。任何人都可以读取配置信息（标题、欢迎语等）
        const config = await getConfig(env);
        return new Response(JSON.stringify(config), { 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
    // --------------------------------------------------------------------------

    // ------------------ 修正点 2: 认证只针对 POST 请求 (保存配置) ------------------
    // 1. 检查认证状态（只对非 GET 请求，如 POST、PUT、DELETE 等）
    if (!isAuthenticated(request)) {
        return new Response(JSON.stringify({ error: 'Unauthorized Access. Please log in.' }), { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    // ----------------------------------------------------------------------------------
    
    // 2. 认证成功，处理 POST 请求（保存配置）
    if (request.method === 'POST') {
        try {
            const newConfig = await request.json();
            
            // ------------------ 🚨 关键改动：新增模型和温度字段 🚨 ------------------
            // 确保温度在 0.0 到 1.0 之间
            let temperature = parseFloat(newConfig.temperature);
            if (isNaN(temperature) || temperature < 0.0 || temperature > 1.0) {
                temperature = 0.7; // 默认值
            }
            
            const saveConfig = {
                // 基础配置
                apiUrl: newConfig.apiUrl || '',
                apiKey: newConfig.apiKey || '',
                welcomeMessage: newConfig.welcomeMessage || '欢迎使用 AI 助手！',
                
                // 动态 UI / Persona 配置
                appTitle: newConfig.appTitle || 'AI 助手',
                personaPrompt: newConfig.personaPrompt || '你是一个友好的AI助手。',
                
                // 模型和参数配置 (新增)
                modelName: newConfig.modelName || 'gemini-2.5-flash', // 默认模型
                temperature: temperature, 
            };
            // -------------------------------------------------------------------------

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
