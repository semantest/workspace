/*
                        Semantest - Google Images Domain Entities
                        Entity Exports

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

// Core Domain Entities
export * from './google-image-download.entity';
export * from './google-image-search-session.entity';

// Re-export commonly used types
export type {
    DownloadStatus,
    DownloadProgress,
    DownloadAttempt
} from './google-image-download.entity';

export type {
    SearchStatus,
    SearchMetrics,
    SearchFilters,
    SearchConfiguration
} from './google-image-search-session.entity';

export * from './image.entity';
export * from './download.entity';
export * from './search-result.entity';