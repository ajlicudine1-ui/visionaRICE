const form =
    document.getElementById(
        'resetPasswordForm'
    );

const messageBox =
    document.getElementById(
        'message'
    );

const params =
    new URLSearchParams(
        window.location.search
    );

const token =
    params.get(
        'token'
    );


function showMessage(
    message,
    type = 'error'
) {
    messageBox.innerHTML = `
        <div class="message ${type}">
            ${message}
        </div>
    `;
}


if (!token) {
    showMessage(
        'This password reset link is invalid.'
    );

    form
        .querySelector(
            'button[type="submit"]'
        )
        .disabled =
            true;
}


form.addEventListener(
    'submit',
    async event => {
        event.preventDefault();

        const newPassword =
            document
                .getElementById(
                    'newPassword'
                )
                .value;

        const confirmPassword =
            document
                .getElementById(
                    'confirmPassword'
                )
                .value;

        if (
            newPassword !==
            confirmPassword
        ) {
            showMessage(
                'New password and confirmation do not match.'
            );

            return;
        }

        const button =
            form.querySelector(
                'button[type="submit"]'
            );

        button.disabled =
            true;

        button.textContent =
            'Resetting...';

        try {
            const response =
                await fetch(
                    '/api/auth/reset-password',
                    {
                        method:
                            'POST',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body:
                            JSON.stringify({
                                token,
                                new_password:
                                    newPassword,
                                confirm_password:
                                    confirmPassword
                            })
                    }
                );

            const result =
                await response
                    .json();

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    'Unable to reset password.'
                );
            }

            showMessage(
                result.message,
                'success'
            );

            form.reset();

            window.setTimeout(
                () => {
                    window.location.href =
                        '/login.html?reset=success';
                },
                1400
            );

        } catch (error) {
            showMessage(
                error.message
            );

        } finally {
            button.disabled =
                false;

            button.textContent =
                'Reset Password';
        }
    }
);
