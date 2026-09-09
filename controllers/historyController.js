const {
    supabaseAdmin
} = require('../config/supabase');

function getSessionUserId(req) {
    return (
        req.session?.user?.id ||
        req.session?.userId ||
        req.session?.id ||
        null
    );
}

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
                char => char.toUpperCase()
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

async function getHistory(req, res) {
    try {
        const userId =
            getSessionUserId(req);

        if (!userId) {
            return res
                .status(401)
                .json({
                    success: false,
                    message:
                        'Not authenticated.'
                });
        }

        let query =
            supabaseAdmin
                .from('predictions')
                .select(`
                    id,
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
                    'user_id',
                    userId
                )
                .order(
                    'created_at',
                    {
                        ascending: false
                    }
                );

        const date =
            cleanText(
                req.query.date
            );

        const disease =
            cleanText(
                req.query.disease
            );

        const confidence =
            cleanText(
                req.query.confidence
            );

        if (date) {
            const start =
                new Date(
                    `${date}T00:00:00+08:00`
                );

            const end =
                new Date(
                    `${date}T00:00:00+08:00`
                );

            if (
                !Number.isNaN(
                    start.getTime()
                )
            ) {
                end.setDate(
                    end.getDate() + 1
                );

                query =
                    query
                        .gte(
                            'created_at',
                            start.toISOString()
                        )
                        .lt(
                            'created_at',
                            end.toISOString()
                        );
            }
        }

        if (disease) {
            query =
                query.eq(
                    'predicted_disease',
                    normalizeDisease(
                        disease
                    )
                );
        }

        if (confidence) {
            const value =
                Number(
                    confidence
                );

            if (
                Number.isFinite(
                    value
                )
            ) {
                query =
                    query.gte(
                        'confidence',
                        value
                    );
            }
        }

        const {
            data,
            error
        } =
            await query;

        if (error) {
            console.error(
                'History query error:',
                error
            );

            return res
                .status(500)
                .json({
                    success: false,
                    message:
                        error.message
                });
        }

        const history =
            (data || []).map(
                row => ({
                    id:
                        row.id,

                    date:
                        row.created_at
                            ? new Date(
                                row.created_at
                            )
                                .toLocaleDateString(
                                    'en-CA',
                                    {
                                        timeZone:
                                            'Asia/Manila'
                                    }
                                )
                            : '',

                    display_date:
                        row.created_at
                            ? new Intl.DateTimeFormat(
                                'en-PH',
                                {
                                    timeZone:
                                        'Asia/Manila',
                                    month:
                                        'short',
                                    day:
                                        '2-digit',
                                    year:
                                        'numeric',
                                    hour:
                                        '2-digit',
                                    minute:
                                        '2-digit'
                                }
                            ).format(
                                new Date(
                                    row.created_at
                                )
                            )
                            : '',

                    disease:
                        prettyDisease(
                            row.predicted_disease
                        ),

                    confidence:
                        Number(
                            Number(
                                row.confidence || 0
                            ).toFixed(2)
                        ),

                    location:
                        locationText(
                            row
                        ),

                    image_url:
                        row.image_url || '',

                    latitude:
                        row.latitude,

                    longitude:
                        row.longitude,

                    status:
                        row.status || ''
                })
            );

        return res.json({
            success: true,
            history
        });

    } catch (error) {
        console.error(
            'History endpoint error:',
            error
        );

        return res
            .status(500)
            .json({
                success: false,
                message:
                    error.message
            });
    }
}


async function getHistoryDetail(req, res) {
    try {
        const userId =
            getSessionUserId(req);

        if (!userId) {
            return res
                .status(401)
                .json({
                    success: false,
                    message:
                        'Not authenticated.'
                });
        }

        const predictionId =
            cleanText(
                req.params.id
            );

        if (!predictionId) {
            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        'Prediction ID is required.'
                });
        }

        const {
            data: prediction,
            error
        } =
            await supabaseAdmin
                .from('predictions')
                .select(`
                    id,
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
                .eq(
                    'user_id',
                    userId
                )
                .maybeSingle();

        if (error) {
            console.error(
                'History detail query error:',
                error
            );

            return res
                .status(500)
                .json({
                    success: false,
                    message:
                        error.message
                });
        }

        if (!prediction) {
            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        'Prediction record not found.'
                });
        }

        const {
            data: scores,
            error: scoresError
        } =
            await supabaseAdmin
                .from('prediction_scores')
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
                        ascending: true
                    }
                );

        if (scoresError) {
            console.error(
                'History detail scores error:',
                scoresError
            );
        }

        const displayDate =
            prediction.created_at
                ? new Intl.DateTimeFormat(
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
                ).format(
                    new Date(
                        prediction.created_at
                    )
                )
                : '';

        return res.json({
            success: true,

            prediction: {
                id:
                    prediction.id,

                predicted_disease:
                    prediction.predicted_disease,

                disease:
                    prettyDisease(
                        prediction.predicted_disease
                    ),

                confidence:
                    Number(
                        Number(
                            prediction.confidence || 0
                        ).toFixed(2)
                    ),

                image_url:
                    prediction.image_url || '',

                latitude:
                    prediction.latitude,

                longitude:
                    prediction.longitude,

                municipality:
                    prediction.municipality || '',

                province:
                    prediction.province || '',

                location:
                    locationText(
                        prediction
                    ),

                status:
                    prediction.status || '',

                created_at:
                    prediction.created_at,

                display_date:
                    displayDate,

                top3:
                    (scores || [])
                        .slice(0, 3)
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
                                            score.confidence || 0
                                        ).toFixed(2)
                                    ),

                                ranking:
                                    score.ranking
                            })
                        )
            }
        });

    } catch (error) {
        console.error(
            'History detail endpoint error:',
            error
        );

        return res
            .status(500)
            .json({
                success: false,
                message:
                    error.message
            });
    }
}

module.exports = {
    getHistory,
    getHistoryDetail
};
