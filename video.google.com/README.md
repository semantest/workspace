# YouTube Video Domain Module

This module provides comprehensive YouTube video management capabilities for the Semantest platform, including video downloading, playlist synchronization, and channel management.

## Features

- **Video Download Management**: Download videos in various qualities and formats
- **Playlist Synchronization**: Sync and manage YouTube playlists 
- **Channel Subscriptions**: Subscribe to channels with automation features
- **Metadata Extraction**: Retrieve comprehensive video/channel metadata
- **Progress Tracking**: Real-time download progress monitoring
- **Quality Selection**: Support for multiple video qualities and formats

## Architecture

This module follows Domain-Driven Design (DDD) principles with clear separation of concerns:

### Domain Layer
- **Entities**: `Video`, `Channel`, `Playlist`, `Comment`
- **Value Objects**: `VideoUrl`, `VideoMetadata`
- **Events**: `VideoDownloadRequested`, `PlaylistSynced`, `ChannelSubscribed`

### Application Layer
- **Services**: `VideoDownloadService`, `PlaylistSyncService`

### Infrastructure Layer
- **Adapters**: `YouTubeApiAdapter`, `VideoDownloaderAdapter`

## Installation

```bash
npm install @semantest/video.google.com
```

## Usage

### Video Download

```typescript
import { VideoDownloadService, YouTubeApiAdapter, VideoDownloaderAdapter } from '@semantest/video.google.com';

const youtubeApi = new YouTubeApiAdapter({ apiKey: 'your-api-key' });
const videoDownloader = new VideoDownloaderAdapter();
const downloadService = new VideoDownloadService(videoDownloader, youtubeApi);

const result = await downloadService.downloadVideo(
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    {
        quality: 'high',
        format: 'mp4',
        outputPath: './downloads'
    },
    (progress) => {
        console.log(`Download progress: ${progress.percentage}%`);
    }
);
```

### Playlist Sync

```typescript
import { PlaylistSyncService, YouTubeApiAdapter } from '@semantest/video.google.com';

const youtubeApi = new YouTubeApiAdapter({ apiKey: 'your-api-key' });
const syncService = new PlaylistSyncService(youtubeApi);

const result = await syncService.syncPlaylist(
    'https://www.youtube.com/playlist?list=PLrAXtmRdnEQy4R4qKHsxjBh0iF0n6u5vY',
    {
        fullSync: true,
        includeUnavailable: false
    }
);
```

## Configuration

### YouTube API Setup

1. Create a project in Google Cloud Console
2. Enable YouTube Data API v3
3. Create credentials (API Key)
4. Configure the API adapter:

```typescript
const youtubeApi = new YouTubeApiAdapter({
    apiKey: 'your-api-key',
    timeout: 30000,
    maxRetries: 3
});
```

### Download Configuration

```typescript
const downloadConfig = {
    quality: 'high',
    format: 'mp4',
    includeAudio: true,
    includeSubtitles: false,
    outputPath: './downloads',
    maxFileSize: 1024 * 1024 * 1024 // 1GB
};
```

## Quality Options

- `highest`: Best available quality (1080p+)
- `high`: High quality (720p-1080p)
- `medium`: Medium quality (480p-720p)
- `low`: Low quality (360p-480p)
- `lowest`: Lowest available quality (144p-360p)

## Events

The module emits domain events for integration with other systems:

- `VideoDownloadRequested`: When a video download is requested
- `PlaylistSynced`: When a playlist sync is completed
- `ChannelSubscribed`: When a channel subscription is created

## Testing

```bash
npm test
npm run test:coverage
```

## License

GPL-3.0 - See LICENSE file for details.