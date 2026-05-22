/* ============================================================
   ECOBIN — Authentication Module
   ============================================================ */

let currentUser = null;
let currentUserData = null;

function setupAuthListener() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            const doc = await db.collection('users').doc(user.uid).get();
            currentUserData = doc.exists ? doc.data() : { displayName: user.email, role: 'admin' };

            document.getElementById('login-screen').hidden = true;
            document.getElementById('app-shell').hidden = false;

            // Update sidebar user info
            document.getElementById('sidebar-user-name').textContent = currentUserData.displayName || 'Usuário';
            document.getElementById('sidebar-user-role').textContent = currentUserData.role === 'admin' ? 'Administrador' : 'Motorista';
            if (currentUserData.avatar) {
                document.getElementById('sidebar-avatar').textContent = currentUserData.avatar;
            }

            // Start real-time listeners
            startFirestoreListeners();
            startRealtimeClock();
        } else {
            currentUser = null;
            currentUserData = null;
            document.getElementById('login-screen').hidden = false;
            document.getElementById('app-shell').hidden = true;
        }
    });
}

async function handleLogin(email, password) {
    const btn = document.getElementById('login-btn');
    const btnText = document.getElementById('login-btn-text');
    const spinner = document.getElementById('login-spinner');
    const errorEl = document.getElementById('login-error');

    btn.disabled = true;
    btnText.textContent = 'Entrando...';
    spinner.hidden = false;
    errorEl.hidden = true;

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        let msg = 'Erro ao fazer login.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            msg = 'E-mail ou senha incorretos.';
        } else if (error.code === 'auth/too-many-requests') {
            msg = 'Muitas tentativas. Tente novamente em alguns minutos.';
        }
        errorEl.textContent = msg;
        errorEl.hidden = false;
    } finally {
        btn.disabled = false;
        btnText.textContent = 'Entrar';
        spinner.hidden = true;
    }
}

function handleLogout() {
    if (confirm('Deseja realmente sair do sistema?')) {
        auth.signOut();
    }
}
