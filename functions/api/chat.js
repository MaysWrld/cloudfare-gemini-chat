// /functions/api/chat.js - 最终完整代码 (启用 Tool Calling)

import { isAuthenticated, getConfig } from '../auth';
import { getHistory, saveHistory } from '../history';

// ---------------------- 🚀 1. Tool 定义 ----------------------

const search_image_tool = {
    function_declarations: [{
        name: 'search_image',
        description: '用于在互联网上执行图片搜索，获取与用户查询相关的真实、公开可访问的图片URL。',
        parameters: {
            type: 'OBJECT',
            properties: {
                query: {
                    type: 'STRING',
                    description: '用于搜索图片的关键词或描述。例如: "秋天的枫叶林", "可爱的猫咪"。',
                },
            },
            required: ['query'],
        },
    }],
};

// ---------------------- 2. Worker 请求处理 ----------------------

export async function onRequest({ request, env }) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const config = await getConfig(env);
        const data = await request.json();
        
        // 获取用户消息和历史记录
        const userMessage = data.message;
        const history = await getHistory(env, data.sessionId);

        // 构建第一次请求体
        const contents = [...history, { role: 'user', parts: [{ text: userMessage }] }];
        
        const body = {
            contents: contents,
            config: {
                systemInstruction: config.personaPrompt,
                temperature: config.temperature,
                tools: [search_image_tool],
            },
            model: config.modelName,
        };

        let response = await fetch(`${config.apiUrl}/models/${config.modelName}:generateContent`, { // 使用完整 URL
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': config.apiKey,
            },
            body: JSON.stringify(body),
        });

        let result = await response.json();

        // ---------------------- 🚀 3. 处理 Tool Calling (多轮交互) ----------------------
        
        if (result.candidates?.[0]?.content?.parts?.[0]?.functionCall) {
            
            const functionCall = result.candidates[0].content.parts[0].functionCall;
            const functionName = functionCall.name;

            if (functionName === 'search_image') {
                
                const query = functionCall.args.query;
                
                // 🚨 实际调用 Google Search API，传入 config
                const imageUrl = await executeImageSearch(query, config);
                
                // 构建 Tool 结果返回给 AI
                const toolResultContent = [
                    {
                        functionResponse: {
                            name: functionName,
                            response: {
                                name: functionName,
                                // 将图片URL作为 tool response content 返回给 AI
                                content: {
                                    image_url: imageUrl || "未找到相关图片URL。",
                                    description: query, // 附带描述帮助AI
                                },
                            },
                        },
                    },
                ];

                // 构建第二次请求内容：用户消息 -> AI调用请求 -> Worker执行结果
                const toolContents = [
                    ...contents, 
                    result.candidates[0].content, 
                    { role: 'tool', parts: toolResultContent } 
                ];

                // 重新调用 Gemini API (带上工具结果)
                const toolBody = {
                    contents: toolContents,
                    config: {
                        systemInstruction: config.personaPrompt,
                        temperature: config.temperature,
                        tools: [search_image_tool],
                    },
                    model: config.modelName,
                };

                response = await fetch(`${config.apiUrl}/models/${config.modelName}:generateContent`, { // 使用完整 URL
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': config.apiKey,
                    },
                    body: JSON.stringify(toolBody),
                });
                
                result = await response.json();
            }
        }
        
        // ---------------------- 4. 保存历史并返回 ----------------------
        
        const modelResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (modelResponse) {
            // 保存历史记录 (包括用户消息和 AI 最终回复)
            const newHistory = [
                ...history,
                { role: 'user', parts: [{ text: userMessage }] },
                { role: 'model', parts: [{ text: modelResponse }] }
            ];
            await saveHistory(env, data.sessionId, newHistory);
        }

        return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Chat API error:', error);
        return new Response(JSON.stringify({ error: `系统错误: ${error.message}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}


// ---------------------- 🚀 5. Tool 执行函数 ----------------------

/**
 * 使用 Google Search API 执行图片搜索并返回第一个图片的 URL。
 * 🚨 注意：从 config 对象中读取 Keys。
 * @param {string} query 搜索关键词
 * @param {Object} config 完整的配置对象
 * @returns {Promise<string|null>} 返回图片的 URL 或 null
 */
async function executeImageSearch(query, config) {
    
    const API_KEY = config.googleSearchApiKey;
    const CX_ID = config.googleCxId;
    
    if (!API_KEY || !CX_ID) {
        console.error("Missing Google Search API Keys in config.");
        return null; 
    }

    // 使用 Google Custom Search Engine API 进行图片搜索
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${CX_ID}&q=${encodeURIComponent(query)}&searchType=image&num=1`;

    try {
        const response = await fetch(searchUrl);
        const data = await response.json();

        // 检查是否有结果，并返回第一个结果的链接
        if (data.items && data.items.length > 0 && data.items[0].link) {
            return data.items[0].link; 
        }

    } catch (error) {
        console.error("Google Image Search failed:", error);
    }
    
    return null; 
}
