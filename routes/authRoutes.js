const express = require('express');

const router = express.Router();

const authController =
    require('../controllers/authController');

const {
    requireAuth,
    requireAdmin
} =
    require('../middleware/authMiddleware');


// ===============================
// AUTH ROUTES
// ===============================


// Register new user
router.post(
    '/register',
    authController.register
);


// Login user
router.post(
    '/login',
    authController.login
);


// Logout current user
router.post(
    '/logout',
    authController.logout
);


// Get current logged-in user
router.get(
    '/me',
    requireAuth,
    authController.me
);


// ===============================
// PROFILE ROUTES
// ===============================


// Update current user's profile
router.put(
    '/profile',
    requireAuth,
    authController.updateProfile
);


// Change current user's password
router.post(
    '/change-password',
    requireAuth,
    authController.changePassword
);


// ===============================
// ADMIN CHECK
// ===============================

router.get(
    '/admin-check',
    requireAuth,
    requireAdmin,
    (req, res) => {

        return res.json({
            success: true,

            message:
                'Admin access confirmed.',

            user:
                req.session.user
        });
    }
);


module.exports = router;