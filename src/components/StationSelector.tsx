import React, { useState, useMemo } from 'react';
import { X, MapPin, Search, CheckSquare, Square, Building2, Filter } from 'lucide-react';
import type { Station, ProcessedTrip } from '../types';
import { groupStationsByBorough, getBoroughStats } from '../utils/boroughUtils';

interface StationSelectorProps {
    stations: Station[];
    selectedStationIndices: Set<number>;
    onStationToggle: (stationIndex: number) => void;
    onSelectAll: () => void;
    onSelectNone: () => void;
    onClose: () => void;
    allStations: Station[];
    filteredTrips: ProcessedTrip[];
    stationTripCounts: Map<number, number>;
}

const StationSelector: React.FC<StationSelectorProps> = ({
                                                             stations,
                                                             selectedStationIndices,
                                                             onStationToggle,
                                                             onSelectAll,
                                                             onSelectNone,
                                                             onClose,
                                                             allStations,
                                                             filteredTrips,
                                                             stationTripCounts
                                                         }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBoroughs, setSelectedBoroughs] = useState<Set<string>>(
        new Set(['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'])
    );

    const getStationIndex = (station: Station): number => {
        return allStations.findIndex(s => s.name === station.name);
    };

    const getStationTripCount = (stationIndex: number): number => {
        return stationTripCounts.get(stationIndex) || 0;
    };

    const handleBoroughToggle = (borough: string) => {
        setSelectedBoroughs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(borough)) {
                newSet.delete(borough);
            } else {
                newSet.add(borough);
            }
            return newSet;
        });
    };

    const handleSelectAllBoroughs = () => {
        setSelectedBoroughs(new Set(['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island']));
    };

    const handleSelectNoBoroughs = () => {
        setSelectedBoroughs(new Set());
    };

    const groupedStations = useMemo(() => {
        return groupStationsByBorough(stations);
    }, [stations]);

    const boroughStats = useMemo(() => {
        return getBoroughStats(stations, stationTripCounts, allStations);
    }, [stations, stationTripCounts, allStations]);

    const filteredGroupedStations = useMemo(() => {
        const filtered = new Map<string, Station[]>();
        
        groupedStations.forEach((stationList, borough) => {
            // Filter by borough selection
            if (!selectedBoroughs.has(borough)) {
                return;
            }

            // Filter by search term
            let filteredStations = stationList;
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                filteredStations = stationList.filter(station =>
                    station.name.toLowerCase().includes(term)
                );
            }

            if (filteredStations.length > 0) {
                // Sort stations: selected first, then unselected, both alphabetically
                const sortedStations = filteredStations.sort((a, b) => {
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
                
                filtered.set(borough, sortedStations);
            }
        });
        
        return filtered;
    }, [groupedStations, selectedBoroughs, searchTerm, selectedStationIndices]);

    const selectedCount = stations.filter(station =>
        selectedStationIndices.has(getStationIndex(station))
    ).length;

    // Calculate visible stations after all filters are applied
    const visibleStations = useMemo(() => {
        const visible: Station[] = [];
        filteredGroupedStations.forEach((stationList) => {
            visible.push(...stationList);
        });
        return visible;
    }, [filteredGroupedStations]);

    const handleSelectAllVisible = () => {
        visibleStations.forEach(station => {
            const stationIndex = getStationIndex(station);
            if (stationIndex >= 0 && !selectedStationIndices.has(stationIndex)) {
                onStationToggle(stationIndex);
            }
        });
    };

    const handleSelectNoneVisible = () => {
        visibleStations.forEach(station => {
            const stationIndex = getStationIndex(station);
            if (stationIndex >= 0 && selectedStationIndices.has(stationIndex)) {
                onStationToggle(stationIndex);
            }
        });
    };

    const getBoroughColor = (borough: string) => {
        switch (borough) {
            case 'Manhattan': return 'bg-blue-500/20 border-blue-400/30';
            case 'Brooklyn': return 'bg-green-500/20 border-green-400/30';
            case 'Queens': return 'bg-yellow-500/20 border-yellow-400/30';
            case 'Bronx': return 'bg-red-500/20 border-red-400/30';
            case 'Staten Island': return 'bg-purple-500/20 border-purple-400/30';
            default: return 'bg-gray-500/20 border-gray-400/30';
        }
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
            {/* Background overlay */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal content */}
            <div className="relative bg-black/80 backdrop-blur-md border border-white/20 rounded-xl p-4 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-3 sticky top-0 bg-black/80 backdrop-blur-md pb-2">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-white/80" />
                        <h2 className="text-white text-lg font-semibold">Filter by Starting Stations</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/60 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Stats and Controls */}
                <div className="space-y-3 mb-3">
                    {/* Borough Filter */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Building2 className="w-4 h-4 text-white/60" />
                            <h3 className="text-white/80 text-sm font-medium">Filter by Borough</h3>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'].map(borough => {
                                const isSelected = selectedBoroughs.has(borough);
                                const stats = boroughStats.get(borough) || { count: 0, trips: 0 };
                                
                                return (
                                    <button
                                        key={borough}
                                        onClick={() => handleBoroughToggle(borough)}
                                        className={`px-2 py-1.5 rounded-md border text-xs transition-all duration-200 min-w-0 flex-shrink-0 ${
                                            isSelected
                                                ? `${getBoroughColor(borough)} text-white`
                                                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                        }`}
                                    >
                                        <div className="font-medium text-center text-xs leading-tight">{borough}</div>
                                        <div className="text-xs opacity-80 text-center leading-tight">
                                            {stats.count} stations
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSelectAllBoroughs}
                                className="px-2 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-white/80 hover:text-white transition-colors text-xs"
                            >
                                All Boroughs
                            </button>
                            <button
                                onClick={handleSelectNoBoroughs}
                                className="px-2 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-white/80 hover:text-white transition-colors text-xs"
                            >
                                No Boroughs
                            </button>
                        </div>
                    </div>

                    {/* Station Controls */}
                    <div className="flex items-center justify-between text-xs text-white/60">
                        <span>{selectedCount} of {stations.length} selected • {visibleStations.length} visible</span>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSelectAllVisible}
                                className="px-2 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-white/80 hover:text-white transition-colors text-xs"
                            >
                                Select All
                            </button>
                            <button
                                onClick={handleSelectNoneVisible}
                                className="px-2 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-white/80 hover:text-white transition-colors text-xs"
                            >
                                Deselect All
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-3">
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
                <div className="flex-1 min-h-0">
                    <div className="space-y-4">
                        {Array.from(filteredGroupedStations.entries()).map(([borough, stationList]) => (
                            <div key={borough} className="space-y-2">
                                {/* Borough Header */}
                                <div className={`p-3 rounded-lg border ${getBoroughColor(borough)}`}>
                                    <div className="flex items-center justify-between text-white">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-4 h-4" />
                                            <span className="font-medium text-sm text-white">{borough}</span>
                                        </div>
                                        <div className="text-xs opacity-80">
                                            {stationList.length} stations
                                        </div>
                                    </div>
                                </div>

                                {/* Stations in Borough */}
                                <div className="space-y-1 ml-4">
                                    {stationList.map((station) => {
                                        const stationIndex = getStationIndex(station);
                                        const isSelected = selectedStationIndices.has(stationIndex);
                                        const boroughColorClass = getBoroughColor(borough);

                                        return (
                                            <button
                                                key={`${station.id}-${stationIndex}`}
                                                onClick={() => onStationToggle(stationIndex)}
                                                className={`w-full text-left p-3 rounded-lg border transition-all duration-200 flex items-start gap-3 ${
                                                    isSelected
                                                        ? `${getBoroughColor(station.borough || borough)} text-white`
                                                        : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20'
                                                }`}
                                            >
                                                <div className="flex-shrink-0 mt-0.5">
                                                    {isSelected ? (
                                                        <CheckSquare className="w-5 h-5 text-white" />
                                                    ) : (
                                                        <Square className="w-5 h-5 text-white" />
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-sm truncate">
                                                        {station.name}
                                                    </div>
                                                    <div className="text-xs text-white/60 mt-1">
                                                        {getStationTripCount(getStationIndex(station)).toLocaleString()} trips
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredGroupedStations.size === 0 && (
                        <div className="text-center py-8 text-white/60">
                            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>
                                {searchTerm.trim() 
                                    ? `No stations found matching "${searchTerm}"` 
                                    : 'No boroughs selected'
                                }
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-3 pt-3 border-t border-white/10 flex justify-end sticky bottom-0 bg-black/80 backdrop-blur-md">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-blue-600/30 hover:bg-blue-600/40 border border-blue-500/40 rounded-lg text-white transition-colors flex items-center gap-2"
                    >
                        <Filter className="w-4 h-4" />
                        Apply Filter
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StationSelector;