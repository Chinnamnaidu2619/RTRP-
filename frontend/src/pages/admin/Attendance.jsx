import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { UserX, UserCheck, RefreshCw, Calendar, AlertTriangle } from 'lucide-react';

const TODAY = new Date().toISOString().split('T')[0];

const Attendance = () => {
    const [date, setDate] = useState(TODAY);
    const [faculty, setFaculty] = useState([]);
    const [absences, setAbsences] = useState([]);
    const [substitutes, setSubstitutes] = useState([]);
    const [freeFacultyByPeriod, setFreeFacultyByPeriod] = useState({});
    const [loading, setLoading] = useState(false);
    const [subLoading, setSubLoading] = useState(false);
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        axios.get('/api/faculty', { headers }).then(r => setFaculty(r.data)).catch(console.error);
    }, []);

    useEffect(() => {
        fetchAbsences();
    }, [date]);

    const fetchAbsences = () => {
        setLoading(true);
        Promise.all([
            axios.get(`/api/attendance/absent?date=${date}`, { headers }),
            axios.get(`/api/attendance/substitutes?date=${date}`, { headers }),
        ]).then(([absRes, subRes]) => {
            setAbsences(absRes.data);
            setSubstitutes(subRes.data);
            fetchFreeFacultyForSubstitutes(subRes.data);
        }).catch(console.error)
        .finally(() => setLoading(false));
    };

    const fetchFreeFacultyForSubstitutes = (subs) => {
        const uniquePeriods = [...new Set(subs.map(s => s.period))];
        if (uniquePeriods.length === 0) { setFreeFacultyByPeriod({}); return; }
        Promise.all(
            uniquePeriods.map(p =>
                axios.get(`/api/attendance/free-faculty?date=${date}&period=${p}`, { headers })
                    .then(r => ({ period: p, faculty: r.data }))
                    .catch(() => ({ period: p, faculty: [] }))
            )
        ).then(results => {
            const map = {};
            results.forEach(({ period, faculty }) => { map[period] = faculty; });
            setFreeFacultyByPeriod(map);
        });
    };

    const markAbsent = async (facultyId) => {
        if (absences.find(a => a.faculty_id === facultyId)) return;
        setSubLoading(true);
        try {
            await axios.post('/api/attendance/absent', { faculty_id: facultyId, date }, { headers });
            await fetchAbsences();
        } catch (e) {
            alert(e.response?.data?.error || 'Error marking absent');
        } finally {
            setSubLoading(false);
        }
    };

    const markPresent = async (facultyId) => {
        setSubLoading(true);
        try {
            await axios.delete('/api/attendance/absent', { headers, data: { faculty_id: facultyId, date } });
            await fetchAbsences();
        } catch (e) {
            alert(e.response?.data?.error || 'Error removing absence');
        } finally {
            setSubLoading(false);
        }
    };

    const overrideSubstitute = async (timetableId, newSubId) => {
        try {
            await axios.put(`/api/attendance/substitutes/${timetableId}`, { date, substitute_faculty_id: newSubId }, { headers });
            await fetchAbsences();
        } catch (e) {
            alert(e.response?.data?.error || 'Error updating substitute');
        }
    };

    const absentIds = new Set(absences.map(a => a.faculty_id));
    const periods = [1, 2, 3, 4, 5, 6];
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });

    // Group substitutes by period for the day view
    const subByPeriod = periods.reduce((acc, p) => {
        acc[p] = substitutes.filter(s => s.period === p);
        return acc;
    }, {});

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-2">
                            <UserX className="w-8 h-8 text-orange-500" /> Attendance & Substitutes
                        </h1>
                        <p className="text-gray-500 mt-1">Mark absences and view auto-assigned substitute timetable</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button onClick={fetchAbsences} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition">
                            <RefreshCw className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Faculty Attendance Panel */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-green-500" /> Faculty Attendance — {dayName}
                    </h2>
                    {loading ? (
                        <div className="text-center py-8 text-gray-400">Loading...</div>
                    ) : (
                        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                            {faculty.map(f => {
                                const isAbsent = absentIds.has(f.faculty_id);
                                return (
                                    <div key={f.faculty_id} className={`flex items-center justify-between px-4 py-3 rounded-xl border transition ${isAbsent ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                                        <div>
                                            <p className="font-medium text-gray-800 text-sm">{f.faculty_name}</p>
                                            <p className="text-xs text-gray-400">{f.department}</p>
                                        </div>
                                        <button
                                            disabled={subLoading}
                                            onClick={() => isAbsent ? markPresent(f.faculty_id) : markAbsent(f.faculty_id)}
                                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${isAbsent ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                                        >
                                            {isAbsent ? '✗ Absent' : '✓ Present'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Absent Summary */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" /> Absent Today ({absences.length})
                    </h2>
                    {absences.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <UserCheck className="w-12 h-12 mx-auto mb-2 text-green-300" />
                            <p>All faculty present!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {absences.map(a => {
                                const classCount = substitutes.filter(s => s.original_faculty_id === a.faculty_id).length;
                                return (
                                    <div key={a.absence_id} className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                                        <div>
                                            <p className="font-semibold text-gray-800 text-sm">{a.faculty_name}</p>
                                            <p className="text-xs text-orange-600">{classCount} class{classCount !== 1 ? 'es' : ''} need substitute</p>
                                        </div>
                                        <button
                                            onClick={() => markPresent(a.faculty_id)}
                                            className="text-xs bg-white border border-orange-300 text-orange-600 hover:bg-orange-100 font-medium px-3 py-1.5 rounded-lg transition"
                                        >
                                            Mark Present
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Substitute Timetable */}
            {substitutes.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-500" />
                        Substitute Timetable for {dayName}, {date}
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 border border-gray-200">Period</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 border border-gray-200">Section</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 border border-gray-200">Subject</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 border border-gray-200">Room</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 border border-gray-200">Original Faculty</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 border border-gray-200">Substitute</th>
                                </tr>
                            </thead>
                            <tbody>
                                {substitutes.map((s, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-3 border border-gray-200 font-medium text-blue-700">P{s.period}</td>
                                        <td className="px-4 py-3 border border-gray-200">{s.year}-{s.section_name}</td>
                                        <td className="px-4 py-3 border border-gray-200">
                                            <span className="font-medium">{s.subject_name}</span>
                                            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${s.subject_type === 'Lab' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                                {s.subject_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 border border-gray-200 text-gray-600">{s.room_id}</td>
                                        <td className="px-4 py-3 border border-gray-200">
                                            <span className="line-through text-red-400">{s.original_faculty_name}</span>
                                        </td>
                                        <td className="px-4 py-3 border border-gray-200">
                                            {(() => {
                                                const freeFaculty = freeFacultyByPeriod[s.period] || [];
                                                const currentSubInList = s.substitute_faculty_id && !freeFaculty.find(f => f.faculty_id === s.substitute_faculty_id)
                                                    ? [{ faculty_id: s.substitute_faculty_id, faculty_name: s.substitute_faculty_name + ' (current)' }]
                                                    : [];
                                                const options = [...currentSubInList, ...freeFaculty];
                                                return s.substitute_faculty_name ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-green-700 font-semibold">{s.substitute_faculty_name}</span>
                                                        <select
                                                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
                                                            defaultValue={s.substitute_faculty_id}
                                                            onChange={e => overrideSubstitute(s.timetable_id, e.target.value)}
                                                        >
                                                            {options.map(f => (
                                                                <option key={f.faculty_id} value={f.faculty_id}>{f.faculty_name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-red-500 text-xs">No substitute found</span>
                                                        <select
                                                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
                                                            defaultValue=""
                                                            onChange={e => e.target.value && overrideSubstitute(s.timetable_id, e.target.value)}
                                                        >
                                                            <option value="">Assign manually...</option>
                                                            {freeFaculty.map(f => (
                                                                <option key={f.faculty_id} value={f.faculty_id}>{f.faculty_name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Attendance;
