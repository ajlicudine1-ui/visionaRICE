(() => {
    'use strict';

    const $ =
        id =>
            document.getElementById(id);


    const el = {
        adminName:
            $('adminSessionName'),

        logout:
            $('adminLogoutButton'),

        updated:
            $('lastUpdated'),

        refresh:
            $('refreshNotifications'),

        total:
            $('totalActivity'),

        today:
            $('todayActivity'),

        disease:
            $('diseaseAlerts'),

        users:
            $('newUsers'),

        search:
            $('searchInput'),

        type:
            $('typeFilter'),

        date:
            $('dateFilter'),

        reset:
            $('resetFilters'),

        count:
            $('notificationCount'),

        feed:
            $('notificationFeed')
    };


    let searchTimer =
        null;


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


    async function loadNotifications() {
        const params =
            new URLSearchParams();

        if (
            el.search.value.trim()
        ) {
            params.set(
                'search',
                el.search.value.trim()
            );
        }

        if (el.type.value) {
            params.set(
                'type',
                el.type.value
            );
        }

        if (el.date.value) {
            params.set(
                'date',
                el.date.value
            );
        }


        el.refresh.disabled =
            true;

        el.refresh.textContent =
            'Loading...';


        try {
            const response =
                await fetch(
                    `/api/admin/notifications?${params.toString()}`,
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
                    'Unable to load notifications.'
                );
            }


            renderStats(
                result.stats
            );

            renderNotifications(
                result.notifications ||
                []
            );

            el.updated.textContent =
                formatDateTime(
                    result.generated_at
                );


        } catch (error) {
            console.error(
                'Admin notifications:',
                error
            );

            el.feed.innerHTML =
                `
                    <div class="empty-state">
                        Unable to load notifications.
                    </div>
                `;

        } finally {
            el.refresh.disabled =
                false;

            el.refresh.textContent =
                'Refresh';
        }
    }


    function renderStats(stats = {}) {
        el.total.textContent =
            number(
                stats.total_activity
            );

        el.today.textContent =
            number(
                stats.today
            );

        el.disease.textContent =
            number(
                stats.disease_alerts
            );

        el.users.textContent =
            number(
                stats.new_users
            );
    }


    // =========================================
    // NOTIFICATION IMAGE / FALLBACK
    // =========================================

    function notificationMedia(item) {
        if (
            item.image_url &&
            String(
                item.image_url
            ).trim() !==
            ''
        ) {
            return `
                <div class="notification-media image">
                    <img
                        src="${escapeHtml(
                            item.image_url
                        )}"
                        alt="${escapeHtml(
                            item.disease ||
                            item.title ||
                            'Prediction image'
                        )}"
                        loading="lazy"
                    >
                </div>
            `;
        }


        if (
            item.type ===
            'user'
        ) {
            return `
                <div class="notification-media fallback user">
                    <span>👤</span>
                </div>
            `;
        }


        return `
            <div class="notification-media fallback alert">
                <span>⚠</span>
            </div>
        `;
    }


    function renderNotifications(items) {
        el.count.textContent =
            `${number(
                items.length
            )} ${
                items.length === 1
                    ? 'record'
                    : 'records'
            }`;


        if (!items.length) {
            el.feed.innerHTML =
                `
                    <div class="empty-state">
                        No notifications match the selected filters.
                    </div>
                `;

            return;
        }


        el.feed.innerHTML =
            items
                .map(item => {
                    const pills = [];


                    if (item.user_name) {
                        pills.push(
                            `<span class="meta-pill">${escapeHtml(
                                item.user_name
                            )}</span>`
                        );
                    }


                    if (
                        item.confidence !==
                        null &&
                        item.confidence !==
                        undefined
                    ) {
                        pills.push(
                            `<span class="meta-pill">${Number(
                                item.confidence
                            ).toFixed(2)}% confidence</span>`
                        );
                    }


                    if (item.location) {
                        pills.push(
                            `<span class="meta-pill">${escapeHtml(
                                item.location
                            )}</span>`
                        );
                    }


                    return `
                        <article class="notification-item ${escapeHtml(
                            item.type
                        )}">

                            ${notificationMedia(
                                item
                            )}

                            <div class="notification-copy">

                                <strong>
                                    ${escapeHtml(
                                        item.title
                                    )}
                                </strong>

                                <p>
                                    ${escapeHtml(
                                        item.message
                                    )}
                                </p>

                                ${
                                    pills.length
                                        ? `
                                            <div class="notification-meta">
                                                ${pills.join('')}
                                            </div>
                                        `
                                        : ''
                                }

                            </div>

                            <time class="notification-time">
                                ${formatDateTime(
                                    item.created_at
                                )}
                            </time>

                        </article>
                    `;
                })
                .join('');
    }


    el.search.addEventListener(
        'input',
        () => {
            clearTimeout(
                searchTimer
            );

            searchTimer =
                setTimeout(
                    loadNotifications,
                    350
                );
        }
    );


    el.type.addEventListener(
        'change',
        loadNotifications
    );


    el.date.addEventListener(
        'change',
        loadNotifications
    );


    el.reset.addEventListener(
        'click',
        () => {
            el.search.value =
                '';

            el.type.value =
                '';

            el.date.value =
                '';

            loadNotifications();
        }
    );


    el.refresh.addEventListener(
        'click',
        loadNotifications
    );


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


    requireAdmin()
        .then(ok => {
            if (ok) {
                loadNotifications();
            }
        });

})();