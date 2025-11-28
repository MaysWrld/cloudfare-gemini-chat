// /functions/api/chat.js - 升级版：支持动态模型和温度参数

import { isAuthenticated, getConfig } from '../auth';

const MAX_HISTORY_MESSAGES = 10; // 最大历史消息数量

const SESSION_COOKIE_NAME = 'chat_session_id';
const COOKIE_TTL_SECONDS = 3600 * 24 * 30; // 30天

/**
 * 辅助函数：从请求头中获取会话ID (Session ID)
 * @param {Request} request 
 * @returns {string | null}
 */
function getSessionId(request) {
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) {
        const cookies = cookieHeader.split(';').map(c => c.trim().split('='));
        const sessionId = cookies.find(([name]) => name === SESSION_COOKIE_NAME)?.[1];
        return sessionId;
    }
    return null;
}

/**
 * 辅助函数：生成一个唯一的 Session ID (UUID)
 * @returns {string}
 */
function generateUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}


/**
 * 辅助函数：将历史消息转换为 Gemini API 格式
 * @param {Array} history 
 * @param {string} userMessage 
 * @param {string} personaPrompt
 * @returns {Array<Object>}
 */
function buildGeminiContents(history, userMessage, personaPrompt) {
    const contents = [];

    // 1. 插入 AI 风格指令作为 System 角色
    if (personaPrompt) {
        contents.push({
            role: "system",
            parts: [{ text: personaPrompt }]
        });
    }

    // 2. 插入历史消息 (最多 MAX_HISTORY_MESSAGES 条)
    const historyToUse = history.slice(-MAX_HISTORY_MESSAGES);
    
    for (const msg of historyToUse) {
        contents.push({
            role: msg.role === 'user' ? 'user' : 'model', // 转换为 Gemini 角色
            parts: [{ text: msg.text }]
        });
    }

    // 3. 插入当前用户消息
    contents.push({
        role: "user",
        parts: [{ text: userMessage }]
    });

    return contents;
}


/**
 * Worker 请求处理入口
 * @param {Object} env 环境对象
 * @returns {Response}
 */
export async function onRequest({ request, env }) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
    }

    let sessionId = getSessionId(request);
    let setCookie = false;

    // 如果没有会话ID，生成一个新的
    if (!sessionId) {
        sessionId = generateUuid();
        setCookie = true;
    }

    try {
        const body = await request.json();
        const userContents = body.contents; // 格式: [{ role: "user", parts: [{ text: "..." }] }]
        const userMessage = userContents[userContents.length - 1].parts[0].text; // 提取当前用户消息

        // 1. 获取配置 (包括 API Key, 风格指令, 模型和温度)
        const config = await getConfig(env);

        if (!config.apiKey || !config.apiUrl) {
            return new Response(JSON.stringify({ error: 'AI API Key 或 URL 未配置。请联系管理员。' }), { status: 500 });
        }
        
        // 2. 加载历史记录
        const historyData = await env.HISTORY.get(sessionId, { type: 'json' });
        const history = Array.isArray(historyData) ? historyData : [];
        
        // 3. 构造请求体
        const geminiContents = buildGeminiContents(history, userMessage, config.personaPrompt);

        // ------------------ 🚨 关键改动：使用动态的模型和温度 🚨 ------------------
        const finalModel = config.modelName || 'gemini-2.5-flash'; // 确保有默认值
        
        const geminiRequestBody = {
            contents: geminiContents,
            generationConfig: { // <-- ✅ 已更正为 generationConfig
                // 确保 temperature 是一个浮点数
                temperature: parseFloat(config.temperature) || 0.7, 
            },
        };

        // 4. 调用 Gemini API
        const apiResponse = await fetch(config.apiUrl.replace(/\/$/, '') + '/models/' + finalModel + ':generateContent?key=' + config.apiKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiRequestBody)
        });
        
        const data = await apiResponse.json();
        
        if (!apiResponse.ok) {
            // 检查是否有 API 错误信息
            const errorMessage = data.error?.message || apiResponse.statusText;
            return new Response(JSON.stringify({ error: errorMessage, status: apiResponse.status }), { status: apiResponse.status });
        }
        
        // 5. 提取 AI 响应文本
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!aiText) {
             return new Response(JSON.stringify({ error: 'AI 返回了一个空响应。' }), { status: 500 });
        }

        // 6. 更新历史记录
        const newHistory = [
            ...history,
            { role: 'user', text: userMessage },
            { role: 'model', text: aiText }
        ];
        // 保持历史记录长度在 MAX_HISTORY_MESSAGES + 1 轮对话 (即 2*MAX_HISTORY_MESSAGES 条消息)
        const maxHistoryToSave = (MAX_HISTORY_MESSAGES + 1) * 2; 
        const historyToSave = newHistory.slice(-maxHistoryToSave);
        
        await env.HISTORY.put(sessionId, JSON.stringify(historyToSave), { expirationTtl: COOKIE_TTL_SECONDS });

        // 7. 构造响应头
        const headers = { 'Content-Type': 'application/json' };
        if (setCookie) {
            headers['Set-Cookie'] = `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; Max-Age=${COOKIE_TTL_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
        }

        // 8. 返回 AI 响应
        return new Response(JSON.stringify(data), { status: 200, headers: headers });

    } catch (error) {
        console.error("Chat Worker Error:", error);
        return new Response(JSON.stringify({ error: `系统错误: ${error.message}` }), { status: 500 });
    }
}
