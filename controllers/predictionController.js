const { supabaseAdmin } = require('../config/supabase');

// =====================================================
// HELPERS
// =====================================================

function getSessionUserId(req) {
    console.log(
        'VISIONARICE SESSION:',
        req.session
    );

    return (
        req.session?.user?.id ||
        req.session?.user?.user_id ||
        req.session?.user?.userId ||
        req.session?.user_id ||
        req.session?.userId ||
        req.session?.id_user ||
        null
    );
}

function normalizeClassName(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/-/g, '_');
}

function isRejectedClass(value) {
    const className =
        normalizeClassName(value);

    return [
        'random_leaf',
        'random_object',
        'not_a_rice_leaf',
        'invalid_leaf',
        'unknown'
    ].includes(className);
}

function cleanText(value) {
    if (
        value === undefined ||
        value === null
    ) {
        return null;
    }

    const text =
        String(value).trim();

    return text || null;
}

function cleanNumber(value) {
    if (
        value === undefined ||
        value === null ||
        value === ''
    ) {
        return null;
    }

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : null;
}

// =====================================================
// POST /api/predictions
// =====================================================

async function createPrediction(req, res) {
    let insertedPredictionId =
        null;

    try {
        const userId =
            getSessionUserId(req);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated.'
            });
        }

        const {
            predicted_disease,
            confidence,
            image_url,
            latitude,
            longitude,
            municipality,
            province,
            top3
        } = req.body || {};

        const className =
            normalizeClassName(
                predicted_disease
            );

        if (!className) {
            return res.status(400).json({
                success: false,
                message:
                    'Predicted disease is required.'
            });
        }

        // Random/non-rice validation outputs are not stored
        // as valid prediction records.
        if (
            isRejectedClass(
                className
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'Rejected/non-rice classes are not saved as valid predictions.'
            });
        }

        const confidenceValue =
            Number(confidence);

        if (
            !Number.isFinite(
                confidenceValue
            ) ||
            confidenceValue < 0 ||
            confidenceValue > 100
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'Confidence must be between 0 and 100.'
            });
        }

        if (
            !Array.isArray(top3) ||
            top3.length === 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'Top prediction scores are required.'
            });
        }

        // =================================================
        // RESOLVE MAIN DISEASE
        // =================================================

        const {
            data: disease,
            error: diseaseError
        } =
            await supabaseAdmin
                .from('diseases')
                .select(
                    'id, code, name'
                )
                .eq(
                    'code',
                    className
                )
                .maybeSingle();

        if (diseaseError) {
            console.error(
                'Disease lookup error:',
                diseaseError
            );

            return res.status(500).json({
                success: false,
                message:
                    'Unable to resolve the predicted disease.',
                error:
                    diseaseError.message
            });
        }

        // Healthy / supported class rows should normally exist
        // in diseases, but disease_id is nullable in your schema.
        const diseaseId =
            disease?.id || null;

        // =================================================
        // INSERT PREDICTION
        // =================================================

        const predictionPayload = {
            user_id:
                userId,

            disease_id:
                diseaseId,

            predicted_disease:
                className,

            confidence:
                Number(
                    confidenceValue.toFixed(3)
                ),

            image_url:
                cleanText(image_url),

            latitude:
                cleanNumber(latitude),

            longitude:
                cleanNumber(longitude),

            municipality:
                cleanText(municipality),

            province:
                cleanText(province),

            status:
                'completed'
        };

        const {
            data: prediction,
            error: predictionError
        } =
            await supabaseAdmin
                .from('predictions')
                .insert(
                    predictionPayload
                )
                .select(
                    'id, user_id, disease_id, predicted_disease, confidence, image_url, latitude, longitude, municipality, province, status, created_at'
                )
                .single();

        if (predictionError) {
            console.error(
                'Prediction insert error:',
                predictionError
            );

            return res.status(500).json({
                success: false,
                message:
                    'Unable to save the prediction.',
                error:
                    predictionError.message
            });
        }

        insertedPredictionId =
            prediction.id;

        // =================================================
        // RESOLVE TOP SCORE DISEASE IDS
        // =================================================

        const normalizedTop3 =
            top3
                .slice(0, 3)
                .map(
                    (item, index) => ({
                        class_name:
                            normalizeClassName(
                                item.class_name
                            ),

                        confidence:
                            Number(
                                item.confidence
                            ),

                        ranking:
                            Number(
                                item.ranking ||
                                index + 1
                            )
                    })
                )
                .filter(
                    item =>
                        item.class_name &&
                        Number.isFinite(
                            item.confidence
                        ) &&
                        item.confidence >= 0 &&
                        item.confidence <= 100
                );

        if (
            normalizedTop3.length === 0
        ) {
            throw new Error(
                'No valid prediction scores were supplied.'
            );
        }

        const classNames =
            [
                ...new Set(
                    normalizedTop3
                        .filter(
                            item =>
                                !isRejectedClass(
                                    item.class_name
                                )
                        )
                        .map(
                            item =>
                                item.class_name
                        )
                )
            ];

        const diseaseIdByCode =
            new Map();

        if (classNames.length > 0) {
            const {
                data: diseases,
                error: diseasesError
            } =
                await supabaseAdmin
                    .from('diseases')
                    .select(
                        'id, code'
                    )
                    .in(
                        'code',
                        classNames
                    );

            if (diseasesError) {
                throw new Error(
                    diseasesError.message
                );
            }

            for (
                const row
                of diseases || []
            ) {
                diseaseIdByCode.set(
                    row.code,
                    row.id
                );
            }
        }

        // =================================================
        // INSERT TOP 3 SCORES
        // =================================================

        const scorePayload =
            normalizedTop3.map(
                item => ({
                    prediction_id:
                        prediction.id,

                    disease_id:
                        diseaseIdByCode.get(
                            item.class_name
                        ) || null,

                    class_name:
                        item.class_name,

                    confidence:
                        Number(
                            item.confidence
                                .toFixed(3)
                        ),

                    ranking:
                        item.ranking
                })
            );

        const {
            data: savedScores,
            error: scoresError
        } =
            await supabaseAdmin
                .from('prediction_scores')
                .insert(
                    scorePayload
                )
                .select(
                    'id, prediction_id, disease_id, class_name, confidence, ranking'
                )
                .order(
                    'ranking',
                    {
                        ascending: true
                    }
                );

        if (scoresError) {
            throw new Error(
                scoresError.message
            );
        }

        return res.status(201).json({
            success: true,
            message:
                'Prediction saved successfully.',
            prediction,
            scores:
                savedScores || []
        });

    } catch (error) {
        console.error(
            'Unexpected prediction save error:',
            error
        );

        // Best-effort rollback if prediction was inserted
        // but prediction_scores failed.
        if (insertedPredictionId) {
            const {
                error: rollbackError
            } =
                await supabaseAdmin
                    .from('predictions')
                    .delete()
                    .eq(
                        'id',
                        insertedPredictionId
                    );

            if (rollbackError) {
                console.error(
                    'Prediction rollback failed:',
                    rollbackError
                );
            }
        }

        return res.status(500).json({
            success: false,
            message:
                'Unable to complete prediction saving.',
            error:
                error.message
        });
    }
}

module.exports = {
    createPrediction
};
