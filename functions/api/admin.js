// /functions/api/admin.js - 最终完整代码（含配置保存和读取逻辑）

import { isAuthenticated, getConfig, SETTINGS } from '../auth'; 
import { createAuthCookie, validateCredentials } from '../auth'; 

export async function onRequest({ request, env }) {
    
    // ------------------ 1. 处理 GET 请求 (读取配置) ------------------
    if (request.method === 'GET') {
        const config = await getConfig(env);
        
        // 确保返回对象中包含前端 UI 所需的所有字段
        const configToReturn = {
            apiUrl: config.apiUrl || '',
            apiKey: config.apiKey || '',
            welcomeMessage: config.welcomeMessage || '欢迎使用 AI 助手！',
            appTitle: config.appTitle || 'AI 助手',
            personaPrompt: config.personaPrompt || '',
            modelName: config.modelName || 'gemini-2.5-flash',
            temperature: config.temperature || 0.7,
            
            // 🚀 新增：Google 搜索配置
            googleSearchApiKey: config.googleSearchApiKey || '',
            googleCxId: config.googleCxId || '',
        };
        
        return new Response(JSON.stringify(configToReturn), { 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
    
    // ------------------ 2. 认证只针对 POST 请求 (保存配置) ------------------
    if (request.method === 'POST') {
        // 检查认证状态
        if (!isAuthenticated(request)) {
            return new Response(JSON.stringify({ error: 'Unauthorized Access. Please log in.' }), { 
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 3. 认证成功，处理 POST 请求（保存配置）
        try {
            const newConfig = await request.json();
            
            let temperature = parseFloat(newConfig.temperature);
            if (isNaN(temperature) || temperature < 0.0 || temperature > 1.0) {
                temperature = 0.7; 
            }
            
            const saveConfig = {
                // 基础配置
                apiUrl: newConfig.apiUrl || '',
                apiKey: newConfig.apiKey || '',
                
                // UI / Persona 配置
                welcomeMessage: newConfig.welcomeMessage || '欢迎使用 AI 助手！',
                appTitle: newConfig.appTitle || 'AI 助手',
                personaPrompt: newConfig.personaPrompt || '', 
                
                // 模型和参数配置
                modelName: newConfig.modelName || 'gemini-2.5-flash', 
                temperature: temperature, 
                
                // 🚀 新增：保存 Google 搜索配置
                googleSearchApiKey: newConfig.googleSearchApiKey || '',
                googleCxId: newConfig.googleCxId || '',
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
