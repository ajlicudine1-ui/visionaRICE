require('dotenv').config();

const readline = require('readline');
const bcrypt = require('bcryptjs');
const { supabaseAdmin } = require('../config/supabase');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise(resolve => rl.question(question, answer => resolve(answer.trim())));
}

(async () => {
    try {
        console.log('\nVISIONARICE - Create Administrator\n');

        const email = (await ask('Email: ')).toLowerCase();
        const first_name = await ask('First name: ');
        const last_name = await ask('Last name: ');
        const password = await ask('Password (minimum 8 characters): ');

        if (!email || !first_name || !last_name || password.length < 8) {
            console.error('\nInvalid input. Email, first name, last name, and an 8+ character password are required.');
            process.exitCode = 1;
            return;
        }

        const { data: existing, error: lookupError } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (lookupError) throw lookupError;

        if (existing) {
            console.error('\nA user with that email already exists.');
            process.exitCode = 1;
            return;
        }

        const password_hash = await bcrypt.hash(password, 12);

        const { data, error } = await supabaseAdmin
            .from('users')
            .insert({
                email,
                password_hash,
                first_name,
                last_name,
                role: 'admin',
                is_active: true
            })
            .select('id, email, first_name, last_name, role, created_at')
            .single();

        if (error) throw error;

        console.log('\nAdministrator created successfully:');
        console.log(data);
    } catch (error) {
        console.error('\nFailed to create administrator:', error.message);
        process.exitCode = 1;
    } finally {
        rl.close();
    }
})();
