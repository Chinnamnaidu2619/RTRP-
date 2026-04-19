import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BookOpen, Clock } from 'lucide-react';

const SubjectsList = () => {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('http://localhost:5000/api/subjects')
            .then(res => setSubjects(res.data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div>Loading subjects...</div>;

    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Subjects Matrix</h1>
                <p className="text-gray-500 mt-2">Overview of all active subjects and their assignments.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-sm font-semibold text-gray-600">
                            <th className="p-4">Code</th>
                            <th className="p-4">Name</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Hours/Week</th>
                            <th className="p-4">Assigned Faculty</th>
                        </tr>
                    </thead>
                    <tbody>
                        {subjects.map((sub) => (
                            <tr key={sub.subject_code} className="border-b border-gray-50 hover:bg-indigo-50/50 transition-colors">
                                <td className="p-4 font-mono text-sm text-indigo-600 font-semibold">{sub.subject_code}</td>
                                <td className="p-4 font-medium text-gray-800 flex items-center">
                                    <BookOpen className="w-4 h-4 mr-2 text-gray-400" />
                                    {sub.subject_name}
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${sub.subject_type === 'Lab' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                        {sub.subject_type}
                                    </span>
                                </td>
                                <td className="p-4 text-gray-600 flex items-center">
                                    <Clock className="w-4 h-4 mr-1 text-gray-400" />
                                    {sub.hours_per_week}h
                                </td>
                                <td className="p-4 text-gray-600">{sub.faculty_name || 'Unassigned'}</td>
                            </tr>
                        ))}
                        {subjects.length === 0 && (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-gray-500">No subjects found. Upload via the Uploads tab.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SubjectsList;
