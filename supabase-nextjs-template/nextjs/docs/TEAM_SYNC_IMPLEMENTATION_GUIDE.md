# Team Sync Implementation Guide

## Overview
This guide covers the complete implementation of team management and enhanced team sync features for the PowerBrief platform.

## Implementation Progress

### Phase 1: Teams Infrastructure ✅
**Status: COMPLETE**

#### Database Schema ✅
- [x] **Teams Table** (`teams`)
  - `id` - UUID primary key
  - `brand_id` - Foreign key to brands
  - `name` - Team name
  - `is_default` - Boolean flag for default team
  - `created_at`, `updated_at` - Timestamps

- [x] **Team Members** (`team_members`)
  - `id` - UUID primary key
  - `team_id` - Foreign key to teams
  - `user_id` - Foreign key to users
  - `joined_at` - Timestamp

- [x] **Team Feature Access** (`team_feature_access`)
  - `id` - UUID primary key
  - `team_id` - Foreign key to teams
  - `feature_name` - Feature identifier
  - `is_enabled` - Boolean flag
  - `created_at`, `updated_at` - Timestamps

- [x] **Updates to existing tables**:
  - `brand_shares` - Add `team_ids` array, `first_name`, `last_name`
  - `team_sync_announcements` - Add `is_resolved`, `is_global`, `target_team_ids`
  - `team_sync_todos` - Add `target_team_id`
  - `team_sync_issues` - Add `target_team_id`

#### API Endpoints ✅
- [x] `GET /api/teams` - List teams for a brand
- [x] `POST /api/teams` - Create new team
- [x] `PUT /api/teams/[id]` - Update team
- [x] `DELETE /api/teams/[id]` - Delete team (prevent default team deletion)
- [x] `GET /api/teams/[id]/members` - Get team members
- [x] `POST /api/teams/[id]/members` - Add team member
- [x] `DELETE /api/teams/[id]/members/[userId]` - Remove team member
- [x] `GET /api/teams/[id]/features` - Get feature access
- [x] `PUT /api/teams/[id]/features` - Update feature access

#### Frontend Components ✅
- [x] **TeamSelector Component** (`/components/teams/TeamSelector.tsx`)
  - Dropdown selector integrated with BrandContext
  - Shows teams for selected brand
  - Persists selection in localStorage
  
- [x] **BrandContext Updates**
  - Added `selectedTeam` and `setSelectedTeam`
  - Team selection persists per brand
  - Clears team when brand changes

- [x] **AppLayout Integration**
  - TeamSelector added to header navigation

### Phase 2: Filter Team Sync data based on selected team ✅
**Status: COMPLETE**

#### AnnouncementsTab ✅
- [x] Filter announcements by `target_team_ids` (includes selected team or is global)
- [x] Add "Send to Other Teams" button for cross-team announcements
- [x] Add global announcement toggle when creating
- [x] Add resolved status with visual indicators
- [x] Mark as resolved functionality

#### TodosTab ✅
- [x] Filter todos by `target_team_id`
- [x] Team member assignment limited to selected team members
- [x] Add creator tracking (who created the todo)
- [x] Add "Send to Other Teams" functionality

#### IssuesTab ✅
- [x] Filter issues by `target_team_id`
- [x] Add creator tracking
- [x] Add "Send to Other Teams" functionality
- [x] Create issue from metric threshold breach

### Phase 3: Brand Config - Team Management ✅
**Status: COMPLETE**

#### Team Management UI ✅
- [x] **TeamManagement Component** (`/components/teams/TeamManagement.tsx`)
  - List all teams for the brand
  - Create/Edit/Delete teams (with protection for default teams)
  - Manage team members (add/remove)
  - Configure feature access per team
  - Visual indicators for default team
  
- [x] **Integration with Brand Config**
  - Added to `/app/powerbrief/[brandId]/page.tsx`
  - New card in brand configuration

### Phase 4: Scorecard - Meta API Integration ✅
**Status: COMPLETE**

#### Database Schema ✅
- [x] **Scorecard Metrics** (`scorecard_metrics`)
  - Stores metric configurations per brand/team
  - Goal values and operators
  - Meta campaign filters
  
- [x] **Scorecard Data** (`scorecard_data`)
  - Stores calculated metric values
  - Historical data tracking

#### API Endpoints ✅
- [x] `GET /api/scorecard/metrics` - Get metrics for brand/team
- [x] `POST /api/scorecard/metrics` - Create metric
- [x] `PUT /api/scorecard/metrics` - Update metric
- [x] `DELETE /api/scorecard/metrics` - Delete metric
- [x] `POST /api/scorecard/meta-insights` - Fetch data from Meta API
- [x] `POST /api/scorecard/refresh` - Refresh all metrics data

### Phase 5: Scorecard UI Components ✅
**Status: COMPLETE**

#### Components ✅
- [x] **ScorecardMetrics** (`/components/scorecard/ScorecardMetrics.tsx`)
  - Main scorecard component with date range controls
  - Metric listing with status indicators
  - Period navigation
  
- [x] **MetricRow** (`/components/scorecard/MetricRow.tsx`)
  - Individual metric display
  - Status icons based on goal achievement
  - Trend indicators
  
- [x] **MetricChartModal** (`/components/scorecard/MetricChartModal.tsx`)
  - Line chart visualization using recharts
  - Goal reference lines
  - Summary statistics
  
- [x] **MetricConfigModal** (`/components/scorecard/MetricConfigModal.tsx`)
  - Metric creation/editing
  - Formula builder
  - Goal configuration
  - Filter setup (UI ready, backend pending)

#### Integration ✅
- [x] Integrated into ScorecardTab
- [x] Connected to team context for filtering
- [x] Mock data for development
- [x] recharts package installed

### Phase 6: Default Teams Creation ✅
**Status: COMPLETE**

#### Database Functions ✅
- [x] `create_default_teams_for_brand()` - Creates default teams when brand is created
- [x] Trigger on brand creation
- [x] Default teams: Creative Team, Marketing Team, CRO

#### Migration Scripts ✅
- [x] Add default teams for existing brands
- [x] Add existing users to Creative Team (default)
- [x] Set Creative Team as `is_default = true`

## Testing Checklist

### Pre-Deployment Testing
- [ ] Test team creation, editing, deletion
- [ ] Verify default team protection
- [ ] Test team member management
- [ ] Verify team filtering in Team Sync tabs
- [ ] Test scorecard metric creation
- [ ] Test Meta API integration (requires Meta connection)
- [ ] Verify RLS policies work correctly
- [ ] Test cross-team functionality

### Production Migration
1. [ ] Run migration `20250131000002_add_teams_infrastructure.sql`
2. [ ] Run migration `20250131000003_add_scorecard_tables.sql`
3. [ ] Verify all existing users added to default teams
4. [ ] Test team selector in production
5. [ ] Monitor for any errors

## Known Limitations
1. Scorecard filters (campaign, ad set, ad) are UI-only currently
2. Meta API integration requires active Meta connection
3. Scorecard data is mocked in development mode

## Next Steps
1. Implement scorecard filter functionality backend
2. Add real-time scorecard data updates
3. Add export functionality for scorecard data
4. Implement team-based permissions beyond feature flags

## Database Schema Changes

### New Tables

```sql
-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Team members junction table
CREATE TABLE team_members (
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (team_id, user_id)
);

-- Team feature access
CREATE TABLE team_feature_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  has_access BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(team_id, feature_key)
);

-- Scorecard metrics configuration
CREATE TABLE scorecard_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  goal_value DECIMAL,
  goal_operator TEXT CHECK (goal_operator IN ('gt', 'gte', 'lt', 'lte', 'eq')),
  meta_campaigns TEXT[], -- For creative testing metrics
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Scorecard data
CREATE TABLE scorecard_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_id UUID REFERENCES scorecard_metrics(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  value DECIMAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(metric_id, period_start, period_end)
);
```

### Table Updates

```sql
-- Update brand_shares
ALTER TABLE brand_shares 
ADD COLUMN team_ids UUID[] DEFAULT '{}',
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT;

-- Update team_sync_announcements
ALTER TABLE team_sync_announcements
ADD COLUMN is_resolved BOOLEAN DEFAULT false,
ADD COLUMN is_global BOOLEAN DEFAULT false,
ADD COLUMN target_team_ids UUID[] DEFAULT '{}';

-- Update team_sync_todos and team_sync_issues
ALTER TABLE team_sync_todos
ADD COLUMN target_team_id UUID REFERENCES teams(id);

ALTER TABLE team_sync_issues
ADD COLUMN target_team_id UUID REFERENCES teams(id),
ADD COLUMN source_metric_id UUID REFERENCES scorecard_metrics(id);
```

## API Endpoints

### Teams Management ✅
- `GET /api/teams?brandId={brandId}` - Get all teams for a brand
- `POST /api/teams` - Create a new team
- `PUT /api/teams/[id]` - Update team details
- `DELETE /api/teams/[id]` - Delete a team (soft delete or prevent if has data)

### Team Members ✅
- `GET /api/teams/[id]/members` - Get team members
- `POST /api/teams/[id]/members` - Add team members
- `DELETE /api/teams/[id]/members/[userId]` - Remove team member

### Feature Access ✅
- `GET /api/teams/[id]/features` - Get feature access settings
- `PUT /api/teams/[id]/features` - Update feature access

### Scorecard
- `GET /api/scorecard/metrics?brandId={brandId}&teamId={teamId}` - Get metric configs
- `POST /api/scorecard/metrics` - Create/update metric config
- `GET /api/scorecard/data?metricId={metricId}&dateRange={range}&period={period}` - Get metric data
- `POST /api/scorecard/refresh` - Refresh data from Meta API

## Component Structure

```
components/
├── teams/
│   ├── TeamSelector.tsx ✅
│   ├── TeamManagement.tsx
│   ├── TeamMembersList.tsx
│   └── FeatureAccessControl.tsx
├── scorecard/
│   ├── ScorecardMetrics.tsx
│   ├── MetricRow.tsx
│   ├── MetricChartModal.tsx
│   ├── DateRangeSelector.tsx
│   ├── PeriodSelector.tsx
│   ├── CampaignSelectorModal.tsx
│   └── MetricGoalConfig.tsx
└── team-sync/
    ├── EnhancedAnnouncements.tsx
    ├── EnhancedTodos.tsx
    └── EnhancedIssues.tsx
```

## Implementation Status

### Completed
- [x] Database migrations for teams infrastructure
- [x] Database migrations for scorecard tables
- [x] RLS policies for all new tables
- [x] Default team creation function
- [x] Default scorecard metrics initialization
- [x] Teams CRUD API endpoints
- [x] Team members management endpoints
- [x] Feature access management endpoints
- [x] TeamSelector component
- [x] Global team selector integration in AppLayout
- [x] BrandContext updated with team support

### In Progress
- [ ] Team management UI in Brand Config
- [ ] Meta API integration for scorecard

### Next Steps
1. Create team management UI in brand config
2. Implement Meta API integration for scorecard
3. Build scorecard UI components
4. Enhance team sync with team filtering

## Notes
- All migrations will be provided but not run automatically
- Type errors from missing migrations will be temporarily ignored
- Using existing brand sharing infrastructure
- Referencing OneSheet implementation for Meta API integration
- Following Supabase best practices and rules

## Migration Files Created
1. `20250131000002_add_teams_infrastructure.sql` - Teams, team members, feature access tables
2. `20250131000003_add_scorecard_tables.sql` - Scorecard metrics and data tables

## API Files Created
1. `/api/teams/route.ts` - GET and POST for teams
2. `/api/teams/[id]/route.ts` - PUT and DELETE for individual teams
3. `/api/teams/[id]/members/route.ts` - GET and POST for team members
4. `/api/teams/[id]/members/[userId]/route.ts` - DELETE for removing team members
5. `/api/teams/[id]/features/route.ts` - GET and PUT for feature access

## Component Files Created
1. `/components/teams/TeamSelector.tsx` - Global team selector component