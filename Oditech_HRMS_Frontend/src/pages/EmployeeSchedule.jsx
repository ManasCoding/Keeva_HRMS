import React, { useState, useEffect, useRef, useCallback } from 'react';
import EmployeeLayout from '../layouts/EmployeeLayout';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Send, Calendar, Download, FileSpreadsheet, 
  Trash2, Plus, CheckCircle2, AlertCircle, Loader2,
  ChevronLeft, ChevronRight, Eraser, Printer, Clock, Lock, PieChart, CheckCircle, XCircle, ExternalLink,
  RefreshCw, UploadCloud, Check, X, Sparkles, Maximize2, Edit3
} from 'lucide-react';
import api from '../services/api';
import { io } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_BASE_URL || 'https://oditech-hrms-backend-2.onrender.com/api').replace('/api', '');

// Auto-expanding textarea component that automatically grows in size as an employee types
// so the employee can always see what they write in full without text clipping
const AutoExpandingTextarea = ({
  value = '',
  onChange,
  onBlur,
  placeholder = '-',
  disabled = false,
  className = '',
  title = '',
  minHeight = 44,
  maxHeight = 280,
}) => {
  const textareaRef = useRef(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const scrollH = el.scrollHeight;
    const targetH = Math.min(Math.max(scrollH, minHeight), maxHeight);
    el.style.height = `${targetH}px`;
    el.style.overflowY = scrollH > maxHeight ? 'auto' : 'hidden';
  }, [minHeight, maxHeight]);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [adjustHeight]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => {
        onChange?.(e.target.value);
        adjustHeight();
      }}
      onFocus={adjustHeight}
      onBlur={onBlur}
      placeholder={placeholder}
      disabled={disabled}
      rows={1}
      className={className}
      title={title}
    />
  );
};

const EmployeeSchedule = ({ embedded = false, onBack, targetEmployeeId = null, targetEmployeeName = null, targetEmployee = null, readOnly = false }) => {
  const { employeeSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const effectiveUserId = targetEmployeeId || user._id || user.id;
  const isReadOnly = readOnly;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeReportTab, setActiveReportTab] = useState('hrms'); // 'hrms' | 'excel'
  const [weekTasks, setWeekTasks] = useState({});
  const [dailyRemarks, setDailyRemarks] = useState({});
  const [weekRemarks, setWeekRemarks] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekDates, setWeekDates] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [timesheets, setTimesheets] = useState([]);
  const [toast, setToast] = useState(null);
  const [employeeProfile, setEmployeeProfile] = useState(targetEmployee || null);

  useEffect(() => {
    if (targetEmployee) {
      setEmployeeProfile(targetEmployee);
    }
  }, [targetEmployee]);
  const [systemSettings, setSystemSettings] = useState({});
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncingSheet, setSyncingSheet] = useState(false);
  const [pullingSheet, setPullingSheet] = useState(false);
  const [pulledTasksPreview, setPulledTasksPreview] = useState([]);
  const [sheetRestricted, setSheetRestricted] = useState(false);
  const [syncDate, setSyncDate] = useState(new Date().toISOString().split('T')[0]);
  const [syncText, setSyncText] = useState('');
  const [syncRemarks, setSyncRemarks] = useState('');
  const [activeModalSlot, setActiveModalSlot] = useState(null);
  const [modalText, setModalText] = useState('');
  const modalTextareaRef = useRef(null);

  useEffect(() => {
    if (activeModalSlot && modalTextareaRef.current) {
      setTimeout(() => {
        modalTextareaRef.current?.focus();
      }, 60);
    }
  }, [activeModalSlot]);

  const handleOpenSlotModal = (date, slot, isLocked, slotState) => {
    const currentVal = weekTasks[`${date}_${slot}`] || '';
    // If admin is viewing (isReadOnly), admin can only see, not update!
    // In employee view, only active timeslot is unlocked for editing.
    const isActive = !isReadOnly && (slotState.status === 'ACTIVE' || slotState.status === 'GRACE');
    const canEdit = isActive;

    setActiveModalSlot({
      type: 'slot',
      date,
      slotKey: slot,
      dayLabel: formatDateLabel(date),
      canEdit,
      status: isReadOnly ? 'READONLY' : slotState.status,
      countdown: slotState.countdown
    });
    setModalText(currentVal);
  };

  const handleOpenDailyRemarksModal = (date, isLocked, remarksState) => {
    const currentVal = dailyRemarks[date] || '';
    // Only today's remarks (ACTIVE) is not locked when not in readOnly mode.
    const canEdit = !isReadOnly && remarksState === 'ACTIVE';

    setActiveModalSlot({
      type: 'dailyRemarks',
      date,
      slotKey: 'Daily Remarks',
      dayLabel: formatDateLabel(date),
      canEdit,
      status: isReadOnly ? 'READONLY' : remarksState
    });
    setModalText(currentVal);
  };

  const handleOpenWeeklyRemarksModal = () => {
    setActiveModalSlot({
      type: 'weekRemarks',
      date: null,
      slotKey: 'Weekly Remarks',
      dayLabel: `${formatDateLabel(weekDates[0])} - ${formatDateLabel(weekDates[6])}`,
      canEdit: !isReadOnly,
      status: isReadOnly ? 'READONLY' : 'ACTIVE'
    });
    setModalText(weekRemarks || '');
  };

  const handleSaveModalSlot = async () => {
    if (!activeModalSlot) return;
    const { type, date, slotKey, canEdit } = activeModalSlot;

    if (canEdit) {
      if (type === 'slot') {
        const updated = {
          ...weekTasks,
          [`${date}_${slotKey}`]: modalText
        };
        setWeekTasks(updated);

        try {
          const tasksToSubmit = [];
          Object.entries(updated).forEach(([k, t]) => {
            const [d, s] = k.split('_');
            tasksToSubmit.push({ date: d, slotKey: s, title: t || '', status: 'Completed' });
          });
          const res = await api.post('/employee/tasks/bulk', {
            employeeId: effectiveUserId,
            tasks: tasksToSubmit,
            dates: weekDates,
            dailyRemarks,
            weeklyRemarks: weekRemarks
          });
          if (res.data?.success) {
            showToast('Work update saved successfully!', 'success');
            await fetchWeeklyTasks();
          } else {
            showToast(res.data?.message || 'Failed to save work update', 'error');
          }
        } catch (err) {
          console.error('Error auto-saving task from modal:', err);
          showToast(err.response?.data?.message || 'Failed to save update', 'error');
        }
      } else if (type === 'dailyRemarks') {
        const updatedRemarks = {
          ...dailyRemarks,
          [date]: modalText
        };
        setDailyRemarks(updatedRemarks);

        try {
          const tasksToSubmit = [];
          Object.entries(weekTasks).forEach(([k, t]) => {
            const [d, s] = k.split('_');
            tasksToSubmit.push({ date: d, slotKey: s, title: t || '', status: 'Completed' });
          });
          const res = await api.post('/employee/tasks/bulk', {
            employeeId: effectiveUserId,
            tasks: tasksToSubmit,
            dates: weekDates,
            dailyRemarks: updatedRemarks,
            weeklyRemarks: weekRemarks
          });
          if (res.data?.success) {
            showToast('Daily remarks saved!', 'success');
            await fetchWeeklyTasks();
          }
        } catch (err) {
          console.error('Error auto-saving remarks from modal:', err);
          showToast(err.response?.data?.message || 'Failed to save remarks', 'error');
        }
      } else if (type === 'weekRemarks') {
        setWeekRemarks(modalText);

        try {
          const tasksToSubmit = [];
          Object.entries(weekTasks).forEach(([k, t]) => {
            const [d, s] = k.split('_');
            tasksToSubmit.push({ date: d, slotKey: s, title: t || '', status: 'Completed' });
          });
          const res = await api.post('/employee/tasks/bulk', {
            employeeId: effectiveUserId,
            tasks: tasksToSubmit,
            dates: weekDates,
            dailyRemarks,
            weeklyRemarks: modalText
          });
          if (res.data?.success) {
            showToast('Weekly remarks saved!', 'success');
            await fetchWeeklyTasks();
          }
        } catch (err) {
          console.error('Error auto-saving weekly remarks from modal:', err);
          showToast(err.response?.data?.message || 'Failed to save weekly remarks', 'error');
        }
      }
    }

    setActiveModalSlot(null);
    setModalText('');
  };

  useEffect(() => {
    const fetchContext = async () => {
      try {
        if (effectiveUserId) {
          const profileRes = await api.get(`/employee/profile/${effectiveUserId}`);
          if (profileRes.data?.success) {
            setEmployeeProfile(profileRes.data.employee);
          }
        }
        const settingsRes = await api.get('/settings');
        if (settingsRes.data?.success) {
          setSystemSettings(settingsRes.data.settings || {});
        }
      } catch (err) {
        console.error('Error fetching context:', err);
      }
    };
    fetchContext();
  }, [effectiveUserId]);

  const getDepartmentSheet = () => {
    const dept = employeeProfile?.department || user.department || 'Engineering';
    const isDev = ['engineering', 'developer', 'development', 'software', 'tech'].some(k => dept.toLowerCase().includes(k));
    const isMarketing = dept.toLowerCase().includes('marketing') ||
      /smruti|amit/i.test(employeeProfile?.fullName || '') ||
      /smruti|amit/i.test(user.name || '') ||
      /smruti|amit/i.test(user.email || '');
    const isDesign = dept.toLowerCase().includes('design') ||
      /debashish|rashmi|mrinal|subas|suchismita/i.test(employeeProfile?.fullName || '') ||
      /debashish|rashmi|mrinal|subas|suchismita/i.test(user.name || '');
    const isManagement = dept.toLowerCase().includes('manage') ||
      /jasmin/i.test(employeeProfile?.fullName || '') ||
      /jasmin/i.test(user.name || '');
    const isHR = /human\s*resource|hr\b/i.test(dept);

    const settingKey = `sheet_url_${dept}`;
    let sheetUrl = systemSettings[settingKey]?.trim();

    // Default sheet specifically for Human Resources Team
    if (!sheetUrl && isHR) {
      sheetUrl = systemSettings['sheet_url_Human Resources']?.trim() || 
        systemSettings['sheet_url_HR']?.trim() ||
        'https://docs.google.com/spreadsheets/d/1t8ERkUfun8dzpoaaoh4vbmYt9-zDO1Ib0gA_DNvTXxA/edit?gid=0#gid=0';
    }

    // Default sheet specifically for Management Team (Jasmin Jena & Leadership)
    if (!sheetUrl && isManagement) {
      sheetUrl = systemSettings['sheet_url_Management']?.trim() || 
        'https://docs.google.com/spreadsheets/d/1aOw1-8I2b99X3ILj_1rOrqFf1ntFOL7U19BZ3m-KVTI/edit?gid=882523443#gid=882523443';
    }

    // Default sheet specifically for Design Team (Debashish, Rashmi, Subas, Mrinal, etc.)
    if (!sheetUrl && isDesign) {
      sheetUrl = systemSettings['sheet_url_Design']?.trim() || 
        'https://docs.google.com/spreadsheets/d/1Hz-gYswAHVRhXEhQbJrJdC4Fo9xE8P0TCNNLsW_IZK4/edit?gid=0#gid=0';
    }

    // Default sheet specifically for Marketing Team (Smruti, Amit, Sanghamitra, etc.)
    if (!sheetUrl && isMarketing) {
      sheetUrl = systemSettings['sheet_url_Marketing']?.trim() || 
        'https://docs.google.com/spreadsheets/d/1PF386DYQWbUHKuIeIixclNnG1hil4TzO/edit?gid=2082445647#gid=2082445647';
    }

    // Default sheet specifically for Developer / Engineering Team (allows viewing total report across team tabs)
    if (!sheetUrl && isDev) {
      sheetUrl = systemSettings['sheet_url_Engineering']?.trim() || 
        'https://docs.google.com/spreadsheets/d/1sIlWWsipPxOrCQENj2E_EHI7XW2HD9S2n8xfaPVuzNs/edit?pli=1&gid=577942890#gid=577942890';
    }

    const deptDisplayName = isMarketing ? 'Marketing Team' : (isDev ? 'Developer Team' : (isDesign ? 'Design Team' : (isManagement ? 'Management Team' : (isHR ? 'Human Resources Team' : `${dept} Team`))));

    if (!sheetUrl) {
      return {
        departmentName: deptDisplayName,
        hasSheet: false,
        url: null,
        embedUrl: null
      };
    }

    let embedUrl = sheetUrl;
    if (sheetUrl.includes('docs.google.com/spreadsheets')) {
      embedUrl = sheetUrl.replace('/edit', '/edit?rm=minimal');
      if (!embedUrl.includes('rm=minimal')) {
        embedUrl += embedUrl.includes('?') ? '&rm=minimal' : '?rm=minimal';
      }
    }

    return {
      departmentName: deptDisplayName,
      hasSheet: true,
      url: sheetUrl,
      embedUrl
    };
  };

  const deptSheet = getDepartmentSheet();

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTimesheets = async () => {
    try {
      const res = await api.get(`/timesheets/${effectiveUserId}?month=${selectedDate.getMonth() + 1}&year=${selectedDate.getFullYear()}`);
      if (res.data.success) {
        const tsList = res.data.timesheets || [];
        setTimesheets(tsList);
        const remarksMap = {};
        const fallbackTasksMap = {};
        let latestWeeklyRemark = '';
        tsList.forEach(ts => {
          if (ts.dailyRemarks) remarksMap[ts.date] = ts.dailyRemarks;
          if (ts.weeklyRemarks) latestWeeklyRemark = ts.weeklyRemarks;
          if (Array.isArray(ts.hourlyTasks)) {
            ts.hourlyTasks.forEach(ht => {
              if (ht.date && ht.slotKey && ht.title) {
                fallbackTasksMap[`${ht.date}_${ht.slotKey}`] = ht.title;
              }
            });
          }
        });
        if (Object.keys(remarksMap).length > 0) {
          setDailyRemarks(prev => ({ ...remarksMap, ...prev }));
        }
        if (latestWeeklyRemark) {
          setWeekRemarks(prev => prev || latestWeeklyRemark);
        }
        if (Object.keys(fallbackTasksMap).length > 0) {
          setWeekTasks(prev => ({ ...fallbackTasksMap, ...prev }));
        }
      }
    } catch (err) {
      console.error('Error fetching timesheets:', err);
    }
  };

  useEffect(() => {
    fetchTimesheets();
    const socket = io(SOCKET_URL);
    socket.on('timesheetSubmitted', (data) => {
      if (data.employeeId === effectiveUserId) fetchTimesheets();
    });
    socket.on('timesheetUpdated', (data) => {
      if (data.employeeId === effectiveUserId) fetchTimesheets();
    });
    return () => socket.disconnect();
  }, [selectedDate, effectiveUserId]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getSlotState = (dateStr, slotKey) => {
    const endStr = (slotKey || '').split(' - ')[1]?.trim() || '00:00';
    const startStr = (slotKey || '').split(' - ')[0]?.trim() || '00:00';
    
    const parseTime = (timeStr) => {
      let [h, m] = timeStr.split(':').map(Number);
      if (h >= 1 && h <= 8) h += 12;
      return { h, m };
    };

    const startT = parseTime(startStr);
    const endT = parseTime(endStr);

    const [year, month, day] = (dateStr || '').split('-').map(Number);
    if (!year || !month || !day) return { status: 'LOCKED' };

    const slotStart = new Date(year, month - 1, day, startT.h, startT.m, 0, 0);
    const slotEnd = new Date(year, month - 1, day, endT.h, endT.m, 0, 0);
    const graceEnd = new Date(slotEnd.getTime() + 15 * 60000);

    if (currentTime < slotStart) return { status: 'FUTURE' };
    if (currentTime >= slotStart && currentTime < slotEnd) return { status: 'ACTIVE' };
    if (currentTime >= slotEnd && currentTime < graceEnd) {
      const remainingMs = graceEnd - currentTime;
      const m = Math.floor(remainingMs / 60000);
      const s = Math.floor((remainingMs % 60000) / 1000);
      const countdown = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      return { status: 'GRACE', countdown };
    }
    return { status: 'LOCKED' };
  };

  const getRemarksState = (dateStr) => {
    const [year, month, day] = (dateStr || '').split('-').map(Number);
    if (!year || !month || !day) return 'LOCKED';

    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
    
    if (currentTime < startOfDay) return 'FUTURE';
    if (currentTime > endOfDay) return 'LOCKED';
    return 'ACTIVE';
  };
  


  const timeSlots = [
    '09:30 - 10:30',
    '10:30 - 11:30',
    '11:30 - 12:30',
    '12:30 - 01:30',
    '01:30 - 02:30',
    '02:30 - 03:30',
    '03:00 - 04:00',
    '04:00 - 04:50',
    '05:00 - 06:30'
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const calculateWeekDates = (date) => {
    const curr = new Date(date);
    const day = curr.getDay(); // 0 (Sun) to 6 (Sat)
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(curr.setDate(diff));
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const nextDate = new Date(monday);
      nextDate.setDate(monday.getDate() + i);
      dates.push(nextDate.toISOString().split('T')[0]);
    }
    setWeekDates(dates);
  };

  useEffect(() => {
    calculateWeekDates(selectedDate);
  }, [selectedDate]);

  const fetchWeeklyTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/employee/tasks/weekly/${effectiveUserId}?startDate=${weekDates[0]}&endDate=${weekDates[6]}`);
      if (res.data.success) {
        const tasksMap = {};
        const remarksMap = { ...(res.data.dailyRemarks || {}) };
        (res.data.tasks || []).forEach(task => {
          const key = `${task.date}_${task.slotKey}`;
          tasksMap[key] = task.title;
          if (task.dailyRemarks) {
            remarksMap[task.date] = task.dailyRemarks;
          }
        });
        setWeekTasks(tasksMap);
        setDailyRemarks(remarksMap);
        if (res.data.weeklyRemarks !== undefined) {
          setWeekRemarks(res.data.weeklyRemarks || '');
        }
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (weekDates.length > 0 && effectiveUserId) {
      fetchWeeklyTasks();
    }
  }, [weekDates, effectiveUserId]);

  // Real-time socket listener for sheet updates
  useEffect(() => {
    let socket;
    try {
      socket = io(SOCKET_URL);
      const handleTimesheetUpdate = (data) => {
        const targetIdStr = String(effectiveUserId || '');
        const profileIdStr = String(employeeProfile?._id || '');
        const dataEmpId = String(data?.employeeId || '');

        if (!data?.employeeId || dataEmpId === targetIdStr || dataEmpId === profileIdStr) {
          fetchWeeklyTasks();
        }
      };

      socket.on('timesheetUpdated', handleTimesheetUpdate);
      socket.on('timesheetSubmitted', handleTimesheetUpdate);
      socket.on('googleSheetSynced', () => {
        fetchWeeklyTasks();
      });
    } catch (err) {
      console.error('Socket connection error:', err);
    }
    return () => {
      if (socket) socket.disconnect();
    };
  }, [effectiveUserId, employeeProfile?._id, weekDates]);

  const handleAutoPullFromSheet = async (targetDateToPull = syncDate, autoSave = true) => {
    setPullingSheet(true);
    setSheetRestricted(false);
    try {
      const payload = {
        employeeId: user.id || employeeProfile?._id,
        empCode: employeeProfile?.empCode || employeeSlug || user.slug,
        employeeName: employeeProfile?.fullName || user.name,
        email: employeeProfile?.email || user.email,
        sheetUrl: deptSheet.url,
        date: targetDateToPull,
        autoSave
      };

      const res = await api.post('/timesheets/pull-sheet', payload);
      if (res.data?.success) {
        if (res.data.count > 0) {
          setPulledTasksPreview(res.data.tasks || []);
          showToast(`⚡ Pulled & saved ${res.data.count} work update(s) from Google Sheet as Draft! (Not submitted to admin)`, 'success');
          const foundRemark = res.data.tasks.find(t => t.remarks)?.remarks;
          if (foundRemark) setSyncRemarks(foundRemark);
          await fetchWeeklyTasks();
        } else {
          showToast(res.data.message || `No entries found for date ${targetDateToPull}`, 'error');
        }
      } else {
        if (res.data?.isRestricted) {
          setSheetRestricted(true);
          showToast('Google Sheet is restricted (401). Set sharing to "Anyone with the link can view".', 'error');
        } else {
          showToast(res.data?.message || 'Failed to sync from Google Sheet', 'error');
        }
      }
    } catch (err) {
      console.error('Error auto-pulling sheet:', err);
      const isRestr = err.response?.data?.isRestricted || err.response?.status === 403 || err.response?.status === 401;
      if (isRestr) {
        setSheetRestricted(true);
        showToast('Google Sheet is restricted. Set sharing to "Anyone with the link can view".', 'error');
      } else {
        showToast(err.response?.data?.message || 'Failed to pull from Google Sheet', 'error');
      }
    } finally {
      setPullingSheet(false);
    }
  };

  const handleSyncFromSheet = async () => {
    if (!syncText.trim()) {
      showToast('Please enter your work update or task notes to sync', 'error');
      return;
    }
    setSyncingSheet(true);
    try {
      const lines = syncText
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);

      const parsedTasks = [];

      lines.forEach((line, idx) => {
        const slotMatch = line.match(/^(\d{1,2}:\d{2}\s*(?:-\s*\d{1,2}:\d{2})?(?:\s*[AaPp][Mm])?|Slot\s*\d+)\s*[:-]\s*(.*)$/i);
        if (slotMatch) {
          parsedTasks.push({
            slotKey: slotMatch[1].trim(),
            title: slotMatch[2].trim()
          });
        } else {
          const fallbackSlot = timeSlots[idx] || `Slot ${idx + 1}`;
          parsedTasks.push({
            slotKey: fallbackSlot,
            title: line
          });
        }
      });

      const payload = {
        employeeId: user.id || employeeProfile?._id,
        empCode: employeeProfile?.empCode || employeeSlug || user.slug,
        employeeName: employeeProfile?.fullName || user.name,
        email: employeeProfile?.email || user.email,
        date: syncDate,
        tasks: parsedTasks,
        dailyRemarks: syncRemarks
      };

      const res = await api.post('/timesheets/sync-sheet', payload);
      if (res.data?.success) {
        showToast('Work updates saved to database as Draft! (Not submitted to admin)', 'success');
        setShowSyncModal(false);
        setSyncText('');
        setSyncRemarks('');
        await fetchWeeklyTasks();
      } else {
        showToast(res.data?.message || 'Sync failed', 'error');
      }
    } catch (err) {
      console.error('Error syncing sheet update:', err);
      showToast(err.response?.data?.message || 'Failed to sync update to HRMS', 'error');
    } finally {
      setSyncingSheet(false);
    }
  };

  const handleInputChange = (date, slot, value) => {
    if (isReadOnly) return;
    setWeekTasks(prev => ({
      ...prev,
      [`${date}_${slot}`]: value
    }));
  };

  const handleAutoSave = async () => {
    if (isReadOnly) return;
    setIsAutoSaving(true);
    try {
      const tasksToSubmit = [];
      Object.entries(weekTasks).forEach(([key, title]) => {
        const [date, slotKey] = key.split('_');
        tasksToSubmit.push({ date, slotKey, title: title || '', status: 'Completed' });
      });

      await api.post('/employee/tasks/bulk', {
        employeeId: effectiveUserId,
        tasks: tasksToSubmit,
        dates: weekDates,
        dailyRemarks,
        weeklyRemarks: weekRemarks
      });
    } catch (err) {
      console.error('Error auto-saving timesheet:', err);
    } finally {
      setTimeout(() => setIsAutoSaving(false), 1000);
    }
  };

  const handleSubmit = async () => {
    if (isReadOnly) return;
    setSubmitting(true);
    try {
      await handleAutoSave();
      
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      // Calculate login/logout time based on tasks for the selected date
      let loginTime = null;
      let logoutTime = null;
      const hourlyTasks = [];
      
      Object.entries(weekTasks).forEach(([key, title]) => {
        if (title.trim()) {
          const [tDate, slotKey] = key.split('_');
          if (tDate === dateStr) {
            hourlyTasks.push({ date: tDate, slotKey, title, status: 'Completed' });
            const startStr = slotKey.split(' - ')[0].trim();
            const endStr = slotKey.split(' - ')[1].trim();
            
            // simple conversion to AM/PM for logic
            const formatAmPm = (time) => {
              const [h, m] = time.split(':').map(Number);
              const suffix = h >= 12 ? 'PM' : 'AM';
              const hour12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
              return `${hour12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${suffix}`;
            };

            const startFormatted = formatAmPm(startStr);
            const endFormatted = formatAmPm(endStr);
            
            if (!loginTime) loginTime = startFormatted;
            logoutTime = endFormatted; // will end up being the last one
          }
        }
      });
      
      await api.post('/timesheets/submit', {
        employeeId: effectiveUserId,
        date: dateStr,
        weekStart: weekDates[0],
        weekEnd: weekDates[6],
        loginTime,
        logoutTime,
        hourlyTasks,
        dailyRemarks: dailyRemarks[dateStr] || '',
        weeklyRemarks: weekRemarks
      });

      showToast('Timesheet submitted successfully');
    } catch (err) {
      showToast('Failed to submit timesheet', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    if (isReadOnly) return;
    if (window.confirm('Are you sure you want to clear all inputs for this week?')) {
      setWeekTasks({});
      setWeekRemarks('');
    }
  };

  const navigateWeek = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + (direction * 7));
    setSelectedDate(newDate);
  };

  const formatDateLabel = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const renderContent = () => (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Top Banner when viewing an employee schedule */}
      {(isReadOnly || targetEmployeeId || embedded) && (
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 rounded-3xl shadow-xl flex flex-wrap items-center justify-between gap-4 border border-blue-500/20">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-white/15 active:scale-95 cursor-pointer shadow-sm"
              >
                <ChevronLeft size={16} /> Back to All Reports
              </button>
            )}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 border border-blue-400/30 flex items-center justify-center font-black text-base text-white shadow-md overflow-hidden shrink-0">
              {employeeProfile?.profileImage ? (
                <img src={employeeProfile.profileImage} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} />
              ) : (
                (employeeProfile?.fullName || targetEmployeeName || 'E').charAt(0)
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black text-white">
                  {employeeProfile?.fullName || targetEmployeeName || 'Employee Work Report'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  {employeeProfile?.empCode || 'EMP'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/20">
                  {employeeProfile?.department || 'Department'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Active Slot Unlocked
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-500/20 text-slate-300 border border-slate-400/20 flex items-center gap-1">
                  <Lock size={10} /> Past Slots Locked
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Viewing employee work timesheet. Only the currently active timeslot is unlocked for editing; all other slots remain locked.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Close View
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
           <nav className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              <span>Hourly Report</span>
              <ChevronRight size={12} />
              <span className="text-blue-500">New Timesheet</span>
           </nav>
           <h2 className="text-3xl font-black text-[#1e293b] flex items-center gap-3">
             Hourly Report - Daily Timesheet
             {isAutoSaving && (
               <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md ml-2">
                 <Loader2 size={12} className="animate-spin" /> Auto-saving...
               </span>
             )}
           </h2>
           <p className="text-slate-400 text-sm font-medium">Fill your work hours and tasks for the day (Auto-saves as you type)</p>
         </div>

         {toast && (
           <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-bold animate-in slide-in-from-right-4 ${
             toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
           }`}>
             {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
             {toast.msg}
           </div>
         )}

         <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
               <button onClick={() => navigateWeek(-1)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                  <ChevronLeft size={18} className="text-slate-600" />
               </button>
               <div className="px-4 py-2 flex items-center gap-3 border-x border-slate-100">
                  <Calendar size={18} className="text-blue-500" />
                  <span className="text-sm font-black text-[#1e293b]">
                    {formatDateLabel(weekDates[0])} - {formatDateLabel(weekDates[6])}
                  </span>
               </div>
               <button onClick={() => navigateWeek(1)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                  <ChevronRight size={18} className="text-slate-600" />
               </button>
            </div>
            <div className="relative group">
              <input 
                type="date" 
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="px-6 py-3.5 bg-white border border-slate-100 rounded-2xl text-xs font-black text-[#1e293b] outline-none shadow-sm focus:ring-4 focus:ring-blue-500/5 transition-all cursor-pointer"
              />
            </div>
         </div>
      </div>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pt-6">
         <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-center items-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Work Hours</p>
            <h3 className="text-2xl font-black text-slate-800">
               {Math.floor(timesheets.reduce((acc, r) => {
                 const h = r.totalHours?.match(/(\d+)h/);
                 return acc + (h ? parseInt(h[1]) : 0);
               }, 0))}h {timesheets.reduce((acc, r) => {
                 const m = r.totalHours?.match(/(\d+)m/);
                 return acc + (m ? parseInt(m[1]) : 0);
               }, 0) % 60}m
            </h3>
            <p className="text-[10px] font-bold text-emerald-500 mt-1 uppercase tracking-widest">This Month</p>
         </div>
         <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-center items-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Overtime</p>
            <h3 className="text-2xl font-black text-slate-800">
               {Math.floor(timesheets.reduce((acc, r) => {
                 const h = r.overtime?.match(/(\d+)h/);
                 return acc + (h ? parseInt(h[1]) : 0);
               }, 0))}h {timesheets.reduce((acc, r) => {
                 const m = r.overtime?.match(/(\d+)m/);
                 return acc + (m ? parseInt(m[1]) : 0);
               }, 0) % 60}m
            </h3>
            <p className="text-[10px] font-bold text-blue-500 mt-1 uppercase tracking-widest">Extra Hours</p>
         </div>
         <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-center items-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg. Hours / Day</p>
            <h3 className="text-2xl font-black text-slate-800">
               {timesheets.length > 0 ? (
                 Math.floor(timesheets.reduce((acc, r) => {
                   const h = r.totalHours?.match(/(\d+)h/);
                   const m = r.totalHours?.match(/(\d+)m/);
                   return acc + (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0);
                 }, 0) / timesheets.length / 60)
               ) : 0}h {timesheets.length > 0 ? (
                 Math.floor(timesheets.reduce((acc, r) => {
                   const h = r.totalHours?.match(/(\d+)h/);
                   const m = r.totalHours?.match(/(\d+)m/);
                   return acc + (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0);
                 }, 0) / timesheets.length) % 60
               ) : 0}m
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Efficiency Rate</p>
         </div>
         <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-center items-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Submissions</p>
            <h3 className="text-2xl font-black text-slate-800">{timesheets.length}</h3>
            <p className="text-[10px] font-bold text-violet-500 mt-1 uppercase tracking-widest">Monthly Statistics</p>
         </div>
      </div>



      {/* Middle Section: HRMS Report vs Excel Report Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 py-2">
        <button
          type="button"
          onClick={() => setActiveReportTab('hrms')}
          className={`flex items-center gap-2.5 px-7 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
            activeReportTab === 'hrms'
              ? 'bg-[#0f172a] text-white shadow-xl shadow-slate-900/20 scale-[1.02]'
              : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet size={16} className={activeReportTab === 'hrms' ? 'text-blue-400' : 'text-slate-400'} />
          HRMS Report
        </button>

        <button
          type="button"
          onClick={() => setActiveReportTab('excel')}
          className={`flex items-center gap-2.5 px-7 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
            activeReportTab === 'excel'
              ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/25 scale-[1.02]'
              : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
          }`}
        >
          <Download size={16} className={activeReportTab === 'excel' ? 'text-emerald-100' : 'text-emerald-500'} />
          Excel Report
        </button>

        {deptSheet.hasSheet && (
          <a
            href={deptSheet.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 bg-white text-slate-500 border border-slate-200/80 rounded-2xl text-xs font-bold hover:text-emerald-600 hover:border-emerald-300 transition-all shadow-sm"
            title={`Open ${deptSheet.departmentName} Sheet in new tab`}
          >
            <ExternalLink size={15} />
          </a>
        )}
      </div>

      {activeReportTab === 'hrms' ? (
        /* Timesheet Grid */
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center gap-3">
             <Loader2 size={40} className="text-blue-500 animate-spin" />
             <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Timesheet...</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
             <thead>
                <tr className="bg-slate-50/50">
                   <th className="p-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 sticky left-0 bg-slate-50/50 z-10">Time</th>
                   {days.map((day, idx) => (
                     <th key={day} className="p-6 text-left text-[10px] font-black text-[#1e293b] uppercase tracking-widest border-b border-slate-100 min-w-[200px]">
                       <div className="flex flex-col">
                          <span>{day}</span>
                          <span className="text-[9px] text-slate-400 mt-1">{formatDateLabel(weekDates[idx])}</span>
                       </div>
                     </th>
                   ))}
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {timeSlots.map((slot, sIdx) => (
                  <tr key={slot} className="group hover:bg-slate-50/30 transition-colors">
                     <td className="p-6 text-xs font-black text-slate-500 border-r border-slate-50 sticky left-0 bg-white group-hover:bg-slate-50/30 z-10 align-top">{slot}</td>
                     {weekDates.map((date, dIdx) => {
                       const slotState = getSlotState(date, slot);
                       const isActive = !isReadOnly && (slotState.status === 'ACTIVE' || slotState.status === 'GRACE');
                       const isLocked = !isActive;
                       const taskVal = weekTasks[`${date}_${slot}`] || '';
                       const isFuture = slotState.status === 'FUTURE';
                       
                       return (
                         <td key={`${date}-${slot}`} className="p-2.5 border-r border-slate-50 relative align-top">
                            <div 
                              onClick={() => handleOpenSlotModal(date, slot, isLocked, slotState)}
                              className={`relative w-full min-h-[58px] p-3 rounded-2xl border text-xs font-medium transition-all group/cell select-none flex flex-col justify-between ${
                                isActive 
                                  ? 'bg-emerald-50/25 border-emerald-400 text-slate-800 cursor-pointer hover:border-emerald-500 hover:shadow-md ring-2 ring-emerald-500/15' 
                                  : isFuture 
                                    ? 'bg-slate-50/50 border-slate-100 text-slate-400 cursor-pointer opacity-70 hover:border-slate-200' 
                                    : 'bg-slate-100/80 border-slate-200/60 text-slate-600 cursor-pointer hover:border-slate-300 hover:bg-slate-100'
                              }`}
                              title={
                                isActive 
                                  ? "Active timeslot! Click to type or update on big screen." 
                                  : isLocked
                                    ? "Locked timeslot. Click to view on big screen."
                                    : "Future timeslot. Click to view on big screen."
                              }
                            >
                              {/* Task Content Preview */}
                              <div className="leading-relaxed break-words whitespace-pre-wrap line-clamp-3">
                                {taskVal ? (
                                  taskVal
                                ) : (
                                  <span className="text-slate-300 font-normal italic flex items-center gap-1">
                                    {isActive ? 'Click to type...' : isFuture ? 'Future slot' : 'No report'}
                                  </span>
                                )}
                              </div>

                              {/* Bottom cell badges & expand icon */}
                              <div className="mt-2.5 pt-1.5 border-t border-slate-100/70 flex items-center justify-between text-[10px]">
                                {slotState.status === 'LOCKED' && (
                                  <span className="text-slate-400 flex items-center gap-1 font-bold">
                                    <Lock size={10} /> Locked
                                  </span>
                                )}
                                {slotState.status === 'GRACE' && (
                                  <span className="font-black text-orange-600 bg-orange-100/90 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                                    {slotState.countdown} left
                                  </span>
                                )}
                                {slotState.status === 'ACTIVE' && (
                                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Active (Unlocked)
                                  </span>
                                )}
                                {isFuture && (
                                  <span className="text-slate-400 font-medium flex items-center gap-1">
                                    <Lock size={10} /> Future
                                  </span>
                                )}

                                <div className="opacity-0 group-hover/cell:opacity-100 transition-opacity ml-auto flex items-center gap-1">
                                  <span className={`text-[9px] font-bold ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {isActive ? 'Type / Edit' : 'View (Locked)'}
                                  </span>
                                  <Maximize2 size={11} className={isActive ? 'text-emerald-600' : 'text-slate-400'} />
                                </div>
                              </div>
                            </div>
                         </td>
                       );
                     })}
                  </tr>
                ))}
                
                {/* Daily Remarks Row */}
                <tr className="bg-slate-50/30">
                   <td className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 sticky left-0 bg-slate-50 z-10 align-top">Daily Remarks</td>
                   {weekDates.map((date) => {
                     const remarksState = getRemarksState(date);
                     const isActive = !isReadOnly && remarksState === 'ACTIVE';
                     const isLocked = !isActive;
                     const remarkVal = dailyRemarks[date] || '';
                     const isFuture = remarksState === 'FUTURE';
                     
                     return (
                       <td key={`remark-${date}`} className="p-2.5 border-r border-slate-50 relative align-top">
                          <div 
                            onClick={() => handleOpenDailyRemarksModal(date, isLocked, remarksState)}
                            className={`relative w-full min-h-[50px] p-3 rounded-2xl border text-[11px] font-medium transition-all group/cell select-none flex flex-col justify-between ${
                              isActive
                                ? 'bg-emerald-50/25 border-emerald-400 text-slate-800 cursor-pointer hover:border-emerald-500 hover:shadow-md ring-2 ring-emerald-500/15'
                                : isFuture 
                                  ? 'bg-slate-50/50 border-slate-100 text-slate-400 cursor-pointer opacity-70 hover:border-slate-200' 
                                  : 'bg-slate-100/80 border-slate-200/60 text-slate-600 cursor-pointer hover:border-slate-300 hover:bg-slate-100'
                            }`}
                            title={
                              isActive
                                ? "Today's daily remarks! Click to write or edit on big screen." 
                                : isLocked
                                  ? "Locked daily remarks. Click to view on big screen."
                                  : "Future daily remarks. Click to view on big screen."
                            }
                          >
                            <div className="leading-relaxed break-words whitespace-pre-wrap line-clamp-2">
                              {remarkVal ? (
                                remarkVal
                              ) : (
                                <span className="text-slate-300 font-normal italic">
                                  {isActive ? 'Click to write daily notes...' : isFuture ? 'Future date' : 'No notes'}
                                </span>
                              )}
                            </div>

                            <div className="mt-2 pt-1 border-t border-slate-100/70 flex items-center justify-between text-[10px]">
                              {isActive ? (
                                <span className="font-bold text-emerald-600 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  Active (Unlocked)
                                </span>
                              ) : (
                                <span className="text-slate-400 flex items-center gap-1 font-bold">
                                  <Lock size={10} /> Locked
                                </span>
                              )}
                              <div className="opacity-0 group-hover/cell:opacity-100 transition-opacity ml-auto flex items-center gap-1">
                                <span className={`text-[9px] font-bold ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                                  {isActive ? 'Type / Edit' : 'View (Locked)'}
                                </span>
                                <Maximize2 size={11} className={isActive ? 'text-emerald-600' : 'text-slate-400'} />
                              </div>
                            </div>
                          </div>
                       </td>
                     );
                   })}
                </tr>
             </tbody>
          </table>
        </div>

        {/* Footer Remarks */}
        <div className="p-10 bg-slate-50/50 border-t border-slate-100 space-y-6">
           <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Remarks for the Week</label>
                <button
                  type="button"
                  onClick={handleOpenWeeklyRemarksModal}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  <Maximize2 size={13} /> Open in Big Screen
                </button>
              </div>
              <textarea 
                 value={weekRemarks}
                 onChange={(e) => !isReadOnly && setWeekRemarks(e.target.value)}
                 onBlur={isReadOnly ? undefined : handleAutoSave}
                 placeholder={isReadOnly ? (weekRemarks ? "" : "No weekly remarks recorded.") : "Click or type overall productive week notes..."}
                 rows="3"
                 disabled={isReadOnly}
                 readOnly={isReadOnly}
                 className={`w-full p-6 border rounded-[24px] text-sm font-medium outline-none shadow-sm transition-all resize-none ${
                   isReadOnly 
                     ? 'bg-slate-50/70 border-slate-100 text-slate-700 cursor-default select-text' 
                     : 'bg-white border-slate-100 text-[#1e293b] focus:ring-4 focus:ring-blue-500/5'
                 }`}
              ></textarea>
           </div>

           {isReadOnly ? (
             <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-2xl shadow-lg border border-blue-500/20">
               <div className="flex items-center gap-3">
                 <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                   <Lock size={18} />
                 </div>
                 <div>
                   <p className="text-xs font-black uppercase tracking-wider text-blue-200">Admin Read-Only Preview</p>
                   <p className="text-[11px] text-slate-300">
                     Viewing timesheet for {employeeProfile?.fullName || targetEmployeeName || 'Employee'}. Edits, auto-save, and submissions are disabled.
                   </p>
                 </div>
               </div>
               {onBack && (
                 <button 
                   type="button"
                   onClick={onBack}
                   className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
                 >
                   <ChevronLeft size={16} /> Back to Hourly Reports
                 </button>
               )}
             </div>
           ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
                <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-800">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span>Auto-Save Enabled</span>
                </div>
                <p className="text-[11px] font-semibold text-emerald-700">
                  All work updates and remarks are saved automatically in real time — no manual submission required.
                </p>
              </div>
            )}
        </div>
      </div>
      ) : (
        /* Excel Report View */
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
          <div className="p-6 md:p-8 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-bold shadow-sm">
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 tracking-tight">
                  {deptSheet.departmentName} — Work Report
                </h3>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  {deptSheet.hasSheet ? 'Total team work report & timesheets' : 'Work report sheet status'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {!isReadOnly && (
                <>
                  <button
                    type="button"
                    disabled={pullingSheet}
                    onClick={() => handleAutoPullFromSheet(selectedDate.toISOString().split('T')[0], true)}
                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-200 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {pullingSheet ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Pulling from Sheet...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={15} />
                        <span>⚡ 1-Click Sync from Sheet</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSyncModal(true);
                      handleAutoPullFromSheet(syncDate, false);
                    }}
                    className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <UploadCloud size={15} className="text-blue-600" />
                    <span>Sync Options / Preview</span>
                  </button>
                </>
              )}
              {deptSheet.hasSheet && (
                <a
                  href={deptSheet.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
                >
                  <ExternalLink size={15} /> Open in Google Sheets
                </a>
              )}
            </div>
          </div>

          {deptSheet.hasSheet ? (
            <div className="w-full h-[750px] bg-slate-50 relative">
              <iframe
                src={deptSheet.embedUrl}
                title={`${deptSheet.departmentName} Work Report Google Sheet`}
                className="w-full h-full border-0"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="p-16 text-center flex flex-col items-center justify-center gap-4 bg-slate-50/40">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 text-amber-500 flex items-center justify-center font-bold shadow-sm">
                <AlertCircle size={28} />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-800">No Work Report Sheet Assigned</h4>
                <p className="text-xs text-slate-400 max-w-md mt-1 font-medium">
                  No Google Sheet has been assigned for the <span className="font-bold text-slate-700">{deptSheet.departmentName}</span> yet. Please ask your administrator to configure your department sheet in System Settings.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sync Sheet Work Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold shadow-sm">
                  <RefreshCw size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Sync Sheet Work to HRMS</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">
                      Draft Mode
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">
                    Save spreadsheet work updates directly to your database schedule as a Draft
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Notice / Draft status banner */}
            <div className="mt-5 p-4 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-start gap-3">
              <AlertCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900 leading-relaxed">
                <span className="font-bold">Database Draft Guarantee:</span> Work updates are stored in MongoDB as a <span className="font-bold underline">Draft (Pending)</span>. It will <span className="font-bold text-rose-600">NOT</span> submit or notify admin until you are ready and click &quot;Submit Report&quot; on your HRMS timesheet tab.
              </div>
            </div>

            {/* Auto-Pull Banner */}
            <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200">
              <div className="flex items-center gap-2.5">
                <Sparkles size={18} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs font-black text-emerald-950 uppercase tracking-tight">Auto-Pull from Live Sheet</p>
                  <p className="text-[11px] text-emerald-700 font-medium">Read entries for the selected date straight from your Google Sheet</p>
                </div>
              </div>
              <button
                type="button"
                disabled={pullingSheet}
                onClick={() => handleAutoPullFromSheet(syncDate, true)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {pullingSheet ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                <span>{pullingSheet ? 'Syncing...' : '⚡ Auto-Sync Now'}</span>
              </button>
            </div>

            {/* Restricted warning banner if sheet returns 401 */}
            {sheetRestricted && (
              <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <AlertCircle size={16} /> Google Sheet is Currently Restricted (401)
                </div>
                <p className="text-[11px] leading-relaxed">
                  To allow HRMS to auto-read your entries with 1 click, open your Google Sheet, click <strong>Share</strong> (top-right), and change <strong>General access</strong> to <strong>&quot;Anyone with the link can view&quot;</strong>.
                </p>
                <p className="text-[11px] font-semibold text-amber-700">
                  You can also paste your work entries directly in the text box below to save them immediately!
                </p>
              </div>
            )}

            {/* Live Pulled Tasks Preview */}
            {pulledTasksPreview.length > 0 && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Tasks Detected in Google Sheet ({pulledTasksPreview.length})
                  </p>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Saved in Database as Draft
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {pulledTasksPreview.map((t, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 text-xs">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-mono font-bold text-[10px] shrink-0">
                        {t.slotKey}
                      </span>
                      <span className="text-slate-800 font-medium leading-tight">{t.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Body */}
            <div className="mt-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Work Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={syncDate}
                    onChange={(e) => {
                      setSyncDate(e.target.value);
                      handleAutoPullFromSheet(e.target.value, false);
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Manual Work Update / Tasks (Fallback)
                  </label>
                  <span className="text-[11px] font-semibold text-slate-400">
                    One task per line or &quot;TimeSlot: Task&quot;
                  </span>
                </div>
                <textarea
                  rows={5}
                  value={syncText}
                  onChange={(e) => setSyncText(e.target.value)}
                  placeholder={`Paste work entries here if preferred:\n09:30 - 10:30: Daily client coordination & standup\n10:30 - 11:30: Meeting with project lead\n11:30 - 12:30: Updated candidate records & review`}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all resize-y font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Daily Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={syncRemarks}
                  onChange={(e) => setSyncRemarks(e.target.value)}
                  placeholder="e.g. All sprint objectives completed on time without blockers"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              {/* Collapsible Info for Automated Google Apps Script Webhook */}
              <details className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600">
                <summary className="font-bold text-slate-700 cursor-pointer select-none">
                  ⚡ Want Instant Push on Every Cell Edit in Google Sheets?
                </summary>
                <div className="mt-3 text-[11px] leading-relaxed text-slate-600 space-y-2">
                  <p>
                    You can install a simple Apps Script in your Google Sheet under <strong>Extensions &gt; Apps Script</strong> to automatically send every work cell update straight to this HRMS database:
                  </p>
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl overflow-x-auto text-[10px] font-mono leading-relaxed">
{`function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  var row = e.range.getRow();
  if (row <= 1) return; // skip header
  
  var payload = {
    employeeName: sheet.getName(), // or active employee name
    date: Utilities.formatDate(new Date(), "GMT+5:30", "yyyy-MM-dd"),
    title: e.value,
    slotKey: sheet.getRange(row, 1).getValue() || "General"
  };
  
  UrlFetchApp.fetch("https://oditech-hrms-backend-2.onrender.com/api/timesheets/sync-sheet", {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}`}
                  </pre>
                </div>
              </details>
            </div>

            {/* Modal Actions */}
            <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className="px-6 py-3 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              {syncText.trim() && (
                <button
                  type="button"
                  disabled={syncingSheet}
                  onClick={handleSyncFromSheet}
                  className="flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {syncingSheet ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Saving to Database...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Save Manual Tasks (Draft)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* BIG SCREEN WORK REPORT EDITOR MODAL */}
      {activeModalSlot && (
        <div 
          className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setActiveModalSlot(null)}
        >
          <div 
            className="w-full max-w-3xl bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 sm:p-7 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                  <Edit3 size={22} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-[#1e293b]">
                      {activeModalSlot.slotKey}
                    </h3>
                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 shadow-sm flex items-center gap-1.5">
                      <Calendar size={13} className="text-blue-500" />
                      {activeModalSlot.dayLabel}
                    </span>
                    {activeModalSlot.canEdit ? (
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        {activeModalSlot.status === 'GRACE' ? `Grace (${activeModalSlot.countdown} left)` : 'Active • Unlocked'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                        <Lock size={11} />
                        {isReadOnly ? 'Admin View Only' : 'Locked (Editing Closed)'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-400 mt-1">
                    {activeModalSlot.canEdit 
                      ? 'Type your detailed hourly work report, deliverables, or progress below.'
                      : isReadOnly 
                        ? 'Admin view-only mode. All recorded work text is visible below.' 
                        : 'This timeslot is locked. Only the currently active timeslot can be edited.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModalSlot(null)}
                className="w-10 h-10 rounded-2xl bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center border border-slate-200 transition-colors shadow-sm cursor-pointer"
                title="Close (Esc)"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: Spacious Big Screen Textarea */}
            <div className="p-6 sm:p-8 flex-1 overflow-y-auto space-y-4">
              <div className="relative">
                <textarea
                  ref={modalTextareaRef}
                  value={modalText}
                  onChange={(e) => activeModalSlot.canEdit && setModalText(e.target.value)}
                  onKeyDown={(e) => {
                    if (activeModalSlot.canEdit && (e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveModalSlot();
                    } else if (e.key === 'Escape') {
                      setActiveModalSlot(null);
                    }
                  }}
                  readOnly={!activeModalSlot.canEdit}
                  rows={10}
                  placeholder={
                    activeModalSlot.canEdit
                      ? "Write detailed tasks, bullet points, meetings, code changes, or client updates for this active hour...\n\nExample:\n• Finished API endpoints for user reports\n• Reviewed team pull requests\n• Coordinated sprint tasks on Slack"
                      : "No work update was recorded for this slot. This timeslot is locked."
                  }
                  className={`w-full p-6 text-sm sm:text-base leading-relaxed font-medium rounded-2xl outline-none transition-all resize-none shadow-sm min-h-[260px] sm:min-h-[320px] ${
                    activeModalSlot.canEdit
                      ? 'bg-white border-2 border-emerald-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 text-slate-800'
                      : 'bg-slate-100/70 border border-slate-200 text-slate-600 cursor-not-allowed select-text'
                  }`}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
                <span>
                  {modalText.trim() ? modalText.trim().split(/\s+/).length : 0} words
                </span>
                <span>•</span>
                <span>{modalText.length} characters</span>
                {activeModalSlot.canEdit && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline text-slate-400">
                      Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-600 shadow-xs">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-600 shadow-xs">Enter</kbd> to save
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setActiveModalSlot(null)}
                  className="px-6 py-3 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-200/80 transition-colors cursor-pointer"
                >
                  {activeModalSlot.canEdit ? 'Cancel' : 'Close'}
                </button>

                {activeModalSlot.canEdit && (
                  <>
                    {modalText.trim() && (
                      <button
                        type="button"
                        onClick={() => setModalText('')}
                        className="px-4 py-3 rounded-2xl text-xs font-bold text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Eraser size={15} /> Clear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveModalSlot}
                      className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-500/25 active:scale-95 cursor-pointer"
                    >
                      <Check size={16} /> Save & Update Task
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Helper Actions */}
      <div className="flex items-center justify-center gap-8 text-slate-400">
         <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:text-[#1e293b] transition-colors">
            <Printer size={14} /> Print Timesheet
         </button>
         <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:text-[#1e293b] transition-colors">
            <Download size={14} /> Export PDF
         </button>
      </div>
    </div>
  );

  if (embedded) {
    return renderContent();
  }

  return (
    <EmployeeLayout title="Hourly Report" subtitle="Daily Timesheet">
      <div className="max-w-[1600px] mx-auto">
        {renderContent()}
      </div>
    </EmployeeLayout>
  );
};

export default EmployeeSchedule;
