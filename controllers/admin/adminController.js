const { supabaseAdmin } = require('../../config/supabase');

const PRETTY = {
    bacterial_leaf_blight: 'Bacterial Leaf Blight',
    brown_spot: 'Brown Spot',
    healthy_rice_plant: 'Healthy Rice Plant',
    leaf_blast: 'Leaf Blast',
    sheath_blight: 'Sheath Blight',
    tungro_virus: 'Tungro Virus'
};

const clean = value => String(value ?? '').trim();
const same = (a, b) => clean(a).toLowerCase() === clean(b).toLowerCase();

function prettyDisease(value) {
    const key = clean(value).toLowerCase();
    return PRETTY[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function confidence(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return number >= 0 && number <= 1 ? number * 100 : number;
}

function unique(values) {
    return [...new Set(values.map(clean).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function phDate(value = new Date()) {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';

    const p = Object.fromEntries(
        new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Manila',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).formatToParts(d).map(x => [x.type, x.value])
    );

    return `${p.year}-${p.month}-${p.day}`;
}

function diseaseChart(rows) {
    const counts = {};
    rows.forEach(row => {
        const label = prettyDisease(row.predicted_disease);
        counts[label] = (counts[label] || 0) + 1;
    });

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return {
        labels: entries.map(x => x[0]),
        values: entries.map(x => x[1])
    };
}

function healthChart(rows) {
    let healthy = 0;
    let diseased = 0;

    rows.forEach(row => {
        if (clean(row.predicted_disease).toLowerCase() === 'healthy_rice_plant') {
            healthy += 1;
        } else {
            diseased += 1;
        }
    });

    return { labels: ['Healthy', 'Diseased'], values: [healthy, diseased] };
}

function confidenceChart(rows) {
    const bands = { '90–100%': 0, '80–89%': 0, '70–79%': 0, 'Below 70%': 0 };

    rows.forEach(row => {
        const value = confidence(row.confidence);
        if (value === null) return;

        if (value >= 90) bands['90–100%']++;
        else if (value >= 80) bands['80–89%']++;
        else if (value >= 70) bands['70–79%']++;
        else bands['Below 70%']++;
    });

    return { labels: Object.keys(bands), values: Object.values(bands) };
}

function trendChart(rows) {
    const labels = [];
    const keys = [];
    const today = new Date();

    for (let i = 13; i >= 0; i--) {
        const d = new Date(today.getTime() - i * 86400000);
        keys.push(phDate(d));
        labels.push(
            new Intl.DateTimeFormat('en-PH', {
                timeZone: 'Asia/Manila',
                month: 'short',
                day: 'numeric'
            }).format(d)
        );
    }

    const counts = Object.fromEntries(keys.map(key => [key, 0]));

    rows.forEach(row => {
        const key = phDate(row.created_at);
        if (Object.prototype.hasOwnProperty.call(counts, key)) counts[key]++;
    });

    return { labels, values: keys.map(key => counts[key]) };
}

function topLocations(rows) {
    const counts = {};

    rows.forEach(row => {
        const label = [row.barangay, row.municipality, row.province]
            .map(clean)
            .filter(Boolean)
            .join(', ') || 'Unspecified Location';

        counts[label] = (counts[label] || 0) + 1;
    });

    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([label, count]) => ({ label, count }));
}

exports.getDashboard = async (req, res) => {
    try {
        const province = clean(req.query.province);
        const municipality = clean(req.query.municipality);
        const barangay = clean(req.query.barangay);

        const { data: predictions, error: predictionError } =
            await supabaseAdmin.from('predictions').select('*').order('created_at', { ascending: false });

        if (predictionError) {
            return res.status(500).json({
                success: false,
                message: 'Unable to load prediction data.',
                error: predictionError.message
            });
        }

        const allRows = predictions || [];

        const provinceRows = province
            ? allRows.filter(row => same(row.province, province))
            : allRows;

        const municipalityRows = municipality
            ? provinceRows.filter(row => same(row.municipality, municipality))
            : provinceRows;

        const rows = barangay
            ? municipalityRows.filter(row => same(row.barangay, barangay))
            : municipalityRows;

        const { data: users, error: userError } =
            await supabaseAdmin.from('users').select('id, first_name, last_name, email, role, is_active');

        if (userError) console.error('Admin users:', userError);

        const safeUsers = users || [];
        const userMap = new Map(safeUsers.map(user => [String(user.id), user]));

        const activeNormalUsers = safeUsers.filter(
            user => user.is_active === true && clean(user.role).toLowerCase() !== 'admin'
        );

        let activeUsers = activeNormalUsers.length;

        if (province || municipality || barangay) {
            const scopedIds = new Set(rows.map(row => String(row.user_id || '')).filter(Boolean));
            activeUsers = activeNormalUsers.filter(user => scopedIds.has(String(user.id))).length;
        }

        const confidenceValues = rows
            .map(row => confidence(row.confidence))
            .filter(value => value !== null);

        const averageConfidence = confidenceValues.length
            ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
            : 0;

        const health = healthChart(rows);

        const recent = rows.slice(0, 10).map(row => {
            const user = userMap.get(String(row.user_id || ''));

            return {
                id: row.id,
                user: user
                    ? [user.first_name, user.last_name].map(clean).filter(Boolean).join(' ') || clean(user.email)
                    : 'Unknown User',
                disease: prettyDisease(row.predicted_disease),
                confidence: confidence(row.confidence),
                province: clean(row.province),
                municipality: clean(row.municipality),
                barangay: clean(row.barangay),
                created_at: row.created_at
            };
        });

        return res.json({
            success: true,

            filters: {
                selected: { province, municipality, barangay },
                options: {
                    provinces: unique(allRows.map(row => row.province)),
                    municipalities: unique(provinceRows.map(row => row.municipality)),
                    barangays: unique(municipalityRows.map(row => row.barangay))
                }
            },

            kpis: {
                total_predictions: rows.length,
                active_users: activeUsers,
                accuracy_rate: Number(averageConfidence.toFixed(2)),
                todays_scans: rows.filter(row => phDate(row.created_at) === phDate()).length
            },

            charts: {
                disease: diseaseChart(rows),
                health,
                trend: trendChart(rows),
                confidence: confidenceChart(rows)
            },

            top_locations: topLocations(rows),
            recent_predictions: recent,
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Admin dashboard:', error);

        return res.status(500).json({
            success: false,
            message: 'Unexpected server error.',
            error: error.message
        });
    }
};
