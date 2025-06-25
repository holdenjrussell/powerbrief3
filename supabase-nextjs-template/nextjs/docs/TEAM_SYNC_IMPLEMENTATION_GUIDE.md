# Team Sync Implementation Guide

## Overview
This guide outlines the implementation of team management features, scorecard enhancements, and related functionality for the Team Sync tab.

## Implementation Checklist

### Phase 1: Teams Infrastructure ✅
- [x] Create database migrations for teams
  - [x] `teams` table with id, brand_id, name, created_at, updated_at
  - [x] `team_members` junction table with team_id, user_id, created_at
  - [x] `team_feature_access` table for feature permissions
  - [x] Update existing users to be on "Creative Team" by default
  - [x] Add default teams (Creative Team, Marketing Team, CRO)
- [x] Update brand_shares table
  - [x] Add team_ids array field
  - [x] Add first_name and last_name fields
- [x] Create Teams CRUD API endpoints
  - [x] GET /api/teams
  - [x] POST /api/teams
  - [x] PUT /api/teams/[id]
  - [x] DELETE /api/teams/[id] (no cascade)
- [x] Create team member management endpoints
  - [x] GET /api/teams/[id]/members
  - [x] POST /api/teams/[id]/members
  - [x] DELETE /api/teams/[id]/members/[userId]
- [x] Create feature access endpoints
  - [x] GET /api/teams/[id]/features
  - [x] PUT /api/teams/[id]/features

### Phase 2: Global Team Selector ✅
- [x] Create TeamSelector component
- [x] Add to global header/navigation (AppLayout)
- [x] Implement team switching logic
- [x] Update global state management for selected team (BrandContext)
- [ ] Filter Team Sync data based on selected team

### Phase 3: Brand Config - Team Management
- [ ] Create Teams management UI in Brand Config
  - [ ] List all teams
  - [ ] Add/Edit/Delete teams
  - [ ] Manage team members
  - [ ] Configure feature access per team
- [ ] Feature access controls for:
  - [ ] PowerBrief (OneSheet, Ads, Web Assets, Email, SMS, Organic Social, Blog)
  - [ ] PowerFrame
  - [ ] UGC Creator Pipeline
  - [ ] Team Sync
  - [ ] Asset Reviews
  - [ ] Ad Ripper
  - [ ] Ad Upload Tool
  - [ ] URL to Markdown

### Phase 4: Scorecard - Meta API Integration
- [x] Create scorecard_metrics table
  - [x] Store metric configurations
  - [x] Store metric goals and comparison operators
- [x] Create scorecard_data table
  - [x] Store calculated metric values
  - [x] Store historical data for charting
- [ ] Implement Meta API integration
  - [ ] Reference OneSheet implementation
  - [ ] Support multiple ad accounts
  - [ ] Aggregate data across accounts
- [ ] Create metrics calculation service
  - [ ] Meta account ROAS (omni purchase roas / spend)
  - [ ] Meta account spend
  - [ ] Meta account revenue (omni purchase value)
  - [ ] Creative testing ROAS (with campaign selector)
  - [ ] Creative testing spend
  - [ ] Creative testing revenue
  - [ ] Video ads ROAS
  - [ ] Image ads ROAS
  - [ ] Click through rate (link)
  - [ ] Click to purchase rate (omni purchases / link clicks)
  - [ ] Cost per unique link click

### Phase 5: Scorecard UI Components
- [ ] Date range selector
  - [ ] Last 13 weeks (default)
  - [ ] QTD, YTD, Current Quarter, Current Year
- [ ] Period selector (1, 4, 13 weeks)
- [ ] Metrics table with:
  - [ ] Current values
  - [ ] Averages
  - [ ] Goals
  - [ ] Status indicators (on track, at risk, off track)
- [ ] Metric chart modal
  - [ ] Show progression over time
  - [ ] Display goal line
- [ ] Campaign selector modal for creative testing metrics
- [ ] Refresh data button

### Phase 6: Team Sync Enhancements
- [x] Update announcements
  - [x] Add resolved status column in migration
  - [x] Add global announcements feature columns
- [ ] Update todos
  - [ ] Add creator tracking
  - [ ] Fix team member assignment
  - [ ] Add send to other teams feature
- [ ] Update issues
  - [ ] Add creator tracking
  - [ ] Add send to other teams feature
  - [ ] Create issue from metric feature
- [ ] Filter all data by selected team

### Phase 7: Brand Sharing Updates
- [ ] Update brand sharing UI
  - [ ] Show team assignments
  - [ ] Add first/last name fields
  - [ ] Display full names in team member selectors

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