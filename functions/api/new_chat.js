// /functions/api/new_chat.js - 清除历史记录

import { isAuthenticated, SETTINGS } from '../auth';

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

    if (!isAuthenticated(request)) {
        // 确保只有管理员或至少有某种身份验证的用户才能清除会话
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

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
            return new Response(JSON.stringify({ error: "清除历史记录失败。" }), { status: 500 });
        }
    } else {
        return new Response(JSON.stringify({ message: "没有活动的会话ID，无需清除。" }), { status: 200 });
    }
}
