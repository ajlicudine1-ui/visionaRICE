(() => {
    const container =
        document.getElementById('sidebar-container');

    if (!container) {
        console.error(
            'VISIONARICE: #sidebar-container not found.'
        );
        return;
    }

    const COMPONENT_URL =
        '/components/sidebar.html?v=20260909-936';

    function currentPageName() {
        const file =
            window.location.pathname
                .split('/')
                .pop()
                .toLowerCase();

        if (
            !file ||
            file === 'index.html'
        ) {
            return 'analyze';
        }

        return file
            .replace('.html', '');
    }

    function setActiveNavigation() {
        const page =
            currentPageName();

        container
            .querySelectorAll(
                '.sidebar-nav a'
            )
            .forEach(link => {
                const target =
                    String(
                        link.dataset.page ||
                        ''
                    ).toLowerCase();

                link.classList.toggle(
                    'active',
                    target === page
                );
            });
    }

    function applyMobileBottomNavigation() {
        const sidebar =
            container.querySelector(
                '.sidebar'
            );

        const inner =
            container.querySelector(
                '.sidebar-inner'
            );

        const nav =
            container.querySelector(
                '.sidebar-nav'
            );

        if (
            !sidebar ||
            !inner ||
            !nav
        ) {
            console.error(
                'VISIONARICE: reusable sidebar markup is missing .sidebar, .sidebar-inner, or .sidebar-nav.'
            );
            return;
        }

        const mobile =
            window.matchMedia(
                '(max-width: 760px)'
            ).matches;

        if (mobile) {

            document.body.style
                .setProperty(
                    'padding-bottom',
                    '90px',
                    'important'
                );

            sidebar.style
                .setProperty(
                    'position',
                    'relative',
                    'important'
                );

            sidebar.style
                .setProperty(
                    'top',
                    'auto',
                    'important'
                );

            sidebar.style
                .setProperty(
                    'bottom',
                    'auto',
                    'important'
                );

            inner.style
                .setProperty(
                    'justify-content',
                    'center',
                    'important'
                );

            nav.style
                .setProperty(
                    'position',
                    'fixed',
                    'important'
                );

            nav.style
                .setProperty(
                    'left',
                    '0',
                    'important'
                );

            nav.style
                .setProperty(
                    'right',
                    '0',
                    'important'
                );

            nav.style
                .setProperty(
                    'bottom',
                    '0',
                    'important'
                );

            nav.style
                .setProperty(
                    'top',
                    'auto',
                    'important'
                );

            nav.style
                .setProperty(
                    'width',
                    '100%',
                    'important'
                );

            nav.style
                .setProperty(
                    'display',
                    'grid',
                    'important'
                );

            nav.style
                .setProperty(
                    'grid-template-columns',
                    'repeat(6, minmax(0, 1fr))',
                    'important'
                );

            nav.style
                .setProperty(
                    'align-items',
                    'center',
                    'important'
                );

            nav.style
                .setProperty(
                    'gap',
                    '0',
                    'important'
                );

            nav.style
                .setProperty(
                    'margin',
                    '0',
                    'important'
                );

            nav.style
                .setProperty(
                    'padding',
                    '7px 4px max(7px, env(safe-area-inset-bottom))',
                    'important'
                );

            nav.style
                .setProperty(
                    'background',
                    '#ffffff',
                    'important'
                );

            nav.style
                .setProperty(
                    'border-top',
                    '1px solid #dde5dc',
                    'important'
                );

            nav.style
                .setProperty(
                    'box-shadow',
                    '0 -5px 20px rgba(17, 62, 38, 0.10)',
                    'important'
                );

            nav.style
                .setProperty(
                    'z-index',
                    '2147483647',
                    'important'
                );

            nav.querySelectorAll('a')
                .forEach(link => {

                    link.style
                        .setProperty(
                            'display',
                            'flex',
                            'important'
                        );

                    link.style
                        .setProperty(
                            'flex-direction',
                            'column',
                            'important'
                        );

                    link.style
                        .setProperty(
                            'align-items',
                            'center',
                            'important'
                        );

                    link.style
                        .setProperty(
                            'justify-content',
                            'center',
                            'important'
                        );

                    link.style
                        .setProperty(
                            'min-width',
                            '0',
                            'important'
                        );

                    link.style
                        .setProperty(
                            'min-height',
                            '58px',
                            'important'
                        );

                    link.style
                        .setProperty(
                            'padding',
                            '3px 1px',
                            'important'
                        );

                    link.style
                        .setProperty(
                            'font-size',
                            '9px',
                            'important'
                        );

                    link.style
                        .setProperty(
                            'text-align',
                            'center',
                            'important'
                        );

                    link.style
                        .setProperty(
                            'background',
                            'transparent',
                            'important'
                        );
                });

        } else {

            document.body.style
                .removeProperty(
                    'padding-bottom'
                );

            [
                sidebar,
                inner,
                nav,
                ...nav.querySelectorAll('a')
            ].forEach(element => {
                element.removeAttribute(
                    'style'
                );
            });

        }
    }

    async function removeOldPwaCaches() {
        try {

            if (
                'serviceWorker' in navigator
            ) {
                const registrations =
                    await navigator
                        .serviceWorker
                        .getRegistrations();

                for (
                    const registration
                    of registrations
                ) {
                    await registration.unregister();
                }
            }

            if ('caches' in window) {
                const keys =
                    await caches.keys();

                await Promise.all(
                    keys.map(
                        key =>
                            caches.delete(key)
                    )
                );
            }

        } catch (error) {
            console.warn(
                'VISIONARICE cache cleanup skipped:',
                error
            );
        }
    }

    async function loadSidebar() {
        try {

            await removeOldPwaCaches();

            const response =
                await fetch(
                    COMPONENT_URL,
                    {
                        cache: 'no-store'
                    }
                );

            if (!response.ok) {
                throw new Error(
                    `Sidebar request failed (${response.status})`
                );
            }

            container.innerHTML =
                await response.text();

            setActiveNavigation();

            applyMobileBottomNavigation();

            requestAnimationFrame(
                applyMobileBottomNavigation
            );

            setTimeout(
                applyMobileBottomNavigation,
                200
            );

        } catch (error) {

            console.error(
                'VISIONARICE sidebar error:',
                error
            );

        }
    }

    window.addEventListener(
        'resize',
        applyMobileBottomNavigation
    );

    window.addEventListener(
        'orientationchange',
        () => {
            setTimeout(
                applyMobileBottomNavigation,
                100
            );
        }
    );

    loadSidebar();
})();
