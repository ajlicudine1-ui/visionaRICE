const form = document.getElementById('loginForm');
const messageBox = document.getElementById('message');

function showMessage(message, type = 'error') {

    messageBox.innerHTML = `
        <div class="message ${type}">
            ${message}
        </div>
    `;
}

form.addEventListener('submit', async (event) => {

    event.preventDefault();

    const button = form.querySelector('button');

    button.disabled = true;
    button.textContent = 'Signing In...';

    try {

        const response = await fetch('/api/auth/login', {

            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            credentials: 'include',

            body: JSON.stringify({

                email:
                    document
                        .getElementById('email')
                        .value,

                password:
                    document
                        .getElementById('password')
                        .value

            })

        });

        const result = await response.json();

        if (!response.ok) {

            showMessage(
                result.message || 'Login failed.'
            );

            return;
        }

        showMessage(
            'Login successful.',
            'success'
        );

        setTimeout(() => {

            if (result.user.role === 'admin') {

                window.location.href =
                    '/admin.html';

            } else {

                window.location.href =
                    '/analyze.html';

            }

        }, 500);

    } catch (error) {

        console.error(error);

        showMessage(
            'Unable to connect to the server.'
        );

    } finally {

        button.disabled = false;
        button.textContent = 'Sign In';

    }

});