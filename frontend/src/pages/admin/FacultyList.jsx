import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Users, Mail } from 'lucide-react';

const FacultyList = () => {
    const [faculty, setFaculty] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('http://localhost:5000/api/faculty')
            .then(res => setFaculty(res.data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div>Loading faculty...</div>;

    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Faculty Directory</h1>
                <p className="text-gray-500 mt-2">Manage and view all registered faculty members.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-sm font-semibold text-gray-600">
                            <th className="p-4">Name</th>
                            <th className="p-4">Department</th>
                            <th className="p-4">Email</th>
                        </tr>
                    </thead>
                    <tbody>
                        {faculty.map((member) => (
                            <tr key={member.faculty_id} className="border-b border-gray-50 hover:bg-blue-50/50 transition-colors">
                                <td className="p-4 flex items-center">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 font-bold text-sm">
                                        {member.faculty_name.charAt(0)}
                                    </div>
                                    <span className="font-medium text-gray-800">{member.faculty_name}</span>
                                </td>
                                <td className="p-4 text-gray-600">{member.department}</td>
                                <td className="p-4 text-gray-500 flex items-center">
                                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                                    {member.email}
                                </td>
                            </tr>
                        ))}
                        {faculty.length === 0 && (
                            <tr>
                                <td colSpan="3" className="p-8 text-center text-gray-500">No faculty records found. Upload via the Uploads tab.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FacultyList;
