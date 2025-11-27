// /functions/api/new_chat.js

const SESSION_COOKIE_NAME = 'chat_session_id';

export async function onRequest() {
    // 假设您的站点是 HTTPS，因此 Secure 标志应设置为 true
    const isSecure = true; 
    
    // 关键：设置 Max-Age=0，立即告知浏览器删除 chat_session_id 这个 Cookie
    const setCookieHeader = `${SESSION_COOKIE_NAME}=deleted; Max-Age=0; Path=/; HttpOnly; SameSite=Strict; ${isSecure ? 'Secure' : ''}`;
    
    // 返回成功响应，同时附带删除 Cookie 的指令
    return new Response(JSON.stringify({ status: "History cookie deleted" }), {
        status: 200,
        headers: { 
            'Content-Type': 'application/json',
            'Set-Cookie': setCookieHeader // 浏览器读取此头部就会删除 Cookie
        }
    });
}
