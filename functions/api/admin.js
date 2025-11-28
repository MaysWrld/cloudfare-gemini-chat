// ... (导入部分不变)

// 导出函数，处理所有请求方法
export async function onRequest({ request, env }) {
    // ... (认证部分不变)
    if (!isAuthenticated(request)) {
        // ... (返回 401 响应)
    }
    
    // 2. 认证成功，处理 GET 请求（读取配置）
    if (request.method === 'GET') {
        const config = await getConfig(env);
        
        // 🌟 确保配置中包含 systemPrompt 字段及其默认值
        const responseConfig = {
            apiUrl: config.apiUrl || '',
            apiKey: config.apiKey || '',
            welcomeMessage: config.welcomeMessage || '欢迎使用 AI 助手！',
            systemPrompt: config.systemPrompt || '你是一个友好、乐于助人的 AI 助手，请使用中文回答问题。', // <-- 新增
        };
        
        return new Response(JSON.stringify(responseConfig), { /* ... */ });
    }

    // 3. 认证成功，处理 POST 请求（保存配置）
    if (request.method === 'POST') {
        try {
            const newConfig = await request.json();
            
            const saveConfig = {
                apiUrl: newConfig.apiUrl || '',
                apiKey: newConfig.apiKey || '',
                welcomeMessage: newConfig.welcomeMessage || '欢迎使用 AI 助手！',
                systemPrompt: newConfig.systemPrompt || '你是一个友好、乐于助人的 AI 助手，请使用中文回答问题。', // <-- 新增
            };

            await env.CONFIG.put(SETTINGS.CONFIG_KEY, JSON.stringify(saveConfig));

            return new Response(JSON.stringify({ message: "配置已成功保存！" }), { /* ... */ });

        } catch (error) { /* ... */ }
    }

    return new Response('Method Not Allowed', { status: 405 });
}
