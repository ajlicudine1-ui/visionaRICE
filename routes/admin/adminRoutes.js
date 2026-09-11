const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/admin/adminController');

function requireAdmin(req, res, next) {
    if (!req.session?.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (String(req.session.user.role || '').toLowerCase() !== 'admin') {
        return res.status(403).json({ success: false, message: 'Administrator access required.' });
    }

    next();
}

router.get('/dashboard', requireAdmin, adminController.getDashboard);

module.exports = router;
