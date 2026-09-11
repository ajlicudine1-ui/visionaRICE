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

    const charts = {};


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


    // =========================================
    // CHECK ADMIN SESSION
    // =========================================

    async function requireAdmin() {
        try {
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
                !result.user ||
                String(
                    result.user.role ||
                    ''
                ).toLowerCase() !==
                'admin'
            ) {
                window.location.href =
                    '/login.html';

                return false;
            }

            const adminName =
                [
                    result.user.first_name,
                    result.user.last_name
                ]
                    .filter(Boolean)
                    .join(' ');

            if (el.adminName) {
                el.adminName.textContent =
                    adminName ||
                    result.user.email ||
                    'Administrator';
            }

            return true;

        } catch (error) {
            console.error(
                'Admin authentication error:',
                error
            );

            window.location.href =
                '/login.html';

            return false;
        }
    }


    // =========================================
    // LOAD SELECTED USER DASHBOARD
    // =========================================

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
                result.recent_predictions ||
                []
            );

        } catch (error) {
            console.error(
                'Selected user dashboard:',
                error
            );

            if (el.userName) {
                el.userName.textContent =
                    'Unable to load user';
            }

            if (el.userEmail) {
                el.userEmail.textContent =
                    error.message;
            }

            if (el.recent) {
                el.recent.innerHTML =
                    `
                        <div class="empty-state">
                            Unable to load recent predictions.
                        </div>
                    `;
            }
        }
    }


    // =========================================
    // USER INFORMATION
    // =========================================

    function renderUser(user) {
        if (!user) {
            return;
        }

        el.userName.textContent =
            user.name ||
            'Unnamed User';

        el.userEmail.textContent =
            user.email ||
            '—';


        const initials =
            String(
                user.name ||
                user.email ||
                'U'
            )
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


    // =========================================
    // STAT CARDS
    // =========================================

    function renderStats(stats) {
        if (!stats) {
            return;
        }

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


    // =========================================
    // CHARTS
    // =========================================

    function renderCharts(data) {
        if (!data) {
            return;
        }


        // Disease Distribution

        replaceChart(
            'disease',
            'diseaseChart',
            {
                type:
                    'bar',

                data: {
                    labels:
                        data.disease?.labels ||
                        [],

                    datasets: [
                        {
                            label:
                                'Predictions',

                            data:
                                data.disease?.values ||
                                [],

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


        // Confidence Score Ranges

        replaceChart(
            'confidence',
            'confidenceChart',
            {
                type:
                    'bar',

                data: {
                    labels:
                        data.confidence?.labels ||
                        [],

                    datasets: [
                        {
                            label:
                                'Predictions',

                            data:
                                data.confidence?.values ||
                                [],

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


        // Scans Over Time

        replaceChart(
            'trend',
            'trendChart',
            {
                type:
                    'line',

                data: {
                    labels:
                        data.trend?.labels ||
                        [],

                    datasets: [
                        {
                            label:
                                'Scans',

                            data:
                                data.trend?.values ||
                                [],

                            borderColor:
                                '#286f45',

                            backgroundColor:
                                'rgba(40,111,69,.08)',

                            fill:
                                true,

                            tension:
                                0.35,

                            pointRadius:
                                3,

                            pointHoverRadius:
                                4
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

        if (!canvas) {
            return;
        }

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
                },

                tooltip: {
                    displayColors:
                        false,

                    titleFont: {
                        family:
                            'Poppins'
                    },

                    bodyFont: {
                        family:
                            'Poppins'
                    }
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


    // =========================================
    // RECENT PREDICTIONS
    // DISPLAY ONLY
    // NO CLICK / NO VIEW RESULT LINK
    // =========================================

    function renderRecent(items) {
        if (
            !Array.isArray(items) ||
            items.length === 0
        ) {
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
                                                    src="${escapeHtml(
                                                        item.image_url
                                                    )}"
                                                    alt="${escapeHtml(
                                                        item.disease ||
                                                        'Prediction image'
                                                    )}"
                                                    loading="lazy"
                                                >
                                            `
                                            : `
                                                <div class="recent-thumb-placeholder">
                                                    🌿
                                                </div>
                                            `
                                    }

                                </div>


                                <div class="recent-copy">

                                    <strong>
                                        ${escapeHtml(
                                            item.disease ||
                                            'Unknown Result'
                                        )}
                                    </strong>


                                    <span>
                                        ${escapeHtml(
                                            location
                                        )}
                                    </span>


                                    <span>
                                        ${formatDateTime(
                                            item.created_at
                                        )}
                                    </span>

                                </div>


                                <div class="recent-action">

                                    <span class="confidence-pill">
                                        ${formatConfidence(
                                            item.confidence
                                        )}
                                    </span>

                                </div>

                            </article>
                        `;
                    }
                )
                .join('');
    }


    // =========================================
    // LOGOUT
    // =========================================

    if (el.logout) {
        el.logout.addEventListener(
            'click',
            async () => {
                el.logout.disabled =
                    true;

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

                } catch (error) {
                    console.error(
                        'Logout error:',
                        error
                    );

                } finally {
                    window.location.href =
                        '/login.html';
                }
            }
        );
    }


    // =========================================
    // FORMATTERS
    // =========================================

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


    function formatConfidence(value) {
        const numeric =
            Number(value);

        if (
            !Number.isFinite(
                numeric
            )
        ) {
            return '—';
        }

        return `${numeric.toFixed(2)}%`;
    }


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
                    'numeric',

                hour:
                    'numeric',

                minute:
                    '2-digit'
            }
        ).format(date);
    }


    function escapeHtml(value) {
        return String(
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
    }


    // =========================================
    // START
    // =========================================

    requireAdmin()
        .then(
            ok => {
                if (ok) {
                    loadDashboard();
                }
            }
        );

})();