/*
                        Semantest - AR/VR Module Main Export
                        Central export point for AR/VR visualization module

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

// Domain exports
export * from './domain/entities/visualization-session.entity';
export * from './domain/events';
export * from './domain/value-objects';

// Application services
export * from './application/services/test-visualization.service';

// Infrastructure adapters
export * from './infrastructure/adapters/interfaces';
export * from './infrastructure/adapters/three-visualization-engine.adapter';
export * from './infrastructure/adapters/webxr.adapter';

// Re-export core types for convenience
export type { 
  TestFrameworkResult, 
  TestFrameworkSuite 
} from './application/services/test-visualization.service';