import React, { useState, useEffect, useCallback, useRef } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { 
  Users, Clock, Filter, Download, Search, ChevronLeft, ChevronRight, 
  Eye, Calendar,
  Briefcase, FileText, PieChart, TrendingUp, Star, Info, Send,
  FileSpreadsheet, ExternalLink, AlertCircle, RefreshCw, CheckCircle2, LayoutGrid, Layers
} from 'lucide-react';
import { 
  PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip 
} from 'recharts';
import * as XLSX from 'xlsx';
import { io } from 'socket.io-client';
import api from '../services/api';
import CustomDropdown from '../components/CustomDropdown';
import EmployeeSchedule from './EmployeeSchedule';

const SOCKET_URL = (import.meta.env.VITE_API_BASE_URL || 'https://oditech-hrms-backend-2.onrender.com/api').replace('/api', '');

const COLORS = ['#3b82f6', '#10b981', '#a855f7', '#f43f5e', '#f59e0b', '#64748b'];

const StatCard = ({ icon, label, value, subValue, colorClass }) => (
  <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-5 transition-all hover:shadow-md">
    <div className={`w-14 h-14 ${colorClass} rounded-2xl flex items-center justify-center shadow-sm`}>
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <h3 className="text-2xl font-black text-[#1e293b]">{value}</h3>
      <p className="text-[10px] font-bold text-slate-400">{subValue}</p>
    </div>
  </div>
);

const DEPARTMENTS_WORK_SHEETS = [
  { 
    id: 'Engineering', 
    name: 'Developer Team (Engineering)', 
    members: 'Manas, Debraj, Anmol, Shreya...', 
    defaultUrl: 'https://docs.google.com/spreadsheets/d/1sIlWWsipPxOrCQENj2E_EHI7XW2HD9S2n8xfaPVuzNs/edit?pli=1&gid=577942890#gid=577942890',
    icon: '🛠️'
  },
  { 
    id: 'Marketing', 
    name: 'Marketing Team', 
    members: 'Smruti, Amit, Sanghamitra...', 
    defaultUrl: 'https://docs.google.com/spreadsheets/d/1PF386DYQWbUHKuIeIixclNnG1hil4TzO/edit?gid=2082445647#gid=2082445647',
    icon: '📢'
  },
  { 
    id: 'Design', 
    name: 'Design Team', 
    members: 'Debashish, Rashmi, Subas, Mrinal...', 
    defaultUrl: 'https://docs.google.com/spreadsheets/d/1Hz-gYswAHVRhXEhQbJrJdC4Fo9xE8P0TCNNLsW_IZK4/edit?gid=0#gid=0',
    icon: '🎨'
  },
  { 
    id: 'Sales', 
    name: 'Sales Team', 
    members: 'Business Development Team', 
    defaultUrl: '',
    icon: '💼'
  },
  { 
    id: 'Human Resources', 
    name: 'Human Resources', 
    members: 'Operations & People Team', 
    defaultUrl: 'https://docs.google.com/spreadsheets/d/1t8ERkUfun8dzpoaaoh4vbmYt9-zDO1Ib0gA_DNvTXxA/edit?gid=0#gid=0',
    icon: '👥'
  },
  { 
    id: 'Management', 
    name: 'Management Team', 
    members: 'Jasmin Jena & Leadership...', 
    defaultUrl: 'https://docs.google.com/spreadsheets/d/1aOw1-8I2b99X3ILj_1rOrqFf1ntFOL7U19BZ3m-KVTI/edit?gid=882523443#gid=882523443',
    icon: '⚙️'
  }
];

const AdminReports = () => {
  const [activeViewTab, setActiveViewTab] = useState('hourly'); // 'hourly' | 'sheets'
  const [selectedDept, setSelectedDept] = useState('Engineering');
  const [departmentSheets, setDepartmentSheets] = useState({});
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [allReports, setAllReports] = useState([]);
  const sentinelRef = useRef(null);
  const PAGE_SIZE = 10;
  const [data, setData] = useState({
    stats: { totalEmployees: 0, totalHoursToday: '0h 0m', averageHours: '0h 0m', totalOvertimeToday: '0h 0m' },
    reports: [],
    totalEntries: 0,
    summary: [],
    statusCounts: { Completed: 0, Pending: 0, NotSubmitted: 0 }
  });

  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    department: 'All Departments',
    employeeId: 'All Employees',
    status: 'Completed',
  });

  const [search, setSearch] = useState('');
  const [selectedTasks, setSelectedTasks] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = useState(null);
  const [currentReportStatus, setCurrentReportStatus] = useState(null);
  const [currentWorkDate, setCurrentWorkDate] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);
  const [departments, setDepartments] = useState(['All Departments', 'Digital Marketing', 'Web Development', 'SEO', 'HR', 'Others']);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedDeptCard, setSelectedDeptCard] = useState('All');
  const [selectedEmployeeCard, setSelectedEmployeeCard] = useState(null);
  const [employeeCardSearch, setEmployeeCardSearch] = useState('');

  const getDepartmentCardsList = () => {
    const standardDepts = [
      { id: 'All', name: 'All Departments', icon: '🏢' },
      { id: 'Engineering', name: 'Developer Team', icon: '🛠️' },
      { id: 'Design', name: 'Design Team', icon: '🎨' },
      { id: 'Marketing', name: 'Marketing Team', icon: '📢' },
      { id: 'Management', name: 'Management Team', icon: '⚙️' },
      { id: 'Human Resources', name: 'Human Resources', icon: '👥' },
      { id: 'Sales', name: 'Sales Team', icon: '💼' }
    ];

    const extraDepts = [];
    employees.forEach(e => {
      const d = (e.department || '').trim();
      if (!d) return;
      const lower = d.toLowerCase();
      const isCovered = ['engineering', 'developer', 'development', 'software', 'tech', 'web development', 'manage', 'human', 'hr', 'design', 'marketing', 'sale'].some(k => lower.includes(k));
      if (!isCovered && !extraDepts.some(x => x.toLowerCase() === lower)) {
        extraDepts.push(d);
      }
    });

    const allDeptsList = [
      ...standardDepts,
      ...extraDepts.map(d => ({ id: d, name: d, icon: '📁' }))
    ];

    return allDeptsList.map(dept => {
      let count = 0;
      if (dept.id === 'All') {
        count = employees.length;
      } else {
        count = employees.filter(e => {
          const eDept = (e.department || '').toLowerCase();
          const target = dept.id.toLowerCase();
          if (target === 'engineering') {
            return ['engineering', 'developer', 'development', 'software', 'tech', 'web development'].some(k => eDept.includes(k));
          }
          if (target === 'management') {
            return eDept.includes('manage') || /jasmin/i.test(e.fullName || '');
          }
          if (target === 'human resources') {
            return /human\s*resource|hr\b/i.test(eDept);
          }
          if (target === 'design') {
            return eDept.includes('design') || /debashish|rashmi|mrinal|subas|suchismita/i.test(e.fullName || '');
          }
          if (target === 'marketing') {
            return eDept.includes('marketing') || /smruti|amit/i.test(e.fullName || '');
          }
          return eDept.includes(target) || eDept === target;
        }).length;
      }
      return { ...dept, count };
    });
  };

  const getFilteredEmployees = () => {
    return employees.filter(e => {
      let matchesDept = true;
      if (selectedDeptCard !== 'All') {
        const eDept = (e.department || '').toLowerCase();
        const target = selectedDeptCard.toLowerCase();
        if (target === 'engineering') {
          matchesDept = ['engineering', 'developer', 'development', 'software', 'tech', 'web development'].some(k => eDept.includes(k));
        } else if (target === 'management') {
          matchesDept = eDept.includes('manage') || /jasmin/i.test(e.fullName || '');
        } else if (target === 'human resources') {
          matchesDept = /human\s*resource|hr\b/i.test(eDept);
        } else if (target === 'design') {
          matchesDept = eDept.includes('design') || /debashish|rashmi|mrinal|subas|suchismita/i.test(e.fullName || '');
        } else if (target === 'marketing') {
          matchesDept = eDept.includes('marketing') || /smruti|amit/i.test(e.fullName || '');
        } else {
          matchesDept = eDept.includes(target) || eDept === target;
        }
      }

      const q = employeeCardSearch.toLowerCase().trim();
      const matchesSearch = !q ||
        e.fullName?.toLowerCase().includes(q) ||
        e.empCode?.toLowerCase().includes(q) ||
        e.department?.toLowerCase().includes(q) ||
        e.designation?.toLowerCase().includes(q);

      return matchesDept && matchesSearch;
    });
  };

  // HRMS Matrix View State & Batch Sync
  const [matrixDate, setMatrixDate] = useState(new Date().toISOString().split('T')[0]);
  const [matrixDept, setMatrixDept] = useState('All Departments');
  const [matrixSearch, setMatrixSearch] = useState('');
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [syncingAllSheets, setSyncingAllSheets] = useState(false);
  const [matrixData, setMatrixData] = useState({
    slots: [
      '09:30 - 10:30',
      '10:30 - 11:30',
      '11:30 - 12:30',
      '12:30 - 01:30',
      '01:30 - 02:30',
      '02:30 - 03:30',
      '03:00 - 04:00',
      '04:00 - 04:50',
      '05:00 - 06:30'
    ],
    matrix: [],
    totalEmployees: 0,
    employeesWithTasksCount: 0,
    totalTasksToday: 0
  });

  const fetchMatrixData = useCallback(async (date = matrixDate, dept = matrixDept, q = matrixSearch) => {
    setLoadingMatrix(true);
    try {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (dept && dept !== 'All Departments') params.append('department', dept);
      if (q) params.append('search', q);
      const res = await api.get(`/timesheets/today-matrix?${params.toString()}`);
      if (res.data?.success) {
        setMatrixData(res.data);
      }
    } catch (err) {
      console.error('Error fetching today work matrix:', err);
    } finally {
      setLoadingMatrix(false);
    }
  }, [matrixDate, matrixDept, matrixSearch]);

  const handleSyncAllDepartments = async () => {
    if (syncingAllSheets) return;
    setSyncingAllSheets(true);
    try {
      const res = await api.post('/timesheets/sync-all-departments', {
        date: matrixDate || new Date().toISOString().split('T')[0]
      });
      if (res.data?.success) {
        alert(`✅ ${res.data.message}\nTotal Tasks Synced into HRMS: ${res.data.totalSyncedTasks}`);
        fetchMatrixData(matrixDate, matrixDept, matrixSearch);
        fetchReports();
      } else {
        alert(res.data?.message || 'Sync completed with warnings.');
      }
    } catch (err) {
      console.error('Error syncing all department sheets:', err);
      alert(err.response?.data?.message || 'Failed to sync department sheets');
    } finally {
      setSyncingAllSheets(false);
    }
  };

  const handleDownloadMatrixExcel = () => {
    if (!matrixData.matrix || matrixData.matrix.length === 0) {
      alert('No matrix data available to download');
      return;
    }

    const headers = [
      '#',
      'Employee Name',
      'Employee ID',
      'Department',
      'Date',
      ...matrixData.slots,
      'Tasks Count',
      'Daily Remarks',
      'Timesheet Status'
    ];

    const rows = matrixData.matrix.map((row, idx) => [
      idx + 1,
      row.fullName,
      row.empCode,
      row.department,
      row.date,
      ...matrixData.slots.map(s => row.slots?.[s] || ''),
      row.taskCount,
      row.dailyRemarks || '',
      row.status
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 14 },
      { wch: 18 },
      { wch: 12 },
      ...matrixData.slots.map(() => ({ wch: 28 })),
      { wch: 12 },
      { wch: 30 },
      { wch: 14 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'HRMS_Daily_Matrix');
    XLSX.writeFile(wb, `HRMS_Daily_Worksheet_Matrix_${matrixDate}.xlsx`);
  };

  // Payroll Excel Export Modal
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [payrollExporting, setPayrollExporting] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const currentDate = new Date();
  const [payrollExportMonth, setPayrollExportMonth] = useState(currentDate.getMonth() + 1);
  const [payrollExportYear, setPayrollExportYear] = useState(currentDate.getFullYear());
  const fetchDepartments = async () => {
    try {
      const res = await api.get('/admin/employees');
      if (res.data.success && Array.isArray(res.data.employees)) {
        const empList = res.data.employees;
        setEmployees(empList);
        const uniqueDepts = [...new Set(empList.map(e => e.department).filter(Boolean))];
        setDepartments(['All Departments', ...uniqueDepts]);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    setCurrentPage(1);
    setHasMore(true);
    try {
      const params = new URLSearchParams(filters);
      if (search) params.append('search', search);
      const res = await api.get(`/admin/reports/hourly?${params.toString()}`);
      if (res.data.success) {
        const validReports = res.data.reports.filter(r => r.employeeId && r.employeeId.fullName);
        setAllReports(validReports);
        const firstSlice = validReports.slice(0, PAGE_SIZE);
        setHasMore(validReports.length > PAGE_SIZE);
        setData({
          ...res.data,
          reports: firstSlice,
          totalEntries: validReports.length
        });

        // Also merge employees from reports so no staff is ever missed
        setEmployees(prev => {
          const map = new Map();
          (prev || []).forEach(e => { if (e && e._id) map.set(e._id, e); });
          validReports.forEach(r => {
            if (r.employeeId && r.employeeId._id && !map.has(r.employeeId._id)) {
              map.set(r.employeeId._id, r.employeeId);
            }
          });
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreReports = useCallback(() => {
    if (isFetchingMore || !hasMore) return;
    setIsFetchingMore(true);
    setTimeout(() => {
      const nextPage = currentPage + 1;
      const nextSlice = allReports.slice(0, nextPage * PAGE_SIZE);
      const stillHasMore = nextSlice.length < allReports.length;
      setCurrentPage(nextPage);
      setHasMore(stillHasMore);
      setData(prev => ({ ...prev, reports: nextSlice }));
      setIsFetchingMore(false);
    }, 400);
  }, [isFetchingMore, hasMore, currentPage, allReports]);

  const fetchEmployeeTasks = async (employeeId, date, workStatus) => {
    setModalLoading(true);
    setIsModalOpen(true);
    setCurrentEmployeeId(employeeId);
    setCurrentReportStatus(workStatus);
    setCurrentWorkDate(date);
    setRating(0);
    setHoverRating(0);
    setFeedback('');
    try {
      const res = await api.get(`/employee/tasks/${employeeId}/${date}`);
      if (res.data.success) {
        setSelectedTasks(res.data.tasks);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleRatingSubmit = async () => {
    if (rating === 0) {
      alert('Please select a rating first');
      return;
    }
    setRatingLoading(true);
    try {
      const res = await api.post(`/performance/ratings`, {
        employeeId: currentEmployeeId,
        workDate: currentWorkDate,
        rating,
        feedback,
        adminId: null // Handled backend or null for now
      });
      alert('Rating submitted successfully!');
      setIsModalOpen(false);
      
      // Remove the rated item from the table
      setData(prev => ({
        ...prev,
        reports: prev.reports.filter(r => !(r.employeeId?._id === currentEmployeeId && r.date === currentWorkDate))
      }));
    } catch (err) {
      console.error('Error submitting rating:', err);
      alert('Failed to submit rating');
    } finally {
      setRatingLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data?.success) {
        setDepartmentSheets(res.data.settings || {});
      }
    } catch (err) {
      console.error('Error fetching settings for sheets:', err);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchSettings();
  }, []);

  const getSelectedSheet = () => {
    const deptInfo = DEPARTMENTS_WORK_SHEETS.find(d => d.id === selectedDept) || DEPARTMENTS_WORK_SHEETS[0];
    const key = `sheet_url_${deptInfo.id}`;
    const url = departmentSheets[key]?.trim() || deptInfo.defaultUrl;

    let embedUrl = url;
    if (url && url.includes('docs.google.com/spreadsheets')) {
      embedUrl = url.replace('/edit', '/edit?rm=minimal');
      if (!embedUrl.includes('rm=minimal')) {
        embedUrl += embedUrl.includes('?') ? '&rm=minimal' : '?rm=minimal';
      }
    }

    return {
      ...deptInfo,
      url,
      embedUrl,
      hasSheet: !!url
    };
  };

  const activeSheet = getSelectedSheet();

  useEffect(() => {
    fetchReports();
  }, [filters.date, filters.department, filters.employeeId, filters.status, search]);

  // Real-time socket listener for employee report updates
  useEffect(() => {
    let socket;
    try {
      socket = io(SOCKET_URL);
      const handleTimesheetEvent = () => {
        fetchReports();
        fetchDepartments();
      };
      socket.on('timesheetUpdated', handleTimesheetEvent);
      socket.on('timesheetSubmitted', handleTimesheetEvent);
    } catch (err) {
      console.error('Socket connection error in AdminReports:', err);
    }
    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (activeViewTab === 'matrix') {
      fetchMatrixData(matrixDate, matrixDept, matrixSearch);
    }
  }, [activeViewTab, matrixDate, matrixDept, matrixSearch, fetchMatrixData]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMoreReports(); },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMoreReports]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const resetFilters = () => {
    setFilters({
      date: new Date().toISOString().split('T')[0],
      department: 'All Departments',
      employeeId: 'All Employees',
      status: 'Completed',
      page: 1
    });
    setSearch('');
  };


  const handleDownloadExcel = () => {
    if (data.reports.length === 0) {
      alert('No data available to download');
      return;
    }

    const headers = ['#', 'Employee Name', 'Employee ID', 'Department', 'Date', 'Total Hours', 'Overtime', 'Status'];
    const rows = data.reports.map((r, i) => [
      i + 1,
      r.employeeId?.fullName,
      r.employeeId?.empCode,
      r.employeeId?.department,
      r.date,
      r.workHours,
      r.overtime,
      r.workStatus
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Hourly_Report_${filters.date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEmailExcel = async () => {
    setEmailSending(true);
    try {
      const params = new URLSearchParams(filters);
      if (search) params.append('search', search);
      
      const res = await api.get(`/admin/reports/hourly/email/excel?${params.toString()}`);
      if (res.data.success) {
        alert('Excel report sent to email successfully!');
      } else {
        alert(res.data.message || 'Failed to send email.');
      }
    } catch (err) {
      console.error('Email excel error:', err);
      alert('Error sending email. Please try again.');
    } finally {
      setEmailSending(false);
    }
  };

  const MONTH_NAMES = [
    '', 'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  const handlePayrollExcelExport = async () => {
    setPayrollExporting(true);
    try {
      const res = await api.get(`/payroll/attendance-summary-all/${payrollExportMonth}/${payrollExportYear}`);
      if (!res.data.success) { alert('Failed to fetch payroll data.'); return; }

      const { periodStart, periodEnd, data: summaries } = res.data;
      // periodStart: "YYYY-MM-21", periodEnd: "YYYY-MM-20"
      const startLabel = periodStart; // e.g. 2026-06-21
      const endLabel   = periodEnd;   // e.g. 2026-07-20

      const prevMonthNum = payrollExportMonth === 1 ? 12 : payrollExportMonth - 1;
      const prevYear = payrollExportMonth === 1 ? payrollExportYear - 1 : payrollExportYear;
      const titleStr = `SALARY CALCULATION – 21 ${MONTH_NAMES[prevMonthNum]} ${prevYear} TO 20 ${MONTH_NAMES[payrollExportMonth]} ${payrollExportYear}`;

      const wb = XLSX.utils.book_new();
      const ws = {};

      // ── Helper to set a cell ─────────────────────────────────────────────────
      const setCell = (addr, v, bold = false, bg = null, border = false, wrapText = false, sz = 10, italic = false, hAlign = 'center') => {
        const font = { bold, italic, sz };
        const fill = bg ? { fgColor: { rgb: bg }, patternType: 'solid' } : { patternType: 'none' };
        const bStyle = border
          ? { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
          : {};
        ws[addr] = { v, t: typeof v === 'number' ? 'n' : 's', s: { font, fill, alignment: { horizontal: hAlign, vertical: 'center', wrapText }, border: bStyle } };
      };

      // Columns: A=Employee, B=Basic Salary, C=Working Days, D=Present/Full, E=Absent/Leave,
      //          F=Half-Day, G=Paid Holiday, H=Weekend/Sunday, I=Payable Days,
      //          J=Per-Day Salary, K=Calculation, L=Final Amount to Release,
      //          M=Absent Deduction, N=Half-Day Deduction
      const COLS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N'];
      const totalCols = COLS.length;
      const lastCol = COLS[totalCols - 1];

      // ── Row 1: Title ─────────────────────────────────────────────────────────
      setCell('A1', titleStr, true, 'FFFFFF', false, false, 13, false, 'center');
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }];

      // ── Row 2: Payroll Period ────────────────────────────────────────────────
      const firstSummary = summaries[0]?.summary;
      const totalWorkingDays = firstSummary?.workingDays ?? 0;

      setCell('A2', 'Payroll Period', true, null, false, false, 9, false, 'left');
      setCell('B2', `${startLabel} to ${endLabel}`, false, null, false, false, 9, false, 'left');
      setCell('C2', 'Formula', true, null, false, false, 9, false, 'left');
      setCell('D2', `Basic Salary ÷ ${totalWorkingDays || 26} × Payable Working Days`, false, null, false, false, 9, false, 'left');
      ws['!merges'].push({ s: { r: 1, c: 1 }, e: { r: 1, c: 1 } });
      ws['!merges'].push({ s: { r: 1, c: 3 }, e: { r: 1, c: totalCols - 1 } });

      // ── Row 3: Total Calendar Days ───────────────────────────────────────────
      const calStart = new Date(periodStart + 'T00:00:00');
      const calEnd   = new Date(periodEnd   + 'T00:00:00');
      const totalCalDays = Math.round((calEnd - calStart) / 86400000) + 1;
      setCell('A3', 'Total Calendar Days', true, null, false, false, 9, false, 'left');
      setCell('B3', totalCalDays, false, null, false, false, 9, false, 'left');
      ws['!merges'].push({ s: { r: 2, c: 1 }, e: { r: 2, c: totalCols - 1 } });

      // ── Row 4: Total Working Days ────────────────────────────────────────────
      // ── Row 4: Total Working Days ────────────────────────────────────────────
      setCell('A4', 'Total Working Days', true, null, false, false, 9, false, 'left');
      setCell('B4', totalWorkingDays, false, null, false, false, 9, false, 'left');
      ws['!merges'].push({ s: { r: 3, c: 1 }, e: { r: 3, c: totalCols - 1 } });

      // ── Row 5: Blank spacer ──────────────────────────────────────────────────
      // (empty)

      // ── Row 6: Column Headers ────────────────────────────────────────────────
      const HEADERS = [
        'Employee', 'Basic Salary (₹)', 'Working Days', 'Present / Full Days',
        'Absent / Leave', 'Half-Day', 'Paid Holiday', 'Weekend / Sunday',
        'Payable Days', 'Per-Day Salary (₹)', 'Calculation',
        'Final Amount to Release (₹)', 'Absent Deduction (₹)', 'Half-Day Deduction (₹)'
      ];
      COLS.forEach((col, i) => {
        setCell(`${col}6`, HEADERS[i], true, 'D9EAD3', true, true, 9, false, 'center');
      });

      // ── Data Rows (starting row 7) ───────────────────────────────────────────
      let totalWorkingSum = 0, totalPresentSum = 0, totalAbsentSum = 0;
      let totalHalfDaySum = 0, totalPaidLeaveSum = 0, totalWeeklyOffSum = 0;
      let totalPayableSum = 0;
      let totalBasicSum = 0, totalFinalAmountSum = 0, totalAbsentDedSum = 0, totalHalfDayDedSum = 0;

      summaries.forEach((item, idx) => {
        const rowNum = 7 + idx;
        const s = item.summary;
        const emp = item.employee;

        // Basic salary from locked payroll or employee profile
        const empSalary = item.lockedPayroll?.basicSalary ?? (emp.salary ? Number(emp.salary) : 0);
        const workDays = s.workingDays ?? 0;
        const payDays = item.lockedPayroll?.payableDays ?? (s.payableDays ?? 0);
        const pd = (workDays > 0 && empSalary > 0) ? (empSalary / workDays) : 0;

        // Deductions matching payroll logic
        const rawEarnedPayable = (s.present ?? 0) + (s.paidLeave ?? 0) + ((s.halfDay ?? 0) * 0.5);
        const effectiveAbsentDays = (rawEarnedPayable >= workDays && workDays > 0)
          ? 0
          : Math.max(0, Math.min(s.absent ?? (workDays - rawEarnedPayable), Math.max(0, workDays - rawEarnedPayable)));
        const absentDeduction = item.lockedPayroll?.absentDeduction ?? (effectiveAbsentDays * pd);
        const halfDayDeduction = item.lockedPayroll?.halfDayDeduction ?? ((s.halfDay ?? 0) * (pd / 2));
        const penaltyFines = item.lockedPayroll?.penalty ?? (s.penaltyAmount ?? 0);

        // Final amount to release
        const finalAmount = item.lockedPayroll?.netSalary ?? Math.max(0, Math.round((pd * payDays) - penaltyFines));

        const calcStr = (empSalary > 0 && workDays > 0)
          ? `₹${empSalary.toLocaleString('en-IN')} ÷ ${workDays} × ${payDays} days`
          : '₹0 ÷ 0 × 0';

        totalWorkingSum   += workDays;
        totalPresentSum   += s.present     ?? 0;
        totalAbsentSum    += s.absent      ?? 0;
        totalHalfDaySum   += s.halfDay     ?? 0;
        totalPaidLeaveSum += s.holidays    ?? 0;  // paid holidays
        totalWeeklyOffSum += s.weeklyOff   ?? 0;
        totalPayableSum   += payDays;
        totalBasicSum     += empSalary;
        totalFinalAmountSum += finalAmount;
        totalAbsentDedSum += absentDeduction;
        totalHalfDayDedSum += halfDayDeduction;

        const rowBg = idx % 2 === 0 ? null : 'F8F9FA';

        setCell(`A${rowNum}`, `${emp.fullName} (${emp.empCode || ''})`, false, rowBg, true, false, 9, false, 'left');
        setCell(`B${rowNum}`, empSalary > 0 ? `₹${empSalary.toLocaleString('en-IN')}` : '₹0.00', false, rowBg, true, false, 9, false, 'right');
        setCell(`C${rowNum}`, workDays,             false, rowBg, true, false, 9, false, 'center');
        setCell(`D${rowNum}`, s.present     ?? 0,  false, rowBg, true, false, 9, false, 'center');
        setCell(`E${rowNum}`, s.absent      ?? 0,  false, rowBg, true, false, 9, false, 'center');
        setCell(`F${rowNum}`, s.halfDay     ?? 0,  false, rowBg, true, false, 9, false, 'center');
        setCell(`G${rowNum}`, s.holidays    ?? 0,  false, rowBg, true, false, 9, false, 'center');
        setCell(`H${rowNum}`, s.weeklyOff   ?? 0,  false, rowBg, true, false, 9, false, 'center');
        setCell(`I${rowNum}`, payDays,              false, rowBg, true, false, 9, false, 'center');
        setCell(`J${rowNum}`, pd > 0 ? `₹${pd.toFixed(2)}` : '₹0.00', false, rowBg, true, false, 9, false, 'right');
        setCell(`K${rowNum}`, calcStr,              false, rowBg, true, false, 9, false, 'left');
        setCell(`L${rowNum}`, `₹${finalAmount.toLocaleString('en-IN')}`, true, 'FFF2CC', true, false, 9, false, 'right');
        setCell(`M${rowNum}`, `₹${Math.round(absentDeduction).toLocaleString('en-IN')}`, false, rowBg, true, false, 9, false, 'right');
        setCell(`N${rowNum}`, `₹${Math.round(halfDayDeduction).toLocaleString('en-IN')}`, false, rowBg, true, false, 9, false, 'right');
      });

      // ── TOTAL Row ────────────────────────────────────────────────────────────
      const totalRow = 7 + summaries.length;
      const totalBg  = 'CFE2F3';
      setCell(`A${totalRow}`, 'TOTAL',           true, totalBg, true, false, 9, false, 'center');
      setCell(`B${totalRow}`, `₹${totalBasicSum.toLocaleString('en-IN')}`, true, totalBg, true, false, 9, false, 'right');
      setCell(`C${totalRow}`, totalWorkingSum,   true, totalBg, true, false, 9, false, 'center');
      setCell(`D${totalRow}`, totalPresentSum,   true, totalBg, true, false, 9, false, 'center');
      setCell(`E${totalRow}`, totalAbsentSum,    true, totalBg, true, false, 9, false, 'center');
      setCell(`F${totalRow}`, totalHalfDaySum,   true, totalBg, true, false, 9, false, 'center');
      setCell(`G${totalRow}`, totalPaidLeaveSum, true, totalBg, true, false, 9, false, 'center');
      setCell(`H${totalRow}`, totalWeeklyOffSum, true, totalBg, true, false, 9, false, 'center');
      setCell(`I${totalRow}`, totalPayableSum,   true, totalBg, true, false, 9, false, 'center');
      setCell(`J${totalRow}`, '',                true, totalBg, true, false, 9, false, 'center');
      setCell(`K${totalRow}`, 'TOTAL AMOUNT TO BE RELEASED', true, totalBg, true, false, 9, false, 'center');
      setCell(`L${totalRow}`, `₹${totalFinalAmountSum.toLocaleString('en-IN')}`, true, totalBg, true, false, 9, false, 'right');
      setCell(`M${totalRow}`, `₹${Math.round(totalAbsentDedSum).toLocaleString('en-IN')}`, true, totalBg, true, false, 9, false, 'right');
      setCell(`N${totalRow}`, `₹${Math.round(totalHalfDayDedSum).toLocaleString('en-IN')}`, true, totalBg, true, false, 9, false, 'right');

      // ── Blank row ────────────────────────────────────────────────────────────
      const notesRow = totalRow + 2;
      setCell(`A${notesRow}`, 'PAYROLL SUMMARY', true, null, false, false, 10, false, 'left');
      setCell(`D${notesRow}`, 'CALCULATION METHOD FOR REVIEW', true, null, false, false, 10, false, 'left');

      const n1 = notesRow + 1;
      setCell(`A${n1}`, 'Total Basic Salary Entered', false, null, false, false, 9, false, 'left');
      setCell(`B${n1}`, `₹${totalBasicSum.toLocaleString('en-IN')}`, true, null, false, false, 9, false, 'left');
      setCell(`D${n1}`, `1. Working D: ${totalWorkingDays} days (${totalCalDays} calendar days – Sundays)`, false, null, false, false, 9, false, 'left');
      ws['!merges'].push({ s: { r: n1 - 1, c: 3 }, e: { r: n1 - 1, c: totalCols - 1 } });

      const n2 = notesRow + 2;
      setCell(`A${n2}`, 'Working Days Per Employee', false, null, false, false, 9, false, 'left');
      setCell(`B${n2}`, totalWorkingDays, false, null, false, false, 9, false, 'left');
      setCell(`D${n2}`, '2. Payable D: Present + (Half-Day × 0.5) + Paid Holiday', false, null, false, false, 9, false, 'left');
      ws['!merges'].push({ s: { r: n2 - 1, c: 3 }, e: { r: n2 - 1, c: totalCols - 1 } });

      // ── Column Widths ─────────────────────────────────────────────────────────
      ws['!cols'] = [
        { wch: 24 }, // A Employee
        { wch: 16 }, // B Basic Salary
        { wch: 13 }, // C Working Days
        { wch: 18 }, // D Present
        { wch: 14 }, // E Absent
        { wch: 10 }, // F Half-Day
        { wch: 13 }, // G Paid Holiday
        { wch: 16 }, // H Weekend/Sunday
        { wch: 13 }, // I Payable Days
        { wch: 16 }, // J Per-Day Salary
        { wch: 32 }, // K Calculation
        { wch: 22 }, // L Final Amount
        { wch: 18 }, // M Absent Deduction
        { wch: 20 }, // N Half-Day Deduction
      ];

      // ── Row Heights ───────────────────────────────────────────────────────────
      ws['!rows'] = [{ hpt: 28 }, { hpt: 16 }, { hpt: 16 }, { hpt: 16 }, { hpt: 8 }, { hpt: 36 }];

      // Set sheet range
      ws['!ref'] = `A1:${lastCol}${n2}`;

      XLSX.utils.book_append_sheet(wb, ws, 'Salary Calculation');
      const fileName = `Salary_Calculation_${MONTH_NAMES[prevMonthNum]}_${prevYear}_to_${MONTH_NAMES[payrollExportMonth]}_${payrollExportYear}.xlsx`;
      XLSX.writeFile(wb, fileName);
      setIsPayrollModalOpen(false);
    } catch (err) {
      console.error('Payroll export error:', err);
      alert('Error exporting payroll data. Please try again.');
    } finally {
      setPayrollExporting(false);
    }
  };

  return (
    <AdminLayout title="Hourly Reports" subtitle="View and download hourly work reports.">
      <div className="space-y-8 pb-20">
        


        {/* Navigation Switcher: Hourly Reports vs HRMS Matrix Format vs Department Work Sheets (Excel View) */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveViewTab('hourly')}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                activeViewTab === 'hourly'
                  ? 'bg-[#0f172a] text-white shadow-xl shadow-slate-900/20 scale-[1.02]'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <Clock size={16} className={activeViewTab === 'hourly' ? 'text-blue-400' : 'text-slate-400'} />
              Hourly Log Reports
            </button>

            <button
              type="button"
              onClick={() => setActiveViewTab('matrix')}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                activeViewTab === 'matrix'
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/25 scale-[1.02]'
                  : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
              }`}
            >
              <LayoutGrid size={16} className={activeViewTab === 'matrix' ? 'text-blue-100' : 'text-blue-500'} />
              HRMS Format Worksheet (All Employees)
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                activeViewTab === 'matrix' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
              }`}>
                Live Matrix
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveViewTab('sheets')}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                activeViewTab === 'sheets'
                  ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/25 scale-[1.02]'
                  : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              <FileSpreadsheet size={16} className={activeViewTab === 'sheets' ? 'text-emerald-100' : 'text-emerald-500'} />
              Department Work Sheets (Excel View)
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Button 1: Sync All Department Sheets Today */}
            <button
              type="button"
              onClick={handleSyncAllDepartments}
              disabled={syncingAllSheets}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-500/25 active:scale-95 disabled:opacity-50"
              title="Pull today's work reports from all department Google Sheets and save as HRMS worksheet drafts"
            >
              <RefreshCw size={15} className={syncingAllSheets ? 'animate-spin' : ''} />
              {syncingAllSheets ? 'Syncing All Sheets...' : '⚡ Sync All Department Sheets Today'}
            </button>

            {/* Button 2: Quick switch to HRMS matrix view if in other tabs */}
            {activeViewTab !== 'matrix' && (
              <button
                type="button"
                onClick={() => setActiveViewTab('matrix')}
                className="flex items-center gap-2 px-5 py-3 bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-sm"
              >
                <LayoutGrid size={15} /> All Employees HRMS Format
              </button>
            )}

            {activeViewTab === 'hourly' && (
              <button
                type="button"
                onClick={() => setIsPayrollModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold hover:bg-emerald-100 transition-all shadow-sm"
              >
                <Download size={15} /> Export Payroll Excel
              </button>
            )}

            {activeViewTab === 'matrix' && (
              <button
                type="button"
                onClick={handleDownloadMatrixExcel}
                className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
              >
                <Download size={15} /> Export Matrix Excel
              </button>
            )}

            {activeViewTab === 'sheets' && activeSheet.hasSheet && (
              <a
                href={activeSheet.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-200 active:scale-95"
              >
                <ExternalLink size={15} /> Open in Google Sheets
              </a>
            )}
          </div>
        </div>

        {activeViewTab === 'hourly' && (
          <div className="space-y-8">
            {/* DEPARTMENT-WISE CARDS */}
            <div className="bg-white rounded-[36px] border border-slate-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                    <Briefcase size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#1e293b]">Department Work Reports</h3>
                    <p className="text-xs font-semibold text-slate-400">
                      Select a department below to view employees and their whole work reports
                    </p>
                  </div>
                </div>
              </div>

              {/* Department Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                {getDepartmentCardsList().map((dept) => {
                  const isSelected = selectedDeptCard === dept.id;
                  return (
                    <div
                      key={dept.id}
                      onClick={() => {
                        setSelectedDeptCard(dept.id);
                        setSelectedEmployeeCard(null);
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none group ${
                        isSelected
                          ? 'bg-gradient-to-br from-[#0f172a] to-blue-950 text-white border-blue-500/40 shadow-lg shadow-slate-900/15 ring-2 ring-blue-500/30 -translate-y-0.5'
                          : 'bg-slate-50/70 border-slate-200/80 text-slate-700 hover:bg-white hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-2xl">{dept.icon}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {dept.count} Staff
                        </span>
                      </div>

                      <div className="mt-3">
                        <h4 className="text-xs font-black truncate leading-snug">
                          {dept.name}
                        </h4>
                        <p className={`text-[10px] font-semibold mt-0.5 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                          {isSelected ? '● Viewing Dept' : 'Click to View'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* EMPLOYEE CARDS SECTION FOR SELECTED DEPARTMENT */}
            <div className="bg-white rounded-[36px] border border-slate-100 shadow-sm p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                    <Users size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-[#1e293b]">
                        {selectedDeptCard === 'All' ? 'All Employees' : `${selectedDeptCard} Team`}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600">
                        {getFilteredEmployees().length} Active
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-400">
                      Click any employee card or button to view their whole work report (timesheet & schedule)
                    </p>
                  </div>
                </div>

                {/* Search Box */}
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, ID or role..."
                    value={employeeCardSearch}
                    onChange={(e) => setEmployeeCardSearch(e.target.value)}
                    className="pl-9 pr-6 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-[#1e293b] outline-none w-56 sm:w-64 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                  {employeeCardSearch && (
                    <button 
                      type="button"
                      onClick={() => setEmployeeCardSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Employee Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {getFilteredEmployees().map((emp) => {
                  const isSelected = selectedEmployeeCard?._id === emp._id;
                  return (
                    <div
                      key={emp._id}
                      onClick={() => setSelectedEmployeeCard(isSelected ? null : emp)}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                        isSelected
                          ? 'bg-blue-50/90 border-blue-500 shadow-lg shadow-blue-500/15 ring-2 ring-blue-500/30 -translate-y-0.5'
                          : 'bg-white border-slate-150 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm border overflow-hidden shrink-0 transition-transform group-hover:scale-105 ${
                          isSelected 
                            ? 'bg-blue-600 text-white border-blue-400 shadow-md' 
                            : 'bg-slate-100 text-slate-700 border-white shadow-sm'
                        }`}>
                          {emp.profileImage ? (
                            <img 
                              src={emp.profileImage} 
                              alt={emp.fullName} 
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                            />
                          ) : (
                            emp.fullName?.charAt(0) || 'E'
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-black truncate ${isSelected ? 'text-blue-900' : 'text-[#1e293b]'}`} title={emp.fullName}>
                            {emp.fullName}
                          </h4>
                          <p className="text-[11px] font-bold text-slate-400 truncate">
                            {emp.empCode || 'EMP'}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider truncate max-w-[130px] ${
                              isSelected 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600'
                            }`}>
                              {emp.department || 'General'}
                            </span>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Active Employee" />
                          </div>
                        </div>
                      </div>

                      {/* View Report Button on Card */}
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEmployeeCard(isSelected ? null : emp);
                          }}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            isSelected 
                              ? 'bg-blue-600 text-white shadow-sm' 
                              : 'bg-slate-50 text-slate-700 hover:bg-blue-600 hover:text-white group-hover:bg-blue-50 group-hover:text-blue-600'
                          }`}
                        >
                          <Eye size={13} />
                          <span>{isSelected ? 'Viewing Work Report' : 'View Whole Work Report'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {getFilteredEmployees().length === 0 && (
                  <div className="col-span-full py-10 text-center text-xs font-bold text-slate-400 italic bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    No employees found for this department or search query.
                  </div>
                )}
              </div>
            </div>

            {/* If an employee card is selected, render their whole work report like employee side */}
            {selectedEmployeeCard ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                <EmployeeSchedule 
                  embedded={true} 
                  readOnly={true} 
                  targetEmployeeId={selectedEmployeeCard._id} 
                  targetEmployeeName={selectedEmployeeCard.fullName} 
                  targetEmployee={selectedEmployeeCard} 
                  onBack={() => setSelectedEmployeeCard(null)} 
                />
              </div>
            ) : (
              <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard 
                icon={<Users size={24} className="text-blue-600" />} 
                label="Total Employees" 
                value={data.stats.totalEmployees || employees.length} 
                subValue="Active Employees" 
                colorClass="bg-blue-50"
              />
              <StatCard 
                icon={<Clock size={24} className="text-emerald-600" />} 
                label="Total Hours Today" 
                value={data.stats.totalHoursToday} 
                subValue="Logged Hours" 
                colorClass="bg-emerald-50"
              />
              <StatCard 
                icon={<TrendingUp size={24} className="text-violet-600" />} 
                label="Average Hours" 
                value={data.stats.averageHours} 
                subValue="Per Employee" 
                colorClass="bg-violet-50"
              />
              <StatCard 
                icon={<Clock size={24} className="text-orange-500" />} 
                label="Overtime Hours" 
                value={data.stats.totalOvertimeToday} 
                subValue="Total Overtime" 
                colorClass="bg-orange-50"
              />
            </div>

            {/* Main Content Area */}
        {/* Today's Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Today's Summary (Donut) */}
           <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8 flex items-center justify-between gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <PieChart size={20} />
                  </div>
                  <h3 className="text-lg font-black text-[#1e293b]">Today's Summary</h3>
                </div>
                <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                   {data.summary.map((item, idx) => (
                      <div key={item.name} className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                            <span className="text-xs font-bold text-slate-500">{item.name}</span>
                         </div>
                         <span className="text-xs font-black text-[#1e293b]">{item.hours}</span>
                      </div>
                   ))}
                </div>
              </div>

              <div className="w-48 h-48 relative">
                 <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                       <Pie
                          data={data.summary.length > 0 ? data.summary : [{ name: 'No Data', minutes: 1 }]}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={5}
                          dataKey="minutes"
                       >
                          {data.summary.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                       </Pie>
                    </RePieChart>
                 </ResponsiveContainer>
                 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-xl font-black text-[#1e293b] leading-tight">{data.stats.totalHoursToday}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Hours</p>
                 </div>
              </div>
           </div>

           {/* Report Status */}
           <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8">
              <h3 className="text-lg font-black text-[#1e293b] mb-8">Submission Status</h3>
              <div className="grid grid-cols-1 gap-4">
                 {[
                   { label: 'Completed', count: data.statusCounts.Completed, color: 'bg-emerald-500', total: data.stats.totalEmployees },
                   { label: 'Pending', count: data.statusCounts.Pending, color: 'bg-orange-500', total: data.stats.totalEmployees },
                   { label: 'Not Submitted', count: data.statusCounts.NotSubmitted, color: 'bg-rose-500', total: data.stats.totalEmployees }
                 ].map(status => {
                   const percentage = status.total > 0 ? (status.count / status.total) * 100 : 0;
                   return (
                     <div key={status.label} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{status.label}</p>
                           <p className="text-[10px] font-black text-[#1e293b] uppercase tracking-widest">{status.count} ({percentage.toFixed(1)}%)</p>
                        </div>
                        <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                           <div className={`h-full ${status.color} transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
                        </div>
                     </div>
                   );
                 })}
              </div>
           </div>

           {/* Download & Actions */}
           <div className="bg-[#0f172a] rounded-[40px] p-8 text-white shadow-xl shadow-slate-200 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
              <h3 className="text-lg font-black mb-6 relative z-10">Export Center</h3>
              <div className="space-y-3 relative z-10">
                 <button onClick={handleDownloadExcel} className="w-full flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl transition-all">
                    <div className="w-8 h-8 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center">
                       <Download size={16} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">Download Full Excel</span>
                 </button>
                 <button onClick={handleEmailExcel} disabled={emailSending} className="w-full flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl transition-all disabled:opacity-50">
                    <div className="w-8 h-8 bg-purple-500/20 text-purple-400 rounded-lg flex items-center justify-center">
                       <Send size={16} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">{emailSending ? 'Sending...' : 'Send Excel to Mail'}</span>
                 </button>
                    {/* Debounced search effect */}
                    {(() => {
                      const timer = setTimeout(() => {
                        // fetchReports is invoked via effect below
                      }, 0);
                      return null;
                    })()}
                 <button onClick={() => setIsPayrollModalOpen(true)} className="w-full flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl transition-all">
                    <div className="w-8 h-8 bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center">
                       <FileText size={16} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">Download Payroll</span>
                 </button>
              </div>
           </div>
        </div>


              </>
            )}
          </div>
        )}

        {/* HRMS Format Worksheet (All Employees) Matrix View */}
        {activeViewTab === 'matrix' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Matrix Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard 
                icon={<Users size={24} className="text-blue-600" />} 
                label="Total Employees" 
                value={matrixData.totalEmployees || 0} 
                subValue="Active in HRMS" 
                colorClass="bg-blue-50"
              />
              <StatCard 
                icon={<CheckCircle2 size={24} className="text-emerald-600" />} 
                label="Reported Today" 
                value={matrixData.employeesWithTasksCount || 0} 
                subValue={`${matrixData.totalEmployees > 0 ? Math.round((matrixData.employeesWithTasksCount / matrixData.totalEmployees) * 100) : 0}% Active Today`} 
                colorClass="bg-emerald-50"
              />
              <StatCard 
                icon={<Clock size={24} className="text-violet-600" />} 
                label="Total Tasks Logged" 
                value={matrixData.totalTasksToday || 0} 
                subValue="Across 9 Standard Slots" 
                colorClass="bg-violet-50"
              />
              <StatCard 
                icon={<Layers size={24} className="text-amber-500" />} 
                label="Worksheet Date" 
                value={matrixDate} 
                subValue="HRMS Standard Format" 
                colorClass="bg-amber-50"
              />
            </div>

            {/* Matrix Filter & Action Bar */}
            <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex flex-wrap items-center gap-4">
                {/* Date Picker */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Date</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="date" 
                      value={matrixDate}
                      onChange={(e) => setMatrixDate(e.target.value)}
                      className="pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer hover:bg-slate-100/80 transition-all" 
                    />
                  </div>
                </div>

                {/* Department Dropdown */}
                <div className="space-y-1.5 min-w-[200px]">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department</label>
                  <CustomDropdown 
                    name="matrixDept"
                    value={matrixDept}
                    options={departments}
                    onChange={(e) => setMatrixDept(e.target.value)}
                  />
                </div>

                {/* Search Bar */}
                <div className="space-y-1.5 min-w-[220px]">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Search Employee</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Name or Emp Code..." 
                      value={matrixSearch}
                      onChange={(e) => setMatrixSearch(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-blue-500/10" 
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => fetchMatrixData(matrixDate, matrixDept, matrixSearch)}
                  disabled={loadingMatrix}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all border border-slate-200"
                  title="Reload today's matrix"
                >
                  <RefreshCw size={14} className={loadingMatrix ? 'animate-spin text-blue-600' : ''} />
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={handleSyncAllDepartments}
                  disabled={syncingAllSheets}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                  title="Sync all department sheets into database"
                >
                  <RefreshCw size={14} className={syncingAllSheets ? 'animate-spin' : ''} />
                  {syncingAllSheets ? 'Syncing...' : '⚡ Sync Sheets'}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadMatrixExcel}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 active:scale-95"
                >
                  <Download size={14} /> Export Excel
                </button>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 md:p-8 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-[#1e293b]">HRMS Format Daily Worksheet</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
                    All employees mapped to 9 standard HRMS slots • Work Date: {matrixDate}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-full">
                    {matrixData.matrix?.length || 0} Employees Listed
                  </span>
                </div>
              </div>

              {loadingMatrix ? (
                <div className="py-24 flex flex-col items-center justify-center gap-4">
                  <div className="w-10 h-10 border-4 border-slate-100 border-t-blue-500 rounded-full animate-spin"></div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Fetching HRMS Worksheet Matrix...</p>
                </div>
              ) : matrixData.matrix?.length === 0 ? (
                <div className="py-24 text-center">
                  <AlertCircle size={40} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No employee work records found</p>
                  <p className="text-xs text-slate-400 mt-1">Try another filter or click "Sync Sheets" to pull updates from Google Sheets.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1700px]">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        <th className="sticky left-0 z-20 bg-slate-50 px-6 py-4 border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)] min-w-[220px]">
                          Employee
                        </th>
                        <th className="px-3 py-4 text-center min-w-[90px]">Status</th>
                        <th className="px-3 py-4 text-center min-w-[90px]">Tasks</th>
                        {matrixData.slots?.map((slot) => (
                          <th key={slot} className="px-3 py-4 text-center min-w-[155px] border-r border-slate-100/60 font-black">
                            <div className="text-[10px] text-blue-600 font-extrabold">{slot.split(' - ')[0]} - {slot.split(' - ')[1]}</div>
                          </th>
                        ))}
                        <th className="px-4 py-4 min-w-[180px]">Daily Remarks</th>
                        <th className="px-4 py-4 text-center min-w-[90px]">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {matrixData.matrix.map((row) => {
                        const hasAnyTask = row.taskCount > 0;
                        const statusColor = 
                          row.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          row.status === 'Submitted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          row.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-50 text-slate-400 border-slate-200';

                        return (
                          <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                            {/* Sticky Employee Info */}
                            <td className="sticky left-0 z-10 bg-white hover:bg-slate-50 px-6 py-4 border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs overflow-hidden border border-slate-200 shrink-0">
                                  {row.profileImage ? (
                                    <img src={row.profileImage} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    row.fullName?.charAt(0) || 'E'
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-extrabold text-[#1e293b] text-xs truncate">{row.fullName}</p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{row.empCode || '--'}</p>
                                  <span className="inline-block mt-0.5 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                    {row.department}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-3 py-4 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${statusColor}`}>
                                {row.status === 'Pending' ? 'Draft' : row.status}
                              </span>
                            </td>

                            {/* Tasks Logged Count */}
                            <td className="px-3 py-4 text-center">
                              <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-xl text-xs font-black ${
                                hasAnyTask ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-slate-100 text-slate-400'
                              }`}>
                                {row.taskCount} / {matrixData.slots?.length || 9}
                              </span>
                            </td>

                            {/* 9 Standard Slots */}
                            {matrixData.slots?.map((slot) => {
                              const taskContent = row.slots?.[slot];
                              return (
                                <td key={slot} className="px-3 py-3 border-r border-slate-100/60 align-top">
                                  {taskContent ? (
                                    <div 
                                      title={taskContent}
                                      className="p-2.5 bg-slate-50 hover:bg-white rounded-xl border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all text-[11px] font-medium text-slate-700 leading-snug line-clamp-3 whitespace-pre-wrap break-words group relative cursor-pointer"
                                    >
                                      <span className="text-[9px] font-bold text-blue-600 block mb-0.5">✓ Logged</span>
                                      {taskContent}
                                    </div>
                                  ) : (
                                    <div className="h-full py-4 text-center text-slate-300 font-bold text-xs select-none">
                                      —
                                    </div>
                                  )}
                                </td>
                              );
                            })}

                            {/* Remarks */}
                            <td className="px-4 py-3 align-top">
                              {row.dailyRemarks ? (
                                <div 
                                  title={row.dailyRemarks}
                                  className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-3"
                                >
                                  "{row.dailyRemarks}"
                                </div>
                              ) : (
                                <span className="text-slate-300 text-xs italic">No remarks</span>
                              )}
                            </td>

                            {/* Action */}
                            <td className="px-4 py-3 text-center align-middle">
                              <button
                                type="button"
                                onClick={() => fetchEmployeeTasks(row.id, row.date, row.status)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Department Work Sheets (Excel View) */}
        {activeViewTab === 'sheets' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Department Selector Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {DEPARTMENTS_WORK_SHEETS.map((dept) => {
                const isSelected = selectedDept === dept.id;
                const hasUrl = !!(departmentSheets[`sheet_url_${dept.id}`]?.trim() || dept.defaultUrl);

                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => setSelectedDept(dept.id)}
                    className={`p-4 rounded-2xl text-left border transition-all flex flex-col justify-between relative group ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20 scale-[1.02]'
                        : 'bg-white text-slate-700 border-slate-200/80 hover:border-emerald-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="text-xl mb-1 block">{dept.icon}</span>
                      <p className={`text-xs font-black uppercase tracking-wide truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                        {dept.id}
                      </p>
                      <p className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                        {dept.members}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isSelected
                          ? 'bg-emerald-700 text-white'
                          : (hasUrl ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400')
                      }`}>
                        {hasUrl ? 'Connected' : 'No Link'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Department Sheet Viewer Card */}
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
              <div className="p-6 md:p-8 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-bold shadow-sm text-2xl">
                    {activeSheet.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-800 tracking-tight">
                        {activeSheet.name} — Work Report
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700">
                        Total Report
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-400 mt-0.5">
                      {activeSheet.members} • Full team view with all employee tabs
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <a
                    href="/admin/settings"
                    className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    Configure in Settings
                  </a>
                  {activeSheet.hasSheet && (
                    <a
                      href={activeSheet.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-200 active:scale-95"
                    >
                      <ExternalLink size={14} /> Open in Google Sheets
                    </a>
                  )}
                </div>
              </div>

              {activeSheet.hasSheet ? (
                <div className="w-full h-[800px] bg-slate-50 relative">
                  <iframe
                    src={activeSheet.embedUrl}
                    title={`${activeSheet.name} Google Sheet`}
                    className="w-full h-full border-0"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="p-20 text-center flex flex-col items-center justify-center gap-4 bg-slate-50/30">
                  <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-100 text-amber-500 flex items-center justify-center font-bold shadow-sm">
                    <AlertCircle size={32} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-800">No Google Sheet Linked for {activeSheet.name}</h4>
                    <p className="text-xs text-slate-400 max-w-md mt-1 font-medium">
                      Please enter the Google Sheet URL for this department in System Settings so the team report can be viewed here.
                    </p>
                  </div>
                  <a
                    href="/admin/settings"
                    className="mt-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200"
                  >
                    Go to System Settings
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Task Details Modal */}
        {isModalOpen && (() => {
          const hasTasks = !modalLoading && selectedTasks && selectedTasks.length > 0;
          const showRating = true; // Always show rating section, just disable it when there are no tasks
          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 my-10">
              <div className="relative flex flex-col items-center gap-4 w-full max-w-2xl">
                <div className="bg-white rounded-[40px] w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                  
                  {/* Header */}
                  <div className="p-8 border-b border-slate-50 flex items-center justify-between shrink-0">
                    <div>
                      <h3 className="text-xl font-black text-[#1e293b]">Hourly Work Details</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Detailed task logs for the selected date</p>
                    </div>
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Task List — scrollable */}
                  <div className="p-8 overflow-y-auto shrink-0" style={{ maxHeight: '240px' }}>
                    {modalLoading ? (
                      <div className="py-12 flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-slate-100 border-t-blue-500 rounded-full animate-spin"></div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Fetching tasks...</p>
                      </div>
                    ) : hasTasks ? (
                      <div className="space-y-4">
                        {selectedTasks.map((task, idx) => (
                          <div key={idx} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-start gap-4 group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-100 text-blue-500 font-black text-xs shadow-sm flex-shrink-0">
                              {task.slotKey.split(' - ')[0]}
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{task.slotKey}</p>
                              <h4 className="text-sm font-bold text-[#1e293b] leading-relaxed">{task.title}</h4>
                            </div>
                            <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-emerald-100">
                              DONE
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center opacity-20">
                        <Clock size={48} className="mx-auto mb-3" />
                        <p className="text-sm font-bold uppercase tracking-widest">No tasks logged for this day</p>
                      </div>
                    )}
                  </div>

                  {/* Rating Section — always visible for Completed reports */}
                  {!modalLoading && showRating && (
                    <div className="px-8 pb-6 shrink-0">
                      <div className={`border rounded-[24px] p-4 relative transition-all ${hasTasks ? 'bg-white border-slate-100 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="text-xs font-black text-[#1e293b]">Rate Employee Performance</h4>
                          {!hasTasks && (
                            <span className="px-2.5 py-1 bg-orange-50 text-orange-500 border border-orange-100 rounded-lg text-[5px] font-black uppercase tracking-widest">
                              No Tasks Submitted
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium mb-2">
                          {hasTasks
                            ? 'Please provide your rating for this work session'
                            : 'Rating is only available when the employee has submitted task logs for the day'}
                        </p>

                        {/* Stars */}
                        <div className={`flex items-center gap-5 mb-2 ${!hasTasks ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onMouseEnter={() => hasTasks && setHoverRating(star)}
                                onMouseLeave={() => hasTasks && setHoverRating(0)}
                                onClick={() => hasTasks && setRating(star)}
                                disabled={!hasTasks}
                                className="focus:outline-none transition-transform hover:scale-110 active:scale-95 disabled:cursor-not-allowed"
                              >
                                <Star
                                  size={28}
                                  className={`${(hoverRating || rating) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 fill-slate-200'} transition-colors`}
                                />
                              </button>
                            ))}
                          </div>
                          {rating > 0 && (
                            <div className="flex flex-col">
                              <span className="px-2 py-1 bg-emerald-50 text-emerald-600 font-black text-[10px] rounded-lg border border-emerald-100">
                                {rating.toFixed(1)} / 5
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold mt-1">
                                {rating === 5 ? 'Excellent' : rating >= 4 ? 'Good' : rating >= 3 ? 'Average' : 'Needs Improvement'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Feedback */}
                        <div className={`mb-2 relative ${!hasTasks ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                          <label className="block text-[10px] font-bold text-slate-500 mb-2">Your Feedback (Optional)</label>
                          <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value.substring(0, 300))}
                            placeholder="Share your feedback about this work..."
                            disabled={!hasTasks}
                            className="w-full h-16 p-3 bg-white border border-slate-200 rounded-2xl text-sm text-[#1e293b] focus:outline-none focus:ring-4 focus:ring-blue-500/10 resize-none transition-all disabled:bg-slate-50 disabled:cursor-not-allowed"
                          ></textarea>
                          <div className="absolute bottom-3 right-4 text-[10px] font-bold text-slate-400">
                            {feedback.length} / 300
                          </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3">
                          <button
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleRatingSubmit}
                            disabled={!hasTasks || ratingLoading || rating === 0}
                            className="flex-1 py-3 bg-[#1e293b] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                          >
                            {ratingLoading ? 'Submitting...' : 'Submit '}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="px-8 pb-8 bg-slate-50/50 border-t border-slate-100 flex justify-end shrink-0 pt-5">
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="px-8 py-3 bg-[#1e293b] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-slate-200 active:scale-95 transition-all"
                    >
                      Close Details
                    </button>
                  </div>
                </div>

                {/* Info Alert below modal */}
                {showRating && (
                  <div className="w-full bg-blue-50/95 backdrop-blur-md border border-blue-100 rounded-2xl p-4 flex gap-4 shadow-xl">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0 border border-blue-100 text-blue-500 shadow-sm">
                      <Info size={20} />
                    </div>
                    <p className="text-sm font-bold text-blue-900 leading-relaxed">
                      Once you submit the rating, it will be added to the employee's performance data and reflected in the Performance page.
                    </p>
                  </div>
                )}

              </div>
            </div>
          );
        })()}
        {/* ── Payroll Excel Export Modal ─────────────────────────────────── */}
        {isPayrollModalOpen && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-[#1e293b]">Payroll Excel Export</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Download salary calculation sheet for all employees</p>
                </div>
                <button
                  onClick={() => setIsPayrollModalOpen(false)}
                  className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-8 space-y-6">
                {/* Period label */}
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Payroll Period</p>
                  <p className="text-sm font-black text-[#1e293b]">
                    21 {['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][payrollExportMonth === 1 ? 12 : payrollExportMonth - 1]}&nbsp;
                    {payrollExportMonth === 1 ? payrollExportYear - 1 : payrollExportYear} &nbsp;→&nbsp; 20 {['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][payrollExportMonth]}&nbsp;
                    {payrollExportYear}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Month picker */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Month</label>
                    <select
                      value={payrollExportMonth}
                      onChange={(e) => setPayrollExportMonth(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                        <option key={i+1} value={i+1}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* Year picker */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Year</label>
                    <select
                      value={payrollExportYear}
                      onChange={(e) => setPayrollExportYear(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {[currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-700 font-bold leading-relaxed">
                  <span className="font-black">✓ Note:</span> Basic Salary, Per-Day Salary, and Final Amount to Release are automatically calculated and populated from each employee's salary profile and attendance records to match the payroll system perfectly.
                </div>
              </div>

              {/* Footer */}
              <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
                <button
                  onClick={() => setIsPayrollModalOpen(false)}
                  className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayrollExcelExport}
                  disabled={payrollExporting}
                  className="flex items-center gap-2 px-8 py-3 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {payrollExporting ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</>
                  ) : (
                    <><Download size={16} /> Download Excel</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

const X = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export default AdminReports;
