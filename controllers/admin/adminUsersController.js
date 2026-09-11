const { supabaseAdmin } = require('../../config/supabase');

const clean = value =>
    String(value ?? '').trim();

function prettyDisease(value = '') {
    return clean(value)
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

function confidence(value) {
    const n = Number(value);

    if (!Number.isFinite(n)) {
        return 0;
    }

    return n >= 0 && n <= 1
        ? n * 100
        : n;
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
                .map(item => [
                    item.type,
                    item.value
                ])
        );

    return `${parts.year}-${parts.month}-${parts.day}`;
}

function buildTrend(rows) {
    const labels = [];
    const keys = [];
    const today = new Date();

    for (
        let offset = 13;
        offset >= 0;
        offset -= 1
    ) {
        const date =
            new Date(
                today.getTime() -
                offset * 86400000
            );

        keys.push(
            phDate(date)
        );

        labels.push(
            new Intl.DateTimeFormat(
                'en-PH',
                {
                    timeZone: 'Asia/Manila',
                    month: 'short',
                    day: 'numeric'
                }
            ).format(date)
        );
    }

    const counts =
        Object.fromEntries(
            keys.map(
                key => [
                    key,
                    0
                ]
            )
        );

    rows.forEach(row => {
        const key =
            phDate(
                row.created_at
            );

        if (
            Object.prototype.hasOwnProperty.call(
                counts,
                key
            )
        ) {
            counts[key] += 1;
        }
    });

    return {
        labels,
        values:
            keys.map(
                key => counts[key]
            )
    };
}


exports.getUsers = async (
    req,
    res
) => {
    try {
        const search =
            clean(
                req.query.search
            ).toLowerCase();

        const status =
            clean(
                req.query.status
            ).toLowerCase();

        const role =
            clean(
                req.query.role
            ).toLowerCase();

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
                    phone_number,
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
                message:
                    'Unable to load users.',
                error:
                    userError.message
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
                    created_at
                `);

        if (predictionError) {
            console.error(
                'Admin users predictions:',
                predictionError
            );
        }

        const safeUsers =
            Array.isArray(users)
                ? users
                : [];

        const safePredictions =
            Array.isArray(predictions)
                ? predictions
                : [];

        const predictionCounts =
            new Map();

        safePredictions.forEach(
            row => {
                const key =
                    String(
                        row.user_id || ''
                    );

                predictionCounts.set(
                    key,
                    (
                        predictionCounts.get(
                            key
                        ) ||
                        0
                    ) + 1
                );
            }
        );

        const mapped =
            safeUsers
                .map(user => {
                    const fullName =
                        [
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
                            .join(' ');

                    return {
                        id:
                            user.id,

                        name:
                            fullName ||
                            clean(
                                user.email
                            ) ||
                            'Unnamed User',

                        email:
                            clean(
                                user.email
                            ),

                        phone_number:
                            clean(
                                user.phone_number
                            ),

                        role:
                            clean(
                                user.role
                            ) ||
                            'user',

                        is_active:
                            user.is_active ===
                            true,

                        email_verified:
                            user.email_verified ===
                            true,

                        created_at:
                            user.created_at,

                        prediction_count:
                            predictionCounts.get(
                                String(
                                    user.id
                                )
                            ) ||
                            0
                    };
                })
                .filter(user => {
                    if (
                        status ===
                        'active' &&
                        !user.is_active
                    ) {
                        return false;
                    }

                    if (
                        status ===
                        'inactive' &&
                        user.is_active
                    ) {
                        return false;
                    }

                    if (
                        role &&
                        user.role.toLowerCase() !==
                        role
                    ) {
                        return false;
                    }

                    if (search) {
                        const searchable =
                            [
                                user.name,
                                user.email,
                                user.phone_number
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
                });

        const normalUsers =
            safeUsers.filter(
                user =>
                    clean(
                        user.role
                    ).toLowerCase() !==
                    'admin'
            );

        return res.json({
            success: true,

            stats: {
                total_users:
                    normalUsers.length,

                active_users:
                    normalUsers.filter(
                        user =>
                            user.is_active ===
                            true
                    ).length,

                inactive_users:
                    normalUsers.filter(
                        user =>
                            user.is_active !==
                            true
                    ).length,

                verified_users:
                    normalUsers.filter(
                        user =>
                            user.email_verified ===
                            true
                    ).length
            },

            users:
                mapped,

            generated_at:
                new Date().toISOString()
        });

    } catch (error) {
        console.error(
            'Admin users:',
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


exports.updateUserStatus = async (
    req,
    res
) => {
    try {
        const userId =
            clean(
                req.params.id
            );

        const isActive =
            req.body.is_active;

        if (
            typeof isActive !==
            'boolean'
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'is_active must be true or false.'
            });
        }

        if (
            String(
                req.session.user.id
            ) ===
            String(
                userId
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'You cannot deactivate your own administrator account.'
            });
        }

        const {
            data: target,
            error: targetError
        } =
            await supabaseAdmin
                .from('users')
                .select(`
                    id,
                    role
                `)
                .eq(
                    'id',
                    userId
                )
                .maybeSingle();

        if (
            targetError ||
            !target
        ) {
            return res.status(404).json({
                success: false,
                message:
                    'User not found.'
            });
        }

        if (
            clean(
                target.role
            ).toLowerCase() ===
            'admin'
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'Administrator accounts cannot be changed from this page.'
            });
        }

        const {
            error: updateError
        } =
            await supabaseAdmin
                .from('users')
                .update({
                    is_active:
                        isActive,

                    updated_at:
                        new Date().toISOString()
                })
                .eq(
                    'id',
                    userId
                );

        if (updateError) {
            return res.status(500).json({
                success: false,
                message:
                    'Unable to update user status.',
                error:
                    updateError.message
            });
        }

        return res.json({
            success: true,
            message:
                isActive
                    ? 'User activated successfully.'
                    : 'User deactivated successfully.'
        });

    } catch (error) {
        console.error(
            'Admin user status:',
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


exports.getUserDashboard = async (
    req,
    res
) => {
    try {
        const userId =
            clean(
                req.params.id
            );

        const {
            data: user,
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
                    phone_number,
                    role,
                    is_active,
                    email_verified,
                    created_at
                `)
                .eq(
                    'id',
                    userId
                )
                .maybeSingle();

        if (
            userError ||
            !user
        ) {
            return res.status(404).json({
                success: false,
                message:
                    'User not found.'
            });
        }

        const {
            data: predictions,
            error: predictionError
        } =
            await supabaseAdmin
                .from('predictions')
                .select('*')
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

        if (predictionError) {
            return res.status(500).json({
                success: false,
                message:
                    'Unable to load user predictions.',
                error:
                    predictionError.message
            });
        }

        const rows =
            Array.isArray(predictions)
                ? predictions
                : [];

        const values =
            rows.map(
                row =>
                    confidence(
                        row.confidence
                    )
            );

        const averageConfidence =
            values.length
                ? values.reduce(
                    (sum, value) =>
                        sum + value,
                    0
                ) /
                values.length
                : 0;

        const healthy =
            rows.filter(
                row =>
                    clean(
                        row.predicted_disease
                    ).toLowerCase() ===
                    'healthy_rice_plant'
            ).length;

        const diseaseCounts =
            {};

        rows.forEach(row => {
            const label =
                prettyDisease(
                    row.predicted_disease
                );

            diseaseCounts[label] =
                (
                    diseaseCounts[label] ||
                    0
                ) + 1;
        });

        const diseaseEntries =
            Object.entries(
                diseaseCounts
            )
                .sort(
                    (a, b) =>
                        b[1] -
                        a[1]
                );

        const bands = {
            '90–100%': 0,
            '80–89%': 0,
            '70–79%': 0,
            'Below 70%': 0
        };

        values.forEach(value => {
            if (value >= 90) {
                bands['90–100%'] += 1;
            } else if (value >= 80) {
                bands['80–89%'] += 1;
            } else if (value >= 70) {
                bands['70–79%'] += 1;
            } else {
                bands['Below 70%'] += 1;
            }
        });

        const fullName =
            [
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
                .join(' ');

        return res.json({
            success: true,

            user: {
                id:
                    user.id,

                name:
                    fullName ||
                    clean(
                        user.email
                    ) ||
                    'Unnamed User',

                email:
                    clean(
                        user.email
                    ),

                phone_number:
                    clean(
                        user.phone_number
                    ),

                role:
                    clean(
                        user.role
                    ),

                is_active:
                    user.is_active ===
                    true,

                email_verified:
                    user.email_verified ===
                    true,

                created_at:
                    user.created_at
            },

            stats: {
                total_predictions:
                    rows.length,

                average_confidence:
                    Number(
                        averageConfidence.toFixed(
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
                    ).length
            },

            charts: {
                disease: {
                    labels:
                        diseaseEntries.map(
                            item =>
                                item[0]
                        ),

                    values:
                        diseaseEntries.map(
                            item =>
                                item[1]
                        )
                },

                confidence: {
                    labels:
                        Object.keys(
                            bands
                        ),

                    values:
                        Object.values(
                            bands
                        )
                },

                trend:
                    buildTrend(
                        rows
                    )
            },

            recent_predictions:
                rows
                    .slice(
                        0,
                        10
                    )
                    .map(
                        row => ({
                            id:
                                row.id,

                            disease:
                                prettyDisease(
                                    row.predicted_disease
                                ),

                            confidence:
                                Number(
                                    confidence(
                                        row.confidence
                                    ).toFixed(
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
                                row.created_at
                        })
                    ),

            generated_at:
                new Date().toISOString()
        });

    } catch (error) {
        console.error(
            'Admin selected user dashboard:',
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
