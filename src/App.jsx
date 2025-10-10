// App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'react-toastify/dist/ReactToastify.css';
import {
  Bell, X, AlertTriangle, Info, CheckCircle, Settings, Search, Cpu, Thermometer, Gauge, Moon, Sun, User, Clock
} from 'lucide-react';

/**
 * ModuleChartsModal - standalone component that uses hooks correctly outside JSX
 */
function ModuleChartsModal({ show, selectedModule, darkMode, alertedSensors, onClose })
{
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!show) return;
    const interval = setInterval(() => setRefreshKey((p) => p + 1), 10000000000);
    return () => clearInterval(interval);
  }, [show]);

  if (!show || !selectedModule) return null;

  const chartsByModule = {
    DRILL001: [
      "http://localhost:3000/d-solo/adplffg/sensors?orgId=1&var-DigitalModule=DRILL001&var-Sensor=drill_temp1&theme=light&panelId=panel-2&__feature.dashboardSceneSolo=true",
      "http://localhost:3000/d-solo/adplffg/sensors?orgId=1&var-DigitalModule=DRILL001&var-Sensor=drill_pressure1&theme=light&panelId=panel-4&__feature.dashboardSceneSolo=true",
      "http://localhost:3000/d-solo/adplffg/sensors?orgId=1&var-DigitalModule=DRILL001&var-Sensor=drill_vibration1&theme=light&panelId=panel-1&__feature.dashboardSceneSolo=true"
    ],
    AIQS001: [
      "http://localhost:3000/d-solo/adplffg/sensors?orgId=1&var-DigitalModule=AIQS001&var-Sensor=aiqs_temp1&theme=light&panelId=panel-2&__feature.dashboardSceneSolo=true",
      "http://localhost:3000/d-solo/adplffg/sensors?orgId=1&var-DigitalModule=AIQS001&var-Sensor=aiqs_camera1&theme=light&panelId=panel-1&__feature.dashboardSceneSolo=true"
    ],
    MILL001: [
      "http://localhost:3000/d-solo/adplffg/sensors?orgId=1&var-DigitalModule=MILL001&var-Sensor=mill_temp1&theme=light&panelId=panel-2&__feature.dashboardSceneSolo=true",
      "http://localhost:3000/d-solo/adplffg/sensors?orgId=1&var-DigitalModule=MILL001&var-Sensor=mill_spindle_speed1&theme=light&panelId=panel-4&__feature.dashboardSceneSolo=true",
      "http://localhost:3000/d-solo/adplffg/sensors?orgId=1&var-DigitalModule=MILL001&var-Sensor=mill_vibration1&theme=light&panelId=panel-5&__feature.dashboardSceneSolo=true"
    ],
    FTS001: [
      "http://localhost:3000/d-solo/adplffg/sensors?orgId=1&var-DigitalModule=FTS001&var-Sensor=fts_speed1&theme=light&panelId=panel-4&__feature.dashboardSceneSolo=true",
      "http://localhost:3000/d-solo/adplffg/sensors?orgId=1&var-DigitalModule=FTS001&var-Sensor=fts_motor_current1&theme=light&panelId=panel-5&__feature.dashboardSceneSolo=true"
    ]
  };

  const selectedCharts = chartsByModule[selectedModule] || [];
  const isTwoCharts = selectedCharts.length === 2;

  return (
    <div
      className="modal show d-block"
      tabIndex="-1"
      style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-content ${darkMode ? 'bg-dark text-light' : 'bg-light text-dark'}`}>
          <div className="modal-header">
            <h5 className="modal-title">Charts for {selectedModule}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            <div className={`p-3 mb-4 rounded-4 shadow-sm ${darkMode ? 'bg-secondary text-light' : 'bg-light text-dark'}`}>
              {selectedModule === 'DRILL001' && <>This module monitors <strong>drill temperature, pressure, and vibration</strong>.</>}
              {selectedModule === 'MILL001' && <>This module monitors <strong>mill temperature, spindle speed, and vibration</strong>.</>}
              {selectedModule === 'AIQS001' && <>This module monitors <strong>AIQS temperature and camera status</strong>.</>}
              {selectedModule === 'FTS001' && <>This module monitors <strong>FTS conveyor speed and motor current</strong>.</>}
            </div>

            <div className={`d-flex flex-wrap justify-content-${isTwoCharts ? 'center' : 'start'} gap-4`}>
  {selectedCharts.map((url, index) => {
    const alertBorder = Object.keys(alertedSensors).some(
      (s) => alertedSensors[s] && url.includes(s)
    )
      ? '3px solid #dc3545'
      : 'none';

    return (
      <div
        key={`${selectedModule}-chart-${index}-${refreshKey}`}
        className="card rounded-4 shadow-sm overflow-hidden border-0"
        style={{
          width: isTwoCharts ? '45%' : '30%',
          minWidth: '350px',
          border: alertBorder,
          boxShadow: alertBorder !== 'none' ? '0 0 15px rgba(220,53,69,0.4)' : '',
          transition: 'all 0.3s ease-in-out',
        }}
      >
        <div
          className={`card-header fw-semibold ${
            darkMode ? 'bg-secondary text-light' : 'bg-light text-dark'
          }`}
        >
          Chart {index + 1}
        </div>
        <div className="ratio ratio-16x9">
          <iframe
            src={`${url}&r=${refreshKey}`}
            frameBorder="0"
            title={`${selectedModule}-chart-${index}`}
            className="w-100 h-100"
          ></iframe>
        </div>
      </div>
    );
  })}
</div>

          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * App - main component
 */
function App() {
  const [alerts, setAlerts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [sensors, setSensors] = useState([]);
  const [loadingSensors, setLoadingSensors] = useState(false);
  const [savingSensorId, setSavingSensorId] = useState(null);
  const [alertLog, setAlertLog] = useState([]);
  const [loadingLog, setLoadingLog] = useState(false);
  const [filter, setFilter] = useState({ sensorId: '', digitalModuleId: '', status: '', from: '', to: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const alertsPerPage = 10;
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [viewAllModal, setViewAllModal] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [alertedModules, setAlertedModules] = useState({});
const [alertedSensors, setAlertedSensors] = useState({});
  const [showModuleCharts, setShowModuleCharts] = useState(false);
  // Track modules and sensors currently in alert state


// --- Pagination for Sensors Visualization ---

const itemsPerPage = 3;

const modules = [
  { id: 'DRILL001', sensors: 3, desc: 'Drill Module', color: '#1e3a8a', icon: 'bi-gear-fill' },
  { id: 'MILL001',  sensors: 3, desc: 'Mill Module',  color: '#dc2626', icon: 'bi-hammer' },
  { id: 'AIQS001',  sensors: 2, desc: 'AIQS Module',  color: '#16a34a', icon: 'bi-cpu-fill' },
  { id: 'FTS001',   sensors: 2, desc: 'FTS Conveyor', color: '#475569', icon: 'bi-truck' },
];


const start = (currentPage - 1) * itemsPerPage;
const visibleModules = modules.slice(start, start + itemsPerPage);

  // thresholds map for controlled inputs
  const [thresholds, setThresholds] = useState({});

  // sensor pagination
  const [sensorPage, setSensorPage] = useState(1);
  const sensorsPerPage = 5;
  const indexOfLastSensor = sensorPage * sensorsPerPage;
  const indexOfFirstSensor = indexOfLastSensor - sensorsPerPage;
  const currentSensors = sensors.slice(indexOfFirstSensor, indexOfLastSensor);
  const totalSensorPages = Math.max(1, Math.ceil(sensors.length / sensorsPerPage));

  const connectionRef = useRef(null);
  const SENSOR_API = "http://localhost:5167/api/Sensor";
  const ALERT_API = "http://localhost:5167/api/Alert";

  // SignalR connection (dynamic import)
  useEffect(() => {
    let mounted = true;
    const initializeConnection = async () => {
      try {
        const { HubConnectionBuilder, LogLevel } = await import('@microsoft/signalr');
        const connection = new HubConnectionBuilder()
          .withUrl('http://localhost:5167/alertHub')
          .configureLogging(LogLevel.Information)
          .build();

        connectionRef.current = connection;

       connection.on('ReceiveAlert', (alertData) => {
  setAlerts((prev) => [alertData, ...prev]);
  setUnreadAlerts((prev) => prev + 1);
  showAlertToast(alertData);
  if (!document.hasFocus()) showBrowserNotification(alertData);

  const { digitalModuleId, sensorId, status } = alertData;
  if (digitalModuleId && sensorId) {
    setAlertedModules(prev => ({
      ...prev,
      [digitalModuleId]: status.toLowerCase() === 'firing'
    }));
    setAlertedSensors(prev => ({
      ...prev,
      [sensorId]: status.toLowerCase() === 'firing'
    }));
  }
});



        connection.onclose(() => {
          setIsConnected(false);
          setTimeout(() => {
            if (mounted) initializeConnection();
          }, 5000);
        });

        await connection.start();
        setIsConnected(true);
      } catch (err) {
        console.error('SignalR connection failed', err);
        setIsConnected(false);
      }
    };

    initializeConnection();
    return () => {
      mounted = false;
      connectionRef.current?.stop();
    };
  }, []);

  // Toast helper
  const showAlertToast = (alertData) => {
    const isFiring = alertData.status?.toLowerCase() === 'firing';
    toast.info(
      <div className="d-flex align-items-center gap-3">
        <div
          className="rounded-circle d-flex align-items-center justify-content-center shadow-sm"
          style={{
            width: '40px',
            height: '40px',
            backgroundColor: isFiring ? '#dc3545' : '#28a745',
            color: 'white',
            fontSize: '20px',
          }}
        >
          {isFiring ? '⚠️' : '✅'}
        </div>
        <div>
          <h6 className="mb-0 fw-bold">{isFiring ? 'Alert Triggered!' : 'Alert Resolved!'}</h6>
          <small className="text-muted">{alertData.sensorId ? `${alertData.sensorId} — ${alertData.alertType || 'Threshold'}` : 'Unknown Sensor'}</small>
        </div>
      </div>,
      { position: 'top-center', autoClose: 4000 }
    );
  };

  const showBrowserNotification = (alert) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const isFiring = alert.status?.toLowerCase() === 'firing';
      const title = isFiring ? `⚠️ Alert: ${alert.sensorId || 'Unknown Sensor'}` : `✅ Resolved: ${alert.sensorId || 'Unknown Sensor'}`;
      const body = alert.alertType || 'Threshold alert';
      new Notification(title, { body, icon: '/vite.svg' });
    }
  };

  const getAlertIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'firing': return <AlertTriangle className="text-danger me-2" />;
      case 'resolved': return <CheckCircle className="text-success me-2" />;
      default: return <Info className="text-primary me-2" />;
    }
  };
 

  const removeAlert = (alertId) => setAlerts((prev) => prev.filter((a) => a.alertId !== alertId));

  // Load sensors and initialize thresholds
  const loadSensors = async () => {
    setLoadingSensors(true);
    try {
      const res = await fetch(SENSOR_API);
      const data = await res.json();
      setSensors(data || []);
      const map = {};
      (data || []).forEach((s) => {
        map[s.sensorId] = { minValue: s.minValue ?? '', maxValue: s.maxValue ?? '' };
      });
      setThresholds(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSensors(false);
    }
  };

  useEffect(() => { loadSensors(); }, []);

  const updateThreshold = async (sensorId) => {
    const t = thresholds[sensorId] || {};
    setSavingSensorId(sensorId);
    try {
      const res = await fetch(`${SENSOR_API}/thresholds`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sensorId, minValue: parseFloat(t.minValue), maxValue: parseFloat(t.maxValue) })
      });
      if (!res.ok) throw new Error(await res.text());
      await loadSensors();
      toast.success(`✅ Threshold updated for ${sensorId}`);
    } catch (err) {
      console.error(err);
      toast.error('❌ Failed to update threshold');
    } finally {
      setSavingSensorId(null);
    }
  };

  // Alert log
  const fetchAlertLog = async () => {
    setLoadingLog(true);
    try {
      const params = new URLSearchParams();
      Object.keys(filter).forEach(k => filter[k] && params.append(k, filter[k]));
      const res = await fetch(`${ALERT_API}/filter?${params.toString()}`);
      setAlertLog(await res.json());
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLog(false);
    }
  };

  useEffect(() => { fetchAlertLog(); }, []);

  const formatDate = (d) => {
    if (!d) return 'N/A';
    const normalized = d.replace(' ', 'T');
    const date = new Date(normalized);
    return isNaN(date.getTime())
      ? d
      : date.toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  };

  // pagination for alert log
  const indexOfLast = currentPage * alertsPerPage;
  const indexOfFirst = indexOfLast - alertsPerPage;
  const currentAlerts = alertLog.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.max(1, Math.ceil(alertLog.length / alertsPerPage));

  const getSensorIcon = (name) => {
    if (!name) return <Cpu size={18} className="text-secondary me-2" />;
    if (name.toLowerCase().includes('temp')) return <Thermometer size={18} className="text-danger me-2" />;
    if (name.toLowerCase().includes('pressure')) return <Gauge size={18} className="text-primary me-2" />;
    return <Cpu size={18} className="text-secondary me-2" />;
  };

  

  const handleOpenNotifications = () => setUnreadAlerts(0);
  const MAX_DROPDOWN_ALERTS = 50;
  const recentAlerts = alerts.slice(0, MAX_DROPDOWN_ALERTS);

  // helper to update thresholds local state
  const onThresholdChange = (sensorId, key, value) => {
    setThresholds((prev) => ({ ...prev, [sensorId]: { ...prev[sensorId], [key]: value } }));
  };

  return (
    <div className={`min-vh-100 ${darkMode ? 'bg-dark text-light' : 'bg-light text-dark'}`}>
      {/* Navbar */}
      <nav className={`navbar navbar-expand-lg ${darkMode ? 'navbar-dark bg-dark' : 'navbar-light bg-white'} shadow-sm sticky-top`}>
        <div className="container-fluid d-flex justify-content-between align-items-center">
          <span className="navbar-brand fw-bold text-primary">⚙️ Smart Alert Dashboard</span>

          <div className="d-flex align-items-center gap-2">
            <button onClick={() => setDarkMode((p) => !p)} className={`btn btn-sm ${darkMode ? 'btn-outline-light' : 'btn-outline-secondary'}`}>
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Notification Dropdown */}
            <div className="dropdown">
              <button className="btn position-relative" data-bs-toggle="dropdown" aria-expanded="false" onClick={handleOpenNotifications}>
                <Bell size={22} className={unreadAlerts > 0 ? 'text-warning animate-bell' : darkMode ? 'text-light' : 'text-secondary'} />
                {unreadAlerts > 0 && (
                  <span className="position-absolute translate-middle badge rounded-pill bg-danger" style={{ top: '-6px', right: '-8px' }}>
                    {unreadAlerts > 99 ? '99+' : unreadAlerts}
                  </span>
                )}
              </button>
              <ul className={`dropdown-menu dropdown-menu-end shadow ${darkMode ? 'dropdown-menu-dark' : ''}`} style={{ minWidth: 320, maxHeight: 400, overflowY: 'auto' }}>
                <li className="dropdown-header">Notifications</li>
                {recentAlerts.length === 0 ? (
                  <li><span className="dropdown-item text-muted text-center">No alerts</span></li>
                ) : recentAlerts.map((a, i) => (
                  <li key={a.alertId || i}>
                    <div className="dropdown-item d-flex justify-content-between align-items-start">
                      <div className="d-flex align-items-center">
                        {getAlertIcon(a.status)}
                        <div>
                          <strong>{a.type || 'Unknown'}</strong>
                          <div className="small text-muted">{a.description}</div>
                        </div>
                      </div>
                      <button className="btn btn-sm btn-link p-0" onClick={(e) => { e.stopPropagation(); removeAlert(a.alertId); }}>
                        <X size={14} />
                      </button>
                    </div>
                  </li>
                ))}
                {alerts.length > MAX_DROPDOWN_ALERTS && (
                  <>
                    <li><hr className="dropdown-divider" /></li>
                    <li><button className="dropdown-item text-center" onClick={() => setViewAllModal(true)}>View All</button></li>
                  </>
                )}
              </ul>
            </div>

            {/* Admin dropdown */}
            <div className="dropdown d-flex align-items-center position-relative">
              <button className={`btn btn-sm ${darkMode ? 'btn-outline-light' : 'btn-outline-primary'} dropdown-toggle d-flex align-items-center`} data-bs-toggle="dropdown">
                <User size={16} className="me-1" /> Admin
              </button>
              <span className={`status-dot ms-2 ${isConnected ? 'bg-success' : 'bg-danger'}`}></span>
              <ul className={`dropdown-menu dropdown-menu-end shadow ${darkMode ? 'dropdown-menu-dark' : ''}`}>
                <li><button className="dropdown-item">Profile</button></li>
                <li><button className="dropdown-item">Settings</button></li>
                <li><button className="dropdown-item">Help</button></li>
                <li><hr className="dropdown-divider" /></li>
                <li><button className="dropdown-item text-danger">Logout</button></li>
              </ul>
            </div>
          </div>
        </div>
      </nav>

      {/* Body */}
      <div className="container py-4">
        {/* Grafana Iframe cards omitted for brevity - keep as in original if needed */}
        <div className={`card border-0 shadow-sm rounded-4 mb-4 ${darkMode ? 'bg-dark text-light' : 'bg-light text-dark'}`}>
          <div className="card-header fw-semibold fs-5 py-3 border-0"><i className="bi bi-bar-chart me-2"></i> Charts Live Panel</div>
          <div className="card-body">
            <div className="container-fluid">
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <div className="ratio ratio-16x9 rounded overflow-hidden shadow-sm">
                    <iframe src="http://localhost:3000/d-solo/ad7kfwh/new-dashboard?orgId=1&from=1602092864391&to=1759859264391&timezone=browser&theme=light&panelId=1" title="Grafana Chart 1" className="border-0" allowFullScreen></iframe>
                  </div>
                </div>
                <div className="col-12 col-md-6">
                  <div className="ratio ratio-16x9 rounded overflow-hidden shadow-sm">
                    <iframe src="http://localhost:3000/d-solo/ad7kfwh/new-dashboard?orgId=1&from=1696699117026&to=1759857517026&timezone=browser&theme=light&panelId=5" title="Grafana Chart 2" className="border-0" allowFullScreen></iframe>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Combined row */}
        <div className="row g-4 mb-4">
          <div className="col-12 col-lg-9">
            <div className={`card border-0 shadow-lg rounded-4 h-100 ${darkMode ? 'bg-dark text-light' : 'bg-light text-dark'}`}>
              <div className="card-header d-flex justify-content-between align-items-center py-3 border-0">
                <div className="d-flex align-items-center gap-2 fs-5 fw-semibold"><Settings size={20} className="text-primary" /> <span>Sensor Threshold Management</span></div>
                <button onClick={loadSensors} className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"><i className="bi bi-arrow-clockwise"></i> Refresh</button>
              </div>

              <div className="card-body p-0">
                {loadingSensors ? (
                  <div className="p-4 text-center">
                    <div className="spinner-border text-primary" role="status"></div>
                    <p className="mt-2 text-muted">Loading sensors...</p>
                  </div>
                ) : (
                  <>
                    <div className="table-responsive">
                      <table className={`table align-middle mb-0 table-borderless ${darkMode ? 'table-dark' : ''}`}>
                        <thead className={`sticky-top ${darkMode ? 'bg-secondary' : 'bg-white shadow-sm'}`}>
                          <tr className="text-uppercase small text-muted fw-semibold">
                            <th>Sensor</th>
                            <th>Unit</th>
                            <th>Min</th>
                            <th>Max</th>
                            <th className="text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentSensors.length === 0 ? (
                            <tr><td colSpan="5" className="text-center text-muted py-4">No sensors available.</td></tr>
                          ) : currentSensors.map((s) => (
                            <tr key={s.sensorId} className={darkMode ? 'hover-glow-dark' : 'hover-glow-light'}>
                              <td className="fw-semibold"><div className="d-flex align-items-center gap-2">{getSensorIcon(s.name)}<span>{s.name}</span></div></td>
                              <td>{s.unit || '-'}</td>
                              <td>
                                <div className="input-group input-group-sm">
                                  <span className="input-group-text border-0 bg-transparent text-muted">⬇</span>
                                  <input type="number" value={thresholds[s.sensorId]?.minValue ?? ''} className="form-control rounded-pill text-center"
                                    onChange={(e) => onThresholdChange(s.sensorId, 'minValue', e.target.value)} style={{ width: '90px' }} />
                                </div>
                              </td>
                              <td>
                                <div className="input-group input-group-sm">
                                  <span className="input-group-text border-0 bg-transparent text-muted">⬆</span>
                                  <input type="number" value={thresholds[s.sensorId]?.maxValue ?? ''} className="form-control rounded-pill text-center"
                                    onChange={(e) => onThresholdChange(s.sensorId, 'maxValue', e.target.value)} style={{ width: '90px' }} />
                                </div>
                              </td>
                              <td className="text-center">
                                <button className={`btn btn-sm rounded-pill px-3 ${savingSensorId === s.sensorId ? 'btn-secondary' : 'btn-primary'}`}
                                  onClick={() => updateThreshold(s.sensorId)} disabled={savingSensorId === s.sensorId}>
                                  {savingSensorId === s.sensorId ? (<span><i className="spinner-border spinner-border-sm me-1"></i> Saving...</span>) : (<span><i className="bi bi-check-circle me-1"></i> Save</span>)}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {totalSensorPages > 1 && (
                      <div className="d-flex justify-content-center align-items-center gap-3 py-3">
                        <button className="btn btn-outline-primary btn-sm rounded-circle" disabled={sensorPage === 1} onClick={() => setSensorPage((p) => Math.max(p - 1, 1))}>←</button>
                        <span className="fw-semibold small">Page {sensorPage} / {totalSensorPages}</span>
                        <button className="btn btn-outline-primary btn-sm rounded-circle" disabled={sensorPage === totalSensorPages} onClick={() => setSensorPage((p) => Math.min(p + 1, totalSensorPages))}>→</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
{/* ===========================
🌟 SENSORS VISUALIZATION PANEL
=========================== */}
<>
  {/* ✅ Load Bootstrap Icons once (needed for the gear, hammer, truck, etc.) */}
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css"
  />

  {(() => {
    const [currentPage, setCurrentPage] = React.useState(1);
    const modules = [
      { id: 'DRILL001', sensors: 3, desc: 'Drill Module', color: '#1e3a8a', icon: 'bi-gear-fill' },
      { id: 'MILL001', sensors: 3, desc: 'Mill Module', color: '#dc2626', icon: 'bi-hammer' },
      { id: 'AIQS001', sensors: 2, desc: 'AIQS Module', color: '#16a34a', icon: 'bi-cpu-fill' },
      { id: 'FTS001', sensors: 2, desc: 'FTS Conveyor', color: '#475569', icon: 'bi-truck' },
    ];

    const itemsPerPage = 3;
    const totalPages = Math.ceil(modules.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const visibleModules = modules.slice(start, start + itemsPerPage);

    return (
      <div className="col-12 col-lg-3">
        <div
          className={`card border-0 shadow-lg rounded-4 h-100 ${
            darkMode ? 'bg-dark text-light' : 'bg-light text-dark'
          }`}
        >
          <div className="card-header border-0 py-3">
            <div className="d-flex align-items-center gap-2 fs-5 fw-semibold">
              <i className="bi bi-eye text-primary"></i>
              <span>Sensors Visualization</span>
            </div>
          </div>

          <div className="card-body d-flex flex-column justify-content-between p-3">
            {/* === Module List === */}
            <div className="d-flex flex-column gap-3">
              {visibleModules.map(({ id, sensors, desc, color, icon }) => (
  <div
    key={id}
    className={`modern-sensor-card ${darkMode ? 'dark' : ''}`}
    style={{
      borderLeft: `5px solid ${color}`,
      background: darkMode
        ? 'linear-gradient(135deg, #1f2937, #111827)'
        : 'linear-gradient(135deg, #ffffff, #f8fafc)',
      position: 'relative',
    }}
    onClick={() => {
      setSelectedModule(id);
      setShowModuleCharts(true);
    }}
  >
    {/* 🔔 Alert Badge Overlay if module has active alert */}
    {alertedModules[id] && (
      <span
        className="position-absolute top-0 end-0 translate-middle badge rounded-circle bg-danger"
        style={{
          width: '20px',
          height: '20px',
          boxShadow: '0 0 8px rgba(220,53,69,0.7)',
        }}
        title="Alert active on this module"
      >
        ⚠
      </span>
    )}

    <div className="d-flex align-items-center gap-3 w-100">
      <div
        className="sensor-icon"
        style={{
          background: color,
          boxShadow: `0 3px 10px ${color}55`,
        }}
      >
        <i className={`bi ${icon}`}></i>
      </div>

      <div className="d-flex flex-column">
        <span className="fw-bold module-title">{id}</span>
        <span className="text-muted small module-desc">
          {desc} &bull; {sensors} sensors
        </span>
      </div>

      <div className="ms-auto">
        <i className="bi bi-arrow-right-circle text-secondary fs-5"></i>
      </div>
    </div>
  </div>
))}
            </div>  

            {/* === Pagination === */}
            <div className="pagination-controls d-flex justify-content-center align-items-center gap-3 mt-3">
              <button
                className="page-btn"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              >
                <i className="bi bi-chevron-left"></i>
              </button>
              <span className="fw-semibold small text-muted">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="page-btn"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  })()}

  {/* ✅ Embedded CSS */}
  <style jsx>{`
    /* ==========================================
    🌟 MODERN SENSOR MODULES — CLICKABLE BUTTONS
    =========================================== */
    .modern-sensor-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px;
      border-radius: 12px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      background: linear-gradient(145deg, #ffffff, #f9fafb);
      cursor: pointer;
      box-shadow: 0 3px 6px rgba(0, 0, 0, 0.06);
      transition: all 0.25s ease;
      position: relative;
    }

    .modern-sensor-card:hover {
      background: linear-gradient(145deg, #f3f4f6, #e5e7eb);
      box-shadow: 0 6px 16px rgba(59, 130, 246, 0.25);
      transform: translateY(-3px) scale(1.02);
      border-color: rgba(59, 130, 246, 0.4);
    }

    .modern-sensor-card:active {
      transform: translateY(1px) scale(0.99);
      box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.2);
      background: linear-gradient(145deg, #e5e7eb, #f3f4f6);
    }

    .sensor-icon {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.3rem;
      transition: all 0.25s ease;
    }

    .modern-sensor-card:hover .sensor-icon {
      transform: scale(1.1);
      box-shadow: 0 0 10px currentColor;
    }

    .module-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: #111827;
    }

    .module-desc {
      font-size: 0.8rem;
      color: #6b7280;
    }

    .pagination-controls {
      padding-top: 10px;
      opacity: 0.8;
      font-size: 0.85rem;
    }

    .page-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #fff;
      border: 1.5px solid #3b82f6;
      color: #3b82f6;
      transition: all 0.25s ease;
    }

    .page-btn:hover:not(:disabled) {
      background: #3b82f6;
      color: #fff;
      transform: scale(1.05);
    }

    .page-btn:disabled {
      opacity: 0.4;
    }

    /* === Dark Mode === */
    .dark .modern-sensor-card {
      background: linear-gradient(145deg, #1f2937, #111827);
      border: 1px solid #374151;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    }

    .dark .modern-sensor-card:hover {
      background: linear-gradient(145deg, #2d3748, #1e293b);
      box-shadow: 0 8px 18px rgba(96, 165, 250, 0.25);
      border-color: rgba(96, 165, 250, 0.4);
    }

    .dark .modern-sensor-card:active {
      transform: translateY(1px);
      box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.6);
    }

    .dark .modern-sensor-card:hover::after {
      border-color: rgba(96, 165, 250, 0.3);
      box-shadow: 0 0 10px rgba(96, 165, 250, 0.25);
    }

    .dark .module-title {
      color: #f9fafb;
    }

    .dark .module-desc {
      color: #9ca3af;
    }
  `}</style>
</>





        </div>

        {/* Alert Log */}
        <div className={`card border-0 shadow-lg rounded-4 mb-5 ${darkMode ? 'bg-dark text-light' : 'bg-white text-dark'}`}>
          <div className={`card-header border-0 py-3 d-flex justify-content-between align-items-center ${darkMode ? 'bg-dark text-light' : 'bg-white shadow-sm'}`}>
            <div className="d-flex align-items-center gap-2 fs-5 fw-semibold"><Search className="text-primary" size={20} /> <span>Alert Log</span></div>
            <button onClick={fetchAlertLog} className={`btn btn-sm rounded-pill px-3 ${darkMode ? 'btn-outline-light' : 'btn-outline-primary'}`}><i className="bi bi-arrow-clockwise me-1"></i> Refresh</button>
          </div>

          <div className="px-3 py-3 border-bottom bg-opacity-10" style={{ background: darkMode ? 'rgba(255,255,255,0.03)' : '#f8fafc' }}>
            <div className="row g-3 align-items-center">
              <div className="col-md-auto col-6">
                <div className="input-group input-group-sm rounded-pill shadow-sm">
                  <span className="input-group-text bg-gradient text-white border-0" style={{ background: '#d40000ff' }}><Cpu size={14} /></span>
                  <select className={`form-select border-0 ${darkMode ? 'bg-dark text-light' : 'bg-white'}`} value={filter.sensorId} onChange={(e) => setFilter({ ...filter, sensorId: e.target.value })}>
                    <option value="">All Sensors</option>
                    {sensors.map((s) => <option key={s.sensorId} value={s.sensorId}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="col-md-auto col-6">
                <div className="input-group input-group-sm rounded-pill shadow-sm">
                  <span  className="input-group-text border-0 text-white" style={{ background: '#d40000ff' }}><Gauge size={14} /></span>
                  <select className={`form-select border-0 ${darkMode ? 'bg-dark text-light' : 'bg-white'}`} value={filter.digitalModuleId} onChange={(e) => setFilter({ ...filter, digitalModuleId: e.target.value })}>
                    <option value="">All Modules</option>
                    {['AIQS001', 'DPS001', 'DRILL001', 'FTS001', 'HBW001', 'MILL001'].map((id) => <option key={id} value={id}>{id}</option>)}
                  </select>
                </div>
              </div>

              <div className="col-md-auto col-6">
                <div className="input-group input-group-sm rounded-pill shadow-sm">
                  <span className="input-group-text border-0 text-white" style={{ background: '#d40000ff' }}><AlertTriangle size={14} /></span>
                  <select className={`form-select border-0 ${darkMode ? 'bg-dark text-light' : 'bg-white'}`} value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
                    <option value="">All Status</option>
                    <option value="firing">Firing</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              <div className="col-md-auto col-6">
                <div className="input-group input-group-sm rounded-pill shadow-sm">
                  <span className="input-group-text border-0 text-white" style={{ background: '#d40000ff' }}><Clock size={14} /></span>
                  <input type="datetime-local" className={`form-control border-0 ${darkMode ? 'bg-dark text-light' : 'bg-white'}`} value={filter.from} onChange={(e) => setFilter({ ...filter, from: e.target.value })} />
                </div>
              </div>

              <div className="col-md-auto col-6">
                <div className="input-group input-group-sm rounded-pill shadow-sm">
                  <span className="input-group-text border-0 text-white" style={{ background: '#d40000ff' }}><Clock size={14} /></span>
                  <input type="datetime-local" className={`form-control border-0 ${darkMode ? 'bg-dark text-light' : 'bg-white'}`} value={filter.to} onChange={(e) => setFilter({ ...filter, to: e.target.value })} />
                </div>
              </div>

              <div className="col-auto ms-auto">
                <button onClick={fetchAlertLog} className={`btn btn-sm rounded-pill shadow-sm px-3 d-flex align-items-center gap-2 ${darkMode ? 'btn-light text-dark' : 'btn-primary text-white'}`}><Search size={16} /> Search</button>
              </div>
            </div>
          </div>

          <div className="card-body p-0">
            {loadingLog ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
                <p className="mt-3 text-muted">Loading alert log...</p>
              </div>
            ) : (
              <>
                <div className="table-responsive">
                  <table className={`table table-hover align-middle mb-0 ${darkMode ? 'table-dark' : ''}`} style={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                    <thead className={`text-uppercase small fw-semibold ${darkMode ? 'bg-secondary text-light' : 'bg-light text-dark'}`} style={{ borderRadius: '12px', letterSpacing: '0.5px' }}>
                      <tr>
                        <th className="px-4">Alert</th>
                        <th>Sensor</th>
                        <th>Module</th>
                        <th className="text-center">Status</th>
                        <th className="text-end pe-4">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentAlerts.length === 0 ? (
                        <tr><td colSpan="5" className="text-center text-muted py-4">No alerts found</td></tr>
                      ) : currentAlerts.map((a) => (
                        <tr key={a.alertId} className={`rounded-3 ${darkMode ? 'hover-glow-dark' : 'hover-glow-light'}`} style={{ background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', transition: 'all 0.2s ease', borderRadius: '12px' }}>
                          <td className="fw-semibold px-4"><div className="d-flex flex-column"><span className="fw-bold text-primary">{a.alertType || 'Threshold Alert'}</span><small className="text-muted">{a.description}</small></div></td>
                          <td>{a.sensorId}</td>
                          <td>{a.digitalModuleId}</td>
                          <td className="text-center"><div className={`badge rounded-pill fw-semibold d-inline-block py-2 px-3 shadow-sm ${a.status === 'firing' ? 'bg-danger text-white' : a.status === 'resolved' ? 'bg-success text-white' : 'bg-warning text-dark'}`} style={{ minWidth: '90px', textTransform: 'capitalize', fontSize: '0.85rem' }}>{a.status}</div></td>
                          <td className="text-end pe-4 text-muted">{formatDate(a.startedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="d-flex justify-content-center align-items-center gap-3 py-4">
                    <button className={`btn btn-outline-primary btn-sm rounded-circle ${darkMode ? 'text-light border-light' : ''}`} onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>←</button>
                    <span className="fw-semibold small">Page {currentPage} / {totalPages}</span>
                    <button className={`btn btn-outline-primary btn-sm rounded-circle ${darkMode ? 'text-light border-light' : ''}`} onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>→</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* View all modal */}
        {viewAllModal && (
          <div className="modal show d-block" tabIndex="-1" onClick={() => setViewAllModal(false)}>
            <div className="modal-dialog modal-lg modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
              <div className={`modal-content ${darkMode ? 'bg-secondary text-light' : ''}`}>
                <div className="modal-header">
                  <h5 className="modal-title">All Alerts</h5>
                  <button type="button" className="btn-close" onClick={() => setViewAllModal(false)}></button>
                </div>
                <div className="modal-body">
                  {alerts.length === 0 ? <p>No alerts yet</p> : (
                    <ul className="list-group">
                      {alerts.map((a, i) => (
                        <li key={a.alertId || i} className="list-group-item d-flex justify-content-between align-items-start">
                          <div className="d-flex align-items-center">{getAlertIcon(a.status)}<div><strong>{a.type || 'Unknown'}</strong><div className="small text-muted">{a.description}</div></div></div>
                          <button className="btn btn-sm btn-link p-0" onClick={() => removeAlert(a.alertId)}><X size={14} /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setViewAllModal(false)}>Close</button></div>
              </div>
            </div>
          </div>
        )}

        <ModuleChartsModal
  show={showModuleCharts}
  selectedModule={selectedModule}
  darkMode={darkMode}
  alertedSensors={alertedSensors}
  onClose={() => setShowModuleCharts(false)}
/>

        <ToastContainer position="top-right" autoClose={5000} theme={darkMode ? "dark" : "light"} />
      </div>
    </div>
  );
} 

export default App;
