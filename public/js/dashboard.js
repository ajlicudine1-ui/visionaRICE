// =====================================================
// VISIONARICE DASHBOARD
// =====================================================

const API_URL =
    '/api/dashboard/summary';

let diseaseChart = null;
let healthChart = null;
let trendChart = null;
let confidenceChart = null;


// =====================================================
// COLORS
// =====================================================

const COLORS = {
    greenDark:
        '#1c5e3a',

    green:
        '#286f45',

    greenSoft:
        '#7ea081',

    greenPale:
        '#e7efe4',

    gold:
        '#d6ad35',

    brown:
        '#8d6837',

    brownSoft:
        '#b99a6e',

    grid:
        '#e7ece5',

    text:
        '#65736a'
};


// =====================================================
// LABEL FORMATTER
// =====================================================

function prettyName(
    value
) {
    if (!value) {
        return 'Unknown';
    }

    return String(value)
        .replace(
            /_/g,
            ' '
        )
        .replace(
            /-/g,
            ' '
        )
        .split(' ')
        .filter(Boolean)
        .map(
            word =>
                word
                    .charAt(0)
                    .toUpperCase() +
                word
                    .slice(1)
                    .toLowerCase()
        )
        .join(' ');
}


// =====================================================
// LOAD DASHBOARD
// =====================================================

async function loadDashboard() {

    const refreshButton =
        document.getElementById(
            'refreshDashboardButton'
        );

    try {

        refreshButton.disabled =
            true;

        refreshButton.textContent =
            'Refreshing...';


        const response =
            await fetch(
                API_URL,
                {
                    credentials:
                        'include',

                    headers: {
                        Accept:
                            'application/json'
                    }
                }
            );


        if (!response.ok) {

            throw new Error(
                `Dashboard request failed (${response.status})`
            );

        }


        const result =
            await response.json();


        if (
            result.success ===
            false
        ) {

            throw new Error(
                result.message ||
                'Unable to load dashboard.'
            );

        }


        renderDashboard(
            result
        );


    } catch (error) {

        console.error(
            'Dashboard loading error:',
            error
        );


        renderDashboard(
            createEmptyDashboard()
        );


    } finally {

        refreshButton.disabled =
            false;

        refreshButton.textContent =
            '↻ Refresh';

    }

}


// =====================================================
// EMPTY FALLBACK
// =====================================================

function createEmptyDashboard() {

    return {
        totalScans:
            0,

        averageConfidence:
            0,

        scansToday:
            0,

        mostDetected:
            null,

        disease:
            {
                labels:
                    [],

                counts:
                    []
            },

        health:
            {
                healthy:
                    0,

                diseased:
                    0
            },

        trend:
            {
                labels:
                    [],

                counts:
                    []
            },

        confidence:
            {
                labels: [
                    'Below 60%',
                    '60–74%',
                    '75–89%',
                    '90–100%'
                ],

                counts: [
                    0,
                    0,
                    0,
                    0
                ]
            },

        locations:
            [],

        recent:
            []
    };

}


// =====================================================
// RENDER ALL
// =====================================================

function renderDashboard(
    data
) {

    updateKPIs(
        data
    );

    renderDiseaseChart(
        data.disease
    );

    renderHealthChart(
        data.health
    );

    renderTrendChart(
        data.trend
    );

    renderConfidenceChart(
        data.confidence
    );

    renderLocations(
        data.locations
    );

    renderRecent(
        data.recent
    );


    document
        .getElementById(
            'lastUpdated'
        )
        .textContent =
        new Date()
            .toLocaleTimeString(
                [],
                {
                    hour:
                        '2-digit',

                    minute:
                        '2-digit'
                }
            );

}


// =====================================================
// KPI
// =====================================================

function updateKPIs(
    data
) {

    document
        .getElementById(
            'totalScans'
        )
        .textContent =
        Number(
            data.totalScans ||
            0
        )
        .toLocaleString();


    document
        .getElementById(
            'averageConfidence'
        )
        .textContent =
        `${Number(
            data.averageConfidence ||
            0
        ).toFixed(2)}%`;


    document
        .getElementById(
            'scansToday'
        )
        .textContent =
        Number(
            data.scansToday ||
            0
        )
        .toLocaleString();


    document
        .getElementById(
            'mostDetected'
        )
        .textContent =
        data.mostDetected
            ? prettyName(
                data.mostDetected
            )
            : 'No data';

}


// =====================================================
// COMMON CHART OPTIONS
// =====================================================

function baseChartOptions() {

    return {
        responsive:
            true,

        maintainAspectRatio:
            false,

        animation: {
            duration:
                500
        },

        plugins: {

            legend: {
                display:
                    false
            },

            tooltip: {
                backgroundColor:
                    '#173f2a',

                padding:
                    10,

                cornerRadius:
                    9,

                titleFont: {
                    family:
                        'Poppins'
                },

                bodyFont: {
                    family:
                        'Poppins'
                }
            }

        },

        scales: {

            x: {

                grid: {
                    display:
                        false
                },

                ticks: {
                    color:
                        COLORS.text,

                    font: {
                        family:
                            'Poppins',

                        size:
                            9
                    }
                },

                border: {
                    display:
                        false
                }

            },

            y: {

                beginAtZero:
                    true,

                ticks: {
                    precision:
                        0,

                    color:
                        COLORS.text,

                    font: {
                        family:
                            'Poppins',

                        size:
                            9
                    }
                },

                grid: {
                    color:
                        COLORS.grid
                },

                border: {
                    display:
                        false
                }

            }

        }

    };

}


// =====================================================
// DISEASE CHART
// =====================================================

function renderDiseaseChart(
    dataset
) {

    const labels =
        (
            dataset?.labels ||
            []
        )
        .map(
            prettyName
        );


    const counts =
        dataset?.counts ||
        [];


    if (diseaseChart) {
        diseaseChart.destroy();
    }


    diseaseChart =
        new Chart(
            document
                .getElementById(
                    'diseaseChart'
                ),
            {
                type:
                    'bar',

                data: {
                    labels,

                    datasets: [
                        {
                            data:
                                counts,

                            backgroundColor: [
                                COLORS.greenDark,
                                COLORS.green,
                                COLORS.greenSoft,
                                COLORS.gold
                            ],

                            borderRadius:
                                8,

                            borderSkipped:
                                false
                        }
                    ]
                },

                options: {
                    ...baseChartOptions(),

                    indexAxis:
                        'y'
                }
            }
        );

}


// =====================================================
// HEALTH CHART
// =====================================================

function renderHealthChart(
    health
) {

    const healthy =
        Number(
            health?.healthy ||
            0
        );

    const diseased =
        Number(
            health?.diseased ||
            0
        );


    document
        .getElementById(
            'healthyCount'
        )
        .textContent =
        healthy
            .toLocaleString();


    document
        .getElementById(
            'diseasedCount'
        )
        .textContent =
        diseased
            .toLocaleString();


    if (healthChart) {
        healthChart.destroy();
    }


    healthChart =
        new Chart(
            document
                .getElementById(
                    'healthChart'
                ),
            {
                type:
                    'doughnut',

                data: {
                    labels: [
                        'Healthy',
                        'Diseased'
                    ],

                    datasets: [
                        {
                            data: [
                                healthy,
                                diseased
                            ],

                            backgroundColor: [
                                COLORS.green,
                                COLORS.brown
                            ],

                            borderWidth:
                                0,

                            hoverOffset:
                                4
                        }
                    ]
                },

                options: {
                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    cutout:
                        '68%',

                    plugins: {

                        legend: {
                            display:
                                false
                        },

                        tooltip: {
                            backgroundColor:
                                '#173f2a',

                            titleFont: {
                                family:
                                    'Poppins'
                            },

                            bodyFont: {
                                family:
                                    'Poppins'
                            }
                        }

                    }
                }
            }
        );

}


// =====================================================
// TREND CHART
// =====================================================

function renderTrendChart(
    trend
) {

    if (trendChart) {
        trendChart.destroy();
    }


    trendChart =
        new Chart(
            document
                .getElementById(
                    'trendChart'
                ),
            {
                type:
                    'line',

                data: {
                    labels:
                        trend?.labels ||
                        [],

                    datasets: [
                        {
                            data:
                                trend?.counts ||
                                [],

                            borderColor:
                                COLORS.greenDark,

                            backgroundColor:
                                'rgba(40, 111, 69, .10)',

                            fill:
                                true,

                            tension:
                                .34,

                            pointRadius:
                                3,

                            pointHoverRadius:
                                5,

                            pointBackgroundColor:
                                '#ffffff',

                            pointBorderColor:
                                COLORS.greenDark,

                            pointBorderWidth:
                                2
                        }
                    ]
                },

                options:
                    baseChartOptions()
            }
        );

}


// =====================================================
// CONFIDENCE CHART
// =====================================================

function renderConfidenceChart(
    confidence
) {

    if (confidenceChart) {
        confidenceChart.destroy();
    }


    confidenceChart =
        new Chart(
            document
                .getElementById(
                    'confidenceChart'
                ),
            {
                type:
                    'bar',

                data: {
                    labels:
                        confidence?.labels ||
                        [],

                    datasets: [
                        {
                            data:
                                confidence?.counts ||
                                [],

                            backgroundColor: [
                                COLORS.brownSoft,
                                COLORS.gold,
                                COLORS.greenSoft,
                                COLORS.greenDark
                            ],

                            borderRadius:
                                8,

                            borderSkipped:
                                false
                        }
                    ]
                },

                options:
                    baseChartOptions()
            }
        );

}


// =====================================================
// LOCATIONS
// =====================================================

function renderLocations(
    locations
) {

    const container =
        document.getElementById(
            'locationList'
        );


    if (
        !Array.isArray(
            locations
        ) ||
        locations.length ===
        0
    ) {

        container.innerHTML = `
            <div class="empty-state">
                No location data yet.
            </div>
        `;

        return;

    }


    container.innerHTML =
        locations
            .slice(
                0,
                6
            )
            .map(
                (
                    item,
                    index
                ) => `
                    <article class="location-item">

                        <div class="location-rank">
                            ${index + 1}
                        </div>

                        <div class="location-info">

                            <strong title="${escapeHTML(item.location)}">
                                ${escapeHTML(item.location)}
                            </strong>

                            <small>
                                Recorded scan location
                            </small>

                        </div>

                        <div class="location-count">
                            ${Number(item.count || 0)}
                        </div>

                    </article>
                `
            )
            .join('');

}


// =====================================================
// RECENT
// =====================================================

function renderRecent(
    recent
) {

    const container =
        document.getElementById(
            'recentPredictions'
        );


    if (
        !Array.isArray(
            recent
        ) ||
        recent.length ===
        0
    ) {

        container.innerHTML = `
            <div class="empty-state">
                No predictions yet.
            </div>
        `;

        return;

    }


    container.innerHTML =
        recent
            .slice(
                0,
                6
            )
            .map(
                item => {

                    const disease =
                        prettyName(
                            item.disease
                        );


                    const isHealthy =
                        disease ===
                        'Healthy Rice Plant';


                    return `
                        <article class="recent-item">

                            <div class="recent-icon">
                                ${isHealthy ? '🌿' : '🩺'}
                            </div>

                            <div class="recent-info">

                                <strong>
                                    ${escapeHTML(disease)}
                                </strong>

                                <small>
                                    ${escapeHTML(item.location || 'No location')}
                                    •
                                    ${escapeHTML(formatDate(item.created_at))}
                                </small>

                            </div>

                            <div class="recent-confidence">
                                ${Number(item.confidence || 0).toFixed(2)}%
                            </div>

                        </article>
                    `;

                }
            )
            .join('');

}


// =====================================================
// HELPERS
// =====================================================

function formatDate(
    value
) {

    if (!value) {
        return 'Unknown date';
    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(value);
    }


    return date
        .toLocaleString(
            [],
            {
                month:
                    'short',

                day:
                    'numeric',

                hour:
                    '2-digit',

                minute:
                    '2-digit'
            }
        );

}


function escapeHTML(
    value
) {

    return String(
        value ??
        ''
    )
    .replace(
        /&/g,
        '&amp;'
    )
    .replace(
        /</g,
        '&lt;'
    )
    .replace(
        />/g,
        '&gt;'
    )
    .replace(
        /"/g,
        '&quot;'
    )
    .replace(
        /'/g,
        '&#039;'
    );

}


// =====================================================
// EVENTS
// =====================================================

document
    .getElementById(
        'refreshDashboardButton'
    )
    .addEventListener(
        'click',
        loadDashboard
    );


// =====================================================
// START
// =====================================================

loadDashboard();
