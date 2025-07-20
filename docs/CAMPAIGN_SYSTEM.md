# Campaign Model and API Documentation

## Task #7 Implementation Summary

This document describes the implementation of the Campaign Model and API for the Blessed-Horizon crowdfunding platform.

## Database Schema Enhancements

### New Tables Created

1. **campaign_media**
   - Better media management with type, ordering, and primary flag
   - Supports images, videos, and documents

2. **campaign_categories**
   - Pre-populated with 8 default categories
   - Includes icons for UI display

3. **campaign_tags**
   - Flexible tagging system for better searchability

4. **campaign_beneficiaries**
   - Track who benefits from the campaign

### Enhanced Campaign Fields

- Location tracking (country, city, coordinates)
- Soft delete support (deleted_at)
- View tracking (last_viewed_at)
- Featured campaigns (featured_until)
- Donation limits (min/max amounts)
- Verification fields
- Category association

### Database Functions

1. **validate_campaign_status_transition()** - Ensures valid status workflows
2. **calculate_campaign_progress()** - Calculate funding percentage
3. **can_user_create_campaign()** - Check if user can create campaigns
4. **generate_campaign_slug()** - Auto-generate SEO-friendly URLs

## Supabase Edge Functions

### 1. create-campaign
- **Endpoint**: `/functions/v1/create-campaign`
- **Method**: POST
- **Auth**: Required (Bearer token)
- **Features**:
  - Validates user verification status
  - Checks campaign creation limits (max 3 active)
  - Validates all required fields
  - Creates tags and beneficiaries
  - Auto-generates slug

### 2. update-campaign
- **Endpoint**: `/functions/v1/update-campaign`
- **Method**: POST
- **Auth**: Required
- **Features**:
  - Status-based field restrictions
  - Owner-only updates
  - Validation for amounts and deadlines

### 3. get-campaign
- **Endpoint**: `/functions/v1/get-campaign?id={id}&slug={slug}`
- **Method**: GET
- **Auth**: Optional
- **Features**:
  - Fetch by ID or slug
  - Includes all related data (media, tags, milestones, etc.)
  - Updates view count
  - Returns permissions based on user

### 4. list-campaigns
- **Endpoint**: `/functions/v1/list-campaigns`
- **Method**: GET
- **Auth**: Optional
- **Query Parameters**:
  - page, limit (pagination)
  - need_type, category_id, status (filters)
  - country, search (search)
  - sort_by, order (sorting)
  - featured_only, recipient_id (special filters)

### 5. delete-campaign
- **Endpoint**: `/functions/v1/delete-campaign`
- **Method**: POST
- **Auth**: Required
- **Features**:
  - Soft delete only
  - Cannot delete campaigns with donations
  - Status restrictions

### 6. submit-campaign-for-review
- **Endpoint**: `/functions/v1/submit-campaign-for-review`
- **Method**: POST
- **Auth**: Required
- **Features**:
  - Validates campaign completeness
  - Creates moderation queue entry
  - Status transition to PENDING_REVIEW

## Frontend Service Layer

### campaignService.js

A comprehensive service layer providing:

- **CRUD Operations**: create, update, get, list, delete
- **Media Management**: upload, delete media files
- **Tag Management**: add, remove tags
- **Beneficiary Management**: add beneficiaries
- **Status Management**: update status with validation
- **User Campaigns**: get user's campaigns with stats
- **Statistics**: campaign performance metrics
- **Search**: full-text search with filters

### Usage Examples

```javascript
import { campaignService } from './lib/campaignService';

// Create a campaign
const campaign = await campaignService.createCampaign({
  title: "Help Build a Community Well",
  need_type: "COMMUNITY_LONG_TERM",
  goal_amount: 5000,
  currency: "USD",
  deadline: "2024-12-31",
  story_markdown: "Our community needs clean water...",
  budget_breakdown: [
    { description: "Well drilling", amount: 3000, category: "construction" },
    { description: "Pump system", amount: 1500, category: "equipment" },
    { description: "Maintenance fund", amount: 500, category: "operations" }
  ],
  category_id: "community-category-id",
  location_country: "KE",
  location_city: "Nairobi",
  tags: ["water", "community", "health"]
});

// List active campaigns
const { campaigns, pagination } = await campaignService.listCampaigns({
  status: 'active',
  page: 1,
  limit: 12,
  sort_by: 'created_at'
});

// Upload campaign media
const mediaRecord = await campaignService.uploadMedia(
  campaign.id,
  imageFile,
  { 
    media_type: 'image',
    caption: 'Current water situation',
    is_primary: true 
  }
);
```

## Security Features

### Row Level Security (RLS)
- Public campaigns visible to all
- Campaign owners can edit their campaigns
- Status-based edit restrictions
- Proper authorization checks

### Validation Rules
- Minimum goal: $100
- Maximum goal: $1,000,000
- Deadline: 7 days to 1 year
- Story: minimum 200 characters
- Title: minimum 10 characters
- Budget breakdown required
- At least one image required

### Status Workflow
```
DRAFT → PENDING_REVIEW → FUNDING → FUNDED → COMPLETED
   ↓         ↓              ↓         ↓
CANCELLED  REJECTED    CANCELLED  CANCELLED
```

## Testing

Run the test script to verify installation:

```powershell
.\test-campaign-system.ps1
```

## Deployment Steps

1. **Apply Database Migration**
   ```bash
   cd supabase
   supabase db push
   ```

2. **Create Storage Bucket**
   ```sql
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('campaign-media', 'campaign-media', true);
   ```

3. **Deploy Edge Functions**
   ```bash
   supabase functions deploy create-campaign
   supabase functions deploy update-campaign
   supabase functions deploy get-campaign
   supabase functions deploy list-campaigns
   supabase functions deploy delete-campaign
   supabase functions deploy submit-campaign-for-review
   ```

## Next Steps

With Task #7 complete, the platform now has:
- ✅ Complete campaign data model
- ✅ CRUD operations via Edge Functions
- ✅ Media upload capabilities
- ✅ Campaign categorization and tagging
- ✅ Status workflow management
- ✅ Security and validation

Ready for:
- Task #8: Campaign Creation Wizard UI
- Task #9: Campaign Listing and Browse Pages
- Task #10: Campaign Detail Page
