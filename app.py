import argparse
import re
from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    flash,
    session,
    jsonify,
    send_from_directory,
)
from flask_socketio import SocketIO, emit, join_room
import os, json
from datetime import datetime
import requests
from werkzeug.utils import secure_filename
import yt_dlp
import logging
import platform
import uuid
from PIL import Image
import img2pdf
from pdf2image import convert_from_path
import tempfile
import shutil
import zipfile
import time
from PyPDF2 import PdfMerger  # 用于合并PDF

from config.config import Config
import config.config as cfg
from config.config import logger
from config.const import *
try:
    from config.personal import PersonalConfig as PC
except ImportError:
    logger.warning("未找到 personal.py，某些功能可能无法使用。请确保已创建该文件。")
    PC = None

# 创建Flask应用
app = Flask(__name__)
app.secret_key = Config.SECRET_KEY
app.config["UPLOAD_FOLDER"] = "uploads"
app.config["ALLOWED_EXTENSIONS"] = {
    "txt",
    "pdf",
    "png",
    "jpg",
    "jpeg",
    "gif",
    "doc",
    "docx",
}

from werkzeug.middleware.proxy_fix import ProxyFix
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

# 确保上传文件夹存在
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

# 创建SocketIO
socketio = SocketIO(app)

# 默认用户信息（由于删除了登录功能，使用默认用户）
DEFAULT_USER_INFO = {
    "username": "Guest",
    "email": "guest@example.com",
    "avatar": None,
    "login_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
}


def initialize():
    cfg.init()
    isCheck = True
    auto_install = True
    logger.info("正在启动 Flask 应用...")
    if not os.path.exists("key.cf"):
        logger.info("密钥文件未找到，正在创建...")
    logger.info("当前密钥：%s", app.secret_key)

    logger.info(f"当前系统：{platform.system()} {platform.release()}")

    Const.FFMPEG_PATH, Const.FFPROBE_PATH = cfg.configure_ffmpeg(auto_install)
    if not Const.FFMPEG_PATH:
        if platform.system() == "Windows":
            logger.warning(
                """
                ##################################################################
                # FFmpeg 未正确配置！请确保：
                # 1. 下载 FFmpeg 完整版 (https://www.gyan.dev/ffmpeg/builds/)
                # 2. 解压到项目根目录下的 FFmpeg 文件夹
                # 3. 项目结构应为: /FFmpeg/bin/ffmpeg.exe
                ##################################################################
                """
            )
        else:
            logger.warning(
                """
                ##################################################################
                # FFmpeg 未正确配置！请确保：
                # 1. 在系统中安装 FFmpeg
                # 2. 使用以下命令安装 FFmpeg：
                #   sudo apt-get update && sudo apt-get install -y ffmpeg
                ##################################################################
                """
            )
        isCheck = False
    else:
        logger.info(f"FFmpeg 路径配置成功: {Const.FFMPEG_PATH}")

    poppler_path = cfg.install_poppler(auto_install)
    if not poppler_path:
        if platform.system() == "Windows":
            logger.warning(
                """
                ##################################################################
                # Poppler 未正确配置！请确保：
                # 1. 下载 Poppler (https://github.com/oschwartz10612/poppler-windows/releases/download/v25.07.0-0/Release-25.07.0-0.zip)
                # 2. 解压到项目根目录下的 Poppler 文件夹
                # 3. 项目结构应为: /Poppler/Library/bin/pdftoppm.exe
                ##################################################################
                """
            )
        else:
            logger.warning(
                """
                ##################################################################
                # Poppler 未正确配置！请确保：
                # 1. 在系统中安装 Poppler
                # 2. 使用以下命令安装 Poppler：
                #   sudo apt-get update && sudo apt-get install -y poppler-utils 
                ##################################################################
                """
            )
        isCheck = False
    else:
        # 设置pdf2image使用的poppler路径
        from pdf2image import pdf2image

        pdf2image.poppler_path = poppler_path
        logger.info(f"已设置 Poppler 路径: {poppler_path}")
    if isCheck:
        logger.info("FFmpeg 和 Poppler 均已正确配置！")
        logger.info("请使用以下代码启动应用：")
        logger.info("    gunicorn -w 4 -b 0.0.0.0:PORT --worker-class eventlet app:app")
    else:
        logger.warning("FFmpeg 或 Poppler 配置有误，某些功能可能无法使用！")
        if not auto_install and platform.system() == "Windows":
            logger.info("如果你想要自动安装 FFmpeg 和 Poppler，请使用 --auto-install 参数。")






### 主页 - 直接重定向到dashboard
@app.route("/")
def index():
    return redirect(url_for("dashboard"))

@app.route("/dashboard", methods=["GET"])
def dashboard():
    # 使用默认用户信息
    user_info = DEFAULT_USER_INFO

    return render_template(
        "dashboard.html",
        user_info=user_info,
        unread_number=0,  # 由于删除了聊天功能，未读消息为0
        game_record_number=0,
        file_number=0,
        version=Const.VERSION,
        developer=Const.AUTHOR,
        current_date=(
            datetime.now().strftime("%Y-%m-%d ") + Const.week[datetime.now().weekday()]
        ),
    )

# 自定义模板过滤器
@app.template_filter("format_time")
def format_time_filter(timestamp):
    if isinstance(timestamp, str):
        timestamp = datetime.fromisoformat(timestamp)
    return timestamp.strftime("%Y-%m-%d %H:%M")

# 检查文件扩展名
def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in app.config["ALLOWED_EXTENSIONS"]
    )

### 视频解析
@app.route("/video_parse", methods=["GET"])
def video_parse():
    # 使用默认用户信息
    user_info = DEFAULT_USER_INFO

    return render_template(
        "video_parse.html",
        user_info=user_info,
        version=Const.VERSION,
        developer=Const.AUTHOR,
    )

# 视频解析API
@app.route("/parse_video", methods=["POST"])
def parse_video():
    data = request.get_json()
    video_url = data.get("url")

    if not video_url:
        return jsonify({"success": False, "error": "请输入视频链接"}), 400

    try:
        # 第一步：获取所有可用格式
        format_ydl = yt_dlp.YoutubeDL(
            {
                "quiet": True,
                "no_warnings": True,
                "simulate": True,
                "listformats": True,
            }
        )

        format_info = format_ydl.extract_info(video_url, download=False)

        # 提取可用格式
        available_formats = {}
        audio_formats = []

        for fmt in format_info.get("formats", []):
            if fmt.get("format_id"):
                resolution = fmt.get("height", 0)
                ext = fmt.get("ext", "unknown")
                filesize = fmt.get("filesize", 0)
                vcodec = fmt.get("vcodec", "none")
                acodec = fmt.get("acodec", "none")
                format_note = fmt.get("format_note", "")

                # 创建格式描述
                format_desc = f"{ext.upper()}"
                if resolution:
                    format_desc += f" {resolution}p"
                if format_note:
                    format_desc += f" - {format_note}"
                if filesize:
                    format_desc += f" ({filesize//1024//1024}MB)"

                # 区分视频格式和音频格式
                if vcodec != "none" and acodec != "none" and acodec != "none?":
                    # 视频+音频格式
                    format_desc += " (含音频)"
                elif vcodec != "none" and vcodec != "none?":
                    # 纯视频格式
                    format_desc += " (仅视频)"
                elif acodec != "none" and acodec != "none?":
                    # 纯音频格式
                    format_desc += " (仅音频)"
                    audio_formats.append(
                        {"id": fmt["format_id"], "description": format_desc, "ext": ext}
                    )
                    continue
                else:
                    # 未知格式
                    format_desc += " (未知)"

                # 按分辨率分组
                if resolution not in available_formats:
                    available_formats[resolution] = []
                available_formats[resolution].append(
                    {
                        "id": fmt["format_id"],
                        "description": format_desc,
                        "ext": ext,
                        "has_audio": acodec != "none" and acodec != "none?",
                    }
                )

        # 第二步：获取视频元数据
        meta_ydl = yt_dlp.YoutubeDL(
            {
                "quiet": True,
                "no_warnings": True,
                "simulate": True,
                "forcejson": True,
            }
        )

        meta_info = meta_ydl.extract_info(video_url, download=False)

        # 简化返回信息
        video_info = {
            "id": meta_info.get("id"),
            "title": meta_info.get("title"),
            "thumbnail": meta_info.get("thumbnail"),
            "duration": meta_info.get("duration"),
            "uploader": meta_info.get("uploader"),
            "upload_date": meta_info.get("upload_date"),
            "view_count": meta_info.get("view_count"),
            "extractor": meta_info.get("extractor"),
            "webpage_url": meta_info.get("webpage_url"),
            "formats": available_formats,
            "audio_formats": audio_formats,
        }

        return jsonify({"success": True, "video_info": video_info})

    except yt_dlp.utils.DownloadError as e:
        error_msg = str(e)
        # 提取更友好的错误信息
        if "Requested format is not available" in error_msg:
            error_msg = "请求的格式不可用，请尝试其他格式"
        elif "Unsupported URL" in error_msg:
            error_msg = "不支持的URL，请检查链接是否正确"
        elif "Video unavailable" in error_msg:
            error_msg = "视频不可用或已被删除"
        return jsonify({"success": False, "error": f"解析失败: {error_msg}"}), 400
    except yt_dlp.utils.ExtractorError as e:
        return jsonify({"success": False, "error": f"提取失败: {str(e)}"}), 400
    except Exception as e:
        app.logger.error(f"视频解析错误: {str(e)}")
        return jsonify({"success": False, "error": f"服务器错误: {str(e)}"}), 500

@app.route("/download_video", methods=["POST"])
def download_video():
    data = request.get_json()
    video_url = data.get("url")
    format_id = data.get("format_id")
    merge_audio = data.get("merge_audio", True)

    if not video_url or not format_id:
        return jsonify({"success": False, "error": "参数错误"}), 400

    # 检查 FFmpeg 是否可用
    if not Const.FFMPEG_PATH:
        return (
            jsonify({"success": False, "error": "服务器未配置 FFmpeg，无法处理视频"}),
            500,
        )

    try:
        # 创建临时目录
        temp_dir = os.path.join(app.config["UPLOAD_FOLDER"], "videos")
        os.makedirs(temp_dir, exist_ok=True)

        # 添加进度钩子
        def download_progress_hook(d):
            if d["status"] == "downloading":
                # 清理特殊空格字符并确保UTF-8编码
                def clean_string(s):
                    # 移除ANSI转义序列（颜色代码）
                    s = re.sub(r"\x1b\[[0-9;]*m", "", s)
                    # 替换特殊空格为普通空格
                    s = s.replace("\xa0", " ")
                    # 移除其他非打印字符
                    return s.encode("utf-8", "ignore").decode("utf-8").strip()

                percent = clean_string(d.get("_percent_str", "0%"))
                speed = clean_string(d.get("_speed_str", "N/A"))
                eta = clean_string(d.get("_eta_str", "N/A"))

                # 发送进度数据
                socketio.emit(
                    "download_progress",
                    {"percent": percent, "speed": speed, "eta": eta},
                )

        # 配置下载选项
        ydl_opts = {
            "format": format_id,
            "outtmpl": os.path.join(temp_dir, "%(title)s.%(ext)s"),
            "merge_output_format": "mp4",
            "ffmpeg_location": Const.FFMPEG_PATH,
            "postprocessor_args": ["-y"],  # 覆盖输出文件
            "verbose": True,
            "progress_hooks": [download_progress_hook],
        }

        # 添加后处理器
        if merge_audio:
            ydl_opts["postprocessors"] = [
                {"key": "FFmpegVideoConvertor", "preferedformat": "mp4"}
            ]

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=True)
            filename = ydl.prepare_filename(info)

            # 获取下载URL
            download_url = url_for(
                "download_video_file",
                filename=os.path.basename(filename),
                _external=True,
            )

            return jsonify(
                {
                    "success": True,
                    "filename": os.path.basename(filename),
                    "download_url": download_url,
                }
            )

    except yt_dlp.utils.DownloadError as e:
        logger.error(f"视频下载失败: {str(e)}")
        return jsonify({"success": False, "error": f"下载失败: {str(e)}"}), 400
    except Exception as e:
        logger.error(f"视频下载错误: {str(e)}")
        return jsonify({"success": False, "error": f"服务器错误: {str(e)}"}), 500

@app.route("/download_video/<filename>")
def download_video_file(filename):
    video_dir = os.path.join(app.config["UPLOAD_FOLDER"], "videos")
    return send_from_directory(video_dir, filename, as_attachment=True)

### 文件格式转换器
# ================ 文件格式转换器实现 ================

# 配置转换目录
CONVERT_DIR = os.path.join("uploads", "converted")
os.makedirs(CONVERT_DIR, exist_ok=True)

# 图像模式处理函数
def handle_special_image_modes(img):
    """
    处理所有特殊图像模式，返回处理后的RGB图像
    支持的模式: RGBA, LA, PA, P, CMYK, 1 (二值), L (灰度)
    """
    # 模式映射表
    mode_handlers = {
        # 带透明度的模式
        "RGBA": lambda i: i.convert("RGB"),
        "LA": lambda i: _convert_la(i),
        "PA": lambda i: _convert_pa(i),
        "RGBa": lambda i: i.convert("RGB"),
        # 不带透明度的特殊模式
        "P": lambda i: i.convert("RGB"),
        "CMYK": lambda i: i.convert("RGB"),
        "1": lambda i: i.convert("L").convert("RGB"),  # 二值图先转灰度再转RGB
        "L": lambda i: i.convert("RGB"),  # 灰度转RGB
        "I": lambda i: i.convert("RGB"),  # 32位整数灰度
        "F": lambda i: i.convert("RGB"),  # 32位浮点灰度
        # 其他未知模式
        "default": lambda i: i.convert("RGB"),
    }

    handler = mode_handlers.get(img.mode, mode_handlers["default"])
    return handler(img)

def _convert_la(img):
    """转换LA模式(灰度+alpha)为RGB"""
    # 分离灰度和alpha通道
    l, a = img.split()

    # 创建白色背景
    background = Image.new("RGB", img.size, (255, 255, 255))

    # 创建RGB灰度图像
    rgb_img = Image.merge("RGB", (l, l, l))

    # 应用alpha通道
    background.paste(rgb_img, mask=a)

    return background

def _convert_pa(img):
    """转换PA模式(调色板+alpha)为RGB"""
    # 先转换为RGBA
    rgba_img = img.convert("RGBA")

    # 创建白色背景
    background = Image.new("RGB", img.size, (255, 255, 255))

    # 应用alpha通道
    r, g, b, a = rgba_img.split()
    background.paste(rgba_img, mask=a)

    return background

# 图片转PDF函数（处理所有图像模式）
def convert_image_to_pdf(image_path, output_path, quality=90):
    try:
        # 打开图片
        img = Image.open(image_path)

        # 处理特殊图像模式
        img = handle_special_image_modes(img)

        # 确保图像是RGB模式
        if img.mode != "RGB":
            img = img.convert("RGB")

        # 创建临时JPEG文件
        temp_jpg = os.path.join(CONVERT_DIR, f"temp_{uuid.uuid4().hex}.jpg")
        img.save(temp_jpg, "JPEG", quality=quality)

        # 转换为PDF
        with open(output_path, "wb") as f:
            f.write(img2pdf.convert(temp_jpg))

        # 删除临时文件
        os.remove(temp_jpg)
        return True

    except Exception as e:
        logging.error(f"图片转PDF错误: {str(e)}", exc_info=True)
        return False

# 文件转换路由（支持进度更新）
@app.route("/convert_files", methods=["POST"])
def convert_files():
    if "files" not in request.files:
        return jsonify({"success": False, "error": "未选择文件"}), 400

    files = request.files.getlist("files")
    if len(files) == 0:
        return jsonify({"success": False, "error": "未选择文件"}), 400

    # 获取转换选项
    options = request.form.get("options")
    try:
        options = json.loads(options) if options else {}
    except:
        options = {}

    # 获取任务ID
    task_id = options.get("task_id", "")

    logger.info(f"转换任务ID: {task_id}")

    # 创建临时目录
    temp_dir = tempfile.mkdtemp(dir=CONVERT_DIR)
    converted_files = []
    target_format = options.get("targetFormat", "pdf")
    merge_pdf = options.get("mergePdf", True)

    # 记录开始时间
    start_time = time.time()

    # 发送进度更新
    def send_progress(percent, message, eta="--:--"):
        socketio.emit(
            "conversion_progress",
            {"task_id": task_id, "percent": percent, "message": message, "eta": eta},
            namespace="/",
        )

    total_files = len(files)
    processed_files = 0

    # 发送初始进度
    send_progress(0, "开始转换...")
    logger.info(f"开始转换 {total_files} 个文件，目标格式: {target_format}")

    # 处理每个文件
    for idx, file in enumerate(files):
        if file.filename == "":
            continue

        # 更新进度
        processed_files += 1
        progress = int((processed_files / total_files) * 100)
        logger.info(
            f"正在处理文件: {file.filename} ({processed_files}/{total_files}) - 进度: {progress}%"
        )

        # 计算ETA
        elapsed = time.time() - start_time
        time_per_file = elapsed / processed_files if processed_files > 0 else 5
        remaining_time = time_per_file * (total_files - processed_files)
        minutes = int(remaining_time // 60)
        seconds = int(remaining_time % 60)
        eta = f"{minutes:02d}:{seconds:02d}"

        send_progress(
            progress,
            f"正在处理文件: {file.filename} ({processed_files}/{total_files})",
            eta,
        )

        # 生成唯一文件名
        original_ext = file.filename.rsplit(".", 1)[1].lower()
        unique_id = uuid.uuid4().hex
        original_filename = f"{unique_id}.{original_ext}"
        original_path = os.path.join(temp_dir, original_filename)

        # 保存原始文件
        file.save(original_path)

        # 生成目标文件名
        target_filename = (
            f"{file.filename.rsplit('.', 1)[0]}_{unique_id}.{target_format}"
        )
        target_path = os.path.join(temp_dir, target_filename)

        # 根据文件类型执行转换
        success = False
        file_size = 0

        try:
            # PDF转图片
            if original_ext == "pdf" and target_format in [
                "png",
                "jpg",
                "jpeg",
                "bmp",
                "gif",
                "tiff",
                "webp",
            ]:
                # 更新进度
                send_progress(progress, f"转换PDF到图片: {file.filename}")

                # PDF转图片 - 转换所有页面
                images = convert_from_path(original_path)

                # 创建文件夹存放所有页面
                pdf_pages_dir = os.path.join(temp_dir, f"{uuid.uuid4().hex}_pages")
                os.makedirs(pdf_pages_dir, exist_ok=True)

                # 保存所有页面
                for i, image in enumerate(images):
                    page_filename = f"{os.path.splitext(target_filename)[0]}_page{i+1}.{target_format}"
                    page_path = os.path.join(pdf_pages_dir, page_filename)
                    image.save(page_path)

                    converted_files.append(
                        {
                            "filename": page_filename,
                            "file_size": os.path.getsize(page_path),
                            "path": page_path,
                        }
                    )

                success = True

            # 图片转PDF
            elif (
                original_ext in ["png", "jpg", "jpeg", "bmp", "gif", "tiff", "webp"]
                and target_format == "pdf"
            ):
                # 更新进度
                send_progress(progress, f"转换图片到PDF: {file.filename}")

                # 如果是合并PDF，不立即转换，稍后统一处理
                if merge_pdf:
                    # 只保存图片路径，稍后合并
                    converted_files.append(
                        {
                            "type": "image",
                            "path": original_path,
                            "filename": file.filename,
                            "target_path": target_path,
                        }
                    )
                    success = True
                else:
                    # 单个图片转PDF
                    success = convert_image_to_pdf(
                        original_path, target_path, int(options.get("imageQuality", 90))
                    )
                    if success:
                        file_size = os.path.getsize(target_path)
                        converted_files.append(
                            {
                                "filename": target_filename,
                                "file_size": file_size,
                                "path": target_path,
                            }
                        )

            # 图片格式转换
            elif original_ext in [
                "png",
                "jpg",
                "jpeg",
                "bmp",
                "gif",
                "tiff",
                "webp",
            ] and target_format in ["png", "jpg", "jpeg", "bmp", "gif", "tiff", "webp"]:
                # 更新进度
                send_progress(progress, f"转换图片格式: {file.filename}")
                logger.info(f"转换图片格式: {file.filename} -> {target_format}")

                # 图片格式转换
                img = Image.open(original_path)

                # 处理特殊图像模式
                img = handle_special_image_modes(img)

                # 确保目标格式兼容
                if target_format in ["jpg", "jpeg"] and img.mode != "RGB":
                    img = img.convert("RGB")

                # 调整质量
                quality = int(options.get("imageQuality", 90))

                # 调整大小
                resize_option = options.get("resizeOption", "original")
                if resize_option == "hd":
                    img = img.resize((1920, 1080), Image.Resampling.LANCZOS)
                elif resize_option == "fullhd":
                    img = img.resize((2560, 1440), Image.Resampling.LANCZOS)

                # 保存为目标格式
                if target_format in ["jpg", "jpeg"]:
                    img.save(target_path, "JPEG", quality=quality)
                else:
                    img.save(target_path, format=target_format.upper(), quality=quality)

                file_size = os.path.getsize(target_path)
                converted_files.append(
                    {
                        "filename": target_filename,
                        "file_size": file_size,
                        "path": target_path,
                    }
                )
                success = True

            # PDF转PDF（不需要转换）
            elif original_ext == "pdf" and target_format == "pdf":
                # 直接复制文件
                shutil.copy(original_path, target_path)
                file_size = os.path.getsize(target_path)
                converted_files.append(
                    {
                        "filename": target_filename,
                        "file_size": file_size,
                        "path": target_path,
                    }
                )
                success = True

            else:
                success = False
                logging.warning(
                    f"不支持从 {original_ext} 到 {target_format} 的转换: {file.filename}"
                )

            # 对于非合并PDF的单个转换，记录成功
            if not success:
                logging.error(f"文件转换失败: {file.filename}")

        except Exception as e:
            logging.error(f"转换文件 {file.filename} 时出错: {str(e)}", exc_info=True)
            success = False

        finally:
            # 清理原始文件（除了需要合并的图片）
            if not (
                original_ext in ["png", "jpg", "jpeg", "bmp", "gif", "tiff", "webp"]
                and target_format == "pdf"
                and merge_pdf
            ):
                try:
                    os.remove(original_path)
                except:
                    pass

    # 处理合并PDF的情况
    if (
        merge_pdf
        and target_format == "pdf"
        and len([f for f in converted_files if f.get("type") == "image"]) > 0
    ):
        try:
            # 更新进度
            send_progress(95, "合并PDF文件中...")
            logger.info("开始合并PDF文件...")

            # 创建合并后的PDF文件
            merged_filename = f"merged_{uuid.uuid4().hex}.pdf"
            merged_path = os.path.join(temp_dir, merged_filename)

            # 获取所有需要合并的图片路径
            image_paths = [
                item["path"] for item in converted_files if item.get("type") == "image"
            ]

            # 合并图片到PDF
            if image_paths:
                # 创建一个临时PDF列表
                temp_pdfs = []

                for img_path in image_paths:
                    # 为每个图片创建PDF
                    temp_pdf = f"{img_path}.pdf"
                    if convert_image_to_pdf(
                        img_path, temp_pdf, int(options.get("imageQuality", 90))
                    ):
                        temp_pdfs.append(temp_pdf)

                # 合并所有PDF
                if temp_pdfs:
                    merger = PdfMerger()

                    for pdf_path in temp_pdfs:
                        merger.append(pdf_path)

                    merger.write(merged_path)
                    merger.close()

                    # 获取文件大小
                    file_size = os.path.getsize(merged_path)

                    # 添加到转换结果
                    converted_files = [
                        {
                            "filename": merged_filename,
                            "file_size": file_size,
                            "path": merged_path,
                        }
                    ]

                    # 清理临时PDF
                    for pdf_path in temp_pdfs:
                        try:
                            os.remove(pdf_path)
                        except:
                            pass
                else:
                    logging.error("没有成功转换的图片用于合并PDF")
                    return (
                        jsonify(
                            {
                                "success": False,
                                "error": "合并PDF失败: 没有成功转换的图片",
                            }
                        ),
                        500,
                    )
        except Exception as e:
            logging.error(f"合并PDF时出错: {str(e)}", exc_info=True)
            return jsonify({"success": False, "error": f"合并PDF失败: {str(e)}"}), 500

    # 如果没有成功转换的文件
    if len(converted_files) == 0:
        return jsonify({"success": False, "error": "没有文件成功转换"}), 400

    # 生成下载信息
    result_files = []
    for item in converted_files:
        if "path" in item and os.path.exists(item["path"]):
            # 生成下载URL
            download_url = url_for(
                "download_converted_file",
                filename=os.path.basename(item["path"]),
                _external=True,
            )
            result_files.append(
                {
                    "filename": item["filename"],
                    "file_size": item.get("file_size", 0),
                    "download_url": download_url,
                }
            )

    # 如果有多个文件，创建ZIP文件
    zip_url = None
    if len(result_files) > 1 or (len(result_files) == 1 and merge_pdf):
        try:
            # 更新进度
            send_progress(98, "打包文件中...")
            logger.info("开始打包转换后的文件...")

            # 创建ZIP文件
            zip_filename = f"converted_files_{uuid.uuid4().hex}.zip"
            zip_path = os.path.join(CONVERT_DIR, zip_filename)

            with zipfile.ZipFile(zip_path, "w") as zipf:
                for file in converted_files:
                    if "path" in file and os.path.exists(file["path"]):
                        zipf.write(file["path"], file["filename"])

            zip_url = url_for(
                "download_converted_file", filename=zip_filename, _external=True
            )
        except Exception as e:
            logging.error(f"创建ZIP文件时出错: {str(e)}", exc_info=True)

    # 返回结果
    send_progress(100, "转换完成!", "00:00")
    logger.info("文件转换完成!")
    return jsonify(
        {
            "success": True,
            "files": result_files,
            "zip_url": zip_url,
            "file_count": len(result_files),
        }
    )

# 下载转换后的文件
@app.route("/download_converted/<filename>")
def download_converted_file(filename):
    return send_from_directory(CONVERT_DIR, filename, as_attachment=True)

# 文件转换器页面
@app.route("/file_converter", methods=["GET"])
def file_converter():
    # 使用默认用户信息
    user_info = DEFAULT_USER_INFO

    return render_template(
        "file_converter.html",
        user_info=user_info,
        version=Const.VERSION,
        developer=Const.AUTHOR,
    )


# 天气状况API配置
@app.route('/api/weather', methods=['POST'])
def api_weather():
    """天气API接口"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'code': 400, 'msg': '请求数据为空'})
        
        latitude = data.get('latitude')  # 纬度
        longitude = data.get('longitude')  # 经度

        # 显示经纬度
        logger.info(f"经纬度： {latitude}, {longitude}")
        
        # 验证参数
        if latitude is None or longitude is None:
            return jsonify({'code': 400, 'msg': '缺少经纬度参数'})
        
        try:
            latitude = float(latitude)
            longitude = float(longitude)
        except (ValueError, TypeError):
            return jsonify({'code': 400, 'msg': '经纬度参数格式错误'})
        
        if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
            return jsonify({'code': 400, 'msg': '经纬度参数范围无效'})
        
        # 检查配置
        if PC.private_key == "":
            return jsonify({
                'code': 500, 
                'msg': '服务器配置错误: 请配置正确的 key'
            })
        
        # 获取天气信息
        weather_data = cfg.get_weather_by_coords(latitude, longitude)
        return jsonify(weather_data)
        
    except Exception as e:
        print(f"API处理错误: {e}")
        return jsonify({'code': 500, 'msg': '服务器内部错误'})



initialize()
if __name__ == "__main__":
    socketio.run(app, debug=Const.DEBUG, port=Const.PORT)