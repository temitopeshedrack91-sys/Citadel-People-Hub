import React from 'react';
import { TrellisApp } from '../trellis/TrellisApp';

export const ProjectsView: React.FC = () => {
  return (
    <div className="w-full animate-fade-in">
      <TrellisApp />
    </div>
  );
};

export default ProjectsView;
