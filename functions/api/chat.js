// /functions/api/chat.js - 最终兼容版：解决 system_instruction 错误

import { isAuthenticated, getConfig } from '../auth';

const MAX_HISTORY_MESSAGES = 10; // 最大历史消息数量

const SESSION_COOKIE_NAME = 'chat_session_id';
const COOKIE_TTL_SECONDS = 3600 * 24 * 30; // 30天

function getSessionId(request) {
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) {
        const cookies = cookieHeader.split(';').map(c => c.trim().split('='));
        const sessionId = cookies.find(([name]) => name === SESSION_COOKIE_NAME)?.[1];
        return sessionId;
    }
    return null;
}

function generateUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}


/**
 * 辅助函数：将历史消息转换为 Gemini API 格式
 * 📌 关键修改：将 personaPrompt 传回，并作为前缀添加到首个用户消息中
 * @param {Array} history 
 * @param {string} userMessage 
 * @param {string} personaPrompt // 重新引入 personaPrompt 参数
 * @returns {Array<Object>}
 */
function buildGeminiContents(history, userMessage, personaPrompt) {
    const contents = [];
    
    // 检查是否为第一条消息，并且有风格指令
    let finalUserMessage = userMessage;
    if (history.length === 0 && personaPrompt) {
        // 将风格指令作为前缀添加到第一条消息中，以保证兼容性
        finalUserMessage = `[System Instruction: ${personaPrompt}]\n\n${userMessage}`;
    }

    // 历史消息部分 (最多 MAX_HISTORY_MESSAGES 轮对话)
    const historyToUse = history.slice(-MAX_HISTORY_MESSAGES);
    
    for (const msg of historyToUse) {
        contents.push({
            role: msg.role === 'user' ? 'user' : 'model', 
            parts: [{ text: msg.text }]
        });
    }

    // 插入当前用户消息 (可能是包含了风格指令的 finalUserMessage)
    contents.push({
        role: "user",
        parts: [{ text: finalUserMessage }]
    });

    return contents;
}


export async function onRequest({ request, env }) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
    }

    let sessionId = getSessionId(request);
    let setCookie = false;

    if (!sessionId) {
        sessionId = generateUuid();
        setCookie = true;
    }

    try {
        const body = await request.json();
        const userContents = body.contents; 
        const userMessage = userContents[userContents.length - 1].parts[0].text; 

        const config = await getConfig(env);

        if (!config.apiKey || !config.apiUrl) {
            return new Response(JSON.stringify({ error: 'AI API Key 或 URL 未配置。请联系管理员。' }), { status: 500 });
        }
        
        const historyData = await env.HISTORY.get(sessionId, { type: 'json' });
        const history = Array.isArray(historyData) ? historyData : [];
        
        // 📌 关键修改：将 personaPrompt 传给 buildGeminiContents
        const geminiContents = buildGeminiContents(history, userMessage, config.personaPrompt);

        // ------------------ 🚨 配置对象中只保留 temperature 🚨 ------------------
        const finalModel = config.modelName || 'gemini-2.5-flash'; 
        
        const generationConfig = {
            // 确保 temperature 是一个浮点数
            temperature: parseFloat(config.temperature) || 0.7, 
        };

        // 彻底移除 system_instruction，由 buildGeminiContents 负责插入
        
        const geminiRequestBody = {
            contents: geminiContents,
            generationConfig: generationConfig, 
        };

        // 4. 调用 Gemini API
        const apiResponse = await fetch(config.apiUrl.replace(/\/$/, '') + '/models/' + finalModel + ':generateContent?key=' + config.apiKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiRequestBody)
        });
        
        const data = await apiResponse.json();
        
        if (!apiResponse.ok) {
            const errorMessage = data.error?.message || apiResponse.statusText;
            return new Response(JSON.stringify({ error: errorMessage, status: apiResponse.status }), { status: apiResponse.status });
        }
        
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!aiText) {
             return new Response(JSON.stringify({ error: 'AI 返回了一个空响应。' }), { status: 500 });
        }

        // 6. 更新历史记录
        const newHistory = [
            ...history,
            // 注意：这里保存到历史记录中的 user 消息仍然是原始 userMessage，不带 system prompt
            { role: 'user', text: userMessage }, 
            { role: 'model', text: aiText }
        ];
        
        const maxHistoryToSave = (MAX_HISTORY_MESSAGES + 1) * 2; 
        const historyToSave = newHistory.slice(-maxHistoryToSave);
        
        await env.HISTORY.put(sessionId, JSON.stringify(historyToSave), { expirationTtl: COOKIE_TTL_SECONDS });

        // 7. 构造响应头
        const headers = { 'Content-Type': 'application/json' };
        if (setCookie) {
            headers['Set-Cookie'] = `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; Max-Age=${COOKIE_TTL_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
        }

        return new Response(JSON.stringify(data), { status: 200, headers: headers });

    } catch (error) {
        console.error("Chat Worker Error:", error);
        return new Response(JSON.stringify({ error: `系统错误: ${error.message}` }), { status: 500 });
    }
}
