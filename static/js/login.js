// 表单提交处理
document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault()

    // 获取表单元素
    const loginButton = document.getElementById('loginButton');
    const errorMessage = document.getElementById('errorMessage');

    // 显示加载状态
    loginButton.disabled = true;
    errorMessage.style.display = 'none';

    loginButton.textContent = '登录中...';

    // 获取表单数据
    const formData = {
        username: document.getElementById('username-input').value.trim(),
        password: document.getElementById('password-input').value
    };  

    try {
        console.log('提交的表单数据:', JSON.stringify(formData));

        // 发送POST请求到服务器
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        // 处理响应
        const result = await response.json();

        if (response.ok && result.success) {
            // 检查"记住我"选项
            if (document.getElementById('remember').checked) {
                localStorage.setItem('rememberedUser', formData.username);
            } else {
                localStorage.removeItem('rememberedUser');
            }

            // 重定向到用户仪表盘或其他页面
            window.location.href = result.redirectUrl;
        } else {
            // 登录失败处理
            console.error('登录失败:', result.message);
            showError(result.message || '登录失败，请重试');
        }
    } catch (error) {
        // 网络错误处理
        console.error('请求失败:', error);
        showError('网络错误，请检查您的连接');
    } finally {
        // 重置按钮状态
        loginButton.disabled = false;
        loginButton.textContent = '登录';
    }
});

// 显示错误消息
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';

    // 添加抖动动画
    errorMessage.animate([
        { transform: 'translateX(0)' },
        { transform: 'translateX(-10px)' },
        { transform: 'translateX(10px)' },
        { transform: 'translateX(0)' }
    ], {
        duration: 300,
        iterations: 2
    });

    // 清空输入框
    document.getElementById('username-input').value = '';
    document.getElementById('password-input').value = '';
    // 重新聚焦到用户名输入框
    document.getElementById('username-input').focus();
}

// 密码可见性切换
document.getElementById('passwordToggle').addEventListener('click', function () {
    const passwordInput = document.getElementById('password');
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        // this.textContent = '👁️‍🗨️';
        // 使用static/svg/eye-open.svg图标
        this.innerHTML = '<img src="static/images/eve_open.svg" alt="隐藏密码" class="toggle-icon">';
    } else {
        passwordInput.type = 'password';
        // this.textContent = '👁️';
        // 使用static/svg/eye-closed.svg图标
        this.innerHTML = '<img src="static/images/eve_closed.svg" alt="显示密码" class="toggle-icon">';
    }
});

// 检查是否有记住的用户名
window.addEventListener('DOMContentLoaded', function () {
    const rememberedUser = localStorage.getItem('rememberedUser');
    if (rememberedUser) {
        document.getElementById('username').value = rememberedUser;
        document.getElementById('remember').checked = true;
    }
});

// 在打开页面时聚焦到用户名输入框
document.addEventListener('DOMContentLoaded', function () {
    const rememberedUser = localStorage.getItem('rememberedUser');
    if (rememberedUser) {
        document.getElementById('username').value = rememberedUser;
        document.getElementById('remember').checked = true;
    }
});
