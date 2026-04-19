import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { FlaskConical, FileText } from 'lucide-react';
import { exportToPDF } from '../../utils/exporter';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIODS = [1, 2, 3, 4, 5, 6];

const SLOT_TIMES = {
    1: '9:20-10:20', 2: '10:20-11:20', 3: '11:20-12:20',
    4: '1:10-2:10',  5: '2:10-3:10',   6: '3:10-4:10',
};

const LabTimetable = () => {
    const [labs, setLabs] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState('');
    const [loading, setLoading] = useState(true);
    const printRef = useRef();

    useEffect(() => {
        axios.get('http://localhost:5000/api/timetable/labs', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(res => {
            setLabs(res.data);
            // Auto-select first room
            const rooms = [...new Set(res.data.map(r => r.room_id))].sort();
            if (rooms.length > 0) setSelectedRoom(rooms[0]);
        }).catch(console.error)
        .finally(() => setLoading(false));
    }, []);

    const labRooms = [...new Set(labs.map(r => r.room_id))].sort();
    const filtered = labs.filter(l => !selectedRoom || l.room_id === selectedRoom);

    const getSlot = (day, period) =>
        filtered.find(l => l.day === day && l.period === period);

    const handleDownloadPDF = () => {
        exportToPDF(printRef.current, `Lab_Timetable_${selectedRoom || 'All'}.pdf`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                        <FlaskConical className="w-7 h-7 text-purple-600" /> Lab Timetable
                    </h1>
                    <p className="text-gray-500 mt-1">View lab room schedules and individual lab sessions</p>
                </div>
                <div className="flex gap-3 items-center">
                    <select
                        value={selectedRoom}
                        onChange={e => setSelectedRoom(e.target.value)}
                        className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                    >
                        <option value="">All Lab Rooms</option>
                        {labRooms.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <button
                        onClick={handleDownloadPDF}
                        disabled={labs.length === 0}
                        className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium disabled:opacity-40"
                    >
                        <FileText className="w-4 h-4" /> PDF
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center p-12 text-gray-400">Loading lab schedule...</div>
            ) : labs.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-2xl border border-gray-100 shadow-sm text-gray-500">
                    No lab sessions found. Generate the timetable first.
                </div>
            ) : (
                <div ref={printRef} className="space-y-8">
                    {(selectedRoom ? [selectedRoom] : labRooms).map(room => {
                        const roomSlots = labs.filter(l => l.room_id === room);
                        const getCell = (day, period) => roomSlots.find(l => l.day === day && l.period === period);

                        return (
                            <div key={room} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="bg-purple-600 px-6 py-4 flex items-center gap-3">
                                    <FlaskConical className="w-5 h-5 text-white" />
                                    <h2 className="text-lg font-bold text-white">Lab Room: {room}</h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-center border-collapse text-sm">
                                        <thead>
                                            <tr className="bg-gray-50">
                                                <th className="p-3 border-b border-r border-gray-200 font-bold text-gray-600 text-xs uppercase w-28">Day</th>
                                                {PERIODS.map(p => (
                                                    <React.Fragment key={p}>
                                                        <th className="p-3 border-b border-gray-200 font-bold text-gray-600 text-xs uppercase">
                                                            P{p}<br/><span className="font-normal text-gray-400">{SLOT_TIMES[p]}</span>
                                                        </th>
                                                        {p === 3 && <th className="p-3 border-b border-gray-200 bg-orange-50 text-orange-400 text-[10px] font-bold w-10">LUNCH</th>}
                                                    </React.Fragment>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {DAYS.map(day => (
                                                <tr key={day} className="hover:bg-gray-50">
                                                    <td className="p-3 border-b border-r border-gray-200 font-semibold text-gray-700 bg-gray-50 text-xs">{day}</td>
                                                    {PERIODS.map(period => {
                                                        const slot = getCell(day, period);
                                                        return (
                                                            <React.Fragment key={period}>
                                                                <td className="p-1.5 border-b border-gray-100 min-w-[120px] align-top">
                                                                    {slot ? (
                                                                        <div className="bg-purple-50 border border-purple-100 rounded-lg p-2 text-left">
                                                                            <div className="font-bold text-gray-900 text-[10px] leading-tight">{slot.subject_name}</div>
                                                                            <div className="text-[9px] text-purple-600 font-medium mt-0.5">{slot.faculty_name}</div>
                                                                            <div className="text-[9px] text-gray-400 mt-0.5">{slot.section_name} · Y{slot.year}</div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-gray-200 text-[10px]">—</div>
                                                                    )}
                                                                </td>
                                                                {period === 3 && <td className="border-b border-orange-100 bg-orange-50/20" />}
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

export default LabTimetable;
