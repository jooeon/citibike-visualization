import React, { useState } from 'react';
import { Info, X } from 'lucide-react';

const InfoButton: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="fixed bottom-2 right-2 sm:bottom-4 sm:left-4 z-[1000]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Collapsed Info Button */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-black/60 backdrop-blur-sm border border-white/20 rounded-lg p-1.5 sm:p-3 text-white/80 hover:text-white hover:bg-black/70 transition-all duration-200 flex items-center gap-1 sm:gap-2"
        >
          <Info className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm font-medium">Info</span>
        </button>
      )}

      {/* Expanded Info Panel */}
      {isExpanded && (
          <div
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:relative sm:inset-auto sm:translate-y-0 bg-black/80 backdrop-blur-md border border-white/20 rounded-lg p-4 max-w-sm sm:max-w-sm w-auto h-auto">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-white/80 flex-shrink-0 mt-0.5"/>
                <h3 className="text-white font-medium text-sm">About This Project</h3>
              </div>
              <button
                  onClick={() => setIsExpanded(false)}
                  className="text-white/60 hover:text-white transition-colors ml-2"
              >
                <X className="w-4 h-4"/>
              </button>
            </div>
            <p className="text-white/70 text-sm leading-relaxed text-left">
              A creative data visualization project that transforms NYC Citi Bike trip data into an artistic, spatial
              representation.
            </p>
            <p className="text-white/60 mt-3 text-sm">
              <a
                  href="https://citibikenyc.com/system-data"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 hover:text-white transition-colors underline"
              >
                Citi Bike System Data | Citi Biki NYC
              </a>
            </p>
            <p className="text-white/60 text-xs mt-3 font-bold">
              &copy;{new Date().getFullYear()} -{' '}
              <a
                  href="https://jooeonpark.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 hover:text-white transition-colors uppercase"
              >
                Joo Eon Park
              </a>
            </p>
          </div>
      )}
    </div>
  );
};

export default InfoButton;