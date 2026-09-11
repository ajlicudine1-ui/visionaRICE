(() => {
    'use strict';

    const container =
        document.getElementById(
            'adminSidebarContainer'
        );

    if (!container) {
        return;
    }

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

            activateCurrentPage();

            await loadAdminIdentity();

            bindLogout();

        } catch (error) {
            console.error(
                'Admin navigation error:',
                error
            );
        }
    }


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
                        credentials:
                            'include'
                    }
                );

            if (!response.ok) {
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
                window.location.href =
                    '/login.html';

                return;
            }

            if (nameElement) {
                const fullName =
                    [
                        result.user.first_name,
                        result.user.last_name
                    ]
                        .filter(Boolean)
                        .join(' ');

                nameElement.textContent =
                    fullName ||
                    result.user.email ||
                    'Administrator';
            }

        } catch (error) {
            console.error(
                'Admin identity error:',
                error
            );
        }
    }


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
                    window.location.href =
                        '/login.html';
                }
            }
        );
    }


    

    loadNavigation();
})();
