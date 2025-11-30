// /functions/history.js - 完整代码 (请将此文件放入 /functions/ 目录)

const HISTORY_NAMESPACE = 'chat_history_';

export async function getHistory(env, sessionId) {
    if (!sessionId || !env.HISTORY) {
        console.warn("KV binding 'HISTORY' is missing or sessionId is empty.");
        return [];
    }
    const key = HISTORY_NAMESPACE + sessionId;
    const historyJson = await env.HISTORY.get(key);
    if (historyJson) {
        try { return JSON.parse(historyJson); } 
        catch (e) { return []; }
    }
    return [];
}

export async function saveHistory(env, sessionId, history) {
    if (!sessionId || !env.HISTORY || !history || history.length === 0) return;
    const key = HISTORY_NAMESPACE + sessionId;
    const maxHistoryLength = 20; 
    const historyToSave = history.slice(-maxHistoryLength);
    try {
        await env.HISTORY.put(key, JSON.stringify(historyToSave), { expirationTtl: 604800 });
    } catch (e) {
        console.error("Error saving history:", e);
    }
}

export async function clearHistory(env, sessionId) {
    if (!sessionId || !env.HISTORY) return;
    const key = HISTORY_NAMESPACE + sessionId;
    try {
        await env.HISTORY.delete(key);
    } catch (e) {
        console.error("Error clearing history:", e);
    }
}
