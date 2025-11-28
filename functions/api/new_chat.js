// /functions/api/new_chat.js - 修正版：允许所有用户清除自己的历史记录

// 确保这里移除了 isAuthenticated 的导入
import { SETTINGS } from '../auth'; 

const SESSION_COOKIE_NAME = 'chat_session_id';

function getSessionId(request) {
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) {
        const cookies = cookieHeader.split(';').map(c => c.trim().split('='));
        const sessionId = cookies.find(([name]) => name === SESSION_COOKIE_NAME)?.[1];
        return sessionId;
    }
    return null;
}

export async function onRequest({ request, env }) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    // ------------------ 修正点：已移除身份验证检查 ------------------
    /* if (!isAuthenticated(request)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    */
    // ------------------------------------------------------------------
    
    const sessionId = getSessionId(request);

    if (sessionId) {
        try {
            // 假设 env.HISTORY 是您的 KV 绑定
            await env.HISTORY.delete(sessionId);
            
            return new Response(JSON.stringify({ message: "历史记录已清除" }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error("KV Delete Error:", error);
            // 返回 500 状态码
            return new Response(JSON.stringify({ error: "清除历史记录失败。KV操作错误。" }), { status: 500 });
        }
    } else {
        // 没有活动的会话ID，仍然返回 200 让前端继续刷新
        return new Response(JSON.stringify({ message: "没有活动的会话ID，无需清除。" }), { status: 200 });
    }
}
