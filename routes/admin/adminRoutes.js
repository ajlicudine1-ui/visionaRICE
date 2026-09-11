const express = require('express');

const router =
    express.Router();

const adminController =
    require(
        '../../controllers/admin/adminController'
    );

const adminUsersController =
    require(
        '../../controllers/admin/adminUsersController'
    );

const adminNotificationsController =
    require(
        '../../controllers/admin/adminNotificationsController'
    );


function requireAdmin(
    req,
    res,
    next
) {
    if (
        !req.session ||
        !req.session.user
    ) {
        return res.status(401).json({
            success: false,
            message:
                'Authentication required.'
        });
    }

    if (
        String(
            req.session.user.role ||
            ''
        ).toLowerCase() !==
        'admin'
    ) {
        return res.status(403).json({
            success: false,
            message:
                'Administrator access required.'
        });
    }

    next();
}


router.get(
    '/dashboard',
    requireAdmin,
    adminController.getDashboard
);


router.get(
    '/predictions',
    requireAdmin,
    adminController.getPredictions
);


router.get(
    '/users',
    requireAdmin,
    adminUsersController.getUsers
);


router.patch(
    '/users/:id/status',
    requireAdmin,
    adminUsersController.updateUserStatus
);


router.get(
    '/users/:id/dashboard',
    requireAdmin,
    adminUsersController.getUserDashboard
);


router.get(
    '/notifications',
    requireAdmin,
    adminNotificationsController.getNotifications
);


module.exports =
    router;
