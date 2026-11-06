import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import { Edit2, Check, X, Users, UserX } from 'lucide-react';
import api from '../services/api';

const MailsTable = ({ employees, editingId, editForm, setEditForm, onEditClick, onSave, onCancel }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200">
          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee Name</th>
          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee Code</th>
          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email (Gmail)</th>
          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Password</th>
          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {employees.map(emp => (
          <tr key={emp._id} className="hover:bg-slate-50 transition-colors">
            <td className="px-6 py-4 text-sm font-bold text-slate-700">{emp.fullName}</td>
            <td className="px-6 py-4 text-sm text-slate-600 font-bold bg-slate-50/50">{emp.empCode}</td>
            <td className="px-6 py-4 text-sm text-slate-600">
              {editingId === emp._id ? (
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500"
                  placeholder="Employee Email"
                />
              ) : (
                emp.gmailCredential || <span className="text-slate-300 italic text-xs">Not set</span>
              )}
            </td>
            <td className="px-6 py-4 text-sm text-slate-600">
              {editingId === emp._id ? (
                <input
                  type="text"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500"
                  placeholder="Password"
                />
              ) : (
                emp.credentialPassword || <span className="text-slate-300 italic text-xs">Not set</span>
              )}
            </td>
            <td className="px-6 py-4 text-right">
              {editingId === emp._id ? (
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => onSave(emp._id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Save">
                    <Check size={18} />
                  </button>
                  <button onClick={onCancel} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg" title="Cancel">
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <button onClick={() => onEditClick(emp)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit Credentials">
                  <Edit2 size={16} />
                </button>
              )}
            </td>
          </tr>
        ))}
        {employees.length === 0 && (
          <tr>
            <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No employees found.</td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const AdminEmployeeMails = () => {
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'ex'
  const [employees, setEmployees] = useState([]);
  const [exEmployees, setExEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ email: '', password: '' });
  const navigate = useNavigate();

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [activeRes, exRes] = await Promise.all([
        api.get('/admin/employees'),
        api.get('/admin/employees/ex'),
      ]);
      if (activeRes.data.success) setEmployees(activeRes.data.employees);
      if (exRes.data.success) setExEmployees(exRes.data.employees || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleEditClick = (emp) => {
    setEditingId(emp._id);
    setEditForm({
      email: emp.gmailCredential || emp.email || '',
      password: emp.credentialPassword || ''
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({ email: '', password: '' });
  };

  const handleSave = async (id) => {
    try {
      const response = await api.patch(`/admin/employees/${id}/credentials`, {
        gmailCredential: editForm.email,
        credentialPassword: editForm.password
      });
      if (response.data.success) {
        const updater = list => list.map(emp =>
          emp._id === id
            ? { ...emp, gmailCredential: editForm.email, credentialPassword: editForm.password }
            : emp
        );
        setEmployees(updater);
        setExEmployees(updater);
        setEditingId(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating credentials');
    }
  };

  const currentList = activeTab === 'active' ? employees : exEmployees;

  return (
    <AdminLayout title="Employee Mails & Credentials" subtitle="Manage and store all employee emails and passwords.">
      {/* Back link */}
      <div className="mb-6 flex justify-start">
        <button onClick={() => navigate('/admin/employees')} className="text-sm font-bold text-blue-600 hover:underline">
          &larr; Back to Employees
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => { setActiveTab('active'); handleCancel(); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
            activeTab === 'active'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Users size={16} />
          Active Employees
          <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black ${activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
            {employees.length}
          </span>
        </button>
        <button
          onClick={() => { setActiveTab('ex'); handleCancel(); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
            activeTab === 'ex'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
          }`}
        >
          <UserX size={16} />
          Ex-Employees
          <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black ${activeTab === 'ex' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-600'}`}>
            {exEmployees.length}
          </span>
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 font-medium">Loading...</div>
        ) : (
          <MailsTable
            employees={currentList}
            editingId={editingId}
            editForm={editForm}
            setEditForm={setEditForm}
            onEditClick={handleEditClick}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminEmployeeMails;
