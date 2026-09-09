const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const {
    requireAuth,
    requireAdmin
} = require('../middleware/authMiddleware');

// ===============================
// AUTH ROUTES
// ===============================

// Register new user
router.post('/register', authController.register);

// Login user
router.post('/login', authController.login);

// Logout current user
router.post('/logout', authController.logout);

// Get current logged-in user
router.get('/me', requireAuth, authController.me);

// Optional admin-only auth test
router.get('/admin-check', requireAuth, requireAdmin, (req, res) => {
    return res.json({
        success: true,
        message: 'Admin access confirmed.',
        user: req.session.user
    });
});

module.exports = router;