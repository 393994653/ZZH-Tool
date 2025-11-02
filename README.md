# ZZH-Tool - 多功能Web工具箱

![项目截图](https://img.freepik.com/free-vector/dashboard-analytics-concept-illustration_114360-745.jpg)

ZZH-Tool是一个基于Python Flask开发的多功能Web工具箱，集成了聊天、视频解析、文件管理等多种实用功能。

## 主要功能

- **相册管理工具**：管理你的相册
- **视频解析工具**：支持Bilibili、抖音、YouTube等平台
- **个人网盘**：文件上传下载管理
- **在线阅读**：集成在线小说阅读器
- **文件格式转换**：常用文件格式互转

## 技术栈

- **后端**：Python Flask, Flask-SocketIO, SQLAlchemy
- **前端**：Tailwind CSS, JavaScript
- **数据库**：SQLite
- **视频处理**：yt-dlp, FFmpeg

## 安装指南

### 1.克隆仓库
```bash
git clone https://github.com/393994653/ZZH-Tool.git
cd ZZH-Tool
```

### 2.创建虚拟环境
```bash
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
.\.venv\Scripts\activate   # Windows
```

### 3.添加./config/personal.py
```python
class PersonalConfig:
    # 和风天气 API 密钥及项目ID、KEY_ID
    # API 文档：https://dev.qweather.com/docs/api/weather/weather-now/
    private_key = """
    -----BEGIN PRIVATE KEY-----
    YOUR_PRIVATE_KEY
    -----END PRIVATE KEY-----
    """
    PROJECT_ID = "YOUR_PROJECT_ID"
    KEY_ID = "YOUR_KEY_ID"

    # 百度地图 API 密钥
    # API 文档：https://lbsyun.baidu.com/index.php?title=webapi/guide/webservice-geocoding-abroad-base
    AK_BAIDU_MAP = "YOUR_AK"
```

### 4.安装依赖并启动服务
```bash
pip install -r requirements.txt
gunicorn -w 4 -b 0.0.0.0:39399 --worker-class eventlet app:app  # 默认端口39399
```