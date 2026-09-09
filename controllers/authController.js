const bcrypt = require('bcryptjs');
const { supabaseAdmin } = require('../config/supabase');

// ===============================
// Helper
// ===============================

const normalizeEmail = (email = '') => {
    return String(email).trim().toLowerCase();
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

        // Required fields
        if (!email || !password || !first_name || !last_name) {
            return res.status(400).json({
                success: false,
                message: 'Email, password, first name, and last name are required.'
            });
        }

        // Password validation
        if (String(password).length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long.'
            });
        }

        const cleanEmail = normalizeEmail(email);

        // Check if email already exists
        const {
            data: existingUser,
            error: lookupError
        } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', cleanEmail)
            .maybeSingle();

        if (lookupError) {
            console.error('Register lookup error:', lookupError);

            return res.status(500).json({
                success: false,
                message: 'Unable to check existing account.',
                error: lookupError.message
            });
        }

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email already exists.'
            });
        }

        // Hash password
        const password_hash = await bcrypt.hash(
            String(password),
            12
        );

        // Create normal user
        const {
            data: user,
            error: insertError
        } = await supabaseAdmin
            .from('users')
            .insert({
                email: cleanEmail,
                password_hash: password_hash,
                first_name: String(first_name).trim(),

                middle_name: middle_name
                    ? String(middle_name).trim()
                    : null,

                last_name: String(last_name).trim(),

                suffix: suffix
                    ? String(suffix).trim()
                    : null,

                phone_number: phone_number
                    ? String(phone_number).trim()
                    : null,

                role: 'user',
                is_active: true
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
                created_at
            `)
            .single();

        if (insertError) {
            console.error('Registration insert error:', insertError);

            return res.status(500).json({
                success: false,
                message: 'Unable to create account.',
                error: insertError.message
            });
        }

        // Create login session immediately
        req.session.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name
        };

        return res.status(201).json({
            success: true,
            message: 'Registration successful.',
            user: user
        });

    } catch (error) {
        console.error('Unexpected registration error:', error);

        return res.status(500).json({
            success: false,
            message: 'Unexpected server error.',
            error: error.message
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

        // Create session
        req.session.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name
        };

        // Remove password hash before returning user
       const {
            password_hash,
            ...safeUser
        } = user;

        req.session.user = {
            id: safeUser.id,
            email: safeUser.email,
            role: safeUser.role
        };

        req.session.save((error) => {

            if (error) {

                console.error(
                    'Session save error:',
                    error
                );

                return res.status(500).json({
                    success: false,
                    message: 'Unable to save login session.'
                });
            }

            return res.json({
                success: true,
                message: 'Login successful.',
                user: safeUser
            });

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
        if (!req.session) {
            return res.json({
                success: true,
                message: 'Already logged out.'
            });
        }

        req.session.destroy((error) => {
            if (error) {
                console.error('Logout error:', error);

                return res.status(500).json({
                    success: false,
                    message: 'Unable to log out.'
                });
            }

            res.clearCookie('connect.sid');

            return res.json({
                success: true,
                message: 'Logout successful.'
            });
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