document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const passwordToggle = document.getElementById('passwordToggle');
    const errorMessage = document.getElementById('errorMessage');
    const registerButton = document.getElementById('registerButton');
    const loadingSpinner = document.getElementById('loadingSpinner');

    // 密码可见性切换
    passwordToggle.addEventListener('click', () => {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            passwordToggle.innerHTML = '<img src="static/images/eve_open.svg" alt="隐藏密码" class="toggle-icon">';
        } else {
            passwordInput.type = 'password';
            passwordToggle.innerHTML = '<img src="static/images/eve_closed.svg" alt="显示密码" class="toggle-icon">';
        }
    });

    // 表单提交处理
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 获取表单数据
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // 验证表单数据
        if (!username || !email || !password || !confirmPassword) {
            showError('所有字段均为必填项');
            return;
        }

        if (password !== confirmPassword) {
            showError('两次输入的密码不一致');
            return;
        }

        if (password.length < 6) {
            showError('密码长度至少为6个字符');
            return;
        }

        // 显示加载状态
        registerButton.disabled = true;
        registerButton.querySelector('span').textContent = '注册中...';
        loadingSpinner.style.display = 'block';

        try {
            // 发送注册请求
            const response = await fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // 注册成功
                showSuccess(data.message);
                // 3秒后跳转到登录页
                setTimeout(() => {
                    window.location.href = '/login';
                }, 3000);
            } else {
                // 注册失败
                showError(data.error || '注册失败，请稍后重试');
                registerButton.disabled = false;
                registerButton.querySelector('span').textContent = '注册';
                loadingSpinner.style.display = 'none';
            }
        } catch (error) {
            showError('网络错误，请检查连接');
            registerButton.disabled = false;
            registerButton.querySelector('span').textContent = '注册';
            loadingSpinner.style.display = 'none';
        }
    });

    // 显示错误消息
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        errorMessage.style.backgroundColor = '#f8d7da';
        errorMessage.style.color = '#dc3545';
        errorMessage.style.borderLeft = '4px solid #dc3545';

        // 5秒后自动隐藏
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }

    // 显示成功消息
    function showSuccess(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        errorMessage.style.backgroundColor = '#d4edda';
        errorMessage.style.color = '#28a745';
        errorMessage.style.borderLeft = '4px solid #28a745';
    }
});