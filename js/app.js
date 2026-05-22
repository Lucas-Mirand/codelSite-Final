/* ============================================================
   ECOBIN — App Initialization
   ============================================================ */

function startRealtimeClock() {
    const el = document.getElementById('realtime-clock');
    const update = () => { el.textContent = new Date().toLocaleTimeString('pt-BR'); };
    update();
    setInterval(update, 1000);
}

window.addEventListener('DOMContentLoaded', () => {
    // Setup auth listener (handles login state)
    setupAuthListener();

    // Login form handler
    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        handleLogin(email, password);
    });

    // Close modal on backdrop click
    document.getElementById('user-detail-modal').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) closeDriverDetailModal();
    });
});
