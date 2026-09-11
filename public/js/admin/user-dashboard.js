(() => {
    'use strict';

    const $ =
        id =>
            document.getElementById(
                id
            );

    const params =
        new URLSearchParams(
            window.location.search
        );

    const userId =
        params.get(
            'id'
        );

    const charts =
        {};


    const el = {
        adminName:
            $('adminSessionName'),

        logout:
            $('adminLogoutButton'),

        userAvatar:
            $('userAvatar'),

        userName:
            $('userName'),

        userEmail:
            $('userEmail'),

        userStatus:
            $('userStatus'),

        userVerification:
            $('userVerification'),

        memberSince:
            $('memberSince'),

        total:
            $('totalPredictions'),

        avg:
            $('averageConfidence'),

        healthy:
            $('healthyCount'),

        diseased:
            $('diseasedCount'),

        today:
            $('todayCount'),

        recent:
            $('recentPredictions')
    };


    async function requireAdmin() {
        const response =
            await fetch(
                '/api/auth/me',
                {
                    credentials:
                        'include'
                }
            );

        if (!response.ok) {
            window.location.href =
                '/login.html';

            return false;
        }

        const result =
            await response.json();

        if (
            String(
                result.user?.role ||
                ''
            ).toLowerCase() !==
            'admin'
        ) {
            window.location.href =
                '/login.html';

            return false;
        }

        el.adminName.textContent =
            [
                result.user.first_name,
                result.user.last_name
            ]
                .filter(Boolean)
                .join(' ') ||
            result.user.email ||
            'Administrator';

        return true;
    }


    async function loadDashboard() {
        if (!userId) {
            window.location.href =
                '/admin/users.html';

            return;
        }

        try {
            const response =
                await fetch(
                    `/api/admin/users/${encodeURIComponent(
                        userId
                    )}/dashboard`,
                    {
                        credentials:
                            'include'
                    }
                );

            if (
                response.status ===
                401 ||
                response.status ===
                403
            ) {
                window.location.href =
                    '/login.html';

                return;
            }

            const result =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    'Unable to load user dashboard.'
                );
            }

            renderUser(
                result.user
            );

            renderStats(
                result.stats
            );

            renderCharts(
                result.charts
            );

            renderRecent(
                result.recent_predictions
            );

        } catch (error) {
            console.error(
                'Selected user dashboard:',
                error
            );

            el.userName.textContent =
                'Unable to load user';

            el.userEmail.textContent =
                error.message;
        }
    }


    function renderUser(user) {
        el.userName.textContent =
            user.name;

        el.userEmail.textContent =
            user.email;

        const initials =
            user.name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map(
                    part =>
                        part[0]
                )
                .join('')
                .toUpperCase() ||
            'U';

        el.userAvatar.textContent =
            initials;

        el.userStatus.textContent =
            user.is_active
                ? 'Active'
                : 'Inactive';

        el.userStatus.className =
            `status-badge ${
                user.is_active
                    ? 'active'
                    : 'inactive'
            }`;

        el.userVerification.textContent =
            user.email_verified
                ? 'Verified'
                : 'Unverified';

        el.userVerification.className =
            `verify-badge ${
                user.email_verified
                    ? 'verified'
                    : 'unverified'
            }`;

        el.memberSince.textContent =
            formatDate(
                user.created_at
            );
    }


    function renderStats(stats) {
        el.total.textContent =
            number(
                stats.total_predictions
            );

        el.avg.textContent =
            `${Number(
                stats.average_confidence ||
                0
            ).toFixed(2)}%`;

        el.healthy.textContent =
            number(
                stats.healthy
            );

        el.diseased.textContent =
            number(
                stats.diseased
            );

        el.today.textContent =
            number(
                stats.today
            );
    }


    function renderCharts(data) {
        replaceChart(
            'disease',
            'diseaseChart',
            {
                type:
                    'bar',

                data: {
                    labels:
                        data.disease.labels,

                    datasets: [
                        {
                            data:
                                data.disease.values,

                            backgroundColor:
                                '#79ad84',

                            borderColor:
                                '#286f45',

                            borderWidth:
                                1,

                            borderRadius:
                                7
                        }
                    ]
                },

                options:
                    chartOptions()
            }
        );


        replaceChart(
            'confidence',
            'confidenceChart',
            {
                type:
                    'bar',

                data: {
                    labels:
                        data.confidence.labels,

                    datasets: [
                        {
                            data:
                                data.confidence.values,

                            backgroundColor: [
                                '#4f9160',
                                '#78aa80',
                                '#d6a055',
                                '#aa7c5d'
                            ],

                            borderRadius:
                                7
                        }
                    ]
                },

                options:
                    chartOptions()
            }
        );


        replaceChart(
            'trend',
            'trendChart',
            {
                type:
                    'line',

                data: {
                    labels:
                        data.trend.labels,

                    datasets: [
                        {
                            data:
                                data.trend.values,

                            borderColor:
                                '#286f45',

                            backgroundColor:
                                'rgba(40,111,69,.08)',

                            fill:
                                true,

                            tension:
                                0.35,

                            pointRadius:
                                3
                        }
                    ]
                },

                options:
                    chartOptions()
            }
        );
    }


    function replaceChart(
        key,
        canvasId,
        config
    ) {
        if (charts[key]) {
            charts[key].destroy();
        }

        const canvas =
            $(
                canvasId
            );

        charts[key] =
            new Chart(
                canvas,
                config
            );
    }


    function chartOptions() {
        return {
            responsive:
                true,

            maintainAspectRatio:
                false,

            animation:
                false,

            plugins: {
                legend: {
                    display:
                        false
                }
            },

            scales: {
                x: {
                    grid: {
                        display:
                            false
                    },

                    ticks: {
                        color:
                            '#78857d',

                        font: {
                            family:
                                'Poppins',

                            size:
                                9
                        }
                    }
                },

                y: {
                    beginAtZero:
                        true,

                    ticks: {
                        precision:
                            0,

                        color:
                            '#78857d',

                        font: {
                            family:
                                'Poppins',

                            size:
                                9
                        }
                    },

                    grid: {
                        color:
                            'rgba(65,85,71,.08)'
                    }
                }
            }
        };
    }


    function renderRecent(items) {
        if (!items.length) {
            el.recent.innerHTML =
                `
                    <div class="empty-state">
                        This user has no prediction records yet.
                    </div>
                `;

            return;
        }

        el.recent.innerHTML =
            items
                .map(
                    item => {
                        const location =
                            [
                                item.barangay,
                                item.municipality,
                                item.province
                            ]
                                .filter(Boolean)
                                .join(', ') ||
                            'Unspecified';

                        return `
                            <article class="recent-item">

                                <div class="recent-thumb">
                                    ${
                                        item.image_url
                                            ? `
                                                <img
                                                    src="${escapeHtml(item.image_url)}"
                                                    alt=""
                                                    loading="lazy"
                                                >
                                            `
                                            : ''
                                    }
                                </div>

                                <div class="recent-copy">
                                    <strong>
                                        ${escapeHtml(item.disease)}
                                    </strong>

                                    <span>
                                        ${escapeHtml(location)}
                                    </span>

                                    <span>
                                        ${formatDateTime(item.created_at)}
                                    </span>
                                </div>

                                <div class="recent-action">
                                    <span class="confidence-pill">
                                        ${Number(item.confidence).toFixed(2)}%
                                    </span>

                                    <a
                                        href="/prediction-detail.html?id=${encodeURIComponent(item.id)}"
                                    >
                                        View Result →
                                    </a>
                                </div>

                            </article>
                        `;
                    }
                )
                .join('');
    }


    el.logout.addEventListener(
        'click',
        async () => {
            try {
                await fetch(
                    '/api/auth/logout',
                    {
                        method:
                            'POST',

                        credentials:
                            'include'
                    }
                );
            } finally {
                window.location.href =
                    '/login.html';
            }
        }
    );


    const number =
        value =>
            new Intl.NumberFormat(
                'en-PH'
            ).format(
                Number(
                    value ||
                    0
                )
            );


    function formatDate(value) {
        if (!value) {
            return '—';
        }

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return '—';
        }

        return new Intl.DateTimeFormat(
            'en-PH',
            {
                timeZone:
                    'Asia/Manila',

                month:
                    'short',

                day:
                    'numeric',

                year:
                    'numeric'
            }
        ).format(date);
    }


    function formatDateTime(value) {
        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return '—';
        }

        return new Intl.DateTimeFormat(
            'en-PH',
            {
                timeZone:
                    'Asia/Manila',

                month:
                    'short',

                day:
                    'numeric',

                year:
                    'numeric',

                hour:
                    'numeric',

                minute:
                    '2-digit'
            }
        ).format(date);
    }


    const escapeHtml =
        value =>
            String(
                value ??
                ''
            )
                .replace(
                    /&/g,
                    '&amp;'
                )
                .replace(
                    /</g,
                    '&lt;'
                )
                .replace(
                    />/g,
                    '&gt;'
                )
                .replace(
                    /"/g,
                    '&quot;'
                )
                .replace(
                    /'/g,
                    '&#039;'
                );


    requireAdmin()
        .then(
            ok => {
                if (ok) {
                    loadDashboard();
                }
            }
        );
})();
