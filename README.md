# ZZH-Tool - 多功能Web工具箱

![项目截图](https://img.freepik.com/free-vector/dashboard-analytics-concept-illustration_114360-745.jpg)

ZZH-Tool是一个基于Python Flask开发的多功能Web工具箱，集成了聊天、视频解析、文件管理等多种实用功能。

## 主要功能

- 💬 **在线聊天系统**：实时消息、文件传输、好友管理
- 🎬 **视频解析工具**：支持Bilibili、抖音、YouTube等平台
- 📁 **个人网盘**：文件上传下载管理
- 📚 **在线阅读**：集成在线小说阅读器
- 🎮 **小游戏合集**：休闲娱乐小游戏
- 🔧 **文件格式转换**：常用文件格式互转

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

### 3.安装依赖并启动服务
```bash
pip install -r requirements.txt
python app.py
```