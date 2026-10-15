"""
VERICAMP - Smart Campus Facial Recognition & Teacher Attendance System
Backend REST API (Flask + SQLAlchemy + PyMySQL / SQLite Fallback)
Supports MySQL 8.x / MariaDB / Workbench and SQLite fallback for local development.
Problem Statement: IEEE-IGNITE Hackathon SKIT023
"""

import os
import math
import time
import json
import base64
import numpy as np
import cv2
from datetime import datetime, date, timedelta
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from sqlalchemy import func, or_, and_

from database import (
    get_db_session, engine, IS_MYSQL, DB_URI,
    User, FaceEnrollment, AttendanceRecord, CampusSettings, AuditLog,
    LeaveRequest, FaceUpdateRequest, Notification
)

FRONTEND_DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
app = Flask(__name__, static_folder=None)
CORS(app, resources={r"/api/*": {"origins": "*"}})

DATASET_DIR = os.path.join(os.path.dirname(__file__), "dataset", "faces")
os.makedirs(DATASET_DIR, exist_ok=True)

# Face Biometric Service (YuNet ONNX Detector + SFace ONNX Recognizer)
from face_service import (
    face_service,
    decode_base64_image,
    detect_faces,
    validate_face_for_enrollment,
    extract_face_embedding,
    extract_face_roi,
    compute_face_similarity,
    MODEL_NAME,
    MODEL_VERSION,
    FACE_SIMILARITY_THRESHOLD
)

# Helper: Haversine distance formula in meters
def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371000  # Earth's radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)


# --- Auth Helpers ---
def extract_token_user():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ")[1].strip()
    try:
        parts = token.split("_")
        if len(parts) >= 3 and parts[0] == "usr":
            user_id = int(parts[1])
            db = get_db_session()
            try:
                user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
                if user:
                    return user.to_dict()
            finally:
                db.close()
    except Exception as e:
        print("Token parsing error:", e)
    return None

def login_required(role=None):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = extract_token_user()
            if not user:
                return jsonify({"error": "Unauthorized", "message": "Valid authentication token required"}), 401
            if role and user["role"] != role:
                return jsonify({"error": "Forbidden", "message": f"Requires {role} role access"}), 403
            return f(user, *args, **kwargs)
        return decorated_function
    return decorator

# --- API ROUTES ---

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "service": "VERICAMP Backend REST API",
        "database_engine": "MySQL (PyMySQL)" if IS_MYSQL else "SQLite (Fallback)",
        "timestamp": datetime.now().isoformat(),
        "institution": "SKIT Campus Attendance Portal"
    })

# 1. Auth: Login
@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    data = request.get_json() or {}
    employee_id = data.get("employee_id", "").strip()
    password = data.get("password", "").strip()
    selected_role = data.get("role", "").strip().lower()

    if not employee_id or not password or not selected_role:
        return jsonify({"error": "Bad Request", "message": "Employee ID, password, and role are required."}), 400

    if selected_role not in ["teacher", "admin"]:
        return jsonify({"error": "Bad Request", "message": "Invalid role specified."}), 400

    db = get_db_session()
    try:
        user = db.query(User).filter(
            func.lower(User.employee_id) == employee_id.lower(),
            User.role == selected_role
        ).first()

        if not user and selected_role == "teacher":
            # Auto-provision teacher if logging in with new teacher code
            target_emp = employee_id.upper()
            user = User(
                employee_id=target_emp,
                username=target_emp.lower(),
                full_name=f"Faculty {target_emp}",
                email=f"{target_emp.lower()}@vericamp.edu",
                department="Computer Science & Engg",
                role="teacher",
                is_active=True,
                created_at=datetime.utcnow()
            )
            user.set_password(password or "teacher123")
            db.add(user)
            db.flush()

            tmpl = f"sha256_vec_{target_emp.lower()}_yunet_sface"
            fe = FaceEnrollment(
                user_id=user.id,
                face_template=tmpl,
                template_hash=tmpl,
                status="enrolled",
                model_name=MODEL_NAME,
                model_version=MODEL_VERSION,
                enrollment_status="enrolled",
                enrolled_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(fe)
            db.commit()

        # If user exists and teacher123 was entered for teacher role, accept or update
        if user and selected_role == "teacher" and not user.check_password(password):
            if password == "teacher123":
                user.set_password("teacher123")
                db.commit()

        if not user or not user.check_password(password):
            return jsonify({"error": "Unauthorized", "message": "Invalid Employee ID or Password for the selected role."}), 401

        if not user.is_active:
            return jsonify({"error": "Forbidden", "message": "Account has been deactivated. Please contact administrator."}), 403

        token = f"usr_{user.id}_{user.role}_{int(time.time())}"

        audit = AuditLog(
            user_id=user.id,
            action="USER_LOGIN",
            target_type="USER",
            target_id=str(user.id),
            details=f"Login successful as {user.role} ({user.employee_id})",
            timestamp=datetime.utcnow()
        )
        db.add(audit)
        db.commit()

        user_data = user.to_dict()
        return jsonify({
            "token": token,
            "user": user_data
        })
    finally:
        db.close()

# 2. Auth: Me
@app.route("/api/auth/me", methods=["GET"])
def auth_me():
    user = extract_token_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify({"user": user})

# 3. Auth: Logout
@app.route("/api/auth/logout", methods=["POST"])
def auth_logout():
    return jsonify({"success": True, "message": "Logged out successfully."})

# 4. Teacher: Dashboard Metrics
@app.route("/api/teacher/dashboard", methods=["GET"])
@login_required(role="teacher")
def teacher_dashboard(user):
    db = get_db_session()
    try:
        today_val = date.today()
        first_day_month = today_val.replace(day=1)

        # Check if teacher has an approved leave for TODAY
        active_leave_today = db.query(LeaveRequest).filter(
            LeaveRequest.teacher_id == user["id"],
            LeaveRequest.status == "approved",
            LeaveRequest.start_date <= today_val,
            LeaveRequest.end_date >= today_val
        ).first()

        today_rec = db.query(AttendanceRecord).filter(
            AttendanceRecord.user_id == user["id"],
            AttendanceRecord.attendance_date == today_val,
            AttendanceRecord.attendance_status.in_(["present", "late"])
        ).order_by(AttendanceRecord.id.desc()).first()

        present_count = db.query(AttendanceRecord).filter(
            AttendanceRecord.user_id == user["id"],
            AttendanceRecord.attendance_date >= first_day_month,
            AttendanceRecord.attendance_status.in_(["present", "late"])
        ).count()

        rejected_count = db.query(AttendanceRecord).filter(
            AttendanceRecord.user_id == user["id"],
            AttendanceRecord.attendance_date >= first_day_month,
            AttendanceRecord.attendance_status == "rejected"
        ).count()

        last_rec = db.query(AttendanceRecord).filter(
            AttendanceRecord.user_id == user["id"],
            AttendanceRecord.attendance_status.in_(["present", "late"])
        ).order_by(AttendanceRecord.id.desc()).first()

        recent_records = db.query(AttendanceRecord).filter(
            AttendanceRecord.user_id == user["id"]
        ).order_by(AttendanceRecord.id.desc()).limit(5).all()

        campus = db.query(CampusSettings).first()
        campus_dict = campus.to_dict() if campus else None

        # Teacher leave counts
        pending_leaves_count = db.query(LeaveRequest).filter(
            LeaveRequest.teacher_id == user["id"],
            LeaveRequest.status == "pending"
        ).count()

        approved_leaves_month = db.query(LeaveRequest).filter(
            LeaveRequest.teacher_id == user["id"],
            LeaveRequest.status == "approved",
            LeaveRequest.end_date >= first_day_month
        ).count()

        # Latest face update request
        latest_face_request = db.query(FaceUpdateRequest).filter(
            FaceUpdateRequest.teacher_id == user["id"]
        ).order_by(FaceUpdateRequest.id.desc()).first()

        # Unread notifications
        unread_notifs = db.query(Notification).filter(
            Notification.recipient_user_id == user["id"],
            Notification.is_read == False
        ).count()

        return jsonify({
            "teacher": {
                "id": user["id"],
                "full_name": user["full_name"],
                "employee_id": user["employee_id"],
                "department": user["department"]
            },
            "today_status": "present" if today_rec else "not_marked",
            "today_record": today_rec.to_dict() if today_rec else None,
            "total_present_month": present_count,
            "total_absent_month": max(0, 22 - present_count),
            "total_rejected_attempts": rejected_count,
            "last_checkin": last_rec.to_dict() if last_rec else None,
            "recent_records": [r.to_dict() for r in recent_records],
            "campus_settings": campus_dict,
            "active_leave_today": active_leave_today.to_dict() if active_leave_today else None,
            "is_on_leave_today": active_leave_today is not None,
            "pending_leaves_count": pending_leaves_count,
            "approved_leaves_month": approved_leaves_month,
            "latest_face_request": latest_face_request.to_dict() if latest_face_request else None,
            "unread_notifications_count": unread_notifs
        })
    finally:
        db.close()

# 5. Attendance: Verify Pre-check (Face + Geofence check)
@app.route("/api/attendance/verify", methods=["POST"])
@login_required(role="teacher")
def attendance_verify(user):
    data = request.get_json() or {}
    lat = data.get("latitude")
    lon = data.get("longitude")
    image_data = data.get("image_base64", "")

    if lat is None or lon is None:
        return jsonify({"error": "Bad Request", "message": "Latitude and longitude are required."}), 400

    db = get_db_session()
    try:
        today_val = date.today()

        # RESTRICTION: Attendance Denied During Approved Leave
        active_leave = db.query(LeaveRequest).filter(
            LeaveRequest.teacher_id == user["id"],
            LeaveRequest.status == "approved",
            LeaveRequest.start_date <= today_val,
            LeaveRequest.end_date >= today_val
        ).first()

        if active_leave:
            audit = AuditLog(
                user_id=user["id"],
                action="ATTENDANCE_DENIED_APPROVED_LEAVE",
                target_type="LEAVE",
                target_id=str(active_leave.id),
                details=f"Attendance pre-verification blocked for {user['employee_id']}: Approved {active_leave.leave_type} covering {today_val.isoformat()}.",
                timestamp=datetime.utcnow()
            )
            db.add(audit)
            db.commit()
            return jsonify({
                "error": "Forbidden",
                "leave_blocked": True,
                "leave_type": active_leave.leave_type,
                "start_date": active_leave.start_date.isoformat(),
                "end_date": active_leave.end_date.isoformat(),
                "message": f"Your {active_leave.leave_type} is approved for today ({today_val.isoformat()}). Attendance marking is unavailable."
            }), 403

        campus = db.query(CampusSettings).first()
        if not campus:
            return jsonify({"error": "System Error", "message": "Campus settings not configured."}), 500

        campus_lat = float(campus.latitude)
        campus_lon = float(campus.longitude)
        allowed_radius = float(campus.allowed_radius_meters)

        distance = haversine_distance(float(lat), float(lon), campus_lat, campus_lon)
        is_inside = distance <= allowed_radius

        face_enrollment = db.query(FaceEnrollment).filter(FaceEnrollment.user_id == user["id"]).first()
        if not face_enrollment or face_enrollment.enrollment_status != "enrolled":
            return jsonify({
                "verified": False,
                "face_verified": False,
                "face_score": 0.0,
                "location_verified": is_inside,
                "distance_meters": distance,
                "allowed_radius_meters": allowed_radius,
                "failure_reason": "Teacher face template is not enrolled. Please contact institutional admin."
            })

        ref_photo_path = None
        for ext in ['.jpg', '.jpeg', '.png']:
            candidate = os.path.join(DATASET_DIR, f"{user['employee_id']}{ext}")
            if os.path.exists(candidate):
                ref_photo_path = candidate
                break

        live_img = decode_base64_image(image_data)
        if live_img is None:
            face_score = 0.0
            face_verified = False
            face_failure = "Invalid or unreadable camera image data."
        elif ref_photo_path:
            ref_img = cv2.imread(ref_photo_path)
            face_verified, face_score, face_failure = compute_face_similarity(live_img, ref_img)
        else:
            face_score = 0.0
            face_verified = False
            face_failure = "Teacher face template reference photo missing. Please contact institutional admin."

        overall_verified = face_verified and is_inside
        failure_reasons = []
        if not is_inside:
            failure_reasons.append(f"Outside approved campus geofence ({distance}m > {allowed_radius}m)")
        if not face_verified:
            failure_reasons.append(face_failure or f"Facial similarity match too low ({face_score}% < 85%)")

        return jsonify({
            "verified": overall_verified,
            "face_verified": face_verified,
            "face_score": face_score,
            "location_verified": is_inside,
            "distance_meters": distance,
            "allowed_radius_meters": allowed_radius,
            "has_dataset_photo": ref_photo_path is not None,
            "failure_reason": "; ".join(failure_reasons) if failure_reasons else None
        })
    finally:
        db.close()

# 6. Attendance: Mark Final
@app.route("/api/attendance/mark", methods=["POST"])
@login_required(role="teacher")
def attendance_mark(user):
    data = request.get_json() or {}
    lat = data.get("latitude")
    lon = data.get("longitude")
    image_data = data.get("image_base64") or data.get("image_data") or ""
    device_info = data.get("device_info", request.headers.get("User-Agent", "Web Browser"))

    if lat is None or lon is None:
        return jsonify({"error": "Bad Request", "message": "Coordinates are required to mark attendance."}), 400

    db = get_db_session()
    try:
        today_val = date.today()
        now_time = datetime.now().time()
        now_dt = datetime.utcnow()

        # RESTRICTION: Attendance Denied During Approved Leave (Backend enforcement)
        active_leave = db.query(LeaveRequest).filter(
            LeaveRequest.teacher_id == user["id"],
            LeaveRequest.status == "approved",
            LeaveRequest.start_date <= today_val,
            LeaveRequest.end_date >= today_val
        ).first()

        if active_leave:
            audit = AuditLog(
                user_id=user["id"],
                action="ATTENDANCE_DENIED_APPROVED_LEAVE",
                target_type="LEAVE",
                target_id=str(active_leave.id),
                details=f"Attendance denied for {user['employee_id']}: Teacher has approved {active_leave.leave_type} covering {today_val.isoformat()} ({active_leave.start_date} to {active_leave.end_date}).",
                timestamp=now_dt
            )
            db.add(audit)
            db.commit()
            return jsonify({
                "error": "Forbidden",
                "leave_blocked": True,
                "leave_type": active_leave.leave_type,
                "start_date": active_leave.start_date.isoformat(),
                "end_date": active_leave.end_date.isoformat(),
                "message": f"Your {active_leave.leave_type} is approved for today ({today_val.isoformat()}). Attendance marking is unavailable."
            }), 403

        # Prevent duplicate attendance submission
        existing = db.query(AttendanceRecord).filter(
            AttendanceRecord.user_id == user["id"],
            AttendanceRecord.attendance_date == today_val,
            AttendanceRecord.attendance_status.in_(["present", "late"])
        ).first()

        if existing:
            return jsonify({
                "error": "Conflict",
                "message": f"Attendance already recorded today at {existing.check_in_time.strftime('%H:%M:%S')}."
            }), 409

        campus = db.query(CampusSettings).first()
        distance = haversine_distance(float(lat), float(lon), float(campus.latitude), float(campus.longitude))
        is_inside = distance <= float(campus.allowed_radius_meters)

        ref_photo_path = None
        for ext in ['.jpg', '.jpeg', '.png']:
            candidate = os.path.join(DATASET_DIR, f"{user['employee_id']}{ext}")
            if os.path.exists(candidate):
                ref_photo_path = candidate
                break

        live_img = decode_base64_image(image_data)
        if live_img is None:
            face_score = 0.0
            face_passed = False
            face_err = "No live frame capture data received."
        elif ref_photo_path:
            ref_img = cv2.imread(ref_photo_path)
            face_passed, face_score, face_err = compute_face_similarity(live_img, ref_img)
        else:
            face_score = 0.0
            face_passed = False
            face_err = "Teacher face template is not enrolled. Please contact institutional admin."

        if not is_inside or not face_passed:
            failure_reason = ""
            if not is_inside:
                failure_reason += f"Outside Campus Geofence ({distance}m > {campus.allowed_radius_meters}m). "
            if not face_passed:
                failure_reason += f"Facial Match Verification Failed ({face_score}%). "

            rec = AttendanceRecord(
                user_id=user["id"],
                attendance_date=today_val,
                check_in_time=now_time,
                latitude=float(lat),
                longitude=float(lon),
                distance_meters=float(distance),
                face_score=float(face_score),
                face_verification_status="failed",
                location_verification_status="verified" if is_inside else "failed",
                attendance_status="rejected",
                device_info=device_info,
                failure_reason=failure_reason.strip(),
                created_at=now_dt
            )
            db.add(rec)
            db.flush()

            audit = AuditLog(
                user_id=user["id"],
                action="ATTENDANCE_REJECTED",
                target_type="ATTENDANCE",
                target_id=str(rec.id),
                details=f"Rejected check-in for {user['employee_id']}: {failure_reason}",
                timestamp=now_dt
            )
            db.add(audit)
            db.commit()

            return jsonify({
                "success": False,
                "status": "rejected",
                "message": failure_reason.strip(),
                "distance_meters": distance,
                "face_score": face_score
            }), 400

        # Late threshold: 09:30 AM
        attendance_status = "late" if now_time.hour > 9 or (now_time.hour == 9 and now_time.minute > 30) else "present"

        rec = AttendanceRecord(
            user_id=user["id"],
            attendance_date=today_val,
            check_in_time=now_time,
            latitude=float(lat),
            longitude=float(lon),
            distance_meters=float(distance),
            face_score=float(face_score),
            face_verification_status="verified",
            location_verification_status="verified",
            attendance_status=attendance_status,
            device_info=device_info,
            created_at=now_dt
        )
        db.add(rec)
        db.flush()

        audit = AuditLog(
            user_id=user["id"],
            action="ATTENDANCE_MARKED",
            target_type="ATTENDANCE",
            target_id=str(rec.id),
            details=f"Attendance marked ({attendance_status}) at {now_dt.isoformat()}. Distance: {distance}m, Face: {face_score}%.",
            timestamp=now_dt
        )
        db.add(audit)
        db.commit()

        return jsonify({
            "success": True,
            "record_id": rec.id,
            "status": attendance_status,
            "date": today_val.isoformat(),
            "timestamp": now_dt.isoformat(),
            "distance_meters": distance,
            "face_score": face_score,
            "message": f"Attendance verified & recorded successfully ({attendance_status.upper()})."
        })
    finally:
        db.close()

# 7. Attendance: History (Teacher's own history)
@app.route("/api/attendance/history", methods=["GET"])
@login_required(role="teacher")
def attendance_history(user):
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    status_filter = request.args.get("status")

    db = get_db_session()
    try:
        q = db.query(AttendanceRecord).filter(AttendanceRecord.user_id == user["id"])
        if start_date:
            try:
                dt_start = datetime.strptime(start_date, "%Y-%m-%d").date()
                q = q.filter(AttendanceRecord.attendance_date >= dt_start)
            except:
                pass
        if end_date:
            try:
                dt_end = datetime.strptime(end_date, "%Y-%m-%d").date()
                q = q.filter(AttendanceRecord.attendance_date <= dt_end)
            except:
                pass
        if status_filter and status_filter != "all":
            q = q.filter(AttendanceRecord.attendance_status == status_filter)

        records = q.order_by(AttendanceRecord.id.desc()).all()
        return jsonify({"records": [r.to_dict() for r in records]})
    finally:
        db.close()

# 8. Admin: Dashboard Overview & Analytics
@app.route("/api/admin/dashboard", methods=["GET"])
@login_required(role="admin")
def admin_dashboard(user):
    db = get_db_session()
    try:
        today_val = date.today()

        total_teachers = db.query(User).filter(User.role == "teacher", User.is_active == True).count()
        present_today = db.query(func.count(func.distinct(AttendanceRecord.user_id))).filter(
            AttendanceRecord.attendance_date == today_val,
            AttendanceRecord.attendance_status.in_(["present", "late"])
        ).scalar() or 0

        # Teachers on approved leave today
        on_leave_today = db.query(func.count(func.distinct(LeaveRequest.teacher_id))).filter(
            LeaveRequest.status == "approved",
            LeaveRequest.start_date <= today_val,
            LeaveRequest.end_date >= today_val
        ).scalar() or 0

        absent_today = max(0, total_teachers - present_today - on_leave_today)
        rejected_today = db.query(AttendanceRecord).filter(
            AttendanceRecord.attendance_date == today_val,
            AttendanceRecord.attendance_status == "rejected"
        ).count()

        # Pending workflow requests
        pending_leaves = db.query(LeaveRequest).filter(LeaveRequest.status == "pending").count()
        pending_face_updates = db.query(FaceUpdateRequest).filter(FaceUpdateRequest.status == "pending").count()

        recent_events = db.query(AttendanceRecord).order_by(AttendanceRecord.id.desc()).limit(10).all()

        weekly_trends = []
        for i in range(6, -1, -1):
            day = today_val - timedelta(days=i)
            p_count = db.query(AttendanceRecord).filter(
                AttendanceRecord.attendance_date == day,
                AttendanceRecord.attendance_status.in_(["present", "late"])
            ).count()
            r_count = db.query(AttendanceRecord).filter(
                AttendanceRecord.attendance_date == day,
                AttendanceRecord.attendance_status == "rejected"
            ).count()
            weekly_trends.append({
                "date": day.isoformat(),
                "day_name": day.strftime("%a"),
                "present": p_count,
                "absent": max(0, total_teachers - p_count),
                "rejected": r_count
            })

        teachers_list = db.query(User).filter(User.role == "teacher", User.is_active == True).all()
        dept_counts = {}
        for t in teachers_list:
            d = t.department
            if d not in dept_counts:
                dept_counts[d] = {"department": d, "total_faculty": 0, "present_count": 0}
            dept_counts[d]["total_faculty"] += 1

        today_present_users = db.query(AttendanceRecord.user_id).filter(
            AttendanceRecord.attendance_date == today_val,
            AttendanceRecord.attendance_status.in_(["present", "late"])
        ).distinct().all()
        present_user_ids = {u[0] for u in today_present_users}

        for t in teachers_list:
            if t.id in present_user_ids:
                dept_counts[t.department]["present_count"] += 1

        department_stats = list(dept_counts.values())

        return jsonify({
            "summary": {
                "total_teachers": total_teachers,
                "present_today": present_today,
                "on_leave_today": on_leave_today,
                "absent_today": absent_today,
                "rejected_today": rejected_today,
                "pending_leaves": pending_leaves,
                "pending_face_updates": pending_face_updates,
                "attendance_rate": round((present_today / total_teachers * 100), 1) if total_teachers > 0 else 0
            },
            "weekly_trends": weekly_trends,
            "department_stats": department_stats,
            "recent_events": [r.to_dict() for r in recent_events]
        })
    finally:
        db.close()

# 9. Admin: Teacher Management (View & Add)
@app.route("/api/admin/teachers", methods=["GET", "POST"])
@login_required(role="admin")
def admin_teachers(user):
    db = get_db_session()
    try:
        if request.method == "GET":
            teachers = db.query(User).filter(User.role == "teacher").order_by(User.id.asc()).all()
            result = []
            for t in teachers:
                td = t.to_dict()
                has_photo = any(os.path.exists(os.path.join(DATASET_DIR, f"{td['employee_id']}{ext}")) for ext in ['.jpg', '.jpeg', '.png'])
                if td.get("face_enrollment_status") == "enrolled" and has_photo:
                    td["face_enrollment_status"] = "enrolled"
                    td["is_enrolled"] = True
                else:
                    td["face_enrollment_status"] = "not_enrolled"
                    td["is_enrolled"] = False
                result.append(td)
            return jsonify({"teachers": result})

        # POST: Add new teacher
        data = request.get_json() or {}
        emp_id = data.get("employee_id", "").strip().upper()
        name = data.get("full_name", "").strip()
        dept = data.get("department", "").strip()
        email = data.get("email", "").strip()
        phone = data.get("phone", "").strip()
        password = data.get("password", "teacher123").strip()
        auto_enroll = data.get("auto_enroll_face", False)

        if not emp_id or not name or not dept or not email:
            return jsonify({"error": "Bad Request", "message": "Employee ID, name, department, and email are required."}), 400

        existing = db.query(User).filter(func.upper(User.employee_id) == emp_id).first()
        if existing:
            return jsonify({"error": "Conflict", "message": f"A user with Employee ID '{emp_id}' already exists."}), 409

        new_user = User(
            employee_id=emp_id,
            username=emp_id.lower(),
            full_name=name,
            email=email,
            department=dept,
            role="teacher",
            phone=phone,
            is_active=True,
            created_at=datetime.utcnow()
        )
        new_user.set_password(password)
        db.add(new_user)
        db.flush()

        enroll_status = "enrolled" if auto_enroll else "pending"
        tmpl = f"sha256_vec_{emp_id.lower()}_yunet_sface"
        fe = FaceEnrollment(
            user_id=new_user.id,
            face_template=tmpl,
            template_hash=tmpl,
            status=enroll_status,
            model_name=MODEL_NAME,
            model_version=MODEL_VERSION,
            enrollment_status=enroll_status,
            enrolled_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(fe)

        audit = AuditLog(
            user_id=user["id"],
            action="TEACHER_CREATED",
            target_type="TEACHER",
            target_id=str(new_user.id),
            details=f"Created faculty {name} ({emp_id}), Department: {dept}",
            timestamp=datetime.utcnow()
        )
        db.add(audit)
        db.commit()

        return jsonify({
            "success": True,
            "message": f"Faculty {name} created successfully.",
            "teacher": new_user.to_dict()
        }), 201
    finally:
        db.close()

# 10. Admin: Edit Teacher Account
@app.route("/api/admin/teachers/<path:teacher_id>", methods=["PUT"])
@login_required(role="admin")
def admin_edit_teacher(user, teacher_id):
    db = get_db_session()
    try:
        data = request.get_json() or {}
        emp_id = data.get("employee_id", "").strip().upper()

        teacher = None
        try:
            int_id = int(teacher_id)
            teacher = db.query(User).filter(User.id == int_id, User.role == "teacher").first()
        except (ValueError, TypeError):
            pass

        if not teacher and emp_id:
            teacher = db.query(User).filter(func.upper(User.employee_id) == emp_id, User.role == "teacher").first()
        if not teacher:
            teacher = db.query(User).filter(func.upper(User.employee_id) == str(teacher_id).upper(), User.role == "teacher").first()

        # If teacher not found in DB yet (e.g. from local cache), provision them now
        if not teacher:
            target_emp = emp_id or str(teacher_id).upper()
            fn = data.get("full_name", "").strip() or f"Faculty {target_emp}"
            dp = data.get("department", "").strip() or "Computer Science & Engg"
            em = data.get("email", "").strip() or f"{target_emp.lower()}@vericamp.edu"
            ph = data.get("phone", "").strip()
            pw = data.get("password", "").strip() or "teacher123"

            teacher = User(
                employee_id=target_emp,
                username=target_emp.lower(),
                full_name=fn,
                email=em,
                department=dp,
                role="teacher",
                phone=ph,
                is_active=bool(data.get("is_active", True)),
                created_at=datetime.utcnow()
            )
            teacher.set_password(pw)
            db.add(teacher)
            db.flush()

            tmpl = f"sha256_vec_{target_emp.lower()}_yunet_sface"
            fe = FaceEnrollment(
                user_id=teacher.id,
                face_template=tmpl,
                template_hash=tmpl,
                status="enrolled",
                model_name=MODEL_NAME,
                model_version=MODEL_VERSION,
                enrollment_status="enrolled",
                enrolled_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(fe)

        full_name = data.get("full_name", "").strip()
        department = data.get("department", "").strip()
        email = data.get("email", "").strip()
        phone = data.get("phone", "").strip()
        new_password = data.get("password", "").strip()
        is_active = data.get("is_active")

        if full_name:
            teacher.full_name = full_name
        if department:
            teacher.department = department
        if email:
            teacher.email = email
        if phone is not None:
            teacher.phone = phone
        if new_password:
            teacher.set_password(new_password)
        if is_active is not None:
            teacher.is_active = bool(is_active)

        audit = AuditLog(
            user_id=user["id"],
            action="TEACHER_EDITED",
            target_type="TEACHER",
            target_id=str(teacher.id),
            details=f"Admin edited faculty account {teacher.employee_id} ({teacher.full_name}).",
            timestamp=datetime.utcnow()
        )
        db.add(audit)
        db.commit()

        return jsonify({
            "success": True,
            "message": f"Faculty {teacher.full_name} updated successfully.",
            "teacher": teacher.to_dict()
        })
    finally:
        db.close()

# 11. Admin: Toggle Teacher Active Status
@app.route("/api/admin/teachers/<path:teacher_id>/status", methods=["PUT"])
@login_required(role="admin")
def admin_toggle_teacher_status(user, teacher_id):
    db = get_db_session()
    try:
        target = None
        try:
            int_id = int(teacher_id)
            target = db.query(User).filter(User.id == int_id, User.role == "teacher").first()
        except (ValueError, TypeError):
            pass
        if not target:
            target = db.query(User).filter(func.upper(User.employee_id) == str(teacher_id).upper(), User.role == "teacher").first()

        if not target:
            return jsonify({"error": "Not Found", "message": "Teacher not found."}), 404

        target.is_active = not target.is_active
        new_status = 1 if target.is_active else 0
        action_label = "Activated" if target.is_active else "Deactivated"

        audit = AuditLog(
            user_id=user["id"],
            action="TEACHER_STATUS_CHANGED",
            target_type="TEACHER",
            target_id=str(teacher_id),
            details=f"{action_label} teacher {target.full_name} ({target.employee_id})",
            timestamp=datetime.utcnow()
        )
        db.add(audit)
        db.commit()

        return jsonify({
            "success": True,
            "is_active": new_status,
            "message": f"Teacher {target.full_name} has been {action_label.lower()}."
        })
    finally:
        db.close()

# 12. Admin: Attendance Records & Filter
@app.route("/api/admin/attendance", methods=["GET"])
@login_required(role="admin")
def admin_attendance(user):
    date_val = request.args.get("date")
    dept = request.args.get("department")
    status_val = request.args.get("status")
    search = request.args.get("search", "").strip()
    teacher_id = request.args.get("teacher_id")

    db = get_db_session()
    try:
        q = db.query(AttendanceRecord).join(User, AttendanceRecord.user_id == User.id)

        if date_val:
            try:
                dt = datetime.strptime(date_val, "%Y-%m-%d").date()
                q = q.filter(AttendanceRecord.attendance_date == dt)
            except:
                pass
        if dept and dept != "all":
            q = q.filter(User.department == dept)
        if status_val and status_val != "all":
            q = q.filter(AttendanceRecord.attendance_status == status_val)
        if teacher_id and teacher_id != "all":
            q = q.filter((User.id == teacher_id) | (User.employee_id == teacher_id))
        if search:
            q = q.filter((User.full_name.ilike(f"%{search}%")) | (User.employee_id.ilike(f"%{search}%")))

        records = q.order_by(AttendanceRecord.id.desc()).limit(200).all()
        return jsonify({"records": [r.to_dict() for r in records]})
    finally:
        db.close()

# 13. Admin: Campus Settings (Get & Update)
@app.route("/api/admin/campus-settings", methods=["GET", "PUT"])
@login_required(role="admin")
def admin_campus_settings(user):
    db = get_db_session()
    try:
        settings = db.query(CampusSettings).first()
        if request.method == "GET":
            return jsonify({"settings": settings.to_dict() if settings else None})

        # PUT: Update settings
        data = request.get_json() or {}
        campus_name = data.get("campus_name", "").strip()
        latitude = data.get("latitude")
        longitude = data.get("longitude")
        allowed_radius = data.get("allowed_radius_meters")
        wifi_required = bool(data.get("wifi_ssid_required"))
        wifi_name = data.get("wifi_ssid_name", "")

        if not campus_name or latitude is None or longitude is None or allowed_radius is None:
            return jsonify({"error": "Bad Request", "message": "Campus name, latitude, longitude, and radius are required."}), 400

        if not settings:
            settings = CampusSettings(id=1)
            db.add(settings)

        settings.campus_name = campus_name
        settings.latitude = float(latitude)
        settings.longitude = float(longitude)
        settings.allowed_radius_meters = float(allowed_radius)
        settings.wifi_ssid_required = wifi_required
        settings.wifi_ssid_name = wifi_name
        settings.updated_at = datetime.utcnow()

        audit = AuditLog(
            user_id=user["id"],
            action="CAMPUS_SETTINGS_UPDATED",
            target_type="SETTINGS",
            target_id="1",
            details=f"Updated campus boundary: {campus_name}, Lat: {latitude}, Lon: {longitude}, Radius: {allowed_radius}m",
            timestamp=datetime.utcnow()
        )
        db.add(audit)
        db.commit()

        return jsonify({"success": True, "message": "Campus settings updated successfully.", "settings": settings.to_dict()})
    finally:
        db.close()

# 14. Admin: Audit Logs
@app.route("/api/admin/audit-logs", methods=["GET"])
@login_required(role="admin")
def admin_audit_logs(user):
    db = get_db_session()
    try:
        logs = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(100).all()
        return jsonify({"logs": [l.to_dict() for l in logs]})
    finally:
        db.close()

# ==============================================================================
# SECTION A: LEAVE MANAGEMENT APIS (Teacher Application & Admin Approval)
# ==============================================================================

# A1. Teacher: View Own Leave Requests
@app.route("/api/teacher/leaves", methods=["GET"])
@login_required(role="teacher")
def get_teacher_leaves(user):
    db = get_db_session()
    try:
        leaves = db.query(LeaveRequest).filter(
            LeaveRequest.teacher_id == user["id"]
        ).order_by(LeaveRequest.id.desc()).all()
        return jsonify({"leaves": [l.to_dict() for l in leaves]})
    finally:
        db.close()

# A2. Teacher: Apply for Leave
@app.route("/api/teacher/leaves", methods=["POST"])
@login_required(role="teacher")
def apply_teacher_leave(user):
    data = request.get_json() or {}
    leave_type = data.get("leave_type", "").strip()
    start_date_str = data.get("start_date", "").strip()
    end_date_str = data.get("end_date", "").strip()
    reason = data.get("reason", "").strip()

    if not leave_type or not start_date_str or not end_date_str or not reason:
        return jsonify({"error": "Bad Request", "message": "Leave type, start date, end date, and reason are required."}), 400

    try:
        start_d = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        end_d = datetime.strptime(end_date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Bad Request", "message": "Invalid date format. Expected YYYY-MM-DD."}), 400

    if end_d < start_d:
        return jsonify({"error": "Bad Request", "message": "End date cannot be earlier than start date."}), 400

    db = get_db_session()
    try:
        # Check for overlapping active (pending or approved) requests for this teacher
        overlapping = db.query(LeaveRequest).filter(
            LeaveRequest.teacher_id == user["id"],
            LeaveRequest.status.in_(["pending", "approved"]),
            LeaveRequest.start_date <= end_d,
            LeaveRequest.end_date >= start_d
        ).first()

        if overlapping:
            return jsonify({
                "error": "Conflict",
                "message": f"You already have a {overlapping.status} leave request ({overlapping.leave_type}) overlapping with these dates ({overlapping.start_date} to {overlapping.end_date})."
            }), 409

        now_dt = datetime.utcnow()
        new_leave = LeaveRequest(
            teacher_id=user["id"],
            leave_type=leave_type,
            start_date=start_d,
            end_date=end_d,
            reason=reason,
            status="pending",
            created_at=now_dt,
            updated_at=now_dt
        )
        db.add(new_leave)
        db.flush()

        # Notify All Active Administrators
        admins = db.query(User).filter(User.role == "admin", User.is_active == True).all()
        for admin in admins:
            notif = Notification(
                recipient_user_id=admin.id,
                notification_type="leave_request",
                title=f"New Leave Request: {user['full_name']}",
                message=f"{user['full_name']} ({user['employee_id']}) applied for {leave_type} from {start_date_str} to {end_date_str}. Reason: {reason}",
                related_record_id=str(new_leave.id),
                created_at=now_dt
            )
            db.add(notif)

        audit = AuditLog(
            user_id=user["id"],
            action="LEAVE_APPLIED",
            target_type="LEAVE",
            target_id=str(new_leave.id),
            details=f"{user['employee_id']} submitted {leave_type} request for {start_date_str} to {end_date_str}.",
            timestamp=now_dt
        )
        db.add(audit)
        db.commit()

        return jsonify({
            "success": True,
            "message": "Leave application submitted successfully. Awaiting administrative review.",
            "leave": new_leave.to_dict()
        }), 201
    finally:
        db.close()

# A3. Teacher: Cancel Pending Leave Request
@app.route("/api/teacher/leaves/<int:leave_id>/cancel", methods=["PUT"])
@login_required(role="teacher")
def cancel_teacher_leave(user, leave_id):
    db = get_db_session()
    try:
        leave = db.query(LeaveRequest).filter(
            LeaveRequest.id == leave_id,
            LeaveRequest.teacher_id == user["id"]
        ).first()

        if not leave:
            return jsonify({"error": "Not Found", "message": "Leave request not found."}), 404

        if leave.status != "pending":
            return jsonify({
                "error": "Bad Request",
                "message": f"Cannot cancel a leave request that has already been {leave.status}."
            }), 400

        now_dt = datetime.utcnow()
        leave.status = "cancelled"
        leave.updated_at = now_dt

        audit = AuditLog(
            user_id=user["id"],
            action="LEAVE_CANCELLED",
            target_type="LEAVE",
            target_id=str(leave.id),
            details=f"Teacher {user['employee_id']} cancelled pending {leave.leave_type} request ({leave.start_date} to {leave.end_date}).",
            timestamp=now_dt
        )
        db.add(audit)
        db.commit()

        return jsonify({"success": True, "message": "Leave request cancelled successfully.", "leave": leave.to_dict()})
    finally:
        db.close()

# A4. Admin: View All Leave Requests
@app.route("/api/admin/leaves", methods=["GET"])
@login_required(role="admin")
def admin_get_leaves(user):
    status_filter = request.args.get("status")
    dept_filter = request.args.get("department")
    search = request.args.get("search", "").strip()

    db = get_db_session()
    try:
        q = db.query(LeaveRequest).join(User, LeaveRequest.teacher_id == User.id)

        if status_filter and status_filter != "all":
            q = q.filter(LeaveRequest.status == status_filter)
        if dept_filter and dept_filter != "all":
            q = q.filter(User.department == dept_filter)
        if search:
            q = q.filter(or_(
                User.full_name.ilike(f"%{search}%"),
                User.employee_id.ilike(f"%{search}%"),
                LeaveRequest.leave_type.ilike(f"%{search}%"),
                LeaveRequest.reason.ilike(f"%{search}%")
            ))

        leaves = q.order_by(LeaveRequest.id.desc()).all()
        return jsonify({"leaves": [l.to_dict() for l in leaves]})
    finally:
        db.close()

# A5. Admin: Approve or Reject Leave Request
@app.route("/api/admin/leaves/<int:leave_id>/decision", methods=["PUT"])
@login_required(role="admin")
def admin_leave_decision(user, leave_id):
    data = request.get_json() or {}
    decision = data.get("decision", "").strip().lower()  # 'approved' or 'rejected'
    remarks = data.get("admin_remarks", "").strip()

    if decision not in ["approved", "rejected"]:
        return jsonify({"error": "Bad Request", "message": "Decision must be either 'approved' or 'rejected'."}), 400

    if decision == "rejected" and not remarks:
        return jsonify({"error": "Bad Request", "message": "Remarks are required when rejecting a leave request."}), 400

    db = get_db_session()
    try:
        leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
        if not leave:
            return jsonify({"error": "Not Found", "message": "Leave request not found."}), 404

        if leave.status in ["approved", "rejected", "cancelled"]:
            return jsonify({
                "error": "Conflict",
                "message": f"This leave request has already been finalized as {leave.status}."
            }), 409

        now_dt = datetime.utcnow()
        leave.status = decision
        leave.admin_remarks = remarks
        leave.reviewed_by = user["id"]
        leave.reviewed_at = now_dt
        leave.updated_at = now_dt

        # Create Notification for Teacher
        notif = Notification(
            recipient_user_id=leave.teacher_id,
            notification_type="leave_status",
            title=f"Leave Request {decision.capitalize()}",
            message=f"Your {leave.leave_type} application for {leave.start_date} to {leave.end_date} has been {decision}. Remarks: {remarks or 'None'}",
            related_record_id=str(leave.id),
            created_at=now_dt
        )
        db.add(notif)

        audit = AuditLog(
            user_id=user["id"],
            action=f"LEAVE_{decision.upper()}",
            target_type="LEAVE",
            target_id=str(leave.id),
            details=f"Admin {user['full_name']} {decision} leave request for {leave.teacher.employee_id} ({leave.start_date} to {leave.end_date}). Remarks: {remarks}",
            timestamp=now_dt
        )
        db.add(audit)
        db.commit()

        return jsonify({
            "success": True,
            "message": f"Leave request has been {decision} successfully.",
            "leave": leave.to_dict()
        })
    finally:
        db.close()

# ==============================================================================
# SECTION B: FACE UPDATE REQUESTS & ADMIN RE-ENROLLMENT WORKFLOW
# ==============================================================================

# B1. Teacher: View Own Face Update Requests
@app.route("/api/teacher/face-update-requests", methods=["GET"])
@login_required(role="teacher")
def get_teacher_face_requests(user):
    db = get_db_session()
    try:
        requests = db.query(FaceUpdateRequest).filter(
            FaceUpdateRequest.teacher_id == user["id"]
        ).order_by(FaceUpdateRequest.id.desc()).all()
        return jsonify({"requests": [r.to_dict() for r in requests]})
    finally:
        db.close()

# B2. Teacher: Submit Face Update Request
@app.route("/api/teacher/face-update-requests", methods=["POST"])
@login_required(role="teacher")
def submit_teacher_face_request(user):
    data = request.get_json() or {}
    reason = data.get("reason", "").strip()

    if not reason:
        return jsonify({"error": "Bad Request", "message": "Reason for face biometric update request is required."}), 400

    db = get_db_session()
    try:
        existing = db.query(FaceUpdateRequest).filter(
            FaceUpdateRequest.teacher_id == user["id"],
            FaceUpdateRequest.status.in_(["pending", "approved"])
        ).first()

        if existing:
            return jsonify({
                "error": "Conflict",
                "message": f"You already have a {existing.status} face update request under administrative review."
            }), 409

        now_dt = datetime.utcnow()
        new_req = FaceUpdateRequest(
            teacher_id=user["id"],
            reason=reason,
            status="pending",
            created_at=now_dt,
            updated_at=now_dt
        )
        db.add(new_req)
        db.flush()

        # Notify All Active Administrators
        admins = db.query(User).filter(User.role == "admin", User.is_active == True).all()
        for admin in admins:
            notif = Notification(
                recipient_user_id=admin.id,
                notification_type="face_update_request",
                title=f"New Face Update Request: {user['full_name']}",
                message=f"{user['full_name']} ({user['employee_id']}) requested a biometric face template update. Reason: {reason}",
                related_record_id=str(new_req.id),
                created_at=now_dt
            )
            db.add(notif)

        audit = AuditLog(
            user_id=user["id"],
            action="FACE_UPDATE_REQUESTED",
            target_type="FACE_UPDATE",
            target_id=str(new_req.id),
            details=f"Teacher {user['employee_id']} submitted face update request. Reason: {reason}",
            timestamp=now_dt
        )
        db.add(audit)
        db.commit()

        return jsonify({
            "success": True,
            "message": "Face update request submitted successfully. Institutional administrator will review and initiate live re-enrollment.",
            "request": new_req.to_dict()
        }), 201
    finally:
        db.close()

# B3. Teacher: Cancel Pending Face Update Request
@app.route("/api/teacher/face-update-requests/<int:req_id>/cancel", methods=["PUT"])
@login_required(role="teacher")
def cancel_teacher_face_request(user, req_id):
    db = get_db_session()
    try:
        req_obj = db.query(FaceUpdateRequest).filter(
            FaceUpdateRequest.id == req_id,
            FaceUpdateRequest.teacher_id == user["id"]
        ).first()

        if not req_obj:
            return jsonify({"error": "Not Found", "message": "Face update request not found."}), 404

        if req_obj.status != "pending":
            return jsonify({
                "error": "Bad Request",
                "message": f"Cannot cancel a request that has already been {req_obj.status}."
            }), 400

        now_dt = datetime.utcnow()
        req_obj.status = "cancelled"
        req_obj.updated_at = now_dt

        audit = AuditLog(
            user_id=user["id"],
            action="FACE_UPDATE_CANCELLED",
            target_type="FACE_UPDATE",
            target_id=str(req_obj.id),
            details=f"Teacher {user['employee_id']} cancelled pending face update request.",
            timestamp=now_dt
        )
        db.add(audit)
        db.commit()

        return jsonify({"success": True, "message": "Face update request cancelled successfully."})
    finally:
        db.close()

# B4. Admin: View All Face Update Requests
@app.route("/api/admin/face-update-requests", methods=["GET"])
@login_required(role="admin")
def admin_get_face_requests(user):
    status_filter = request.args.get("status")

    db = get_db_session()
    try:
        q = db.query(FaceUpdateRequest).join(User, FaceUpdateRequest.teacher_id == User.id)
        if status_filter and status_filter != "all":
            q = q.filter(FaceUpdateRequest.status == status_filter)

        requests = q.order_by(FaceUpdateRequest.id.desc()).all()
        return jsonify({"requests": [r.to_dict() for r in requests]})
    finally:
        db.close()

# B5. Admin: Decision on Face Update Request (Approve / Reject)
@app.route("/api/admin/face-update-requests/<int:req_id>/decision", methods=["PUT"])
@login_required(role="admin")
def admin_face_request_decision(user, req_id):
    data = request.get_json() or {}
    decision = data.get("decision", "").strip().lower()  # 'approved' or 'rejected'
    remarks = data.get("admin_remarks", "").strip()

    if decision not in ["approved", "rejected"]:
        return jsonify({"error": "Bad Request", "message": "Decision must be 'approved' or 'rejected'."}), 400

    db = get_db_session()
    try:
        req_obj = db.query(FaceUpdateRequest).filter(FaceUpdateRequest.id == req_id).first()
        if not req_obj:
            return jsonify({"error": "Not Found", "message": "Request not found."}), 404

        if req_obj.status in ["completed", "rejected", "cancelled"]:
            return jsonify({
                "error": "Conflict",
                "message": f"This request is already {req_obj.status}."
            }), 409

        now_dt = datetime.utcnow()
        req_obj.status = decision
        req_obj.admin_remarks = remarks
        req_obj.reviewed_by = user["id"]
        req_obj.reviewed_at = now_dt
        req_obj.updated_at = now_dt

        # Notify Teacher
        notif = Notification(
            recipient_user_id=req_obj.teacher_id,
            notification_type="face_update_status",
            title=f"Face Update Request {decision.capitalize()}",
            message=f"Your face update request has been {decision} by Administration. {remarks}",
            related_record_id=str(req_obj.id),
            created_at=now_dt
        )
        db.add(notif)

        audit = AuditLog(
            user_id=user["id"],
            action=f"FACE_UPDATE_{decision.upper()}",
            target_type="FACE_UPDATE",
            target_id=str(req_obj.id),
            details=f"Admin {user['full_name']} {decision} face update request for {req_obj.teacher.employee_id}. Remarks: {remarks}",
            timestamp=now_dt
        )
        db.add(audit)
        db.commit()

        return jsonify({
            "success": True,
            "message": f"Face update request {decision} successfully.",
            "request": req_obj.to_dict()
        })
    finally:
        db.close()

# B6. Admin: Secure Live Camera Face Re-enrollment with Transaction
@app.route("/api/admin/face-re-enroll", methods=["POST"])
@app.route("/api/attendance/enroll-face", methods=["POST"])
@login_required(role="admin")
def admin_face_re_enroll(admin_user):
    data = request.get_json() or {}
    target_emp_id = data.get("employee_id", "").strip().upper()
    image_base64 = data.get("image_base64", "")
    request_id = data.get("request_id")

    if not target_emp_id or not image_base64:
        return jsonify({"error": "Bad Request", "message": "Employee ID and live camera image data are required."}), 400

    db = get_db_session()
    try:
        target_user = db.query(User).filter(func.upper(User.employee_id) == target_emp_id).first()
        if not target_user:
            # Auto-provision teacher if registered in UI or pending sync
            new_name = data.get("full_name", "").strip() or f"Faculty {target_emp_id}"
            new_dept = data.get("department", "").strip() or "General Faculty"
            new_email = data.get("email", "").strip() or f"{target_emp_id.lower()}@vericamp.edu"
            target_user = User(
                employee_id=target_emp_id,
                username=target_emp_id.lower(),
                full_name=new_name,
                email=new_email,
                department=new_dept,
                role="teacher",
                phone=data.get("phone", ""),
                is_active=True,
                created_at=datetime.utcnow()
            )
            target_user.set_password("teacher123")
            db.add(target_user)
            db.flush()

        img = decode_base64_image(image_base64)
        if img is None:
            return jsonify({"error": "Bad Request", "message": "Failed to decode camera capture stream."}), 400

        # Exact face count verification via YuNet ONNX: Must contain EXACTLY ONE usable face
        is_valid, err_msg, detected_faces = validate_face_for_enrollment(img)
        if not is_valid:
            err_title = "Multiple Faces Detected" if "Multiple" in err_msg else "Unusable Face"
            return jsonify({
                "success": False,
                "error": err_title,
                "message": err_msg
            }), 400

        # SAFE REPLACEMENT: Overwrite reference image on disk only after detection passes
        file_path = os.path.join(DATASET_DIR, f"{target_emp_id}.jpg")
        cv2.imwrite(file_path, img)

        # Extract SFace 128-d biometric feature embedding
        feature_vec, _ = extract_face_embedding(img, detected_faces[0])
        template_str = json.dumps(feature_vec.tolist()[0]) if feature_vec is not None else f"sha256_dataset_{target_emp_id}_yunet_sface"

        now_dt = datetime.utcnow()
        fe = db.query(FaceEnrollment).filter(FaceEnrollment.user_id == target_user.id).first()
        if not fe:
            fe = FaceEnrollment(
                user_id=target_user.id,
                face_template=template_str,
                template_hash=template_str[:64] if template_str else f"sha256_{target_emp_id.lower()}",
                status="enrolled",
                model_name=MODEL_NAME,
                model_version=MODEL_VERSION,
                enrollment_status="enrolled",
                enrolled_at=now_dt,
                updated_at=now_dt
            )
            db.add(fe)
        else:
            fe.face_template = template_str
            fe.template_hash = template_str[:64] if template_str else f"sha256_{target_emp_id.lower()}"
            fe.status = "enrolled"
            fe.model_name = MODEL_NAME
            fe.model_version = MODEL_VERSION
            fe.enrollment_status = "enrolled"
            fe.updated_at = now_dt

        # If connected to a face update request, finalize it as completed
        if request_id:
            req_obj = db.query(FaceUpdateRequest).filter(FaceUpdateRequest.id == int(request_id)).first()
            if req_obj:
                req_obj.status = "completed"
                req_obj.completed_at = now_dt
                req_obj.updated_at = now_dt

        # Notify Teacher
        notif = Notification(
            recipient_user_id=target_user.id,
            notification_type="face_update_status",
            title="Biometric Face Template Re-enrolled",
            message=f"Administrator {admin_user['full_name']} has successfully re-enrolled your live biometric face template.",
            related_record_id=str(request_id) if request_id else None,
            created_at=now_dt
        )
        db.add(notif)

        audit = AuditLog(
            user_id=admin_user["id"],
            action="FACE_RE_ENROLLED_ADMIN",
            target_type="USER",
            target_id=str(target_user.id),
            details=f"Admin {admin_user['full_name']} completed live face re-enrollment for {target_user.full_name} ({target_emp_id}).",
            timestamp=now_dt
        )
        db.add(audit)
        db.commit()

        return jsonify({
            "success": True,
            "employee_id": target_emp_id,
            "message": f"Biometric reference template updated successfully for {target_user.full_name} ({target_emp_id})."
        })
    finally:
        db.close()

# ==============================================================================
# SECTION C: NOTIFICATION APIS
# ==============================================================================

# C1. Get Notifications for Current User
@app.route("/api/notifications", methods=["GET"])
def get_notifications():
    user = extract_token_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    db = get_db_session()
    try:
        notifications = db.query(Notification).filter(
            Notification.recipient_user_id == user["id"]
        ).order_by(Notification.id.desc()).limit(50).all()

        unread_count = db.query(Notification).filter(
            Notification.recipient_user_id == user["id"],
            Notification.is_read == False
        ).count()

        return jsonify({
            "notifications": [n.to_dict() for n in notifications],
            "unread_count": unread_count
        })
    finally:
        db.close()

# C2. Mark Notification as Read
@app.route("/api/notifications/<int:notif_id>/read", methods=["PUT"])
def mark_notification_read(notif_id):
    user = extract_token_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    db = get_db_session()
    try:
        notif = db.query(Notification).filter(
            Notification.id == notif_id,
            Notification.recipient_user_id == user["id"]
        ).first()

        if not notif:
            return jsonify({"error": "Not Found", "message": "Notification not found."}), 404

        notif.is_read = True
        db.commit()
        return jsonify({"success": True, "message": "Notification marked as read."})
    finally:
        db.close()

# C3. Mark All Notifications as Read
@app.route("/api/notifications/read-all", methods=["PUT"])
def mark_all_notifications_read():
    user = extract_token_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    db = get_db_session()
    try:
        db.query(Notification).filter(
            Notification.recipient_user_id == user["id"],
            Notification.is_read == False
        ).update({"is_read": True})
        db.commit()
        return jsonify({"success": True, "message": "All notifications marked as read."})
    finally:
        db.close()

# Check Enrolled Face Status & Preview
@app.route("/api/attendance/enrolled-face/<emp_id>", methods=["GET"])
def get_enrolled_face(emp_id):
    emp_id = emp_id.strip().upper()
    file_path = os.path.join(DATASET_DIR, f"{emp_id}.jpg")
    exists = os.path.exists(file_path)

    preview_base64 = None
    if exists:
        try:
            with open(file_path, "rb") as f:
                preview_base64 = "data:image/jpeg;base64," + base64.b64encode(f.read()).decode("utf-8")
        except:
            pass

    db = get_db_session()
    try:
        user = db.query(User).filter(func.upper(User.employee_id) == emp_id).first()
        is_enrolled = exists and (user and user.face_enrollment and user.face_enrollment.enrollment_status == "enrolled")
        enrolled_at = user.face_enrollment.enrolled_at.isoformat() if (user and user.face_enrollment and user.face_enrollment.enrolled_at) else None
        teacher_name = user.full_name if user else None
        department = user.department if user else None

        return jsonify({
            "employee_id": emp_id,
            "is_enrolled": is_enrolled,
            "status": "enrolled" if is_enrolled else "not_enrolled",
            "enrolled_at": enrolled_at,
            "full_name": teacher_name,
            "department": department,
            "file_path": f"backend/dataset/faces/{emp_id}.jpg" if exists else None,
            "preview_base64": preview_base64
        })
    finally:
        db.close()

# Catch-all route to serve frontend React SPA from Flask backend
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path.startswith("api"):
        return jsonify({"error": "Endpoint not found", "message": f"API endpoint /{path} does not exist"}), 404
    target_file = os.path.join(FRONTEND_DIST_DIR, path)
    if path != "" and os.path.isfile(target_file):
        return send_from_directory(FRONTEND_DIST_DIR, path)
    index_file = os.path.join(FRONTEND_DIST_DIR, "index.html")
    if os.path.exists(index_file):
        return send_from_directory(FRONTEND_DIST_DIR, "index.html")
    return jsonify({
        "status": "online",
        "service": "VERICAMP Backend REST API",
        "message": "Frontend build files not found. In development, please visit http://localhost:5173",
        "dev_frontend_url": "http://localhost:5173"
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"[*] Starting VERICAMP Backend on port {port} (Database: {'MySQL' if IS_MYSQL else 'SQLite'})...")
    app.run(host="0.0.0.0", port=port, debug=False)
