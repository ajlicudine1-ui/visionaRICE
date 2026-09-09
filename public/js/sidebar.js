(() => {
    const container =
        document.getElementById(
            'sidebar-container'
        );

    if (!container) {
        console.error(
            'VISIONARICE: #sidebar-container not found.'
        );
        return;
    }

    /*
     * IMPORTANT
     * The navigation is embedded directly here instead of
     * being fetched from /components/sidebar.html.
     *
     * This removes the visible delay where the bottom nav
     * disappears during a normal HTML-page navigation and
     * only returns after fetch() finishes.
     */
    const SIDEBAR_HTML = `
        <header class="sidebar">
            <div class="sidebar-inner">

                <a
                    href="/analyze.html"
                    class="sidebar-brand"
                >
                    <span class="sidebar-logo">
                        🌾
                    </span>

                    <span class="sidebar-brand-text">
                        <strong>VISION</strong><em>aRice</em>
                    </span>
                </a>

                <nav class="sidebar-nav">

                    <a
                        href="/analyze.html"
                        data-page="analyze"
                    >
                        <span>📷</span>
                        Analyze
                    </a>

                    <a
                        href="/dashboard.html"
                        data-page="dashboard"
                    >
                        <span>◉</span>
                        Dashboard
                    </a>

                    <a
                        href="/history.html"
                        data-page="history"
                    >
                        <span>↶</span>
                        History
                    </a>

                    <a
                        href="/profile.html"
                        data-page="profile"
                    >
                        <span>👤</span>
                        Profile
                    </a>

                    <a
                        href="/help.html"
                        data-page="help"
                    >
                        <span>?</span>
                        Help
                    </a>

                </nav>

                <a
                    href="/notifications.html"
                    class="notification-bell"
                    id="globalNotificationBell"
                    aria-label="Open notifications"
                    title="Notifications"
                >
                    <span aria-hidden="true">🔔</span>
                </a>

            </div>
        </header>
    `;

    // Render immediately. No fetch, no await, no network delay.
    container.innerHTML =
        SIDEBAR_HTML;


    // =====================================================
    // CURRENT PAGE
    // =====================================================

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


    // =====================================================
    // ACTIVE NAV
    // =====================================================

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

        const notificationBell =
            container.querySelector(
                '.notification-bell'
            );

        if (notificationBell) {
            notificationBell.classList.toggle(
                'active',
                page === 'notifications'
            );
        }
    }


    // =====================================================
    // MOBILE BOTTOM NAV
    // =====================================================

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

            /*
             * Keep the parent from becoming a containing
             * block for position:fixed on mobile.
             */
            [
                container,
                sidebar,
                inner
            ].forEach(element => {

                element.style
                    .setProperty(
                        'transform',
                        'none',
                        'important'
                    );

                element.style
                    .setProperty(
                        'filter',
                        'none',
                        'important'
                    );

                element.style
                    .setProperty(
                        'backdrop-filter',
                        'none',
                        'important'
                    );

                element.style
                    .setProperty(
                        '-webkit-backdrop-filter',
                        'none',
                        'important'
                    );

                element.style
                    .setProperty(
                        'perspective',
                        'none',
                        'important'
                    );

                element.style
                    .setProperty(
                        'contain',
                        'none',
                        'important'
                    );

            });

            sidebar.style
                .setProperty(
                    'position',
                    'static',
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

            sidebar.style
                .setProperty(
                    'box-shadow',
                    'none',
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
                    '100vw',
                    'important'
                );

            nav.style
                .setProperty(
                    'max-width',
                    '100vw',
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
                    'repeat(5, minmax(0, 1fr))',
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
                    'border-bottom',
                    '0',
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
                            'line-height',
                            '1.1',
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
                container,
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


    // =====================================================
    // FAST NAV CLICK
    // =====================================================

    /*
     * Update the active state immediately before the browser
     * loads the next HTML page. The new page will also render
     * the nav immediately because no component fetch is used.
     */
    container.addEventListener(
        'click',
        event => {

            const link =
                event.target.closest(
                    '.sidebar-nav a'
                );

            if (!link) {
                return;
            }

            container
                .querySelectorAll(
                    '.sidebar-nav a'
                )
                .forEach(item => {
                    item.classList.remove(
                        'active'
                    );
                });

            link.classList.add(
                'active'
            );

        }
    );


    // =====================================================
    // INITIALIZE
    // =====================================================

    setActiveNavigation();

    applyMobileBottomNavigation();

    requestAnimationFrame(
        applyMobileBottomNavigation
    );


    // =====================================================
    // RESIZE / ROTATION
    // =====================================================

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

})();
