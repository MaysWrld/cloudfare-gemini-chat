// /functions/api/debug_config.js - 临时调试接口
import { getConfig } from './auth'; // 与 api/chat.js 路径相同

/**
 * 临时接口，用于测试 getConfig 是否能正常工作。
 * 此接口没有权限限制。
 */
export async function onRequest({ env }) {
    try {
        // 直接调用 getConfig
        const config = await getConfig(env);
        
        // 返回配置内容，但隐藏 API Key
        config.apiKey = 'API_KEY_LOADED_SUCCESSFULLY';
        
        return new Response(JSON.stringify(config, null, 2), {
            headers: { 'Content-Type': 'application/json' },
            status: 200 
        });
    } catch (error) {
        // 如果这里返回 500，则问题在 KV 绑定或 getConfig 函数本身
        console.error("DEBUG: Failed to run getConfig:", error); 
        return new Response(JSON.stringify({ 
            error: "DEBUG_500: Failed to load config from KV or environment.",
            details: error.message || 'Unknown error'
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
