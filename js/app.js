// 全局常量
const CURRENT_TIME = '2025-03-16 11:11:39';
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

// 全局变量
let currentUser = null;

// 初始化 Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase 初始化成功 -', CURRENT_TIME);
} catch (error) {
    console.error('Firebase 初始化失败:', error);
    alert('系统初始化失败，请刷新页面重试');
}

// 获取 Firestore 实例
const db = firebase.firestore();

// 工具函数
function showError(elementId, message) {
    const element = document.getElementById(elementId);
    const errorDiv = element.nextElementSibling;
    element.classList.add('error');
    if (errorDiv && errorDiv.classList.contains('error-message')) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

function clearError(elementId) {
    const element = document.getElementById(elementId);
    const errorDiv = element.nextElementSibling;
    element.classList.remove('error');
    if (errorDiv && errorDiv.classList.contains('error-message')) {
        errorDiv.style.display = 'none';
    }
}

function showLoading(show = true) {
    document.getElementById('loadingIndicator').style.display = show ? 'block' : 'none';
}

// 表单验证
function validateUsername(username) {
    return /^[a-zA-Z0-9_]{4,20}$/.test(username);
}

function validatePhone(phone) {
    return /^1[3-9]\d{9}$/.test(phone);
}

function validatePassword(password) {
    return password.length >= 6;
}

// 界面控制
function showPanel(panelId) {
    const panels = ['loginPanel', 'registerPanel', 'statusQueryPanel', 'userPanel', 'adminPanel'];
    panels.forEach(id => {
        document.getElementById(id).style.display = id === panelId ? 'block' : 'none';
    });
}

function showLoginPanel() {
    showPanel('loginPanel');
}

function showRegisterPanel() {
    showPanel('registerPanel');
}

function showStatusQuery() {
    showPanel('statusQueryPanel');
}

function showTab(tabId) {
    const tabs = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.panel');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    panels.forEach(panel => panel.classList.remove('active'));
    
    const selectedTab = document.querySelector(`[onclick="showTab('${tabId}')"]`);
    const selectedPanel = document.getElementById(tabId);
    
    if (selectedTab && selectedPanel) {
        selectedTab.classList.add('active');
        selectedPanel.classList.add('active');
    }
}

// 登录处理
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
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
            currentUser = { username: ADMIN_USERNAME, role: 'admin' };
            showPanel('adminPanel');
            loadAdminData();
            return;
        }

        // 普通用户登录
        const userSnapshot = await db.collection('users')
            .where('username', '==', username)
            .get();

        if (userSnapshot.empty) {
            showError('loginUsername', '用户名不存在');
            return;
        }

        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data();

        if (userData.password !== password) {
            showError('loginPassword', '密码错误');
            return;
        }

        if (!userData.isApproved) {
            showError('loginUsername', '账号待审批，请等待管理员审核');
            return;
        }

        currentUser = { ...userData, id: userDoc.id };
        
        // 更新登录信息
        await db.collection('users').doc(userDoc.id).update({
            lastLogin: CURRENT_TIME,
            loginCount: firebase.firestore.FieldValue.increment(1)
        });

        document.getElementById('userName').textContent = username;
        showPanel('userPanel');
        loadUserData();

    } catch (error) {
        console.error('登录错误:', error);
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
    let isValid = true;

    if (!validateUsername(username)) {
        showError('registerUsername', '用户名必须是4-20位的字母、数字或下划线');
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
        showError('registerPassword', '密码长度至少6位');
        isValid = false;
    }

    if (!isValid) return;

    showLoading(true);
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
            createdAt: CURRENT_TIME,
            createdBy: CURRENT_USER,
            lastLogin: null,
            loginCount: 0
        });

        alert('注册成功，请等待管理员审批');
        showLoginPanel();
        
    } catch (error) {
        console.error('注册错误:', error);
        alert('注册失败: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// 状态查询处理
async function handleStatusQuery(event) {
    event.preventDefault();
    
    const phone = document.getElementById('queryPhone').value.trim();
    
    if (!validatePhone(phone)) {
        showError('queryPhone', '请输入有效的手机号码');
        return;
    }

    showLoading(true);
    try {
        const userSnapshot = await db.collection('users')
            .where('phone', '==', phone)
            .get();

        const statusResult = document.getElementById('statusResult');
        const statusContent = document.getElementById('statusContent');
        
        if (userSnapshot.empty) {
            statusContent.innerHTML = '<p class="error">未找到注册信息</p>';
        } else {
            const userData = userSnapshot.docs[0].data();
            let statusText = '';
            let statusClass = '';
            
            switch(userData.status) {
                case 'pending':
                    statusText = '待审核';
                    statusClass = 'status-pending';
                    break;
                case 'approved':
                    statusText = '已通过';
                    statusClass = 'status-approved';
                    break;
                case 'rejected':
                    statusText = '已拒绝';
                    statusClass = 'status-rejected';
                    break;
            }
            
            statusContent.innerHTML = `
                <p>用户名: ${userData.username}</p>
                <p>单位: ${userData.company}</p>
                <p>状态: <span class="status-badge ${statusClass}">${statusText}</span></p>
                <p>申请时间: ${userData.createdAt}</p>
            `;
        }
        
        statusResult.style.display = 'block';
        
    } catch (error) {
        console.error('查询错误:', error);
        alert('查询失败: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// 加载管理员数据
async function loadAdminData() {
    showLoading(true);
    try {
        // 加载待审批用户
        const pendingSnapshot = await db.collection('users')
            .where('status', '==', 'pending')
            .get();

        const pendingList = document.getElementById('pendingList');
        pendingList.innerHTML = pendingSnapshot.empty ? 
            '<p>暂无待审批用户</p>' : 
            pendingSnapshot.docs.map(doc => {
                const user = doc.data();
                return `
                    <div class="card">
                        <h3>${user.username}</h3>
                        <p>单位: ${user.company}</p>
                        <p>电话: ${user.phone}</p>
                        <p>申请时间: ${user.createdAt}</p>
                        <div class="actions">
                            <button onclick="approveUser('${doc.id}')" class="btn btn-primary">批准</button>
                            <button onclick="rejectUser('${doc.id}')" class="btn btn-danger">拒绝</button>
                        </div>
                    </div>
                `;
            }).join('');

        // 加载代码文件
        loadCodeFiles();
        
    } catch (error) {
        console.error('加载管理员数据失败:', error);
        alert('加载数据失败: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// 批准用户
async function approveUser(userId) {
    showLoading(true);
    try {
        await db.collection('users').doc(userId).update({
            isApproved: true,
            status: 'approved',
            approvedAt: CURRENT_TIME,
            approvedBy: CURRENT_USER
        });
        alert('用户已批准');
        loadAdminData();
    } catch (error) {
        console.error('批准用户失败:', error);
        alert('操作失败: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// 拒绝用户
async function rejectUser(userId) {
    showLoading(true);
    try {
        await db.collection('users').doc(userId).update({
            isApproved: false,
            status: 'rejected',
            rejectedAt: CURRENT_TIME,
            rejectedBy: CURRENT_USER
        });
        alert('已拒绝用户申请');
        loadAdminData();
    } catch (error) {
        console.error('拒绝用户失败:', error);
        alert('操作失败: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// 代码文件管理
function showUploadModal() {
    document.getElementById('uploadModal').style.display = 'block';
}

function hideUploadModal() {
    document.getElementById('uploadModal').style.display = 'none';
    document.getElementById('uploadForm').reset();
}

async function handleUpload(event) {
    event.preventDefault();
    
    const fileName = document.getElementById('codeFileName').value.trim();
    const language = document.getElementById('codeLanguage').value;
    const content = document.getElementById('codeContent').value.trim();
    const description = document.getElementById('codeDescription').value.trim();

    if (!fileName || !content) {
        alert('请填写必填字段');
        return;
    }

    showLoading(true);
    try {
        await db.collection('codefiles').add({
            name: fileName,
            language,
            content,
            description,
            uploadedBy: currentUser.username,
            uploadedAt: CURRENT_TIME,
            lastModified: CURRENT_TIME
        });

        alert('代码文件上传成功');
        hideUploadModal();
        loadCodeFiles();
    } catch (error) {
        console.error('上传失败:', error);
        alert('上传失败: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function loadCodeFiles() {
    showLoading(true);
    try {
        const fileListElement = currentUser.role === 'admin' ? 
            document.getElementById('adminFileList') : 
            document.getElementById('fileList');

        const snapshot = await db.collection('codefiles')
            .orderBy('uploadedAt', 'desc')
            .get();

        if (snapshot.empty) {
            fileListElement.innerHTML = '<p>暂无代码文件</p>';
            return;
        }

        fileListElement.innerHTML = snapshot.docs.map(doc => {
            const file = doc.data();
            return `
                <div class="code-item">
                    <h3>${file.name}</h3>
                    <p>语言: ${file.language}</p>
                    <p>上传者: ${file.uploadedBy}</p>
                    <p>上传时间: ${file.uploadedAt}</p>
                    <div class="code-actions">
                        <button onclick="viewCode('${doc.id}')" class="btn btn-secondary">查看</button>
                        ${currentUser.role === 'admin' || file.uploadedBy === currentUser.username ? `
                            <button onclick="editCode('${doc.id}')" class="btn btn-primary">编辑</button>
                            <button onclick="deleteCode('${doc.id}')" class="btn btn-danger">删除</button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('加载代码文件失败:', error);
        alert('加载失败: ' + error.message);
    } finally         showLoading(false);
    }
}

// 代码文件操作
async function viewCode(fileId) {
    showLoading(true);
    try {
        const doc = await db.collection('codefiles').doc(fileId).get();
        if (!doc.exists) {
            alert('文件不存在');
            return;
        }

        const file = doc.data();
        const modal = document.getElementById('uploadModal');
        const modalContent = modal.querySelector('.modal-content');
        
        modalContent.innerHTML = `
            <span class="close" onclick="hideUploadModal()">&times;</span>
            <h2>查看代码 - ${file.name}</h2>
            <div class="form-group">
                <label class="form-label">语言</label>
                <input type="text" value="${file.language}" class="form-input" readonly>
            </div>
            <div class="form-group">
                <label class="form-label">代码内容</label>
                <textarea class="form-input" rows="10" readonly>${file.content}</textarea>
            </div>
            <div class="form-group">
                <label class="form-label">描述</label>
                <textarea class="form-input" rows="3" readonly>${file.description || ''}</textarea>
            </div>
            <div class="form-group">
                <p>上传者: ${file.uploadedBy}</p>
                <p>上传时间: ${file.uploadedAt}</p>
                <p>最后修改: ${file.lastModified}</p>
            </div>
        `;
        
        modal.style.display = 'block';
        
    } catch (error) {
        console.error('查看代码失败:', error);
        alert('操作失败: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function editCode(fileId) {
    showLoading(true);
    try {
        const doc = await db.collection('codefiles').doc(fileId).get();
        if (!doc.exists) {
            alert('文件不存在');
            return;
        }

        const file = doc.data();
        
        // 检查权限
        if (currentUser.role !== 'admin' && file.uploadedBy !== currentUser.username) {
            alert('没有权限编辑此文件');
            return;
        }

        const modal = document.getElementById('uploadModal');
        const modalContent = modal.querySelector('.modal-content');
        
        modalContent.innerHTML = `
            <span class="close" onclick="hideUploadModal()">&times;</span>
            <h2>编辑代码</h2>
            <form id="editForm" onsubmit="updateCode('${fileId}', event)">
                <div class="form-group">
                    <label class="form-label">文件名</label>
                    <input type="text" id="editFileName" class="form-input" value="${file.name}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">语言</label>
                    <select id="editLanguage" class="form-input">
                        <option value="JavaScript" ${file.language === 'JavaScript' ? 'selected' : ''}>JavaScript</option>
                        <option value="Python" ${file.language === 'Python' ? 'selected' : ''}>Python</option>
                        <option value="Java" ${file.language === 'Java' ? 'selected' : ''}>Java</option>
                        <option value="HTML" ${file.language === 'HTML' ? 'selected' : ''}>HTML</option>
                        <option value="CSS" ${file.language === 'CSS' ? 'selected' : ''}>CSS</option>
                        <option value="Other" ${file.language === 'Other' ? 'selected' : ''}>其他</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">代码内容</label>
                    <textarea id="editContent" class="form-input" rows="10" required>${file.content}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">描述</label>
                    <textarea id="editDescription" class="form-input" rows="3">${file.description || ''}</textarea>
                </div>
                <button type="submit" class="btn btn-primary">保存修改</button>
            </form>
        `;
        
        modal.style.display = 'block';
        
    } catch (error) {
        console.error('编辑代码失败:', error);
        alert('操作失败: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function updateCode(fileId, event) {
    event.preventDefault();
    showLoading(true);
    
    try {
        const fileName = document.getElementById('editFileName').value.trim();
        const language = document.getElementById('editLanguage').value;
        const content = document.getElementById('editContent').value.trim();
        const description = document.getElementById('editDescription').value.trim();

        if (!fileName || !content) {
            alert('请填写必填字段');
            return;
        }

        await db.collection('codefiles').doc(fileId).update({
            name: fileName,
            language,
            content,
            description,
            lastModified: CURRENT_TIME,
            modifiedBy: currentUser.username
        });

        alert('代码更新成功');
        hideUploadModal();
        loadCodeFiles();
        
    } catch (error) {
        console.error('更新代码失败:', error);
        alert('操作失败: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function deleteCode(fileId) {
    if (!confirm('确定要删除这个代码文件吗？此操作不可撤销。')) {
        return;
    }

    showLoading(true);
    try {
        const doc = await db.collection('codefiles').doc(fileId).get();
        if (!doc.exists) {
            alert('文件不存在');
            return;
        }

        const file = doc.data();
        
        // 检查权限
        if (currentUser.role !== 'admin' && file.uploadedBy !== currentUser.username) {
            alert('没有权限删除此文件');
            return;
        }

        await db.collection('codefiles').doc(fileId).delete();
        alert('代码文件已删除');
        loadCodeFiles();
        
    } catch (error) {
        console.error('删除代码失败:', error);
        alert('操作失败: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// 初始化事件监听器
document.addEventListener('DOMContentLoaded', () => {
    // 登录表单
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // 注册表单
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    // 状态查询表单
    document.getElementById('statusQueryForm').addEventListener('submit', handleStatusQuery);
    
    // 上传表单
    document.getElementById('uploadForm').addEventListener('submit', handleUpload);
    
    // 显示登录面板
    showLoginPanel();
    
    console.log('系统初始化完成 -', CURRENT_TIME);
});

// 退出登录
function handleLogout() {
    currentUser = null;
    showLoginPanel();
}

// 导出全局函数
window.showLoginPanel = showLoginPanel;
window.showRegisterPanel = showRegisterPanel;
window.showStatusQuery = showStatusQuery;
window.handleLogout = handleLogout;
window.showUploadModal = showUploadModal;
window.hideUploadModal = hideUploadModal;
window.viewCode = viewCode;
window.editCode = editCode;
window.deleteCode = deleteCode;
window.showTab = showTab;
window.approveUser = approveUser;
window.rejectUser = rejectUser;
