// /functions/api/admin.js - 最终修复版本 (使用 isAuthenticated)

// 注意：原先错误的导入是 "authenticateAdmin"
import { isAuthenticated, getConfig } from '../auth'; 
import { SETTINGS } from '../auth';

/**
 * Pages Function 入口
 * 用于 GET 请求返回当前配置，POST 请求保存新配置。
 */
export async function onRequest({ request, env }) {
    // 1. 检查身份验证 (使用正确的 isAuthenticated)
    if (!isAuthenticated(request)) {
        // 如果未认证，返回 401
        return new Response('Unauthorized Access. Please login via /api/login.', { status: 401 });
    }
    
    // 2. 处理 GET 请求：返回当前配置
    if (request.method === 'GET') {
        const config = await getConfig(env);
        
        // 返回全部配置，因为只有管理员才能访问
        return new Response(JSON.stringify(config), { 
            headers: { 'Content-Type': 'application/json' } 
        });
    }

    // 3. 处理 POST 请求：保存新配置
    if (request.method === 'POST') {
        try {
            const newConfig = await request.json();
            
            // 确保我们只保存预期的字段
            const saveConfig = {
                apiUrl: newConfig.apiUrl || '',
                apiKey: newConfig.apiKey || '',
                welcomeMessage: newConfig.welcomeMessage || '欢迎使用 AI 助手！',
            };

            // 保存到 KV 存储
            await env.CONFIG.put(SETTINGS.CONFIG_KEY, JSON.stringify(saveConfig));

            return new Response(JSON.stringify({ message: "配置已成功保存！" }), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            });

        } catch (error) {
            console.error("Config save error:", error);
            return new Response(JSON.stringify({ error: "保存配置失败，请检查数据格式。" }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }
    }

    // 4. 不支持其他方法
    return new Response('Method Not Allowed', { status: 405 });
}
