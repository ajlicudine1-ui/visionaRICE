(() => {

    'use strict';

    const container =
        document.getElementById(
            'adminSidebarContainer'
        );

    if (!container) {
        return;
    }


    // =====================================================
    // ADMIN PROFILE CACHE
    // =====================================================

    const ADMIN_PROFILE_KEY =
        'visionarice_admin_profile';


    function getCachedAdminProfile() {

        try {

            return JSON.parse(
                sessionStorage.getItem(
                    ADMIN_PROFILE_KEY
                ) || 'null'
            );

        } catch (error) {

            return null;

        }

    }


    function getAdminDisplayName(profile) {

        if (!profile) {
            return '';
        }

        const firstName =
            String(
                profile.first_name ||
                profile.firstName ||
                ''
            ).trim();

        const lastName =
            String(
                profile.last_name ||
                profile.lastName ||
                ''
            ).trim();

        const fullName =
            [
                firstName,
                lastName
            ]
                .filter(Boolean)
                .join(' ')
                .trim();

        return String(
            fullName ||
            profile.full_name ||
            profile.fullName ||
            profile.name ||
            profile.username ||
            profile.email ||
            ''
        ).trim();

    }


    function saveAdminProfile(profile) {

        if (!profile) {
            return;
        }

        try {

            sessionStorage.setItem(
                ADMIN_PROFILE_KEY,
                JSON.stringify(
                    profile
                )
            );

        } catch (error) {

            console.warn(
                'VISIONARICE: unable to cache admin profile.',
                error
            );

        }

    }


    function clearAdminProfile() {

        try {

            sessionStorage.removeItem(
                ADMIN_PROFILE_KEY
            );

        } catch (error) {

            // Ignore storage errors.

        }

    }


    function escapeHTML(value) {

        return String(value || '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');

    }


    // =====================================================
    // RENDER HEADER IMMEDIATELY
    // =====================================================

    const cachedAdminName =
        getAdminDisplayName(
            getCachedAdminProfile()
        );

    const safeCachedAdminName =
        escapeHTML(
            cachedAdminName
        );


    const HEADER_HTML = `

        <header class="topbar">

            <div class="topbar-inner">

                <a
                    class="brand"
                    href="/admin/dashboard.html"
                >
                    <div class="admin-brand-mark">
                        <img
                            src="/images/visionarice_logo.png"
                            alt="VISIONARICE Logo"
                            class="admin-brand-logo"
                        >
                    </div>

                    <span class="brand-name">
                        VISION<span>A</span>RICE
                    </span>

                    <small>Admin</small>
                </a>


                <nav class="desktop-nav">

                    <a
                        href="/admin/dashboard.html"
                        data-admin-page="dashboard"
                    >
                        Dashboard
                    </a>

                    <a
                        href="/admin/predictions.html"
                        data-admin-page="predictions"
                    >
                        Predictions
                    </a>

                    <a
                        href="/admin/users.html"
                        data-admin-page="users"
                    >
                        Users
                    </a>

                    <a
                        href="/admin/profile.html"
                        data-admin-page="profile"
                    >
                        Profile
                    </a>

                    <a
                        href="/admin/notifications.html"
                        data-admin-page="notifications"
                        class="desktop-notification-bell"
                        aria-label="Notifications"
                        title="Notifications"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
                            <path d="M10 21h4"></path>
                        </svg>
                    </a>

                </nav>


                <div class="account-area">

                    <div class="account-copy">

                        <small>
                            ADMINISTRATOR
                        </small>

                        <strong id="adminSessionName">${safeCachedAdminName}</strong>

                    </div>


                    <button
                        id="adminLogoutButton"
                        class="logout-button"
                        type="button"
                        title="Logout"
                        aria-label="Logout"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path d="M10 17l5-5-5-5"></path>
                            <path d="M15 12H3"></path>
                            <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"></path>
                        </svg>
                    </button>

                </div>

            </div>

        </header>


        <nav
            class="mobile-nav"
            aria-label="Administrator mobile navigation"
        >

            <a
                href="/admin/dashboard.html"
                data-admin-page="dashboard"
            >
                Dashboard
            </a>

            <a
                href="/admin/predictions.html"
                data-admin-page="predictions"
            >
                Predictions
            </a>

            <a
                href="/admin/users.html"
                data-admin-page="users"
            >
                Users
            </a>

            <a
                href="/admin/profile.html"
                data-admin-page="profile"
            >
                Profile
            </a>

            <a
                href="/admin/notifications.html"
                data-admin-page="notifications"
            >
                Alerts
            </a>

        </nav>
    `;


    container.innerHTML =
        HEADER_HTML;


    // =====================================================
    // ACTIVE PAGE
    // =====================================================

    function activateCurrentPage() {

        const currentPage =
            String(
                document.body.dataset.adminPage ||
                ''
            ).toLowerCase();

        container
            .querySelectorAll(
                '[data-admin-page]'
            )
            .forEach(link => {

                link.classList.toggle(
                    'active',
                    String(
                        link.dataset.adminPage ||
                        ''
                    ).toLowerCase() ===
                        currentPage
                );

            });

    }


    // =====================================================
    // LIVE ADMIN SESSION REFRESH
    // =====================================================

    async function refreshAdminIdentity() {

        const nameElement =
            container.querySelector(
                '#adminSessionName'
            );

        try {

            const response =
                await fetch(
                    '/api/auth/me',
                    {
                        method:
                            'GET',

                        credentials:
                            'include',

                        cache:
                            'no-store'
                    }
                );

            if (!response.ok) {

                clearAdminProfile();

                window.location.replace(
                    '/login.html'
                );

                return;

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

                clearAdminProfile();

                window.location.replace(
                    '/login.html'
                );

                return;

            }

            saveAdminProfile(
                result.user
            );

            const freshName =
                getAdminDisplayName(
                    result.user
                );

            if (
                nameElement &&
                freshName &&
                nameElement.textContent !== freshName
            ) {

                nameElement.textContent =
                    freshName;

            }

        } catch (error) {

            console.error(
                'VISIONARICE admin identity refresh:',
                error
            );

            /*
             * Keep the cached name already on screen.
             */

        }

    }


    // =====================================================
    // LOGOUT
    // =====================================================

    function bindLogout() {

        const button =
            container.querySelector(
                '#adminLogoutButton'
            );

        if (!button) {
            return;
        }

        button.addEventListener(
            'click',
            async () => {

                button.disabled =
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
                        'VISIONARICE admin logout:',
                        error
                    );

                } finally {

                    clearAdminProfile();

                    window.location.replace(
                        '/login.html'
                    );

                }

            }
        );

    }


    // =====================================================
    // INITIALIZE
    // =====================================================

    activateCurrentPage();

    bindLogout();

    /*
     * The cached name is already visible before this request.
     */
    refreshAdminIdentity();

})();
