# Admin Dashboard Access

## Accessing the Dashboard

To access the admin dashboard for viewing participant data:

1. Add `?admin=true` to the URL
2. Example: `https://your-app-url.com?admin=true`

## Dashboard Features

### Overview Stats
- Total participants count
- Completed tests
- Tests in progress

### Participant List
- View all participants with their IDs and IP addresses
- See start and completion timestamps
- Filter by status (Completed / In Progress)

### Individual Participant Details
Click on any participant row to expand and view:
- **Think-Aloud Transcripts**: All recorded audio transcripts from each task
- **Response Data**: Complete JSON of all answers and ratings
- **Export Options**: Download individual participant data as JSON

### Bulk Export
- Click "Export CSV" to download all participant summary data
- Includes: Participant ID, IP Address, Timestamps, Status, User Agent

## Data Privacy

⚠️ **Important**: This dashboard displays IP addresses and user information. Ensure compliance with:
- Privacy regulations (GDPR, CCPA, etc.)
- Your institution's IRB requirements
- Informed consent agreements

Consider anonymizing IP addresses in production deployments.

## Technical Details

### Backend Routes
All admin routes are prefixed with `/make-server-b0f3b375/admin/`

- `GET /admin/participants` - List all participants
- `GET /admin/participant/:id` - Get detailed data for specific participant

### Data Storage
- Participant metadata: `participant:{id}`
- Transcripts: `transcript:{participantId}:task{taskNumber}`
- All data stored in Supabase KV store
