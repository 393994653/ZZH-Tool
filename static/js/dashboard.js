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

// 天气功能
function initWeather() {
    const refreshBtn = document.getElementById('refreshWeather');
    const retryBtn = document.getElementById('retryWeather');
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', getWeatherData);
    }
    
    if (retryBtn) {
        retryBtn.addEventListener('click', getWeatherData);
    }
    
    // 页面加载时获取天气数据
    getWeatherData();
    
    // 每30分钟自动更新一次天气
    setInterval(getWeatherData, 30 * 60 * 1000);
}

function getWeatherData() {
    const loadingEl = document.getElementById('weatherLoading');
    const mainEl = document.getElementById('weatherMain');
    const errorEl = document.getElementById('weatherError');
    const refreshBtn = document.getElementById('refreshWeather');
    
    // 显示加载状态
    loadingEl.style.display = 'flex';
    mainEl.style.display = 'none';
    errorEl.style.display = 'none';
    
    if (refreshBtn) {
        refreshBtn.classList.add('loading');
    }
    
    // 检查浏览器是否支持地理定位
    if (!navigator.geolocation) {
        showWeatherError('您的浏览器不支持地理定位功能');
        return;
    }
    
    // 获取当前位置
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                const weatherData = await fetchWeatherData(latitude, longitude);
                updateWeatherDisplay(weatherData);
            } catch (error) {
                console.error('获取天气数据失败:', error);
                showWeatherError('获取天气信息失败，请稍后重试');
            } finally {
                if (refreshBtn) {
                    refreshBtn.classList.remove('loading');
                }
            }
        },
        (error) => {
            let errorMessage = '获取位置失败: ';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += '用户拒绝了位置访问请求';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += '位置信息不可用';
                    break;
                case error.TIMEOUT:
                    errorMessage += '获取位置超时';
                    break;
                default:
                    errorMessage += '未知错误';
                    break;
            }
            showWeatherError(errorMessage);
            if (refreshBtn) {
                refreshBtn.classList.remove('loading');
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30 * 60 * 1000 // 缓存30分钟
        }
    );
}

async function fetchWeatherData(latitude, longitude) {
    const response = await fetch('/api/weather', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            latitude: latitude,
            longitude: longitude
        })
    });
    
    if (!response.ok) {
        throw new Error('天气API请求失败');
    }
    
    return await response.json();
}

function updateWeatherDisplay(data) {
    const loadingEl = document.getElementById('weatherLoading');
    const mainEl = document.getElementById('weatherMain');
    const errorEl = document.getElementById('weatherError');
    
    if (data.code !== 200 && data.code !== '200') {
        showWeatherError('天气数据获取失败：' + (data.msg || '未知错误'));
        return;
    }

    const elements = {
        location: document.getElementById('weatherLocation'),
        temperature: document.getElementById('weatherTemperature'),
        description: document.getElementById('weatherDescription'),
        humidity: document.getElementById('weatherHumidity'),
        wind: document.getElementById('weatherWind'),
        feelsLike: document.getElementById('weatherFeelsLike'),
        windDirection: document.getElementById('weatherWindDirection'),
        windScale: document.getElementById('weatherWindScale'),
        precipitation: document.getElementById('weatherPrecipitation'),
        pressure: document.getElementById('weatherPressure'),
        icon: document.getElementById('weatherIcon'),
        time: document.getElementById('weatherTime')
    };
    
    // 安全更新天气信息
    if (elements.location) elements.location.textContent = data.location || '未知位置';
    if (elements.temperature) elements.temperature.textContent = data.temp || '--';
    if (elements.description) elements.description.textContent = data.text || '--';
    if (elements.humidity) elements.humidity.textContent = `${data.humidity || '--'}%`;
    if (elements.wind) elements.wind.textContent = `${data.windSpeed || '--'} m/s`;
    
    // 修复体感温度字段
    if (elements.feelsLike) {
        elements.feelsLike.textContent = `${data.feel || data.temp || '--'}°C`;
    }
    
    // 更新其他字段（只在元素存在时）
    if (elements.windDirection) elements.windDirection.textContent = data.windDir || '--';
    if (elements.windScale) elements.windScale.textContent = data.windScale || '--';
    if (elements.precipitation) elements.precipitation.textContent = `${data.precip || '0.0'} mm`;
    if (elements.pressure) elements.pressure.textContent = `${data.pressure || '--'} hPa`;
    

    if (data.icon) {
        const weatherIcon = document.getElementById('weatherIcon');
        if (weatherIcon) {
            // 根据图标代码设置对应的图标
            // weatherIcon.className = `weather-icon wi-${getWeatherIconCode(data.icon)}`;
            weatherIcon.src = `/static/QWeather/${data.icon}.svg`;
        }
    }

    // 更新时间
    const now = new Date();
    document.getElementById('weatherTime').textContent = now.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    // 设置天气图标
    setWeatherIcon(data.weather1 || '');
    
    // 显示主内容，隐藏加载和错误状态
    loadingEl.style.display = 'none';
    mainEl.style.display = 'grid';
    errorEl.style.display = 'none';
}

function setWeatherIcon(weatherDescription) {
    const iconEl = document.getElementById('weatherIcon');
    const desc = weatherDescription.toLowerCase();
    
    // 重置图标类
    iconEl.className = 'weather-icon';
    
    // 根据天气描述设置图标和颜色
    if (desc.includes('晴')) {
        iconEl.innerHTML = '<i class="fas fa-sun"></i>';
        iconEl.classList.add('sunny');
    } else if (desc.includes('多云') || desc.includes('阴')) {
        iconEl.innerHTML = '<i class="fas fa-cloud"></i>';
        iconEl.classList.add('cloudy');
    } else if (desc.includes('雨')) {
        iconEl.innerHTML = '<i class="fas fa-cloud-rain"></i>';
        iconEl.classList.add('rainy');
    } else if (desc.includes('雪')) {
        iconEl.innerHTML = '<i class="fas fa-snowflake"></i>';
        iconEl.classList.add('snowy');
    } else if (desc.includes('雷')) {
        iconEl.innerHTML = '<i class="fas fa-bolt"></i>';
        iconEl.classList.add('stormy');
    } else if (desc.includes('雾') || desc.includes('霾')) {
        iconEl.innerHTML = '<i class="fas fa-smog"></i>';
        iconEl.classList.add('foggy');
    } else {
        iconEl.innerHTML = '<i class="fas fa-cloud"></i>';
        iconEl.classList.add('cloudy');
    }
}

function showWeatherError(message) {
    const loadingEl = document.getElementById('weatherLoading');
    const mainEl = document.getElementById('weatherMain');
    const errorEl = document.getElementById('weatherError');
    
    loadingEl.style.display = 'none';
    mainEl.style.display = 'none';
    errorEl.style.display = 'flex';
    
    // 可以在这里设置具体的错误消息
    const errorText = errorEl.querySelector('p');
    if (errorText) {
        errorText.textContent = message;
    }
}

// 修改初始化函数，加入天气初始化
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
    
    // 初始化天气功能
    initWeather();
}


// 窗口大小变化时调整侧边栏
window.addEventListener('resize', adjustSidebarHeight);