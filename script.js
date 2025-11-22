document.addEventListener('DOMContentLoaded', () => {
    // 状態管理
    let state = {
        currentNumber: 0,
        tickets: [] // { id: number, number: number, status: 'preparing' | 'ready', url: string, notificationType: 'none' | 'email' | 'line', name: string }
    };

    // DOM要素
    const issueBtn = document.getElementById('issue-btn');
    const latestNumberDisplay = document.getElementById('latest-number');
    const preparingList = document.getElementById('preparing-list');
    const readyList = document.getElementById('ready-list');
    const preparingCount = document.getElementById('preparing-count');
    const readyCount = document.getElementById('ready-count');
    const datetimeDisplay = document.getElementById('current-datetime');

    // モーダル要素
    const urlModal = document.getElementById('url-modal');
    const confirmModal = document.getElementById('confirm-modal');
    const modalTicketId = document.getElementById('modal-ticket-id');
    const ticketNameInput = document.getElementById('ticket-name');
    const notificationType = document.getElementById('notification-type');
    const notificationUrl = document.getElementById('notification-url');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const modalSaveBtn = document.getElementById('modal-save-btn');
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
    const confirmOkBtn = document.getElementById('confirm-ok-btn');
    const resetBtn = document.getElementById('reset-btn');

    // 変数
    let editingTicketId = null;
    let pendingSaveData = null;

    // イベントリスナー設定
    issueBtn.addEventListener('click', issueTicket);
    resetBtn.addEventListener('click', handleReset);
    modalCancelBtn.addEventListener('click', closeUrlModal);
    modalSaveBtn.addEventListener('click', handleSaveClick);
    confirmCancelBtn.addEventListener('click', () => {
        confirmModal.classList.add('hidden');
    });
    confirmOkBtn.addEventListener('click', executeSave);
    notificationType.addEventListener('change', updateModalUi);

    // 関数定義

    function startClock() {
        updateDateTime();
        setInterval(updateDateTime, 1000);
    }

    function updateDateTime() {
        const now = new Date();
        const month = now.getMonth() + 1;
        const date = now.getDate();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');

        // 〇月〇日 ○○：○○
        datetimeDisplay.textContent = `${month}月${date}日 ${hours}：${minutes}`;
    }

    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    function issueTicket() {
        state.currentNumber++;
        const now = Date.now();
        const newTicket = {
            id: now,
            number: state.currentNumber,
            status: 'preparing',
            url: '',
            notificationType: 'none',
            name: '',
            createdAt: now,
            completedAt: null
        };
        state.tickets.push(newTicket);
        saveState();
        render();
    }

    function moveTicket(id) {
        const ticket = state.tickets.find(t => t.id === id);
        if (ticket && ticket.status === 'preparing') {
            ticket.status = 'ready';
            ticket.completedAt = Date.now();
            saveState();
            render();
        }
    }

    function openUrlModal(id) {
        const ticket = state.tickets.find(t => t.id === id);
        if (!ticket) return;

        editingTicketId = id;
        modalTicketId.textContent = ticket.number;
        ticketNameInput.value = ticket.name || '';
        notificationType.value = ticket.notificationType;
        notificationUrl.value = ticket.url;

        updateModalUi(); // UIを初期状態に合わせる
        urlModal.classList.remove('hidden');
    }

    function updateModalUi() {
        const type = notificationType.value;
        const urlLabel = document.querySelector('label[for="notification-url"]');

        if (type === 'email') {
            urlLabel.textContent = 'メールアドレス';
            notificationUrl.placeholder = 'example@gmail.com';
            notificationUrl.type = 'email';
        } else if (type === 'line') {
            urlLabel.textContent = 'LINE URL';
            notificationUrl.placeholder = 'https://line.me/...';
            notificationUrl.type = 'url';
        } else {
            urlLabel.textContent = 'URL / アドレス';
            notificationUrl.placeholder = '';
            notificationUrl.type = 'text';
        }
    }

    function closeUrlModal() {
        urlModal.classList.add('hidden');
        editingTicketId = null;
        pendingSaveData = null;
    }

    function handleSaveClick() {
        // 確認ポップアップを表示
        pendingSaveData = {
            name: ticketNameInput.value,
            type: notificationType.value,
            url: notificationUrl.value
        };
        confirmModal.classList.remove('hidden');
    }

    function handleReset() {
        if (confirm('本当に全てのデータをリセットしますか？\nこの操作は取り消せません。')) {
            localStorage.removeItem('receptionSystemState');
            location.reload();
        }
    }

    function executeSave() {
        if (editingTicketId && pendingSaveData) {
            const ticket = state.tickets.find(t => t.id === editingTicketId);
            if (ticket) {
                ticket.name = pendingSaveData.name;
                ticket.notificationType = pendingSaveData.type;
                ticket.url = pendingSaveData.url;
                saveState();
                render();
            }
        }
        confirmModal.classList.add('hidden');
        closeUrlModal();
    }

    function render() {
        // 最新番号表示
        latestNumberDisplay.textContent = state.currentNumber > 0 ? state.currentNumber : '--';

        // リストクリア
        preparingList.innerHTML = '';
        readyList.innerHTML = '';

        // カウント用
        let pCount = 0;
        let rCount = 0;

        // チケット描画
        // 新しいものが上に来るように逆順で処理
        state.tickets.slice().reverse().forEach(ticket => {
            const card = createTicketCard(ticket);
            if (ticket.status === 'preparing') {
                preparingList.appendChild(card);
                pCount++;
            } else {
                readyList.appendChild(card);
                rCount++;
            }
        });

        // カウント更新
        preparingCount.textContent = pCount;
        readyCount.textContent = rCount;
    }

    function createTicketCard(ticket) {
        const div = document.createElement('div');
        div.className = 'ticket-card';

        // 時間表示
        const receptionTime = ticket.createdAt ? formatTime(ticket.createdAt) : '';
        const completedTime = ticket.completedAt ? formatTime(ticket.completedAt) : '';

        let timeHtml = '';
        if (ticket.status === 'preparing') {
            // 準備中：No.〇　受付時間
            timeHtml = `<div class="ticket-time">受付時間 ${receptionTime}</div>`;
        } else {
            // 準備完了：No.〇　受付時間　準備完了時間
            timeHtml = `<div class="ticket-time">受付時間 ${receptionTime}　準備完了時間 ${completedTime}</div>`;
        }

        // 通知アイコンの表示
        let metaHtml = '';
        if (ticket.notificationType === 'email' && ticket.url) {
            // Gmail作成画面へのリンク
            const subject = '【調剤完了のお知らせ】お薬の準備ができました';
            const body = `${ticket.name ? ticket.name + ' 様' : 'お客様'}\n\n` +
                `いつもご利用ありがとうございます。\n` +
                `処方箋のお薬の準備が整いました。\n\n` +
                `受付番号: No. ${ticket.number}\n` +
                `受付時間: ${receptionTime}\n\n` +
                `ご都合のよろしい時にお受け取りにお越しください。\n` +
                `お待ちしております。`;

            const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(ticket.url)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            metaHtml += `<a href="${gmailLink}" target="_blank" class="icon-link icon-mail" title="メールを作成">Mail</a>`;
        } else if (ticket.notificationType === 'line' && ticket.url) {
            // LINE URLへのリンク
            metaHtml += `<a href="${ticket.url}" target="_blank" class="icon-link icon-line" title="LINEを開く">LINE</a>`;
        } else if (ticket.notificationType === 'email') {
            metaHtml += `<span class="icon-mail">Mail</span>`;
        } else if (ticket.notificationType === 'line') {
            metaHtml += `<span class="icon-line">LINE</span>`;
        }

        // 名前表示
        let nameHtml = '';
        if (ticket.name) {
            nameHtml = `<div class="ticket-name">${ticket.name} 様</div>`;
        }

        // アクションボタン
        // 準備中なら「完了へ」ボタン、どちらでも「設定」ボタン
        let moveBtnHtml = '';
        if (ticket.status === 'preparing') {
            moveBtnHtml = `<button class="btn-icon btn-move" title="準備完了へ" onclick="window.triggerMove(${ticket.id})">✓</button>`;
        }

        div.innerHTML = `
            <div class="ticket-info">
                <span class="ticket-number">No. ${ticket.number}</span>
                ${timeHtml}
                ${nameHtml}
                <div class="ticket-meta">${metaHtml}</div>
            </div>
            <div class="ticket-actions">
                <button class="btn-icon btn-config" title="通知設定" onclick="window.triggerConfig(${ticket.id})">⚙️</button>
                ${moveBtnHtml}
            </div>
        `;
        return div;
    }

    // グローバルスコープに関数を公開（HTMLのonclickから呼ぶため）
    window.triggerMove = (id) => moveTicket(id);
    window.triggerConfig = (id) => openUrlModal(id);

    // LocalStorage管理
    function saveState() {
        localStorage.setItem('receptionSystemState', JSON.stringify(state));
    }

    function loadState() {
        const saved = localStorage.getItem('receptionSystemState');
        if (saved) {
            try {
                state = JSON.parse(saved);
                // 既存のチケットデータにcreatedAtがない場合の後方互換性対応
                if (state.tickets) {
                    state.tickets.forEach(ticket => {
                        if (!ticket.createdAt) {
                            ticket.createdAt = ticket.id; // idはDate.now()で生成されている
                        }
                        if (!ticket.hasOwnProperty('completedAt')) {
                            ticket.completedAt = null;
                        }
                    });
                }
            } catch (e) {
                console.error('Failed to load state', e);
            }
        }
    }

    // 初期化
    loadState();
    startClock();
    render();
});
