// 主题切换功能
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.createThemeToggle();
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        this.currentTheme = theme;
        
        // 更新所有主题切换按钮的图标
        this.updateThemeButtons();
    }

    createThemeToggle() {
        // 在导航栏右侧添加主题切换按钮
        const rightSections = document.querySelectorAll('.right-section');
        
        rightSections.forEach(rightSection => {
            if (!rightSection.querySelector('.theme-toggle')) {
                const themeToggle = document.createElement('button');
                themeToggle.className = 'theme-toggle';
                themeToggle.innerHTML = this.getThemeIcon();
                themeToggle.title = this.currentTheme === 'light' ? '切换到深色模式' : '切换到浅色模式';
                
                themeToggle.addEventListener('click', () => {
                    this.toggleTheme();
                });

                // 插入到用户信息之前
                const userInfo = rightSection.querySelector('.user-info, .user-dropdown');
                if (userInfo) {
                    rightSection.insertBefore(themeToggle, userInfo);
                } else {
                    rightSection.appendChild(themeToggle);
                }
            }
        });
    }

    getThemeIcon() {
        return this.currentTheme === 'light' 
            ? '<i class="fas fa-moon"></i>'
            : '<i class="fas fa-sun"></i>';
    }

    updateThemeButtons() {
        const themeToggles = document.querySelectorAll('.theme-toggle');
        themeToggles.forEach(toggle => {
            toggle.innerHTML = this.getThemeIcon();
            toggle.title = this.currentTheme === 'light' ? '切换到深色模式' : '切换到浅色模式';
        });
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
    }
}

// 页面加载完成后初始化主题管理器
document.addEventListener('DOMContentLoaded', () => {
    new ThemeManager();
});

// 导出供其他脚本使用
window.ThemeManager = ThemeManager;