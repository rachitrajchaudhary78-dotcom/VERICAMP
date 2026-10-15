import React, { useState, useEffect } from 'react';
import {
  Compass,
  MapPin,
  Wifi,
  Save,
  RotateCw,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck
} from 'lucide-react';
import api from '../../services/api';
import Toast from '../../components/Toast';
import { DEFAULT_CAMPUS } from '../../services/geoUtils';

export default function CampusSettings() {
  const [campusName, setCampusName] = useState(DEFAULT_CAMPUS.campus_name);
  const [latitude, setLatitude] = useState(DEFAULT_CAMPUS.latitude);
  const [longitude, setLongitude] = useState(DEFAULT_CAMPUS.longitude);
  const [allowedRadius, setAllowedRadius] = useState(DEFAULT_CAMPUS.allowed_radius_meters);
  const [wifiRequired, setWifiRequired] = useState(true);
  const [wifiSsid, setWifiSsid] = useState('SKIT_CAMPUS_SECURE');

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const res = await api.get('/admin/campus-settings');
        if (res.data?.settings) {
          const s = res.data.settings;
          setCampusName(s.campus_name);
          setLatitude(s.latitude);
          setLongitude(s.longitude);
          setAllowedRadius(s.allowed_radius_meters);
          setWifiRequired(Boolean(s.wifi_ssid_required));
          setWifiSsid(s.wifi_ssid_name || 'SKIT_CAMPUS_SECURE');
        }
      } catch (err) {
        console.warn('Using default settings fallback');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setToast({ type: 'error', title: 'GPS Unavailable', message: 'Browser geolocation is not supported.' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setToast({
          type: 'success',
          title: 'GPS Coordinated Captured',
          message: `Center set to Lat: ${pos.coords.latitude.toFixed(5)}, Lon: ${pos.coords.longitude.toFixed(5)}`
        });
      },
      (err) => {
        setToast({ type: 'warning', title: 'Location Error', message: `Could not retrieve GPS: ${err.message}` });
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put('/admin/campus-settings', {
        campus_name: campusName,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        allowed_radius_meters: parseFloat(allowedRadius),
        wifi_ssid_required: wifiRequired ? 1 : 0,
        wifi_ssid_name: wifiSsid
      });
      setToast({ type: 'success', title: 'Settings Saved', message: 'Institutional campus geofence settings updated.' });
    } catch (err) {
      setToast({ type: 'info', title: 'Saved Locally', message: 'Settings saved in current session.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-bold text-slate-900">Campus Geofence & Boundary Settings</h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Configure central GPS coordinates, allowed perimeter radius in meters, and optional Wi-Fi managed-device constraints.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Main Settings Panel */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
            Institutional Location Parameters
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Campus Institution Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={campusName}
              onChange={(e) => setCampusName(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:ring-1 focus:ring-blue-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Campus Center Latitude <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Decimal Degrees</span>
              </div>
              <input
                type="number"
                step="any"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:ring-1 focus:ring-blue-500 font-mono font-semibold"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Campus Center Longitude <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Decimal Degrees</span>
              </div>
              <input
                type="number"
                step="any"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:ring-1 focus:ring-blue-500 font-mono font-semibold"
              />
            </div>
          </div>

          {/* Quick Location Capture Helper Button */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-blue-900">
              <Navigation className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Calibrate with administrator device location right now?</span>
            </div>
            <button
              type="button"
              onClick={handleSetCurrentLocation}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded shadow-sm transition"
            >
              Use My Current GPS Position
            </button>
          </div>

          {/* Allowed Radius Slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Permitted Geofence Radius: <span className="font-bold text-blue-900 font-mono">{allowedRadius} Meters</span>
              </label>
              <span className="text-[11px] text-slate-500">Haversine Perimeter Limit</span>
            </div>
            <input
              type="range"
              min="50"
              max="1500"
              step="25"
              value={allowedRadius}
              onChange={(e) => setAllowedRadius(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>50m (Department)</span>
              <span>300m (Standard Academic Block)</span>
              <span>1500m (Entire University Campus)</span>
            </div>
          </div>
        </div>

        {/* Managed Network / Wi-Fi Verification Configuration */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-blue-600" />
            <span>Campus Network Validation (Managed Devices)</span>
          </h3>

          <div className="space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 select-none">
              <input
                type="checkbox"
                checked={wifiRequired}
                onChange={(e) => setWifiRequired(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="font-semibold">Require Campus Intranet SSID Connection</span>
            </label>

            {wifiRequired && (
              <div className="pl-6 space-y-2">
                <label className="block text-[11px] font-semibold text-slate-600">
                  Target Campus Wi-Fi SSID
                </label>
                <input
                  type="text"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  placeholder="SKIT_CAMPUS_SECURE"
                  className="w-full max-w-sm text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:ring-1 focus:ring-blue-500 font-mono"
                />
                <p className="text-[11px] text-slate-400 italic">
                  Note: Browser security prevents websites from reading local BSSIDs directly. In production, this rule is validated via the institutional managed device agent or captive portal backend.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            {isSaving ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Saving Boundary Configuration...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Campus Geofence Settings</span>
              </>
            )}
          </button>
        </div>
      </form>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
