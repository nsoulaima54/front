import { useState, useEffect, useRef } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';
import {
  Bell, X, AlertTriangle, Info, CheckCircle, Settings, Search
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

  const connectionRef = useRef(null);

  const SENSOR_API = "http://localhost:5167/api/Sensor";
  const ALERT_API = "http://localhost:5167/api/Alert";

  // ============================
  // SignalR connection
  // ============================
  useEffect(() => {
    const initializeConnection = async () => {
      const { HubConnectionBuilder, LogLevel } = await import('@microsoft/signalr');
      const connection = new HubConnectionBuilder()
        .withUrl('http://localhost:5167/alertHub')
        .configureLogging(LogLevel.Information)
        .build();

      connectionRef.current = connection;

      connection.on('ReceiveAlert', (alertData) => {
        setAlerts(prev => [alertData, ...prev.slice(0, 9)]);
        if (!document.hasFocus()) showBrowserNotification(alertData);
      });

      connection.onclose(() => {
        setIsConnected(false);
        setTimeout(initializeConnection, 5000);
      });

      try {
        await connection.start();
        setIsConnected(true);
      } catch (err) {
        console.error('Connection failed:', err);
        setIsConnected(false);
      }
    };

    initializeConnection();
    return () => connectionRef.current?.stop();
  }, []);

  const showBrowserNotification = (alert) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Alert: ${alert.type || 'New Alert'}`, {
        body: alert.description || 'New alert received',
        icon: '/vite.svg',
        tag: alert.alertId
      });
    }
  };

  const getAlertIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'firing': return <AlertTriangle className="text-danger me-2" />;
      case 'resolved': return <CheckCircle className="text-success me-2" />;
      default: return <Info className="text-primary me-2" />;
    }
  };

  const removeAlert = (alertId) =>
    setAlerts(prev => prev.filter(a => a.alertId !== alertId));

  const activeAlertsCount =
    alerts.filter(a => a.status === 'firing' || a.status === 'alerting').length;

  // ============================
  // Sensors
  // ============================
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
      toast.success('Threshold updated');
    } catch {
      toast.error('Failed to update threshold');
    } finally { setSavingSensorId(null); }
  };

  // ============================
  // Alert Log
  // ============================
  const fetchAlertLog = async () => {
    setLoadingLog(true);
    try {
      const params = new URLSearchParams();
      Object.keys(filter).forEach(k => filter[k] && params.append(k, filter[k]));
      const res = await fetch(`${ALERT_API}/filter?${params}`);
      setAlertLog(await res.json());
    } catch (err) {
      console.error(err);
    } finally { setLoadingLog(false); }
  };

  useEffect(() => { fetchAlertLog(); }, []);

  const formatDate = (d) => {
    if (!d) return 'N/A';
    const date = new Date(d);
    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
  };

  // ============================
  // UI
  // ============================
  return (
    <div className="bg-light min-vh-100">
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm sticky-top">
        <div className="container-fluid">
          <span className="navbar-brand fw-bold text-primary">🚨 Alert Dashboard</span>
          <div className="d-flex align-items-center gap-2">
            <span className={`badge ${isConnected ? 'bg-success' : 'bg-danger'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            <button
              onClick={() => Notification.requestPermission()}
              className="btn btn-outline-primary btn-sm"
              title="Enable notifications"
            >
              <Bell size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container py-4">
        {/* === Alert Overview === */}
        <div className="row g-4 mb-4">
          <div className="col-md-4">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-body">
                <h5 className="fw-bold mb-3">Alert Summary</h5>
                <p>Total: <strong>{alerts.length}</strong></p>
                <p className="text-danger">Active: <strong>{activeAlertsCount}</strong></p>
                <p className="text-success">Resolved: <strong>{alerts.length - activeAlertsCount}</strong></p>
              </div>
            </div>
          </div>

          {/* === Recent Alerts === */}
          <div className="col-md-8">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-header bg-transparent fw-semibold d-flex align-items-center">
                <Bell className="me-2" /> Recent Alerts
              </div>
              <ul className="list-group list-group-flush">
                {alerts.length === 0 ? (
                  <li className="list-group-item text-center text-muted py-4">No alerts yet</li>
                ) : alerts.map(alert => (
                  <li key={alert.alertId} className="list-group-item d-flex justify-content-between align-items-start">
                    <div className="d-flex align-items-start">
                      {getAlertIcon(alert.status)}
                      <div>
                        <strong>{alert.type}</strong>
                        <p className="mb-0 small text-muted">{alert.description}</p>
                      </div>
                    </div>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => removeAlert(alert.alertId)}
                    >
                      <X size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* === Grafana Panel === */}
        <div className="card border-0 shadow-sm rounded-4 mb-4">
          <iframe
            src="http://localhost:3000/d-solo/ad7kfwh/new-dashboard?orgId=1&panelId=panel-1"
            width="100%"
            height="320"
            frameBorder="0"
            className="rounded-bottom"
          ></iframe>
        </div>

        {/* === Sensor Thresholds === */}
        <div className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-header bg-transparent fw-semibold d-flex justify-content-between align-items-center">
            <div><Settings className="me-2" /> Sensor Threshold Management</div>
            <button onClick={loadSensors} className="btn btn-sm btn-outline-primary">↻ Refresh</button>
          </div>
          <div className="card-body p-0">
            {loadingSensors ? (
              <div className="p-3 text-center">Loading sensors...</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>ID</th><th>Name</th><th>Unit</th><th>Min</th><th>Max</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sensors.map(s => (
                      <tr key={s.sensorId}>
                        <td>{s.sensorId}</td>
                        <td>{s.name}</td>
                        <td>{s.unit || '-'}</td>
                        <td><input type="number" defaultValue={s.minValue ?? ''} className="form-control form-control-sm" onChange={e => s.minValue = e.target.value} /></td>
                        <td><input type="number" defaultValue={s.maxValue ?? ''} className="form-control form-control-sm" onChange={e => s.maxValue = e.target.value} /></td>
                        <td>
                          <button
                            className="btn btn-sm btn-primary"
                            disabled={savingSensorId === s.sensorId}
                            onClick={() => updateThreshold(s.sensorId, s.minValue, s.maxValue)}
                          >
                            {savingSensorId === s.sensorId ? 'Saving...' : 'Save'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* === Alert Log === */}
        <div className="card border-0 shadow-sm rounded-4 mb-5">
          <div className="card-header bg-transparent fw-semibold d-flex justify-content-between align-items-center">
            <div><Search className="me-2" /> Alert Log</div>
            <button onClick={fetchAlertLog} className="btn btn-sm btn-outline-primary">↻ Refresh</button>
          </div>
          <div className="card-body">
            {/* Filters */}
            <div className="row g-2 mb-3">
              <div className="col-md">
                <select className="form-select form-select-sm" value={filter.sensorId} onChange={e => setFilter({ ...filter, sensorId: e.target.value })}>
                  <option value="">All Sensors</option>
                  {sensors.map(s => <option key={s.sensorId} value={s.sensorId}>{s.name}</option>)}
                </select>
              </div>
              <div className="col-md">
                <select className="form-select form-select-sm" value={filter.digitalModuleId} onChange={e => setFilter({ ...filter, digitalModuleId: e.target.value })}>
                  <option value="">All Modules</option>
                  {['AIQS001', 'DPS001', 'DRILL001', 'FTS001', 'HBW001', 'MILL001'].map(id => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              </div>
              <div className="col-md">
                <select className="form-select form-select-sm" value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}>
                  <option value="">All Status</option>
                  <option value="firing">Firing</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div className="col-md"><input type="datetime-local" className="form-control form-control-sm" value={filter.from} onChange={e => setFilter({ ...filter, from: e.target.value })} /></div>
              <div className="col-md"><input type="datetime-local" className="form-control form-control-sm" value={filter.to} onChange={e => setFilter({ ...filter, to: e.target.value })} /></div>
            </div>

            <div className="d-flex justify-content-end mb-3">
              <button className="btn btn-primary btn-sm" onClick={fetchAlertLog}><Search size={16} className="me-1" /> Search</button>
            </div>

            {/* Table */}
            {loadingLog ? (
              <div>Loading alert log...</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Alert Name</th>
                      <th>Sensor ID</th>
                      <th>Module</th>
                      <th>Status</th>
                      <th>Severity</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alertLog.length === 0 ? (
                      <tr><td colSpan="6" className="text-center text-muted py-3">No alerts found</td></tr>
                    ) : alertLog.map(a => (
                      <tr key={a.id}>
                        <td>{a.alertName}</td>
                        <td>{a.sensorId}</td>
                        <td>{a.digitalModuleId}</td>
                        <td><span className={`badge ${a.status === 'firing' ? 'bg-danger' : 'bg-success'}`}>{a.status}</span></td>
                        <td>{a.severity}</td>
                        <td>{formatDate(a.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

export default App;
