const express = require('express');

const router =
    express.Router();

const {
    createPrediction,
    getPredictionHistory,
    getPredictionById
} =
    require(
        '../controllers/predictionController'
    );

// POST /api/predictions
router.post(
    '/',
    createPrediction
);

// GET /api/predictions/history
router.get(
    '/history',
    getPredictionHistory
);

// GET /api/predictions/:id
router.get(
    '/:id',
    getPredictionById
);

module.exports =
    router;
