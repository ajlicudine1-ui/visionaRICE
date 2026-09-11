(() => {
    'use strict';

    const $ =
        id =>
            document.getElementById(
                id
            );

    const el = {
        adminName:
            $('adminSessionName'),

        logout:
            $('adminLogoutButton'),

        updated:
            $('lastUpdated'),

        refresh:
            $('refreshUsersButton'),

        total:
            $('totalUsers'),

        active:
            $('activeUsers'),

        inactive:
            $('inactiveUsers'),

        verified:
            $('verifiedUsers'),

        search:
            $('userSearch'),

        status:
            $('statusFilter'),

        role:
            $('roleFilter'),

        reset:
            $('resetUserFilters'),

        count:
            $('visibleUserCount'),

        tbody:
            $('usersTableBody'),

        modal:
            $('statusConfirmModal'),

        modalTitle:
            $('statusModalTitle'),

        modalMessage:
            $('statusModalMessage'),

        cancelStatus:
            $('cancelStatusButton'),

        confirmStatus:
            $('confirmStatusButton')
    };


    let pendingStatusChange =
        null;

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


    async function loadUsers() {
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

        if (el.status.value) {
            params.set(
                'status',
                el.status.value
            );
        }

        if (el.role.value) {
            params.set(
                'role',
                el.role.value
            );
        }

        el.refresh.disabled =
            true;

        el.refresh.textContent =
            'Loading...';

        try {
            const response =
                await fetch(
                    `/api/admin/users?${params.toString()}`,
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
                    'Unable to load users.'
                );
            }

            renderStats(
                result.stats
            );

            renderUsers(
                result.users
            );

            el.updated.textContent =
                formatDateTime(
                    result.generated_at
                );

        } catch (error) {
            console.error(
                'Admin users:',
                error
            );

            el.tbody.innerHTML =
                `
                    <tr>
                        <td
                            colspan="7"
                            class="empty-table"
                        >
                            Unable to load users.
                        </td>
                    </tr>
                `;

        } finally {
            el.refresh.disabled =
                false;

            el.refresh.textContent =
                'Refresh';
        }
    }


    function renderStats(stats) {
        el.total.textContent =
            number(
                stats.total_users
            );

        el.active.textContent =
            number(
                stats.active_users
            );

        el.inactive.textContent =
            number(
                stats.inactive_users
            );

        el.verified.textContent =
            number(
                stats.verified_users
            );
    }


    function renderUsers(users) {
        el.count.textContent =
            `${number(
                users.length
            )} ${
                users.length ===
                1
                    ? 'record'
                    : 'records'
            }`;

        if (!users.length) {
            el.tbody.innerHTML =
                `
                    <tr>
                        <td
                            colspan="7"
                            class="empty-table"
                        >
                            No users match the selected filters.
                        </td>
                    </tr>
                `;

            return;
        }

        el.tbody.innerHTML =
            users
                .map(
                    user => {
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

                        const isAdmin =
                            String(
                                user.role
                            ).toLowerCase() ===
                            'admin';

                        return `
                            <tr>
                                <td>
                                    <div class="user-cell">

                                        <div class="avatar">
                                            ${escapeHtml(initials)}
                                        </div>

                                        <div class="user-copy">
                                            <strong>
                                                ${escapeHtml(user.name)}
                                            </strong>

                                            ${
                                                user.phone_number
                                                    ? `
                                                        <small>
                                                            ${escapeHtml(user.phone_number)}
                                                        </small>
                                                    `
                                                    : ''
                                            }

                                            <span class="role-pill">
                                                ${escapeHtml(user.role)}
                                            </span>
                                        </div>

                                    </div>
                                </td>

                                <td>
                                    ${escapeHtml(user.email)}
                                </td>

                                <td>
                                    <span class="count-pill">
                                        ${number(user.prediction_count)}
                                    </span>
                                </td>

                                <td>
                                    <span class="verify-pill ${user.email_verified ? 'verified' : 'unverified'}">
                                        ${
                                            user.email_verified
                                                ? 'Verified'
                                                : 'Unverified'
                                        }
                                    </span>
                                </td>

                                <td>
                                    <span class="status-pill ${user.is_active ? 'active' : 'inactive'}">
                                        ${
                                            user.is_active
                                                ? 'Active'
                                                : 'Inactive'
                                        }
                                    </span>
                                </td>

                                <td>
                                    ${formatDate(user.created_at)}
                                </td>

                                <td>
                                    <div class="actions">

                                        <a
                                            class="view-dashboard"
                                            href="/admin/user-dashboard.html?id=${encodeURIComponent(user.id)}"
                                        >
                                            View Dashboard
                                        </a>

                                        <button
                                            type="button"
                                            class="status-action ${user.is_active ? 'deactivate' : ''}"
                                            data-user-id="${escapeHtml(user.id)}"
                                            data-user-name="${escapeHtml(user.name)}"
                                            data-next-active="${user.is_active ? 'false' : 'true'}"
                                            ${isAdmin ? 'disabled' : ''}
                                        >
                                            ${
                                                isAdmin
                                                    ? 'Protected'
                                                    : user.is_active
                                                        ? 'Deactivate'
                                                        : 'Activate'
                                            }
                                        </button>

                                    </div>
                                </td>
                            </tr>
                        `;
                    }
                )
                .join('');
    }


    function openStatusModal(
        userId,
        userName,
        nextActive
    ) {
        pendingStatusChange = {
            userId,
            userName,
            nextActive:
                nextActive ===
                true
        };

        el.modalTitle.textContent =
            nextActive
                ? 'Activate user?'
                : 'Deactivate user?';

        el.modalMessage.textContent =
            nextActive
                ? `${userName} will be able to sign in and use VISIONARICE again.`
                : `${userName} will no longer be able to use the account until it is reactivated.`;

        el.confirmStatus.textContent =
            nextActive
                ? 'Activate'
                : 'Deactivate';

        el.modal.classList.remove(
            'hidden'
        );

        el.modal.setAttribute(
            'aria-hidden',
            'false'
        );
    }


    function closeStatusModal() {
        pendingStatusChange =
            null;

        el.modal.classList.add(
            'hidden'
        );

        el.modal.setAttribute(
            'aria-hidden',
            'true'
        );
    }


    async function confirmStatusChange() {
        if (!pendingStatusChange) {
            return;
        }

        el.confirmStatus.disabled =
            true;

        try {
            const response =
                await fetch(
                    `/api/admin/users/${encodeURIComponent(
                        pendingStatusChange.userId
                    )}/status`,
                    {
                        method:
                            'PATCH',

                        credentials:
                            'include',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body:
                            JSON.stringify({
                                is_active:
                                    pendingStatusChange.nextActive
                            })
                    }
                );

            const result =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    'Unable to update user.'
                );
            }

            closeStatusModal();

            await loadUsers();

        } catch (error) {
            alert(
                error.message
            );

        } finally {
            el.confirmStatus.disabled =
                false;
        }
    }


    el.tbody.addEventListener(
        'click',
        event => {
            const button =
                event.target.closest(
                    '[data-user-id]'
                );

            if (
                !button ||
                button.disabled
            ) {
                return;
            }

            openStatusModal(
                button.dataset.userId,
                button.dataset.userName,
                button.dataset.nextActive ===
                    'true'
            );
        }
    );


    el.search.addEventListener(
        'input',
        () => {
            clearTimeout(
                searchTimer
            );

            searchTimer =
                setTimeout(
                    loadUsers,
                    350
                );
        }
    );


    el.status.addEventListener(
        'change',
        loadUsers
    );


    el.role.addEventListener(
        'change',
        loadUsers
    );


    el.reset.addEventListener(
        'click',
        () => {
            el.search.value =
                '';

            el.status.value =
                '';

            el.role.value =
                '';

            loadUsers();
        }
    );


    el.refresh.addEventListener(
        'click',
        loadUsers
    );


    el.cancelStatus.addEventListener(
        'click',
        closeStatusModal
    );


    el.confirmStatus.addEventListener(
        'click',
        confirmStatusChange
    );


    document.addEventListener(
        'click',
        event => {
            if (
                event.target.closest(
                    '[data-close-status-modal]'
                )
            ) {
                closeStatusModal();
            }
        }
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
                    loadUsers();
                }
            }
        );
})();
