// /functions/api/chat.js - 最终完整代码 (启用 Tool Calling: 图片搜索 + 网页搜索)

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

// 🚀 新增：网页搜索工具定义
const search_web_tool = {
    function_declarations: [{
        name: 'search_web',
        description: '用于在互联网上执行常规的网页文本搜索，获取最新的信息和事实性数据。',
        parameters: {
            type: 'OBJECT',
            properties: {
                query: {
                    type: 'STRING',
                    description: '用于网页搜索的关键词或问题。例如: "今天的天气", "最新的科技新闻"。',
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
        
        const userMessage = data.message;
        const history = await getHistory(env, data.sessionId);

        // 构建第一次请求体
        const contents = [...history, { role: 'user', parts: [{ text: userMessage }] }];
        
        const tools = [search_image_tool, search_web_tool]; // 🚀 启用两个工具
        
        const body = {
            contents: contents,
            config: {
                systemInstruction: config.personaPrompt,
                temperature: config.temperature,
                tools: tools,
            },
            model: config.modelName,
        };

        let response = await fetch(`${config.apiUrl}/models/${config.modelName}:generateContent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': config.apiKey,
            },
            body: JSON.stringify(body),
        });

        let result = await response.json();

        // ---------------------- 🚀 3. 处理 Tool Calling (多轮交互) ----------------------
        
        const firstCandidate = result.candidates?.[0];

        if (firstCandidate?.content?.parts?.[0]?.functionCall) {
            
            const functionCall = firstCandidate.content.parts[0].functionCall;
            const functionName = functionCall.name;
            let toolResultContent = null;
            let query = functionCall.args.query;

            if (functionName === 'search_image') {
                
                // 图片搜索
                const imageUrl = await executeImageSearch(query, config);
                toolResultContent = {
                    image_url: imageUrl || "未找到相关图片URL。",
                    description: query, 
                };

            } else if (functionName === 'search_web') {
                
                // 网页搜索
                const searchResults = await executeWebSearch(query, config);
                toolResultContent = {
                    web_results: searchResults || "未找到相关网页搜索结果。",
                };
            }
            
            if (toolResultContent) {
                 // 构建 Tool 结果返回给 AI
                const toolResponsePart = [
                    {
                        functionResponse: {
                            name: functionName,
                            response: {
                                name: functionName,
                                content: toolResultContent,
                            },
                        },
                    },
                ];

                // 构建第二次请求内容：用户消息 -> AI调用请求 -> Worker执行结果
                const toolContents = [
                    ...contents, 
                    firstCandidate.content, 
                    { role: 'tool', parts: toolResponsePart } 
                ];

                // 重新调用 Gemini API (带上工具结果)
                const toolBody = {
                    contents: toolContents,
                    config: {
                        systemInstruction: config.personaPrompt,
                        temperature: config.temperature,
                        tools: tools,
                    },
                    model: config.modelName,
                };

                response = await fetch(`${config.apiUrl}/models/${config.modelName}:generateContent`, {
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
 * 执行图片搜索
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

    // searchType=image 用于图片搜索
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${CX_ID}&q=${encodeURIComponent(query)}&searchType=image&num=1`;

    try {
        const response = await fetch(searchUrl);
        const data = await response.json();

        if (data.items && data.items.length > 0 && data.items[0].link) {
            return data.items[0].link; 
        }

    } catch (error) {
        console.error("Google Image Search failed:", error);
    }
    
    return null; 
}


/**
 * 使用 Google Search API 执行网页搜索并返回摘要和链接。
 * @param {string} query 搜索关键词
 * @param {Object} config 完整的配置对象
 * @returns {Promise<Array<Object>|null>} 返回搜索结果数组
 */
async function executeWebSearch(query, config) {
    const API_KEY = config.googleSearchApiKey;
    const CX_ID = config.googleCxId;
    
    if (!API_KEY || !CX_ID) {
        console.error("Missing Google Search API Keys in config.");
        return null; 
    }

    // searchType (缺省) 默认进行网页搜索，num=3 返回3条结果
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${CX_ID}&q=${encodeURIComponent(query)}&num=3`;

    try {
        const response = await fetch(searchUrl);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            // 提取关键信息 (标题、摘要、链接) 传递给 AI
            return data.items.map(item => ({
                title: item.title,
                snippet: item.snippet,
                source_url: item.link
            }));
        }

    } catch (error) {
        console.error("Google Web Search failed:", error);
    }
    
    return null; 
}
