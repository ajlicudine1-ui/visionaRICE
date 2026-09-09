const express = require('express');

const router =
    express.Router();

const {
    createPrediction
} =
    require(
        '../controllers/predictionController'
    );

// POST /api/predictions
router.post(
    '/',
    createPrediction
);

module.exports =
    router;
