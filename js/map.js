/* ============================================================
   ECOBIN — Smart City SVG Map Renderer
   ============================================================ */

/* ── Truck Animation State ── */
let truckAnimations = {};
let animationFrame = null;

function renderMapIfActive() {
    const dashMap = document.getElementById('dashboard-map-svg');
    const routeMap = document.getElementById('map-svg');
    if (dashMap && document.querySelector('.view--dashboard.view--active')) renderMap(dashMap);
    if (routeMap && document.querySelector('.view--rota.view--active')) renderMap(routeMap);
}

function createSvgEl(tag) {
    return document.createElementNS('http://www.w3.org/2000/svg', tag);
}

function setAttrs(el, attrs) {
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
}

/* ── Main Render Function ── */
function renderMap(svg) {
    if (!svg) return;
    svg.innerHTML = '';

    const isDark = !document.body.classList.contains('light-theme');
    const streets = RouteEngine.STREETS;
    const buildings = RouteEngine.BUILDINGS;

    // Defs (filters, gradients)
    const defs = createSvgEl('defs');
    defs.innerHTML = `
        <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="glow-route" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="shadow-building" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0.3" dy="0.3" stdDeviation="0.3" flood-opacity="0.2"/>
        </filter>
        <linearGradient id="route-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#8CE78D" stop-opacity="0.2"/>
            <stop offset="50%" stop-color="#8CE78D" stop-opacity="1"/>
            <stop offset="100%" stop-color="#8CE78D" stop-opacity="0.2"/>
        </linearGradient>
    `;
    svg.appendChild(defs);

    // 1. Streets
    drawStreets(svg, streets, isDark);

    // 2. Buildings
    drawBuildings(svg, buildings, isDark);

    // 3. Active routes
    drawActiveRoutes(svg, isDark);

    // 4. Base marker
    drawBase(svg, isDark);

    // 5. Bin markers
    drawBins(svg, isDark);

    // 6. Truck markers
    drawTrucks(svg, isDark);
}

/* ── Draw Streets ── */
function drawStreets(svg, streets, isDark) {
    const roadColor = isDark ? '#1A2A3A' : '#D1D5DB';
    const roadBorder = isDark ? '#0F1A28' : '#B8BFC8';
    const markingColor = isDark ? 'rgba(255,220,100,0.12)' : 'rgba(200,180,50,0.2)';
    const sideWalk = isDark ? '#111F2E' : '#E5E7EB';

    // Horizontal streets
    streets.horizontal.forEach(s => {
        // Sidewalk (slightly wider)
        const sw = createSvgEl('rect');
        setAttrs(sw, { x: s.x1, y: s.y - s.w / 2 - 0.4, width: s.x2 - s.x1, height: s.w + 0.8, fill: sideWalk, rx: 0.3 });
        svg.appendChild(sw);
        // Road surface
        const road = createSvgEl('rect');
        setAttrs(road, { x: s.x1, y: s.y - s.w / 2, width: s.x2 - s.x1, height: s.w, fill: roadColor, rx: 0.2 });
        svg.appendChild(road);
        // Center line
        if (s.main) {
            const line = createSvgEl('line');
            setAttrs(line, { x1: s.x1 + 2, y1: s.y, x2: s.x2 - 2, y2: s.y, stroke: markingColor, 'stroke-width': 0.15, 'stroke-dasharray': '2,1.5' });
            svg.appendChild(line);
        }
    });

    // Vertical streets
    streets.vertical.forEach(s => {
        const sw = createSvgEl('rect');
        setAttrs(sw, { x: s.x - s.w / 2 - 0.4, y: s.y1, width: s.w + 0.8, height: s.y2 - s.y1, fill: sideWalk, rx: 0.3 });
        svg.appendChild(sw);
        const road = createSvgEl('rect');
        setAttrs(road, { x: s.x - s.w / 2, y: s.y1, width: s.w, height: s.y2 - s.y1, fill: roadColor, rx: 0.2 });
        svg.appendChild(road);
        if (s.main) {
            const line = createSvgEl('line');
            setAttrs(line, { x1: s.x, y1: s.y1 + 2, x2: s.x, y2: s.y2 - 2, stroke: markingColor, 'stroke-width': 0.15, 'stroke-dasharray': '2,1.5' });
            svg.appendChild(line);
        }
    });

    // Intersection fills (where streets cross)
    streets.horizontal.forEach(h => {
        streets.vertical.forEach(v => {
            if (v.x >= h.x1 && v.x <= h.x2 && h.y >= v.y1 && h.y <= v.y2) {
                const ix = createSvgEl('rect');
                const hw = Math.max(h.w, v.w);
                setAttrs(ix, {
                    x: v.x - hw / 2, y: h.y - hw / 2,
                    width: hw, height: hw,
                    fill: roadColor, rx: 0.1
                });
                svg.appendChild(ix);
            }
        });
    });
}

/* ── Draw Buildings ── */
function drawBuildings(svg, buildings, isDark) {
    buildings.forEach(b => {
        const g = createSvgEl('g');
        const rect = createSvgEl('rect');
        setAttrs(rect, {
            x: b.x, y: b.y, width: b.w, height: b.h,
            fill: RouteEngine.getBuildingColor(b.type, isDark),
            stroke: RouteEngine.getBuildingStroke(b.type, isDark),
            'stroke-width': 0.15,
            rx: b.type === 'park' ? 0.8 : 0.3,
            filter: 'url(#shadow-building)'
        });
        g.appendChild(rect);

        // Building details (windows for non-parks)
        if (b.type !== 'park' && b.w >= 4 && b.h >= 4) {
            const winColor = isDark ? 'rgba(107,197,247,0.08)' : 'rgba(28,61,90,0.06)';
            for (let wx = b.x + 0.8; wx < b.x + b.w - 0.5; wx += 1.2) {
                for (let wy = b.y + 0.8; wy < b.y + b.h - 0.5; wy += 1.2) {
                    const win = createSvgEl('rect');
                    setAttrs(win, { x: wx, y: wy, width: 0.6, height: 0.6, fill: winColor, rx: 0.1 });
                    g.appendChild(win);
                }
            }
        }

        // Park trees
        if (b.type === 'park') {
            const treeColor = isDark ? 'rgba(140,231,141,0.15)' : 'rgba(91,191,94,0.25)';
            for (let i = 0; i < 3; i++) {
                const tx = b.x + b.w * (0.25 + i * 0.25);
                const ty = b.y + b.h * 0.5;
                const tree = createSvgEl('circle');
                setAttrs(tree, { cx: tx, cy: ty, r: 0.8, fill: treeColor });
                g.appendChild(tree);
            }
        }

        svg.appendChild(g);
    });
}

/* ── Draw Active Routes (A* street-following) ── */
function drawActiveRoutes(svg, isDark) {
    if (!driversData) return;
    const routeColors = ['#8CE78D', '#6BC5F7', '#FFD93D', '#FF9F43'];

    driversData.forEach((driver, i) => {
        if (driver.status !== 'on_route' && driver.status !== 'returning') return;
        
        let pathD = '';
        let color = '#94A3B8';
        let binCoords = [];

        const startPos = driver.currentPosition || { x: BASE_LOCATION.x, y: BASE_LOCATION.y };

        if (driver.status === 'on_route' && driver.activeRoute) {
            binCoords = driver.activeRoute.map(binId => {
                const bin = binsData.find(b => b.id === binId);
                return bin ? bin.coords : null;
            }).filter(Boolean);

            if (binCoords.length === 0) return;
            color = routeColors[i % routeColors.length];

            const waypoints = RouteEngine.buildRoutePath(startPos, binCoords);
            pathD = RouteEngine.waypointsToSvgPath(waypoints);
        } else if (driver.status === 'returning') {
            color = isDark ? '#64748B' : '#94A3B8'; // Cinza neutro

            const waypoints = RouteEngine.findStreetPath(startPos, { x: BASE_LOCATION.x, y: BASE_LOCATION.y });
            pathD = RouteEngine.waypointsToSvgPath(waypoints);
        }

        if (!pathD) return;

        // Glow under-path
        const glowPath = createSvgEl('path');
        setAttrs(glowPath, { d: pathD, fill: 'none', stroke: color, 'stroke-width': 1.8, opacity: 0.15, filter: 'url(#glow-route)', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
        svg.appendChild(glowPath);

        // Main route line
        const routePath = createSvgEl('path');
        setAttrs(routePath, { d: pathD, fill: 'none', stroke: color, 'stroke-width': 0.7, opacity: 0.8, 'stroke-dasharray': '2,1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
        const anim = createSvgEl('animate');
        setAttrs(anim, { attributeName: 'stroke-dashoffset', from: '0', to: '-30', dur: '4s', repeatCount: 'indefinite' });
        routePath.appendChild(anim);
        svg.appendChild(routePath);

        // Stop markers at each bin destination (only for active collections)
        if (driver.status === 'on_route') {
            binCoords.forEach((coord, idx) => {
                const stop = createSvgEl('circle');
                setAttrs(stop, { cx: coord.x, cy: coord.y + 3.5, r: 1, fill: color, opacity: 0.6 });
                svg.appendChild(stop);
                const num = createSvgEl('text');
                setAttrs(num, { x: coord.x, y: coord.y + 4, 'text-anchor': 'middle', 'font-size': 1, fill: '#fff', 'font-weight': '900' });
                num.textContent = idx + 1;
                svg.appendChild(num);
            });
        }
    });
}

/* ── Draw Base ── */
function drawBase(svg, isDark) {
    const bx = BASE_LOCATION.x;
    const by = BASE_LOCATION.y;

    // Glow ring
    const glow = createSvgEl('circle');
    setAttrs(glow, { cx: bx, cy: by, r: 3.5, fill: 'rgba(140,231,141,0.08)', filter: 'url(#glow-green)' });
    svg.appendChild(glow);

    // Base building
    const base = createSvgEl('rect');
    setAttrs(base, {
        x: bx - 2, y: by - 2, width: 4, height: 4,
        fill: isDark ? '#1A3D2A' : '#D4EDDA',
        stroke: '#8CE78D', 'stroke-width': 0.3,
        rx: 0.5, filter: 'url(#shadow-building)'
    });
    svg.appendChild(base);

    // Base icon (garage/depot)
    const icon = createSvgEl('text');
    setAttrs(icon, { x: bx, y: by + 1, 'text-anchor': 'middle', 'font-size': 3 });
    icon.textContent = '🏭';
    svg.appendChild(icon);

    // Label
    const label = createSvgEl('text');
    setAttrs(label, {
        x: bx, y: by - 3.5, 'text-anchor': 'middle',
        'font-size': 1.8, fill: '#8CE78D',
        'font-weight': '900', 'font-family': 'Inter, sans-serif'
    });
    label.textContent = 'BASE';
    svg.appendChild(label);
}

/* ── Draw Bin Markers ── */
function drawBins(svg, isDark) {
    if (!binsData) return;

    binsData.forEach(bin => {
        if (!bin.coords) return;
        const cx = bin.coords.x;
        const cy = bin.coords.y;
        const color = RouteEngine.getBinColor(bin.fillLevel);
        const glowColor = RouteEngine.getBinGlowColor(bin.fillLevel);
        const isCritical = bin.fillLevel >= 70;

        const g = createSvgEl('g');
        g.style.cursor = 'pointer';

        // Glow for critical bins
        if (isCritical) {
            const glow = createSvgEl('circle');
            setAttrs(glow, {
                cx, cy: cy - 0.3, r: 4,
                fill: glowColor, class: 'animate-pulse'
            });
            g.appendChild(glow);
        }

        // Bin body (container shape)
        const body = createSvgEl('rect');
        setAttrs(body, {
            x: cx - 1.3, y: cy - 1, width: 2.6, height: 2.8,
            fill: isDark ? '#1A2A3A' : '#D8DEE4',
            stroke: color, 'stroke-width': 0.25,
            rx: 0.3
        });
        g.appendChild(body);

        // Fill level inside bin
        const fillH = (2.8 * bin.fillLevel) / 100;
        const fillRect = createSvgEl('rect');
        setAttrs(fillRect, {
            x: cx - 1.15, y: cy - 1 + (2.8 - fillH) + 0.15,
            width: 2.3, height: Math.max(0.1, fillH - 0.15),
            fill: color, opacity: 0.6, rx: 0.2
        });
        g.appendChild(fillRect);

        // Bin lid
        const lid = createSvgEl('rect');
        setAttrs(lid, {
            x: cx - 1.5, y: cy - 1.6, width: 3, height: 0.7,
            fill: color, rx: 0.2
        });
        g.appendChild(lid);

        // Handle on lid
        const handle = createSvgEl('rect');
        setAttrs(handle, {
            x: cx - 0.4, y: cy - 2, width: 0.8, height: 0.5,
            fill: color, rx: 0.2
        });
        g.appendChild(handle);

        // Percentage label
        const pct = createSvgEl('text');
        setAttrs(pct, {
            x: cx, y: cy + 0.6, 'text-anchor': 'middle',
            'font-size': 1.5, fill: '#fff',
            'font-weight': '900', 'font-family': 'Inter, sans-serif'
        });
        pct.textContent = Math.round(bin.fillLevel) + '%';
        g.appendChild(pct);

        // Name label
        const name = createSvgEl('text');
        setAttrs(name, {
            x: cx, y: cy - 3.2, 'text-anchor': 'middle',
            'font-size': 1.6, fill: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(28,61,90,0.6)',
            'font-weight': '700', 'font-family': 'Inter, sans-serif'
        });
        name.textContent = bin.name.replace('PEV ', '');
        g.appendChild(name);

        svg.appendChild(g);
    });
}

/* ── Draw Truck Markers ── */
function drawTrucks(svg, isDark) {
    if (!driversData) return;
    const statusColors = {
        on_route: '#8CE78D',
        collecting: '#6BC5F7',
        returning: '#FFD93D',
        online: '#94A3B8'
    };
    const statusLabels = {
        on_route: 'Em Rota',
        collecting: 'Coletando',
        returning: 'Retornando',
        online: 'Parado'
    };

    driversData.forEach(driver => {
        if (!driver.currentPosition) return;
        const px = driver.currentPosition.x;
        const py = driver.currentPosition.y;
        const color = statusColors[driver.status] || '#94A3B8';

        const g = createSvgEl('g');
        setAttrs(g, { transform: `translate(${px}, ${py})` });

        // Truck body
        const truck = createSvgEl('rect');
        setAttrs(truck, {
            x: -2, y: -1.2, width: 4, height: 2.4,
            fill: color, rx: 0.4,
            stroke: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
            'stroke-width': 0.15
        });
        g.appendChild(truck);

        // Cabin
        const cabin = createSvgEl('rect');
        setAttrs(cabin, {
            x: 1.2, y: -0.8, width: 1.2, height: 1.6,
            fill: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
            rx: 0.2
        });
        g.appendChild(cabin);

        // Driver name above
        const nameLabel = createSvgEl('text');
        setAttrs(nameLabel, {
            x: 0, y: -2.5, 'text-anchor': 'middle',
            'font-size': 1.4, fill: color,
            'font-weight': '800', 'font-family': 'Inter, sans-serif'
        });
        nameLabel.textContent = (driver.displayName || '').split(' ')[0];
        g.appendChild(nameLabel);

        // Status badge
        const statusBg = createSvgEl('rect');
        const statusText = statusLabels[driver.status] || driver.status;
        const textWidth = statusText.length * 0.8;
        setAttrs(statusBg, {
            x: -textWidth / 2 - 0.5, y: -4.5,
            width: textWidth + 1, height: 1.6,
            fill: color, opacity: 0.2, rx: 0.4
        });
        g.appendChild(statusBg);

        const statusEl = createSvgEl('text');
        setAttrs(statusEl, {
            x: 0, y: -3.3, 'text-anchor': 'middle',
            'font-size': 1, fill: color, opacity: 0.7,
            'font-weight': '700', 'font-family': 'Inter, sans-serif',
            'text-transform': 'uppercase'
        });
        statusEl.textContent = statusText;
        g.appendChild(statusEl);

        svg.appendChild(g);
    });
}