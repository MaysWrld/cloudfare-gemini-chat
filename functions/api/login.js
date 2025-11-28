// /functions/api/login.js - 最终修复版

import { validateCredentials, createAuthCookie } from './auth';

export async function onRequest({ request, env }) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { username, password } = await request.json();

        if (validateCredentials(username, password, env)) {
            const headers = createAuthCookie(request, env);
            
            return new Response(JSON.stringify({ message: "登录成功" }), {
                status: 200,
                headers: { 
                    'Content-Type': 'application/json',
                    ...headers 
                }
            });
        } else {
            return new Response(JSON.stringify({ error: "用户名或密码错误" }), { 
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        console.error("Login API Error:", error);
        return new Response(JSON.stringify({ error: "服务器处理登录请求失败" }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
