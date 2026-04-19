import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { MapPin, Users } from 'lucide-react';

const RoomsList = () => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('http://localhost:5000/api/rooms')
            .then(res => setRooms(res.data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div>Loading rooms...</div>;

    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Facility Directory</h1>
                <p className="text-gray-500 mt-2">Manage available classrooms and laboratories.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rooms.map((room) => (
                    <div key={room.room_id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 mt-1 flex items-center">
                                    <MapPin className="w-5 h-5 mr-2 text-amber-500" />
                                    Room {room.room_id}
                                </h3>
                                <span className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-medium ${room.room_type === 'Lab' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {room.room_type}
                                </span>
                            </div>
                        </div>
                        <div className="mt-6 pt-4 border-t border-gray-50 flex items-center text-gray-600 text-sm">
                            <Users className="w-4 h-4 mr-2" />
                            Capacity: <span className="font-semibold text-gray-900 ml-1">{room.capacity} seats</span>
                        </div>
                    </div>
                ))}
                
                {rooms.length === 0 && (
                     <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">
                         No rooms configured. Upload via the Uploads tab.
                     </div>
                )}
            </div>
        </div>
    );
};

export default RoomsList;
