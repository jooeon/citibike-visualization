import React from 'react';

const ProjectTitle: React.FC = () => {
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] hidden sm:block">
      <div className="bg-black/60 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2">
        <h1 className="text-white/90 font-medium text-sm tracking-wide">
          NYC Citi Bike Data Visualization
        </h1>
      </div>
    </div>
  );
};

export default ProjectTitle;