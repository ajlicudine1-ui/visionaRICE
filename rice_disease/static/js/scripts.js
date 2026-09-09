/* VISIONARICE JavaScript */

/* =========================
   Profile button
========================= */

function openModal(id) {
    document.getElementById(id).classList.add("active");
  }
  function closeModal(id) {
    document.getElementById(id).classList.remove("active");
  }

// =========================
// Element References
// =========================
const fileInput = document.querySelector("#file-upload");
const fileLabelText = document.querySelector("#fileLabelText");
const imagePreview = document.querySelector("#preview");
const resultsContainer = document.querySelector("#results-container");
const uploadBtn = document.querySelector("#upload-btn");
const historyTableBody = document.querySelector("#history-section tbody");
const refreshBtn = document.getElementById("refresh-btn");

// Camera Elements
const chooseCameraBtn = document.getElementById('chooseCameraBtn');
const switchCameraBtn = document.getElementById('switch-camera-btn');
const cameraSelect = document.getElementById('camera-select');
const cameraVideo = document.getElementById('camera');
const captureBtn = document.getElementById('capture-btn');
const retakeBtn = document.getElementById('retake-btn');
const cropperImage = document.getElementById('cropper-image');
const capturedOutput = document.getElementById('captured-output');
const closeCameraBtn = document.querySelector("#close-camera-btn");
const cameraContainer = document.getElementById("camera-container");

// Cropper instance
let cropper = null;
let currentStream = null;
let currentFacing = 'environment';
let currentDeviceId = null;
let isCameraCapture = false; // Track if current image is from camera
let isFromCropOperation = false; // Track if returning from crop operation

// Store the uploaded file separately
let selectedFile = null;

// Initialize map variable early
let mapInstance = null;

// =========================
// Helpers
// =========================
function getCSRFToken() {
  return document.querySelector('[name=csrfmiddlewaretoken]').value;
}

function stopStream() {
  if (currentStream) {
    currentStream.getTracks().forEach(t => t.stop());
    currentStream = null;
  }
}

function hideAllPreviews() {
  imagePreview.style.display = 'none';
  capturedOutput.style.display = 'none';
  cropperImage.style.display = 'none';
  cameraVideo.style.display = 'none';
}

function resetCameraUI() {
  stopStream();
  cameraVideo.srcObject = null;

  cameraContainer.style.display = 'none';
  cameraContainer.classList.remove('fullscreen'); // Remove fullscreen mode
  captureBtn.style.display = 'none';
  retakeBtn.style.display = 'none';
  cropperImage.style.display = 'none';
  capturedOutput.style.display = 'none';
  closeCameraBtn.style.display = 'none'; // hide the Close button

  // Hide crop buttons
  document.getElementById('crop-action-buttons').style.display = 'none';
  document.getElementById('apply-crop-btn').style.display = 'none';

  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
}

async function startStream({ facingMode = null, deviceId = null } = {}) {
  stopStream();
  hideAllPreviews();

  const constraints = {
    video: deviceId
      ? { deviceId: { exact: deviceId } }
      : { facingMode: { ideal: facingMode || currentFacing } },
    audio: false
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    currentStream = stream;
    cameraVideo.srcObject = stream;
    cameraContainer.style.display = "flex";
    cameraVideo.style.display = "block";
    captureBtn.style.display = 'inline-block';
    retakeBtn.style.display = 'none';
    closeCameraBtn.style.display = 'inline-block'; // show Close button when camera opens

    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter(d => d.kind === 'videoinput');
    cameraSelect.innerHTML = '';
    videoInputs.forEach((d, idx) => {
      const opt = document.createElement('option');
      opt.value = d.deviceId;
      opt.textContent = d.label || `Camera ${idx + 1}`;
      cameraSelect.appendChild(opt);
    });

    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings();
    currentDeviceId = settings.deviceId || null;
    if (currentDeviceId) cameraSelect.value = currentDeviceId;

    switchCameraBtn.style.display = videoInputs.length > 1 ? 'inline-block' : 'none';
    cameraSelect.style.display = videoInputs.length > 1 ? 'inline-block' : 'none';
  } catch (err) {
    console.error('Camera Error:', err);
    alert('Unable to access camera. Please check permissions and try again.');
    closeCameraBtn.style.display = 'none';
  }
}

function initCropper(src, callback) {
  if (cropper) cropper.destroy();

  // Show camera container to hold the cropper image
  cameraContainer.style.display = 'flex';
  cameraContainer.classList.add('fullscreen'); // Add fullscreen mode

  cropperImage.src = src;
  cropperImage.style.display = 'block';

  cropperImage.onload = () => {
    // Initialize cropper after image is loaded
    cropper = new Cropper(cropperImage, {
      viewMode: 1,
      dragMode: 'none',
      aspectRatio: 3 / 4,
      autoCropArea: 0.9,
      responsive: true,
      background: false,
      zoomOnWheel: true,
      movable: false,
      zoomable: true,
      scalable: true,
      rotatable: false,
    });
    
    // Hide regular preview only after cropper is successfully initialized
    imagePreview.style.display = 'none';
    
    // Call callback after cropper is initialized
    if (callback) callback();
  };
  
  // Handle image load errors
  cropperImage.onerror = () => {
    console.error('Failed to load image for cropper');
    cropperImage.style.display = 'none';
    cameraContainer.style.display = 'none';
    cameraContainer.classList.remove('fullscreen'); // Remove fullscreen on error
    imagePreview.style.display = 'block';
  };
}

// =========================
// File Upload Flow
// =========================
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  resetCameraUI();
  capturedOutput.src = "";

  if (file) {
    fileLabelText.style.display = 'none'; // Hide filename placeholder
    isCameraCapture = false; // Mark as gallery upload
    selectedFile = file; // store the file
    const reader = new FileReader();
    reader.onload = (event) => {
      // Initialize cropper immediately for gallery images (consistent with camera)
      initCropper(event.target.result, () => {
        // Show crop action buttons only after cropper is initialized
        document.getElementById('crop-action-buttons').style.display = 'flex';
        document.getElementById('apply-crop-btn').style.display = 'inline-block';
        document.getElementById('retake-btn').style.display = 'none';
      });
    };
    reader.readAsDataURL(file);
  } else {
    fileLabelText.textContent = "Click to select Camera or Gallery";
    fileLabelText.style.display = 'block';
    imagePreview.style.display = "none";
    selectedFile = null;
    
    // Hide crop buttons
    document.getElementById('crop-action-buttons').style.display = 'none';
  }

  closeCameraBtn.style.display = 'none'; // hide Close button if switching to upload
});

switchCameraBtn.addEventListener('click', async () => {
  currentFacing = currentFacing === 'environment' ? 'user' : 'environment';
  await startStream({ facingMode: currentFacing });
});

cameraSelect.addEventListener('change', async (e) => {
  const deviceId = e.target.value;
  await startStream({ deviceId });
});

closeCameraBtn.addEventListener("click", () => {
  resetCameraUI();
  closeCameraBtn.style.display = 'none'; // hide Close button when closed
});

captureBtn.addEventListener('click', () => {
  const vw = cameraVideo.videoWidth;
  const vh = cameraVideo.videoHeight;
  if (!vw || !vh) return alert('Camera not ready yet.');

  const canvas = document.createElement('canvas');
  canvas.width = vw;
  canvas.height = vh;
  canvas.getContext('2d').drawImage(cameraVideo, 0, 0);
  const dataURL = canvas.toDataURL('image/jpeg', 0.92);

  stopStream();
  cameraVideo.style.display = 'none';
  isCameraCapture = true; // Mark as camera capture
  initCropper(dataURL, () => {
    // For camera captures, show retake button only (no crop buttons)
    document.getElementById('crop-action-buttons').style.display = 'flex';
    document.getElementById('apply-crop-btn').style.display = 'none';
  });

  captureBtn.style.display = 'none';
  retakeBtn.style.display = 'inline-block';
});

retakeBtn.addEventListener('click', async () => {
  if (cropper) cropper.destroy();
  cropperImage.style.display = 'none';
  capturedOutput.style.display = 'none';
  retakeBtn.style.display = 'none';
  cameraContainer.classList.remove('fullscreen'); // Remove fullscreen
  isFromCropOperation = true; // Prevent modal from showing
  
  // Check if this is a camera capture or gallery upload using the flag
  if (isCameraCapture) {
    captureBtn.style.display = 'inline-block';
    await startStream({ facingMode: currentFacing });
  } else {
    // Gallery upload - hide everything and reset to initial state
    imagePreview.style.display = 'none';
    cameraContainer.style.display = 'none';
    fileLabelText.style.display = 'block';
    fileLabelText.textContent = "Click to select Camera or Gallery";
    selectedFile = null;
    
    // Hide crop buttons
    document.getElementById('crop-action-buttons').style.display = 'none';
    document.getElementById('apply-crop-btn').style.display = 'none';
  }
});

// Apply Crop button for gallery uploads
document.getElementById('apply-crop-btn').addEventListener('click', () => {
  if (cropper) {
    const canvas = cropper.getCroppedCanvas({ width: 400, height: 400 });
    const dataURL = canvas.toDataURL('image/jpeg', 0.92);
    
    // Convert to blob and set as selected file
    canvas.toBlob((blob) => {
      selectedFile = new File([blob], 'cropped_image.jpg', { type: 'image/jpeg' });
      isFromCropOperation = true; // Prevent modal from showing
      
      // Hide modal explicitly
      document.getElementById('uploadChoiceModal').style.display = 'none';
      
      // Clean up cropper
      cropper.destroy();
      cropper = null;
      cropperImage.style.display = 'none';
      cameraContainer.classList.remove('fullscreen');
      
      // Show cropped image preview
      capturedOutput.src = dataURL;
      capturedOutput.style.display = 'block';
      
      // Hide crop buttons
      document.getElementById('crop-action-buttons').style.display = 'none';
      document.getElementById('apply-crop-btn').style.display = 'none';
      
      // Set pending file for analysis (user can click Analyze button)
      pendingFile = selectedFile;
    }, 'image/jpeg', 0.92);
  }
});

// =========================
// Camera Cleanup and Safety
// =========================

// Always stop camera when leaving the page or switching tabs
window.addEventListener("beforeunload", stopStream);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopStream();
});

// Handle internal navigation (like clicking sidebar or navbar)
document.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    stopStream();
    // Reset camera UI (simulate leaving page)
    chooseCameraBtn.style.display = 'inline-block';
    closeCameraBtn.style.display = 'none';
    cameraVideo.style.display = 'none';
    captureBtn.style.display = 'none';
    retakeBtn.style.display = 'none';
    cropperImage.style.display = 'none';
    capturedOutput.style.display = 'none';
    
    // Hide crop buttons
    document.getElementById('crop-action-buttons').style.display = 'none';
    document.getElementById('apply-crop-btn').style.display = 'none';
  });
});

// Handle returning to the "Analyze Plant" page
window.addEventListener("pageshow", () => {
  // When coming back from browser back/forward
  stopStream();
  chooseCameraBtn.style.display = 'inline-block';
  closeCameraBtn.style.display = 'none';
  cameraVideo.style.display = 'none';
  captureBtn.style.display = 'none';
  retakeBtn.style.display = 'none';
  cropperImage.style.display = 'none';
  capturedOutput.style.display = 'none';
  
  // Hide crop buttons
  document.getElementById('crop-action-buttons').style.display = 'none';
  document.getElementById('apply-crop-btn').style.display = 'none';
});

// Extra safety: reset if the Analyze Plant section becomes visible again
const analyzeSection = document.querySelector('#analyze');
if (analyzeSection) {
  const observer = new MutationObserver(() => {
    const isVisible = analyzeSection.offsetParent !== null;
    if (isVisible) {
      stopStream();
      chooseCameraBtn.style.display = 'inline-block';
      closeCameraBtn.style.display = 'none';
      cameraVideo.style.display = 'none';
      captureBtn.style.display = 'none';
      retakeBtn.style.display = 'none';
      cropperImage.style.display = 'none';
      capturedOutput.style.display = 'none';
      
      // Hide crop buttons
      document.getElementById('crop-action-buttons').style.display = 'none';
      document.getElementById('apply-crop-btn').style.display = 'none';
    }
  });
  observer.observe(analyzeSection, { attributes: true, attributeFilter: ['style', 'class'] });
}

/* =========================
   Translation Dictionaries
========================= */
const diseaseTranslations = {
  "Bacterial Leaf Blight": { "ilo": "Bacterial Leaf Blight", "tl": "Bacterial Leaf Blight" },
  "Healthy Rice Plant": { "ilo": "Healthy Rice Plant", "tl": "Healthy Rice Plant" },
  "Leaf Blast": { "ilo": "Leaf Blast", "tl": "Leaf Blast" },
  "Sheath Blight": { "ilo": "Sheath Blight", "tl": "Sheath Blight" },
  "Tungro Virus": { "ilo": "Tungro Virus", "tl": "Tungro Virus" }
};

const adviceTranslations = {
  "Apply appropriate fungicides and manage water properly.": {
    "ilo": "Usaren dagiti umiso a fungicide ken aywanan ti pannakausar ti danum.",
    "tl": "Gumamit ng angkop na fungicide at pamahalaan nang maayos ang tubig."
  },
  "Use resistant varieties and avoid excess nitrogen.": {
    "ilo": "Liklikan iti panagusar iti ado unay a nitrogen nga abono.",
    "tl": "Gumamit ng mga uri na lumalaban sa sakit at iwasan ang sobrang nitrogen."
  },
  "Remove infected plants and control leafhopper vectors.": {
    "ilo": "Ikkaten dagiti nagsakit nga tanem ken kontrolen dagiti ulmog nga mangited iti sakit.",
    "tl": "Tanggalin ang mga apektadong halaman at kontrolin ang mga leafhopper vectors."
  },
  "Increase spacing and use fungicides.": {
    "ilo": "Pagtalinaeden iti umno nga espasyo dagiti pagay kin agusar iti fungicides.",
    "tl": "Dagdagan ang espasyo sa pagitan ng mga tanim at gumamit ng fungicide."
  },
  "Continue regular care.": {
    "ilo": "Imentenar ti umiso nga abono kin pinagpadanum.",
    "tl": "Ipagpatuloy ang regular na pag-aalaga."
  }
};

const controlTranslations = {
  // === LEAF BLAST ===
  "Avoid excessive nitrogen and maintain proper spacing.": {
    "ilo": "Liklikan ti ado unay a nitrogen ken talinaeden ti umno nga espasyo.",
    "tl": "Iwasan ang labis na nitrogen at panatilihin ang tamang pagitan ng tanim."
  },
  "Use Trichoderma or Pseudomonas fluorescens as seed treatment.": {
    "ilo": "Usaren ti Trichoderma wenno Pseudomonas fluorescens kas terapiya ti bin-i.",
    "tl": "Gumamit ng Trichoderma o Pseudomonas fluorescens bilang paggamot sa binhi."
  },
  "Apply tricyclazole or isoprothiolane at early infection stage.": {
    "ilo": "Usaren ti tricyclazole wenno isoprothiolane iti pangrugin a stage ti sakit.",
    "tl": "Maglagay ng tricyclazole o isoprothiolane sa unang yugto ng impeksyon."
  },

  // === BACTERIAL LEAF BLIGHT ===
  "Remove infected stubbles and ensure proper field drainage.": {
    "ilo": "Ikkaten dagiti nasakit a pungsot ken siguradoen ti nasayaat a pannakadren.",
    "tl": "Tanggalin ang mga nahawaang dayami at tiyakin ang maayos na daluyan ng tubig."
  },
  "Apply beneficial microbes like Bacillus subtilis.": {
    "ilo": "Usaren dagiti napaypayso a mikrobyo kasla Bacillus subtilis.",
    "tl": "Gumamit ng mga kapaki-pakinabang na mikrobyo tulad ng Bacillus subtilis."
  },
  "Spray copper-based bactericides if necessary.": {
    "ilo": "Ispray dagiti bactericide a nakabase iti tanso no masapul.",
    "tl": "Mag-spray ng mga bactericide na may halong tanso kung kinakailangan."
  },

  // === BACTERIAL LEAF STREAK ===
  "Practice crop rotation and remove infected residues.": {
    "ilo": "Aramiden ti pannakasukatan ti tanem ken ikkaten dagiti nasakit a residu.",
    "tl": "Magsanay ng crop rotation at alisin ang mga apektadong labi ng halaman."
  },
  "Apply microbial agents such as Bacillus spp.": {
    "ilo": "Usaren dagiti microbial agent kasla Bacillus spp.",
    "tl": "Gumamit ng mga mikrobyong ahente tulad ng Bacillus spp."
  },
  "Copper fungicides may help reduce spread.": {
    "ilo": "Dagiti fungicide nga adda tanso ket makatulong a mangpababa ti panagwaras.",
    "tl": "Ang mga fungicide na may tanso ay maaaring makatulong na mabawasan ang pagkalat."
  },

  // === HEALTHY RICE PLANT ===
  "Maintain good irrigation and proper spacing.": {
    "ilo": "Talinaeden ti nasayaat a pannakadilig ken umno nga espasyo.",
    "tl": "Panatilihin ang maayos na irigasyon at tamang pagitan ng mga halaman."
  },
  "Encourage beneficial insects and soil microbes.": {
    "ilo": "Ipasayaat dagiti napaypayso nga ul-uling ken mikrobyo iti daga.",
    "tl": "Hikayatin ang mga kapaki-pakinabang na insekto at mikrobyo sa lupa."
  },
  "No chemical control needed for healthy crops.": {
    "ilo": "Awan ti masapul nga kimikal nga kontrol no nasayaat ti tanem.",
    "tl": "Walang kinakailangang kemikal na kontrol kung malusog ang tanim."
  },

  // === DEFAULT / MISSING ===
  "N/A": {
    "ilo": "Awan ti impormasyon.",
    "tl": "Walang impormasyon."
  }
};

/* =========================
   Upload Helper
========================= */
async function uploadFile(fileOrBlob, buttonEl, options = {}) {
  const btn = buttonEl || uploadBtn;
  const originalText = btn.textContent;

  btn.textContent = "Processing...";
  btn.disabled = true;

  const { location: passedLocation, coords } = options;

  const handleUpload = async (locationName, latitude, longitude, accuracy) => {
    const formData = new FormData();
    formData.append("file", fileOrBlob, fileOrBlob.name || "camera.jpg");
    formData.append("latitude", latitude);
    formData.append("longitude", longitude);
    formData.append("accuracy", accuracy);
    formData.append("location_name", locationName);

    try {
      const res = await fetch("/rice_disease/predict_disease/", {
        method: "POST",
        body: formData,
        headers: { "X-CSRFToken": getCSRFToken() },
      });

      const data = await res.json();
      resultsContainer.style.display = "block";

      if (data.error) {
        resultsContainer.innerHTML = `<p class="error">Error: ${data.error}</p>`;
      } else {
        const diseaseName = data.disease;

        // Check if it's not a rice leaf
        if (diseaseName === "Not a Rice Leaf") {
          resultsContainer.innerHTML = `
            <div class="error" style="color: red; font-weight: bold; text-align: center;">
              ❌ Image cannot be displayed — it is not a rice leaf.
            </div>
          `;
          btn.textContent = originalText;
          btn.disabled = false;
          return;
        }

        // Extract structured advice data
        const adviceData = data.advice || {};

        // English (default)
        const adviceText = adviceData.advice?.en || "No general advice available.";
        const culturalControl = adviceData.cultural_control?.en || "N/A";
        const biologicalControl = adviceData.biological_control?.en || "N/A";
        const chemicalControl = adviceData.chemical_control?.en || "N/A";

        // Ilokano
        const disease_ilo = diseaseTranslations[diseaseName]?.ilo || diseaseName;
        const advice_ilo = adviceData.advice?.ilo || adviceData.advice?.en || "Awan ti impormasyon.";
        const cultural_ilo = adviceData.cultural_control?.ilo || adviceData.cultural_control?.en || "Awan ti impormasyon.";
        const biological_ilo = adviceData.biological_control?.ilo || adviceData.biological_control?.en || "Awan ti impormasyon.";
        const chemical_ilo = adviceData.chemical_control?.ilo || adviceData.chemical_control?.en || "Awan ti impormasyon.";

        // Tagalog
        const disease_tl = diseaseTranslations[diseaseName]?.tl || diseaseName;
        const advice_tl = adviceData.advice?.tl || adviceData.advice?.en || "Walang impormasyon.";
        const cultural_tl = adviceData.cultural_control?.tl || adviceData.cultural_control?.en || "Walang impormasyon.";
        const biological_tl = adviceData.biological_control?.tl || adviceData.biological_control?.en || "Walang impormasyon.";
        const chemical_tl = adviceData.chemical_control?.tl || adviceData.chemical_control?.en || "Walang impormasyon.";

        // Top 3 predictions
        let top3_en = "", top3_ilo = "", top3_tl = "";
        if (data.top_3_predictions && data.top_3_predictions.length > 0) {
          top3_en = `<h4>Top 3 Prediction:</h4><ol>` + data.top_3_predictions
            .map(item => `<li>${item.class}: ${item.confidence}%</li>`).join("") + `</ol>`;

          top3_ilo = `<h4>Tallo a Kangrunaan nga Prediksyon:</h4><ol>` + data.top_3_predictions
            .map(item => `<li>${diseaseTranslations[item.class]?.ilo || item.class}: ${item.confidence}%</li>`).join("") + `</ol>`;

          top3_tl = `<h4>Nangungunang 3 Deteksyon:</h4><ol>` + data.top_3_predictions
            .map(item => `<li>${diseaseTranslations[item.class]?.tl || item.class}: ${item.confidence}%</li>`).join("") + `</ol>`;
        }

        const savedLocation = data.location || locationName;
        const predictionId = data.id;

        // Display multilingual results (clickable to detail page)
        resultsContainer.innerHTML = `
          <div style="margin-bottom:12px; text-align:center;">
            <label for="language-dropdown" style="font-weight:600; margin-right:8px;">Language:</label>
            <select id="language-dropdown" class="language-dropdown" onchange="setLanguage(this.value)">
              <option value="en">English</option>
              <option value="ilo">Ilokano</option>
              <option value="tl">Tagalog</option>
            </select>
          </div>

          <!-- English -->
          <div id="lang-en" class="lang" style="cursor: default;">
            <h3 style="color: #16a34a;">Prediction Results</h3>
            <p><strong>Disease:</strong> ${diseaseName}</p>
            <p><strong>Confidence:</strong> ${data.confidence}%</p>
            ${top3_en}
            <p><strong>Recommendations:</strong> ${adviceText}</p>
            <p><strong>Cultural Control:</strong> ${culturalControl}</p>
            <p><strong>Biological Control:</strong> ${biologicalControl}</p>
            <p><strong>Chemical Control:</strong> ${chemicalControl}</p>
            <p class="location"><strong>Location: </strong> ${savedLocation}</p>
            <p><strong>GPS Accuracy:</strong> ±${Math.round(accuracy)} meters</p>
          </div>

          <!-- Ilokano -->
          <div id="lang-ilo" class="lang" style="display:none; cursor: default;">
            <h3 style="color: #16a34a;">Dagiti Resulta ti Panagpatingga</h3>
            <p><strong>Sakit:</strong> ${disease_ilo}</p>
            <p><strong>Kinaagpayso:</strong> ${data.confidence}%</p>
            ${top3_ilo}
            <p><strong>Rekomendasion:</strong> ${advice_ilo}</p>
            <p><strong>Kultural a Panangkontrol:</strong> ${cultural_ilo}</p>
            <p><strong>Biolohikal a Panangkontrol:</strong> ${biological_ilo}</p>
            <p><strong>Kimikal a Panangkontrol:</strong> ${chemical_ilo}</p>
            <p class="location"><strong>Lugar:</strong> ${savedLocation}</p>
            <p><strong>Kinalaingan ti GPS:</strong> ±${Math.round(accuracy)} metro</p>
          </div>

          <!-- Tagalog -->
          <div id="lang-tl" class="lang" style="display:none; cursor: default;">
            <h3 style="color: #16a34a;">Mga Resulta ng Prediksyon</h3>
            <p><strong>Sakit:</strong> ${disease_tl}</p>
            <p><strong>Kumpiyansa:</strong> ${data.confidence}%</p>
            ${top3_tl}
            <p><strong>Payo:</strong> ${advice_tl}</p>
            <p><strong>Kultural na Kontrol:</strong> ${cultural_tl}</p>
            <p><strong>Biyolohikal na Kontrol:</strong> ${biological_tl}</p>
            <p><strong>Kemikal na Kontrol:</strong> ${chemical_tl}</p>
            <p class="location"><strong>Lokasyon:</strong> ${savedLocation}</p>
            <p><strong>Katumpakan ng GPS:</strong> ±${Math.round(accuracy)} metro</p>
          </div>

          <div id="map" style="height:300px; margin-top:10px;"></div>
        `;
        setTimeout(() => setLanguage('en'), 100);

        // Display map
        if (mapInstance) mapInstance.remove();
        mapInstance = L.map("map").setView([latitude, longitude], 17);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "© OpenStreetMap contributors",
        }).addTo(mapInstance);

        L.marker([latitude, longitude])
          .addTo(mapInstance)
          .bindPopup(`<b>Your Location</b><br>${savedLocation}<br>Accuracy: ±${Math.round(accuracy)} m`)
          .openPopup();

        // Update history
        if (historyTableBody && data.image_url) {
          const newRow = document.createElement("tr");
          newRow.style.cursor = "pointer";
          newRow.style.transition = "background-color 0.2s";
          newRow.onmouseover = function() { this.style.backgroundColor = "#f0f0f0"; };
          newRow.onmouseout = function() { this.style.backgroundColor = ""; };
          newRow.onclick = function() { window.location.href = `/user-prediction/${data.id}/`; };
          newRow.innerHTML = `
            <td><img src="${data.image_url}" alt="Image"></td>
            <td>${diseaseName}</td>
            <td>${data.confidence}%</td>
            <td>${savedLocation}</td>
            <td>${data.created_at || new Date().toLocaleString()}</td>
          `;
          historyTableBody.insertBefore(newRow, historyTableBody.firstChild);
        }

        // Hide Analyze button, show Refresh
        uploadBtn.style.display = "none";
        refreshBtn.style.display = "inline-block";
      }

    } catch (error) {
      resultsContainer.style.display = "block";
      resultsContainer.innerHTML = `<p class="error">An error occurred: ${error}</p>`;
    }

    btn.textContent = originalText;
    btn.disabled = false;
  };

  // If location was passed from the modal (or from saved location)
  if (passedLocation) {
    const lat = coords?.latitude || 0;
    const lon = coords?.longitude || 0;
    const acc = coords?.accuracy || 0;
    await handleUpload(passedLocation, lat, lon, acc);
    return;
  }

  // (if no location provided, stop here to wait for modal)
  btn.textContent = originalText;
  btn.disabled = false;
}

/* =========================
   Refresh Button Logic
========================= */
refreshBtn.addEventListener("click", (event) => {
  event.preventDefault();
  stopStream();

  // Determine which section is currently visible (keeps user on same page)
  const currentSection = Array.from(document.querySelectorAll('.content-section'))
    .find(sec => window.getComputedStyle(sec).display !== 'none');
  const currentSectionId = currentSection ? currentSection.id : 'analyze';

  // Reset upload elements
  fileInput.value = "";
  fileLabelText.textContent = "Tap to capture or choose from gallery";
  imagePreview.src = "";
  imagePreview.style.display = "none";
  capturedOutput.src = "";
  capturedOutput.style.display = "none";
  cropperImage.style.display = "none";

  // Destroy cropper if active
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }

  // Hide results and camera
  resultsContainer.style.display = "none";
  cameraContainer.style.display = "none";

  // Hide crop buttons
  document.getElementById('crop-action-buttons').style.display = 'none';
  document.getElementById('apply-crop-btn').style.display = 'none';

  // Reset buttons
  refreshBtn.style.display = "none";
  uploadBtn.style.display = "inline-block";
  captureBtn.style.display = "none";
  retakeBtn.style.display = "none";

  // Preserve current section (and active nav link) after refresh
  document.querySelectorAll('.content-section').forEach(sec => sec.style.display = 'none');
  const activeSec = document.getElementById(currentSectionId);
  if (activeSec) activeSec.style.display = 'block';

  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.target === currentSectionId);
  });
});

/* =========================
   Reverse Geocode
========================= */
async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
    );
    const data = await res.json();
    return data.display_name || `Lat: ${lat}, Lng: ${lon}`;
  } catch (e) {
    return `Lat: ${lat}, Lng: ${lon}`;
  }
}

function setLanguage(lang) {
  document.querySelectorAll(".lang").forEach((el) => (el.style.display = "none"));
  const target = document.getElementById("lang-" + lang);
  if (target) target.style.display = "block";

  const dropdown = document.querySelectorAll("#language-dropdown");
  dropdown.forEach((ddl) => {
    ddl.value = lang;
  });
}

// Password change functionality
document.addEventListener("DOMContentLoaded", function () {
  // CSRF token helper
  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }
  const csrftoken = getCookie('csrftoken');

  // Show alert
  function showAlert(message, type = 'success') {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return; // prevent null errors
    const alertDiv = document.createElement('div');
    alertDiv.className = `mb-2 px-4 py-3 rounded shadow ${
      type === 'success'
        ? 'bg-green-100 border border-green-400 text-green-700'
        : 'bg-red-100 border border-red-400 text-red-700'
    }`;
    alertDiv.innerHTML = message;
    alertContainer.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
  }

  // Password Change AJAX
  const passwordForm = document.getElementById('password-form');
  const passwordErrors = document.getElementById('password-errors');

  if (passwordForm) {
    passwordForm.addEventListener('submit', function (e) {
      e.preventDefault();
      passwordErrors.innerHTML = '';
      const formData = new FormData(this);

      fetch("{% url 'change_password' %}", {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': csrftoken,
        },
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            passwordErrors.innerHTML =
              '<p class="text-green-600">' + data.message + '</p>';
            passwordForm.reset();
            showAlert(data.message, 'success');
            setTimeout(() => closeModal('passwordModal'), 1500);
          } else {
            passwordErrors.innerHTML = data.errors
              .map((err) => '<p>' + err + '</p>')
              .join('');
            showAlert('Failed to change password!', 'error');
          }
        })
        .catch((err) => {
          console.error('Password change error:', err);
          passwordErrors.innerHTML =
            '<p>Something went wrong. Please try again.</p>';
          showAlert('Something went wrong. Please try again.', 'error');
        });
    });
  }
});

document.querySelectorAll(".toggle-password").forEach(icon => {
  icon.addEventListener("click", function () {
    const targetId = this.getAttribute("data-target");
    const input = document.getElementById(targetId);

    if (input.type === "password") {
      input.type = "text";
      this.classList.remove("fa-eye");
      this.classList.add("fa-eye-slash");
    } else {
      input.type = "password";
      this.classList.remove("fa-eye-slash");
      this.classList.add("fa-eye");
    }
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const navLinks = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll(".content-section");

  function showSection(sectionId) {
    // Hide all sections
    sections.forEach(sec => sec.style.display = "none");

    // Show target
    const targetSection = document.getElementById(sectionId);
    if (targetSection) targetSection.style.display = "block";

    // Update active nav state
    navLinks.forEach(link => {
      link.classList.toggle("active", link.dataset.target === sectionId);
    });

    // Persist in storage + URL hash
    try { localStorage.setItem('activeSection', sectionId); } catch (e) {}
    if (window.location.hash.slice(1) !== sectionId) {
      window.location.hash = sectionId;
    }
  }

  navLinks.forEach(link => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const targetId = this.getAttribute("data-target");
      if (targetId) showSection(targetId);
    });
  });

  // On load, respect hash > saved section > default dashboard
  const hashSection = window.location.hash ? window.location.hash.substring(1) : null;
  const savedSection = localStorage.getItem('activeSection');
  const initial = hashSection || savedSection || 'dashboard';
  showSection(initial);
});

function toggleSidebar() {
  document.querySelector(".sidebar").classList.toggle("active");
  document.querySelector(".sidebar-toggle").classList.toggle("active");
}

function toggleSwitch(element) {
  element.classList.toggle('active');
}

function toggleFAQ(element) {
  element.classList.toggle('active');
}

function clearNotifications() {
  const notificationList = document.getElementById('notification-list');
  if (confirm('Are you sure you want to clear all notifications?')) {
    notificationList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔔</div>
        <h3>No Notifications</h3>
        <p>You're all caught up!</p>
      </div>
    `;
  }
}

// JavaScript (event delegation — works if buttons are added dynamically too)
document.getElementById('results-container').addEventListener('click', function (e) {
  const btn = e.target.closest('button');
  if (!btn || !this.contains(btn)) return;

  // remove .active from any other button
  this.querySelectorAll('button.active').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-pressed','false');
  });

  // set .active on clicked button
  btn.classList.add('active');
  btn.setAttribute('aria-pressed','true');
});

document.addEventListener("DOMContentLoaded", function() {
  const active = "{{ active_section|default:'' }}";
  if (active === "notifications") {
    // Hide other content sections
    document.querySelectorAll(".content-section").forEach(sec => sec.style.display = "none");

    // Show notifications section
    const notifSection = document.getElementById("notifications");
    if (notifSection) notifSection.style.display = "block";
  }
});

document.addEventListener("DOMContentLoaded", function() {
  const fileLabel = document.querySelector('.file-label');
  const modal = document.getElementById('uploadChoiceModal');
  const galleryBtn = document.getElementById('chooseGalleryBtn');
  const cameraBtn = document.getElementById('chooseCameraBtn');
  const closeBtn = document.getElementById('closeModalBtn');
  const fileInput = document.getElementById('file-upload');
  const cameraButton = document.getElementById('open-camera-btn');
  const uploadForm = document.getElementById('uploadForm');

  // When upload form is clicked — show modal
  uploadForm.addEventListener('click', function(event) {
    // Only show modal if clicking on the upload area itself, not on buttons or images
    if (event.target === uploadForm || event.target.closest('#uploadArea')) {
      event.preventDefault();
      // Don't show modal if returning from crop operation
      if (isFromCropOperation) {
        isFromCropOperation = false;
        return;
      }
      modal.style.display = 'flex';
    }
  });

  // If user chooses "Upload from Gallery"
  galleryBtn.addEventListener('click', function() {
    modal.style.display = 'none';
    fileInput.removeAttribute('capture');
    fileInput.click(); // open file picker
  });

  // If user chooses "Use Camera"
  cameraBtn.addEventListener('click', function() {
    modal.style.display = 'none';
    fileInput.setAttribute('capture', 'camera');
    fileInput.click(); // open camera
  });

  // Cancel or click outside modal
  closeBtn.addEventListener('click', () => modal.style.display = 'none');
  window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });
});

// =========================
// Location Modal Elements
// =========================
const locationModal = document.getElementById("locationModal");
const useGpsBtn = document.getElementById("useGpsBtn");
const confirmLocationBtn = document.getElementById("confirmLocationBtn");
const cancelLocationBtn = document.getElementById("cancelLocationBtn");
const locationError = document.getElementById("locationError");

const municipalitySelect = document.getElementById("municipalitySelect");
const barangaySelect = document.getElementById("barangaySelect");

const enterManualBtn = document.getElementById("enterManualBtn");
const manualLocationModal = document.getElementById("manualLocationModal");
const cancelManualBtn = document.getElementById("cancelManualBtn");
const confirmManualBtn = document.getElementById("confirmManualBtn");

const selectedLocationDisplay = document.getElementById("selectedLocationDisplay");
const locationActionButtons = document.getElementById("locationActionButtons");

// =========================
// Global State
// =========================
let selectedLocation = null;
let locationCoords = null;
let pendingFile = null;

// Load previously-used location (past uploads)
const savedLocation = localStorage.getItem("visionarice_lastLocation");
if (savedLocation) {
  selectedLocation = savedLocation;
  updateSelectedLocationDisplay(savedLocation);
}

function updateLocationActionButtons() {
  const show = !!selectedLocation;
  locationActionButtons.style.display = show ? "block" : "none";
}

// Ensure button state is correct on page load (including after refresh)
updateLocationActionButtons();

// =========================
// Upload & Analyze Button
// =========================
uploadBtn.addEventListener("click", (e) => {
  e.preventDefault();

  if (!cropper && !selectedFile) {
    alert("Please select a file or capture an image first.");
    return;
  }

  // Store what to upload
  pendingFile = cropper ? "cropper" : selectedFile;

  // Reset previous errors, and ensure action buttons are correct for current selected location
  locationError.style.display = "none";
  updateLocationActionButtons();

  // Show modal
  locationModal.style.display = "flex";
});

// =========================
// Cancel Location Modal
// =========================
cancelLocationBtn.addEventListener("click", () => {
  locationModal.style.display = "none";
  pendingFile = null;
});

// Allow closing modal by clicking outside the dialog
locationModal.addEventListener("click", (e) => {
  if (e.target === locationModal) {
    locationModal.style.display = "none";
    pendingFile = null;
  }
});

// =========================
// Use GPS Button
// =========================
useGpsBtn.addEventListener("click", async () => {
  if (!navigator.geolocation) {
    alert("❌ Geolocation is not supported by your browser.");
    return;
  }

  if (!pendingFile && !selectedFile && !cropper) {
    alert("⚠️ Please select or capture an image first.");
    return;
  }

  useGpsBtn.disabled = true;
  useGpsBtn.textContent = "Detecting Location...";

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      locationCoords = { latitude, longitude };

      // Convert lat/lon → readable place name
      const readableLocation = await reverseGeocode(latitude, longitude);

      // Use readable name instead of raw coordinates
      selectedLocation = readableLocation || `Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}`;

      // Persist selected location so we can show confirm/cancel for future uploads
      localStorage.setItem("visionarice_lastLocation", selectedLocation);

      updateSelectedLocationDisplay(selectedLocation);
      alert(`✅ GPS location detected!\n📍 ${selectedLocation}\nStarting analysis...`);

      // Close modal and trigger prediction
      locationModal.style.display = "none";
      await handleFileUpload();

      useGpsBtn.textContent = "Use Current Location";
      useGpsBtn.disabled = false;
    },
    (err) => {
      console.error("GPS Error:", err);
      useGpsBtn.textContent = "Use Current Location";
      useGpsBtn.disabled = false;
      alert("❌ Failed to get GPS location. Please select manually.");
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

// =========================
// Confirm Location (Main Modal)
// =========================
confirmLocationBtn.addEventListener("click", async () => {
  if (!selectedLocation) {
    alert("⚠️ Please select a manual location first.");
    return;
  }

  // Ensure a file is queued for upload even if pendingFile was cleared accidentally
  if (!pendingFile) {
    pendingFile = cropper ? "cropper" : selectedFile;
  }

  if (!pendingFile && !selectedFile && !cropper) {
    alert("⚠️ Please select or capture an image first.");
    return;
  }

  locationModal.style.display = "none";

  alert(`✅ Using saved location: ${selectedLocation}\nStarting analysis...`);

  try {
    await handleFileUpload(selectedLocation, locationCoords); // Trigger prediction using saved location
  } catch (err) {
    console.error("handleFileUpload failed", err);
    alert("Upload failed (see console for details). Please try again.");
  }
});

// =========================
// Manual Location Modal
// =========================
enterManualBtn.addEventListener("click", () => {
  locationModal.style.display = "none";
  manualLocationModal.style.display = "flex";
  loadMunicipalities();
});

cancelManualBtn.addEventListener("click", () => {
  manualLocationModal.style.display = "none";
  locationModal.style.display = "flex";
});

// =========================
// Confirm Manual Location
// =========================
confirmManualBtn.addEventListener("click", async () => {
  const provText = provinceSelect.options[provinceSelect.selectedIndex]?.textContent;
  const muniText = municipalitySelect.options[municipalitySelect.selectedIndex]?.textContent;
  const brgyText = barangaySelect.options[barangaySelect.selectedIndex]?.textContent;

  if (!provText || !muniText || !brgyText || provText === "Select Province" || muniText === "Select Municipality" || brgyText === "Select Barangay") {
    alert("⚠️ Please select Province, Municipality, and Barangay before confirming.");
    return;
  }

  const manualLocation = `${brgyText}, ${muniText}, ${provText}, Philippines`;
  selectedLocation = manualLocation;
  localStorage.setItem("visionarice_lastLocation", selectedLocation);

  // Use Nominatim forward geocoding to get coordinates automatically
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualLocation)}`
    );
    const data = await response.json();
    if (data.length > 0) {
      locationCoords = {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
      };
      console.log("📍 Auto-coordinates:", locationCoords);
    } else {
      locationCoords = null;
      console.warn("⚠️ No coordinates found for:", manualLocation);
    }
  } catch (err) {
    console.error("Geocoding error:", err);
  }

  manualLocationModal.style.display = "none";
  locationModal.style.display = "none";

  updateSelectedLocationDisplay(manualLocation);
  alert(`✅ Manual location selected: ${manualLocation}\nStarting analysis...`);
  await handleFileUpload();
});

// =========================
// Update Selected Location Display
// =========================
function updateSelectedLocationDisplay(text) {
  const display = document.getElementById("selectedLocationDisplay");
  if (!display) return;

  if (!text) {
    selectedLocation = null;
    display.style.display = "none";
    updateLocationActionButtons();
    return;
  }

  display.textContent = `📍 Selected: ${text}`;
  display.style.display = "block";
  updateLocationActionButtons();
}

// =========================
// Load Municipalities & Barangays
// =========================

async function loadMunicipalities(provinceCode) {
  try {
    const res = await fetch(
      `https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities/`
    );
    const municipalities = await res.json();

    municipalitySelect.innerHTML =
      '<option value="">Select Municipality</option>';
    barangaySelect.innerHTML = '<option value="">Select Barangay</option>';
    barangaySelect.disabled = true;

    municipalities.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.code;
      opt.textContent = m.name;
      municipalitySelect.appendChild(opt);
    });
  } catch (err) {
    console.error("Error loading municipalities:", err);
  }
}

async function loadBarangays(muniCode) {
  try {
    const res = await fetch(
      `https://psgc.gitlab.io/api/cities-municipalities/${muniCode}/barangays/`
    );
    const barangays = await res.json();

    barangaySelect.innerHTML = '<option value="">Select Barangay</option>';
    barangays.forEach((b) => {
      const opt = document.createElement("option");
      opt.value = b.name;
      opt.textContent = b.name;
      barangaySelect.appendChild(opt);
    });
    barangaySelect.disabled = false;
  } catch (err) {
    console.error("Error loading barangays:", err);
  }
}

provinceSelect.addEventListener("change", (e) => {
  const provinceCode = e.target.value;
  municipalitySelect.innerHTML = '<option value="">Select Municipality</option>';
  barangaySelect.innerHTML = '<option value="">Select Barangay</option>';
  barangaySelect.disabled = true;
  if (provinceCode) loadMunicipalities(provinceCode);
});

municipalitySelect.addEventListener("change", (e) => {
  const muniCode = e.target.value;
  barangaySelect.innerHTML = '<option value="">Select Barangay</option>';
  barangaySelect.disabled = true;
  if (muniCode) loadBarangays(muniCode);
});

// =========================
// File Upload + Prediction
// =========================
async function handleFileUpload(passedLocation = null, passedCoords = null) {
  if (!pendingFile) {
    alert("Please select or capture an image first.");
    console.error("handleFileUpload: no pending file", { selectedFile, cropper });
    return;
  }

  let fileToUpload = null;

  if (pendingFile === "cropper" && cropper) {
    const canvas = cropper.getCroppedCanvas({ width: 400, height: 400 });
    fileToUpload = await new Promise((res) =>
      canvas.toBlob(res, "image/jpeg", 0.92)
    );
    capturedOutput.src = canvas.toDataURL("image/jpeg", 0.92);
    capturedOutput.style.display = "block";
    capturedOutput.style.display = "none";
    cropper.destroy();
    cropper = null;
  } else if (pendingFile instanceof File) {
    fileToUpload = pendingFile;
  }

  if (!fileToUpload) {
    console.error("❌ No valid file to upload.");
    return;
  }

  console.log("🚀 Uploading with location: ", selectedLocation);
  console.log("📍 Coords:", locationCoords);

  try {
    await uploadFile(fileToUpload, uploadBtn, {
      location: passedLocation || selectedLocation,
      coords: passedCoords || locationCoords,
    });
  } catch (err) {
    console.error("Upload error:", err);
    alert("Upload failed. Please try again.");
  }

  pendingFile = null;
}

document.addEventListener('DOMContentLoaded', function () {
  // Get the current hash (example: #analyze)
  const hash = window.location.hash;

  // Hide all sections first
  document.querySelectorAll('.content-section').forEach(sec => {
    sec.style.display = 'none';
  });

  // If there's a hash and the element exists, show it
  if (hash && document.querySelector(hash)) {
    document.querySelector(hash).style.display = 'block';
  } else {
    // Otherwise show dashboard by default
    const dashboard = document.querySelector('#dashboard');
    if (dashboard) dashboard.style.display = 'block';
  }
});

// Mobile swipe functionality for sidebar
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', function(e) {
  touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', function(e) {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
});

function handleSwipe() {
  const swipeThreshold = 50; // minimum distance for swipe
  const swipeDistance = touchEndX - touchStartX;
  const sidebar = document.querySelector('.sidebar');

  // Swipe right to show sidebar (from left edge)
  if (swipeDistance > swipeThreshold && touchStartX < 50) {
    sidebar.classList.add('active');
  }
  // Swipe left to hide sidebar
  else if (swipeDistance < -swipeThreshold) {
    sidebar.classList.remove('active');
  }
}

// Close sidebar when clicking outside on mobile
document.addEventListener('click', function(e) {
  const sidebar = document.querySelector('.sidebar');
  const toggleBtn = document.querySelector('.sidebar-toggle');

  if (window.innerWidth <= 768 &&
      !sidebar.contains(e.target) &&
      !toggleBtn.contains(e.target) &&
      sidebar.classList.contains('active')) {
    sidebar.classList.remove('active');
  }
});

// PWA Install Button Script
let deferredPrompt;
const installBtn = document.getElementById('installBtn');

// Capture the beforeinstallprompt event if available
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

// When the user clicks the install button
installBtn.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    deferredPrompt = null;
  } else {
    const userAgent = navigator.userAgent.toLowerCase();
    let instructions = 'VISIONARICE Installation Instructions:\n\n';
    
    if (userAgent.includes('chrome') || userAgent.includes('edge')) {
      instructions += '📱 Chrome/Edge - Click the address bar menu (⋮) and select "Install app" or "Create shortcut"\n\n';
      instructions += 'OR\n\n';
      instructions += '⚙️ Settings > Apps > Install apps from websites > VISIONARICE';
    } else if (userAgent.includes('safari')) {
      instructions += '📱 Safari - Tap Share > Add to Home Screen\n\n';
      instructions += 'The app will appear as an icon on your home screen.';
    } else if (userAgent.includes('firefox')) {
      instructions += '📱 Firefox - For Firefox, PWA installation may vary by device. Try:\n\n';
      instructions += '1. Long-press the app icon\n';
      instructions += '2. Select "Add to Home Screen"';
    } else {
      instructions += '📱 To install this app:\n\n';
      instructions += '1. Look for an install/menu option in your browser\n';
      instructions += '2. Select "Add to Home Screen" or "Install App"\n';
      instructions += '3. Confirm the installation';
    }
    
    alert(instructions);
  }
});
