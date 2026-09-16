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

        return (
            fullName ||
            String(
                profile.full_name ||
                profile.fullName ||
                profile.name ||
                profile.username ||
                profile.email ||
                ''
            ).trim()
        );

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
                'Unable to cache admin profile.',
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


    // =====================================================
    // IMMEDIATE ADMIN HEADER
    // =====================================================

    const cachedAdminProfile =
        getCachedAdminProfile();

    const cachedAdminName =
        getAdminDisplayName(
            cachedAdminProfile
        );


    const ADMIN_SIDEBAR_HTML = `

        <header class="admin-topnav">

            <div class="admin-topnav-inner">

                <a
                    href="/admin/dashboard.html"
                    class="admin-brand"
                    aria-label="VISIONARICE Admin Dashboard"
                >
                    <div class="admin-brand-mark">
                        🌾
                    </div>

                    <div class="admin-brand-copy">
                        <strong>
                            VISION<span>A</span>RICE
                        </strong>

                        <small>
                            Admin
                        </small>
                    </div>
                </a>


                <nav
                    class="admin-nav"
                    aria-label="Administrator navigation"
                >

                    <a
                        href="/admin/dashboard.html"
                        data-admin-page="dashboard"
                    >
                        <span class="admin-nav-icon">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                                <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                                <rect x="3" y="14" width="7" height="7" rx="1"></rect>
                                <rect x="14" y="14" width="7" height="7" rx="1"></rect>
                            </svg>
                        </span>

                        <span>Dashboard</span>
                    </a>

                    <a
                        href="/admin/predictions.html"
                        data-admin-page="predictions"
                    >
                        <span class="admin-nav-icon">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M4 6h16"></path>
                                <path d="M4 12h16"></path>
                                <path d="M4 18h10"></path>
                            </svg>
                        </span>

                        <span>Predictions</span>
                    </a>

                    <a
                        href="/admin/users.html"
                        data-admin-page="users"
                    >
                        <span class="admin-nav-icon">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <circle cx="9" cy="8" r="3"></circle>
                                <path d="M3.5 19c.8-3.1 2.8-5 5.5-5s4.7 1.9 5.5 5"></path>
                                <path d="M16 7.5a2.5 2.5 0 0 1 0 5"></path>
                                <path d="M17 14c2.1.3 3.4 1.9 3.9 4"></path>
                            </svg>
                        </span>

                        <span>Users</span>
                    </a>

                    <a
                        href="/admin/profile.html"
                        data-admin-page="profile"
                    >
                        <span class="admin-nav-icon">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <circle cx="12" cy="8" r="4"></circle>
                                <path d="M4.5 21c.8-4.2 3.5-6.5 7.5-6.5s6.7 2.3 7.5 6.5"></path>
                            </svg>
                        </span>

                        <span>Profile</span>
                    </a>

                    <a
                        href="/admin/notifications.html"
                        data-admin-page="notifications"
                    >
                        <span class="admin-nav-icon">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
                                <path d="M10 21h4"></path>
                            </svg>
                        </span>

                        <span>Notifications</span>
                    </a>

                </nav>


                <div class="admin-account-actions">

                    <div class="admin-session-card">
                        <strong id="adminSessionName">${cachedAdminName}</strong>
                    </div>

                    <button
                        type="button"
                        class="admin-logout-button"
                        id="adminLogoutButton"
                        title="Logout"
                        aria-label="Logout"
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M10 17l5-5-5-5"></path>
                            <path d="M15 12H3"></path>
                            <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"></path>
                        </svg>
                    </button>

                </div>

            </div>

        </header>


        <nav
            class="admin-mobile-bottom-nav"
            aria-label="Administrator mobile navigation"
        >

            <a
                href="/admin/dashboard.html"
                data-admin-page="dashboard"
            >
                <span class="admin-nav-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                        <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                        <rect x="3" y="14" width="7" height="7" rx="1"></rect>
                        <rect x="14" y="14" width="7" height="7" rx="1"></rect>
                    </svg>
                </span>

                <small>Dashboard</small>
            </a>

            <a
                href="/admin/predictions.html"
                data-admin-page="predictions"
            >
                <span class="admin-nav-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 6h16"></path>
                        <path d="M4 12h16"></path>
                        <path d="M4 18h10"></path>
                    </svg>
                </span>

                <small>Predictions</small>
            </a>

            <a
                href="/admin/users.html"
                data-admin-page="users"
            >
                <span class="admin-nav-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="9" cy="8" r="3"></circle>
                        <path d="M3.5 19c.8-3.1 2.8-5 5.5-5s4.7 1.9 5.5 5"></path>
                    </svg>
                </span>

                <small>Users</small>
            </a>

            <a
                href="/admin/profile.html"
                data-admin-page="profile"
            >
                <span class="admin-nav-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="8" r="4"></circle>
                        <path d="M4.5 21c.8-4.2 3.5-6.5 7.5-6.5s6.7 2.3 7.5 6.5"></path>
                    </svg>
                </span>

                <small>Profile</small>
            </a>

            <a
                href="/admin/notifications.html"
                data-admin-page="notifications"
            >
                <span class="admin-nav-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
                        <path d="M10 21h4"></path>
                    </svg>
                </span>

                <small>Alerts</small>
            </a>

        </nav>
    `;


    /*
     * Render immediately.
     * No fetch of /admin/components/sidebar.html.
     * Cached name is already inside the header HTML.
     */
    container.innerHTML =
        ADMIN_SIDEBAR_HTML;


    // =====================================================
    // ACTIVE PAGE
    // =====================================================

    function activateCurrentPage() {

        const page =
            document.body.dataset.adminPage ||
            '';

        container
            .querySelectorAll(
                '[data-admin-page]'
            )
            .forEach(link => {

                link.classList.toggle(
                    'active',
                    link.dataset.adminPage ===
                        page
                );

            });

    }


    // =====================================================
    // ADMIN IDENTITY
    // =====================================================

    async function loadAdminIdentity() {

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

                window.location.href =
                    '/login.html';

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

                window.location.href =
                    '/login.html';

                return;

            }

            /*
             * Save profile for immediate rendering
             * on the next admin page.
             */
            saveAdminProfile(
                result.user
            );

            if (nameElement) {

                const displayName =
                    getAdminDisplayName(
                        result.user
                    );

                if (displayName) {

                    nameElement.textContent =
                        displayName;

                }

            }

        } catch (error) {

            console.error(
                'Admin identity error:',
                error
            );

            /*
             * Keep the cached name visible if
             * the background refresh fails.
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
                        'Admin logout error:',
                        error
                    );

                } finally {

                    clearAdminProfile();

                    window.location.href =
                        '/login.html';

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
     * Verify/refresh the admin session silently.
     * The cached name is already visible.
     */
    loadAdminIdentity();

})();
