// 全局常量
const CURRENT_TIME = '2025-03-16 11:25:33';
const CURRENT_USER = 'jingtianwei2002';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

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

// 初始化 Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase 初始化成功 -', CURRENT_TIME);
} catch (error) {
    console.error('Firebase 初始化失败:', error);
    alert('系统初始化失败，请刷新页面重试');
}

const db = firebase.firestore();
let currentUser = null;

// 工具函数
function showLoading(show = true) {
    document.getElementById('loadingIndicator').style.display = show ? 'block' : 'none';
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    const errorDiv = element.nextElementSibling;
    if (errorDiv && errorDiv.classList.contains('error-message')) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

function clearError(elementId) {
    const element = document.getElementById(elementId);
    const errorDiv = element.nextElementSibling;
    if (errorDiv && errorDiv.classList.contains('error-message')) {
        errorDiv.style.display = 'none';
    }
}

// 表单验证
function validateUsername(username) {
    return username.length >= 3 && username.length <= 20;
}

function validatePhone(phone) {
    return /^1[3-9]\d{9}$/.test(phone);
}

function validatePassword(password) {
    return password.length >= 6;
}

// 页面切换
function hideAllForms() {
    const forms = ['loginForm', 'registerForm', 'statusQueryForm', 'userPanel', 'adminPanel'];
    forms.forEach(id => {
        document.getElementById(id).style.display = 'none';
    });
}

function showLoginForm() {
    hideAllForms();
    document.getElementById('loginForm').style.display = 'block';
}

function showRegisterForm() {
    hideAllForms();
    document.getElementById('registerForm').style.display = 'block';
}

function showStatusQuery() {
    hideAllForms();
    document.getElementById('statusQueryForm').style.display = 'block';
}

// 登录处理
async function handleLogin(event) {
    event.preventDefault();
    console.log('处理登录请求...');

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    // 验证输入
    let isValid = true;
    if (!username) {
        showError('loginUsername', '请输入用户名');
        isValid = false;
    }
    if (!password) {
        showError('loginPassword', '请输入密码');
        isValid = false;
    }
    if (!isValid) return;

    showLoading(true);
    try {
        // 管理员登录
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            console.log('管理员登录成功');
            currentUser = {
                username: ADMIN_USERNAME,
                role: 'admin',
                loginTime: CURRENT_TIME
            };
            hideAllForms();
            document.getElementById('adminPanel').style.display = 'block';
            loadPendingUsers();
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

        if (userData.status !== 'approved') {
            showError('loginUsername', '账号尚未通过审核');
            return;
        }

        currentUser = {
            ...userData,
            id: userDoc.id
        };

        hideAllForms();
        document.getElementById('userPanel').style.display = 'block';
        document.getElementById('userWelcome').textContent = username;
        loadUserCodeList();

    } catch (error) {
        console.error('登录失败:', error);
        alert('登录失败: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// 注册处理
async function handleRegister(event) {
    event.preventDefault();

    const username = document.getElementById('registerUsername').value.trim();
    const company = document.getElementById('registerCompany').value.trim();
    const phone = document.getElementById('registerPhone').value.trim();
    const password = document.getElementById('registerPassword').value;

    // 验证输入
    let isValid = true;
    if (!validateUsername(username)) {
        showError('registerUsername', '用户名长度需在3-20个字符之间');
        isValid = false;
    }
    if (!company) {
        showError('registerCompany', '请输入单位名称');
        isValid = false;
    }
    if (!validatePhone(phone)) {
        showError('registerPhone', '请输入有效的手机号码');
        isValid = false;
    }
    if (!validatePassword(password)) {
        showError('registerPassword', '密码长度至少为6个字符');
        isValid = false;
    }
    if (!isValid) return;

    showLoading(true);
    try {
        // 检查用户名是否已存在
        const existingUser = await db.collection('users')
            .where('username', '==', username)
            .get();

        if (!existingUser.empty) {
            showError('registerUsername', '用户名已被使用');
            return;
        }

        // 创建新用户
        await db.collection('users').add({
            username,
            company,
            phone,
            password,
            status: 'pending',
            createdAt: CURRENT_TIME,
            createdBy: CURRENT_USER
        });

        alert('注册申请已提交，请等待管理员审核');
        showLoginForm();

    } catch (error) {
        console.error('注册失败:', error);
        alert('注册失败: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// 状态查询
async function handleStatusQuery(event) {
    event.preventDefault();

    const phone = document.getElementById('queryPhone').value.trim();
    if (!validatePhone(phone)) {
        showError('queryPhone', '请输入有效的手机号码');
        return;
    }

    showLoading(true);
    try {
        const querySnapshot = await db.collection('users')
            .where('phone', '==', phone)
            .get();

        const resultDiv = document.getElementById('queryResult');
        if (querySnapshot.empty) {
            resultDiv.innerHTML = '<p class="error">未找到注册信息</p>';
            return;
        }

        const userData = querySnapshot.docs[0].data();
        const statusText = {
            pending: '待审核',
            approved: '已通过',
            rejected: '已拒绝'
        }[userData.status];

        resultDiv.innerHTML = `
            <div class="card">
                <h3>查询结果</h3>
                <p>用户名: ${userData.username}</p>
                <p>单位: ${userData.company}</p>
                <p>状态: ${statusText}</p>
                <p>申请时间: ${userData.createdAt}</p>
            </div>
        `;

    } catch (error) {
        console.error('查询失败:', error);
        alert('查询失败: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// 管理员功能
async function loadPendingUsers() {
    showLoading(true);
    try {
        const snapshot = await db.collection('users')
            .where('status', '==', 'pending')
            .get();

        const pendingList = document.getElementById('pendingList');
        if (snapshot.empty) {
            pendingList.innerHTML = '<p>暂无待审核用户</p>';
            return;
        }

        pendingList.innerHTML = snapshot.docs.map(doc => {
            const user = doc.data();
            return `
                <div class="card">
                    <h3>${user.username}</h3>
                    <p>单位: ${user.company}</p>
                    <p>电话: ${user.phone}</p>
                    <p>申请时间: ${user.createdAt}</p>
                    <div class="actions">
                        <button onclick="handleApprove('${doc.id}')" class="btn btn-primary">通过</button>
                        <button onclick="handleReject('${doc.id}')" class="btn btn-danger">拒绝</button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('加载待审核用户失败:', error);
        alert('加载失败: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function handleApprove(userId) {
    if (!confirm('确定通过该用户的申请吗？')) return;

    showLoading(true);
    try {
        await db.collection('users').doc(userId).update({
            status: 'approved',
            approvedAt: CURRENT_TIME,
            approvedBy: currentUser.username
        });

        alert('已通过用户申请');
        loadPendingUsers();

    } catch (error) {
        console.error('审批失败:', error);
        alert('操作失败: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function handleReject(userId) {
    if (!confirm('确定拒绝该用户的申请吗？')) return;

    showLoading(true);
    try {
        await db.collection('users').doc(userId).update({
            status: 'rejected',
            rejectedAt: CURRENT_TIME,
            rejectedBy: currentUser.username
        });

        alert('已拒绝用户申请');
        loadPendingUsers();

    } catch (error) {
        console.error('拒绝失败:', error);
        alert('操作失败: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// 代码文件管理
function showUploadForm() {
    document.getElementById('modalTitle').textContent = '上传代码';
    document.getElementById('codeId').value = '';
    document.getElementById('fileName').value = '';
    document.getElementById('codeContent').value = '';
    document.getElementById('codeModal').style.display = 'block';
}

function hideCodeModal() {
    document.getElementById('codeModal').style.display = 'none';
}

async function handleCodeSubmit(event) {
    event.preventDefault();

    const fileName = document.getElementById('fileName').value.trim();
    const content = document.getElementById('codeContent').value.trim();
    const codeId = document.getElementById('codeId').value;

    if (!fileName || !content) {
        alert('请填写所有必填字段');
        return;
    }

    showLoading(true);
    try {
        if (codeId) {
            // 更新现有代码
            await db.collection('codes').doc(codeId).update({
                fileName,
                content,
                updatedAt: CURRENT_TIME,
                updatedBy: currentUser.username
            });
        } else {
            // 添加新代码
            await db.collection('codes').add({
                fileName,
                content,
                createdAt: CURRENT_TIME,
                createdBy: currentUser.username,
                updatedAt: CURRENT_TIME,
                updatedBy: currentUser.username
            });
        }

        alert(codeId ? '代码已更新' : '代码已上传');
        hideCodeModal();
        if (currentUser.role === 'admin') {
            loadAdminCodeList();
        } else {
            loadUserCodeList();
        }

    } catch (error) {
        console.error('保存代码失败:', error);
        alert('操作失败: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function loadUserCodeList() {
    showLoading(true);
    try {
        const snapshot = await db.collection('codes')
            .orderBy('createdAt', 'desc')
            .get();

        const codeList = document.getElementById('userCodeList');
        if (snapshot.empty) {
            codeList.innerHTML = '<p>暂无代码文件</p>';
            return;
        }

        codeList.innerHTML = snapshot.docs.map(doc => {
            const code = doc.data();
            return `
                <div class="code-item">
                    <h3>${code.fileName}</h3>
                    <p>创建者: ${code.createdBy}</p>
                    <p>创建时间: ${code.createdAt}</p>
                    <div class="code-actions">
                        <button onclick="viewCode('${doc.id}')" class="btn btn-secondary">查看</button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('加载代码列表失败:', error);
        alert('加载失败: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function loadAdminCodeList() {
    showLoading(true);
    try {
        const snapshot = await db.collection('codes')
            .orderBy('createdAt', 'desc')
            .get();

        const codeList = document.getElementById('adminCodeList');
        if (snapshot.empty) {
            codeList.innerHTML = '<p>暂无代码文件</p>';
            return;
        }

        codeList.innerHTML = snapshot.docs.map(doc => {
            const code = doc.data();
            return `
                <div class="code-item">
                    <h3>${code.fileName}</h3>
                    <p>创建者: ${code.createdBy}</p>
                    <p>创建时间: ${code.createdAt}</p>
                    <div class="code-actions">
                        <button onclick="viewCode('${doc.id}')" class="btn btn-secondary">查看</button>
                                                <button onclick="editCode('${doc.id}')" class="btn btn-primary">编辑</button>
                        <button onclick="deleteCode('${doc.id}')" class="btn btn-danger">删除</button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('加载代码列表失败:', error);
        alert('加载失败: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function viewCode(codeId) {
    showLoading(true);
    try {
        const doc = await db.collection('codes').doc(codeId).get();
        if (!doc.exists) {
            alert('代码文件不存在');
            return;
        }

        const code = doc.data();
        document.getElementById('modalTitle').textContent = '查看代码';
        document.getElementById('fileName').value = code.fileName;
        document.getElementById('fileName').readOnly = true;
        document.getElementById('codeContent').value = code.content;
        document.getElementById('codeContent').readOnly = true;
        document.getElementById('codeForm').onsubmit = null;
        document.getElementById('codeModal').style.display = 'block';

    } catch (error) {
        console.error('查看代码失败:', error);
        alert('操作失败: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function editCode(codeId) {
    showLoading(true);
    try {
        const doc = await db.collection('codes').doc(codeId).get();
        if (!doc.exists) {
            alert('代码文件不存在');
            return;
        }

        const code = doc.data();
        document.getElementById('modalTitle').textContent = '编辑代码';
        document.getElementById('codeId').value = codeId;
        document.getElementById('fileName').value = code.fileName;
        document.getElementById('fileName').readOnly = false;
        document.getElementById('codeContent').value = code.content;
        document.getElementById('codeContent').readOnly = false;
        document.getElementById('codeForm').onsubmit = handleCodeSubmit;
        document.getElementById('codeModal').style.display = 'block';

    } catch (error) {
        console.error('编辑代码失败:', error);
        alert('操作失败: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function deleteCode(codeId) {
    if (!confirm('确定要删除这个代码文件吗？此操作不可恢复。')) {
        return;
    }

    showLoading(true);
    try {
        await db.collection('codes').doc(codeId).delete();
        alert('代码文件已删除');
        if (currentUser.role === 'admin') {
            loadAdminCodeList();
        } else {
            loadUserCodeList();
        }
    } catch (error) {
        console.error('删除代码失败:', error);
        alert('操作失败: ' + error.message);
    } finally {
        showLoading(false);
    }
}

function handleLogout() {
    currentUser = null;
    showLoginForm();
}

function switchTab(tabId) {
    const tabs = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.panel');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    panels.forEach(panel => panel.classList.remove('active'));
    
    const selectedTab = document.querySelector(`[onclick="switchTab('${tabId}')"]`);
    const selectedPanel = document.getElementById(tabId);
    
    if (selectedTab && selectedPanel) {
        selectedTab.classList.add('active');
        selectedPanel.classList.add('active');
    }

    if (tabId === 'codeFiles') {
        loadAdminCodeList();
    } else if (tabId === 'pendingUsers') {
        loadPendingUsers();
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 绑定表单提交事件
    document.getElementById('loginFormElement').addEventListener('submit', handleLogin);
    document.getElementById('registerFormElement').addEventListener('submit', handleRegister);
    document.getElementById('statusQueryElement').addEventListener('submit', handleStatusQuery);
    document.getElementById('codeForm').addEventListener('submit', handleCodeSubmit);

    // 显示登录表单
    showLoginForm();
    
    console.log('系统初始化完成 -', CURRENT_TIME);
    console.log('当前用户:', CURRENT_USER);
});

// 导出全局函数
window.showLoginForm = showLoginForm;
window.showRegisterForm = showRegisterForm;
window.showStatusQuery = showStatusQuery;
window.handleLogout = handleLogout;
window.showUploadForm = showUploadForm;
window.hideCodeModal = hideCodeModal;
window.handleApprove = handleApprove;
window.handleReject = handleReject;
window.viewCode = viewCode;
window.editCode = editCode;
window.deleteCode = deleteCode;
window.switchTab = switchTab;
