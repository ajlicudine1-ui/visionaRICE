const express = require('express');
const router = express.Router();

const authController =
    require('../controllers/authController');

const {
    requireAuth
} =
    require('../middleware/authMiddleware');

router.post(
    '/register',
    authController.register
);

router.post(
    '/login',
    authController.login
);

router.post(
    '/logout',
    authController.logout
);

router.get(
    '/me',
    requireAuth,
    authController.me
);

router.put(
    '/profile',
    requireAuth,
    authController.updateProfile
);

router.post(
    '/change-password',
    requireAuth,
    authController.changePassword
);

router.get(
    '/verify-email',
    authController.verifyEmail
);

router.post(
    '/resend-verification',
    authController.resendVerification
);

router.post(
    '/forgot-password',
    authController.forgotPassword
);

router.post(
    '/reset-password',
    authController.resetPassword
);

module.exports =
    router;
