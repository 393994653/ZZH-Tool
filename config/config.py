from datetime import datetime
import os
import secrets
import platform
import logging
import shutil
import tempfile
from tqdm import tqdm
import zipfile
import requests
from colorlog import ColoredFormatter


logger = logging.getLogger("ZZH-Tool")  # 获取根logger


def init():
    global logger

    if not os.path.exists("logs"):
        os.makedirs("logs")

    # 创建logger
    logger.setLevel(logging.DEBUG)  # 设置最低级别

    # 创建控制台处理器
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)  # 控制台只输出INFO以上级别

    # 创建文件处理器
    file_handler = logging.FileHandler(
        f"logs/{ (str(datetime.now().strftime("%Y%m%d%H%M%S"))) }.log", encoding="utf-8"
    )
    file_handler.setLevel(logging.DEBUG)  # 文件记录所有级别

    formatter = ColoredFormatter(
        "%(log_color)s%(asctime)s - %(name)s - %(levelname)s - %(message)s%(reset)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        log_colors={
            "DEBUG": "cyan",
            "INFO": "green",
            "WARNING": "yellow",
            "ERROR": "red",
            "CRITICAL": "red,bg_white",
        },
    )
    console_handler.setFormatter(formatter)
    file_handler.setFormatter(formatter)

    # 添加处理器到logger
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)


class Config:
    # open "key.cf" and read the Secret Key
    if not os.path.exists("key.cf"):
        # If the file does not exist, create it with a new secret key
        SECRET_KEY = secrets.token_hex(16)
        with open("key.cf", "w") as f:
            f.write(SECRET_KEY)
    with open("key.cf", "r") as f:
        SECRET_KEY = f.read().strip()


# 配置 FFmpeg 路径
def configure_ffmpeg(auto_install = False):
    # 根据操作系统确定可执行文件名
    ffmpeg_exe = "ffmpeg.exe" if platform.system() == "Windows" else "ffmpeg"
    ffprobe_exe = "ffprobe.exe" if platform.system() == "Windows" else "ffprobe"

    # 定义相对路径
    ffmpeg_dir = os.path.join(os.getcwd(), "FFmpeg", "bin")
    ffmpeg_path = os.path.join(ffmpeg_dir, ffmpeg_exe)
    ffprobe_path = os.path.join(ffmpeg_dir, ffprobe_exe)

    # 检查文件是否存在
    if not os.path.exists(ffmpeg_path):
        logger.error(f"FFmpeg 未找到: {ffmpeg_path}")
        if auto_install:
            logger.info("尝试自动下载并安装 FFmpeg...")
            if download_and_extract_ffmpeg(auto_install) == False:
                return None, None

    # 在 Windows 上添加执行权限
    if platform.system() == "Windows":
        try:
            import stat

            os.chmod(ffmpeg_path, stat.S_IXUSR)
            os.chmod(ffprobe_path, stat.S_IXUSR)
        except Exception as e:
            logger.warning(f"无法设置执行权限: {str(e)}")

    return ffmpeg_path, ffprobe_path


def download_and_extract_ffmpeg(auto_install=False):
    """自动下载并解压 FFmpeg"""
    ffmpeg_dir = os.path.join(os.getcwd(), "FFmpeg")

    # 如果 FFmpeg 已存在，则跳过
    if os.path.exists(os.path.join(ffmpeg_dir, "bin", "ffmpeg.exe")):
        return

    os.makedirs(ffmpeg_dir, exist_ok=True)

    # 根据操作系统选择下载包
    if platform.system() == "Windows":
        url = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-full.7z"
        download_path = os.path.join(ffmpeg_dir, "ffmpeg.7z")
        try:
            # 如果有系统代理则设置系统代理
            proxies = {}
            http_proxy = os.environ.get("http_proxy") or os.environ.get("HTTP_PROXY")
            https_proxy = os.environ.get("https_proxy") or os.environ.get("HTTPS_PROXY")
            if http_proxy:
                proxies["http"] = http_proxy
            if https_proxy:
                proxies["https"] = https_proxy
            if proxies:
                logger.info(f"使用系统代理: {proxies}")
            else:
                proxies = None

            # 发送HEAD请求获取文件总大小
            head_response = requests.head(url, allow_redirects=True)
            total_size = int(head_response.headers.get("content-length", 0))

            # 发送GET请求开始下载
            response = requests.get(url, stream=True, proxies=proxies)

            # 使用tqdm创建进度条
            with tqdm(
                total=total_size,
                unit="B",
                unit_scale=True,
                desc="下载进度",
                bar_format="{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}, {rate_fmt}]",
            ) as pbar:
                with open(download_path, "wb") as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        if chunk:
                            f.write(chunk)
                            # 更新进度条
                            pbar.update(len(chunk))
        except Exception as e:
            logger.error(f"下载 FFmpeg 失败: {str(e)}，请检查网络连接或手动下载。")
            return False

        try:
            # 解压文件
            logger.info("解压 FFmpeg...")
            if platform.system() == "Windows":
                # 使用 7-Zip 解压
                try:
                    import py7zr

                    with py7zr.SevenZipFile(download_path, mode="r") as z:
                        z.extractall(path=ffmpeg_dir)
                except ImportError:
                    logger.error("请安装 py7zr 库: pip install py7zr")
                    os.remove(download_path)
                    return
            else:
                # 使用 tar 解压
                import tarfile

                with tarfile.open(download_path) as tar:
                    tar.extractall(path=ffmpeg_dir)

            # 清理下载文件
            os.remove(download_path)
            logger.info("FFmpeg 安装完成！")

        except Exception as e:
            logger.error(f"解压 FFmpeg 失败: {str(e)}，请前往FFmpeg文件夹手动解压。")
            return False
        return True
    else:  # Linux/macOS
        if platform.system() == "Linux" and os.getuid() == 0:
            choice = "n"
            if auto_install == False:
                logger.info("已经以 root 用户运行，是否自动安装 FFmpeg？[y/N]")
                choice = input().strip().lower()
            else:
                choice = "y"
            if choice == "y":
                os.system("apt-get update && apt-get install -y ffmpeg")
                return True
        else:
            logger.error("FFmpeg 未找到！请以 root 用户运行以自动安装，或手动安装 FFmpeg。")
        return False
        # url = "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz"
        # download_path = os.path.join(ffmpeg_dir, "ffmpeg.tar.xz")



# 检查并安装Poppler函数
def install_poppler(auto_install=False):
    # Linux平台的处理
    if platform.system() == "Linux":
        if os.getuid() == 0:
            choice = "n"
            if auto_install == False:
                logger.info("已经以 root 用户运行，是否自动安装 Poppler？[y/N]")
                choice = input().strip().lower()
            else:
                choice = "y"
            if choice == "y":
                os.system("apt-get update && apt-get install -y poppler-utils")
                return "/usr/bin"
        else:
            logger.error("Poppler 未找到！请以 root 用户运行以自动安装，或手动安装 poppler-utils。")
        return None
    
    poppler_dir = os.path.join(os.getcwd(), "Poppler")
    poppler_library = os.path.join(poppler_dir, "Library")
    poppler_bin = os.path.join(poppler_library, "bin")

    # 检查是否已安装
    if os.path.exists(poppler_bin):
        os.environ["PATH"] = poppler_bin + os.pathsep + os.environ["PATH"]
        logger.info(f"Poppler 已找到: {poppler_bin}")
        return poppler_bin

    # Windows平台的自动安装逻辑
    if auto_install:
        temp_extract_dir = None
        zip_path = None
        try:
            # 创建Poppler目录
            os.makedirs(poppler_dir, exist_ok=True)

            # 下载Poppler
            logger.info("正在下载 Poppler...")
            url = "https://github.com/oschwartz10612/poppler-windows/releases/download/v25.07.0-0/Release-25.07.0-0.zip"
            zip_path = os.path.join(tempfile.gettempdir(), "poppler.zip")

            with requests.get(url, stream=True) as r:
                r.raise_for_status()
                with open(zip_path, "wb") as f:
                    for chunk in r.iter_content(chunk_size=8192):
                        f.write(chunk)

            # 解压文件
            logger.info("正在解压 Poppler...")
            temp_extract_dir = os.path.join(tempfile.gettempdir(), "poppler_temp")
            os.makedirs(temp_extract_dir, exist_ok=True)
            
            with zipfile.ZipFile(zip_path, "r") as zip_ref:
                zip_ref.extractall(temp_extract_dir)

            # 找到Library文件夹并移动到目标位置
            release_dir = os.path.join(temp_extract_dir, "Release-23.08.0-0")
            if os.path.exists(release_dir):
                source_library = os.path.join(release_dir, "Library")
                if os.path.exists(source_library):
                    shutil.move(source_library, poppler_dir)
                    logger.info(f"已将 Library 文件夹移动到: {poppler_dir}")
                else:
                    logger.error("在解压文件中找不到 Library 文件夹")
                    return None
            else:
                logger.error("在解压文件中找不到 Release-23.08.0-0 文件夹")
                return None

            # 设置环境变量
            os.environ["PATH"] = poppler_bin + os.pathsep + os.environ["PATH"]
            logger.info(f"Poppler 已安装到: {poppler_bin}")
            return poppler_bin

        except Exception as e:
            logger.error(f"安装 Poppler 失败: {str(e)}", exc_info=True)
            return None
        finally:
            # 清理临时文件
            try:
                if zip_path and os.path.exists(zip_path):
                    os.remove(zip_path)
            except:
                pass
            try:
                if temp_extract_dir and os.path.exists(temp_extract_dir):
                    shutil.rmtree(temp_extract_dir)
            except:
                pass

    return None
