// /functions/api/chat.js - 最终版本：支持 AI 文本标记（无 Tool Calling）

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
 * @param {Array} history 
 * @param {Array<Object>} userContents // 传入完整的用户消息结构，可能包含图片
 * @param {string} personaPrompt
 * @returns {Array<Object>}
 */
function buildGeminiContents(history, userContents, personaPrompt) {
    const contents = [];
    
    // 检查是否为第一条消息，并且有风格指令
    if (history.length === 0 && personaPrompt) {
        const lastUserContentIndex = userContents.length - 1;
        
        // 找到当前用户消息的第一个文本部分
        const textPart = userContents[lastUserContentIndex].parts.find(p => p.text);

        if (textPart) {
            // 将风格指令作为前缀添加到当前用户消息的文本部分中
            textPart.text = `[System Instruction: ${personaPrompt}]\n\n${textPart.text}`;
        }
    }

    // 历史消息部分 (最多 MAX_HISTORY_MESSAGES 轮对话)
    const historyToUse = history.slice(-MAX_HISTORY_MESSAGES);
    
    // 历史消息现在必须直接使用存储的 parts 结构
    for (const msg of historyToUse) {
        contents.push({
            role: msg.role === 'user' ? 'user' : 'model', 
            parts: msg.parts // 直接使用保存的 parts 数组
        });
    }

    // 插入当前用户消息 (完整的 parts 结构)
    contents.push(userContents[userContents.length - 1]);

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
        
        // userContents 现在是完整的 Gemini 格式的数组，可能包含图片 parts
        const userContents = body.contents;
        
        // 提取当前用户消息的文本部分和完整的 parts 结构，用于历史记录存储
        const lastUserContent = userContents[userContents.length - 1];
        const userMessageText = lastUserContent.parts.find(p => p.text)?.text || ''; 
        const currentUserParts = lastUserContent.parts;

        const config = await getConfig(env);

        if (!config.apiKey || !config.apiUrl) {
            return new Response(JSON.stringify({ error: 'AI API Key 或 URL 未配置。请联系管理员。' }), { status: 500 });
        }
        
        // 历史记录现在需要存储完整的 parts 结构
        const historyData = await env.HISTORY.get(sessionId, { type: 'json' });
        const history = Array.isArray(historyData) ? historyData : [];
        
        // 将完整的 userContents 传给 buildGeminiContents
        const geminiContents = buildGeminiContents(history, userContents, config.personaPrompt);

        // ------------------ 配置对象 ------------------
        const finalModel = config.modelName || 'gemini-2.5-flash'; 
        
        const generationConfig = {
            temperature: parseFloat(config.temperature) || 0.7, 
        };
        
        // 📌 核心：没有 tools 和 toolConfig 字段
        const geminiRequestBody = {
            contents: geminiContents,
            generationConfig: generationConfig, 
        };

        // 4. 调用 Gemini API
        let apiResponse = await fetch(config.apiUrl.replace(/\/$/, '') + '/models/' + finalModel + ':generateContent?key=' + config.apiKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiRequestBody)
        });
        
        let data = await apiResponse.json();
        
        if (!apiResponse.ok) {
            const errorMessage = data.error?.message || apiResponse.statusText;
            return new Response(JSON.stringify({ error: errorMessage, status: apiResponse.status }), { status: apiResponse.status });
        }
        
        let candidate = data.candidates?.[0];

        if (!candidate || !candidate.content || !candidate.content.parts) {
             return new Response(JSON.stringify({ error: 'AI 返回了一个空响应。' }), { status: 500 });
        }
        
        // ------------------ 6. 更新历史记录 ------------------
        
        // 正常文本清理逻辑
        let aiParts = data.candidates?.[0]?.content?.parts;
        let aiText = aiParts?.find(p => p.text)?.text; // 查找文本部分
        
        if (aiText) {
             aiText = aiText.replace(/^\s+/, '');
             const textPart = aiParts.find(p => p.text);
             if (textPart) textPart.text = aiText; 
        }

        // 获取 AI 返回的完整 parts 结构
        const aiPartsToSave = data.candidates?.[0]?.content?.parts || [{ text: aiText || '' }];

        const newHistory = [
            ...history,
            // user 消息保存完整的 parts
            { role: 'user', parts: currentUserParts }, 
            // model 消息保存完整的 parts
            { role: 'model', parts: aiPartsToSave } 
        ];
        
        const maxHistoryToSave = (MAX_HISTORY_MESSAGES + 1) * 2; 
        const historyToSave = newHistory.slice(-maxHistoryToSave);
        
        await env.HISTORY.put(sessionId, JSON.stringify(historyToSave), { expirationTtl: COOKIE_TTL_SECONDS });

        // ------------------ 7. 构造响应头 ------------------
        const headers = { 'Content-Type': 'application/json' };
        if (setCookie) {
             headers['Set-Cookie'] = `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; Max-Age=${COOKIE_TTL_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
        }

        // 返回包含 AI 文本（其中包含图片标记）的 data
        return new Response(JSON.stringify(data), { status: 200, headers: headers });

    } catch (error) {
        console.error("Chat Worker Error:", error);
        return new Response(JSON.stringify({ error: `系统错误: ${error.message}` }), { status: 500 });
    }
}
