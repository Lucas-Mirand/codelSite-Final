/* ============================================================
   ECOBIN — Route Engine with A* Street Pathfinding
   ============================================================ */
const RouteEngine = (() => {
    const STREETS = {
        horizontal: [
            { y: 18, x1: 3, x2: 97, w: 3, main: true },
            { y: 35, x1: 3, x2: 97, w: 2.2 },
            { y: 50, x1: 3, x2: 97, w: 3.5, main: true },
            { y: 65, x1: 3, x2: 97, w: 2.2 },
            { y: 80, x1: 8, x2: 92, w: 2.5 },
            { y: 90, x1: 20, x2: 80, w: 2 },
        ],
        vertical: [
            { x: 12, y1: 3, y2: 95, w: 2.5 },
            { x: 28, y1: 10, y2: 92, w: 2 },
            { x: 45, y1: 3, y2: 95, w: 3, main: true },
            { x: 55, y1: 35, y2: 95, w: 2 },
            { x: 67, y1: 3, y2: 85, w: 2.5 },
            { x: 78, y1: 10, y2: 82, w: 2 },
            { x: 88, y1: 8, y2: 50, w: 2 },
        ]
    };

    const BUILDINGS = [
        { x: 4, y: 4, w: 5, h: 10, type: 'commercial' },
        { x: 5, y: 21, w: 4, h: 9, type: 'residential' },
        { x: 15, y: 4, w: 8, h: 5, type: 'commercial' },
        { x: 16, y: 10, w: 5, h: 5, type: 'residential' },
        { x: 15, y: 21, w: 6, h: 8, type: 'residential' },
        { x: 31, y: 4, w: 10, h: 6, type: 'commercial' },
        { x: 33, y: 12, w: 6, h: 3, type: 'park' },
        { x: 31, y: 21, w: 5, h: 9, type: 'residential' },
        { x: 37, y: 22, w: 5, h: 7, type: 'residential' },
        { x: 48, y: 4, w: 6, h: 10, type: 'commercial' },
        { x: 56, y: 4, w: 8, h: 5, type: 'industrial' },
        { x: 48, y: 21, w: 5, h: 8, type: 'residential' },
        { x: 70, y: 4, w: 6, h: 10, type: 'commercial' },
        { x: 70, y: 21, w: 5, h: 8, type: 'residential' },
        { x: 80, y: 12, w: 5, h: 4, type: 'residential' },
        { x: 90, y: 10, w: 5, h: 6, type: 'residential' },
        { x: 4, y: 38, w: 5, h: 8, type: 'residential' },
        { x: 15, y: 38, w: 8, h: 4, type: 'park' },
        { x: 15, y: 43, w: 6, h: 4, type: 'residential' },
        { x: 31, y: 38, w: 6, h: 4, type: 'commercial' },
        { x: 38, y: 38, w: 4, h: 8, type: 'commercial' },
        { x: 31, y: 43, w: 5, h: 4, type: 'residential' },
        { x: 48, y: 38, w: 4, h: 8, type: 'residential' },
        { x: 57, y: 38, w: 7, h: 4, type: 'commercial' },
        { x: 57, y: 43, w: 5, h: 4, type: 'residential' },
        { x: 70, y: 38, w: 5, h: 8, type: 'residential' },
        { x: 4, y: 53, w: 5, h: 8, type: 'residential' },
        { x: 4, y: 68, w: 6, h: 8, type: 'residential' },
        { x: 15, y: 53, w: 7, h: 5, type: 'commercial' },
        { x: 15, y: 68, w: 6, h: 7, type: 'park' },
        { x: 31, y: 53, w: 5, h: 8, type: 'residential' },
        { x: 38, y: 53, w: 4, h: 5, type: 'residential' },
        { x: 31, y: 68, w: 6, h: 7, type: 'residential' },
        { x: 48, y: 53, w: 4, h: 8, type: 'residential' },
        { x: 48, y: 68, w: 5, h: 7, type: 'residential' },
        { x: 57, y: 53, w: 7, h: 5, type: 'commercial' },
        { x: 57, y: 68, w: 5, h: 7, type: 'residential' },
        { x: 70, y: 53, w: 5, h: 8, type: 'residential' },
        { x: 70, y: 68, w: 6, h: 5, type: 'residential' },
        { x: 22, y: 83, w: 5, h: 5, type: 'residential' },
        { x: 35, y: 83, w: 6, h: 4, type: 'commercial' },
        { x: 58, y: 83, w: 5, h: 4, type: 'residential' },
        { x: 68, y: 83, w: 5, h: 5, type: 'residential' },
    ];

    /* ── Build intersection graph ── */
    let nodes = [];
    let edges = {};

    function buildGraph() {
        nodes = [];
        edges = {};
        const H = STREETS.horizontal;
        const V = STREETS.vertical;

        // Find all intersections
        H.forEach(h => {
            V.forEach(v => {
                if (v.x >= h.x1 && v.x <= h.x2 && h.y >= v.y1 && h.y <= v.y2) {
                    const key = `${v.x},${h.y}`;
                    if (!nodes.find(n => n.key === key)) {
                        nodes.push({ key, x: v.x, y: h.y });
                    }
                }
            });
            // Also add street endpoints as nodes
            const startKey = `${h.x1},${h.y}`;
            const endKey = `${h.x2},${h.y}`;
            if (!nodes.find(n => n.key === startKey)) nodes.push({ key: startKey, x: h.x1, y: h.y });
            if (!nodes.find(n => n.key === endKey)) nodes.push({ key: endKey, x: h.x2, y: h.y });
        });
        V.forEach(v => {
            const startKey = `${v.x},${v.y1}`;
            const endKey = `${v.x},${v.y2}`;
            if (!nodes.find(n => n.key === startKey)) nodes.push({ key: startKey, x: v.x, y: v.y1 });
            if (!nodes.find(n => n.key === endKey)) nodes.push({ key: endKey, x: v.x, y: v.y2 });
        });

        // Build adjacency: connect nodes on same street segment
        H.forEach(h => {
            const onStreet = nodes.filter(n => n.y === h.y && n.x >= h.x1 && n.x <= h.x2)
                .sort((a, b) => a.x - b.x);
            for (let i = 0; i < onStreet.length - 1; i++) {
                const a = onStreet[i].key, b = onStreet[i + 1].key;
                const d = Math.abs(onStreet[i + 1].x - onStreet[i].x);
                if (!edges[a]) edges[a] = [];
                if (!edges[b]) edges[b] = [];
                edges[a].push({ to: b, dist: d });
                edges[b].push({ to: a, dist: d });
            }
        });
        V.forEach(v => {
            const onStreet = nodes.filter(n => n.x === v.x && n.y >= v.y1 && n.y <= v.y2)
                .sort((a, b) => a.y - b.y);
            for (let i = 0; i < onStreet.length - 1; i++) {
                const a = onStreet[i].key, b = onStreet[i + 1].key;
                const d = Math.abs(onStreet[i + 1].y - onStreet[i].y);
                if (!edges[a]) edges[a] = [];
                if (!edges[b]) edges[b] = [];
                edges[a].push({ to: b, dist: d });
                edges[b].push({ to: a, dist: d });
            }
        });
    }

    buildGraph();

    function dist(a, b) {
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    }

    function findNearestNode(point) {
        let best = null, bestDist = Infinity;
        nodes.forEach(n => {
            const d = dist(point, n);
            if (d < bestDist) { bestDist = d; best = n; }
        });
        return best;
    }

    /* ── A* Pathfinding ── */
    function astar(startKey, endKey) {
        if (startKey === endKey) return [startKey];
        const nodeMap = {};
        nodes.forEach(n => nodeMap[n.key] = n);

        const open = new Set([startKey]);
        const cameFrom = {};
        const gScore = {};
        const fScore = {};

        nodes.forEach(n => { gScore[n.key] = Infinity; fScore[n.key] = Infinity; });
        gScore[startKey] = 0;
        fScore[startKey] = dist(nodeMap[startKey], nodeMap[endKey]);

        while (open.size > 0) {
            let current = null, bestF = Infinity;
            open.forEach(k => { if (fScore[k] < bestF) { bestF = fScore[k]; current = k; } });

            if (current === endKey) {
                const path = [current];
                while (cameFrom[current]) { current = cameFrom[current]; path.unshift(current); }
                return path;
            }

            open.delete(current);
            const neighbors = edges[current] || [];
            neighbors.forEach(({ to, dist: d }) => {
                const tentative = gScore[current] + d;
                if (tentative < gScore[to]) {
                    cameFrom[to] = current;
                    gScore[to] = tentative;
                    fScore[to] = tentative + dist(nodeMap[to], nodeMap[endKey]);
                    open.add(to);
                }
            });
        }
        return null; // no path
    }

    /* ── Find street-following path between two points ── */
    function findStreetPath(from, to) {
        const startNode = findNearestNode(from);
        const endNode = findNearestNode(to);
        if (!startNode || !endNode) return [from, to];

        const keyPath = astar(startNode.key, endNode.key);
        if (!keyPath) return [from, to];

        const nodeMap = {};
        nodes.forEach(n => nodeMap[n.key] = n);

        const waypoints = [from];
        keyPath.forEach(k => waypoints.push({ x: nodeMap[k].x, y: nodeMap[k].y }));
        waypoints.push(to);
        return waypoints;
    }

    /* ── Build full route path through multiple bins ── */
    function buildRoutePath(start, binCoords) {
        if (binCoords.length === 0) return [];
        const allWaypoints = [];
        let current = start;
        binCoords.forEach(target => {
            const segment = findStreetPath(current, target);
            // Skip first point of subsequent segments to avoid duplicates
            if (allWaypoints.length > 0) segment.shift();
            allWaypoints.push(...segment);
            current = target;
        });
        return allWaypoints;
    }

    /* ── Generate SVG path string from waypoints ── */
    function waypointsToSvgPath(waypoints) {
        if (waypoints.length < 2) return '';
        let d = `M ${waypoints[0].x} ${waypoints[0].y}`;
        for (let i = 1; i < waypoints.length; i++) {
            d += ` L ${waypoints[i].x} ${waypoints[i].y}`;
        }
        return d;
    }

    /* ── Nearest-neighbor route optimization ── */
    function calculateOptimalRoute(start, bins) {
        if (!bins.length) return [];
        const remaining = [...bins];
        const route = [];
        let current = start;
        while (remaining.length > 0) {
            let nearest = 0, minDist = Infinity;
            remaining.forEach((bin, i) => {
                const d = dist(current, bin.coords);
                if (d < minDist) { minDist = d; nearest = i; }
            });
            route.push(remaining[nearest]);
            current = remaining[nearest].coords;
            remaining.splice(nearest, 1);
        }
        return route;
    }

    function findNearbySuggestions(currentBin, allBins, radius = 20) {
        return allBins.filter(b =>
            b.id !== currentBin.id && b.fillLevel >= 50 &&
            dist(currentBin.coords, b.coords) <= radius
        ).sort((a, b) => dist(currentBin.coords, a.coords) - dist(currentBin.coords, b.coords));
    }

    function estimateSavings(originalRoute, optimizedRoute) {
        const calcDist = r => {
            let t = 0;
            for (let i = 1; i < r.length; i++) t += dist(r[i - 1], r[i]);
            return t;
        };
        const origD = calcDist(originalRoute);
        const optD = calcDist(optimizedRoute);
        const pct = Math.max(5, Math.round(((origD - optD) / origD) * 100));
        return { fuelSavedPct: Math.min(pct, 30), co2Saved: (pct * 0.15).toFixed(1) };
    }

    function getBinColor(fillLevel) {
        if (fillLevel >= 80) return '#FF6B6B';
        if (fillLevel >= 60) return '#FF9F43';
        if (fillLevel >= 35) return '#FFD93D';
        return '#8CE78D';
    }

    function getBinGlowColor(fillLevel) {
        if (fillLevel >= 80) return 'rgba(255,107,107,0.3)';
        if (fillLevel >= 60) return 'rgba(255,159,67,0.2)';
        return 'none';
    }

    function getBuildingColor(type, isDark) {
        const c = { residential: isDark ? '#152535' : '#CBD5E1', commercial: isDark ? '#1A3045' : '#B8C8D8', industrial: isDark ? '#1E2D3D' : '#A8B8C8', park: isDark ? 'rgba(140,231,141,0.08)' : 'rgba(91,191,94,0.15)' };
        return c[type] || c.residential;
    }

    function getBuildingStroke(type, isDark) {
        if (type === 'park') return isDark ? 'rgba(140,231,141,0.15)' : 'rgba(91,191,94,0.2)';
        return isDark ? 'rgba(255,255,255,0.04)' : 'rgba(28,61,90,0.08)';
    }

    return { STREETS, BUILDINGS, nodes, findStreetPath, buildRoutePath, waypointsToSvgPath, calculateOptimalRoute, findNearbySuggestions, estimateSavings, getBinColor, getBinGlowColor, getBuildingColor, getBuildingStroke, dist };
})();
