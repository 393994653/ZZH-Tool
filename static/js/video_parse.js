document.addEventListener('DOMContentLoaded', function () {
  const parseBtn = document.getElementById('parseBtn');
  const videoUrlInput = document.getElementById('videoUrl');
  const parseResult = document.getElementById('parseResult');

  // 添加进度条样式到页面
  addProgressBarStyles();

  // 初始化解析按钮
  parseBtn.addEventListener('click', parseVideo);

  // 初始化Socket.IO连接
  const socket = io.connect();

  // 监听下载进度事件
  socket.on('download_progress', function (data) {
    updateProgressBar(data);
  });

  // 视频解析函数
  function parseVideo() {
    const videoUrl = videoUrlInput.value.trim();

    if (!videoUrl) {
      showError('请输入视频链接');
      return;
    }

    // 验证URL格式
    if (!isValidUrl(videoUrl)) {
      showError('请输入有效的视频链接');
      return;
    }

    // 显示加载状态
    showLoading();

    // 发送解析请求
    fetch('/parse_video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: videoUrl
      })
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(errData => {
            throw new Error(errData.error || '请求失败');
          });
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          displayVideoInfo(data.video_info);
        } else {
          showError(data.error || '视频解析失败，请稍后重试');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        showError(error.message || '网络请求失败，请检查网络连接');
      });
  }

  // 显示加载状态
  function showLoading() {
    parseResult.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <div class="loading-text">正在解析视频，请稍候...</div>
      </div>
    `;
  }

  // 显示错误信息
  function showError(message) {
    parseResult.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
        <button id="retryBtn" class="btn-parse">
          <i class="fas fa-redo"></i> 重新尝试
        </button>
      </div>
    `;

    // 添加重试按钮事件
    document.getElementById('retryBtn').addEventListener('click', parseVideo);
  }

  // 验证URL格式
  function isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }

  // 显示视频信息
  function displayVideoInfo(videoInfo) {
    // 生成视频格式选择器
    let videoFormatsHtml = '';
    if (videoInfo.formats && Object.keys(videoInfo.formats).length > 0) {
      // 按分辨率从高到低排序
      const resolutions = Object.keys(videoInfo.formats).sort((a, b) => b - a);

      resolutions.forEach(resolution => {
        const formats = videoInfo.formats[resolution];
        const groupLabel = resolution > 0 ? `${resolution}p` : '其他格式';

        videoFormatsHtml += `<optgroup label="${groupLabel}">`;
        formats.forEach(format => {
          const audioIcon = format.has_audio ?
            '<i class="fas fa-volume-up audio-icon" title="包含音频"></i>' :
            '<i class="fas fa-volume-mute audio-icon" title="无音频"></i>';
          videoFormatsHtml += `<option value="${format.id}" ${format.has_audio ? 'selected' : ''}>
              ${audioIcon} ${format.description}
            </option>`;
        });
        videoFormatsHtml += '</optgroup>';
      });
    } else {
      videoFormatsHtml = '<option value="">无可用视频格式</option>';
    }

    // 生成音频格式选择器
    let audioFormatsHtml = '';
    if (videoInfo.audio_formats && videoInfo.audio_formats.length > 0) {
      videoInfo.audio_formats.forEach(audio => {
        audioFormatsHtml += `<option value="${audio.id}">${audio.description}</option>`;
      });
    } else {
      audioFormatsHtml = '<option value="">无可用音频格式</option>';
    }

    // 视频信息HTML
    parseResult.innerHTML = `
      <div class="video-info">
        <div class="video-thumbnail">
          <img src="${videoInfo.thumbnail}" alt="${videoInfo.title}" onerror="this.src='https://via.placeholder.com/400x225?text=缩略图加载失败'">
        </div>
        <div class="video-details">
          <h3 class="video-title">${videoInfo.title || '未知标题'}</h3>
          <div class="video-meta">
            <div class="meta-item">
              <div class="meta-label">平台:</div>
              <div class="meta-value">${videoInfo.extractor || '未知'}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">时长:</div>
              <div class="meta-value">${formatDuration(videoInfo.duration)}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">上传者:</div>
              <div class="meta-value">${videoInfo.uploader || '未知'}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">上传日期:</div>
              <div class="meta-value">${formatDate(videoInfo.upload_date)}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">观看次数:</div>
              <div class="meta-value">${videoInfo.view_count ? formatNumber(videoInfo.view_count) : '未知'}</div>
            </div>
          </div>
          
          <div class="format-container">
            <div class="format-section">
              <h4><i class="fas fa-video"></i> 视频格式</h4>
              <div class="format-selector">
                <select id="videoFormatSelect">
                  ${videoFormatsHtml}
                </select>
              </div>
            </div>
            
            <div class="format-section">
              <h4><i class="fas fa-music"></i> 音频格式</h4>
              <div class="format-selector">
                <select id="audioFormatSelect">
                  ${audioFormatsHtml}
                </select>
              </div>
            </div>
            
            <div class="download-options">
              <div class="option">
                <input type="checkbox" id="mergeAudio" checked>
                <label for="mergeAudio">自动合并音视频（推荐）</label>
              </div>
              <button id="downloadBtn" class="download-btn">
                <i class="fas fa-download"></i> 下载视频
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // 添加下载按钮事件
    document.getElementById('downloadBtn').addEventListener('click', function () {
      const videoFormatId = document.getElementById('videoFormatSelect').value;
      const audioFormatId = document.getElementById('audioFormatSelect').value;
      const mergeAudio = document.getElementById('mergeAudio').checked;

      if (!videoFormatId) {
        showError('请选择视频格式');
        return;
      }

      // 如果选择了合并但未选择音频格式，尝试使用默认音频
      if (mergeAudio && !audioFormatId && videoInfo.audio_formats && videoInfo.audio_formats.length > 0) {
        const audioSelect = document.getElementById('audioFormatSelect');
        audioSelect.value = videoInfo.audio_formats[0].id;
      }

      downloadVideo(
        videoInfo.webpage_url || videoUrlInput.value,
        videoFormatId,
        audioFormatId,
        mergeAudio,
        videoInfo.title
      );
    });
  }

  // 下载视频
  function downloadVideo(url, videoFormatId, audioFormatId, mergeAudio, title) {
    // 显示下载进度界面
    showDownloadProgress();

    // 根据用户选择构建格式参数
    let formatId = videoFormatId;
    if (mergeAudio && audioFormatId) {
      formatId = `${videoFormatId}+${audioFormatId}`;
    }

    fetch('/download_video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        format_id: formatId,
        merge_audio: mergeAudio
      })
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(errData => {
            throw new Error(errData.error || '下载请求失败');
          });
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          // 创建下载链接
          const downloadLink = document.createElement('a');
          downloadLink.href = data.download_url;
          downloadLink.download = data.filename;
          downloadLink.style.display = 'none';
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);

          // 显示成功消息
          showDownloadSuccess(data.download_url, data.filename);
        } else {
          showError(data.error || '下载失败，请稍后重试');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        showError(error.message || '下载请求失败，请检查网络连接');
      });
  }

  // 显示下载进度界面
  function showDownloadProgress() {
    parseResult.innerHTML = `
      <div class="download-progress-container">
        <div class="progress-card">
          <div class="progress-header">
            <i class="fas fa-cloud-download-alt"></i>
            <h3>视频下载中</h3>
          </div>
          
          <div class="progress-body">
            <div class="progress-info">
              <div class="progress-bar-container">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: 0%"></div>
                </div>
                <div class="progress-percent">0%</div>
              </div>
              
              <div class="progress-details">
                <div class="detail-item">
                  <i class="fas fa-tachometer-alt"></i>
                  <span id="speed">速度: 0 KB/s</span>
                </div>
                <div class="detail-item">
                  <i class="fas fa-clock"></i>
                  <span id="eta">剩余时间: --:--</span>
                </div>
              </div>
            </div>
            
            <div class="video-preview">
              <div class="preview-thumbnail">
                <i class="fas fa-play-circle"></i>
              </div>
              <div class="preview-title">${document.querySelector('.video-title')?.textContent || '正在下载视频'}</div>
            </div>
          </div>
          
          <div class="progress-footer">
            <button id="cancelBtn" class="cancel-btn">
              <i class="fas fa-times"></i> 取消下载
            </button>
          </div>
        </div>
      </div>
    `;

    // 添加取消按钮事件
    document.getElementById('cancelBtn').addEventListener('click', function () {
      // 发送取消下载请求
      fetch('/cancel_download', { method: 'POST' });
      showError('下载已取消');
    });
  }

  // 添加进度条样式到页面
  function addProgressBarStyles() {
    // 检查是否已经添加过样式
    if (document.getElementById('progress-bar-styles')) return;

    const style = document.createElement('style');
    style.id = 'progress-bar-styles';
    style.textContent = `
      .download-progress-container {
        max-width: 600px;
        margin: 20px auto;
        font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif; /* 添加中文字体支持 */
      }
      
      .progress-card {
        background: white;
        border-radius: 16px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        overflow: hidden;
        animation: fadeIn 0.5s ease-out;
      }
      
      .progress-header {
        background: linear-gradient(135deg, #4a6fa5, #6b8cbc);
        color: white;
        padding: 20px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      
      .progress-header i {
        font-size: 36px;
        margin-bottom: 10px;
      }
      
      .progress-header h3 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
      }
      
      .progress-body {
        padding: 25px;
        display: flex;
        gap: 20px;
      }
      
      .progress-info {
        flex: 1;
      }
      
      .progress-bar-container {
        margin-bottom: 20px;
      }
      
      .progress-bar {
        height: 12px;
        background: #edf2f7;
        border-radius: 10px;
        overflow: hidden;
        margin-bottom: 8px;
      }
      
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #4a6fa5, #6b8cbc);
        border-radius: 10px;
        width: 0%;
        transition: width 0.3s ease-out;
      }
      
      .progress-percent {
        text-align: right;
        font-size: 18px;
        font-weight: bold;
        color: #4a5568;
      }
      
      .progress-details {
        background: #f8fafc;
        border-radius: 12px;
        padding: 15px;
        font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif; /* 确保中文字体 */
      }
      
      .detail-item {
        display: flex;
        align-items: center;
        margin-bottom: 10px;
        font-size: 14px;
      }
      
      .detail-item i {
        width: 24px;
        color: #4a6fa5;
        text-align: center;
        margin-right: 10px;
      }
      
      .detail-item:last-child {
        margin-bottom: 0;
      }
      
      .video-preview {
        width: 120px;
        text-align: center;
      }
      
      .preview-thumbnail {
        width: 100px;
        height: 70px;
        background: #edf2f7;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 10px;
        color: #4a6fa5;
        font-size: 24px;
      }
      
      .preview-title {
        font-size: 12px;
        color: #718096;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        line-height: 1.4;
        font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif; /* 确保中文字体 */
      }
      
      .progress-footer {
        padding: 15px 25px;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
        text-align: right;
      }
      
      .cancel-btn {
        background: #fff5f5;
        color: #e53e3e;
        border: 1px solid #fed7d7;
        padding: 8px 16px;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif; /* 确保中文字体 */
      }
      
      .cancel-btn:hover {
        background: #fee2e2;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @media (max-width: 768px) {
        .progress-body {
          flex-direction: column;
        }
        
        .video-preview {
          width: 100%;
          margin-top: 20px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  // 更新进度条
  function updateProgressBar(data) {
    // 确保进度条存在
    let progressBar = document.querySelector('.progress-fill');
    if (!progressBar) return;

    // 更新进度百分比
    const percent = parseFloat(data.percent) || 0;
    progressBar.style.width = `${percent}%`;

    // 更新百分比文本
    const percentText = document.querySelector('.progress-percent');
    if (percentText) {
      percentText.textContent = `${percent}%`;
    }

    // 更新速度
    const speedElement = document.getElementById('speed');
    if (speedElement) {
      speedElement.textContent = `速度: ${data.speed}`;
    }

    // 更新剩余时间
    const etaElement = document.getElementById('eta');
    if (etaElement) {
      etaElement.textContent = `剩余时间: ${data.eta}`;
    }
  }

  // 显示下载成功消息
  function showDownloadSuccess(downloadUrl, filename) {
    // 解码文件名以正确显示
    const decodedFilename = decodeURIComponent(filename);

    parseResult.innerHTML = `
      <div class="download-success-container">
        <div class="success-card">
          <div class="success-icon">
            <i class="fas fa-check-circle"></i>
          </div>
          <h3>视频下载完成!</h3>
          <p>视频已成功下载，可以保存到您的设备</p>
          
          <div class="success-actions">
            <a href="${downloadUrl}" class="download-link" download="${filename}">
              <i class="fas fa-download"></i> 保存视频
            </a>
            <button id="backBtn" class="btn-parse">
              <i class="fas fa-redo"></i> 解析新视频
            </button>
          </div>
          
          <div class="file-info">
            <div class="info-item">
              <i class="fas fa-file"></i>
              <span>${decodedFilename}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // 添加返回按钮事件
    document.getElementById('backBtn').addEventListener('click', function () {
      parseResult.innerHTML = '';
      videoUrlInput.value = '';
      videoUrlInput.focus();
    });
  }

  // 格式化文件大小
  function formatSize(bytes) {
    if (!bytes) return '未知大小';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 格式化时长（秒转换为 HH:MM:SS）
  function formatDuration(seconds) {
    if (!seconds) return '未知';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 3600 % 60);

    return [h, m > 9 ? m : (h ? '0' + m : m || '0'), s > 9 ? s : '0' + s]
      .filter(Boolean)
      .join(':');
  }

  // 格式化日期 (YYYYMMDD -> YYYY-MM-DD)
  function formatDate(dateStr) {
    if (!dateStr || dateStr.length !== 8) return '未知';
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }

  // 格式化数字（添加逗号）
  function formatNumber(num) {
    if (!num) return '未知';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  // 支持链接粘贴自动解析
  videoUrlInput.addEventListener('paste', function (e) {
    setTimeout(() => {
      const pastedText = e.clipboardData.getData('text');
      if (pastedText.match(/http(s)?:\/\/[^\s]+/)) {
        parseVideo();
      }
    }, 100);
  });

  // 支持按Enter键解析
  videoUrlInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      parseVideo();
    }
  });
});

// 添加项目logo点击事件
document.getElementById('projectLogo').addEventListener('click', function () {
  window.location.href = '/dashboard';
});

// 用户菜单交互
const userDropdown = document.getElementById('userDropdown');
const dropdownMenu = document.getElementById('dropdownMenu');

userDropdown.addEventListener('click', function (e) {
  e.stopPropagation();
  dropdownMenu.classList.toggle('show');
});

// 点击其他地方关闭下拉菜单
document.addEventListener('click', function (e) {
  if (!userDropdown.contains(e.target)) {
    dropdownMenu.classList.remove('show');
  }
});

// 防止点击下拉菜单内部时关闭菜单
dropdownMenu.addEventListener('click', function (e) {
  e.stopPropagation();
});