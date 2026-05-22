/* ============================================================
   ECOBIN — Firestore Data Layer + Simulations
   ============================================================ */

let binsData = [];
let trucksData = [];
let driversData = [];
let collectionsData = [];
let settingsData = { autoDispatchThreshold: 70, routeOptimization: true };
let alertNotifications = [];
let smartAlerts = [];

const BASE_LOCATION = { x: 50, y: 50 };

/* ── Firestore Listeners ── */
function startFirestoreListeners() {
    // Bins
    db.collection('bins').onSnapshot(snapshot => {
        binsData = [];
        snapshot.forEach(doc => binsData.push({ id: doc.id, ...doc.data() }));
        updateDashboardMetrics();
        renderMapIfActive();
        checkCriticalBins();
    });

    // Trucks
    db.collection('trucks').onSnapshot(snapshot => {
        trucksData = [];
        snapshot.forEach(doc => trucksData.push({ id: doc.id, ...doc.data() }));
        updateDashboardMetrics();
    });

    // Drivers
    db.collection('users').where('role', '==', 'driver').onSnapshot(snapshot => {
        driversData = [];
        snapshot.forEach(doc => driversData.push({ id: doc.id, ...doc.data() }));
        updateDashboardMetrics();
        if (document.querySelector('.view--usuarios.view--active')) renderDriverCards();
        renderFleetPanel();
        initTruckSimulation();
    });

    // Today's collections
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    db.collection('collections')
        .where('collectedAt', '>=', today)
        .orderBy('collectedAt', 'desc')
        .limit(50)
        .onSnapshot(snapshot => {
            collectionsData = [];
            snapshot.forEach(doc => collectionsData.push({ id: doc.id, ...doc.data() }));
            updateDashboardMetrics();
            if (document.querySelector('.view--dados.view--active')) renderCollectionHistoryTable();
            renderDashboardActivity();
        });

    // Incidents (SOS alerts)
    db.collection('incidents')
        .orderBy('createdAt', 'desc')
        .limit(20)
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const inc = change.doc.data();
                    addSmartAlert('🚨', `Ocorrência: ${inc.type}`, inc.description || 'Sem descrição', 'danger');
                }
            });
        });

    // Settings
    db.collection('settings').doc('global').onSnapshot(doc => {
        if (doc.exists) {
            settingsData = doc.data();
            updateSettingsUI();
        }
    });

    // Route events (sync from mobile)
    db.collection('route_events')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const evt = change.doc.data();
                    const name = evt.driverName?.split(' ')[0] || 'Motorista';
                    if (evt.type === 'sustainable_accepted') {
                        addSmartAlert('🌱', `${name} aceitou rota sustentável`, `${evt.routeLength} pontos de coleta`, 'success');
                    } else if (evt.type === 'nearby_accepted') {
                        addSmartAlert('📍', `${name} incluiu coleta próxima`, 'Rota recalculada', 'info');
                    } else if (evt.type === 'suggestion_rejected') {
                        addSmartAlert('⏭️', `${name} recusou sugestão`, 'Mantendo rota atual', 'info');
                    }
                }
            });
        });
}

/* ── Dashboard Metrics ── */
function updateDashboardMetrics() {
    const totalBins = binsData.length;
    const criticalBins = binsData.filter(b => b.fillLevel >= 70).length;
    const activeTrucks = trucksData.filter(t => t.status !== 'maintenance').length;
    const todayCollections = collectionsData.length;

    const el = (id) => document.getElementById(id);
    if (el('metric-total-bins')) el('metric-total-bins').textContent = totalBins;
    if (el('metric-critical')) el('metric-critical').textContent = criticalBins;
    if (el('metric-trucks')) el('metric-trucks').textContent = activeTrucks;
    if (el('metric-collections')) el('metric-collections').textContent = todayCollections;
    
    const activeRoutes = driversData.filter(d => d.status === 'on_route').length;
    if (el('active-routes-count')) el('active-routes-count').textContent = `${activeRoutes} Rotas Ativas`;
}

/* ── Critical Bin Alerts ── */
function checkCriticalBins() {
    binsData.forEach(bin => {
        if (bin.fillLevel >= 70) {
            const key = `${bin.id}-${Math.round(bin.fillLevel)}`;
            const exists = alertNotifications.some(a => a.key === key);
            if (!exists) {
                alertNotifications.unshift({
                    key,
                    binId: bin.id,
                    pointName: bin.name,
                    fillLevel: Math.round(bin.fillLevel),
                    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                });
                renderNotificationList();
            }
        }
    });
}

/* ── Smart Alerts System ── */
function addSmartAlert(icon, title, description, type = 'info') {
    smartAlerts.unshift({
        icon, title, description, type,
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    });
    if (smartAlerts.length > 20) smartAlerts.pop();
    renderSmartAlerts();
}

function renderSmartAlerts() {
    const container = document.getElementById('smart-alerts-list');
    if (!container) return;

    if (smartAlerts.length === 0) {
        container.innerHTML = '<p class="empty-state">Nenhum evento recente</p>';
        return;
    }

    container.innerHTML = smartAlerts.slice(0, 8).map(a => {
        const borderClass = a.type === 'danger' ? 'alert-item--danger' : a.type === 'success' ? 'alert-item--success' : 'alert-item--info';
        return `
            <div class="alert-item ${borderClass}">
                <span class="alert-item__icon">${a.icon}</span>
                <div class="alert-item__content">
                    <p class="alert-item__title">${a.title}</p>
                    <p class="alert-item__desc">${a.description}</p>
                </div>
                <span class="alert-item__time">${a.time}</span>
            </div>
        `;
    }).join('');
}

/* ── Dashboard Activity ── */
function renderDashboardActivity() {
    const list = document.getElementById('dashboard-activity-list');
    if (!list) return;

    if (collectionsData.length === 0) {
        list.innerHTML = '<p class="empty-state">Nenhuma atividade registrada</p>';
        return;
    }

    list.innerHTML = collectionsData.slice(0, 6).map(c => {
        const time = c.collectedAt?.toDate ? c.collectedAt.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
        return `
            <div class="activity-item">
                <div class="activity-item__left">
                    <div class="activity-item__dot activity-item__dot--green"></div>
                    <span><strong>${c.driverName || 'Motorista'}</strong> coletou <strong>${c.binName || 'Lixeira'}</strong></span>
                </div>
                <span class="activity-item__time">${time}</span>
            </div>
        `;
    }).join('');
}

/* ── Settings ── */
function updateSettingsUI() {
    updateToggle('autoDispatch', settingsData.autoDispatchThreshold > 0);
    updateToggle('routeOptimization', settingsData.routeOptimization);
}

function updateToggle(key, isOn) {
    const btn = document.getElementById(`toggle-${key}`);
    const dot = document.getElementById(`toggle-dot-${key}`);
    if (!btn || !dot) return;
    btn.classList.toggle('toggle-switch--on', isOn);
    btn.classList.toggle('toggle-switch--off', !isOn);
    dot.classList.toggle('toggle-switch__dot--right', isOn);
    dot.classList.toggle('toggle-switch__dot--left', !isOn);
}

function toggleSetting(key) {
    if (key === 'autoDispatchThreshold') {
        db.collection('settings').doc('global').update({
            autoDispatchThreshold: settingsData.autoDispatchThreshold > 0 ? 0 : 70
        });
    } else if (key === 'routeOptimization') {
        db.collection('settings').doc('global').update({
            routeOptimization: !settingsData.routeOptimization
        });
    }
}

/* ── Accelerated Bin Fill Simulation ── */
function simulateBinFill() {
    binsData.forEach(bin => {
        if (bin.fillLevel < 100 && Math.random() > 0.5) {
            const baseRate = 2 + Math.random() * 6;
            // Commercial areas fill faster
            const areaMultiplier = (bin.type === 'general' || bin.type === 'organic') ? 1.3 : 1;
            const increment = baseRate * areaMultiplier;
            const newLevel = Math.min(100, bin.fillLevel + increment);

            db.collection('bins').doc(bin.id).update({
                fillLevel: Math.round(newLevel * 10) / 10,
                status: newLevel >= 85 ? 'critical' : newLevel >= 70 ? 'warning' : 'normal'
            });
        }
    });
}

// Run fill simulation every 3 seconds (faster than before)
setInterval(simulateBinFill, 3000);

/* ── Truck Movement Simulation ── */
let truckSimActive = false;

function initTruckSimulation() {
    if (truckSimActive) return;
    truckSimActive = true;

    // Assign initial positions to online drivers
    driversData.forEach(driver => {
        if (driver.isSimulated === undefined) {
            db.collection('users').doc(driver.id).update({ isSimulated: true });
        }
        if (!driver.currentPosition && (driver.status === 'online' || driver.status === 'on_route')) {
            const startPos = { x: BASE_LOCATION.x + (Math.random() - 0.5) * 6, y: BASE_LOCATION.y + (Math.random() - 0.5) * 6 };
            db.collection('users').doc(driver.id).update({ currentPosition: startPos });
        }
    });

    // Start movement loop at 1-second intervals for real-time synchronization
    setInterval(simulateTruckMovement, 1000);
}

function simulateTruckMovement() {
    driversData.forEach(async driver => {
        if (driver.status === 'offline') return;
        if (driver.isSimulated === false) return; // Do not simulate real drivers (active on mobile)

        if (!driver.currentPosition) {
            driver.currentPosition = { ...BASE_LOCATION };
        }

        let updateData = {};
        let posChanged = false;

        // Randomly assign routes to idle online simulated drivers
        if (driver.status === 'online' && Math.random() > 0.9) {
            const criticalBins = binsData.filter(b => b.fillLevel >= 60);
            if (criticalBins.length > 0) {
                const route = RouteEngine.calculateOptimalRoute(BASE_LOCATION, criticalBins.slice(0, 3));
                driver.activeRoute = route.map(b => b.id);
                driver.waypoints = null;
                driver.status = 'on_route';
                updateData.status = 'on_route';
                updateData.activeRoute = driver.activeRoute;
                updateData.waypoints = null;
                addSmartAlert('🚛', `${driver.displayName?.split(' ')[0]} iniciou rota`, `${route.length} pontos de coleta`, 'info');
                posChanged = true;
            }
        }

        // Handle collection state pause
        if (driver.status === 'collecting') {
            driver.status = (driver.activeRoute && driver.activeRoute.length > 0) ? 'on_route' : 'returning';
            updateData.status = driver.status;
            posChanged = true;
        }
        // Move trucks on route
        else if (driver.status === 'on_route' && driver.activeRoute && driver.activeRoute.length > 0) {
            const targetBinId = driver.activeRoute[0];
            const targetBin = binsData.find(b => b.id === targetBinId);

            if (targetBin && targetBin.coords) {
                // If no waypoints for current leg, calculate them
                if (!driver.waypoints || driver.waypoints.length === 0) {
                    driver.waypoints = RouteEngine.findStreetPath(driver.currentPosition, targetBin.coords);
                    driver.waypoints.shift(); // Remove current pos
                }

                if (driver.waypoints.length > 0) {
                    const nextWP = driver.waypoints[0];
                    const dx = nextWP.x - driver.currentPosition.x;
                    const dy = nextWP.y - driver.currentPosition.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const speed = 7.0; // Medium speed (~7 units/sec) to cross the map in 10s

                    if (distance <= speed) {
                        driver.currentPosition = { ...nextWP };
                        driver.waypoints.shift();
                        updateData.waypoints = driver.waypoints;
                        updateData.currentPosition = driver.currentPosition;
                        posChanged = true;

                        if (driver.waypoints.length === 0) {
                            // Arrived at bin -> trigger collection
                            driver.status = 'collecting';
                            updateData.status = 'collecting';

                            // Reset bin fill level in Firestore
                            db.collection('bins').doc(targetBinId).update({
                                fillLevel: 0,
                                status: 'normal',
                                lastCollected: firebase.firestore.FieldValue.serverTimestamp()
                            });

                            // Log collection to Firestore
                            db.collection('collections').add({
                                binId: targetBinId,
                                binName: targetBin.name,
                                driverId: driver.id,
                                driverName: driver.displayName || 'Bot',
                                truckId: driver.assignedTruckId || 'BOT-100',
                                fillLevelBefore: Math.round(targetBin.fillLevel),
                                fillLevelAfter: 0,
                                collectedAt: firebase.firestore.FieldValue.serverTimestamp()
                            });

                            driver.activeRoute.shift();
                            updateData.activeRoute = driver.activeRoute;
                            addSmartAlert('📦', `${driver.displayName?.split(' ')[0]} coletou lixeira`, targetBin.name, 'success');
                        }
                    } else {
                        driver.currentPosition.x += (dx / distance) * speed;
                        driver.currentPosition.y += (dy / distance) * speed;
                        updateData.currentPosition = driver.currentPosition;
                        posChanged = true;
                    }
                }
            }
        }
        // Return to base (following streets)
        else if (driver.status === 'returning') {
            if (!driver.waypoints || driver.waypoints.length === 0) {
                driver.waypoints = RouteEngine.findStreetPath(driver.currentPosition, BASE_LOCATION);
                driver.waypoints.shift();
            }

            if (driver.waypoints.length > 0) {
                const nextWP = driver.waypoints[0];
                const dx = nextWP.x - driver.currentPosition.x;
                const dy = nextWP.y - driver.currentPosition.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const speed = 7.0;

                if (distance <= speed) {
                    driver.currentPosition = { ...nextWP };
                    driver.waypoints.shift();
                    updateData.waypoints = driver.waypoints;
                    updateData.currentPosition = driver.currentPosition;
                    posChanged = true;

                    if (driver.waypoints.length === 0) {
                        driver.status = 'online';
                        driver.activeRoute = null;
                        driver.waypoints = null;
                        updateData.status = 'online';
                        updateData.activeRoute = null;
                        updateData.waypoints = null;
                        addSmartAlert('🏭', `${driver.displayName?.split(' ')[0]} retornou à base`, 'Disponível', 'info');
                    }
                } else {
                    driver.currentPosition.x += (dx / distance) * speed;
                    driver.currentPosition.y += (dy / distance) * speed;
                    updateData.currentPosition = driver.currentPosition;
                    posChanged = true;
                }
            }
        }

        if (posChanged) {
            db.collection('users').doc(driver.id).update(updateData);
        }
    });
}