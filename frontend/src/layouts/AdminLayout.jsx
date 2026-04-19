import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    LayoutDashboard,
    Upload,
    Users,
    BookOpen,
    MapPin,
    Calendar,
    FlaskConical,
    LogOut,
    UserX
} from 'lucide-react';

const AdminLayout = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/admin/uploads', icon: Upload, label: 'Upload Data' },
        { path: '/admin/faculty', icon: Users, label: 'Faculty' },
        { path: '/admin/subjects', icon: BookOpen, label: 'Subjects' },
        { path: '/admin/rooms', icon: MapPin, label: 'Rooms' },
        { path: '/admin/timetable', icon: Calendar, label: 'Timetable Manager' },
        { path: '/admin/sections', icon: BookOpen, label: 'Section Schedules' },
        { path: '/admin/faculty-schedules', icon: Users, label: 'Faculty Schedules' },
        { path: '/admin/lab-timetable', icon: FlaskConical, label: 'Lab Timetable' },
        { path: '/admin/attendance', icon: UserX, label: 'Attendance' },
    ];

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-72 bg-white shadow-xl flex flex-col fixed h-full z-10 hidden md:flex">
                <div className="p-6 border-b border-gray-100">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                        Admin Portal
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Timetable Management</p>
                </div>
                
                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
                        
                        return (
                            <Link 
                                key={item.path} 
                                to={item.path}
                                className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${
                                    isActive 
                                        ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm' 
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
                                }`}
                            >
                                <Icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-500'}`} />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button 
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
                    >
                        <LogOut className="w-5 h-5 mr-3" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-72 flex flex-col min-h-screen">
                <header className="bg-white shadow-sm sticky top-0 z-20 px-8 py-4 flex items-center justify-between md:hidden">
                    <h1 className="text-xl font-bold text-gray-800">Admin Portal</h1>
                </header>
                <div className="p-8 flex-1">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
