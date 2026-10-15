"""
VERICAMP Face Biometric Service
Pipeline: YuNet (Face Detection) + SFace (Face Recognition & Verification)
Models:
  - Detection: face_detection_yunet_2023mar.onnx (OpenCV cv2.FaceDetectorYN)
  - Recognition: face_recognition_sface_2021dec.onnx (OpenCV cv2.FaceRecognizerSF)
"""

import os
import cv2
import json
import base64
import threading
import numpy as np

# Model directory and file paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
DATASET_DIR = os.path.join(BASE_DIR, "dataset", "faces")
os.makedirs(DATASET_DIR, exist_ok=True)

YUNET_MODEL_PATH = os.path.join(MODELS_DIR, "face_detection_yunet_2023mar.onnx")
SFACE_MODEL_PATH = os.path.join(MODELS_DIR, "face_recognition_sface_2021dec.onnx")

# Constants for DB and API responses
MODEL_DETECTOR_NAME = "YuNet"
MODEL_RECOGNIZER_NAME = "SFace"
MODEL_NAME = "YuNet-SFace-ONNX"
MODEL_VERSION = "2023mar-2021dec"
FACE_SIMILARITY_THRESHOLD = 85.0  # Percentage threshold for verified match

def decode_base64_image(image_base64):
    """Converts base64 image data string into OpenCV BGR numpy array."""
    if not image_base64:
        return None
    try:
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        img_bytes = base64.b64decode(image_base64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        print("[face_service] Image decode error:", e)
        return None


class FaceService:
    """Thread-safe YuNet + SFace Biometric Face Service."""

    def __init__(self, yunet_path=YUNET_MODEL_PATH, sface_path=SFACE_MODEL_PATH):
        self.yunet_path = yunet_path
        self.sface_path = sface_path
        self._lock = threading.Lock()
        self.detector = None
        self.recognizer = None
        self._initialize_models()

    def _initialize_models(self):
        """Validates model files and instantiates OpenCV DNN modules."""
        if not os.path.exists(self.yunet_path):
            raise FileNotFoundError(f"YuNet ONNX model not found at: {self.yunet_path}")
        if not os.path.exists(self.sface_path):
            raise FileNotFoundError(f"SFace ONNX model not found at: {self.sface_path}")

        try:
            self.detector = cv2.FaceDetectorYN.create(
                model=self.yunet_path,
                config="",
                input_size=(320, 320),
                score_threshold=0.7,
                nms_threshold=0.3,
                top_k=5000,
                backend_id=cv2.dnn.DNN_BACKEND_OPENCV,
                target_id=cv2.dnn.DNN_TARGET_CPU
            )
            self.recognizer = cv2.FaceRecognizerSF.create(
                model=self.sface_path,
                config="",
                backend_id=cv2.dnn.DNN_BACKEND_OPENCV,
                target_id=cv2.dnn.DNN_TARGET_CPU
            )
            print(f"[*] Biometric Pipeline Initialized: YuNet ({os.path.basename(self.yunet_path)}) + SFace ({os.path.basename(self.sface_path)})")
        except Exception as e:
            raise RuntimeError(f"Failed to initialize YuNet / SFace OpenCV models: {e}")

    def detect_faces(self, img, min_size=(60, 60), min_conf=0.75):
        """
        Detects faces in img using OpenCV cv2.FaceDetectorYN.
        Filters candidate faces by minimum size, confidence score, and frame boundaries.
        Returns list of valid face detection numpy arrays:
          [x, y, w, h, x_re, y_re, x_le, y_le, x_nt, y_nt, x_rcm, y_rcm, x_lcm, y_lcm, conf]
        """
        if img is None:
            return []

        h, w = img.shape[:2]
        if h <= 0 or w <= 0:
            return []

        with self._lock:
            self.detector.setInputSize((w, h))
            _, raw_faces = self.detector.detect(img)

        if raw_faces is None or len(raw_faces) == 0:
            return []

        usable_faces = []
        for f in raw_faces:
            bx, by, bw, bh = int(f[0]), int(f[1]), int(f[2]), int(f[3])
            conf = float(f[14])
            cx, cy = bx + bw / 2, by + bh / 2

            # Check confidence, minimum bounding box dimensions, and interior center
            if conf >= min_conf and bw >= min_size[0] and bh >= min_size[1]:
                if 0 <= cx < w and 0 <= cy < h and bx >= 0 and by >= 0:
                    usable_faces.append(f)

        return usable_faces

    def validate_face_for_enrollment(self, img):
        """
        Validates an enrollment photo.
        Strict verification requirement: frame must contain EXACTLY ONE usable face.
        Returns: (is_valid: bool, error_message: str | None, faces: list)
        """
        if img is None:
            return False, "Failed to decode camera capture stream.", []

        faces = self.detect_faces(img, min_size=(60, 60), min_conf=0.75)
        if len(faces) == 0:
            return False, "No clear face detected in the live camera capture. Ensure good lighting and face within guide.", []
        if len(faces) > 1:
            return False, f"Multiple faces ({len(faces)}) detected. Please ensure only the faculty member is visible in frame.", faces

        return True, None, faces

    def extract_face_embedding(self, img, face_box=None):
        """
        Aligns, crops, and extracts 128-d SFace embedding vector for a face in img.
        If face_box is None, detects the dominant face automatically.
        Returns (feature_vector: np.ndarray [1, 128] | None, face_box: np.ndarray | None)
        """
        if img is None:
            return None, None

        if face_box is None:
            faces = self.detect_faces(img, min_size=(60, 60), min_conf=0.75)
            if not faces:
                # Fallback: check any detected raw face
                with self._lock:
                    self.detector.setInputSize((img.shape[1], img.shape[0]))
                    _, raw = self.detector.detect(img)
                if raw is not None and len(raw) > 0:
                    face_box = max(raw, key=lambda f: f[2] * f[3])
                else:
                    return None, None
            else:
                face_box = max(faces, key=lambda f: f[2] * f[3])

        with self._lock:
            aligned_face = self.recognizer.alignCrop(img, face_box)
            feature = self.recognizer.feature(aligned_face)

        return feature, face_box

    def extract_face_roi(self, img):
        """
        Detects primary face using YuNet and returns 160x160 cropped & resized BGR ROI.
        Maintains backward compatibility with legacy crop inspection.
        """
        if img is None:
            return None
        faces = self.detect_faces(img, min_size=(40, 40), min_conf=0.6)
        if not faces:
            h, w = img.shape[:2]
            ch, cw = int(h * 0.2), int(w * 0.2)
            crop = img[ch:h-ch, cw:w-cw]
            return cv2.resize(crop, (160, 160))

        best = max(faces, key=lambda f: f[2] * f[3])
        x, y, w, h = int(best[0]), int(best[1]), int(best[2]), int(best[3])
        face_crop = img[max(0, y):y+h, max(0, x):x+w]
        if face_crop.size == 0:
            return cv2.resize(img, (160, 160))
        return cv2.resize(face_crop, (160, 160))

    def compute_face_similarity(self, live_img, ref_img):
        """
        Full Biometric Verification Pipeline using YuNet Face Detection + SFace Verification:
        1. Detects face in live capture using YuNet.
        2. Detects face in registered reference photo using YuNet.
        3. Aligns and crops faces using SFace.
        4. Extracts 128-dimensional deep feature embeddings.
        5. Computes cosine similarity via SFace FR_COSINE.
        6. Converts to calibrated percentage score:
             - Cosine >= 0.50 maps to 85.0% - 99.5% (Verified)
             - Cosine < 0.50 maps to 20.0% - 84.9% (Failed match)
        Returns: (verified: bool, score: float, error_message: str | None)
        """
        if live_img is None or ref_img is None:
            return False, 0.0, "Could not isolate facial landmarks from capture."

        # 1. Live frame detection
        live_faces = self.detect_faces(live_img, min_size=(60, 60), min_conf=0.75)
        if len(live_faces) == 0:
            return False, 0.0, "No clear face detected in the live camera capture. Ensure good lighting and face within guide."
        if len(live_faces) > 1:
            return False, 0.0, f"Multiple faces ({len(live_faces)}) detected in camera frame. Ensure only you are visible."

        # 2. Reference image detection
        ref_faces = self.detect_faces(ref_img, min_size=(40, 40), min_conf=0.60)
        if len(ref_faces) == 0:
            # Fallback for reference: check any face detected by YuNet
            with self._lock:
                self.detector.setInputSize((ref_img.shape[1], ref_img.shape[0]))
                _, raw_ref = self.detector.detect(ref_img)
            if raw_ref is None or len(raw_ref) == 0:
                return False, 0.0, "Could not isolate facial landmarks from registered reference template."
            ref_face = max(raw_ref, key=lambda f: f[2] * f[3])
        else:
            ref_face = max(ref_faces, key=lambda f: f[2] * f[3])

        live_face = live_faces[0]

        # 3 & 4. SFace alignCrop and feature extraction
        with self._lock:
            aligned_live = self.recognizer.alignCrop(live_img, live_face)
            feat_live = self.recognizer.feature(aligned_live)

            aligned_ref = self.recognizer.alignCrop(ref_img, ref_face)
            feat_ref = self.recognizer.feature(aligned_ref)

            # 5. SFace Cosine Matching
            cosine_sim = float(self.recognizer.match(feat_live, feat_ref, cv2.FaceRecognizerSF_FR_COSINE))

        # 6. Calibrated percentage score mapping
        if cosine_sim >= 0.50:
            score = round(min(99.5, 85.0 + ((cosine_sim - 0.50) / 0.50) * 14.5), 1)
        else:
            score = round(max(20.0, 85.0 - ((0.50 - cosine_sim) / 0.50) * 65.0), 1)

        verified = score >= FACE_SIMILARITY_THRESHOLD
        failure_reason = None if verified else f"Facial similarity match too low ({score}% < {FACE_SIMILARITY_THRESHOLD}%)"

        return verified, score, failure_reason


# Module-level default singleton instance
face_service = FaceService()

# Exported top-level functions for direct drop-in compatibility
detect_faces = face_service.detect_faces
validate_face_for_enrollment = face_service.validate_face_for_enrollment
extract_face_embedding = face_service.extract_face_embedding
extract_face_roi = face_service.extract_face_roi
compute_face_similarity = face_service.compute_face_similarity
