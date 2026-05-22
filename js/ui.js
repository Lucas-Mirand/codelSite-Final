/* ============================================================
   ECOBIN — UI Controller
   ============================================================ */

let currentTheme = 'dark';

function showView(viewId) {
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('nav-item--active'));
    const activeBtn = document.getElementById(`nav-btn-${viewId}`);
    if (activeBtn) activeBtn.classList.add('nav-item--active');

    document.querySelectorAll('#view-container > .view').forEach(v => v.classList.remove('view--active'));
    const target = document.getElementById(`view-${viewId}`);
    if (target) target.classList.add('view--active');

    const titles = { dashboard: 'Dashboard', rota: 'Mapa de Rotas', usuarios: 'Usuários', dados: 'Histórico de Coletas', suporte: 'Central de Suporte', ajustes: 'Configurações' };
    document.getElementById('page-title').textContent = titles[viewId] || viewId;

    if (viewId === 'dashboard' || viewId === 'rota') renderMapIfActive();
    if (viewId === 'usuarios') renderDriverCards();
    if (viewId === 'dados') renderCollectionHistoryTable();
    if (viewId === 'suporte') renderDriverChatList();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('is-collapsed');
}

function toggleNotificationPanel() {
    document.getElementById('notification-panel').classList.toggle('is-open');
}

function clearAllNotifications() {
    alertNotifications = [];
    renderNotificationList();
    toggleNotificationPanel();
}

function renderNotificationList() {
    const list = document.getElementById('notification-list');
    const badge = document.getElementById('notification-badge');
    if (!list) return;

    badge.classList.toggle('notification-badge--hidden', alertNotifications.length === 0);

    if (alertNotifications.length === 0) {
        list.innerHTML = '<p class="empty-state">Nenhum alerta</p>';
        return;
    }

    list.innerHTML = alertNotifications.map(a => `
        <div class="notification-card">
            <p class="notification-card__time">${a.timestamp}</p>
            <h4 class="notification-card__title">${a.pointName}</h4>
            <p class="notification-card__desc">Nível crítico: ${a.fillLevel}%</p>
        </div>
    `).join('');
}

/* ── Fleet Panel ── */
function renderFleetPanel() {
    const panel = document.getElementById('fleet-panel');
    if (!panel) return;

    if (!driversData || driversData.length === 0) {
        panel.innerHTML = '<p class="empty-state">Nenhum motorista ativo</p>';
        return;
    }

    const statusConfig = {
        on_route: { label: 'Em Rota', color: '#8CE78D', icon: '🚛' },
        collecting: { label: 'Coletando', color: '#6BC5F7', icon: '📦' },
        returning: { label: 'Retornando', color: '#FFD93D', icon: '🔄' },
        online: { label: 'Disponível', color: '#94A3B8', icon: '⏸️' },
        offline: { label: 'Offline', color: '#475569', icon: '⭘' }
    };

    panel.innerHTML = driversData.map(d => {
        const cfg = statusConfig[d.status] || statusConfig.offline;
        const routeInfo = d.activeRoute ? `${d.activeRoute.length} pontos` : '';
        return `
            <div class="fleet-item">
                <div class="fleet-item__avatar">${d.avatar || '👤'}</div>
                <div class="fleet-item__info">
                    <p class="fleet-item__name">${d.displayName || 'Motorista'}</p>
                    <div class="fleet-item__meta">
                        <span class="fleet-item__status" style="color:${cfg.color}">
                            <span class="fleet-item__dot" style="background:${cfg.color}"></span>
                            ${cfg.label}
                        </span>
                        ${routeInfo ? `<span class="fleet-item__route">${routeInfo}</span>` : ''}
                    </div>
                </div>
                <span class="fleet-item__icon">${cfg.icon}</span>
            </div>
        `;
    }).join('');
}

/* ── Driver Cards ── */
function renderDriverCards() {
    const container = document.getElementById('view-usuarios');
    if (!container) return;

    if (driversData.length === 0) {
        container.innerHTML = '<p class="empty-state">Nenhum motorista cadastrado</p>';
        return;
    }

    container.innerHTML = driversData.map(d => `
        <div onclick="openDriverDetailModal('${d.id}')" class="driver-card">
            <div class="driver-card__avatar">${d.avatar || '👤'}</div>
            <h4 class="driver-card__name">${d.displayName}</h4>
            <p class="driver-card__id">${d.employeeId || 'N/A'}</p>
            <span class="driver-card__status driver-card__status--${d.status}">${d.status === 'online' ? 'Online' : d.status === 'on_route' ? 'Em Rota' : 'Offline'}</span>
        </div>
    `).join('');
}

function openDriverDetailModal(driverId) {
    const driver = driversData.find(d => d.id === driverId);
    if (!driver) return;

    const modal = document.getElementById('user-detail-modal');
    const content = document.getElementById('user-detail-modal-content');

    content.innerHTML = `
        <button onclick="closeDriverDetailModal()" class="modal__close-btn" aria-label="Fechar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
        <div class="modal__body">
            <div class="modal__avatar">${driver.avatar || '👤'}</div>
            <h2 class="modal__name">${driver.displayName}</h2>
            <p class="modal__id">${driver.employeeId || ''}</p>
            <div class="modal__info-grid">
                <div class="modal__info-cell">
                    <p class="modal__info-label">Idade</p>
                    <p class="modal__info-value">${driver.age || 'N/A'} anos</p>
                </div>
                <div class="modal__info-cell">
                    <p class="modal__info-label">Status</p>
                    <p class="modal__info-value">${driver.status}</p>
                </div>
                <div class="modal__info-cell modal__info-cell--full">
                    <p class="modal__info-label">E-mail</p>
                    <p class="modal__info-value">${driver.email || 'N/A'}</p>
                </div>
                <div class="modal__info-cell modal__info-cell--full">
                    <p class="modal__info-label">Telefone</p>
                    <p class="modal__info-value">${driver.phone || 'N/A'}</p>
                </div>
            </div>
        </div>
    `;

    modal.classList.remove('modal--hidden');
}

function closeDriverDetailModal() {
    document.getElementById('user-detail-modal').classList.add('modal--hidden');
}

/* ── Collection History Table ── */
function renderCollectionHistoryTable() {
    const tbody = document.getElementById('collection-history-table');
    if (!tbody) return;

    if (collectionsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="data-table__td" style="text-align:center;opacity:.4">Nenhuma coleta registrada hoje</td></tr>';
        return;
    }

    tbody.innerHTML = collectionsData.map(c => {
        const date = c.collectedAt?.toDate ? c.collectedAt.toDate() : new Date();
        return `
            <tr>
                <td class="data-table__td td--accent">${c.driverName || 'N/A'}</td>
                <td class="data-table__td">${c.binName || 'N/A'}</td>
                <td class="data-table__td td--muted">${date.toLocaleDateString('pt-BR')}</td>
                <td class="data-table__td">${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                <td class="data-table__td">${c.fillLevelBefore || 0}%</td>
            </tr>
        `;
    }).join('');
}

/* ── Theme Toggle ── */
function toggleTheme() {
    document.body.classList.toggle('light-theme');
    currentTheme = document.body.classList.contains('light-theme') ? 'light' : 'dark';

    const icon = document.getElementById('theme-toggle-icon');
    if (currentTheme === 'light') {
        icon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
    } else {
        icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    }
    renderMapIfActive();
}