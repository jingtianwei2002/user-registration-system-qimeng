// Firebase 配置
const firebaseConfig = {
    // 这里需要填入你的 Firebase 配置信息
  apiKey: "AIzaSyDVkZFZPP15dtqrtJDkCGrXwzx5AWPGLRU",
  authDomain: "user-system-qimeng.firebaseapp.com",
  projectId: "user-system-qimeng",
  storageBucket: "user-system-qimeng.firebasestorage.app",
  messagingSenderId: "726411001480",
  appId: "1:726411001480:web:f36236c4b9391262fca93d",
  measurementId: "G-PSE6HF8GR4"
};


// 初始化 Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// 获取 Firestore 实例
const db = firebase.firestore();

// 全局变量
let currentUser = null;
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';


// 用户注册函数
async function register() {
    try {
        // 获取表单数据
        const username = document.getElementById('registerUsername').value.trim();
        const password = document.getElementById('registerPassword').value;
        const company = document.getElementById('registerCompany').value.trim();
        const phone = document.getElementById('registerPhone').value.trim();

        console.log('开始注册流程...', { username, company, phone });

        // 表单验证
        if (!username || !password || !company || !phone) {
            alert('请填写所有必填字段');
            return;
        }

        // 验证用户名格式
        if (!validateUsername(username)) {
            alert('用户名必须是4-20位的字母、数字或下划线');
            return;
        }

        // 验证密码长度
        if (!validatePassword(password)) {
            alert('密码长度必须至少6位');
            return;
        }

        // 验证手机号格式
        if (!validatePhone(phone)) {
            alert('请输入正确的手机号码');
            return;
        }

        // 检查是否是管理员用户名
        if (username === ADMIN_USERNAME) {
            alert('此用户名不可用');
            return;
        }

        // 检查用户名是否已存在
        const userSnapshot = await db.collection('users')
            .where('username', '==', username)
            .get();

        if (!userSnapshot.empty) {
            alert('该用户名已被使用');
            return;
        }

        // 创建用户数据
        const userData = {
            username: username,
            password: password,
            company: company,
            phone: phone,
            isApproved: false,
            role: 'user',
            createdAt: getCurrentDateTime(),
            lastLogin: null,
            registeredBy: 'self',
            status: 'pending', // pending, approved, rejected
            approvalDate: null,
            approvedBy: null,
            notes: '',
            lastUpdated: getCurrentDateTime(),
            loginCount: 0,
            lastIP: '',
            deviceInfo: navigator.userAgent
        };

        // 保存到数据库
        await db.collection('users').add(userData);

        // 清除表单
        clearRegistrationForm();

        // 提示用户并返回登录页面
        alert('注册申请已提交，请等待管理员审批');
        showLoginForm();

    } catch (error) {
        console.error('注册错误:', error);
        alert('注册失败: ' + error.message);
    }
}

// 验证用户名格式（4-20位字母、数字或下划线）
function validateUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_]{4,20}$/;
    return usernameRegex.test(username);
}

// 验证密码长度（至少6位）
function validatePassword(password) {
    return password.length >= 6;
}

// 验证手机号码格式（中国大陆手机号）
function validatePhone(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
}

// 加载待审批用户列表
async function loadPendingApprovals() {
    const approvalList = document.getElementById('approvalList');
    if (!approvalList) return;
    
    approvalList.innerHTML = '<p>正在加载...</p>';

    try {
        // 只获取状态为 pending 的用户
        const snapshot = await db.collection('users')
            .where('status', '==', 'pending')
            .get();

        if (snapshot.empty) {
            approvalList.innerHTML = '<p>没有待审批的用户</p>';
            return;
        }

        let tableHTML = `
            <table class="user-table">
                <thead>
                    <tr>
                        <th>用户名</th>
                        <th>单位</th>
                        <th>电话</th>
                        <th>注册时间</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
        `;

        snapshot.forEach(doc => {
            const user = doc.data();
            tableHTML += `
                <tr>
                    <td>${user.username}</td>
                    <td>${user.company || '-'}</td>
                    <td>${user.phone || '-'}</td>
                    <td>${user.createdAt || '-'}</td>
                    <td>
                        <button onclick="approveUser('${doc.id}')" class="btn primary btn-small">批准</button>
                        <button onclick="rejectUser('${doc.id}')" class="btn danger btn-small">拒绝</button>
                    </td>
                </tr>
            `;
        });

        tableHTML += '</tbody></table>';
        approvalList.innerHTML = tableHTML;

    } catch (error) {
        console.error('加载待审批用户失败:', error);
        approvalList.innerHTML = `<p>加载失败: ${error.message}</p>`;
    }
}

// 获取用户状态显示文本
function getUserStatus(status) {
    const statusMap = {
        'pending': '待审核',
        'approved': '已批准',
        'rejected': '已拒绝',
        'disabled': '已禁用'
    };
    return statusMap[status] || status;
}

// 批准用户
async function approveUser(userId) {
    try {
        if (!currentUser || currentUser.username !== ADMIN_USERNAME) {
            alert('只有管理员可以审批用户');
            return;
        }

        // 更新用户状态
        const updateData = {
            isApproved: true,
            status: 'approved',
            approvalDate: getCurrentDateTime(),
            approvedBy: ADMIN_USERNAME,
            lastUpdated: getCurrentDateTime(),
            loginCount: 0
        };

        await db.collection('users').doc(userId).update(updateData);
        alert('用户已批准');
        
        // 重新加载两个列表
        await Promise.all([
            loadPendingApprovals(),
            loadApprovedUsers()
        ]);
    } catch (error) {
        console.error('批准用户失败:', error);
        alert('操作失败: ' + error.message);
    }
}

// 拒绝用户
async function rejectUser(userId) {
    try {
        await db.collection('users').doc(userId).update({
            isApproved: false,
            status: 'rejected',
            approvalDate: getCurrentDateTime(),
            approvedBy: currentUser.username,
            lastUpdated: getCurrentDateTime()
        });
        alert('已拒绝用户注册申请');
        loadPendingApprovals();
    } catch (error) {
        console.error('拒绝用户失败:', error);
        alert('操作失败: ' + error.message);
    }
}

// 禁用用户
async function disableUser(userId) {
    if (!confirm('确定要禁用该用户吗？')) return;
    try {
        await db.collection('users').doc(userId).update({
            isApproved: false,
            status: 'disabled',
            lastUpdated: getCurrentDateTime()
        });
        alert('用户已禁用');
        
        // 重新加载两个列表
        await Promise.all([
            loadPendingApprovals(),
            loadApprovedUsers()
        ]);
    } catch (error) {
        console.error('禁用用户失败:', error);
        alert('操作失败: ' + error.message);
    }
}

// 启用用户
async function enableUser(userId) {
    try {
        await db.collection('users').doc(userId).update({
            isApproved: true,
            status: 'approved',
            lastUpdated: getCurrentDateTime()
        });
        alert('用户已启用');
        loadPendingApprovals();
    } catch (error) {
        console.error('启用用户失败:', error);
        alert('操作失败: ' + error.message);
    }
}

// 获取当前时间
function getCurrentDateTime() {
    const now = new Date();
    return now.getUTCFullYear() + '-' +
           String(now.getUTCMonth() + 1).padStart(2, '0') + '-' +
           String(now.getUTCDate()).padStart(2, '0') + ' ' +
           String(now.getUTCHours()).padStart(2, '0') + ':' +
           String(now.getUTCMinutes()).padStart(2, '0') + ':' +
           String(now.getUTCSeconds()).padStart(2, '0');
}

// 显示登录表单
function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('userPanel').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'none';
}

// 显示注册表单
function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('userPanel').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'none';
}

// 在页面加载时添加注册按钮事件监听器
document.addEventListener('DOMContentLoaded', () => {
    // 监听注册按钮点击事件
    const registerButton = document.querySelector('button[onclick="register()"]');
    if (registerButton) {
        registerButton.addEventListener('click', (e) => {
            e.preventDefault(); // 防止表单默认提交
            register();
        });
    }

    // 默认显示登录页面
    showLoginForm();
});
// 界面切换函数
function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('userPanel').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('loginUsername').value = ''; // 清空登录表单
    document.getElementById('loginPassword').value = '';
}

function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('userPanel').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'none';
}

async function showUserPanel() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('userPanel').style.display = 'block';
    document.getElementById('adminPanel').style.display = 'none';
    
    // 显示当前用户信息 - 修改这部分，只显示username
    const userInfo = document.getElementById('userInfo');
    if (userInfo && currentUser) {
        userInfo.innerHTML = `
            <h3>欢迎, ${currentUser.username}</h3>
            <p>登录时间: ${getCurrentDateTime()}</p>
        `;
    }

    console.log('正在加载用户面板的代码文件...');
    await loadCodeFiles(false); // 改为异步等待
}

async function showAdminPanel() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('userPanel').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    
    // 显示管理员信息
    const adminInfo = document.getElementById('adminInfo');
    if (adminInfo) {
        adminInfo.innerHTML = `
            <h3>管理员面板</h3>
            <p>当前时间: ${getCurrentDateTime()}</p>
        `;
    }

    // 加载待审批用户和已审核用户列表
    loadPendingApprovals();
    loadApprovedUsers(); // 确保这个函数被调用
    console.log('正在加载管理员面板的代码文件...');
    await loadCodeFiles(true); // 改为异步等待
}

// 修改登录函数
async function login() {
    try {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!username || !password) {
            alert('请输入用户名和密码');
            return;
        }

        // 管理员登录检查
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            currentUser = {
                username: ADMIN_USERNAME,
                name: '管理员',
                role: 'admin',
                isApproved: true
            };
            console.log('管理员登录成功');
            showAdminPanel();
            return;
        }

        // 普通用户登录
        const userSnapshot = await db.collection('users')
            .where('username', '==', username)
            .get();

        if (userSnapshot.empty) {
            alert('用户名不存在');
            return;
        }

        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data();

        if (userData.password !== password) {
            alert('密码错误');
            return;
        }

        if (!userData.isApproved) {
            alert('账号尚未获得审批，请等待管理员审批');
            return;
        }

        // 更新最后登录时间
        await db.collection('users').doc(userDoc.id).update({
            lastLogin: getCurrentDateTime()
        });

        currentUser = {
            ...userData,
            uid: userDoc.id
        };

        console.log('用户登录成功:', username);
        showUserPanel();

    } catch (error) {
        console.error('登录错误:', error);
        alert('登录失败: ' + error.message);
    }
}

// 退出登录
function logout() {
    currentUser = null;
    showLoginForm();
}

// 确保 HTML 中有相应的容器元素
document.addEventListener('DOMContentLoaded', () => {
    // 添加用户信息容器（如果在 HTML 中不存在）
    if (!document.getElementById('userInfo')) {
        const userPanel = document.getElementById('userPanel');
        if (userPanel) {
            const userInfo = document.createElement('div');
            userInfo.id = 'userInfo';
            userPanel.appendChild(userInfo);
        }
    }
});

// 加载待审批用户
async function loadPendingApprovals() {
    const approvalList = document.getElementById('approvalList');
    if (!approvalList) return;
    
    approvalList.innerHTML = '<p>正在加载...</p>';

    try {
        const snapshot = await db.collection('users')
            .where('isApproved', '==', false)
            .get();

        if (snapshot.empty) {
            approvalList.innerHTML = '<p>没有待审批的用户</p>';
            return;
        }

        approvalList.innerHTML = '';
        snapshot.forEach(doc => {
            const user = doc.data();
            const div = document.createElement('div');
            div.className = 'approval-item';
            div.innerHTML = `
                <div class="user-info">
                    <p>用户名: ${user.username}</p>
                    <p>单位: ${user.company || '未填写'}</p>
                    <p>电话: ${user.phone || '未填写'}</p>
                    <p>注册时间: ${user.createdAt || '未知'}</p>
                </div>
                <div class="approval-actions">
                    <button onclick="approveUser('${doc.id}')" class="btn primary">批准</button>
                </div>
            `;
            approvalList.appendChild(div);
        });

    } catch (error) {
        console.error('加载待审批用户失败:', error);
        approvalList.innerHTML = `
            <div class="error-message">
                <p>加载失败: ${error.message}</p>
                <button onclick="loadPendingApprovals()" class="btn secondary">重新加载</button>
            </div>
        `;
    }
}

// 批准用户
async function approveUser(userId) {
    try {
        if (!currentUser || currentUser.username !== ADMIN_USERNAME) {
            alert('只有管理员可以审批用户');
            return;
        }

        await db.collection('users').doc(userId).update({
            isApproved: true,
            approvedAt: new Date().toISOString(),
            approvedBy: ADMIN_USERNAME
        });

        alert('用户已批准');
        loadPendingApprovals();
    } catch (error) {
        console.error('批准用户失败:', error);
        alert('操作失败: ' + error.message);
    }
}

// 显示管理员面板
async function showAdminPanel() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('userPanel').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    
    // 加载数据
    loadPendingApprovals();
    console.log('正在加载管理员面板的代码文件...');
    await loadCodeFiles(true); // 改为异步等待
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', () => {
    // 默认显示登录页面
    showLoginForm();
});

// 获取当前时间的函数
function getCurrentDateTime() {
    const now = new Date();
    return now.getUTCFullYear() + '-' +
           String(now.getUTCMonth() + 1).padStart(2, '0') + '-' +
           String(now.getUTCDate()).padStart(2, '0') + ' ' +
           String(now.getUTCHours()).padStart(2, '0') + ':' +
           String(now.getUTCMinutes()).padStart(2, '0') + ':' +
           String(now.getUTCSeconds()).padStart(2, '0');
}

// 更新上传代码函数
async function uploadCode() {
    try {
        const fileName = document.getElementById('codeFileName').value.trim();
        const codeContent = document.getElementById('codeContent').value.trim();
        const language = document.getElementById('codeLanguage').value;
        const description = document.getElementById('codeDescription').value.trim();

        if (!fileName || !codeContent) {
            alert('请填写文件名和代码内容');
            return;
        }

        const currentTime = getCurrentDateTime();

        const codeData = {
            name: fileName,
            content: codeContent,
            language: language,
            description: description,
            uploadedBy: currentUser.username,
            uploaderName: currentUser.username,
            uploadedAt: currentTime,
            lastModified: currentTime
        };

        // 保存到 codefiles 集合
        const docRef = await db.collection('codefiles').add(codeData);

        // 同时保存到 date 集合
        await db.collection('date').add({
            fileId: docRef.id,
            fileName: fileName,
            language: language,
            uploadTime: currentTime,
            uploadedBy: currentUser.username,
            content: codeContent,
            description: description
        });

        alert('代码文件保存成功');
        clearCodeForm();
        loadCodeFiles(true);

    } catch (error) {
        console.error('保存代码失败:', error);
        alert('保存失败: ' + error.message);
    }
}

// 清理代码表单
function clearCodeForm() {
    document.getElementById('codeFileName').value = '';
    document.getElementById('codeContent').value = '';
    document.getElementById('codeDescription').value = '';
    document.getElementById('codeLanguage').value = 'JavaScript';
    // 清除本地存储的草稿
    localStorage.removeItem('draftCode');
}

// 添加自动保存功能
function setupAutoSave() {
    const codeContent = document.getElementById('codeContent');
    if (codeContent) {
        let autoSaveTimeout;
        codeContent.addEventListener('input', () => {
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(() => {
                localStorage.setItem('draftCode', codeContent.value);
                console.log('代码已自动保存到本地存储');
            }, 1000);
        });

        // 恢复上次编辑的内容
        const savedDraft = localStorage.getItem('draftCode');
        if (savedDraft) {
            codeContent.value = savedDraft;
            console.log('已恢复上次编辑的内容');
        }
    }
}

// 修改编辑代码函数
async function editCode(fileId) {
    try {
        const doc = await db.collection('codefiles').doc(fileId).get();
        if (!doc.exists) {
            alert('文件不存在');
            return;
        }

        const file = doc.data();
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>编辑代码文件</h2>
                <div class="form-group">
                    <label>文件名:</label>
                    <input type="text" id="editFileName" value="${file.name}" class="form-input">
                </div>
                <div class="form-group">
                    <label>语言:</label>
                    <select id="editCodeLanguage" class="form-input">
                        <option value="JavaScript" ${file.language === 'JavaScript' ? 'selected' : ''}>JavaScript</option>
                        <option value="Python" ${file.language === 'Python' ? 'selected' : ''}>Python</option>
                        <option value="Java" ${file.language === 'Java' ? 'selected' : ''}>Java</option>
                        <option value="Other" ${file.language === 'Other' ? 'selected' : ''}>其他</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>代码内容:</label>
                    <textarea id="editCodeContent" class="form-input code-input" rows="15">${file.content}</textarea>
                </div>
                <div class="form-group">
                    <label>描述:</label>
                    <textarea id="editCodeDescription" class="form-input" rows="3">${file.description || ''}</textarea>
                </div>
                <div class="button-group">
                    <button onclick="saveCodeEdit('${fileId}')" class="btn primary">保存</button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="btn secondary">取消</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } catch (error) {
        console.error('编辑代码错误:', error);
        alert('加载失败: ' + error.message);
    }
}

// 保存编辑后的代码
async function saveCodeEdit(fileId) {
    try {
        const fileName = document.getElementById('editFileName').value.trim();
        const codeContent = document.getElementById('editCodeContent').value.trim();
        const language = document.getElementById('editCodeLanguage').value;
        const description = document.getElementById('editCodeDescription').value.trim();

        if (!fileName || !codeContent) {
            alert('请填写文件名和代码内容');
            return;
        }

        const currentTime = getCurrentDateTime();

        // 更新 codefiles 集合
        await db.collection('codefiles').doc(fileId).update({
            name: fileName,
            content: codeContent,
            language: language,
            description: description,
            lastModified: currentTime
        });

        // 更新 date 集合
        const dateSnapshot = await db.collection('date')
            .where('fileId', '==', fileId)
            .get();
        
        if (!dateSnapshot.empty) {
            await db.collection('date').doc(dateSnapshot.docs[0].id).update({
                fileName: fileName,
                language: language,
                content: codeContent,
                description: description,
                uploadTime: currentTime
            });
        }

        alert('更新成功');
        document.querySelector('.modal').remove();
        loadCodeFiles(true);
    } catch (error) {
        console.error('保存编辑错误:', error);
        alert('更新失败: ' + error.message);
    }
}

// 加载代码文件列表
async function loadCodeFiles(isAdmin = false) {
    console.log('开始加载代码文件列表...', { isAdmin });
    
    const fileListElement = isAdmin ? 
        document.getElementById('adminFileList') : 
        document.getElementById('fileList');
    
    if (!fileListElement) {
        console.error('找不到文件列表容器:', isAdmin ? 'adminFileList' : 'fileList');
        return;
    }
    
    fileListElement.innerHTML = '<p>正在加载...</p>';

    try {
        console.log('正在查询 Firestore...');
        
        const snapshot = await db.collection('codefiles')
            .orderBy('uploadedAt', 'desc')
            .limit(10) // 限制加载数量
            .get();

        console.log('查询结果:', {
            empty: snapshot.empty,
            size: snapshot.size
        });

        if (snapshot.empty) {
            fileListElement.innerHTML = `
                <div class="empty-state">
                    <p>暂无代码文件</p>
                    ${isAdmin ? '<p>点击"上传代码"按钮添加新文件</p>' : ''}
                </div>
            `;
            return;
        }

        fileListElement.innerHTML = '';
        const gridContainer = document.createElement('div');
        gridContainer.className = 'file-grid';

        snapshot.forEach(doc => {
            const file = doc.data();
            const div = document.createElement('div');
            div.className = 'code-item';
            div.innerHTML = `
                <div class="code-header">
                    <h4>${file.name || '未命名文件'}</h4>
                    <span class="language-badge">${file.language || 'Other'}</span>
                </div>
                <p class="description">${file.description || '无描述'}</p>
                <div class="meta-info">
                    <span>上传者: ${file.uploaderName || '未知用户'}</span>
                    <span>上传时间: ${file.uploadedAt || '未知'}</span>
                </div>
                <div class="code-actions">
                    <button onclick="viewCode('${doc.id}')" class="btn primary">查看代码</button>
                    ${isAdmin ? `
                        <button onclick="editCode('${doc.id}')" class="btn secondary">编辑</button>
                        <button onclick="deleteCode('${doc.id}')" class="btn danger">删除</button>
                    ` : ''}
                </div>
            `;
            gridContainer.appendChild(div);
        });

        fileListElement.appendChild(gridContainer);

    } catch (error) {
        console.error('加载代码文件失败:', error);
        fileListElement.innerHTML = `
            <div class="error-message">
                <p>加载失败: ${error.message}</p>
                <p>详细错误: ${error.toString()}</p>
                <button onclick="loadCodeFiles(${isAdmin})" class="btn secondary">重新加载</button>
            </div>
        `;
    }
}

// 查看代码
async function viewCode(fileId) {
    try {
        const doc = await db.collection('codefiles').doc(fileId).get();
        if (!doc.exists) {
            alert('文件不存在');
            return;
        }

        const file = doc.data();
        const modal = document.createElement('div');
        modal.className = 'modal';
        
        // 转义代码内容以安全显示
        const escapedContent = file.content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        
        modal.innerHTML = `
            <div class="modal-content code-view">
                <div class="code-view-header">
                    <div>
                        <h2>${file.name}</h2>
                        <div class="meta-info">
                            <span>语言: ${file.language}</span>
                            <span>上传者: ${file.uploaderName}</span>
                            <span>上传时间: ${file.uploadedAt}</span>
                        </div>
                    </div>
                    <button onclick="this.closest('.modal').remove()" class="btn secondary">关闭</button>
                </div>
                ${file.description ? `<p class="description">${file.description}</p>` : ''}
                <div class="code-container">
                    <pre class="code-display"><code>${escapedContent}</code></pre>
                    <button onclick="copyCode(this)" class="btn secondary copy-btn">复制代码</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

    } catch (error) {
        console.error('查看代码错误:', error);
        alert('加载失败: ' + error.message);
    }
}

// 保存代码
async function uploadCode() {
    try {
        const fileName = document.getElementById('codeFileName').value.trim();
        const codeContent = document.getElementById('codeContent').value.trim();
        const language = document.getElementById('codeLanguage').value;
        const description = document.getElementById('codeDescription').value.trim();

        if (!fileName || !codeContent) {
            alert('请填写文件名和代码内容');
            return;
        }

        const currentTime = getCurrentDateTime();

        const codeData = {
            name: fileName,
            content: codeContent,
            language: language,
            description: description,
            uploadedBy: currentUser.username,
            uploaderName: currentUser.username,
            uploadedAt: currentTime,
            lastModified: currentTime
        };

        // 保存到 codefiles 集合
        const docRef = await db.collection('codefiles').add(codeData);

        // 同时保存到 date 集合
        await db.collection('date').add({
            fileId: docRef.id,
            fileName: fileName,
            language: language,
            uploadTime: currentTime,
            uploadedBy: currentUser.username,
            content: codeContent,
            description: description
        });

        alert('代码文件保存成功');
        clearCodeForm();
        loadCodeFiles(true);

    } catch (error) {
        console.error('保存代码失败:', error);
        alert('保存失败: ' + error.message);
    }
}

// 删除代码
async function deleteCode(fileId) {
    if (!confirm('确定要删除这个代码文件吗？此操作不可恢复。')) {
        return;
    }

    try {
        // 删除 codefiles 中的文档
        await db.collection('codefiles').doc(fileId).delete();
        
        // 删除关联的 date 文档
        const dateSnapshot = await db.collection('date')
            .where('fileId', '==', fileId)
            .get();
        
        const deletePromises = dateSnapshot.docs.map(doc => 
            db.collection('date').doc(doc.id).delete()
        );
        await Promise.all(deletePromises);

        alert('删除成功');
        loadCodeFiles(true);
    } catch (error) {
        console.error('删除代码失败:', error);
        alert('删除失败: ' + error.message);
    }
}

// 获取当前时间的函数
function getCurrentDateTime() {
    const now = new Date();
    return now.toISOString().slice(0, 19).replace('T', ' ');
}

// 清理代码表单
function clearCodeForm() {
    document.getElementById('codeFileName').value = '';
    document.getElementById('codeContent').value = '';
    document.getElementById('codeDescription').value = '';
    document.getElementById('codeLanguage').value = 'JavaScript';
    localStorage.removeItem('draftCode');
}

// 添加到页面加载事件
document.addEventListener('DOMContentLoaded', () => {
    // 设置代码编辑器的自动保存
    const codeContent = document.getElementById('codeContent');
    if (codeContent) {
        let autoSaveTimeout;
        codeContent.addEventListener('input', () => {
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(() => {
                localStorage.setItem('draftCode', codeContent.value);
                console.log('代码已自动保存到本地存储');
            }, 1000);
        });

        // 恢复上次编辑的内容
        const savedDraft = localStorage.getItem('draftCode');
        if (savedDraft) {
            codeContent.value = savedDraft;
            console.log('已恢复上次编辑的内容');
        }
    }
});
// 在页面加载时设置自动保存
document.addEventListener('DOMContentLoaded', () => {
    setupAutoSave();
});

// 清除注册表单
function clearRegistrationForm() {
    document.getElementById('registerUsername').value = '';
    document.getElementById('registerPassword').value = '';
    document.getElementById('registerCompany').value = '';
    document.getElementById('registerPhone').value = '';
}
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }

        .modal-content {
            background: white;
            padding: 20px;
            border-radius: 5px;
            max-width: 80%;
            max-height: 80vh;
            overflow-y: auto;
        }

        .code-item {
            border: 1px solid #ddd;
            margin: 10px 0;
            padding: 15px;
            border-radius: 5px;
            background: #fff;
        }

        .language-badge {
            background: #007bff;
            color: white;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 12px;
        }

        .btn {
            padding: 8px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px;
        }

        .btn.primary {
            background: #007bff;
            color: white;
        }

        .btn.secondary {
            background: #6c757d;
            color: white;
        }

        .btn.danger {
            background: #dc3545;
            color: white;
        }

        .form-input {
            width: 100%;
            padding: 8px;
            margin: 5px 0;
            border: 1px solid #ddd;
            border-radius: 4px;
        }

        .code-input {
            font-family: monospace;
            min-height: 200px;
        }

        .error-message {
            color: #721c24;
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            padding: 15px;
            border-radius: 4px;
            margin: 10px 0;
        }
    `;
    document.head.appendChild(style);

// 添加加载已审核用户的函数
async function loadApprovedUsers() {
    const approvedList = document.getElementById('approvedList');
    if (!approvedList) return;
    
    approvedList.innerHTML = '<p>正在加载...</p>';

    try {
        // 修改查询条件，使用 status 字段
        const snapshot = await db.collection('users')
            .where('status', '==', 'approved')
            .where('isApproved', '==', true)
            .get();

        if (snapshot.empty) {
            approvedList.innerHTML = '<p>暂无已审核用户</p>';
            return;
        }

        let tableHTML = `
            <table class="user-table">
                <thead>
                    <tr>
                        <th>用户名</th>
                        <th>单位</th>
                        <th>电话</th>
                        <th>注册时间</th>
                        <th>最后登录</th>
                        <th>登录次数</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
        `;

        snapshot.forEach(doc => {
            const user = doc.data();
            tableHTML += `
                <tr>
                    <td>${user.username}</td>
                    <td>${user.company || '-'}</td>
                    <td>${user.phone || '-'}</td>
                    <td>${user.createdAt || '-'}</td>
                    <td>${user.lastLogin || '-'}</td>
                    <td>${user.loginCount || 0}</td>
                    <td>
                        <button onclick="disableUser('${doc.id}')" class="btn secondary btn-small">禁用</button>
                    </td>
                </tr>
            `;
        });

        tableHTML += '</tbody></table>';
        approvedList.innerHTML = tableHTML;

    } catch (error) {
        console.error('加载已审核用户失败:', error);
        approvedList.innerHTML = `
            <div class="error-message">
                <p>加载失败: ${error.message}</p>
                <button onclick="loadApprovedUsers()" class="btn secondary">重新加载</button>
            </div>
        `;
    }
}