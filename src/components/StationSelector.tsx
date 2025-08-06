import React, { useState, useMemo } from 'react';
import { X, MapPin, Search, CheckSquare, Square } from 'lucide-react';
import type { Station, ProcessedTrip } from '../types';

interface StationSelectorProps {
    stations: Station[];
    selectedStationIndices: Set<number>;
    onStationToggle: (stationIndex: number) => void;
    onSelectAll: () => void;
    onSelectNone: () => void;
    onClose: () => void;
    allStations: Station[];
    filteredTrips: ProcessedTrip[];
}

const StationSelector: React.FC<StationSelectorProps> = ({
                                                             stations,
                                                             selectedStationIndices,
                                                             onStationToggle,
                                                             onSelectAll,
                                                             onSelectNone,
                                                             onClose,
                                                             allStations,
                                                             filteredTrips
                                                         }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const getStationIndex = (station: Station): number => {
        return allStations.findIndex(s => s.name === station.name);
    };

    const getStationTripCount = (stationIndex: number): number => {
        return filteredTrips.filter(trip => trip.startStationIndex === stationIndex).length;
    };

    const filteredStations = useMemo(() => {
        if (!searchTerm.trim()) {
            // Sort stations: selected first, then unselected, both alphabetically
            return [...stations].sort((a, b) => {
                const aIndex = getStationIndex(a);
                const bIndex = getStationIndex(b);
                const aSelected = selectedStationIndices.has(aIndex);
                const bSelected = selectedStationIndices.has(bIndex);
                
                // Selected stations come first
                if (aSelected && !bSelected) return -1;
                if (!aSelected && bSelected) return 1;
                
                // Within same selection status, sort alphabetically
                return a.name.localeCompare(b.name);
            });
        }

        const term = searchTerm.toLowerCase();
        const filtered = stations.filter(station =>
            station.name.toLowerCase().includes(term) ||
            station.name.toLowerCase().includes(term)
        );
        
        // Sort filtered results: selected first, then unselected, both alphabetically
        return filtered.sort((a, b) => {
            const aIndex = getStationIndex(a);
            const bIndex = getStationIndex(b);
            const aSelected = selectedStationIndices.has(aIndex);
            const bSelected = selectedStationIndices.has(bIndex);
            
            // Selected stations come first
            if (aSelected && !bSelected) return -1;
            if (!aSelected && bSelected) return 1;
            
            // Within same selection status, sort alphabetically
            return a.name.localeCompare(b.name);
        });
    }, [stations, searchTerm]);

    const selectedCount = stations.filter(station =>
        selectedStationIndices.has(getStationIndex(station))
    ).length;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
            {/* Background overlay */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal content */}
            <div className="relative bg-black/80 backdrop-blur-md border border-white/20 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-white/80" />
                        <h2 className="text-white text-lg font-semibold">Select Starting Stations</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/60 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Stats and Controls */}
                <div className="flex items-center justify-between mb-4 text-sm text-white/60">
                    <span>{selectedCount} of {stations.length} stations selected</span>
                    <div className="flex gap-2">
                        <button
                            onClick={onSelectAll}
                            className="px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-white/80 hover:text-white transition-colors"
                        >
                            Select All
                        </button>
                        <button
                            onClick={onSelectNone}
                            className="px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-white/80 hover:text-white transition-colors"
                        >
                            Select None
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                        type="text"
                        placeholder="Search stations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-colors"
                    />
                </div>

                {/* Station List */}
                <div className="flex-1 overflow-y-auto">
                    <div className="space-y-1">
                        {filteredStations.map((station) => {
                            const stationIndex = getStationIndex(station);
                            const isSelected = selectedStationIndices.has(stationIndex);

                            return (
                                <button
                                    key={station.id}
                                    onClick={() => onStationToggle(stationIndex)}
                                    className={`w-full text-left p-3 rounded-lg border transition-all duration-200 flex items-center gap-3 ${
                                        isSelected
                                            ? 'bg-blue-500/20 border-blue-400/40 text-white'
                                            : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20'
                                    }`}
                                >
                                    {isSelected ? (
                                        <CheckSquare className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                    ) : (
                                        <Square className="w-4 h-4 text-white/40 flex-shrink-0" />
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">
                                            {station.name}
                                        </div>
                                        <div className="text-xs text-white/60 mt-1">
                                            Index: {getStationIndex(station)} • {getStationTripCount(getStationIndex(station)).toLocaleString()} trips
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {filteredStations.length === 0 && (
                        <div className="text-center py-8 text-white/60">
                            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No stations found matching "{searchTerm}"</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                    <div className="text-white/60 text-xs">
                        Showing trips from selected stations only
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-blue-600/30 hover:bg-blue-600/40 border border-blue-500/40 rounded-lg text-white transition-colors"
                    >
                        Apply Selection
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StationSelector;