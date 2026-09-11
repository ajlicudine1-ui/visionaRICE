(() => {
    'use strict';

    const container = document.getElementById('adminSidebarContainer');
    if (!container) return;

    async function start() {
        const response = await fetch('/admin/components/sidebar.html', { cache: 'no-store' });
        container.innerHTML = await response.text();

        const current = document.body.dataset.adminPage;

        document.querySelectorAll('[data-admin-page]').forEach(link => {
            link.classList.toggle('active', link.dataset.adminPage === current);
        });

        document.getElementById('adminMenuButton')?.addEventListener('click', () => {
            document.body.classList.toggle('admin-menu-open');
        });

        document.getElementById('adminSidebarBackdrop')?.addEventListener('click', () => {
            document.body.classList.remove('admin-menu-open');
        });

        try {
            const me = await fetch('/api/auth/me', { credentials: 'include' });
            const result = await me.json();

            if (!me.ok || String(result.user?.role || '').toLowerCase() !== 'admin') {
                window.location.href = '/login.html';
                return;
            }

            const name = [result.user.first_name, result.user.last_name]
                .filter(Boolean)
                .join(' ');

            document.getElementById('adminSessionName').textContent =
                name || result.user.email || 'Administrator';

        } catch {
            window.location.href = '/login.html';
        }

        document.getElementById('adminLogoutButton')?.addEventListener('click', async () => {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
            } finally {
                window.location.href = '/login.html';
            }
        });
    }

    start().catch(console.error);
})();
