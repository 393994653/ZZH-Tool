// 侧边栏折叠功能
const sidebar = document.getElementById('sidebar');
const headerToggleBtn = document.getElementById('headerToggleBtn');
const mainContent = document.getElementById('mainContent');

// 用户下拉菜单
const userDropdown = document.getElementById('userDropdown');
const userInfo = document.getElementById('userInfo');
const dropdownMenu = document.getElementById('dropdownMenu');

// 初始化函数
function initDashboard() {
    // 设置当前日期
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    const dateString = now.toLocaleDateString('zh-CN', options);
    document.querySelectorAll('.current-date').forEach(el => {
        el.textContent = dateString;
    });

    // 为所有链接添加点击效果
    document.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function () {
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });

    // 为卡片添加点击事件
    const cards = document.querySelectorAll('.dashboard-card');
    cards.forEach(card => {
        card.addEventListener('click', function (e) {
            if (e.target.closest('.card-link')) return;

            const link = this.querySelector('.card-link');
            if (link && link.href && link.href !== '#') {
                window.location.href = link.href;
            }
        });

        // 添加悬停效果
        card.style.cursor = 'pointer';
        card.style.transition = 'transform 0.2s';

        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-5px)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'none';
        });
    });
}

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

// 折叠侧边栏函数
function collapseSidebar() {
    sidebar.classList.add('collapsed');
    // 更新按钮图标为向右箭头
    headerToggleBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    localStorage.setItem('sidebarCollapsed', 'true');
}

// 展开侧边栏函数
function expandSidebar() {
    sidebar.classList.remove('collapsed');
    // 更新按钮图标为向左箭头
    headerToggleBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    localStorage.setItem('sidebarCollapsed', 'false');
}

// 事件监听器
document.addEventListener('DOMContentLoaded', () => {
    // 初始化折叠状态
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (isCollapsed) {
        collapseSidebar();
    } else {
        expandSidebar();
    }

    initDashboard();
    adjustSidebarHeight();

    // 切换折叠/展开状态
    headerToggleBtn.addEventListener('click', () => {
        if (sidebar.classList.contains('collapsed')) {
            expandSidebar();
        } else {
            collapseSidebar();
        }
    });

    // 用户下拉菜单
    if (userInfo) {
        userInfo.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });
    }

    // 点击其他地方关闭下拉菜单
    document.addEventListener('click', (e) => {
        if (userDropdown && !userDropdown.contains(e.target)) {
            dropdownMenu.classList.remove('show');
        }
    });

    // 确保主题切换按钮正常工作
    setTimeout(() => {
        if (typeof ThemeManager !== 'undefined') {
            new ThemeManager();
        }
    }, 100);
});

// 窗口大小变化时调整侧边栏
window.addEventListener('resize', adjustSidebarHeight);