const API_BASE = '/api/v1';
const SOCKET_BASE = 'http://localhost:3040';
let accessToken = '';
let refreshToken = '';
let activeSocket = null;
let socketEvents = [];
let socketClientReady = false;

const logEl = document.getElementById('log');
const byId = (id) => document.getElementById(id);

function log(title, payload) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${title}\n${typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)}\n\n`;
    logEl.textContent = line + logEl.textContent;
}

function setSummary(message, ok = true) {
    const el = byId('runSummary');
    if (!el) return;
    el.textContent = message;
    el.style.marginTop = '8px';
    el.style.color = ok ? '#22c55e' : '#ef4444';
}

function expect(condition, message) {
    if (!condition) throw new Error(message);
}

async function api(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (accessToken) headers.authorization = accessToken;
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        credentials: 'include',
    });
    const text = await response.text();
    let parsed = text;
    try {
        parsed = JSON.parse(text);
    } catch (_e) {}
    log(`${options.method || 'GET'} ${path} -> ${response.status}`, parsed);
    return parsed;
}

byId('loginBtn').onclick = async () => {
    const username = byId('username').value;
    const password = byId('password').value;
    const data = await api('/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    accessToken = data.accessToken || '';
    refreshToken = data.refreshToken || '';
    log('token-updated', { accessToken, refreshToken });
};

byId('refreshBtn').onclick = async () => {
    await api('/auth/refresh', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
    });
};
byId('meBtn').onclick = () => api('/auth/me');
byId('cookieMeBtn').onclick = () => api('/auth/cookie-me');
byId('healthBtn').onclick = () => api('/health/');
byId('docsBtn').onclick = () => api('/public/docs');
byId('echoBtn').onclick = () =>
    api('/public/echo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: byId('echoMessage').value }),
    });

byId('listUsersBtn').onclick = () => api('/users/');
byId('createUserBtn').onclick = async () => {
    const created = await api('/users/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            username: byId('newUsername').value,
            role: byId('newRole').value,
            age: Number(byId('newAge').value),
        }),
    });
    if (created.id) byId('targetUserId').value = created.id;
};
byId('getUserBtn').onclick = () => api(`/users/${byId('targetUserId').value}`);
byId('updateUserBtn').onclick = () =>
    api(`/users/${byId('targetUserId').value}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'auditor', age: 29 }),
    });
byId('deleteUserBtn').onclick = () =>
    api(`/users/${byId('targetUserId').value}`, {
        method: 'DELETE',
    });

byId('adminLogsBtn').onclick = () => api('/admin/logs');
byId('adminReindexBtn').onclick = () =>
    api('/admin/tasks/reindex', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
    });

byId('uploadSingleBtn').onclick = async () => {
    const form = new FormData();
    const file = byId('singleFileInput').files[0];
    if (!file) return log('upload-single', 'Select a file first');
    form.append('avatar', file);
    form.append('description', 'single upload test');
    await api('/files/single', { method: 'POST', body: form });
};

byId('uploadArrayBtn').onclick = async () => {
    const files = Array.from(byId('arrayFileInput').files || []);
    if (!files.length) return log('upload-array', 'Select one or more files first');
    const form = new FormData();
    files.forEach((f) => form.append('attachments', f));
    form.append('batch', 'array test');
    await api('/files/array', { method: 'POST', body: form });
};

byId('uploadFieldsBtn').onclick = async () => {
    const avatar = byId('avatarInput').files[0];
    const gallery = Array.from(byId('galleryInput').files || []);
    const docs = Array.from(byId('docsInput').files || []);
    const form = new FormData();
    if (avatar) form.append('avatar', avatar);
    gallery.forEach((f) => form.append('gallery', f));
    docs.forEach((f) => form.append('docs', f));
    form.append('meta', 'fields test');
    await api('/files/fields', { method: 'POST', body: form });
};
byId('uploadHistoryBtn').onclick = () => api('/files/history');

byId('connectSocketBtn').onclick = () => {
    if (!socketClientReady) return log('socket', 'socket.io client still loading. Try again in 1-2s.');
    if (activeSocket?.connected) return log('socket', 'Already connected');
    if (typeof io !== 'function') return log('socket', 'socket.io client script failed to load');
    activeSocket = io(SOCKET_BASE, { transports: ['websocket', 'polling'] });
    socketEvents = [];
    activeSocket.on('connect', () => log('socket:connect', { id: activeSocket.id }));
    activeSocket.on('connect_error', (err) => log('socket:connect_error', err.message || String(err)));
    activeSocket.on('chat:ready', (msg) => {
        socketEvents.push({ event: 'chat:ready', payload: msg });
        log('socket:chat:ready', msg);
    });
    activeSocket.on('chat:broadcast', (msg) => {
        socketEvents.push({ event: 'chat:broadcast', payload: msg });
        log('socket:chat:broadcast', msg);
    });
    activeSocket.on('notification:welcome', (msg) => {
        socketEvents.push({ event: 'notification:welcome', payload: msg });
        log('socket:notification:welcome', msg);
    });
    activeSocket.on('notification:pong', (msg) => {
        socketEvents.push({ event: 'notification:pong', payload: msg });
        log('socket:notification:pong', msg);
    });
    activeSocket.on('disconnect', (reason) => log('socket:disconnect', reason));
};

byId('disconnectSocketBtn').onclick = () => {
    if (!activeSocket) return;
    activeSocket.disconnect();
};

byId('sendChatBtn').onclick = () => {
    if (!activeSocket?.connected) return log('socket', 'Connect first');
    activeSocket.emit('chat:message', { message: byId('chatMessage').value, at: Date.now() });
};

byId('pingBtn').onclick = () => {
    if (!activeSocket?.connected) return log('socket', 'Connect first');
    activeSocket.emit('notification:ping', { source: 'playground', at: Date.now() });
};

byId('clearLogBtn').onclick = () => {
    logEl.textContent = '';
    setSummary('');
};

async function waitForSocketEvent(name, timeoutMs = 5000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        const found = socketEvents.find((evt) => evt.event === name);
        if (found) return found;
        await new Promise((r) => setTimeout(r, 120));
    }
    throw new Error(`Timed out waiting for socket event "${name}"`);
}

byId('runAllBtn').onclick = async () => {
    const checks = [];
    setSummary('Running...');
    try {
        const username = `admin-auto-${Date.now()}`;
        const password = 'secret-pass';
        byId('username').value = username;
        byId('password').value = password;

        const login = await api('/auth/login', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        accessToken = login.accessToken || '';
        refreshToken = login.refreshToken || '';
        expect(Boolean(accessToken), 'Missing access token after login');
        checks.push('auth/login');

        const refreshed = await api('/auth/refresh', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });
        expect(refreshed.refreshed === true, 'auth/refresh did not return refreshed=true');
        checks.push('auth/refresh');

        const me = await api('/auth/me');
        expect(Boolean(me.payload), 'auth/me missing payload');
        checks.push('auth/me');

        const cookieMe = await api('/auth/cookie-me');
        expect(Boolean(cookieMe.payload), 'auth/cookie-me missing payload');
        checks.push('auth/cookie-me');

        const health = await api('/health/');
        expect(health.status === 'ok', 'health check failed');
        checks.push('health');

        const docs = await api('/public/docs');
        expect(Boolean(docs.endpoints), 'public/docs missing endpoints');
        checks.push('public/docs');

        const echo = await api('/public/echo', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ message: 'automated run' }),
        });
        expect(echo.body?.message === 'automated run', 'public/echo mismatch');
        checks.push('public/echo');

        const users = await api('/users/');
        expect(Array.isArray(users.users), 'users list invalid');
        checks.push('users/list');

        const created = await api('/users/', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username: `u-${Date.now()}`, role: 'user', age: 27 }),
        });
        expect(Boolean(created.id), 'users/create missing id');
        const userId = created.id;
        byId('targetUserId').value = userId;
        checks.push('users/create');

        const details = await api(`/users/${userId}`);
        expect(details.id === userId, 'users/details mismatch');
        checks.push('users/details');

        const updated = await api(`/users/${userId}`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ role: 'auditor', age: 28 }),
        });
        expect(updated.role === 'auditor', 'users/update role mismatch');
        checks.push('users/update');

        const removed = await api(`/users/${userId}`, { method: 'DELETE' });
        expect(removed.id === userId, 'users/delete mismatch');
        checks.push('users/delete');

        const logs = await api('/admin/logs');
        expect(Array.isArray(logs.logs), 'admin/logs invalid');
        checks.push('admin/logs');

        const reindex = await api('/admin/tasks/reindex', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({}),
        });
        expect(reindex.started === true, 'admin/reindex failed');
        checks.push('admin/reindex');

        const filePayload = new Blob(['auto-file-content'], { type: 'text/plain' });
        const singleForm = new FormData();
        singleForm.append('avatar', new File([filePayload], 'single.txt', { type: 'text/plain' }));
        singleForm.append('description', 'automation');
        const single = await api('/files/single', { method: 'POST', body: singleForm });
        expect(single.mode === 'single', 'files/single failed');
        checks.push('files/single');

        const arrayForm = new FormData();
        arrayForm.append('attachments', new File([filePayload], 'a1.txt', { type: 'text/plain' }));
        arrayForm.append('attachments', new File([filePayload], 'a2.txt', { type: 'text/plain' }));
        const arrayRes = await api('/files/array', { method: 'POST', body: arrayForm });
        expect(arrayRes.mode === 'array', 'files/array failed');
        checks.push('files/array');

        const fieldsForm = new FormData();
        fieldsForm.append('avatar', new File([filePayload], 'avatar.txt', { type: 'text/plain' }));
        fieldsForm.append('gallery', new File([filePayload], 'g1.txt', { type: 'text/plain' }));
        fieldsForm.append('docs', new File([filePayload], 'd1.txt', { type: 'text/plain' }));
        const fieldsRes = await api('/files/fields', { method: 'POST', body: fieldsForm });
        expect(fieldsRes.mode === 'fields', 'files/fields failed');
        checks.push('files/fields');

        const history = await api('/files/history');
        expect(Array.isArray(history.uploads), 'files/history invalid');
        checks.push('files/history');

        if (!socketClientReady) {
            throw new Error('socket.io client not ready yet');
        }
        if (!activeSocket?.connected) {
            byId('connectSocketBtn').click();
            await new Promise((r) => setTimeout(r, 500));
        }
        await waitForSocketEvent('chat:ready', 7000);
        checks.push('socket/chat:ready');
        await waitForSocketEvent('notification:welcome', 7000);
        checks.push('socket/notification:welcome');

        byId('sendChatBtn').click();
        await waitForSocketEvent('chat:broadcast', 7000);
        checks.push('socket/chat:broadcast');

        byId('pingBtn').click();
        await waitForSocketEvent('notification:pong', 7000);
        checks.push('socket/notification:pong');

        setSummary(`PASS: ${checks.length} checks passed`, true);
        log('automation', { result: 'PASS', checks });
    } catch (error) {
        setSummary(`FAIL: ${error.message}`, false);
        log('automation', { result: 'FAIL', checks, error: error.message });
    }
};

async function loadSocketClientWithRetry(retries = 10) {
    for (let i = 0; i < retries; i++) {
        try {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = `${SOCKET_BASE}/socket.io/socket.io.js`;
                script.async = true;
                script.onload = () => resolve(true);
                script.onerror = () => reject(new Error('failed to load socket client'));
                document.head.appendChild(script);
            });
            if (typeof io === 'function') {
                socketClientReady = true;
                log('socket', 'socket.io client loaded');
                return;
            }
        } catch (_error) {
            await new Promise((r) => setTimeout(r, 500));
        }
    }
    socketClientReady = false;
    log('socket', 'socket.io client script failed to load');
}

loadSocketClientWithRetry();
log('playground-ready', 'Use login first, then test endpoints and sockets.');
