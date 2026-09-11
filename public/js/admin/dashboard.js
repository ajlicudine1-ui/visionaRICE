(() => {
    'use strict';

    const $ = id => document.getElementById(id);

    const el = {
        province: $('provinceFilter'),
        municipality: $('municipalityFilter'),
        barangay: $('barangayFilter'),
        reset: $('resetLocationFilters'),
        refresh: $('refreshAdminDashboard'),
        filterSummary: $('activeFilterSummary'),
        total: $('totalPredictions'),
        users: $('activeUsers'),
        accuracy: $('accuracyRate'),
        today: $('todaysScans'),
        updated: $('lastUpdated'),
        healthy: $('healthyCount'),
        diseased: $('diseasedCount'),
        locations: $('topLocations'),
        recent: $('recentPredictionsBody')
    };

    const charts = {};

    async function load(overrides = {}) {
        const selected = {
            province: overrides.province !== undefined ? overrides.province : el.province.value,
            municipality: overrides.municipality !== undefined ? overrides.municipality : el.municipality.value,
            barangay: overrides.barangay !== undefined ? overrides.barangay : el.barangay.value
        };

        const params = new URLSearchParams();

        Object.entries(selected).forEach(([key, value]) => {
            if (value) params.set(key, value);
        });

        el.refresh.disabled = true;
        el.refresh.textContent = 'Loading...';

        try {
            const response = await fetch(`/api/admin/dashboard?${params}`, {
                credentials: 'include'
            });

            if (response.status === 401 || response.status === 403) {
                window.location.href = '/login.html';
                return;
            }

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Unable to load dashboard.');

            renderFilters(result.filters);
            renderKpis(result.kpis);
            renderCharts(result.charts);
            renderLocations(result.top_locations);
            renderRecent(result.recent_predictions);
            renderSummary(result.filters.selected);

            el.updated.textContent = formatDateTime(result.generated_at);

        } catch (error) {
            console.error(error);
            el.updated.textContent = 'Unable to load';
        } finally {
            el.refresh.disabled = false;
            el.refresh.textContent = 'Refresh';
        }
    }

    function fill(select, values, firstLabel, selected) {
        select.innerHTML = `<option value="">${firstLabel}</option>`;

        values.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            option.selected = value === selected;
            select.appendChild(option);
        });
    }

    function renderFilters(filters) {
        const { selected, options } = filters;

        fill(el.province, options.provinces, 'All Provinces', selected.province);
        fill(el.municipality, options.municipalities, 'All Municipalities / Cities', selected.municipality);
        fill(el.barangay, options.barangays, 'All Barangays', selected.barangay);

        el.municipality.disabled = !selected.province;
        el.barangay.disabled = !selected.municipality;
    }

    function renderKpis(k) {
        el.total.textContent = number(k.total_predictions);
        el.users.textContent = number(k.active_users);
        el.accuracy.textContent = `${Number(k.accuracy_rate || 0).toFixed(2)}%`;
        el.today.textContent = number(k.todays_scans);
    }

    function chart(name, id, config) {
        if (charts[name]) charts[name].destroy();
        charts[name] = new Chart($(id), config);
    }

    function commonOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#7a877f',
                        font: { family: 'Poppins', size: 9 }
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                        color: '#7a877f',
                        font: { family: 'Poppins', size: 9 }
                    },
                    grid: {
                        color: 'rgba(70,90,76,.08)'
                    }
                }
            }
        };
    }

    function renderCharts(data) {
        chart('disease', 'diseaseChart', {
            type: 'bar',
            data: {
                labels: data.disease.labels,
                datasets: [{
                    data: data.disease.values,
                    backgroundColor: '#79ad84',
                    borderColor: '#286f45',
                    borderWidth: 1,
                    borderRadius: 7
                }]
            },
            options: commonOptions()
        });

        chart('health', 'healthChart', {
            type: 'doughnut',
            data: {
                labels: data.health.labels,
                datasets: [{
                    data: data.health.values,
                    backgroundColor: ['#64ad70', '#e2a04d'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: { legend: { display: false } }
            }
        });

        el.healthy.textContent = number(data.health.values[0] || 0);
        el.diseased.textContent = number(data.health.values[1] || 0);

        chart('trend', 'trendChart', {
            type: 'line',
            data: {
                labels: data.trend.labels,
                datasets: [{
                    data: data.trend.values,
                    borderColor: '#286f45',
                    backgroundColor: 'rgba(40,111,69,.08)',
                    fill: true,
                    tension: .35,
                    pointRadius: 3
                }]
            },
            options: commonOptions()
        });

        chart('confidence', 'confidenceChart', {
            type: 'bar',
            data: {
                labels: data.confidence.labels,
                datasets: [{
                    data: data.confidence.values,
                    backgroundColor: ['#4f9160', '#78aa80', '#d6a055', '#aa7c5d'],
                    borderRadius: 7
                }]
            },
            options: commonOptions()
        });
    }

    function renderLocations(items) {
        if (!items?.length) {
            el.locations.innerHTML = '<div class="empty-state">No location data for this filter.</div>';
            return;
        }

        el.locations.innerHTML = items.map((item, index) => `
            <div class="location-item">
                <span class="location-rank">${index + 1}</span>
                <strong title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</strong>
                <span class="location-count">${number(item.count)}</span>
            </div>
        `).join('');
    }

    function renderRecent(items) {
        if (!items?.length) {
            el.recent.innerHTML = '<tr><td colspan="5" class="empty-table">No predictions for this filter.</td></tr>';
            return;
        }

        el.recent.innerHTML = items.map(item => {
            const location = [item.barangay, item.municipality, item.province]
                .filter(Boolean)
                .join(', ') || 'Unspecified';

            return `
                <tr>
                    <td>${escapeHtml(item.user)}</td>
                    <td>${escapeHtml(item.disease)}</td>
                    <td><span class="confidence-pill">${formatConfidence(item.confidence)}</span></td>
                    <td title="${escapeHtml(location)}">${escapeHtml(shorten(location, 34))}</td>
                    <td>${formatDate(item.created_at)}</td>
                </tr>
            `;
        }).join('');
    }

    function renderSummary(selected) {
        const parts = [selected.province, selected.municipality, selected.barangay].filter(Boolean);

        el.filterSummary.textContent = parts.length
            ? `Showing predictions for ${parts.join(' → ')}.`
            : 'Showing all prediction locations.';
    }

    el.province.addEventListener('change', () => {
        load({ province: el.province.value, municipality: '', barangay: '' });
    });

    el.municipality.addEventListener('change', () => {
        load({
            province: el.province.value,
            municipality: el.municipality.value,
            barangay: ''
        });
    });

    el.barangay.addEventListener('change', () => load());

    el.reset.addEventListener('click', () => {
        load({ province: '', municipality: '', barangay: '' });
    });

    el.refresh.addEventListener('click', () => load());

    const number = value =>
        new Intl.NumberFormat('en-PH').format(Number(value || 0));

    const formatConfidence = value =>
        Number.isFinite(Number(value)) ? `${Number(value).toFixed(2)}%` : '—';

    function formatDate(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';

        return new Intl.DateTimeFormat('en-PH', {
            timeZone: 'Asia/Manila',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }).format(date);
    }

    function formatDateTime(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';

        return new Intl.DateTimeFormat('en-PH', {
            timeZone: 'Asia/Manila',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        }).format(date);
    }

    const shorten = (value, max) =>
        String(value).length > max
            ? `${String(value).slice(0, max - 1)}…`
            : String(value);

    const escapeHtml = value =>
        String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

    load();
})();
