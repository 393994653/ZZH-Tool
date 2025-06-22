// 在文件顶部添加全局变量
let conversionStartTime = null;
let progressInterval = null;

document.addEventListener('DOMContentLoaded', function () {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const convertBtn = document.getElementById('convertBtn');
    const clearBtn = document.getElementById('clearBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const targetFormat = document.getElementById('targetFormat');
    const converterResult = document.getElementById('converterResult');
    const pdfOptions = document.getElementById('pdfOptions');
    const imageOptions = document.getElementById('imageOptions');
    const imageQuality = document.getElementById('imageQuality');
    const qualityValue = document.getElementById('qualityValue');
    const filePreviews = document.getElementById('filePreviews');

    let uploadedFiles = [];
    let socket = io.connect(); // 初始化Socket.IO连接
    let currentConversionId = null; // 当前转换任务的唯一ID

    pdfOptions.style.display = 'block';

    // 监听转换进度
    socket.on('conversion_progress', function (data) {
        const progressBar = document.getElementById('conversionProgressBar');
        const progressStatus = document.getElementById('progressStatus');
        const progressTime = document.getElementById('progressTime');

        if (progressBar) {
            progressBar.style.width = data.percent + '%';
        }

        if (progressStatus) {
            progressStatus.textContent = data.message;
        }

        if (progressTime) {
            progressTime.textContent = '剩余时间: ' + data.eta;
        }
    });

    // 更新图像质量显示
    imageQuality.addEventListener('input', function () {
        qualityValue.textContent = `${this.value}%`;
    });

    // 切换目标格式时更新选项
    targetFormat.addEventListener('change', function () {
        if (this.value === 'pdf') {
            pdfOptions.style.display = 'block';
            imageOptions.style.display = 'none';
        } else {
            pdfOptions.style.display = 'none';
            imageOptions.style.display = 'block';
        }

        // 如果有文件则启用转换按钮
        convertBtn.disabled = uploadedFiles.length === 0;
    });

    // 拖放文件处理
    uploadArea.addEventListener('dragover', function (e) {
        e.preventDefault();
        this.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', function () {
        this.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', function (e) {
        e.preventDefault();
        this.classList.remove('drag-over');

        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    });

    // 点击上传区域触发文件选择
    uploadArea.addEventListener('click', function () {
        // fileInput.click();
    });

    // 文件选择处理
    fileInput.addEventListener('change', function () {
        if (this.files.length > 0) {
            handleFiles(this.files);
        }
    });

    // 清空按钮
    clearBtn.addEventListener('click', function () {
        resetConverter();
    });

    // 转换按钮
    convertBtn.addEventListener('click', function () {
        if (uploadedFiles.length > 0) {
            convertFiles();
        }
    });

    // 监听转换进度
    socket.on('conversion_progress', function (data) {
        if (data.task_id === currentConversionId) {
            updateProgress(data);
        }
    });

    // 处理上传的文件（多文件）
    function handleFiles(files) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // 检查文件大小 (最大100MB)
            if (file.size > 100 * 1024 * 1024) {
                showError(`文件 ${file.name} 大小超过100MB限制`);
                continue;
            }

            // 检查文件类型
            const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/bmp', 'image/gif', 'image/tiff', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                showError(`文件 ${file.name} 是不支持的文件格式`);
                continue;
            }

            // 避免重复添加
            if (uploadedFiles.some(f => f.name === file.name && f.size === file.size)) {
                continue;
            }

            uploadedFiles.push(file);
            createFilePreview(file);
        }

        // 更新上传区域显示
        updateUploadAreaVisibility();

        // 启用转换按钮
        convertBtn.disabled = uploadedFiles.length === 0;
    }

    // 创建文件预览
    function createFilePreview(file) {
        const preview = document.createElement('div');
        preview.className = 'file-preview';
        preview.dataset.fileName = file.name;
        preview.draggable = true; // 启用拖拽

        // 添加拖拽事件
        preview.addEventListener('dragstart', handleDragStart);
        preview.addEventListener('dragover', handleDragOver);
        preview.addEventListener('dragenter', handleDragEnter);
        preview.addEventListener('dragleave', handleDragLeave);
        preview.addEventListener('drop', handleDrop);
        preview.addEventListener('dragend', handleDragEnd);

        // 创建删除按钮
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
        deleteBtn.onclick = function () {
            removeFile(file.name);
            preview.remove();
        };

        // 创建文件名显示
        const fileName = document.createElement('div');
        fileName.className = 'file-name';
        fileName.textContent = file.name;

        // 预览内容
        const previewContent = document.createElement('div');
        previewContent.className = 'preview-content';

        if (file.type === 'application/pdf') {
            // PDF文件 - 显示PDF图标
            previewContent.innerHTML = `
          <div class="pdf-preview">
            <i class="fas fa-file-pdf"></i>
            <span>PDF</span>
          </div>
        `;
            preview.appendChild(previewContent);
        } else {
            // 图片文件 - 显示缩略图
            const reader = new FileReader();
            reader.onload = function (e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                previewContent.appendChild(img);
                preview.appendChild(previewContent);
            };
            reader.readAsDataURL(file);
        }

        preview.appendChild(deleteBtn);
        preview.appendChild(fileName);
        filePreviews.appendChild(preview);
    }

    // 移除单个文件
    function removeFile(fileName) {
        uploadedFiles = uploadedFiles.filter(file => file.name !== fileName);
        updateUploadAreaVisibility();
        convertBtn.disabled = uploadedFiles.length === 0;
    }

    // 更新上传区域显示
    function updateUploadAreaVisibility() {
        const uploadPlaceholder = document.getElementById('uploadPlaceholder');
        if (uploadedFiles.length > 0) {
            uploadPlaceholder.style.display = 'none';
        } else {
            uploadPlaceholder.style.display = 'block';
        }
    }

    // 格式化文件大小
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 转换文件（多文件）
    function convertFiles() {
        // 记录开始时间
        conversionStartTime = Date.now();

        // 清除之前的进度间隔
        if (progressInterval) clearInterval(progressInterval);

        // 初始化进度更新间隔
        progressInterval = setInterval(updateEstimatedProgress, 1000);

        // 生成唯一转换ID
        currentConversionId = 'conversion_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        // 显示加载状态和进度条
        converterResult.innerHTML = `
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <div class="loading-text">正在转换 ${uploadedFiles.length} 个文件，请稍候...</div>
          
          <div class="progress-container">
            <div class="progress-bar" id="conversionProgressBar"></div>
          </div>
          
          <div class="progress-info">
            <span id="progressStatus">准备中...</span>
            <span id="progressTime">剩余时间: --:--</span>
          </div>
        </div>
      `;

        // 禁用转换按钮
        convertBtn.disabled = true;

        // 获取转换选项
        const options = {
            targetFormat: targetFormat.value,
            pdfQuality: document.getElementById('pdfQuality').value,
            imageQuality: imageQuality.value,
            mergePages: document.getElementById('mergePages').checked,
            mergePdf: document.getElementById('mergePdf').checked,
            resizeOption: document.getElementById('resizeOption').value,
            task_id: currentConversionId
        };

        // 创建FormData
        const formData = new FormData();
        uploadedFiles.forEach(file => {
            formData.append('files', file);
        });
        formData.append('options', JSON.stringify(options));

        // 发送转换请求
        fetch('/convert_files', {
            method: 'POST',
            body: formData
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errData => {
                        throw new Error(errData.error || '转换失败');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    showConversionResult(data);
                } else {
                    showError(data.error || '文件转换失败');
                }
            })
            .catch(error => {
                console.error('转换错误:', error);
                showError(error.message || '转换过程中发生错误');
            })
            .finally(() => {
                // 启用转换按钮
                convertBtn.disabled = uploadedFiles.length > 0;
            });
    }

    function updateEstimatedProgress() {
        if (!conversionStartTime) return;

        // 计算已用时间
        const elapsed = (Date.now() - conversionStartTime) / 1000; // 秒
        const remaining = Math.max(0, uploadedFiles.length * 5 - elapsed); // 假设每个文件5秒

        // 计算百分比
        const percent = Math.min(99, Math.floor((elapsed / (uploadedFiles.length * 5)) * 100));

        // 格式化为时间字符串
        const minutes = Math.floor(remaining / 60);
        const seconds = Math.floor(remaining % 60);
        const eta = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        // 更新进度显示
        const progressBar = document.getElementById('conversionProgressBar');
        const progressStatus = document.getElementById('progressStatus');
        const progressTime = document.getElementById('progressTime');

        if (progressBar) {
            progressBar.style.width = percent + '%';
        }

        if (progressStatus) {
            progressStatus.textContent = `正在处理文件 ${percent}%`;
        }

        if (progressTime) {
            progressTime.textContent = `剩余时间: ${eta}`;
        }
    }

    // 更新进度条
    function updateProgress(data) {
        const progressBar = document.getElementById('conversionProgressBar');
        const progressStatus = document.getElementById('progressStatus');
        const progressTime = document.getElementById('progressTime');

        if (progressBar) {
            progressBar.style.width = data.percent + '%';
        }

        if (progressStatus) {
            progressStatus.textContent = data.message;
        }

        if (progressTime) {
            progressTime.textContent = '剩余时间: ' + data.eta;
        }
    }

    // 显示转换结果
    function showConversionResult(data) {
        // 如果有多个文件，提供打包下载
        console.log('转换结果:', data);
        if (data.zip_url) {
            converterResult.innerHTML = `
          <div class="conversion-result">
            <div class="result-icon">
              <i class="fas fa-check-circle"></i>
            </div>
            <h3 class="result-title">文件转换成功!</h3>
            <p>已转换 ${data.file_count} 个文件</p>
            
            <div class="result-actions">
              <button target="_blank" class="btn-download" onclick="downloadZip('${data.zip_url}')">
                <i class="fas fa-file-archive"></i> 下载全部文件
              </button>
              <button class="btn-convert-again" onclick="resetConverter()">
                <i class="fas fa-redo"></i> 继续转换
              </button>
            </div>
          </div>
        `;
        } else if (data.download_url) {
            // 单个文件
            converterResult.innerHTML = `
          <div class="conversion-result">
            <div class="result-icon">
              <i class="fas fa-check-circle"></i>
            </div>
            <h3 class="result-title">文件转换成功!</h3>
            
            <div class="result-file">
              <div class="result-file-icon">
                <i class="fas fa-file"></i>
              </div>
              <div>
                <div class="result-file-name">${data.filename}</div>
                <div class="result-file-size">${formatFileSize(data.file_size)}</div>
              </div>
            </div>
            
            <div class="result-actions">
              <button class="btn-download" onclick="downloadFile('${data.download_url}', '${data.filename}')" target="_blank">
                <i class="fas fa-download"></i> 下载文件
              </button>
              <button class="btn-convert-again" onclick="resetConverter()">
                <i class="fas fa-redo"></i> 继续转换
              </button>
            </div>
          </div>
        `;
        }
        // 确保结果容器可见
        const resultContainer = document.querySelector('.conversion-result');
        if (resultContainer) {
            resultContainer.style.display = 'block';
        }
    }

    // 显示错误信息
    function showError(message) {
        converterResult.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <p>${message}</p>
          <button class="btn-convert-again" onclick="resetConverter()">
            <i class="fas fa-redo"></i> 重新尝试
          </button>
        </div>
      `;
    }

    // 重置转换器
    function resetConverter() {
        clearAllFiles();

        // 重置结果区域
        converterResult.innerHTML = `
        <div class="result-placeholder">
          <div class="placeholder-icon">
            <i class="fas fa-file-download"></i>
          </div>
          <p>上传文件并选择目标格式后开始转换</p>
        </div>
      `;
    }

    // 拖拽排序实现
    let dragSrcElement = null;

    function handleDragStart(e) {
        dragSrcElement = this;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.dataset.fileName);

        this.classList.add('dragging');
    }

    function handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }

        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    function handleDragEnter(e) {
        this.classList.add('over');
    }

    function handleDragLeave(e) {
        this.classList.remove('over');
    }

    function handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }

        if (dragSrcElement !== this) {
            const fileName = e.dataTransfer.getData('text/plain');
            const targetFileName = this.dataset.fileName;

            // 重新排列文件
            reorderFiles(fileName, targetFileName);

            // 重新渲染预览
            renderFilePreviews();
        }

        this.classList.remove('over');
        return false;
    }

    function handleDragEnd(e) {
        document.querySelectorAll('.file-preview').forEach(el => {
            el.classList.remove('over');
            el.classList.remove('dragging');
        });
    }

    // 重新排列文件
    function reorderFiles(draggedFileName, targetFileName) {
        // 找到拖拽文件和目标文件的索引
        const draggedIndex = uploadedFiles.findIndex(f => f.name === draggedFileName);
        const targetIndex = uploadedFiles.findIndex(f => f.name === targetFileName);

        if (draggedIndex !== -1 && targetIndex !== -1) {
            // 从数组中移除拖拽文件
            const [draggedFile] = uploadedFiles.splice(draggedIndex, 1);

            // 插入到目标位置
            uploadedFiles.splice(targetIndex, 0, draggedFile);
        }
    }

    // 重新渲染文件预览
    function renderFilePreviews() {
        filePreviews.innerHTML = '';
        uploadedFiles.forEach(file => {
            createFilePreview(file);
        });
    }

    // 全局下载文件函数
    window.downloadFile = function (url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // 全局下载ZIP函数
    window.downloadZip = function (url) {
        const link = document.createElement('a');
        link.href = url;
        link.download = 'converted_files.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // 全局重置函数
    window.resetConverter = resetConverter;
});

// 添加项目logo点击事件
document.getElementById('projectLogo').addEventListener('click', function () {
    window.location.href = '/dashboard';
});