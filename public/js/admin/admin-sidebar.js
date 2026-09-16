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


    function showCachedAdminName() {

        const nameElement =
            document.getElementById(
                'adminSessionName'
            );


        if (!nameElement) {
            return;
        }


        const profile =
            getCachedAdminProfile();


        const displayName =
            getAdminDisplayName(
                profile
            );


        if (displayName) {

            nameElement.textContent =
                displayName;

        }

    }



    // =====================================================
    // LOAD NAVIGATION
    // =====================================================

    async function loadNavigation() {

        try {

            const response =
                await fetch(
                    '/admin/components/sidebar.html',
                    {
                        cache:
                            'no-store'
                    }
                );


            if (!response.ok) {

                throw new Error(
                    'Unable to load administrator navigation.'
                );

            }


            container.innerHTML =
                await response.text();


            /*
             * Display cached admin name immediately.
             * No waiting for /api/auth/me.
             */
            showCachedAdminName();


            activateCurrentPage();


            /*
             * Refresh admin identity silently
             * from the server.
             */
            loadAdminIdentity();


            bindLogout();


        } catch (error) {

            console.error(
                'Admin navigation error:',
                error
            );

        }

    }



    // =====================================================
    // ACTIVE PAGE
    // =====================================================

    function activateCurrentPage() {

        const page =
            document.body.dataset.adminPage ||
            '';


        document
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
            document.getElementById(
                'adminSessionName'
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


            // Save for instant display on other admin pages.
            saveAdminProfile(
                result.user
            );


            if (nameElement) {

                const displayName =
                    getAdminDisplayName(
                        result.user
                    );


                nameElement.textContent =
                    displayName ||
                    'Administrator';

            }


        } catch (error) {

            console.error(
                'Admin identity error:',
                error
            );


            /*
             * Do not replace the cached name just because
             * the background refresh temporarily failed.
             */

        }

    }



    // =====================================================
    // LOGOUT
    // =====================================================

    function bindLogout() {

        const button =
            document.getElementById(
                'adminLogoutButton'
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

                    /*
                     * Remove cached identity so another
                     * account never sees the previous
                     * administrator's name.
                     */
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

    loadNavigation();


})();