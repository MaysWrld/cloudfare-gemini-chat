
## 📝 Gemini Chat 1.0 版本使用说明与配置指南 (最终版)

本项目是一个基于 **Cloudflare Pages Functions** 和 **KV 命名空间** 构建的 AI 聊天应用前端代理，支持多轮对话记忆和管理员配置。

### 1. 🤝 项目协作声明

本项目的大部分代码、结构设计和所有问题修复均由用户和 **Google Gemini**（AI 助手）共同完成。

### 2. 🌍 关键访问地址

| 功能 | 访问路径 | 描述 |
| :--- | :--- | :--- |
| **主应用（聊天界面）** | `/` (根目录) 或 `/index.html` | 用户进行 AI 对话的主界面。 |
| **管理员登录页面** | `/login.html` | 管理员输入用户名/密码的页面。 |
| **管理员配置页面** | `/admin.html` | 登录后配置 Gemini API 密钥和接口。 |

---

### 3. 🔑 Gemini API 配置指南 (重点)

本项目依赖 Google Gemini API 进行对话。您需要在部署完成后，通过管理员后台输入 API 凭证。

#### 3.1. 获取 API 密钥 (API Key)

1.  访问 Google AI Studio 或相应的 Gemini API 密钥申请页面。
2.  创建一个新的 API Key 并将其保存下来。

#### 3.2. 管理后台输入示例

您需要登录管理员配置页面 (`/admin.html`) 来保存以下两个关键值：

| 配置项 | 示例值 (请替换为您自己的密钥) | 描述 |
| :--- | :--- | :--- |
| **API Key** | `AIzaSy...your-actual-key...zXpU` | **必填。** 您从 Google 申请到的密钥。 |
| **API URL** | `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` | **必填。** Gemini API 的标准端点（请根据实际使用的模型进行调整）。 |

> **注意：** 确保输入的值是纯文本，没有额外的空格或引号。

---

### 4. ⚙️ Cloudflare Pages 核心配置

您的 Cloudflare Pages 项目需要绑定以下 **环境变量（Secrets）** 和 **KV 命名空间** 才能正常运行。

#### 4.1. KV 命名空间绑定 (Functions $\rightarrow$ KV Namespace Bindings)

| 变量名称 (在代码中使用的名称) | 作用 | 绑定到的 KV 命名空间名称 (例如) |
| :--- | :--- | :--- |
| **`CONFIG`** | 存储 Gemini API 接口、密钥和欢迎语。 | `CHAT_CONFIG` (需手动创建)并绑定 |
| **`HISTORY`** | 存储每个用户会话的聊天历史记录。 | `CHAT_HISTORY` (需手动创建)并绑定 |

#### 4.2. 环境变量 (Secrets) (Functions $\rightarrow$ Environment Variables $\rightarrow$ Secrets)

以下变量用于管理员登录验证。

| 变量名称 | 作用 |
| :--- | :--- |
| **`ADMIN_USER`** | 管理员登录用户名。 |
| **`ADMIN_PASS`** | 管理员登录密码。 |

### 5. 📂 核心代码文件说明

所有后端逻辑都位于 `functions/` 文件夹内。

| 文件路径 | 作用描述 | 核心功能 |
| :--- | :--- | :--- |
| **`/functions/auth.js`** | **认证与配置核心。** 包含 `isAuthenticated` 和 `getConfig` 等核心函数。 | 身份验证、配置读取 |
| **`/functions/api/login.js`** | 处理登录 POST 请求，验证凭证并设置认证 Cookie。 | 管理员登录 |
| **`/functions/api/admin.js`** | 处理 GET/POST 请求，进行配置的获取和保存，依赖 `CONFIG` KV。 | 配置管理 |
| **`/functions/api/chat.js`** | 核心代理逻辑，使用 `HISTORY` 存储和加载上下文，与 Gemini API 通信。 | 聊天代理、记忆功能 |
| **`/src/index.html`** | 聊天界面的前端代码。包含回车发送、消息显示等交互逻辑。 | 聊天前端 |
| **`/src/login.html`** | 登录界面的前端代码。 | 登录前端 |
