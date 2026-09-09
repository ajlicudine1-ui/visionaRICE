require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieSession = require('cookie-session');
const path = require('path');

const {
    supabaseAdmin
} = require('./config/supabase');

const authRoutes =
    require('./routes/authRoutes');

const dashboardRoutes =
    require('./routes/dashboardRoutes');

const predictionRoutes =
    require('./routes/predictionRoutes');

const historyRoutes =
    require('./routes/historyRoutes');

const notificationRoutes =
    require('./routes/notificationRoutes');

const {
    requireAdmin
} = require('./middleware/authMiddleware');

const app = express();

const PORT =
    process.env.PORT || 3000;


// ===============================
// Middleware
// ===============================

app.use(
    cors({
        origin: true,
        credentials: true
    })
);

app.use(
    express.json()
);

app.use(
    express.urlencoded({
        extended: true
    })
);

app.set(
    'trust proxy',
    1
);

app.use(
    cookieSession({
        name:
            'visionarice_session',

        keys: [
            process.env.SESSION_SECRET
        ],

        httpOnly: true,

        sameSite:
            'lax',

        secure:
            process.env.NODE_ENV ===
            'production',

        maxAge:
            1000 *
            60 *
            60 *
            24
    })
);


// ===============================
// Static Files
// ===============================

app.use(
    express.static(
        path.join(
            __dirname,
            'public'
        )
    )
);


// ===============================
// Main Routes
// ===============================

app.get(
    '/',
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                'public',
                'login.html'
            )
        );
    }
);


// ===============================
// Health Check
// ===============================

app.get(
    '/api/health',
    (req, res) => {

        res.json({
            success: true,

            status:
                'online',

            timestamp:
                new Date()
                    .toISOString()
        });
    }
);


// ===============================
// Supabase Database Test
// ===============================

app.get(
    '/api/test-db',
    async (req, res) => {

        try {

            const {
                data,
                error
            } =
                await supabaseAdmin
                    .from(
                        'diseases'
                    )
                    .select(
                        '*'
                    )
                    .order(
                        'id',
                        {
                            ascending:
                                true
                        }
                    );

            if (error) {

                console.error(
                    'Database error:',
                    error
                );

                return res
                    .status(500)
                    .json({
                        success:
                            false,

                        message:
                            'Database connection failed.',

                        error:
                            error.message
                    });
            }

            return res.json({
                success:
                    true,

                message:
                    'Supabase database connected successfully.',

                count:
                    data.length,

                diseases:
                    data
            });

        } catch (error) {

            console.error(
                'Unexpected error:',
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
    }
);


// ===============================
// Authentication Routes
// ===============================

app.use(
    '/api/auth',
    authRoutes
);


// ===============================
// Prediction Routes
// ===============================

app.use(
    '/api/predictions',
    predictionRoutes
);


// ===============================
// History Routes
// ===============================

app.use(
    '/api/history',
    historyRoutes
);


// ===============================
// Notifications Routes
// ===============================

app.use(
    '/api/notifications',
    notificationRoutes
);


// ===============================
// Dashboard Routes
// ===============================

app.use(
    '/api/dashboard',
    dashboardRoutes
);


// ===============================
// Admin Test Route
// ===============================

app.get(
    '/api/admin/test',
    requireAdmin,
    (req, res) => {

        return res.json({
            success:
                true,

            message:
                'Administrator access confirmed.',

            user:
                req.session.user
        });
    }
);


// ===============================
// 404
// Keep this AFTER all routes.
// ===============================

app.use(
    (req, res) => {

        return res
            .status(404)
            .json({
                success:
                    false,

                message:
                    'Route not found.'
            });
    }
);


// ===============================
// Start Server
// ===============================

if (
    require.main ===
    module
) {

    app.listen(
        PORT,
        () => {

            console.log('');

            console.log(
                '===================================='
            );

            console.log(
                ' VISIONARICE'
            );

            console.log(
                '===================================='
            );

            console.log(
                ` Server:          http://localhost:${PORT}`
            );

            console.log(
                ` Health:          http://localhost:${PORT}/api/health`
            );

            console.log(
                ` Database Test:   http://localhost:${PORT}/api/test-db`
            );


            console.log('');

            console.log(
                ' AUTH ROUTES'
            );

            console.log(
                ` Register:        POST http://localhost:${PORT}/api/auth/register`
            );

            console.log(
                ` Login:           POST http://localhost:${PORT}/api/auth/login`
            );

            console.log(
                ` Current User:    GET  http://localhost:${PORT}/api/auth/me`
            );

            console.log(
                ` Logout:          POST http://localhost:${PORT}/api/auth/logout`
            );


            console.log('');

            console.log(
                ' PREDICTION ROUTES'
            );

            console.log(
                ` Save Prediction: POST http://localhost:${PORT}/api/predictions`
            );


            console.log('');

            console.log(
                ' HISTORY ROUTES'
            );

            console.log(
                ` History:         GET  http://localhost:${PORT}/api/history`
            );

            console.log(
                ` History Detail:  GET  http://localhost:${PORT}/api/history/:id`
            );


            console.log('');

            console.log(
                ' NOTIFICATION ROUTES'
            );

            console.log(
                ` Overall:         GET  http://localhost:${PORT}/api/notifications?filter=overall`
            );

            console.log(
                ` Daily:           GET  http://localhost:${PORT}/api/notifications?filter=daily`
            );

            console.log(
                ` Weekly:          GET  http://localhost:${PORT}/api/notifications?filter=weekly`
            );

            console.log(
                ` Monthly:         GET  http://localhost:${PORT}/api/notifications?filter=monthly`
            );


            console.log('');

            console.log(
                ' DASHBOARD ROUTES'
            );

            console.log(
                ` Summary:         GET  http://localhost:${PORT}/api/dashboard/summary`
            );


            console.log('');

            console.log(
                ' ADMIN ROUTES'
            );

            console.log(
                ` Admin Test:      GET  http://localhost:${PORT}/api/admin/test`
            );

            console.log(
                '===================================='
            );

            console.log('');
        }
    );
}


// ===============================
// Export Express App for Vercel
// ===============================

module.exports = app;