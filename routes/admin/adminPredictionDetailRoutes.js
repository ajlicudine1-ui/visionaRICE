const express = require('express');

const router = express.Router();

const {
    supabaseAdmin
} = require('../../config/supabase');


function cleanText(value) {
    if (
        value === undefined ||
        value === null
    ) {
        return '';
    }

    return String(value).trim();
}


function normalizeDisease(value) {
    return cleanText(value)
        .toLowerCase()
        .replace(/[-\s]+/g, '_');
}


function prettyDisease(value) {

    const key =
        normalizeDisease(value);

    const names = {
        bacterial_leaf_blight:
            'Bacterial Leaf Blight',

        brown_spot:
            'Brown Spot',

        healthy_rice_plant:
            'Healthy Rice Plant',

        leaf_blast:
            'Leaf Blast'
    };

    return (
        names[key] ||
        cleanText(value)
            .replace(/_/g, ' ')
            .replace(
                /\b\w/g,
                char =>
                    char.toUpperCase()
            )
    );
}


function locationText(row) {

    return [
        row.municipality,
        row.province
    ]
        .filter(Boolean)
        .join(', ');
}


function isAdmin(req) {

    return (
        String(
            req.session?.user?.role ||
            ''
        )
            .trim()
            .toLowerCase() ===
        'admin'
    );
}


/*
 * ============================================================
 * GET ADMIN PREDICTION DETAIL
 * ============================================================
 *
 * GET /api/admin/prediction-detail/:id
 *
 * Separate from /api/history/:id.
 * An administrator can inspect any prediction record.
 */
router.get(
    '/:id',
    async (
        req,
        res
    ) => {

        if (!req.session?.user) {

            return res
                .status(401)
                .json({
                    success:
                        false,

                    message:
                        'Not authenticated.'
                });
        }


        if (!isAdmin(req)) {

            return res
                .status(403)
                .json({
                    success:
                        false,

                    message:
                        'Administrator access required.'
                });
        }


        try {

            const predictionId =
                cleanText(
                    req.params.id
                );


            if (!predictionId) {

                return res
                    .status(400)
                    .json({
                        success:
                            false,

                        message:
                            'Prediction ID is required.'
                    });
            }


            const {
                data: prediction,
                error
            } =
                await supabaseAdmin
                    .from(
                        'predictions'
                    )
                    .select(`
                        id,
                        user_id,
                        predicted_disease,
                        confidence,
                        image_url,
                        latitude,
                        longitude,
                        municipality,
                        province,
                        status,
                        created_at
                    `)
                    .eq(
                        'id',
                        predictionId
                    )
                    .maybeSingle();


            if (error) {

                console.error(
                    'Admin prediction detail query error:',
                    error
                );

                return res
                    .status(500)
                    .json({
                        success:
                            false,

                        message:
                            error.message
                    });
            }


            if (!prediction) {

                return res
                    .status(404)
                    .json({
                        success:
                            false,

                        message:
                            'Prediction record not found.'
                    });
            }


            const {
                data: scores,
                error: scoresError
            } =
                await supabaseAdmin
                    .from(
                        'prediction_scores'
                    )
                    .select(`
                        class_name,
                        confidence,
                        ranking
                    `)
                    .eq(
                        'prediction_id',
                        predictionId
                    )
                    .order(
                        'ranking',
                        {
                            ascending:
                                true
                        }
                    );


            if (scoresError) {

                console.error(
                    'Admin prediction detail scores error:',
                    scoresError
                );

            }


            const displayDate =
                prediction.created_at
                    ? new Intl
                        .DateTimeFormat(
                            'en-PH',
                            {
                                timeZone:
                                    'Asia/Manila',

                                month:
                                    'long',

                                day:
                                    '2-digit',

                                year:
                                    'numeric',

                                hour:
                                    '2-digit',

                                minute:
                                    '2-digit'
                            }
                        )
                        .format(
                            new Date(
                                prediction.created_at
                            )
                        )
                    : '';


            return res.json({

                success:
                    true,


                prediction: {

                    id:
                        prediction.id,

                    user_id:
                        prediction.user_id,

                    predicted_disease:
                        prediction.predicted_disease,

                    disease:
                        prettyDisease(
                            prediction.predicted_disease
                        ),

                    confidence:
                        Number(
                            Number(
                                prediction.confidence ||
                                0
                            ).toFixed(
                                2
                            )
                        ),

                    image_url:
                        prediction.image_url ||
                        '',

                    latitude:
                        prediction.latitude,

                    longitude:
                        prediction.longitude,

                    municipality:
                        prediction.municipality ||
                        '',

                    province:
                        prediction.province ||
                        '',

                    location:
                        locationText(
                            prediction
                        ),

                    status:
                        prediction.status ||
                        '',

                    created_at:
                        prediction.created_at,

                    display_date:
                        displayDate,

                    top3:
                        (
                            scores ||
                            []
                        )
                            .slice(
                                0,
                                3
                            )
                            .map(
                                score => ({

                                    class_name:
                                        score.class_name,

                                    disease:
                                        prettyDisease(
                                            score.class_name
                                        ),

                                    confidence:
                                        Number(
                                            Number(
                                                score.confidence ||
                                                0
                                            ).toFixed(
                                                2
                                            )
                                        ),

                                    ranking:
                                        score.ranking
                                })
                            )
                }
            });


        } catch (error) {

            console.error(
                'Admin prediction detail endpoint error:',
                error
            );

            return res
                .status(500)
                .json({
                    success:
                        false,

                    message:
                        error.message ||
                        'Unable to load prediction detail.'
                });
        }
    }
);


module.exports =
    router;
