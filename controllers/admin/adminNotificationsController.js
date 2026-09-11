const { supabaseAdmin } = require('../../config/supabase');

const clean = value => String(value ?? '').trim();

function prettyDisease(value = '') {
    return clean(value)
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
}

function confidence(value) {
    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
        return 0;
    }

    return numeric >= 0 && numeric <= 1
        ? numeric * 100
        : numeric;
}

function phDate(value = new Date()) {
    const date =
        value instanceof Date
            ? value
            : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const parts =
        Object.fromEntries(
            new Intl.DateTimeFormat(
                'en-CA',
                {
                    timeZone: 'Asia/Manila',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }
            )
                .formatToParts(date)
                .map(part => [
                    part.type,
                    part.value
                ])
        );

    return `${parts.year}-${parts.month}-${parts.day}`;
}

function fullName(user = {}) {
    return [
        clean(user.first_name),
        clean(user.middle_name),
        clean(user.last_name),
        clean(user.suffix)
    ]
        .filter(Boolean)
        .join(' ') ||
        clean(user.email) ||
        'Unknown User';
}


exports.getNotifications = async (req, res) => {
    try {
        const type =
            clean(req.query.type)
                .toLowerCase();

        const date =
            clean(req.query.date)
                .toLowerCase();

        const search =
            clean(req.query.search)
                .toLowerCase();


        const {
            data: users,
            error: userError
        } =
            await supabaseAdmin
                .from('users')
                .select(`
                    id,
                    first_name,
                    middle_name,
                    last_name,
                    suffix,
                    email,
                    role,
                    is_active,
                    email_verified,
                    created_at
                `)
                .order(
                    'created_at',
                    {
                        ascending: false
                    }
                );


        if (userError) {
            return res.status(500).json({
                success: false,
                message: 'Unable to load users.',
                error: userError.message
            });
        }


        const {
            data: predictions,
            error: predictionError
        } =
            await supabaseAdmin
                .from('predictions')
                .select(`
                    id,
                    user_id,
                    predicted_disease,
                    confidence,
                    province,
                    municipality,
                    barangay,
                    created_at
                `)
                .order(
                    'created_at',
                    {
                        ascending: false
                    }
                );


        if (predictionError) {
            return res.status(500).json({
                success: false,
                message: 'Unable to load prediction activity.',
                error: predictionError.message
            });
        }


        const safeUsers =
            Array.isArray(users)
                ? users
                : [];

        const safePredictions =
            Array.isArray(predictions)
                ? predictions
                : [];


        const userMap =
            new Map(
                safeUsers.map(user => [
                    String(user.id),
                    user
                ])
            );


        const predictionEvents =
            safePredictions.map(row => {
                const user =
                    userMap.get(
                        String(row.user_id || '')
                    ) ||
                    {};

                const diseaseKey =
                    clean(row.predicted_disease)
                        .toLowerCase();

                const isHealthy =
                    diseaseKey ===
                    'healthy_rice_plant';

                const location =
                    [
                        clean(row.barangay),
                        clean(row.municipality),
                        clean(row.province)
                    ]
                        .filter(Boolean)
                        .join(', ');

                const confidenceValue =
                    Number(
                        confidence(
                            row.confidence
                        ).toFixed(2)
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
                                row.predicted_disease
                            )} detected`,

                    message:
                        `${fullName(user)} submitted a rice scan${
                            location
                                ? ` from ${location}`
                                : ''
                        } with ${confidenceValue.toFixed(2)}% confidence.`,

                    user_name:
                        fullName(user),

                    user_email:
                        clean(user.email),

                    disease:
                        prettyDisease(
                            row.predicted_disease
                        ),

                    confidence:
                        confidenceValue,

                    location:
                        location,

                    created_at:
                        row.created_at
                };
            });


        const registrationEvents =
            safeUsers
                .filter(user =>
                    clean(user.role)
                        .toLowerCase() !==
                    'admin'
                )
                .map(user => ({
                    id:
                        `user-${user.id}`,

                    type:
                        'user',

                    title:
                        'New user registered',

                    message:
                        `${fullName(user)} joined VISIONARICE${
                            user.email_verified === true
                                ? ' and has a verified email.'
                                : '.'
                        }`,

                    user_name:
                        fullName(user),

                    user_email:
                        clean(user.email),

                    disease:
                        '',

                    confidence:
                        null,

                    location:
                        '',

                    created_at:
                        user.created_at
                }));


        const allEvents =
            [
                ...predictionEvents,
                ...registrationEvents
            ]
                .filter(item => {
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

                    if (date === 'today') {
                        if (
                            itemDate !==
                            today
                        ) {
                            return false;
                        }
                    }


                    if (date === '7days') {
                        const created =
                            new Date(
                                item.created_at
                            ).getTime();

                        const start =
                            Date.now() -
                            7 *
                            86400000;

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


                    if (date === '30days') {
                        const created =
                            new Date(
                                item.created_at
                            ).getTime();

                        const start =
                            Date.now() -
                            30 *
                            86400000;

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
                })
                .sort(
                    (a, b) =>
                        new Date(
                            b.created_at
                        ).getTime() -
                        new Date(
                            a.created_at
                        ).getTime()
                );


        const today =
            phDate();


        const stats = {
            total_activity:
                predictionEvents.length +
                registrationEvents.length,

            today:
                [
                    ...predictionEvents,
                    ...registrationEvents
                ]
                    .filter(item =>
                        phDate(
                            item.created_at
                        ) ===
                        today
                    )
                    .length,

            disease_alerts:
                predictionEvents.filter(
                    item =>
                        item.type ===
                        'disease'
                ).length,

            new_users:
                registrationEvents.length
        };


        return res.json({
            success: true,
            stats,
            notifications:
                allEvents.slice(
                    0,
                    250
                ),
            generated_at:
                new Date().toISOString()
        });

    } catch (error) {
        console.error(
            'Admin general notifications:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Unexpected server error.',
            error:
                error.message
        });
    }
};
