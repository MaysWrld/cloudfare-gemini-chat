// /functions/admin/config.js - 最终健壮版本

// 确保路径正确：../api/auth
import { isAuthenticated, getConfig } from '../api/auth'; 

/**
 * Pages Function 入口
 * 处理 /admin/config 路由请求。这是一个受保护的接口。
 */
export async function onRequest({ request, env }) {
    if (request.method !== 'GET') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    // 1. 权限检查 (增加外部try/catch，彻底防止 500 异常冒泡)
    try {
        if (!isAuthenticated(request)) {
            // 如果未认证，返回 401 
            return new Response('Unauthorized', { status: 401 });
        }
    } catch (e) {
        // 🚨 关键修复：如果 isAuthenticated 内部抛出异常（例如读取 Cookie 失败）
        console.error("Critical Error: Authentication check failed during runtime (Cookie access/format issue).", e);
        // 返回 403 Forbidden 或 401 Unauthorized，而不是 500。
        // 返回 401，让前端知道需要登录。
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
        // 如果 getConfig 意外失败，返回 500
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
