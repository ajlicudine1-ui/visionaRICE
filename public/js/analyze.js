// =====================================================
// VISIONARICE ANALYZE
// Camera + Crop + Location + TFLite Prediction
// =====================================================

// =====================================================
// MODEL CONFIG
// =====================================================

const MODEL_URL =
    '/models/rice_resnet50_brownspot_float32.tflite';

const CLASS_URL =
    '/models/class_indices.json';

const IMAGE_SIZE = 224;

const MODEL_SESSION_KEY =
    'visionarice_model_loaded';

// =====================================================
// MODEL VARIABLES
// =====================================================

let tfliteModel = null;
let classIndices = null;
let indexToClass = {};
let modelReady = false;

// =====================================================
// IMAGE VARIABLES
// =====================================================

let selectedFile = null;
let originalFile = null;
let cropper = null;

// =====================================================
// LOCATION VARIABLES
// =====================================================

let selectedLocation = null;
let pendingAnalyze = false;

// =====================================================
// ELEMENTS
// =====================================================

const galleryInput =
    document.getElementById('galleryInput');

const cameraInput =
    document.getElementById('cameraInput');

const galleryButton =
    document.getElementById('galleryButton');

const cameraButton =
    document.getElementById('cameraButton');

const emptyUpload =
    document.getElementById('emptyUpload');

let previewContainer =
    document.getElementById('previewContainer') ||
    document.getElementById('previewBox');

let imagePreview =
    document.getElementById('imagePreview');

const selectedFileName =
    document.getElementById('selectedFileName');

const analyzeButton =
    document.getElementById('analyzeButton');

const removeImageButton =
    document.getElementById('removeImageButton');

const editCropButton =
    document.getElementById('editCropButton');

const messageCard =
    document.getElementById('messageCard');

const messageTitle =
    document.getElementById('messageTitle');

const messageText =
    document.getElementById('messageText');

const analysisLoading =
    document.getElementById('analysisLoading');

const locationModal =
    document.getElementById('locationModal');

const manualLocationModal =
    document.getElementById('manualLocationModal');

const cropModal =
    document.getElementById('cropModal');

const cropImage =
    document.getElementById('cropImage');

const locationSummary =
    document.getElementById('locationSummary');

const locationSummaryText =
    document.getElementById('locationSummaryText');

const savedLocationButton =
    document.getElementById('savedLocationButton');

const savedLocationHint =
    document.getElementById('savedLocationHint');

// =====================================================
// RESULT PANEL RESET HELPER
// =====================================================

function hidePredictionResultPanel() {
    const resultPanel =
        document.getElementById(
            'predictionResultPanel'
        );

    if (resultPanel) {
        resultPanel.classList.add(
            'hidden'
        );

        resultPanel.innerHTML =
            '';
    }

    latestResult =
        null;

    if (analyzeButton) {
        analyzeButton.dataset.mode =
            'analyze';

        analyzeButton.innerHTML =
            '✦ Analyze Image';
    }
}

// =====================================================
// REMOVE OLD PREVIEW LABEL
// =====================================================

function removeOldPreviewLabel() {
    document
        .querySelectorAll(
            '.preview-overlay, .visionarice-preview-badge'
        )
        .forEach(
            element => {
                element.style.display =
                    'none';

                element.setAttribute(
                    'aria-hidden',
                    'true'
                );
            }
        );
}

// =====================================================
// HARD REMOVE "IMAGE READY" LABEL
// Deletes any legacy badge/overlay from the upload preview.
// =====================================================

function hardRemoveImageReadyLabels() {
    const uploadZone =
        document.getElementById(
            'uploadZone'
        );

    if (!uploadZone) {
        return;
    }

    const candidates =
        uploadZone.querySelectorAll(
            '*'
        );

    candidates.forEach(
        element => {
            const text =
                (
                    element.textContent ||
                    ''
                )
                .replace(/\s+/g, ' ')
                .trim()
                .toLowerCase();

            if (
                text === 'image ready' ||
                text === '🌿 image ready' ||
                text === 'ready to analyze' ||
                text === '🌿 ready to analyze'
            ) {
                // Do not remove the actual image or preview wrapper.
                if (
                    element.id !== 'imagePreview' &&
                    element.id !== 'previewContainer' &&
                    element.id !== 'previewBox'
                ) {
                    element.remove();
                }
            }
        }
    );
}

function watchForLegacyPreviewLabels() {
    const uploadZone =
        document.getElementById(
            'uploadZone'
        );

    if (!uploadZone) {
        return;
    }

    hardRemoveImageReadyLabels();

    const observer =
        new MutationObserver(
            () => {
                hardRemoveImageReadyLabels();
            }
        );

    observer.observe(
        uploadZone,
        {
            childList: true,
            subtree: true,
            characterData: true
        }
    );
}

// =====================================================
// ROBUST IMAGE PREVIEW
// Supports both previewContainer and older previewBox markup.
// If neither exists, it creates a preview layer inside uploadZone.
// =====================================================

function ensureImagePreviewUI() {
    const uploadZone =
        document.getElementById(
            'uploadZone'
        );

    if (!uploadZone) {
        return false;
    }

    previewContainer =
        document.getElementById(
            'previewContainer'
        ) ||
        document.getElementById(
            'previewBox'
        );

    imagePreview =
        document.getElementById(
            'imagePreview'
        );

    if (!previewContainer) {
        previewContainer =
            document.createElement(
                'div'
            );

        previewContainer.id =
            'previewContainer';

        previewContainer.className =
            'preview-container';

        uploadZone.appendChild(
            previewContainer
        );
    }

    if (!imagePreview) {
        imagePreview =
            document.createElement(
                'img'
            );

        imagePreview.id =
            'imagePreview';

        imagePreview.alt =
            'Selected rice leaf preview';

        previewContainer.appendChild(
            imagePreview
        );
    } else if (
        imagePreview.parentElement !==
        previewContainer
    ) {
        previewContainer.appendChild(
            imagePreview
        );
    }

    if (
        !previewContainer.querySelector(
            '.visionarice-preview-badge'
        )
    ) {
        const badge =
            document.createElement(
                'div'
            );

        badge.className =
            'visionarice-preview-badge';

        

        previewContainer.appendChild(
            badge
        );
    }

    return true;
}

function showSelectedImagePreview(
    source
) {
    hardRemoveImageReadyLabels();

    removeOldPreviewLabel();

    if (!ensureImagePreviewUI()) {
        console.error(
            'Upload zone not found.'
        );
        return;
    }

    if (emptyUpload) {
        emptyUpload.style.display =
            'none';
    }

    imagePreview.src =
        source;

    imagePreview.style.display =
        'block';

    previewContainer.classList.add(
        'active'
    );

    previewContainer.classList.remove(
        'hidden'
    );

    previewContainer.style.display =
        'flex';
}

function hideSelectedImagePreview() {
    if (previewContainer) {
        previewContainer.classList.remove(
            'active'
        );

        previewContainer.classList.add(
            'hidden'
        );

        previewContainer.style.display =
            'none';
    }

    if (imagePreview) {
        imagePreview.src = '';
        imagePreview.style.display =
            'none';
    }
}

// =====================================================
// MODEL INITIALIZATION
// =====================================================

async function loadVisionariceModel() {
    const modelWasLoadedBefore =
        sessionStorage.getItem(
            MODEL_SESSION_KEY
        ) === 'true';

    try {
        // Only show the large loading notice on the first
        // Analyze visit in the current browser session.
        if (!modelWasLoadedBefore) {
            showMessage(
                'Loading AI Model',
                'Preparing the VISIONARICE disease detection model...'
            );
        } else {
            hideMessage();
        }

        if (typeof window.tf === 'undefined') {
            throw new Error(
                'TensorFlow.js did not load. Check the tfjs script tags in analyze.html.'
            );
        }

        if (typeof window.tflite === 'undefined') {
            throw new Error(
                'TensorFlow Lite runtime did not load. Check the tfjs-tflite script tag.'
            );
        }

        await window.tf.setBackend('cpu');
        await window.tf.ready();

        const classResponse =
            await fetch(CLASS_URL);

        if (!classResponse.ok) {
            throw new Error(
                'Unable to load class_indices.json'
            );
        }

        classIndices =
            await classResponse.json();

        indexToClass = {};

        for (const [className, index] of Object.entries(classIndices)) {
            indexToClass[index] = className;
        }

        tfliteModel =
            await window.tflite.loadTFLiteModel(
                MODEL_URL
            );

        modelReady = true;

        sessionStorage.setItem(
            MODEL_SESSION_KEY,
            'true'
        );

        hideMessage();

        console.log(
            'VISIONARICE model loaded successfully.'
        );

        console.log(
            'Classes:',
            indexToClass
        );

    } catch (error) {
        console.error(
            'Model loading error:',
            error
        );

        modelReady = false;

        sessionStorage.removeItem(
            MODEL_SESSION_KEY
        );

        showMessage(
            'Model Loading Failed',
            error.message ||
            'Unable to load the VISIONARICE AI model.'
        );
    }
}

// =====================================================
// CAMERA
// =====================================================

cameraButton.addEventListener(
    'click',
    () => {
        cameraInput.click();
    }
);

cameraInput.addEventListener(
    'change',
    () => {
        const file =
            cameraInput.files[0];

        if (file) {
            prepareImage(file);
        }
    }
);

// =====================================================
// GALLERY
// =====================================================

galleryButton.addEventListener(
    'click',
    () => {
        galleryInput.click();
    }
);

galleryInput.addEventListener(
    'change',
    () => {
        const file =
            galleryInput.files[0];

        if (file) {
            prepareImage(file);
        }
    }
);

// =====================================================
// PREPARE IMAGE
// =====================================================

function prepareImage(file) {
    hideMessage();

    if (
        !file.type.startsWith('image/')
    ) {
        showMessage(
            'Invalid Image',
            'Please select a valid image file.'
        );

        return;
    }

    if (
        file.size >
        10 * 1024 * 1024
    ) {
        showMessage(
            'Image Too Large',
            'Please choose an image smaller than 10 MB.'
        );

        return;
    }

    originalFile = file;

    const reader =
        new FileReader();

    reader.onload =
        event => {
            openCropModal(
                event.target.result
            );
        };

    reader.readAsDataURL(file);
}

// =====================================================
// CROP
// =====================================================

function openCropModal(src) {
    if (!cropModal || !cropImage) {
        showMessage(
            'Crop Window Error',
            'The crop interface could not be opened.'
        );
        return;
    }

    cropImage.src = src;
    cropModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }

        if (typeof Cropper === 'undefined') {
            showMessage(
                'Crop Tool Not Loaded',
                'Cropper.js was not loaded correctly.'
            );
            return;
        }

        cropper = new Cropper(
            cropImage,
            {
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 0.85,
                responsive: true,
                background: false,
                checkOrientation: true,
                movable: true,
                zoomable: true,
                rotatable: true,
                scalable: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false
            }
        );

        console.log('Cropper initialized.');
    }, 150);
}

function closeCropModal() {
    if (cropModal) {
        cropModal.classList.add('hidden');
    }

    document.body.style.overflow = '';

    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
}

// =====================================================
// APPLY CROP
// =====================================================

const applyCropButton =
    document.getElementById(
        'applyCropButton'
    );

async function applyCrop() {
    console.log('Apply Crop clicked.');

    if (!cropper) {
        showMessage(
            'Crop Tool Not Ready',
            'The crop tool is still loading. Please wait a moment and try again.'
        );
        return;
    }

    try {
        if (applyCropButton) {
            applyCropButton.disabled = true;
            applyCropButton.textContent = 'Applying...';
        }

        const canvas =
            cropper.getCroppedCanvas(
                {
                    maxWidth: 1600,
                    maxHeight: 1600,
                    imageSmoothingEnabled: true,
                    imageSmoothingQuality: 'high',
                    fillColor: '#ffffff'
                }
            );

        if (!canvas) {
            throw new Error(
                'Unable to create cropped image canvas.'
            );
        }

        // Convert BEFORE destroying Cropper.
        const dataUrl =
            canvas.toDataURL(
                'image/jpeg',
                0.92
            );

        const response =
            await fetch(dataUrl);

        const blob =
            await response.blob();

        const baseName =
            (
                originalFile?.name ||
                selectedFile?.name ||
                'rice-leaf'
            ).replace(
                /\.[^/.]+$/,
                ''
            );

        selectedFile =
            new File(
                [blob],
                `${baseName}-cropped.jpg`,
                {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                }
            );

        showSelectedImagePreview(
            dataUrl
        );

        if (selectedFileName) {
            selectedFileName.textContent =
                selectedFile.name;
        }

        if (analyzeButton) {
            analyzeButton.disabled =
                false;

            analyzeButton.innerHTML =
                '✦ Analyze Image';

            analyzeButton.dataset.mode =
                'analyze';
        }

        // Close AFTER all preview updates are finished.
        closeCropModal();

        console.log(
            'Crop applied successfully:',
            selectedFile.name
        );

    } catch (error) {
        console.error(
            'Apply crop error:',
            error
        );

        showMessage(
            'Crop Failed',
            error.message ||
            'Unable to apply the crop. Please try again.'
        );

    } finally {
        if (applyCropButton) {
            applyCropButton.disabled =
                false;

            applyCropButton.textContent =
                'Apply Crop';
        }
    }
}

if (applyCropButton) {
    applyCropButton.type =
        'button';

    applyCropButton.addEventListener(
        'click',
        applyCrop
    );
} else {
    console.error(
        'applyCropButton element not found.'
    );
}

// =====================================================
// CROP CONTROLS
// =====================================================

document
    .getElementById(
        'cropCancelButton'
    )
    .addEventListener(
        'click',
        closeCropModal
    );

document
    .getElementById(
        'cropCloseButton'
    )
    .addEventListener(
        'click',
        closeCropModal
    );

document
    .getElementById(
        'rotateLeftButton'
    )
    .addEventListener(
        'click',
        () => {
            cropper?.rotate(-90);
        }
    );

document
    .getElementById(
        'zoomOutButton'
    )
    .addEventListener(
        'click',
        () => {
            cropper?.zoom(-0.1);
        }
    );

document
    .getElementById(
        'zoomInButton'
    )
    .addEventListener(
        'click',
        () => {
            cropper?.zoom(0.1);
        }
    );

document
    .getElementById(
        'resetCropButton'
    )
    .addEventListener(
        'click',
        () => {
            cropper?.reset();
        }
    );

editCropButton.addEventListener(
    'click',
    () => {
        hideMessage();

        const fileToCrop =
            selectedFile ||
            originalFile;

        if (!fileToCrop) {
            showMessage(
                'No Image Selected',
                'Please select or capture an image first.'
            );
            return;
        }

        const reader =
            new FileReader();

        reader.onload =
            event => {
                openCropModal(
                    event.target.result
                );
            };

        reader.onerror =
            () => {
                showMessage(
                    'Unable to Open Image',
                    'The selected image could not be loaded for cropping.'
                );
            };

        reader.readAsDataURL(
            fileToCrop
        );
    }
);

// =====================================================
// REMOVE IMAGE
// =====================================================

removeImageButton.addEventListener(
    'click',
    () => {
        selectedFile = null;
        originalFile = null;

        galleryInput.value = '';
        cameraInput.value = '';

        hideSelectedImagePreview();

        if (emptyUpload) {
            emptyUpload.style.display =
                'flex';
        }

        selectedFileName.textContent =
            'No image selected';

        analyzeButton.disabled =
            true;

        analyzeButton.innerHTML =
            '✦ Analyze Image';

        analyzeButton.dataset.mode =
            'analyze';

        selectedLocation = null;

        hidePredictionResultPanel();

        locationSummary
            .classList
            .add(
                'hidden'
            );

        hideMessage();
    }
);

// =====================================================
// ANALYZE BUTTON
// =====================================================

analyzeButton.addEventListener(
    'click',
    () => {
        if (
            analyzeButton.dataset.mode ===
            'reset'
        ) {
            resetForAnotherAnalysis();
            return;
        }

        if (!selectedFile) {
            showMessage(
                'No Image Selected',
                'Capture or select a rice leaf image first.'
            );

            return;
        }

        if (!modelReady) {
            showMessage(
                'AI Model Not Ready',
                'Please wait for the disease detection model to finish loading.'
            );

            return;
        }

        pendingAnalyze = true;

        removeOldPreviewLabel();
watchForLegacyPreviewLabels();
refreshSavedLocationButton();

        locationModal
            .classList
            .remove(
                'hidden'
            );
    }
);

// =====================================================
// REVERSE GEOCODING
// Converts GPS coordinates into a readable address.
// =====================================================

async function reverseGeocodeLocation(
    latitude,
    longitude
) {
    try {
        const url =
            'https://nominatim.openstreetmap.org/reverse' +
            `?format=jsonv2&lat=${encodeURIComponent(latitude)}` +
            `&lon=${encodeURIComponent(longitude)}` +
            '&zoom=18&addressdetails=1&accept-language=en';

        const response =
            await fetch(
                url,
                {
                    headers: {
                        'Accept':
                            'application/json'
                    }
                }
            );

        if (!response.ok) {
            throw new Error(
                'Reverse geocoding request failed.'
            );
        }

        const data =
            await response.json();

        if (
            data &&
            data.display_name
        ) {
            return data.display_name;
        }

        return null;

    } catch (error) {
        console.warn(
            'Reverse geocoding failed:',
            error
        );

        return null;
    }
}

// =====================================================
// CURRENT LOCATION
// =====================================================

document
    .getElementById(
        'currentLocationButton'
    )
    .addEventListener(
        'click',
        () => {
            if (
                !navigator.geolocation
            ) {
                closeLocationModal();

                showMessage(
                    'Location Not Supported',
                    'This browser does not support location services.'
                );

                return;
            }

            navigator.geolocation
                .getCurrentPosition(
                    async position => {
                        const latitude =
                            position.coords.latitude;

                        const longitude =
                            position.coords.longitude;

                        const accuracy =
                            position.coords.accuracy;

                        showMessage(
                            'Getting Address',
                            'Converting your GPS coordinates into a readable address...'
                        );

                        const address =
                            await reverseGeocodeLocation(
                                latitude,
                                longitude
                            );

                        selectedLocation = {
                            type:
                                'current',
                            latitude,
                            longitude,
                            accuracy,
                            address:
                                address ||
                                null,
                            label:
                                address ||
                                `Current location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`
                        };

                        hideMessage();

                        applyLocationAndContinue();
                    },

                    error => {
                        closeLocationModal();

                        let message =
                            'Unable to determine your current location.';

                        if (
                            error.code === 1
                        ) {
                            message =
                                'Please allow location access in your browser settings.';
                        }

                        showMessage(
                            'Unable to Get Location',
                            message
                        );
                    },

                    {
                        enableHighAccuracy:
                            true,
                        timeout:
                            12000,
                        maximumAge:
                            30000
                    }
                );
        }
    );

// =====================================================
// PHILIPPINE LOCATION CASCADING DROPDOWNS
// Province -> Municipality / City -> Barangay
// =====================================================

const PSGC_API_BASE =
    'https://psgc.gitlab.io/api';

let manualLocationDropdownsReady =
    false;

async function fetchPSGCData(
    endpoint
) {
    const response =
        await fetch(
            `${PSGC_API_BASE}${endpoint}`
        );

    if (!response.ok) {
        throw new Error(
            'Unable to load Philippine location data.'
        );
    }

    return response.json();
}

function createManualLocationSelect(
    id,
    placeholder
) {
    const select =
        document.createElement(
            'select'
        );

    select.id =
        id;

    select.className =
        'manual-location-select';

    select.innerHTML =
        `<option value="">${placeholder}</option>`;

    return select;
}

function replaceManualInputsWithDropdowns() {
    const provinceInput =
        document.getElementById(
            'provinceInput'
        );

    const municipalityInput =
        document.getElementById(
            'municipalityInput'
        );

    const barangayInput =
        document.getElementById(
            'barangayInput'
        );

    if (
        !provinceInput ||
        !municipalityInput ||
        !barangayInput
    ) {
        return false;
    }

    if (
        document.getElementById(
            'provinceSelect'
        )
    ) {
        return true;
    }

    const provinceSelect =
        createManualLocationSelect(
            'provinceSelect',
            'Select Province'
        );

    const municipalitySelect =
        createManualLocationSelect(
            'municipalitySelect',
            'Select Municipality / City'
        );

    const barangaySelect =
        createManualLocationSelect(
            'barangaySelect',
            'Select Barangay'
        );

    municipalitySelect.disabled =
        true;

    barangaySelect.disabled =
        true;

    provinceInput.replaceWith(
        provinceSelect
    );

    municipalityInput.replaceWith(
        municipalitySelect
    );

    barangayInput.replaceWith(
        barangaySelect
    );

    return true;
}

function populateManualLocationSelect(
    select,
    items,
    placeholder
) {
    select.innerHTML =
        `<option value="">${placeholder}</option>`;

    [...items]
        .sort(
            (a, b) =>
                String(a.name).localeCompare(
                    String(b.name)
                )
        )
        .forEach(
            item => {
                const option =
                    document.createElement(
                        'option'
                    );

                option.value =
                    item.code;

                option.textContent =
                    item.name;

                option.dataset.name =
                    item.name;

                select.appendChild(
                    option
                );
            }
        );
}

function getSelectedLocationName(
    select
) {
    if (
        !select ||
        !select.value
    ) {
        return '';
    }

    const option =
        select.options[
            select.selectedIndex
        ];

    return (
        option?.dataset?.name ||
        option?.textContent ||
        ''
    ).trim();
}

async function setupManualLocationDropdowns() {
    if (
        manualLocationDropdownsReady
    ) {
        return;
    }

    if (
        !replaceManualInputsWithDropdowns()
    ) {
        return;
    }

    const provinceSelect =
        document.getElementById(
            'provinceSelect'
        );

    const municipalitySelect =
        document.getElementById(
            'municipalitySelect'
        );

    const barangaySelect =
        document.getElementById(
            'barangaySelect'
        );

    try {
        provinceSelect.disabled =
            true;

        provinceSelect.innerHTML =
            '<option value="">Loading provinces...</option>';

        const provinces =
            await fetchPSGCData(
                '/provinces/'
            );

        const ILOCOS_REGION_PROVINCES =
            new Set([
                'Ilocos Norte',
                'Ilocos Sur',
                'La Union',
                'Pangasinan'
            ]);

        const ilocosProvinces =
            provinces.filter(
                province =>
                    ILOCOS_REGION_PROVINCES.has(
                        String(
                            province.name
                        ).trim()
                    )
            );

        populateManualLocationSelect(
            provinceSelect,
            ilocosProvinces,
            'Select Province'
        );

        provinceSelect.disabled =
            false;

        provinceSelect.addEventListener(
            'change',
            async () => {
                const provinceCode =
                    provinceSelect.value;

                municipalitySelect.disabled =
                    true;

                barangaySelect.disabled =
                    true;

                municipalitySelect.innerHTML =
                    provinceCode
                        ? '<option value="">Loading municipalities / cities...</option>'
                        : '<option value="">Select Municipality / City</option>';

                barangaySelect.innerHTML =
                    '<option value="">Select Barangay</option>';

                if (!provinceCode) {
                    return;
                }

                try {
                    const places =
                        await fetchPSGCData(
                            `/provinces/${provinceCode}/cities-municipalities/`
                        );

                    populateManualLocationSelect(
                        municipalitySelect,
                        places,
                        'Select Municipality / City'
                    );

                    municipalitySelect.disabled =
                        false;

                } catch (error) {
                    console.error(
                        'Municipality/city loading error:',
                        error
                    );

                    showMessage(
                        'Location Data Error',
                        'Unable to load municipalities/cities. Please check your internet connection.'
                    );
                }
            }
        );

        municipalitySelect.addEventListener(
            'change',
            async () => {
                const municipalityCode =
                    municipalitySelect.value;

                barangaySelect.disabled =
                    true;

                barangaySelect.innerHTML =
                    municipalityCode
                        ? '<option value="">Loading barangays...</option>'
                        : '<option value="">Select Barangay</option>';

                if (!municipalityCode) {
                    return;
                }

                try {
                    const barangays =
                        await fetchPSGCData(
                            `/cities-municipalities/${municipalityCode}/barangays/`
                        );

                    populateManualLocationSelect(
                        barangaySelect,
                        barangays,
                        'Select Barangay'
                    );

                    barangaySelect.disabled =
                        false;

                } catch (error) {
                    console.error(
                        'Barangay loading error:',
                        error
                    );

                    showMessage(
                        'Location Data Error',
                        'Unable to load barangays. Please check your internet connection.'
                    );
                }
            }
        );

        manualLocationDropdownsReady =
            true;

    } catch (error) {
        console.error(
            'Province loading error:',
            error
        );

        provinceSelect.innerHTML =
            '<option value="">Unable to load provinces</option>';

        showMessage(
            'Location Data Error',
            'Unable to load the province list. Please check your internet connection.'
        );
    }
}

// =====================================================
// MANUAL LOCATION
// =====================================================

document
    .getElementById(
        'manualLocationButton'
    )
    .addEventListener(
        'click',
        async () => {
            locationModal
                .classList
                .add(
                    'hidden'
                );

            manualLocationModal
                .classList
                .remove(
                    'hidden'
                );

            await setupManualLocationDropdowns();
        }
    );

document
    .getElementById(
        'manualUseButton'
    )
    .addEventListener(
        'click',
        () => {
            const provinceSelect =
                document.getElementById(
                    'provinceSelect'
                );

            const municipalitySelect =
                document.getElementById(
                    'municipalitySelect'
                );

            const barangaySelect =
                document.getElementById(
                    'barangaySelect'
                );

            const province =
                getSelectedLocationName(
                    provinceSelect
                );

            const municipality =
                getSelectedLocationName(
                    municipalitySelect
                );

            const barangay =
                getSelectedLocationName(
                    barangaySelect
                );

            if (
                !province ||
                !municipality ||
                !barangay
            ) {
                showMessage(
                    'Incomplete Location',
                    'Please select a province, municipality/city, and barangay.'
                );

                return;
            }

            selectedLocation = {
                type:
                    'manual',
                province,
                municipality,
                barangay,
                province_code:
                    provinceSelect.value,
                municipality_code:
                    municipalitySelect.value,
                barangay_code:
                    barangaySelect.value,
                latitude:
                    null,
                longitude:
                    null,
                label:
                    `${barangay}, ${municipality}, ${province}`
            };

            const shouldSave =
                document
                    .getElementById(
                        'saveLocationCheckbox'
                    )
                    .checked;

            if (shouldSave) {
                localStorage.setItem(
                    'visionarice_saved_location',
                    JSON.stringify(
                        selectedLocation
                    )
                );

                refreshSavedLocationButton();
            }

            manualLocationModal
                .classList
                .add(
                    'hidden'
                );

            applyLocationAndContinue();
        }
    );

// =====================================================
// SAVED LOCATION
// =====================================================

savedLocationButton.addEventListener(
    'click',
    () => {
        const saved =
            getSavedLocation();

        if (!saved) {
            return;
        }

        selectedLocation = {
            ...saved,
            type:
                'saved'
        };

        applyLocationAndContinue();
    }
);

// =====================================================
// CHANGE LOCATION
// =====================================================

document
    .getElementById(
        'changeLocationButton'
    )
    .addEventListener(
        'click',
        () => {
            pendingAnalyze =
                false;

            refreshSavedLocationButton();

            locationModal
                .classList
                .remove(
                    'hidden'
                );
        }
    );

// =====================================================
// LOCATION MODAL CLOSE
// =====================================================

function closeLocationModal() {
    locationModal
        .classList
        .add(
            'hidden'
        );

    pendingAnalyze =
        false;
}

document
    .getElementById(
        'locationCloseButton'
    )
    .addEventListener(
        'click',
        closeLocationModal
    );

document
    .getElementById(
        'cancelLocationButton'
    )
    .addEventListener(
        'click',
        closeLocationModal
    );

function closeManualLocation() {
    manualLocationModal
        .classList
        .add(
            'hidden'
        );

    if (pendingAnalyze) {
        locationModal
            .classList
            .remove(
                'hidden'
            );
    }
}

document
    .getElementById(
        'manualLocationCloseButton'
    )
    .addEventListener(
        'click',
        closeManualLocation
    );

document
    .getElementById(
        'manualCancelButton'
    )
    .addEventListener(
        'click',
        closeManualLocation
    );

// =====================================================
// SAVED LOCATION HELPERS
// =====================================================

function getSavedLocation() {
    try {
        return JSON.parse(
            localStorage.getItem(
                'visionarice_saved_location'
            )
        );
    } catch {
        return null;
    }
}

function refreshSavedLocationButton() {
    const saved =
        getSavedLocation();

    if (saved) {
        savedLocationButton.disabled =
            false;

        savedLocationHint.textContent =
            saved.label;
    } else {
        savedLocationButton.disabled =
            true;

        savedLocationHint.textContent =
            'No saved location yet';
    }
}

// =====================================================
// LOCATION SELECTED
// =====================================================

function applyLocationAndContinue() {
    locationModal
        .classList
        .add(
            'hidden'
        );

    locationSummaryText.textContent =
        selectedLocation.label;

    locationSummary
        .classList
        .remove(
            'hidden'
        );

    if (pendingAnalyze) {
        pendingAnalyze = false;
        startAnalysis();
    }
}

// =====================================================
// TFLITE IMAGE PREPROCESSING
// =====================================================

async function createInputTensor(file) {
    const bitmap =
        await createImageBitmap(
            file
        );

    const canvas =
        document.createElement(
            'canvas'
        );

    canvas.width =
        IMAGE_SIZE;

    canvas.height =
        IMAGE_SIZE;

    const ctx =
        canvas.getContext(
            '2d'
        );

    ctx.drawImage(
        bitmap,
        0,
        0,
        IMAGE_SIZE,
        IMAGE_SIZE
    );

    bitmap.close();

    return window.tf.tidy(
        () => {
            // fromPixels returns an int32 tensor in this runtime.
            // Cast explicitly to float32 instead of using ,
            // because this TFJS build does not expose Tensor.
            const imageTensor =
                window.tf.browser
                    .fromPixels(
                        canvas,
                        3
                    );

            const floatTensor =
                window.tf.cast(
                    imageTensor,
                    'float32'
                );

            // Training preprocessing:
            // ImageDataGenerator(rescale=1./255)
            const normalized =
                window.tf.div(
                    floatTensor,
                    255.0
                );

            const batched =
                window.tf.expandDims(
                    normalized,
                    0
                );

            return batched;
        }
    );
}

// =====================================================
// RUN MODEL
// =====================================================

async function predictRiceDisease(
    file
) {
    const inputTensor =
        await createInputTensor(
            file
        );

    let outputTensor = null;

    try {
        outputTensor =
            tfliteModel.predict(
                inputTensor
            );

        if (
            Array.isArray(
                outputTensor
            )
        ) {
            outputTensor =
                outputTensor[0];
        }

        const rawScores =
            Array.from(
                await outputTensor.data()
            );

        const predictions =
            rawScores.map(
                (
                    score,
                    index
                ) => {
                    return {
                        index,
                        className:
                            indexToClass[index],
                        score:
                            Number(score)
                    };
                }
            );

        predictions.sort(
            (
                a,
                b
            ) =>
                b.score -
                a.score
        );

        return predictions;

    } finally {
        inputTensor.dispose();

        if (
            outputTensor &&
            typeof outputTensor.dispose ===
            'function'
        ) {
            outputTensor.dispose();
        }
    }
}

// =====================================================
// START ANALYSIS
// =====================================================

async function startAnalysis() {
    hideMessage();

    analysisLoading
        .classList
        .remove(
            'hidden'
        );

    analyzeButton.disabled =
        true;

    analyzeButton.textContent =
        'Analyzing...';

    try {
        const predictions =
            await predictRiceDisease(
                selectedFile
            );

        const topPrediction =
            predictions[0];

        const top3 =
            predictions.slice(
                0,
                3
            );

        await handlePredictionResult(
            topPrediction,
            top3
        );

    } catch (error) {
        console.error(
            'Prediction error:',
            error
        );

        showMessage(
            'Analysis Failed',
            error.message ||
            'Unable to analyze the image.'
        );

    } finally {
        analysisLoading
            .classList
            .add(
                'hidden'
            );

        analyzeButton.disabled =
            false;

        analyzeButton.innerHTML =
            '✦ Analyze Image';
    }
}


// =====================================================
// RESULT UI + DISEASE ADVICE
// Mirrors the content used in the previous Python/Django backend.
// =====================================================

const DISEASE_ADVICE = {
    'Leaf Blast': {
        advice: {
            en: 'Apply appropriate fungicides and manage water properly.',
            ilo: 'Usaren dagiti umiso a fungicide ken aywanan ti pannakausar ti danum.',
            tl: 'Gumamit ng angkop na fungicide at pamahalaan nang maayos ang tubig.'
        },
        cultural_control: {
            en: 'Avoid excessive nitrogen and maintain proper spacing.',
            ilo: 'Liklikan ti sobra a nitrogen ken mentinaren ti usto a distansia ti pinuon ti pagay.',
            tl: 'Iwasan ang labis na nitrogen at panatilihin ang tamang pagitan.'
        },
        biological_control: {
            en: 'Use Trichoderma or Pseudomonas fluorescens as seed treatment.',
            ilo: 'Agusar ti Trichoderma wenno Pseudomonas fluorescens a pamprotektar kadagiti bin-i.',
            tl: 'Gumamit ng Trichoderma o Pseudomonas fluorescens bilang paggamot sa binhi.'
        },
        chemical_control: {
            en: 'Apply tricyclazole or isoprothiolane at early infection stage.',
            ilo: 'Agusar ti tricyclazole wenno isoprothiolane no adda makita a naapektaran a mula nga pagay.',
            tl: 'Maglagay ng tricyclazole o isoprothiolane sa maagang yugto ng impeksyon.'
        }
    },

    'Bacterial Leaf Blight': {
        advice: {
            en: 'Use resistant varieties and avoid excess nitrogen.',
            ilo: 'Liklikan iti panagusar iti ado unay a nitrogen nga abono.',
            tl: 'Gumamit ng mga barayti na lumalaban sa sakit at iwasan ang labis na nitrogen.'
        },
        cultural_control: {
            en: 'Remove infected stubbles and ensure proper field drainage.',
            ilo: 'Ikkaten dagiti naapektaran wenno nagsakit nga pinuon ti pagay ken siguradwen nga nasayaat ti pagibellengan ti danum.',
            tl: 'Tanggalin ang mga nahawaang dayami at tiyakin ang maayos na daluyan ng tubig.'
        },
        biological_control: {
            en: 'Apply beneficial microbes like Bacillus subtilis.',
            ilo: 'Agusar kadagiti makatulong nga mikrubyo kas iti Bacillus Subtilis tapno napintas ti panagdakkel iti pagay ken maliklikan dagiti sakit.',
            tl: 'Gumamit ng mga kapaki-pakinabang na mikrobyo tulad ng Bacillus subtilis.'
        },
        chemical_control: {
            en: 'Spray copper-based bactericides if necessary.',
            ilo: 'Agispray iti copper-based bactericides no kasapulan.',
            tl: 'Mag-spray ng mga bactericide na may halong tanso kung kinakailangan.'
        }
    },

    'Healthy Rice Plant': {
        advice: {
            en: 'Continue regular care.',
            ilo: 'Ituloy ti regular a panangaywan.',
            tl: 'Ipagpatuloy ang regular na pangangalaga.'
        },
        cultural_control: {
            en: 'Maintain good irrigation and proper spacing.',
            ilo: 'Mentenaren ti nasayaat nga irigasyon ken umno nga espasyo iti pagay',
            tl: 'Panatilihin ang tamang irigasyon at pagitan.'
        },
        biological_control: {
            en: 'Encourage beneficial insects and soil microbes.',
            ilo: 'Guyoguyen dagiti makatulong a insekto ken microbyo ti daga babaen ti panagusar ti oraganico nga abono.',
            tl: 'Hikayatin ang mga kapaki-pakinabang na insekto at mikrobyo sa lupa.'
        },
        chemical_control: {
            en: 'No chemical control needed for healthy crops.',
            ilo: 'Saanen a kasapulan ti agusar ti kemikal no makita a nasalun-at dagiti mula',
            tl: 'Walang kailangang kemikal kung malusog ang pananim.'
        }
    },

    'Brown Spot': {
        advice: {
            en: 'Use resistant varieties, apply balanced fertilizer, and act early when symptoms appear.',
            ilo: 'Usaren dagiti barayti nga narigat nga makapetan ti sakit, aggikabil iti usto ken balanse nga abono, ken siguden no adda makita nga sintomas .',
            tl: 'Gumamit ng matibay sa sakit na binhi, magbigay ng balanseng pataba, at agad na kumilos kapag may nakitang sintomas.'
        },
        cultural_control: {
            en: 'Improve drainage, avoid excessive nitrogen fertilizer, maintain proper plant spacing, and use clean treated seeds.',
            ilo: 'Simpaen ti pagnaan ti danum, liklikan ti nasobra nga nitrogen fertilizer, ken pagnaed ti husto nga distansia dagiti mula.',
            tl: 'Ayusin ang daluyan ng tubig, iwasan ang sobrang nitrogen na pataba, at panatilihin ang tamang pagitan ng mga tanim.'
        },
        biological_control: {
            en: 'Apply beneficial microbes like Trichoderma or Bacillus as preventive treatment.',
            ilo: 'Mangikabil iti nasayaat a mikrobyo kas iti Trichoderma wenno Bacillus tapno maka iwas iti sakit.',
            tl: 'Maglagay ng mga kapaki-pakinabang na mikrobyo tulad ng Trichoderma o Bacillus bilang pang-iwas sa sakit'
        },
        chemical_control: {
            en: 'Use fungicides such as Mancozeb, Propiconazole, or Azoxystrobin at early signs and repeat every 7–14 days if needed.',
            ilo: 'Ag-spray iti fungicide kas iti Mancozeb, Propiconazole, wenno Azoxystrobin iti umuna a pinakakita iti senyales ti sakit ken uliten kada 7–14 aldaw no kasapulan.',
            tl: 'Mag-spray ng fungicide tulad ng Mancozeb, Propiconazole, o Azoxystrobin sa unang senyales ng sakit at ulitin kada 7–14 araw kung kinakailangan.'
        }
    }
};

let latestResult = null;

function getResultContainer() {
    let container =
        document.getElementById(
            'predictionResultPanel'
        );

    if (container) {
        return container;
    }

    container =
        document.createElement(
            'section'
        );

    container.id =
        'predictionResultPanel';

    container.className =
        'prediction-result-panel hidden';

    const page =
        document.querySelector(
            '.page'
        ) ||
        document.querySelector(
            'main'
        ) ||
        document.body;

    page.appendChild(
        container
    );

    return container;
}

function getAdviceForDisease(
    diseaseName
) {
    return DISEASE_ADVICE[diseaseName] || {
        advice: {
            en: 'No specific advice available.',
            ilo: 'Awan ti espesipiko a tulong.',
            tl: 'Walang tiyak na payo.'
        },
        cultural_control: {
            en: 'N/A',
            ilo: 'Awan ti impormasyon.',
            tl: 'Walang impormasyon.'
        },
        biological_control: {
            en: 'N/A',
            ilo: 'Awan ti impormasyon.',
            tl: 'Walang impormasyon.'
        },
        chemical_control: {
            en: 'N/A',
            ilo: 'Awan ti impormasyon.',
            tl: 'Walang impormasyon.'
        }
    };
}

function getLanguageLabel(
    language
) {
    const labels = {
        en: 'English',
        ilo: 'Ilocano',
        tl: 'Tagalog'
    };

    return labels[language] ||
        'English';
}

function renderPredictionResult(
    topPrediction,
    top3,
    language = 'en'
) {
    const panel =
        getResultContainer();

    const diseaseName =
        formatClassName(
            topPrediction.className
        );

    const confidence =
        Math.max(
            0,
            Math.min(
                100,
                topPrediction.score *
                100
            )
        );

    const advice =
        getAdviceForDisease(
            diseaseName
        );

    const isHealthy =
        diseaseName ===
        'Healthy Rice Plant';

    const locationLabel =
        selectedLocation?.label ||
        'No location selected';

    const hasCoordinates =
        Number.isFinite(
            Number(
                selectedLocation?.latitude
            )
        ) &&
        Number.isFinite(
            Number(
                selectedLocation?.longitude
            )
        );

    latestResult = {
        topPrediction,
        top3,
        language
    };

    panel.innerHTML = `
        <div class="result-shell">
            <div class="result-header">
                <div>
                    <span class="result-eyebrow">VISIONARICE ANALYSIS</span>
                    <h2>Prediction Result</h2>
                    <p>
                        Analysis completed using the selected rice leaf image.
                    </p>
                </div>

                <button
                    type="button"
                    class="result-reset-button"
                    id="analyzeAgainResultButton"
                >
                    ↻ Analyze Again
                </button>
            </div>

            <div class="result-overview-grid">
                <div class="result-disease-card ${isHealthy ? 'healthy' : ''}">
                    <div class="result-disease-icon">
                        ${isHealthy ? '🌿' : '🩺'}
                    </div>

                    <div class="result-disease-content">
                        <span class="result-card-label">
                            ${isHealthy ? 'Plant Status' : 'Detected Disease'}
                        </span>

                        <h3>${diseaseName}</h3>

                        <div class="confidence-row">
                            <span>Confidence</span>
                            <strong>${confidence.toFixed(2)}%</strong>
                        </div>

                        <div class="confidence-track">
                            <div
                                class="confidence-fill"
                                style="width:${confidence.toFixed(2)}%"
                            ></div>
                        </div>
                    </div>
                </div>

                <div class="result-language-card">
                    <label for="resultLanguageSelect">
                        Language
                    </label>

                    <select id="resultLanguageSelect">
                        <option value="en" ${language === 'en' ? 'selected' : ''}>English</option>
                        <option value="ilo" ${language === 'ilo' ? 'selected' : ''}>Ilocano</option>
                        <option value="tl" ${language === 'tl' ? 'selected' : ''}>Tagalog</option>
                    </select>

                    <small>
                        Recommendations are shown in
                        ${getLanguageLabel(language)}.
                    </small>
                </div>
            </div>

            <div class="result-section">
                <div class="result-section-heading">
                    <span>📊</span>
                    <div>
                        <h3>Top 3 Predictions</h3>
                        <p>The model's three highest confidence scores.</p>
                    </div>
                </div>

                <div class="top-predictions-grid">
                    ${top3.map((item, index) => `
                        <article class="top-prediction-item ${index === 0 ? 'primary' : ''}">
                            <div class="prediction-rank">
                                ${index + 1}
                            </div>

                            <div class="prediction-info">
                                <strong>
                                    ${formatClassName(item.className)}
                                </strong>

                                <span>
                                    ${(item.score * 100).toFixed(2)}%
                                </span>
                            </div>

                            <div class="mini-confidence-track">
                                <div
                                    class="mini-confidence-fill"
                                    style="width:${Math.max(0, Math.min(100, item.score * 100)).toFixed(2)}%"
                                ></div>
                            </div>
                        </article>
                    `).join('')}
                </div>
            </div>

            <div class="result-section">
                <div class="result-section-heading">
                    <span>🌾</span>
                    <div>
                        <h3>Recommended Management</h3>
                        <p>Suggested actions based on the predicted class.</p>
                    </div>
                </div>

                <div class="recommendation-grid">
                    <article class="recommendation-card">
                        <div class="recommendation-icon">✓</div>
                        <div>
                            <span>General Recommendation</span>
                            <p>${advice.advice[language]}</p>
                        </div>
                    </article>

                    <article class="recommendation-card">
                        <div class="recommendation-icon">🌱</div>
                        <div>
                            <span>Cultural Control</span>
                            <p>${advice.cultural_control[language]}</p>
                        </div>
                    </article>

                    <article class="recommendation-card">
                        <div class="recommendation-icon">🧫</div>
                        <div>
                            <span>Biological Control</span>
                            <p>${advice.biological_control[language]}</p>
                        </div>
                    </article>

                    <article class="recommendation-card">
                        <div class="recommendation-icon">🧪</div>
                        <div>
                            <span>Chemical Control</span>
                            <p>${advice.chemical_control[language]}</p>
                        </div>
                    </article>
                </div>
            </div>

            <div class="result-section">
                <div class="result-section-heading">
                    <span>📍</span>
                    <div>
                        <h3>Analysis Location</h3>
                        <p>Location recorded for this scan.</p>
                    </div>
                </div>

                <div class="result-location-card">
                    <div class="result-location-main">
                        <div class="result-location-icon">📍</div>

                        <div class="result-location-copy">
                            <span>Location</span>
                            <strong>${locationLabel}</strong>
                        </div>
                    </div>

                    <div class="result-location-details">
                        ${
                            selectedLocation?.accuracy != null
                            ? `
                                <div class="location-meta">
                                    <span>GPS Accuracy</span>
                                    <strong>
                                        ±${Number(selectedLocation.accuracy).toFixed(0)} m
                                    </strong>
                                </div>
                            `
                            : ''
                        }

                        ${
                            hasCoordinates
                            ? `
                                <div class="location-coordinate-group">
                                    <span>Coordinates</span>
                                    <strong class="location-coordinates">
                                        ${Number(selectedLocation.latitude).toFixed(6)},
                                        ${Number(selectedLocation.longitude).toFixed(6)}
                                    </strong>
                                </div>
                            `
                            : ''
                        }
                    </div>
                </div>

                ${
                    hasCoordinates
                    ? `
                        <div class="prediction-result-map">
                            <iframe
                                title="Analysis location map"
                                src="https://www.openstreetmap.org/export/embed.html?bbox=${
                                    Number(selectedLocation.longitude) - 0.006
                                }%2C${
                                    Number(selectedLocation.latitude) - 0.004
                                }%2C${
                                    Number(selectedLocation.longitude) + 0.006
                                }%2C${
                                    Number(selectedLocation.latitude) + 0.004
                                }&layer=mapnik&marker=${
                                    Number(selectedLocation.latitude)
                                }%2C${
                                    Number(selectedLocation.longitude)
                                }"
                                loading="lazy"
                                referrerpolicy="no-referrer-when-downgrade"
                            ></iframe>
                        </div>
                    `
                    : ''
                }
            </div>

            <div class="result-footer-note">
                <span>ℹ️</span>
                <p>
                    VISIONARICE predictions are decision-support information.
                    Field inspection and agricultural guidance should be considered
                    when symptoms are severe or uncertain.
                </p>
            </div>
        </div>
    `;

    panel.classList.remove(
        'hidden'
    );

    const languageSelect =
        document.getElementById(
            'resultLanguageSelect'
        );

    if (languageSelect) {
        languageSelect.addEventListener(
            'change',
            event => {
                renderPredictionResult(
                    topPrediction,
                    top3,
                    event.target.value
                );
            }
        );
    }

    const analyzeAgainButton =
        document.getElementById(
            'analyzeAgainResultButton'
        );

    if (analyzeAgainButton) {
        analyzeAgainButton.addEventListener(
            'click',
            resetForAnotherAnalysis
        );
    }

    if (analyzeButton) {
        analyzeButton.disabled =
            false;

        analyzeButton.innerHTML =
            '↻ Analyze Again';

        analyzeButton.dataset.mode =
            'reset';
    }

    panel.scrollIntoView(
        {
            behavior: 'smooth',
            block: 'start'
        }
    );
}

function resetForAnotherAnalysis() {
    hidePredictionResultPanel();

    selectedFile = null;
    originalFile = null;
    selectedLocation = null;

    if (galleryInput) {
        galleryInput.value = '';
    }

    if (cameraInput) {
        cameraInput.value = '';
    }

    hideSelectedImagePreview();

    if (emptyUpload) {
        emptyUpload.style.display =
            'flex';
    }

    if (selectedFileName) {
        selectedFileName.textContent =
            'No image selected';
    }

    if (analyzeButton) {
        analyzeButton.disabled =
            true;

        analyzeButton.innerHTML =
            '✦ Analyze Image';

        analyzeButton.dataset.mode =
            'analyze';
    }

    if (locationSummary) {
        locationSummary.classList.add(
            'hidden'
        );
    }

    const provinceSelect =
        document.getElementById(
            'provinceSelect'
        );

    const municipalitySelect =
        document.getElementById(
            'municipalitySelect'
        );

    const barangaySelect =
        document.getElementById(
            'barangaySelect'
        );

    if (provinceSelect) {
        provinceSelect.value =
            '';
    }

    if (municipalitySelect) {
        municipalitySelect.innerHTML =
            '<option value="">Select Municipality / City</option>';

        municipalitySelect.disabled =
            true;
    }

    if (barangaySelect) {
        barangaySelect.innerHTML =
            '<option value="">Select Barangay</option>';

        barangaySelect.disabled =
            true;
    }

    hideMessage();

    window.scrollTo(
        {
            top: 0,
            behavior: 'smooth'
        }
    );
}


// =====================================================
// SAVE PREDICTION TO NODE / SUPABASE
// =====================================================

async function savePredictionToServer(
    topPrediction,
    top3
) {
    const payload = {
        predicted_disease:
            topPrediction.className,

        confidence:
            Number(
                (
                    topPrediction.score *
                    100
                ).toFixed(3)
            ),

        image_url:
            null,

        latitude:
            selectedLocation?.latitude ??
            null,

        longitude:
            selectedLocation?.longitude ??
            null,

        municipality:
            selectedLocation?.municipality ??
            null,

        province:
            selectedLocation?.province ??
            null,

        top3:
            top3.map(
                (
                    item,
                    index
                ) => ({
                    class_name:
                        item.className,

                    confidence:
                        Number(
                            (
                                item.score *
                                100
                            ).toFixed(3)
                        ),

                    ranking:
                        index + 1
                })
            )
    };

    const response =
        await fetch(
            '/api/predictions',
            {
                method:
                    'POST',

                credentials:
                    'include',

                headers: {
                    'Content-Type':
                        'application/json',

                    Accept:
                        'application/json'
                },

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );

    const result =
        await response
            .json()
            .catch(
                () => ({})
            );

    if (!response.ok) {
        throw new Error(
            result.message ||
            result.error ||
            `Prediction save failed (${response.status}).`
        );
    }

    return result;
}

// =====================================================
// RESULT INTERPRETATION
// =====================================================

async function handlePredictionResult(
    topPrediction,
    top3
) {
    const className =
        topPrediction.className;

    const confidence =
        topPrediction.score *
        100;

    if (
        className ===
        'random_object'
    ) {
        showMessage(
            'Invalid Image',
            `The uploaded image does not appear to be a rice leaf. Confidence: ${confidence.toFixed(2)}%`
        );

        return;
    }

    if (
        className ===
        'random_leaf'
    ) {
        showMessage(
            'Unsupported Leaf',
            `A leaf was detected, but it is not recognized as a rice leaf. Confidence: ${confidence.toFixed(2)}%`
        );

        return;
    }

    try {
        const saved =
            await savePredictionToServer(
                topPrediction,
                top3
            );

        console.log(
            'Prediction saved:',
            saved
        );

        renderPredictionResult(
            topPrediction,
            top3,
            'en'
        );

    } catch (error) {
        console.error(
            'Prediction saving error:',
            error
        );

        // Still show the AI result so the scan is not lost visually,
        // but make it clear that dashboard/history will not update.
        renderPredictionResult(
            topPrediction,
            top3,
            'en'
        );

        showMessage(
            'Result Not Saved',
            error.message ||
            'The analysis succeeded, but the prediction could not be saved to the database.'
        );
    }
}

// =====================================================
// CLASS NAME FORMATTER
// =====================================================

function formatClassName(
    value
) {
    if (!value) {
        return 'Unknown';
    }

    return value
        .split('_')
        .map(
            word =>
                word
                    .charAt(0)
                    .toUpperCase() +
                word.slice(1)
        )
        .join(' ');
}

// =====================================================
// MESSAGE
// =====================================================

function showMessage(
    title,
    text
) {
    if (messageTitle) {
        messageTitle.textContent =
            title;
    }

    if (messageText) {
        messageText.textContent =
            text;
    }

    if (messageCard) {
        messageCard.classList.remove(
            'hidden'
        );
    }
}

function hideMessage() {
    if (messageCard) {
        messageCard.classList.add(
            'hidden'
        );
    }
}

// =====================================================
// STARTUP
// =====================================================

refreshSavedLocationButton();
loadVisionariceModel();
