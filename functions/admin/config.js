// functions/api/admin/config.js - 必须创建和使用此代码

// 🚨 检查路径是否正确：如果 auth.js 在 functions/auth.js，这里使用 ../../auth
import { isAuthenticated, getConfig } from '../../auth'; 

/**
 * Pages Function 入口
 * 处理 /api/admin/config 路由请求。
 * 这是一个受保护的接口，返回所有配置。
 */
export async function onRequest({ request, env }) {
    if (request.method !== 'GET') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    // 1. 权限检查
    try {
        if (!isAuthenticated(request)) {
            return new Response('Unauthorized', { status: 401 });
        }
    } catch (e) {
        console.error("Authentication check failed:", e);
        return new Response(JSON.stringify({ error: "Authentication check error." }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 2. 加载和返回配置
    try {
        const config = await getConfig(env);
        
        // 成功返回全部配置
        return new Response(JSON.stringify(config), {
            headers: { 'Content-Type': 'application/json' },
            status: 200 
        });
    } catch (error) {
        console.error("Failed to load ALL admin config:", error); 
        return new Response(JSON.stringify({ 
            error: "Failed to fetch configuration. Check code integrity.",
            details: error.message || 'Unknown error'
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
