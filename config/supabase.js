const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) {
    throw new Error('SUPABASE_URL is missing.');
}

if (!supabasePublishableKey) {
    throw new Error('SUPABASE_PUBLISHABLE_KEY is missing.');
}

if (!supabaseSecretKey) {
    throw new Error('SUPABASE_SECRET_KEY is missing.');
}

const supabase = createClient(
    supabaseUrl,
    supabasePublishableKey
);

const supabaseAdmin = createClient(
    supabaseUrl,
    supabaseSecretKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

module.exports = {
    supabase,
    supabaseAdmin
};