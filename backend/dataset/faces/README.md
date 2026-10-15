# VERICAMP Face Dataset Directory

Store reference enrollment photos for faculty members in this folder.

### File Naming Convention
Save photos named with the teacher's **Employee ID** in uppercase:
```
backend/dataset/faces/EMP-1001.jpg
backend/dataset/faces/EMP-1002.jpg
backend/dataset/faces/EMP-1003.jpg
backend/dataset/faces/EMP-1004.jpg
backend/dataset/faces/EMP-1005.jpg
```
Supported formats: `.jpg`, `.jpeg`, `.png`.

### Verification Mechanism:
1. **Enrollment:** You can either:
   - Place a clear frontal photo of the teacher here named `<EMPLOYEE_ID>.jpg`
   - Or upload it in 1-click via **My Profile** or **Admin Teacher Management** in the web app
   - Or on first login, when the teacher clicks "Capture Photo" in **Mark Attendance**, the system automatically registers the first clear face capture into this dataset folder!
2. **Attendance Verification:**
   - The live browser camera captures a live frame.
   - YuNet (`face_detection_yunet_2023mar.onnx` via `cv2.FaceDetectorYN`) detects the frontal face and facial landmarks.
   - SFace (`face_recognition_sface_2021dec.onnx` via `cv2.FaceRecognizerSF`) aligns the face, extracts 128-d deep feature representations, and computes cosine similarity against the reference biometric template.
   - If similarity $\ge 85.0\%$, face presence is verified!
