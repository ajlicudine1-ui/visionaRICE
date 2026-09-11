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

function prettyDisease(value) {
    const key = clean(value).toLowerCase();
    return PRETTY[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function normalizeConfidence(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return n >= 0 && n <= 1 ? n * 100 : n;
}

function phDate(value = new Date()) {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(d).map(x => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}`;
}

function unique(values) {
    return [...new Set(values.map(clean).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function datePasses(createdAt, range) {
    if (!range) return true;
    const created = new Date(createdAt);
    if (Number.isNaN(created.getTime())) return false;
    if (range === 'today') return phDate(created) === phDate();
    const days = range === '7d' ? 7 : range === '30d' ? 30 : null;
    if (!days) return true;
    return created >= new Date(Date.now() - (days - 1) * 86400000);
}

exports.getDashboard = async (req, res) => {
    try {
        const { data: predictions, error } = await supabaseAdmin
            .from('predictions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) return res.status(500).json({ success: false, message: error.message });
        const rows = predictions || [];

        const { data: users } = await supabaseAdmin
            .from('users')
            .select('id, role, is_active');

        const values = rows.map(row => normalizeConfidence(row.confidence));
        const avg = values.length ? values.reduce((a,b) => a+b, 0) / values.length : 0;
        const healthy = rows.filter(row => clean(row.predicted_disease).toLowerCase() === 'healthy_rice_plant').length;

        return res.json({
            success: true,
            filters: {
                selected: { province: '', municipality: '', barangay: '' },
                options: {
                    provinces: unique(rows.map(r => r.province)),
                    municipalities: unique(rows.map(r => r.municipality)),
                    barangays: unique(rows.map(r => r.barangay))
                }
            },
            kpis: {
                total_predictions: rows.length,
                active_users: (users || []).filter(u => u.is_active === true && clean(u.role).toLowerCase() !== 'admin').length,
                accuracy_rate: Number(avg.toFixed(2)),
                todays_scans: rows.filter(r => phDate(r.created_at) === phDate()).length
            },
            charts: {
                disease: { labels: [], values: [] },
                health: { labels: ['Healthy','Diseased'], values: [healthy, rows.length - healthy] },
                trend: { labels: [], values: [] },
                confidence: { labels: ['90–100%','80–89%','70–79%','Below 70%'], values: [0,0,0,0] }
            },
            top_locations: [],
            recent_predictions: [],
            generated_at: new Date().toISOString()
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.getPredictions = async (req, res) => {
    try {
        const disease = clean(req.query.disease);
        const confidenceRange = clean(req.query.confidence);
        const dateRange = clean(req.query.date);
        const province = clean(req.query.province);
        const municipality = clean(req.query.municipality);
        const barangay = clean(req.query.barangay);
        const search = clean(req.query.search).toLowerCase();

        const { data: predictions, error: predictionError } = await supabaseAdmin
            .from('predictions')
            .select('*')
            .order('created_at', { ascending: false });

        if (predictionError) {
            return res.status(500).json({ success: false, message: 'Unable to load predictions.', error: predictionError.message });
        }

        const { data: users } = await supabaseAdmin
            .from('users')
            .select('id, first_name, last_name, email');

        const safePredictions = predictions || [];
        const safeUsers = users || [];
        const userMap = new Map(safeUsers.map(user => [String(user.id), user]));

        const provinceRows = province
            ? safePredictions.filter(r => clean(r.province).toLowerCase() === province.toLowerCase())
            : safePredictions;

        const municipalityRows = municipality
            ? provinceRows.filter(r => clean(r.municipality).toLowerCase() === municipality.toLowerCase())
            : provinceRows;

        const barangayRows = barangay
            ? municipalityRows.filter(r => clean(r.barangay).toLowerCase() === barangay.toLowerCase())
            : municipalityRows;

        const filtered = barangayRows.filter(row => {
            const conf = normalizeConfidence(row.confidence);
            if (disease && clean(row.predicted_disease) !== disease) return false;
            if (confidenceRange === '90-100' && conf < 90) return false;
            if (confidenceRange === '80-89' && (conf < 80 || conf >= 90)) return false;
            if (confidenceRange === '70-79' && (conf < 70 || conf >= 80)) return false;
            if (confidenceRange === 'below-70' && conf >= 70) return false;
            if (!datePasses(row.created_at, dateRange)) return false;

            if (search) {
                const user = userMap.get(String(row.user_id || ''));
                const haystack = [
                    prettyDisease(row.predicted_disease), row.province, row.municipality, row.barangay,
                    user?.first_name, user?.last_name, user?.email
                ].map(clean).join(' ').toLowerCase();
                if (!haystack.includes(search)) return false;
            }

            return true;
        });

        const rows = filtered.map(row => {
            const user = userMap.get(String(row.user_id || ''));
            const name = user ? [user.first_name, user.last_name].map(clean).filter(Boolean).join(' ') : '';
            return {
                id: row.id,
                disease: prettyDisease(row.predicted_disease),
                disease_key: clean(row.predicted_disease),
                confidence: Number(normalizeConfidence(row.confidence).toFixed(2)),
                image_url: clean(row.image_url),
                province: clean(row.province),
                municipality: clean(row.municipality),
                barangay: clean(row.barangay),
                created_at: row.created_at,
                user: {
                    id: user?.id || null,
                    name: name || clean(user?.email) || 'Unknown User',
                    email: clean(user?.email)
                }
            };
        });

        const confs = rows.map(row => row.confidence);
        const avg = confs.length ? confs.reduce((a,b) => a+b, 0) / confs.length : 0;
        const healthy = rows.filter(row => row.disease_key === 'healthy_rice_plant').length;
        const diseases = [...new Set(safePredictions.map(r => clean(r.predicted_disease)).filter(Boolean))]
            .sort()
            .map(value => ({ value, label: prettyDisease(value) }));

        return res.json({
            success: true,
            stats: {
                total: rows.length,
                average_confidence: Number(avg.toFixed(2)),
                healthy,
                diseased: rows.length - healthy,
                today: rows.filter(r => phDate(r.created_at) === phDate()).length
            },
            filters: {
                selected: { disease, confidence: confidenceRange, date: dateRange, province, municipality, barangay, search: clean(req.query.search) },
                options: {
                    diseases,
                    provinces: unique(safePredictions.map(r => r.province)),
                    municipalities: unique(provinceRows.map(r => r.municipality)),
                    barangays: unique(municipalityRows.map(r => r.barangay))
                }
            },
            predictions: rows,
            generated_at: new Date().toISOString()
        });
    } catch (error) {
        console.error('Admin predictions:', error);
        return res.status(500).json({ success: false, message: 'Unexpected server error.', error: error.message });
    }
};
