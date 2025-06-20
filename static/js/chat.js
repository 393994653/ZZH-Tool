// 当DOM加载完成后执行
document.addEventListener('DOMContentLoaded', function () {
    // 获取DOM元素
    const chatMessages = document.getElementById('chatMessages');
    const messageInput = document.getElementById('messageInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const contactsList = document.getElementById('contactsList');
    const currentContactName = document.getElementById('currentContactName');
    const contactStatus = document.getElementById('contactStatus');
    const attachFileBtn = document.getElementById('attachFileBtn');
    const fileInput = document.getElementById('fileInput');
    const addFriendBtn = document.getElementById('addFriendBtn');
    const closeModalBtn = document.getElementById('closeModal');
    const cancelAddBtn = document.getElementById('cancelAdd');
    const confirmAddBtn = document.getElementById('confirmAdd');
    const friendUsernameInput = document.getElementById('friendUsername');
    const addFriendResult = document.getElementById('addFriendResult');
    const toast = document.getElementById('messageToast');
    const toastMessage = document.getElementById('toastMessage');
    const addFriendModal = document.getElementById('addFriendModal');

    // 用户下拉菜单元素
    const userDropdown = document.getElementById('userDropdown');
    const userInfo = document.getElementById('userInfo');
    const dropdownMenu = document.getElementById('dropdownMenu');

    // 当前选中的联系人
    let currentContactId = CURRENT_CONTACT_ID;

    // 初始化
    initChat();

    // 初始化聊天
    function initChat() {
        // 滚动到底部
        scrollToBottom();

        // 设置当前联系人状态
        updateContactStatus();

        // 连接WebSocket
        connectWebSocket();

        // 设置用户下拉菜单事件
        setupUserDropdown();

        // 从URL获取当前联系人并激活
        activateContactFromURL();
    }

    // 设置用户下拉菜单事件
    function setupUserDropdown() {
        if (userInfo) {
            userInfo.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownMenu.classList.toggle('show');
            });
        }

        document.addEventListener('click', (e) => {
            if (!userDropdown.contains(e.target)) {
                dropdownMenu.classList.remove('show');
            }
        });
    }

    // 从URL获取当前联系人并激活
    function activateContactFromURL() {
        // 从URL获取当前联系人ID
        const urlParams = new URLSearchParams(window.location.search);
        const contactId = urlParams.get('contact_id');

        if (contactId) {
            const contactElement = document.querySelector(`[data-contact-id="${contactId}"]`);
            if (contactElement) {
                // 模拟点击激活联系人
                contactElement.click();
            }
        }
    }

    // 更新联系人状态
    function updateContactStatus() {
        if (currentContactId && CONTACT_STATUS[currentContactId] !== undefined) {
            const isOnline = CONTACT_STATUS[currentContactId];
            contactStatus.textContent = isOnline ? '在线' : '离线';
            contactStatus.style.color = isOnline ? '#10B981' : '#6B7280';
        }
    }

    // 滚动到消息底部
    function scrollToBottom() {
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    // 发送消息功能
    function sendMessage() {
        const message = messageInput.value.trim();

        if (message && currentContactId) {
            // 在本地显示消息
            displayMessage({
                id: 'temp-' + Date.now(),
                sender_id: CURRENT_USER_ID,
                recipient_id: currentContactId,
                content: message,
                timestamp: new Date().toISOString()
            });

            // 创建消息数据
            const now = new Date();
            const formattedTimestamp = now.toISOString()
                .slice(0, 16)
                .replace('T', ' '); // 格式化为 "YYYY-MM-DD HH:MM"

            const messageData = {
                recipient_id: currentContactId,
                content: message,
                timestamp: formattedTimestamp
            };

            // 通过WebSocket发送消息
            if (window.socket && window.socket.connected) {
                window.socket.emit('send_message', messageData);
            } else {
                console.error('WebSocket未连接');
                showToast('消息发送失败，请检查网络连接');
            }

            // 清空输入框
            messageInput.value = '';

            // 滚动到底部
            scrollToBottom();
        }
    }

    // 显示消息
    function displayMessage(message) {
        if (!chatMessages) return;

        // 检查消息是否属于当前聊天
        if (message.sender_id !== currentContactId && message.recipient_id !== currentContactId) {
            return;
        }

        // 创建消息元素
        const messageRow = document.createElement('div');

        // 正确判断消息方向
        const isSent = message.sender_id == CURRENT_USER_ID;
        messageRow.className = `message-row ${isSent ? 'sent' : 'received'}`;
        messageRow.dataset.messageId = message.id;

        // 添加头像（接收的消息）
        if (!isSent) {
            const messageAvatar = document.createElement('div');
            messageAvatar.className = 'message-avatar';
            messageAvatar.textContent = message.sender_username ? message.sender_username.charAt(0) : '?';
            messageRow.appendChild(messageAvatar);
        }

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        messageText.textContent = message.content;

        // 如果有附件
        if (message.attachment) {
            const attachmentDiv = document.createElement('div');
            attachmentDiv.className = 'message-attachment';

            const icon = document.createElement('i');
            icon.className = 'fas fa-paperclip';

            const link = document.createElement('a');
            link.href = `/download_attachment/${message.attachment.id}`;
            link.textContent = message.attachment.filename;
            link.target = '_blank';

            attachmentDiv.appendChild(icon);
            attachmentDiv.appendChild(link);
            messageText.appendChild(attachmentDiv);
        }

        // 添加消息时间
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        // 格式化为 "YYYY-MM-DD HH:mm"
        const date = new Date(message.timestamp);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        messageTime.textContent = `${year}-${month}-${day} ${hours}:${minutes}`;

        messageContent.appendChild(messageTime);
        messageContent.appendChild(messageText);
        messageRow.appendChild(messageContent);

        // 添加到聊天区域
        chatMessages.appendChild(messageRow);

        // 滚动到底部
        scrollToBottom();
    }

    // 格式化时间
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }

    // 加载更多消息
    function loadMoreMessages() {
        if (!chatMessages || !currentContactId) return;

        // 显示加载指示器
        const loader = document.createElement('div');
        loader.className = 'loading-indicator';
        loader.textContent = '加载中...';
        chatMessages.insertBefore(loader, chatMessages.firstChild);

        // 获取最早的消息ID
        const firstMessage = chatMessages.querySelector('.message-row');
        const firstMessageId = firstMessage ? firstMessage.dataset.messageId : null;

        // 发送AJAX请求获取更多消息
        fetch(`/get_messages?contact_id=${currentContactId}&before=${firstMessageId}`)
            .then(response => response.json())
            .then(data => {
                // 移除加载指示器
                loader.remove();

                // 添加新消息
                data.messages.reverse().forEach(message => {
                    const messageRow = createMessageElement(message);
                    chatMessages.insertBefore(messageRow, chatMessages.firstChild);
                });

                // 添加日期分隔符
                addDateDividers();
            });
    }

    // 创建消息元素
    function createMessageElement(message) {
        const messageRow = document.createElement('div');

        // 正确判断消息方向
        const isSent = message.sender_id == CURRENT_USER_ID;
        messageRow.className = `message-row ${isSent ? 'sent' : 'received'}`;
        messageRow.dataset.messageId = message.id;

        if (!isSent) {
            const messageAvatar = document.createElement('div');
            messageAvatar.className = 'message-avatar';
            messageAvatar.textContent = message.sender_username ? message.sender_username.charAt(0) : '?';
            messageRow.appendChild(messageAvatar);
        }

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        messageText.textContent = message.content;

        // 如果有附件
        if (message.attachment) {
            const attachmentDiv = document.createElement('div');
            attachmentDiv.className = 'message-attachment';

            const icon = document.createElement('i');
            icon.className = 'fas fa-paperclip';

            const link = document.createElement('a');
            link.href = `/download_attachment/${message.attachment.id}`;
            link.textContent = message.attachment.filename;
            link.target = '_blank';

            attachmentDiv.appendChild(icon);
            attachmentDiv.appendChild(link);
            messageText.appendChild(attachmentDiv);
        }

        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        // 格式化为 "YYYY-MM-DD HH:mm"
        const date = new Date(message.timestamp);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        messageTime.textContent = `${year}-${month}-${day} ${hours}:${minutes}`;

        messageContent.appendChild(messageTime);
        messageContent.appendChild(messageText);
        messageRow.appendChild(messageContent);

        return messageRow;
    }

    // 添加日期分隔符
    function addDateDividers() {
        // 按日期分组消息
        const messages = Array.from(chatMessages.querySelectorAll('.message-row'));
        let lastDate = null;

        messages.forEach(message => {
            const timestamp = message.dataset.timestamp;
            if (!timestamp) return;

            const date = new Date(timestamp);
            const dateStr = date.toLocaleDateString();

            if (dateStr !== lastDate) {
                const divider = document.createElement('div');
                divider.className = 'message-date-divider';
                divider.innerHTML = `<span>${formatDate(date)}</span>`;

                chatMessages.insertBefore(divider, message);
                lastDate = dateStr;
            }
        });
    }

    // 格式化日期
    function formatDate(date) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return '今天';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return '昨天';
        } else {
            return date.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    }

    // 连接WebSocket
    function connectWebSocket() {
        try {
            // 初始化WebSocket连接
            window.socket = io();

            // 监听连接错误
            socket.on('connect_error', (error) => {
                console.error('WebSocket连接错误:', error);
                showToast('无法连接到实时服务，请刷新页面');
            });

            // 监听连接成功
            socket.on('connect', () => {
                console.log('WebSocket已连接');
                // 加入用户房间
                socket.emit('join_user', { user_id: CURRENT_USER_ID });
            });

            // 监听新消息
            socket.on('new_message', function (message) {
                // 显示接收到的消息
                displayMessage(message);

                // 更新联系人列表
                updateContactLastMessage(message);
            });

            // 监听在线状态更新
            socket.on('status_update', function (data) {
                if (data.user_id === currentContactId) {
                    contactStatus.textContent = data.online ? '在线' : '离线';
                    contactStatus.style.color = data.online ? '#10B981' : '#6B7280';
                    CONTACT_STATUS[currentContactId] = data.online;
                }
            });
        } catch (error) {
            console.error('WebSocket初始化失败:', error);
            showToast('无法初始化实时服务，请刷新页面');
        }
    }

    // 更新联系人最后一条消息
    function updateContactLastMessage(message) {
        const contactElement = document.querySelector(`[data-contact-id="${message.sender_id}"]`);
        if (contactElement) {
            const lastMessage = contactElement.querySelector('.last-message');
            const messageTime = contactElement.querySelector('.message-time');
            const unreadCount = contactElement.querySelector('.unread-count');

            if (lastMessage) lastMessage.textContent = message.content;
            if (messageTime) messageTime.textContent = formatTime(message.timestamp);

            // 更新未读计数
            if (message.sender_id === currentContactId) {
                // 如果是当前聊天，重置未读计数
                if (unreadCount) unreadCount.remove();
            } else {
                // 增加未读计数
                let count = unreadCount ? parseInt(unreadCount.textContent) : 0;
                count++;

                if (unreadCount) {
                    unreadCount.textContent = count;
                } else {
                    const newUnread = document.createElement('span');
                    newUnread.className = 'unread-count';
                    newUnread.textContent = count;
                    contactElement.querySelector('.message-info').appendChild(newUnread);
                }
            }
        }
    }

    // 事件监听
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', sendMessage);
    }

    if (messageInput) {
        messageInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    // 联系人点击事件
    if (contactsList) {
        contactsList.addEventListener('click', function (e) {
            const contactElement = e.target.closest('.contact');
            if (contactElement) {
                const contactId = contactElement.dataset.contactId;

                // 更新当前联系人
                currentContactId = contactId;
                currentContactName.textContent = contactElement.querySelector('.contact-name').textContent;

                // 更新状态
                updateContactStatus();

                // 加载新联系人的聊天记录
                loadChatHistory(contactId);

                // 重置未读计数
                const unreadCount = contactElement.querySelector('.unread-count');
                if (unreadCount) unreadCount.remove();

                // 更新活动状态
                document.querySelectorAll('.contact').forEach(c => c.classList.remove('active'));
                contactElement.classList.add('active');

                // 更新URL参数
                const url = new URL(window.location);
                url.searchParams.set('contact_id', contactId);
                window.history.pushState({}, '', url);
            }
        });
    }

    // 加载聊天记录
    function loadChatHistory(contactId) {
        if (!chatMessages) return;

        // 显示加载指示器
        chatMessages.innerHTML = '<div class="loading-indicator">加载聊天记录中...</div>';

        // 获取聊天记录
        fetch(`/get_messages?contact_id=${contactId}`)
            .then(response => response.json())
            .then(data => {
                // 清空聊天区域
                chatMessages.innerHTML = '';

                // 添加消息
                data.messages.forEach(message => {
                    const messageRow = createMessageElement(message);
                    chatMessages.appendChild(messageRow);
                });

                // 滚动到底部
                scrollToBottom();
            })
            .catch(error => {
                console.error('加载聊天记录失败:', error);
                chatMessages.innerHTML = '<div class="loading-indicator">加载失败，请刷新页面</div>';
            });
    }

    // 文件附件功能
    if (attachFileBtn && fileInput) {
        attachFileBtn.addEventListener('click', function () {
            fileInput.click();
        });

        fileInput.addEventListener('change', function (e) {
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];

                // 创建FormData对象
                const formData = new FormData();
                formData.append('file', file);

                // 发送文件
                fetch('/upload_attachment', {
                    method: 'POST',
                    body: formData
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            // 在本地显示消息
                            displayMessage({
                                id: 'temp-' + Date.now(),
                                sender_id: CURRENT_USER_ID,
                                recipient_id: currentContactId,
                                content: `[文件] ${file.name}`,
                                attachment: data.file,
                                timestamp: new Date().toISOString()
                            });

                            // 发送消息数据
                            const messageData = {
                                recipient_id: currentContactId,
                                content: `[文件] ${file.name}`,
                                attachment: data.file,
                                timestamp: new Date().toISOString()
                            };

                            // 通过WebSocket发送消息
                            if (window.socket && window.socket.connected) {
                                window.socket.emit('send_message', messageData);
                            }

                            // 滚动到底部
                            scrollToBottom();
                        } else {
                            showToast('文件上传失败: ' + (data.error || '未知错误'));
                        }
                    })
                    .catch(error => {
                        showToast('文件上传失败: ' + error.message);
                    });

                // 重置文件输入
                fileInput.value = '';
            }
        });
    }

    // 滚动加载更多消息
    if (chatMessages) {
        chatMessages.addEventListener('scroll', function () {
            if (chatMessages.scrollTop === 0) {
                loadMoreMessages();
            }
        });
    }

    // 添加好友弹窗控制
    if (addFriendBtn) {
        addFriendBtn.addEventListener('click', function () {
            addFriendModal.classList.remove('hidden');
            addFriendResult.classList.add('hidden');
            friendUsernameInput.value = '';
        });
    }

    // 关闭弹窗
    function closeModal() {
        addFriendModal.classList.add('hidden');
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelAddBtn) cancelAddBtn.addEventListener('click', closeModal);

    // 点击弹窗外部关闭
    if (addFriendModal) {
        addFriendModal.addEventListener('click', function (e) {
            if (e.target === addFriendModal) {
                closeModal();
            }
        });
    }

    // 添加好友确认
    if (confirmAddBtn) {
        confirmAddBtn.addEventListener('click', function () {
            const username = friendUsernameInput.value.trim();

            if (!username) {
                addFriendResult.textContent = '请输入用户名';
                addFriendResult.classList.remove('hidden');
                return;
            }

            // 发送添加好友请求
            fetch('/add_friend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username: username })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // 显示成功提示
                        showToast('好友添加成功');
                        closeModal();

                        // 刷新联系人列表
                        setTimeout(() => {
                            window.location.reload();
                        }, 1500);
                    } else {
                        addFriendResult.textContent = data.error || '添加失败';
                        addFriendResult.classList.remove('hidden');
                    }
                })
                .catch(error => {
                    addFriendResult.textContent = '请求失败，请重试';
                    addFriendResult.classList.remove('hidden');
                });
        });
    }

    // 显示提示消息
    function showToast(message) {
        if (!toast || !toastMessage) return;

        toastMessage.textContent = message;
        toast.classList.remove('hidden');

        // 3秒后自动隐藏
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
});