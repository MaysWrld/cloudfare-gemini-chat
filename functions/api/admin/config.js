// /functions/api/admin/config.js - 最终版本

// 🚨 路径修正：从 '../api/auth' 再次修正为 '../auth' 
import { isAuthenticated, getConfig } from '../auth'; 

/**
 * Pages Function 入口
 * 处理 /api/admin/config 路由请求。
 * 这是一个受保护的接口。
 */
export async function onRequest({ request, env }) {
    if (request.method !== 'GET') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    // 1. 权限检查 (我们已经确保 isAuthenticated 内部不会抛出 500)
    try {
        if (!isAuthenticated(request)) {
            // 如果未认证，返回 401 
            return new Response('Unauthorized', { status: 401 });
        }
    } catch (e) {
        console.error("Critical Error: Authentication check failed during runtime.", e);
        return new Response(JSON.stringify({ error: "Unauthorized access or authentication check error." }), { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 2. 加载和返回配置 (我们已知 getConfig 工作正常)
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
            error: "Failed to fetch configuration.",
            details: error.message || 'Unknown error'
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
