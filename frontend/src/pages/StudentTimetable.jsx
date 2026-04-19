import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Calendar, Download, Building, FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { exportToPDF, generateExcelGrid, downloadWorkbook } from '../utils/exporter';

const StudentTimetable = () => {
    const [timetable, setTimetable] = useState([]);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSection, setSelectedSection] = useState({ name: '', year: 0 });
    const printRef = useRef(null);

    const displaySectionName = (year, name) => {
        let cleanName = name.startsWith(`${year}-`) ? name : `${year}-${name}`;
        return cleanName.toUpperCase();
    };

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const periods = [1, 2, 3, 4, 5, 6];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [sectionsRes, timetableRes] = await Promise.all([
                    axios.get('http://localhost:5000/api/sections'),
                    axios.get('http://localhost:5000/api/timetable')
                ]);

                const uniqueSet = new Set();
                const filteredSections = [];
                
                sectionsRes.data
                    .filter(sec => sec.year >= 2)       // only II/III/IV
                    .sort((a, b) => {
                        if (a.year !== b.year) return a.year - b.year;
                        return a.section_name.localeCompare(b.section_name);
                    })
                    .forEach(sec => {
                        const displayName = displaySectionName(sec.year, sec.section_name);
                        if (!uniqueSet.has(displayName)) {
                            uniqueSet.add(displayName);
                            filteredSections.push(sec);
                        }
                    });

                setSections(filteredSections);
                setTimetable(timetableRes.data);
                if (filteredSections.length > 0) {
                    setSelectedSection({
                        name: filteredSections[0].section_name,
                        year: filteredSections[0].year
                    });
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleDownloadPDF = () => {
        exportToPDF(printRef.current, `Timetable_${selectedSection.year}_${selectedSection.name}.pdf`);
    };

    const handleDownloadExcel = () => {
        const sectionData = timetable.filter(t => t.section_name === selectedSection.name && t.year === selectedSection.year);
        const ws = generateExcelGrid(sectionData, displaySectionName(selectedSection.year, selectedSection.name));
        downloadWorkbook({ "Timetable": ws }, `Timetable_${selectedSection.year}_${selectedSection.name}.xlsx`);
    };

    if (loading) return <div className="text-center mt-10">Loading timetables...</div>;

    const sectionData = timetable.filter(t => t.section_name === selectedSection.name && t.year === selectedSection.year);

    const getSlot = (day, period) => {
        return sectionData.find(s => s.day === day && s.period === period);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-center mb-4">
                    <Link to="/" className="flex items-center text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">
                        <ArrowLeft className="w-5 h-5 mr-2" /> Back to Login
                    </Link>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center">
                                <Building className="w-8 h-8 mr-3 text-indigo-600" /> 
                                Student Timetable
                            </h2>
                            <p className="text-gray-500 mt-2">Select your section to view your weekly schedule.</p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                            <select 
                                value={JSON.stringify(selectedSection)}
                                onChange={(e) => setSelectedSection(JSON.parse(e.target.value))}
                                className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 p-3 flex-1 font-medium outline-none"
                            >
                                {sections.map(sec => (
                                    <option key={sec.section_id} value={JSON.stringify({ name: sec.section_name, year: sec.year })}>
                                        {displaySectionName(sec.year, sec.section_name)}
                                    </option>
                                ))}
                            </select>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleDownloadPDF}
                                    className="bg-red-50 text-red-600 hover:bg-red-100 p-3 rounded-xl flex items-center justify-center font-semibold transition-all shadow-sm active:scale-95 whitespace-nowrap"
                                    title="Download PDF"
                                >
                                    <FileText className="w-5 h-5 mr-1" /> PDF
                                </button>
                                <button 
                                    onClick={handleDownloadExcel}
                                    className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-xl flex items-center justify-center font-semibold transition-all shadow-sm active:scale-95 whitespace-nowrap"
                                    title="Download Excel"
                                >
                                    <Download className="w-5 h-5 mr-1" /> Excel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div ref={printRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden print:m-0 print:border-none print:shadow-none">
                    <div className="bg-indigo-50 p-6 border-b border-indigo-100 print:bg-white print:border-gray-800">
                        <h3 className="text-xl font-bold text-indigo-900 print:text-black">
                            {displaySectionName(selectedSection.year, selectedSection.name)} Academic Schedule
                        </h3>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-center border-collapse">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="p-4 border-b border-r border-gray-200 w-32 bg-gray-100 font-bold text-gray-700 uppercase tracking-wider text-xs">
                                        Day / Period
                                    </th>
                                    {periods.map(p => (
                                        <React.Fragment key={p}>
                                            <th className="p-4 border-b border-gray-200 font-bold text-gray-700 uppercase tracking-wider text-xs">
                                                Period {p}
                                            </th>
                                            {p === 3 && (
                                                <th className="p-4 border-b border-gray-200 bg-orange-50 font-bold text-orange-700 uppercase tracking-wider text-[10px] w-12">
                                                    LUNCH
                                                </th>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {days.map(day => (
                                    <tr key={day} className="hover:bg-gray-50 transition-colors group">
                                        <td className="p-4 border-b border-r border-gray-200 font-bold text-gray-800 bg-gray-50 group-hover:bg-gray-100 transition-colors">
                                            {day}
                                        </td>
                                        {periods.map(period => {
                                            const slot = getSlot(day, period);
                                            return (
                                                <React.Fragment key={`${day}-${period}`}>
                                                    <td className="p-3 border-b border-gray-100 relative min-w-[160px] align-top">
                                                        {slot ? (
                                                            <div className={`h-full rounded-xl p-3 text-left border ${
                                                                slot.subject_type === 'Lab' 
                                                                    ? 'bg-purple-50 border-purple-100 hover:border-purple-300' 
                                                                    : 'bg-indigo-50 border-indigo-100 hover:border-indigo-300'
                                                            } transition-colors`}>
                                                                <div className="font-bold text-gray-900 text-sm leading-tight mb-1">
                                                                    {slot.subject_name}
                                                                </div>
                                                                <div className="text-xs font-semibold text-indigo-600 mb-1">
                                                                    {slot.faculty_name}
                                                                </div>
                                                                <div className="flex justify-between items-end mt-2">
                                                                    <span className="text-[10px] font-mono text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                                                                        Room {slot.room_id}
                                                                    </span>
                                                                    {slot.subject_type === 'Lab' && (
                                                                        <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded">
                                                                            LAB
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="h-full flex items-center justify-center text-gray-300 text-sm font-medium italic">
                                                                - Free -
                                                            </div>
                                                        )}
                                                    </td>
                                                    {period === 3 && (
                                                        <td className="border-b border-orange-100 bg-orange-50/30 font-bold text-orange-600/50 [writing-mode:vertical-lr] scale-y-[-1] py-4 text-[10px] tracking-widest">
                                                            LUNCH BREAK
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
            </div>
        </div>
    );
};

export default StudentTimetable;
