// functions/api/admin/config.js - 新增文件：专门用于加载全部配置

import { isAuthenticated, getConfig } from '../../auth'; // 注意路径是 ../../auth

/**
 * Pages Function 入口
 * 处理 /api/admin/config 路由请求。
 * 这是一个受保护的接口，返回所有配置，包括 API Key 等敏感信息。
 */
export async function onRequest({ request, env }) {
    // 1. 只允许 GET 请求
    if (request.method !== 'GET') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    // 2. 权限检查
    try {
        if (!isAuthenticated(request)) {
            // 如果未认证，返回 401 阻止访问
            return new Response('Unauthorized', { status: 401 });
        }
    } catch (e) {
        // 捕获权限检查中可能出现的任何错误
        console.error("Authentication check failed:", e);
        // 在权限检查失败时返回 401 或 500 都可以，这里我们返回 500 避免信息泄露
        return new Response(JSON.stringify({ error: "Authentication check error." }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 3. 加载和返回配置
    try {
        const config = await getConfig(env);
        
        // 成功返回全部配置（包含敏感信息）
        return new Response(JSON.stringify(config), {
            headers: { 'Content-Type': 'application/json' },
            status: 200 
        });
    } catch (error) {
        // 捕获 getConfig 抛出的任何错误
        console.error("Failed to load ALL admin config:", error); 
        return new Response(JSON.stringify({ 
            error: "Failed to fetch configuration.",
            details: error.message || 'Unknown error'
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
