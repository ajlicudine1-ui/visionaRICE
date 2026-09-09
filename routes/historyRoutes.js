const express =
    require('express');

const router =
    express.Router();

const {
    getHistory,
    getHistoryDetail
} =
    require(
        '../controllers/historyController'
    );

router.get(
    '/',
    getHistory
);

router.get(
    '/:id',
    getHistoryDetail
);

module.exports =
    router;
