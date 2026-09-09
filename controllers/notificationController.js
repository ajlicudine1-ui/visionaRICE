const {
    supabaseAdmin
} =
    require(
        '../config/supabase'
    );


// =====================================================
// HELPERS
// =====================================================

function getSessionUserId(req) {
    return (
        req.session?.user?.id ||
        req.session?.user_id ||
        req.session?.userId ||
        null
    );
}


function normalizeDiseaseName(
    value
) {
    return String(
        value || ''
    )
        .trim()
        .replace(
            /_/g,
            ' '
        )
        .replace(
            /-/g,
            ' '
        )
        .replace(
            /\s+/g,
            ' '
        )
        .toLowerCase();
}


function prettyDiseaseName(
    value
) {
    const normalized =
        normalizeDiseaseName(
            value
        );

    const aliases = {
        'bacterial leaf blight':
            'Bacterial Leaf Blight',

        'brown spot':
            'Brown Spot',

        'healthy rice plant':
            'Healthy Rice Plant',

        'leaf blast':
            'Leaf Blast',

        'random leaf':
            'Random Leaf',

        'random object':
            'Random Object'
    };

    return (
        aliases[
            normalized
        ] ||
        normalized
            .split(' ')
            .filter(Boolean)
            .map(
                word =>
                    word
                        .charAt(0)
                        .toUpperCase() +
                    word.slice(1)
            )
            .join(' ')
    );
}


function isValidPrediction(
    row
) {
    const normalized =
        normalizeDiseaseName(
            row.predicted_disease
        );

    return ![
        'random leaf',
        'random object',
        'not a rice leaf',
        'invalid leaf',
        'unknown'
    ].includes(
        normalized
    );
}


function isHealthy(
    row
) {
    return (
        normalizeDiseaseName(
            row.predicted_disease
        ) ===
        'healthy rice plant'
    );
}


function manilaDateParts(
    value = new Date()
) {
    const parts =
        new Intl.DateTimeFormat(
            'en-CA',
            {
                timeZone:
                    'Asia/Manila',

                year:
                    'numeric',

                month:
                    '2-digit',

                day:
                    '2-digit'
            }
        ).formatToParts(
            new Date(value)
        );

    const result = {};

    for (
        const part of parts
    ) {
        if (
            part.type !==
            'literal'
        ) {
            result[
                part.type
            ] =
                part.value;
        }
    }

    return result;
}


function manilaDayKey(
    value
) {
    const parts =
        manilaDateParts(
            value
        );

    return (
        `${parts.year}-` +
        `${parts.month}-` +
        `${parts.day}`
    );
}


function manilaTodayStartUtc() {
    const parts =
        manilaDateParts(
            new Date()
        );

    /*
     * Asia/Manila is UTC+8.
     * Midnight Manila converted to UTC.
     */
    return new Date(
        `${parts.year}-${parts.month}-${parts.day}T00:00:00+08:00`
    );
}


function periodStart(
    filter
) {
    const todayStart =
        manilaTodayStartUtc();

    if (
        filter ===
        'daily'
    ) {
        return todayStart;
    }

    if (
        filter ===
        'weekly'
    ) {
        return new Date(
            todayStart.getTime() -
            (
                6 *
                24 *
                60 *
                60 *
                1000
            )
        );
    }

    if (
        filter ===
        'monthly'
    ) {
        return new Date(
            todayStart.getTime() -
            (
                29 *
                24 *
                60 *
                60 *
                1000
            )
        );
    }

    return null;
}


function locationLabel(
    row
) {
    const municipality =
        String(
            row.municipality ||
            ''
        ).trim();

    const province =
        String(
            row.province ||
            ''
        ).trim();

    if (
        municipality &&
        province
    ) {
        return (
            `${municipality}, ` +
            province
        );
    }

    if (municipality) {
        return municipality;
    }

    if (province) {
        return province;
    }

    return (
        'Location not recorded'
    );
}


function displayDate(
    value
) {
    if (!value) {
        return '';
    }

    return (
        new Intl.DateTimeFormat(
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
            new Date(value)
        )
    );
}


// =====================================================
// GET /api/notifications
// ?filter=overall|daily|weekly|monthly
// =====================================================

async function getNotifications(
    req,
    res
) {
    try {
        const userId =
            getSessionUserId(
                req
            );

        if (!userId) {
            return res
                .status(401)
                .json({
                    success:
                        false,

                    message:
                        'Not authenticated.'
                });
        }

        const allowedFilters =
            new Set([
                'overall',
                'daily',
                'weekly',
                'monthly'
            ]);

        let filter =
            String(
                req.query.filter ||
                'overall'
            )
                .trim()
                .toLowerCase();

        if (
            !allowedFilters.has(
                filter
            )
        ) {
            filter =
                'overall';
        }

        let query =
            supabaseAdmin
                .from(
                    'predictions'
                )
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
                .eq(
                    'status',
                    'completed'
                )
                .order(
                    'created_at',
                    {
                        ascending:
                            false
                    }
                );

        const start =
            periodStart(
                filter
            );

        if (start) {
            query =
                query.gte(
                    'created_at',
                    start.toISOString()
                );
        }

        const {
            data,
            error
        } =
            await query;

        if (error) {
            console.error(
                'Notifications query error:',
                error
            );

            return res
                .status(500)
                .json({
                    success:
                        false,

                    message:
                        'Unable to load notifications.',

                    error:
                        error.message
                });
        }

        const rows =
            (
                Array.isArray(
                    data
                )
                    ? data
                    : []
            ).filter(
                isValidPrediction
            );

        /*
         * "Most frequent disease" intentionally excludes
         * Healthy Rice Plant because it is not a disease.
         */
        const diseaseRows =
            rows.filter(
                row =>
                    !isHealthy(
                        row
                    )
            );

        const diseaseCounts =
            new Map();

        for (
            const row of
            diseaseRows
        ) {
            const disease =
                prettyDiseaseName(
                    row.predicted_disease
                );

            diseaseCounts.set(
                disease,
                (
                    diseaseCounts.get(
                        disease
                    ) ||
                    0
                ) + 1
            );
        }

        const sortedDiseaseCounts =
            [
                ...diseaseCounts
                    .entries()
            ]
                .sort(
                    (
                        a,
                        b
                    ) => {
                        if (
                            b[1] !==
                            a[1]
                        ) {
                            return (
                                b[1] -
                                a[1]
                            );
                        }

                        return (
                            a[0]
                                .localeCompare(
                                    b[0]
                                )
                        );
                    }
                );

        const mostFrequent =
            sortedDiseaseCounts
                .length
                ? {
                    disease:
                        sortedDiseaseCounts[
                            0
                        ][0],

                    count:
                        sortedDiseaseCounts[
                            0
                        ][1]
                }
                : {
                    disease:
                        null,

                    count:
                        0
                };

        const notifications =
            rows.map(
                row => {
                    const healthy =
                        isHealthy(
                            row
                        );

                    const disease =
                        prettyDiseaseName(
                            row.predicted_disease
                        );

                    return {
                        id:
                            row.id,

                        type:
                            healthy
                                ? 'healthy'
                                : 'disease',

                        disease,

                        confidence:
                            Number(
                                Number(
                                    row.confidence ||
                                    0
                                ).toFixed(
                                    2
                                )
                            ),

                        location:
                            locationLabel(
                                row
                            ),

                        municipality:
                            row.municipality ||
                            '',

                        province:
                            row.province ||
                            '',

                        created_at:
                            row.created_at,

                        display_date:
                            displayDate(
                                row.created_at
                            ),

                        title:
                            healthy
                                ? 'Healthy Rice Plant Detected'
                                : `${disease} Detected`,

                        message:
                            healthy
                                ? 'The analyzed rice leaf was classified as healthy.'
                                : `A rice leaf analysis detected ${disease}.`
                    };
                }
            );

        return res.json({
            success:
                true,

            filter,

            period: {
                start:
                    start
                        ? start.toISOString()
                        : null,

                end:
                    new Date()
                        .toISOString()
            },

            summary: {
                total_scans:
                    rows.length,

                disease_detections:
                    diseaseRows.length,

                healthy_scans:
                    rows.length -
                    diseaseRows.length,

                most_frequent_disease:
                    mostFrequent.disease,

                most_frequent_count:
                    mostFrequent.count
            },

            disease_counts:
                sortedDiseaseCounts
                    .map(
                        (
                            [
                                disease,
                                count
                            ]
                        ) => ({
                            disease,
                            count
                        })
                    ),

            notifications
        });

    } catch (error) {
        console.error(
            'Notifications endpoint error:',
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
}


module.exports = {
    getNotifications
};
