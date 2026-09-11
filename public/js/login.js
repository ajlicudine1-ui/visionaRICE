const form =
    document.getElementById(
        'loginForm'
    );

const messageBox =
    document.getElementById(
        'message'
    );

const resendWrap =
    document.getElementById(
        'resendVerificationWrap'
    );

const resendButton =
    document.getElementById(
        'resendVerificationButton'
    );

const forgotModal =
    document.getElementById(
        'forgotPasswordModal'
    );

const forgotForm =
    document.getElementById(
        'forgotPasswordForm'
    );

const forgotEmail =
    document.getElementById(
        'forgotEmail'
    );

const forgotMessage =
    document.getElementById(
        'forgotMessage'
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


function showQueryMessage() {
    const params =
        new URLSearchParams(
            window.location.search
        );

    const verification =
        params.get(
            'verification'
        );

    if (
        verification ===
        'success'
    ) {
        showMessage(
            'Email verified successfully. You can now sign in.',
            'success'
        );

        return;
    }

    if (
        verification ===
        'invalid'
    ) {
        showMessage(
            'This verification link is invalid or has expired. You can request a new verification email below.'
        );

        resendWrap.classList.remove(
            'hidden'
        );

        return;
    }

    if (
        verification ===
        'error'
    ) {
        showMessage(
            'Unable to verify your email. Please request a new verification link.'
        );

        resendWrap.classList.remove(
            'hidden'
        );

        return;
    }

    if (
        params.get(
            'registered'
        ) ===
        '1'
    ) {
        showMessage(
            'Account created. Check your email and verify your account before signing in.',
            'success'
        );
    }

    if (
        params.get(
            'reset'
        ) ===
        'success'
    ) {
        showMessage(
            'Password reset successfully. Sign in with your new password.',
            'success'
        );
    }
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
            'Signing In...';

        resendWrap.classList.add(
            'hidden'
        );

        try {
            const response =
                await fetch(
                    '/api/auth/login',
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
                            JSON.stringify({
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
                            })
                    }
                );

            const result =
                await response
                    .json();

            if (!response.ok) {
                showMessage(
                    result.message ||
                    'Login failed.'
                );

                if (
                    result.code ===
                    'EMAIL_NOT_VERIFIED'
                ) {
                    resendWrap
                        .classList
                        .remove(
                            'hidden'
                        );
                }

                return;
            }

            showMessage(
                'Login successful.',
                'success'
            );

            setTimeout(
                () => {
                    if (
                        result.user.role ===
                        'admin'
                    ) {
                        window.location.href =
                            '/admin.html';

                    } else {
                        window.location.href =
                            '/analyze.html';
                    }
                },
                500
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
                'Sign In';
        }
    }
);


resendButton.addEventListener(
    'click',
    async () => {
        const email =
            document
                .getElementById(
                    'email'
                )
                .value
                .trim();

        if (!email) {
            showMessage(
                'Enter your email address first.'
            );

            return;
        }

        const originalText =
            resendButton.textContent;

        resendButton.disabled =
            true;

        resendButton.textContent =
            'Sending...';

        try {
            const response =
                await fetch(
                    '/api/auth/resend-verification',
                    {
                        method:
                            'POST',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body:
                            JSON.stringify({
                                email
                            })
                    }
                );

            const result =
                await response
                    .json();

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    'Unable to resend verification email.'
                );
            }

            showMessage(
                result.message,
                'success'
            );

        } catch (error) {
            showMessage(
                error.message
            );

        } finally {
            resendButton.disabled =
                false;

            resendButton.textContent =
                originalText;
        }
    }
);


document
    .getElementById(
        'forgotPasswordLink'
    )
    .addEventListener(
        'click',
        () => {
            const loginEmail =
                document
                    .getElementById(
                        'email'
                    )
                    .value
                    .trim();

            forgotEmail.value =
                loginEmail;

            forgotMessage.textContent =
                '';

            forgotModal
                .classList
                .remove(
                    'hidden'
                );

            forgotModal.setAttribute(
                'aria-hidden',
                'false'
            );
        }
    );


document.addEventListener(
    'click',
    event => {
        if (
            !event.target.closest(
                '[data-close-auth-modal]'
            )
        ) {
            return;
        }

        forgotModal
            .classList
            .add(
                'hidden'
            );

        forgotModal.setAttribute(
            'aria-hidden',
            'true'
        );
    }
);


forgotForm.addEventListener(
    'submit',
    async event => {
        event.preventDefault();

        const email =
            forgotEmail
                .value
                .trim();

        const button =
            document.getElementById(
                'sendResetButton'
            );

        const originalText =
            button.textContent;

        button.disabled =
            true;

        button.textContent =
            'Sending...';

        forgotMessage.textContent =
            '';

        try {
            const response =
                await fetch(
                    '/api/auth/forgot-password',
                    {
                        method:
                            'POST',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body:
                            JSON.stringify({
                                email
                            })
                    }
                );

            const result =
                await response
                    .json();

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    'Unable to send password reset email.'
                );
            }

            forgotMessage.textContent =
                result.message;

            forgotMessage.classList.add(
                'success'
            );

        } catch (error) {
            forgotMessage.textContent =
                error.message;

            forgotMessage.classList.remove(
                'success'
            );

        } finally {
            button.disabled =
                false;

            button.textContent =
                originalText;
        }
    }
);


showQueryMessage();


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
