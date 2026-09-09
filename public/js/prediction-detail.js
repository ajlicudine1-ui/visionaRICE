(() => {
    "use strict";

    const API_BASE =
        "/api/history";

    const DISEASE_ADVICE = {
        "Leaf Blast": {
            advice: {
                en:
                    "Apply appropriate fungicides and manage water properly.",
                ilo:
                    "Usaren dagiti umiso a fungicide ken aywanan ti pannakausar ti danum.",
                tl:
                    "Gumamit ng angkop na fungicide at pamahalaan nang maayos ang tubig."
            },

            cultural_control: {
                en:
                    "Avoid excessive nitrogen and maintain proper spacing.",
                ilo:
                    "Liklikan ti sobra a nitrogen ken mentinaren ti usto a distansia ti pinuon ti pagay.",
                tl:
                    "Iwasan ang labis na nitrogen at panatilihin ang tamang pagitan."
            },

            biological_control: {
                en:
                    "Use Trichoderma or Pseudomonas fluorescens as seed treatment.",
                ilo:
                    "Agusar ti Trichoderma wenno Pseudomonas fluorescens a pamprotektar kadagiti bin-i.",
                tl:
                    "Gumamit ng Trichoderma o Pseudomonas fluorescens bilang paggamot sa binhi."
            },

            chemical_control: {
                en:
                    "Apply tricyclazole or isoprothiolane at early infection stage.",
                ilo:
                    "Agusar ti tricyclazole wenno isoprothiolane no adda makita a naapektaran a mula nga pagay.",
                tl:
                    "Maglagay ng tricyclazole o isoprothiolane sa maagang yugto ng impeksyon."
            }
        },

        "Bacterial Leaf Blight": {
            advice: {
                en:
                    "Use resistant varieties and avoid excess nitrogen.",
                ilo:
                    "Liklikan iti panagusar iti ado unay a nitrogen nga abono.",
                tl:
                    "Gumamit ng mga barayti na lumalaban sa sakit at iwasan ang labis na nitrogen."
            },

            cultural_control: {
                en:
                    "Remove infected stubbles and ensure proper field drainage.",
                ilo:
                    "Ikkaten dagiti naapektaran wenno nagsakit nga pinuon ti pagay ken siguradwen nga nasayaat ti pagibellengan ti danum.",
                tl:
                    "Tanggalin ang mga nahawaang dayami at tiyakin ang maayos na daluyan ng tubig."
            },

            biological_control: {
                en:
                    "Apply beneficial microbes like Bacillus subtilis.",
                ilo:
                    "Agusar kadagiti makatulong nga mikrubyo kas iti Bacillus Subtilis tapno napintas ti panagdakkel iti pagay ken maliklikan dagiti sakit.",
                tl:
                    "Gumamit ng mga kapaki-pakinabang na mikrobyo tulad ng Bacillus subtilis."
            },

            chemical_control: {
                en:
                    "Spray copper-based bactericides if necessary.",
                ilo:
                    "Agispray iti copper-based bactericides no kasapulan.",
                tl:
                    "Mag-spray ng mga bactericide na may halong tanso kung kinakailangan."
            }
        },

        "Healthy Rice Plant": {
            advice: {
                en:
                    "Continue regular care.",
                ilo:
                    "Ituloy ti regular a panangaywan.",
                tl:
                    "Ipagpatuloy ang regular na pangangalaga."
            },

            cultural_control: {
                en:
                    "Maintain good irrigation and proper spacing.",
                ilo:
                    "Mentenaren ti nasayaat nga irigasyon ken umno nga espasyo iti pagay",
                tl:
                    "Panatilihin ang tamang irigasyon at pagitan."
            },

            biological_control: {
                en:
                    "Encourage beneficial insects and soil microbes.",
                ilo:
                    "Guyoguyen dagiti makatulong a insekto ken microbyo ti daga babaen ti panagusar ti oraganico nga abono.",
                tl:
                    "Hikayatin ang mga kapaki-pakinabang na insekto at mikrobyo sa lupa."
            },

            chemical_control: {
                en:
                    "No chemical control needed for healthy crops.",
                ilo:
                    "Saanen a kasapulan ti agusar ti kemikal no makita a nasalun-at dagiti mula",
                tl:
                    "Walang kailangang kemikal kung malusog ang pananim."
            }
        },

        "Brown Spot": {
            advice: {
                en:
                    "Use resistant varieties, apply balanced fertilizer, and act early when symptoms appear.",
                ilo:
                    "Usaren dagiti barayti nga narigat nga makapetan ti sakit, aggikabil iti usto ken balanse nga abono, ken siguden no adda makita nga sintomas .",
                tl:
                    "Gumamit ng matibay sa sakit na binhi, magbigay ng balanseng pataba, at agad na kumilos kapag may nakitang sintomas."
            },

            cultural_control: {
                en:
                    "Improve drainage, avoid excessive nitrogen fertilizer, maintain proper plant spacing, and use clean treated seeds.",
                ilo:
                    "Simpaen ti pagnaan ti danum, liklikan ti nasobra nga nitrogen fertilizer, ken pagnaed ti husto nga distansia dagiti mula.",
                tl:
                    "Ayusin ang daluyan ng tubig, iwasan ang sobrang nitrogen na pataba, at panatilihin ang tamang pagitan ng mga tanim."
            },

            biological_control: {
                en:
                    "Apply beneficial microbes like Trichoderma or Bacillus as preventive treatment.",
                ilo:
                    "Mangikabil iti nasayaat a mikrobyo kas iti Trichoderma wenno Bacillus tapno maka iwas iti sakit.",
                tl:
                    "Maglagay ng mga kapaki-pakinabang na mikrobyo tulad ng Trichoderma o Bacillus bilang pang-iwas sa sakit"
            },

            chemical_control: {
                en:
                    "Use fungicides such as Mancozeb, Propiconazole, or Azoxystrobin at early signs and repeat every 7–14 days if needed.",
                ilo:
                    "Ag-spray iti fungicide kas iti Mancozeb, Propiconazole, wenno Azoxystrobin iti umuna a pinakakita iti senyales ti sakit ken uliten kada 7–14 aldaw no kasapulan.",
                tl:
                    "Mag-spray ng fungicide tulad ng Mancozeb, Propiconazole, o Azoxystrobin sa unang senyales ng sakit at ulitin kada 7–14 araw kung kinakailangan."
            }
        }
    };

    const LANGUAGE_LABELS = {
        en:
            "English",
        ilo:
            "Ilocano",
        tl:
            "Tagalog"
    };

    const elements = {
        loading:
            document.getElementById(
                "detailLoading"
            ),

        error:
            document.getElementById(
                "detailError"
            ),

        errorText:
            document.getElementById(
                "detailErrorText"
            ),

        result:
            document.getElementById(
                "predictionResult"
            ),

        recordId:
            document.getElementById(
                "recordId"
            ),

        diseaseCard:
            document.getElementById(
                "diseaseCard"
            ),

        diseaseName:
            document.getElementById(
                "diseaseName"
            ),

        confidence:
            document.getElementById(
                "confidenceValue"
            ),

        confidenceFill:
            document.getElementById(
                "confidenceFill"
            ),

        date:
            document.getElementById(
                "resultDate"
            ),

        location:
            document.getElementById(
                "resultLocation"
            ),

        municipality:
            document.getElementById(
                "resultMunicipality"
            ),

        province:
            document.getElementById(
                "resultProvince"
            ),

        latitude:
            document.getElementById(
                "resultLatitude"
            ),

        longitude:
            document.getElementById(
                "resultLongitude"
            ),

        top3:
            document.getElementById(
                "topPredictionsGrid"
            ),

        language:
            document.getElementById(
                "languageSelect"
            ),

        languageHint:
            document.getElementById(
                "languageHint"
            ),

        general:
            document.getElementById(
                "generalRecommendation"
            ),

        cultural:
            document.getElementById(
                "culturalControl"
            ),

        biological:
            document.getElementById(
                "biologicalControl"
            ),

        chemical:
            document.getElementById(
                "chemicalControl"
            ),

        print:
            document.getElementById(
                "printResultButton"
            )
    };

    let currentPrediction =
        null;

    function showState(
        state
    ) {
        elements.loading.classList.add(
            "hidden"
        );

        elements.error.classList.add(
            "hidden"
        );

        elements.result.classList.add(
            "hidden"
        );

        if (
            state ===
            "loading"
        ) {
            elements.loading.classList.remove(
                "hidden"
            );
        }

        if (
            state ===
            "error"
        ) {
            elements.error.classList.remove(
                "hidden"
            );
        }

        if (
            state ===
            "result"
        ) {
            elements.result.classList.remove(
                "hidden"
            );
        }
    }

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

    function getPredictionId() {
        return new URLSearchParams(
            window.location.search
        ).get(
            "id"
        );
    }

    function getAdvice(
        diseaseName
    ) {
        return (
            DISEASE_ADVICE[
                diseaseName
            ] ||
            {
                advice: {
                    en:
                        "No specific advice available.",
                    ilo:
                        "Awan ti espesipiko a tulong.",
                    tl:
                        "Walang tiyak na payo."
                },

                cultural_control: {
                    en:
                        "N/A",
                    ilo:
                        "Awan ti impormasyon.",
                    tl:
                        "Walang impormasyon."
                },

                biological_control: {
                    en:
                        "N/A",
                    ilo:
                        "Awan ti impormasyon.",
                    tl:
                        "Walang impormasyon."
                },

                chemical_control: {
                    en:
                        "N/A",
                    ilo:
                        "Awan ti impormasyon.",
                    tl:
                        "Walang impormasyon."
                }
            }
        );
    }

    function renderAdvice(
        language
    ) {
        if (!currentPrediction) {
            return;
        }

        const advice =
            getAdvice(
                currentPrediction.disease
            );

        elements.general.textContent =
            advice.advice[
                language
            ];

        elements.cultural.textContent =
            advice.cultural_control[
                language
            ];

        elements.biological.textContent =
            advice.biological_control[
                language
            ];

        elements.chemical.textContent =
            advice.chemical_control[
                language
            ];

        elements.languageHint.textContent =
            `Recommendations are shown in ${
                LANGUAGE_LABELS[
                    language
                ] ||
                "English"
            }.`;
    }

    function renderTop3(
        scores
    ) {
        const safeScores =
            Array.isArray(
                scores
            )
                ? scores
                : [];

        if (
            safeScores.length ===
            0
        ) {
            elements.top3.innerHTML =
                `
                    <div class="empty-scores">
                        Top prediction scores were not stored for this record.
                    </div>
                `;

            return;
        }

        elements.top3.innerHTML =
            safeScores
                .slice(0, 3)
                .map(
                    (
                        item,
                        index
                    ) => {
                        const confidence =
                            Math.max(
                                0,
                                Math.min(
                                    100,
                                    Number(
                                        item.confidence ||
                                        0
                                    )
                                )
                            );

                        return `
                            <article class="top-prediction-item ${
                                index === 0
                                    ? "primary"
                                    : ""
                            }">
                                <div class="prediction-rank">
                                    ${index + 1}
                                </div>

                                <div class="prediction-info">
                                    <strong>
                                        ${escapeHtml(
                                            item.disease ||
                                            item.class_name ||
                                            "Unknown"
                                        )}
                                    </strong>

                                    <span>
                                        ${confidence.toFixed(2)}%
                                    </span>
                                </div>

                                <div class="mini-confidence-track">
                                    <div
                                        class="mini-confidence-fill"
                                        style="width:${confidence.toFixed(2)}%"
                                    ></div>
                                </div>
                            </article>
                        `;
                    }
                )
                .join("");
    }

    function coordinateValue(
        value
    ) {
        const number =
            Number(value);

        return Number.isFinite(
            number
        )
            ? number.toFixed(6)
            : "Not recorded";
    }

    function renderPrediction(
        prediction
    ) {
        currentPrediction =
            prediction;

        const confidence =
            Math.max(
                0,
                Math.min(
                    100,
                    Number(
                        prediction.confidence ||
                        0
                    )
                )
            );

        const isHealthy =
            prediction.disease ===
            "Healthy Rice Plant";

        elements.recordId.textContent =
            prediction.id ||
            "—";

        elements.diseaseName.textContent =
            prediction.disease ||
            "Unknown";

        elements.confidence.textContent =
            `${confidence.toFixed(2)}%`;

        elements.confidenceFill.style.width =
            `${confidence.toFixed(2)}%`;

        elements.diseaseCard.classList.toggle(
            "healthy",
            isHealthy
        );

        const icon =
            elements.diseaseCard
                .querySelector(
                    ".disease-icon"
                );

        const label =
            elements.diseaseCard
                .querySelector(
                    ".card-label"
                );

        if (icon) {
            icon.textContent =
                isHealthy
                    ? "🌿"
                    : "🩺";
        }

        if (label) {
            label.textContent =
                isHealthy
                    ? "Plant Status"
                    : "Detected Disease";
        }

        elements.date.textContent =
            prediction.display_date ||
            "Not recorded";

        elements.location.textContent =
            prediction.location ||
            "Location not recorded";

        elements.municipality.textContent =
            prediction.municipality ||
            "Not recorded";

        elements.province.textContent =
            prediction.province ||
            "Not recorded";

        elements.latitude.textContent =
            coordinateValue(
                prediction.latitude
            );

        elements.longitude.textContent =
            coordinateValue(
                prediction.longitude
            );

        renderTop3(
            prediction.top3
        );

        renderAdvice(
            elements.language.value ||
            "en"
        );

        showState(
            "result"
        );
    }

    async function loadPrediction() {
        const predictionId =
            getPredictionId();

        if (!predictionId) {
            elements.errorText.textContent =
                "No prediction record was selected.";

            showState(
                "error"
            );

            return;
        }

        showState(
            "loading"
        );

        try {
            const response =
                await fetch(
                    `${API_BASE}/${encodeURIComponent(predictionId)}`,
                    {
                        credentials:
                            "include",

                        headers: {
                            Accept:
                                "application/json",

                            "X-Requested-With":
                                "XMLHttpRequest"
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
                    `Unable to load prediction (${response.status}).`
                );
            }

            if (
                !payload.prediction
            ) {
                throw new Error(
                    "Prediction data was not returned."
                );
            }

            renderPrediction(
                payload.prediction
            );

        } catch (error) {
            console.error(
                "Prediction detail error:",
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

    elements.language.addEventListener(
        "change",
        () => {
            renderAdvice(
                elements.language.value
            );
        }
    );

    elements.print.addEventListener(
        "click",
        () => {
            window.print();
        }
    );

    loadPrediction();
})();
