const { supabaseAdmin } =
    require('../../config/supabase');


const PRETTY = {
    bacterial_leaf_blight:
        'Bacterial Leaf Blight',

    brown_spot:
        'Brown Spot',

    healthy_rice_plant:
        'Healthy Rice Plant',

    leaf_blast:
        'Leaf Blast',

    sheath_blight:
        'Sheath Blight',

    tungro_virus:
        'Tungro Virus'
};


const clean =
    value =>
        String(
            value ??
            ''
        ).trim();


function prettyDisease(value) {
    const key =
        clean(value)
            .toLowerCase();

    return (
        PRETTY[key] ||
        key
            .replace(
                /_/g,
                ' '
            )
            .replace(
                /\b\w/g,
                c =>
                    c.toUpperCase()
            )
    );
}


function normalizeConfidence(value) {
    const n =
        Number(value);

    if (
        !Number.isFinite(n)
    ) {
        return 0;
    }

    return (
        n >= 0 &&
        n <= 1
    )
        ? n * 100
        : n;
}


function phDate(
    value = new Date()
) {
    const d =
        value instanceof Date
            ? value
            : new Date(value);

    if (
        Number.isNaN(
            d.getTime()
        )
    ) {
        return '';
    }

    const p =
        Object.fromEntries(
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
            )
                .formatToParts(d)
                .map(
                    x => [
                        x.type,
                        x.value
                    ]
                )
        );

    return (
        `${p.year}-` +
        `${p.month}-` +
        `${p.day}`
    );
}


function unique(values) {
    return [
        ...new Set(
            values
                .map(clean)
                .filter(Boolean)
        )
    ]
        .sort(
            (
                a,
                b
            ) =>
                a.localeCompare(
                    b,
                    undefined,
                    {
                        sensitivity:
                            'base'
                    }
                )
        );
}


function datePasses(
    createdAt,
    range
) {
    if (!range) {
        return true;
    }

    const created =
        new Date(
            createdAt
        );

    if (
        Number.isNaN(
            created.getTime()
        )
    ) {
        return false;
    }

    if (
        range ===
        'today'
    ) {
        return (
            phDate(
                created
            ) ===
            phDate()
        );
    }

    const days =
        range === '7d'
            ? 7
            : range === '30d'
                ? 30
                : null;

    if (!days) {
        return true;
    }

    return (
        created >=
        new Date(
            Date.now() -
            (
                days - 1
            ) *
            86400000
        )
    );
}


function fullName(user = {}) {
    return [
        clean(
            user.first_name
        ),

        clean(
            user.middle_name
        ),

        clean(
            user.last_name
        ),

        clean(
            user.suffix
        )
    ]
        .filter(Boolean)
        .join(' ') ||

        clean(
            user.email
        ) ||

        'Unknown User';
}


/* =========================================
   ADMIN DASHBOARD
========================================= */

exports.getDashboard =
async (
    req,
    res
) => {

    try {

        const province =
            clean(
                req.query.province
            );

        const municipality =
            clean(
                req.query.municipality
            );

        const barangay =
            clean(
                req.query.barangay
            );


        // =====================================
        // LOAD PREDICTIONS
        // =====================================

        const {
            data: predictions,
            error: predictionError
        } =
            await supabaseAdmin
                .from(
                    'predictions'
                )
                .select('*')
                .order(
                    'created_at',
                    {
                        ascending:
                            false
                    }
                );


        if (predictionError) {
            return res
                .status(500)
                .json({
                    success:
                        false,

                    message:
                        'Unable to load dashboard predictions.',

                    error:
                        predictionError.message
                });
        }


        // =====================================
        // LOAD USERS
        // =====================================

        const {
            data: users,
            error: userError
        } =
            await supabaseAdmin
                .from(
                    'users'
                )
                .select(`
                    id,
                    first_name,
                    middle_name,
                    last_name,
                    suffix,
                    email,
                    role,
                    is_active
                `);


        if (userError) {
            console.error(
                'Admin dashboard users:',
                userError
            );
        }


        const safePredictions =
            Array.isArray(
                predictions
            )
                ? predictions
                : [];


        const safeUsers =
            Array.isArray(
                users
            )
                ? users
                : [];


        const userMap =
            new Map(
                safeUsers.map(
                    user => [
                        String(
                            user.id
                        ),
                        user
                    ]
                )
            );


        // =====================================
        // LOCATION FILTER OPTIONS
        // =====================================

        const provinceRows =
            province
                ? safePredictions
                    .filter(
                        row =>
                            clean(
                                row.province
                            )
                                .toLowerCase() ===
                            province
                                .toLowerCase()
                    )
                : safePredictions;


        const municipalityRows =
            municipality
                ? provinceRows
                    .filter(
                        row =>
                            clean(
                                row.municipality
                            )
                                .toLowerCase() ===
                            municipality
                                .toLowerCase()
                    )
                : provinceRows;


        const barangayRows =
            barangay
                ? municipalityRows
                    .filter(
                        row =>
                            clean(
                                row.barangay
                            )
                                .toLowerCase() ===
                            barangay
                                .toLowerCase()
                    )
                : municipalityRows;


        /*
         * These are the prediction rows currently
         * selected by Province / Municipality /
         * Barangay.
         */
        const rows =
            barangayRows;


        // =====================================
        // KPI: CONFIDENCE
        // =====================================

        const confidenceValues =
            rows.map(
                row =>
                    normalizeConfidence(
                        row.confidence
                    )
            );


        const averageConfidence =
            confidenceValues.length
                ? confidenceValues
                    .reduce(
                        (
                            total,
                            value
                        ) =>
                            total +
                            value,
                        0
                    ) /
                    confidenceValues.length
                : 0;


        // =====================================
        // KPI: HEALTHY VS DISEASED
        // =====================================

        const healthy =
            rows.filter(
                row =>
                    clean(
                        row.predicted_disease
                    )
                        .toLowerCase() ===
                    'healthy_rice_plant'
            )
                .length;


        const diseased =
            rows.length -
            healthy;


        // =====================================
        // DISEASE OCCURRENCES
        // =====================================

        const diseaseCounts = {};


        rows.forEach(
            row => {

                const key =
                    clean(
                        row.predicted_disease
                    )
                        .toLowerCase();


                if (
                    !key ||
                    key ===
                    'healthy_rice_plant'
                ) {
                    return;
                }


                const label =
                    prettyDisease(
                        key
                    );


                diseaseCounts[label] =
                    (
                        diseaseCounts[
                            label
                        ] ||
                        0
                    ) + 1;
            }
        );


        const diseaseEntries =
            Object.entries(
                diseaseCounts
            )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        b[1] -
                        a[1]
                );


        const diseaseChart = {
            labels:
                diseaseEntries
                    .map(
                        item =>
                            item[0]
                    ),

            values:
                diseaseEntries
                    .map(
                        item =>
                            item[1]
                    )
        };


        // =====================================
        // HEALTH CHART
        // =====================================

        const healthChart = {
            labels: [
                'Healthy',
                'Diseased'
            ],

            values: [
                healthy,
                diseased
            ]
        };


        // =====================================
        // SCANS OVER TIME - LAST 14 DAYS
        // =====================================

        const trendKeys = [];
        const trendLabels = [];


        for (
            let offset = 13;
            offset >= 0;
            offset -= 1
        ) {

            const d =
                new Date(
                    Date.now() -
                    (
                        offset *
                        86400000
                    )
                );


            trendKeys.push(
                phDate(
                    d
                )
            );


            trendLabels.push(
                new Intl.DateTimeFormat(
                    'en-PH',
                    {
                        timeZone:
                            'Asia/Manila',

                        month:
                            'short',

                        day:
                            'numeric'
                    }
                )
                    .format(
                        d
                    )
            );
        }


        const trendCounts =
            Object.fromEntries(
                trendKeys.map(
                    key => [
                        key,
                        0
                    ]
                )
            );


        rows.forEach(
            row => {

                const key =
                    phDate(
                        row.created_at
                    );


                if (
                    Object.prototype
                        .hasOwnProperty
                        .call(
                            trendCounts,
                            key
                        )
                ) {
                    trendCounts[key] +=
                        1;
                }
            }
        );


        const trendChart = {
            labels:
                trendLabels,

            values:
                trendKeys.map(
                    key =>
                        trendCounts[
                            key
                        ]
                )
        };


        // =====================================
        // CONFIDENCE SCORE RANGES
        // =====================================

        const confidenceBands = {
            '90–100%': 0,
            '80–89%': 0,
            '70–79%': 0,
            'Below 70%': 0
        };


        rows.forEach(
            row => {

                const value =
                    normalizeConfidence(
                        row.confidence
                    );


                if (
                    value >=
                    90
                ) {
                    confidenceBands[
                        '90–100%'
                    ] += 1;

                } else if (
                    value >=
                    80
                ) {
                    confidenceBands[
                        '80–89%'
                    ] += 1;

                } else if (
                    value >=
                    70
                ) {
                    confidenceBands[
                        '70–79%'
                    ] += 1;

                } else {
                    confidenceBands[
                        'Below 70%'
                    ] += 1;
                }
            }
        );


        const confidenceChart = {
            labels:
                Object.keys(
                    confidenceBands
                ),

            values:
                Object.values(
                    confidenceBands
                )
        };


        // =====================================
        // TOP LOCATIONS
        // =====================================

        const locationCounts =
            {};


        rows.forEach(
            row => {

                const location =
                    [
                        clean(
                            row.barangay
                        ),

                        clean(
                            row.municipality
                        ),

                        clean(
                            row.province
                        )
                    ]
                        .filter(Boolean)
                        .join(', ');


                if (!location) {
                    return;
                }


                locationCounts[
                    location
                ] =
                    (
                        locationCounts[
                            location
                        ] ||
                        0
                    ) + 1;
            }
        );


        const topLocations =
            Object.entries(
                locationCounts
            )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        b[1] -
                        a[1]
                )
                .slice(
                    0,
                    5
                )
                .map(
                    (
                        [
                            location,
                            count
                        ],
                        index
                    ) => ({
                        rank:
                            index +
                            1,

                        location:
                            location,

                        count:
                            count
                    })
                );


        // =====================================
        // RECENT PREDICTIONS
        // =====================================

        const recentPredictions =
            rows
                .slice(
                    0,
                    8
                )
                .map(
                    row => {

                        const user =
                            userMap.get(
                                String(
                                    row.user_id ||
                                    ''
                                )
                            );


                        return {
                            id:
                                row.id,

                            disease:
                                prettyDisease(
                                    row.predicted_disease
                                ),

                            disease_key:
                                clean(
                                    row.predicted_disease
                                ),

                            confidence:
                                Number(
                                    normalizeConfidence(
                                        row.confidence
                                    )
                                        .toFixed(
                                            2
                                        )
                                ),

                            image_url:
                                clean(
                                    row.image_url
                                ),

                            province:
                                clean(
                                    row.province
                                ),

                            municipality:
                                clean(
                                    row.municipality
                                ),

                            barangay:
                                clean(
                                    row.barangay
                                ),

                            created_at:
                                row.created_at,

                            user: {
                                id:
                                    user?.id ||
                                    null,

                                name:
                                    fullName(
                                        user
                                    ),

                                email:
                                    clean(
                                        user?.email
                                    )
                            }
                        };
                    }
                );


        // =====================================
        // ACTIVE USERS
        // =====================================

        const activeUsers =
            safeUsers.filter(
                user =>
                    user.is_active ===
                    true &&
                    clean(
                        user.role
                    )
                        .toLowerCase() !==
                    'admin'
            )
                .length;


        // =====================================
        // RESPONSE
        // =====================================

        return res.json({

            success:
                true,


            filters: {

                selected: {
                    province:
                        province,

                    municipality:
                        municipality,

                    barangay:
                        barangay
                },


                options: {

                    provinces:
                        unique(
                            safePredictions.map(
                                row =>
                                    row.province
                            )
                        ),

                    municipalities:
                        unique(
                            provinceRows.map(
                                row =>
                                    row.municipality
                            )
                        ),

                    barangays:
                        unique(
                            municipalityRows.map(
                                row =>
                                    row.barangay
                            )
                        )
                }
            },


            kpis: {

                total_predictions:
                    rows.length,

                active_users:
                    activeUsers,

                accuracy_rate:
                    Number(
                        averageConfidence
                            .toFixed(
                                2
                            )
                    ),

                todays_scans:
                    rows.filter(
                        row =>
                            phDate(
                                row.created_at
                            ) ===
                            phDate()
                    )
                        .length
            },


            charts: {

                disease:
                    diseaseChart,

                health:
                    healthChart,

                trend:
                    trendChart,

                confidence:
                    confidenceChart
            },


            top_locations:
                topLocations,


            recent_predictions:
                recentPredictions,


            generated_at:
                new Date()
                    .toISOString()
        });


    } catch (error) {

        console.error(
            'Admin dashboard:',
            error
        );


        return res
            .status(500)
            .json({

                success:
                    false,

                message:
                    'Unexpected server error.',

                error:
                    error.message
            });
    }
};


/* =========================================
   ADMIN PREDICTIONS
========================================= */

exports.getPredictions =
async (
    req,
    res
) => {

    try {

        const disease =
            clean(
                req.query.disease
            );


        const confidenceRange =
            clean(
                req.query.confidence
            );


        const dateRange =
            clean(
                req.query.date
            );


        const province =
            clean(
                req.query.province
            );


        const municipality =
            clean(
                req.query.municipality
            );


        const barangay =
            clean(
                req.query.barangay
            );


        const search =
            clean(
                req.query.search
            )
                .toLowerCase();


        // =====================================
        // LOAD PREDICTIONS
        // =====================================

        const {
            data: predictions,
            error: predictionError
        } =
            await supabaseAdmin
                .from(
                    'predictions'
                )
                .select('*')
                .order(
                    'created_at',
                    {
                        ascending:
                            false
                    }
                );


        if (predictionError) {

            return res
                .status(500)
                .json({

                    success:
                        false,

                    message:
                        'Unable to load predictions.',

                    error:
                        predictionError.message
                });
        }


        // =====================================
        // LOAD USERS
        // =====================================

        const {
            data: users,
            error: userError
        } =
            await supabaseAdmin
                .from(
                    'users'
                )
                .select(`
                    id,
                    first_name,
                    middle_name,
                    last_name,
                    suffix,
                    email
                `);


        if (userError) {
            console.error(
                'Admin prediction users:',
                userError
            );
        }


        const safePredictions =
            Array.isArray(
                predictions
            )
                ? predictions
                : [];


        const safeUsers =
            Array.isArray(
                users
            )
                ? users
                : [];


        const userMap =
            new Map(
                safeUsers.map(
                    user => [
                        String(
                            user.id
                        ),
                        user
                    ]
                )
            );


        // =====================================
        // CASCADING LOCATION FILTERS
        // =====================================

        const provinceRows =
            province
                ? safePredictions
                    .filter(
                        row =>
                            clean(
                                row.province
                            )
                                .toLowerCase() ===
                            province
                                .toLowerCase()
                    )
                : safePredictions;


        const municipalityRows =
            municipality
                ? provinceRows
                    .filter(
                        row =>
                            clean(
                                row.municipality
                            )
                                .toLowerCase() ===
                            municipality
                                .toLowerCase()
                    )
                : provinceRows;


        const barangayRows =
            barangay
                ? municipalityRows
                    .filter(
                        row =>
                            clean(
                                row.barangay
                            )
                                .toLowerCase() ===
                            barangay
                                .toLowerCase()
                    )
                : municipalityRows;


        // =====================================
        // FILTER RECORDS
        // =====================================

        const filtered =
            barangayRows.filter(
                row => {

                    const conf =
                        normalizeConfidence(
                            row.confidence
                        );


                    if (
                        disease &&
                        clean(
                            row.predicted_disease
                        ) !==
                        disease
                    ) {
                        return false;
                    }


                    if (
                        confidenceRange ===
                        '90-100' &&
                        conf <
                        90
                    ) {
                        return false;
                    }


                    if (
                        confidenceRange ===
                        '80-89' &&
                        (
                            conf <
                            80 ||
                            conf >=
                            90
                        )
                    ) {
                        return false;
                    }


                    if (
                        confidenceRange ===
                        '70-79' &&
                        (
                            conf <
                            70 ||
                            conf >=
                            80
                        )
                    ) {
                        return false;
                    }


                    if (
                        confidenceRange ===
                        'below-70' &&
                        conf >=
                        70
                    ) {
                        return false;
                    }


                    if (
                        !datePasses(
                            row.created_at,
                            dateRange
                        )
                    ) {
                        return false;
                    }


                    if (search) {

                        const user =
                            userMap.get(
                                String(
                                    row.user_id ||
                                    ''
                                )
                            );


                        const haystack =
                            [
                                prettyDisease(
                                    row.predicted_disease
                                ),

                                row.province,

                                row.municipality,

                                row.barangay,

                                user?.first_name,

                                user?.middle_name,

                                user?.last_name,

                                user?.suffix,

                                user?.email
                            ]
                                .map(clean)
                                .join(' ')
                                .toLowerCase();


                        if (
                            !haystack.includes(
                                search
                            )
                        ) {
                            return false;
                        }
                    }


                    return true;
                }
            );


        // =====================================
        // MAP RESPONSE RECORDS
        // =====================================

        const rows =
            filtered.map(
                row => {

                    const user =
                        userMap.get(
                            String(
                                row.user_id ||
                                ''
                            )
                        );


                    return {

                        id:
                            row.id,

                        disease:
                            prettyDisease(
                                row.predicted_disease
                            ),

                        disease_key:
                            clean(
                                row.predicted_disease
                            ),

                        confidence:
                            Number(
                                normalizeConfidence(
                                    row.confidence
                                )
                                    .toFixed(
                                        2
                                    )
                            ),

                        image_url:
                            clean(
                                row.image_url
                            ),

                        province:
                            clean(
                                row.province
                            ),

                        municipality:
                            clean(
                                row.municipality
                            ),

                        barangay:
                            clean(
                                row.barangay
                            ),

                        created_at:
                            row.created_at,

                        user: {

                            id:
                                user?.id ||
                                null,

                            name:
                                fullName(
                                    user
                                ),

                            email:
                                clean(
                                    user?.email
                                )
                        }
                    };
                }
            );


        // =====================================
        // STATS
        // =====================================

        const confs =
            rows.map(
                row =>
                    row.confidence
            );


        const average =
            confs.length
                ? confs.reduce(
                    (
                        total,
                        value
                    ) =>
                        total +
                        value,
                    0
                ) /
                confs.length
                : 0;


        const healthy =
            rows.filter(
                row =>
                    row.disease_key ===
                    'healthy_rice_plant'
            )
                .length;


        // =====================================
        // DISEASE OPTIONS
        // =====================================

        const diseases =
            [
                ...new Set(
                    safePredictions
                        .map(
                            row =>
                                clean(
                                    row.predicted_disease
                                )
                        )
                        .filter(Boolean)
                )
            ]
                .sort()
                .map(
                    value => ({
                        value:
                            value,

                        label:
                            prettyDisease(
                                value
                            )
                    })
                );


        // =====================================
        // RESPONSE
        // =====================================

        return res.json({

            success:
                true,


            stats: {

                total:
                    rows.length,

                average_confidence:
                    Number(
                        average
                            .toFixed(
                                2
                            )
                    ),

                healthy:
                    healthy,

                diseased:
                    rows.length -
                    healthy,

                today:
                    rows.filter(
                        row =>
                            phDate(
                                row.created_at
                            ) ===
                            phDate()
                    )
                        .length
            },


            filters: {

                selected: {

                    disease:
                        disease,

                    confidence:
                        confidenceRange,

                    date:
                        dateRange,

                    province:
                        province,

                    municipality:
                        municipality,

                    barangay:
                        barangay,

                    search:
                        clean(
                            req.query.search
                        )
                },


                options: {

                    diseases:
                        diseases,

                    provinces:
                        unique(
                            safePredictions.map(
                                row =>
                                    row.province
                            )
                        ),

                    municipalities:
                        unique(
                            provinceRows.map(
                                row =>
                                    row.municipality
                            )
                        ),

                    barangays:
                        unique(
                            municipalityRows.map(
                                row =>
                                    row.barangay
                            )
                        )
                }
            },


            predictions:
                rows,


            generated_at:
                new Date()
                    .toISOString()
        });


    } catch (error) {

        console.error(
            'Admin predictions:',
            error
        );


        return res
            .status(500)
            .json({

                success:
                    false,

                message:
                    'Unexpected server error.',

                error:
                    error.message
            });
    }
};