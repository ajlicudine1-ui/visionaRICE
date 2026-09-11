const { supabaseAdmin } =
    require('../../config/supabase');


const clean =
    value =>
        String(
            value ??
            ''
        ).trim();


function prettyDisease(value = '') {
    return clean(value)
        .toLowerCase()
        .replace(
            /_/g,
            ' '
        )
        .replace(
            /\b\w/g,
            char =>
                char.toUpperCase()
        );
}


function confidence(value) {
    const numeric =
        Number(value);

    if (
        !Number.isFinite(
            numeric
        )
    ) {
        return 0;
    }

    return (
        numeric >= 0 &&
        numeric <= 1
    )
        ? numeric * 100
        : numeric;
}


function phDate(
    value = new Date()
) {
    const date =
        value instanceof Date
            ? value
            : new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return '';
    }


    const parts =
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
                .formatToParts(
                    date
                )
                .map(
                    part => [
                        part.type,
                        part.value
                    ]
                )
        );


    return (
        `${parts.year}-` +
        `${parts.month}-` +
        `${parts.day}`
    );
}


function fullName(
    user = {}
) {
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


function getDiseaseValue(row = {}) {
    return (
        row.predicted_disease ||
        row.disease ||
        row.disease_name ||
        row.prediction ||
        row.result ||
        row.class_name ||
        'Unknown'
    );
}


function getProvince(row = {}) {
    return clean(
        row.province ||
        row.province_name ||
        ''
    );
}


function getMunicipality(row = {}) {
    return clean(
        row.municipality ||
        row.city ||
        row.municipality_city ||
        row.city_municipality ||
        row.municipality_name ||
        ''
    );
}


function getBarangay(row = {}) {
    return clean(
        row.barangay ||
        row.barangay_name ||
        ''
    );
}


exports.getNotifications =
async (
    req,
    res
) => {

    try {

        const type =
            clean(
                req.query.type
            )
                .toLowerCase();


        const date =
            clean(
                req.query.date
            )
                .toLowerCase();


        const search =
            clean(
                req.query.search
            )
                .toLowerCase();


        // =========================================
        // USERS
        // =========================================

        const {
            data: users,
            error: userError
        } =
            await supabaseAdmin
                .from(
                    'users'
                )
                .select('*')
                .order(
                    'created_at',
                    {
                        ascending:
                            false
                    }
                );


        if (userError) {

            console.error(
                'Admin notifications users query:',
                userError
            );

            return res
                .status(500)
                .json({
                    success:
                        false,

                    message:
                        'Unable to load users.',

                    error:
                        userError.message
                });
        }


        // =========================================
        // PREDICTIONS
        // Use select('*') so this does not fail
        // because of one mismatched column name.
        // =========================================

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

            console.error(
                'Admin notifications prediction query:',
                predictionError
            );

            return res
                .status(500)
                .json({
                    success:
                        false,

                    message:
                        'Unable to load prediction activity.',

                    error:
                        predictionError.message
                });
        }


        const safeUsers =
            Array.isArray(
                users
            )
                ? users
                : [];


        const safePredictions =
            Array.isArray(
                predictions
            )
                ? predictions
                : [];


        // =========================================
        // USER LOOKUP
        // =========================================

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


        // =========================================
        // PREDICTION EVENTS
        // =========================================

        const predictionEvents =
            safePredictions.map(
                row => {

                    const user =
                        userMap.get(
                            String(
                                row.user_id ||
                                row.userId ||
                                ''
                            )
                        ) ||
                        {};


                    const diseaseRaw =
                        getDiseaseValue(
                            row
                        );


                    const diseaseKey =
                        clean(
                            diseaseRaw
                        )
                            .toLowerCase();


                    const isHealthy =
                        diseaseKey ===
                        'healthy_rice_plant' ||

                        diseaseKey ===
                        'healthy rice plant' ||

                        diseaseKey ===
                        'healthy';


                    const province =
                        getProvince(
                            row
                        );


                    const municipality =
                        getMunicipality(
                            row
                        );


                    const barangay =
                        getBarangay(
                            row
                        );


                    const location =
                        [
                            barangay,
                            municipality,
                            province
                        ]
                            .filter(Boolean)
                            .join(', ');


                    const confidenceValue =
                        Number(
                            confidence(
                                row.confidence ||
                                row.confidence_score ||
                                row.score ||
                                0
                            )
                                .toFixed(
                                    2
                                )
                        );


                    return {

                        id:
                            `prediction-${row.id}`,

                        type:
                            isHealthy
                                ? 'scan'
                                : 'disease',

                        title:
                            isHealthy
                                ? 'Healthy rice scan recorded'
                                : `${prettyDisease(
                                    diseaseRaw
                                )} detected`,

                        message:
                            `${fullName(
                                user
                            )} submitted a rice scan${
                                location
                                    ? ` from ${location}`
                                    : ''
                            } with ${confidenceValue.toFixed(
                                2
                            )}% confidence.`,

                        user_name:
                            fullName(
                                user
                            ),

                        user_email:
                            clean(
                                user.email
                            ),

                        disease:
                            prettyDisease(
                                diseaseRaw
                            ),

                        confidence:
                            confidenceValue,

                        location:
                            location,

                        created_at:
                            row.created_at ||
                            row.createdAt ||
                            null
                    };
                }
            );


        // =========================================
        // USER REGISTRATION EVENTS
        // =========================================

        const registrationEvents =
            safeUsers
                .filter(
                    user =>
                        clean(
                            user.role
                        )
                            .toLowerCase() !==
                        'admin'
                )
                .map(
                    user => ({

                        id:
                            `user-${user.id}`,

                        type:
                            'user',

                        title:
                            'New user registered',

                        message:
                            `${fullName(
                                user
                            )} joined VISIONARICE${
                                user.email_verified ===
                                true
                                    ? ' and has a verified email.'
                                    : '.'
                            }`,

                        user_name:
                            fullName(
                                user
                            ),

                        user_email:
                            clean(
                                user.email
                            ),

                        disease:
                            '',

                        confidence:
                            null,

                        location:
                            '',

                        created_at:
                            user.created_at ||
                            user.createdAt ||
                            null
                    })
                );


        // =========================================
        // COMBINE + FILTER
        // =========================================

        const allEvents =
            [
                ...predictionEvents,
                ...registrationEvents
            ]
                .filter(
                    item => {

                        // -------------------------
                        // TYPE
                        // -------------------------

                        if (
                            type &&
                            type !==
                            'all' &&
                            item.type !==
                            type
                        ) {
                            return false;
                        }


                        const itemDate =
                            phDate(
                                item.created_at
                            );


                        const today =
                            phDate();


                        // -------------------------
                        // TODAY
                        // -------------------------

                        if (
                            date ===
                            'today'
                        ) {
                            if (
                                itemDate !==
                                today
                            ) {
                                return false;
                            }
                        }


                        // -------------------------
                        // LAST 7 DAYS
                        // -------------------------

                        if (
                            date ===
                            '7days'
                        ) {

                            const created =
                                new Date(
                                    item.created_at
                                ).getTime();


                            const start =
                                Date.now() -
                                (
                                    7 *
                                    86400000
                                );


                            if (
                                !Number.isFinite(
                                    created
                                ) ||
                                created <
                                start
                            ) {
                                return false;
                            }
                        }


                        // -------------------------
                        // LAST 30 DAYS
                        // -------------------------

                        if (
                            date ===
                            '30days'
                        ) {

                            const created =
                                new Date(
                                    item.created_at
                                ).getTime();


                            const start =
                                Date.now() -
                                (
                                    30 *
                                    86400000
                                );


                            if (
                                !Number.isFinite(
                                    created
                                ) ||
                                created <
                                start
                            ) {
                                return false;
                            }
                        }


                        // -------------------------
                        // SEARCH
                        // -------------------------

                        if (search) {

                            const searchable =
                                [
                                    item.title,
                                    item.message,
                                    item.user_name,
                                    item.user_email,
                                    item.disease,
                                    item.location
                                ]
                                    .join(' ')
                                    .toLowerCase();


                            if (
                                !searchable.includes(
                                    search
                                )
                            ) {
                                return false;
                            }
                        }


                        return true;
                    }
                )
                .sort(
                    (
                        a,
                        b
                    ) =>

                        new Date(
                            b.created_at ||
                            0
                        ).getTime() -

                        new Date(
                            a.created_at ||
                            0
                        ).getTime()
                );


        // =========================================
        // STATISTICS
        // =========================================

        const today =
            phDate();


        const combinedEvents =
            [
                ...predictionEvents,
                ...registrationEvents
            ];


        const stats = {

            total_activity:
                combinedEvents.length,

            today:
                combinedEvents
                    .filter(
                        item =>
                            phDate(
                                item.created_at
                            ) ===
                            today
                    )
                    .length,

            disease_alerts:
                predictionEvents
                    .filter(
                        item =>
                            item.type ===
                            'disease'
                    )
                    .length,

            new_users:
                registrationEvents.length
        };


        // =========================================
        // RESPONSE
        // =========================================

        return res.json({

            success:
                true,

            stats:
                stats,

            notifications:
                allEvents.slice(
                    0,
                    250
                ),

            generated_at:
                new Date()
                    .toISOString()
        });


    } catch (error) {

        console.error(
            'Admin general notifications:',
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