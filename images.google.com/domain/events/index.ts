/*
                        Semantest - Google Images Domain Events
                        Event Exports

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

// Core Google Images Events
export * from './download-requested.event';
export * from './download-completed.event';
export * from './download-failed.event';
export * from './search-completed.event';

// Re-export commonly used types
export type {
    GoogleImageElement,
    GoogleImageDownloadOptions
} from './download-requested.event';

export type {
    GoogleImageDownloadMetadata
} from './download-completed.event';

export type {
    GoogleImageDownloadFailurePhase,
    GoogleImageDownloadFailureContext
} from './download-failed.event';

export type {
    GoogleImageSearchResult,
    GoogleImageSearchMetadata
} from './search-completed.event';