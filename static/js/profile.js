// profile.js - 所有设置页面共享的JavaScript

// 用户下拉菜单
const userDropdown = document.getElementById('userDropdown');
const userInfo = document.getElementById('userInfo');
const dropdownMenu = document.getElementById('dropdownMenu');

document.addEventListener('DOMContentLoaded', function () {
    // 用户下拉菜单
    userInfo.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });

    // 点击其他地方关闭下拉菜单
    document.addEventListener('click', (e) => {
        if (!userDropdown.contains(e.target)) {
            dropdownMenu.classList.remove('show');
        }
    });

    // 更改密码按钮
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const passwordModal = document.getElementById('passwordModal');
    const closeModal = document.querySelector('.close-modal');
    const cancelPassword = document.getElementById('cancelPassword');

    if (changePasswordBtn && passwordModal) {
        changePasswordBtn.addEventListener('click', function () {
            passwordModal.style.display = 'flex';
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', function () {
            passwordModal.style.display = 'none';
        });
    }

    if (cancelPassword) {
        cancelPassword.addEventListener('click', function () {
            passwordModal.style.display = 'none';
        });
    }

    // 点击模态框外部关闭
    window.addEventListener('click', function (e) {
        if (e.target === passwordModal) {
            passwordModal.style.display = 'none';
        }
    });

    // 密码强度检测
    const newPassword = document.getElementById('newPassword');
    const strengthLevel = document.getElementById('strengthLevel');
    const strengthText = document.getElementById('strengthText');

    if (newPassword && strengthLevel && strengthText) {
        newPassword.addEventListener('input', function () {
            const password = this.value;
            let strength = 0;

            // 长度检查
            if (password.length > 5) strength += 1;
            if (password.length > 8) strength += 1;

            // 包含数字
            if (/\d/.test(password)) strength += 1;

            // 包含小写字母
            if (/[a-z]/.test(password)) strength += 1;

            // 包含大写字母
            if (/[A-Z]/.test(password)) strength += 1;

            // 包含特殊字符
            if (/[^a-zA-Z0-9]/.test(password)) strength += 1;

            // 更新UI
            let width = 0;
            let text = '';
            let color = '';

            switch (strength) {
                case 0:
                case 1:
                    width = 25;
                    text = '密码强度：弱';
                    color = '#e53e3e';
                    break;
                case 2:
                case 3:
                    width = 50;
                    text = '密码强度：中';
                    color = '#f59e0b';
                    break;
                case 4:
                    width = 75;
                    text = '密码强度：强';
                    color = '#10b981';
                    break;
                case 5:
                case 6:
                    width = 100;
                    text = '密码强度：非常强';
                    color = '#047857';
                    break;
            }

            strengthLevel.style.width = `${width}%`;
            strengthLevel.style.backgroundColor = color;
            strengthText.textContent = text;
            strengthText.style.color = color;
        });
    }

    // 表单提交处理
    const profileForm = document.getElementById('profileForm');
    const accountForm = document.getElementById('accountForm');
    const passwordForm = document.getElementById('passwordForm');

    if (profileForm) {
        profileForm.addEventListener('submit', function (e) {
            e.preventDefault();
            showNotification('个人资料已成功更新！', 'success');
        });
    }

    if (accountForm) {
        accountForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const currentPassword = document.getElementById('currentPassword').value;

            if (!currentPassword) {
                showNotification('请输入当前密码以验证身份', 'error');
                return;
            }

            showNotification('账户信息已成功更新！', 'success');
        });
    }

    if (passwordForm) {
        passwordForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const oldPassword = document.getElementById('oldPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (!oldPassword) {
                showNotification('请输入当前密码', 'error');
                return;
            }

            if (newPassword !== confirmPassword) {
                showNotification('两次输入的密码不一致', 'error');
                return;
            }

            if (newPassword.length < 8) {
                showNotification('密码长度至少为8个字符', 'error');
                return;
            }

            // 模拟密码更改成功
            setTimeout(() => {
                if (passwordModal) {
                    passwordModal.style.display = 'none';
                }
                showNotification('密码已成功更新！', 'success');
            }, 1000);
        });
    }

    // 头像编辑
    const avatarEdit = document.querySelector('.avatar-edit');
    if (avatarEdit) {
        avatarEdit.addEventListener('click', function () {
            // 在实际应用中，这里会触发文件选择
            // 这里仅显示通知
            showNotification('点击了头像编辑功能', 'info');
        });
    }

    // 显示通知函数
    function showNotification(message, type) {
        // 移除现有的通知
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;

        // 添加到页面
        document.body.appendChild(notification);

        // 显示通知
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);

        // 3秒后移除通知
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // 添加通知样式
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 8px;
            background-color: white;
            color: var(--text-dark);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            gap: 15px;
            z-index: 3000;
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s ease;
        }
        
        .notification.success {
            border-left: 4px solid var(--success-color);
        }
        
        .notification.error {
            border-left: 4px solid var(--error-color);
        }
        
        .notification.info {
            border-left: 4px solid var(--accent-color);
        }
        
        .notification i {
            font-size: 20px;
        }
        
        .notification.success i {
            color: var(--success-color);
        }
        
        .notification.error i {
            color: var(--error-color);
        }
        
        .notification.info i {
            color: var(--accent-color);
        }
    `;
    document.head.appendChild(style);
});

// 添加项目logo点击事件
document.getElementById('projectLogo').addEventListener('click', function () {
    window.location.href = '/dashboard';
});