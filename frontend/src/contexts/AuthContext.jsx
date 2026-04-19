import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role');
        const faculty_id = localStorage.getItem('faculty_id');
        const name = localStorage.getItem('name');

        if (token && role) {
            setUser({ token, role, faculty_id, name });
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const response = await axios.post('http://localhost:5000/api/auth/login', { email, password });
        const data = response.data;
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        if (data.faculty_id) {
            localStorage.setItem('faculty_id', data.faculty_id);
            localStorage.setItem('name', data.name);
        }

        setUser({ 
            token: data.token, 
            role: data.role, 
            faculty_id: data.faculty_id,
            name: data.name
        });
        
        axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        return data.role;
    };

    const logout = () => {
        localStorage.clear();
        setUser(null);
        delete axios.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
