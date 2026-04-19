import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Calendar, Download, Building, FileText, Users, RefreshCw } from 'lucide-react';
import { exportToPDF, generateFacultyExcelGrid, downloadWorkbook } from '../../utils/exporter';

const TODAY = new Date().toISOString().split('T')[0];

const FacultyTimetable = () => {
    const [faculties, setFaculties] = useState([]);
    const [selectedFacultyId, setSelectedFacultyId] = useState('');
    const [timetable, setTimetable] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewDate, setViewDate] = useState(TODAY);
    const [substitutions, setSubstitutions] = useState({});
    const printRef = useRef();
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        // Fetch all faculties
        axios.get('http://localhost:5000/api/faculty', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
        .then(res => setFaculties(res.data))
        .catch(err => console.error(err));
    }, []);

    useEffect(() => {
        if (!selectedFacultyId) {
            setTimetable([]);
            return;
        }

        setLoading(true);
        axios.get(`http://localhost:5000/api/timetable/faculty/${selectedFacultyId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
        .then(res => {
            setTimetable(res.data);
            setLoading(false);
        })
        .catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, [selectedFacultyId]);

    useEffect(() => {
        fetchSubstitutions();
    }, [viewDate, selectedFacultyId]);

    const fetchSubstitutions = () => {
        if (!selectedFacultyId) { setSubstitutions({}); return; }
        axios.get(`/api/attendance/substitutes?date=${viewDate}`, { headers })
            .then(r => {
                const map = {};
                r.data.forEach(s => { map[s.timetable_id] = s; });
                setSubstitutions(map);
            })
            .catch(() => setSubstitutions({}));
    };

    const handleDownloadPDF = () => {
        if (timetable.length === 0 || !selectedFacultyId) return;
        const faculty = faculties.find(f => f.faculty_id === parseInt(selectedFacultyId));
        exportToPDF(printRef.current, `Timetable_${faculty?.faculty_name.replace(/\s+/g, '_')}.pdf`);
    };

    const handleDownloadExcel = () => {
        if (timetable.length === 0 || !selectedFacultyId) return;

        const faculty = faculties.find(f => f.faculty_id === parseInt(selectedFacultyId));
        const filename = `Timetable_${faculty?.faculty_name.replace(/\s+/g, '_')}.xlsx`;
        
        const ws = generateFacultyExcelGrid(timetable, faculty.faculty_name);
        downloadWorkbook({ [faculty.faculty_name]: ws }, filename);
    };

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const periods = [1, 2, 3, 4, 5, 6];

    const getSlot = (day, period) => {
        return timetable.find(t => t.day === day && t.period === period);
    };

    const displaySectionName = (year, name) => {
        const yearMap = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
        return `${yearMap[year] || year}-CSE-${name}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <Users className="w-8 h-8 text-indigo-600" />
                        Faculty Schedules
                    </h1>
                    <p className="text-gray-500 mt-2">View and export individual faculty timetables.</p>
                </div>
                
                <div className="flex gap-3 flex-wrap">
                    <select
                        className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={selectedFacultyId}
                        onChange={(e) => setSelectedFacultyId(e.target.value)}
                    >
                        <option value="">Select Faculty...</option>
                        {faculties.map(f => (
                            <option key={f.faculty_id} value={f.faculty_id}>
                                {f.faculty_name} ({f.department})
                            </option>
                        ))}
                    </select>
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <input
                            type="date"
                            value={viewDate}
                            onChange={e => setViewDate(e.target.value)}
                            className="text-sm bg-transparent outline-none text-gray-700"
                        />
                        <button onClick={fetchSubstitutions} title="Refresh">
                            <RefreshCw className="w-4 h-4 text-gray-400 hover:text-indigo-500 transition" />
                        </button>
                    </div>
                    <button
                        onClick={handleDownloadPDF}
                        disabled={timetable.length === 0 || !selectedFacultyId}
                        className="flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                        <FileText className="w-5 h-5 mr-2" /> PDF
                    </button>
                    <button
                        onClick={handleDownloadExcel}
                        disabled={timetable.length === 0 || !selectedFacultyId}
                        className="flex items-center px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-50"
                    >
                        <Download className="w-5 h-5 mr-2" /> Excel
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10 text-gray-500">Loading timetable...</div>
            ) : selectedFacultyId && timetable.length > 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" ref={printRef}>
                    <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-800">
                            {faculties.find(f => f.faculty_id === parseInt(selectedFacultyId))?.faculty_name}'s Timetable (Workload = {timetable.length} hours)
                        </h2>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-100/50">
                                <tr>
                                    <th className="px-4 py-3 border-b border-r bg-gray-50 text-center w-32">Day / Period</th>
                                    {periods.map(p => (
                                        <React.Fragment key={p}>
                                            <th className="px-4 py-3 border-b text-center font-bold text-gray-600 w-40">Period {p}</th>
                                            {p === 3 && <th className="px-4 py-3 border-b bg-amber-50 text-amber-700 text-center w-24">LUNCH</th>}
                                        </React.Fragment>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {days.map(day => (
                                    <tr key={day} className="border-b last:border-0 hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-4 font-semibold text-gray-900 border-r bg-gray-50/30 text-center">
                                            {day}
                                        </td>
                                        {periods.map(p => {
                                            const slot = getSlot(day, p);
                                            const sub = slot ? substitutions[slot.id] : null;
                                            // For faculty view: this faculty is the absent one if a sub exists for their slot
                                            const isAbsent = sub && sub.original_faculty_id === parseInt(selectedFacultyId);
                                            return (
                                                <React.Fragment key={p}>
                                                    <td className="px-3 py-3 text-center border-r last:border-r-0">
                                                        {slot ? (
                                                            <div className={`flex flex-col gap-1 p-2 rounded-lg border w-full min-h-[5rem] justify-center shadow-sm ${
                                                                isAbsent
                                                                    ? 'bg-red-50 border-red-200'
                                                                    : sub
                                                                        ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-300'
                                                                        : 'bg-indigo-50 border-indigo-100/50'
                                                            }`}>
                                                                {sub && (
                                                                    <span className="text-[9px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full w-max mx-auto uppercase tracking-wide">
                                                                        {isAbsent ? 'Absent' : 'Substitution'}
                                                                    </span>
                                                                )}
                                                                <span className="font-bold text-indigo-700 line-clamp-2" title={slot.subject_name}>
                                                                    {slot.subject_name}
                                                                </span>
                                                                {sub && !isAbsent && (
                                                                    <span className="text-[10px] text-red-400 line-through">{sub.original_faculty_name}</span>
                                                                )}
                                                                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 py-0.5 px-2 rounded-full w-max mx-auto border border-emerald-100">
                                                                    {displaySectionName(slot.year, slot.section_name)}
                                                                </span>
                                                                <div className="flex items-center justify-center gap-1 text-xs text-indigo-500/80 mt-1">
                                                                    <Building className="w-3 h-3" />
                                                                    <span>{slot.room_id}</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-300">-</span>
                                                        )}
                                                    </td>
                                                    {p === 3 && (
                                                        <td className="px-2 py-3 bg-amber-50 border-r border-amber-100">
                                                            <div className="h-full flex items-center justify-center">
                                                                <div className="w-1 h-12 bg-amber-200/50 rounded-full"></div>
                                                            </div>
                                                        </td>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : selectedFacultyId ? (
                <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-500">No classes assigned to this faculty member.</p>
                </div>
            ) : (
                <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <Calendar className="w-16 h-16 mx-auto text-gray-200 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Select a Faculty</h3>
                    <p className="text-gray-500">Choose a faculty member from the dropdown to view their timetable.</p>
                </div>
            )}
        </div>
    );
};

export default FacultyTimetable;
