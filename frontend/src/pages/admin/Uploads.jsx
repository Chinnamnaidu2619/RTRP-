import React, { useState } from 'react';
import axios from 'axios';
import { UploadCloud, CheckCircle, AlertCircle } from 'lucide-react';

const Uploads = () => {
    const [fileStats, setFileStats] = useState({});
    const [error, setError] = useState('');

    const uploadTypes = [
        { id: 'faculty', label: 'Faculty List', description: 'Requires: faculty_name, department, email' },
        { id: 'subject', label: 'Subjects List', description: 'Requires: subject_code, subject_name, subject_type, hours_per_week, faculty_email, year (2/3/4)' },
        { id: 'section', label: 'Sections List', description: 'Requires: section_name, year (format: CSE-2A, CSE-3A, etc.)' },
        { id: 'room', label: 'Rooms List', description: 'Requires: room_type (Classroom/Lab), capacity' },
    ];

    const handleFileUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        setError('');

        try {
            // First preview and validate
            const previewRes = await axios.post(`http://localhost:5000/api/upload/preview/${type}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            // Immediately Import validated data
            const importRes = await axios.post(`http://localhost:5000/api/upload/import/${type}`, {
                data: previewRes.data.data
            });

            setFileStats(prev => ({
                ...prev,
                [type]: { status: 'success', count: previewRes.data.count, message: importRes.data.message }
            }));
            
        } catch (err) {
            setFileStats(prev => ({
                ...prev,
                [type]: { status: 'error', message: err.response?.data?.error || err.message }
            }));
        }
    };

    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Data Upload Center</h1>
                <p className="text-gray-500 mt-2">Upload your Excel (.xlsx) files to populate the system database.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {uploadTypes.map((type) => (
                    <div key={type.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-blue-200 transition-colors">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 capitalize">{type.label}</h3>
                                <p className="text-sm text-gray-500 mt-1">{type.description}</p>
                            </div>
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                <UploadCloud className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-8 flex justify-center items-center hover:bg-gray-50 transition-colors group cursor-pointer mt-4">
                            <input 
                                type="file" 
                                accept=".xlsx, .xls"
                                onChange={(e) => handleFileUpload(e, type.id)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="text-center group-hover:-translate-y-1 transition-transform">
                                <span className="text-blue-600 font-medium">Click to browse</span>
                                <span className="text-gray-500"> or drag and drop</span>
                                <p className="text-xs text-gray-400 mt-1">Excel formats only</p>
                            </div>
                        </div>

                        {/* Status Display */}
                        {fileStats[type.id] && (
                            <div className={`mt-4 p-4 rounded-lg flex items-start text-sm ${
                                fileStats[type.id].status === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                                {fileStats[type.id].status === 'success' 
                                    ? <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                                    : <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                                }
                                <div>
                                    <p className="font-semibold capitalize">{fileStats[type.id].status}!</p>
                                    <p className="mt-1">{fileStats[type.id].message}</p>
                                    {fileStats[type.id].count && <p className="mt-1 text-xs opacity-80">{fileStats[type.id].count} records processed.</p>}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Uploads;
