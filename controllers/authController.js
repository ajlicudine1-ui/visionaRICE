const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { supabaseAdmin } = require('../config/supabase');
const { sendEmail } = require('../config/email');

// ===============================
// Helper
// ===============================

const normalizeEmail = (email = '') => {
    return String(email).trim().toLowerCase();
};

const TOKEN_BYTES = 32;

const getAppBaseUrl = () => {
    return String(
        process.env.APP_BASE_URL ||
        'http://localhost:3000'
    )
        .trim()
        .replace(/\/+$/, '');
};

const createToken = () => {
    const token =
        crypto
            .randomBytes(TOKEN_BYTES)
            .toString('hex');

    const hash =
        crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

    return {
        token,
        hash
    };
};

const hashToken = (token = '') => {
    return crypto
        .createHash('sha256')
        .update(String(token))
        .digest('hex');
};

const verificationEmailHtml = ({
    firstName,
    verificationUrl
}) => {
    return `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#17231c;">
            <h2 style="color:#1c5e3a;">VISIONARICE Email Verification</h2>
            <p>Hello ${firstName || 'there'},</p>
            <p>
                Please confirm your email address to activate your VISIONARICE account.
            </p>
            <p style="margin:28px 0;">
                <a
                    href="${verificationUrl}"
                    style="background:#286f45;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;"
                >
                    Verify Email
                </a>
            </p>
            <p>
                This verification link expires in 24 hours.
            </p>
            <p style="font-size:12px;color:#6d7970;">
                If you did not create a VISIONARICE account, you can ignore this email.
            </p>
        </div>
    `;
};

const resetPasswordEmailHtml = ({
    firstName,
    resetUrl
}) => {
    return `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#17231c;">
            <h2 style="color:#1c5e3a;">VISIONARICE Password Reset</h2>
            <p>Hello ${firstName || 'there'},</p>
            <p>
                A password reset was requested for your VISIONARICE account.
            </p>
            <p style="margin:28px 0;">
                <a
                    href="${resetUrl}"
                    style="background:#286f45;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;"
                >
                    Reset Password
                </a>
            </p>
            <p>
                This reset link expires in 30 minutes and can only be used once.
            </p>
            <p style="font-size:12px;color:#6d7970;">
                If you did not request a password reset, you can ignore this email.
            </p>
        </div>
    `;
};


// ===============================
// REGISTER
// ===============================

exports.register = async (req, res) => {
    try {
        const {
            email,
            password,
            first_name,
            middle_name,
            last_name,
            suffix,
            phone_number
        } = req.body;

        if (
            !email ||
            !password ||
            !first_name ||
            !last_name
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'Email, password, first name, and last name are required.'
            });
        }

        if (
            String(password).length < 8
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'Password must be at least 8 characters long.'
            });
        }

        const cleanEmail =
            normalizeEmail(email);

        const {
            data: existingUser,
            error: lookupError
        } =
            await supabaseAdmin
                .from('users')
                .select(`
                    id,
                    email,
                    email_verified
                `)
                .eq(
                    'email',
                    cleanEmail
                )
                .maybeSingle();

        if (lookupError) {
            console.error(
                'Register lookup error:',
                lookupError
            );

            return res.status(500).json({
                success: false,
                message:
                    'Unable to check existing account.',
                error:
                    lookupError.message
            });
        }

        if (existingUser) {
            return res.status(409).json({
                success: false,
                code:
                    existingUser.email_verified
                        ? 'EMAIL_EXISTS'
                        : 'EMAIL_PENDING_VERIFICATION',
                message:
                    existingUser.email_verified
                        ? 'An account with this email already exists.'
                        : 'This email is already registered but has not been verified. Use Resend Verification Email on the login page.'
            });
        }

        const password_hash =
            await bcrypt.hash(
                String(password),
                12
            );

        const {
            token,
            hash
        } =
            createToken();

        const verificationExpiresAt =
            new Date(
                Date.now() +
                24 * 60 * 60 * 1000
            ).toISOString();

        const {
            data: user,
            error: insertError
        } =
            await supabaseAdmin
                .from('users')
                .insert({
                    email:
                        cleanEmail,

                    password_hash,

                    first_name:
                        String(first_name).trim(),

                    middle_name:
                        middle_name
                            ? String(middle_name).trim()
                            : null,

                    last_name:
                        String(last_name).trim(),

                    suffix:
                        suffix
                            ? String(suffix).trim()
                            : null,

                    phone_number:
                        phone_number
                            ? String(phone_number).trim()
                            : null,

                    role:
                        'user',

                    is_active:
                        true,

                    email_verified:
                        false,

                    email_verification_token_hash:
                        hash,

                    email_verification_expires_at:
                        verificationExpiresAt
                })
                .select(`
                    id,
                    email,
                    first_name,
                    middle_name,
                    last_name,
                    suffix,
                    phone_number,
                    role,
                    is_active,
                    email_verified,
                    created_at
                `)
                .single();

        if (insertError) {
            console.error(
                'Registration insert error:',
                insertError
            );

            return res.status(500).json({
                success: false,
                message:
                    'Unable to create account.',
                error:
                    insertError.message
            });
        }

        const verificationUrl =
            `${getAppBaseUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

        let emailSent =
            true;

        try {
            await sendEmail({
                to:
                    user.email,

                subject:
                    'Verify your VISIONARICE account',

                html:
                    verificationEmailHtml({
                        firstName:
                            user.first_name,

                        verificationUrl
                    })
            });

        } catch (emailError) {
            emailSent =
                false;

            console.error(
                'Verification email error:',
                emailError
            );
        }

        /*
         * IMPORTANT:
         * Do not create a login session here.
         * The user must verify the email first.
         */
        req.session =
            null;

        return res.status(201).json({
            success: true,

            email_sent:
                emailSent,

            message:
                emailSent
                    ? 'Account created. Check your email and verify your account before signing in.'
                    : 'Account created, but the verification email could not be sent. Use Resend Verification Email on the login page.',

            user: {
                id:
                    user.id,

                email:
                    user.email,

                first_name:
                    user.first_name,

                last_name:
                    user.last_name,

                email_verified:
                    user.email_verified
            }
        });

    } catch (error) {
        console.error(
            'Unexpected registration error:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Unexpected server error.',
            error:
                error.message
        });
    }
};


// ===============================
// LOGIN
// ===============================

exports.login = async (req, res) => {
    try {
        const {
            email,
            password
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required.'
            });
        }

        const cleanEmail = normalizeEmail(email);

        // Find user
        const {
            data: user,
            error: lookupError
        } = await supabaseAdmin
            .from('users')
            .select(`
                id,
                email,
                password_hash,
                first_name,
                middle_name,
                last_name,
                suffix,
                phone_number,
                role,
                is_active,
                email_verified,
                created_at,
                updated_at
            `)
            .eq('email', cleanEmail)
            .maybeSingle();

        if (lookupError) {
            console.error('Login lookup error:', lookupError);

            return res.status(500).json({
                success: false,
                message: 'Unable to process login.',
                error: lookupError.message
            });
        }

        // Do not reveal whether email or password was wrong
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'This account is inactive.'
            });
        }

        if (!user.email_verified) {
            return res.status(403).json({
                success: false,
                code: 'EMAIL_NOT_VERIFIED',
                message:
                    'Please verify your email before signing in.'
            });
        }

        // Compare password
        const validPassword = await bcrypt.compare(
            String(password),
            user.password_hash
        );

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        // Remove password hash before returning user
        const {
            password_hash,
            ...safeUser
        } = user;

        // Create stateless cookie session
        req.session.user = {
            id: safeUser.id,
            email: safeUser.email,
            role: safeUser.role,
            first_name: safeUser.first_name,
            last_name: safeUser.last_name
        };

        return res.json({
            success: true,
            message: 'Login successful.',
            user: safeUser
        });

    } catch (error) {
        console.error('Unexpected login error:', error);

        return res.status(500).json({
            success: false,
            message: 'Unexpected server error.',
            error: error.message
        });
    }
};

// ===============================
// LOGOUT
// ===============================

exports.logout = (req, res) => {
    try {
        req.session = null;

        return res.json({
            success: true,
            message: 'Logout successful.'
        });

    } catch (error) {
        console.error('Unexpected logout error:', error);

        return res.status(500).json({
            success: false,
            message: 'Unexpected server error.',
            error: error.message
        });
    }
};

// ===============================
// CURRENT USER
// ===============================

exports.me = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        const {
            data: user,
            error
        } = await supabaseAdmin
            .from('users')
            .select(`
                id,
                email,
                first_name,
                middle_name,
                last_name,
                suffix,
                phone_number,
                role,
                is_active,
                email_verified,
                created_at,
                updated_at
            `)
            .eq(
                'id',
                req.session.user.id
            )
            .maybeSingle();

        if (error) {
            console.error('Current user lookup error:', error);

            return res.status(500).json({
                success: false,
                message: 'Unable to load current user.',
                error: error.message
            });
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User account not found.'
            });
        }

        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'This account is inactive.'
            });
        }

        return res.json({
            success: true,
            user: user
        });

    } catch (error) {
        console.error('Unexpected current user error:', error);

        return res.status(500).json({
            success: false,
            message: 'Unexpected server error.',
            error: error.message
        });
    }
};

// ===============================
// UPDATE PROFILE
// ===============================

exports.updateProfile = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        const {
            first_name,
            middle_name,
            last_name,
            suffix,
            phone_number
        } = req.body;

        if (!first_name || !last_name) {
            return res.status(400).json({
                success: false,
                message: 'First name and last name are required.'
            });
        }

        const updates = {
            first_name:
                String(first_name).trim(),

            middle_name:
                middle_name
                    ? String(middle_name).trim()
                    : null,

            last_name:
                String(last_name).trim(),

            suffix:
                suffix
                    ? String(suffix).trim()
                    : null,

            phone_number:
                phone_number
                    ? String(phone_number).trim()
                    : null,

            updated_at:
                new Date().toISOString()
        };

        const {
            data: user,
            error
        } =
            await supabaseAdmin
                .from('users')
                .update(updates)
                .eq(
                    'id',
                    req.session.user.id
                )
                .select(`
                    id,
                    email,
                    first_name,
                    middle_name,
                    last_name,
                    suffix,
                    phone_number,
                    role,
                    is_active,
                    created_at,
                    updated_at
                `)
                .single();

        if (error) {
            console.error(
                'Profile update error:',
                error
            );

            return res.status(500).json({
                success: false,
                message: 'Unable to update profile.',
                error: error.message
            });
        }

        req.session.user = {
            ...req.session.user,
            first_name:
                user.first_name,
            last_name:
                user.last_name
        };

        return res.json({
            success: true,
            message: 'Profile updated successfully.',
            user
        });

    } catch (error) {
        console.error(
            'Unexpected profile update error:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Unexpected server error.',
            error: error.message
        });
    }
};


// ===============================
// CHANGE PASSWORD
// ===============================

exports.changePassword = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        const {
            current_password,
            new_password,
            confirm_password
        } = req.body;

        if (
            !current_password ||
            !new_password ||
            !confirm_password
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please complete all password fields.'
            });
        }

        if (
            String(new_password).length < 8
        ) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters long.'
            });
        }

        if (
            new_password !==
            confirm_password
        ) {
            return res.status(400).json({
                success: false,
                message: 'New password and confirmation do not match.'
            });
        }

        if (
            current_password ===
            new_password
        ) {
            return res.status(400).json({
                success: false,
                message: 'New password must be different from your current password.'
            });
        }

        const {
            data: user,
            error: lookupError
        } =
            await supabaseAdmin
                .from('users')
                .select(`
                    id,
                    password_hash
                `)
                .eq(
                    'id',
                    req.session.user.id
                )
                .maybeSingle();

        if (lookupError) {
            console.error(
                'Password lookup error:',
                lookupError
            );

            return res.status(500).json({
                success: false,
                message: 'Unable to verify current password.',
                error: lookupError.message
            });
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User account not found.'
            });
        }

        const validPassword =
            await bcrypt.compare(
                String(current_password),
                user.password_hash
            );

        if (!validPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect.'
            });
        }

        const password_hash =
            await bcrypt.hash(
                String(new_password),
                12
            );

        const {
            error: updateError
        } =
            await supabaseAdmin
                .from('users')
                .update({
                    password_hash,
                    updated_at:
                        new Date().toISOString()
                })
                .eq(
                    'id',
                    req.session.user.id
                );

        if (updateError) {
            console.error(
                'Password update error:',
                updateError
            );

            return res.status(500).json({
                success: false,
                message: 'Unable to change password.',
                error: updateError.message
            });
        }

        return res.json({
            success: true,
            message: 'Password changed successfully.'
        });

    } catch (error) {
        console.error(
            'Unexpected password change error:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Unexpected server error.',
            error: error.message
        });
    }
};


// ===============================
// VERIFY EMAIL
// GET /api/auth/verify-email?token=...
// ===============================

exports.verifyEmail = async (req, res) => {
    try {
        const token =
            String(
                req.query.token || ''
            ).trim();

        if (!token) {
            return res.redirect(
                '/login.html?verification=invalid'
            );
        }

        const tokenHash =
            hashToken(token);

        const now =
            new Date().toISOString();

        const {
            data: user,
            error
        } =
            await supabaseAdmin
                .from('users')
                .select(`
                    id,
                    email
                `)
                .eq(
                    'email_verification_token_hash',
                    tokenHash
                )
                .gt(
                    'email_verification_expires_at',
                    now
                )
                .maybeSingle();

        if (
            error ||
            !user
        ) {
            if (error) {
                console.error(
                    'Verify email lookup error:',
                    error
                );
            }

            return res.redirect(
                '/login.html?verification=invalid'
            );
        }

        const {
            error: updateError
        } =
            await supabaseAdmin
                .from('users')
                .update({
                    email_verified:
                        true,

                    email_verification_token_hash:
                        null,

                    email_verification_expires_at:
                        null,

                    updated_at:
                        new Date().toISOString()
                })
                .eq(
                    'id',
                    user.id
                );

        if (updateError) {
            console.error(
                'Verify email update error:',
                updateError
            );

            return res.redirect(
                '/login.html?verification=error'
            );
        }

        return res.redirect(
            '/login.html?verification=success'
        );

    } catch (error) {
        console.error(
            'Verify email error:',
            error
        );

        return res.redirect(
            '/login.html?verification=error'
        );
    }
};


// ===============================
// RESEND VERIFICATION EMAIL
// ===============================

exports.resendVerification = async (req, res) => {
    try {
        const cleanEmail =
            normalizeEmail(
                req.body.email
            );

        if (!cleanEmail) {
            return res.status(400).json({
                success: false,
                message:
                    'Email is required.'
            });
        }

        const {
            data: user,
            error
        } =
            await supabaseAdmin
                .from('users')
                .select(`
                    id,
                    email,
                    first_name,
                    email_verified
                `)
                .eq(
                    'email',
                    cleanEmail
                )
                .maybeSingle();

        /*
         * Generic response prevents account enumeration.
         */
        if (
            error ||
            !user
        ) {
            if (error) {
                console.error(
                    'Resend verification lookup error:',
                    error
                );
            }

            return res.json({
                success: true,
                message:
                    'If an unverified account exists for that email, a verification link has been sent.'
            });
        }

        if (user.email_verified) {
            return res.json({
                success: true,
                message:
                    'This email is already verified. You can sign in.'
            });
        }

        const {
            token,
            hash
        } =
            createToken();

        const expiresAt =
            new Date(
                Date.now() +
                24 * 60 * 60 * 1000
            ).toISOString();

        const {
            error: updateError
        } =
            await supabaseAdmin
                .from('users')
                .update({
                    email_verification_token_hash:
                        hash,

                    email_verification_expires_at:
                        expiresAt,

                    updated_at:
                        new Date().toISOString()
                })
                .eq(
                    'id',
                    user.id
                );

        if (updateError) {
            console.error(
                'Resend verification token update error:',
                updateError
            );

            return res.status(500).json({
                success: false,
                message:
                    'Unable to create a new verification link.'
            });
        }

        const verificationUrl =
            `${getAppBaseUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

        await sendEmail({
            to:
                user.email,

            subject:
                'Verify your VISIONARICE account',

            html:
                verificationEmailHtml({
                    firstName:
                        user.first_name,

                    verificationUrl
                })
        });

        return res.json({
            success: true,
            message:
                'Verification email sent. Please check your inbox.'
        });

    } catch (error) {
        console.error(
            'Resend verification error:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Unable to resend verification email.',
            error:
                error.message
        });
    }
};


// ===============================
// FORGOT PASSWORD
// ===============================

exports.forgotPassword = async (req, res) => {
    try {
        const cleanEmail =
            normalizeEmail(
                req.body.email
            );

        if (!cleanEmail) {
            return res.status(400).json({
                success: false,
                message:
                    'Email is required.'
            });
        }

        const genericMessage =
            'If an account exists for that email, a password reset link has been sent.';

        const {
            data: user,
            error
        } =
            await supabaseAdmin
                .from('users')
                .select(`
                    id,
                    email,
                    first_name,
                    is_active
                `)
                .eq(
                    'email',
                    cleanEmail
                )
                .maybeSingle();

        if (
            error ||
            !user ||
            !user.is_active
        ) {
            if (error) {
                console.error(
                    'Forgot password lookup error:',
                    error
                );
            }

            return res.json({
                success: true,
                message:
                    genericMessage
            });
        }

        const {
            token,
            hash
        } =
            createToken();

        const expiresAt =
            new Date(
                Date.now() +
                30 * 60 * 1000
            ).toISOString();

        const {
            error: updateError
        } =
            await supabaseAdmin
                .from('users')
                .update({
                    password_reset_token_hash:
                        hash,

                    password_reset_expires_at:
                        expiresAt,

                    updated_at:
                        new Date().toISOString()
                })
                .eq(
                    'id',
                    user.id
                );

        if (updateError) {
            console.error(
                'Password reset token update error:',
                updateError
            );

            return res.status(500).json({
                success: false,
                message:
                    'Unable to create a password reset request.'
            });
        }

        const resetUrl =
            `${getAppBaseUrl()}/reset-password.html?token=${encodeURIComponent(token)}`;

        await sendEmail({
            to:
                user.email,

            subject:
                'Reset your VISIONARICE password',

            html:
                resetPasswordEmailHtml({
                    firstName:
                        user.first_name,

                    resetUrl
                })
        });

        return res.json({
            success: true,
            message:
                genericMessage
        });

    } catch (error) {
        console.error(
            'Forgot password error:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Unable to process password reset.',
            error:
                error.message
        });
    }
};


// ===============================
// RESET PASSWORD
// ===============================

exports.resetPassword = async (req, res) => {
    try {
        const {
            token,
            new_password,
            confirm_password
        } =
            req.body;

        if (
            !token ||
            !new_password ||
            !confirm_password
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'Reset token and both password fields are required.'
            });
        }

        if (
            String(new_password).length < 8
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'New password must be at least 8 characters long.'
            });
        }

        if (
            new_password !==
            confirm_password
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'New password and confirmation do not match.'
            });
        }

        const tokenHash =
            hashToken(token);

        const now =
            new Date().toISOString();

        const {
            data: user,
            error
        } =
            await supabaseAdmin
                .from('users')
                .select(`
                    id,
                    password_hash
                `)
                .eq(
                    'password_reset_token_hash',
                    tokenHash
                )
                .gt(
                    'password_reset_expires_at',
                    now
                )
                .maybeSingle();

        if (
            error ||
            !user
        ) {
            if (error) {
                console.error(
                    'Reset password lookup error:',
                    error
                );
            }

            return res.status(400).json({
                success: false,
                message:
                    'This password reset link is invalid or has expired.'
            });
        }

        const sameAsOldPassword =
            await bcrypt.compare(
                String(new_password),
                user.password_hash
            );

        if (sameAsOldPassword) {
            return res.status(400).json({
                success: false,
                message:
                    'New password must be different from your current password.'
            });
        }

        const password_hash =
            await bcrypt.hash(
                String(new_password),
                12
            );

        const {
            error: updateError
        } =
            await supabaseAdmin
                .from('users')
                .update({
                    password_hash,

                    password_reset_token_hash:
                        null,

                    password_reset_expires_at:
                        null,

                    updated_at:
                        new Date().toISOString()
                })
                .eq(
                    'id',
                    user.id
                );

        if (updateError) {
            console.error(
                'Reset password update error:',
                updateError
            );

            return res.status(500).json({
                success: false,
                message:
                    'Unable to update password.'
            });
        }

        return res.json({
            success: true,
            message:
                'Password reset successfully. You can now sign in.'
        });

    } catch (error) {
        console.error(
            'Reset password error:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Unable to reset password.',
            error:
                error.message
        });
    }
};

