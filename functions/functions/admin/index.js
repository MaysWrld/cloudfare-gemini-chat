// functions/admin/index.js (页面重定向逻辑)

import { isAuthenticated } from '../auth'; // 注意路径，相对于 functions/admin/

export async function onRequest(context) {
    const { request, next } = context;
    const url = new URL(request.url);

    // 1. 检查认证状态
    if (!isAuthenticated(request)) {
        // ✨ 核心功能：返回 302 重定向指令
        return Response.redirect(url.origin + '/login.html', 302);
    }

    // 2. 认证成功：放行，让 Pages 服务返回 admin.html 静态文件
    return next();
}
