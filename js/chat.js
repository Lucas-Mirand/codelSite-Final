/* ============================================================
   ECOBIN — Chat (WhatsApp-Style) + Gemini AI
   ============================================================ */

let activeChatRoomId = null;
let chatUnsubscribe = null;
let isGeminiChat = false;

function renderDriverChatList() {
    const list = document.getElementById('driver-chat-list');
    if (!list) return;

    let html = `
        <div onclick="openGeminiChat()" class="chat-driver-item ${isGeminiChat ? 'chat-driver-item--active' : ''}">
            <div class="chat-driver-item__avatar">🤖</div>
            <div style="flex:1;min-width:0">
                <div class="chat-driver-item__name">Assistente IA</div>
                <div class="chat-driver-item__preview">Gemini EcoBin</div>
            </div>
        </div>
    `;

    driversData.forEach(d => {
        const isOnline = d.status === 'online' || d.status === 'on_route';
        html += `
            <div onclick="openChatWithDriver('${d.id}', '${d.displayName}')" class="chat-driver-item">
                <div class="chat-driver-item__avatar">${d.avatar || '👤'}</div>
                <div style="flex:1;min-width:0">
                    <div class="chat-driver-item__name">${d.displayName}</div>
                    <div class="chat-driver-item__preview">
                        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${isOnline ? '#8CE78D' : '#475569'};margin-right:4px"></span>
                        ${isOnline ? 'Online' : 'Offline'}
                    </div>
                </div>
            </div>
        `;
    });

    list.innerHTML = html;
}

function openChatWithDriver(driverId, driverName) {
    isGeminiChat = false;
    const roomQuery = db.collection('chat').where('participants', 'array-contains', currentUser.uid);

    roomQuery.get().then(snapshot => {
        let roomId = null;
        snapshot.forEach(doc => {
            if (doc.data().participants.includes(driverId)) roomId = doc.id;
        });

        if (!roomId) {
            roomId = `chat-${currentUser.uid}-${driverId}`;
            db.collection('chat').doc(roomId).set({
                participants: [currentUser.uid, driverId],
                participantNames: [currentUserData.displayName, driverName],
                lastMessage: '',
                lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        activeChatRoomId = roomId;
        renderChatPanel(driverName, roomId);
    });
}

function renderChatPanel(name, roomId) {
    const panel = document.getElementById('active-chat-panel');
    const isOnline = driversData.some(d => d.displayName === name && (d.status === 'online' || d.status === 'on_route'));

    panel.innerHTML = `
        <div class="chat-active-header">
            <div class="chat-active-header__avatar">${isGeminiChat ? '🤖' : '👤'}</div>
            <div>
                <h4 class="chat-active-header__name">${name}</h4>
                <p class="chat-active-header__status">${isGeminiChat ? '🟢 Assistente Inteligente' : isOnline ? '🟢 Online agora' : '⚪ Offline'}</p>
            </div>
        </div>
        <div id="chat-messages" class="chat-messages"></div>
        <div id="chat-typing-area" class="chat-typing" style="display:none">
            <span class="chat-typing__dots"><span></span><span></span><span></span></span> digitando...
        </div>
        <div class="chat-input-area">
            <input type="text" id="chat-input" class="chat-input" placeholder="Digite sua mensagem..." onkeydown="if(event.key==='Enter')sendChatMessage()">
            <button onclick="sendChatMessage()" class="chat-send-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
        </div>
    `;

    if (!isGeminiChat) listenToChatMessages(roomId);
}

function formatMsgTime(timestamp) {
    if (!timestamp) return '';
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function listenToChatMessages(roomId) {
    if (chatUnsubscribe) chatUnsubscribe();
    const messagesDiv = document.getElementById('chat-messages');

    chatUnsubscribe = db.collection('chat').doc(roomId).collection('messages')
        .orderBy('createdAt', 'asc')
        .onSnapshot(snapshot => {
            messagesDiv.innerHTML = '';
            snapshot.forEach(doc => {
                const msg = doc.data();
                const isMine = msg.senderId === currentUser.uid;
                let cssClass = isMine ? 'chat-bubble--sent' : 'chat-bubble--received';
                if (msg.type === 'system') cssClass = 'chat-bubble--system';
                if (msg.type === 'ai_response') cssClass = 'chat-bubble--ai';

                const time = formatMsgTime(msg.createdAt);
                const checks = isMine ? '<span class="chat-bubble__status">✓✓</span>' : '';

                messagesDiv.innerHTML += `<div class="${cssClass}">${msg.text}<span class="chat-bubble__time">${time}${checks}</span></div>`;
            });
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        });
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    if (isGeminiChat) {
        await sendGeminiMessage(text);
    } else if (activeChatRoomId) {
        await db.collection('chat').doc(activeChatRoomId).collection('messages').add({
            senderId: currentUser.uid,
            senderName: currentUserData.displayName,
            text, type: 'text',
            readBy: [currentUser.uid],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await db.collection('chat').doc(activeChatRoomId).update({
            lastMessage: text,
            lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
}

function openGeminiChat() {
    isGeminiChat = true;
    activeChatRoomId = null;
    if (chatUnsubscribe) chatUnsubscribe();

    renderChatPanel('Assistente IA EcoBin', null);
    const messagesDiv = document.getElementById('chat-messages');
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    messagesDiv.innerHTML = `
        <div class="chat-bubble--ai">
            Olá! Sou o assistente inteligente do EcoBin 🌿<br><br>
            • Análise das lixeiras e níveis<br>
            • Otimização de rotas<br>
            • Informações da frota<br>
            • Relatórios e previsões<br><br>
            Como posso ajudar?
            <span class="chat-bubble__time">${now}</span>
        </div>
    `;
    renderDriverChatList();
}

async function sendGeminiMessage(text) {
    const messagesDiv = document.getElementById('chat-messages');
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    messagesDiv.innerHTML += `<div class="chat-bubble--sent">${text}<span class="chat-bubble__time">${now} <span class="chat-bubble__status">✓✓</span></span></div>`;

    const typing = document.getElementById('chat-typing-area');
    if (typing) typing.style.display = 'block';
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    const context = buildSystemContext();

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Você é o assistente IA do EcoBin. Responda em PT-BR, conciso.\n\nDADOS:\n${context}\n\nPERGUNTA: ${text}` }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
            })
        });

        const data = await response.json();
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Não consegui processar.';
        if (typing) typing.style.display = 'none';

        const aiTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        messagesDiv.innerHTML += `<div class="chat-bubble--ai">${aiText.replace(/\n/g, '<br>')}<span class="chat-bubble__time">${aiTime}</span></div>`;
    } catch (error) {
        if (typing) typing.style.display = 'none';
        messagesDiv.innerHTML += `<div class="chat-bubble--ai">❌ Erro ao conectar com a IA.<span class="chat-bubble__time">${now}</span></div>`;
    }
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function buildSystemContext() {
    const criticalBins = binsData.filter(b => b.fillLevel >= 70);
    return `
- Lixeiras: ${binsData.length} total, ${criticalBins.length} críticas
- Críticas: ${criticalBins.map(b => `${b.name}(${Math.round(b.fillLevel)}%)`).join(', ') || 'Nenhuma'}
- Caminhões: ${trucksData.filter(t => t.status !== 'maintenance').length} ativos
- Motoristas online: ${driversData.filter(d => d.status !== 'offline').length}
- Coletas hoje: ${collectionsData.length}
    `.trim();
}
