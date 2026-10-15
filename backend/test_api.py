"""
VERICAMP Backend API & Biometric Integration Test Suite
Tests:
  1. Health check & DB engine connectivity
  2. Model loading: YuNet ONNX detector & SFace ONNX recognizer
  3. Face detection with YuNet: single face, landmarks, blank image handling
  4. Admin login & token authorization
  5. Teacher login (EMP-1002 & EMP-1001)
  6. Admin teachers registry & biometric model inspection
  7. Admin live camera face enrollment (YuNet validation + SFace embedding storage)
  8. Face enrollment error handling (blank/dark image rejection)
  9. Genuine face attendance verification (YuNet + SFace pipeline, score >= 85%)
  10. Mismatched face attendance verification (different identity, score < 85%)
  11. Attendance marking with verified face and geofence
  12. Preserved workflow: Leave-blocked attendance policy check for teacher on approved leave
  13. Admin attendance query and filtering
"""

import os
import cv2
import json
import base64
import numpy as np

from app import app, DATASET_DIR
from setup_database import setup_database
from database import get_db_session, FaceEnrollment, User
from face_service import (
    face_service,
    detect_faces,
    compute_face_similarity,
    validate_face_for_enrollment,
    extract_face_embedding,
    YUNET_MODEL_PATH,
    SFACE_MODEL_PATH,
    MODEL_NAME,
    MODEL_VERSION,
    FACE_SIMILARITY_THRESHOLD
)

def image_to_base64(img):
    """Encodes cv2 BGR image to base64 data URL"""
    _, buf = cv2.imencode('.jpg', img)
    return "data:image/jpeg;base64," + base64.b64encode(buf).decode('utf-8')

def run_all_tests():
    print("=" * 70)
    print(" VERICAMP - YuNet + SFace Biometric & REST API Integration Tests")
    print("=" * 70)

    # Step 0: Ensure database is initialized and migrated
    setup_database()
    client = app.test_client()

    passed_tests = []

    # -------------------------------------------------------------
    # 1. Health check
    # -------------------------------------------------------------
    print("\n[TEST 1] Testing /api/health...")
    res = client.get('/api/health')
    assert res.status_code == 200, f"Health check failed: {res.data}"
    print(f"    -> PASSED! Status: {res.json.get('status')}, Engine: {res.json.get('database_engine')}")
    passed_tests.append("1. Health Check")

    # -------------------------------------------------------------
    # 2. Model Loading Test (YuNet + SFace)
    # -------------------------------------------------------------
    print("\n[TEST 2] Testing Model Loading (YuNet ONNX & SFace ONNX)...")
    assert os.path.exists(YUNET_MODEL_PATH), f"YuNet model missing at {YUNET_MODEL_PATH}"
    assert os.path.exists(SFACE_MODEL_PATH), f"SFace model missing at {SFACE_MODEL_PATH}"
    assert face_service.detector is not None, "YuNet cv2.FaceDetectorYN failed to initialize"
    assert face_service.recognizer is not None, "SFace cv2.FaceRecognizerSF failed to initialize"
    print(f"    -> PASSED! YuNet ({os.path.basename(YUNET_MODEL_PATH)}) size: {os.path.getsize(YUNET_MODEL_PATH)} bytes")
    print(f"    -> PASSED! SFace ({os.path.basename(SFACE_MODEL_PATH)}) size: {os.path.getsize(SFACE_MODEL_PATH)} bytes")
    passed_tests.append("2. Model Loading (YuNet + SFace)")

    # -------------------------------------------------------------
    # 3. Face Detection with YuNet
    # -------------------------------------------------------------
    print("\n[TEST 3] Testing Face Detection with YuNet (FaceDetectorYN)...")
    emp2_path = os.path.join(DATASET_DIR, "EMP-1002.jpg")
    assert os.path.exists(emp2_path), f"Sample photo {emp2_path} not found"
    emp2_img = cv2.imread(emp2_path)
    assert emp2_img is not None, "Failed to read EMP-1002.jpg"

    faces = detect_faces(emp2_img)
    assert len(faces) == 1, f"Expected exactly 1 face detected, got {len(faces)}"
    f0 = faces[0]
    box = f0[0:4].astype(int)
    conf = float(f0[14])
    print(f"    -> Detected face box: x={box[0]}, y={box[1]}, w={box[2]}, h={box[3]}, confidence={conf:.3f}")
    assert conf >= 0.75, f"Face confidence too low: {conf}"

    # Blank image detection test
    blank_img = np.zeros((300, 300, 3), dtype=np.uint8)
    blank_faces = detect_faces(blank_img)
    assert len(blank_faces) == 0, f"Expected 0 faces on blank image, got {len(blank_faces)}"
    print("    -> Blank image handled properly: 0 faces detected")
    passed_tests.append("3. Face Detection & Filtering (YuNet)")

    # -------------------------------------------------------------
    # 4. Auth: Admin Login
    # -------------------------------------------------------------
    print("\n[TEST 4] Testing Admin Login (/api/auth/login)...")
    res = client.post('/api/auth/login', json={
        "employee_id": "ADM-001",
        "password": "admin123",
        "role": "admin"
    })
    assert res.status_code == 200, f"Admin login failed: {res.data}"
    admin_token = res.json.get("token")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("    -> PASSED! Token acquired:", admin_token[:25] + "...")
    passed_tests.append("4. Admin Authentication")

    # -------------------------------------------------------------
    # 5. Auth: Teacher Login (EMP-1002)
    # -------------------------------------------------------------
    print("\n[TEST 5] Testing Teacher Login (/api/auth/login)...")
    res = client.post('/api/auth/login', json={
        "employee_id": "EMP-1002",
        "password": "teacher123",
        "role": "teacher"
    })
    assert res.status_code == 200, f"Teacher login failed: {res.data}"
    teacher_token = res.json.get("token")
    teacher_headers = {"Authorization": f"Bearer {teacher_token}"}
    print(f"    -> PASSED! Authenticated as {res.json['user']['full_name']} ({res.json['user']['employee_id']})")
    passed_tests.append("5. Teacher Authentication")

    # -------------------------------------------------------------
    # 6. Admin Teachers Registry & Model Info
    # -------------------------------------------------------------
    print("\n[TEST 6] Testing Admin Teachers API (/api/admin/teachers)...")
    res = client.get('/api/admin/teachers', headers=admin_headers)
    assert res.status_code == 200, f"Get teachers failed: {res.data}"
    teachers = res.json.get("teachers", [])
    print(f"    -> PASSED! Found {len(teachers)} faculty members in registry")
    passed_tests.append("6. Teacher Registry & Status")

    # -------------------------------------------------------------
    # 7. Admin Live Face Enrollment with YuNet + SFace
    # -------------------------------------------------------------
    print("\n[TEST 7] Testing Live Face Enrollment (/api/attendance/enroll-face)...")
    emp2_b64 = image_to_base64(emp2_img)
    res = client.post('/api/attendance/enroll-face', headers=admin_headers, json={
        "employee_id": "EMP-1002",
        "image_base64": emp2_b64
    })
    assert res.status_code == 200, f"Face enrollment failed: {res.data}"
    assert res.json.get("success") is True, f"Enrollment returned success=False: {res.json}"
    print("    -> PASSED! Enrollment response:", res.json.get("message"))

    # Verify DB record has YuNet-SFace-ONNX model_name
    db = get_db_session()
    try:
        u = db.query(User).filter(User.employee_id == "EMP-1002").first()
        fe = db.query(FaceEnrollment).filter(FaceEnrollment.user_id == u.id).first()
        assert fe is not None, "FaceEnrollment record missing"
        assert fe.model_name == MODEL_NAME, f"Expected model {MODEL_NAME}, got {fe.model_name}"
        assert fe.model_version == MODEL_VERSION, f"Expected version {MODEL_VERSION}, got {fe.model_version}"
        assert fe.enrollment_status == "enrolled", f"Status should be enrolled, got {fe.enrollment_status}"
        print(f"    -> Verified DB: model={fe.model_name}, version={fe.model_version}, status={fe.enrollment_status}")
    finally:
        db.close()
    passed_tests.append("7. Admin Live Face Enrollment (YuNet + SFace)")

    # -------------------------------------------------------------
    # 8. Enrollment Error Handling: Blank Image
    # -------------------------------------------------------------
    print("\n[TEST 8] Testing Enrollment Error Handling (Unusable Face Rejection)...")
    blank_b64 = image_to_base64(blank_img)
    res = client.post('/api/attendance/enroll-face', headers=admin_headers, json={
        "employee_id": "EMP-1002",
        "image_base64": blank_b64
    })
    assert res.status_code == 400, f"Expected 400 on blank image, got {res.status_code}"
    assert res.json.get("error") == "Unusable Face", f"Unexpected error title: {res.json}"
    print("    -> PASSED! Rejected blank image with 400:", res.json.get("message"))
    passed_tests.append("8. Enrollment Error Handling (Blank Face)")

    # -------------------------------------------------------------
    # 9. Genuine Face Attendance Verification (Same Person: EMP-1002)
    # -------------------------------------------------------------
    print("\n[TEST 9] Testing Genuine Face Attendance Verification (/api/attendance/verify)...")
    # Present genuine live capture of EMP-1002
    res = client.post('/api/attendance/verify', headers=teacher_headers, json={
        "latitude": 26.8227,
        "longitude": 75.8653,
        "image_base64": emp2_b64
    })
    assert res.status_code == 200, f"Verification failed: {res.data}"
    v_data = res.json
    print(f"    -> Verified: {v_data.get('verified')}, Face Verified: {v_data.get('face_verified')}, Score: {v_data.get('face_score')}%, Distance: {v_data.get('distance_meters')}m")
    assert v_data.get("face_verified") is True, f"Genuine face should be verified, but was not. Reason: {v_data.get('failure_reason')}"
    assert v_data.get("face_score") >= 85.0, f"Score should be >= 85.0%, got {v_data.get('face_score')}%"
    passed_tests.append("9. Genuine Face Verification (Match >= 85%)")

    # -------------------------------------------------------------
    # 10. Mismatched Face Attendance Verification (Different Person)
    # -------------------------------------------------------------
    print("\n[TEST 10] Testing Mismatched Face Attendance Verification (/api/attendance/verify)...")
    emp1_path = os.path.join(DATASET_DIR, "EMP-1001.jpg")
    emp1_img = cv2.imread(emp1_path)
    assert emp1_img is not None, "Failed to read EMP-1001.jpg"
    emp1_b64 = image_to_base64(emp1_img)

    # Present EMP-1001 photo while logged in as EMP-1002
    res = client.post('/api/attendance/verify', headers=teacher_headers, json={
        "latitude": 26.8227,
        "longitude": 75.8653,
        "image_base64": emp1_b64
    })
    assert res.status_code == 200, f"Verification request failed: {res.data}"
    v_data = res.json
    print(f"    -> Face Verified: {v_data.get('face_verified')}, Face Score: {v_data.get('face_score')}%, Failure: {v_data.get('failure_reason')}")
    assert v_data.get("face_verified") is False, "Mismatched face should NOT be verified!"
    assert v_data.get("face_score") < 85.0, f"Mismatched face score should be < 85.0%, got {v_data.get('face_score')}%"
    passed_tests.append("10. Mismatched Face Verification (Rejected < 85%)")

    # -------------------------------------------------------------
    # 11. Attendance Marking via YuNet + SFace (/api/attendance/mark)
    # -------------------------------------------------------------
    print("\n[TEST 11] Testing Attendance Marking (/api/attendance/mark)...")
    res = client.post('/api/attendance/mark', headers=teacher_headers, json={
        "latitude": 26.8227,
        "longitude": 75.8653,
        "image_base64": emp2_b64,
        "device_info": "Automated PyTest / Chrome"
    })
    print("    -> Attendance mark status code:", res.status_code)
    msg = res.json.get("message") if res.json else res.data.decode("utf-8")
    print("    -> Attendance mark response:", msg)
    assert res.status_code in [200, 201, 409], f"Unexpected mark status: {res.status_code}"
    passed_tests.append("11. Attendance Marking (YuNet + SFace)")

    # -------------------------------------------------------------
    # 12. Preserved Policy: Approved Leave Attendance Blocking
    # -------------------------------------------------------------
    print("\n[TEST 12] Testing Leave Approval Workflow Protection...")
    res_emp1_login = client.post('/api/auth/login', json={
        "employee_id": "EMP-1001",
        "password": "teacher123",
        "role": "teacher"
    })
    assert res_emp1_login.status_code == 200
    emp1_headers = {"Authorization": f"Bearer {res_emp1_login.json['token']}"}
    res_leave_blocked = client.post('/api/attendance/verify', headers=emp1_headers, json={
        "latitude": 26.8227,
        "longitude": 75.8653,
        "image_base64": emp1_b64
    })
    assert res_leave_blocked.status_code == 403, f"Expected 403 for teacher on approved leave, got {res_leave_blocked.status_code}"
    assert res_leave_blocked.json.get("leave_blocked") is True
    print(f"    -> PASSED! Approved leave enforcement active: {res_leave_blocked.json.get('message')}")
    passed_tests.append("12. Leave Policy & Workflow Preservation")

    # -------------------------------------------------------------
    # 13. Admin Attendance Query & Filtering (/api/admin/attendance)
    # -------------------------------------------------------------
    print("\n[TEST 13] Testing Admin Attendance Records Query (/api/admin/attendance)...")
    res = client.get('/api/admin/attendance?teacher_id=EMP-1002', headers=admin_headers)
    assert res.status_code == 200, f"Get attendance failed: {res.data}"
    records = res.json.get("records", [])
    print(f"    -> PASSED! Retrieved {len(records)} attendance record(s) for EMP-1002")
    passed_tests.append("13. Admin Attendance Query & Filters")

    # -------------------------------------------------------------
    # Summary
    # -------------------------------------------------------------
    print("\n" + "=" * 70)
    print(f" ALL {len(passed_tests)} INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)
    for t in passed_tests:
        print(f"  [x] {t}")
    print("=" * 70)

if __name__ == "__main__":
    run_all_tests()
