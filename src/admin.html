<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>AI 配置管理</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .config-container { max-width: 600px; margin: 40px auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        /* 深色模式兼容 */
        @media (prefers-color-scheme: dark) {
            body { background-color: #121212; color: #e0e0e0; }
            .config-container { background-color: #1e1e1e; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3); }
            .form-control, .form-select { background-color: #333; color: #e0e0e0; border-color: #444; }
            .form-control:focus, .form-select:focus { background-color: #3a3a3a; color: #e0e0e0; border-color: #6c757d; box-shadow: 0 0 0 0.25rem rgba(108, 117, 125, 0.25); }
            .form-label { color: #e0e0e0; }
            .form-text { color: #aaa; }
            .alert-info { background-color: #1c3639; color: #78c2ad; border-color: #2b565a; }
            .btn-success { background-color: #4CAF50; border-color: #4CAF50; }
            .btn-success:hover { background-color: #43a047; border-color: #43a047; }
        }
    </style>
</head>
<body>
    <div class="container config-container">
        <h1 class="mb-4 text-center">AI 配置管理</h1>
        <div id="status" class="alert alert-success" role="alert">
            正在加载配置...
        </div>
        
        <form id="configForm">
            
            <h5 class="mt-4 mb-3">UI 与角色设置</h5>

            <div class="mb-3">
                <label for="appTitle" class="form-label">应用标题 (Chat 界面头部):</label>
                <input type="text" id="appTitle" name="appTitle" class="form-control" required placeholder="如：冲哥专属 AI 助手">
            </div>

            <div class="mb-3">
                <label for="welcomeMessage" class="form-label">对话欢迎语:</label>
                <input type="text" id="welcomeMessage" name="welcomeMessage" class="form-control" required>
            </div>
            
            <div class="mb-3">
                <label for="personaPrompt" class="form-label">AI 角色指令 (基础 Prompt):</label>
                <textarea id="personaPrompt" name="personaPrompt" class="form-control" rows="5" required placeholder="定义 AI 的角色和回复风格。此指令将与图片工具指令自动合并。"></textarea>
                <div class="form-text">
                    你输入的指令将与底层的**图片/网页工具调用指令**自动合并。
                </div>
            </div>
            
            <h5 class="mt-4 mb-3">AI 接口与模型设置</h5>

            <div class="mb-3">
                <label for="apiUrl" class="form-label">AI API 接口 URL:</label>
                <input type="url" id="apiUrl" name="apiUrl" class="form-control" required placeholder="如：https://generativelanguage.googleapis.com/v1beta">
            </div>
            
            <div class="mb-3">
                <label for="apiKey" class="form-label">Gemini API Key (密钥):</label>
                <input type="text" id="apiKey" name="apiKey" class="form-control" required>
            </div>

            <h5 class="mt-4 mb-3">Google 搜索工具设置 (图片/网页搜索)</h5> 
            
            <div class="mb-3">
                <label for="googleSearchApiKey" class="form-label">Google Search API Key:</label>
                <input type="text" id="googleSearchApiKey" name="googleSearchApiKey" class="form-control" placeholder="用于 Tool Calling 执行图片和网页搜索">
            </div>

            <div class="mb-3">
                <label for="googleCxId" class="form-label">Google Custom Search Engine ID (CX ID):</label>
                <input type="text" id="googleCxId" name="googleCxId" class="form-control" placeholder="请确保该 CSE 已启用图片和网页搜索">
            </div>
            
            <div class="mb-3">
                <label for="modelName" class="form-label">模型名称:</label>
                <select id="modelName" name="modelName" class="form-select" required>
                    <option value="gemini-2.5-flash">gemini-2.5-flash (推荐)</option>
                    <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                    <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                    <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                </select>
            </div>

            <div class="mb-3">
                <label for="temperature" class="form-label">温度 (Temperature):</label>
                <input type="number" id="temperature" name="temperature" class="form-control" min="0.0" max="1.0" step="0.1" required placeholder="0.0 到 1.0 之间 (默认 0.7)">
                <div class="form-text">控制回复的随机性。0.0 更严谨，1.0 更有创意。</div>
            </div>
            
            <button type="submit" class="btn btn-success w-100">保存配置</button>
        </form>
    </div>

    <script>
        const statusElement = document.getElementById('status');
        const form = document.getElementById('configForm');
        const saveButton = document.querySelector('button[type="submit"]'); 
        
        // 🚀 新的图片/网页功能指令（用于合并到用户输入的 Prompt 中）
        const IMAGE_FUNCTION_PROMPT = `
            **[功能强制指令]**：
            1. 当需要提供图片时，你必须调用内置的 \`search_image\` 工具来获取图片URL。工具调用成功后，你必须将返回的URL严格包装在文本中，格式为：<IMAGE_URL: [互联网可访问的图片URL], [图片描述]>。
            2. 当需要搜索网页获取最新信息或事实时，你必须调用内置的 \`search_web\` 工具。
        `.trim();

        /**
         * 辅助函数：将完整的 personaPrompt 剥离出用户输入的角色部分
         */
        function extractRolePrompt(fullPrompt) {
            if (!fullPrompt) return '';
            const startIndex = fullPrompt.indexOf(IMAGE_FUNCTION_PROMPT);
            
            if (startIndex > -1) {
                return fullPrompt.substring(0, startIndex).trim();
            }
            return fullPrompt.trim();
        }
        
        // 1. 加载现有配置
        async function loadConfig() {
            try {
                const response = await fetch('/api/admin'); 
                
                if (response.status === 401) {
                    statusElement.className = 'alert alert-danger';
                    statusElement.textContent = '认证失败。请刷新页面重新输入凭证。';
                    return;
                }
                
                if (response.status === 500) {
                     const errorData = await response.json();
                     if (errorData.error.includes('KV 绑定错误')) {
                         statusElement.className = 'alert alert-danger';
                         statusElement.textContent = `❌ ${errorData.error} (请检查 Pages/Worker 的环境变量绑定)`;
                         return;
                     }
                }

                if (response.ok) {
                    const config = await response.json();
                    
                    document.getElementById('apiUrl').value = config.apiUrl || '';
                    document.getElementById('apiKey').value = config.apiKey || '';
                    document.getElementById('welcomeMessage').value = config.welcomeMessage || '';
                    document.getElementById('appTitle').value = config.appTitle || '';
                    
                    // 🚀 加载新增的 Google 搜索配置
                    document.getElementById('googleSearchApiKey').value = config.googleSearchApiKey || '';
                    document.getElementById('googleCxId').value = config.googleCxId || '';

                    const currentPrompt = config.personaPrompt || '';
                    document.getElementById('personaPrompt').value = extractRolePrompt(currentPrompt);
                    
                    document.getElementById('modelName').value = config.modelName || 'gemini-2.5-flash';
                    document.getElementById('temperature').value = (config.temperature !== undefined && config.temperature !== null) ? parseFloat(config.temperature).toFixed(1) : '0.7';
                    
                    statusElement.className = 'alert alert-info';
                    statusElement.textContent = '配置加载成功。';
                } else {
                    statusElement.className = 'alert alert-warning';
                    statusElement.textContent = `加载配置失败，状态码: ${response.status}`;
                }
            } catch (error) {
                statusElement.className = 'alert alert-danger';
                statusElement.textContent = `网络请求错误或前端解析错误: ${error.message}`;
            }
        }

        // 2. 提交新配置
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const userRolePrompt = document.getElementById('personaPrompt').value.trim();
            
            // 核心：将用户的角色指令和功能指令合并
            const finalPersonaPrompt = userRolePrompt 
                ? userRolePrompt + '\n\n' + IMAGE_FUNCTION_PROMPT
                : IMAGE_FUNCTION_PROMPT; 

            const data = {
                apiUrl: document.getElementById('apiUrl').value,
                apiKey: document.getElementById('apiKey').value,
                welcomeMessage: document.getElementById('welcomeMessage').value,
                appTitle: document.getElementById('appTitle').value,
                
                // 🚀 提交新增的 Google 搜索配置
                googleSearchApiKey: document.getElementById('googleSearchApiKey').value,
                googleCxId: document.getElementById('googleCxId').value,

                personaPrompt: finalPersonaPrompt, 
                modelName: document.getElementById('modelName').value,
                temperature: document.getElementById('temperature').value 
            };
            
            try {
                const response = await fetch('/api/admin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();

                if (response.ok) {
                    loadConfig(); 
                    statusElement.className = 'alert alert-success';
                    statusElement.textContent = result.message;
                    
                    const originalButtonText = saveButton.textContent;
                    saveButton.textContent = '保存成功';
                    saveButton.classList.remove('btn-success');
                    saveButton.classList.add('btn-secondary'); 
                    saveButton.disabled = true;

                    setTimeout(() => {
                        saveButton.textContent = originalButtonText;
                        saveButton.classList.remove('btn-secondary');
                        saveButton.classList.add('btn-success');
                        saveButton.disabled = false;
                    }, 2000); 
                    
                } else {
                    statusElement.className = 'alert alert-danger';
                    statusElement.textContent = `保存失败: ${result.error || response.statusText}`;
                }
            } catch (error) {
                statusElement.className = 'alert alert-danger';
                statusElement.textContent = `保存时发生网络错误: ${error.message}`;
            }
        });

        document.addEventListener('DOMContentLoaded', loadConfig);
    </script>
</body>
</html>
