// /functions/api/admin.js - 最终完整代码（含配置保存和读取逻辑）

import { isAuthenticated, getConfig, SETTINGS } from '../auth'; 
import { createAuthCookie, validateCredentials } from '../auth'; // 新增导入，用于处理管理员登录（可选，但通常admin路由需要）

// 假设我们有一个专门的 POST /api/admin/login 路由处理登录
// 如果您是使用 Cloudflare Pages 的内置认证功能或 HTTP Basic Auth，则不需要 login 逻辑

export async function onRequest({ request, env }) {
    
    // ------------------ 1. 处理 GET 请求 (读取配置) ------------------
    if (request.method === 'GET') {
        // GET 请求不需要认证。任何人都可以读取配置信息（标题、欢迎语等）
        const config = await getConfig(env);
        // 🚨 注意：这里不会返回敏感的 apiKey，因为它只在 getConfig 内部被使用，
        // 且只在 KV 中没有配置时才使用默认值，但为了前端加载显示，我们需要在返回对象中包含这些字段。
        
        // 确保返回对象中包含前端 UI 所需的所有字段
        const configToReturn = {
            apiUrl: config.apiUrl || '',
            apiKey: config.apiKey || '',
            welcomeMessage: config.welcomeMessage || '欢迎使用 AI 助手！',
            appTitle: config.appTitle || 'AI 助手',
            personaPrompt: config.personaPrompt || '', // 返回 KV 中存储的值（可能包含合并后的指令）
            modelName: config.modelName || 'gemini-2.5-flash',
            temperature: config.temperature || 0.7,
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
            
            // 确保温度在 0.0 到 1.0 之间
            let temperature = parseFloat(newConfig.temperature);
            if (isNaN(temperature) || temperature < 0.0 || temperature > 1.0) {
                // 如果前端传入的温度值无效，则使用安全默认值
                temperature = 0.7; 
            }
            
            const saveConfig = {
                // 基础配置
                apiUrl: newConfig.apiUrl || '',
                apiKey: newConfig.apiKey || '',
                
                // UI / Persona 配置
                welcomeMessage: newConfig.welcomeMessage || '欢迎使用 AI 助手！',
                appTitle: newConfig.appTitle || 'AI 助手',
                // 🚨 关键：这里直接保存前端合并后的完整 Prompt
                personaPrompt: newConfig.personaPrompt || '', 
                
                // 模型和参数配置
                modelName: newConfig.modelName || 'gemini-2.5-flash', 
                temperature: temperature, // 保存校验后的值
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
    
    // ------------------ 4. 其它方法处理 ------------------
    return new Response('Method Not Allowed', { status: 405 });
}
