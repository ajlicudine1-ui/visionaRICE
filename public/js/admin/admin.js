async function loadAdmin() {

    try {

        const response =
            await fetch(
                '/api/auth/me',
                {
                    credentials: 'include'
                }
            );

        if (!response.ok) {

            window.location.href =
                '/login.html';

            return;
        }

        const result =
            await response.json();

        if (result.user.role !== 'admin') {

            window.location.href =
                '/dashboard.html';

            return;
        }

        document
            .getElementById('welcome')
            .textContent =
            `Welcome Administrator, ${result.user.first_name} ${result.user.last_name}`;

    } catch {

        window.location.href =
            '/login.html';

    }

}

document
    .getElementById('logoutBtn')
    .addEventListener(
        'click',
        async () => {

            await fetch(
                '/api/auth/logout',
                {
                    method: 'POST',
                    credentials: 'include'
                }
            );

            window.location.href =
                '/login.html';

        }
    );

loadAdmin();