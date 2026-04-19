import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
    Calendar,
    LogOut,
    User
} from 'lucide-react';

const FacultyLayout = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Top Navigation Bar */}
            <header className="bg-white shadow-md sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <Calendar className="w-8 h-8 text-indigo-600 mr-3" />
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                                Faculty Portal
                            </h1>
                        </div>
                        
                        <div className="flex items-center space-x-6">
                            <div className="flex items-center text-gray-700 bg-gray-100 px-4 py-2 rounded-full hidden sm:flex">
                                <User className="w-4 h-4 mr-2" />
                                <span className="text-sm font-medium">{user?.name || 'Faculty Member'}</span>
                            </div>
                            
                            <button 
                                onClick={handleLogout}
                                className="flex items-center text-gray-500 hover:text-red-600 transition-colors"
                            >
                                <LogOut className="w-5 h-5 sm:mr-2" />
                                <span className="hidden sm:inline font-medium text-sm">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 bg-gradient-to-br from-gray-50 to-indigo-50/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default FacultyLayout;
