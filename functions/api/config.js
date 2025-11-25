// /functions/api/config.js

import { getConfig } from '../auth'; 

export async function onRequest({ env }) {
    if (request.method !== 'GET') {
        return new Response('Method Not Allowed', { status: 405 });
    }
    
    // 从 KV 获取全部配置
    const config = await getConfig(env);
    
    // 只返回非敏感信息（例如：欢迎语），API Key 等敏感信息不会暴露
    const publicConfig = {
        welcomeMessage: config.welcomeMessage,
        // 如果未来需要其他公共设置，可以放在这里
    };

    return new Response(JSON.stringify(publicConfig), { 
        headers: { 'Content-Type': 'application/json' } 
    });
}
