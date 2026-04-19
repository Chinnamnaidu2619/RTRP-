import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Users, BookOpen, MapPin, Grid } from 'lucide-react';

const Dashboard = () => {
    const [stats, setStats] = useState({
        faculty: 0,
        subjects: 0,
        sections: 0,
        rooms: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/stats');
                setStats(response.data);
                setLoading(false);
            } catch (error) {
                console.error("Failed to fetch stats", error);
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const statCards = [
        { label: 'Total Faculty', count: stats.faculty, icon: Users, color: 'bg-blue-500', trend: '+2 new this week' },
        { label: 'Total Subjects', count: stats.subjects, icon: BookOpen, color: 'bg-emerald-500', trend: 'Latest syllabus' },
        { label: 'Total Sections', count: stats.sections, icon: Grid, color: 'bg-violet-500', trend: 'Active across years' },
        { label: 'Total Rooms', count: stats.rooms, icon: MapPin, color: 'bg-amber-500', trend: 'Labs & Classrooms' }
    ];

    if (loading) return <div className="text-center mt-10">Loading Dashboard...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Overview</h1>
                    <p className="text-gray-500 mt-2">System statistics at a glance.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((card, idx) => {
                    const Icon = card.icon;
                    return (
                        <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">{card.label}</p>
                                    <h3 className="text-4xl font-bold text-gray-900 mt-2">{card.count}</h3>
                                </div>
                                <div className={`${card.color} p-3 rounded-lg text-white shadow-sm`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                            </div>
                            <div className="mt-4 text-sm text-gray-400">
                                {card.trend}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Dashboard;
