        // Streaming service icons mapping
        const streamingIcons = {
            'netflix': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Netflix_2015_logo.svg/200px-Netflix_2015_logo.svg.png',
            'disney': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Disney%2B_logo.svg/200px-Disney%2B_logo.svg.png',
            'hbo': 'https://upload.wikimedia.org/wikipedia/commons/8/81/HBO_Max_Logo_%28October_2019%29.svg',
            'amazon': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Amazon_Prime_Video_logo.svg/200px-Amazon_Prime_Video_logo.svg.png',
            'hulu': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Hulu_logo_%282018%29.svg/2560px-Hulu_logo_%282018%29.svg.png',
            'apple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/AppleTVLogo.svg/2048px-AppleTVLogo.svg.png',
            'paramount': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Paramount_Plus.svg/200px-Paramount_Plus.svg.png',
            'peacock': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/NBC_Peacock_%282022%29.svg/960px-NBC_Peacock_%282022%29.svg.png',
            'crunchyroll': 'https://www.google.com/s2/favicons?domain=crunchyroll.com&sz=128',
            'other': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Symbol_Resin_Code_7_OTHER.svg/1698px-Symbol_Resin_Code_7_OTHER.svg.png'
        };

        // Streaming service search/watch URLs
        const streamingSearchUrls = {
            'netflix': (t) => `https://www.netflix.com/search?q=${encodeURIComponent(t)}`,
            'disney': (t) => `https://www.disneyplus.com/search/${encodeURIComponent(t)}`,
            'hbo': (t) => `https://www.max.com/search?q=${encodeURIComponent(t)}`,
            'amazon': (t) => `https://www.amazon.com/s?k=${encodeURIComponent(t)}&i=instant-video`,
            'hulu': (t) => `https://www.hulu.com/search?q=${encodeURIComponent(t)}`,
            'apple': (t) => `https://tv.apple.com/search?term=${encodeURIComponent(t)}`,
            'paramount': (t) => `https://www.paramountplus.com/search/${encodeURIComponent(t)}/`,
            'peacock': (t) => `https://www.peacocktv.com/search?q=${encodeURIComponent(t)}`,
            'crunchyroll': (t) => `https://www.crunchyroll.com/search?q=${encodeURIComponent(t)}`,
            'other': (t) => `https://www.google.com/search?q=${encodeURIComponent(t)}+watch+online`
        };
        function openStreamingService(service, title) {
            const fn = streamingSearchUrls[service];
            if (fn) window.open(fn(title), '_blank');
        }
        window.openStreamingService = openStreamingService;
        function getFallbackServiceIcon(service) {
            if (service === 'crunchyroll') {
                return 'https://www.google.com/s2/favicons?domain=crunchyroll.com&sz=128';
            }
            return 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(service + '.com') + '&sz=128';
        }
        window.getFallbackServiceIcon = getFallbackServiceIcon;

        let series = [];
        let currentFilter = 'watching';
        let expandedSeriesId = null;
        let draggedElement = null;
        let draggedIndex = null;
        let currentSort = 'default';
        let currentViewSize = 'normal';
        let customSizeValue = 50; // 0 = mini, 100 = giant
        let currentCategory = 'all';
        let currentContentFilter = 'all';
        let currentTheme = 'dark';
        let globalContentType = 'series';
        let customPrimaryColor = '#141414';
        let customSecondaryColor = '#e50914';
        let currentUserId = null;
        let users = [];
        let settings = {
            autoExport: false,
            showIntro: true,
            showNotifications: true,
            autoSaveInterval: '1min' // Options: '1min', '10min', '1h', '10h', '1week', 'off'
        };
        let autoSaveIntervalId = null;
        let notifications = [];
        let timelineRange = 'lifetime';
        let activeWatchTimers = new Map();

        function isElementVisible(element) {
            if (!element) return false;
            return window.getComputedStyle(element).display !== 'none';
        }

        function updateGlobalScrollLock() {
            const sidebar = document.getElementById('sidebar');
            const overlays = document.querySelectorAll('.overlay');
            const hasOpenOverlay = Array.from(overlays).some(isElementVisible);
            const isSidebarOpen = sidebar && sidebar.classList.contains('open');
            document.body.classList.toggle('menu-open', !!(hasOpenOverlay || isSidebarOpen));
        }

        function openSidebar() {
            const sidebar = document.getElementById('sidebar');
            const sidebarOverlay = document.getElementById('sidebarOverlay');
            const hamburgerMenu = document.getElementById('hamburgerMenu');
            if (sidebar) {
                sidebar.classList.add('open');
                sidebar.scrollTop = 0;
            }
            if (sidebarOverlay) sidebarOverlay.classList.add('show');
            if (hamburgerMenu) hamburgerMenu.setAttribute('aria-expanded', 'true');
            updateGlobalScrollLock();
        }

        function closeSidebar() {
            const sidebar = document.getElementById('sidebar');
            const sidebarOverlay = document.getElementById('sidebarOverlay');
            const hamburgerMenu = document.getElementById('hamburgerMenu');
            if (sidebar) sidebar.classList.remove('open');
            if (sidebarOverlay) sidebarOverlay.classList.remove('show');
            if (hamburgerMenu) hamburgerMenu.setAttribute('aria-expanded', 'false');
            updateGlobalScrollLock();
        }

        function openOverlay(overlayId) {
            const overlay = document.getElementById(overlayId);
            if (!overlay) return;
            overlay.style.display = 'flex';
            const modal = overlay.querySelector('.modal');
            if (modal) modal.scrollTop = 0;
            updateGlobalScrollLock();
        }

        function closeOverlay(overlayId) {
            const overlay = document.getElementById(overlayId);
            if (!overlay) return;
            overlay.style.display = 'none';
            updateGlobalScrollLock();
        }

        function addWatchHistoryEntry(serie, eventData = {}) {
            if (!serie) return;
            if (!Array.isArray(serie.watchHistory)) serie.watchHistory = [];
            const date = getLocalDateString();
            const season = serie.contentType === 'series' ? (eventData.season || serie.season || 1) : null;
            const episode = serie.contentType === 'series' ? (eventData.episode || serie.episode || 1) : null;
            const signature = `${date}_s${season || 0}_e${episode || 0}`;
            const alreadyExists = serie.watchHistory.some(item => item.signature === signature);
            if (alreadyExists) return;
            serie.watchHistory.push({
                date,
                season,
                episode,
                time: serie.time || 0,
                title: serie.title,
                contentType: serie.contentType || 'series',
                signature
            });
            if (serie.watchHistory.length > 200) {
                serie.watchHistory = serie.watchHistory.slice(-200);
            }
        }

        function collectWatchTimelineData() {
            const events = [];
            const rangeStart = getTimelineStartDate();
            series.forEach(serie => {
                const history = Array.isArray(serie.watchHistory) ? serie.watchHistory : [];
                if (history.length > 0) {
                    history.forEach(entry => {
                        if (entry.date) {
                            const entryDate = new Date(entry.date + 'T00:00:00');
                            if (rangeStart && entryDate < rangeStart) return;
                            events.push({
                                date: entry.date,
                                title: serie.title,
                                season: entry.season,
                                episode: entry.episode,
                                contentType: entry.contentType || serie.contentType || 'series',
                                event: entry.event || 'watch'
                            });
                        }
                    });
                }
            });
            return events
                .filter(e => e.date)
                .sort((a, b) => new Date(a.date) - new Date(b.date));
        }

        function renderWatchTimeline() {
            const svgEl = document.getElementById('watchTimelineGraph');
            const details = document.getElementById('watchTimelineDetails');
            const countEl = document.getElementById('watchTimelineCount');
            const tooltip = document.getElementById('wtTooltip');
            const ttTitle = document.getElementById('wtTooltipTitle');
            const ttSub   = document.getElementById('wtTooltipSub');
            if (!svgEl || !details) return;

            // ── Gather & bucket events by day ──────────────────────────
            const raw = collectWatchTimelineData();
            if (raw.length === 0) {
                svgEl.innerHTML = '<text x="500" y="110" text-anchor="middle" fill="#555" font-size="15" font-family="inherit">No watch history yet</text>';
                if (countEl) countEl.textContent = '';
                details.textContent = 'Add or update a watched item to start tracking.';
                return;
            }

            // Group by date → count sessions per day
            const dayMap = {};
            raw.forEach(e => {
                if (!dayMap[e.date]) dayMap[e.date] = [];
                dayMap[e.date].push(e);
            });
            const days = Object.keys(dayMap).sort();
            const values = days.map(d => dayMap[d].length);
            const maxVal = Math.max(...values, 1);

            // ── Chart geometry ─────────────────────────────────────────
            const W = 1000, H = 220;
            const PAD = { top: 30, right: 52, bottom: 48, left: 58 };
            const cW = W - PAD.left - PAD.right;
            const cH = H - PAD.top - PAD.bottom;
            const n = days.length;

            function xOf(i) {
                return PAD.left + (n === 1 ? cW / 2 : cW * i / (n - 1));
            }
            function yOf(v) {
                return PAD.top + cH - (v / maxVal) * cH;
            }

            // ── Colour from CSS vars ────────────────────────────────────
            const secColor  = getComputedStyle(document.documentElement)
                                .getPropertyValue('--secondary-color').trim() || '#e50914';
            const isLightTheme = document.body.classList.contains('light-theme');
            const primColor = isLightTheme
                ? '#ffffff'
                : (getComputedStyle(document.documentElement)
                    .getPropertyValue('--primary-color').trim() || '#141414');

            // ── Build SVG ───────────────────────────────────────────────
            const NS = 'http://www.w3.org/2000/svg';
            function el(tag, attrs, parent) {
                const e = document.createElementNS(NS, tag);
                Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
                if (parent) parent.appendChild(e);
                return e;
            }

            // Clear
            while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);

            // ── Defs: gradient fills ────────────────────────────────────
            const defs = el('defs', {}, svgEl);
            const areaGrad = el('linearGradient', { id: 'wt-area-grad', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
            el('stop', { offset: '0%',   'stop-color': secColor, 'stop-opacity': '0.35' }, areaGrad);
            el('stop', { offset: '80%',  'stop-color': secColor, 'stop-opacity': '0.04' }, areaGrad);
            el('stop', { offset: '100%', 'stop-color': secColor, 'stop-opacity': '0' }, areaGrad);

            const dotGrad = el('radialGradient', { id: 'wt-dot-grad' }, defs);
            el('stop', { offset: '0%',   'stop-color': '#ffffff', 'stop-opacity': '1' }, dotGrad);
            el('stop', { offset: '100%', 'stop-color': secColor,  'stop-opacity': '1' }, dotGrad);

            const glowFilter = el('filter', { id: 'wt-glow', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
            const feGBlur = el('feGaussianBlur', { stdDeviation: '3', result: 'blur' }, glowFilter);
            const feMerge = el('feMerge', {}, glowFilter);
            el('feMergeNode', { in: 'blur' }, feMerge);
            el('feMergeNode', { in: 'SourceGraphic' }, feMerge);

            // Clip path to keep area inside chart
            const clipPath = el('clipPath', { id: 'wt-clip' }, defs);
            el('rect', { x: PAD.left, y: PAD.top, width: cW, height: cH + 2 }, clipPath);

            // ── Background rect ─────────────────────────────────────────
            el('rect', { x: 0, y: 0, width: W, height: H,
                         fill: primColor, rx: '10' }, svgEl);

            // ── Grid lines ──────────────────────────────────────────────
            const gridG = el('g', { class: 'wt-grid' }, svgEl);
            const yTicks = 5;
            for (let t = 0; t <= yTicks; t++) {
                const yy = PAD.top + (cH / yTicks) * t;
                const val = Math.round(maxVal - (maxVal / yTicks) * t);
                // Horizontal grid line
                el('line', {
                    x1: PAD.left, y1: yy, x2: PAD.left + cW, y2: yy,
                    stroke: t === yTicks ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)',
                    'stroke-width': t === yTicks ? '1.5' : '1',
                    'stroke-dasharray': t === yTicks ? 'none' : '4 5'
                }, gridG);
                // Y-axis label
                if (val >= 0) {
                    el('text', {
                        x: PAD.left - 8, y: yy + 4,
                        'text-anchor': 'end',
                        fill: 'rgba(255,255,255,0.35)',
                        'font-size': '11',
                        'font-family': 'inherit'
                    }, gridG).textContent = val;
                }
            }

            // Vertical grid lines (one per visible tick or every N days)
            const maxVTicks = 12;
            const vStep = Math.max(1, Math.ceil(n / maxVTicks));
            for (let i = 0; i < n; i += vStep) {
                const xx = xOf(i);
                el('line', {
                    x1: xx, y1: PAD.top, x2: xx, y2: PAD.top + cH,
                    stroke: 'rgba(255,255,255,0.05)',
                    'stroke-width': '1'
                }, gridG);
            }

            // ── X-axis labels ───────────────────────────────────────────
            const labelsG = el('g', { class: 'wt-labels' }, svgEl);
            const maxLabels = 8;
            const labelStep = Math.max(1, Math.ceil(n / maxLabels));
            days.forEach((d, i) => {
                if (i % labelStep !== 0 && i !== n - 1) return;
                const xx = xOf(i);
                const dateObj = new Date(d + 'T12:00:00');
                const label = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                const anchor = i === 0 ? 'start' : (i === n - 1 ? 'end' : 'middle');
                const xOffset = i === 0 ? 6 : (i === n - 1 ? -6 : 0);
                const t = el('text', {
                    x: xx + xOffset, y: H - 10,
                    'text-anchor': anchor,
                    fill: 'rgba(255,255,255,0.4)',
                    'font-size': '11',
                    'font-family': 'inherit'
                }, labelsG);
                t.textContent = label;
            });

            // ── Smooth cubic bezier path ─────────────────────────────────
            const pts = days.map((d, i) => ({ x: xOf(i), y: yOf(values[i]) }));

            function smoothPath(points) {
                if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
                let d = `M ${points[0].x} ${points[0].y}`;
                for (let i = 0; i < points.length - 1; i++) {
                    const p0 = points[Math.max(i - 1, 0)];
                    const p1 = points[i];
                    const p2 = points[i + 1];
                    const p3 = points[Math.min(i + 2, points.length - 1)];
                    const tension = 0.3;
                    const cp1x = p1.x + (p2.x - p0.x) * tension;
                    const cp1y = p1.y + (p2.y - p0.y) * tension;
                    const cp2x = p2.x - (p3.x - p1.x) * tension;
                    const cp2y = p2.y - (p3.y - p1.y) * tension;
                    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
                }
                return d;
            }

            const linePath = smoothPath(pts);
            const areaPath = linePath +
                ` L ${pts[pts.length-1].x} ${PAD.top + cH}` +
                ` L ${pts[0].x} ${PAD.top + cH} Z`;

            // Area fill (clipped)
            el('path', {
                d: areaPath,
                fill: 'url(#wt-area-grad)',
                stroke: 'none',
                'clip-path': 'url(#wt-clip)',
                class: 'wt-area-path'
            }, svgEl);

            // Main line — measure total length for animation
            const lineEl = el('path', {
                d: linePath,
                fill: 'none',
                stroke: secColor,
                'stroke-width': '3',
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
                class: 'wt-line-path'
            }, svgEl);

            // Set real dash length after element is in DOM
            requestAnimationFrame(() => {
                const len = lineEl.getTotalLength ? lineEl.getTotalLength() : 9999;
                lineEl.style.strokeDasharray = len;
                lineEl.style.strokeDashoffset = len;
                lineEl.style.animation = 'wt-line-draw 1.2s cubic-bezier(0.4,0,0.2,1) 0.1s forwards';
            });

            // ── Data points ──────────────────────────────────────────────
            let pinnedIdx = null;
            pts.forEach((p, i) => {
                const g = el('g', {
                    class: 'watch-point',
                    transform: `translate(${p.x},${p.y})`,
                    style: `animation-delay: ${0.3 + i * 0.04}s`
                }, svgEl);

                // Glow halo (larger circle, blurred)
                el('circle', {
                    cx: '0', cy: '0', r: '10',
                    fill: secColor, opacity: '0.0',
                    class: 'wt-halo',
                    style: 'transition: opacity 0.2s;'
                }, g);

                // Outer ring
                el('circle', {
                    cx: '0', cy: '0', r: '7',
                    fill: 'none',
                    stroke: secColor,
                    'stroke-width': '2',
                    opacity: '0.5',
                    class: 'wt-ring',
                    style: 'transition: all 0.2s; transform-origin: center;'
                }, g);

                // Inner dot
                el('circle', {
                    cx: '0', cy: '0', r: '4',
                    fill: 'url(#wt-dot-grad)',
                    stroke: secColor,
                    'stroke-width': '1.5',
                    class: 'wt-dot',
                    style: 'transition: all 0.2s;'
                }, g);

                // Invisible hit area
                el('circle', {
                    cx: '0', cy: '0', r: '14',
                    fill: 'transparent',
                    stroke: 'none'
                }, g);

                // Vertical drop line
                el('line', {
                    x1: '0', y1: '0', x2: '0', y2: String(PAD.top + cH - p.y),
                    stroke: secColor,
                    'stroke-width': '1',
                    'stroke-dasharray': '3 3',
                    opacity: '0',
                    class: 'wt-drop',
                    style: 'transition: opacity 0.2s;'
                }, g);

                // Value label above dot
                const vLabel = el('text', {
                    x: '0', y: '-14',
                    'text-anchor': 'middle',
                    fill: '#ffffff',
                    'font-size': '11',
                    'font-weight': '700',
                    'font-family': 'inherit',
                    opacity: '0',
                    class: 'wt-val-label',
                    style: 'transition: opacity 0.2s;'
                }, g);
                vLabel.textContent = values[i];

                // ── Hover / click events ─────────────────────────────
                function showPoint(pin) {
                    if (pin) pinnedIdx = i;
                    g.querySelector('.wt-halo').setAttribute('opacity', '0.15');
                    g.querySelector('.wt-ring').setAttribute('r', '9');
                    g.querySelector('.wt-ring').setAttribute('opacity', '1');
                    g.querySelector('.wt-dot').setAttribute('r', '5.5');
                    g.querySelector('.wt-drop').setAttribute('opacity', '0.35');
                    g.querySelector('.wt-val-label').setAttribute('opacity', '1');

                    // Position tooltip
                    if (tooltip) {
                        const svgRect = svgEl.getBoundingClientRect();
                        const scaleX = svgRect.width / W;
                        const scaleY = svgRect.height / H;
                        const left = p.x * scaleX;
                        const top  = (p.y - 14) * scaleY;
                        tooltip.style.left = left + 'px';
                        tooltip.style.top  = top + 'px';
                        tooltip.classList.add('visible');

                        const evts = dayMap[days[i]];
                        ttTitle.textContent = days[i];
                        const grouped = new Map();
                        evts.forEach(evt => {
                            if (evt.contentType !== 'series' || !evt.season) return;
                            const key = `${evt.title}__${evt.season}`;
                            const cur = grouped.get(key) || { title: evt.title, season: evt.season, min: 9999, max: 0 };
                            const ep = evt.episode || 1;
                            cur.min = Math.min(cur.min, ep);
                            cur.max = Math.max(cur.max, ep);
                            grouped.set(key, cur);
                        });
                        const ranges = Array.from(grouped.values()).slice(0, 3).map(gp =>
                            `${gp.title} S${gp.season} E${gp.min}${gp.max > gp.min ? `-${gp.max}` : ''}`
                        );
                        ttSub.textContent = ranges.length ? ranges.join(' · ') : `${evts.length} watched`;
                    }

                    const dateObj = new Date(days[i] + 'T12:00:00');
                    const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                    const evts = dayMap[days[i]];
                    const epDetails = evts.slice(0, 4).map(e => {
                        if (e.contentType === 'series' && e.season) {
                            return `${e.title} S${e.season}E${String(e.episode||1).padStart(2,'0')}`;
                        }
                        return e.title;
                    }).join('  ·  ');
                    const moreCount = evts.length > 4 ? `  +${evts.length - 4} more` : '';
                    details.textContent = `${dateStr}  —  ${evts.length} session${evts.length !== 1 ? 's' : ''}:  ${epDetails}${moreCount}`;
                }

                function hidePoint() {
                    if (pinnedIdx === i) return;
                    g.querySelector('.wt-halo').setAttribute('opacity', '0');
                    g.querySelector('.wt-ring').setAttribute('r', '7');
                    g.querySelector('.wt-ring').setAttribute('opacity', '0.5');
                    g.querySelector('.wt-dot').setAttribute('r', '4');
                    g.querySelector('.wt-drop').setAttribute('opacity', '0');
                    g.querySelector('.wt-val-label').setAttribute('opacity', '0');
                    if (tooltip && pinnedIdx === null) tooltip.classList.remove('visible');
                }

                g.addEventListener('mouseenter', () => showPoint(false));
                g.addEventListener('mouseleave', hidePoint);
                g.addEventListener('click', () => {
                    if (pinnedIdx === i) {
                        pinnedIdx = null;
                        hidePoint();
                        tooltip && tooltip.classList.remove('visible');
                        details.textContent = 'Hover a point to inspect — click to pin.';
                    } else {
                        if (pinnedIdx !== null) {
                            // unpinch old
                            const old = svgEl.querySelectorAll('.watch-point')[pinnedIdx];
                            if (old) {
                                old.querySelector('.wt-halo').setAttribute('opacity', '0');
                                old.querySelector('.wt-ring').setAttribute('r', '7');
                                old.querySelector('.wt-ring').setAttribute('opacity', '0.5');
                                old.querySelector('.wt-dot').setAttribute('r', '4');
                                old.querySelector('.wt-drop').setAttribute('opacity', '0');
                                old.querySelector('.wt-val-label').setAttribute('opacity', '0');
                            }
                        }
                        showPoint(true);
                    }
                });
            });

            // ── Y-axis label ─────────────────────────────────────────────
            const yAxisLabel = el('text', {
                x: String(-(PAD.top + cH / 2)),
                y: '12',
                transform: 'rotate(-90)',
                'text-anchor': 'middle',
                fill: 'rgba(255,255,255,0.3)',
                'font-size': '11',
                'font-family': 'inherit'
            }, svgEl);
            yAxisLabel.textContent = 'Sessions';

            // ── Count badge ───────────────────────────────────────────────
            if (countEl) {
                countEl.textContent = `${timelineRange === 'lifetime' ? 'Lifetime' : timelineRange === '1y' ? '1 Year' : '1 Month'} · ${n} day${n !== 1 ? 's' : ''} · ${raw.length} sessions`;
            }
            details.textContent = 'Hover a point to inspect — click to pin.';
        }

        function buildFutureApiRequest(notification) {
            return {
                provider: notification.apiSource || 'manual',
                title: notification.seriesName,
                type: notification.type,
                season: notification.season || null,
                episode: notification.episode || null,
                language: notification.language || 'default'
            };
        }

        // Notification System Functions
        function loadNotifications() {
            const key = currentUserId ? `seriesTrackerNotifications_${currentUserId}` : 'seriesTrackerNotifications';
            const stored = localStorage.getItem(key);
            if (stored) {
                try {
                    notifications = JSON.parse(stored);
                } catch (e) {
                    console.error('Error loading notifications:', e);
                    notifications = [];
                }
            } else {
                notifications = [];
            }
        }

        function saveNotifications() {
            const key = currentUserId ? `seriesTrackerNotifications_${currentUserId}` : 'seriesTrackerNotifications';
            localStorage.setItem(key, JSON.stringify(notifications));
        }

        function checkNotifications() {
            if (!settings.showNotifications) return;
            
            const today = new Date().toISOString().split('T')[0];
            const dismissedKey = currentUserId ? `seriesTrackerDismissedNotifications_${currentUserId}` : 'seriesTrackerDismissedNotifications';
            const dismissed = JSON.parse(localStorage.getItem(dismissedKey) || '[]');
            
            notifications.forEach(notification => {
                if (notification.date === today && !dismissed.includes(notification.id)) {
                    showNotification(notification);
                }
            });
        }

        function showNotification(notification) {
            const container = document.getElementById('notificationContainer');
            if (!container) return;
            
            let message = '';
            if (notification.type === 'season') {
                message = `Reminder!\n"${notification.seriesName}" has released Season ${notification.season}!`;
            } else if (notification.type === 'episode') {
                message = `Reminder!\n"${notification.seriesName}" has released Episode ${notification.episode} for Season ${notification.season}!`;
            }
            if (notification.language) {
                message += `\nLanguage: ${notification.language}`;
            }
            if (notification.apiSource && notification.apiSource !== 'manual') {
                message += `\nSource: ${notification.apiSource.toUpperCase()} API`;
            }
            
            const notificationDiv = document.createElement('div');
            notificationDiv.className = 'notification-display';
            notificationDiv.dataset.notificationId = notification.id;
            notificationDiv.innerHTML = `
                <div class="notification-display-header">
                    <div class="notification-display-title">Notification</div>
                    <button class="notification-display-close" onclick="closeNotification('${notification.id}')">✕</button>
                </div>
                <div class="notification-display-message" style="white-space: pre-line;">${message}</div>
                <button class="notification-display-ok-btn" onclick="dismissNotification('${notification.id}')">Okay</button>
            `;
            
            container.appendChild(notificationDiv);
        }

        function closeNotification(notificationId) {
            const notificationDiv = document.querySelector(`[data-notification-id="${notificationId}"]`);
            if (notificationDiv) {
                notificationDiv.remove();
            }
        }

        function dismissNotification(notificationId) {
            closeNotification(notificationId);
            // Immediately delete the notification when user presses Okay
            deleteNotification(notificationId);
        }
        
        function cleanupOldDismissedNotifications() {
            const dismissedKey = currentUserId ? `seriesTrackerDismissedNotifications_${currentUserId}` : 'seriesTrackerDismissedNotifications';
            const dismissedNotifications = JSON.parse(localStorage.getItem(dismissedKey) || '{}');
            const oneDayAgo = new Date();
            oneDayAgo.setDate(oneDayAgo.getDate() - 1);
            const oneDayAgoStr = getLocalDateStringFromDate(oneDayAgo);
            
            let updated = false;
            for (const [notificationId, dismissedDate] of Object.entries(dismissedNotifications)) {
                if (dismissedDate <= oneDayAgoStr) {
                    deleteNotification(notificationId);
                    delete dismissedNotifications[notificationId];
                    updated = true;
                }
            }
            
            if (updated) {
                localStorage.setItem(dismissedKey, JSON.stringify(dismissedNotifications));
            }
        }
        
        function getLocalDateStringFromDate(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        function renderNotificationsList() {
            const list = document.getElementById('notificationsList');
            if (!list) return;
            
            if (notifications.length === 0) {
                list.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">No notifications scheduled</div>';
                return;
            }
            
            // Sort by date
            const sortedNotifications = [...notifications].sort((a, b) => new Date(a.date) - new Date(b.date));
            
            list.innerHTML = sortedNotifications.map(notification => {
                let message = '';
                if (notification.type === 'season') {
                    message = `"${notification.seriesName}" - Season ${notification.season}`;
                } else if (notification.type === 'episode') {
                    message = `"${notification.seriesName}" - Episode ${notification.episode} (S${notification.season})`;
                }
                const langInfo = notification.language ? ` • Language: ${notification.language}` : '';
                const sourceInfo = notification.apiSource && notification.apiSource !== 'manual' ? ` • Source: ${notification.apiSource.toUpperCase()}` : '';
                
                return `
                    <div class="notification-item">
                        <div class="notification-info">
                            <div class="notification-date">${new Date(notification.date).toLocaleDateString()}</div>
                            <div class="notification-message">${message}${langInfo}${sourceInfo}</div>
                        </div>
                        <div class="notification-actions">
                            <button class="notification-delete-btn" onclick="deleteNotificationWithConfirm('${notification.id}')">Delete</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function deleteNotification(notificationId) {
            // Remove from notifications array without confirmation if called from cleanup
            notifications = notifications.filter(n => n.id !== notificationId);
            saveNotifications();
            renderNotificationsList();
            
            // Also remove from dismissed notifications
            const dismissedKey = currentUserId ? `seriesTrackerDismissedNotifications_${currentUserId}` : 'seriesTrackerDismissedNotifications';
            const dismissedNotifications = JSON.parse(localStorage.getItem(dismissedKey) || '{}');
            delete dismissedNotifications[notificationId];
            localStorage.setItem(dismissedKey, JSON.stringify(dismissedNotifications));
        }
        
        function deleteNotificationWithConfirm(notificationId) {
            if (confirm('Are you sure you want to delete this notification?')) {
                deleteNotification(notificationId);
            }
        }

        // Make functions globally accessible
        window.closeNotification = closeNotification;
        window.dismissNotification = dismissNotification;
        window.deleteNotification = deleteNotification;
        window.deleteNotificationWithConfirm = deleteNotificationWithConfirm;

        // API Integration Functions
        // Note: These APIs require API keys. Users need to add their own keys.
        const WATCHMODE_API_KEY = ''; // Users need to add their Watchmode API key
        const OMDB_API_KEY = ''; // Users need to add their OMDB API key (free at omdbapi.com)

        async function fetchStreamingService(title, contentType) {
            if (!WATCHMODE_API_KEY) {
                console.log('Watchmode API key not set');
                return null;
            }
            
            try {
                // Watchmode API endpoint for searching
                const searchUrl = `https://api.watchmode.com/v1/search/?apiKey=${WATCHMODE_API_KEY}&search_value=${encodeURIComponent(title)}&search_type=2`;
                const searchResponse = await fetch(searchUrl);
                const searchData = await searchResponse.json();
                
                if (searchData && searchData.title_results && searchData.title_results.length > 0) {
                    const titleId = searchData.title_results[0].id;
                    // Get sources for the title
                    const sourcesUrl = `https://api.watchmode.com/v1/title/${titleId}/sources/?apiKey=${WATCHMODE_API_KEY}`;
                    const sourcesResponse = await fetch(sourcesUrl);
                    const sourcesData = await sourcesResponse.json();
                    
                    if (sourcesData && sourcesData.length > 0) {
                        // Map Watchmode source names to our streaming service values
                        const sourceMapping = {
                            'netflix': 'netflix',
                            'disney_plus': 'disney',
                            'hbo_max': 'hbo',
                            'amazon_prime': 'amazon',
                            'hulu': 'hulu',
                            'apple_tv_plus': 'apple',
                            'paramount_plus': 'paramount',
                            'peacock': 'peacock',
                            'crunchyroll': 'crunchyroll'
                        };
                        
                        const source = sourcesData[0].name.toLowerCase().replace(/\s+/g, '_');
                        return sourceMapping[source] || null;
                    }
                }
            } catch (error) {
                console.error('Error fetching streaming service:', error);
            }
            return null;
        }

        async function fetchIMDBData(title, contentType) {
            if (!OMDB_API_KEY) {
                console.log('OMDB API key not set');
                return null;
            }
            
            try {
                const url = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(title)}&type=${contentType === 'movie' ? 'movie' : 'series'}`;
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.Response === 'True') {
                    return {
                        poster: data.Poster !== 'N/A' ? data.Poster : null,
                        imdbRating: data.imdbRating !== 'N/A' ? data.imdbRating : null,
                        totalSeasons: contentType === 'series' && data.totalSeasons !== 'N/A' ? parseInt(data.totalSeasons) : null,
                        // Note: OMDB doesn't provide total episodes per season directly
                        // You might need to use another API or manual entry
                    };
                }
            } catch (error) {
                console.error('Error fetching IMDB data:', error);
            }
            return null;
        }

        // Function to auto-fill form with API data
        async function autoFillFromAPIs(title, contentType) {
            if (!title) return;
            
            // Show loading indicator
            const titleInput = document.getElementById('seriesTitle');
            if (titleInput) {
                titleInput.style.opacity = '0.5';
            }
            
            try {
                // Fetch IMDB data
                const imdbData = await fetchIMDBData(title, contentType);
                if (imdbData) {
                    if (imdbData.poster) {
                        const imageInput = document.getElementById('seriesImage');
                        if (imageInput && !imageInput.value) {
                            imageInput.value = imdbData.poster;
                        }
                    }
                    if (imdbData.imdbRating) {
                        const imdbInput = document.getElementById('seriesImdb');
                        if (imdbInput && !imdbInput.value) {
                            imdbInput.value = imdbData.imdbRating;
                        }
                    }
                    if (imdbData.totalSeasons && contentType === 'series') {
                        const totalSeasonsInput = document.getElementById('seriesTotalSeasons');
                        if (totalSeasonsInput && !totalSeasonsInput.value) {
                            totalSeasonsInput.value = imdbData.totalSeasons;
                        }
                    }
                }
                
                // Fetch streaming service (only for series)
                if (contentType === 'series') {
                    const streamingService = await fetchStreamingService(title, contentType);
                    if (streamingService) {
                        const streamingInput = document.getElementById('seriesStreamingService');
                        if (streamingInput && !streamingInput.value) {
                            streamingInput.value = streamingService;
                        }
                    }
                }
            } catch (error) {
                console.error('Error auto-filling from APIs:', error);
            } finally {
                if (titleInput) {
                    titleInput.style.opacity = '1';
                }
            }
        }

        function loadUsers() {
            const stored = localStorage.getItem('seriesTrackerUsers');
            if (stored) {
                try {
                    users = JSON.parse(stored);
                } catch (e) {
                    console.error('Error loading users:', e);
                    users = [];
                }
            } else {
                users = [];
            }
            
            // If no users exist, create a default user
            if (users.length === 0) {
                // Check if there's existing data to preserve
                const hasExistingData = localStorage.getItem('seriesTrackerData') !== null;
                const defaultUser = {
                    id: 'user_' + Date.now(),
                    name: hasExistingData ? 'My Profile' : 'Default User',
                    picture: '',
                    createdAt: Date.now()
                };
                users.push(defaultUser);
                saveUsers();
            }
        }

        function saveUsers() {
            localStorage.setItem('seriesTrackerUsers', JSON.stringify(users));
        }

        function loadCurrentUser() {
            const stored = localStorage.getItem('seriesTrackerCurrentUser');
            if (stored) {
                currentUserId = stored;
            } else if (users.length > 0) {
                currentUserId = users[0].id;
                saveCurrentUser();
            }
        }

        function saveCurrentUser() {
            localStorage.setItem('seriesTrackerCurrentUser', currentUserId);
        }

        async function exportLists(isAutoExport = false) {
            const currentUser = users.find(u => u.id === currentUserId);
            if (!currentUser) {
                if (!isAutoExport) {
                    alert('No user selected');
                }
                return;
            }

            // Filter series by status
            const watching = series.filter(s => s.status === 'watching');
            const wantToWatch = series.filter(s => s.status === 'want');
            const completed = series.filter(s => s.status === 'completed');
            
            const totalItems = watching.length + wantToWatch.length + completed.length;
            
            if (totalItems === 0) {
                if (!isAutoExport) {
                    alert('No items to export');
                }
                return;
            }

            // Create export data
            const exportData = {
                profileName: currentUser.name,
                profilePicture: currentUser.picture || '',
                exportDate: new Date().toISOString(),
                itemCount: totalItems,
                watching: watching,
                wantToWatch: wantToWatch,
                completed: completed,
                version: '1.1'
            };

            // Create filename: ProfileName_X_items_timestamp.json
            const sanitizedName = currentUser.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                            new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
            const filename = `${sanitizedName}_${totalItems}_items_${timestamp}.json`;
            const recommendedFolderStructure = 'Movie and Series Tracker/logs/';

            // Try to use File System Access API if available (modern browsers) - only for manual exports
            if (!isAutoExport && 'showSaveFilePicker' in window) {
                try {
                    const fileHandle = await window.showSaveFilePicker({
                        suggestedName: filename,
                        types: [{
                            description: 'JSON files',
                            accept: { 'application/json': ['.json'] }
                        }]
                    });
                    
                    const writable = await fileHandle.createWritable();
                    await writable.write(JSON.stringify(exportData, null, 2));
                    await writable.close();
                    
                    if (!isAutoExport) {
                        showExportMessage('Export Complete', [
                            `Successfully exported ${totalItems} items!`,
                            '',
                            `Watching: ${watching.length}`,
                            `Want to Watch: ${wantToWatch.length}`,
                            `Completed: ${completed.length}`,
                            '',
                            `Saved to: ${fileHandle.name}`,
                            '',
                            `Recommended folder structure: ${recommendedFolderStructure}`
                        ]);
                    }
                    return;
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        console.error('Error using File System Access API:', err);
                        // Fall through to regular download
                    } else {
                        return; // User cancelled
                    }
                }
            }

            // Fallback: Create blob and download
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            if (!isAutoExport) {
                showExportMessage('Export Complete', [
                    `Successfully exported ${totalItems} items!`,
                    '',
                    `Watching: ${watching.length}`,
                    `Want to Watch: ${wantToWatch.length}`,
                    `Completed: ${completed.length}`,
                    '',
                    `Recommended folder structure: ${recommendedFolderStructure}`,
                    '',
                    `File saved as: ${filename}`
                ]);
            }
        }

        function importLists() {
            const fileInput = document.getElementById('importFileInput');
            if (!fileInput) {
                alert('Import feature not available');
                return;
            }

            // Reset file input and show import options modal
            fileInput.value = '';
            openImportOptionsModal();
        }

        function openImportOptionsModal() {
            const importModal = document.getElementById('importOptionsModal');
            if (importModal) {
                importModal.style.display = 'flex';
            }
        }

        function closeImportOptionsModal() {
            const importModal = document.getElementById('importOptionsModal');
            if (importModal) {
                importModal.style.display = 'none';
            }
        }

        function handleImportOption(option) {
            closeImportOptionsModal();
            const fileInput = document.getElementById('importFileInput');
            if (fileInput) {
                fileInput.setAttribute('data-import-option', option);
                fileInput.click();
            }
        }

        function handleFileImport(event) {
            const file = event.target.files[0];
            if (!file) {
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importData = JSON.parse(e.target.result);
                    
                    // Validate import data structure
                    if (!importData.profileName || importData.itemCount === undefined) {
                        alert('Invalid file format. Please ensure this is a valid export file.');
                        return;
                    }

                    const importOption = event.target.getAttribute('data-import-option');
                    const currentUser = users.find(u => u.id === currentUserId);
                    const currentItemCount = series.length;
                    
                    // Handle profile name and picture import (Option 2)
                    if (importOption === 'list-and-profile' && importData.profileName) {
                        if (currentUser) {
                            currentUser.name = importData.profileName;
                            if (importData.profilePicture) {
                                currentUser.picture = importData.profilePicture;
                            }
                            saveUsers();
                            updateCurrentUserDisplay();
                        }
                    }

                    // Check for duplicates before importing
                    const existingTitles = new Set(series.map(s => `${s.title.toLowerCase()}_${s.contentType || 'series'}`));
                    let skippedCount = 0;

                    // Merge imported items
                    let importedCount = 0;
                    const existingIds = new Set(series.map(s => s.id));

                    // Import watching items
                    if (importData.watching && Array.isArray(importData.watching)) {
                        importData.watching.forEach(item => {
                            // Skip if already exists (same title and content type)
                            const itemKey = `${item.title.toLowerCase()}_${item.contentType || 'series'}`;
                            if (existingTitles.has(itemKey)) {
                                skippedCount++;
                                return;
                            }
                            
                            // Generate new ID if ID already exists
                            let newId = item.id;
                            if (existingIds.has(newId)) {
                                newId = (series.length > 0 ? Math.max(...series.map(s => s.id)) : 0) + 1 + importedCount;
                            }
                            existingIds.add(newId);
                            existingTitles.add(itemKey);
                            
                            series.push({
                                ...item,
                                id: newId
                            });
                            importedCount++;
                        });
                    }

                    // Import want to watch items
                    if (importData.wantToWatch && Array.isArray(importData.wantToWatch)) {
                        importData.wantToWatch.forEach(item => {
                            const itemKey = `${item.title.toLowerCase()}_${item.contentType || 'series'}`;
                            if (existingTitles.has(itemKey)) {
                                skippedCount++;
                                return;
                            }
                            
                            let newId = item.id;
                            if (existingIds.has(newId)) {
                                newId = (series.length > 0 ? Math.max(...series.map(s => s.id)) : 0) + 1 + importedCount;
                            }
                            existingIds.add(newId);
                            existingTitles.add(itemKey);
                            
                            series.push({
                                ...item,
                                id: newId
                            });
                            importedCount++;
                        });
                    }

                    // Import completed items
                    if (importData.completed && Array.isArray(importData.completed)) {
                        importData.completed.forEach(item => {
                            const itemKey = `${item.title.toLowerCase()}_${item.contentType || 'series'}`;
                            if (existingTitles.has(itemKey)) {
                                skippedCount++;
                                return;
                            }
                            
                            let newId = item.id;
                            if (existingIds.has(newId)) {
                                newId = (series.length > 0 ? Math.max(...series.map(s => s.id)) : 0) + 1 + importedCount;
                            }
                            existingIds.add(newId);
                            existingTitles.add(itemKey);
                            
                            series.push({
                                ...item,
                                id: newId
                            });
                            importedCount++;
                        });
                    }

                    // Save imported data
                    saveData();
                    
                    // Ensure filter state is consistent
                    currentCategory = currentFilter;
                    
                    // Refresh display
                    renderSeries();
                    renderPriorityList();
                    renderStatistics();
                    
                    let message = `Successfully imported ${importedCount} items!`;
                    if (skippedCount > 0) {
                        message += `\n\n${skippedCount} items were skipped (already exist).`;
                    }
                    if (importOption === 'list-and-profile') {
                        message += `\n\nProfile name and picture have been updated.`;
                    }
                    message += `\n\nYour profile now has ${series.length} total items.`;
                    alert(message);
                    
                } catch (error) {
                    console.error('Import error:', error);
                    alert('Error importing file. Please ensure the file is a valid JSON export file.');
                }
            };

            reader.onerror = function() {
                alert('Error reading file');
            };

            reader.readAsText(file);
            
            // Reset file input
            event.target.value = '';
        }

        function loadData() {
            const key = currentUserId ? `seriesTrackerData_${currentUserId}` : 'seriesTrackerData';
            const stored = localStorage.getItem(key);
            
            if (stored) {
                try {
                    series = JSON.parse(stored);
                    // If user has empty array, keep it empty (don't load defaults)
                    if (Array.isArray(series)) {
                        return; // User has their own data (even if empty)
                    } else {
                        series = [];
                    }
                } catch (e) {
                    console.error('Error loading data:', e);
                    series = [];
                }
            } else {
                // No data for this user - check if this is the first user and migrate old data
                const isFirstUser = users.length > 0 && users[0].id === currentUserId;
                const oldData = localStorage.getItem('seriesTrackerData');
                
                if (isFirstUser && oldData) {
                    // Migrate old data to first user
                    try {
                        series = JSON.parse(oldData);
                        localStorage.setItem(key, oldData);
                        console.log('Migrated existing data to first user');
                    } catch (e) {
                        series = [];
                    }
                } else {
                    // New user or no old data - start empty
                    series = [];
                    // Save empty array so we know this user exists
                    localStorage.setItem(key, JSON.stringify([]));
                }
            }
        }

        function saveData() {
            const key = currentUserId ? `seriesTrackerData_${currentUserId}` : 'seriesTrackerData';
            localStorage.setItem(key, JSON.stringify(series));
        }

        let statisticsCollapsed = false;

        function loadSettings() {
            const key = currentUserId ? `seriesTrackerSettings_${currentUserId}` : 'seriesTrackerSettings';
            const settings = localStorage.getItem(key);
            if (settings) {
                try {
                    const parsed = JSON.parse(settings);
                    currentSort = parsed.sort || 'default';
                    currentViewSize = parsed.viewSize || 'normal';
                    customSizeValue = parsed.customSizeValue !== undefined ? parsed.customSizeValue : 50;
                    currentCategory = parsed.category || 'all';
                    currentContentFilter = parsed.contentFilter || 'all';
                    currentFilter = parsed.filter || 'watching';
                    currentTheme = parsed.theme || 'dark';
                    globalContentType = parsed.globalContentType || 'series';
                    customPrimaryColor = parsed.customPrimaryColor || '#141414';
                    customSecondaryColor = parsed.customSecondaryColor || '#e50914';
                    statisticsCollapsed = parsed.statisticsCollapsed !== undefined ? parsed.statisticsCollapsed : false;
                    // Restore status badge colors to pickers
                    if (parsed.customWatchingColor) { const el = document.getElementById('watchingColor'); if (el) el.value = parsed.customWatchingColor; }
                    if (parsed.customWantColor) { const el = document.getElementById('wantColor'); if (el) el.value = parsed.customWantColor; }
                    if (parsed.customCompletedColor) { const el = document.getElementById('completedColor'); if (el) el.value = parsed.customCompletedColor; }
                } catch (e) {
                    console.error('Error loading settings:', e);
                }
            }
        }

        function saveSettings() {
            const key = currentUserId ? `seriesTrackerSettings_${currentUserId}` : 'seriesTrackerSettings';
            const settingsData = {
                sort: currentSort,
                viewSize: currentViewSize,
                customSizeValue: customSizeValue,
                category: currentCategory,
                contentFilter: currentContentFilter,
                filter: currentFilter,
                theme: currentTheme,
                globalContentType: globalContentType,
                customPrimaryColor: customPrimaryColor,
                customSecondaryColor: customSecondaryColor,
                statisticsCollapsed: statisticsCollapsed,
                customWatchingColor: (document.getElementById('watchingColor') && document.getElementById('watchingColor').value) || '#e50914',
                customWantColor: (document.getElementById('wantColor') && document.getElementById('wantColor').value) || '#0062ff',
                customCompletedColor: (document.getElementById('completedColor') && document.getElementById('completedColor').value) || '#27ae60'
            };
            localStorage.setItem(key, JSON.stringify(settingsData));
        }

        function loadAppSettings() {
            const stored = localStorage.getItem('seriesTrackerAppSettings');
            if (stored) {
                try {
                    const loadedSettings = JSON.parse(stored);
                    settings = {
                        autoExport: loadedSettings.autoExport !== undefined ? loadedSettings.autoExport : false,
                        showIntro: loadedSettings.showIntro !== undefined ? loadedSettings.showIntro : true,
                        showNotifications: loadedSettings.showNotifications !== undefined ? loadedSettings.showNotifications : true,
                        autoSaveInterval: loadedSettings.autoSaveInterval || '1min'
                    };
                } catch (e) {
                    console.error('Error loading app settings:', e);
                    settings = {
                        autoExport: false,
                        showIntro: true,
                        showNotifications: true,
                        autoSaveInterval: '1min'
                    };
                }
            }
            // Update checkboxes
            const autoExportCheckbox = document.getElementById('settingAutoExport');
            const showIntroCheckbox = document.getElementById('settingShowIntro');
            const showNotificationsCheckbox = document.getElementById('settingShowNotifications');
            const autoSaveIntervalSelect = document.getElementById('settingAutoSaveInterval');
            
            if (autoExportCheckbox) autoExportCheckbox.checked = settings.autoExport;
            if (showIntroCheckbox) showIntroCheckbox.checked = settings.showIntro;
            if (showNotificationsCheckbox) showNotificationsCheckbox.checked = settings.showNotifications;
            if (autoSaveIntervalSelect) autoSaveIntervalSelect.value = settings.autoSaveInterval;
            
            // Setup auto-save interval
            setupAutoSaveInterval();
        }

        function saveAppSettings() {
            localStorage.setItem('seriesTrackerAppSettings', JSON.stringify(settings));
        }

        function getAutoSaveIntervalMs(interval) {
            switch(interval) {
                case '1min':
                    return 60 * 1000; // 1 minute
                case '10min':
                    return 10 * 60 * 1000; // 10 minutes
                case '1h':
                    return 60 * 60 * 1000; // 1 hour
                case '10h':
                    return 10 * 60 * 60 * 1000; // 10 hours
                case '1week':
                    return 7 * 24 * 60 * 60 * 1000; // 1 week
                default:
                    return null; // Off
            }
        }

        function setupAutoSaveInterval() {
            // Clear any existing interval
            if (autoSaveIntervalId) {
                clearInterval(autoSaveIntervalId);
                autoSaveIntervalId = null;
            }
            
            // Only setup if Auto Export checkbox is enabled AND interval is not 'off'
            if (settings.autoExport && settings.autoSaveInterval && settings.autoSaveInterval !== 'off') {
                const intervalMs = getAutoSaveIntervalMs(settings.autoSaveInterval);
                if (intervalMs) {
                    // Don't export immediately on setup (page reload) - only export on interval
                    // Set up periodic exporting
                    autoSaveIntervalId = setInterval(function() {
                        // Only export if user is on the site (page is visible) and auto export is still enabled
                        if (!document.hidden && settings.autoExport) {
                            exportLists(true); // Pass true to indicate auto-export
                            console.log('Auto-exported at', new Date().toLocaleTimeString());
                        }
                    }, intervalMs);
                }
            }
        }

        function checkCookieWarning() {
            const dismissed = localStorage.getItem('seriesTrackerCookieWarningDismissed');
            if (!dismissed && settings.showNotifications) {
                const cookieModal = document.getElementById('cookieWarningModal');
                if (cookieModal) {
                    cookieModal.style.display = 'flex';
                }
            }
        }

        function checkVideoIntro() {
            if (settings.showIntro) {
                const videoModal = document.getElementById('videoIntroModal');
                if (videoModal) {
                    // You can set a video source here
                    const video = document.getElementById('introVideo');
                    if (video) {
                        // video.src = 'path/to/intro-video.mp4';
                        // Uncomment and set video source when available
                        videoModal.style.display = 'flex';
                        videoModal.addEventListener('click', function(e) {
                            if (e.target === videoModal) {
                                closeVideoIntro();
                            }
                        });
                    }
                }
            }
        }

        function closeVideoIntro() {
            const videoModal = document.getElementById('videoIntroModal');
            const video = document.getElementById('introVideo');
            if (video) {
                video.pause();
                video.currentTime = 0;
            }
            if (videoModal) {
                videoModal.style.display = 'none';
                // Don't save to localStorage - allow it to show every time if enabled
            }
        }


        function applyTheme(theme) {
            currentTheme = theme;
            if (theme === 'light') {
                document.body.classList.add('light-theme');
                document.body.classList.remove('custom-theme');
                document.body.style.setProperty('--primary-color', '');
                document.body.style.setProperty('--secondary-color', '');
                document.documentElement.style.removeProperty('--watching-color');
                document.documentElement.style.removeProperty('--want-color');
                document.documentElement.style.removeProperty('--completed-color');
            } else if (theme === 'custom') {
                document.body.classList.remove('light-theme');
                document.body.classList.add('custom-theme');
                document.body.style.setProperty('--primary-color', customPrimaryColor);
                document.body.style.setProperty('--secondary-color', customSecondaryColor);
                // Apply saved status badge colors
                const wc = (document.getElementById('watchingColor') && document.getElementById('watchingColor').value) || '#e50914';
                const wt = (document.getElementById('wantColor') && document.getElementById('wantColor').value) || '#0062ff';
                const cc = (document.getElementById('completedColor') && document.getElementById('completedColor').value) || '#27ae60';
                document.documentElement.style.setProperty('--watching-color', wc);
                document.documentElement.style.setProperty('--want-color', wt);
                document.documentElement.style.setProperty('--completed-color', cc);
            } else {
                document.body.classList.remove('light-theme');
                document.body.classList.remove('custom-theme');
                document.body.style.setProperty('--primary-color', '');
                document.body.style.setProperty('--secondary-color', '');
                document.documentElement.style.removeProperty('--watching-color');
                document.documentElement.style.removeProperty('--want-color');
                document.documentElement.style.removeProperty('--completed-color');
            }
            saveSettings();
        }

        function getDefaultData() {
            return [
                {
                    id: 1,
                    title: "The Blacklist",
                    image: "https://m.media-amazon.com/images/M/MV5BNDk4MGU4NTItNDMyMC00NjQ0LWFlMWUtYzJlMTM1M2M2ZTU3XkEyXkFqcGc@._V1_.jpg",
                    genre: "Crime, Drama, Thriller",
                    status: "watching",
                    contentType: "series",
                    season: 3,
                    episode: 12,
                    time: 23,
                    totalSeasons: 10,
                    totalEpisodes: 22,
                    imdbRating: "8.0",
                    language: "English",
                    streamingService: "netflix",
                    inQueue: true,
                    queueOrder: 0
                },
                {
                    id: 2,
                    title: "Breaking Bad",
                    image: "https://m.media-amazon.com/images/M/MV5BMzU5ZGYzNmQtMTdhYy00OGRiLTg0NmQtYjVjNzliZTg1ZGE4XkEyXkFqcGc@._V1_QL75_UX190_CR0,2,190,281_.jpg",
                    genre: "Crime, Drama, Thriller",
                    status: "completed",
                    contentType: "series",
                    season: 5,
                    episode: 16,
                    time: 40,
                    totalSeasons: 5,
                    totalEpisodes: 16,
                    imdbRating: "9.5",
                    language: "English",
                    streamingService: "netflix",
                    inQueue: false,
                    queueOrder: -1
                },
                {
                    id: 3,
                    title: "Stranger Things",
                    image: "https://m.media-amazon.com/images/I/81DrD8zq1XL._UF894,1000_QL80_.jpg",
                    genre: "Drama, Fantasy, Horror",
                    status: "want",
                    contentType: "series",
                    season: 1,
                    episode: 1,
                    time: 0,
                    totalSeasons: 4,
                    totalEpisodes: 8,
                    imdbRating: "8.7",
                    language: "English",
                    streamingService: "netflix",
                    inQueue: true,
                    queueOrder: 1
                }
            ];
        }

        const seriesList = document.getElementById('seriesList');
        const priorityList = document.getElementById('priorityList');

        // Calculate custom size based on slider value (0-100)
        // 0 = mini (5x smaller than small), 100 = giant (5x bigger than large)
        function getCustomSize(sliderValue) {
            // Define size points:
            // Mini: 20px width, 30px height, 0.6rem title (5x smaller than small)
            // Small: 100px width, 150px height, 1.2rem title
            // Normal: 150px width, 225px height, 1.5rem title
            // Large: 200px width, 300px height, 1.8rem title
            // Giant: 1000px width, 1500px height, 9rem title (5x bigger than large)
            
            const mini = { width: 20, height: 30, title: 0.6 };
            const small = { width: 100, height: 150, title: 1.2 };
            const normal = { width: 150, height: 225, title: 1.5 };
            const large = { width: 200, height: 300, title: 1.8 };
            const giant = { width: 1000, height: 1500, title: 9 };
            
            // Interpolate between points
            let width, height, title;
            
            if (sliderValue <= 25) {
                // Between mini (0) and small (25)
                const t = sliderValue / 25;
                width = mini.width + (small.width - mini.width) * t;
                height = mini.height + (small.height - mini.height) * t;
                title = mini.title + (small.title - mini.title) * t;
            } else if (sliderValue <= 50) {
                // Between small (25) and normal (50)
                const t = (sliderValue - 25) / 25;
                width = small.width + (normal.width - small.width) * t;
                height = small.height + (normal.height - small.height) * t;
                title = small.title + (normal.title - small.title) * t;
            } else if (sliderValue <= 75) {
                // Between normal (50) and large (75)
                const t = (sliderValue - 50) / 25;
                width = normal.width + (large.width - normal.width) * t;
                height = normal.height + (large.height - normal.height) * t;
                title = normal.title + (large.title - normal.title) * t;
            } else {
                // Between large (75) and giant (100)
                const t = (sliderValue - 75) / 25;
                width = large.width + (giant.width - large.width) * t;
                height = large.height + (giant.height - large.height) * t;
                title = large.title + (giant.title - large.title) * t;
            }
            
            return {
                width: Math.round(width),
                height: Math.round(height),
                title: Math.round(title * 100) / 100
            };
        }
        const seriesModal = document.getElementById('seriesModal');
        const modalTitle = document.getElementById('modalTitle');
        const seriesForm = document.getElementById('seriesForm');
        const addSeriesBtn = document.getElementById('addSeriesBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const filterBtns = document.querySelectorAll('.filter-btn');
        const searchInput = document.getElementById('searchInput');

        function getLocalDateString() {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        function formatTime(minutes) {
            if (minutes === 0) return '0m';
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            if (hours === 0) return `${mins}m`;
            if (mins === 0) return `${hours}h`;
            return `${hours}h ${mins}m`;
        }

        function getTimelineStartDate() {
            const now = new Date();
            if (timelineRange === '1m') {
                const d = new Date(now);
                d.setMonth(d.getMonth() - 1);
                return d;
            }
            if (timelineRange === '1y') {
                const d = new Date(now);
                d.setFullYear(d.getFullYear() - 1);
                return d;
            }
            return null;
        }

        function applyWantToWatchRules(formData) {
            if (formData.status !== 'want') return formData;
            return {
                ...formData,
                time: 0,
                userRating: 0,
                startedDate: null,
                completedDate: null,
                lastWatchedDate: null
            };
        }

        function markEpisodeWatched(id) {
            const idx = series.findIndex(s => s.id === id);
            if (idx === -1) return;
            const s = series[idx];
            const today = getLocalDateString();
            const isSeries = (s.contentType || 'series') === 'series';

            // Log the current episode / movie watch event
            s.lastWatchedDate = today;
            if (!s.startedDate) s.startedDate = today;

            addWatchHistoryEntry(s, {
                season:  isSeries ? (s.season  || 1) : null,
                episode: isSeries ? (s.episode || 1) : null
            });

            // Advance episode for series
            if (isSeries && s.status === 'watching') {
                const totalEp = s.totalEpisodes || 10;
                const totalSe = s.totalSeasons  || 1;
                const currentEp = s.episode || 1;
                const currentSe = s.season  || 1;

                if (currentEp < totalEp) {
                    // Next episode in same season
                    s.episode = currentEp + 1;
                } else if (currentSe < totalSe) {
                    const goNextSeason = confirm(`You reached the listed total episodes for Season ${currentSe}.\n\nChoose OK to go to next season, or Cancel to set total episodes for this season to ${currentEp + 1}.`);
                    if (goNextSeason) {
                        s.season  = currentSe + 1;
                        s.episode = 1;
                    } else {
                        s.totalEpisodes = currentEp + 1;
                        s.episode = currentEp + 1;
                    }
                } else {
                    // Was the final episode — mark completed
                    s.status = 'completed';
                    if (!s.completedDate) s.completedDate = today;
                }
            }

            saveData();
            renderSeries();
            renderStatistics();

            // Visual feedback toast
            showTrackingToast(isSeries
                ? (s.status === 'completed'
                    ? `${s.title} — Completed!`
                    : `${s.title} — S${series[idx].season} E${series[idx].episode} up next`)
                : `${s.title} — Logged as watched`);
        }

        function showTrackingToast(msg) {
            let toast = document.getElementById('trackingToast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'trackingToast';
                toast.style.cssText = [
                    'position:fixed', 'bottom:28px', 'left:50%',
                    'transform:translateX(-50%) translateY(0)',
                    'background:var(--secondary-color,#e50914)',
                    'color:#fff', 'padding:10px 22px', 'border-radius:8px',
                    'font-size:0.88rem', 'font-weight:600',
                    'box-shadow:0 8px 24px rgba(0,0,0,0.5)',
                    'z-index:9999', 'pointer-events:none',
                    'transition:opacity 0.3s, transform 0.3s',
                    'white-space:nowrap', 'max-width:90vw',
                    'text-align:center'
                ].join(';');
                document.body.appendChild(toast);
            }
            toast.textContent = msg;
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
            clearTimeout(toast._hideTimer);
            toast._hideTimer = setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(-50%) translateY(10px)';
            }, 2800);
        }

        function showExportMessage(title, lines) {
            const modal = document.getElementById('exportMessageModal');
            const titleEl = document.getElementById('exportMessageTitle');
            const bodyEl = document.getElementById('exportMessageBody');
            if (!modal || !titleEl || !bodyEl) {
                alert(lines.join('\n'));
                return;
            }
            titleEl.textContent = title;
            bodyEl.innerHTML = lines.map(line => `<div>${line}</div>`).join('');
            modal.style.display = 'flex';
        }

        function startWatchTimer(serieId) {
            const s = series.find(item => item.id === serieId);
            if (!s) return;
            const maxTime = parseInt(s.maxTime || 0);
            if (maxTime <= 0) {
                alert('Please set "Max Time To Finish" first.');
                return;
            }
            if (!confirm(`Start watching "${s.title}" now?`)) return;
            s.status = 'watching';
            if (!s.startedDate) s.startedDate = getLocalDateString();
            saveData();
            renderSeries();
            renderStatistics();
            showTrackingToast(`${s.title} — Timer started`);

            if (activeWatchTimers.has(serieId)) clearTimeout(activeWatchTimers.get(serieId));
            const ms = maxTime * 60 * 1000;
            const timerId = setTimeout(() => {
                const target = series.find(item => item.id === serieId);
                if (!target) return;
                const isMovie = (target.contentType || 'series') === 'movie';
                if (isMovie) {
                    target.status = 'completed';
                    target.time = maxTime;
                    target.completedDate = getLocalDateString();
                } else {
                    const currentEp = target.episode || 1;
                    const currentSe = target.season || 1;
                    const totalEp = target.totalEpisodes || 10;
                    const totalSe = target.totalSeasons || 1;
                    if (currentEp >= totalEp && currentSe >= totalSe) {
                        target.status = 'completed';
                        target.time = maxTime;
                        target.completedDate = getLocalDateString();
                    } else if (currentEp >= totalEp && currentSe < totalSe) {
                        target.season = currentSe + 1;
                        target.episode = 1;
                        target.status = 'watching';
                    } else {
                        target.episode = currentEp + 1;
                        target.status = 'watching';
                    }
                }
                saveData();
                renderSeries();
                renderStatistics();
                showTrackingToast(target.status === 'completed' ? `${target.title} got finished now` : `${target.title} advanced to S${target.season} E${target.episode}`);
                const seriesEnded = target.season >= (target.totalSeasons || 1) && target.episode >= (target.totalEpisodes || 1);
                if (isMovie || seriesEnded) editSeries(serieId);
            }, ms);
            activeWatchTimers.set(serieId, timerId);
        }

        function renderSeries() {
            const term = searchInput ? searchInput.value.toLowerCase().trim() : '';
            
            seriesList.innerHTML = '';
            
            let filteredSeries = series.filter(serie => {
                const matchesFilter = currentFilter === 'all' || serie.status === currentFilter;
                const matchesContentFilter = currentContentFilter === 'all' || 
                    (serie.contentType || 'series') === currentContentFilter;
                const matchesSearch = term === '' || 
                    serie.title.toLowerCase().includes(term) ||
                    (serie.genre && serie.genre.toLowerCase().includes(term));
                
                return matchesFilter && matchesContentFilter && matchesSearch;
            });
            
            switch(currentSort) {
                case 'title-asc':
                    filteredSeries.sort((a, b) => a.title.localeCompare(b.title));
                    break;
                case 'title-desc':
                    filteredSeries.sort((a, b) => b.title.localeCompare(a.title));
                    break;
                case 'time-desc':
                    filteredSeries.sort((a, b) => b.time - a.time);
                    break;
                case 'time-asc':
                    filteredSeries.sort((a, b) => a.time - b.time);
                    break;
                default:
                    filteredSeries.sort((a, b) => a.id - b.id);
            }
            
            if (filteredSeries.length === 0) {
                seriesList.innerHTML = `
                    <div class="empty-state">
                        <h3>No series found</h3>
                        <p>${term ? 'Try a different search term or use a different filter' : 'Add a new series to get started!'}</p>
                    </div>
                `;
                return;
            }
            
            filteredSeries.forEach(serie => {
                const statusText = {
                    'watching': 'Currently Watching',
                    'want': 'Want to Watch',
                    'completed': 'Completed'
                };
                
                const statusClass = {
                    'watching': 'status-watching',
                    'want': 'status-want',
                    'completed': 'status-completed'
                };
                
                const isExpanded = expandedSeriesId === serie.id;
                const contentType = serie.contentType || 'series';
                const isSeries = contentType === 'series';
                const showTimeRating = serie.status !== 'want';
                const seasonProgress = serie.totalSeasons ? `${serie.season}/${serie.totalSeasons}` : `S${serie.season}`;
                const episodeProgress = serie.totalEpisodes ? `${serie.episode}/${serie.totalEpisodes}` : `E${serie.episode}`;
                const primaryService = serie.streamingService ? serie.streamingService.split(',')[0].trim() : '';
                const streamingIcon = isSeries && primaryService && streamingIcons[primaryService] 
                    ? `<img src="${streamingIcons[primaryService]}" alt="${primaryService}" class="streaming-service-icon" title="Watch on ${primaryService.charAt(0).toUpperCase() + primaryService.slice(1)}" loading="lazy" decoding="async" onerror="this.onerror=null; this.src=getFallbackServiceIcon('${primaryService}');" onclick="event.stopPropagation(); openStreamingService('${primaryService}', '${serie.title.replace(/'/g,"\\'")}');" style="cursor:pointer;">` 
                    : '';
                
                const item = document.createElement('div');
                item.className = `series-item ${currentViewSize === 'custom' ? '' : currentViewSize} ${serie.status === 'completed' ? 'status-completed-item' : serie.status === 'watching' ? 'status-watching-item' : serie.status === 'want' ? 'status-want-item' : ''}`;
                
                // Apply custom sizes if custom view size is selected
                let thumbnailStyle = '';
                let titleStyle = '';
                if (currentViewSize === 'custom') {
                    const customSize = getCustomSize(customSizeValue);
                    thumbnailStyle = `style="width: ${customSize.width}px; height: ${customSize.height}px;"`;
                    titleStyle = `style="font-size: ${customSize.title}rem;"`;
                }
                
                // Calculate progress percentage
                let progressPercent = 0;
                if (isSeries && serie.totalSeasons && serie.totalEpisodes) {
                    const totalEpisodes = serie.totalSeasons * serie.totalEpisodes;
                    const watchedEpisodes = (serie.season - 1) * serie.totalEpisodes + serie.episode;
                    progressPercent = Math.min(100, Math.round((watchedEpisodes / totalEpisodes) * 100));
                } else if (!isSeries) {
                    progressPercent = serie.status === 'completed' ? 100 : 0;
                }

                // User rating display
                const userRating = serie.userRating || 0;
                let ratingDisplay = '';
                if (showTimeRating && userRating > 0) {
                    ratingDisplay = '<div class="user-rating-display" style="display: flex; gap: 2px; margin-top: 5px; align-items: center;">';
                    for (let i = 1; i <= 5; i++) {
                        const gid = `hg_${serie.id}_${i}`;
                        if (userRating >= i) {
                            ratingDisplay += `<svg width="16" height="16" viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="#ffd700" stroke="#ffd700" stroke-width="1"/></svg>`;
                        } else if (userRating >= i - 0.5) {
                            ratingDisplay += `<svg width="16" height="16" viewBox="0 0 24 24"><defs><linearGradient id="${gid}" x1="0" x2="1" y1="0" y2="0"><stop offset="50%" stop-color="#ffd700"/><stop offset="50%" stop-color="#444"/></linearGradient></defs><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="url(#${gid})" stroke="#ffd700" stroke-width="1"/></svg>`;
                        } else {
                            ratingDisplay += `<svg width="16" height="16" viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="#444" stroke="#666" stroke-width="1"/></svg>`;
                        }
                    }
                    ratingDisplay += `<span style="color:#999; font-size:0.8rem; margin-left:3px;">${userRating}/5</span>`;
                    ratingDisplay += '</div>';
                }

                // Tags display
                const tags = serie.tags || [];
                let tagsDisplay = '';
                if (tags.length > 0) {
                    tagsDisplay = '<div class="tags-container">';
                    tags.forEach(tag => {
                        tagsDisplay += `<span class="tag">${tag}</span>`;
                    });
                    tagsDisplay += '</div>';
                }

                // Date displays
                let datesDisplay = '';
                if (serie.startedDate || serie.completedDate || serie.lastWatchedDate) {
                    datesDisplay = '<div style="margin-top: 8px; font-size: 0.85rem; color: #999;">';
                    if (serie.startedDate) datesDisplay += `<div>Started: ${new Date(serie.startedDate).toLocaleDateString()}</div>`;
                    if (serie.completedDate) datesDisplay += `<div>Completed: ${new Date(serie.completedDate).toLocaleDateString()}</div>`;
                    if (serie.lastWatchedDate) datesDisplay += `<div>Last Watched: ${new Date(serie.lastWatchedDate).toLocaleDateString()}</div>`;
                    datesDisplay += '</div>';
                }

                item.innerHTML = `
                    <input type="checkbox" class="series-item-checkbox" id="checkbox-${serie.id}" data-id="${serie.id}" onchange="window.updateBulkOperations()">
                    <label for="checkbox-${serie.id}" class="series-item-checkbox-label"></label>
                    <div class="series-header" data-id="${serie.id}">
                        <img src="${serie.image}" alt="${serie.title}" class="series-thumbnail" ${thumbnailStyle} loading="lazy" decoding="async" onerror="this.onerror=null; this.src='https://via.placeholder.com/150/333/fff?text=No+Image';">
                        <div class="series-main-info">
                            <div class="series-title-row">
                                <div>
                                    <h3 class="series-title" ${titleStyle}>${serie.title}${streamingIcon}</h3>
                                    <span class="status-badge ${statusClass[serie.status]}">${statusText[serie.status]}</span>
                                    ${ratingDisplay}
                                    ${tagsDisplay}
                                </div>
                                <span class="expand-icon ${isExpanded ? 'expanded' : ''}">▼</span>
                            </div>
                            ${progressPercent > 0 ? `
                            <div class="progress-bar-container">
                                <div class="progress-bar-label">
                                    <span>Progress</span>
                                    <span>${progressPercent}%</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-bar-fill" style="width: ${progressPercent}%"></div>
                                </div>
                            </div>
                            ` : ''}
                            <div class="series-stats">
                                ${isSeries ? `
                                <div class="stat-item">
                                    <span class="stat-label">Progress</span>
                                    <span class="stat-value">S${serie.season} E${serie.episode}</span>
                                </div>
                                ` : ''}
                                ${showTimeRating ? `<div class="stat-item">
                                    <span class="stat-label">Time In</span>
                                    <span class="stat-value">${formatTime(serie.time)}</span>
                                </div>` : ''}
                                ${serie.genre ? `
                                <div class="stat-item">
                                    <span class="stat-label">Genre</span>
                                    <span class="stat-value">${serie.genre}</span>
                                </div>
                                ` : ''}
                            </div>
                            ${datesDisplay}
                        </div>
                    </div>
                    <div class="series-details ${isExpanded ? 'expanded' : ''}" id="details-${serie.id}">
                        <div class="series-details-content">
                            <div class="details-section">
                                <div class="details-actions">
                                    ${isSeries ? `<button class="btn btn-small mark-ep-btn" data-id="${serie.id}" title="Log current episode as watched and advance to next">
                                        <svg style="width:13px;height:13px;vertical-align:-2px;margin-right:5px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Episode Watched</button>` : `<button class="btn btn-small mark-ep-btn" data-id="${serie.id}" title="Log this movie as watched">
                                        <svg style="width:13px;height:13px;vertical-align:-2px;margin-right:5px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Mark Watched</button>`}
                                    <button class="btn btn-small edit-btn" data-id="${serie.id}">Edit</button>
                                    <button class="btn btn-small more-btn" data-id="${serie.id}">More</button>
                                    <button class="btn btn-secondary btn-small delete-btn" data-id="${serie.id}">Delete</button>
                                </div>
                            </div>
                            <div class="more-info-section" id="more-info-${serie.id}" style="display: none;">
                                <div class="more-info-grid">
                                    ${isSeries ? `
                                    <div class="more-info-item">
                                        <h4>Timeline</h4>
                                        <p>S ${seasonProgress} · EP ${episodeProgress}</p>
                                    </div>
                                    ` : ''}
                                    ${userRating > 0 ? `
                                    <div class="more-info-item">
                                        <h4>Your Rating</h4>
                                        <div style="display:flex;gap:2px;align-items:center;margin-top:4px;">
                                            ${[1,2,3,4,5].map(i => {
                                                if (userRating >= i) return `<svg width="18" height="18" viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="#ffd700" stroke="#ffd700" stroke-width="1"/></svg>`;
                                                if (userRating >= i - 0.5) return `<svg width="18" height="18" viewBox="0 0 24 24"><defs><linearGradient id="mhg${i}" x1="0" x2="1" y1="0" y2="0"><stop offset="50%" stop-color="#ffd700"/><stop offset="50%" stop-color="#333"/></linearGradient></defs><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="url(#mhg${i})" stroke="#ffd700" stroke-width="1"/></svg>`;
                                                return `<svg width="18" height="18" viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="#333" stroke="#555" stroke-width="1"/></svg>`;
                                            }).join('')}
                                            <span style="color:#999;font-size:0.85rem;margin-left:4px;">${userRating}/5</span>
                                        </div>
                                    </div>
                                    ` : ''}
                                    <div class="more-info-item">
                                        <h4>IMDB Rating</h4>
                                        <p> ${serie.imdbRating || 'Not rated'}</p>
                                    </div>
                                    <div class="more-info-item">
                                        <h4>Language</h4>
                                        <p>${serie.language || 'Not specified'}</p>
                                    </div>
                                    ${serie.notes ? `
                                    <div class="more-info-item" style="grid-column: 1 / -1;">
                                        <h4>Notes</h4>
                                        <div class="notes-display">${serie.notes}</div>
                                    </div>
                                    ` : ''}
                                    ${isSeries && serie.streamingService ? `
                                    <div class="more-info-item">
                                        <h4>Streaming Service</h4>
                                        <div style="display:flex; gap:10px; flex-wrap:wrap;">
                                        ${serie.streamingService.split(',').map(s => s.trim()).filter(Boolean).map(svc => `
                                            <div class="streaming-service-container" onclick="openStreamingService('${svc}', '${serie.title.replace(/'/g,"\\'")}');" style="cursor:pointer;" title="Watch on ${svc.charAt(0).toUpperCase() + svc.slice(1)}">
                                                <img src="${streamingIcons[svc] || ''}" alt="${svc}" class="streaming-service-icon" style="width: 40px; height: 40px;" loading="lazy" decoding="async" onerror="this.onerror=null; this.src=getFallbackServiceIcon('${svc}');">
                                                <p style="margin: 0; text-decoration: underline;">${svc.charAt(0).toUpperCase() + svc.slice(1)} ↗</p>
                                            </div>
                                        `).join('')}
                                        </div>
                                    </div>
                                    ` : ''}
                                    ${datesDisplay ? `
                                    <div class="more-info-item" style="grid-column: 1 / -1;">
                                        <h4>Dates</h4>
                                        ${datesDisplay}
                                    </div>
                                    ` : ''}
                                    ${(serie.actors && serie.actors.length > 0) ? `
                                    <div class="more-info-item" style="grid-column: 1 / -1;">
                                        <h4>Favourite Actors</h4>
                                        <div class="actors-grid">
                                            ${serie.actors.filter(a => a.name).map(a => `
                                                <div class="actor-card">
                                                    <img src="${a.img || 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'}" alt="${a.name}" onerror="this.src='https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'">
                                                    <span>${a.name}</span>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                seriesList.appendChild(item);
            });
            
            document.querySelectorAll('.series-header').forEach(header => {
                header.addEventListener('click', (e) => {
                    const id = parseInt(e.currentTarget.getAttribute('data-id'));
                    toggleSeriesDetails(id);
                });
                let holdTimer = null;
                const beginHold = () => {
                    const id = parseInt(header.getAttribute('data-id'));
                    const s = series.find(item => item.id === id);
                    if (!s || (s.status !== 'want' && s.status !== 'watching')) return;
                    holdTimer = setTimeout(() => startWatchTimer(id), 650);
                };
                const cancelHold = () => {
                    if (holdTimer) clearTimeout(holdTimer);
                    holdTimer = null;
                };
                header.addEventListener('mousedown', beginHold);
                header.addEventListener('mouseup', cancelHold);
                header.addEventListener('mouseleave', cancelHold);
                header.addEventListener('touchstart', beginHold, { passive: true });
                header.addEventListener('touchend', cancelHold);
            });
            
            // Mark episode watched button
            document.querySelectorAll('.mark-ep-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = parseInt(btn.getAttribute('data-id'));
                    markEpisodeWatched(id);
                });
            });

            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = parseInt(e.currentTarget.getAttribute('data-id'));
                    editSeries(id);
                });
            });
            
            document.querySelectorAll('.more-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = parseInt(e.currentTarget.getAttribute('data-id'));
                    toggleMoreInfo(id);
                });
            });
            
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = parseInt(e.currentTarget.getAttribute('data-id'));
                    deleteSeries(id);
                });
            });

            // Checkbox event listeners for bulk operations
            document.querySelectorAll('.series-item-checkbox').forEach(checkbox => {
                checkbox.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent triggering series header click
                });
                checkbox.addEventListener('change', () => {
                    updateBulkOperations();
                });
            });

            // Update bulk operations after rendering
            updateBulkOperations();
        }

        // Statistics Dashboard
        function renderStatistics() {
            const statsGrid = document.getElementById('statsGrid');
            const genreList = document.getElementById('genreList');
            
            if (!statsGrid || !genreList) return;

            const totalItems = series.length;
            const watching = series.filter(s => s.status === 'watching').length;
            const wantToWatch = series.filter(s => s.status === 'want').length;
            const completed = series.filter(s => s.status === 'completed').length;
            const totalTime = series.reduce((sum, s) => {
                const t = s.time || 0;
                if (t === 0) return sum;
                const ct = s.contentType || 'series';
                if (ct === 'movie') return sum + t;
                const eps = s.totalEpisodes || 10;
                const curSeason = s.season || 1;
                const curEpisode = s.episode || 1;
                const watchedEps = (curSeason - 1) * eps + curEpisode;
                return sum + (t * watchedEps);
            }, 0);
            const completionRate = totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0;
            const averageRating = series.filter(s => s.userRating > 0).length > 0
                ? (series.filter(s => s.userRating > 0).reduce((sum, s) => sum + s.userRating, 0) / series.filter(s => s.userRating > 0).length).toFixed(1)
                : 0;

            statsGrid.innerHTML = `
                <div class="stat-card">
                    <div class="stat-card-value">${totalItems}</div>
                    <div class="stat-card-label">Total Items</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-value">${watching}</div>
                    <div class="stat-card-label">Watching</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-value">${wantToWatch}</div>
                    <div class="stat-card-label">Want to Watch</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-value">${completed}</div>
                    <div class="stat-card-label">Completed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-value">${formatTime(totalTime)}</div>
                    <div class="stat-card-label">Total Time</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-value">${completionRate}%</div>
                    <div class="stat-card-label">Completion Rate</div>
                </div>
                ${averageRating > 0 ? `
                <div class="stat-card">
                    <div class="stat-card-value">${averageRating}</div>
                    <div class="stat-card-label">Avg Rating</div>
                </div>
                ` : ''}
            `;

            if (totalItems > 0) {
                const wPct = Math.round((watching / totalItems) * 100);
                const wtPct = Math.round((wantToWatch / totalItems) * 100);
                const cPct = 100 - wPct - wtPct;
                let distBar = document.getElementById('statusDistBar');
                if (!distBar) {
                    distBar = document.createElement('div');
                    distBar.id = 'statusDistBar';
                    statsGrid.parentNode.insertBefore(distBar, statsGrid.nextSibling);
                }
                distBar.style.cssText = 'margin-top:16px;';
                distBar.innerHTML = `
                    <div style="font-size:0.85rem;color:#999;margin-bottom:6px;font-weight:600;">Status Distribution</div>
                    <div style="display:flex;height:10px;border-radius:5px;overflow:hidden;background:rgba(255,255,255,0.05);">
                        <div style="width:${wPct}%;background:var(--watching-color,#e50914);transition:width 0.3s;" title="Watching ${wPct}%"></div>
                        <div style="width:${wtPct}%;background:var(--want-color,#0062ff);transition:width 0.3s;" title="Want ${wtPct}%"></div>
                        <div style="width:${cPct}%;background:var(--completed-color,#27ae60);transition:width 0.3s;" title="Completed ${cPct}%"></div>
                    </div>
                    <div style="display:flex;gap:14px;margin-top:6px;font-size:0.78rem;color:#999;">
                        <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--watching-color,#e50914);margin-right:4px;"></span>Watching ${wPct}%</span>
                        <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--want-color,#0062ff);margin-right:4px;"></span>Want ${wtPct}%</span>
                        <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--completed-color,#27ae60);margin-right:4px;"></span>Completed ${cPct}%</span>
                    </div>
                `;
            } else {
                const existing = document.getElementById('statusDistBar');
                if (existing) existing.remove();
            }

            // Genre breakdown
            const genreCounts = {};
            series.forEach(s => {
                if (s.genre) {
                    const genres = s.genre.split(',').map(g => g.trim());
                    genres.forEach(genre => {
                        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
                    });
                }
            });

            const sortedGenres = Object.entries(genreCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10); // Top 10 genres

            if (sortedGenres.length > 0) {
                genreList.innerHTML = sortedGenres.map(([genre, count]) => `
                    <div class="genre-item">
                        <span class="genre-name">${genre}</span>
                        <span class="genre-count">${count} item${count !== 1 ? 's' : ''}</span>
                    </div>
                `).join('');
            } else {
                genreList.innerHTML = '<div style="color: #999; font-size: 0.9rem;">No genres added yet</div>';
            }
            renderWatchTimeline();
        }

        // Bulk Operations
        let selectedSeriesIds = new Set();

        // Make updateBulkOperations globally accessible for inline handlers
        window.updateBulkOperations = function() {
            const checkboxes = document.querySelectorAll('.series-item-checkbox:checked');
            selectedSeriesIds = new Set(Array.from(checkboxes).map(cb => parseInt(cb.getAttribute('data-id'))));
            
            const bulkOperations = document.getElementById('bulkOperations');
            const bulkOperationsCount = document.getElementById('bulkOperationsCount');
            
            if (bulkOperations && bulkOperationsCount) {
                if (selectedSeriesIds.size > 0) {
                    bulkOperations.classList.add('active');
                    bulkOperationsCount.textContent = `${selectedSeriesIds.size} item${selectedSeriesIds.size !== 1 ? 's' : ''} selected`;
                    
                    // Update selected items styling
                    document.querySelectorAll('.series-item').forEach(item => {
                        const checkbox = item.querySelector('.series-item-checkbox');
                        if (checkbox && selectedSeriesIds.has(parseInt(checkbox.getAttribute('data-id')))) {
                            item.classList.add('selected');
                        } else {
                            item.classList.remove('selected');
                        }
                    });
                } else {
                    bulkOperations.classList.remove('active');
                    document.querySelectorAll('.series-item').forEach(item => {
                        item.classList.remove('selected');
                    });
                }
            }
        }

        function bulkDelete() {
            if (selectedSeriesIds.size === 0) return;
            if (!confirm(`Delete ${selectedSeriesIds.size} item${selectedSeriesIds.size !== 1 ? 's' : ''}?`)) return;
            
            series = series.filter(s => !selectedSeriesIds.has(s.id));
            selectedSeriesIds.clear();
            saveData();
            renderSeries();
            renderPriorityList();
            renderStatistics();
            updateCurrentUserDisplay();
        }

        function bulkChangeStatus(newStatus) {
            if (selectedSeriesIds.size === 0) return;
            
            series.forEach(s => {
                if (selectedSeriesIds.has(s.id)) {
                    s.status = newStatus;
                    // Auto-update dates
                    if (newStatus === 'watching' && !s.startedDate) {
                        s.startedDate = getLocalDateString();
                    }
                    if (newStatus === 'watching') {
                        s.lastWatchedDate = getLocalDateString();
                        addWatchHistoryEntry(s, {
                            season: (s.contentType || 'series') === 'series' ? (s.season || 1) : null,
                            episode: (s.contentType || 'series') === 'series' ? (s.episode || 1) : null
                        });
                    }
                    if (newStatus === 'completed' && !s.completedDate) {
                        s.completedDate = getLocalDateString();
                    }
                }
            });
            
            selectedSeriesIds.clear();
            saveData();
            renderSeries();
            renderPriorityList();
            renderStatistics();
        }

        function bulkToggleQueue(addToQueue) {
            if (selectedSeriesIds.size === 0) return;
            
            series.forEach(s => {
                if (selectedSeriesIds.has(s.id)) {
                    s.inQueue = addToQueue;
                    if (addToQueue && s.queueOrder === -1) {
                        const maxOrder = Math.max(...series.filter(s => s.inQueue).map(s => s.queueOrder), -1);
                        s.queueOrder = maxOrder + 1;
                    } else if (!addToQueue) {
                        s.queueOrder = -1;
                    }
                }
            });
            
            selectedSeriesIds.clear();
            saveData();
            renderSeries();
            renderPriorityList();
            renderStatistics();
        }

        function toggleSeriesDetails(id) {
            if (expandedSeriesId === id) {
                expandedSeriesId = null;
            } else {
                expandedSeriesId = id;
            }
            renderSeries();
            renderStatistics();
        }

        function toggleMoreInfo(id) {
            const moreInfo = document.getElementById(`more-info-${id}`);
            if (moreInfo) {
                if (moreInfo.style.display === 'none') {
                    moreInfo.style.display = 'block';
                } else {
                    moreInfo.style.display = 'none';
                }
            }
        }

        function renderPriorityList() {
            priorityList.innerHTML = '';
            
            const queueSeries = series
                .filter(serie => serie.inQueue)
                .sort((a, b) => a.queueOrder - b.queueOrder);
            
            if (queueSeries.length === 0) {
                priorityList.innerHTML = `
                    <div class="empty-state">
                        <h3>No series in queue</h3>
                        <p>Add series to your watchlist queue to see them here</p>
                    </div>
                `;
                return;
            }
            
            queueSeries.forEach((serie, index) => {
                const contentType = serie.contentType || 'series';
                const isSeries = contentType === 'series';
                const progressText = isSeries ? `S${serie.season} E${serie.episode} · ${formatTime(serie.time)}` : formatTime(serie.time);
                const statusText = { watching: 'Watching', want: 'Want to Watch', completed: 'Completed' };
                const statusClass = serie.status === 'watching' ? 'status-watching' : serie.status === 'completed' ? 'status-completed' : 'status-want';
                let progressPercent = 0;
                if (isSeries && serie.totalSeasons && serie.totalEpisodes) {
                    const totalEps = serie.totalSeasons * serie.totalEpisodes;
                    const watchedEps = (serie.season - 1) * serie.totalEpisodes + serie.episode;
                    progressPercent = Math.min(100, Math.round((watchedEps / totalEps) * 100));
                } else if (!isSeries) {
                    progressPercent = serie.status === 'completed' ? 100 : 0;
                }

                const item = document.createElement('div');
                item.className = 'priority-item';
                item.draggable = true;
                item.dataset.id = serie.id;
                item.dataset.index = index;
                item.innerHTML = `
                    <div class="priority-info" style="align-items:center;">
                        <div class="drag-handle">☰</div>
                        ${serie.image ? `<img src="${serie.image}" alt="" style="width:40px;height:60px;object-fit:cover;border-radius:4px;flex-shrink:0;" loading="lazy" onerror="this.style.display='none';">` : ''}
                        <div style="flex:1;min-width:0;">
                            <strong style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${serie.title}</strong>
                            <div style="display:flex;align-items:center;gap:8px;margin-top:3px;flex-wrap:wrap;">
                                <span class="status-badge ${statusClass}" style="font-size:0.7rem;padding:2px 8px;margin:0;">${statusText[serie.status] || serie.status}</span>
                                <span style="color:#999;font-size:0.85rem;">${progressText}</span>
                            </div>
                            ${progressPercent > 0 ? `<div style="margin-top:5px;width:100%;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;"><div style="height:100%;width:${progressPercent}%;background:var(--secondary-color,#e50914);border-radius:2px;"></div></div>` : ''}
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;align-items:center;">
                        <button class="btn btn-small btn-secondary" onclick="moveQueueItem(${serie.id}, -1)" title="Move up" style="padding:6px 10px;">↑</button>
                        <button class="btn btn-small btn-secondary" onclick="moveQueueItem(${serie.id}, 1)" title="Move down" style="padding:6px 10px;">↓</button>
                        <button class="btn btn-small" onclick="editSeries(${serie.id})">Edit</button>
                        <button class="btn btn-small btn-secondary" onclick="removeFromQueue(${serie.id})" title="Remove from queue" style="padding:6px 10px;">✕</button>
                    </div>
                `;
                priorityList.appendChild(item);

                item.addEventListener('dragstart', handleDragStart);
                item.addEventListener('dragend', handleDragEnd);
                item.addEventListener('dragover', handleDragOver);
                item.addEventListener('drop', handleDrop);
                item.addEventListener('dragenter', handleDragEnter);
                item.addEventListener('dragleave', handleDragLeave);
            });
        }

        window.removeFromQueue = function(id) {
            const idx = series.findIndex(s => s.id === id);
            if (idx === -1) return;
            series[idx].inQueue = false;
            series[idx].queueOrder = 999;
            saveData();
            renderPriorityList();
        };
        window.moveQueueItem = function(id, delta) {
            const queueSeries = series.filter(serie => serie.inQueue).sort((a, b) => a.queueOrder - b.queueOrder);
            const idx = queueSeries.findIndex(item => item.id === id);
            if (idx === -1) return;
            const targetIdx = idx + delta;
            if (targetIdx < 0 || targetIdx >= queueSeries.length) return;
            const moved = queueSeries[idx];
            queueSeries.splice(idx, 1);
            queueSeries.splice(targetIdx, 0, moved);
            queueSeries.forEach((item, order) => {
                const original = series.find(s => s.id === item.id);
                if (original) original.queueOrder = order;
            });
            saveData();
            renderPriorityList();
        };

        function handleDragStart(e) {
            draggedElement = this;
            draggedIndex = parseInt(this.dataset.index);
            this.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        }

        function handleDragEnd(e) {
            this.classList.remove('dragging');
            document.querySelectorAll('.priority-item').forEach(item => {
                item.style.borderTop = '';
            });
        }

        function handleDragOver(e) {
            if (e.preventDefault) {
                e.preventDefault();
            }
            e.dataTransfer.dropEffect = 'move';
            return false;
        }

        function handleDragEnter(e) {
            if (this !== draggedElement) {
                this.style.borderTop = '2px solid #e50914';
            }
        }

        function handleDragLeave(e) {
            this.style.borderTop = '';
        }

        function handleDrop(e) {
            if (e.stopPropagation) {
                e.stopPropagation();
            }

            if (draggedElement !== this) {
                const targetIndex = parseInt(this.dataset.index);
                
                const queueSeries = series
                    .filter(serie => serie.inQueue)
                    .sort((a, b) => a.queueOrder - b.queueOrder);
                
                const movedSerie = queueSeries[draggedIndex];
                queueSeries.splice(draggedIndex, 1);
                queueSeries.splice(targetIndex, 0, movedSerie);
                
                queueSeries.forEach((serie, index) => {
                    const originalSerie = series.find(s => s.id === serie.id);
                    originalSerie.queueOrder = index;
                });
                
                saveData();
                renderPriorityList();
            }

            return false;
        }

        function updateCurrentUserDisplay() {
            const currentUser = users.find(u => u.id === currentUserId);
            if (currentUser) {
                const nameElement = document.getElementById('currentUserName');
                const pictureElement = document.getElementById('currentUserPicture');
                const statsElement = document.getElementById('currentUserStats');
                
                if (nameElement) {
                    nameElement.textContent = currentUser.name;
                }
                
                if (pictureElement) {
                    pictureElement.setAttribute('loading', 'lazy');
                    pictureElement.setAttribute('decoding', 'async');
                    if (currentUser.picture) {
                        pictureElement.src = currentUser.picture;
                    } else {
                        pictureElement.src = 'https://via.placeholder.com/50/666/fff?text=' + currentUser.name.charAt(0).toUpperCase();
                    }
                }
                
                if (statsElement) {
                    const totalItems = series.length;
                    statsElement.textContent = `${totalItems} item${totalItems !== 1 ? 's' : ''}`;
                }
            }
        }

        function showWelcomeToast(name) {
            const toast = document.getElementById('welcomeToast');
            if (!toast) return;
            toast.textContent = 'Welcome, ' + name + '!';
            toast.classList.add('show');
            setTimeout(() => { toast.classList.remove('show'); }, 2200);
        }

        function showWelcomeToast(name) {
            const toast = document.getElementById('welcomeToast');
            if (!toast) return;
            toast.textContent = 'Welcome, ' + name + '!';
            toast.classList.add('show');
            setTimeout(() => { toast.classList.remove('show'); }, 2200);
        }

        function setupEventListeners() {
            // Hamburger menu toggle
            const hamburgerMenu = document.getElementById('hamburgerMenu');
            const sidebar = document.getElementById('sidebar');
            const sidebarOverlay = document.getElementById('sidebarOverlay');
            const closeSidebarBtn = document.getElementById('closeSidebar');

            hamburgerMenu.addEventListener('click', openSidebar);
            hamburgerMenu.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openSidebar();
                }
            });

            closeSidebarBtn.addEventListener('click', () => {
                closeSidebar();
            });

            sidebarOverlay.addEventListener('click', () => {
                closeSidebar();
            });

            document.addEventListener('keydown', (e) => {
                if (e.key !== 'Escape') return;
                const openedOverlay = Array.from(document.querySelectorAll('.overlay')).find(isElementVisible);
                if (openedOverlay && openedOverlay.id) {
                    closeOverlay(openedOverlay.id);
                    return;
                }
                if (sidebar.classList.contains('open')) {
                    closeSidebar();
                }
            });

            // Export/Import functionality
            const exportBtn = document.getElementById('exportBtn');
            const importBtn = document.getElementById('importBtn');
            const importFileInput = document.getElementById('importFileInput');
            const timelineRangeSelect = document.getElementById('timelineRangeSelect');

            if (exportBtn) {
                exportBtn.addEventListener('click', () => {
                    exportLists();
                    // Close sidebar after export
                    closeSidebar();
                });
            }

            if (importBtn) {
                importBtn.addEventListener('click', () => {
                    importLists();
                    closeSidebar();
                });
            }

            if (importFileInput) {
                importFileInput.addEventListener('change', handleFileImport);
            }
            const exportMessageModal = document.getElementById('exportMessageModal');
            const closeExportMessageBtn = document.getElementById('closeExportMessageBtn');
            if (closeExportMessageBtn && exportMessageModal) {
                closeExportMessageBtn.addEventListener('click', () => {
                    exportMessageModal.style.display = 'none';
                });
                exportMessageModal.addEventListener('click', (e) => {
                    if (e.target === exportMessageModal) exportMessageModal.style.display = 'none';
                });
            }
            if (timelineRangeSelect) {
                timelineRangeSelect.value = timelineRange;
                timelineRangeSelect.addEventListener('change', (e) => {
                    timelineRange = e.target.value || 'lifetime';
                    renderWatchTimeline();
                });
            }

            // Theme options in sidebar
            document.querySelectorAll('.theme-option').forEach(option => {
                option.addEventListener('click', (e) => {
                    document.querySelectorAll('.theme-option').forEach(opt => {
                        opt.classList.remove('active');
                        opt.querySelector('.filter-option-check').style.display = 'none';
                    });
                    e.currentTarget.classList.add('active');
                    e.currentTarget.querySelector('.filter-option-check').style.display = 'inline';
                    
                    const theme = e.currentTarget.getAttribute('data-theme');
                    if (theme === 'custom') {
                        document.getElementById('customThemeControls').classList.add('show');
                        const primaryColorInput = document.getElementById('primaryColor');
                        const secondaryColorInput = document.getElementById('secondaryColor');
                        const primaryColorCircle = document.getElementById('primaryColorCircle');
                        const secondaryColorCircle = document.getElementById('secondaryColorCircle');
                        const primaryColorValue = document.getElementById('primaryColorValue');
                        const secondaryColorValue = document.getElementById('secondaryColorValue');
                        
                        if (primaryColorInput) primaryColorInput.value = customPrimaryColor;
                        if (secondaryColorInput) secondaryColorInput.value = customSecondaryColor;
                        if (primaryColorCircle) {
                            primaryColorCircle.style.setProperty('--picker-color', customPrimaryColor);
                            primaryColorCircle.style.backgroundColor = customPrimaryColor;
                        }
                        if (secondaryColorCircle) {
                            secondaryColorCircle.style.setProperty('--picker-color', customSecondaryColor);
                            secondaryColorCircle.style.backgroundColor = customSecondaryColor;
                        }
                        if (primaryColorValue) primaryColorValue.textContent = customPrimaryColor.toUpperCase();
                        if (secondaryColorValue) secondaryColorValue.textContent = customSecondaryColor.toUpperCase();
                        applyTheme('custom');
                    } else {
                        document.getElementById('customThemeControls').classList.remove('show');
                        applyTheme(theme);
                    }
                });
            });

            // Custom theme color pickers - circular picker updates
            const primaryColorInput = document.getElementById('primaryColor');
            const secondaryColorInput = document.getElementById('secondaryColor');
            const primaryColorCircle = document.getElementById('primaryColorCircle');
            const secondaryColorCircle = document.getElementById('secondaryColorCircle');
            const primaryColorValue = document.getElementById('primaryColorValue');
            const secondaryColorValue = document.getElementById('secondaryColorValue');

            function updatePrimaryColor(e) {
                const color = e.target.value;
                if (primaryColorCircle) {
                    primaryColorCircle.style.setProperty('--picker-color', color);
                    primaryColorCircle.style.backgroundColor = color;
                }
                if (primaryColorValue) {
                    primaryColorValue.textContent = color.toUpperCase();
                }
                // Apply theme immediately
                customPrimaryColor = color;
                if (currentTheme === 'custom') {
                    applyTheme('custom');
                }
            }

            function updateSecondaryColor(e) {
                const color = e.target.value;
                if (secondaryColorCircle) {
                    secondaryColorCircle.style.setProperty('--picker-color', color);
                    secondaryColorCircle.style.backgroundColor = color;
                }
                if (secondaryColorValue) {
                    secondaryColorValue.textContent = color.toUpperCase();
                }
                // Apply theme immediately
                customSecondaryColor = color;
                if (currentTheme === 'custom') {
                    applyTheme('custom');
                }
            }

            if (primaryColorInput) {
                primaryColorInput.addEventListener('input', updatePrimaryColor);
                primaryColorInput.addEventListener('change', updatePrimaryColor);
            }
            if (secondaryColorInput) {
                secondaryColorInput.addEventListener('input', updateSecondaryColor);
                secondaryColorInput.addEventListener('change', updateSecondaryColor);
            }

            // Status badge color pickers
            const watchingColorInput = document.getElementById('watchingColor');
            const wantColorInput = document.getElementById('wantColor');
            const completedColorInput = document.getElementById('completedColor');

            function updateStatusColors() {
                if (currentTheme === 'custom') {
                    const wc = watchingColorInput ? watchingColorInput.value : '#e50914';
                    const wt = wantColorInput ? wantColorInput.value : '#0062ff';
                    const cc = completedColorInput ? completedColorInput.value : '#27ae60';
                    document.documentElement.style.setProperty('--watching-color', wc);
                    document.documentElement.style.setProperty('--want-color', wt);
                    document.documentElement.style.setProperty('--completed-color', cc);
                    // Update circle displays
                    const wcc = document.getElementById('watchingColorCircle');
                    const wtc = document.getElementById('wantColorCircle');
                    const ccc = document.getElementById('completedColorCircle');
                    if (wcc) { wcc.style.backgroundColor = wc; wcc.style.setProperty('--picker-color', wc); document.getElementById('watchingColorValue').textContent = wc.toUpperCase(); }
                    if (wtc) { wtc.style.backgroundColor = wt; wtc.style.setProperty('--picker-color', wt); document.getElementById('wantColorValue').textContent = wt.toUpperCase(); }
                    if (ccc) { ccc.style.backgroundColor = cc; ccc.style.setProperty('--picker-color', cc); document.getElementById('completedColorValue').textContent = cc.toUpperCase(); }
                    saveSettings();
                }
            }
            if (watchingColorInput) { watchingColorInput.addEventListener('input', updateStatusColors); watchingColorInput.addEventListener('change', updateStatusColors); }
            if (wantColorInput) { wantColorInput.addEventListener('input', updateStatusColors); wantColorInput.addEventListener('change', updateStatusColors); }
            if (completedColorInput) { completedColorInput.addEventListener('input', updateStatusColors); completedColorInput.addEventListener('change', updateStatusColors); }

            // Apply status badge colors from CSS variables
            const styleEl = document.createElement('style');
            styleEl.id = 'statusColorStyle';
            document.head.appendChild(styleEl);
            function applyStatusColorStyle() {
                if (currentTheme === 'custom') {
                    const wc = (watchingColorInput && watchingColorInput.value) || '#e50914';
                    const wt = (wantColorInput && wantColorInput.value) || '#0062ff';
                    const cc = (completedColorInput && completedColorInput.value) || '#27ae60';
                    styleEl.textContent = `
                        body.custom-theme .status-watching { background-color: ${wc} !important; }
                        body.custom-theme .status-want { background-color: ${wt} !important; }
                        body.custom-theme .status-completed { background-color: ${cc} !important; }
                        body.custom-theme .status-completed-item { border-left-color: ${cc} !important; }
                        body.custom-theme .status-watching-item { border-left-color: ${wc} !important; }
                        body.custom-theme .status-want-item { border-left-color: ${wt} !important; }
                    `;
                } else {
                    styleEl.textContent = '';
                }
            }
            // Patch applyTheme to also apply status colors
            const _origApplyTheme = applyTheme;
            applyTheme = function(theme) { _origApplyTheme(theme); applyStatusColorStyle(); };

            // Streaming multi-select chip logic
            document.querySelectorAll('#streamingMultiSelect .streaming-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    chip.classList.toggle('selected');
                    const selected = Array.from(document.querySelectorAll('#streamingMultiSelect .streaming-chip.selected'))
                        .map(c => c.getAttribute('data-service'));
                    document.getElementById('seriesStreamingService').value = selected.join(',');
                });
            });

            // Clear actors and streaming when form resets
            const origReset = seriesForm.reset.bind(seriesForm);
            seriesForm.reset = function() {
                origReset();
                document.querySelectorAll('#actorsContainer .actor-entry').forEach(e => {
                    e.querySelector('.actor-name').value = '';
                    e.querySelector('.actor-img').value = '';
                });
                document.querySelectorAll('#streamingMultiSelect .streaming-chip').forEach(c => c.classList.remove('selected'));
                document.getElementById('seriesStreamingService').value = '';
            };


            // Sidebar add content button
            document.getElementById('sidebarAddContentBtn').addEventListener('click', () => {
                closeSidebar();
                openOverlay('contentTypeDialog');
            });

            // Notification calendar button
            const openNotificationCalendarBtn = document.getElementById('openNotificationCalendarBtn');
            const notificationCalendarModal = document.getElementById('notificationCalendarModal');
            const closeNotificationCalendarBtn = document.getElementById('closeNotificationCalendarBtn');
            const addNotificationBtn = document.getElementById('addNotificationBtn');
            const addNotificationModal = document.getElementById('addNotificationModal');
            const notificationForm = document.getElementById('notificationForm');
            const cancelNotificationBtn = document.getElementById('cancelNotificationBtn');
            const notificationType = document.getElementById('notificationType');
            const notificationSeasonGroup = document.getElementById('notificationSeasonGroup');
            const notificationEpisodeGroup = document.getElementById('notificationEpisodeGroup');

            if (openNotificationCalendarBtn) {
                openNotificationCalendarBtn.addEventListener('click', () => {
                    closeSidebar();
                    loadNotifications();
                    renderNotificationsList();
                    openOverlay('notificationCalendarModal');
                });
            }

            if (closeNotificationCalendarBtn) {
                closeNotificationCalendarBtn.addEventListener('click', () => {
                    closeOverlay('notificationCalendarModal');
                });
            }

            if (notificationCalendarModal) {
                notificationCalendarModal.addEventListener('click', (e) => {
                    if (e.target === notificationCalendarModal) {
                        closeOverlay('notificationCalendarModal');
                    }
                });
            }

            if (addNotificationBtn) {
                addNotificationBtn.addEventListener('click', () => {
                    notificationForm.reset();
                    notificationSeasonGroup.style.display = 'none';
                    notificationEpisodeGroup.style.display = 'none';
                    openOverlay('addNotificationModal');
                });
            }

            if (cancelNotificationBtn) {
                cancelNotificationBtn.addEventListener('click', () => {
                    closeOverlay('addNotificationModal');
                });
            }

            if (addNotificationModal) {
                addNotificationModal.addEventListener('click', (e) => {
                    if (e.target === addNotificationModal) {
                        closeOverlay('addNotificationModal');
                    }
                });
            }

            if (notificationType) {
                notificationType.addEventListener('change', (e) => {
                    if (e.target.value === 'season') {
                        notificationSeasonGroup.style.display = 'block';
                        notificationEpisodeGroup.style.display = 'none';
                        document.getElementById('notificationSeason').required = true;
                        document.getElementById('notificationEpisode').required = false;
                    } else if (e.target.value === 'episode') {
                        notificationSeasonGroup.style.display = 'block';
                        notificationEpisodeGroup.style.display = 'block';
                        document.getElementById('notificationSeason').required = true;
                        document.getElementById('notificationEpisode').required = true;
                    } else {
                        notificationSeasonGroup.style.display = 'none';
                        notificationEpisodeGroup.style.display = 'none';
                        document.getElementById('notificationSeason').required = false;
                        document.getElementById('notificationEpisode').required = false;
                    }
                });
            }

            if (notificationForm) {
                notificationForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const date = document.getElementById('notificationDate').value;
                    const type = document.getElementById('notificationType').value;
                    const seriesName = document.getElementById('notificationSeries').value.trim();
                    const season = document.getElementById('notificationSeason').value;
                    const episode = document.getElementById('notificationEpisode').value;
                    const language = document.getElementById('notificationLanguage').value.trim();
                    const apiSource = document.getElementById('notificationApiSource').value;
                    const matchedItem = series.find(s => s.title.toLowerCase() === seriesName.toLowerCase());
                    const resolvedLanguage = language || (matchedItem && matchedItem.language ? matchedItem.language : null);

                    if (!date || !type || !seriesName) {
                        alert('Please fill in all required fields');
                        return;
                    }

                    if (type === 'season' && !season) {
                        alert('Please enter season number');
                        return;
                    }

                    if (type === 'episode' && (!season || !episode)) {
                        alert('Please enter both season and episode numbers');
                        return;
                    }

                    const newNotification = {
                        id: 'notification_' + Date.now(),
                        date: date,
                        type: type,
                        seriesName: seriesName,
                        season: type === 'season' || type === 'episode' ? parseInt(season) : null,
                        episode: type === 'episode' ? parseInt(episode) : null,
                        language: resolvedLanguage,
                        apiSource: apiSource || 'manual'
                    };
                    newNotification.futureApiRequest = buildFutureApiRequest(newNotification);

                    notifications.push(newNotification);
                    saveNotifications();
                    renderNotificationsList();
                    closeOverlay('addNotificationModal');
                    notificationForm.reset();
                });
            }


            // ── New avatar-card UI bridge ──────────────────────────────
            let umSelectedUserId = null; window.umSelectedUserId = null;
            const PLACEHOLDER_IMG = 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png';

            function renderUserAvatars() {
                const row = document.getElementById('umAvatarRow');
                if (!row) return;
                row.innerHTML = '';
                users.forEach(function(user) {
                    const userDataKey = 'seriesTrackerData_' + user.id;
                    const userData = localStorage.getItem(userDataKey);
                    let itemCount = 0;
                    try { itemCount = JSON.parse(userData).length || 0; } catch(e){}
                    const isCurrent = user.id === currentUserId;
                    const isSelected = user.id === (umSelectedUserId || currentUserId);

                    const card = document.createElement('div');
                    card.className = 'um-avatar' + (isSelected ? ' um-active' : '');
                    card.dataset.userId = user.id;

                    const img = document.createElement('img');
                    img.src = user.picture || PLACEHOLDER_IMG;
                    img.alt = user.name;
                    img.width = 50; img.height = 50;
                    img.style.cssText = 'width:50px;height:50px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.2);';
                    img.onerror = function() { this.src = PLACEHOLDER_IMG; };

                    const nameEl = document.createElement('div');
                    nameEl.className = 'um-avatar-name';
                    nameEl.textContent = user.name + (isCurrent ? ' \u2713' : '');

                    card.appendChild(img);
                    card.appendChild(nameEl);

                    card.addEventListener('click', function() {
                        umSelectedUserId = user.id; window.umSelectedUserId = user.id;
                        document.querySelectorAll('.um-avatar').forEach(function(c) { c.classList.remove('um-active'); });
                        card.classList.add('um-active');
                        const strip = document.getElementById('umEditStrip');
                        if (strip) strip.style.display = 'flex';
                        document.getElementById('createUserForm').style.display = 'none';
                        document.getElementById('editUserForm').style.display = 'none';
                        document.getElementById('umMainActions').style.display = 'flex';
                    });
                    row.appendChild(card);
                });
                if (!umSelectedUserId) umSelectedUserId = currentUserId; window.umSelectedUserId = currentUserId;
                const strip = document.getElementById('umEditStrip');
                if (strip) strip.style.display = umSelectedUserId ? 'flex' : 'none';
                const warn = document.getElementById('maxUsersWarning');
                if (warn) warn.style.display = users.length >= 5 ? 'block' : 'none';
            }

            // Patch openUserSelectModal to also render avatars
            const _origOpenUserSelectModal = openUserSelectModal;
            function openUserSelectModal() {
                _origOpenUserSelectModal();
                umSelectedUserId = currentUserId; window.umSelectedUserId = currentUserId;
                renderUserAvatars();
                const strip = document.getElementById('umEditStrip');
                if (strip) strip.style.display = 'flex';
                document.getElementById('createUserForm').style.display = 'none';
                document.getElementById('editUserForm').style.display = 'none';
                document.getElementById('umMainActions').style.display = 'flex';
            }

            // confirmUserSelectBtn: handled by original listener (now uses window.umSelectedUserId)

            // New User button
            const umCreateLink = document.getElementById('createUserLink');
            if (umCreateLink) {
                umCreateLink.addEventListener('click', function() {
                    if (users.length >= 5) {
                        const warn = document.getElementById('maxUsersWarning');
                        if (warn) warn.style.display = 'block';
                        return;
                    }
                    document.getElementById('createUserForm').style.display = 'block';
                    document.getElementById('editUserForm').style.display = 'none';
                    document.getElementById('umMainActions').style.display = 'none';
                    const strip = document.getElementById('umEditStrip');
                    if (strip) strip.style.display = 'none';
                });
            }

            // Edit button
            // editUserLink: original listener handles edit, sets data-editing-user attr

            // Delete button (strip)
            // deleteUserLink: original listener handles delete

            // Re-render after save/create/delete
            // saveEditUserBtn: renderUserAvatars called inline in original handler
            // createUserBtn: renderUserAvatars called inline in original handler
            // deleteUserInFormBtn: renderUserAvatars handled inline
            // Cancel buttons
            // cancelCreateUserBtn: handled by original listener
            // cancelEditUserBtn: handled by original listener
            // ── end avatar UI bridge ───────────────────────────────────

            // Change user button
            document.getElementById('changeUserBtn').addEventListener('click', () => {
                closeSidebar();
                openUserSelectModal();
            });

            // User selection modal
            const userSelectModal = document.getElementById('userSelectModal');
            const userSelectDropdown = document.getElementById('userSelectDropdown');
            const userSelectContainer = document.getElementById('userSelectContainer');
            const userSelectActions = document.getElementById('userSelectActions');
            const createUserLink = document.getElementById('createUserLink');
            const editUserLink = document.getElementById('editUserLink');
            const deleteUserLink = document.getElementById('deleteUserLink');
            const createUserForm = document.getElementById('createUserForm');
            const editUserForm = document.getElementById('editUserForm');
            const createUserBtn = document.getElementById('createUserBtn');
            const cancelCreateUserBtn = document.getElementById('cancelCreateUserBtn');
            const cancelEditUserBtn = document.getElementById('cancelEditUserBtn');
            const saveEditUserBtn = document.getElementById('saveEditUserBtn');
            const deleteUserInFormBtn = document.getElementById('deleteUserInFormBtn');
            const cancelUserSelectBtn = document.getElementById('cancelUserSelectBtn');
            const confirmUserSelectBtn = document.getElementById('confirmUserSelectBtn');
            const maxUsersWarning = document.getElementById('maxUsersWarning');

            // Update edit button state when dropdown changes
            if (userSelectDropdown) userSelectDropdown.addEventListener('change', () => {
                updateEditButtonState();
            });

            function openUserSelectModal() {
                updateUserSelectDropdown();
                umSelectedUserId = currentUserId; window.umSelectedUserId = currentUserId;
                userSelectModal.style.display = 'flex';
                if(createUserForm){createUserForm.classList.remove('show');createUserForm.style.display='none';}
                if(editUserForm){editUserForm.classList.remove('show');editUserForm.style.display='none';}
                if(maxUsersWarning){maxUsersWarning.classList.remove('show');maxUsersWarning.style.display='none';}
                if(userSelectContainer)userSelectContainer.classList.remove('hidden');
                if (userSelectActions) userSelectActions.style.display = 'flex';
                updateEditButtonState();
                if(typeof renderUserAvatars==='function') renderUserAvatars();
                const strip = document.getElementById('umEditStrip');
                if (strip) strip.style.display = 'flex';
                document.getElementById('umMainActions').style.display = 'flex';
            }

            function updateEditButtonState() {
                // null-safe: userSelectDropdown is a hidden shim
                const selectedUserId = (userSelectDropdown && userSelectDropdown.value) ? userSelectDropdown.value : (window.umSelectedUserId || null);
                const editUserLink = document.getElementById('editUserLink');
                const deleteUserLink = document.getElementById('deleteUserLink');
                if (!editUserLink || !deleteUserLink) return;
                if (selectedUserId && selectedUserId !== '') {
                    editUserLink.disabled = false;
                    editUserLink.style.pointerEvents = 'auto';
                    if (users.length <= 1) {
                        deleteUserLink.disabled = true;
                        deleteUserLink.style.pointerEvents = 'none';
                    } else {
                        deleteUserLink.disabled = false;
                        deleteUserLink.style.pointerEvents = 'auto';
                    }
                } else {
                    editUserLink.disabled = true;
                    editUserLink.style.pointerEvents = 'none';
                    deleteUserLink.disabled = true;
                    deleteUserLink.style.pointerEvents = 'none';
                }
            }

            function updateUserSelectDropdown() {
                userSelectDropdown.innerHTML = '<option value="">-- Select a user --</option>';
                users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    
                    // Get user's item count for display
                    const userDataKey = `seriesTrackerData_${user.id}`;
                    const userData = localStorage.getItem(userDataKey);
                    let itemCount = 0;
                    if (userData) {
                        try {
                            const parsed = JSON.parse(userData);
                            itemCount = parsed.length || 0;
                        } catch (e) {
                            itemCount = 0;
                        }
                    }
                    
                    // Format: "User Name (X items)" or "User Name (Current)"
                    let displayText = user.name;
                    if (user.id === currentUserId) {
                        displayText += ' (Current)';
                    } else {
                        displayText += ` (${itemCount} item${itemCount !== 1 ? 's' : ''})`;
                    }
                    
                    option.textContent = displayText;
                    if (user.id === currentUserId) {
                        option.selected = true;
                    }
                    userSelectDropdown.appendChild(option);
                });
                
                // Update current user stats display
                const currentUser = users.find(u => u.id === currentUserId);
                if (currentUser) {
                    const userDataKey = `seriesTrackerData_${currentUserId}`;
                    const userData = localStorage.getItem(userDataKey);
                    let itemCount = 0;
                    if (userData) {
                        try {
                            const parsed = JSON.parse(userData);
                            itemCount = parsed.length || 0;
                        } catch (e) {
                            itemCount = 0;
                        }
                    }
                    const statsElement = document.getElementById('currentUserStats');
                    if (statsElement) {
                        statsElement.textContent = `${itemCount} item${itemCount !== 1 ? 's' : ''}`;
                    }
                }
            }


            // createUserLink handled by new bridge above
            // (keeping this block as no-op to avoid duplicate listener errors)
            // createUserLink.addEventListener('click', ...) -- already in bridge

            function deleteUser(userId) {
                if (users.length <= 1) {
                    alert('Cannot delete the last user. You must have at least one user profile.');
                    return;
                }

                const userToDelete = users.find(u => u.id === userId);
                if (!userToDelete) return;

                const confirmMessage = `Are you sure you want to delete "${userToDelete.name}"?\n\nThis will permanently delete all their series and movies data. This action cannot be undone.`;
                if (!confirm(confirmMessage)) {
                    return;
                }

                // Delete user's data
                const userDataKey = `seriesTrackerData_${userId}`;
                const userSettingsKey = `seriesTrackerSettings_${userId}`;
                localStorage.removeItem(userDataKey);
                localStorage.removeItem(userSettingsKey);

                // Remove user from array
                users = users.filter(u => u.id !== userId);
                saveUsers();

                // If deleted user was current user, switch to first user
                if (userId === currentUserId) {
                    if (users.length > 0) {
                        currentUserId = users[0].id;
                        saveCurrentUser();
                        loadData();
                        loadSettings();
                        applyTheme(currentTheme);
                        renderSeries();
                        renderPriorityList();
                        renderStatistics();
                        updateCurrentUserDisplay();
                    }
                }

                // Update UI
                if(typeof renderUserAvatars==='function') renderUserAvatars();
                updateUserSelectDropdown();
                updateEditButtonState();
                
                // Close forms if open
                if(editUserForm){editUserForm.classList.remove('show');editUserForm.style.display='none';}
                if(createUserForm){createUserForm.classList.remove('show');createUserForm.style.display='none';}
                if(userSelectContainer)userSelectContainer.classList.remove('hidden');
                userSelectActions.style.display = 'flex';
            }

            editUserLink.addEventListener('click', () => {
                const selectedUserId = (window.umSelectedUserId) || (userSelectDropdown && userSelectDropdown.value) || null;
                if (!selectedUserId || selectedUserId === '') {
                    return;
                }
                
                const userToEdit = users.find(u => u.id === selectedUserId);
                if (userToEdit) {
                    document.getElementById('editUserName').value = userToEdit.name;
                    document.getElementById('editUserPicture').value = userToEdit.picture || '';
                    editUserForm.setAttribute('data-editing-user', selectedUserId);
                    if(editUserForm){editUserForm.classList.add('show');editUserForm.style.display='block';}
                    if(createUserForm){createUserForm.classList.remove('show');createUserForm.style.display='none';}
                    if(userSelectContainer)userSelectContainer.classList.add('hidden');
                    userSelectActions.style.display = 'none';
                    
                    // Show/hide delete button in form based on user count
                    if (users.length <= 1) {
                        deleteUserInFormBtn.style.display = 'none';
                    } else {
                        deleteUserInFormBtn.style.display = 'inline-block';
                    }
                }
            });

            deleteUserLink.addEventListener('click', () => {
                const selectedUserId = (window.umSelectedUserId) || (userSelectDropdown && userSelectDropdown.value) || null;
                if (!selectedUserId || selectedUserId === '') {
                    return;
                }
                deleteUser(selectedUserId);
            });

            deleteUserInFormBtn.addEventListener('click', () => {
                const editingUserId = editUserForm.getAttribute('data-editing-user');
                if (!editingUserId) return;
                deleteUser(editingUserId);
            });

            cancelCreateUserBtn.addEventListener('click', () => {
                if(createUserForm){createUserForm.classList.remove('show');createUserForm.style.display='none';}
                if(userSelectContainer)userSelectContainer.classList.remove('hidden');
                userSelectActions.style.display = 'flex';
                document.getElementById('newUserName').value = '';
                document.getElementById('newUserPicture').value = '';
            });

            cancelEditUserBtn.addEventListener('click', () => {
                if(editUserForm){editUserForm.classList.remove('show');editUserForm.style.display='none';}
                if(userSelectContainer)userSelectContainer.classList.remove('hidden');
                userSelectActions.style.display = 'flex';
                editUserForm.removeAttribute('data-editing-user');
                document.getElementById('editUserName').value = '';
                document.getElementById('editUserPicture').value = '';
            });

            saveEditUserBtn.addEventListener('click', () => {
                const editingUserId = editUserForm.getAttribute('data-editing-user');
                if (!editingUserId) return;

                const name = document.getElementById('editUserName').value.trim();
                const picture = document.getElementById('editUserPicture').value.trim();
                
                if (!name) {
                    alert('Please enter a user name');
                    return;
                }

                const userIndex = users.findIndex(u => u.id === editingUserId);
                if (userIndex !== -1) {
                    users[userIndex].name = name;
                    users[userIndex].picture = picture;
                    saveUsers();
                    if(typeof renderUserAvatars==='function') renderUserAvatars();
                    // Update UI
                    updateUserSelectDropdown();
                    updateCurrentUserDisplay();
                    
                    // If editing current user, update display
                    if (editingUserId === currentUserId) {
                        updateCurrentUserDisplay();
                    }
                    
                    if(editUserForm){editUserForm.classList.remove('show');editUserForm.style.display='none';}
                    if(userSelectContainer)userSelectContainer.classList.remove('hidden');
                    userSelectActions.style.display = 'flex';
                    editUserForm.removeAttribute('data-editing-user');
                    document.getElementById('editUserName').value = '';
                    document.getElementById('editUserPicture').value = '';
                }
            });

            createUserBtn.addEventListener('click', () => {
                const name = document.getElementById('newUserName').value.trim();
                const picture = document.getElementById('newUserPicture').value.trim();
                
                if (!name) {
                    alert('Please enter a user name');
                    return;
                }

                if (users.length >= 5) {
                    alert('Maximum of 5 users reached');
                    return;
                }

                const newUser = {
                    id: 'user_' + Date.now(),
                    name: name,
                    picture: picture,
                    createdAt: Date.now()
                };

                users.push(newUser);
                saveUsers();
                currentUserId = newUser.id;
                saveCurrentUser();
                
                // Initialize new user with empty data
                const newUserKey = `seriesTrackerData_${currentUserId}`;
                localStorage.setItem(newUserKey, JSON.stringify([]));
                
                // Initialize new user settings with defaults
                const newUserSettingsKey = `seriesTrackerSettings_${currentUserId}`;
                const defaultSettings = {
                    sort: 'default',
                    viewSize: 'normal',
                    category: 'all',
                    contentFilter: 'all',
                    filter: 'watching',
                    theme: 'dark',
                    globalContentType: 'series',
                    customPrimaryColor: '#141414',
                    customSecondaryColor: '#e50914'
                };
                localStorage.setItem(newUserSettingsKey, JSON.stringify(defaultSettings));
                
                // Load new user's data (will be empty)
                loadData();
                loadSettings();
                applyTheme(currentTheme);
                renderSeries();
                renderPriorityList();
                renderStatistics();
                
                // Update UI
                if(typeof renderUserAvatars==='function') renderUserAvatars();
                updateUserSelectDropdown();
                updateCurrentUserDisplay();
                if(createUserForm){createUserForm.classList.remove('show');createUserForm.style.display='none';}
                if(userSelectContainer)userSelectContainer.classList.remove('hidden');
                userSelectActions.style.display = 'flex';
                document.getElementById('newUserName').value = '';
                document.getElementById('newUserPicture').value = '';
                userSelectModal.style.display = 'none';
                showWelcomeToast(name);
            });

            cancelUserSelectBtn && cancelUserSelectBtn.addEventListener('click', () => {
                userSelectModal.style.display = 'none';
            });

            confirmUserSelectBtn.addEventListener('click', () => {
                const selectedUserId = (window.umSelectedUserId) || (userSelectDropdown && userSelectDropdown.value) || null;
                if (!selectedUserId) {
                    alert('Please select a user');
                    return;
                }

                if (selectedUserId === currentUserId) {
                    userSelectModal.style.display = 'none';
                    return;
                }

                // Save current user's data before switching
                saveData();
                saveSettings();

                // Switch to new user
                currentUserId = selectedUserId;
                saveCurrentUser();

                // Load new user's data
                loadData();
                loadSettings();
                loadNotifications(); // Load notifications for new user
                applyTheme(currentTheme);
                // Restore filter states
                filterBtns.forEach(btn => {
                    btn.classList.toggle('active', btn.getAttribute('data-filter') === currentFilter);
                });
                
                document.querySelectorAll('[data-sort]').forEach(opt => {
                    opt.classList.toggle('active', opt.getAttribute('data-sort') === currentSort);
                });
                
                document.querySelectorAll('[data-size]').forEach(opt => {
                    opt.classList.toggle('active', opt.getAttribute('data-size') === currentViewSize);
                });
                
                document.querySelectorAll('[data-category]').forEach(opt => {
                    opt.classList.toggle('active', opt.getAttribute('data-category') === currentCategory);
                });
                
                document.querySelectorAll('[data-content-filter]').forEach(opt => {
                    opt.classList.toggle('active', opt.getAttribute('data-content-filter') === currentContentFilter);
                });

                renderSeries();
                renderPriorityList();
                renderStatistics();
                updateCurrentUserDisplay();
                userSelectModal.style.display = 'none';
                const switchedUser = users.find(u => u.id === currentUserId);
                if (switchedUser) showWelcomeToast(switchedUser.name);
            });

            userSelectModal.addEventListener('click', (e) => {
                if (e.target === userSelectModal) {
                    userSelectModal.style.display = 'none';
                }
            });

            // Content type selection dialog
            const contentTypeDialog = document.getElementById('contentTypeDialog');
            const cancelContentTypeBtn = document.getElementById('cancelContentTypeBtn');

            cancelContentTypeBtn.addEventListener('click', () => {
                contentTypeDialog.style.display = 'none';
            });

            contentTypeDialog.addEventListener('click', (e) => {
                if (e.target === contentTypeDialog) {
                    contentTypeDialog.style.display = 'none';
                }
            });

            // Only attach event listener to ct-option elements within contentTypeDialog, not import options modal
            contentTypeDialog.querySelectorAll('.ct-option').forEach(option => {
                option.addEventListener('click', (e) => {
                    const selectedType = e.currentTarget.getAttribute('data-type');
                    contentTypeDialog.style.display = 'none';
                    
                    modalTitle.textContent = selectedType === 'movie' ? 'Add New Movie' : 'Add New Series';
                    seriesForm.reset();
                    seriesForm.removeAttribute('data-editing');
                    document.getElementById('seriesContentType').value = selectedType;
                    document.getElementById('seriesStatus').value = 'watching';
                    document.getElementById('seriesUserRatingValue').value = 0;
                    document.getElementById('seriesMaxTime').value = 0;
                    updateRatingDisplay(0);
                    document.getElementById('seriesTags').value = '';
                    document.getElementById('seriesNotes').value = '';
                    document.getElementById('seriesStartedDate').value = '';
                    document.getElementById('seriesCompletedDate').value = '';
                    document.getElementById('seriesLastWatchedDate').value = '';
                    toggleEpisodeFields(selectedType);
                    handleStatusChange('watching');
                    seriesModal.style.display = 'flex';
                    const modalBody = seriesModal.querySelector('.modal');
                    if (modalBody) modalBody.scrollTop = 0;
                });
            });
            
            // Auto-save functionality for all fields
            let autoSaveTimeouts = {};
            let currentEditingSeriesId = null;
            
            function autoSaveField(field, fieldName) {
                const editingId = seriesForm.getAttribute('data-editing');
                if (!editingId) return; // Only auto-save when editing, not when adding new
                
                currentEditingSeriesId = parseInt(editingId);
                const serie = series.find(s => s.id === currentEditingSeriesId);
                if (!serie) return;
                
                // Clear existing timeout for this field
                if (autoSaveTimeouts[fieldName]) {
                    clearTimeout(autoSaveTimeouts[fieldName]);
                }
                
                // Set new timeout for auto-save after 1 second of no typing
                autoSaveTimeouts[fieldName] = setTimeout(function() {
                    let value;
                    
                    if (field.type === 'checkbox') {
                        value = field.checked;
                    } else if (field.type === 'number') {
                        value = parseInt(field.value) || (fieldName === 'userRating' ? 0 : (fieldName.includes('Season') || fieldName.includes('Episode') ? 1 : 0));
                    } else if (field.type === 'date') {
                        value = field.value || null;
                    } else if (field.tagName === 'TEXTAREA') {
                        value = field.value.trim();
                    } else if (field.tagName === 'SELECT') {
                        value = field.value;
                    } else {
                        value = field.value.trim();
                    }
                    
                    // Handle special fields
                    if (fieldName === 'tags') {
                        value = value ? value.split(',').map(t => t.trim()).filter(t => t) : [];
                    } else if (fieldName === 'userRating') {
                        value = parseFloat(document.getElementById('seriesUserRatingValue').value) || 0;
                    }
                    
                    // Update serie object
                    serie[fieldName] = value;
                    
                    // Handle special cases
                    if (fieldName === 'contentType') {
                        if (value === 'movie') {
                            serie.streamingService = '';
                            serie.season = 1;
                            serie.episode = 1;
                        }
                    }
                    if (fieldName === 'status' && value === 'completed') {
                        if (serie.totalSeasons && serie.totalEpisodes) {
                            serie.season = serie.totalSeasons;
                            serie.episode = serie.totalEpisodes;
                        }
                    }
                    
                    // Auto-expand totals if current exceeds them
                    if (fieldName === 'season' && serie.totalSeasons && value > serie.totalSeasons) {
                        serie.totalSeasons = value;
                        const totalSeasonsInput = document.getElementById('seriesTotalSeasons');
                        if (totalSeasonsInput) totalSeasonsInput.value = value;
                    }
                    if (fieldName === 'episode' && serie.totalEpisodes && value > serie.totalEpisodes) {
                        serie.totalEpisodes = value;
                        const totalEpisodesInput = document.getElementById('seriesTotalEpisodes');
                        if (totalEpisodesInput) totalEpisodesInput.value = value;
                    }
                    
                    saveData();
                    
                    // Show temporary saved indicator
                    const label = field.previousElementSibling;
                    if (label && label.tagName === 'LABEL') {
                        const originalText = label.textContent;
                        const hasCheck = originalText.includes('✓');
                        if (!hasCheck) {
                            label.textContent = '✓ ' + originalText;
                            label.style.color = '#00ff3c';
                            setTimeout(function() {
                                label.textContent = originalText;
                                label.style.color = '';
                            }, 1000);
                        }
                    }
                    
                    // Refresh display if needed
                    if (fieldName === 'status' || fieldName === 'contentType' || fieldName === 'time') {
                        renderSeries();
                        renderPriorityList();
                        renderStatistics();
                    }
                }, 1000);
            }
            
            // Add auto-save to all fields with auto-save-field class
            document.querySelectorAll('.auto-save-field').forEach(function(field) {
                const fieldName = field.getAttribute('data-field');
                if (!fieldName) return;
                
                // Handle different field types
                if (field.type === 'checkbox') {
                    field.addEventListener('change', function() {
                        autoSaveField(field, fieldName);
                    });
                } else {
                    field.addEventListener('input', function() {
                        autoSaveField(field, fieldName);
                    });
                    
                    // Also save on blur (when clicking outside)
                    field.addEventListener('blur', function() {
                        if (autoSaveTimeouts[fieldName]) {
                            clearTimeout(autoSaveTimeouts[fieldName]);
                        }
                        autoSaveField(field, fieldName);
                        // Execute immediately on blur
                        setTimeout(function() {
                            autoSaveField(field, fieldName);
                        }, 10);
                    });
                }
            });
            
            // API Auto-fill trigger for title field
            const titleField = document.getElementById('seriesTitle');
            let apiFillTimeout = null;
            if (titleField) {
                titleField.addEventListener('input', function() {
                    // Clear existing timeout
                    if (apiFillTimeout) {
                        clearTimeout(apiFillTimeout);
                    }
                    // Wait 2 seconds after user stops typing before calling API
                    apiFillTimeout = setTimeout(async function() {
                        const title = titleField.value.trim();
                        const contentType = document.getElementById('seriesContentType')?.value || 'series';
                        if (title.length > 2) { // Only call if title is at least 3 characters
                            await autoFillFromAPIs(title, contentType);
                        }
                    }, 2000);
                });
                
                // Also trigger on blur if title is entered
                titleField.addEventListener('blur', async function() {
                    if (apiFillTimeout) {
                        clearTimeout(apiFillTimeout);
                    }
                    const title = titleField.value.trim();
                    const contentType = document.getElementById('seriesContentType')?.value || 'series';
                    if (title.length > 2) {
                        await autoFillFromAPIs(title, contentType);
                    }
                });
            }
            
            // Special handling for rating stars (including half-stars)
            document.querySelectorAll('.rating-input .star-rating').forEach(starRating => {
                starRating.addEventListener('click', function(e) {
                    const rect = starRating.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const halfRating = parseFloat(starRating.getAttribute('data-half-rating'));
                    const fullRating = parseFloat(starRating.getAttribute('data-rating'));
                    const rating = clickX < rect.width / 2 ? halfRating : fullRating;
                    document.getElementById('seriesUserRatingValue').value = rating;
                    updateRatingDisplay(rating);
                    const ratingField = document.getElementById('seriesUserRatingValue');
                    if (ratingField) {
                        autoSaveField(ratingField, 'userRating');
                    }
                });
            });
            
            // Also handle old star and star-half elements for backward compatibility
            document.querySelectorAll('.rating-input .star, .rating-input .star-half').forEach(star => {
                star.addEventListener('click', function() {
                    const rating = parseFloat(this.getAttribute('data-rating'));
                    document.getElementById('seriesUserRatingValue').value = rating;
                    updateRatingDisplay(rating);
                    const ratingField = document.getElementById('seriesUserRatingValue');
                    if (ratingField) {
                        autoSaveField(ratingField, 'userRating');
                    }
                });
            });
            
            // Content type selector in form
            document.getElementById('seriesContentType').addEventListener('change', (e) => {
                toggleEpisodeFields(e.target.value);
            });

            // Status selector - handle completed status
            document.getElementById('seriesStatus').addEventListener('change', (e) => {
                handleStatusChange(e.target.value);
            });

            // Total seasons/episodes - sync with current when completed
            document.getElementById('seriesTotalSeasons').addEventListener('input', (e) => {
                if (document.getElementById('seriesStatus').value === 'completed') {
                    document.getElementById('seriesSeason').value = e.target.value || 1;
                }
            });

            document.getElementById('seriesTotalEpisodes').addEventListener('input', (e) => {
                if (document.getElementById('seriesStatus').value === 'completed') {
                    document.getElementById('seriesEpisode').value = e.target.value || 1;
                }
            });

            cancelBtn.addEventListener('click', () => {
                seriesModal.style.display = 'none';
                seriesForm.removeAttribute('data-editing');
                seriesForm.reset();
                document.getElementById('seriesUserRatingValue').value = 0;
                updateRatingDisplay(0);
            });

            seriesForm.addEventListener('submit', (e) => {
                e.preventDefault();
                saveSeries();
            });
            
            // Close modal on outside click (left click) - save actors before closing
            seriesModal.addEventListener('click', function(e) {
                if (e.target === seriesModal) {
                    seriesModal.style.display = 'none';
                    seriesForm.removeAttribute('data-editing');
                    seriesForm.reset();
                    document.getElementById('seriesUserRatingValue').value = 0;
                    updateRatingDisplay(0);
                }
            });

            // Rating stars functionality (including half-stars)
            const starRatings = document.querySelectorAll('.rating-input .star-rating');
            starRatings.forEach(starRating => {
                starRating.addEventListener('click', (e) => {
                    const rect = starRating.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const halfRating = parseFloat(starRating.getAttribute('data-half-rating'));
                    const fullRating = parseFloat(starRating.getAttribute('data-rating'));
                    const rating = clickX < rect.width / 2 ? halfRating : fullRating;
                    document.getElementById('seriesUserRatingValue').value = rating;
                    updateRatingDisplay(rating);
                });
                starRating.addEventListener('mousemove', (e) => {
                    const rect = starRating.getBoundingClientRect();
                    const mouseX = e.clientX - rect.left;
                    const halfRating = parseFloat(starRating.getAttribute('data-half-rating'));
                    const fullRating = parseFloat(starRating.getAttribute('data-rating'));
                    const hoverRating = mouseX < rect.width / 2 ? halfRating : fullRating;
                    // Get all previous stars' full ratings
                    const allStarRatings = Array.from(document.querySelectorAll('.rating-input .star-rating'));
                    const currentIndex = allStarRatings.indexOf(starRating);
                    let previewRating = hoverRating;
                    for (let i = 0; i < currentIndex; i++) {
                        previewRating = Math.max(previewRating, parseFloat(allStarRatings[i].getAttribute('data-rating')));
                    }
                    updateRatingDisplay(previewRating);
                });
            });
            
            const ratingInput = document.getElementById('seriesUserRating');
            if (ratingInput) {
                ratingInput.addEventListener('mouseleave', () => {
                    const currentRating = parseFloat(document.getElementById('seriesUserRatingValue').value) || 0;
                    updateRatingDisplay(currentRating);
                });
            }
            
            // Also handle old star and star-half elements for backward compatibility
            const stars = document.querySelectorAll('.rating-input .star, .rating-input .star-half');
            stars.forEach(star => {
                star.addEventListener('click', (e) => {
                    const rating = parseFloat(e.target.getAttribute('data-rating'));
                    document.getElementById('seriesUserRatingValue').value = rating;
                    updateRatingDisplay(rating);
                });
                star.addEventListener('mouseenter', (e) => {
                    const rating = parseFloat(e.target.getAttribute('data-rating'));
                    updateRatingDisplay(rating);
                });
            });

            filterBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    filterBtns.forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    currentFilter = e.target.getAttribute('data-filter');
                    currentCategory = currentFilter;
                    expandedSeriesId = null;
                    
                    document.querySelectorAll('[data-category]').forEach(opt => {
                        opt.classList.remove('active');
                        opt.querySelector('.filter-option-check').style.display = 'none';
                    });
                    const matchingCategory = document.querySelector(`[data-category="${currentFilter}"]`);
                    if (matchingCategory) {
                        matchingCategory.classList.add('active');
                        matchingCategory.querySelector('.filter-option-check').style.display = 'inline';
                    }
                    
                    saveSettings();
                    renderSeries();
                });
            });
            
            filterBtns.forEach(btn => {
                if (btn.getAttribute('data-filter') === currentFilter) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            searchInput.addEventListener('input', (e) => {
                renderSeries();
                renderStatistics();
            });

            const filterMenuBtn = document.getElementById('filterMenuBtn');
            const filterDropdown = document.getElementById('filterDropdown');

            filterMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                filterDropdown.classList.toggle('show');
            });

            document.addEventListener('click', (e) => {
                if (!filterDropdown.contains(e.target) && !filterMenuBtn.contains(e.target)) {
                    filterDropdown.classList.remove('show');
                }
            });

            document.querySelectorAll('[data-sort]').forEach(option => {
                option.addEventListener('click', (e) => {
                    document.querySelectorAll('[data-sort]').forEach(opt => {
                        opt.classList.remove('active');
                        const check = opt.querySelector('.filter-option-check');
                        if (check) {
                            check.style.display = 'none';
                        }
                    });
                    
                    e.currentTarget.classList.add('active');
                    const currentCheck = e.currentTarget.querySelector('.filter-option-check');
                    if (currentCheck) {
                        currentCheck.style.display = 'inline';
                    }
                    
                    currentSort = e.currentTarget.getAttribute('data-sort');
                    saveSettings();
                    renderSeries();
                    renderStatistics();
                });
            });

            const customSizeControls = document.getElementById('customSizeControls');
            const customSizeSlider = document.getElementById('customSizeSlider');
            const customSizeValueDisplay = document.getElementById('customSizeValue');

            document.querySelectorAll('[data-size]').forEach(option => {
                option.addEventListener('click', (e) => {
                    document.querySelectorAll('[data-size]').forEach(opt => opt.classList.remove('active'));
                    e.currentTarget.classList.add('active');
                    currentViewSize = e.currentTarget.getAttribute('data-size');
                    
                    // Show/hide custom size controls
                    if (currentViewSize === 'custom') {
                        customSizeControls.style.display = 'block';
                        if (customSizeSlider) {
                            customSizeSlider.value = customSizeValue;
                            if (customSizeValueDisplay) {
                                customSizeValueDisplay.textContent = customSizeValue;
                            }
                        }
                    } else {
                        customSizeControls.style.display = 'none';
                    }
                    
                    saveSettings();
                    renderSeries();
                    renderStatistics();
                });
            });

            // Custom size slider event listener
            if (customSizeSlider) {
                customSizeSlider.addEventListener('input', (e) => {
                    customSizeValue = parseInt(e.target.value);
                    if (customSizeValueDisplay) {
                        customSizeValueDisplay.textContent = customSizeValue;
                    }
                    if (currentViewSize === 'custom') {
                        saveSettings();
                        renderSeries();
                    }
                });
            }

            document.querySelectorAll('[data-category]').forEach(option => {
                option.addEventListener('click', (e) => {
                    document.querySelectorAll('[data-category]').forEach(opt => {
                        opt.classList.remove('active');
                        opt.querySelector('.filter-option-check').style.display = 'none';
                    });
                    e.currentTarget.classList.add('active');
                    e.currentTarget.querySelector('.filter-option-check').style.display = 'inline';
                    currentCategory = e.currentTarget.getAttribute('data-category');
                    
                    if (currentCategory !== 'all') {
                        currentFilter = currentCategory;
                        filterBtns.forEach(btn => {
                            btn.classList.toggle('active', btn.getAttribute('data-filter') === currentFilter);
                        });
                    }
                    
                    saveSettings();
                    renderSeries();
                    renderStatistics();
                });
            });

            document.querySelectorAll('[data-content-filter]').forEach(option => {
                option.addEventListener('click', (e) => {
                    document.querySelectorAll('[data-content-filter]').forEach(opt => {
                        opt.classList.remove('active');
                        opt.querySelector('.filter-option-check').style.display = 'none';
                    });
                    e.currentTarget.classList.add('active');
                    e.currentTarget.querySelector('.filter-option-check').style.display = 'inline';
                    currentContentFilter = e.currentTarget.getAttribute('data-content-filter');
                    
                    saveSettings();
                    renderSeries();
                });
            });

            // Show checkmarks for active filters
            document.querySelectorAll('.filter-option-check').forEach(check => {
                check.style.display = 'none';
            });
            document.querySelectorAll('.filter-option.active .filter-option-check').forEach(check => {
                check.style.display = 'inline';
            });
            
            // Set initial content filter state
            const contentFilterOption = document.querySelector(`[data-content-filter="${currentContentFilter}"]`);
            if (contentFilterOption) {
                contentFilterOption.classList.add('active');
                const check = contentFilterOption.querySelector('.filter-option-check');
                if (check) check.style.display = 'inline';
            }
        }

        function saveSeries() {
            const title = document.getElementById('seriesTitle').value.trim();
            const image = document.getElementById('seriesImage').value.trim();
            const genre = document.getElementById('seriesGenre').value.trim();
            const status = document.getElementById('seriesStatus').value;
            const contentType = document.getElementById('seriesContentType').value;
            const season = parseInt(document.getElementById('seriesSeason').value) || 1;
            const episode = parseInt(document.getElementById('seriesEpisode').value) || 1;
            const time = parseInt(document.getElementById('seriesTime').value) || 0;
            const maxTime = parseInt(document.getElementById('seriesMaxTime').value) || 0;
            const totalSeasons = parseInt(document.getElementById('seriesTotalSeasons').value) || 1;
            const totalEpisodes = parseInt(document.getElementById('seriesTotalEpisodes').value) || 10;
            const imdbRating = document.getElementById('seriesImdb').value.trim();
            const language = document.getElementById('seriesLanguage').value.trim();
            const inQueue = document.getElementById('seriesInQueue').checked;
            const userRating = parseFloat(document.getElementById('seriesUserRatingValue').value) || 0;
            const tagsInput = document.getElementById('seriesTags').value.trim();
            const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];
            const notes = document.getElementById('seriesNotes').value.trim();
            const startedDate = document.getElementById('seriesStartedDate').value || null;
            const completedDate = document.getElementById('seriesCompletedDate').value || null;
            const lastWatchedDate = document.getElementById('seriesLastWatchedDate').value || null;
            const normalized = applyWantToWatchRules({
                status,
                time,
                userRating,
                startedDate,
                completedDate,
                lastWatchedDate
            });

            // Read actors
            const actors = [];
            document.querySelectorAll('#actorsContainer .actor-entry').forEach(entry => {
                const name = entry.querySelector('.actor-name').value.trim();
                const img = entry.querySelector('.actor-img').value.trim();
                if (name) actors.push({ name, img });
            });

            // Read streaming services (multi-select)
            const streamingService = document.getElementById('seriesStreamingService').value || '';
            
            const editingId = seriesForm.getAttribute('data-editing');
            
            // Duplicate detection (only for new items)
            if (!editingId) {
                const duplicate = series.find(s => 
                    s.title.toLowerCase() === title.toLowerCase() && 
                    s.contentType === contentType
                );
                if (duplicate) {
                    if (!confirm(`A ${contentType === 'series' ? 'series' : 'movie'} with the title "${title}" already exists.\n\nDo you want to add it anyway?`)) {
                        return;
                    }
                }
            }
            
            if (editingId) {
                const index = series.findIndex(s => s.id === parseInt(editingId));
                if (index !== -1) {
                    const oldInQueue = series[index].inQueue;
                    const oldStatus = series[index].status;
                    
                    // Update last watched date if status changed to watching or episode/time changed
                    let updatedLastWatched = lastWatchedDate;
                    if (status === 'watching' && (oldStatus !== 'watching' || episode !== series[index].episode || time !== series[index].time)) {
                        updatedLastWatched = getLocalDateString();
                    }
                    // Update completed date if status changed to completed
                    let updatedCompletedDate = normalized.completedDate;
                    if (status === 'completed' && oldStatus !== 'completed') {
                        updatedCompletedDate = updatedCompletedDate || getLocalDateString();
                    }
                    const effectiveTime = status === 'completed' && maxTime > 0 ? maxTime : normalized.time;
                    
                    series[index] = {
                        ...series[index],
                        title,
                        image,
                        genre,
                        status,
                        contentType,
                        streamingService: contentType === 'series' ? streamingService : '',
                        season: contentType === 'series' ? season : 1,
                        episode: contentType === 'series' ? episode : 1,
                        time: effectiveTime,
                        maxTime,
                        totalSeasons: contentType === 'series' ? totalSeasons : 1,
                        totalEpisodes: contentType === 'series' ? totalEpisodes : 10,
                        imdbRating,
                        language,
                        inQueue,
                        userRating: normalized.userRating,
                        tags,
                        notes,
                        startedDate: normalized.startedDate || series[index].startedDate || null,
                        completedDate: updatedCompletedDate || series[index].completedDate || null,
                        lastWatchedDate: normalized.lastWatchedDate || updatedLastWatched || series[index].lastWatchedDate || null,
                        actors: actors
                    };
                    
                    if (inQueue && !oldInQueue) {
                        const maxOrder = Math.max(...series.filter(s => s.inQueue).map(s => s.queueOrder), -1);
                        series[index].queueOrder = maxOrder + 1;
                    } else if (!inQueue && oldInQueue) {
                        series[index].queueOrder = -1;
                    }
                }
                seriesForm.removeAttribute('data-editing');
            } else {
                const newId = series.length > 0 ? Math.max(...series.map(s => s.id)) + 1 : 1;
                const queueOrder = inQueue ? 
                    Math.max(...series.filter(s => s.inQueue).map(s => s.queueOrder), -1) + 1 : 
                    -1;
                
                // Set started date if status is watching
                const autoStartedDate = (status === 'watching' && !normalized.startedDate) ? getLocalDateString() : normalized.startedDate;
                const autoCompletedDate = (status === 'completed' && !normalized.completedDate) ? getLocalDateString() : normalized.completedDate;
                const autoLastWatched = normalized.lastWatchedDate;
                const effectiveTime = status === 'completed' && maxTime > 0 ? maxTime : normalized.time;
                
                series.push({
                    id: newId,
                    title,
                    image,
                    genre,
                    status,
                    contentType,
                    streamingService: contentType === 'series' ? streamingService : '',
                    season: contentType === 'series' ? season : 1,
                    episode: contentType === 'series' ? episode : 1,
                    time: effectiveTime,
                    maxTime,
                    totalSeasons: contentType === 'series' ? totalSeasons : 1,
                    totalEpisodes: contentType === 'series' ? totalEpisodes : 10,
                    imdbRating,
                    language,
                    inQueue,
                    queueOrder,
                    userRating: normalized.userRating,
                    tags,
                    notes,
                    startedDate: autoStartedDate,
                    completedDate: autoCompletedDate,
                    lastWatchedDate: autoLastWatched,
                    actors: actors,
                    watchHistory: []
                });
            }
            
                    saveData();
                    
                    // Auto-export if enabled
                    if (settings.autoExport) {
                        setTimeout(function() {
                            exportLists(false); // Manual export from form submit
                        }, 500);
                    }
                    
                    seriesModal.style.display = 'none';
                    expandedSeriesId = null;
                    renderSeries();
                    renderPriorityList();
                    renderStatistics();
                    updateCurrentUserDisplay();
                }

        function editSeries(id) {
            const serie = series.find(s => s.id === id);
            if (!serie) return;
            
            const contentType = serie.contentType || 'series';
            
            document.getElementById('seriesTitle').value = serie.title || '';
            document.getElementById('seriesImage').value = serie.image || '';
            document.getElementById('seriesGenre').value = serie.genre || '';
            document.getElementById('seriesStatus').value = serie.status;
            document.getElementById('seriesContentType').value = contentType;
            document.getElementById('seriesStreamingService').value = serie.streamingService || '';
            document.getElementById('seriesSeason').value = serie.season || 1;
            document.getElementById('seriesEpisode').value = serie.episode || 1;
            document.getElementById('seriesTime').value = serie.time || 0;
            document.getElementById('seriesMaxTime').value = serie.maxTime || 0;
            document.getElementById('seriesTotalSeasons').value = serie.totalSeasons || 1;
            document.getElementById('seriesTotalEpisodes').value = serie.totalEpisodes || 10;
            document.getElementById('seriesImdb').value = serie.imdbRating || '';
            document.getElementById('seriesLanguage').value = serie.language || '';
            document.getElementById('seriesInQueue').checked = serie.inQueue || false;
            
            // New fields
            const userRating = serie.userRating || 0;
            document.getElementById('seriesUserRatingValue').value = userRating;
            updateRatingDisplay(userRating);
            
            document.getElementById('seriesTags').value = (serie.tags || []).join(', ');
            document.getElementById('seriesNotes').value = serie.notes || '';
            document.getElementById('seriesStartedDate').value = serie.startedDate || '';
            document.getElementById('seriesCompletedDate').value = serie.completedDate || '';
            document.getElementById('seriesLastWatchedDate').value = serie.lastWatchedDate || '';

            // Populate actors
            const actorEntries = document.querySelectorAll('#actorsContainer .actor-entry');
            const actors = serie.actors || [];
            actorEntries.forEach((entry, i) => {
                entry.querySelector('.actor-name').value = (actors[i] && actors[i].name) ? actors[i].name : '';
                entry.querySelector('.actor-img').value = (actors[i] && actors[i].img) ? actors[i].img : '';
            });

            // Populate streaming multi-select
            const chips = document.querySelectorAll('#streamingMultiSelect .streaming-chip');
            const services = (serie.streamingService || '').split(',').map(s => s.trim()).filter(Boolean);
            chips.forEach(chip => {
                chip.classList.toggle('selected', services.includes(chip.getAttribute('data-service')));
            });
            document.getElementById('seriesStreamingService').value = serie.streamingService || '';
            
            toggleEpisodeFields(contentType);
            handleStatusChange(serie.status);
            
            modalTitle.textContent = contentType === 'movie' ? 'Edit Movie' : 'Edit Series';
            seriesForm.setAttribute('data-editing', id);
            seriesModal.style.display = 'flex';
            const modalBody = seriesModal.querySelector('.modal');
            if (modalBody) modalBody.scrollTop = 0;
        }

        function updateRatingDisplay(rating) {
            const allStarRatings = document.querySelectorAll('.rating-input .star-rating');
            allStarRatings.forEach((starRating) => {
                const fullRating = parseFloat(starRating.getAttribute('data-rating'));
                const halfRating = parseFloat(starRating.getAttribute('data-half-rating'));
                const starFill = starRating.querySelector('.star-fill');
                const starHalf = starRating.querySelector('.star-half-fill');
                const starBg = starRating.querySelector('.star-bg');

                starRating.classList.remove('filled', 'half-filled');

                if (starFill) starFill.style.display = 'none';
                if (starHalf) starHalf.style.display = 'none';
                if (starBg) { starBg.setAttribute('fill', '#333'); starBg.setAttribute('stroke', '#555'); }

                if (rating >= fullRating) {
                    starRating.classList.add('filled');
                    if (starFill) starFill.style.display = 'block';
                    if (starBg) starBg.style.display = 'none';
                } else if (rating >= halfRating) {
                    starRating.classList.add('half-filled');
                    if (starHalf) starHalf.style.display = 'block';
                    if (starBg) { starBg.style.display = 'block'; starBg.setAttribute('fill', '#333'); starBg.setAttribute('stroke', '#555'); }
                } else {
                    if (starBg) starBg.style.display = 'block';
                }
            });
        }

        function toggleEpisodeFields(contentType) {
            const episodeFields = document.getElementById('seriesEpisodeFields');
            const streamingServiceField = document.getElementById('seriesStreamingService').parentElement;
            
            if (contentType === 'movie') {
                episodeFields.classList.add('hidden');
                streamingServiceField.style.display = 'none';
            } else {
                episodeFields.classList.remove('hidden');
                streamingServiceField.style.display = 'block';
                // Re-apply status handling when showing fields
                handleStatusChange(document.getElementById('seriesStatus').value);
            }
        }

        function handleStatusChange(status) {
            const currentSeasonGroup = document.getElementById('currentSeasonGroup');
            const currentEpisodeGroup = document.getElementById('currentEpisodeGroup');
            const totalSeasonsInput = document.getElementById('seriesTotalSeasons');
            const totalEpisodesInput = document.getElementById('seriesTotalEpisodes');
            const currentSeasonInput = document.getElementById('seriesSeason');
            const currentEpisodeInput = document.getElementById('seriesEpisode');
            const wantHiddenIds = [
                'seriesEpisodeFields',
                'seriesTime',
                'seriesMaxTime',
                'seriesImdb',
                'seriesLanguage',
                'seriesUserRating',
                'seriesTags',
                'seriesNotes',
                'seriesStartedDate',
                'seriesCompletedDate',
                'seriesLastWatchedDate',
                'actorsContainer'
            ];
            
            if (status === 'completed') {
                // Hide current season/episode fields
                currentSeasonGroup.classList.add('hidden');
                currentEpisodeGroup.classList.add('hidden');
                
                // Sync current with totals
                if (totalSeasonsInput.value) {
                    currentSeasonInput.value = totalSeasonsInput.value;
                }
                if (totalEpisodesInput.value) {
                    currentEpisodeInput.value = totalEpisodesInput.value;
                }
            } else {
                // Show current season/episode fields
                currentSeasonGroup.classList.remove('hidden');
                currentEpisodeGroup.classList.remove('hidden');
            }

            const hideForWant = status === 'want';
            wantHiddenIds.forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                const group = el.classList.contains('form-group') ? el : el.closest('.form-group');
                if (group) {
                    group.style.display = hideForWant ? 'none' : '';
                } else {
                    el.style.display = hideForWant ? 'none' : '';
                }
            });

            if (hideForWant) {
                document.getElementById('seriesTime').value = 0;
                document.getElementById('seriesUserRatingValue').value = 0;
                updateRatingDisplay(0);
                document.getElementById('seriesStartedDate').value = '';
                document.getElementById('seriesCompletedDate').value = '';
                document.getElementById('seriesLastWatchedDate').value = '';
            }
        }

        function deleteSeries(id) {
            if (confirm('Are you sure you want to delete this series?')) {
                series = series.filter(s => s.id !== id);
                saveData();
                expandedSeriesId = null;
                renderSeries();
                renderPriorityList();
                renderStatistics();
                updateCurrentUserDisplay();
            }
        }

        // Prevent images from blocking page load
        function setupImageLoading() {
            // Set timeout for image loading to prevent blocking
            const images = document.querySelectorAll('img');
            images.forEach(img => {
                if (!img.hasAttribute('loading')) {
                    img.loading = 'lazy';
                }
                if (!img.hasAttribute('decoding')) {
                    img.decoding = 'async';
                }
                // Add timeout handler
                const timeout = setTimeout(() => {
                    if (!img.complete) {
                        img.onerror = null;
                        img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1" fill="transparent"/></svg>';
                    }
                }, 5000); // 5 second timeout
                img.addEventListener('load', () => clearTimeout(timeout), { once: true });
                img.addEventListener('error', () => clearTimeout(timeout), { once: true });
            });
        }

        function init() {
            // Mark page as ready immediately
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                initializeApp();
            } else {
                document.addEventListener('DOMContentLoaded', initializeApp);
            }
            
            // Don't wait for window load - initialize immediately
            window.addEventListener('load', () => {
                // Page fully loaded, but we don't wait for this
            }, { once: true });
        }

        function initializeApp() {
            loadUsers();
            loadCurrentUser();
            loadData();
            loadSettings();
            loadAppSettings();
            loadNotifications(); // Load notifications for current user
            cleanupOldDismissedNotifications(); // Clean up old dismissed notifications
            applyTheme(currentTheme);
            // Setup event listeners first
            setupEventListeners();
            updateGlobalScrollLock();
            setInterval(updateGlobalScrollLock, 300);
            
            // Setup settings event listeners
            const autoExportCheckbox = document.getElementById('settingAutoExport');
            const showIntroCheckbox = document.getElementById('settingShowIntro');
            const showNotificationsCheckbox = document.getElementById('settingShowNotifications');
            
            if (autoExportCheckbox) {
                autoExportCheckbox.addEventListener('change', function() {
                    settings.autoExport = this.checked;
                    saveAppSettings();
                    setupAutoSaveInterval(); // Restart interval when checkbox changes (stops if unchecked)
                });
            }
            
            if (showIntroCheckbox) {
                showIntroCheckbox.addEventListener('change', function() {
                    settings.showIntro = this.checked;
                    saveAppSettings();
                });
            }
            
            if (showNotificationsCheckbox) {
                showNotificationsCheckbox.addEventListener('change', function() {
                    settings.showNotifications = this.checked;
                    saveAppSettings();
                });
            }
            
            // Auto-save interval selector
            const autoSaveIntervalSelect = document.getElementById('settingAutoSaveInterval');
            if (autoSaveIntervalSelect) {
                autoSaveIntervalSelect.addEventListener('change', function() {
                    settings.autoSaveInterval = this.value;
                    saveAppSettings();
                    setupAutoSaveInterval(); // Restart with new interval
                });
            }
            
            // Cookie warning modal
            const dismissCookieWarningBtn = document.getElementById('dismissCookieWarningBtn');
            if (dismissCookieWarningBtn) {
                dismissCookieWarningBtn.addEventListener('click', function() {
                    const cookieModal = document.getElementById('cookieWarningModal');
                    if (cookieModal) {
                        cookieModal.style.display = 'none';
                        localStorage.setItem('seriesTrackerCookieWarningDismissed', 'true');
                    }
                });
            }
            
            // Video intro modal
            const skipIntroBtn = document.getElementById('skipIntroBtn');
            if (skipIntroBtn) {
                skipIntroBtn.addEventListener('click', closeVideoIntro);
            }
            
            const introVideo = document.getElementById('introVideo');
            if (introVideo) {
                introVideo.addEventListener('ended', closeVideoIntro);
            }
            
            // Statistics toggle functionality
            const statsHeader = document.getElementById('statsHeader');
            const statsContent = document.getElementById('statsContent');
            const statsExpandIcon = document.getElementById('statsExpandIcon');
            
            if (statsHeader && statsContent && statsExpandIcon) {
                // Load saved state
                if (statisticsCollapsed) {
                    statsContent.classList.add('collapsed');
                    statsContent.style.maxHeight = '0';
                    statsContent.style.opacity = '0';
                    statsExpandIcon.classList.add('rotated');
                }
                
                statsHeader.addEventListener('click', function() {
                    const isCollapsed = statsContent.classList.contains('collapsed');
                    if (isCollapsed) {
                        statsContent.classList.remove('collapsed');
                        statsContent.style.maxHeight = '2000px';
                        statsContent.style.opacity = '1';
                        statsExpandIcon.classList.remove('rotated');
                        statisticsCollapsed = false;
                    } else {
                        statsContent.classList.add('collapsed');
                        statsContent.style.maxHeight = '0';
                        statsContent.style.opacity = '0';
                        statsExpandIcon.classList.add('rotated');
                        statisticsCollapsed = true;
                    }
                    saveSettings(); // Save statistics state
                });
            }
            
            // Check if we should show cookie warning, video intro, and notifications
            setTimeout(function() {
                checkCookieWarning();
                checkVideoIntro();
                checkNotifications(); // Check for notifications due today
            }, 500);
            
            // Setup image loading optimization
            setupImageLoading();
            
            // Then update display
            if (document.getElementById('currentUserName')) {
                updateCurrentUserDisplay();
            }
            
            // Set custom theme colors if custom theme is active
            if (currentTheme === 'custom') {
                const primaryColorInput = document.getElementById('primaryColor');
                const secondaryColorInput = document.getElementById('secondaryColor');
                const primaryColorCircle = document.getElementById('primaryColorCircle');
                const secondaryColorCircle = document.getElementById('secondaryColorCircle');
                const primaryColorValue = document.getElementById('primaryColorValue');
                const secondaryColorValue = document.getElementById('secondaryColorValue');
                
                if (primaryColorInput && secondaryColorInput) {
                    primaryColorInput.value = customPrimaryColor;
                    secondaryColorInput.value = customSecondaryColor;
                    if (primaryColorCircle) {
                        primaryColorCircle.style.setProperty('--picker-color', customPrimaryColor);
                        primaryColorCircle.style.backgroundColor = customPrimaryColor;
                    }
                    if (secondaryColorCircle) {
                        secondaryColorCircle.style.setProperty('--picker-color', customSecondaryColor);
                        secondaryColorCircle.style.backgroundColor = customSecondaryColor;
                    }
                    if (primaryColorValue) primaryColorValue.textContent = customPrimaryColor.toUpperCase();
                    if (secondaryColorValue) secondaryColorValue.textContent = customSecondaryColor.toUpperCase();
                }
                document.getElementById('customThemeControls').classList.add('show');
            }
            
            // Set active theme option
            document.querySelectorAll('.theme-option').forEach(opt => {
                opt.classList.remove('active');
                opt.querySelector('.filter-option-check').style.display = 'none';
            });
            const activeThemeOption = document.querySelector(`[data-theme="${currentTheme}"]`);
            if (activeThemeOption) {
                activeThemeOption.classList.add('active');
                activeThemeOption.querySelector('.filter-option-check').style.display = 'inline';
            }
            
            // Restore filter states
            filterBtns.forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-filter') === currentFilter);
            });
            
            document.querySelectorAll('[data-sort]').forEach(opt => {
                opt.classList.toggle('active', opt.getAttribute('data-sort') === currentSort);
            });
            
            document.querySelectorAll('[data-size]').forEach(opt => {
                opt.classList.toggle('active', opt.getAttribute('data-size') === currentViewSize);
            });
            
            // Show/hide custom size controls based on current view size
            const customSizeControls = document.getElementById('customSizeControls');
            const customSizeSlider = document.getElementById('customSizeSlider');
            const customSizeValueDisplay = document.getElementById('customSizeValue');
            if (currentViewSize === 'custom' && customSizeControls) {
                customSizeControls.style.display = 'block';
                if (customSizeSlider) {
                    customSizeSlider.value = customSizeValue;
                }
                if (customSizeValueDisplay) {
                    customSizeValueDisplay.textContent = customSizeValue;
                }
            } else if (customSizeControls) {
                customSizeControls.style.display = 'none';
            }
            
            document.querySelectorAll('[data-category]').forEach(opt => {
                opt.classList.toggle('active', opt.getAttribute('data-category') === currentCategory);
            });
            
            document.querySelectorAll('[data-content-filter]').forEach(opt => {
                opt.classList.toggle('active', opt.getAttribute('data-content-filter') === currentContentFilter);
            });
            
            renderSeries();
            renderPriorityList();
            renderStatistics();
            
            // Bulk operations event listeners
            const bulkDeselectAll = document.getElementById('bulkDeselectAll');
            const bulkDeleteBtn = document.getElementById('bulkDelete');
            const bulkMoveWatchingBtn = document.getElementById('bulkMoveWatching');
            const bulkMoveWantBtn = document.getElementById('bulkMoveWant');
            const bulkMoveCompletedBtn = document.getElementById('bulkMoveCompleted');
            const bulkAddQueueBtn = document.getElementById('bulkAddQueue');
            const bulkRemoveQueueBtn = document.getElementById('bulkRemoveQueue');

            if (bulkDeselectAll) {
                bulkDeselectAll.addEventListener('click', () => {
                    document.querySelectorAll('.series-item-checkbox').forEach(cb => cb.checked = false);
                    updateBulkOperations();
                });
            }

            if (bulkDeleteBtn) {
                bulkDeleteBtn.addEventListener('click', bulkDelete);
            }

            if (bulkMoveWatchingBtn) {
                bulkMoveWatchingBtn.addEventListener('click', () => bulkChangeStatus('watching'));
            }

            if (bulkMoveWantBtn) {
                bulkMoveWantBtn.addEventListener('click', () => bulkChangeStatus('want'));
            }

            if (bulkMoveCompletedBtn) {
                bulkMoveCompletedBtn.addEventListener('click', () => bulkChangeStatus('completed'));
            }

            if (bulkAddQueueBtn) {
                bulkAddQueueBtn.addEventListener('click', () => bulkToggleQueue(true));
            }

            if (bulkRemoveQueueBtn) {
                bulkRemoveQueueBtn.addEventListener('click', () => bulkToggleQueue(false));
            }
            
            // Force page to be considered loaded after initialization
            // This prevents browser from waiting indefinitely for external resources
            setTimeout(() => {
                // Mark page as interactive/complete
                if (document.readyState === 'loading') {
                    // Trigger DOMContentLoaded if still loading
                    document.dispatchEvent(new Event('DOMContentLoaded'));
                }
                // Force load event after a short delay to prevent blocking
                if (performance.timing && performance.timing.loadEventEnd === 0) {
                    setTimeout(() => {
                        window.dispatchEvent(new Event('load'));
                    }, 50);
                }
            }, 100);
        }

        // Initialize immediately - don't wait for window load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init, { once: true });
        } else {
            init();
        }
    
