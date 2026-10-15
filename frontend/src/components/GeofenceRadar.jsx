import React from 'react';
import { MapPin, Navigation, ShieldCheck, AlertTriangle, Compass, CheckCircle2, RotateCw } from 'lucide-react';
import { formatCoordinate } from '../services/geoUtils';

export default function GeofenceRadar({
  campus,
  currentCoords,
  distance,
  isInside,
  locationError,
  isSimulated,
  onToggleSimulated,
  onRefreshLocation
}) {
  const allowedRadius = campus?.allowed_radius_meters || 300;
  const campusName = campus?.campus_name || 'SKIT Campus';

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Campus Geofence Monitor</h4>
            <p className="text-[11px] text-slate-500">{campusName}</p>
          </div>
        </div>

        {/* Inside / Outside Badge */}
        {distance !== null ? (
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isInside
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                : 'bg-rose-50 text-rose-700 border border-rose-300'
            }`}
          >
            {isInside ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Inside Campus</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Outside Campus</span>
              </>
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
            Awaiting GPS
          </span>
        )}
      </div>

      {/* Visual Distance Metric */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3 text-center">
        <div className="bg-slate-50 p-2 rounded border border-slate-200">
          <span className="block text-[10px] text-slate-500 font-medium">Calculated Distance</span>
          <span className={`text-sm sm:text-base font-extrabold ${isInside ? 'text-emerald-700' : 'text-rose-700'}`}>
            {distance !== null ? `${distance} m` : '--'}
          </span>
        </div>

        <div className="bg-slate-50 p-2 rounded border border-slate-200">
          <span className="block text-[10px] text-slate-500 font-medium">Permitted Radius</span>
          <span className="text-sm sm:text-base font-extrabold text-slate-800">
            ≤ {allowedRadius} m
          </span>
        </div>

        <div className="bg-slate-50 p-2 rounded border border-slate-200">
          <span className="block text-[10px] text-slate-500 font-medium">Current Lat / Lon</span>
          <span className="text-[11px] font-mono font-semibold text-slate-700 block truncate" title={`${currentCoords?.latitude}, ${currentCoords?.longitude}`}>
            {currentCoords ? `${currentCoords.latitude.toFixed(4)}, ${currentCoords.longitude.toFixed(4)}` : 'Detecting...'}
          </span>
        </div>

        <div className="bg-slate-50 p-2 rounded border border-slate-200">
          <span className="block text-[10px] text-slate-500 font-medium">Campus Center</span>
          <span className="text-[11px] font-mono text-slate-600 block truncate">
            {campus ? `${campus.latitude.toFixed(4)}, ${campus.longitude.toFixed(4)}` : '--'}
          </span>
        </div>
      </div>

      {locationError && (
        <div className="mb-3 text-xs bg-amber-50 text-amber-800 p-2.5 rounded border border-amber-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">GPS Note:</span> {locationError}
          </div>
        </div>
      )}

      {/* Developer / Evaluator Testing Controls */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-blue-900">
          <Navigation className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-medium">Testing Simulator:</span>
          <span className="text-slate-600">
            {isSimulated ? 'Using SKIT Campus Coordinates (Inside Geofence)' : 'Using Real Device GPS'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSimulated}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition shadow-sm ${
              isSimulated
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSimulated ? 'Switch to Live GPS' : 'Simulate Inside Campus (42m)'}
          </button>

          <button
            type="button"
            onClick={onRefreshLocation}
            title="Refresh GPS Coordinates"
            className="p-1 rounded bg-white text-slate-600 hover:text-slate-900 border border-slate-300"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
