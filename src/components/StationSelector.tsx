import React, { useState, useMemo } from 'react';
import { X, MapPin, Search, CheckSquare, Square, Building2, Filter, ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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
    const [collapsedBoroughs, setCollapsedBoroughs] = useState<Set<string>>(
        new Set(['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island']) // All collapsed by default
    );
    const [sortOrder, setSortOrder] = useState<'name' | 'trips-asc' | 'trips-desc'>('name');

    const getStationIndex = (station: Station): number => {
        return allStations.findIndex(s => s.name === station.name);
    };

    const getStationTripCount = (stationIndex: number): number => {
        return stationTripCounts.get(stationIndex) || 0;
    };

    const handleBoroughToggle = (borough: string) => {
        // Get all station indices for this borough
        const boroughStations = groupedStations.get(borough) || [];
        const boroughStationIndices = boroughStations.map(station => getStationIndex(station));
        
        // Check if all stations in this borough are currently selected
        const allBoroughStationsSelected = boroughStationIndices.every(index => 
            selectedStationIndices.has(index)
        );
        
        // If all are selected, deselect all; if any are unselected, select all
        boroughStationIndices.forEach(stationIndex => {
            if (allBoroughStationsSelected) {
                // Deselect all stations in this borough
                if (selectedStationIndices.has(stationIndex)) {
                    onStationToggle(stationIndex);
                }
            } else {
                // Select all stations in this borough
                if (!selectedStationIndices.has(stationIndex)) {
                    onStationToggle(stationIndex);
                }
            }
        });
    };

    const handleBoroughCollapse = (borough: string) => {
        setCollapsedBoroughs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(borough)) {
                newSet.delete(borough);
            } else {
                newSet.add(borough);
            }
            return newSet;
        });
    };

    const handleSortChange = () => {
        if (sortOrder === 'name') {
            setSortOrder('trips-desc');
        } else if (sortOrder === 'trips-desc') {
            setSortOrder('trips-asc');
        } else {
            setSortOrder('name');
        }
    };

    const groupedStations = useMemo(() => {
        return groupStationsByBorough(stations);
    }, [stations]);

    // Calculate which boroughs have selected stations
    const boroughSelectionState = useMemo(() => {
        const state = new Map<string, { hasSelected: boolean, allSelected: boolean, count: number }>();
        
        groupedStations.forEach((stationList, borough) => {
            const boroughStationIndices = stationList.map(station => getStationIndex(station));
            const selectedCount = boroughStationIndices.filter(index => 
                selectedStationIndices.has(index)
            ).length;
            
            state.set(borough, {
                hasSelected: selectedCount > 0,
                allSelected: selectedCount === boroughStationIndices.length,
                count: selectedCount
            });
        });
        
        return state;
    }, [groupedStations, selectedStationIndices]);

    const boroughStats = useMemo(() => {
        return getBoroughStats(stations, stationTripCounts, allStations);
    }, [stations, stationTripCounts, allStations]);

    const filteredGroupedStations = useMemo(() => {
        const filtered = new Map<string, Station[]>();
        
        groupedStations.forEach((stationList, borough) => {
            // Filter by search term
            let filteredStations = stationList;
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                filteredStations = stationList.filter(station =>
                    station.name.toLowerCase().includes(term)
                );
            }

            // Sort stations within each borough
            if (filteredStations.length > 0) {
                if (sortOrder === 'trips-desc') {
                    filteredStations.sort((a, b) => {
                        const aIndex = getStationIndex(a);
                        const bIndex = getStationIndex(b);
                        const aTrips = getStationTripCount(aIndex);
                        const bTrips = getStationTripCount(bIndex);
                        return bTrips - aTrips; // Descending
                    });
                } else if (sortOrder === 'trips-asc') {
                    filteredStations.sort((a, b) => {
                        const aIndex = getStationIndex(a);
                        const bIndex = getStationIndex(b);
                        const aTrips = getStationTripCount(aIndex);
                        const bTrips = getStationTripCount(bIndex);
                        return aTrips - bTrips; // Ascending
                    });
                } else {
                    // Sort by name (default)
                    filteredStations.sort((a, b) => a.name.localeCompare(b.name));
                }
            }

            if (filteredStations.length > 0) {
                filtered.set(borough, filteredStations);
            }
        });
        
        return filtered;
    }, [groupedStations, searchTerm, selectedStationIndices, sortOrder, stationTripCounts, allStations]);

    const selectedCount = stations.filter(station =>
        selectedStationIndices.has(getStationIndex(station))
    ).length;

    // Calculate visible stations after all filters are applied
    const visibleStations = useMemo(() => {
        const visible: Station[] = [];
        groupedStations.forEach((stationList) => {
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const filtered = stationList.filter(station =>
                    station.name.toLowerCase().includes(term)
                );
                visible.push(...filtered);
            } else {
                visible.push(...stationList);
            }
        });
        return visible;
    }, [groupedStations, searchTerm]);

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
            <div className="relative bg-black/80 backdrop-blur-md border border-white/20 rounded-xl p-4 max-w-4xl w-full mx-4 h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
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
                    <div className="flex gap-2">
                        {searchTerm.trim() && (
                            <>
                                <button
                                    onClick={handleSelectAllVisible}
                                    className="hidden sm:block px-2 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-white/80 hover:text-white transition-colors text-xs"
                                >
                                    Select All Visible
                                </button>
                                <button
                                    onClick={handleSelectNoneVisible}
                                    className="hidden sm:block px-2 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-white/80 hover:text-white transition-colors text-xs"
                                >
                                    Deselect All Visible
                                </button>
                            </>
                        )}
                        <button
                            onClick={onSelectAll}
                            className="px-2 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-white/80 hover:text-white transition-colors text-xs"
                        >
                            Select All
                        </button>
                        <button
                            onClick={onSelectNone}
                            className="px-2 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-white/80 hover:text-white transition-colors text-xs"
                        >
                            Deselect All
                        </button>
                    </div>
                    
                    {/* Borough Filter */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Building2 className="w-4 h-4 text-white/60" />
                            <h3 className="text-white/80 text-sm font-medium">Filter by Borough</h3>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'].map(borough => {
                                const selectionState = boroughSelectionState.get(borough);
                                const isFullySelected = selectionState?.allSelected || false;
                                const hasSelected = selectionState?.hasSelected || false;
                                const selectedCount = selectionState?.count || 0;
                                const stats = boroughStats.get(borough) || { count: 0, trips: 0 };
                                const isStatenIsland = borough === 'Staten Island';
                                const isDisabled = stats.count === 0 || stats.trips === 0;
                                const hasStations = stats.count > 0;
                                const hasTrips = stats.trips > 0;

                                return (
                                    <button
                                        key={borough}
                                        onClick={() => hasStations && hasTrips && handleBoroughToggle(borough)}
                                        disabled={isDisabled}
                                        title={isDisabled ? 
                                            (stats.count === 0 ? `No ${borough} stations available in current dataset` : 
                                             `No trips available from ${borough} stations in current dataset`) : 
                                            undefined}
                                        className={`px-2 py-1.5 rounded-md border transition-all duration-200 min-w-0 flex-shrink-0 relative group cursor-pointer ${
                                            isDisabled
                                                ? 'bg-gray-800/20 border-gray-600/20 text-gray-500 cursor-not-allowed opacity-50'
                                                : isFullySelected
                                                ? `${getBoroughColor(borough)} text-white border-opacity-60 hover:bg-white/10`
                                                : hasSelected
                                                ? `${getBoroughColor(borough)} text-white/90 border-opacity-40 bg-opacity-60 hover:bg-white/10`
                                                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                        }`}
                                    >
                                        <div className="font-medium text-center text-xs sm:text-sm leading-tight">{borough}</div>
                                        <div className="text-xs opacity-80 text-center leading-tight">
                                            {selectedCount}/{stats.count} stations
                                        </div>
                                        <div className="text-xs opacity-80 text-center leading-tight hidden sm:block">
                                            {stats.trips.toLocaleString()} trips
                                        </div>
                                        
                                        {/* Tooltip for disabled boroughs */}
                                        {isDisabled && (
                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 border border-gray-700 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10 shadow-lg">
                                                {stats.count === 0 ? 
                                                    `No ${borough} stations available in current dataset` : 
                                                    `No trips available from ${borough} stations in current dataset`}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        
                        <div className="flex gap-2">
                            {searchTerm.trim() && (
                                <>
                                    <button
                                        onClick={handleSelectAllVisible}
                                        className="hidden sm:block px-2 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-white/80 hover:text-white transition-colors text-xs"
                                    >
                                        Select All Visible
                                    </button>
                                    <button
                                        onClick={handleSelectNoneVisible}
                                        className="hidden sm:block px-2 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-white/80 hover:text-white transition-colors text-xs"
                                    >
                                        Deselect All Visible
                                    </button>
                                </>
                            )}
                            <button
                                onClick={onSelectAll}
                                className="px-2 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-white/80 hover:text-white transition-colors text-xs"
                            >
                                Select All
                            </button>
                            <button
                                onClick={onSelectNone}
                                className="px-2 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-white/80 hover:text-white transition-colors text-xs"
                            >
                                Deselect All
                            </button>
                        </div>
                        
                        {/* Search Input - Hidden on mobile */}
                        <div className="hidden sm:block mt-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Search className="w-4 h-4 text-white/60" />
                                <h3 className="text-white/80 text-sm font-medium">Search Stations</h3>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search by station name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-3 py-2 pl-9 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all text-sm"
                                />
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Station Controls and Sorting */}
                <div className="flex items-center justify-between text-xs text-white/60 mb-3">
                    <span className="text-xs sm:text-sm">
                        {selectedCount} of {stations.length} selected
                        {searchTerm.trim() && ` • ${visibleStations.length} visible`}
                    </span>
                    <div className="flex gap-2 items-center">
                        {/* Desktop-only sorting */}
                        <button
                            onClick={handleSortChange}
                            className="hidden sm:flex items-center gap-1 px-2 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-white/80 hover:text-white transition-colors text-xs"
                            title="Sort stations"
                        >
                            {sortOrder === 'trips-desc' ? (
                                <ArrowDown className="w-3 h-3" />
                            ) : sortOrder === 'trips-asc' ? (
                                <ArrowUp className="w-3 h-3" />
                            ) : (
                                <ArrowUpDown className="w-3 h-3" />
                            )}
                            <span>
                            {sortOrder === 'trips-desc' ? 'Trips ↓' :
                                sortOrder === 'trips-asc' ? 'Trips ↑' : 'Name'}
                        </span>
                        </button>

                        {/* Hidden visible selection buttons
                        <button
                            onClick={handleSelectAllVisible}
                            className="px-1 sm:px-2 py-0.5 sm:py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-white/80 hover:text-white transition-colors text-xs"
                        >
                            <span className="sm:hidden">Select All</span>
                            <span className="hidden sm:inline">Select All Visible</span>
                        </button>
                        <button
                            onClick={handleSelectNoneVisible}
                            className="px-1 sm:px-2 py-0.5 sm:py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-white/80 hover:text-white transition-colors text-xs"
                        >
                            <span className="sm:hidden">Deselect All</span>
                            <span className="hidden sm:inline">Deselect All Visible</span>
                        </button> */}
                    </div>
                </div>

                {/* Stations List */}
                <div className="flex-1 overflow-y-auto">
                    <div className="space-y-2">
                        {Array.from(groupedStations.entries()).map(([borough, stationList]) => {
                            const selectionState = boroughSelectionState.get(borough);
                            const hasSelected = selectionState?.hasSelected || false;
                            const selectedCount = selectionState?.count || 0;
                            
                            // Filter stations by search term
                            let displayedStations = stationList;
                            if (searchTerm.trim()) {
                                const term = searchTerm.toLowerCase();
                                displayedStations = stationList.filter(station =>
                                    station.name.toLowerCase().includes(term)
                                );
                            }
                            
                            // Sort stations
                            if (sortOrder === 'trips-desc') {
                                displayedStations.sort((a, b) => {
                                    const aIndex = getStationIndex(a);
                                    const bIndex = getStationIndex(b);
                                    const aTrips = getStationTripCount(aIndex);
                                    const bTrips = getStationTripCount(bIndex);
                                    return bTrips - aTrips;
                                });
                            } else if (sortOrder === 'trips-asc') {
                                displayedStations.sort((a, b) => {
                                    const aIndex = getStationIndex(a);
                                    const bIndex = getStationIndex(b);
                                    const aTrips = getStationTripCount(aIndex);
                                    const bTrips = getStationTripCount(bIndex);
                                    return aTrips - bTrips;
                                });
                            } else {
                                displayedStations.sort((a, b) => a.name.localeCompare(b.name));
                            }
                            
                            return (
                            <div key={borough} className="space-y-2">
                                {/* Borough Header */}
                                <div className={`p-2 sm:p-3 rounded-lg border transition-all duration-200 ${
                                    hasSelected 
                                        ? getBoroughColor(borough) 
                                        : 'bg-white/5 border-white/10'
                                }`}>
                                    <button
                                        onClick={() => handleBoroughCollapse(borough)}
                                        className={`w-full flex items-center justify-between rounded transition-colors p-1 -m-1 ${
                                            hasSelected 
                                                ? 'text-white hover:bg-white/10' 
                                                : 'text-white/60 hover:bg-white/5'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {collapsedBoroughs.has(borough) ? (
                                                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                                            ) : (
                                                <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
                                            )}
                                            <Building2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                            <span className="font-medium text-xs sm:text-sm">{borough}</span>
                                        </div>
                                        <div className="text-xs sm:text-sm opacity-80">
                                            {selectedCount}/{stationList.length} stations
                                        </div>
                                    </button>
                                </div>

                                {/* Stations in Borough */}
                                {!collapsedBoroughs.has(borough) && (
                                    <div className="space-y-1 ml-2 sm:ml-4">
                                        {displayedStations.map((station) => {
                                            const stationIndex = getStationIndex(station);
                                            const isSelected = selectedStationIndices.has(stationIndex);

                                            return (
                                                <button
                                                    key={`${station.id}-${stationIndex}`}
                                                    onClick={() => onStationToggle(stationIndex)}
                                                    className={`w-full text-left p-2 sm:p-3 rounded-lg border transition-all duration-200 flex items-start gap-2 sm:gap-3 ${
                                                        isSelected
                                                            ? `${getBoroughColor(station.borough || borough)} text-white`
                                                            : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20'
                                                    }`}
                                                >
                                                    <div className="flex-shrink-0 mt-0.5 sm:mt-1">
                                                        {isSelected ? (
                                                            <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                                        ) : (
                                                            <Square className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-xs sm:text-sm truncate">
                                                            {station.name}
                                                        </div>
                                                        <div className="text-xs text-white/60 mt-0.5 sm:mt-1">
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StationSelector;