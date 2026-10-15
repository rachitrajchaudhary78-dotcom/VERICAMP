import os
from database import get_db_session, User, FaceEnrollment
from datetime import datetime

def sync():
    db = get_db_session()
    try:
        # Check EMP-1212
        emp_id = "EMP-1212"
        existing = db.query(User).filter_by(employee_id=emp_id).first()
        if not existing:
            print(f"[*] Adding missing teacher {emp_id} to database...")
            u = User(
                employee_id=emp_id,
                username=emp_id.lower(),
                full_name="Kaustubh",
                email="rajchaudharyrachit5@gmail.com",
                department="Computer Science & Engg",
                phone="+91 93047 82508",
                role="teacher",
                is_active=True,
                created_at=datetime.utcnow()
            )
            u.set_password("teacher123")
            db.add(u)
            db.flush()

            fe = FaceEnrollment(
                user_id=u.id,
                face_template=f"sha256_vec_{emp_id.lower()}_yunet_sface",
                model_name="YuNet-SFace-ONNX",
                model_version="2023mar-2021dec",
                enrollment_status="enrolled",
                enrolled_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(fe)
            db.commit()
            print(f"[OK] {emp_id} added successfully to vericamp.db with id={u.id}!")
        else:
            print(f"[i] {emp_id} already exists in database (id={existing.id}).")
            if not existing.check_password("teacher123"):
                print("[*] Resetting password for EMP-1212 to teacher123...")
                existing.set_password("teacher123")
                db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    sync()
