(() => {
    "use strict";

    const API_URL =
        "/api/notifications";

    const FILTER_LABELS = {
        overall:
            "Showing all records",

        daily:
            "Showing today's records",

        weekly:
            "Showing the last 7 days",

        monthly:
            "Showing the last 30 days"
    };

    const elements = {
        filterDescription:
            document.getElementById(
                "filterDescription"
            ),

        totalScans:
            document.getElementById(
                "totalScans"
            ),

        diseaseDetections:
            document.getElementById(
                "diseaseDetections"
            ),

        mostFrequentDisease:
            document.getElementById(
                "mostFrequentDisease"
            ),

        mostFrequentCount:
            document.getElementById(
                "mostFrequentCount"
            ),

        recordCount:
            document.getElementById(
                "recordCount"
            ),

        loading:
            document.getElementById(
                "notificationLoading"
            ),

        empty:
            document.getElementById(
                "notificationEmpty"
            ),

        error:
            document.getElementById(
                "notificationError"
            ),

        errorText:
            document.getElementById(
                "notificationErrorText"
            ),

        list:
            document.getElementById(
                "notificationList"
            )
    };

    let activeFilter =
        "overall";


    function escapeHtml(
        value
    ) {
        return String(
            value ?? ""
        )
            .replaceAll(
                "&",
                "&amp;"
            )
            .replaceAll(
                "<",
                "&lt;"
            )
            .replaceAll(
                ">",
                "&gt;"
            )
            .replaceAll(
                '"',
                "&quot;"
            )
            .replaceAll(
                "'",
                "&#039;"
            );
    }


    function setState(
        state
    ) {
        elements.loading
            .classList
            .add(
                "hidden"
            );

        elements.empty
            .classList
            .add(
                "hidden"
            );

        elements.error
            .classList
            .add(
                "hidden"
            );

        elements.list
            .classList
            .add(
                "hidden"
            );

        const target =
            elements[
                state
            ];

        if (target) {
            target
                .classList
                .remove(
                    "hidden"
                );
        }
    }


    function updateFilterButtons() {
        document
            .querySelectorAll(
                ".filter-pill"
            )
            .forEach(
                button => {
                    button
                        .classList
                        .toggle(
                            "active",
                            button.dataset.filter ===
                            activeFilter
                        );
                }
            );

        elements
            .filterDescription
            .textContent =
                FILTER_LABELS[
                    activeFilter
                ];
    }


    function renderSummary(
        summary
    ) {
        elements.totalScans
            .textContent =
                Number(
                    summary.total_scans ||
                    0
                );

        elements
            .diseaseDetections
            .textContent =
                Number(
                    summary.disease_detections ||
                    0
                );

        const disease =
            summary
                .most_frequent_disease;

        const count =
            Number(
                summary
                    .most_frequent_count ||
                0
            );

        elements
            .mostFrequentDisease
            .textContent =
                disease ||
                "No disease detected";

        elements
            .mostFrequentCount
            .textContent =
                disease
                    ? `${count} occurrence${
                        count === 1
                            ? ""
                            : "s"
                    }`
                    : "0 occurrences";
    }


    function renderNotifications(
        notifications
    ) {
        if (
            !Array.isArray(
                notifications
            ) ||
            notifications.length ===
            0
        ) {
            elements
                .recordCount
                .textContent =
                    "0 records";

            setState(
                "empty"
            );

            return;
        }

        elements
            .recordCount
            .textContent =
                `${notifications.length} record${
                    notifications.length ===
                    1
                        ? ""
                        : "s"
                }`;

        elements.list.innerHTML =
            notifications
                .map(
                    item => {
                        const healthy =
                            item.type ===
                            "healthy";

                        return `
                            <div
                                class="notification-item ${
                                    healthy
                                        ? "healthy"
                                        : "disease"
                                }"
                            >
                                <div class="notification-icon">
                                    ${
                                        healthy
                                            ? "🌿"
                                            : "🩺"
                                    }
                                </div>

                                <div class="notification-content">
                                    <div class="notification-title-row">
                                        <strong>
                                            ${escapeHtml(
                                                item.title
                                            )}
                                        </strong>

                                        <span class="confidence-badge">
                                            ${Number(
                                                item.confidence ||
                                                0
                                            ).toFixed(2)}%
                                        </span>
                                    </div>

                                    <p>
                                        ${escapeHtml(
                                            item.message
                                        )}
                                    </p>

                                    <div class="notification-meta">
                                        <span>
                                            📍 ${escapeHtml(
                                                item.location
                                            )}
                                        </span>

                                        <span>
                                            🕒 ${escapeHtml(
                                                item.display_date
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                )
                .join("");

        setState(
            "list"
        );
    }


    async function loadNotifications() {
        updateFilterButtons();

        setState(
            "loading"
        );

        try {
            const response =
                await fetch(
                    `${API_URL}?filter=${encodeURIComponent(activeFilter)}`,
                    {
                        credentials:
                            "include",

                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );

            const payload =
                await response
                    .json()
                    .catch(
                        () => ({})
                    );

            if (!response.ok) {
                if (
                    response.status ===
                    401
                ) {
                    window.location.href =
                        "/login.html";

                    return;
                }

                throw new Error(
                    payload.message ||
                    `Unable to load notifications (${response.status}).`
                );
            }

            renderSummary(
                payload.summary ||
                {}
            );

            renderNotifications(
                payload.notifications ||
                []
            );

        } catch (error) {
            console.error(
                "Notifications error:",
                error
            );

            elements
                .errorText
                .textContent =
                    error.message ||
                    "Please try again.";

            elements
                .recordCount
                .textContent =
                    "Unable to load records";

            setState(
                "error"
            );
        }
    }


    document
        .querySelectorAll(
            ".filter-pill"
        )
        .forEach(
            button => {
                button
                    .addEventListener(
                        "click",
                        () => {
                            const filter =
                                button
                                    .dataset
                                    .filter;

                            if (
                                !filter ||
                                filter ===
                                activeFilter
                            ) {
                                return;
                            }

                            activeFilter =
                                filter;

                            loadNotifications();
                        }
                    );
            }
        );


    loadNotifications();
})();
