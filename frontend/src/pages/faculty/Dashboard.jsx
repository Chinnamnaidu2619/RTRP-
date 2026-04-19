import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { Download, FileText, Calendar } from 'lucide-react';
import { exportToPDF, generateFacultyExcelGrid, downloadWorkbook } from '../../utils/exporter';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIODS = [1, 2, 3, 4, 5, 6];

const PERIOD_TIMES = {
    1: '9:20–10:20',
    2: '10:20–11:20',
    3: '11:20–12:20',
    4: '1:10–2:10',
    5: '2:10–3:10',
    6: '3:10–4:10',
};

const FacultyDashboard = () => {
    const { user } = useAuth();
    const [timetable, setTimetable] = useState([]);
    const [loading, setLoading] = useState(true);
    const printRef = useRef(null);

    useEffect(() => {
        if (user?.faculty_id) {
            axios.get(`http://localhost:5000/api/timetable/faculty/${user.faculty_id}`)
                .then(res => setTimetable(res.data))
                .catch(err => console.error('Timetable load error:', err.response || err))
                .finally(() => setLoading(false));
        }
    }, [user]);

    // Build lookup: grid[day][period] = entry (main role takes priority over viva)
    const grid = {};
    for (const day of DAYS) {
        grid[day] = {};
        for (const p of PERIODS) grid[day][p] = null;
    }
    for (const entry of timetable) {
        if (!grid[entry.day]) continue;
        const existing = grid[entry.day][entry.period];
        if (!existing || entry.role === 'main') {
            grid[entry.day][entry.period] = entry;
        }
    }

    const formatSection = (year, name) => {
        const prefix = `${year}-CSE-`;
        const letter = name.split('-').pop();
        return `${['', 'I', 'II', 'III', 'IV'][year] || year}-CSE-${year}-CSE-${letter}`;
    };

    const getSectionLabel = (entry) => {
        if (!entry) return '';
        const letter = entry.section_name.split('-').pop();
        const roman = ['', 'I', 'II', 'III', 'IV'][entry.year] || entry.year;
        return `${roman}-CSE-${entry.year}-CSE-${letter}`;
    };

    // Simpler section label: III-CSE-3-CSE-A style from screenshot
    const sectionLabel = (entry) => {
        if (!entry) return '';
        const letter = entry.section_name.split('-').pop();
        const roman = ['', 'I', 'II', 'III', 'IV'][entry.year] || String(entry.year);
        return `${roman}-CSE-${entry.year}-CSE-${letter}`;
    };

    const handleDownloadPDF = () => {
        exportToPDF(printRef.current, `Timetable_${user.name?.replace(/\s+/g, '_')}.pdf`);
    };

    const handleDownloadExcel = () => {
        const ws = generateFacultyExcelGrid(timetable, user.name);
        downloadWorkbook({ 'My_Timetable': ws }, `Timetable_${user.name?.replace(/\s+/g, '_')}.xlsx`);
    };

    if (loading) return <div className="text-center mt-10 text-gray-500">Loading personal schedule...</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Welcome, {user?.name}</h2>
                    <p className="text-gray-500 mt-2">Here is your personalized weekly teaching schedule.</p>
                </div>
                <div className="flex flex-wrap gap-3 mt-6 md:mt-0">
                    <button
                        onClick={handleDownloadPDF}
                        disabled={timetable.length === 0}
                        className="bg-red-50 text-red-600 hover:bg-red-100 px-6 py-3 rounded-xl flex items-center font-semibold transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                        <FileText className="w-5 h-5 mr-2" /> PDF
                    </button>
                    <button
                        onClick={handleDownloadExcel}
                        disabled={timetable.length === 0}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl flex items-center font-semibold transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                        <Download className="w-5 h-5 mr-2" /> Excel
                    </button>
                </div>
            </div>

            {timetable.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-2xl border border-gray-100 shadow-sm text-gray-500">
                    No classes assigned yet. Please contact administration.
                </div>
            ) : (
                <div ref={printRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center">
                            <Calendar className="w-5 h-5 mr-2 text-indigo-600" />
                            My Weekly Timetable (Workload = {timetable.length} hours)
                        </h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-r border-gray-200 text-center w-24">
                                        DAY / PERIOD
                                    </th>
                                    {PERIODS.map(p => (
                                        <React.Fragment key={p}>
                                            {p === 4 && (
                                                <th className="p-3 text-xs font-bold text-amber-500 uppercase tracking-wider border-r border-gray-200 text-center w-16">
                                                    LUNCH
                                                </th>
                                            )}
                                            <th className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-r border-gray-200 text-center">
                                                <div>PERIOD {p}</div>
                                                <div className="text-[10px] font-normal text-gray-400 mt-0.5">{PERIOD_TIMES[p]}</div>
                                            </th>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {DAYS.map((day, dayIdx) => (
                                    <tr key={day} className={dayIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                        <td className="p-3 font-semibold text-gray-700 border-r border-gray-200 text-center text-sm">
                                            {day}
                                        </td>
                                        {PERIODS.map(p => {
                                            const entry = grid[day][p];
                                            const letter = entry?.section_name?.split('-').pop();
                                            const roman = entry ? (['', 'I', 'II', 'III', 'IV'][entry.year] || String(entry.year)) : '';
                                            const secLabel = entry ? `${roman}-CSE-${entry.year}-CSE-${letter}` : '';
                                            const isLab = entry?.subject_type === 'Lab';

                                            return (
                                                <React.Fragment key={p}>
                                                    {p === 4 && (
                                                        <td className="border-r border-gray-200 bg-amber-50/40 w-16">
                                                            <div className="h-full flex items-center justify-center">
                                                                <div className="w-0.5 h-16 bg-amber-200 mx-auto"></div>
                                                            </div>
                                                        </td>
                                                    )}
                                                    <td className="p-2 border-r border-gray-200 align-top min-w-[130px]">
                                                        {entry ? (
                                                            <div className={`rounded-xl p-2.5 text-center ${isLab ? 'bg-purple-50 border border-purple-100' : 'bg-indigo-50 border border-indigo-100'}`}>
                                                                <div className={`font-bold text-xs leading-tight mb-1 ${isLab ? 'text-purple-800' : 'text-indigo-800'}`}>
                                                                    {entry.subject_name}
                                                                </div>
                                                                <div className={`text-[10px] font-semibold mb-1 ${isLab ? 'text-purple-500' : 'text-green-500'}`}>
                                                                    {secLabel}
                                                                </div>
                                                                {isLab && entry.viva_faculty_name && (
                                                                    <div className="text-[10px] text-purple-600 mb-1 flex items-center justify-center gap-0.5">
                                                                        <span className={`px-1 rounded font-bold text-[8px] ${entry.role === 'viva' ? 'bg-orange-200 text-orange-700' : 'bg-purple-200 text-purple-700'}`}>
                                                                            {entry.role === 'viva' ? 'YOU ARE VIVA' : 'VIVA'}
                                                                        </span>
                                                                        <span>{entry.viva_faculty_name}</span>
                                                                    </div>
                                                                )}
                                                                <div className="text-[10px] text-gray-400 flex items-center justify-center gap-0.5">
                                                                    <span>⊞</span>
                                                                    <span>{entry.room_id}</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-center text-gray-200 text-lg py-4">—</div>
                                                        )}
                                                    </td>
                                                </React.Fragment>
                                            );
                                        })}
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

export default FacultyDashboard;
