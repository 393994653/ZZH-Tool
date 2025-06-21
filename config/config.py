import os
import secrets
import platform
import logging

import zipfile
import requests


class Config:
    DEBUG = True  # Enable debug mode for development
    PORT = 8081  # Port to run the Flask application

    # open "key.cf" and read the Secret Key
    if not os.path.exists("key.cf"):
        # If the file does not exist, create it with a new secret key
        SECRET_KEY = secrets.token_hex(16)
        with open("key.cf", "w") as f:
            f.write(SECRET_KEY)
    with open("key.cf", "r") as f:
        SECRET_KEY = f.read().strip()


# 配置 FFmpeg 路径
def configure_ffmpeg():
    # 根据操作系统确定可执行文件名
    ffmpeg_exe = "ffmpeg.exe" if platform.system() == "Windows" else "ffmpeg"
    ffprobe_exe = "ffprobe.exe" if platform.system() == "Windows" else "ffprobe"

    # 定义相对路径
    ffmpeg_dir = os.path.join(os.getcwd(), "FFmpeg", "bin")
    ffmpeg_path = os.path.join(ffmpeg_dir, ffmpeg_exe)
    ffprobe_path = os.path.join(ffmpeg_dir, ffprobe_exe)

    # 检查文件是否存在
    if not os.path.exists(ffmpeg_path):
        logging.error(f"FFmpeg 未找到: {ffmpeg_path}")
        if download_and_extract_ffmpeg() == False:
            logging.error("FFmpeg 下载或解压失败，请手动安装 FFmpeg。")
            return None, None

    # 在 Windows 上添加执行权限
    if platform.system() == "Windows":
        try:
            import stat

            os.chmod(ffmpeg_path, stat.S_IXUSR)
            os.chmod(ffprobe_path, stat.S_IXUSR)
        except Exception as e:
            logging.warning(f"无法设置执行权限: {str(e)}")

    return ffmpeg_path, ffprobe_path

def download_and_extract_ffmpeg():
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
    else:  # Linux/macOS
        url = "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz"
        download_path = os.path.join(ffmpeg_dir, "ffmpeg.tar.xz")

    try:
        # 下载 FFmpeg
        logging.info("正在下载 FFmpeg...")
        response = requests.get(url, stream=True)
        with open(download_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        # 解压文件
        logging.info("解压 FFmpeg...")
        if platform.system() == "Windows":
            # 使用 7-Zip 解压
            try:
                import py7zr

                with py7zr.SevenZipFile(download_path, mode="r") as z:
                    z.extractall(path=ffmpeg_dir)
            except ImportError:
                logging.error("请安装 py7zr 库: pip install py7zr")
                os.remove(download_path)
                return
        else:
            # 使用 tar 解压
            import tarfile

            with tarfile.open(download_path) as tar:
                tar.extractall(path=ffmpeg_dir)

        # 清理下载文件
        os.remove(download_path)
        logging.info("FFmpeg 安装完成！")

    except Exception as e:
        logging.error(f"自动安装 FFmpeg 失败: {str(e)}")
        return False
    return True

