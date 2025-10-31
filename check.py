import argparse
import os
import platform
from app import app, socketio
from config import const as Const
from config import config as cfg
from config.config import logger

if __name__ == "__main__":
    isCheck = True

    parser = argparse.ArgumentParser(description='Flask Application')
    parser.add_argument('--auto-install', action='store_true', 
                       help='自动安装 FFmpeg 和 Poppler')
    args = parser.parse_args()

    cfg.init()

    logger.info("正在启动 Flask 应用...")
    if not os.path.exists("key.cf"):
        logger.info("密钥文件未找到，正在创建...")
    logger.info("当前密钥：%s", app.secret_key)

    logger.info(f"当前系统：{platform.system()} {platform.release()}")

    Const.FFMPEG_PATH, Const.FFPROBE_PATH = cfg.configure_ffmpeg(args.auto_install)
    if not Const.FFMPEG_PATH:
        if platform.system() == "Windows":
            logger.warning(
                """
                ########################################################
                # FFmpeg 未正确配置！请确保：
                # 1. 下载 FFmpeg 完整版 (https://www.gyan.dev/ffmpeg/builds/)
                # 2. 解压到项目根目录下的 FFmpeg 文件夹
                # 3. 项目结构应为: /FFmpeg/bin/ffmpeg.exe
                ########################################################
                """
            )
        else:
            logger.warning(
                """
                ########################################################
                # FFmpeg 未正确配置！请确保：
                # 1. 在系统中安装 FFmpeg
                # 2. 确保 ffmpeg 和 ffprobe 可通过命令行访问
                ########################################################
                """
            )
        isCheck = False
    else:
        logger.info(f"FFmpeg 路径配置成功: {Const.FFMPEG_PATH}")

    poppler_path = cfg.install_poppler(args.auto_install)
    if not poppler_path:
        if platform.system() == "Windows":
            logger.error(
                """
                ########################################################
                # Poppler 未正确配置！请确保：
                # 1. 下载 Poppler (https://github.com/oschwartz10612/poppler-windows/releases/download/v25.07.0-0/Release-25.07.0-0.zip)
                # 2. 解压到项目根目录下的 Poppler 文件夹
                # 3. 项目结构应为: /Poppler/Library/bin/pdftoppm.exe
                ########################################################
                """
            )
        else:
            logger.error(
                """
                ########################################################
                # Poppler 未正确配置！请确保：
                # 1. 在系统中安装 Poppler
                # 2. 确保 pdftoppm 可通过命令行访问
                ########################################################
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
        logger.info("    gunicorn -w 4 -b 0.0.0.0:PORT app:app")
    else:
        logger.warning("FFmpeg 或 Poppler 配置有误，某些功能可能无法使用！")
        if not args.auto_install:
            logger.info("如果你想要自动安装 FFmpeg 和 Poppler，请使用 --auto-install 参数。")

