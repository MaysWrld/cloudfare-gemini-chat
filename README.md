

## 📝 Gemini Chat v6.4 版本使用说明与配置指南

本项目是一个基于 **Cloudflare Pages Functions** 和 **KV 命名空间** 构建的 AI 聊天应用前端代理，支持多轮对话记忆和管理员配置。

### 1. 🤝 项目协作声明

本项目的大部分代码、结构设计和所有问题修复均由我和 **Google Gemini**（AI 助手）共同完成。

### 2. 🚀 关键访问地址与功能

| 功能 | 访问路径 | 描述 |
| :--- | :--- | :--- |
| **主应用（聊天界面）** | `/` (根目录) 或 `/index.html` | 用户进行 AI 对话的主界面。 |
| **管理员登录页面** | `/login.html` | 管理员输入用户名/密码的页面。 |
| **管理员配置页面** | `/admin.html` | 登录后配置 Gemini API 密钥和接口。 |

### 3. ⚙️ Cloudflare Pages 构建配置 (Build Configuration)

在将项目连接到 Cloudflare Pages 时，请在 **“构建和部署 (Build and deployments)”** 区域设置以下值。

| 配置项 | 推荐设置 | 作用 |
| :--- | :--- | :--- |
| **构建命令 (Build command)** | **空 (Leave empty)** | 项目为纯静态文件和函数，无需编译步骤。 |
| **构建输出目录 (Build output directory)** | **`src`** | 告知 Pages 部署器，所有静态网页文件 (`index.html`, `login.html` 等) 位于 `src/` 目录下。 |
| **根目录 (Root directory)** | **`/`** (默认) | 保持默认，从 Git 仓库根目录开始部署。 |

---

### 4. 🔑 Gemini API 配置指南

本项目依赖 Google Gemini API 进行对话。您需要在部署完成后，通过管理员后台输入 API 凭证。

#### 4.1. 获取 API 密钥 (API Key)

1.  访问 Google AI Studio 或相应的 Gemini API 密钥申请页面。
2.  创建一个新的 API Key 并将其保存下来。

#### 4.2. 管理后台输入示例

您需要登录管理员配置页面 (`/admin.html`) 来保存以下两个关键值：

| 配置项 | 示例值 (请替换为您自己的密钥) | 描述 |
| :--- | :--- | :--- |
| **API Key** | `AIzaSy...your-actual-key...zXpU` | **必填。** 您从 Google 申请到的密钥。 |
| **API URL** | `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` | **必填。** Gemini API 的标准端点（请根据实际使用的模型进行调整）。 |

---

### 5. 🛠️ Cloudflare Pages 运行时配置

这些设置用于 Functions 的运行时环境。

#### 5.1. KV 命名空间绑定 (Functions $\rightarrow$ KV Namespace Bindings)

| 变量名称 (在代码中使用的名称) | 作用 | 绑定到的 KV 命名空间名称 |
| :--- | :--- | :--- |
| **`CONFIG`** | 存储 Gemini API 接口、密钥和欢迎语。 | `CHAT_CONFIG` (需手动创建并绑定) |
| **`HISTORY`** | 存储每个用户会话的聊天历史记录。 | `CHAT_HISTORY` (需手动创建并绑定) |

#### 5.2. 环境变量 (Secrets) (Functions $\rightarrow$ Environment Variables $\rightarrow$ Secrets)

以下变量用于管理员登录验证。它们必须设置为 **Secrets (机密)** 类型。

| 变量名称 | 作用 |
| :--- | :--- |
| **`ADMIN_USER`** | 管理员登录用户名。 |
| **`ADMIN_PASS`** | 管理员登录密码。 |

### 6. 📂 核心代码文件说明 (Functions)

所有后端逻辑都位于 `functions/` 文件夹内。

| 文件路径 | 作用描述 | 核心功能 |
| :--- | :--- | :--- |
| **`/functions/auth.js`** | **认证与配置核心。** 包含 `isAuthenticated` 和 `getConfig` 等核心函数。 | 身份验证、配置读取 |
| **`/functions/api/login.js`** | 处理登录 POST 请求，验证凭证并设置认证 Cookie。 | 管理员登录 |
| **`/functions/api/admin.js`** | 处理 GET/POST 请求，进行配置的获取和保存，依赖 `CONFIG` KV。 | 配置管理 |
| **`/functions/api/chat.js`** | 核心代理逻辑，使用 `HISTORY` 存储和加载上下文，与 Gemini API 通信。 | 聊天代理、记忆功能 |

### 7. ⚠️ 调试与维护

如果功能出现异常，请遵循以下步骤：

1.  **登录：** 尝试访问 `/login.html` 重新登录，确保获得新的认证 Cookie。
2.  **KV 检查：** 核对 Pages Settings 中的 **KV 绑定名称** (`CONFIG` 和 `HISTORY`) 是否完全匹配。
3.  **API 密钥：** 确保在 `/admin.html` 中保存的 API Key 和 URL 是正确的。
4.  **强制刷新：** 遇到前端显示问题时，尝试 **`Ctrl + Shift + R` (或 `Cmd + Shift + R`)** 强制浏览器加载最新的前端代码。
