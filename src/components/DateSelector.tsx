import React, { useState, useMemo } from 'react';
import { X, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface DateSelectorProps {
  currentDate: string;
  availableDates: string[];
  onDateSelect: (date: string) => void;
  onClose: () => void;
}

const DateSelector: React.FC<DateSelectorProps> = ({
  currentDate,
  availableDates,
  onDateSelect,
  onClose
}) => {
  const [viewMonth, setViewMonth] = useState(() => {
    const current = new Date(currentDate);
    return new Date(current.getFullYear(), current.getMonth(), 1);
  });

  const availableDateSet = useMemo(() => {
    return new Set(availableDates);
  }, [availableDates]);

  const formatDateKey = (date: Date): string => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  const formatDisplayDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const formatted = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    return `${dayName} ${formatted}`;
  };

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    
    // Start from the Sunday before the first day of the month
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    const days: Date[] = [];
    const currentDate = new Date(startDate);
    
    // Generate 6 weeks worth of days (42 days) to fill the calendar grid
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setViewMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(newMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const monthDays = getDaysInMonth(viewMonth);
  const currentDateKey = formatDateKey(new Date(currentDate));

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center">
      {/* Background overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative bg-black/80 backdrop-blur-md border border-white/20 rounded-xl p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-white/80" />
            <h2 className="text-white text-lg font-semibold">Select Date</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <h3 className="text-white font-medium text-lg">
            {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 text-white/60 hover:text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-white/60 text-xs font-medium py-2">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {monthDays.map((day, index) => {
            const dayKey = formatDateKey(day);
            const isCurrentMonth = day.getMonth() === viewMonth.getMonth();
            const isSelected = dayKey === currentDateKey;
            const hasTrips = availableDateSet.has(dayKey);
            const isToday = dayKey === formatDateKey(new Date());

            return (
              <button
                key={index}
                onClick={() => hasTrips && onDateSelect(dayKey)}
                disabled={!hasTrips || !isCurrentMonth}
                className={`
                  aspect-square text-xs font-medium rounded transition-all duration-200 relative
                  ${!isCurrentMonth 
                    ? 'text-white/20 cursor-default' 
                    : !hasTrips
                    ? 'text-white/30 cursor-not-allowed bg-gray-800/20'
                    : isSelected
                    ? 'bg-blue-600/40 border border-blue-500/60 text-white'
                    : isToday
                    ? 'bg-white/10 border border-white/30 text-white/90 hover:bg-white/20'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }
                `}
                title={
                  !isCurrentMonth ? undefined :
                  !hasTrips ? 'No trips available for this date in current dataset' :
                  isSelected ? 'Currently selected date' :
                  isToday ? 'Today' :
                  undefined
                }
              >
                {day.getDate()}
                
                {/* Indicator for dates with trips */}
                {isCurrentMonth && hasTrips && !isSelected && (
                  <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full opacity-60"></div>
                )}
              </button>
            );
          })}
        </div>

        {/* Current Selection */}
        <div className="bg-white/5 rounded-lg p-3 border border-white/10 mb-4">
          <div className="text-white/60 text-xs mb-1">Current Date:</div>
          <div className="text-white text-sm font-medium">
            {formatDisplayDate(currentDate)}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2">
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

export default DateSelector;