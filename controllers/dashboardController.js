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

function normalizeDiseaseName(value) {
    return String(value || '')
        .trim()
        .replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .replace(/\s+/g, ' ')
        .toLowerCase();
}

function prettyDiseaseName(value) {
    const normalized = normalizeDiseaseName(value);

    const aliases = {
        'bacterial leaf blight': 'Bacterial Leaf Blight',
        'brown spot': 'Brown Spot',
        'healthy rice plant': 'Healthy Rice Plant',
        'leaf blast': 'Leaf Blast',
        'random leaf': 'Random Leaf',
        'random object': 'Random Object'
    };

    return aliases[normalized] || normalized
        .split(' ')
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function manilaDateKey(dateValue) {
    const date = new Date(dateValue);

    const parts = new Intl.DateTimeFormat(
        'en-CA',
        {
            timeZone: 'Asia/Manila',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }
    ).formatToParts(date);

    const values = {};

    for (const part of parts) {
        if (part.type !== 'literal') {
            values[part.type] = part.value;
        }
    }

    return `${values.year}-${values.month}-${values.day}`;
}

function manilaDateLabel(dateValue) {
    return new Intl.DateTimeFormat(
        'en-US',
        {
            timeZone: 'Asia/Manila',
            month: 'short',
            day: '2-digit'
        }
    ).format(new Date(dateValue));
}

function buildLocationLabel(row) {
    const municipality = String(row.municipality || '').trim();
    const province = String(row.province || '').trim();

    if (municipality && province) {
        return `${municipality}, ${province}`;
    }

    if (municipality) {
        return municipality;
    }

    if (province) {
        return province;
    }

    if (row.latitude != null && row.longitude != null) {
        return `${row.latitude}, ${row.longitude}`;
    }

    return '';
}

// =====================================================
// GET /api/dashboard/summary
// =====================================================

async function getDashboardSummary(req, res) {
    try {
        const userId = getSessionUserId(req);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated.'
            });
        }

        const { data: predictions, error } = await supabaseAdmin
            .from('predictions')
            .select(`
                id,
                user_id,
                disease_id,
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
            .eq('user_id', userId)
            .eq('status', 'completed')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Dashboard query error:', error);

            return res.status(500).json({
                success: false,
                message: 'Unable to load dashboard data.',
                error: error.message
            });
        }

        const rows = Array.isArray(predictions)
            ? predictions
            : [];

        // Ignore validation/rejection classes if they somehow exist in the table.
        const validRows = rows.filter(row => {
            const normalized = normalizeDiseaseName(row.predicted_disease);

            return ![
                'random leaf',
                'random object',
                'not a rice leaf',
                'invalid leaf',
                'unknown'
            ].includes(normalized);
        });

        // =================================================
        // KPI
        // =================================================

        const totalScans = validRows.length;

        const confidenceValues = validRows
            .map(row => Number(row.confidence))
            .filter(value => Number.isFinite(value));

        const averageConfidence = confidenceValues.length
            ? confidenceValues.reduce((sum, value) => sum + value, 0) /
              confidenceValues.length
            : 0;

        const todayKey = manilaDateKey(new Date());

        const scansToday = validRows.filter(
            row => manilaDateKey(row.created_at) === todayKey
        ).length;

        // =================================================
        // DISEASE COUNTS
        // =================================================

        const diseaseCountsMap = new Map();

        for (const row of validRows) {
            const displayName = prettyDiseaseName(row.predicted_disease);

            diseaseCountsMap.set(
                displayName,
                (diseaseCountsMap.get(displayName) || 0) + 1
            );
        }

        const diseaseEntries = [...diseaseCountsMap.entries()]
            .sort((a, b) => {
                if (b[1] !== a[1]) {
                    return b[1] - a[1];
                }

                return a[0].localeCompare(b[0]);
            });

        const mostDetected = diseaseEntries.length
            ? diseaseEntries[0][0]
            : null;

        // =================================================
        // HEALTHY VS DISEASED
        // =================================================

        let healthyCount = 0;
        let diseasedCount = 0;

        for (const row of validRows) {
            if (
                normalizeDiseaseName(row.predicted_disease) ===
                'healthy rice plant'
            ) {
                healthyCount += 1;
            } else {
                diseasedCount += 1;
            }
        }

        // =================================================
        // 14-DAY TREND
        // =================================================

        const trendMap = new Map();

        for (let daysAgo = 13; daysAgo >= 0; daysAgo -= 1) {
            const date = new Date(
                Date.now() - (daysAgo * 24 * 60 * 60 * 1000)
            );

            trendMap.set(
                manilaDateKey(date),
                {
                    label: manilaDateLabel(date),
                    count: 0
                }
            );
        }

        for (const row of validRows) {
            const key = manilaDateKey(row.created_at);

            if (trendMap.has(key)) {
                trendMap.get(key).count += 1;
            }
        }

        const trendValues = [...trendMap.values()];

        // =================================================
        // CONFIDENCE RANGES
        // =================================================

        const confidenceLabels = [
            'Below 60%',
            '60–74%',
            '75–89%',
            '90–100%'
        ];

        const confidenceCounts = [0, 0, 0, 0];

        for (const value of confidenceValues) {
            if (value < 60) {
                confidenceCounts[0] += 1;
            } else if (value < 75) {
                confidenceCounts[1] += 1;
            } else if (value < 90) {
                confidenceCounts[2] += 1;
            } else {
                confidenceCounts[3] += 1;
            }
        }

        // =================================================
        // TOP LOCATIONS
        // =================================================

        const locationCounts = new Map();

        for (const row of validRows) {
            const location = buildLocationLabel(row);

            if (!location) {
                continue;
            }

            locationCounts.set(
                location,
                (locationCounts.get(location) || 0) + 1
            );
        }

        const locations = [...locationCounts.entries()]
            .sort((a, b) => {
                if (b[1] !== a[1]) {
                    return b[1] - a[1];
                }

                return a[0].localeCompare(b[0]);
            })
            .slice(0, 6)
            .map(([location, count]) => ({
                location,
                count
            }));

        // =================================================
        // RECENT PREDICTIONS
        // =================================================

        const recent = validRows
            .slice(0, 6)
            .map(row => ({
                id: row.id,
                disease: prettyDiseaseName(row.predicted_disease),
                confidence: Number(row.confidence || 0),
                location: buildLocationLabel(row),
                municipality: row.municipality,
                province: row.province,
                latitude: row.latitude,
                longitude: row.longitude,
                image_url: row.image_url,
                created_at: row.created_at
            }));

        // =================================================
        // RESPONSE
        // =================================================

        return res.json({
            success: true,

            totalScans,
            averageConfidence: Number(averageConfidence.toFixed(2)),
            scansToday,
            mostDetected,

            disease: {
                labels: diseaseEntries.map(([name]) => name),
                counts: diseaseEntries.map(([, count]) => count)
            },

            health: {
                healthy: healthyCount,
                diseased: diseasedCount
            },

            trend: {
                labels: trendValues.map(item => item.label),
                counts: trendValues.map(item => item.count)
            },

            confidence: {
                labels: confidenceLabels,
                counts: confidenceCounts
            },

            locations,
            recent
        });

    } catch (error) {
        console.error('Unexpected dashboard error:', error);

        return res.status(500).json({
            success: false,
            message: 'Unexpected dashboard server error.',
            error: error.message
        });
    }
}

module.exports = {
    getDashboardSummary
};
