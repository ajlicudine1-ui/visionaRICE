(() => {
    'use strict';

    const $ = id => document.getElementById(id);

    const el = {
        search: $('searchFilter'),
        disease: $('diseaseFilter'),
        confidence: $('confidenceFilter'),
        date: $('dateFilter'),
        province: $('provinceFilter'),
        municipality: $('municipalityFilter'),
        barangay: $('barangayFilter'),
        reset: $('resetFiltersButton'),
        refresh: $('refreshButton'),
        exportCsv: $('exportCsvButton'),
        cardView: $('cardViewButton'),
        tableView: $('tableViewButton'),
        cards: $('predictionCards'),
        tableWrap: $('predictionTableWrap'),
        tableBody: $('predictionTableBody'),
        total: $('totalResults'),
        averageConfidence: $('averageConfidence'),
        healthy: $('healthyCount'),
        diseased: $('diseasedCount'),
        updated: $('lastUpdated'),
        summary: $('activeFilterSummary'),
        adminName: $('adminSessionName'),
        logout: $('adminLogoutButton')
    };

    let currentPredictions = [];
    let searchTimer = null;

    async function requireAdmin() {
        const response = await fetch('/api/auth/me', {
            credentials: 'include'
        });

        if (!response.ok) {
            window.location.href = '/login.html';
            return false;
        }

        const result = await response.json();

        if (String(result.user?.role || '').toLowerCase() !== 'admin') {
            window.location.href = '/login.html';
            return false;
        }

        el.adminName.textContent =
            [result.user.first_name, result.user.last_name]
                .filter(Boolean)
                .join(' ') ||
            result.user.email ||
            'Administrator';

        return true;
    }

    async function load(overrides = {}) {
        const selected = {
            search: overrides.search !== undefined ? overrides.search : el.search.value,
            disease: overrides.disease !== undefined ? overrides.disease : el.disease.value,
            confidence: overrides.confidence !== undefined ? overrides.confidence : el.confidence.value,
            date: overrides.date !== undefined ? overrides.date : el.date.value,
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
            const response = await fetch(`/api/admin/predictions?${params.toString()}`, {
                credentials: 'include'
            });

            if (response.status === 401 || response.status === 403) {
                window.location.href = '/login.html';
                return;
            }

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Unable to load predictions.');

            currentPredictions = result.predictions || [];
            renderStats(result.stats);
            renderFilters(result.filters);
            renderCards(currentPredictions);
            renderTable(currentPredictions);
            renderSummary(result.filters.selected);
            el.updated.textContent = formatDateTime(result.generated_at);

        } catch (error) {
            console.error('Admin predictions:', error);
            el.cards.innerHTML = '<div class="empty-state">Unable to load prediction records.</div>';
        } finally {
            el.refresh.disabled = false;
            el.refresh.textContent = 'Refresh';
        }
    }

    function renderStats(stats) {
        el.total.textContent = number(stats.total);
        el.averageConfidence.textContent = `${Number(stats.average_confidence || 0).toFixed(2)}%`;
        el.healthy.textContent = number(stats.healthy);
        el.diseased.textContent = number(stats.diseased);
    }

    function fillSelect(select, values, firstLabel, selectedValue, objects = false) {
        select.innerHTML = '';

        const first = document.createElement('option');
        first.value = '';
        first.textContent = firstLabel;
        select.appendChild(first);

        values.forEach(item => {
            const option = document.createElement('option');
            option.value = objects ? item.value : item;
            option.textContent = objects ? item.label : item;
            option.selected = option.value === selectedValue;
            select.appendChild(option);
        });
    }

    function renderFilters(filters) {
        const { selected, options } = filters;

        fillSelect(el.disease, options.diseases, 'All Diseases', selected.disease, true);
        fillSelect(el.province, options.provinces, 'All Provinces', selected.province);
        fillSelect(el.municipality, options.municipalities, 'All Municipalities / Cities', selected.municipality);
        fillSelect(el.barangay, options.barangays, 'All Barangays', selected.barangay);

        el.municipality.disabled = !selected.province;
        el.barangay.disabled = !selected.municipality;
    }

    function renderCards(items) {
        if (!items.length) {
            el.cards.innerHTML = '<div class="empty-state">No prediction records match the selected filters.</div>';
            return;
        }

        el.cards.innerHTML = items.map(item => {
            const location = [item.barangay, item.municipality, item.province]
                .filter(Boolean)
                .join(', ') || 'Unspecified';

            const isHealthy = item.disease_key === 'healthy_rice_plant';

            return `
                <article class="prediction-item">
                    <div class="prediction-thumb">
                        ${item.image_url
                            ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.disease)}" loading="lazy">`
                            : '<div class="prediction-thumb-placeholder">🌿</div>'}
                    </div>

                    <div class="prediction-content">
                        <div class="prediction-topline">
                            <h3>${escapeHtml(item.disease)}</h3>
                            <span class="disease-status ${isHealthy ? 'healthy' : ''}">${isHealthy ? 'Healthy' : 'Detected'}</span>
                        </div>

                        <div class="prediction-meta">
                            <div><strong>User:</strong> ${escapeHtml(item.user.name)}</div>
                            <div><strong>Email:</strong> ${escapeHtml(item.user.email || '—')}</div>
                            <div title="${escapeHtml(location)}"><strong>Location:</strong> ${escapeHtml(location)}</div>
                            <div><strong>Date:</strong> ${formatDateTime(item.created_at)}</div>
                        </div>
                    </div>

                    <div class="prediction-actions">
                        <span class="confidence-pill">${formatConfidence(item.confidence)}</span>
                        <a class="view-result-link" href="/prediction-detail.html?id=${encodeURIComponent(item.id)}">View Result →</a>
                    </div>
                </article>
            `;
        }).join('');
    }

    function renderTable(items) {
        if (!items.length) {
            el.tableBody.innerHTML = '<tr><td colspan="7" class="empty-table">No prediction records match the selected filters.</td></tr>';
            return;
        }

        el.tableBody.innerHTML = items.map(item => {
            const location = [item.barangay, item.municipality, item.province]
                .filter(Boolean)
                .join(', ') || 'Unspecified';

            return `
                <tr>
                    <td><div class="table-thumb">${item.image_url ? `<img src="${escapeHtml(item.image_url)}" alt="" loading="lazy">` : ''}</div></td>
                    <td>${escapeHtml(item.disease)}</td>
                    <td>${escapeHtml(item.user.name)}</td>
                    <td><span class="confidence-pill">${formatConfidence(item.confidence)}</span></td>
                    <td title="${escapeHtml(location)}">${escapeHtml(shorten(location, 30))}</td>
                    <td>${formatDate(item.created_at)}</td>
                    <td><a class="view-result-link" href="/prediction-detail.html?id=${encodeURIComponent(item.id)}">View</a></td>
                </tr>
            `;
        }).join('');
    }

    function renderSummary(selected) {
        const labels = [];

        if (selected.disease) labels.push(el.disease.options[el.disease.selectedIndex]?.textContent);
        if (selected.confidence) labels.push(el.confidence.options[el.confidence.selectedIndex]?.textContent);
        if (selected.date) labels.push(el.date.options[el.date.selectedIndex]?.textContent);
        [selected.province, selected.municipality, selected.barangay].filter(Boolean).forEach(v => labels.push(v));
        if (selected.search) labels.push(`Search: "${selected.search}"`);

        el.summary.textContent = labels.length
            ? `Active filters: ${labels.join(' • ')}`
            : 'Showing all prediction records.';
    }

    function exportCsv() {
        if (!currentPredictions.length) return;

        const rows = [[
            'Prediction ID','Disease','Confidence','User','Email','Province','Municipality','Barangay','Created At'
        ], ...currentPredictions.map(item => [
            item.id, item.disease, item.confidence, item.user.name, item.user.email,
            item.province, item.municipality, item.barangay, item.created_at
        ])];

        const csv = rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `visionarice-admin-predictions-${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    el.search.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => load(), 350);
    });

    [el.disease, el.confidence, el.date, el.barangay].forEach(input => {
        input.addEventListener('change', () => load());
    });

    el.province.addEventListener('change', () => {
        load({ province: el.province.value, municipality: '', barangay: '' });
    });

    el.municipality.addEventListener('change', () => {
        load({ province: el.province.value, municipality: el.municipality.value, barangay: '' });
    });

    el.reset.addEventListener('click', () => {
        el.search.value = '';
        el.confidence.value = '';
        el.date.value = '';
        load({ search: '', disease: '', confidence: '', date: '', province: '', municipality: '', barangay: '' });
    });

    el.refresh.addEventListener('click', () => load());
    el.exportCsv.addEventListener('click', exportCsv);

    el.cardView.addEventListener('click', () => {
        el.cards.classList.remove('hidden');
        el.tableWrap.classList.add('hidden');
        el.cardView.classList.add('active');
        el.tableView.classList.remove('active');
    });

    el.tableView.addEventListener('click', () => {
        el.cards.classList.add('hidden');
        el.tableWrap.classList.remove('hidden');
        el.cardView.classList.remove('active');
        el.tableView.classList.add('active');
    });

    el.logout.addEventListener('click', async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        } finally {
            window.location.href = '/login.html';
        }
    });

    const number = value => new Intl.NumberFormat('en-PH').format(Number(value || 0));
    const formatConfidence = value => Number.isFinite(Number(value)) ? `${Number(value).toFixed(2)}%` : '—';

    function formatDate(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';
        return new Intl.DateTimeFormat('en-PH', {
            timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric'
        }).format(date);
    }

    function formatDateTime(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';
        return new Intl.DateTimeFormat('en-PH', {
            timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
        }).format(date);
    }

    const shorten = (value, max) => String(value).length > max ? `${String(value).slice(0, max - 1)}…` : String(value);
    const escapeHtml = value => String(value ?? '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');

    requireAdmin().then(ok => {
        if (ok) load();
    });
})();
