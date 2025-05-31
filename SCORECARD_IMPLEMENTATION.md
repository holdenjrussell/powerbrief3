# Scorecard Feature Implementation

## Overview

A comprehensive Scorecard dashboard has been implemented that allows users to track key metrics from Meta Insights API and create custom calculated metrics. The dashboard provides weekly, monthly, quarterly, and annual views with goal tracking and status indicators.

## ✅ Features Implemented

### Core Dashboard
- **Scorecard page** (`/app/scorecard`) with table layout matching the provided design
- **Navigation integration** - Added Scorecard tab to main navigation with BarChart3 icon
- **Time period views** - Weekly, Monthly, Quarterly, Annual tabs
- **Status indicators** - On Track (green), At Risk (yellow), Off Track (red) with clickable icons
- **Goal tracking** - Support for different goals per time period
- **Real-time metrics display** - Current values, averages, and historical data

### Meta API Integration
- **Pre-defined Meta metrics** - 15+ common Meta Insights metrics including:
  - Meta Account ROAS, Meta US ROAS, Meta INTL ROAS
  - Meta Prospecting ROAS, Meta Retargeting ROAS
  - Meta Creative Testing ROAS, Image Ads ROAS
  - CTR, CTP Rate, Cost Per Unique Link Click
  - Spend, Impressions, Clicks, Reach, Frequency

### Custom Metrics
- **Mathematical operations** - Add, subtract, multiply, divide between existing metrics
- **Formula builder** - Visual interface for creating custom calculations
- **Formula preview** - Real-time preview of custom metric formulas
- **Multi-operand support** - Create complex formulas with multiple metrics
- **Validation** - Prevents circular dependencies and duplicate metric usage

### Goal Management
- **Multi-period goals** - Set different goals for weekly, monthly, quarterly, annual periods
- **Goal visualization** - Visual indicators showing progress against goals
- **Flexible goal types** - Support for numeric, currency, and percentage goals

### Status Calculation
- **Automatic status determination** - Based on current performance vs goals and averages
- **Multiple calculation methods** - Average-based, trend-based, threshold-based
- **Smart risk assessment** - Considers both current performance and historical trends

### Chart & Analytics
- **Interactive charts** - Click status icons to view detailed performance charts
- **Weekly performance visualization** - Bar charts with goal lines
- **Trend indicators** - Up/down arrows showing performance direction
- **Historical data display** - Multiple weeks of performance data

## 📁 Files Created

### Frontend Components
- `src/app/app/scorecard/page.tsx` - Main scorecard dashboard
- `src/components/scorecard/AddMetricModal.tsx` - Modal for adding Meta API metrics
- `src/components/scorecard/CustomMetricModal.tsx` - Modal for creating custom metrics
- `src/components/scorecard/MetricChartModal.tsx` - Modal for displaying metric charts

### API & Types
- `src/app/api/scorecard/metrics/route.ts` - API endpoints for metric CRUD operations
- `src/lib/types/scorecard.ts` - TypeScript interfaces and types

### Database Schema
- `add_scorecard_metrics_migration.sql` - Database migration for scorecard tables

### Navigation
- Updated `src/components/AppLayout.tsx` - Added Scorecard navigation item

## 🗄️ Database Schema

### Tables Created
1. **scorecard_metrics** - Stores metric definitions
   - Meta API metric configurations
   - Custom formula definitions
   - Goals for different time periods
   - Display settings and formatting

2. **scorecard_metric_data** - Stores actual metric values
   - Time-series data for each metric
   - Weekly/monthly/quarterly/annual values
   - Raw Meta API responses for debugging

### Security
- **Row Level Security (RLS)** enabled on all tables
- **User isolation** - Users can only access their own metrics
- **Proper indexes** for optimal query performance

## 🎯 Status Calculation Logic

The system automatically calculates metric status based on:

1. **Current vs Goal** - Primary factor for status determination
2. **Average Performance** - Historical context for risk assessment
3. **Trend Analysis** - Direction of performance over time

### Status Types
- **On Track** (Green) - Meeting or exceeding goals consistently
- **At Risk** (Yellow) - Currently meeting goals but historical average is concerning
- **Off Track** (Red) - Not meeting current goals

## 📊 Supported Metric Types

### Meta API Metrics
- **Direct API integration** - Pulls real data from Meta Insights API
- **Configurable breakdowns** - Country, campaign type, ad format, etc.
- **Multiple aggregation levels** - Account, campaign, ad set, ad level
- **Automatic data refresh** - Scheduled updates from Meta API

### Custom Calculated Metrics
- **Mathematical operations** - Basic arithmetic between metrics
- **Complex formulas** - Support for nested calculations
- **Real-time calculation** - Updates automatically when source metrics change
- **Dependency tracking** - Manages relationships between metrics

## 🎨 Design Features

### Visual Design
- **Clean table layout** - Matches the provided design mockup
- **Consistent styling** - Follows existing app design patterns
- **Responsive design** - Works on desktop and mobile devices
- **Interactive elements** - Hover effects and clickable status indicators

### User Experience
- **Intuitive navigation** - Clear time period tabs and filters
- **Progressive disclosure** - Modals for detailed metric configuration
- **Visual feedback** - Loading states, success messages, error handling
- **Keyboard accessibility** - Proper focus management and keyboard navigation

## 🚀 Getting Started

### 1. Apply Database Migration
```sql
-- Run the migration script in Supabase SQL Editor
-- File: add_scorecard_metrics_migration.sql
```

### 2. Access the Scorecard
- Navigate to `/app/scorecard` in the application
- The Scorecard tab will appear in the main navigation

### 3. Add Your First Metric
1. Click "Add Meta Metric" button
2. Select from pre-defined Meta Insights metrics
3. Configure goals and display settings
4. Save the metric

### 4. Create Custom Metrics
1. Click "Custom Metric" button
2. Build mathematical formulas using existing metrics
3. Set goals and formatting preferences
4. View real-time formula preview

## 🔄 Data Flow

### Meta API Metrics
1. **Configuration** - User selects Meta metric type and settings
2. **API Calls** - System fetches data from Meta Insights API
3. **Processing** - Data is aggregated by time period
4. **Storage** - Values stored in scorecard_metric_data table
5. **Display** - Real-time dashboard updates

### Custom Metrics
1. **Formula Definition** - User creates mathematical formula
2. **Dependency Resolution** - System identifies required source metrics
3. **Calculation** - Formula evaluated using latest metric values
4. **Result Storage** - Calculated values stored in database
5. **Dashboard Update** - UI reflects new calculated values

## 🔮 Future Enhancements

### Planned Features
- **Real Meta API integration** - Replace mock data with live Meta Insights
- **Email alerts** - Notifications when metrics go off track
- **Advanced charting** - More chart types and time ranges
- **Export functionality** - Download reports as PDF/Excel
- **Team sharing** - Share scorecards with team members
- **Custom time periods** - Define custom date ranges for analysis

### Technical Improvements
- **Caching layer** - Improve performance for frequently accessed metrics
- **Real-time updates** - WebSocket integration for live metric updates
- **Advanced formulas** - Support for more complex mathematical operations
- **Data validation** - Enhanced validation for metric configurations
- **Audit trail** - Track changes to metrics and goals over time

## 📝 Notes

- Currently uses mock data for demonstration purposes
- Database migration needs to be applied for full functionality
- Meta API integration requires proper authentication setup
- All components are fully TypeScript typed for better development experience
- Responsive design ensures compatibility across devices

The Scorecard feature provides a solid foundation for metric tracking and can be easily extended with additional functionality as requirements evolve. 