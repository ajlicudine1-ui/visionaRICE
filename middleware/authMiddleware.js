// ===============================
// AUTHENTICATION MIDDLEWARE
// ===============================

function requireAuth(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.'
        });
    }

    next();
}

// ===============================
// ADMIN MIDDLEWARE
// ===============================

function requireAdmin(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.'
        });
    }

    if (req.session.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Administrator access required.'
        });
    }

    next();
}

// ===============================
// USER MIDDLEWARE
// ===============================

function requireUser(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.'
        });
    }

    if (req.session.user.role !== 'user') {
        return res.status(403).json({
            success: false,
            message: 'User access required.'
        });
    }

    next();
}

// ===============================
// ACTIVE SESSION CHECK
// ===============================

function hasSession(req, res, next) {
    req.isLoggedIn = Boolean(
        req.session &&
        req.session.user
    );

    next();
}

module.exports = {
    requireAuth,
    requireAdmin,
    requireUser,
    hasSession
};