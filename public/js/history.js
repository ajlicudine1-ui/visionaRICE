(() => {
    "use strict";

    const API_URL =
        "/api/history";

    const DETAIL_URL =
        id =>
            `/prediction-detail.html?id=${encodeURIComponent(id)}`;

    const elements = {
        date:
            document.getElementById(
                "dateFilter"
            ),

        disease:
            document.getElementById(
                "diseaseFilter"
            ),

        confidence:
            document.getElementById(
                "confidenceFilter"
            ),

        reset:
            document.getElementById(
                "resetFilters"
            ),

        retry:
            document.getElementById(
                "retryHistory"
            ),

        tableBody:
            document.getElementById(
                "historyTableBody"
            ),

        loading:
            document.getElementById(
                "historyLoading"
            ),

        error:
            document.getElementById(
                "historyError"
            ),

        errorText:
            document.getElementById(
                "historyErrorText"
            ),

        empty:
            document.getElementById(
                "historyEmpty"
            ),

        content:
            document.getElementById(
                "historyContent"
            ),

        count:
            document.getElementById(
                "resultCount"
            )
    };

    function showState(name) {
        [
            elements.loading,
            elements.error,
            elements.empty,
            elements.content
        ].forEach(
            item =>
                item?.classList.add(
                    "hidden"
                )
        );

        if (
            name === "loading"
        ) {
            elements.loading.classList.remove(
                "hidden"
            );
        }

        if (
            name === "error"
        ) {
            elements.error.classList.remove(
                "hidden"
            );
        }

        if (
            name === "empty"
        ) {
            elements.empty.classList.remove(
                "hidden"
            );
        }

        if (
            name === "content"
        ) {
            elements.content.classList.remove(
                "hidden"
            );
        }
    }

    function escapeHtml(value) {
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

    function normalizeRecord(record) {
        return {
            id:
                record.id,

            date:
                record.date ||
                record.created_at ||
                "",

            displayDate:
                record.display_date ||
                formatDate(
                    record.created_at
                ),

            disease:
                record.disease ||
                "Unknown",

            confidence:
                Number(
                    record.confidence ??
                    0
                ),

            location:
                record.location ||
                "",

            imageUrl:
                record.image_url ||
                record.imageUrl ||
                "",

            latitude:
                record.latitude,

            longitude:
                record.longitude,

            gpsAccuracy:
                record.gps_accuracy,

            recommendations:
                record.recommendations,

            culturalControl:
                record.cultural_control,

            biologicalControl:
                record.biological_control,

            chemicalControl:
                record.chemical_control
        };
    }

    function formatDate(value) {
        if (!value) {
            return "";
        }

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return String(value);
        }

        return new Intl.DateTimeFormat(
            "en-PH",
            {
                month: "short",
                day: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        ).format(date);
    }

    function buildQuery() {
        const params =
            new URLSearchParams();

        if (
            elements.date.value
        ) {
            params.set(
                "date",
                elements.date.value
            );
        }

        if (
            elements.disease.value
        ) {
            params.set(
                "disease",
                elements.disease.value
            );
        }

        if (
            elements.confidence.value
        ) {
            params.set(
                "confidence",
                elements.confidence.value
            );
        }

        return params;
    }

    function recordTemplate(record) {
        const image =
            record.imageUrl
                ? `
                    <img
                        class="history-thumb"
                        src="${escapeHtml(record.imageUrl)}"
                        alt="${escapeHtml(record.disease)}"
                        loading="lazy"
                    >
                `
                : `
                    <div
                        class="no-image"
                        aria-label="No image stored"
                    >
                        🌿
                    </div>
                `;

        return `
            <tr
                class="history-row"
                data-record-id="${escapeHtml(record.id)}"
                tabindex="0"
                role="button"
            >
                <td>
                    ${image}
                </td>

                <td>
                    <span class="disease-name">
                        ${escapeHtml(record.disease)}
                    </span>
                </td>

                <td>
                    <span class="confidence-pill">
                        ${escapeHtml(
                            record.confidence.toFixed(2)
                        )}%
                    </span>
                </td>

                <td>
                    <span class="location-text">
                        ${
                            record.location
                                ? `📍 ${escapeHtml(record.location)}`
                                : "Location not recorded"
                        }
                    </span>
                </td>

                <td>
                    <span class="date-text">
                        ${escapeHtml(record.displayDate)}
                    </span>
                </td>

                <td class="row-arrow">
                    ›
                </td>
            </tr>
        `;
    }

    function renderRows(records) {
        const normalized =
            records.map(
                normalizeRecord
            );

        elements.count.textContent =
            `${normalized.length} ${
                normalized.length === 1
                    ? "record"
                    : "records"
            }`;

        if (
            normalized.length === 0
        ) {
            elements.tableBody.innerHTML =
                "";

            showState(
                "empty"
            );

            return;
        }

        elements.tableBody.innerHTML =
            normalized
                .map(
                    recordTemplate
                )
                .join("");

        showState(
            "content"
        );
    }

    async function fetchAndRender() {
        showState(
            "loading"
        );

        const params =
            buildQuery();

        const url =
            `${API_URL}${
                params.toString()
                    ? `?${params.toString()}`
                    : ""
            }`;

        try {
            const response =
                await fetch(
                    url,
                    {
                        credentials:
                            "include",

                        headers: {
                            "X-Requested-With":
                                "XMLHttpRequest"
                        }
                    }
                );

            if (
                !response.ok
            ) {
                throw new Error(
                    `Unable to load history (${response.status})`
                );
            }

            const payload =
                await response.json();

            const records =
                Array.isArray(payload)
                    ? payload
                    : (
                        payload.history ||
                        payload.records ||
                        payload.predictions ||
                        []
                    );

            renderRows(
                Array.isArray(records)
                    ? records
                    : []
            );
        } catch (error) {
            console.error(
                "History fetch error:",
                error
            );

            elements.errorText.textContent =
                error.message ||
                "Please try again.";

            showState(
                "error"
            );
        }
    }

    function resetFilters() {
        elements.date.value =
            "";

        elements.disease.value =
            "";

        elements.confidence.value =
            "";

        fetchAndRender();
    }

    function openPrediction(id) {
        if (
            id === undefined ||
            id === null ||
            id === ""
        ) {
            return;
        }

        window.location.href =
            DETAIL_URL(id);
    }

    [
        elements.date,
        elements.disease,
        elements.confidence
    ].forEach(
        input => {
            input.addEventListener(
                "change",
                fetchAndRender
            );
        }
    );

    elements.reset.addEventListener(
        "click",
        resetFilters
    );

    elements.retry.addEventListener(
        "click",
        fetchAndRender
    );

    elements.tableBody.addEventListener(
        "click",
        event => {
            const row =
                event.target.closest(
                    ".history-row"
                );

            if (!row) {
                return;
            }

            openPrediction(
                row.dataset.recordId
            );
        }
    );

    elements.tableBody.addEventListener(
        "keydown",
        event => {
            if (
                event.key !== "Enter" &&
                event.key !== " "
            ) {
                return;
            }

            const row =
                event.target.closest(
                    ".history-row"
                );

            if (!row) {
                return;
            }

            event.preventDefault();

            openPrediction(
                row.dataset.recordId
            );
        }
    );

    fetchAndRender();
})();
