import { useState, useEffect, useRef } from 'react'
import { Bell, X, AlertTriangle, Info, CheckCircle, Settings, Search } from 'lucide-react'
import './App.css'

function App() {
  const [alerts, setAlerts] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const connectionRef = useRef(null)

  const [sensors, setSensors] = useState([])
  const [loadingSensors, setLoadingSensors] = useState(false)
  const [savingSensorId, setSavingSensorId] = useState(null)

  // 🧩 NEW STATES FOR ALERT LOG
  const [alertLog, setAlertLog] = useState([])
  const [loadingLog, setLoadingLog] = useState(false)
  const [filter, setFilter] = useState({
    sensorId: '',
    digitalModuleId: '',
    status: '',
    from: '',
    to: ''
  })

  const SENSOR_API = "http://localhost:5167/api/Sensor"
  const ALERT_API = "http://localhost:5167/api/Alert"

  // ============================
  // 🔌 ALERTS VIA SIGNALR
  // ============================
  useEffect(() => {
    const initializeConnection = async () => {
      const { HubConnectionBuilder, LogLevel } = await import('@microsoft/signalr')
      const connection = new HubConnectionBuilder()
        .withUrl('http://localhost:5167/alertHub')
        .configureLogging(LogLevel.Information)
        .build()

      connectionRef.current = connection

      connection.on('ReceiveAlert', (alertData) => {
        setAlerts(prev => [alertData, ...prev.slice(0, 9)])
        if (!document.hasFocus()) showBrowserNotification(alertData)
      })

      connection.onclose(() => {
        setIsConnected(false)
        setTimeout(initializeConnection, 5000)
      })

      try {
        await connection.start()
        setIsConnected(true)
      } catch (err) {
        console.error('Connection failed:', err)
        setIsConnected(false)
      }
    }

    initializeConnection()
    return () => connectionRef.current?.stop()
  }, [])

  const showBrowserNotification = (alert) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Alert: ${alert.type || 'New Alert'}`, {
        body: alert.description || alert.summary || 'New alert received',
        icon: '/vite.svg',
        tag: alert.alertId
      })
    }
  }

  const getAlertIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'firing': return <AlertTriangle className="w-5 h-5 text-red-500" />
      case 'resolved': return <CheckCircle className="w-5 h-5 text-green-500" />
      default: return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  const removeAlert = (alertId) => {
    setAlerts(prev => prev.filter(alert => alert.alertId !== alertId))
  }

  const activeAlertsCount = alerts.filter(a => a.status === 'firing' || a.status === 'alerting').length

  // ==================================
  // ⚙️ SENSOR MANAGEMENT
  // ==================================
  const loadSensors = async () => {
    setLoadingSensors(true)
    try {
      const res = await fetch(SENSOR_API)
      const data = await res.json()
      setSensors(data)
    } catch (err) {
      console.error('Error loading sensors:', err)
    } finally {
      setLoadingSensors(false)
    }
  }

  useEffect(() => {
    loadSensors()
  }, [])

  const updateThreshold = async (sensorId, minValue, maxValue) => {
    setSavingSensorId(sensorId)
    try {
      const res = await fetch(`${SENSOR_API}/thresholds`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sensorId, minValue: parseFloat(minValue), maxValue: parseFloat(maxValue) })
      })

      if (!res.ok) throw new Error(await res.text())
      await loadSensors()
    } catch (err) {
      console.error("Failed to update thresholds:", err)
    } finally {
      setSavingSensorId(null)
    }
  }

  // ==================================
  // 📜 ALERT LOG & FILTER SECTION
  // ==================================
  const fetchAlertLog = async () => {
    setLoadingLog(true)
    try {
      const params = new URLSearchParams()
      if (filter.sensorId) params.append('sensorId', filter.sensorId)
      if (filter.digitalModuleId) params.append('digitalModuleId', filter.digitalModuleId)
      if (filter.status) params.append('status', filter.status)
      if (filter.from) params.append('from', filter.from)
      if (filter.to) params.append('to', filter.to)

      const res = await fetch(`${ALERT_API}/filter?${params.toString()}`)
      const data = await res.json()
      setAlertLog(data)
    } catch (err) {
      console.error('Error loading alert log:', err)
    } finally {
      setLoadingLog(false)
    }
  }

  useEffect(() => {
    fetchAlertLog()
  }, [])

  // Helper to safely show dates
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toString() === 'Invalid Date'
      ? 'N/A'
      : date.toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
  }

  // ==================================
  // 🖥️ UI
  // ==================================
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-semibold text-gray-900">Alert Dashboard</h1>
            <div className={`flex items-center ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
          <button
            onClick={() => Notification.requestPermission()}
            className="text-gray-500 hover:text-blue-600"
          >
            <Bell size={24} />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Alerts Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Alert Summary</h2>
            <p>Total: {alerts.length}</p>
            <p className="text-red-600">Active: {activeAlertsCount}</p>
            <p className="text-green-600">Resolved: {alerts.length - activeAlertsCount}</p>
          </div>

          <div className="lg:col-span-2 bg-white rounded-lg shadow">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center space-x-2">
                <Bell className="w-5 h-5 text-gray-600" />
                <span>Recent Alerts</span>
              </h2>
            </div>
            <div className="divide-y">
              {alerts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No alerts yet</div>
              ) : (
                alerts.map(alert => (
                  <div key={alert.alertId} className="p-6 flex justify-between">
                    <div className="flex items-start space-x-3">
                      {getAlertIcon(alert.status)}
                      <div>
                        <h3 className="font-medium">{alert.type}</h3>
                        <p className="text-gray-600">{alert.description}</p>
                      </div>
                    </div>
                    <button onClick={() => removeAlert(alert.alertId)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Grafana */}
        <iframe
          src="http://localhost:3000/d-solo/ad7kfwh/new-dashboard?orgId=1&panelId=panel-1"
          width="100%"
          height="200"
          frameBorder="0"
          className="rounded-lg shadow"
        ></iframe>

        {/* Sensor Management */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center space-x-2">
              <Settings className="w-5 h-5 text-gray-600" />
              <span>Sensor Threshold Management</span>
            </h2>
            <button onClick={loadSensors} className="text-sm text-blue-600 hover:underline">↻ Refresh</button>
          </div>
          {loadingSensors ? (
            <p>Loading sensors...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left">ID</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Unit</th>
                    <th className="px-3 py-2 text-left">Min</th>
                    <th className="px-3 py-2 text-left">Max</th>
                    <th className="px-3 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sensors.map(sensor => (
                    <tr key={sensor.sensorId} className="border-t">
                      <td className="px-3 py-2">{sensor.sensorId}</td>
                      <td className="px-3 py-2">{sensor.name}</td>
                      <td className="px-3 py-2">{sensor.unit || '-'}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          defaultValue={sensor.minValue ?? ''}
                          className="border rounded px-2 py-1 w-24"
                          onChange={(e) => (sensor.minValue = e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          defaultValue={sensor.maxValue ?? ''}
                          className="border rounded px-2 py-1 w-24"
                          onChange={(e) => (sensor.maxValue = e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => updateThreshold(sensor.sensorId, sensor.minValue, sensor.maxValue)}
                          disabled={savingSensorId === sensor.sensorId}
                          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
                        >
                          {savingSensorId === sensor.sensorId ? 'Saving...' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 📜 ALERT LOG */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center space-x-2">
              <Search className="w-5 h-5 text-gray-600" />
              <span>Alert Log</span>
            </h2>
            <button onClick={fetchAlertLog} className="text-sm text-blue-600 hover:underline">↻ Refresh</button>
          </div>

          {/* Filter Form */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            {/* Sensor Filter */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Sensor</label>
              <select
                className="border rounded w-full px-3 py-1"
                value={filter.sensorId}
                onChange={(e) => setFilter({ ...filter, sensorId: e.target.value })}
              >
                <option value="">All Sensors</option>
                {sensors.map(sensor => (
                  <option key={sensor.sensorId} value={sensor.sensorId}>
                    {sensor.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Module Filter */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Module</label>
              <select
                className="border rounded w-full px-3 py-1"
                value={filter.digitalModuleId}
                onChange={(e) => setFilter({ ...filter, digitalModuleId: e.target.value })}
              >
                <option value="">All Modules</option>
                <option value="AIQS001">AIQS001</option>
                <option value="DPS001">DPS001</option>
                <option value="DRILL001">DRILL001</option>
                <option value="FTS001">FTS001</option>
                <option value="HBW001">HBW001</option>
                <option value="MILL001">MILL001</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Status</label>
              <select
                className="border rounded w-full px-3 py-1"
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              >
                <option value="">All</option>
                <option value="firing">Firing</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            {/* From */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">From</label>
              <input
                type="datetime-local"
                className="border rounded w-full px-3 py-1"
                value={filter.from}
                onChange={(e) => setFilter({ ...filter, from: e.target.value })}
              />
            </div>

            {/* To */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">To</label>
              <input
                type="datetime-local"
                className="border rounded w-full px-3 py-1"
                value={filter.to}
                onChange={(e) => setFilter({ ...filter, to: e.target.value })}
              />
            </div>
          </div>

          {/* Search */}
          <div className="flex justify-end mb-4">
            <button
              onClick={fetchAlertLog}
              className="bg-blue-600 text-white px-5 py-1.5 rounded hover:bg-blue-700 flex items-center space-x-1"
            >
              <Search className="w-4 h-4" /> <span>Search</span>
            </button>
          </div>

          {/* Log Table */}
          {loadingLog ? (
            <p>Loading alert log...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2">Alert Name</th>
                    <th className="px-3 py-2">Sensor ID</th>
                    <th className="px-3 py-2">Module</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Severity</th>
                    <th className="px-3 py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {alertLog.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-3 text-gray-500">No alerts found</td></tr>
                  ) : (
                    alertLog.map(alert => (
                      <tr key={alert.id} className="border-t">
                        <td className="px-3 py-2">{alert.alertName}</td>
                        <td className="px-3 py-2">{alert.sensorId}</td>
                        <td className="px-3 py-2">{alert.digitalModuleId}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${alert.status === 'firing' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {alert.status}
                          </span>
                        </td>
                        <td className="px-3 py-2">{alert.severity}</td>
                        <td className="px-3 py-2">{formatDate(alert.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
