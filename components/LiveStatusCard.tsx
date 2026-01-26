'use client';

import { motion } from 'framer-motion';
import { Train, Clock, MapPin } from 'lucide-react';

interface LiveStatusProps {
    data: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export default function LiveStatusCard({ data }: LiveStatusProps) {
    if (!data) return null;

    // Detect data type based on fields (heuristic)
    const isTrainStatus = data.train_number || data.train_name;

    if (!isTrainStatus) return null;

    const delay = data.delay || 0;
    const isLate = delay > 0;
    const statusColor = isLate ? 'text-red-400' : 'text-green-400';
    const statusBg = isLate ? 'bg-red-500/20' : 'bg-green-500/20';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4 mt-2 w-full max-w-md border-l-4 border-l-railway-orange"
        >
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <Train className="w-5 h-5 text-railway-blue" />
                    {data.train_name || 'Train Status'} <span className="text-sm opacity-60">({data.train_number})</span>
                </h3>
                <span className={`px-2 py-1 rounded text-xs font-bold ${statusBg} ${statusColor}`}>
                    {isLate ? `Delayed by ${delay} min` : 'On Time'}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                    <p className="text-white/60 flex items-center gap-1"><MapPin className="w-3 h-3" /> Current Station</p>
                    <p className="font-medium">{data.current_station_name || 'Unknown'}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-white/60 flex items-center gap-1"><Clock className="w-3 h-3" /> Updated</p>
                    <p className="font-medium">{data.updated_time || 'Just now'}</p>
                </div>
            </div>
        </motion.div>
    );
}
