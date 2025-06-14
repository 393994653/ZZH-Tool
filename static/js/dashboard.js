// 侧边栏折叠功能
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const menuToggle = document.getElementById('menuToggle');
const mainContent = document.getElementById('mainContent');

// 桌面端侧边栏折叠
sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');

    // 保存状态到localStorage
    const isCollapsed = sidebar.classList.contains('collapsed');
    localStorage.setItem('sidebarCollapsed', isCollapsed);
});

// 移动端菜单切换
menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('show');
});

// 用户下拉菜单
const userDropdown = document.getElementById('userDropdown');
const userInfo = document.getElementById('userInfo');
const dropdownMenu = document.getElementById('dropdownMenu');

// 点击用户信息显示下拉菜单
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


// 初始化侧边栏状态
document.addEventListener('DOMContentLoaded', () => {
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (isCollapsed) {
        sidebar.classList.add('collapsed');
    }

    // 设置当前日期
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    const dateString = now.toLocaleDateString('zh-CN', options);
    document.querySelectorAll('.current-date').forEach(el => {
        el.textContent = dateString;
    });
});

// 为所有链接添加点击效果
document.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', function () {
        // 添加一个小的动画效果
        this.style.transform = 'scale(0.98)';
        setTimeout(() => {
            this.style.transform = '';
        }, 150);
    });
});

// 固定侧边栏高度
function adjustSidebarHeight() {
    if (window.innerWidth > 992) {
        sidebar.style.height = '100vh';
        sidebar.style.position = 'fixed';
    } else {
        sidebar.style.height = 'auto';
        sidebar.style.position = 'relative';
    }
}

// 初始化
adjustSidebarHeight();

// 窗口大小变化时调整
window.addEventListener('resize', adjustSidebarHeight);