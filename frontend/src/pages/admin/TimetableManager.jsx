import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Calendar, Download, RefreshCcw, FileText, FileSpreadsheet } from 'lucide-react';
import { exportToPDF, generateExcelGrid, downloadWorkbook } from '../../utils/exporter';

const TimetableManager = () => {
    const [timetable, setTimetable] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const printRef = useRef(null);

    const fetchTimetable = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:5000/api/timetable');
            setTimetable(res.data);
            return res.data;
        } catch (error) {
            console.error(error);
            return [];
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTimetable();
    }, []);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            await axios.post('http://localhost:5000/api/timetable/generate');
            const data = await fetchTimetable();
            if (data.length > 0) {
                alert('Timetable generated successfully!');
            }
        } catch (error) {
            console.error('Generation Error', error);
            const errorMessage = error.response?.data?.details || error.response?.data?.error || 'Failed to generate. Ensure data is correctly uploaded and there are no conflicts.';
            alert(errorMessage);
        } finally {
            setGenerating(false);
        }
    };

    const handleDownloadPDF = () => {
        exportToPDF(printRef.current, 'Master_Timetable.pdf');
    };

    const handleDownloadExcel = () => {
        try {
            console.log('Generating Excel...', grouped);
            const sections = Object.entries(grouped);
            const sheets = {};
            
            sections.forEach(([name, classes]) => {
                sheets[name] = generateExcelGrid(classes, name);
            });

            if (sections.length === 0) {
                alert('No data to export');
                return;
            }
            
            downloadWorkbook(sheets, "Master_Timetable.xlsx");
        } catch (error) {
            console.error('Excel Export Error:', error);
            alert('Failed to export Excel: ' + error.message);
        }
    };

    // Group by section for display
    const grouped = timetable.reduce((acc, current) => {
        (acc[current.section_name] = acc[current.section_name] || []).push(current);
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Timetable Manager</h1>
                    <p className="text-gray-500 mt-2">Generate, view, and export the master academic schedule.</p>
                </div>
                
                <div className="flex flex-wrap gap-3">
                    <button 
                        onClick={handleGenerate} 
                        disabled={generating}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg flex items-center font-medium transition-colors shadow-sm disabled:opacity-50"
                    >
                        <RefreshCcw className={`w-5 h-5 mr-2 ${generating ? 'animate-spin' : ''}`} />
                        {generating ? 'Generating...' : 'Auto-Generate'}
                    </button>
                    
                    <button 
                        onClick={handleDownloadPDF}
                        disabled={timetable.length === 0}
                        className="bg-red-50 text-red-600 hover:bg-red-100 px-5 py-2.5 rounded-lg flex items-center font-medium transition-colors disabled:opacity-50"
                    >
                        <FileText className="w-5 h-5 mr-2" /> PDF
                    </button>

                    <button 
                        onClick={handleDownloadExcel}
                        disabled={timetable.length === 0}
                        className="bg-green-50 text-green-600 hover:bg-green-100 px-5 py-2.5 rounded-lg flex items-center font-medium transition-colors disabled:opacity-50"
                    >
                        <FileSpreadsheet className="w-5 h-5 mr-2" /> Excel
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center p-12 text-gray-500">Loading schedule...</div>
            ) : timetable.length === 0 ? (
                 <div className="text-center p-12 bg-white rounded-2xl border border-gray-100 shadow-sm text-gray-500">
                     No timetable data found. Upload faculty, subjects, sections and rooms first, then click Auto-Generate.
                 </div>
            ) : (
                <div ref={printRef} className="space-y-8 print:p-8">
                    {/* Render a table for each section */}
                    {Object.entries(grouped).map(([sectionName, classes]) => {
                        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        const periods = [1, 2, 3, 4, 5, 6];
                        const getSlot = (day, period) => classes.find(c => c.day === day && c.period === period);

                        return (
                            <div key={sectionName} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8 print:break-inside-avoid print:shadow-none print:border-none">
                                <div className="bg-indigo-600 px-6 py-4">
                                    <h2 className="text-lg font-bold text-white flex items-center">
                                        <Calendar className="w-5 h-5 mr-3" />
                                        Section {sectionName}
                                    </h2>
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
                                                            P{p}
                                                        </th>
                                                        {p === 3 && (
                                                            <th className="p-4 border-b border-gray-200 bg-orange-50 font-bold text-orange-700 uppercase tracking-wider text-[10px] w-12 text-center">
                                                                LUNCH
                                                            </th>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {days.map(day => (
                                                <tr key={day} className="hover:bg-gray-50 transition-colors">
                                                    <td className="p-4 border-b border-r border-gray-200 font-bold text-gray-800 bg-gray-50 text-center">
                                                        {day}
                                                    </td>
                                                    {periods.map(period => {
                                                        const slot = getSlot(day, period);
                                                        return (
                                                            <React.Fragment key={`${day}-${period}`}>
                                                                <td className="p-1.5 border-b border-gray-100 relative min-w-[130px] align-top">
                                                                    {slot ? (
                                                                        <div className={`h-full rounded-lg p-2 text-left border ${
                                                                            slot.subject_type === 'Lab' 
                                                                                ? 'bg-purple-50 border-purple-100' 
                                                                                : 'bg-indigo-50 border-indigo-100'
                                                                        }`}>
                                                                            <div className="font-bold text-gray-900 text-[10px] leading-tight truncate">
                                                                                {slot.subject_name}
                                                                            </div>
                                                                            <div className="text-[9px] text-indigo-600 font-medium truncate">
                                                                                {slot.faculty_name}
                                                                            </div>
                                                                            <div className="mt-1 flex justify-between items-center">
                                                                                 <span className="text-[8px] font-mono text-gray-400">R-{slot.room_id}</span>
                                                                                 {slot.subject_type === 'Lab' && <span className="text-[8px] font-bold text-purple-600">LAB</span>}
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="h-full flex items-center justify-center text-gray-200 text-[10px]">-</div>
                                                                    )}
                                                                </td>
                                                                {period === 3 && (
                                                                    <td className="border-b border-orange-100 bg-orange-50/10 font-bold text-orange-500/30 [writing-mode:vertical-lr] scale-y-[-1] py-2 text-[8px] tracking-widest text-center">
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
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TimetableManager;
