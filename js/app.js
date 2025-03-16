// Firebase 配置
const firebaseConfig = {
    apiKey: "AIzaSyDVkZFZPP15dtqrtJDkCGrXwzx5AWPGLRU",
    authDomain: "user-system-qimeng.firebaseapp.com",
    projectId: "user-system-qimeng",
    storageBucket: "user-system-qimeng.firebasestorage.app",
    messagingSenderId: "726411001480",
    appId: "1:726411001480:web:f36236c4b9391262fca93d",
    measurementId: "G-PSE6HF8GR4"
};

// 全局变量
let currentUser = null;
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
const CURRENT_USER = 'jingtianwei2002'; // 当前登录用户

// 初始化 Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase 初始化成功 - 时间:', '2025-03-16 10:55:31');
} catch (error) {
    console.error('Firebase 初始化失败:', error);
    alert('系统初始化失败，请刷新页面重试');
}

// 获取 Firestore 实例
const db = firebase.firestore();

// 表单验证函数
function validateUsername(username) {
    return /^[a-zA-Z0-9_]{4,20}$/.test(username);
}

function validatePhone(phone) {
    return /^1[3-9]\d{9}$/.test(phone);
}

function validatePassword(password) {
    return password.length >= 6;
}

// 显示错误信息
function showError(inputId, message) {
    const input = document.getElementById(inputId);
    const errorDiv = input.nextElementSibling;
    input.classList.add('error');
    if (errorDiv && errorDiv.classList.contains('error-message')) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

// 清除错误信息
function clearError(inputId) {
    const input = document.getElementById(inputId);
    const errorDiv = input.nextElementSibling;
    input.classList.remove('error');
    if (errorDiv && errorDiv.classList.contains('error-message')) {
        errorDiv.style.display = 'none';
    }
}

// 显示加载状态
function setLoading(isLoading, formType) {
    const loadingElement = document.getElementById(`${formType}Loading`);
    const submitButton = document.getElementById(`${formType}Button`);
    
    if (loadingElement && submitButton) {
        loadingElement.style.display = isLoading ? 'block' : 'none';
        submitButton.disabled = isLoading;
        submitButton.textContent = isLoading ? '处理中...' : (formType === 'login' ? '登录' : '注册');
    }
}

// 界面切换函数
function showElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'block';
    }
}

function hideElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'none';
    }
}

function showLoginForm() {
    hideElement('registerForm');
    hideElement('userPanel');
    hideElement('adminPanel');
    showElement('loginForm');
    clearLoginForm();
}

function showRegisterForm() {
    hideElement('loginForm');
    hideElement('userPanel');
    hideElement('adminPanel');
    showElement('registerForm');
    clearRegisterForm();
}

// 清除表单数据
function clearLoginForm() {
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    clearError('loginUsername');
    clearError('loginPassword');
}

function clearRegisterForm() {
    document.getElementById('registerUsername').value = '';
    document.getElementById('registerPassword').value = '';
    document.getElementById('registerCompany').value = '';
    document.getElementById('registerPhone').value = '';
    clearError('registerUsername');
    clearError('registerPassword');
    clearError('registerCompany');
    clearError('registerPhone');
}

// 登录处理函数
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    let isValid = true;

    // 表单验证
    if (!username) {
        showError('loginUsername', '请输入用户名');
        isValid = false;
    } else {
        clearError('loginUsername');
    }

    if (!password) {
        showError('loginPassword', '请输入密码');
        isValid = false;
    } else {
        clearError('loginPassword');
    }

    if (!isValid) return;

    setLoading(true, 'login');

    try {
        // 管理员登录
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            console.log('管理员登录成功');
            currentUser = { 
                username: ADMIN_USERNAME, 
                role: 'admin',
                loginTime: new Date().toISOString()
            };
            hideElement('loginForm');
            showElement('adminPanel');
            await loadAdminData();
            return;
        }

        // 普通用户登录
        const querySnapshot = await db.collection('users')
            .where('username', '==', username)
            .get();

        if (querySnapshot.empty) {
            showError('loginUsername', '用户名不存在');
            return;
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        if (userData.password !== password) {
            showError('loginPassword', '密码错误');
            return;
        }

        if (!userData.isApproved) {
            showError('loginUsername', '账号待审批，请等待管理员审核');
            return;
        }

        console.log('用户登录成功:', username);
        currentUser = { 
            ...userData, 
            id: userDoc.id,
            loginTime: new Date().toISOString()
        };

        // 更新登录信息
        await db.collection('users').doc(userDoc.id).update({
            lastLogin: new Date().toISOString(),
            loginCount: firebase.firestore.FieldValue.increment(1)
        });

        // 显示用户面板
        document.getElementById('userName').textContent = username;
        hideElement('loginForm');
        showElement('userPanel');
        await loadUserData();

    } catch (error) {
        console.error('登录错误:', error);
        alert('登录失败: ' + error.message);
    } finally {
        setLoading(false, 'login');
    }
}

// 注册处理函数
async function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    const company = document.getElementById('registerCompany').value.trim();
    const phone = document.getElementById('registerPhone').value.trim();
    let isValid = true;

    // 表单验证
    if (!validateUsername(username)) {
        showError('registerUsername', '用户名必须是4-20位的字母、数字或下划线');
        isValid = false;
    } else {
        clearError('registerUsername');
    }

    if (!validatePassword(password)) {
        showError('registerPassword', '密码长度至少6位');
        isValid = false;
    } else {
        clearError('registerPassword');
    }

    if (!company) {
        showError('registerCompany', '请输入单位名称');
        isValid = false;
    } else {
        clearError('registerCompany');
    }

    if (!validatePhone(phone)) {
        showError('registerPhone', '请输入有效的手机号码');
        isValid = false;
    } else {
        clearError('registerPhone');
    }

    if (!isValid) return;

    setLoading(true, 'register');

    try {
        // 检查用户名是否已存在
        const userSnapshot = await db.collection('users')
            .where('username', '==', username)
            .get();

        if (!userSnapshot.empty) {
            showError('registerUsername', '用户名已被使用');
            return;
        }

        // 创建新用户
        await db.collection('users').add({
            username,
            password,
            company,
            phone,
            isApproved: false,
            status: 'pending',
            createdAt: new Date().toISOString(),
            lastLogin: null,
            loginCount: 0,
            createdBy: CURRENT_USER,
            updatedAt: new Date().toISOString()
        });

        alert('注册成功，请等待管理员审批');
        showLoginForm();
        
    } catch (error) {
        console.error('注册错误:', error);
        alert('注册失败: ' + error.message);
    } finally {
        setLoading(false, 'register');
    }
}

// 加载用户数据
async function loadUserData() {
    try {
        const fileListElement = document.getElementById('fileList');
        if (!fileListElement) return;

        fileListElement.innerHTML = '<p>正在加载数据...</p>';

        const snapshot = await db.collection('codefiles')
            .where('uploadedBy', '==', currentUser.username)
            .orderBy('uploadedAt', 'desc')
            .get();

        if (snapshot.empty) {
            fileListElement.innerHTML = '<p>暂无代码文件</p>';
            return;
        }

        let html = '<div class="file-grid">';
        snapshot.forEach(doc => {
            const file = doc.data();
            html += `
                <div class="file-item">
                    <h4>${file.name}</h4>
                    <p>${file.description || '无描述'}</p>
                    <div class="file-meta">
                        <span>上传时间: ${new Date(file.uploadedAt).toLocaleString()}</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        fileListElement.innerHTML = html;

    } catch (error) {
        console.error('加载用户数据失败:', error);
        document.getElementById('fileList').innerHTML = 
            '<p class="error">加载数据失败，请刷新页面重试</p>';
    }
}

// 加载管理员数据
async function loadAdminData() {
    try {
        // 加载待审批用户
        const pendingSnapshot = await db.collection('users')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'desc')
            .get();

        const approvalList = document.getElementById('approvalList');
        if (!approvalList) return;

        if (pendingSnapshot.empty) {
            approvalList.innerHTML = '<p>暂无待审批用户</p>';
            return;
        }

        let html = '<div class="user-grid">';
        pendingSnapshot.forEach(doc => {
            const user = doc.data();
            html += `
                <div class="user-item">
                    <h4>${user.username}</h4>
                    <p>单位: ${user.company}</p>
                    <p>电话: ${user.phone}</p>
                    <p>注册时间: ${new Date(user.createdAt).toLocaleString()}</p>
                    <div class="action-buttons">
                        <button onclick="approveUser('${doc.id}')" class="btn btn-primary">批准</button>
                        <button onclick="rejectUser('${doc.id}')" class="btn btn-danger">拒绝</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        approvalList.innerHTML = html;

    } catch (error) {
        console.error('加载管理员数据失败:', error);
        document.getElementById('approvalList').innerHTML = 
            '<p class="error">加载数据失败，请刷新页面重试</p>';
    }
}

// 审批用户
async function approveUser(userId) {
    try {
        await db.collection('users').doc(userId).update({
            isApproved: true,
            status: 'approved',
            approvedAt: new Date().toISOString(),
            approvedBy: CURRENT_USER,
            updatedAt: new Date().toISOString()
        });
        alert('用户已批准');
        loadAdminData();
    } catch (error) {
        console.error('批准用户失败:', error);
        alert('操作失败: ' + error.message);
    }
}

async function rejectUser(userId) {
    try {
        await db.collection('users').doc(userId).update({
            isApproved: false,
            status: 'rejected',
            rejectedAt: new Date().toISOString(),
            rejectedBy: CURRENT_USER,
            updatedAt: new Date().toISOString()
        });
        alert('已拒绝用户申请');
        loadAdminData();
    } catch (error) {
        console.error('拒绝用户失败:', error);
        alert('操作失败: ' + error.message);
    }
}

// 退出登录
function handleLogout() {
    currentUser = null;
    showLoginForm();
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成，初始化应用...');
    console.log('当前用户:', CURRENT_USER);
    console.log('当前时间:', '2025-03-16 10:55:31');

    // 登录表单事件监听
    const loginForm = document.getElementById('loginFormElement');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // 注册表单事件监听
    const registerForm = document.getElementById('registerFormElement');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // 注册按钮事件监听
    const showRegisterButton = document.getElementById('showRegisterButton');
    if (showRegisterButton) {
        showRegisterButton.addEventListener('click', showRegisterForm);
    }

    // 返回登录按钮事件监听
    const backToLoginButton = document.getElementById('backToLoginButton');
    if (backToLoginButton) {
        backToLoginButton.addEventListener('click', showLoginForm);
    }

    // 退出按钮事件监听
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    const adminLogoutButton = document.getElementById('adminLogoutButton');
    if (adminLogoutButton) {
        adminLogoutButton.addEventListener('click', handleLogout);
    }

        // 显示登录表单
    showLoginForm();
    
    console.log('应用初始化完成');
    console.log('系统时间:', '2025-03-16 11:02:39');
    console.log('当前用户:', 'jingtianwei2002');
});

// 文件操作相关函数
async function uploadFile(fileData) {
    try {
        const docRef = await db.collection('codefiles').add({
            ...fileData,
            uploadedBy: currentUser.username,
            uploadedAt: getCurrentDateTime(),
            lastModified: getCurrentDateTime()
        });
        
        await logUserAction('file_upload', {
            fileId: docRef.id,
            fileName: fileData.name,
            timestamp: getCurrentDateTime()
        });

        return docRef.id;
    } catch (error) {
        console.error('文件上传失败:', error);
        throw error;
    }
}

async function viewFile(fileId) {
    try {
        const doc = await db.collection('codefiles').doc(fileId).get();
        if (!doc.exists) {
            throw new Error('文件不存在');
        }

        await logUserAction('file_view', {
            fileId: fileId,
            timestamp: getCurrentDateTime()
        });

        return doc.data();
    } catch (error) {
        console.error('查看文件失败:', error);
        throw error;
    }
}

async function deleteFile(fileId) {
    try {
        const doc = await db.collection('codefiles').doc(fileId).get();
        if (!doc.exists) {
            throw new Error('文件不存在');
        }

        const fileData = doc.data();
        if (fileData.uploadedBy !== currentUser.username && currentUser.role !== 'admin') {
            throw new Error('没有权限删除此文件');
        }

        await db.collection('codefiles').doc(fileId).delete();
        
        await logUserAction('file_delete', {
            fileId: fileId,
            fileName: fileData.name,
            timestamp: getCurrentDateTime()
        });

        return true;
    } catch (error) {
        console.error('删除文件失败:', error);
        throw error;
    }
}

// 用户管理相关函数
async function updateUserProfile(userId, updateData) {
    try {
        await db.collection('users').doc(userId).update({
            ...updateData,
            updatedAt: getCurrentDateTime(),
            updatedBy: currentUser.username
        });

        await logUserAction('profile_update', {
            userId: userId,
            timestamp: getCurrentDateTime()
        });

        return true;
    } catch (error) {
        console.error('更新用户资料失败:', error);
        throw error;
    }
}

// 系统状态监控
class SystemMonitor {
    constructor() {
        this.startTime = getCurrentDateTime();
        this.lastCheckTime = null;
        this.status = 'running';
        this.errors = [];
    }

    async checkSystem() {
        try {
            this.lastCheckTime = getCurrentDateTime();

            // 检查数据库连接
            const dbTest = await db.collection('system_status').doc('health').get();
            
            // 检查用户会话
            if (currentUser) {
                const sessionDuration = new Date() - new Date(currentUser.loginTime);
                if (sessionDuration > 12 * 60 * 60 * 1000) { // 12小时
                    this.errors.push({
                        type: 'session_expired',
                        time: getCurrentDateTime(),
                        message: '用户会话已过期'
                    });
                    handleLogout();
                }
            }

            // 检查系统资源
            if (performance && performance.memory) {
                const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
                if (memoryUsage > 0.9) {
                    this.errors.push({
                        type: 'high_memory_usage',
                        time: getCurrentDateTime(),
                        message: '系统内存使用过高'
                    });
                }
            }

            // 记录系统状态
            await db.collection('system_status').doc('current').set({
                lastCheck: this.lastCheckTime,
                status: this.status,
                errors: this.errors.slice(-10), // 只保留最近10条错误记录
                currentUser: currentUser?.username || 'none',
                systemStartTime: this.startTime
            });

        } catch (error) {
            console.error('系统状态检查失败:', error);
            this.errors.push({
                type: 'system_check_failed',
                time: getCurrentDateTime(),
                message: error.message
            });
        }
    }
}

// 初始化系统监控
const systemMonitor = new SystemMonitor();
setInterval(() => systemMonitor.checkSystem(), 5 * 60 * 1000); // 每5分钟检查一次

// 添加页面可见性监听
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('页面隐藏 -', getCurrentDateTime());
        // 可以在这里暂停一些非必要的操作
    } else {
        console.log('页面显示 -', getCurrentDateTime());
        // 恢复操作并检查状态
        systemMonitor.checkSystem();
    }
});

// 网络状态监控
window.addEventListener('online', () => {
    console.log('网络已连接 -', getCurrentDateTime());
    document.body.classList.remove('offline');
    systemMonitor.checkSystem();
});

window.addEventListener('offline', () => {
    console.log('网络已断开 -', getCurrentDateTime());
    document.body.classList.add('offline');
    alert('网络连接已断开，部分功能可能无法使用');
});

// 定时清理过期数据
async function cleanupExpiredData() {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 清理日志
        const expiredLogs = await db.collection('logs')
            .where('timestamp', '<', thirtyDaysAgo.toISOString())
            .get();

        const deletePromises = expiredLogs.docs.map(doc => doc.ref.delete());
        await Promise.all(deletePromises);

        console.log('过期数据清理完成 -', getCurrentDateTime());
    } catch (error) {
        console.error('清理过期数据失败:', error);
    }
}

// 每天执行一次清理
const now = new Date();
const tonight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1, // 明天
    2, // 凌晨2点
    0,
    0
);
const timeToCleanup = tonight - now;

setTimeout(() => {
    cleanupExpiredData();
    setInterval(cleanupExpiredData, 24 * 60 * 60 * 1000); // 每24小时执行一次
}, timeToCleanup);

// 导出需要的函数和变量
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;
window.showLoginForm = showLoginForm;
window.showRegisterForm = showRegisterForm;
window.approveUser = approveUser;
window.rejectUser = rejectUser;
window.uploadFile = uploadFile;
window.viewFile = viewFile;
window.deleteFile = deleteFile;
window.updateUserProfile = updateUserProfile;

// 添加系统状态信息
console.log('系统信息:', {
    currentTime: '2025-03-16 11:04:13',
    currentUser: 'jingtianwei2002',
    environment: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        online: navigator.onLine
    },
    firebaseInitialized: !!firebase.apps.length
});

// 添加错误处理装饰器
function withErrorHandling(fn, actionName) {
    return async function (...args) {
        try {
            const result = await fn.apply(this, args);
            await logUserAction(actionName, {
                success: true,
                timestamp: getCurrentDateTime(),
                args: args
            });
            return result;
        } catch (error) {
            console.error(`${actionName} 失败:`, error);
            await logUserAction(actionName, {
                success: false,
                error: error.message,
                timestamp: getCurrentDateTime(),
                args: args
            });
            throw error;
        }
    };
}

// 使用错误处理装饰器包装关键函数
window.handleLogin = withErrorHandling(handleLogin, 'login');
window.handleRegister = withErrorHandling(handleRegister, 'register');
window.approveUser = withErrorHandling(approveUser, 'approve_user');
window.rejectUser = withErrorHandling(rejectUser, 'reject_user');

// 添加性能监控
if (window.performance && window.performance.mark) {
    window.performance.mark('app_init_end');
    window.performance.measure('app_initialization', 'app_init_start', 'app_init_end');
    
    const measurements = window.performance.getEntriesByType('measure');
    console.log('应用初始化性能:', measurements[measurements.length - 1]);
}

// 添加自动重试机制
async function withRetry(fn, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            console.warn(`操作失败，第 ${i + 1} 次重试...`);
            await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
    }
    
    throw lastError;
}

// 导出更多工具函数
window.withRetry = withRetry;
window.getCurrentDateTime = getCurrentDateTime;
window.systemMonitor = systemMonitor;

// 添加调试信息
if (process.env.NODE_ENV === 'development') {
    window._debug = {
        currentUser,
        db,
        systemMonitor,
        firebase
    };
}

// 初始化完成标记
window.APP_INITIALIZED = true;
document.dispatchEvent(new Event('app_initialized'));

console.log('应用加载完成 -', getCurrentDateTime());
