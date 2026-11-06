/**
 * Biometric Device Management Service (Frontend / Simulation Layer)
 * 
 * Prepares the Oditech HRMS architecture for upcoming physical LAN hardware
 * integration (ZKTeco, eSSL, Matrix, Mantra) without touching backend payroll
 * or database schemas.
 */

const STORAGE_KEYS = {
  DEVICES: 'oditech_biometric_devices',
  MAPPINGS: 'oditech_biometric_mappings',
  LOGS: 'oditech_biometric_logs',
  SYNC_HISTORY: 'oditech_biometric_sync_history'
};

const DEFAULT_DEVICES = [
  {
    id: 'dev-1',
    name: 'Main Reception K40',
    brand: 'ZKTeco',
    model: 'SilkBio-101TC',
    ip: '192.168.1.201',
    port: 4370,
    connectionType: 'LAN',
    location: 'Main Reception & Front Office',
    status: 'Connected',
    autoSync: true,
    syncInterval: 5,
    lastSync: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    serialNumber: 'ZK-90821-X',
    macAddress: '00:1B:44:11:3A:B7',
    firmware: 'Ver 6.80 Oct 2025',
    totalScans: 4892,
    mappedUsers: 42,
    capacity: { users: 3000, fingerprints: 5000, logs: 100000 }
  },
  {
    id: 'dev-2',
    name: 'Engineering Wing MB160',
    brand: 'eSSL',
    model: 'MB160 Multi-Biometric',
    ip: '192.168.1.202',
    port: 4370,
    connectionType: 'LAN',
    location: '2nd Floor Engineering Wing',
    status: 'Connected',
    autoSync: true,
    syncInterval: 10,
    lastSync: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    serialNumber: 'ES-44120-N',
    macAddress: '00:1B:44:11:4C:E2',
    firmware: 'Ver 4.22 Jan 2025',
    totalScans: 3120,
    mappedUsers: 35,
    capacity: { users: 1500, fingerprints: 3000, logs: 80000 }
  },
  {
    id: 'dev-3',
    name: 'Cafeteria & Lounge COSEC',
    brand: 'Matrix',
    model: 'COSEC DOOR PMM',
    ip: '192.168.1.203',
    port: 5005,
    connectionType: 'LAN',
    location: 'Ground Floor Cafeteria Hub',
    status: 'Disconnected',
    autoSync: false,
    syncInterval: 30,
    lastSync: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    serialNumber: 'MX-78100-D',
    macAddress: '00:1B:44:11:5F:90',
    firmware: 'Ver 5.10 Nov 2024',
    totalScans: 1980,
    mappedUsers: 50,
    capacity: { users: 2000, fingerprints: 4000, logs: 50000 }
  },
  {
    id: 'dev-4',
    name: 'Logistics Bay BioMini',
    brand: 'Mantra',
    model: 'BioMini Plus 2',
    ip: '192.168.1.204',
    port: 4370,
    connectionType: 'LAN',
    location: 'Dispatch & Operations Bay',
    status: 'Connected',
    autoSync: true,
    syncInterval: 15,
    lastSync: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    serialNumber: 'MT-10294-K',
    macAddress: '00:1B:44:11:7A:12',
    firmware: 'Ver 3.90 Dec 2024',
    totalScans: 840,
    mappedUsers: 16,
    capacity: { users: 1000, fingerprints: 2000, logs: 30000 }
  }
];

const DEFAULT_MAPPINGS = [
  {
    id: 'map-1',
    employeeName: 'Manas Kumar Gumansingh',
    employeeCode: 'OG1001',
    department: 'Engineering',
    biometricUserId: '101',
    deviceId: 'dev-1',
    deviceName: 'Main Reception K40',
    status: 'Active',
    enrolledAt: '2026-01-10'
  },
  {
    id: 'map-2',
    employeeName: 'Priya Sharma',
    employeeCode: 'OG1002',
    department: 'Human Resources',
    biometricUserId: '102',
    deviceId: 'dev-1',
    deviceName: 'Main Reception K40',
    status: 'Active',
    enrolledAt: '2026-01-15'
  },
  {
    id: 'map-3',
    employeeName: 'Rahul Verma',
    employeeCode: 'OG1003',
    department: 'Software Development',
    biometricUserId: '201',
    deviceId: 'dev-2',
    deviceName: 'Engineering Wing MB160',
    status: 'Active',
    enrolledAt: '2026-02-01'
  },
  {
    id: 'map-4',
    employeeName: 'Sneha Patel',
    employeeCode: 'OG1004',
    department: 'Quality Assurance',
    biometricUserId: '202',
    deviceId: 'dev-2',
    deviceName: 'Engineering Wing MB160',
    status: 'Active',
    enrolledAt: '2026-02-03'
  },
  {
    id: 'map-5',
    employeeName: 'Amit Saxena',
    employeeCode: 'OG1005',
    department: 'Logistics',
    biometricUserId: '401',
    deviceId: 'dev-4',
    deviceName: 'Logistics Bay BioMini',
    status: 'Active',
    enrolledAt: '2026-03-12'
  },
  {
    id: 'map-6',
    employeeName: 'Ananya Roy',
    employeeCode: 'OG1006',
    department: 'Marketing',
    biometricUserId: '106',
    deviceId: 'dev-1',
    deviceName: 'Main Reception K40',
    status: 'Pending Enrollment',
    enrolledAt: null
  },
  {
    id: 'map-7',
    employeeName: 'Karan Mehra',
    employeeCode: 'OG1007',
    department: 'Operations',
    biometricUserId: '301',
    deviceId: 'dev-3',
    deviceName: 'Cafeteria & Lounge COSEC',
    status: 'Inactive',
    enrolledAt: '2026-01-20'
  }
];

const generateDemoLogs = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  return [
    {
      id: 'log-101',
      employeeName: 'Manas Kumar Gumansingh',
      employeeCode: 'OG1001',
      biometricUserId: '101',
      scanDate: todayStr,
      scanTime: '09:28:14 AM',
      scanType: 'IN',
      verifyMode: 'Fingerprint',
      deviceName: 'Main Reception K40',
      deviceId: 'dev-1',
      syncStatus: 'Synced',
      syncedAt: '09:30:00 AM'
    },
    {
      id: 'log-102',
      employeeName: 'Priya Sharma',
      employeeCode: 'OG1002',
      biometricUserId: '102',
      scanDate: todayStr,
      scanTime: '09:35:42 AM',
      scanType: 'IN',
      verifyMode: 'Fingerprint',
      deviceName: 'Main Reception K40',
      deviceId: 'dev-1',
      syncStatus: 'Synced',
      syncedAt: '09:40:00 AM'
    },
    {
      id: 'log-103',
      employeeName: 'Rahul Verma',
      employeeCode: 'OG1003',
      biometricUserId: '201',
      scanDate: todayStr,
      scanTime: '09:42:10 AM',
      scanType: 'IN',
      verifyMode: 'Face Recognition',
      deviceName: 'Engineering Wing MB160',
      deviceId: 'dev-2',
      syncStatus: 'Synced',
      syncedAt: '09:45:00 AM'
    },
    {
      id: 'log-104',
      employeeName: 'Rahul Verma',
      employeeCode: 'OG1003',
      biometricUserId: '201',
      scanDate: todayStr,
      scanTime: '09:42:15 AM',
      scanType: 'IN',
      verifyMode: 'Face Recognition',
      deviceName: 'Engineering Wing MB160',
      deviceId: 'dev-2',
      syncStatus: 'Duplicate',
      duplicateReason: 'Duplicate scan within 15 seconds ignored',
      syncedAt: '09:45:00 AM'
    },
    {
      id: 'log-105',
      employeeName: 'Sneha Patel',
      employeeCode: 'OG1004',
      biometricUserId: '202',
      scanDate: todayStr,
      scanTime: '09:50:04 AM',
      scanType: 'IN',
      verifyMode: 'Fingerprint',
      deviceName: 'Engineering Wing MB160',
      deviceId: 'dev-2',
      syncStatus: 'Synced',
      syncedAt: '10:00:00 AM'
    },
    {
      id: 'log-106',
      employeeName: 'Unknown Visitor / Unregistered',
      employeeCode: 'N/A',
      biometricUserId: '999',
      scanDate: todayStr,
      scanTime: '10:04:18 AM',
      scanType: 'Unknown',
      verifyMode: 'RFID Card',
      deviceName: 'Main Reception K40',
      deviceId: 'dev-1',
      syncStatus: 'Failed',
      failureReason: 'User ID 999 not mapped to any active HRMS employee',
      syncedAt: null
    },
    {
      id: 'log-107',
      employeeName: 'Amit Saxena',
      employeeCode: 'OG1005',
      biometricUserId: '401',
      scanDate: todayStr,
      scanTime: '10:15:22 AM',
      scanType: 'IN',
      verifyMode: 'Fingerprint',
      deviceName: 'Logistics Bay BioMini',
      deviceId: 'dev-4',
      syncStatus: 'Synced',
      syncedAt: '10:30:00 AM'
    },
    {
      id: 'log-108',
      employeeName: 'Manas Kumar Gumansingh',
      employeeCode: 'OG1001',
      biometricUserId: '101',
      scanDate: yesterdayStr,
      scanTime: '06:45:30 PM',
      scanType: 'OUT',
      verifyMode: 'Fingerprint',
      deviceName: 'Main Reception K40',
      deviceId: 'dev-1',
      syncStatus: 'Synced',
      syncedAt: '06:50:00 PM'
    },
    {
      id: 'log-109',
      employeeName: 'Priya Sharma',
      employeeCode: 'OG1002',
      biometricUserId: '102',
      scanDate: yesterdayStr,
      scanTime: '06:30:11 PM',
      scanType: 'OUT',
      verifyMode: 'Fingerprint',
      deviceName: 'Main Reception K40',
      deviceId: 'dev-1',
      syncStatus: 'Synced',
      syncedAt: '06:35:00 PM'
    },
    {
      id: 'log-110',
      employeeName: 'Sneha Patel',
      employeeCode: 'OG1004',
      biometricUserId: '202',
      scanDate: yesterdayStr,
      scanTime: '07:12:44 PM',
      scanType: 'OUT',
      verifyMode: 'Fingerprint',
      deviceName: 'Engineering Wing MB160',
      deviceId: 'dev-2',
      syncStatus: 'Synced',
      syncedAt: '07:15:00 PM'
    }
  ];
};

const DEFAULT_SYNC_HISTORY = [
  {
    id: 'sync-101',
    timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    deviceName: 'Main Reception K40',
    deviceId: 'dev-1',
    recordsFetched: 12,
    recordsSynced: 11,
    recordsFailed: 1,
    recordsDuplicate: 0,
    recordsPending: 0,
    triggeredBy: 'Auto Daemon',
    status: 'Partial',
    errorDetails: '1 record skipped: User ID 999 unmapped in HRMS database'
  },
  {
    id: 'sync-102',
    timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    deviceName: 'Engineering Wing MB160',
    deviceId: 'dev-2',
    recordsFetched: 18,
    recordsSynced: 17,
    recordsFailed: 0,
    recordsDuplicate: 1,
    recordsPending: 0,
    triggeredBy: 'Auto Daemon',
    status: 'Success',
    errorDetails: null
  },
  {
    id: 'sync-103',
    timestamp: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    deviceName: 'All Devices (Batch)',
    deviceId: 'all',
    recordsFetched: 45,
    recordsSynced: 43,
    recordsFailed: 1,
    recordsDuplicate: 1,
    recordsPending: 0,
    triggeredBy: 'Manual (Admin)',
    status: 'Success',
    errorDetails: null
  },
  {
    id: 'sync-104',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    deviceName: 'Cafeteria & Lounge COSEC',
    deviceId: 'dev-3',
    recordsFetched: 0,
    recordsSynced: 0,
    recordsFailed: 1,
    recordsDuplicate: 0,
    recordsPending: 0,
    triggeredBy: 'Scheduled Sync',
    status: 'Failed',
    errorDetails: 'TCP Socket Timeout: Host 192.168.1.203:5005 unreachable on subnet'
  }
];

class BiometricService {
  constructor() {
    this._initStorage();
  }

  _initStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.DEVICES)) {
      localStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(DEFAULT_DEVICES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MAPPINGS)) {
      localStorage.setItem(STORAGE_KEYS.MAPPINGS, JSON.stringify(DEFAULT_MAPPINGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LOGS)) {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(generateDemoLogs()));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SYNC_HISTORY)) {
      localStorage.setItem(STORAGE_KEYS.SYNC_HISTORY, JSON.stringify(DEFAULT_SYNC_HISTORY));
    }
  }

  // --- Devices ---
  getDevices() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DEVICES);
      return data ? JSON.parse(data) : DEFAULT_DEVICES;
    } catch {
      return DEFAULT_DEVICES;
    }
  }

  getDeviceById(id) {
    const devices = this.getDevices();
    return devices.find(d => d.id === id) || null;
  }

  saveDevice(deviceData) {
    const devices = this.getDevices();
    if (deviceData.id) {
      // Edit
      const index = devices.findIndex(d => d.id === deviceData.id);
      if (index !== -1) {
        devices[index] = { ...devices[index], ...deviceData };
      } else {
        devices.push(deviceData);
      }
    } else {
      // Create new
      const newDevice = {
        ...deviceData,
        id: `dev-${Date.now()}`,
        status: 'Connected',
        lastSync: 'Just now',
        totalScans: 0,
        mappedUsers: 0,
        serialNumber: `SN-${Math.floor(10000 + Math.random() * 90000)}`,
        macAddress: `00:1B:44:${Math.floor(10 + Math.random() * 89)}:${Math.floor(10 + Math.random() * 89)}:${Math.floor(10 + Math.random() * 89)}`,
        firmware: 'Ver 1.0.0 (Demo)',
        capacity: { users: 2000, fingerprints: 4000, logs: 50000 }
      };
      devices.push(newDevice);
    }
    localStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(devices));
    return devices;
  }

  deleteDevice(id) {
    const devices = this.getDevices().filter(d => d.id !== id);
    localStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(devices));
    return devices;
  }

  async toggleDeviceConnection(id) {
    const devices = this.getDevices();
    const dev = devices.find(d => d.id === id);
    if (!dev) throw new Error('Device not found');

    if (dev.status === 'Connected') {
      dev.status = 'Disconnected';
      localStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(devices));
      return { success: true, device: dev, message: `Device "${dev.name}" disconnected.` };
    } else {
      // Test handshake before connecting
      const test = await this.testConnection(dev);
      if (!test.success) {
        throw new Error(test.message || 'Connection failed: Device unreachable on port.');
      }
      dev.status = 'Connected';
      dev.lastSync = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(devices));
      return { success: true, device: dev, message: `Device "${dev.name}" connected successfully via LAN socket.` };
    }
  }

  // --- Hardware Connection Test Simulator ---
  async testConnection(device) {
    // Simulated network ping & TCP handshake on port
    return new Promise((resolve) => {
      setTimeout(() => {
        if (!device.ip || device.ip === '0.0.0.0' || device.ip.endsWith('.999')) {
          resolve({
            success: false,
            demoMode: true,
            status: 'Disconnected',
            message: `Connection failed: Host ${device.ip || 'empty'} unreachable on port ${device.port || 4370}. Socket connection timed out.`
          });
        } else {
          const latency = Math.floor(12 + Math.random() * 25);
          resolve({
            success: true,
            demoMode: true,
            status: 'Connected',
            latency: `${latency} ms`,
            firmware: device.firmware || 'Ver 6.80 Oct 2025',
            serialNumber: device.serialNumber || 'ZK-90821-X',
            message: `[DEMO MODE] Handshake acknowledged on ${device.ip}:${device.port}. Biometric protocol TCP/IP socket verified.`
          });
        }
      }, 700);
    });
  }

  // --- Employee Mappings ---
  getMappings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MAPPINGS);
      return data ? JSON.parse(data) : DEFAULT_MAPPINGS;
    } catch {
      return DEFAULT_MAPPINGS;
    }
  }

  saveMapping(mappingData) {
    const mappings = this.getMappings();
    
    // Prevent duplicate device-user mapping check
    const existingDuplicate = mappings.find(m => 
      m.id !== mappingData.id &&
      m.deviceId === mappingData.deviceId &&
      m.biometricUserId.toString().trim() === mappingData.biometricUserId.toString().trim()
    );

    if (existingDuplicate) {
      throw new Error(`Device User ID "${mappingData.biometricUserId}" is already assigned to "${existingDuplicate.employeeName}" on device "${mappingData.deviceName}". Duplicate mappings are forbidden.`);
    }

    if (mappingData.id) {
      const idx = mappings.findIndex(m => m.id === mappingData.id);
      if (idx !== -1) {
        mappings[idx] = { ...mappings[idx], ...mappingData };
      } else {
        mappings.push(mappingData);
      }
    } else {
      const newMap = {
        ...mappingData,
        id: `map-${Date.now()}`,
        status: mappingData.status || 'Active',
        enrolledAt: new Date().toISOString().split('T')[0]
      };
      mappings.push(newMap);
    }

    localStorage.setItem(STORAGE_KEYS.MAPPINGS, JSON.stringify(mappings));
    this._recomputeDeviceMappedCounts();
    return mappings;
  }

  deleteMapping(id) {
    const mappings = this.getMappings().filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MAPPINGS, JSON.stringify(mappings));
    this._recomputeDeviceMappedCounts();
    return mappings;
  }

  _recomputeDeviceMappedCounts() {
    const mappings = this.getMappings();
    const devices = this.getDevices();
    const counts = {};
    mappings.forEach(m => {
      counts[m.deviceId] = (counts[m.deviceId] || 0) + 1;
    });
    const updatedDevices = devices.map(d => ({
      ...d,
      mappedUsers: counts[d.id] || 0
    }));
    localStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(updatedDevices));
  }

  // --- Attendance Logs ---
  getAttendanceLogs() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LOGS);
      return data ? JSON.parse(data) : generateDemoLogs();
    } catch {
      return generateDemoLogs();
    }
  }

  exportLogsToCSV(logs) {
    if (!logs || !logs.length) return;
    const headers = [
      'Scan Date',
      'Scan Time',
      'Employee Name',
      'Employee Code',
      'Biometric User ID',
      'Scan Type',
      'Verify Mode',
      'Device Name',
      'Sync Status'
    ];

    const rows = logs.map(l => [
      `"${l.scanDate || ''}"`,
      `"${l.scanTime || ''}"`,
      `"${l.employeeName || ''}"`,
      `"${l.employeeCode || ''}"`,
      `"${l.biometricUserId || ''}"`,
      `"${l.scanType || ''}"`,
      `"${l.verifyMode || ''}"`,
      `"${l.deviceName || ''}"`,
      `"${l.syncStatus || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `oditech_biometric_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- Live Scan Simulation ---
  recordLiveScan({ deviceId, biometricUserId, scanType = 'IN', verifyMode = 'Fingerprint' }) {
    const devices = this.getDevices();
    const device = devices.find(d => d.id === deviceId);
    if (!device) throw new Error('Device not found');
    if (device.status !== 'Connected') {
      throw new Error(`Device "${device.name}" is Disconnected. Please connect the device first before punching.`);
    }

    const mappings = this.getMappings();
    let emp = mappings.find(m => m.deviceId === deviceId && m.biometricUserId.toString() === biometricUserId?.toString());
    if (!emp && biometricUserId) {
      emp = mappings.find(m => m.biometricUserId.toString() === biometricUserId?.toString());
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    const logs = this.getAttendanceLogs();

    const newLog = {
      id: `log-${Date.now()}`,
      employeeName: emp ? emp.employeeName : 'Biometric User',
      employeeCode: emp ? emp.employeeCode : 'OG1001',
      biometricUserId: biometricUserId || (emp ? emp.biometricUserId : '101'),
      scanDate: todayStr,
      scanTime: timeStr,
      scanType: scanType || 'IN',
      verifyMode: verifyMode || 'Fingerprint',
      deviceName: device.name,
      deviceId: device.id,
      syncStatus: 'Synced',
      syncedAt: timeStr
    };

    logs.unshift(newLog);
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));

    // Update device stats
    device.totalScans = (device.totalScans || 0) + 1;
    device.lastSync = now.toISOString();
    this.saveDevice(device);

    return newLog;
  }

  // --- Sync History & Simulated Sync ---
  getSyncHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SYNC_HISTORY);
      return data ? JSON.parse(data) : DEFAULT_SYNC_HISTORY;
    } catch {
      return DEFAULT_SYNC_HISTORY;
    }
  }

  async triggerSync(deviceId = 'all') {
    return new Promise((resolve) => {
      setTimeout(() => {
        const devices = this.getDevices();
        const mappings = this.getMappings();
        const logs = this.getAttendanceLogs();
        const history = this.getSyncHistory();

        if (deviceId !== 'all') {
          const target = devices.find(d => d.id === deviceId);
          if (!target) {
            resolve({ success: false, message: 'Device not found' });
            return;
          }
          if (target.status !== 'Connected') {
            const failedRecord = {
              id: `sync-${Date.now()}`,
              timestamp: new Date().toISOString(),
              deviceName: target.name,
              deviceId: target.id,
              recordsFetched: 0,
              recordsSynced: 0,
              recordsFailed: 1,
              recordsDuplicate: 0,
              recordsPending: 0,
              triggeredBy: 'Manual (Admin)',
              status: 'Failed',
              errorDetails: `Device unreachable: ${target.name} (${target.ip}:${target.port}) is offline/disconnected.`
            };
            history.unshift(failedRecord);
            localStorage.setItem(STORAGE_KEYS.SYNC_HISTORY, JSON.stringify(history));
            resolve({
              success: false,
              summary: failedRecord,
              message: `Synchronization failed: Device "${target.name}" is Disconnected. Please connect the device first.`
            });
            return;
          }
        }

        const connectedDevices = deviceId === 'all'
          ? devices.filter(d => d.status === 'Connected')
          : devices.filter(d => d.id === deviceId && d.status === 'Connected');

        if (connectedDevices.length === 0) {
          resolve({
            success: false,
            message: 'No connected devices found to synchronize. Please connect devices first.'
          });
          return;
        }

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        const newLogsGenerated = [];

        connectedDevices.forEach(dev => {
          const devMappings = mappings.filter(m => m.deviceId === dev.id && m.status === 'Active');
          const pool = devMappings.length > 0 ? devMappings : mappings;
          const count = Math.min(pool.length, Math.floor(1 + Math.random() * 3));
          
          for (let i = 0; i < count; i++) {
            const emp = pool[i % pool.length];
            const scanType = Math.random() > 0.4 ? 'IN' : 'OUT';
            const newEntry = {
              id: `log-${Date.now()}-${dev.id}-${i}`,
              employeeName: emp.employeeName,
              employeeCode: emp.employeeCode,
              biometricUserId: emp.biometricUserId,
              scanDate: todayStr,
              scanTime: timeStr,
              scanType: scanType,
              verifyMode: dev.brand === 'eSSL' ? 'Face Recognition' : 'Fingerprint',
              deviceName: dev.name,
              deviceId: dev.id,
              syncStatus: 'Synced',
              syncedAt: timeStr
            };
            newLogsGenerated.push(newEntry);
          }

          dev.lastSync = now.toISOString();
          dev.totalScans = (dev.totalScans || 0) + count;
        });

        // Prepend new attendance logs to storage so Attendance Logs tab updates in real-time
        const updatedLogs = [...newLogsGenerated, ...logs];
        localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(updatedLogs));

        // Update devices
        localStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(devices));

        // Save sync history record
        const targetName = deviceId === 'all' ? 'All Connected Devices (LAN Sweep)' : connectedDevices[0].name;
        const newSyncRecord = {
          id: `sync-${Date.now()}`,
          timestamp: now.toISOString(),
          deviceName: targetName,
          deviceId: deviceId,
          recordsFetched: newLogsGenerated.length + 1,
          recordsSynced: newLogsGenerated.length,
          recordsFailed: 0,
          recordsDuplicate: 1,
          recordsPending: 0,
          triggeredBy: 'Manual (Admin)',
          status: 'Success',
          errorDetails: null
        };
        history.unshift(newSyncRecord);
        localStorage.setItem(STORAGE_KEYS.SYNC_HISTORY, JSON.stringify(history));

        resolve({
          success: true,
          demoMode: true,
          summary: newSyncRecord,
          newRecordsCount: newLogsGenerated.length,
          message: `[DEMO MODE] Successfully synchronized ${newLogsGenerated.length} new punch logs from ${targetName}!`
        });
      }, 1000);
    });
  }

  // --- Aggregate Stats ---
  getStats() {
    const devices = this.getDevices();
    const mappings = this.getMappings();
    const syncHistory = this.getSyncHistory();

    const totalDevices = devices.length;
    const connectedDevices = devices.filter(d => d.status === 'Connected').length;
    const disconnectedDevices = devices.filter(d => d.status !== 'Connected').length;
    const totalMapped = mappings.filter(m => m.status === 'Active').length;

    let successfulSyncs = 0;
    let failedSyncs = 0;
    syncHistory.forEach(s => {
      if (s.status === 'Success') successfulSyncs++;
      else if (s.status === 'Failed') failedSyncs++;
    });

    const lastSyncEntry = syncHistory[0] || null;

    return {
      totalDevices,
      connectedDevices,
      disconnectedDevices,
      totalMapped,
      successfulSyncs,
      failedSyncs,
      lastSyncTime: lastSyncEntry ? lastSyncEntry.timestamp : null
    };
  }
}

export const biometricService = new BiometricService();
export default biometricService;
