// App.jsx
import { useState, useEffect, useRef } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'react-toastify/dist/ReactToastify.css';
import {
  Bell, X, AlertTriangle, Info, CheckCircle, Settings, Search, Cpu, Thermometer, Gauge, Moon, Sun, User, Clock
} from 'lucide-react';

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
  const [alertsPerPage] = useState(10);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [viewAllModal, setViewAllModal] = useState(false);

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


// ========== SignalR Connection ==========
useEffect(() => {
  const initializeConnection = async () => {
    const { HubConnectionBuilder, LogLevel } = await import('@microsoft/signalr');
    const connection = new HubConnectionBuilder()
      .withUrl('http://localhost:5167/alertHub')
      .configureLogging(LogLevel.Information)
      .build();

    connectionRef.current = connection;

    // ======= Listen for Alerts =======
    connection.on('ReceiveAlert', (alertData) => {
      console.log('New alert received:', alertData);

      // Update local alert list
      setAlerts(prev => [alertData, ...prev]);
      setUnreadAlerts(prev => prev + 1);

      // ✅ Show elegant toast
      showAlertToast(alertData);

      // Browser notification if user not focused
      if (!document.hasFocus()) showBrowserNotification(alertData);
    });

    // ======= Handle connection loss =======
    connection.onclose(() => {
      setIsConnected(false);
      console.warn('SignalR connection closed. Reconnecting...');
      setTimeout(initializeConnection, 5000);
    });

    try {
      await connection.start();
      setIsConnected(true);
      console.log('✅ Connected to SignalR hub');
    } catch (err) {
      console.error('Connection failed:', err);
      setIsConnected(false);
    }
  };

  initializeConnection();
  return () => connectionRef.current?.stop();
}, []);


// ======= Toast Helper =======
const showAlertToast = (alertData) => {
  const { status, alertType, sensorId } = alertData;

  const isFiring = status?.toLowerCase() === 'firing';
  const isResolved = status?.toLowerCase() === 'resolved';

  toast(
    <div className="d-flex align-items-center gap-3">
      {/* Icon Circle */}
      <div
        className="rounded-circle d-flex align-items-center justify-content-center shadow-sm"
        style={{
          width: '40px',
          height: '40px',
          backgroundColor: isFiring ? '#dc3545' : '#28a745',
          color: 'white',
          flexShrink: 0,
          fontSize: '20px',
        }}
      >
        {isFiring ? '⚠️' : '✅'}
      </div>

      {/* Message */}
      <div>
        <h6 className="mb-0 fw-bold">
          {isFiring ? 'Alert Triggered!' : 'Alert Resolved!'}
        </h6>
        <small className="text-muted">
          {sensorId ? `${sensorId} — ${alertType || 'Threshold'}` : 'Unknown Sensor'}
        </small>
      </div>
    </div>,
    {
      position: 'top-center',
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: false,
      theme: isFiring ? 'colored' : 'light',
      style: {
        background: isFiring ? '#fff5f5' : '#f1fff5',
        border: `1px solid ${isFiring ? '#dc3545' : '#28a745'}`,
        borderRadius: '12px',
        minWidth: '320px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
      },
    }
  );
};


// ======= Browser Notification (when tab inactive) =======
const showBrowserNotification = (alert) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const isFiring = alert.status?.toLowerCase() === 'firing';
    const title = isFiring
      ? `⚠️ Alert: ${alert.sensorId || 'Unknown Sensor'}`
      : `✅ Resolved: ${alert.sensorId || 'Unknown Sensor'}`;
    const body = alert.alertType || 'Threshold alert';

    new Notification(title, {
      body,
      icon: '/vite.svg',
    });
  }
};


// ======= Icon Helper (for other UI sections, unchanged) =======
const getAlertIcon = (status) => {
  switch (status?.toLowerCase()) {
    case 'firing':
      return <AlertTriangle className="text-danger me-2" />;
    case 'resolved':
      return <CheckCircle className="text-success me-2" />;
    default:
      return <Info className="text-primary me-2" />;
  }
};


// ======= Alert Removal and Count Helpers =======
const removeAlert = (alertId) =>
  setAlerts((prev) => prev.filter((a) => a.alertId !== alertId));

const activeAlertsCount = alerts.filter(
  (a) => a.status === 'firing' || a.status === 'alerting'
).length;


  // ========== Sensors ==========
  const loadSensors = async () => {
    setLoadingSensors(true);
    try {
      const res = await fetch(SENSOR_API);
      setSensors(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSensors(false);
    }
  };

  useEffect(() => { loadSensors(); }, []);

  const updateThreshold = async (sensorId, minValue, maxValue) => {
    setSavingSensorId(sensorId);
    try {
      const res = await fetch(`${SENSOR_API}/thresholds`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sensorId, minValue: parseFloat(minValue), maxValue: parseFloat(maxValue) })
      });
      if (!res.ok) throw new Error(await res.text());
      await loadSensors();
      toast.success(`✅ Threshold updated for ${sensorId}`);
    } catch {
      toast.error('❌ Failed to update threshold');
    } finally {
      setSavingSensorId(null);
    }
  };

  // ========== Alert Log ==========
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

  // alert log pagination
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

  // dark mode switch
  useEffect(() => {
    document.body.classList.remove('bg-light', 'text-dark', 'bg-dark', 'text-light');
    if (darkMode) document.body.classList.add('bg-dark', 'text-light');
    else document.body.classList.add('bg-light', 'text-dark');
  }, [darkMode]);

  const handleOpenNotifications = () => setUnreadAlerts(0);
  const MAX_DROPDOWN_ALERTS = 50;
  const recentAlerts = alerts.slice(0, MAX_DROPDOWN_ALERTS);

  // ========== UI ==========
  return (
    <div className={`min-vh-100 ${darkMode ? 'bg-dark text-light' : 'bg-light text-dark'}`}>
      {/* Navbar */}
      <nav className={`navbar navbar-expand-lg ${darkMode ? 'navbar-dark bg-dark' : 'navbar-light bg-white'} shadow-sm sticky-top`}>
        <div className="container-fluid d-flex justify-content-between align-items-center">
          <span className="navbar-brand fw-bold text-primary">⚙️ Smart Alert Dashboard</span>

          <div className="d-flex align-items-center gap-2">
            <button
              onClick={() => setDarkMode(prev => !prev)}
              className={`btn btn-sm ${darkMode ? 'btn-outline-light' : 'btn-outline-secondary'}`}
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Notification Dropdown */}
            <div className="dropdown">
              <button
                className="btn position-relative"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                onClick={handleOpenNotifications}
              >
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
              <button
                className={`btn btn-sm ${darkMode ? 'btn-outline-light' : 'btn-outline-primary'} dropdown-toggle d-flex align-items-center`}
                data-bs-toggle="dropdown"
              >
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

      {/* Grafana Iframe */}
<div className={`card border-0 shadow-sm rounded-4 mb-4 ${darkMode ? 'bg-dark text-light' : 'bg-light text-dark'}`}>
  <div className="card-header fw-semibold fs-5 py-3 border-0">
    <i className="bi bi-bar-chart me-2"></i> Charts Live Panel
  </div>

  <div className="card-body">
    <div className="container-fluid">
      <div className="row g-3">
        {/* First chart */}
        <div className="col-12 col-md-6">
          <div className="ratio ratio-16x9 rounded overflow-hidden shadow-sm">
            <iframe
              src="http://localhost:3000/d-solo/ad7kfwh/new-dashboard?orgId=1&from=1602092864391&to=1759859264391&timezone=browser&theme=light&panelId=1"
              title="Grafana Chart 1"
              className="border-0"
              allowFullScreen
            ></iframe>
          </div>
        </div>

        {/* Second chart */}
        <div className="col-12 col-md-6">
          <div className="ratio ratio-16x9 rounded overflow-hidden shadow-sm">
            <iframe
              src="http://localhost:3000/d-solo/ad7kfwh/new-dashboard?orgId=1&from=1696699117026&to=1759857517026&timezone=browser&theme=light&panelId=5"
              title="Grafana Chart 2"
              className="border-0"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </div>

      {/* Optional: add more charts in new rows */}
      {/* <div className="row g-3 mt-2">
        <div className="col-12 col-md-6">...</div>
        <div className="col-12 col-md-6">...</div>
      </div> */}
    </div>
  </div>
</div>


        {/* ✅ Sensor Threshold Section */}
<div className={`card border-0 shadow-lg rounded-4 mb-4 ${darkMode ? 'bg-dark text-light' : 'bg-light text-dark'}`}>
  <div className="card-header d-flex justify-content-between align-items-center py-3 border-0">
    <div className="d-flex align-items-center gap-2 fs-5 fw-semibold">
      <Settings size={20} className="text-primary" />
      <span>Sensor Threshold Management</span>
    </div>
    <button onClick={loadSensors} className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1">
      <i className="bi bi-arrow-clockwise"></i> Refresh
    </button>
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
                <tr>
                  <td colSpan="5" className="text-center text-muted py-4">
                    No sensors available.
                  </td>
                </tr>
              ) : (
                currentSensors.map((s) => (
                  <tr key={s.sensorId} className={darkMode ? 'hover-glow-dark' : 'hover-glow-light'}>
                    <td className="fw-semibold">
                      <div className="d-flex align-items-center gap-2">
                        {getSensorIcon(s.name)}
                        <span>{s.name}</span>
                      </div>
                    </td>
                    <td>{s.unit || '-'}</td>
                    <td>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text border-0 bg-transparent text-muted">⬇</span>
                        <input
                          type="number"
                          defaultValue={s.minValue ?? ''}
                          className="form-control rounded-pill text-center"
                          onChange={(e) => (s.minValue = e.target.value)}
                          style={{ width: '90px' }}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text border-0 bg-transparent text-muted">⬆</span>
                        <input
                          type="number"
                          defaultValue={s.maxValue ?? ''}
                          className="form-control rounded-pill text-center"
                          onChange={(e) => (s.maxValue = e.target.value)}
                          style={{ width: '90px' }}
                        />
                      </div>
                    </td>
                    <td className="text-center">
                      <button
                        className={`btn btn-sm rounded-pill px-3 ${
                          savingSensorId === s.sensorId ? 'btn-secondary' : 'btn-primary'
                        }`}
                        onClick={() => updateThreshold(s.sensorId, s.minValue, s.maxValue)}
                        disabled={savingSensorId === s.sensorId}
                      >
                        {savingSensorId === s.sensorId ? (
                          <span>
                            <i className="spinner-border spinner-border-sm me-1"></i> Saving...
                          </span>
                        ) : (
                          <span>
                            <i className="bi bi-check-circle me-1"></i> Save
                          </span>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Arrows */}
        {totalSensorPages > 1 && (
          <div className="d-flex justify-content-center align-items-center gap-3 py-3">
            <button
              className="btn btn-outline-primary btn-sm rounded-circle"
              disabled={sensorPage === 1}
              onClick={() => setSensorPage((p) => Math.max(p - 1, 1))}
            >
              ←
            </button>
            <span className="fw-semibold small">
              Page {sensorPage} / {totalSensorPages}
            </span>
            <button
              className="btn btn-outline-primary btn-sm rounded-circle"
              disabled={sensorPage === totalSensorPages}
              onClick={() => setSensorPage((p) => Math.min(p + 1, totalSensorPages))}
            >
              →
            </button>
          </div>
        )}
      </>
    )}
  </div>
</div>

{/* === 🚨 Alert Log Section (Refined Modern Design) === */}
<div className={`card border-0 shadow-lg rounded-4 mb-5 ${darkMode ? 'bg-dark text-light' : 'bg-white text-dark'}`}>
  <div className={`card-header border-0 py-3 d-flex justify-content-between align-items-center ${darkMode ? 'bg-dark text-light' : 'bg-white shadow-sm'}`}>
    <div className="d-flex align-items-center gap-2 fs-5 fw-semibold">
      <Search className="text-primary" size={20} />
      <span>Alert Log</span>
    </div>
    <button
      onClick={fetchAlertLog}
      className={`btn btn-sm rounded-pill px-3 ${darkMode ? 'btn-outline-light' : 'btn-outline-primary'}`}
    >
      <i className="bi bi-arrow-clockwise me-1"></i> Refresh
    </button>
  </div>

  {/* Filter Toolbar */}
  <div className="px-3 py-3 border-bottom bg-opacity-10"
       style={{ background: darkMode ? 'rgba(255,255,255,0.03)' : '#f8fafc' }}>
    <div className="row g-3 align-items-center">

      {/* Sensor */}
      <div className="col-md-auto col-6">
        <div className="input-group input-group-sm rounded-pill shadow-sm">
          <span className="input-group-text bg-gradient text-white border-0" style={{ background: '#d40000ff' }}>
            <Cpu size={14} />
          </span>
          <select
            className={`form-select border-0 ${darkMode ? 'bg-dark text-light' : 'bg-white'}`}
            value={filter.sensorId}
            onChange={(e) => setFilter({ ...filter, sensorId: e.target.value })}
          >
            <option value="">All Sensors</option>
            {sensors.map((s) => (
              <option key={s.sensorId} value={s.sensorId}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Module */}
      <div className="col-md-auto col-6">
        <div className="input-group input-group-sm rounded-pill shadow-sm">
          <span className="input-group-text border-0 text-white" style={{ background: '#d40000ff' }}>
            <Gauge size={14} />
          </span>
          <select
            className={`form-select border-0 ${darkMode ? 'bg-dark text-light' : 'bg-white'}`}
            value={filter.digitalModuleId}
            onChange={(e) => setFilter({ ...filter, digitalModuleId: e.target.value })}
          >
            <option value="">All Modules</option>
            {['AIQS001', 'DPS001', 'DRILL001', 'FTS001', 'HBW001', 'MILL001'].map((id) => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Status */}
      <div className="col-md-auto col-6">
        <div className="input-group input-group-sm rounded-pill shadow-sm">
          <span className="input-group-text border-0 text-white" style={{ background: '#d40000ff' }}>
            <AlertTriangle size={14} />
          </span>
          <select
            className={`form-select border-0 ${darkMode ? 'bg-dark text-light' : 'bg-white'}`}
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          >
            <option value="">All Status</option>
            <option value="firing">Firing</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Date From */}
      <div className="col-md-auto col-6">
        <div className="input-group input-group-sm rounded-pill shadow-sm">
          <span className="input-group-text border-0 text-white" style={{ background: '#d40000ff' }}>
            <Clock size={14} />
          </span>
          <input
            type="datetime-local"
            className={`form-control border-0 ${darkMode ? 'bg-dark text-light' : 'bg-white'}`}
            value={filter.from}
            onChange={(e) => setFilter({ ...filter, from: e.target.value })}
          />
        </div>
      </div>

      {/* Date To */}
      <div className="col-md-auto col-6">
        <div className="input-group input-group-sm rounded-pill shadow-sm">
          <span className="input-group-text border-0 text-white" style={{ background: '#d40000ff' }}>
            <Clock size={14} />
          </span>
          <input
            type="datetime-local"
            className={`form-control border-0 ${darkMode ? 'bg-dark text-light' : 'bg-white'}`}
            value={filter.to}
            onChange={(e) => setFilter({ ...filter, to: e.target.value })}
          />
        </div>
      </div>

      {/* Search Button */}
      <div className="col-auto ms-auto">
        <button
          onClick={fetchAlertLog}
          className={`btn btn-sm rounded-pill shadow-sm px-3 d-flex align-items-center gap-2 ${darkMode ? 'btn-light text-dark' : 'btn-primary text-white'}`}
        >
          <Search size={16} /> Search
        </button>
      </div>
    </div>
  </div>

 {/* Table */}
<div className="card-body p-0">
  {loadingLog ? (
    <div className="text-center py-5">
      <div className="spinner-border text-primary" role="status"></div>
      <p className="mt-3 text-muted">Loading alert log...</p>
    </div>
  ) : (
    <>
      <div className="table-responsive">
        <table
          className={`table table-hover align-middle mb-0 ${
            darkMode ? 'table-dark' : ''
          }`}
          style={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}
        >
          <thead
            className={`text-uppercase small fw-semibold ${
              darkMode ? 'bg-secondary text-light' : 'bg-light text-dark'
            }`}
            style={{
              borderRadius: '12px',
              letterSpacing: '0.5px',
            }}
          >
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
              <tr>
                <td colSpan="5" className="text-center text-muted py-4">
                  No alerts found
                </td>
              </tr>
            ) : (
              currentAlerts.map((a) => (
                <tr
                  key={a.alertId}
                  className={`rounded-3 ${
                    darkMode ? 'hover-glow-dark' : 'hover-glow-light'
                  }`}
                  style={{
                    background: darkMode
                      ? 'rgba(255,255,255,0.05)'
                      : 'rgba(0,0,0,0.02)',
                    transition: 'all 0.2s ease',
                    borderRadius: '12px',
                  }}
                >
                  {/* ALERT TYPE */}
                  <td className="fw-semibold px-4">
                    <div className="d-flex flex-column">
                      <span className="fw-bold text-primary">
                        {a.alertType || 'Threshold Alert'}
                      </span>
                      <small className="text-muted">{a.description}</small>
                    </div>
                  </td>

                  {/* SENSOR */}
                  <td>{a.sensorId}</td>

                  {/* MODULE */}
                  <td>{a.digitalModuleId}</td>

                  {/* STATUS */}
                  <td className="text-center">
                    <div
                      className={`badge rounded-pill fw-semibold d-inline-block py-2 px-3 shadow-sm ${
                        a.status === 'firing'
                          ? 'bg-danger text-white'
                          : a.status === 'resolved'
                          ? 'bg-success text-white'
                          : 'bg-warning text-dark'
                      }`}
                      style={{
                        minWidth: '90px',
                        textTransform: 'capitalize',
                        fontSize: '0.85rem',
                      }}
                    >
                      {a.status}
                    </div>
                  </td>

                  {/* CREATED */}
                  <td className="text-end pe-4 text-muted">
                    {formatDate(a.startedAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center align-items-center gap-3 py-4">
          <button
            className={`btn btn-outline-primary btn-sm rounded-circle ${
              darkMode ? 'text-light border-light' : ''
            }`}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
          >
            ←
          </button>
          <span className="fw-semibold small">
            Page {currentPage} / {totalPages}
          </span>
          <button
            className={`btn btn-outline-primary btn-sm rounded-circle ${
              darkMode ? 'text-light border-light' : ''
            }`}
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            →
          </button>
        </div>
      )}
    </>
  )}
</div>

</div>

        </div>
      {/* Modal for View All Alerts */}
      {viewAllModal && (
        <div className="modal show d-block" tabIndex="-1" onClick={() => setViewAllModal(false)}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
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
                        <div className="d-flex align-items-center">
                          {getAlertIcon(a.status)}
                          <div>
                            <strong>{a.type || 'Unknown'}</strong>
                            <div className="small text-muted">{a.description}</div>
                          </div>
                        </div>
                        <button className="btn btn-sm btn-link p-0" onClick={() => removeAlert(a.alertId)}><X size={14} /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setViewAllModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={5000} theme={darkMode ? "dark" : "light"} />
    </div>
  );
}

export default App;
