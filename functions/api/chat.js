// /functions/api/chat.js - 最终完整代码 (启用 Tool Calling: 图片搜索 + 网页搜索, 🚀 新增代理支持)

import { isAuthenticated, getConfig } from '../auth';
import { getHistory, saveHistory } from '../history';

// 🚀 定义代理地址
// 注意：这个地址需要完整地代理 Google Custom Search API 的基础路径
const GOOGLE_PROXY_BASE_URL = 'https://google.400123456.xyz/customsearch/v1'; 

// ---------------------- 1. Tool 定义 (保持不变) ----------------------

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

// ---------------------- 2. Worker 请求处理 (保持不变) ----------------------

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
        
        const tools = [search_image_tool, search_web_tool]; 
        
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

        // ---------------------- 3. 处理 Tool Calling (多轮交互) ----------------------
        
        const firstCandidate = result.candidates?.[0];

        if (firstCandidate?.content?.parts?.[0]?.functionCall) {
            
            const functionCall = firstCandidate.content.parts[0].functionCall;
            const functionName = functionCall.name;
            let toolResultContent = null;
            let query = functionCall.args.query;

            if (functionName === 'search_image') {
                
                const imageUrl = await executeImageSearch(query, config);
                toolResultContent = {
                    image_url: imageUrl || "未找到相关图片URL。",
                    description: query, 
                };

            } else if (functionName === 'search_web') { 
                
                const searchResults = await executeWebSearch(query, config);
                toolResultContent = {
                    web_results: searchResults || "未找到相关网页搜索结果。",
                };
            }
            
            if (toolResultContent) {
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

                const toolContents = [
                    ...contents, 
                    firstCandidate.content, 
                    { role: 'tool', parts: toolResponsePart } 
                ];

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
        
        // ---------------------- 4. 保存历史并返回 (保持不变) ----------------------
        
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


// ---------------------- 🚀 5. Tool 执行函数 (修改 URL) ----------------------

/**
 * 执行图片搜索
 */
async function executeImageSearch(query, config) {
    
    const API_KEY = config.googleSearchApiKey;
    const CX_ID = config.googleCxId;
    
    if (!API_KEY || !CX_ID) {
        console.error("Missing Google Search API Keys in config.");
        return null; 
    }

    // 🚀 关键修改：使用代理地址 GOOGLE_PROXY_BASE_URL
    const searchUrl = `${GOOGLE_PROXY_BASE_URL}?key=${API_KEY}&cx=${CX_ID}&q=${encodeURIComponent(query)}&searchType=image&num=1`;

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
 * 执行网页文本搜索的函数
 */
async function executeWebSearch(query, config) {
    const API_KEY = config.googleSearchApiKey;
    const CX_ID = config.googleCxId;
    
    if (!API_KEY || !CX_ID) {
        console.error("Missing Google Search API Keys in config.");
        return null; 
    }

    // 🚀 关键修改：使用代理地址 GOOGLE_PROXY_BASE_URL
    const searchUrl = `${GOOGLE_PROXY_BASE_URL}?key=${API_KEY}&cx=${CX_ID}&q=${encodeURIComponent(query)}&num=3`;

    try {
        const response = await fetch(searchUrl);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
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
