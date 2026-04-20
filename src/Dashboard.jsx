import { useState, useEffect } from "react"
import { ArrowLeft, Moon, Sun, Activity, AlertTriangle, Clock, Wifi, WifiOff } from "lucide-react"
import { Button } from "./components/ui/Button"
import PatientPanel from "./components/PatientPanel"
import ActivityLog from "./components/ActivityLog"
import DataVisualization from "./components/DataVisualisation"
import StatusBar from "./components/StatusBar"
import SystemHeader from "./components/SystemHeader"
import { AlertPanel } from "./components/AlertPanel"
import { usePatientData } from "./usePatientData"
import SensorGrid from "./components/SensorGrid"

import PulseGraph from "./components/PulseGraph";
export default function Dashboard({ onBack }) {
  const [isDark, setIsDark] = useState(true)
  const [demoMode, setDemoMode] = useState(true)
  const [selectedPatient, setSelectedPatient] = useState("")
  const [alerts, setAlerts] = useState([])
  const { data: patientData, loading, error, toggleBuzzer, toggleLight, fetchData } = usePatientData(selectedPatient, demoMode)

  // Dark mode toggle
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [isDark])

  // Update alerts based on sensor data
  useEffect(() => {
    if (demoMode || !patientData) return;

    const newAlerts = []

    if (patientData.flame) {
      newAlerts.push({
        id: `flame-${Date.now()}`,
        type: "danger",
        message: "🔥 FLAME DETECTED! Immediate attention required!",
        timestamp: new Date()
      })
    }

    if (patientData.motion && !patientData.lightState) {
      newAlerts.push({
        id: `motion-dark-${Date.now()}`,
        type: "warning",
        message: "Patient movement detected in dark room",
        timestamp: new Date()
      })
    }

    if (patientData.temp > 30) {
      newAlerts.push({
        id: `temp-${Date.now()}`,
        type: "warning",
        message: `High temperature detected: ${patientData.temp}°C`,
        timestamp: new Date()
      })
    }

    if (patientData.hum > 70) {
      newAlerts.push({
        id: `hum-${Date.now()}`,
        type: "warning",
        message: `High humidity: ${patientData.hum}%`,
        timestamp: new Date()
      })
    }

    if (patientData.hum < 30) {
      newAlerts.push({
        id: `hum-low-${Date.now()}`,
        type: "info",
        message: `Low humidity: ${patientData.hum}%`,
        timestamp: new Date()
      })
    }

    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 8))
    }
  }, [patientData, demoMode])

  // Auto-remove alerts after 10s
  useEffect(() => {
    const interval = setInterval(() => {
      setAlerts(prev => prev.filter(alert => Date.now() - alert.timestamp.getTime() < 10000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Connection status alerts
  useEffect(() => {
    if (demoMode) return;

    if (error) {
      setAlerts(prev => [
        {
          id: `connection-error-${Date.now()}`,
          type: "danger",
          message: `Device connection failed: ${error}`,
          timestamp: new Date()
        },
        ...prev
      ].slice(0, 8))
    } else if (patientData && !loading) {
      setAlerts(prev => [
        {
          id: `connected-${Date.now()}`,
          type: "success",
          message: "Successfully connected to patient monitoring device",
          timestamp: new Date()
        },
        ...prev
      ].slice(0, 8))
    }
  }, [error, patientData, loading, demoMode])

  const handleToggleBuzzer = () => {
    if (!demoMode) toggleBuzzer()
  }

  const handleToggleLight = () => {
    if (!demoMode) toggleLight()
  }

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="min-h-screen bg-background text-foreground overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-border/50 glass-effect">
          <div className="max-w-[2000px] mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-primary/20">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    MediTrack Pro
                  </h1>
                  <p className="text-xs text-muted-foreground">Smart Wards Monitoring System</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Connection Status */}
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${demoMode ? 'bg-blue-500/20 text-blue-600' :
                  loading ? 'bg-yellow-500/20 text-yellow-600' :
                  error ? 'bg-red-500/20 text-red-600' :
                  patientData ? 'bg-green-500/20 text-green-600' :
                  'bg-gray-500/20 text-gray-600'
                }`}>
                  {demoMode ? <Activity className="w-4 h-4" /> :
                    loading ? <WifiOff className="w-4 h-4" /> :
                      error ? <WifiOff className="w-4 h-4" /> :
                        <Wifi className="w-4 h-4" />}
                  <span className="text-sm font-medium">
                    {demoMode ? 'Demo Mode' :
                      loading ? 'Connecting...' :
                        error ? 'Disconnected' :
                          patientData ? 'Connected' : 'No Device'}
                  </span>
                </div>

                {/* Demo Mode Toggle */}
                <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border/50 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={demoMode}
                    onChange={(e) => setDemoMode(e.target.checked)}
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm font-medium">Demo Mode</span>
                </label>

                {/* Theme Toggle */}
                <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)} className="hover:bg-primary/20">
                  {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </Button>

                {/* Manual Controls (real mode) */}
                {!demoMode && patientData && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleBuzzer}
                      className={patientData.buzzerEnabled ? "bg-red-500/20 border-red-500" : ""}
                    >
                      Buzzer: {patientData.buzzerEnabled ? "ON" : "OFF"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleLight}
                      className={patientData.lightState ? "bg-yellow-500/20 border-yellow-500" : ""}
                    >
                      Light: {patientData.lightState ? "ON" : "OFF"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        
  <div className="grid-fade">
    <PatientPanel selectedPatient={selectedPatient} onPatientChange={setSelectedPatient} />
  </div>

        {/* Main Content */}
 <main className="max-w-[2000px] mx-auto px-6 py-8 space-y-8">
  <SystemHeader alerts={alerts} />
  <StatusBar patientData={patientData} demoMode={demoMode} />

  {/* NEW HERO GRAPH */}
  <PulseGraph
    demoMode={demoMode}
    patientId={patientData?.patientId || selectedPatient}
  />


          {error && !demoMode && (
            <div className="bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-lg">
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4" />
                <span>Connection Error: {error}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="ml-auto"
                >
                  Retry
                </Button>
              </div>
              <p className="text-sm mt-2">
                Make sure your ESP32 is running and connected to the same network.
              </p>
            </div>
          )}

          {!demoMode && !patientData && !loading && !error && (
            <div className="bg-blue-500/15 border border-blue-500/50 text-blue-700 px-4 py-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4" />
                <span>Ready to Connect</span>
              </div>
              <p className="text-sm mt-2">
                Switch to Demo Mode or ensure your ESP32 device is connected and the IP address is correct.
              </p>
            </div>
          )}

          <div className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Real-time Sensor Data
                  {patientData && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      Last update: {patientData.timestamp}
                    </span>
                  )}
                </h2>
                <SensorGrid
                  demoMode={demoMode}
                  patientData={patientData}
                  loading={loading}
                />
              </div>

              <div className="glass-effect rounded-xl p-6 space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-secondary" />
                  System Diagnostics
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-2">Connection Status</p>
                    <p className={`text-lg font-bold ${demoMode ? 'text-blue-600' :
                      loading ? 'text-yellow-600' :
                        error ? 'text-red-600' :
                          patientData ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {demoMode ? 'Demo Mode' :
                        loading ? 'Connecting...' :
                          error ? 'Disconnected' :
                            patientData ? 'Connected' : 'Offline'}
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-2">Last Update</p>
                    <p className="text-lg font-bold text-accent">
                      {patientData?.timestamp || 'No data'}
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-2">Room</p>
                    <p className="text-lg font-bold text-secondary">
                      {patientData?.room || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-2">Patient ID</p>
                    <p className="text-lg font-bold text-accent">
                      {patientData?.patientId || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border/50">
                  <h4 className="text-sm font-medium mb-3">Sensor Status</h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className={`px-2 py-1 rounded ${patientData?.flame ? 'bg-red-500/20 text-red-700' : 'bg-green-500/20 text-green-700'}`}>
                      Flame: {patientData?.flame ? 'DETECTED' : 'Safe'}
                    </div>
                    <div className={`px-2 py-1 rounded ${patientData?.motion ? 'bg-yellow-500/20 text-yellow-700' : 'bg-gray-500/20 text-gray-700'}`}>
                      Motion: {patientData?.motion ? 'Active' : 'Inactive'}
                    </div>
                    <div className={`px-2 py-1 rounded ${patientData?.lightState ? 'bg-blue-500/20 text-blue-700' : 'bg-gray-500/20 text-gray-700'}`}>
                      Light: {patientData?.lightState ? 'ON' : 'OFF'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Active Alerts
                  {alerts.length > 0 && (
                    <span className="bg-destructive text-destructive-foreground px-2 py-1 rounded-full text-xs">
                      {alerts.length}
                    </span>
                  )}
                </h2>
                <AlertPanel alerts={alerts} />
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
                <ActivityLog demoMode={demoMode} patientData={patientData} />
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}