import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Phone,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logoImg from '../assets/logo.png';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  // User type selection: Teacher, School, Officials, Other
  const [userType, setUserType] = useState('teacher');
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Math CAPTCHA state
  const [captchaQuestion, setCaptchaQuestion] = useState({ num1: 3, num2: 7, op: '*', answer: 21 });
  const [captchaInput, setCaptchaInput] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Generate simple math problem matching reference (e.g. 3 * 7)
  const generateCaptcha = () => {
    const ops = ['*', '+'];
    const selectedOp = Math.random() > 0.4 ? '*' : '+';
    let n1, n2, ans;
    if (selectedOp === '*') {
      n1 = Math.floor(Math.random() * 7) + 2; // 2 to 8
      n2 = Math.floor(Math.random() * 8) + 2; // 2 to 9
      ans = n1 * n2;
    } else {
      n1 = Math.floor(Math.random() * 30) + 10;
      n2 = Math.floor(Math.random() * 20) + 5;
      ans = n1 + n2;
    }
    setCaptchaQuestion({ num1: n1, num2: n2, op: selectedOp, answer: ans });
    setCaptchaInput('');
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleUserTypeChange = (type) => {
    setUserType(type);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const trimmedId = employeeId.trim();
    if (!trimmedId) {
      setErrorMessage(
        userType === 'teacher'
          ? 'Please enter your Teacher Code / Login Code.'
          : 'Please enter your Login Code.'
      );
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    // CAPTCHA verification
    if (captchaInput.trim() === '') {
      setErrorMessage('Please solve the math problem to continue.');
      return;
    }
    if (parseInt(captchaInput.trim(), 10) !== captchaQuestion.answer) {
      setErrorMessage('Incorrect CAPTCHA answer. Please try again.');
      generateCaptcha();
      return;
    }

    // Map userType to system roles:
    // 'teacher' -> 'teacher', others ('school', 'officials', 'other') -> 'admin'
    const systemRole = userType === 'teacher' ? 'teacher' : 'admin';

    setIsLoading(true);

    try {
      const res = await login(trimmedId, password, systemRole);

      if (systemRole === 'admin') {
        setSuccessMessage('Administrator authenticated. Redirecting to Portal...');
        setTimeout(() => navigate('/admin'), 350);
      } else {
        setSuccessMessage(
          `Credentials verified for ${res.user?.full_name || trimmedId}. Proceeding to live attendance verification...`
        );
        setTimeout(() => navigate('/teacher/mark'), 350);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Invalid Login Code or password for the selected user type.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#2b0c4b] overflow-x-hidden font-sans select-none">
      {/* ========================================================= */}
      {/* LEFT SECTION: Educational Branding (~64% width on desktop)*/}
      {/* ========================================================= */}
      <div className="w-full lg:w-[64%] min-h-[620px] lg:min-h-screen flex flex-col justify-between p-6 sm:p-8 xl:p-10 relative overflow-hidden text-white bg-gradient-to-br from-[#44146f] via-[#301056] to-[#1a0833]">
        {/* Subtle chalkboard math and educational formulas doodle overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
          <svg className="w-full h-full text-purple-200" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="math-doodles" width="460" height="460" patternUnits="userSpaceOnUse">
                {/* 2+2=4 */}
                <text x="30" y="50" fill="currentColor" fontSize="22" fontFamily="serif" fontStyle="italic">2+2=4</text>
                {/* E=mc^2 */}
                <text x="260" y="80" fill="currentColor" fontSize="24" fontFamily="serif" fontStyle="italic">E=mc²</text>
                <text x="60" y="240" fill="currentColor" fontSize="26" fontFamily="serif" fontStyle="italic">E=mc²</text>
                {/* Formulas & Chemistry */}
                <text x="180" y="140" fill="currentColor" fontSize="16" fontFamily="serif">H₂O</text>
                <text x="360" y="150" fill="currentColor" fontSize="18" fontFamily="serif">Ag</text>
                <text x="20" y="320" fill="currentColor" fontSize="18" fontFamily="serif">Si</text>
                <text x="390" y="320" fill="currentColor" fontSize="20" fontFamily="serif">H₂O</text>
                {/* Math symbols */}
                <text x="310" y="240" fill="currentColor" fontSize="20" fontFamily="serif">3.14</text>
                <text x="230" y="360" fill="currentColor" fontSize="22" fontFamily="serif">√x</text>
                <text x="20" y="420" fill="currentColor" fontSize="22" fontFamily="serif">2+2=4</text>
                <text x="340" y="440" fill="currentColor" fontSize="24" fontFamily="serif" fontStyle="italic">E=mc²</text>
                <text x="160" y="450" fill="currentColor" fontSize="18" fontFamily="serif">90°</text>
                <text x="260" y="430" fill="currentColor" fontSize="22" fontFamily="serif">2+2=4</text>

                {/* Geometric shapes / compass doodles */}
                <path d="M 40 130 L 70 80 L 100 130 Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <path d="M 330 30 A 20 20 0 0 1 370 30" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <path d="M 40 180 Q 70 160 100 180" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 3" />
                <circle cx="210" cy="40" r="14" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <line x1="210" y1="26" x2="210" y2="54" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
                {/* 90 degree angle */}
                <path d="M 380 200 L 380 230 L 410 230" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <rect x="380" y="218" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#math-doodles)" />
          </svg>
        </div>

        {/* TOP / CENTER: Educational Illustration */}
        <div className="relative z-10 flex-1 flex flex-col justify-center items-center py-4">
          <div className="w-full max-w-[480px] sm:max-w-[540px] xl:max-w-[580px] mx-auto flex flex-col items-center">
            {/* Custom Educational Laptop + Mortarboard + Orbit Vector Art */}
            <div className="relative w-[300px] h-[220px] sm:w-[380px] sm:h-[260px] xl:w-[420px] xl:h-[280px] flex items-center justify-center">
              {/* Dotted Orbit Arc connecting educational badges */}
              <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none" viewBox="0 0 400 300">
                <path
                  d="M 60 180 C 80 50, 320 40, 350 170"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeDasharray="5 6"
                  opacity="0.85"
                />

                {/* Badge 1: Notebook / Notes (Top Center) */}
                <g transform="translate(185, 20)">
                  <rect x="-18" y="-18" width="36" height="38" rx="4" fill="#2d134d" stroke="#ffffff" strokeWidth="1.8" />
                  <line x1="-12" y1="-8" x2="12" y2="-8" stroke="#ffffff" strokeWidth="1.5" />
                  <line x1="-12" y1="-1" x2="12" y2="-1" stroke="#ffffff" strokeWidth="1.5" />
                  <line x1="-12" y1="6" x2="6" y2="6" stroke="#ffffff" strokeWidth="1.5" />
                  {/* Spiral dots */}
                  <circle cx="-10" cy="-14" r="1.5" fill="#ffffff" />
                  <circle cx="-3" cy="-14" r="1.5" fill="#ffffff" />
                  <circle cx="4" cy="-14" r="1.5" fill="#ffffff" />
                  <circle cx="11" cy="-14" r="1.5" fill="#ffffff" />
                </g>

                {/* Badge 2: Speech Bubble with formula (Top Left) */}
                <g transform="translate(105, 75)">
                  <path d="M -16 -12 L 16 -12 C 20 -12, 22 -9, 22 -6 L 22 6 C 22 9, 20 12, 16 12 L -6 12 L -14 18 L -12 12 L -16 12 C -20 12, -22 9, -22 6 L -22 -6 C -22 -9, -20 -12, -16 -12 Z" fill="#2d134d" stroke="#ffffff" strokeWidth="1.8" />
                  <line x1="-12" y1="-4" x2="12" y2="-4" stroke="#ffffff" strokeWidth="1.5" />
                  <line x1="-12" y1="3" x2="6" y2="3" stroke="#ffffff" strokeWidth="1.5" />
                </g>

                {/* Badge 3: Play Button Badge (Left) */}
                <g transform="translate(70, 160)">
                  <circle cx="0" cy="0" r="16" fill="#2d134d" stroke="#ffffff" strokeWidth="1.8" />
                  <polygon points="-4,-7 8,0 -4,7" fill="#ffffff" />
                </g>

                {/* Badge 4: Question Mark ? (Top Right) */}
                <g transform="translate(300, 80)">
                  <text x="0" y="8" fill="#ffffff" fontSize="28" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">?</text>
                </g>

                {/* Badge 5: Document with Checkmarks (Right) */}
                <g transform="translate(345, 155)">
                  <rect x="-16" y="-18" width="32" height="36" rx="3" fill="#2d134d" stroke="#ffffff" strokeWidth="1.8" />
                  <rect x="-10" y="-10" width="8" height="8" rx="1.5" fill="none" stroke="#ffffff" strokeWidth="1.2" />
                  <polyline points="-9,-6 -6,-4 -3,-9" fill="none" stroke="#ffffff" strokeWidth="1.5" />
                  <line x1="2" y1="-6" x2="10" y2="-6" stroke="#ffffff" strokeWidth="1.5" />
                  <line x1="-10" y1="4" x2="10" y2="4" stroke="#ffffff" strokeWidth="1.5" />
                </g>

                {/* Badge 6: Mortarboard floating on right */}
                <g transform="translate(330, 240)">
                  <polygon points="0,-10 24,0 0,10 -24,0" fill="none" stroke="#ffffff" strokeWidth="1.8" />
                  <path d="M -15 4 L -15 14 C -15 20, 15 20, 15 14 L 15 4" fill="none" stroke="#ffffff" strokeWidth="1.8" />
                  <line x1="24" y1="0" x2="27" y2="15" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="27" cy="16" r="2" fill="#ffffff" />
                </g>
              </svg>

              {/* The 3D Angle Laptop Body & Screen */}
              <div className="relative w-[210px] sm:w-[270px] xl:w-[290px] h-[150px] sm:h-[190px] xl:h-[200px]">
                {/* Mortarboard graduation cap sitting on laptop top-left */}
                <div className="absolute -top-10 -left-6 sm:-top-14 sm:-left-8 z-30 pointer-events-none drop-shadow-xl transform -rotate-12">
                  <svg className="w-24 h-24 sm:w-32 sm:h-32" viewBox="0 0 100 100">
                    {/* Diamond cap top */}
                    <polygon points="50,15 90,30 50,45 10,30" fill="#1b1c24" stroke="#333745" strokeWidth="1" />
                    {/* Skull cap band */}
                    <path d="M 28 37 L 28 55 C 28 66, 72 66, 72 55 L 72 37" fill="#15161c" />
                    {/* Golden button and tassel */}
                    <circle cx="50" cy="30" r="3" fill="#eab308" />
                    <path d="M 50 30 Q 75 42, 78 65" fill="none" stroke="#facc15" strokeWidth="2.5" />
                    <rect x="75" y="65" width="6" height="12" rx="2" fill="#eab308" />
                  </svg>
                </div>

                {/* Laptop Display Screen (Bezel & Screen Content) */}
                <div className="w-[190px] sm:w-[245px] xl:w-[265px] h-[125px] sm:h-[160px] xl:h-[170px] bg-slate-900 border-4 border-slate-300 rounded-t-xl overflow-hidden shadow-2xl relative transform perspective-800 rotate-y-[-10deg] rotate-x-[8deg]">
                  {/* Web browser header inside screen */}
                  <div className="bg-[#cc2b35] h-5 px-2 flex items-center justify-between">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
                      <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
                      <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
                    </div>
                    <div className="text-[8px] text-white/90 font-mono">e-learning</div>
                  </div>
                  {/* Screen Content: Dark viewer with large play button */}
                  <div className="bg-[#121620] h-full flex flex-col items-center justify-center -mt-2">
                    <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/60 border border-white/40 flex items-center justify-center shadow-lg">
                      <div className="w-0 h-0 border-y-[8px] sm:border-y-[10px] border-y-transparent border-l-[14px] sm:border-l-[18px] border-l-white ml-1" />
                    </div>
                  </div>
                </div>

                {/* Laptop Lower Keyboard Base */}
                <div className="absolute -bottom-2 -left-3 sm:-bottom-3 sm:-left-4 w-[220px] sm:w-[285px] xl:w-[305px] h-[22px] sm:h-[28px] bg-gradient-to-b from-slate-200 to-slate-400 rounded-b-xl border border-slate-400/80 shadow-2xl transform skew-x-[-18deg]">
                  {/* Keyboard grid impression */}
                  <div className="w-4/5 h-2 mx-auto mt-1 bg-slate-800/40 rounded-sm" />
                  {/* Trackpad */}
                  <div className="w-12 h-2 mx-auto mt-0.5 bg-slate-300 rounded-sm border border-slate-400/50" />
                </div>

                {/* Student User Silhouettes on bottom left */}
                <div className="absolute -bottom-4 -left-8 sm:-bottom-5 sm:-left-10 z-20">
                  <div className="flex items-end -space-x-2">
                    <div className="flex flex-col items-center">
                      <div className="w-5 h-5 rounded-full bg-white shadow-md border border-purple-900" />
                      <div className="w-8 h-4 rounded-t-full bg-white shadow-md border border-purple-900 -mt-0.5" />
                    </div>
                    <div className="flex flex-col items-center z-10 scale-110">
                      <div className="w-6 h-6 rounded-full bg-white shadow-md border border-purple-900" />
                      <div className="w-10 h-5 rounded-t-full bg-white shadow-md border border-purple-900 -mt-0.5" />
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-5 h-5 rounded-full bg-white shadow-md border border-purple-900" />
                      <div className="w-8 h-4 rounded-t-full bg-white shadow-md border border-purple-900 -mt-0.5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Motivational Educational Quote */}
            <p className="text-center text-white/95 italic text-xs sm:text-sm xl:text-[15px] leading-relaxed max-w-xl mx-auto font-light tracking-wide px-4 mt-6 select-none font-serif">
              "Education is the key to success, Success is the key to achievement,
              <br className="hidden sm:inline" />
              {' '}Achievement is the key to hope, Hope is the key to happiness And happiness
              <br className="hidden sm:inline" />
              {' '}is the key to harmony"
            </p>

  
          </div>
        </div>

        {/* BOTTOM: Help Desk Section */}
        <div className="relative z-10 pt-4 pb-2 flex items-center justify-center gap-2 text-xs sm:text-sm select-text">
          <span className="w-6 h-6 rounded-full border border-purple-300/40 flex items-center justify-center text-purple-200 shrink-0">
            <Phone className="w-3.5 h-3.5" />
          </span>
          <span className="text-purple-200 font-medium">Help Desk No.</span>
          <span className="font-bold text-white tracking-wider text-sm sm:text-base">
            9523300520 &nbsp; 9430820499
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT SECTION: White Login Panel (~36% width on desktop) */}
      {/* ========================================================= */}
      <div className="w-full lg:w-[36%] min-h-screen bg-white rounded-t-[32px] lg:rounded-t-none lg:rounded-l-[36px] shadow-2xl flex flex-col justify-center px-8 sm:px-12 xl:px-16 py-10 relative z-20">
        <div className="max-w-md w-full mx-auto">
          {/* Logo & Portal Branding at top of white panel */}
          <div className="flex items-center justify-center gap-3.5 mb-8">
            {/* The newly updated 3D Isometric Cube Logo */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 relative shrink-0">
              <img
                src={logoImg}
                alt="e-shikshakosh Logo"
                className="w-full h-full object-contain"
              />
            </div>

            {/* e-shikshakosh Styled Typography */}
            <div className="flex flex-col">
              <span
                style={{ fontFamily: "'Caveat', 'Kalam', cursive" }}
                className="text-3xl sm:text-4xl font-extrabold text-[#4a154b] tracking-wide leading-none"
              >
              VERI CAMP
              </span>
            </div>
          </div>

          {/* Validation & Feedback Notifications */}
          {errorMessage && (
            <div
              id="login-error-alert"
              className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-shake"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              id="login-success-alert"
              className="mb-4 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{successMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Select User Type */}
            <div>
              <div className="text-xs sm:text-sm font-semibold text-slate-800 mb-2">
                Select User Type
              </div>

              {/* Row 1: Teacher, School, Officials */}
              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-800">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="userType"
                    value="teacher"
                    checked={userType === 'teacher'}
                    onChange={() => handleUserTypeChange('teacher')}
                    className="w-3.5 h-3.5 accent-[#00a79d] cursor-pointer"
                  />
                  <span className="font-medium">Teacher</span>
                </label>

                

                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="userType"
                    value="officials"
                    checked={userType === 'officials'}
                    onChange={() => handleUserTypeChange('officials')}
                    className="w-3.5 h-3.5 accent-[#00a79d] cursor-pointer"
                  />
                  <span className="font-medium">Officials</span>
                </label>
              </div>

            </div>

            {/* 2. Teacher Code / Login Code Input */}
            <div className="relative pt-2">
              <label
                htmlFor="teacher-code-input"
                className="absolute top-0.5 left-3 px-1.5 bg-white text-[11px] font-semibold text-slate-700 z-10"
              >
                Teacher Code / Login Code
              </label>
              <input
                id="teacher-code-input"
                type="text"
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder={userType === 'teacher' ? 'e.g. EMP-1001 or rachitrajchaudh' : 'e.g. admin or ADM-001'}
                className="w-full px-3.5 py-2.5 text-sm bg-[#eef5fc] border border-[#cbdff2] rounded-md text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00a79d] focus:border-[#00a79d] transition"
                autoComplete="username"
              />
            </div>

            {/* 3. Password Input */}
            <div className="relative pt-2">
              <label
                htmlFor="password-input"
                className="absolute top-0.5 left-3 px-1.5 bg-white text-[11px] font-semibold text-slate-700 z-10"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#eef5fc] border border-[#cbdff2] rounded-md text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00a79d] focus:border-[#00a79d] transition pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  id="toggle-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 4. Mathematical CAPTCHA Problem */}
            <div className="pt-1">
              <div className="text-xs sm:text-sm font-semibold text-slate-800 mb-2">
                Let's solve this math problem : {captchaQuestion.num1} {captchaQuestion.op} {captchaQuestion.num2}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  id="captcha-input"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  placeholder="Answer"
                  required
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#cbdff2] rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00a79d] focus:border-[#00a79d] transition"
                />
                <button
                  type="button"
                  id="captcha-refresh-btn"
                  onClick={generateCaptcha}
                  title="Refresh math problem"
                  className="w-10 h-10 rounded-md bg-[#00a79d] hover:bg-[#00968c] active:bg-[#008077] text-white flex items-center justify-center shrink-0 cursor-pointer shadow-sm transition"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 5. SIGN IN Button & Forgot Your password? Link */}
            <div className="flex items-center gap-4 pt-3">
              <button
                type="submit"
                id="login-submit-button"
                disabled={isLoading}
                className={`bg-[#00a79d] hover:bg-[#00968c] active:bg-[#008077] text-white font-bold text-xs sm:text-sm tracking-wider uppercase px-7 py-2.5 rounded-md shadow-sm transition flex items-center justify-center cursor-pointer ${
                  isLoading ? 'opacity-80 cursor-wait' : ''
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>SIGNING IN...</span>
                  </div>
                ) : (
                  <span>SIGN IN</span>
                )}
              </button>

              <button
                type="button"
                id="forgot-password-link"
                onClick={() => setShowForgotModal(true)}
                className="text-xs sm:text-[13px] text-slate-700 hover:text-slate-900 font-normal cursor-pointer hover:underline"
              >
                Forgot Your password?
              </button>
            </div>
          </form>

          {/* Quick Demo Credentials Assistant (subtle helpful info) */}
          <div className="mt-8 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              Demo logins: Teacher (<span className="font-mono text-slate-600">EMP-1001</span> / <span className="font-mono text-slate-600">teacher123</span>) • Official (<span className="font-mono text-slate-600">admin</span> / <span className="font-mono text-slate-600">admin123</span>)
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* Forgot Password Modal (Institutional Assistance)           */}
      {/* ========================================================= */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-purple-900 mb-3">
              <Info className="w-5 h-5 text-[#00a79d]" />
              <h3 className="font-bold text-base text-slate-800">Password Assistance</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Password resets are managed institutional-wide by the school principal or departmental IT administrator.
            </p>
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs text-slate-700 mb-4 space-y-1.5 font-sans">
              <p>
                <span className="font-semibold text-slate-900">Central Help Desk:</span> 9523300520 / 9430820499
              </p>
              <p>
                <span className="font-semibold text-slate-900">Institutional Email:</span>{' '}
                <a href="mailto:it-admin@vericamp.edu" className="text-teal-600 hover:underline">
                  support@e-shikshakosh.gov.in
                </a>
              </p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-4 py-2 bg-[#00a79d] hover:bg-[#00968c] text-white text-xs font-bold rounded-md cursor-pointer transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
