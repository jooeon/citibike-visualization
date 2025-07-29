import React from 'react';
import { X, Calendar, Clock } from 'lucide-react';

interface DatePeriodSelectorProps {
    selectedDate: string;
    selectedPeriod: string;
    availableDates: string[];
    availablePeriods: string[];
    onDateChange: (date: string) => void;
    onPeriodChange: (period: string) => void;
    onClose: () => void;
}

const DatePeriodSelector: React.FC<DatePeriodSelectorProps> = ({
                                                                   selectedDate,
                                                                   selectedPeriod,
                                                                   availableDates,
                                                                   availablePeriods,
                                                                   onDateChange,
                                                                   onPeriodChange,
                                                                   onClose
                                                               }) => {
    const formatPeriodName = (period: string) => {
        return period
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    };

    const formatDateName = (date: string) => {
        const dateObj = new Date(date);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        const formatted = dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        return `${dayName}, ${formatted}`;
    };

    const getPeriodColor = (period: string) => {
        if (period.includes('morning')) return 'bg-blue-500/20 border-blue-400/30';
        if (period.includes('lunch')) return 'bg-yellow-500/20 border-yellow-400/30';
        if (period.includes('afternoon')) return 'bg-orange-500/20 border-orange-400/30';
        if (period.includes('evening')) return 'bg-red-500/20 border-red-400/30';
        if (period.includes('night')) return 'bg-purple-500/20 border-purple-400/30';
        return 'bg-gray-500/20 border-gray-400/30';
    };

    const getDayTypeColor = (date: string) => {
        const dateObj = new Date(date);
        const dayOfWeek = dateObj.getDay();
        return (dayOfWeek === 0 || dayOfWeek === 6)
            ? 'bg-green-500/20 border-green-400/30'
            : 'bg-blue-500/20 border-blue-400/30';
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
            {/* Background overlay */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal content */}
            <div className="relative bg-black/80 backdrop-blur-md border border-white/20 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-white/80" />
                        <h2 className="text-white text-lg font-semibold">Select Date & Period</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/60 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Date Selection */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-white/60" />
                        <h3 className="text-white/80 text-sm font-medium">Available Dates</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        {availableDates.map((date) => (
                            <button
                                key={date}
                                onClick={() => onDateChange(date)}
                                className={`text-left p-3 rounded-lg border transition-all duration-200 ${
                                    selectedDate === date
                                        ? 'bg-white/20 border-white/40 text-white'
                                        : `${getDayTypeColor(date)} text-white/80 hover:bg-white/10`
                                }`}
                            >
                                <div className="font-medium text-sm">{date}</div>
                                <div className="text-xs text-white/60 mt-1">
                                    {formatDateName(date)}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Period Selection */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-white/60" />
                        <h3 className="text-white/80 text-sm font-medium">Time Periods</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                        {availablePeriods.map((period) => (
                            <button
                                key={period}
                                onClick={() => onPeriodChange(period)}
                                className={`text-left p-3 rounded-lg border transition-all duration-200 ${
                                    selectedPeriod === period
                                        ? 'bg-white/20 border-white/40 text-white'
                                        : `${getPeriodColor(period)} text-white/80 hover:bg-white/10`
                                }`}
                            >
                                <div className="font-medium text-sm">
                                    {formatPeriodName(period)}
                                </div>
                                <div className="text-xs text-white/60 mt-1 capitalize">
                                    {period.includes('weekday') ? 'Weekday' : 'Weekend'} •{' '}
                                    {period.includes('morning') ? 'Morning' :
                                        period.includes('lunch') ? 'Lunch' :
                                            period.includes('afternoon') ? 'Afternoon' :
                                                period.includes('evening') ? 'Evening' :
                                                    period.includes('night') ? 'Night' : 'Period'}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Current Selection Summary */}
                <div className="mt-6 pt-4 border-t border-white/10">
                    <div className="text-white/60 text-xs mb-2">Current Selection:</div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <div className="text-white text-sm font-medium">
                            {formatDateName(selectedDate)}
                        </div>
                        <div className="text-white/80 text-sm">
                            {formatPeriodName(selectedPeriod)}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-white/80 hover:text-white transition-colors text-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DatePeriodSelector;