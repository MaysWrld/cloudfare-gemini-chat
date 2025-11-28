// /functions/api/config.js - 优化版

import { getConfig } from '../auth'; 

/**
 * Pages Function 入口
 * 处理 /api/config 路由请求，返回非敏感的公共配置（如欢迎语）。
 * 此接口不需要认证。
 */
export async function onRequest({ request, env }) {
    // 只允许 GET 请求
    if (request.method !== 'GET') {
        return new Response('Method Not Allowed', { status: 405 });
    }
    
    let config = {};
    try {
        // 从 KV 获取全部配置
        config = await getConfig(env);
    } catch (error) {
        console.error("KV getConfig Error:", error);
        // 如果 KV 整个读取失败，仍然返回 200，但数据为空，让前端处理回退逻辑
        const fallbackConfig = {
            welcomeMessage: null,
        };
        return new Response(JSON.stringify(fallbackConfig), { 
            headers: { 'Content-Type': 'application/json' },
            status: 200, // 返回 200，让前端的 fetch.ok 为 true
        });
    }

    // 只返回非敏感信息（例如：欢迎语），API Key 等敏感信息不会暴露
    const publicConfig = {
        // 如果 welcomeMessage 字段不存在或为空，则返回 null，让前端使用默认值
        welcomeMessage: config.welcomeMessage || null,
    };

    // 成功返回 JSON (总是返回 200 状态，除非 Method 不允许)
    return new Response(JSON.stringify(publicConfig), { 
        headers: { 'Content-Type': 'application/json' },
        status: 200
    });
}
