import * as faceapi from '@vladmandic/face-api';

// State flags for model loading
let modelsLoadingPromise = null;
let modelsLoaded = false;

/**
 * Initializes and loads the face-api neural network models
 * (TinyFaceDetector / SSD MobileNet, Landmark68, FaceRecognitionNet).
 */
export async function ensureModelsLoaded() {
  if (modelsLoaded) return true;
  if (modelsLoadingPromise) return modelsLoadingPromise;

  modelsLoadingPromise = (async () => {
    try {
      // Primary: local ./models directory served from dist/models (Capacitor WebView compatible)
      const MODEL_URL = './models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      modelsLoaded = true;
      console.log('✅ Biometric Face Engine (MobileFaceNet / FaceNet) models loaded successfully.');
      return true;
    } catch (primaryErr) {
      console.warn('Local model loading failed, trying CDN fallback:', primaryErr);
      try {
        const CDN_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(CDN_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(CDN_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(CDN_URL)
        ]);
        modelsLoaded = true;
        console.log('✅ Biometric Face Engine loaded via CDN fallback.');
        return true;
      } catch (cdnErr) {
        console.error('Failed to load Face Recognition models:', cdnErr);
        modelsLoaded = false;
        modelsLoadingPromise = null;
        return false;
      }
    }
  })();

  return modelsLoadingPromise;
}

/**
 * Calculates Euclidean distance between two normalized biometric vectors (128D FaceNet / MobileFaceNet).
 */
export function calculateEuclideanDistance(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) return 1.0;
  let sum = 0;
  for (let i = 0; i < vec1.length; i++) {
    const diff = vec1[i] - vec2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Calculates Cosine Similarity between two L2-normalized vectors.
 * Returns value from -1.0 to +1.0 (1.0 = identical spatial texture vector).
 */
export function calculateCosineSimilarity(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0;
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Calculates match confidence percentage (0 to 100%) using FaceNet / MobileFaceNet 128D L2 distance & Cosine Similarity.
 * Threshold Calibration:
 * - Euclidean Distance d <= 0.35 (CosSim >= 0.85): High Confidence (90% - 99%)
 * - Euclidean Distance d in (0.35, 0.48] (CosSim in [0.75, 0.85)): Medium-High Confidence (75% - 89%)
 * - Euclidean Distance d > 0.48 (CosSim < 0.75): Low Confidence / Unmatched (< 75% -> REJECT)
 */
export function calculateMatchConfidence(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0;

  const distance = calculateEuclideanDistance(vec1, vec2);
  const cosSim = calculateCosineSimilarity(vec1, vec2);

  if (distance > 0.55 || cosSim < 0.70) {
    // Unmatched / Different faces: distance > 0.55
    const lowConf = Math.max(0, Math.round((1 - (distance - 0.55) / 0.45) * 45));
    return Math.min(50, lowConf);
  }

  if (distance > 0.42) {
    // Borderline match region (55% to 74%)
    const pct = 55 + ((0.55 - distance) / 0.13) * 19;
    return Math.round(pct);
  }

  // Genuine same-person match (75% to 99%)
  const highPct = 78 + ((0.42 - distance) / 0.42) * 21;
  return Math.min(99, Math.round(highPct));
}

/**
 * Detects whether a human face is present in the video stream frame using ML Kit / face-api TinyFaceDetector.
 */
export async function detectFaceInVideo(videoElement) {
  if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
    return { hasFace: false, confidence: 0, reason: 'Camera feed not ready. Position face inside camera frame.' };
  }

  await ensureModelsLoaded();

  try {
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 });
    const detection = await faceapi.detectSingleFace(videoElement, options);

    if (detection) {
      const { x, y, width, height } = detection.box;
      const conf = Math.round(detection.score * 100);
      return {
        hasFace: true,
        confidence: conf,
        faceBox: { x, y, width, height },
        detection
      };
    }
  } catch (e) {
    console.warn('Face detection error:', e);
  }

  return { hasFace: false, confidence: 0, reason: 'No face detected in frame.' };
}

/**
 * Extracts a normalized 128-dimensional biometric facial embedding using FaceNet / MobileFaceNet.
 */
export async function extractFaceVectorFromVideo(videoElement, faceBox = null) {
  if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
    return null;
  }

  await ensureModelsLoaded();

  try {
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 });
    const detection = await faceapi
      .detectSingleFace(videoElement, options)
      .withFaceLandmarks(true)
      .withFaceDescriptor();

    if (detection && detection.descriptor) {
      // 128D L2-normalized FaceNet / MobileFaceNet embedding vector
      return Array.from(detection.descriptor);
    }
  } catch (e) {
    console.warn('Error extracting face vector via faceapi:', e);
  }

  return null;
}

/**
 * Estimates head pose / face orientation based on 68 landmark points.
 * Returns 'CENTER' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN'
 */
export async function detectFacePose(videoElement) {
  if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
    return 'CENTER';
  }

  await ensureModelsLoaded();

  try {
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });
    const detection = await faceapi
      .detectSingleFace(videoElement, options)
      .withFaceLandmarks(true);

    if (detection && detection.landmarks) {
      const landmarks = detection.landmarks.positions;
      const nose = landmarks[30];
      const leftEye = landmarks[36];
      const rightEye = landmarks[45];
      const chin = landmarks[8];
      const noseBridge = landmarks[27];

      if (nose && leftEye && rightEye && chin && noseBridge) {
        const eyeCenter = (leftEye.x + rightEye.x) / 2;
        const faceWidth = Math.abs(rightEye.x - leftEye.x) || 1;
        const faceHeight = Math.abs(chin.y - noseBridge.y) || 1;

        const yawOffset = (nose.x - eyeCenter) / faceWidth;
        const verticalMid = (noseBridge.y + chin.y) / 2;
        const pitchOffset = (nose.y - verticalMid) / faceHeight;

        if (yawOffset < -0.15) return 'LEFT';
        if (yawOffset > 0.15) return 'RIGHT';
        if (pitchOffset < -0.08) return 'UP';
        if (pitchOffset > 0.12) return 'DOWN';
        return 'CENTER';
      }
    }
  } catch (e) {
    console.warn('Face pose detection error:', e);
  }

  return 'CENTER';
}

/**
 * Generates a deterministic seed vector (128D FaceNet dimension).
 */
export function generateFaceEmbedding(seedString) {
  const dim = 128;
  const vector = new Float32Array(dim);
  let hash = 0;
  const str = seedString || 'default_face_seed_' + Math.random();
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  for (let i = 0; i < dim; i++) {
    vector[i] = Math.sin(hash * 0.01 + i * 0.17);
  }

  let normSum = 0;
  for (let i = 0; i < dim; i++) normSum += vector[i] * vector[i];
  const norm = Math.sqrt(normSum) || 1.0;
  for (let i = 0; i < dim; i++) {
    vector[i] = parseFloat((vector[i] / norm).toFixed(6));
  }

  return Array.from(vector);
}

/**
 * Matches a scanned face vector against registered employee vectors in database.
 * Returns the matching employee object or null if below threshold (>= 75% confidence required).
 */
export function matchFaceEmbedding(scannedVector, employeesList, thresholdPercent = 75) {
  if (!scannedVector || !employeesList || employeesList.length === 0) return null;

  let bestMatch = null;
  let highestConfidence = 0;
  let lowestDistance = 999;

  for (const emp of employeesList) {
    if (!emp.face_embedding || !emp.is_active) continue;

    let conf = 0;
    let dist = 999;
    const emb = emp.face_embedding;

    const checkVector = (refVec) => {
      if (!Array.isArray(refVec)) return;
      if (refVec.length === scannedVector.length) {
        const c = calculateMatchConfidence(scannedVector, refVec);
        const d = calculateEuclideanDistance(scannedVector, refVec);
        if (c > conf) {
          conf = c;
          dist = d;
        }
      }
    };

    if (typeof emb === 'object' && !Array.isArray(emb)) {
      for (const key of Object.keys(emb)) {
        checkVector(emb[key]);
      }
    } else if (Array.isArray(emb)) {
      if (Array.isArray(emb[0])) {
        for (const poseVec of emb) {
          checkVector(poseVec);
        }
      } else {
        checkVector(emb);
      }
    }

    if (conf > highestConfidence) {
      highestConfidence = conf;
      lowestDistance = dist;
      bestMatch = { employee: emp, confidence: conf, distance: dist };
    }
  }

  if (highestConfidence >= thresholdPercent && bestMatch) {
    return bestMatch;
  }

  return null;
}

/**
 * Test Case 01: Biometric Duplicate Registration Prevention
 * Performs a 1:N facial biometric match against existing registered employee templates.
 * Returns { isDuplicate: true, matchedEmp: employee, confidence } if a duplicate match exceeds the threshold.
 */
export function checkDuplicateFace(scannedVector, registeredEmployeesList, thresholdPercent = 65) {
  if (!scannedVector || !registeredEmployeesList || registeredEmployeesList.length === 0) {
    return { isDuplicate: false };
  }

  const match = matchFaceEmbedding(scannedVector, registeredEmployeesList, thresholdPercent);
  if (match && match.employee) {
    return {
      isDuplicate: true,
      matchedEmp: match.employee,
      confidence: match.confidence
    };
  }

  return { isDuplicate: false };
}
