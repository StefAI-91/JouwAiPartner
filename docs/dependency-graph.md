# Dependency Graph

> Auto-generated on 2026-04-30. Do not edit manually.
> Run `node scripts/generate-dep-graph.js` to regenerate.

## Overview

| Metric | Count |
|--------|-------|
| Files scanned | 566 |
| Exported functions/constants | 868 |
| Exported types/interfaces | 354 |
| Cross-package imports | 583 |
| Critical integration points (3+ packages) | 14 |

## Package Dependency Flow

```
┌─────────────────────────────────────────────────────────┐
│                      APPS                              │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │   Cockpit    │    │    DevHub     │                  │
│  │ pages/actions│    │ pages/actions │                  │
│  └──────┬───┬──┘    └──┬────┬───────┘                  │
│         │   │          │    │                           │
└─────────┼───┼──────────┼────┼───────────────────────────┘
          │   │          │    │
  ┌───────▼───▼──────────▼────▼───────────────────────┐
  │                   PACKAGES                        │
  │                                                   │
  │  ┌────────────┐   ┌───────┐   ┌──────┐  ┌─────┐  │
  │  │  database  │◄──│  ai   │   │ auth │  │ mcp │  │
  │  │queries/mut.│   │agents/│   │      │  │     │  │
  │  │            │   │pipeline│  │      │  │     │  │
  │  └─────┬──────┘   └───┬───┘   └──────┘  └──┬──┘  │
  │        │              │                     │     │
  └────────┼──────────────┼─────────────────────┼─────┘
           │              │                     │
           ▼              ▼                     ▼
       Supabase     Claude/Cohere          MCP Clients
```

## Database Clients

### `supabase/admin.ts`

**Exports:**
- `getAdminClient()`

### `supabase/client.ts`

**Exports:**
- `createClient()`

### `supabase/server.ts`

**Exports:**
- `createClient()`

## Database Queries

### `queries/action-items.ts`

**Exports:**
- `listVerifiedActionItems()`

**Types:** `ActionItemRow`

### `queries/agent-runs.ts`

**Exports:**
- `getAgentMetrics()`
- `listRecentAgentRuns()`

**Types:** `AgentMetrics`, `AgentRunRow`

### `queries/content.ts`

**Exports:**
- `searchAllContent()`
- `getStaleRows()`

**Types:** `StaleRow`

### `queries/dashboard.ts`

**Exports:**
- `getReviewQueueCount()`
- `listRecentVerifiedMeetings()`
- `listBriefingMeetings()`
- `listTodaysBriefingMeetings()`
- `getExtractionCountsByMeetingIds()`
- `getAiPulseData()`

**Types:** `RecentVerifiedMeeting`, `BriefingMeeting`, `TodaysBriefingResult`, `ExtractionCounts`, `AiPulseData`

### `queries/decisions.ts`

**Exports:**
- `matchDecisions()`
- `matchMeetings()`

**Types:** `RecentDecision`

### `queries/dev-detector.ts`

**Exports:**
- `getMeetingThemesForDevDetector()`
- `getExtractionThemesForDevDetector()`

**Types:** `DevDetectorMeetingThemeRow`, `DevDetectorExtractionThemeRow`

### `queries/emails/accounts.ts`

**Exports:**
- `listActiveGoogleAccountsSafe()`
- `listActiveGoogleAccounts()`
- `getGoogleAccountById()`
- `getGoogleAccountByEmail()`

**Types:** `GoogleAccountSafe`, `GoogleAccountRow`

### `queries/emails/detail.ts`

**Exports:**
- `getEmailById()`
- `listDraftEmails()`
- `getDraftEmailById()`

**Types:** `EmailDetail`, `ReviewEmail`

### `queries/emails/lists.ts`

**Exports:**
- `listEmails()`
- `countEmailsByFilterStatus()`
- `listEmailsByOrganization()`
- `countEmailsByDirection()`

**Types:** `EmailDirection`, `EmailFilterStatus`, `EmailListItem`

### `queries/emails/pipeline.ts`

**Exports:**
- `getExistingGmailIds()`
- `countUnprocessedEmails()`
- `getEmailForPipelineInput()`
- `listEmailsForReclassify()`
- `getUnprocessedEmails()`

**Types:** `EmailForPipelineInput`

### `queries/extractions.ts`

**Exports:**
- `getExtractionsForMeetingByType()`

**Types:** `ExtractionForHarness`

### `queries/golden.ts`

**Exports:**
- `listMeetingsWithGoldenStatus()`
- `getMeetingForGoldenCoder()`
- `getGoldenForMeeting()`

**Types:** `MeetingWithGoldenStatus`, `GoldenCoderParticipant`, `MeetingForGoldenCoder`, `GoldenItemRow`, `GoldenMeetingState`

### `queries/ignored-entities.ts`

**Exports:**
- `getIgnoredEntityNames()`

### `queries/issues/activity.ts`

**Exports:**
- `listIssueActivity()`

**Types:** `IssueActivityRow`

### `queries/issues/attachments.ts`

**Exports:**
- `getIssueThumbnails()`
- `listIssueAttachments()`
- `getIssueIdsWithAttachments()`

**Types:** `IssueAttachmentRow`

### `queries/issues/comments.ts`

**Exports:**
- `getCommentById()`
- `listIssueComments()`

**Types:** `IssueCommentRow`

### `queries/issues/core.ts`

**Exports:**
- `parseSearchQuery()`
- `listIssues()`
- `countFilteredIssues()`
- `getIssueById()`
- `getIssueCounts()`
- `countCriticalUnassigned()`
- `ISSUE_SORTS`
- `ISSUE_SELECT`

**Types:** `IssueSort`, `IssueRow`, `StatusCountKey`, `StatusCounts`

### `queries/meetings/core.ts`

**Exports:**
- `getVerifiedMeetingById()`
- `listVerifiedMeetings()`
- `listVerifiedMeetingIdsOrderedByDate()`
- `listBoardMeetings()`

**Types:** `MeetingDetail`, `RecentMeeting`, `VerifiedMeetingListItem`, `VerifiedMeetingIdRow`, `BoardMeetingListItem`

### `queries/meetings/lookup.ts`

**Exports:**
- `getMeetingByFirefliesId()`
- `getExistingFirefliesIds()`
- `getExistingMeetingsByTitleDates()`
- `getMeetingByTitleAndDate()`

### `queries/meetings/metadata.ts`

**Exports:**
- `getMeetingOrganizationId()`
- `listMeetingProjectIds()`
- `listMeetingParticipantIds()`

### `queries/meetings/pipeline-fetches.ts`

**Exports:**
- `listMeetingsForReclassify()`
- `listMeetingsWithTranscript()`
- `getMeetingForDevExtractor()`
- `getMeetingForEmbedding()`
- `getExtractionIdsAndContent()`
- `getMeetingExtractions()`
- `getMeetingExtractionsBatch()`
- `getVerifiedMeetingsWithoutSegments()`
- `getMeetingForTitleGeneration()`

**Types:** `MeetingForReclassify`, `DevExtractorMeetingOption`, `MeetingForDevExtractor`, `MeetingForBatchSegmentation`, `MeetingForTitleGeneration`

### `queries/meetings/project-summaries.ts`

**Exports:**
- `getSegmentsByMeetingId()`
- `getSegmentsByMeetingIds()`
- `getSegmentCountsByMeetingIds()`
- `getSegmentCountsByProjectIds()`
- `getSegmentNameRaw()`
- `getSegmentsByProjectId()`

**Types:** `MeetingSegment`, `ProjectSegment`

### `queries/meetings/regenerate.ts`

**Exports:**
- `getMeetingForRegenerate()`
- `getMeetingForRegenerateRisks()`
- `getMeetingForReprocess()`
- `getMeetingForBackfill()`
- `getMeetingByFirefliesIdForReprocess()`

**Types:** `MeetingForRegenerate`, `MeetingForRegenerateRisks`, `MeetingForReprocess`, `MeetingForBackfill`, `MeetingByFirefliesIdForReprocess`

### `queries/meetings/speaker-mapping.ts`

**Exports:**
- `getSpeakerMappingTranscriptCounts()`
- `countSpeakerMappingBackfillRemaining()`
- `listSpeakerMappingBackfillCandidates()`
- `getMeetingParticipantsForSpeakerMapping()`

**Types:** `SpeakerMappingParticipant`, `SpeakerMappingTranscriptCounts`, `SpeakerMappingBackfillCandidate`

### `queries/meetings/themes.ts`

**Exports:**
- `listTaggedMeetingIds()`

### `queries/needs.ts`

**Exports:**
- `listNeedsGroupedByCategory()`
- `countNeeds()`

**Types:** `NeedStatus`, `NeedRow`, `NeedsByCategory`

### `queries/organizations.ts`

**Exports:**
- `listOrganizations()`
- `getOrganizationById()`
- `getAllOrganizations()`
- `findOrganizationIdByEmailDomain()`
- `listOrganizationsByType()`

**Types:** `OrganizationListItem`, `OrganizationDetail`

### `queries/people/detail.ts`

**Exports:**
- `getPersonById()`
- `getStalePeople()`

**Types:** `PersonDetail`

### `queries/people/lists.ts`

**Exports:**
- `listPeople()`
- `listPeopleByOrganization()`
- `listPeopleWithOrg()`
- `listPeopleForAssignment()`

**Types:** `PersonListItem`, `PersonWithOrg`, `PersonForAssignment`

### `queries/people/lookup.ts`

**Exports:**
- `findPersonIdsByName()`
- `findProfileIdByName()`
- `findPeopleByNames()`
- `findPeopleByEmails()`
- `findPersonOrgByEmail()`

### `queries/people/pipeline.ts`

**Exports:**
- `getAllKnownPeople()`
- `getAdminEmails()`
- `getPeopleForContext()`

**Types:** `KnownPerson`, `PersonForContext`

### `queries/portal/access.ts`

**Exports:**
- `listPortalProjects()`
- `hasPortalProjectAccess()`

**Types:** `PortalProject`

**Depends on:**
- `@repo/auth/access` → isAdmin

### `queries/portal/core.ts`

**Exports:**
- `listPortalProjectsWithDetails()`
- `getPortalProjectDashboard()`
- `listRecentProjectIssues()`
- `getProjectIssueCounts()`
- `listPortalIssues()`
- `getPortalIssue()`

**Types:** `PortalStatusFilter`, `PortalIssueListFilters`, `PortalIssueCountFilters`, `PortalProjectWithDetails`, `PortalProjectDashboard`, `RecentPortalIssue`, `PortalIssueCounts`, `PortalIssue`

**Depends on:**
- `@repo/auth/access` → isAdmin

### `queries/portal/meetings.ts`

**Exports:**
- `listClientMeetingSegments()`
- `getClientMeetingSegment()`

**Types:** `PortalMeetingSegment`

### `queries/projects/access.ts`

**Exports:**
- `listAccessibleProjects()`

**Types:** `AccessibleProject`

**Depends on:**
- `@repo/auth/access` → listAccessibleProjectIds

### `queries/projects/core.ts`

**Exports:**
- `listProjects()`
- `getProjectById()`
- `listFocusProjects()`
- `getProjectAliases()`
- `getProjectByNameIlike()`
- `getAllProjects()`
- `getActiveProjectsForContext()`
- `getProjectName()`
- `getProjectByUserbackProjectId()`
- `matchProjectsByEmbedding()`

**Types:** `ProjectListItem`, `ProjectDetail`, `FocusProject`, `ActiveProjectForContext`

### `queries/projects/reviews.ts`

**Exports:**
- `getLatestProjectReview()`
- `listProjectReviews()`
- `getHealthTrend()`

**Types:** `ProjectReviewRow`

### `queries/reports/internals.ts`

**Exports:**
- `cutoffIsoFromDaysBack()`
- `mapIssueRow()`
- `REPORT_ISSUE_SELECT`

**Types:** `PaginatedResult`, `RawIssueWithAssigned`, `IssueReportRow`

### `queries/reports/issues.ts`

**Exports:**
- `getProjectIssuesForReport()`
- `getIssueDetailForReport()`

**Types:** `IssueCommentReport`, `IssueActivityReport`, `IssueDetailReport`

### `queries/reports/project.ts`

**Exports:**
- `getProjectActivityForReport()`
- `getProjectContextForReport()`

**Types:** `ProjectActivityEvent`, `ProjectContextReport`

### `queries/review.ts`

**Exports:**
- `listDraftMeetings()`
- `getDraftMeetingById()`
- `getReviewStats()`

**Types:** `ReviewMeeting`, `ReviewMeetingDetail`

### `queries/summaries/core.ts`

**Exports:**
- `getLatestSummary()`
- `getSummaryHistory()`

**Types:** `SummaryRow`

### `queries/summaries/management-insights.ts`

**Exports:**
- `getManagementInsights()`
- `getDismissedInsightKeys()`

### `queries/summaries/weekly.ts`

**Exports:**
- `getWeeklyProjectData()`
- `getLatestWeeklySummary()`
- `listWeeklySummaries()`

**Types:** `WeeklyProjectData`

### `queries/tasks.ts`

**Exports:**
- `listActiveTasks()`
- `hasTaskForExtraction()`
- `getPromotedExtractionIds()`
- `listAllTasks()`

**Types:** `TaskRow`

### `queries/team.ts`

**Exports:**
- `listTeamMembers()`
- `getUserWithAccess()`
- `countAdmins()`
- `getProfileRole()`
- `getProfileNameById()`

**Types:** `TeamRole`, `ProfileRole`, `TeamMember`, `TeamMemberWithAccess`

### `queries/themes/core.ts`

**Exports:**
- `listVerifiedThemes()`
- `listVerifiedThemes()`
- `listVerifiedThemes()`
- `getThemeBySlug()`

**Types:** `ThemeRow`, `ThemeRejectionExample`, `ThemeWithNegativeExamples`, `ListVerifiedThemesOptions`

### `queries/themes/dashboard.ts`

**Exports:**
- `listTopActiveThemes()`
- `getThemeShareDistribution()`

**Types:** `TopActiveTheme`, `ThemeShareSlice`, `ThemeShareDistribution`

### `queries/themes/detail.ts`

**Exports:**
- `getThemeRecentActivity()`
- `getThemeMeetings()`
- `getThemeDecisions()`
- `getThemeParticipants()`

**Types:** `ThemeRecentActivity`, `ThemeMeetingExtraction`, `ThemeMeetingEntry`, `ThemeDecisionEntry`, `ThemeParticipantEntry`

### `queries/themes/internals.ts`

**Exports:**
- `windowStartIso()`
- `fetchWindowAggregation()`
- `THEME_COLUMNS_BASIC`
- `THEME_COLUMNS_FULL`
- `THEME_COLUMNS`
- `NEGATIVE_EXAMPLES_PER_THEME`
- `DEFAULT_WINDOW_DAYS`

**Types:** `ThemeBasicRow`, `WindowAggregation`

### `queries/themes/narrative.ts`

**Exports:**
- `getThemeNarrative()`
- `listThemeMeetingSummaries()`
- `INSUFFICIENT_MEETINGS_SENTINEL`

**Types:** `ThemeNarrativeRow`, `ThemeNarrativeWithStaleness`, `ThemeMeetingSummaryForNarrator`

### `queries/themes/review.ts`

**Exports:**
- `listEmergingThemes()`
- `listRejectedThemePairsForMeeting()`
- `listProposedThemesForMeeting()`

**Types:** `EmergingThemeProposalMeeting`, `EmergingThemeRow`

### `queries/topics/detail.ts`

**Exports:**
- `getTopicById()`
- `getTopicWithIssues()`

**Types:** `TopicDetailRow`, `LinkedIssueRow`, `TopicWithIssues`

### `queries/topics/linked-issues.ts`

**Exports:**
- `countIssuesPerTopic()`
- `countOpenIssuesPerTopic()`
- `getTopicMembershipForIssues()`
- `getLinkedIssueIdsInProject()`
- `getIssueIdsForTopics()`
- `getIssuesForTopic()`

**Types:** `IssueTopicMembership`

### `queries/topics/list.ts`

**Exports:**
- `listTopics()`
- `listOpenTopicsForCluster()`
- `listTopicSampleIssues()`
- `listTopicsByBucket()`
- `TOPIC_LIST_COLS`

**Types:** `TopicListRow`, `ListTopicsFilters`, `TopicForClusterRow`

### `queries/userback-issues.ts`

**Exports:**
- `getUserbackSyncCursor()`
- `getExistingUserbackIds()`
- `countUserbackIssues()`
- `listUserbackIssuesForBackfill()`

### `queries/widget/access.ts`

**Exports:**
- `getAllowedDomainsForProject()`
- `isOriginAllowedForProject()`

### `queries/widget/admin.ts`

**Exports:**
- `listWidgetProjectsWithDomains()`

**Types:** `WidgetProjectWithDomains`

## Database Mutations

### `mutations/agent-runs.ts`

**Exports:**
- `insertAgentRun()`

**Types:** `AgentRunInput`

### `mutations/audit-events.ts`

**Exports:**
- `recordAuditEvent()`

**Types:** `AuditEventInput`

### `mutations/decisions.ts`

**Exports:**
- `insertDecision()`

### `mutations/emails.ts`

**Exports:**
- `upsertGoogleAccount()`
- `updateGoogleAccountTokens()`
- `updateGoogleAccountLastSync()`
- `deactivateGoogleAccount()`
- `insertEmails()`
- `updateEmailClassification()`
- `updateEmailFilterStatus()`
- `linkEmailProject()`
- `verifyEmail()`
- `verifyEmailWithEdits()`
- `rejectEmail()`
- `updateEmailSenderPerson()`
- `updateEmailType()`
- `updateEmailPartyType()`
- `updateEmailOrganization()`
- `unlinkEmailProject()`
- `insertEmailExtractions()`

### `mutations/embeddings.ts`

**Exports:**
- `updateRowEmbedding()`
- `batchUpdateEmbeddings()`

### `mutations/extractions/core.ts`

**Exports:**
- `deleteExtractionsByMeetingId()`
- `deleteExtractionsByMeetingAndType()`
- `deleteExtractionsByMeetingTypeAndSource()`
- `getExtractionForCorrection()`
- `correctExtraction()`
- `insertExtractions()`
- `createExtraction()`
- `updateExtraction()`
- `deleteExtraction()`
- `updateNeedStatus()`

**Types:** `ExtractionInsertRow`, `NeedStatus`

### `mutations/extractions/experimental-action-items.ts`

**Exports:**
- `insertExperimentalActionItemExtraction()`

**Types:** `ExperimentalActionItemExtractionInput`

### `mutations/extractions/experimental-risks.ts`

**Exports:**
- `insertExperimentalRiskExtraction()`

**Types:** `ExperimentalRiskExtractionInput`

### `mutations/extractions/themes.ts`

**Exports:**
- `linkExtractionsToThemes()`
- `clearExtractionThemesForMeeting()`
- `clearExtractionThemesForThemeInMeeting()`

**Types:** `ExtractionThemeRow`

### `mutations/golden.ts`

**Exports:**
- `upsertGoldenMeeting()`
- `insertGoldenItem()`
- `updateGoldenItem()`
- `deleteGoldenItem()`
- `resetGoldenForMeeting()`

**Types:** `UpsertGoldenMeetingInput`, `GoldenItemInput`

### `mutations/ignored-entities.ts`

**Exports:**
- `addIgnoredEntity()`

### `mutations/issues/attachments.ts`

**Exports:**
- `downloadAndUpload()`
- `getAttachmentPublicUrl()`
- `insertAttachment()`
- `storeIssueMedia()`

**Types:** `InsertAttachmentData`

### `mutations/issues/core.ts`

**Exports:**
- `insertIssue()`
- `updateIssue()`
- `upsertUserbackIssues()`
- `deleteIssue()`
- `insertComment()`
- `updateComment()`
- `deleteComment()`
- `insertActivity()`

**Types:** `InsertIssueData`, `UpdateIssueData`

### `mutations/meetings/core.ts`

**Exports:**
- `insertMeeting()`
- `insertManualMeeting()`
- `updateMeetingClassification()`
- `updateMeetingElevenLabs()`
- `updateMeetingNamedTranscript()`
- `updateMeetingType()`
- `updateMeetingPartyType()`
- `updateMeetingTitle()`
- `updateMeetingOrganization()`
- `linkMeetingProject()`
- `linkAllMeetingProjects()`
- `updateMeetingSummary()`
- `updateMeetingSummaryOnly()`
- `updateMeetingRawFireflies()`
- `markMeetingEmbeddingStale()`
- `unlinkMeetingProject()`
- `deleteMeeting()`
- `parkMeetingForReprocess()`
- `restoreParkedMeeting()`

### `mutations/meetings/participants.ts`

**Exports:**
- `linkMeetingParticipants()`
- `linkMeetingParticipant()`
- `unlinkMeetingParticipant()`

### `mutations/meetings/project-summaries.ts`

**Exports:**
- `insertMeetingProjectSummaries()`
- `linkSegmentToProject()`
- `removeSegmentTag()`
- `updateSegmentEmbedding()`
- `deleteSegmentsByMeetingId()`

### `mutations/meetings/themes.ts`

**Exports:**
- `linkMeetingToThemes()`
- `clearMeetingThemes()`
- `recalculateThemeStats()`
- `deleteMatchesForMeeting()`
- `rejectThemeMatchAsAdmin()`

**Types:** `MeetingThemeMatch`

### `mutations/organizations.ts`

**Exports:**
- `createOrganization()`
- `updateOrganization()`
- `normalizeEmailDomains()`
- `deleteOrganization()`

### `mutations/people.ts`

**Exports:**
- `createPerson()`
- `updatePerson()`
- `deletePerson()`

### `mutations/portal-access.ts`

**Exports:**
- `grantPortalAccess()`
- `revokePortalAccess()`

**Types:** `GrantPortalAccessResult`

### `mutations/profiles.ts`

**Exports:**
- `upsertProfile()`

### `mutations/projects/core.ts`

**Exports:**
- `createProject()`
- `updateProjectAliases()`
- `updateProject()`
- `deleteProject()`

### `mutations/projects/reviews.ts`

**Exports:**
- `saveProjectReview()`

**Types:** `InsertProjectReviewData`

### `mutations/review.ts`

**Exports:**
- `verifyMeeting()`
- `verifyMeetingWithEdits()`
- `rejectMeeting()`

### `mutations/slack-config.ts`

**Exports:**
- `upsertSlackConfig()`
- `deleteSlackConfig()`

**Types:** `UpsertSlackConfigInput`

### `mutations/summaries/core.ts`

**Exports:**
- `createSummaryVersion()`

### `mutations/summaries/management-insights.ts`

**Exports:**
- `saveManagementInsights()`
- `dismissInsight()`

### `mutations/tasks.ts`

**Exports:**
- `createTaskFromExtraction()`
- `updateTask()`
- `completeTask()`
- `dismissTask()`

### `mutations/team.ts`

**Exports:**
- `upsertProfile()`
- `ensureProfileExists()`
- `updateProfileRole()`
- `clearProjectAccess()`
- `insertProjectAccess()`

**Types:** `ProfileRole`, `UpsertProfileInput`, `ProjectAccessRow`

### `mutations/themes.ts`

**Exports:**
- `insertTheme()`
- `updateTheme()`
- `createEmergingTheme()`
- `createVerifiedTheme()`
- `upsertThemeNarrative()`
- `archiveTheme()`

**Types:** `InsertThemeInput`, `UpdateThemeInput`, `EmergingThemeProposal`, `UpsertThemeNarrativeInput`

### `mutations/topics/crud.ts`

**Exports:**
- `insertTopic()`
- `updateTopic()`
- `deleteTopic()`

**Types:** `InsertTopicData`, `UpdateTopicData`, `MutationResult`

### `mutations/topics/linking.ts`

**Exports:**
- `linkIssueToTopic()`
- `setTopicForIssue()`
- `unlinkIssueFromTopic()`

**Types:** `LinkVia`, `LinkIssueResult`

### `mutations/topics/status.ts`

**Exports:**
- `updateTopicStatus()`

**Types:** `UpdateTopicStatusOpts`

### `mutations/widget/admin.ts`

**Exports:**
- `addWidgetDomain()`
- `removeWidgetDomain()`

### `mutations/widget/feedback.ts`

**Exports:**
- `insertWidgetIssue()`

### `mutations/widget/rate-limit.ts`

**Exports:**
- `incrementRateLimit()`

### `mutations/widget/screenshot.ts`

**Exports:**
- `uploadWidgetScreenshot()`

**Types:** `UploadScreenshotResult`

## AI Agents

### `packages/ai/src/agents/action-item-follow-up.ts`

**Exports:**
- `addWorkdays()`
- `resolveFollowUpDate()`
- `TYPE_C_FALLBACK_WORKDAYS`

**Types:** `ResolveFollowUpInput`

### `packages/ai/src/agents/action-item-specialist/shared.ts`

**Exports:**
- `formatParticipantBlock()`
- `buildContextPrefix()`
- `applyFollowUpResolver()`
- `normaliseActionItemSpecialistOutput()`
- `checkActionItemGate()`
- `extractTranscriptContext()`
- `PROMPT_DIR`

**Internal deps:**
- `../../validations/action-item-specialist` → ActionItemFollowupAction, ActionItemRecipientPerQuote, ActionItemSpecialistItem, ActionItemSpecialistOutput, RawActionItemSpecialistOutput
- `../../utils/normalise` → emptyToNull, sentinelToNull
- `../action-item-follow-up` → resolveFollowUpDate
- `./types` → ActionItemSpecialistParticipant

### `packages/ai/src/agents/action-item-specialist/single-stage.ts`

**Exports:**
- `runActionItemSpecialist()`
- `getActionItemSpecialistSystemPrompt()`
- `ACTION_ITEM_SPECIALIST_DEFAULT_PROMPT_VERSION`
- `ACTION_ITEM_SPECIALIST_MODEL`
- `ACTION_ITEM_SPECIALIST_PROMPT_VERSION`

**Internal deps:**
- `../../validations/action-item-specialist` → ActionItemSpecialistRawOutputSchema, type ActionItemSpecialistItem
- `../run-logger` → withAgentRun
- `./shared` → PROMPT_DIR, applyFollowUpResolver, buildContextPrefix, checkActionItemGate, extractTranscriptContext, normaliseActionItemSpecialistOutput
- `./validator` → validateFollowupAction
- `./types` → ActionItemGatedItem, ActionItemPromptVersion, ActionItemSpecialistContext, ActionItemSpecialistRunOptions, ActionItemSpecialistRunResult

### `packages/ai/src/agents/action-item-specialist/two-stage.ts`

**Exports:**
- `runActionItemCandidateSpotter()`
- `runActionItemSpecialistTwoStage()`
- `getActionItemCandidateSpotterPrompt()`
- `getActionItemJudgePrompt()`

**Internal deps:**
- `../../validations/action-item-specialist` → type RawActionItemSpecialistOutput
- `../../validations/action-item-two-stage` → ActionItemCandidatesSchema, ActionItemJudgementsSchema, type ActionItemAccepted, type ActionItemCandidate, type ActionItemJudgement
- `../../utils/normalise` → emptyToNull
- `../run-logger` → withAgentRun
- `../action-item-follow-up` → resolveFollowUpDate
- `./shared` → PROMPT_DIR, applyFollowUpResolver, buildContextPrefix, checkActionItemGate, extractTranscriptContext, normaliseActionItemSpecialistOutput
- `./validator` → validateFollowupAction
- `./types` → ActionItemSpecialistContext, ActionItemSpotterRunResult, ActionItemTwoStageRunOptions, ActionItemTwoStageRunResult

### `packages/ai/src/agents/action-item-specialist/types.ts`

**Types:** `ActionItemPromptVersion`, `ActionItemSpecialistParticipant`, `ActionItemSpecialistContext`, `ActionItemSpecialistRunOptions`, `ActionItemSpecialistRunMetrics`, `ActionItemGatedItem`, `ActionItemSpecialistRunResult`, `ActionItemTwoStageRunMetrics`, `ActionItemTwoStageRunResult`, `ActionItemTwoStageRunOptions`, `ActionItemSpotterRunResult`

**Internal deps:**
- `../../validations/action-item-specialist` → ActionItemSpecialistItem, ActionItemSpecialistOutput
- `../../validations/action-item-two-stage` → ActionItemCandidate, ActionItemJudgement

### `packages/ai/src/agents/action-item-specialist/validator.ts`

**Exports:**
- `getActionItemActionValidatorPrompt()`
- `validateFollowupAction()`

**Types:** `ActionItemActionValidatorInput`, `ActionItemActionValidatorResult`

**Internal deps:**
- `../../validations/action-item-action-validator` → ActionItemActionValidatorOutputSchema, type ActionItemActionValidatorOutput
- `../run-logger` → withAgentRun
- `./shared` → PROMPT_DIR

### `packages/ai/src/agents/bulk-cluster-cleanup.ts`

**Exports:**
- `runBulkClusterCleanup()`
- `BULK_CLUSTER_CLEANUP_MODEL`

**Types:** `BulkClusterIssueInput`, `BulkClusterTopicInput`, `BulkClusterInput`

**Internal deps:**
- `../validations/bulk-cluster-cleanup` → bulkClusterModelSchema, type BulkClusterOutput
- `./run-logger` → withAgentRun

### `packages/ai/src/agents/email-classifier.ts`

**Exports:**
- `runEmailClassifier()`

**Internal deps:**
- `../validations/email-classifier` → EmailClassifierSchema, EmailClassifierOutput
- `./run-logger` → withAgentRun

### `packages/ai/src/agents/email-extractor.ts`

**Exports:**
- `runEmailExtractor()`

**Internal deps:**
- `../validations/email-extractor` → EmailExtractorOutputSchema, EmailExtractorOutput

### `packages/ai/src/agents/gatekeeper.ts`

**Exports:**
- `runGatekeeper()`

**Types:** `ParticipantInfo`

**Internal deps:**
- `../validations/gatekeeper` → GatekeeperSchema, GatekeeperOutput
- `./run-logger` → withAgentRun

### `packages/ai/src/agents/issue-classifier.ts`

**Exports:**
- `runIssueClassifier()`

**Internal deps:**
- `../validations/issue-classification` → IssueClassifierSchema, type IssueClassifierOutput
- `./run-logger` → withAgentRun

### `packages/ai/src/agents/issue-executor.ts`

**Exports:**
- `runIssueExecutor()`

**Internal deps:**
- `../validations/issue-executor` → IssueExecutorSchema, type IssueExecutorOutput

### `packages/ai/src/agents/issue-reviewer.ts`

**Exports:**
- `runIssueReviewer()`

**Types:** `IssueForReview`

**Internal deps:**
- `../validations/issue-review` → IssueReviewSchema, type IssueReviewOutput
- `./run-logger` → withAgentRun

### `packages/ai/src/agents/management-insights.ts`

**Exports:**
- `runManagementInsightsAgent()`

**Types:** `ManagementMeetingInput`

**Internal deps:**
- `../validations/management-insights` → ManagementInsightsOutputSchema, type ManagementInsightsOutput
- `./run-logger` → withAgentRun

### `packages/ai/src/agents/needs-scanner.ts`

**Exports:**
- `runNeedsScanner()`

**Internal deps:**
- `../validations/needs-scanner` → NeedsScannerOutputSchema, NeedsScannerOutput
- `./run-logger` → withAgentRun

### `packages/ai/src/agents/pricing.ts`

**Exports:**
- `estimateRunCostUsd()`

**Types:** `ModelPricing`

### `packages/ai/src/agents/project-summarizer.ts`

**Exports:**
- `runProjectSummarizer()`
- `runOrgSummarizer()`

**Types:** `MeetingInput`, `EmailInput`, `SegmentInput`

**Internal deps:**
- `../validations/project-summary` → ProjectSummaryOutputSchema, OrgSummaryOutputSchema, type ProjectSummaryOutput, type OrgSummaryOutput
- `./run-logger` → withAgentRun

### `packages/ai/src/agents/registry.ts`

**Exports:**
- `readAgentPrompt()`
- `getAgentById()`
- `AGENT_REGISTRY`

**Types:** `AgentStatus`, `AgentQuadrant`, `AgentDefinition`

### `packages/ai/src/agents/risk-specialist.ts`

**Exports:**
- `runRiskSpecialist()`
- `RISK_SPECIALIST_PROMPT_VERSION`
- `RISK_SPECIALIST_MODEL`
- `RISK_SPECIALIST_SYSTEM_PROMPT`

**Types:** `RiskSpecialistContext`, `RiskSpecialistRunMetrics`, `RiskSpecialistRunResult`

**Internal deps:**
- `../validations/risk-specialist` → RiskSpecialistRawOutputSchema, type RiskSpecialistItem, type RiskSpecialistOutput, type RawRiskSpecialistOutput
- `../utils/normalise` → emptyToNull, sentinelToNull
- `./run-logger` → withAgentRun

### `packages/ai/src/agents/run-logger.ts`

**Exports:**
- `withAgentRun()`

**Types:** `AgentUsage`, `AgentRunLogContext`

**Depends on:**
- `@repo/database/mutations/agent-runs` → insertAgentRun, type AgentRunInput

### `packages/ai/src/agents/speaker-identifier-sampling.ts`

**Exports:**
- `parseElevenLabsUtterances()`
- `parseFirefliesUtterances()`
- `sampleUtterancesPerName()`
- `sampleUtterancesPerSpeaker()`

**Types:** `SpeakerUtterance`, `NamedUtterance`

### `packages/ai/src/agents/speaker-identifier.ts`

**Exports:**
- `runSpeakerIdentifier()`
- `getSpeakerIdentifierPrompt()`
- `applyMappingToTranscript()`
- `SPEAKER_MAPPING_APPLY_THRESHOLD`

**Types:** `SpeakerIdentifierParticipant`, `SpeakerIdentifierInput`, `SpeakerIdentifierResult`

**Internal deps:**
- `../validations/speaker-identifier` → SpeakerMappingOutputSchema, type SpeakerMappingOutput
- `./speaker-identifier-sampling` → parseElevenLabsUtterances, parseFirefliesUtterances, sampleUtterancesPerName, sampleUtterancesPerSpeaker
- `./run-logger` → withAgentRun

### `packages/ai/src/agents/summarizer.ts`

**Exports:**
- `runSummarizer()`
- `formatSummary()`
- `formatThemeSummary()`
- `SUMMARIZER_PROMPT_VERSION`
- `THEME_SUMMARIES_HARD_CAP`
- `KERNPUNTEN_PER_THEME_CAP`
- `VERVOLGSTAPPEN_PER_THEME_CAP`

**Types:** `SummarizerIdentifiedTheme`

**Internal deps:**
- `../validations/summarizer` → SummarizerOutputSchema, SummarizerOutput, type ThemeSummary
- `./run-logger` → withAgentRun

### `packages/ai/src/agents/theme-detector.ts`

**Exports:**
- `runThemeDetector()`
- `THEME_DETECTOR_PROMPT_VERSION`
- `THEME_DETECTOR_MODEL`
- `THEME_DETECTOR_SYSTEM_PROMPT`

**Types:** `ThemeCatalogEntry`, `ThemeDetectorNegativeExample`, `ThemeDetectorIdentifiedProject`, `ThemeDetectorMeetingContext`, `RunThemeDetectorInput`

**Internal deps:**
- `../validations/theme-detector` → ThemeDetectorOutputSchema, MATCHES_HARD_CAP, PROPOSALS_HARD_CAP, type ThemeDetectorOutput
- `./theme-emojis` → THEME_EMOJIS, THEME_EMOJI_FALLBACK
- `./run-logger` → withAgentRun

### `packages/ai/src/agents/theme-emojis.ts`

**Exports:**
- `THEME_EMOJIS`
- `THEME_EMOJI_FALLBACK`
- `ALL_THEME_EMOJIS`

**Types:** `ThemeEmoji`

### `packages/ai/src/agents/theme-narrator.ts`

**Exports:**
- `runThemeNarrator()`
- `THEME_NARRATOR_PROMPT_VERSION`
- `THEME_NARRATOR_MODEL`
- `THEME_NARRATOR_SYSTEM_PROMPT`

**Types:** `ThemeNarratorThemeInput`, `ThemeNarratorMeetingInput`, `RunThemeNarratorInput`

**Internal deps:**
- `../validations/theme-narrator` → ThemeNarratorOutputSchema, NARRATIVE_TOTAL_CHAR_CAP, type ThemeNarratorOutput
- `./run-logger` → withAgentRun

### `packages/ai/src/agents/title-generator.ts`

**Exports:**
- `generateMeetingSubject()`

**Types:** `TitleSubjectOutput`

**Internal deps:**
- `./run-logger` → withAgentRun

### `packages/ai/src/agents/weekly-summarizer.ts`

**Exports:**
- `runWeeklySummarizer()`

**Types:** `WeeklyProjectInput`

**Internal deps:**
- `../validations/weekly-summary` → WeeklySummaryOutputSchema, type WeeklySummaryOutput
- `./run-logger` → withAgentRun

## AI Pipeline

### `packages/ai/src/pipeline/email/core.ts`

**Exports:**
- `resolveEmailOrganization()`
- `processEmail()`
- `processEmailBatch()`

**Types:** `EmailOrganizationResolution`

**Depends on:**
- `@repo/database/mutations/emails` → updateEmailClassification, updateEmailFilterStatus, updateEmailSenderPerson, linkEmailProject
- `@repo/database/queries/people` → findPersonOrgByEmail
- `@repo/database/queries/organizations` → findOrganizationIdByEmailDomain
- `@repo/database/supabase/admin` → getAdminClient

**Internal deps:**
- `../../agents/email-classifier` → runEmailClassifier
- `../../agents/email-classifier` → EmailClassifierOutput
- `../lib/context-injection` → buildEntityContext
- `../lib/entity-resolution` → resolveOrganization
- `./filter-gatekeeper` → decideEmailFilter, type FilterReason
- `./pre-classifier` → preClassifyEmail
- `../../embeddings` → embedText

### `packages/ai/src/pipeline/email/filter-gatekeeper.ts`

**Exports:**
- `decideEmailFilter()`

**Types:** `FilterReason`, `FilterDecision`

### `packages/ai/src/pipeline/email/pre-classifier.ts`

**Exports:**
- `preClassifyEmail()`

**Types:** `PreClassifiedType`, `PreClassifierOutput`

### `packages/ai/src/pipeline/embed/pipeline.ts`

**Exports:**
- `embedMeetingWithExtractions()`

**Depends on:**
- `@repo/database/mutations/embeddings` → updateRowEmbedding, batchUpdateEmbeddings
- `@repo/database/queries/meetings` → getMeetingExtractions, getMeetingForEmbedding, getExtractionIdsAndContent

**Internal deps:**
- `../../embeddings` → embedText, embedBatch
- `./text` → buildMeetingEmbedText

### `packages/ai/src/pipeline/embed/re-embed-worker.ts`

**Exports:**
- `runReEmbedWorker()`

**Depends on:**
- `@repo/database/queries/content` → getStaleRows
- `@repo/database/queries/meetings` → getMeetingExtractionsBatch
- `@repo/database/queries/people` → getStalePeople
- `@repo/database/mutations/embeddings` → batchUpdateEmbeddings

**Internal deps:**
- `../../embeddings` → embedBatch
- `./text` → buildMeetingEmbedText

### `packages/ai/src/pipeline/embed/text.ts`

**Exports:**
- `buildMeetingEmbedText()`

### `packages/ai/src/pipeline/gatekeeper-pipeline.ts`

**Exports:**
- `processMeeting()`

**Depends on:**
- `@repo/database/mutations/meetings` → insertMeeting
- `@repo/database/queries/people` → getAllKnownPeople

**Internal deps:**
- `../agents/gatekeeper` → runGatekeeper
- `../agents/gatekeeper` → ParticipantInfo
- `../validations/gatekeeper` → GatekeeperOutput
- `../validations/gatekeeper` → PartyType, IdentifiedProject
- `./lib/entity-resolution` → resolveOrganization
- `./lib/context-injection` → buildEntityContext
- `./participant/classifier` → classifyParticipantsWithCache, determinePartyType, determineRuleBasedMeetingType
- `./lib/build-raw-fireflies` → buildRawFireflies
- `./steps/transcribe` → runTranscribeStep
- `./steps/speaker-mapping` → runSpeakerMappingStep
- `./steps/summarize` → runSummarizeStep
- `./steps/risk-specialist` → runRiskSpecialistStep
- `./steps/action-item-specialist` → runActionItemSpecialistStep, buildActionItemParticipants
- `./steps/generate-title` → runGenerateTitleStep
- `./steps/tag-and-segment` → runTagAndSegmentStep
- `./steps/embed` → runEmbedStep
- `./steps/theme-detector` → runThemeDetectorStep
- `./steps/link-themes` → runLinkThemesStep
- `./lib/speaker-map` → extractSpeakerNames, buildSpeakerMap, formatSpeakerContext
- `./participant/helpers` → matchParticipants, mergeParticipantSources, type MeetingAttendee

### `packages/ai/src/pipeline/lib/build-raw-fireflies.ts`

**Exports:**
- `buildRawFireflies()`

**Internal deps:**
- `../../agents/gatekeeper` → ParticipantInfo
- `../../validations/gatekeeper` → GatekeeperOutput

### `packages/ai/src/pipeline/lib/context-injection.ts`

**Exports:**
- `buildEntityContext()`

**Types:** `EntityContext`

**Depends on:**
- `@repo/database/queries/projects` → getActiveProjectsForContext
- `@repo/database/queries/organizations` → getAllOrganizations
- `@repo/database/queries/people` → getPeopleForContext
- (type) `@repo/database/queries/projects` → ActiveProjectForContext

### `packages/ai/src/pipeline/lib/entity-resolution.ts`

**Exports:**
- `resolveProject()`
- `resolveClientEntities()`
- `resolveOrganization()`

**Depends on:**
- `@repo/database/queries/projects` → getAllProjects, matchProjectsByEmbedding
- `@repo/database/mutations/projects` → updateProjectAliases
- `@repo/database/queries/organizations` → getAllOrganizations

**Internal deps:**
- `../../embeddings` → embedText

### `packages/ai/src/pipeline/lib/segment-builder.ts`

**Exports:**
- `buildSegments()`

**Types:** `Segment`

**Internal deps:**
- `../tagger` → TaggerOutput

### `packages/ai/src/pipeline/lib/speaker-map.ts`

**Exports:**
- `extractSpeakerNames()`
- `buildSpeakerMap()`
- `formatSpeakerContext()`

**Types:** `SpeakerInfo`, `SpeakerMap`

**Depends on:**
- (type) `@repo/database/queries/people` → KnownPerson

### `packages/ai/src/pipeline/lib/title-builder.ts`

**Exports:**
- `buildMeetingTitle()`
- `generateMeetingTitle()`

**Types:** `TitleContext`

**Depends on:**
- `@repo/database/constants/meetings` → MEETING_TYPE_PREFIX

**Internal deps:**
- `../../agents/title-generator` → generateMeetingSubject

### `packages/ai/src/pipeline/participant/classifier.ts`

**Exports:**
- `classifyParticipants()`
- `classifyParticipantsWithCache()`
- `isBoardMeeting()`
- `determineRuleBasedMeetingType()`
- `determinePartyType()`

**Depends on:**
- (type) `@repo/database/queries/people` → KnownPerson
- `@repo/database/queries/people` → getAllKnownPeople

**Internal deps:**
- `../../agents/gatekeeper` → ParticipantInfo
- `../../validations/gatekeeper` → MeetingType, PartyType

### `packages/ai/src/pipeline/participant/helpers.ts`

**Exports:**
- `collectParticipantEmails()`
- `matchParticipants()`
- `mergeParticipantSources()`

**Types:** `MeetingAttendee`

**Depends on:**
- `@repo/database/queries/people` → findPeopleByEmails
- `@repo/database/mutations/meetings/participants` → linkMeetingParticipants

**Internal deps:**
- `../lib/speaker-map` → SpeakerMap

### `packages/ai/src/pipeline/saves/action-item-extractions.ts`

**Exports:**
- `saveActionItemExtractions()`
- `ACTION_ITEM_SPECIALIST_SOURCE`

**Depends on:**
- `@repo/database/mutations/meetings` → linkAllMeetingProjects
- `@repo/database/mutations/extractions` → deleteExtractionsByMeetingTypeAndSource, insertExtractions, type ExtractionInsertRow

**Internal deps:**
- `../../validations/gatekeeper` → IdentifiedProject
- `../../validations/action-item-specialist` → ActionItemSpecialistItem, ActionItemSpecialistOutput

### `packages/ai/src/pipeline/saves/risk-extractions.ts`

**Exports:**
- `saveRiskExtractions()`

**Depends on:**
- `@repo/database/mutations/meetings` → linkAllMeetingProjects
- `@repo/database/mutations/extractions` → deleteExtractionsByMeetingAndType, insertExtractions, type ExtractionInsertRow

**Internal deps:**
- `../../validations/gatekeeper` → IdentifiedProject
- `../../validations/risk-specialist` → RiskSpecialistItem, RiskSpecialistOutput

### `packages/ai/src/pipeline/steps/action-item-specialist.ts`

**Exports:**
- `buildActionItemParticipants()`
- `runActionItemSpecialistStep()`

**Depends on:**
- `@repo/database/mutations/extractions/experimental-action-items` → insertExperimentalActionItemExtraction
- (type) `@repo/database/queries/people` → KnownPerson

**Internal deps:**
- `../../agents/action-item-specialist` → runActionItemSpecialist, ACTION_ITEM_SPECIALIST_MODEL, type ActionItemSpecialistContext, type ActionItemSpecialistParticipant
- `../saves/action-item-extractions` → saveActionItemExtractions
- `../../validations/gatekeeper` → IdentifiedProject

### `packages/ai/src/pipeline/steps/embed.ts`

**Exports:**
- `runEmbedStep()`

**Types:** `EmbedStepResult`

**Internal deps:**
- `../embed/pipeline` → embedMeetingWithExtractions

### `packages/ai/src/pipeline/steps/generate-title.ts`

**Exports:**
- `runGenerateTitleStep()`

**Types:** `GenerateTitleStepInput`, `GenerateTitleStepResult`

**Depends on:**
- `@repo/database/mutations/meetings` → updateMeetingTitle

**Internal deps:**
- `../lib/title-builder` → generateMeetingTitle
- `../../validations/gatekeeper` → IdentifiedProject

### `packages/ai/src/pipeline/steps/link-themes.ts`

**Exports:**
- `runLinkThemesStep()`

**Types:** `LinkThemesStepInput`, `MeetingThemeToWrite`, `ProposalToCreate`, `SkippedDueToRejection`, `PreviewResult`, `LinkThemesResult`

**Depends on:**
- `@repo/database/queries/meetings` → getMeetingExtractions
- `@repo/database/queries/themes` → listVerifiedThemes, type ThemeRow, type ThemeWithNegativeExamples
- `@repo/database/queries/themes/review` → listRejectedThemePairsForMeeting
- `@repo/database/mutations/meetings/themes` → linkMeetingToThemes, clearMeetingThemes, recalculateThemeStats
- `@repo/database/mutations/extractions/themes` → linkExtractionsToThemes, clearExtractionThemesForMeeting, type ExtractionThemeRow
- `@repo/database/mutations/themes` → createEmergingTheme

**Internal deps:**
- `../../validations/theme-detector` → ThemeDetectorOutput
- `../tagger` → parseThemesAnnotation, resolveThemeRefs, type ThemeRef
- `./synthesize-theme-narrative` → runThemeNarrativeSynthesis

### `packages/ai/src/pipeline/steps/risk-specialist.ts`

**Exports:**
- `runRiskSpecialistStep()`

**Depends on:**
- `@repo/database/mutations/extractions/experimental-risks` → insertExperimentalRiskExtraction

**Internal deps:**
- `../../agents/risk-specialist` → runRiskSpecialist, RISK_SPECIALIST_MODEL, RISK_SPECIALIST_PROMPT_VERSION, type RiskSpecialistContext
- `../saves/risk-extractions` → saveRiskExtractions
- `../../validations/gatekeeper` → IdentifiedProject

### `packages/ai/src/pipeline/steps/speaker-mapping.ts`

**Exports:**
- `runSpeakerMappingStep()`

**Types:** `SpeakerMappingStepResult`

**Depends on:**
- `@repo/database/mutations/meetings` → updateMeetingNamedTranscript
- `@repo/database/queries/meetings/speaker-mapping` → getMeetingParticipantsForSpeakerMapping, type SpeakerMappingParticipant

**Internal deps:**
- `../../agents/speaker-identifier` → applyMappingToTranscript, runSpeakerIdentifier

### `packages/ai/src/pipeline/steps/summarize.ts`

**Exports:**
- `runSummarizeStep()`

**Types:** `SummarizeResult`

**Depends on:**
- `@repo/database/mutations/meetings` → updateMeetingSummary

**Internal deps:**
- `../../agents/summarizer` → runSummarizer, formatSummary, formatThemeSummary, type SummarizerIdentifiedTheme

### `packages/ai/src/pipeline/steps/synthesize-theme-narrative.ts`

**Exports:**
- `runThemeNarrativeSynthesis()`

**Types:** `ThemeNarrativeSynthesisResult`

**Depends on:**
- `@repo/database/queries/themes` → listThemeMeetingSummaries, INSUFFICIENT_MEETINGS_SENTINEL
- `@repo/database/mutations/themes` → upsertThemeNarrative
- `@repo/database/supabase/admin` → getAdminClient

**Internal deps:**
- `../../agents/theme-narrator` → runThemeNarrator
- `../../validations/theme-narrator` → ThemeNarratorOutput

### `packages/ai/src/pipeline/steps/tag-and-segment.ts`

**Exports:**
- `runTagAndSegmentStep()`

**Types:** `TagAndSegmentInput`, `TagAndSegmentResult`

**Depends on:**
- `@repo/database/queries/ignored-entities` → getIgnoredEntityNames
- `@repo/database/mutations/meetings/project-summaries` → insertMeetingProjectSummaries, updateSegmentEmbedding

**Internal deps:**
- `../tagger` → runTagger
- `../lib/segment-builder` → buildSegments
- `../../embeddings` → embedBatch
- `../../validations/gatekeeper` → IdentifiedProject

### `packages/ai/src/pipeline/steps/theme-detector.ts`

**Exports:**
- `runThemeDetectorStep()`

**Types:** `ThemeDetectorStepInput`, `ThemeDetectorStepResult`

**Depends on:**
- `@repo/database/queries/themes` → listVerifiedThemes, type ThemeWithNegativeExamples

**Internal deps:**
- `../../agents/theme-detector` → runThemeDetector, type ThemeDetectorMeetingContext, type ThemeDetectorIdentifiedProject
- `../../validations/theme-detector` → ThemeDetectorOutput

### `packages/ai/src/pipeline/steps/transcribe.ts`

**Exports:**
- `runTranscribeStep()`

**Types:** `TranscribeResult`

**Depends on:**
- `@repo/database/mutations/meetings` → updateMeetingElevenLabs

**Internal deps:**
- `../../transcribe-elevenlabs` → transcribeWithElevenLabs, formatScribeTranscript

### `packages/ai/src/pipeline/summary/core.ts`

**Exports:**
- `formatMeetingForSummary()`
- `formatEmailForSummary()`
- `buildTimelineStructuredContent()`

**Types:** `FormattedMeetingForSummary`, `FormattedEmailForSummary`

### `packages/ai/src/pipeline/summary/management-insights.ts`

**Exports:**
- `generateManagementInsights()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/database/queries/meetings` → listBoardMeetings
- `@repo/database/mutations/summaries/management-insights` → saveManagementInsights

**Internal deps:**
- `../../agents/management-insights` → runManagementInsightsAgent

### `packages/ai/src/pipeline/summary/org.ts`

**Exports:**
- `generateOrgSummaries()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/database/queries/summaries` → getLatestSummary
- `@repo/database/mutations/summaries` → createSummaryVersion

**Internal deps:**
- `../../agents/project-summarizer` → runOrgSummarizer
- `./core` → formatMeetingForSummary, formatEmailForSummary, buildTimelineStructuredContent

### `packages/ai/src/pipeline/summary/project.ts`

**Exports:**
- `generateProjectSummaries()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/database/queries/summaries` → getLatestSummary
- `@repo/database/queries/meetings/project-summaries` → getSegmentsByProjectId
- `@repo/database/mutations/summaries` → createSummaryVersion

**Internal deps:**
- `../../agents/project-summarizer` → runProjectSummarizer
- `./core` → formatMeetingForSummary, formatEmailForSummary, buildTimelineStructuredContent

### `packages/ai/src/pipeline/summary/triggers.ts`

**Exports:**
- `triggerSummariesForMeeting()`
- `triggerSummariesForEmail()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient

**Internal deps:**
- `./project` → generateProjectSummaries
- `./org` → generateOrgSummaries

### `packages/ai/src/pipeline/summary/weekly.ts`

**Exports:**
- `generateWeeklySummary()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/database/queries/summaries/weekly` → getWeeklyProjectData
- `@repo/database/mutations/summaries` → createSummaryVersion

**Internal deps:**
- `../../agents/weekly-summarizer` → runWeeklySummarizer

### `packages/ai/src/pipeline/tagger/projects.ts`

**Exports:**
- `parsePrefix()`
- `resolvePrefixProject()`
- `ruleBasedMatch()`
- `CONFIDENCE_THRESHOLD`

**Types:** `PrefixResolution`

**Internal deps:**
- `../../validations/gatekeeper` → IdentifiedProject
- `./types` → normalize, type KnownProject, type TaggedItem

### `packages/ai/src/pipeline/tagger/tag.ts`

**Exports:**
- `runTagger()`

**Internal deps:**
- `../../validations/gatekeeper` → IdentifiedProject
- `./projects` → parsePrefix, resolvePrefixProject, ruleBasedMatch, type PrefixResolution
- `./types` → KnownProject, TaggedItem, TaggerInput, TaggerOutput

### `packages/ai/src/pipeline/tagger/themes.ts`

**Exports:**
- `parseThemesAnnotation()`
- `resolveThemeRefs()`

**Internal deps:**
- `./types` → normalize, type ThemeRef

### `packages/ai/src/pipeline/tagger/types.ts`

**Exports:**
- `normalize()`

**Types:** `TaggedItem`, `KnownProject`, `ThemeRef`, `TaggerInput`, `TaggerOutput`

## AI Core

### `packages/ai/src/embeddings.ts`

**Exports:**
- `embedText()`
- `embedBatch()`

### `packages/ai/src/fireflies.ts`

**Exports:**
- `fetchFirefliesTranscript()`
- `listFirefliesTranscripts()`

**Types:** `FirefliesMeetingAttendee`, `FirefliesTranscript`, `FirefliesListItem`

### `packages/ai/src/gmail.ts`

**Exports:**
- `fetchEmails()`
- `fetchEmailById()`

**Types:** `GmailMessage`

**Internal deps:**
- `./google-oauth` → createAuthenticatedClient

### `packages/ai/src/google-oauth.ts`

**Exports:**
- `getGoogleAuthUrl()`
- `exchangeCodeForTokens()`
- `createAuthenticatedClient()`
- `getAuthenticatedEmail()`

### `packages/ai/src/lib/golden-comparison.ts`

**Exports:**
- `contentSimilarity()`
- `comparePrecisionRecall()`
- `aggregateComparisons()`

**Types:** `ComparableItem`, `DiffStatus`, `DiffEntry`, `ComparisonResult`

### `packages/ai/src/scan-needs.ts`

**Exports:**
- `scanMeetingNeeds()`
- `scanAllUnscannedMeetings()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/database/mutations/extractions` → insertExtractions

**Internal deps:**
- `./agents/needs-scanner` → runNeedsScanner
- `./validations/needs-scanner` → NeedItem

### `packages/ai/src/transcribe-elevenlabs.ts`

**Exports:**
- `transcribeWithElevenLabs()`
- `formatScribeTranscript()`

**Types:** `ScribeWord`, `ScribeResponse`, `TranscribeOptions`, `TranscribeResult`

### `packages/ai/src/transcript-processor.ts`

**Exports:**
- `chunkTranscript()`

**Types:** `TranscriptChunk`

**Internal deps:**
- `./fireflies` → FirefliesTranscript

### `packages/ai/src/utils/normalise.ts`

**Exports:**
- `normaliseForQuoteMatch()`
- `emptyToNull()`
- `sentinelToNull()`

### `packages/ai/src/utils/summary-markdown-parser.ts`

**Exports:**
- `parseMarkdownExtractions()`
- `filterByType()`
- `PARSED_EXTRACTION_TYPES`

**Types:** `ParsedExtractionType`, `ParsedExtraction`

## AI Validations

### `packages/ai/src/validations/action-item-action-validator.ts`

**Exports:**
- `ActionItemActionValidatorOutputSchema`

**Types:** `ActionItemActionValidatorOutput`

### `packages/ai/src/validations/action-item-specialist.ts`

**Exports:**
- `ActionItemSpecialistRawItemSchema`
- `ActionItemSpecialistRawOutputSchema`

**Types:** `RawActionItemSpecialistOutput`, `ActionItemRecipientPerQuote`, `ActionItemFollowupAction`, `ActionItemSpecialistItem`, `ActionItemSpecialistOutput`

### `packages/ai/src/validations/action-item-two-stage.ts`

**Exports:**
- `ActionItemCandidateSchema`
- `ActionItemCandidatesSchema`
- `ActionItemAcceptedSchema`
- `ActionItemRejectedSchema`
- `ActionItemJudgementsSchema`

**Types:** `ActionItemCandidate`, `ActionItemCandidatesOutput`, `ActionItemAccepted`, `ActionItemRejected`, `ActionItemJudgementsOutput`, `ActionItemJudgement`

**Internal deps:**
- `./action-item-specialist` → ActionItemSpecialistRawItemSchema

### `packages/ai/src/validations/bulk-cluster-cleanup.ts`

**Exports:**
- `bulkClusterModelSchema`

**Types:** `BulkClusterModelOutput`, `BulkCluster`, `BulkClusterOutput`

**Depends on:**
- `@repo/database/constants/topics` → TOPIC_TYPES

### `packages/ai/src/validations/communication.ts`

**Exports:**
- `PARTY_TYPES`
- `PartyTypeSchema`

**Types:** `PartyType`

### `packages/ai/src/validations/email-classifier.ts`

**Exports:**
- `EmailClassifierSchema`

**Types:** `EmailClassifierOutput`

**Internal deps:**
- `./communication` → PartyTypeSchema

### `packages/ai/src/validations/email-extractor.ts`

**Exports:**
- `EmailExtractionItemSchema`
- `EmailExtractorOutputSchema`

**Types:** `EmailExtractionItem`, `EmailExtractorOutput`

### `packages/ai/src/validations/fireflies.ts`

**Exports:**
- `isValidDuration()`
- `hasParticipants()`

### `packages/ai/src/validations/gatekeeper.ts`

**Exports:**
- `MEETING_TYPES`
- `IdentifiedProjectSchema`
- `GatekeeperSchema`

**Types:** `MeetingType`, `IdentifiedProject`, `GatekeeperOutput`

**Internal deps:**
- `./communication` → PARTY_TYPES, type PartyType

### `packages/ai/src/validations/issue-classification.ts`

**Exports:**
- `ISSUE_TYPES`
- `COMPONENTS`
- `SEVERITIES`
- `IssueClassifierSchema`

**Types:** `IssueClassifierOutput`

### `packages/ai/src/validations/issue-executor.ts`

**Exports:**
- `ExecutionStepSchema`
- `IssueExecutorSchema`

**Types:** `IssueExecutorOutput`, `ExecutionStep`

### `packages/ai/src/validations/issue-review.ts`

**Exports:**
- `PatternSchema`
- `RiskSchema`
- `ActionItemSchema`
- `IssueReviewSchema`

**Types:** `IssueReviewOutput`, `Pattern`, `Risk`, `ActionItem`

### `packages/ai/src/validations/management-insights.ts`

**Exports:**
- `MogelijkeOpvolgingSchema`
- `KlantPipelineSchema`
- `TerugkerendThemaSchema`
- `ManagementInsightsOutputSchema`

**Types:** `ManagementInsightsOutput`

### `packages/ai/src/validations/needs-scanner.ts`

**Exports:**
- `NeedItemSchema`
- `NeedsScannerOutputSchema`

**Types:** `NeedItem`, `NeedsScannerOutput`

### `packages/ai/src/validations/project-summary.ts`

**Exports:**
- `extractOrgTimeline()`
- `extractProjectTimeline()`
- `TimelineEntrySchema`
- `ProjectSummaryOutputSchema`
- `OrgTimelineEntrySchema`
- `OrgSummaryOutputSchema`

**Types:** `TimelineEntry`, `ProjectSummaryOutput`, `OrgTimelineEntry`, `OrgSummaryOutput`

### `packages/ai/src/validations/risk-specialist.ts`

**Exports:**
- `RiskSpecialistRawItemSchema`
- `RiskSpecialistRawOutputSchema`

**Types:** `RawRiskSpecialistOutput`, `RiskSpecialistItem`, `RiskSpecialistOutput`

### `packages/ai/src/validations/speaker-identifier.ts`

**Exports:**
- `SpeakerMappingItemSchema`
- `SpeakerMappingOutputSchema`

**Types:** `SpeakerMappingItem`, `SpeakerMappingOutput`

### `packages/ai/src/validations/summarizer.ts`

**Exports:**
- `ParticipantProfileSchema`
- `ThemeSummarySchema`
- `SummarizerOutputSchema`

**Types:** `SummarizerOutput`, `ParticipantProfile`, `ThemeSummary`

### `packages/ai/src/validations/theme-detector.ts`

**Exports:**
- `MATCHES_HARD_CAP`
- `PROPOSALS_HARD_CAP`
- `IdentifiedThemeSchema`
- `ProposedThemeSchema`
- `ThemeDetectorOutputSchema`

**Types:** `IdentifiedTheme`, `ProposedTheme`, `ThemeDetectorOutput`

**Internal deps:**
- `../agents/theme-emojis` → ALL_THEME_EMOJIS

### `packages/ai/src/validations/theme-narrator.ts`

**Exports:**
- `ThemeNarratorOutputSchema`
- `NARRATIVE_TOTAL_CHAR_CAP`

**Types:** `ThemeNarratorOutput`

### `packages/ai/src/validations/weekly-summary.ts`

**Exports:**
- `ProjectHealthSchema`
- `WeeklySummaryOutputSchema`

**Types:** `ProjectHealth`, `WeeklySummaryOutput`

## Auth

### `packages/auth/src/access.ts`

**Exports:**
- `isAdmin()`
- `getCurrentProfile()`
- `requireAdmin()`
- `assertProjectAccess()`
- `requireAdminInAction()`
- `listAccessibleProjectIds()`

**Types:** `ProfileRole`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/database/supabase/server` → createClient

### `packages/auth/src/helpers.ts`

**Exports:**
- `isAuthBypassed()`
- `getAuthenticatedUser()`
- `getAuthenticatedUserId()`
- `createPageClient()`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/supabase/admin` → getAdminClient

### `packages/auth/src/middleware.ts`

**Exports:**
- `createAuthMiddleware()`

## Shared UI Components

### `packages/ui/src/format.ts`

**Exports:**
- `formatDate()`
- `formatDateShort()`
- `formatDateLong()`
- `timeAgo()`
- `timeAgoDays()`
- `daysUntil()`
- `truncate()`

### `packages/ui/src/utils.ts`

**Exports:**
- `cn()`

### `packages/ui/src/workspace-switcher.tsx`

**Exports:**
- `WorkspaceSwitcher()`

### `packages/ui/src/workspaces.ts`

**Exports:**
- `getWorkspaces()`
- `getWorkspace()`

**Types:** `WorkspaceId`, `WorkspaceStatus`, `Workspace`

## MCP Server

### `packages/mcp/src/server.ts`

**Exports:**
- `createMcpServer()`

**Internal deps:**
- `./tools/search` → registerSearchTools
- `./tools/meetings` → registerMeetingTools
- `./tools/actions` → registerActionTools
- `./tools/organizations` → registerOrganizationTools
- `./tools/projects` → registerProjectTools
- `./tools/people` → registerPeopleTools
- `./tools/get-organization-overview` → registerOrganizationOverviewTools
- `./tools/list-meetings` → registerListMeetingsTools
- `./tools/correct-extraction` → registerCorrectExtractionTools
- `./tools/decisions` → registerDecisionTools
- `./tools/write-tasks` → registerWriteTaskTools
- `./tools/write-client-updates` → registerWriteClientUpdateTools
- `./tools/issues` → registerIssueTools
- `./tools/project-report` → registerProjectReportTools

### `packages/mcp/src/tools/actions.ts`

**Exports:**
- `registerActionTools()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/database/queries/people` → findPersonIdsByName

**Internal deps:**
- `./utils` → formatVerificatieStatus, lookupProfileNames, collectVerifiedByIds, resolveProjectIds
- `./usage-tracking` → trackMcpQuery

### `packages/mcp/src/tools/correct-extraction.ts`

**Exports:**
- `registerCorrectExtractionTools()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/database/mutations/extractions` → getExtractionForCorrection, correctExtraction
- `@repo/database/queries/people` → findProfileIdByName

**Internal deps:**
- `./usage-tracking` → trackMcpQuery

### `packages/mcp/src/tools/decisions.ts`

**Exports:**
- `registerDecisionTools()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient

**Internal deps:**
- `./utils` → formatVerificatieStatus, lookupProfileNames, collectVerifiedByIds, resolveProjectIds
- `./usage-tracking` → trackMcpQuery

### `packages/mcp/src/tools/get-organization-overview.ts`

**Exports:**
- `registerOrganizationOverviewTools()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient

**Internal deps:**
- `./usage-tracking` → trackMcpQuery
- `./utils` → escapeLike, sanitizeForContains, formatVerificatieStatus, lookupProfileNames, collectVerifiedByIds

### `packages/mcp/src/tools/issues.ts`

**Exports:**
- `registerIssueTools()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/database/constants/issues` → ISSUE_PRIORITY_LABELS, ISSUE_STATUSES, ISSUE_STATUS_LABELS, ISSUE_TYPE_LABELS, ISSUE_TYPES, type IssueStatus, type IssueType
- `@repo/database/queries/reports` → getIssueDetailForReport, getProjectIssuesForReport, type IssueActivityReport, type IssueReportRow

**Internal deps:**
- `./usage-tracking` → trackMcpQuery

### `packages/mcp/src/tools/list-meetings.ts`

**Exports:**
- `registerListMeetingsTools()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/database/queries/meetings/project-summaries` → getSegmentCountsByMeetingIds

**Internal deps:**
- `./usage-tracking` → trackMcpQuery
- `./utils` → escapeLike, resolveProjectIds, resolveOrganizationIds, resolveMeetingIdsByParticipant

### `packages/mcp/src/tools/meetings.ts`

**Exports:**
- `registerMeetingTools()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/database/queries/meetings/project-summaries` → getSegmentsByMeetingIds

**Internal deps:**
- `./utils` → escapeLike, formatVerificatieStatus, lookupProfileNames, collectVerifiedByIds
- `./usage-tracking` → trackMcpQuery

### `packages/mcp/src/tools/organizations.ts`

**Exports:**
- `registerOrganizationTools()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient

**Internal deps:**
- `./usage-tracking` → trackMcpQuery
- `./utils` → escapeLike, sanitizeForContains

### `packages/mcp/src/tools/people.ts`

**Exports:**
- `registerPeopleTools()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient

**Internal deps:**
- `./usage-tracking` → trackMcpQuery
- `./utils` → escapeLike

### `packages/mcp/src/tools/project-report.ts`

**Exports:**
- `registerProjectReportTools()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/database/queries/reports` → getProjectActivityForReport, getProjectContextForReport, type ProjectActivityEvent

**Internal deps:**
- `./usage-tracking` → trackMcpQuery

### `packages/mcp/src/tools/projects.ts`

**Exports:**
- `registerProjectTools()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/database/queries/meetings/project-summaries` → getSegmentCountsByProjectIds

**Internal deps:**
- `./usage-tracking` → trackMcpQuery
- `./utils` → escapeLike, sanitizeForContains

### `packages/mcp/src/tools/search.ts`

**Exports:**
- `registerSearchTools()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/ai/embeddings` → embedText

**Internal deps:**
- `./utils` → formatVerificatieStatus, lookupProfileNames, collectVerifiedByIds
- `./usage-tracking` → trackMcpQuery

### `packages/mcp/src/tools/usage-tracking.ts`

**Exports:**
- `trackMcpQuery()`

### `packages/mcp/src/tools/utils.ts`

**Exports:**
- `escapeLike()`
- `sanitizeForContains()`
- `resolveProjectIds()`
- `resolveOrganizationIds()`
- `resolveMeetingIdsByParticipant()`
- `formatVerificatieStatus()`
- `lookupProfileNames()`
- `collectVerifiedByIds()`

### `packages/mcp/src/tools/write-client-updates.ts`

**Exports:**
- `registerWriteClientUpdateTools()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/database/mutations/meetings` → insertManualMeeting
- `@repo/database/mutations/extractions` → insertExtractions
- `@repo/database/queries/people` → findProfileIdByName

**Internal deps:**
- `./utils` → resolveOrganizationIds
- `./usage-tracking` → trackMcpQuery

### `packages/mcp/src/tools/write-tasks.ts`

**Exports:**
- `registerWriteTaskTools()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/database/mutations/tasks` → createTaskFromExtraction, updateTask, completeTask, dismissTask
- `@repo/database/queries/people` → findProfileIdByName

**Internal deps:**
- `./usage-tracking` → trackMcpQuery

## Cockpit Server Actions

### `apps/cockpit/src/actions/_utils.ts`

**Exports:**
- `cleanInput()`

### `apps/cockpit/src/actions/dev-action-item-runner.ts`

**Exports:**
- `runActionItemAgentAction()`

**Types:** `RunActionItemAgentInput`, `TwoStageDebug`, `RunActionItemAgentResult`

**Depends on:**
- `@repo/auth/access` → requireAdminInAction
- `@repo/database/queries/golden` → getMeetingForGoldenCoder, getGoldenForMeeting
- `@repo/ai/agents/action-item-specialist` → runActionItemSpecialist, runActionItemSpecialistTwoStage, runActionItemCandidateSpotter, ACTION_ITEM_SPECIALIST_MODEL, ACTION_ITEM_SPECIALIST_DEFAULT_PROMPT_VERSION, getActionItemSpecialistSystemPrompt, getActionItemCandidateSpotterPrompt, getActionItemJudgePrompt, type ActionItemPromptVersion, type ActionItemGatedItem
- `@repo/ai/lib/golden-comparison` → comparePrecisionRecall, type ComparisonResult, type ComparableItem
- (type) `@repo/ai/validations/action-item-specialist` → ActionItemSpecialistItem
- (type) `@repo/ai/validations/action-item-two-stage` → ActionItemCandidate, ActionItemJudgement

### `apps/cockpit/src/actions/dev-detector.ts`

**Exports:**
- `runDevDetectorAction()`

**Types:** `DevDetectorThemeLookup`, `DevDetectorMeetingContext`, `DevDetectorResult`

**Depends on:**
- `@repo/ai/agents/theme-detector` → runThemeDetector, THEME_DETECTOR_SYSTEM_PROMPT, THEME_DETECTOR_PROMPT_VERSION, THEME_DETECTOR_MODEL, type ThemeCatalogEntry, type ThemeDetectorNegativeExample
- (type) `@repo/ai/validations/theme-detector` → ThemeDetectorOutput
- `@repo/auth/access` → requireAdminInAction
- `@repo/database/queries/meetings` → getVerifiedMeetingById
- `@repo/database/queries/themes` → listVerifiedThemes
- `@repo/database/queries/dev-detector` → getMeetingThemesForDevDetector, getExtractionThemesForDevDetector, type DevDetectorMeetingThemeRow, type DevDetectorExtractionThemeRow

### `apps/cockpit/src/actions/dev-speaker-mapping.ts`

**Exports:**
- `listSpeakerMappingMeetings()`
- `runSpeakerMappingAction()`
- `getSpeakerMappingBackfillStatus()`
- `runSpeakerMappingBackfillBatch()`

**Types:** `RunSpeakerMappingInput`, `SpeakerMappingMeetingOption`, `RunSpeakerMappingResult`, `BackfillStatus`, `RunBackfillBatchInput`, `BackfillBatchItem`, `RunBackfillBatchResult`

**Depends on:**
- `@repo/auth/access` → requireAdminInAction
- `@repo/database/queries/golden` → getMeetingForGoldenCoder
- `@repo/database/queries/meetings/pipeline-fetches` → listMeetingsWithTranscript
- `@repo/database/queries/meetings/speaker-mapping` → countSpeakerMappingBackfillRemaining, getSpeakerMappingTranscriptCounts, listSpeakerMappingBackfillCandidates
- `@repo/ai/agents/speaker-identifier` → runSpeakerIdentifier, getSpeakerIdentifierPrompt, type SpeakerIdentifierResult
- `@repo/ai/pipeline/steps/speaker-mapping` → runSpeakerMappingStep

### `apps/cockpit/src/actions/golden-action-items.ts`

**Exports:**
- `upsertGoldenMeetingAction()`
- `insertGoldenItemAction()`
- `updateGoldenItemAction()`
- `deleteGoldenItemAction()`
- `resetGoldenForMeetingAction()`

**Depends on:**
- `@repo/auth/access` → requireAdminInAction
- `@repo/database/mutations/golden` → upsertGoldenMeeting, insertGoldenItem, updateGoldenItem, deleteGoldenItem, resetGoldenForMeeting, type GoldenItemInput

### `apps/cockpit/src/actions/management-insights.ts`

**Exports:**
- `generateManagementInsightsAction()`
- `dismissInsightAction()`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/auth/access` → isAdmin
- `@repo/ai/pipeline/summary/management-insights` → generateManagementInsights
- `@repo/database/mutations/summaries/management-insights` → dismissInsight

### `apps/cockpit/src/actions/scan-needs.ts`

**Exports:**
- `scanTeamNeedsAction()`
- `updateNeedStatusAction()`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/auth/access` → isAdmin
- `@repo/ai/scan-needs` → scanAllUnscannedMeetings
- `@repo/database/mutations/extractions` → updateNeedStatus

### `apps/cockpit/src/actions/segments.ts`

**Exports:**
- `linkSegmentToProjectAction()`
- `removeSegmentTagAction()`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/auth/access` → isAdmin
- `@repo/database/mutations/meetings/project-summaries` → linkSegmentToProject, removeSegmentTag
- `@repo/database/queries/meetings/project-summaries` → getSegmentNameRaw
- `@repo/database/queries/meetings` → getMeetingOrganizationId
- `@repo/database/queries/projects` → getProjectAliases
- `@repo/database/mutations/projects` → updateProjectAliases
- `@repo/database/mutations/ignored-entities` → addIgnoredEntity

### `apps/cockpit/src/actions/summaries.ts`

**Exports:**
- `regenerateSummaryAction()`

**Depends on:**
- `@repo/ai/pipeline/summary/project` → generateProjectSummaries
- `@repo/ai/pipeline/summary/org` → generateOrgSummaries
- `@repo/auth/helpers` → getAuthenticatedUser
- `@repo/auth/access` → isAdmin

### `apps/cockpit/src/actions/tasks.ts`

**Exports:**
- `promoteToTaskAction()`
- `updateTaskAction()`
- `completeTaskAction()`
- `dismissTaskAction()`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/mutations/tasks` → createTaskFromExtraction, updateTask, completeTask, dismissTask
- `@repo/database/queries/tasks` → hasTaskForExtraction
- `@repo/database/validations/tasks` → promoteToTaskSchema, updateTaskSchema, taskIdSchema
- `@repo/auth/helpers` → getAuthenticatedUserId
- `@repo/auth/access` → isAdmin

### `apps/cockpit/src/actions/team.ts`

**Exports:**
- `inviteUserAction()`
- `updateUserAccessAction()`
- `deactivateUserAction()`

**Depends on:**
- `@repo/auth/access` → requireAdminInAction
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/database/queries/team` → countAdmins, getProfileRole, getUserWithAccess
- `@repo/database/mutations/team` → upsertProfile, updateProfileRole, clearProjectAccess, insertProjectAccess
- `@repo/database/validations/team` → inviteUserSchema, updateUserAccessSchema, deactivateUserSchema, type InviteUserInput, type UpdateUserAccessInput, type DeactivateUserInput

### `apps/cockpit/src/actions/weekly-summary.ts`

**Exports:**
- `generateWeeklySummaryAction()`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/auth/access` → isAdmin
- `@repo/ai/pipeline/summary/weekly` → generateWeeklySummary

## Cockpit API Routes

### `apps/cockpit/src/app/api/cron/email-sync/route.ts`

**Exports:**
- `maxDuration`
- `GET`
- `POST`

**Depends on:**
- `@repo/database/queries/emails` → listActiveGoogleAccounts, getExistingGmailIds, getUnprocessedEmails
- `@repo/database/mutations/emails` → insertEmails, updateGoogleAccountTokens, updateGoogleAccountLastSync
- `@repo/ai/gmail` → fetchEmails
- `@repo/ai/pipeline/email/core` → processEmailBatch

### `apps/cockpit/src/app/api/cron/re-embed/route.ts`

**Exports:**
- `POST()`

**Depends on:**
- `@repo/ai/pipeline/embed/re-embed-worker` → runReEmbedWorker

### `apps/cockpit/src/app/api/cron/reclassify/route.ts`

**Exports:**
- `POST()`

**Depends on:**
- `@repo/ai/agents/gatekeeper` → runGatekeeper
- `@repo/database/queries/people` → getAllKnownPeople
- `@repo/database/queries/meetings` → listMeetingsForReclassify
- `@repo/database/mutations/meetings` → updateMeetingClassification
- `@repo/ai/pipeline/lib/entity-resolution` → resolveOrganization
- `@repo/ai/pipeline/participant/classifier` → classifyParticipantsWithCache, determinePartyType

### `apps/cockpit/src/app/api/debug/fireflies/route.ts`

**Exports:**
- `POST()`

**Depends on:**
- `@repo/ai/fireflies` → listFirefliesTranscripts

### `apps/cockpit/src/app/api/email/auth/callback/route.ts`

**Exports:**
- `GET()`

**Depends on:**
- `@repo/ai/google-oauth` → exchangeCodeForTokens, getAuthenticatedEmail
- `@repo/database/mutations/emails` → upsertGoogleAccount
- `@repo/database/supabase/server` → createClient

### `apps/cockpit/src/app/api/email/auth/route.ts`

**Exports:**
- `GET()`

**Depends on:**
- `@repo/ai/google-oauth` → getGoogleAuthUrl
- `@repo/database/supabase/server` → createClient

### `apps/cockpit/src/app/api/email/process-pending/route.ts`

**Exports:**
- `POST()`
- `maxDuration`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/queries/emails` → getUnprocessedEmails
- `@repo/ai/pipeline/email/core` → processEmailBatch
- `@repo/auth/access` → isAdmin

### `apps/cockpit/src/app/api/email/reclassify/route.ts`

**Exports:**
- `POST()`
- `maxDuration`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/queries/emails` → listEmailsForReclassify
- `@repo/ai/pipeline/email/core` → processEmail
- `@repo/database/mutations/emails` → updateEmailFilterStatus
- `@repo/auth/access` → isAdmin

### `apps/cockpit/src/app/api/email/sync/route.ts`

**Exports:**
- `POST()`
- `maxDuration`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/queries/emails` → listActiveGoogleAccounts
- `@repo/database/queries/emails` → getExistingGmailIds, getUnprocessedEmails
- `@repo/database/mutations/emails` → insertEmails, updateGoogleAccountTokens, updateGoogleAccountLastSync
- `@repo/ai/gmail` → fetchEmails
- `@repo/ai/pipeline/email/core` → processEmailBatch

### `apps/cockpit/src/app/api/ingest/backfill-sentences/route.ts`

**Exports:**
- `POST()`

**Depends on:**
- `@repo/ai/fireflies` → fetchFirefliesTranscript
- `@repo/database/queries/meetings` → getMeetingForBackfill
- `@repo/database/mutations/meetings` → updateMeetingRawFireflies

### `apps/cockpit/src/app/api/ingest/fireflies/route.ts`

**Exports:**
- `GET()`
- `POST()`
- `maxDuration`

**Depends on:**
- `@repo/ai/fireflies` → listFirefliesTranscripts, fetchFirefliesTranscript
- `@repo/ai/transcript-processor` → chunkTranscript
- `@repo/database/queries/meetings` → getExistingFirefliesIds, getExistingMeetingsByTitleDates
- `@repo/ai/validations/fireflies` → isValidDuration
- `@repo/ai/pipeline/gatekeeper-pipeline` → processMeeting
- `@repo/ai/pipeline/embed/re-embed-worker` → runReEmbedWorker

### `apps/cockpit/src/app/api/ingest/reprocess/route.ts`

**Exports:**
- `POST()`
- `maxDuration`

**Depends on:**
- `@repo/ai/fireflies` → fetchFirefliesTranscript
- `@repo/ai/transcript-processor` → chunkTranscript
- `@repo/ai/pipeline/steps/transcribe` → runTranscribeStep
- `@repo/ai/pipeline/steps/summarize` → runSummarizeStep
- `@repo/ai/pipeline/steps/risk-specialist` → runRiskSpecialistStep
- `@repo/ai/pipeline/embed/pipeline` → embedMeetingWithExtractions
- `@repo/database/mutations/meetings` → markMeetingEmbeddingStale
- `@repo/database/queries/meetings` → getMeetingByFirefliesIdForReprocess
- `@repo/ai/pipeline/lib/context-injection` → buildEntityContext
- `@repo/ai/pipeline/tagger` → runTagger
- `@repo/ai/pipeline/lib/segment-builder` → buildSegments
- `@repo/database/mutations/meetings/project-summaries` → insertMeetingProjectSummaries, updateSegmentEmbedding
- `@repo/ai/embeddings` → embedBatch
- `@repo/database/queries/ignored-entities` → getIgnoredEntityNames
- (type) `@repo/ai/validations/gatekeeper` → IdentifiedProject

### `apps/cockpit/src/app/api/management-insights/generate/route.ts`

**Exports:**
- `POST()`
- `maxDuration`

**Depends on:**
- `@repo/ai/pipeline/summary/management-insights` → generateManagementInsights

### `apps/cockpit/src/app/api/mcp/route.ts`

**Exports:**
- `POST()`
- `GET()`
- `DELETE()`

**Depends on:**
- `@repo/mcp/server` → createMcpServer
- `@repo/database/supabase/server` → createClient

### `apps/cockpit/src/app/api/oauth/authorize/route.ts`

**Exports:**
- `GET()`

**Depends on:**
- `@repo/database/supabase/server` → createClient

### `apps/cockpit/src/app/api/oauth/register/route.ts`

**Exports:**
- `POST()`

### `apps/cockpit/src/app/api/oauth/token/route.ts`

**Exports:**
- `POST()`

### `apps/cockpit/src/app/api/scan-needs/route.ts`

**Exports:**
- `POST()`

**Depends on:**
- `@repo/ai/scan-needs` → scanAllUnscannedMeetings

### `apps/cockpit/src/app/api/webhooks/fireflies/route.ts`

**Exports:**
- `POST()`

**Depends on:**
- `@repo/ai/fireflies` → fetchFirefliesTranscript
- `@repo/ai/transcript-processor` → chunkTranscript
- `@repo/database/queries/meetings` → getMeetingByFirefliesId, getMeetingByTitleAndDate
- `@repo/ai/validations/fireflies` → isValidDuration
- `@repo/ai/pipeline/gatekeeper-pipeline` → processMeeting

## Cockpit Pages

### `apps/cockpit/src/app/.well-known/oauth-authorization-server/route.ts`

**Exports:**
- `GET()`

### `apps/cockpit/src/app/(dashboard)/admin/team/invite-dialog.tsx`

**Exports:**
- `InviteDialog()`

### `apps/cockpit/src/app/(dashboard)/admin/team/page.tsx`

**Exports:**
- `dynamic`

**Depends on:**
- `@repo/database/queries/team` → listTeamMembers, countAdmins
- `@repo/database/queries/projects` → listProjects
- `@repo/database/supabase/admin` → getAdminClient

### `apps/cockpit/src/app/(dashboard)/admin/team/team-list.tsx`

**Exports:**
- `TeamList()`

**Types:** `TeamMemberView`, `ProjectOption`

### `apps/cockpit/src/app/(dashboard)/admin/team/user-edit-dialog.tsx`

**Exports:**
- `UserEditDialog()`

### `apps/cockpit/src/app/(dashboard)/admin/team/user-row.tsx`

**Exports:**
- `UserRow()`

**Depends on:**
- `@repo/ui/badge` → Badge

### `apps/cockpit/src/app/(dashboard)/administratie/[id]/page.tsx`

**Exports:**
- `dynamic`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/queries/organizations` → getOrganizationById
- `@repo/database/queries/people` → listPeopleByOrganization
- `@repo/database/queries/emails` → listEmailsByOrganization
- `@repo/ui/badge` → Badge
- `@repo/ui/card` → Card, CardContent, CardHeader, CardTitle
- `@repo/ai/validations/project-summary` → extractOrgTimeline

### `apps/cockpit/src/app/(dashboard)/administratie/page.tsx`

**Exports:**
- `dynamic`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/queries/organizations` → listOrganizationsByType

### `apps/cockpit/src/app/(dashboard)/agents/page.tsx`

**Exports:**
- `dynamic`

**Depends on:**
- `@repo/ai/agents/registry` → AGENT_REGISTRY, readAgentPrompt
- `@repo/ai/agents/pricing` → estimateRunCostUsd
- `@repo/database/queries/agent-runs` → getAgentMetrics, listRecentAgentRuns, type AgentMetrics

### `apps/cockpit/src/app/(dashboard)/architectuur/_data/embeddings.ts`

**Exports:**
- `embedSection`

### `apps/cockpit/src/app/(dashboard)/architectuur/_data/layers.ts`

**Exports:**
- `layers`

**Types:** `LayerProps`

### `apps/cockpit/src/app/(dashboard)/architectuur/_data/mcp-tools.ts`

**Exports:**
- `mcpTools`

**Types:** `ToolInfo`

### `apps/cockpit/src/app/(dashboard)/architectuur/_data/roadmap.ts`

**Exports:**
- `roadmapItems`

**Types:** `RoadmapItem`

### `apps/cockpit/src/app/(dashboard)/architectuur/_data/seed.ts`

**Exports:**
- `seedSection`

### `apps/cockpit/src/app/(dashboard)/architectuur/_data/test-results.ts`

**Exports:**
- `testResults`

**Types:** `TestResult`

### `apps/cockpit/src/app/(dashboard)/architectuur/security/_data/action-items.ts`

**Exports:**
- `actionItems`

**Types:** `ActionItem`

### `apps/cockpit/src/app/(dashboard)/architectuur/security/_data/completed-items.ts`

**Exports:**
- `completedItems`

### `apps/cockpit/src/app/(dashboard)/architectuur/security/_data/credentials.ts`

**Exports:**
- `allCredentials`

**Types:** `CredentialEntry`

### `apps/cockpit/src/app/(dashboard)/architectuur/security/_data/integrations.ts`

**Exports:**
- `integrations`

**Types:** `DataField`, `IntegrationFlow`

### `apps/cockpit/src/app/(dashboard)/architectuur/security/_data/stored-data.ts`

**Exports:**
- `storedDataTables`

**Types:** `StoredDataTable`

### `apps/cockpit/src/app/(dashboard)/clients/[id]/page.tsx`

**Exports:**
- `dynamic`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/queries/organizations` → getOrganizationById
- `@repo/ui/badge` → Badge
- `@repo/ui/card` → Card, CardContent, CardHeader, CardTitle
- `@repo/ui/format` → formatDate
- `@repo/ai/validations/project-summary` → extractOrgTimeline

### `apps/cockpit/src/app/(dashboard)/clients/page.tsx`

**Exports:**
- `dynamic`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/queries/organizations` → listOrganizationsByType
- `@repo/ui/badge` → Badge
- `@repo/ui/format` → formatDate

### `apps/cockpit/src/app/(dashboard)/dev/action-items/golden/[meetingId]/coder-client.tsx`

**Exports:**
- `GoldenCoderClient()`

**Depends on:**
- (type) `@repo/database/queries/golden` → GoldenItemRow, GoldenMeetingState

### `apps/cockpit/src/app/(dashboard)/dev/action-items/golden/[meetingId]/coder-item-card.tsx`

**Exports:**
- `CoderItemCard()`

**Depends on:**
- (type) `@repo/database/queries/golden` → GoldenItemRow

### `apps/cockpit/src/app/(dashboard)/dev/action-items/golden/[meetingId]/coder-item-form.tsx`

**Exports:**
- `CoderItemForm()`

### `apps/cockpit/src/app/(dashboard)/dev/action-items/golden/[meetingId]/coder-skip-dialog.tsx`

**Exports:**
- `CoderSkipDialog()`

### `apps/cockpit/src/app/(dashboard)/dev/action-items/golden/[meetingId]/coder-status-panel.tsx`

**Exports:**
- `CoderStatusPanel()`

**Depends on:**
- (type) `@repo/database/queries/golden` → GoldenMeetingState

### `apps/cockpit/src/app/(dashboard)/dev/action-items/golden/[meetingId]/coder-transcript-pane.tsx`

**Exports:**
- `CoderTranscriptPane`

### `apps/cockpit/src/app/(dashboard)/dev/action-items/golden/[meetingId]/coder-types.ts`

**Exports:**
- `EMPTY_DRAFT`
- `TYPE_WERK_LABELS`
- `LANE_LABELS`

**Types:** `Lane`, `TypeWerk`, `Category`, `FormDraft`, `Participant`

### `apps/cockpit/src/app/(dashboard)/dev/action-items/golden/[meetingId]/page.tsx`

**Exports:**
- `metadata`

**Depends on:**
- `@repo/auth/access` → requireAdmin
- `@repo/database/queries/golden` → getMeetingForGoldenCoder, getGoldenForMeeting

### `apps/cockpit/src/app/(dashboard)/dev/action-items/golden/page.tsx`

**Exports:**
- `metadata`

**Depends on:**
- `@repo/auth/access` → requireAdmin
- `@repo/ui/format` → formatDate
- `@repo/database/queries/golden` → listMeetingsWithGoldenStatus
- (type) `@repo/database/queries/golden` → MeetingWithGoldenStatus

### `apps/cockpit/src/app/(dashboard)/dev/action-items/run/_components/diff-entry-card.tsx`

**Exports:**
- `DiffEntryCard()`

### `apps/cockpit/src/app/(dashboard)/dev/action-items/run/_components/gated-panel.tsx`

**Exports:**
- `GatedPanel()`

### `apps/cockpit/src/app/(dashboard)/dev/action-items/run/_components/result-panel.tsx`

**Exports:**
- `ResultPanel()`

### `apps/cockpit/src/app/(dashboard)/dev/action-items/run/_components/stat.tsx`

**Exports:**
- `Stat()`

### `apps/cockpit/src/app/(dashboard)/dev/action-items/run/_components/two-stage-panel.tsx`

**Exports:**
- `TwoStagePanel()`

### `apps/cockpit/src/app/(dashboard)/dev/action-items/run/client.tsx`

**Exports:**
- `RunActionItemHarnessClient()`

**Depends on:**
- `@repo/ui/format` → formatDate

### `apps/cockpit/src/app/(dashboard)/dev/action-items/run/page.tsx`

**Exports:**
- `metadata`

**Depends on:**
- `@repo/auth/access` → requireAdmin
- `@repo/database/queries/golden` → listMeetingsWithGoldenStatus

### `apps/cockpit/src/app/(dashboard)/dev/detector/client.tsx`

**Exports:**
- `DevDetectorClient()`

**Depends on:**
- `@repo/ui/badge` → Badge
- `@repo/ui/format` → formatDate

### `apps/cockpit/src/app/(dashboard)/dev/detector/create-theme-form.tsx`

**Exports:**
- `CreateThemeForm()`

**Depends on:**
- `@repo/ai/agents/theme-emojis` → ALL_THEME_EMOJIS

### `apps/cockpit/src/app/(dashboard)/dev/detector/page.tsx`

**Exports:**
- `metadata`

**Depends on:**
- `@repo/auth/access` → requireAdmin
- `@repo/database/queries/meetings` → listVerifiedMeetings

### `apps/cockpit/src/app/(dashboard)/dev/speaker-mapping/_components/backfill-panel.tsx`

**Exports:**
- `BackfillPanel()`

**Depends on:**
- `@repo/ui/format` → formatDate

### `apps/cockpit/src/app/(dashboard)/dev/speaker-mapping/_components/grouped-by-person.tsx`

**Exports:**
- `GroupedByPerson()`

### `apps/cockpit/src/app/(dashboard)/dev/speaker-mapping/_components/result-panel.tsx`

**Exports:**
- `ResultPanel()`

### `apps/cockpit/src/app/(dashboard)/dev/speaker-mapping/_components/stat.tsx`

**Exports:**
- `Stat()`

### `apps/cockpit/src/app/(dashboard)/dev/speaker-mapping/client.tsx`

**Exports:**
- `SpeakerMappingClient()`

**Depends on:**
- `@repo/ui/format` → formatDate

### `apps/cockpit/src/app/(dashboard)/dev/speaker-mapping/page.tsx`

**Exports:**
- `metadata`

**Depends on:**
- `@repo/auth/access` → requireAdmin

### `apps/cockpit/src/app/(dashboard)/directory/page.tsx`

**Exports:**
- `dynamic`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/queries/organizations` → listOrganizations
- `@repo/database/queries/people` → listPeople

### `apps/cockpit/src/app/(dashboard)/emails/[id]/page.tsx`

**Exports:**
- `dynamic`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/queries/emails` → getEmailById
- `@repo/database/queries/organizations` → listOrganizations
- `@repo/database/queries/projects` → listProjects
- `@repo/database/queries/people` → listPeople
- `@repo/ui/badge` → Badge

### `apps/cockpit/src/app/(dashboard)/emails/page.tsx`

**Exports:**
- `dynamic`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/queries/emails` → listEmails, listActiveGoogleAccountsSafe, countEmailsByDirection, countEmailsByFilterStatus, countUnprocessedEmails, type EmailDirection, type EmailFilterStatus

### `apps/cockpit/src/app/(dashboard)/intelligence/management/page.tsx`

**Exports:**
- `dynamic`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/queries/meetings` → listBoardMeetings
- `@repo/database/queries/summaries/management-insights` → getManagementInsights, getDismissedInsightKeys
- `@repo/ai/validations/management-insights` → ManagementInsightsOutputSchema

### `apps/cockpit/src/app/(dashboard)/intelligence/page.tsx`

**Exports:**
- `dynamic`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/queries/needs` → countNeeds

### `apps/cockpit/src/app/(dashboard)/intelligence/team/page.tsx`

**Exports:**
- `dynamic`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/queries/needs` → listNeedsGroupedByCategory

### `apps/cockpit/src/app/(dashboard)/intelligence/weekly/page.tsx`

**Exports:**
- `dynamic`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/queries/summaries/weekly` → getLatestWeeklySummary

### `apps/cockpit/src/app/(dashboard)/meetings/[id]/page.tsx`

**Exports:**
- `dynamic`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/queries/meetings` → getVerifiedMeetingById
- `@repo/database/queries/people` → listPeopleWithOrg, listPeopleForAssignment
- `@repo/database/queries/organizations` → listOrganizations
- `@repo/database/queries/projects` → listProjects
- `@repo/database/queries/tasks` → getPromotedExtractionIds
- `@repo/database/queries/meetings/project-summaries` → getSegmentsByMeetingId

### `apps/cockpit/src/app/(dashboard)/meetings/page.tsx`

**Exports:**
- `dynamic`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/queries/meetings` → listVerifiedMeetings

### `apps/cockpit/src/app/(dashboard)/navigatie-test/mock-data.ts`

**Exports:**
- `focusProjectsMvp`
- `productionQuery`
- `signals`
- `parked`

**Types:** `DeliveryPhase`, `FocusProjectMvp`

### `apps/cockpit/src/app/(dashboard)/navigatie-test/navigatie-playground.tsx`

**Exports:**
- `NavigatiePlayground()`

### `apps/cockpit/src/app/(dashboard)/navigatie-test/page.tsx`

**Exports:**
- `metadata`

### `apps/cockpit/src/app/(dashboard)/page.tsx`

**Exports:**
- `dynamic`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/queries/dashboard` → listRecentVerifiedMeetings, listTodaysBriefingMeetings, getExtractionCountsByMeetingIds
- `@repo/database/queries/tasks` → listAllTasks
- `@repo/database/queries/people` → listPeopleForAssignment
- `@repo/database/queries/summaries/management-insights` → getManagementInsights
- `@repo/database/queries/themes` → fetchWindowAggregation
- `@repo/ai/validations/management-insights` → ManagementInsightsOutputSchema

### `apps/cockpit/src/app/(dashboard)/people/[id]/page.tsx`

**Exports:**
- `dynamic`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/queries/people` → getPersonById
- `@repo/database/queries/organizations` → listOrganizations
- `@repo/ui/badge` → Badge

### `apps/cockpit/src/app/(dashboard)/people/page.tsx`

**Exports:**
- `dynamic`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/queries/people` → listPeople
- `@repo/database/queries/organizations` → listOrganizations
- `@repo/ui/badge` → Badge

### `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx`

**Exports:**
- `dynamic`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/queries/projects` → getProjectById
- `@repo/database/queries/meetings/project-summaries` → getSegmentsByProjectId
- `@repo/database/queries/organizations` → listOrganizations
- `@repo/database/queries/people` → listPeople
- `@repo/ai/validations/project-summary` → extractProjectTimeline

### `apps/cockpit/src/app/(dashboard)/projects/page.tsx`

**Exports:**
- `dynamic`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/queries/projects` → listProjects
- `@repo/database/queries/organizations` → listOrganizations

### `apps/cockpit/src/app/(dashboard)/review/[id]/page.tsx`

**Exports:**
- `dynamic`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/queries/review` → getDraftMeetingById
- `@repo/database/queries/people` → listPeopleWithOrg, listPeopleForAssignment
- `@repo/database/queries/organizations` → listOrganizations
- `@repo/database/queries/projects` → listProjects
- `@repo/database/queries/tasks` → getPromotedExtractionIds
- `@repo/database/queries/meetings/project-summaries` → getSegmentsByMeetingId
- `@repo/database/queries/themes` → listProposedThemesForMeeting

### `apps/cockpit/src/app/(dashboard)/review/email/[id]/page.tsx`

**Exports:**
- `dynamic`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/queries/emails` → getDraftEmailById
- `@repo/database/queries/organizations` → listOrganizations
- `@repo/database/queries/projects` → listProjects
- `@repo/database/queries/people` → listPeople

### `apps/cockpit/src/app/(dashboard)/review/page.tsx`

**Exports:**
- `dynamic`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/queries/review` → listDraftMeetings, getReviewStats
- `@repo/database/queries/emails` → listDraftEmails
- `@repo/database/queries/themes` → listEmergingThemes

### `apps/cockpit/src/app/(dashboard)/themes/[slug]/page.tsx`

**Exports:**
- `dynamic`

**Depends on:**
- `@repo/database/queries/themes` → getThemeBySlug, getThemeRecentActivity, getThemeMeetings, getThemeDecisions, getThemeParticipants, getThemeNarrative
- `@repo/auth/helpers` → getAuthenticatedUser
- `@repo/auth/access` → isAdmin

### `apps/cockpit/src/app/(dashboard)/themes/[slug]/tabs/decisions-tab.tsx`

**Exports:**
- `DecisionsTab()`

**Types:** `DecisionsTabProps`

**Depends on:**
- `@repo/ui/format` → formatDate
- (type) `@repo/database/queries/themes` → ThemeDecisionEntry

### `apps/cockpit/src/app/(dashboard)/themes/[slug]/tabs/meetings-tab.tsx`

**Exports:**
- `MeetingsTab()`

**Types:** `MeetingsTabProps`

**Depends on:**
- `@repo/ui/format` → formatDate
- `@repo/ui/badge` → Badge
- (type) `@repo/database/queries/themes` → ThemeMeetingEntry

### `apps/cockpit/src/app/(dashboard)/themes/[slug]/tabs/narrative-tab.tsx`

**Exports:**
- `NarrativeTab()`

**Types:** `NarrativeTabProps`

**Depends on:**
- (type) `@repo/database/queries/themes` → ThemeRow
- (type) `@repo/database/queries/themes` → ThemeNarrativeWithStaleness

### `apps/cockpit/src/app/(dashboard)/themes/[slug]/tabs/overview-tab.tsx`

**Exports:**
- `OverviewTab()`

**Types:** `OverviewTabProps`

**Depends on:**
- `@repo/ui/format` → formatDate
- (type) `@repo/database/queries/themes` → ThemeMeetingEntry, ThemeDecisionEntry

### `apps/cockpit/src/app/(dashboard)/themes/[slug]/tabs/people-tab.tsx`

**Exports:**
- `PeopleTab()`

**Types:** `PeopleTabProps`

**Depends on:**
- (type) `@repo/database/queries/themes` → ThemeParticipantEntry

### `apps/cockpit/src/app/(dashboard)/themes/[slug]/tabs/questions-tab.tsx`

**Exports:**
- `QuestionsTab()`

### `apps/cockpit/src/app/(dashboard)/themes/[slug]/theme-detail-view.tsx`

**Exports:**
- `ThemeDetailView()`

**Types:** `ThemeDetailViewProps`

**Depends on:**
- (type) `@repo/database/queries/themes` → ThemeRow
- `@repo/ui/tabs` → Tabs, TabsList, TabsTrigger, TabsContent

### `apps/cockpit/src/app/auth/callback/route.ts`

**Exports:**
- `GET()`

**Depends on:**
- `@repo/database/supabase/server` → createClient

### `apps/cockpit/src/app/layout.tsx`

**Exports:**
- `viewport`
- `metadata`

### `apps/cockpit/src/app/login/login-form.tsx`

**Exports:**
- `LoginForm()`

**Depends on:**
- `@repo/database/supabase/client` → createClient
- `@repo/ui/button` → Button

## Cockpit Components

### `apps/cockpit/src/components/administratie/administratie-emails.tsx`

**Exports:**
- `AdministratieEmails()`

**Depends on:**
- `@repo/ui/card` → Card, CardContent, CardHeader, CardTitle
- (type) `@repo/database/queries/emails` → EmailListItem

### `apps/cockpit/src/components/administratie/administratie-tabs.tsx`

**Exports:**
- `AdministratieTabs()`

**Depends on:**
- (type) `@repo/database/queries/organizations` → OrganizationListItem
- `@repo/ui/tabs` → Tabs, TabsList, TabsTrigger, TabsContent

### `apps/cockpit/src/components/administratie/organization-card.tsx`

**Exports:**
- `OrganizationCard()`

**Depends on:**
- `@repo/ui/badge` → Badge
- `@repo/ui/format` → formatDate
- (type) `@repo/database/queries/organizations` → OrganizationListItem

### `apps/cockpit/src/components/agents/activity-feed.tsx`

**Exports:**
- `ActivityFeed()`

**Depends on:**
- (type) `@repo/database/queries/agent-runs` → AgentRunRow
- (type) `@repo/ai/agents/registry` → AgentDefinition

### `apps/cockpit/src/components/agents/agent-card.tsx`

**Exports:**
- `AgentCard()`

**Depends on:**
- (type) `@repo/ai/agents/registry` → AgentDefinition
- (type) `@repo/database/queries/agent-runs` → AgentMetrics
- `@repo/ui/dialog` → Dialog, DialogContent, DialogHeader, DialogTitle

### `apps/cockpit/src/components/agents/quadrant-styles.ts`

**Exports:**
- `quadrantHeader`
- `quadrantBadge`
- `quadrantLabel`

**Depends on:**
- (type) `@repo/ai/agents/registry` → AgentQuadrant

### `apps/cockpit/src/components/agents/system-overview.tsx`

**Exports:**
- `SystemOverview()`

**Types:** `SystemStats`

### `apps/cockpit/src/components/architectuur/embeddings-card.tsx`

**Exports:**
- `EmbeddingsCard()`

**Depends on:**
- `@repo/ui/card` → Card, CardContent, CardHeader, CardTitle, CardDescription
- `@repo/ui/accordion` → Accordion, AccordionContent, AccordionItem, AccordionTrigger

### `apps/cockpit/src/components/architectuur/flow-arrow.tsx`

**Exports:**
- `FlowArrow()`

### `apps/cockpit/src/components/architectuur/layer-card.tsx`

**Exports:**
- `LayerCard()`

**Depends on:**
- `@repo/ui/card` → Card, CardContent, CardHeader, CardTitle, CardDescription
- `@repo/ui/accordion` → Accordion, AccordionContent, AccordionItem, AccordionTrigger

### `apps/cockpit/src/components/architectuur/mcp-section.tsx`

**Exports:**
- `McpSection()`

**Depends on:**
- `@repo/ui/card` → Card, CardContent, CardHeader, CardTitle, CardDescription
- `@repo/ui/badge` → Badge
- `@repo/ui/accordion` → Accordion, AccordionContent, AccordionItem, AccordionTrigger

### `apps/cockpit/src/components/architectuur/roadmap-card.tsx`

**Exports:**
- `RoadmapCard()`

**Depends on:**
- `@repo/ui/card` → Card, CardContent, CardHeader, CardTitle, CardDescription

### `apps/cockpit/src/components/architectuur/security/action-items-card.tsx`

**Exports:**
- `ActionItemsCard()`

**Depends on:**
- `@repo/ui/card` → Card, CardContent, CardHeader, CardTitle, CardDescription

### `apps/cockpit/src/components/architectuur/security/completed-card.tsx`

**Exports:**
- `CompletedCard()`

**Depends on:**
- `@repo/ui/card` → Card, CardContent, CardHeader, CardTitle, CardDescription

### `apps/cockpit/src/components/architectuur/security/credentials-section.tsx`

**Exports:**
- `CredentialsSection()`

**Depends on:**
- `@repo/ui/card` → Card, CardContent

### `apps/cockpit/src/components/architectuur/security/data-flow-table.tsx`

**Exports:**
- `DataFlowTable()`

### `apps/cockpit/src/components/architectuur/security/integration-card.tsx`

**Exports:**
- `IntegrationCard()`

**Depends on:**
- `@repo/ui/card` → Card, CardContent, CardHeader, CardTitle, CardDescription
- `@repo/ui/badge` → Badge
- `@repo/ui/accordion` → Accordion, AccordionContent, AccordionItem, AccordionTrigger

### `apps/cockpit/src/components/architectuur/security/sensitivity-badge.tsx`

**Exports:**
- `SensitivityBadge()`

### `apps/cockpit/src/components/architectuur/security/stored-data-section.tsx`

**Exports:**
- `StoredDataSection()`

**Depends on:**
- `@repo/ui/card` → Card, CardContent
- `@repo/ui/badge` → Badge

### `apps/cockpit/src/components/architectuur/seed-card.tsx`

**Exports:**
- `SeedCard()`

**Depends on:**
- `@repo/ui/card` → Card, CardContent, CardHeader, CardTitle, CardDescription

### `apps/cockpit/src/components/architectuur/status-badge.tsx`

**Exports:**
- `StatusBadge()`

**Depends on:**
- `@repo/ui/badge` → Badge

### `apps/cockpit/src/components/architectuur/test-results-card.tsx`

**Exports:**
- `TestResultsCard()`

**Depends on:**
- `@repo/ui/card` → Card, CardContent, CardHeader, CardTitle, CardDescription

### `apps/cockpit/src/components/dashboard/greeting.tsx`

**Exports:**
- `Greeting()`

### `apps/cockpit/src/components/dashboard/management-insights-strip.tsx`

**Exports:**
- `ManagementInsightsStrip()`

**Depends on:**
- (type) `@repo/ai/agents/management-insights` → ManagementInsightsOutput

### `apps/cockpit/src/components/dashboard/meeting-carousel.tsx`

**Exports:**
- `MeetingCarousel()`

**Depends on:**
- `@repo/ui/button` → Button
- `@repo/ui/badge` → Badge
- `@repo/ui/format` → formatDateShort
- (type) `@repo/database/queries/dashboard` → BriefingMeeting, ExtractionCounts

### `apps/cockpit/src/components/dashboard/recent-verified-meetings.tsx`

**Exports:**
- `RecentVerifiedMeetings()`

**Depends on:**
- `@repo/ui/card` → Card, CardContent, CardHeader, CardTitle
- (type) `@repo/database/queries/dashboard` → RecentVerifiedMeeting
- `@repo/ui/format` → formatDateShort

### `apps/cockpit/src/components/dashboard/task-item.tsx`

**Exports:**
- `TaskItem()`

**Depends on:**
- `@repo/ui/format` → formatDateShort
- (type) `@repo/database/queries/tasks` → TaskRow
- (type) `@repo/database/queries/people` → PersonForAssignment

### `apps/cockpit/src/components/dashboard/tasks-card.tsx`

**Exports:**
- `TasksCard()`

**Depends on:**
- `@repo/ui/card` → Card, CardContent, CardHeader, CardTitle
- (type) `@repo/database/queries/tasks` → TaskRow
- (type) `@repo/database/queries/people` → PersonForAssignment

### `apps/cockpit/src/components/intelligence/board-meeting-card.tsx`

**Exports:**
- `BoardMeetingCard()`

**Depends on:**
- (type) `@repo/database/queries/meetings` → BoardMeetingListItem

### `apps/cockpit/src/components/intelligence/generate-insights-button.tsx`

**Exports:**
- `GenerateInsightsButton()`

### `apps/cockpit/src/components/intelligence/management-insight-card.tsx`

**Exports:**
- `OpvolgingItem()`
- `PipelineItem()`
- `ThemaItem()`

### `apps/cockpit/src/components/intelligence/management-insights-panel.tsx`

**Exports:**
- `ManagementInsightsPanel()`

**Depends on:**
- (type) `@repo/ai/agents/management-insights` → ManagementInsightsOutput

### `apps/cockpit/src/components/intelligence/needs-category-list.tsx`

**Exports:**
- `NeedsCategoryList()`

**Depends on:**
- (type) `@repo/database/queries/needs` → NeedsByCategory, NeedRow, NeedStatus

### `apps/cockpit/src/components/intelligence/scan-needs-button.tsx`

**Exports:**
- `ScanNeedsButton()`

### `apps/cockpit/src/components/layout/desktop-sidebar.tsx`

**Exports:**
- `DesktopSidebar()`

**Depends on:**
- (type) `@repo/database/queries/projects` → FocusProject
- `@repo/ui/workspace-switcher` → WorkspaceSwitcher

### `apps/cockpit/src/components/layout/side-menu.tsx`

**Exports:**
- `SideMenu()`

**Depends on:**
- (type) `@repo/database/queries/projects` → FocusProject
- `@repo/ui/workspace-switcher` → WorkspaceSwitcher

### `apps/cockpit/src/components/shared/confidence-bar.tsx`

**Exports:**
- `ConfidenceBar()`

### `apps/cockpit/src/components/shared/confirm-dialog.tsx`

**Exports:**
- `ConfirmDialog()`

**Depends on:**
- `@repo/ui/alert-dialog` → AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel

### `apps/cockpit/src/components/shared/extraction-card.tsx`

**Exports:**
- `ExtractionCard()`

**Depends on:**
- (type) `@repo/database/queries/people` → PersonForAssignment

### `apps/cockpit/src/components/shared/extraction-constants.ts`

**Exports:**
- `EXTRACTION_TYPE_ORDER`
- `EXTRACTION_TYPE_LABELS`
- `EXTRACTION_TYPE_ICONS`
- `EXTRACTION_TYPE_COLORS`
- `CATEGORY_BADGES`
- `RISK_SEVERITY_BADGES`
- `RISK_CATEGORY_LABELS`
- `RISK_IMPACT_AREA_LABELS`

### `apps/cockpit/src/components/shared/extraction-dots.tsx`

**Exports:**
- `ExtractionDots()`

### `apps/cockpit/src/components/shared/follow-up-checklist.tsx`

**Exports:**
- `FollowUpChecklist()`

**Depends on:**
- (type) `@repo/database/queries/people` → PersonForAssignment

### `apps/cockpit/src/components/shared/jaip-widget-script.tsx`

**Exports:**
- `JaipWidgetScript()`

**Depends on:**
- `@repo/database/supabase/server` → createClient

### `apps/cockpit/src/components/shared/markdown-summary.tsx`

**Exports:**
- `MarkdownSummary()`

### `apps/cockpit/src/components/shared/meeting-transcript-panel.tsx`

**Exports:**
- `MeetingTranscriptPanel()`

**Depends on:**
- `@repo/ui/format` → formatDateLong

### `apps/cockpit/src/components/shared/meeting-type-badge.tsx`

**Exports:**
- `MeetingTypeBadge()`

**Depends on:**
- `@repo/database/constants/meetings` → formatMeetingType

### `apps/cockpit/src/components/shared/modal.tsx`

**Exports:**
- `Modal()`

**Depends on:**
- `@repo/ui/dialog` → Dialog, DialogContent, DialogHeader, DialogTitle
- `@repo/ui/utils` → cn

### `apps/cockpit/src/components/shared/org-type-labels.ts`

**Exports:**
- `ORG_TYPE_LABELS`

### `apps/cockpit/src/components/shared/organization-colors.ts`

**Exports:**
- `ORG_TYPE_COLORS`
- `ORG_STATUS_COLORS`

### `apps/cockpit/src/components/shared/pipeline-info.tsx`

**Exports:**
- `PipelineInfo()`

### `apps/cockpit/src/components/shared/promote-task-form.tsx`

**Exports:**
- `PromoteTaskForm()`

**Depends on:**
- (type) `@repo/database/queries/people` → PersonForAssignment

### `apps/cockpit/src/components/shared/regenerate-menu.tsx`

**Exports:**
- `RegenerateMenu()`

**Depends on:**
- `@repo/ui/button` → Button
- `@repo/ui/dropdown-menu` → DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator

### `apps/cockpit/src/components/shared/segment-list.tsx`

**Exports:**
- `SegmentList()`

**Depends on:**
- (type) `@repo/database/queries/meetings/project-summaries` → MeetingSegment

### `apps/cockpit/src/components/shared/structured-transcript.tsx`

**Exports:**
- `StructuredTranscript()`

### `apps/cockpit/src/components/shared/userback-provider.tsx`

**Exports:**
- `UserbackProvider()`

### `apps/cockpit/src/components/shared/verification-badge.tsx`

**Exports:**
- `VerificationBadge()`

**Depends on:**
- `@repo/ui/format` → formatDateLong

### `apps/cockpit/src/components/weekly/generate-weekly-button.tsx`

**Exports:**
- `GenerateWeeklyButton()`

### `apps/cockpit/src/components/weekly/weekly-summary-view.tsx`

**Exports:**
- `WeeklySummaryView()`

**Depends on:**
- `@repo/ui/format` → formatDate

## Cockpit Middleware

### `apps/cockpit/src/middleware.ts`

**Exports:**
- `middleware`
- `config`

**Depends on:**
- `@repo/auth/middleware` → createAuthMiddleware

## DevHub Server Actions

### `apps/devhub/src/actions/attachments.ts`

**Exports:**
- `createIssueAttachmentUploadUrlAction()`
- `recordIssueAttachmentAction()`

**Depends on:**
- `@repo/auth/helpers` → getAuthenticatedUser
- `@repo/auth/access` → assertProjectAccess, NotAuthorizedError
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/database/queries/issues` → getIssueById
- `@repo/database/mutations/issues/attachments` → insertAttachment

### `apps/devhub/src/actions/bulk-cluster-cleanup.ts`

**Exports:**
- `runBulkClusterCleanupAction()`
- `acceptClusterToExistingAction()`
- `acceptClusterAsNewAction()`

**Types:** `BulkClusterRunResult`

**Depends on:**
- `@repo/auth/helpers` → getAuthenticatedUser, createPageClient
- `@repo/auth/access` → listAccessibleProjectIds
- `@repo/database/queries/issues` → listIssues
- `@repo/database/queries/topics` → listOpenTopicsForCluster, listTopicSampleIssues
- `@repo/ai/agents/bulk-cluster-cleanup` → runBulkClusterCleanup
- (type) `@repo/ai/validations/bulk-cluster-cleanup` → BulkClusterOutput
- `@repo/database/constants/topics` → TOPIC_TYPES

### `apps/devhub/src/actions/import.ts`

**Exports:**
- `syncUserback()`
- `getSyncStatus()`
- `backfillMedia()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/auth/helpers` → getAuthenticatedUser
- `@repo/auth/access` → isAdmin, assertProjectAccess, NotAuthorizedError
- `@repo/database/queries/userback-issues` → getUserbackSyncCursor, countUserbackIssues, listUserbackIssuesForBackfill
- `@repo/database/queries/issues/attachments` → getIssueIdsWithAttachments
- `@repo/database/integrations/userback` → extractMediaFromMetadata
- `@repo/database/integrations/userback-sync` → executeSyncPipeline
- `@repo/database/mutations/issues/attachments` → storeIssueMedia

### `apps/devhub/src/actions/review.ts`

**Exports:**
- `generateProjectReview()`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/database/queries/issues` → listIssues
- `@repo/database/queries/projects` → getProjectById
- `@repo/database/mutations/projects/reviews` → saveProjectReview
- `@repo/database/mutations/team` → ensureProfileExists
- `@repo/ai/agents/issue-reviewer` → runIssueReviewer, type IssueForReview
- `@repo/auth/helpers` → getAuthenticatedUser, isAuthBypassed
- `@repo/auth/access` → assertProjectAccess, NotAuthorizedError

### `apps/devhub/src/actions/slack-settings.ts`

**Exports:**
- `updateSlackConfigAction()`
- `testSlackWebhookAction()`

**Depends on:**
- `@repo/auth/helpers` → getAuthenticatedUser
- `@repo/auth/access` → isAdmin
- `@repo/database/integrations/slack` → SLACK_NOTIFY_EVENTS
- `@repo/database/mutations/slack-config` → upsertSlackConfig, deleteSlackConfig

### `apps/devhub/src/actions/widget-domains.ts`

**Exports:**
- `addWidgetDomainAction()`
- `removeWidgetDomainAction()`

**Depends on:**
- `@repo/auth/helpers` → getAuthenticatedUser
- `@repo/auth/access` → isAdmin
- `@repo/database/validations/widget-domain` → addWidgetDomainSchema, removeWidgetDomainSchema, type AddWidgetDomainInput, type RemoveWidgetDomainInput
- `@repo/database/mutations/widget` → addWidgetDomain, removeWidgetDomain
- `@repo/database/mutations/audit-events` → recordAuditEvent

## DevHub API Routes

### `apps/devhub/src/app/api/ingest/userback/route.ts`

**Exports:**
- `GET()`
- `POST()`
- `maxDuration`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/database/queries/projects` → getProjectByUserbackProjectId
- `@repo/database/integrations/userback-sync` → executeSyncPipeline
- `@repo/auth/access` → isAdmin

### `apps/devhub/src/app/api/ingest/widget/route.ts`

**Exports:**
- `POST()`
- `OPTIONS()`

**Depends on:**
- `@repo/database/validations/widget` → widgetIngestSchema
- `@repo/database/queries/widget` → isOriginAllowedForProject
- `@repo/database/mutations/widget` → insertWidgetIssue

### `apps/devhub/src/app/api/ingest/widget/screenshot/route.ts`

**Exports:**
- `POST()`
- `OPTIONS()`
- `runtime`

**Depends on:**
- `@repo/database/queries/widget` → isOriginAllowedForProject
- `@repo/database/mutations/widget` → uploadWidgetScreenshot
- `@repo/database/constants/widget` → WIDGET_SCREENSHOT_ALLOWED_MIMES, WIDGET_SCREENSHOT_MAX_BYTES

## DevHub Pages

### `apps/devhub/src/app/(app)/changelog/changelog-data.ts`

**Exports:**
- `CHANGELOG`

**Types:** `ChangelogBatch`

### `apps/devhub/src/app/(app)/changelog/page.tsx`

**Exports:**
- `metadata`

### `apps/devhub/src/app/(app)/settings/import/sync-card.tsx`

**Exports:**
- `SyncCard()`

**Depends on:**
- `@repo/ui/button` → Button
- `@repo/ui/utils` → cn

### `apps/devhub/src/app/(app)/settings/slack/slack-config-card.tsx`

**Exports:**
- `SlackConfigCard()`

**Depends on:**
- `@repo/ui/button` → Button
- (type) `@repo/database/integrations/slack` → SlackNotifyEvent

### `apps/devhub/src/app/(app)/settings/widget/widget-domains-card.tsx`

**Exports:**
- `WidgetDomainsCard()`

**Depends on:**
- `@repo/ui/button` → Button

### `apps/devhub/src/app/auth/callback/route.ts`

**Exports:**
- `GET()`

**Depends on:**
- `@repo/database/supabase/server` → createClient

### `apps/devhub/src/app/layout.tsx`

**Exports:**
- `viewport`
- `metadata`

### `apps/devhub/src/app/login/login-form.tsx`

**Exports:**
- `LoginForm()`

**Depends on:**
- `@repo/database/supabase/client` → createClient
- `@repo/ui/button` → Button

### `apps/devhub/src/app/login/page.tsx`

**Exports:**
- `dynamic`

## DevHub Components

### `apps/devhub/src/components/cluster-suggestions/cluster-suggestion-card.tsx`

**Exports:**
- `ClusterSuggestionCard()`

**Types:** `AcceptedNotice`, `ClusterSuggestionCardProps`

**Depends on:**
- (type) `@repo/ai/validations/bulk-cluster-cleanup` → BulkCluster
- `@repo/ui/utils` → cn

### `apps/devhub/src/components/cluster-suggestions/cluster-suggestions-panel.tsx`

**Exports:**
- `ClusterSuggestionsPanel()`

**Types:** `ClusterSuggestionsPanelProps`

**Depends on:**
- (type) `@repo/ai/validations/bulk-cluster-cleanup` → BulkClusterOutput
- `@repo/ui/utils` → cn

### `apps/devhub/src/components/dashboard/area-summaries.tsx`

**Exports:**
- `AreaSummaries()`

### `apps/devhub/src/components/dashboard/dashboard-header.tsx`

**Exports:**
- `DashboardHeader()`

**Depends on:**
- `@repo/ui/button` → Button

### `apps/devhub/src/components/dashboard/dashboard-metrics.tsx`

**Exports:**
- `DashboardMetrics()`

**Depends on:**
- `@repo/ui/utils` → cn

### `apps/devhub/src/components/dashboard/health-hero.tsx`

**Exports:**
- `HealthHero()`

**Depends on:**
- `@repo/ui/utils` → cn

### `apps/devhub/src/components/layout/app-sidebar.tsx`

**Exports:**
- `AppSidebar()`

**Depends on:**
- `@repo/ui/workspace-switcher` → WorkspaceSwitcher

### `apps/devhub/src/components/layout/count-seeder.tsx`

**Exports:**
- `CountSeeder()`

### `apps/devhub/src/components/layout/issue-count-store.ts`

**Exports:**
- `EMPTY_COUNTS`
- `issueCountStore`

**Types:** `StatusKey`, `StatusCounts`

### `apps/devhub/src/components/layout/mobile-sidebar.tsx`

**Exports:**
- `MobileSidebar()`

**Depends on:**
- `@repo/ui/workspace-switcher` → WorkspaceSwitcher

### `apps/devhub/src/components/layout/project-switcher.tsx`

**Exports:**
- `ProjectSwitcher()`

**Depends on:**
- `@repo/ui/utils` → cn

### `apps/devhub/src/components/layout/search-input.tsx`

**Exports:**
- `SearchInput()`

### `apps/devhub/src/components/layout/sidebar-constants.ts`

**Exports:**
- `issueHref()`
- `NAV_ITEMS`

**Types:** `NavItem`

### `apps/devhub/src/components/layout/sidebar-nav.tsx`

**Exports:**
- `SidebarNav()`

**Depends on:**
- `@repo/ui/utils` → cn

### `apps/devhub/src/components/layout/top-bar.tsx`

**Exports:**
- `TopBar()`

### `apps/devhub/src/components/review/action-items-list.tsx`

**Exports:**
- `ActionItemsList()`

**Depends on:**
- `@repo/ui/utils` → cn

### `apps/devhub/src/components/shared/avatar.tsx`

**Exports:**
- `Avatar()`

### `apps/devhub/src/components/shared/component-badge.tsx`

**Exports:**
- `ComponentBadge()`

**Depends on:**
- `@repo/ui/utils` → cn

### `apps/devhub/src/components/shared/priority-badge.tsx`

**Exports:**
- `PriorityBadge()`
- `PriorityDot()`

**Depends on:**
- `@repo/ui/utils` → cn

### `apps/devhub/src/components/shared/status-badge.tsx`

**Exports:**
- `StatusBadge()`

**Depends on:**
- `@repo/ui/utils` → cn

### `apps/devhub/src/components/shared/time-ago.ts`

**Exports:**
- `timeAgo()`

### `apps/devhub/src/components/shared/type-badge.tsx`

**Exports:**
- `TypeBadge()`

**Depends on:**
- `@repo/ui/utils` → cn

## DevHub Middleware

### `apps/devhub/src/middleware.ts`

**Exports:**
- `middleware`
- `config`

**Depends on:**
- `@repo/auth/middleware` → createAuthMiddleware

## Cross-Package Dependency Matrix

Which layers depend on which packages:

| Layer | database | ai | auth | ui | mcp | Total |
|-------|---|---|---|---|---|-------|
| AI Agents | 1 | - | - | - | - | 1 |
| AI Core | 13 | - | - | - | - | 13 |
| AI Pipeline | 63 | - | - | - | - | 63 |
| AI Validations | 1 | - | - | - | - | 1 |
| Auth | 4 | - | - | - | - | 4 |
| Cockpit Server Actions | 28 | 13 | 13 | - | - | 54 |
| Cockpit API Routes | 27 | 36 | 2 | - | 1 | 66 |
| Cockpit Components | 21 | 5 | - | 41 | - | 67 |
| Cockpit Middleware | - | - | 1 | - | - | 1 |
| Cockpit Pages | 100 | 8 | 8 | 38 | - | 154 |
| Database Queries | - | - | 3 | - | - | 3 |
| DevHub Server Actions | 23 | 3 | 12 | - | - | 38 |
| DevHub API Routes | 10 | - | 1 | - | - | 11 |
| DevHub Components | - | 2 | - | 14 | - | 16 |
| DevHub Middleware | - | - | 1 | - | - | 1 |
| DevHub Pages | 27 | - | 22 | 12 | - | 61 |
| MCP Server | 28 | 1 | - | - | - | 29 |

## Critical Integration Points

Files that import from 3+ shared packages. These are the most interconnected
parts of the codebase — changes here have the widest blast radius.

| File | Packages | Count |
|------|----------|-------|
| `apps/cockpit/src/actions/dev-action-item-runner.ts` | auth, database, ai | 3 |
| `apps/cockpit/src/actions/dev-detector.ts` | ai, auth, database | 3 |
| `apps/cockpit/src/actions/dev-speaker-mapping.ts` | auth, database, ai | 3 |
| `apps/cockpit/src/actions/management-insights.ts` | database, auth, ai | 3 |
| `apps/cockpit/src/actions/scan-needs.ts` | database, auth, ai | 3 |
| `apps/cockpit/src/actions/weekly-summary.ts` | database, auth, ai | 3 |
| `apps/cockpit/src/app/(dashboard)/administratie/[id]/page.tsx` | database, ui, ai | 3 |
| `apps/cockpit/src/app/(dashboard)/clients/[id]/page.tsx` | database, ui, ai | 3 |
| `apps/cockpit/src/app/(dashboard)/dev/action-items/golden/page.tsx` | auth, ui, database | 3 |
| `apps/cockpit/src/app/api/email/process-pending/route.ts` | database, ai, auth | 3 |
| `apps/cockpit/src/app/api/email/reclassify/route.ts` | database, ai, auth | 3 |
| `apps/cockpit/src/components/agents/agent-card.tsx` | ai, database, ui | 3 |
| `apps/devhub/src/actions/bulk-cluster-cleanup.ts` | auth, database, ai | 3 |
| `apps/devhub/src/actions/review.ts` | database, ai, auth | 3 |

## Key Dependency Chains

Tracing the most important data flows from action → pipeline → database.

### mutations/agent-runs.ts

| Mutation | Called from |
|----------|------------|
| `insertAgentRun()` | `packages/ai/src/agents/run-logger.ts` |

### mutations/audit-events.ts

| Mutation | Called from |
|----------|------------|
| `recordAuditEvent()` | `apps/devhub/src/actions/widget-domains.ts` |

### mutations/emails.ts

| Mutation | Called from |
|----------|------------|
| `upsertGoogleAccount()` | `apps/cockpit/src/app/api/email/auth/callback/route.ts` |
| `updateGoogleAccountTokens()` | `apps/cockpit/src/app/api/cron/email-sync/route.ts`, `apps/cockpit/src/app/api/email/sync/route.ts` |
| `updateGoogleAccountLastSync()` | `apps/cockpit/src/app/api/cron/email-sync/route.ts`, `apps/cockpit/src/app/api/email/sync/route.ts` |
| `insertEmails()` | `apps/cockpit/src/app/api/cron/email-sync/route.ts`, `apps/cockpit/src/app/api/email/sync/route.ts` |
| `updateEmailClassification()` | `packages/ai/src/pipeline/email/core.ts` |
| `updateEmailFilterStatus()` | `packages/ai/src/pipeline/email/core.ts`, `apps/cockpit/src/app/api/email/reclassify/route.ts` |
| `linkEmailProject()` | `packages/ai/src/pipeline/email/core.ts` |
| `updateEmailSenderPerson()` | `packages/ai/src/pipeline/email/core.ts` |

### mutations/embeddings.ts

| Mutation | Called from |
|----------|------------|
| `updateRowEmbedding()` | `packages/ai/src/pipeline/embed/pipeline.ts` |
| `batchUpdateEmbeddings()` | `packages/ai/src/pipeline/embed/pipeline.ts`, `packages/ai/src/pipeline/embed/re-embed-worker.ts` |

### mutations/extractions/core.ts

| Mutation | Called from |
|----------|------------|
| `deleteExtractionsByMeetingAndType()` | `packages/ai/src/pipeline/saves/risk-extractions.ts` |
| `deleteExtractionsByMeetingTypeAndSource()` | `packages/ai/src/pipeline/saves/action-item-extractions.ts` |
| `getExtractionForCorrection()` | `packages/mcp/src/tools/correct-extraction.ts` |
| `correctExtraction()` | `packages/mcp/src/tools/correct-extraction.ts` |
| `insertExtractions()` | `packages/ai/src/pipeline/saves/action-item-extractions.ts`, `packages/ai/src/pipeline/saves/risk-extractions.ts`, `packages/ai/src/scan-needs.ts`, `packages/mcp/src/tools/write-client-updates.ts` |
| `updateNeedStatus()` | `apps/cockpit/src/actions/scan-needs.ts` |

### mutations/extractions/experimental-action-items.ts

| Mutation | Called from |
|----------|------------|
| `insertExperimentalActionItemExtraction()` | `packages/ai/src/pipeline/steps/action-item-specialist.ts` |

### mutations/extractions/experimental-risks.ts

| Mutation | Called from |
|----------|------------|
| `insertExperimentalRiskExtraction()` | `packages/ai/src/pipeline/steps/risk-specialist.ts` |

### mutations/extractions/themes.ts

| Mutation | Called from |
|----------|------------|
| `linkExtractionsToThemes()` | `packages/ai/src/pipeline/steps/link-themes.ts` |
| `clearExtractionThemesForMeeting()` | `packages/ai/src/pipeline/steps/link-themes.ts` |

### mutations/golden.ts

| Mutation | Called from |
|----------|------------|
| `upsertGoldenMeeting()` | `apps/cockpit/src/actions/golden-action-items.ts` |
| `insertGoldenItem()` | `apps/cockpit/src/actions/golden-action-items.ts` |
| `updateGoldenItem()` | `apps/cockpit/src/actions/golden-action-items.ts` |
| `deleteGoldenItem()` | `apps/cockpit/src/actions/golden-action-items.ts` |
| `resetGoldenForMeeting()` | `apps/cockpit/src/actions/golden-action-items.ts` |

### mutations/ignored-entities.ts

| Mutation | Called from |
|----------|------------|
| `addIgnoredEntity()` | `apps/cockpit/src/actions/segments.ts` |

### mutations/issues/attachments.ts

| Mutation | Called from |
|----------|------------|
| `insertAttachment()` | `apps/devhub/src/actions/attachments.ts` |
| `storeIssueMedia()` | `apps/devhub/src/actions/import.ts` |

### mutations/meetings/core.ts

| Mutation | Called from |
|----------|------------|
| `insertMeeting()` | `packages/ai/src/pipeline/gatekeeper-pipeline.ts` |
| `insertManualMeeting()` | `packages/mcp/src/tools/write-client-updates.ts` |
| `updateMeetingClassification()` | `apps/cockpit/src/app/api/cron/reclassify/route.ts` |
| `updateMeetingElevenLabs()` | `packages/ai/src/pipeline/steps/transcribe.ts` |
| `updateMeetingNamedTranscript()` | `packages/ai/src/pipeline/steps/speaker-mapping.ts` |
| `updateMeetingTitle()` | `packages/ai/src/pipeline/steps/generate-title.ts` |
| `linkAllMeetingProjects()` | `packages/ai/src/pipeline/saves/action-item-extractions.ts`, `packages/ai/src/pipeline/saves/risk-extractions.ts`, `packages/ai/src/scripts/batch-segment-migration.ts` |
| `updateMeetingSummary()` | `packages/ai/src/pipeline/steps/summarize.ts` |
| `updateMeetingRawFireflies()` | `apps/cockpit/src/app/api/ingest/backfill-sentences/route.ts` |
| `markMeetingEmbeddingStale()` | `apps/cockpit/src/app/api/ingest/reprocess/route.ts` |

### mutations/meetings/participants.ts

| Mutation | Called from |
|----------|------------|
| `linkMeetingParticipants()` | `packages/ai/src/pipeline/participant/helpers.ts` |

### mutations/meetings/project-summaries.ts

| Mutation | Called from |
|----------|------------|
| `insertMeetingProjectSummaries()` | `packages/ai/src/pipeline/steps/tag-and-segment.ts`, `packages/ai/src/scripts/batch-segment-migration.ts`, `apps/cockpit/src/app/api/ingest/reprocess/route.ts` |
| `linkSegmentToProject()` | `apps/cockpit/src/actions/segments.ts` |
| `removeSegmentTag()` | `apps/cockpit/src/actions/segments.ts` |
| `updateSegmentEmbedding()` | `packages/ai/src/pipeline/steps/tag-and-segment.ts`, `packages/ai/src/scripts/batch-segment-migration.ts`, `apps/cockpit/src/app/api/ingest/reprocess/route.ts` |

### mutations/meetings/themes.ts

| Mutation | Called from |
|----------|------------|
| `linkMeetingToThemes()` | `packages/ai/src/pipeline/steps/link-themes.ts` |
| `clearMeetingThemes()` | `packages/ai/src/pipeline/steps/link-themes.ts` |
| `recalculateThemeStats()` | `packages/ai/src/pipeline/steps/link-themes.ts` |

### mutations/profiles.ts

| Mutation | Called from |
|----------|------------|
| `upsertProfile()` | `apps/cockpit/src/actions/team.ts` |

### mutations/projects/core.ts

| Mutation | Called from |
|----------|------------|
| `updateProjectAliases()` | `packages/ai/src/pipeline/lib/entity-resolution.ts`, `apps/cockpit/src/actions/segments.ts` |

### mutations/projects/reviews.ts

| Mutation | Called from |
|----------|------------|
| `saveProjectReview()` | `apps/devhub/src/actions/review.ts` |

### mutations/slack-config.ts

| Mutation | Called from |
|----------|------------|
| `upsertSlackConfig()` | `apps/devhub/src/actions/slack-settings.ts` |
| `deleteSlackConfig()` | `apps/devhub/src/actions/slack-settings.ts` |

### mutations/summaries/core.ts

| Mutation | Called from |
|----------|------------|
| `createSummaryVersion()` | `packages/ai/src/pipeline/summary/org.ts`, `packages/ai/src/pipeline/summary/project.ts`, `packages/ai/src/pipeline/summary/weekly.ts` |

### mutations/summaries/management-insights.ts

| Mutation | Called from |
|----------|------------|
| `saveManagementInsights()` | `packages/ai/src/pipeline/summary/management-insights.ts` |
| `dismissInsight()` | `apps/cockpit/src/actions/management-insights.ts` |

### mutations/tasks.ts

| Mutation | Called from |
|----------|------------|
| `createTaskFromExtraction()` | `packages/mcp/src/tools/write-tasks.ts`, `apps/cockpit/src/actions/tasks.ts` |
| `updateTask()` | `packages/mcp/src/tools/write-tasks.ts`, `apps/cockpit/src/actions/tasks.ts` |
| `completeTask()` | `packages/mcp/src/tools/write-tasks.ts`, `apps/cockpit/src/actions/tasks.ts` |
| `dismissTask()` | `packages/mcp/src/tools/write-tasks.ts`, `apps/cockpit/src/actions/tasks.ts` |

### mutations/team.ts

| Mutation | Called from |
|----------|------------|
| `upsertProfile()` | `apps/cockpit/src/actions/team.ts` |
| `ensureProfileExists()` | `apps/devhub/src/actions/review.ts` |
| `updateProfileRole()` | `apps/cockpit/src/actions/team.ts` |
| `clearProjectAccess()` | `apps/cockpit/src/actions/team.ts` |
| `insertProjectAccess()` | `apps/cockpit/src/actions/team.ts` |

### mutations/themes.ts

| Mutation | Called from |
|----------|------------|
| `createEmergingTheme()` | `packages/ai/src/pipeline/steps/link-themes.ts` |
| `upsertThemeNarrative()` | `packages/ai/src/pipeline/steps/synthesize-theme-narrative.ts` |

### mutations/widget/admin.ts

| Mutation | Called from |
|----------|------------|
| `addWidgetDomain()` | `apps/devhub/src/actions/widget-domains.ts` |
| `removeWidgetDomain()` | `apps/devhub/src/actions/widget-domains.ts` |

### mutations/widget/feedback.ts

| Mutation | Called from |
|----------|------------|
| `insertWidgetIssue()` | `apps/devhub/src/app/api/ingest/widget/route.ts` |

### mutations/widget/screenshot.ts

| Mutation | Called from |
|----------|------------|
| `uploadWidgetScreenshot()` | `apps/devhub/src/app/api/ingest/widget/screenshot/route.ts` |

## Query Usage Map

Which queries are used where across the codebase.

### queries/agent-runs.ts

| Query | Used in |
|-------|---------|
| `getAgentMetrics()` | `apps/cockpit/src/app/(dashboard)/agents/page.tsx` |
| `listRecentAgentRuns()` | `apps/cockpit/src/app/(dashboard)/agents/page.tsx` |

### queries/content.ts

| Query | Used in |
|-------|---------|
| `getStaleRows()` | `packages/ai/src/pipeline/embed/re-embed-worker.ts` |

### queries/dashboard.ts

| Query | Used in |
|-------|---------|
| `getReviewQueueCount()` | `apps/cockpit/src/app/(dashboard)/layout.tsx` |
| `listRecentVerifiedMeetings()` | `apps/cockpit/src/app/(dashboard)/page.tsx` |
| `listTodaysBriefingMeetings()` | `apps/cockpit/src/app/(dashboard)/page.tsx` |
| `getExtractionCountsByMeetingIds()` | `apps/cockpit/src/app/(dashboard)/page.tsx` |

### queries/dev-detector.ts

| Query | Used in |
|-------|---------|
| `getMeetingThemesForDevDetector()` | `apps/cockpit/src/actions/dev-detector.ts` |
| `getExtractionThemesForDevDetector()` | `apps/cockpit/src/actions/dev-detector.ts` |

### queries/emails/accounts.ts

| Query | Used in |
|-------|---------|
| `listActiveGoogleAccountsSafe()` | `apps/cockpit/src/app/(dashboard)/emails/page.tsx` |
| `listActiveGoogleAccounts()` | `apps/cockpit/src/app/api/cron/email-sync/route.ts`, `apps/cockpit/src/app/api/email/sync/route.ts` |

### queries/emails/detail.ts

| Query | Used in |
|-------|---------|
| `getEmailById()` | `apps/cockpit/src/app/(dashboard)/emails/[id]/page.tsx` |
| `listDraftEmails()` | `apps/cockpit/src/app/(dashboard)/review/page.tsx` |
| `getDraftEmailById()` | `apps/cockpit/src/app/(dashboard)/review/email/[id]/page.tsx` |

### queries/emails/lists.ts

| Query | Used in |
|-------|---------|
| `listEmails()` | `apps/cockpit/src/app/(dashboard)/emails/page.tsx` |
| `countEmailsByFilterStatus()` | `apps/cockpit/src/app/(dashboard)/emails/page.tsx` |
| `listEmailsByOrganization()` | `apps/cockpit/src/app/(dashboard)/administratie/[id]/page.tsx` |
| `countEmailsByDirection()` | `apps/cockpit/src/app/(dashboard)/emails/page.tsx` |

### queries/emails/pipeline.ts

| Query | Used in |
|-------|---------|
| `getExistingGmailIds()` | `apps/cockpit/src/app/api/cron/email-sync/route.ts`, `apps/cockpit/src/app/api/email/sync/route.ts` |
| `countUnprocessedEmails()` | `apps/cockpit/src/app/(dashboard)/emails/page.tsx` |
| `listEmailsForReclassify()` | `apps/cockpit/src/app/api/email/reclassify/route.ts` |
| `getUnprocessedEmails()` | `apps/cockpit/src/app/api/cron/email-sync/route.ts`, `apps/cockpit/src/app/api/email/process-pending/route.ts`, `apps/cockpit/src/app/api/email/sync/route.ts` |

### queries/golden.ts

| Query | Used in |
|-------|---------|
| `listMeetingsWithGoldenStatus()` | `apps/cockpit/src/app/(dashboard)/dev/action-items/golden/page.tsx`, `apps/cockpit/src/app/(dashboard)/dev/action-items/run/page.tsx` |
| `getMeetingForGoldenCoder()` | `apps/cockpit/src/actions/dev-action-item-runner.ts`, `apps/cockpit/src/actions/dev-speaker-mapping.ts`, `apps/cockpit/src/app/(dashboard)/dev/action-items/golden/[meetingId]/page.tsx` |
| `getGoldenForMeeting()` | `apps/cockpit/src/actions/dev-action-item-runner.ts`, `apps/cockpit/src/app/(dashboard)/dev/action-items/golden/[meetingId]/page.tsx` |

### queries/ignored-entities.ts

| Query | Used in |
|-------|---------|
| `getIgnoredEntityNames()` | `packages/ai/src/pipeline/steps/tag-and-segment.ts`, `packages/ai/src/scripts/batch-segment-migration.ts`, `apps/cockpit/src/app/api/ingest/reprocess/route.ts` |

### queries/issues/activity.ts

| Query | Used in |
|-------|---------|
| `listIssueActivity()` | `apps/devhub/src/app/(app)/issues/[id]/page.tsx` |

### queries/issues/attachments.ts

| Query | Used in |
|-------|---------|
| `getIssueThumbnails()` | `apps/devhub/src/app/(app)/issues/page.tsx` |
| `listIssueAttachments()` | `apps/devhub/src/app/(app)/issues/[id]/page.tsx` |
| `getIssueIdsWithAttachments()` | `apps/devhub/src/actions/import.ts` |

### queries/issues/comments.ts

| Query | Used in |
|-------|---------|
| `listIssueComments()` | `apps/devhub/src/app/(app)/issues/[id]/page.tsx` |

### queries/issues/core.ts

| Query | Used in |
|-------|---------|
| `parseSearchQuery()` | `apps/devhub/src/app/(app)/issues/page.tsx` |
| `listIssues()` | `apps/devhub/src/actions/bulk-cluster-cleanup.ts`, `apps/devhub/src/actions/review.ts`, `apps/devhub/src/app/(app)/issues/page.tsx` |
| `countFilteredIssues()` | `apps/devhub/src/app/(app)/issues/page.tsx` |
| `getIssueById()` | `apps/devhub/src/actions/attachments.ts`, `apps/devhub/src/app/(app)/issues/[id]/page.tsx` |
| `getIssueCounts()` | `apps/devhub/src/app/(app)/issues/page.tsx`, `apps/devhub/src/app/(app)/page.tsx` |
| `countCriticalUnassigned()` | `apps/devhub/src/app/(app)/page.tsx` |

### queries/meetings/core.ts

| Query | Used in |
|-------|---------|
| `getVerifiedMeetingById()` | `apps/cockpit/src/actions/dev-detector.ts`, `apps/cockpit/src/app/(dashboard)/meetings/[id]/page.tsx` |
| `listVerifiedMeetings()` | `apps/cockpit/src/app/(dashboard)/dev/detector/page.tsx`, `apps/cockpit/src/app/(dashboard)/meetings/page.tsx` |
| `listBoardMeetings()` | `packages/ai/src/pipeline/summary/management-insights.ts`, `apps/cockpit/src/app/(dashboard)/intelligence/management/page.tsx` |

### queries/meetings/lookup.ts

| Query | Used in |
|-------|---------|
| `getMeetingByFirefliesId()` | `apps/cockpit/src/app/api/webhooks/fireflies/route.ts` |
| `getExistingFirefliesIds()` | `apps/cockpit/src/app/api/ingest/fireflies/route.ts` |
| `getExistingMeetingsByTitleDates()` | `apps/cockpit/src/app/api/ingest/fireflies/route.ts` |
| `getMeetingByTitleAndDate()` | `apps/cockpit/src/app/api/webhooks/fireflies/route.ts` |

### queries/meetings/metadata.ts

| Query | Used in |
|-------|---------|
| `getMeetingOrganizationId()` | `apps/cockpit/src/actions/segments.ts` |

### queries/meetings/pipeline-fetches.ts

| Query | Used in |
|-------|---------|
| `listMeetingsForReclassify()` | `apps/cockpit/src/app/api/cron/reclassify/route.ts` |
| `listMeetingsWithTranscript()` | `apps/cockpit/src/actions/dev-speaker-mapping.ts` |
| `getMeetingForEmbedding()` | `packages/ai/src/pipeline/embed/pipeline.ts` |
| `getExtractionIdsAndContent()` | `packages/ai/src/pipeline/embed/pipeline.ts` |
| `getMeetingExtractions()` | `packages/ai/src/pipeline/embed/pipeline.ts`, `packages/ai/src/pipeline/steps/link-themes.ts` |
| `getMeetingExtractionsBatch()` | `packages/ai/src/pipeline/embed/re-embed-worker.ts` |
| `getVerifiedMeetingsWithoutSegments()` | `packages/ai/src/scripts/batch-segment-migration.ts` |

### queries/meetings/project-summaries.ts

| Query | Used in |
|-------|---------|
| `getSegmentsByMeetingId()` | `apps/cockpit/src/app/(dashboard)/meetings/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/review/[id]/page.tsx` |
| `getSegmentsByMeetingIds()` | `packages/mcp/src/tools/meetings.ts` |
| `getSegmentCountsByMeetingIds()` | `packages/mcp/src/tools/list-meetings.ts` |
| `getSegmentCountsByProjectIds()` | `packages/mcp/src/tools/projects.ts` |
| `getSegmentNameRaw()` | `apps/cockpit/src/actions/segments.ts` |
| `getSegmentsByProjectId()` | `packages/ai/src/pipeline/summary/project.ts`, `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx` |

### queries/meetings/regenerate.ts

| Query | Used in |
|-------|---------|
| `getMeetingForBackfill()` | `apps/cockpit/src/app/api/ingest/backfill-sentences/route.ts` |
| `getMeetingByFirefliesIdForReprocess()` | `apps/cockpit/src/app/api/ingest/reprocess/route.ts` |

### queries/meetings/speaker-mapping.ts

| Query | Used in |
|-------|---------|
| `getSpeakerMappingTranscriptCounts()` | `apps/cockpit/src/actions/dev-speaker-mapping.ts` |
| `countSpeakerMappingBackfillRemaining()` | `apps/cockpit/src/actions/dev-speaker-mapping.ts` |
| `listSpeakerMappingBackfillCandidates()` | `apps/cockpit/src/actions/dev-speaker-mapping.ts` |
| `getMeetingParticipantsForSpeakerMapping()` | `packages/ai/src/pipeline/steps/speaker-mapping.ts` |

### queries/needs.ts

| Query | Used in |
|-------|---------|
| `listNeedsGroupedByCategory()` | `apps/cockpit/src/app/(dashboard)/intelligence/team/page.tsx` |
| `countNeeds()` | `apps/cockpit/src/app/(dashboard)/intelligence/page.tsx` |

### queries/organizations.ts

| Query | Used in |
|-------|---------|
| `listOrganizations()` | `apps/cockpit/src/app/(dashboard)/directory/page.tsx`, `apps/cockpit/src/app/(dashboard)/emails/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/meetings/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/people/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/people/page.tsx`, `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/projects/page.tsx`, `apps/cockpit/src/app/(dashboard)/review/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/review/email/[id]/page.tsx` |
| `getOrganizationById()` | `apps/cockpit/src/app/(dashboard)/administratie/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/clients/[id]/page.tsx` |
| `getAllOrganizations()` | `packages/ai/src/pipeline/lib/context-injection.ts`, `packages/ai/src/pipeline/lib/entity-resolution.ts` |
| `findOrganizationIdByEmailDomain()` | `packages/ai/src/pipeline/email/core.ts`, `packages/ai/src/scripts/backfill-email-organizations.ts` |
| `listOrganizationsByType()` | `apps/cockpit/src/app/(dashboard)/administratie/page.tsx`, `apps/cockpit/src/app/(dashboard)/clients/page.tsx` |

### queries/people/detail.ts

| Query | Used in |
|-------|---------|
| `getPersonById()` | `apps/cockpit/src/app/(dashboard)/people/[id]/page.tsx` |
| `getStalePeople()` | `packages/ai/src/pipeline/embed/re-embed-worker.ts` |

### queries/people/lists.ts

| Query | Used in |
|-------|---------|
| `listPeople()` | `apps/cockpit/src/app/(dashboard)/directory/page.tsx`, `apps/cockpit/src/app/(dashboard)/emails/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/people/page.tsx`, `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/review/email/[id]/page.tsx` |
| `listPeopleByOrganization()` | `apps/cockpit/src/app/(dashboard)/administratie/[id]/page.tsx` |
| `listPeopleWithOrg()` | `apps/cockpit/src/app/(dashboard)/meetings/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/review/[id]/page.tsx` |
| `listPeopleForAssignment()` | `apps/cockpit/src/app/(dashboard)/meetings/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/page.tsx`, `apps/cockpit/src/app/(dashboard)/review/[id]/page.tsx` |

### queries/people/lookup.ts

| Query | Used in |
|-------|---------|
| `findPersonIdsByName()` | `packages/mcp/src/tools/actions.ts` |
| `findProfileIdByName()` | `packages/mcp/src/tools/correct-extraction.ts`, `packages/mcp/src/tools/write-client-updates.ts`, `packages/mcp/src/tools/write-tasks.ts` |
| `findPeopleByEmails()` | `packages/ai/src/pipeline/participant/helpers.ts` |
| `findPersonOrgByEmail()` | `packages/ai/src/pipeline/email/core.ts`, `packages/ai/src/scripts/backfill-email-organizations.ts` |

### queries/people/pipeline.ts

| Query | Used in |
|-------|---------|
| `getAllKnownPeople()` | `packages/ai/src/pipeline/gatekeeper-pipeline.ts`, `packages/ai/src/pipeline/participant/classifier.ts`, `packages/ai/src/scripts/reclassify-board-meetings.ts`, `apps/cockpit/src/app/api/cron/reclassify/route.ts` |
| `getPeopleForContext()` | `packages/ai/src/pipeline/lib/context-injection.ts` |

### queries/projects/access.ts

| Query | Used in |
|-------|---------|
| `listAccessibleProjects()` | `apps/devhub/src/app/(app)/layout.tsx`, `apps/devhub/src/app/(app)/page.tsx`, `apps/devhub/src/app/(app)/settings/slack/page.tsx` |

### queries/projects/core.ts

| Query | Used in |
|-------|---------|
| `listProjects()` | `apps/cockpit/src/app/(dashboard)/admin/team/page.tsx`, `apps/cockpit/src/app/(dashboard)/emails/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/meetings/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/projects/page.tsx`, `apps/cockpit/src/app/(dashboard)/review/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/review/email/[id]/page.tsx` |
| `getProjectById()` | `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx`, `apps/devhub/src/actions/review.ts` |
| `listFocusProjects()` | `apps/cockpit/src/app/(dashboard)/layout.tsx` |
| `getProjectAliases()` | `apps/cockpit/src/actions/segments.ts` |
| `getAllProjects()` | `packages/ai/src/pipeline/lib/entity-resolution.ts` |
| `getActiveProjectsForContext()` | `packages/ai/src/pipeline/lib/context-injection.ts` |
| `getProjectByUserbackProjectId()` | `apps/devhub/src/app/api/ingest/userback/route.ts` |
| `matchProjectsByEmbedding()` | `packages/ai/src/pipeline/lib/entity-resolution.ts` |

### queries/projects/reviews.ts

| Query | Used in |
|-------|---------|
| `getLatestProjectReview()` | `apps/devhub/src/app/(app)/page.tsx` |
| `getHealthTrend()` | `apps/devhub/src/app/(app)/page.tsx` |

### queries/reports/internals.ts

| Query | Used in |
|-------|---------|
| `cutoffIsoFromDaysBack()` | `packages/database/src/queries/reports/issues.ts`, `packages/database/src/queries/reports/project.ts` |
| `mapIssueRow()` | `packages/database/src/queries/reports/issues.ts` |

### queries/reports/issues.ts

| Query | Used in |
|-------|---------|
| `getProjectIssuesForReport()` | `packages/mcp/src/tools/issues.ts` |
| `getIssueDetailForReport()` | `packages/mcp/src/tools/issues.ts` |

### queries/reports/project.ts

| Query | Used in |
|-------|---------|
| `getProjectActivityForReport()` | `packages/mcp/src/tools/project-report.ts` |
| `getProjectContextForReport()` | `packages/mcp/src/tools/project-report.ts` |

### queries/review.ts

| Query | Used in |
|-------|---------|
| `listDraftMeetings()` | `apps/cockpit/src/app/(dashboard)/review/page.tsx` |
| `getDraftMeetingById()` | `apps/cockpit/src/app/(dashboard)/review/[id]/page.tsx` |
| `getReviewStats()` | `apps/cockpit/src/app/(dashboard)/review/page.tsx` |

### queries/summaries/core.ts

| Query | Used in |
|-------|---------|
| `getLatestSummary()` | `packages/database/src/queries/organizations.ts`, `packages/database/src/queries/projects/core.ts`, `packages/database/src/queries/summaries/management-insights.ts`, `packages/database/src/queries/summaries/weekly.ts`, `packages/ai/src/pipeline/summary/org.ts`, `packages/ai/src/pipeline/summary/project.ts` |

### queries/summaries/management-insights.ts

| Query | Used in |
|-------|---------|
| `getManagementInsights()` | `apps/cockpit/src/app/(dashboard)/intelligence/management/page.tsx`, `apps/cockpit/src/app/(dashboard)/page.tsx` |
| `getDismissedInsightKeys()` | `apps/cockpit/src/app/(dashboard)/intelligence/management/page.tsx` |

### queries/summaries/weekly.ts

| Query | Used in |
|-------|---------|
| `getWeeklyProjectData()` | `packages/ai/src/pipeline/summary/weekly.ts` |
| `getLatestWeeklySummary()` | `apps/cockpit/src/app/(dashboard)/intelligence/weekly/page.tsx` |

### queries/tasks.ts

| Query | Used in |
|-------|---------|
| `hasTaskForExtraction()` | `apps/cockpit/src/actions/tasks.ts` |
| `getPromotedExtractionIds()` | `apps/cockpit/src/app/(dashboard)/meetings/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/review/[id]/page.tsx` |
| `listAllTasks()` | `apps/cockpit/src/app/(dashboard)/page.tsx` |

### queries/team.ts

| Query | Used in |
|-------|---------|
| `listTeamMembers()` | `apps/cockpit/src/app/(dashboard)/admin/team/page.tsx`, `apps/devhub/src/app/(app)/issues/[id]/page.tsx`, `apps/devhub/src/app/(app)/issues/new/page.tsx`, `apps/devhub/src/app/(app)/issues/page.tsx` |
| `getUserWithAccess()` | `apps/cockpit/src/actions/team.ts` |
| `countAdmins()` | `apps/cockpit/src/actions/team.ts`, `apps/cockpit/src/app/(dashboard)/admin/team/page.tsx` |
| `getProfileRole()` | `apps/cockpit/src/actions/team.ts` |

### queries/themes/core.ts

| Query | Used in |
|-------|---------|
| `listVerifiedThemes()` | `packages/ai/src/pipeline/steps/link-themes.ts`, `packages/ai/src/pipeline/steps/theme-detector.ts`, `apps/cockpit/src/actions/dev-detector.ts` |
| `listVerifiedThemes()` | `packages/ai/src/pipeline/steps/link-themes.ts`, `packages/ai/src/pipeline/steps/theme-detector.ts`, `apps/cockpit/src/actions/dev-detector.ts` |
| `listVerifiedThemes()` | `packages/ai/src/pipeline/steps/link-themes.ts`, `packages/ai/src/pipeline/steps/theme-detector.ts`, `apps/cockpit/src/actions/dev-detector.ts` |
| `getThemeBySlug()` | `apps/cockpit/src/app/(dashboard)/themes/[slug]/page.tsx` |

### queries/themes/detail.ts

| Query | Used in |
|-------|---------|
| `getThemeRecentActivity()` | `apps/cockpit/src/app/(dashboard)/themes/[slug]/page.tsx` |
| `getThemeMeetings()` | `apps/cockpit/src/app/(dashboard)/themes/[slug]/page.tsx` |
| `getThemeDecisions()` | `apps/cockpit/src/app/(dashboard)/themes/[slug]/page.tsx` |
| `getThemeParticipants()` | `apps/cockpit/src/app/(dashboard)/themes/[slug]/page.tsx` |

### queries/themes/internals.ts

| Query | Used in |
|-------|---------|
| `windowStartIso()` | `packages/database/src/queries/themes/detail.ts` |
| `fetchWindowAggregation()` | `packages/database/src/queries/themes/dashboard.ts`, `apps/cockpit/src/app/(dashboard)/page.tsx` |

### queries/themes/narrative.ts

| Query | Used in |
|-------|---------|
| `getThemeNarrative()` | `apps/cockpit/src/app/(dashboard)/themes/[slug]/page.tsx` |
| `listThemeMeetingSummaries()` | `packages/ai/src/pipeline/steps/synthesize-theme-narrative.ts` |

### queries/themes/review.ts

| Query | Used in |
|-------|---------|
| `listEmergingThemes()` | `apps/cockpit/src/app/(dashboard)/review/page.tsx` |
| `listRejectedThemePairsForMeeting()` | `packages/ai/src/pipeline/steps/link-themes.ts` |
| `listProposedThemesForMeeting()` | `apps/cockpit/src/app/(dashboard)/review/[id]/page.tsx` |

### queries/topics/detail.ts

| Query | Used in |
|-------|---------|
| `getTopicById()` | `packages/database/src/mutations/topics/crud.ts`, `apps/devhub/src/app/(app)/topics/[id]/edit/page.tsx`, `apps/devhub/src/app/(app)/topics/[id]/page.tsx` |

### queries/topics/linked-issues.ts

| Query | Used in |
|-------|---------|
| `countOpenIssuesPerTopic()` | `apps/devhub/src/app/(app)/issues/page.tsx` |
| `getTopicMembershipForIssues()` | `apps/devhub/src/app/(app)/issues/[id]/page.tsx`, `apps/devhub/src/app/(app)/issues/page.tsx` |
| `getLinkedIssueIdsInProject()` | `packages/database/src/queries/issues/core.ts` |
| `getIssueIdsForTopics()` | `packages/database/src/queries/issues/core.ts` |

### queries/topics/list.ts

| Query | Used in |
|-------|---------|
| `listTopics()` | `apps/devhub/src/app/(app)/issues/[id]/page.tsx`, `apps/devhub/src/app/(app)/issues/page.tsx` |
| `listOpenTopicsForCluster()` | `apps/devhub/src/actions/bulk-cluster-cleanup.ts` |
| `listTopicSampleIssues()` | `apps/devhub/src/actions/bulk-cluster-cleanup.ts` |

### queries/userback-issues.ts

| Query | Used in |
|-------|---------|
| `getUserbackSyncCursor()` | `apps/devhub/src/actions/import.ts` |
| `countUserbackIssues()` | `apps/devhub/src/actions/import.ts` |
| `listUserbackIssuesForBackfill()` | `apps/devhub/src/actions/import.ts` |

### queries/widget/access.ts

| Query | Used in |
|-------|---------|
| `isOriginAllowedForProject()` | `apps/devhub/src/app/api/ingest/widget/route.ts`, `apps/devhub/src/app/api/ingest/widget/screenshot/route.ts` |

### queries/widget/admin.ts

| Query | Used in |
|-------|---------|
| `listWidgetProjectsWithDomains()` | `apps/devhub/src/app/(app)/settings/widget/page.tsx` |
