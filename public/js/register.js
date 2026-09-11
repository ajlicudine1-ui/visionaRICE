const form =
    document.getElementById(
        'registerForm'
    );

const messageBox =
    document.getElementById(
        'message'
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


form.addEventListener(
    'submit',
    async event => {
        event.preventDefault();

        const button =
            form.querySelector(
                'button[type="submit"]'
            );

        button.disabled =
            true;

        button.textContent =
            'Creating Account...';

        try {
            const payload = {
                first_name:
                    document
                        .getElementById(
                            'first_name'
                        )
                        .value
                        .trim(),

                middle_name:
                    document
                        .getElementById(
                            'middle_name'
                        )
                        .value
                        .trim(),

                last_name:
                    document
                        .getElementById(
                            'last_name'
                        )
                        .value
                        .trim(),

                suffix:
                    document
                        .getElementById(
                            'suffix'
                        )
                        .value,

                phone_number:
                    document
                        .getElementById(
                            'phone_number'
                        )
                        .value
                        .trim(),

                email:
                    document
                        .getElementById(
                            'email'
                        )
                        .value
                        .trim(),

                password:
                    document
                        .getElementById(
                            'password'
                        )
                        .value
            };

            const response =
                await fetch(
                    '/api/auth/register',
                    {
                        method:
                            'POST',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        credentials:
                            'include',

                        body:
                            JSON.stringify(
                                payload
                            )
                    }
                );

            const result =
                await response
                    .json();

            if (!response.ok) {
                showMessage(
                    result.message ||
                    'Registration failed.'
                );

                return;
            }

            showMessage(
                result.message ||
                'Account created. Please check your email to verify your account.',
                'success'
            );

            form.reset();

            /*
             * Do not automatically sign in.
             * Email verification is required first.
             */
            window.setTimeout(
                () => {
                    window.location.href =
                        '/login.html?registered=1';
                },
                2200
            );

        } catch (error) {
            console.error(
                error
            );

            showMessage(
                'Unable to connect to the server.'
            );

        } finally {
            button.disabled =
                false;

            button.textContent =
                'Register';
        }
    }
);
