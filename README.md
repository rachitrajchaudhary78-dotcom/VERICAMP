# VERICAMP — Smart Campus Facial Recognition & Teacher Attendance System

> **IEEE-IGNITE Hackathon Problem Statement SKIT023**  
> **Tagline:** *Smart Attendance. Verified Presence.*  
> **Inspired by:** Educational administration portal architecture (eShikshakosh) with deep navy blue branding, strict role segregation (Teacher & Admin only), live MediaDevices camera capture, OpenCV face verification, and Haversine campus geofencing.

---

## 🏛️ System Overview

VERICAMP enables authorized faculty members to mark their daily attendance on campus with zero proxy leakage using a synchronized multi-factor verification pipeline:
1. **Camera Ready:** Requests permission and starts a live browser MediaDevices camera stream (file/gallery picker disabled to prevent spoofing).
2. **Face Verification:** Live frame capture is analyzed via OpenCV Haar cascades and compared against registered face templates in the dataset (`backend/dataset/faces/<EMPLOYEE_ID>.jpg`).
3. **Campus Location Verification:** Browser Geolocation API coordinates are checked against institutional campus boundaries using the spherical **Haversine Distance Formula** ($\le 300\text{ m}$).
4. **Attendance Confirmed:** Once both face similarity ($\ge 85\%$) and campus proximity ($\le 300\text{ m}$) pass, attendance is immutably recorded in the backend SQLite database with duplicate protection.

---

## 📸 How to Add Photos in the Dataset to Verify Users

VERICAMP supports three direct ways to add a reference face photo:

### Method A: Web UI 1-Click Upload (Faculty or Admin)
1. **As a Teacher:** Log into the teacher portal, go to [My Profile](http://localhost:5173/teacher/profile), and under *Biometric Face Enrollment*, click **"Upload New Reference Face Photo"**.
2. **As an Admin:** Log into the admin portal, open [Teacher Management](http://localhost:5173/admin/teachers), and click **"📷 Upload Face"** on any teacher row.
3. The photo is automatically validated with OpenCV and saved directly to `backend/dataset/faces/<EMPLOYEE_ID>.jpg`.

### Method B: Directly Placing Photos in the Dataset Directory
Simply copy/paste a `.jpg` or `.png` photo into the dataset folder named with the teacher's Employee ID:
```
backend/dataset/faces/EMP-1001.jpg
backend/dataset/faces/EMP-1002.jpg
backend/dataset/faces/EMP-1006.jpg
```

### Method C: Automatic Baseline Registration on First Check-in
If a new teacher hasn't uploaded a photo yet, the very first time they mark attendance from the live camera stream, VERICAMP automatically detects their face and enrolls that clear capture into `backend/dataset/faces/<EMPLOYEE_ID>.jpg` as their official biometric baseline!

---

## 🚀 Quick Start Instructions (Windows PowerShell)

### Prerequisites
- **Node.js** (v18+)
- **Python** (v3.10+)

### 1. Start the Flask Backend (Port 5000)
```powershell
# From project root:
cd c:\Users\Rachit\Downloads\finalprompt\backend
python -m pip install -r requirements.txt
python app.py
```
*The backend initializes `vericamp.db` and starts on `http://127.0.0.1:5000`.*

### 2. Start the Vite React Frontend (Port 5173)
```powershell
# In a new PowerShell terminal:
cd c:\Users\Rachit\Downloads\finalprompt\frontend
npm install
npm run dev
```
*Open your browser and navigate to [http://localhost:5173](http://localhost:5173).*

---

## 🔑 Demo Credentials

| Role | Employee ID / Username | Password | Notes |
| :--- | :--- | :--- | :--- |
| **Teacher / Faculty** | `EMP-1001` | `teacher123` | Dr. Ananya Sharma (Computer Science) |
| **Teacher / Faculty** | `EMP-1002` | `teacher123` | Prof. Rajesh Verma (Electronics) |
| **Administrator** | `admin` | `admin123` | Prof. K. N. Sharma (Institutional Admin) |

*(Quick 1-Click Login buttons are available on the login page for instant testing).*

---

## 📐 Technology Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, Lucide React, React Router v7, Axios, Recharts
- **Backend:** Python 3, Flask, Flask-CORS, SQLite3, Werkzeug Security
- **Computer Vision:** OpenCV (`cv2`) Haar Cascade Face Detector & Histogram Comparison
- **Geofencing:** Spherical Haversine Distance algorithm running both client-side and re-validated server-side.
