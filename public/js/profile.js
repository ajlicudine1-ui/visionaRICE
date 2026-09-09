(() => {
    "use strict";

    const elements = {
        loading:
            document.getElementById(
                "profileLoading"
            ),

        content:
            document.getElementById(
                "profileContent"
            ),

        avatar:
            document.getElementById(
                "profileAvatar"
            ),

        name:
            document.getElementById(
                "profileName"
            ),

        emailText:
            document.getElementById(
                "profileEmail"
            ),

        role:
            document.getElementById(
                "profileRole"
            ),

        firstName:
            document.getElementById(
                "firstName"
            ),

        middleName:
            document.getElementById(
                "middleName"
            ),

        lastName:
            document.getElementById(
                "lastName"
            ),

        suffix:
            document.getElementById(
                "suffix"
            ),

        phoneNumber:
            document.getElementById(
                "phoneNumber"
            ),

        email:
            document.getElementById(
                "email"
            ),

        created:
            document.getElementById(
                "accountCreated"
            ),

        status:
            document.getElementById(
                "accountStatus"
            ),

        forgotEmail:
            document.getElementById(
                "forgotEmail"
            ),

        profileForm:
            document.getElementById(
                "profileForm"
            ),

        passwordForm:
            document.getElementById(
                "changePasswordForm"
            ),

        saveProfileButton:
            document.getElementById(
                "saveProfileButton"
            ),

        changePasswordButton:
            document.getElementById(
                "changePasswordButton"
            ),

        toast:
            document.getElementById(
                "profileToast"
            )
    };

    function showToast(
        message,
        type = "success"
    ) {
        elements.toast.textContent =
            message;

        elements.toast.classList.remove(
            "hidden",
            "error"
        );

        if (
            type === "error"
        ) {
            elements.toast.classList.add(
                "error"
            );
        }

        window.clearTimeout(
            showToast.timer
        );

        showToast.timer =
            window.setTimeout(
                () => {
                    elements.toast.classList.add(
                        "hidden"
                    );
                },
                3500
            );
    }

    function formatDate(value) {
        if (!value) {
            return "—";
        }

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "—";
        }

        return new Intl.DateTimeFormat(
            "en-PH",
            {
                month: "long",
                day: "numeric",
                year: "numeric"
            }
        ).format(date);
    }

    function fullName(user) {
        return [
            user.first_name,
            user.middle_name,
            user.last_name,
            user.suffix
        ]
            .filter(Boolean)
            .join(" ");
    }

    function fillProfile(user) {
        const name =
            fullName(user);

        elements.name.textContent =
            name || "VISIONARICE User";

        elements.emailText.textContent =
            user.email || "—";

        elements.email.value =
            user.email || "";

        elements.forgotEmail.textContent =
            user.email || "—";

        elements.role.textContent =
            user.role || "user";

        elements.firstName.value =
            user.first_name || "";

        elements.middleName.value =
            user.middle_name || "";

        elements.lastName.value =
            user.last_name || "";

        elements.suffix.value =
            user.suffix || "";

        elements.phoneNumber.value =
            user.phone_number || "";

        elements.created.textContent =
            formatDate(
                user.created_at
            );

        elements.status.textContent =
            user.is_active
                ? "Active"
                : "Inactive";

        const initials =
            [
                user.first_name,
                user.last_name
            ]
                .filter(Boolean)
                .map(
                    value =>
                        String(value)
                            .charAt(0)
                            .toUpperCase()
                )
                .join("");

        elements.avatar.textContent =
            initials || "U";
    }

    async function loadProfile() {
        try {
            const response =
                await fetch(
                    "/api/auth/me",
                    {
                        credentials:
                            "include"
                    }
                );

            const result =
                await response.json();

            if (!response.ok) {
                if (
                    response.status ===
                    401
                ) {
                    window.location.href =
                        "/login.html";

                    return;
                }

                throw new Error(
                    result.message ||
                    "Unable to load profile."
                );
            }

            fillProfile(
                result.user
            );

            elements.loading.classList.add(
                "hidden"
            );

            elements.content.classList.remove(
                "hidden"
            );

        } catch (error) {
            console.error(
                "Profile load error:",
                error
            );

            showToast(
                error.message,
                "error"
            );
        }
    }

    elements.profileForm.addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            const originalText =
                elements.saveProfileButton.textContent;

            try {
                elements.saveProfileButton.disabled =
                    true;

                elements.saveProfileButton.textContent =
                    "Saving...";

                const response =
                    await fetch(
                        "/api/auth/profile",
                        {
                            method:
                                "PUT",

                            credentials:
                                "include",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    first_name:
                                        elements.firstName.value.trim(),

                                    middle_name:
                                        elements.middleName.value.trim(),

                                    last_name:
                                        elements.lastName.value.trim(),

                                    suffix:
                                        elements.suffix.value,

                                    phone_number:
                                        elements.phoneNumber.value.trim()
                                })
                        }
                    );

                const result =
                    await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.message ||
                        "Unable to update profile."
                    );
                }

                fillProfile(
                    result.user
                );

                showToast(
                    result.message ||
                    "Profile updated successfully."
                );

            } catch (error) {
                console.error(
                    "Profile update error:",
                    error
                );

                showToast(
                    error.message,
                    "error"
                );

            } finally {
                elements.saveProfileButton.disabled =
                    false;

                elements.saveProfileButton.textContent =
                    originalText;
            }
        }
    );

    elements.passwordForm.addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            const currentPassword =
                document.getElementById(
                    "currentPassword"
                ).value;

            const newPassword =
                document.getElementById(
                    "newPassword"
                ).value;

            const confirmPassword =
                document.getElementById(
                    "confirmPassword"
                ).value;

            if (
                newPassword !==
                confirmPassword
            ) {
                showToast(
                    "New passwords do not match.",
                    "error"
                );

                return;
            }

            const originalText =
                elements.changePasswordButton.textContent;

            try {
                elements.changePasswordButton.disabled =
                    true;

                elements.changePasswordButton.textContent =
                    "Changing...";

                const response =
                    await fetch(
                        "/api/auth/change-password",
                        {
                            method:
                                "POST",

                            credentials:
                                "include",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    current_password:
                                        currentPassword,

                                    new_password:
                                        newPassword,

                                    confirm_password:
                                        confirmPassword
                                })
                        }
                    );

                const result =
                    await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.message ||
                        "Unable to change password."
                    );
                }

                elements.passwordForm.reset();

                showToast(
                    result.message ||
                    "Password changed successfully."
                );

            } catch (error) {
                console.error(
                    "Password change error:",
                    error
                );

                showToast(
                    error.message,
                    "error"
                );

            } finally {
                elements.changePasswordButton.disabled =
                    false;

                elements.changePasswordButton.textContent =
                    originalText;
            }
        }
    );

    document.addEventListener(
        "click",
        event => {
            const button =
                event.target.closest(
                    "[data-password-target]"
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

            const showing =
                input.type ===
                "text";

            input.type =
                showing
                    ? "password"
                    : "text";

            button.textContent =
                showing
                    ? "Show"
                    : "Hide";
        }
    );

    loadProfile();
})();
