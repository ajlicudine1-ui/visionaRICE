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
                        .value,

                confirm_password:
                    document
                        .getElementById(
                            'confirm_password'
                        )
                        .value
            };

            if (
                payload.password.length < 8
            ) {
                showMessage(
                    'Password must be at least 8 characters long.'
                );

                return;
            }

            if (
                payload.password !==
                payload.confirm_password
            ) {
                showMessage(
                    'Password and confirm password do not match.'
                );

                return;
            }

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


document.addEventListener(
    'click',
    event => {
        const button =
            event.target.closest(
                '[data-password-target]'
            );

        if (!button) {
            return;
        }

        const input =
            document.getElementById(
                button.dataset.passwordTarget
            );

        if (!input) {
            return;
        }

        const isPassword =
            input.type ===
            'password';

        input.type =
            isPassword
                ? 'text'
                : 'password';

        button.classList.toggle(
            'is-visible',
            isPassword
        );

        button.setAttribute(
            'aria-pressed',
            isPassword
                ? 'true'
                : 'false'
        );

        button.setAttribute(
            'aria-label',
            isPassword
                ? 'Hide password'
                : 'Show password'
        );
    }
);


const passwordInput =
    document.getElementById(
        'password'
    );

const confirmPasswordInput =
    document.getElementById(
        'confirm_password'
    );

const passwordMatchText =
    document.getElementById(
        'passwordMatchText'
    );


function updatePasswordMatch() {
    if (
        !confirmPasswordInput.value
    ) {
        passwordMatchText.textContent =
            'Re-enter your password';

        passwordMatchText.classList.remove(
            'password-match-success',
            'password-match-error'
        );

        return;
    }

    if (
        passwordInput.value ===
        confirmPasswordInput.value
    ) {
        passwordMatchText.textContent =
            'Passwords match';

        passwordMatchText.classList.add(
            'password-match-success'
        );

        passwordMatchText.classList.remove(
            'password-match-error'
        );

    } else {
        passwordMatchText.textContent =
            'Passwords do not match';

        passwordMatchText.classList.add(
            'password-match-error'
        );

        passwordMatchText.classList.remove(
            'password-match-success'
        );
    }
}


passwordInput.addEventListener(
    'input',
    updatePasswordMatch
);

confirmPasswordInput.addEventListener(
    'input',
    updatePasswordMatch
);

