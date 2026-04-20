# Dependency Graph

> Auto-generated on 2026-04-20. Do not edit manually.
> Run `node scripts/generate-dep-graph.js` to regenerate.

## Overview

| Metric | Count |
|--------|-------|
| Files scanned | 483 |
| Exported functions/constants | 733 |
| Exported types/interfaces | 184 |
| Cross-package imports | 605 |
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

### `queries/emails.ts`

**Exports:**
- `listActiveGoogleAccountsSafe()`
- `listActiveGoogleAccounts()`
- `getGoogleAccountById()`
- `getGoogleAccountByEmail()`
- `listEmails()`
- `countEmailsByFilterStatus()`
- `listEmailsByOrganization()`
- `countEmailsByDirection()`
- `getEmailById()`
- `getExistingGmailIds()`
- `listDraftEmails()`
- `getDraftEmailById()`
- `countUnprocessedEmails()`
- `getUnprocessedEmails()`

**Types:** `GoogleAccountSafe`, `GoogleAccountRow`, `EmailDirection`, `EmailFilterStatus`, `EmailListItem`, `EmailDetail`, `ReviewEmail`

### `queries/extractions.ts`

**Exports:**
- `getExtractionsForMeetingByType()`

**Types:** `ExtractionForHarness`

### `queries/ignored-entities.ts`

**Exports:**
- `getIgnoredEntityNames()`

### `queries/issue-activity.ts`

**Exports:**
- `listIssueActivity()`

**Types:** `IssueActivityRow`

### `queries/issue-attachments.ts`

**Exports:**
- `getIssueThumbnails()`
- `listIssueAttachments()`
- `getIssueIdsWithAttachments()`

**Types:** `IssueAttachmentRow`

### `queries/issue-comments.ts`

**Exports:**
- `getCommentById()`
- `listIssueComments()`

**Types:** `IssueCommentRow`

### `queries/issues.ts`

**Exports:**
- `listIssues()`
- `countFilteredIssues()`
- `getIssueById()`
- `getIssueCounts()`
- `countCriticalUnassigned()`
- `ISSUE_SORTS`
- `ISSUE_SELECT`

**Types:** `IssueSort`, `IssueRow`, `StatusCountKey`, `StatusCounts`

### `queries/management-insights.ts`

**Exports:**
- `getManagementInsights()`
- `getDismissedInsightKeys()`

### `queries/meeting-project-summaries.ts`

**Exports:**
- `getSegmentsByMeetingId()`
- `getSegmentsByMeetingIds()`
- `getSegmentCountsByMeetingIds()`
- `getSegmentCountsByProjectIds()`
- `getSegmentsByProjectId()`

**Types:** `MeetingSegment`, `ProjectSegment`

### `queries/meetings.ts`

**Exports:**
- `getVerifiedMeetingById()`
- `listVerifiedMeetings()`
- `listBoardMeetings()`
- `getMeetingByFirefliesId()`
- `getExistingFirefliesIds()`
- `getExistingMeetingsByTitleDates()`
- `getMeetingByTitleAndDate()`
- `listMeetingsForReclassify()`
- `listMeetingsWithTranscript()`
- `getMeetingForDevExtractor()`
- `getMeetingForEmbedding()`
- `getExtractionIdsAndContent()`
- `getMeetingExtractions()`
- `getMeetingExtractionsBatch()`
- `getVerifiedMeetingsWithoutSegments()`
- `getMeetingForTitleGeneration()`

**Types:** `MeetingDetail`, `RecentMeeting`, `VerifiedMeetingListItem`, `BoardMeetingListItem`, `MeetingForReclassify`, `DevExtractorMeetingOption`, `MeetingForDevExtractor`, `MeetingForBatchSegmentation`, `MeetingForTitleGeneration`

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

### `queries/people.ts`

**Exports:**
- `listPeople()`
- `listPeopleByOrganization()`
- `listPeopleWithOrg()`
- `listPeopleForAssignment()`
- `findPersonIdsByName()`
- `findProfileIdByName()`
- `getPersonById()`
- `getStalePeople()`
- `getAllKnownPeople()`
- `getAdminEmails()`
- `getPeopleForContext()`
- `findPeopleByNames()`
- `findPeopleByEmails()`
- `findPersonOrgByEmail()`

**Types:** `PersonListItem`, `PersonWithOrg`, `PersonForAssignment`, `PersonDetail`, `KnownPerson`, `PersonForContext`

### `queries/portal-access.ts`

**Exports:**
- `listPortalProjects()`
- `hasPortalProjectAccess()`

**Types:** `PortalProject`

**Depends on:**
- `@repo/auth/access` → isAdmin

### `queries/portal.ts`

**Exports:**
- `listPortalProjectsWithDetails()`
- `getPortalProjectDashboard()`
- `listRecentProjectIssues()`
- `getProjectIssueCounts()`
- `listPortalIssues()`
- `getPortalIssue()`

**Types:** `PortalStatusFilter`, `PortalProjectWithDetails`, `PortalProjectDashboard`, `RecentPortalIssue`, `PortalIssueCounts`, `PortalIssue`

**Depends on:**
- `@repo/auth/access` → isAdmin

### `queries/project-access.ts`

**Exports:**
- `listAccessibleProjects()`

**Types:** `AccessibleProject`

**Depends on:**
- `@repo/auth/access` → listAccessibleProjectIds

### `queries/project-reviews.ts`

**Exports:**
- `getLatestProjectReview()`
- `listProjectReviews()`
- `getHealthTrend()`

**Types:** `ProjectReviewRow`

### `queries/projects.ts`

**Exports:**
- `listProjects()`
- `getProjectById()`
- `listFocusProjects()`
- `getProjectByNameIlike()`
- `getAllProjects()`
- `getActiveProjectsForContext()`
- `matchProjectsByEmbedding()`

**Types:** `ProjectListItem`, `ProjectDetail`, `FocusProject`, `ActiveProjectForContext`

### `queries/review.ts`

**Exports:**
- `listDraftMeetings()`
- `getDraftMeetingById()`
- `getReviewStats()`

**Types:** `ReviewMeeting`, `ReviewMeetingDetail`

### `queries/summaries.ts`

**Exports:**
- `getLatestSummary()`
- `getSummaryHistory()`

**Types:** `SummaryRow`

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

**Types:** `TeamRole`, `TeamMember`, `TeamMemberWithAccess`

### `queries/userback-issues.ts`

**Exports:**
- `getUserbackSyncCursor()`
- `getExistingUserbackIds()`
- `countUserbackIssues()`
- `listUserbackIssuesForBackfill()`

### `queries/weekly-summary.ts`

**Exports:**
- `getWeeklyProjectData()`
- `getLatestWeeklySummary()`
- `listWeeklySummaries()`

**Types:** `WeeklyProjectData`

## Database Mutations

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

### `mutations/experimental-risk-extractions.ts`

**Exports:**
- `insertExperimentalRiskExtraction()`

**Types:** `ExperimentalRiskExtractionInput`

### `mutations/extractions.ts`

**Exports:**
- `deleteExtractionsByMeetingId()`
- `getExtractionForCorrection()`
- `correctExtraction()`
- `insertExtractions()`
- `replaceMeetingExtractions()`
- `createExtraction()`
- `updateExtraction()`
- `deleteExtraction()`
- `updateNeedStatus()`

**Types:** `ExtractionInsertRow`, `NeedStatus`

### `mutations/ignored-entities.ts`

**Exports:**
- `addIgnoredEntity()`

### `mutations/issue-attachments.ts`

**Exports:**
- `downloadAndUpload()`
- `getAttachmentPublicUrl()`
- `insertAttachment()`
- `storeIssueMedia()`

**Types:** `InsertAttachmentData`

### `mutations/issues.ts`

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

### `mutations/management-insights.ts`

**Exports:**
- `saveManagementInsights()`
- `dismissInsight()`

### `mutations/meeting-participants.ts`

**Exports:**
- `linkMeetingParticipants()`
- `linkMeetingParticipant()`
- `unlinkMeetingParticipant()`

### `mutations/meeting-project-summaries.ts`

**Exports:**
- `insertMeetingProjectSummaries()`
- `linkSegmentToProject()`
- `removeSegmentTag()`
- `updateSegmentEmbedding()`

### `mutations/meetings.ts`

**Exports:**
- `insertMeeting()`
- `insertManualMeeting()`
- `updateMeetingClassification()`
- `updateMeetingElevenLabs()`
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

### `mutations/project-reviews.ts`

**Exports:**
- `saveProjectReview()`

**Types:** `InsertProjectReviewData`

### `mutations/projects.ts`

**Exports:**
- `createProject()`
- `updateProjectAliases()`
- `updateProject()`
- `deleteProject()`

### `mutations/review.ts`

**Exports:**
- `verifyMeeting()`
- `verifyMeetingWithEdits()`
- `rejectMeeting()`

### `mutations/summaries.ts`

**Exports:**
- `createSummaryVersion()`

### `mutations/tasks.ts`

**Exports:**
- `createTaskFromExtraction()`
- `updateTask()`
- `completeTask()`
- `dismissTask()`

## AI Agents

### `packages/ai/src/agents/email-classifier.ts`

**Exports:**
- `runEmailClassifier()`

**Internal deps:**
- `../validations/email-classifier` → EmailClassifierSchema, EmailClassifierOutput

### `packages/ai/src/agents/email-extractor.ts`

**Exports:**
- `runEmailExtractor()`

**Internal deps:**
- `../validations/email-extractor` → EmailExtractorOutputSchema, EmailExtractorOutput

### `packages/ai/src/agents/extractor.ts`

**Exports:**
- `runExtractor()`

**Internal deps:**
- `../validations/extractor` → ExtractorOutputSchema, ExtractorOutput

### `packages/ai/src/agents/gatekeeper.ts`

**Exports:**
- `runGatekeeper()`

**Types:** `ParticipantInfo`

**Internal deps:**
- `../validations/gatekeeper` → GatekeeperSchema, GatekeeperOutput

### `packages/ai/src/agents/issue-classifier.ts`

**Exports:**
- `runIssueClassifier()`

**Internal deps:**
- `../validations/issue-classification` → IssueClassifierSchema, type IssueClassifierOutput

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

### `packages/ai/src/agents/management-insights.ts`

**Exports:**
- `runManagementInsightsAgent()`

**Types:** `ManagementMeetingInput`

**Internal deps:**
- `../validations/management-insights` → ManagementInsightsOutputSchema, type ManagementInsightsOutput

### `packages/ai/src/agents/meeting-structurer.ts`

**Exports:**
- `runMeetingStructurer()`
- `MEETING_STRUCTURER_SYSTEM_PROMPT`

**Types:** `MeetingStructurerContext`

**Internal deps:**
- `../validations/meeting-structurer` → MeetingStructurerOutputSchema, type MeetingStructurerOutput, type RawMeetingStructurerOutput, type Kernpunt, type MeetingStructurerParticipant
- `../extraction-types` → filterMetadataByType
- `../utils/normalise` → emptyToNull, normaliseForQuoteMatch, sentinelToNull

### `packages/ai/src/agents/needs-scanner.ts`

**Exports:**
- `runNeedsScanner()`

**Internal deps:**
- `../validations/needs-scanner` → NeedsScannerOutputSchema, NeedsScannerOutput

### `packages/ai/src/agents/project-summarizer.ts`

**Exports:**
- `runProjectSummarizer()`
- `runOrgSummarizer()`

**Types:** `MeetingInput`, `EmailInput`, `SegmentInput`

**Internal deps:**
- `../validations/project-summary` → ProjectSummaryOutputSchema, OrgSummaryOutputSchema, type ProjectSummaryOutput, type OrgSummaryOutput

### `packages/ai/src/agents/render-summary.ts`

**Exports:**
- `renderMeetingSummary()`
- `buildLegacyKernpunten()`
- `buildLegacyVervolgstappen()`

**Internal deps:**
- `../validations/meeting-structurer` → MeetingStructurerOutput, Kernpunt
- `../extraction-types` → TYPE_MARKDOWN_LABEL

### `packages/ai/src/agents/risk-specialist.ts`

**Exports:**
- `runRiskSpecialist()`
- `RISK_SPECIALIST_PROMPT_VERSION`
- `RISK_SPECIALIST_SYSTEM_PROMPT`

**Types:** `RiskSpecialistContext`, `RiskSpecialistRunMetrics`, `RiskSpecialistRunResult`

**Internal deps:**
- `../validations/risk-specialist` → RiskSpecialistRawOutputSchema, type RiskSpecialistItem, type RiskSpecialistOutput, type RawRiskSpecialistOutput
- `../utils/normalise` → emptyToNull, normaliseForQuoteMatch, sentinelToNull

### `packages/ai/src/agents/summarizer.ts`

**Exports:**
- `runSummarizer()`
- `formatSummary()`

**Internal deps:**
- `../validations/summarizer` → SummarizerOutputSchema, SummarizerOutput

### `packages/ai/src/agents/title-generator.ts`

**Exports:**
- `generateMeetingSubject()`

**Types:** `TitleSubjectOutput`

### `packages/ai/src/agents/weekly-summarizer.ts`

**Exports:**
- `runWeeklySummarizer()`

**Types:** `WeeklyProjectInput`

**Internal deps:**
- `../validations/weekly-summary` → WeeklySummaryOutputSchema, type WeeklySummaryOutput

## AI Pipeline

### `packages/ai/src/pipeline/build-raw-fireflies.ts`

**Exports:**
- `buildRawFireflies()`

**Internal deps:**
- `../agents/gatekeeper` → ParticipantInfo
- `../validations/gatekeeper` → GatekeeperOutput

### `packages/ai/src/pipeline/context-injection.ts`

**Exports:**
- `buildEntityContext()`

**Types:** `EntityContext`

**Depends on:**
- `@repo/database/queries/projects` → getActiveProjectsForContext
- `@repo/database/queries/organizations` → getAllOrganizations
- `@repo/database/queries/people` → getPeopleForContext
- (type) `@repo/database/queries/projects` → ActiveProjectForContext

### `packages/ai/src/pipeline/email-filter-gatekeeper.ts`

**Exports:**
- `decideEmailFilter()`

**Types:** `FilterReason`, `FilterDecision`

### `packages/ai/src/pipeline/email-pipeline.ts`

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
- `../agents/email-classifier` → runEmailClassifier
- `../agents/email-classifier` → EmailClassifierOutput
- `./context-injection` → buildEntityContext
- `./entity-resolution` → resolveOrganization
- `./email-filter-gatekeeper` → decideEmailFilter, type FilterReason
- `./email-pre-classifier` → preClassifyEmail
- `../embeddings` → embedText

### `packages/ai/src/pipeline/email-pre-classifier.ts`

**Exports:**
- `preClassifyEmail()`

**Types:** `PreClassifiedType`, `PreClassifierOutput`

### `packages/ai/src/pipeline/embed-pipeline.ts`

**Exports:**
- `embedMeetingWithExtractions()`

**Depends on:**
- `@repo/database/mutations/embeddings` → updateRowEmbedding, batchUpdateEmbeddings
- `@repo/database/queries/meetings` → getMeetingExtractions, getMeetingForEmbedding, getExtractionIdsAndContent

**Internal deps:**
- `../embeddings` → embedText, embedBatch
- `./embed-text` → buildMeetingEmbedText

### `packages/ai/src/pipeline/embed-text.ts`

**Exports:**
- `buildMeetingEmbedText()`

### `packages/ai/src/pipeline/entity-resolution.ts`

**Exports:**
- `resolveProject()`
- `resolveClientEntities()`
- `resolveOrganization()`

**Depends on:**
- `@repo/database/queries/projects` → getAllProjects, matchProjectsByEmbedding
- `@repo/database/mutations/projects` → updateProjectAliases
- `@repo/database/queries/organizations` → getAllOrganizations

**Internal deps:**
- `../embeddings` → embedText

### `packages/ai/src/pipeline/gatekeeper-pipeline.ts`

**Exports:**
- `processMeeting()`

**Depends on:**
- `@repo/database/mutations/meetings` → insertMeeting
- `@repo/database/queries/people` → getAllKnownPeople

**Internal deps:**
- `../agents/gatekeeper` → runGatekeeper
- `../agents/gatekeeper` → ParticipantInfo
- `../agents/extractor` → ExtractorOutput
- `../validations/gatekeeper` → GatekeeperOutput
- `../validations/gatekeeper` → PartyType, IdentifiedProject
- `./entity-resolution` → resolveOrganization
- `./context-injection` → buildEntityContext
- `./participant-classifier` → classifyParticipantsWithCache, determinePartyType, determineRuleBasedMeetingType
- `./build-raw-fireflies` → buildRawFireflies
- `./steps/transcribe` → runTranscribeStep
- `./steps/summarize` → runSummarizeStep
- `./steps/extract` → runExtractStep
- `./steps/structure` → runStructureStep, isMeetingStructurerEnabled
- `./steps/risk-specialist-experiment` → runRiskSpecialistExperiment
- `./steps/generate-title` → runGenerateTitleStep
- `./steps/tag-and-segment` → runTagAndSegmentStep
- `./steps/embed` → runEmbedStep
- `./speaker-map` → extractSpeakerNames, buildSpeakerMap, formatSpeakerContext
- `./participant-helpers` → matchParticipants, mergeParticipantSources, type MeetingAttendee

### `packages/ai/src/pipeline/generate-title.ts`

**Exports:**
- `buildMeetingTitle()`
- `generateMeetingTitle()`

**Types:** `TitleContext`

**Depends on:**
- `@repo/database/constants/meetings` → MEETING_TYPE_PREFIX

**Internal deps:**
- `../agents/title-generator` → generateMeetingSubject

### `packages/ai/src/pipeline/management-insights-pipeline.ts`

**Exports:**
- `generateManagementInsights()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/database/queries/meetings` → listBoardMeetings
- `@repo/database/mutations/management-insights` → saveManagementInsights

**Internal deps:**
- `../agents/management-insights` → runManagementInsightsAgent

### `packages/ai/src/pipeline/participant-classifier.ts`

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
- `../agents/gatekeeper` → ParticipantInfo
- `../validations/gatekeeper` → MeetingType, PartyType

### `packages/ai/src/pipeline/participant-helpers.ts`

**Exports:**
- `collectParticipantEmails()`
- `matchParticipants()`
- `mergeParticipantSources()`

**Types:** `MeetingAttendee`

**Depends on:**
- `@repo/database/queries/people` → findPeopleByEmails
- `@repo/database/mutations/meeting-participants` → linkMeetingParticipants

**Internal deps:**
- `./speaker-map` → SpeakerMap

### `packages/ai/src/pipeline/re-embed-worker.ts`

**Exports:**
- `runReEmbedWorker()`

**Depends on:**
- `@repo/database/queries/content` → getStaleRows
- `@repo/database/queries/meetings` → getMeetingExtractionsBatch
- `@repo/database/queries/people` → getStalePeople
- `@repo/database/mutations/embeddings` → batchUpdateEmbeddings

**Internal deps:**
- `../embeddings` → embedBatch
- `./embed-text` → buildMeetingEmbedText

### `packages/ai/src/pipeline/save-extractions.ts`

**Exports:**
- `saveExtractions()`
- `saveStructuredExtractions()`

**Depends on:**
- `@repo/database/mutations/meetings` → linkAllMeetingProjects
- `@repo/database/mutations/extractions` → insertExtractions, replaceMeetingExtractions

**Internal deps:**
- `../validations/extractor` → ExtractorOutput, ExtractionItem
- `../validations/gatekeeper` → IdentifiedProject
- `../validations/meeting-structurer` → validateKernpuntMetadata, type Kernpunt, type MeetingStructurerOutput

### `packages/ai/src/pipeline/scan-needs.ts`

**Exports:**
- `scanMeetingNeeds()`
- `scanAllUnscannedMeetings()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/database/mutations/extractions` → insertExtractions

**Internal deps:**
- `../agents/needs-scanner` → runNeedsScanner
- `../validations/needs-scanner` → NeedItem

### `packages/ai/src/pipeline/segment-builder.ts`

**Exports:**
- `buildSegments()`

**Types:** `Segment`

**Internal deps:**
- `./tagger` → TaggerOutput

### `packages/ai/src/pipeline/speaker-map.ts`

**Exports:**
- `extractSpeakerNames()`
- `buildSpeakerMap()`
- `formatSpeakerContext()`

**Types:** `SpeakerInfo`, `SpeakerMap`

**Depends on:**
- (type) `@repo/database/queries/people` → KnownPerson

### `packages/ai/src/pipeline/steps/embed.ts`

**Exports:**
- `runEmbedStep()`

**Types:** `EmbedStepResult`

**Internal deps:**
- `../embed-pipeline` → embedMeetingWithExtractions

### `packages/ai/src/pipeline/steps/extract.ts`

**Exports:**
- `runExtractStep()`

**Types:** `ExtractResult`

**Depends on:**
- `@repo/database/mutations/meetings` → updateMeetingRawFireflies

**Internal deps:**
- `../../agents/extractor` → runExtractor, ExtractorOutput
- `../save-extractions` → saveExtractions
- `../../validations/gatekeeper` → IdentifiedProject

### `packages/ai/src/pipeline/steps/generate-title.ts`

**Exports:**
- `runGenerateTitleStep()`

**Types:** `GenerateTitleStepInput`, `GenerateTitleStepResult`

**Depends on:**
- `@repo/database/mutations/meetings` → updateMeetingTitle

**Internal deps:**
- `../generate-title` → generateMeetingTitle
- `../../validations/gatekeeper` → IdentifiedProject

### `packages/ai/src/pipeline/steps/risk-specialist-experiment.ts`

**Exports:**
- `runRiskSpecialistExperiment()`

**Depends on:**
- `@repo/database/mutations/experimental-risk-extractions` → insertExperimentalRiskExtraction

**Internal deps:**
- `../../agents/risk-specialist` → runRiskSpecialist, RISK_SPECIALIST_PROMPT_VERSION, type RiskSpecialistContext

### `packages/ai/src/pipeline/steps/structure.ts`

**Exports:**
- `runStructureStep()`
- `isMeetingStructurerEnabled()`

**Types:** `StructureResult`

**Depends on:**
- `@repo/database/mutations/meetings` → updateMeetingSummary, updateMeetingRawFireflies

**Internal deps:**
- `../../agents/meeting-structurer` → runMeetingStructurer
- `../../validations/meeting-structurer` → MeetingStructurerOutput
- `../../agents/render-summary` → renderMeetingSummary, buildLegacyKernpunten, buildLegacyVervolgstappen
- `../save-extractions` → saveStructuredExtractions
- `../../validations/gatekeeper` → IdentifiedProject

### `packages/ai/src/pipeline/steps/summarize.ts`

**Exports:**
- `runSummarizeStep()`

**Types:** `SummarizeResult`

**Depends on:**
- `@repo/database/mutations/meetings` → updateMeetingSummary

**Internal deps:**
- `../../agents/summarizer` → runSummarizer, formatSummary

### `packages/ai/src/pipeline/steps/tag-and-segment.ts`

**Exports:**
- `runTagAndSegmentStep()`

**Types:** `TagAndSegmentInput`, `TagAndSegmentResult`

**Depends on:**
- `@repo/database/queries/ignored-entities` → getIgnoredEntityNames
- `@repo/database/mutations/meeting-project-summaries` → insertMeetingProjectSummaries, updateSegmentEmbedding

**Internal deps:**
- `../tagger` → runTagger
- `../segment-builder` → buildSegments
- `../../embeddings` → embedBatch
- `../../validations/gatekeeper` → IdentifiedProject

### `packages/ai/src/pipeline/steps/transcribe.ts`

**Exports:**
- `runTranscribeStep()`

**Types:** `TranscribeResult`

**Depends on:**
- `@repo/database/mutations/meetings` → updateMeetingElevenLabs

**Internal deps:**
- `../../transcribe-elevenlabs` → transcribeWithElevenLabs, formatScribeTranscript

### `packages/ai/src/pipeline/summary-pipeline.ts`

**Exports:**
- `generateProjectSummaries()`
- `generateOrgSummaries()`
- `triggerSummariesForMeeting()`
- `triggerSummariesForEmail()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/database/queries/summaries` → getLatestSummary
- `@repo/database/queries/meeting-project-summaries` → getSegmentsByProjectId
- `@repo/database/mutations/summaries` → createSummaryVersion

**Internal deps:**
- `../agents/project-summarizer` → runProjectSummarizer, runOrgSummarizer

### `packages/ai/src/pipeline/tagger.ts`

**Exports:**
- `parsePrefix()`
- `resolvePrefixProject()`
- `runTagger()`

**Types:** `TaggedItem`, `KnownProject`, `TaggerInput`, `TaggerOutput`

**Internal deps:**
- `../validations/gatekeeper` → IdentifiedProject

### `packages/ai/src/pipeline/weekly-summary-pipeline.ts`

**Exports:**
- `generateWeeklySummary()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/database/queries/weekly-summary` → getWeeklyProjectData
- `@repo/database/mutations/summaries` → createSummaryVersion

**Internal deps:**
- `../agents/weekly-summarizer` → runWeeklySummarizer

## AI Core

### `packages/ai/src/embeddings.ts`

**Exports:**
- `embedText()`
- `embedBatch()`

### `packages/ai/src/extraction-types.ts`

**Exports:**
- `isTier1()`
- `isTier2()`
- `isExtractionType()`
- `filterMetadataByType()`
- `TIER_1_TYPES`
- `TIER_2_TYPES`
- `ALL_EXTRACTION_TYPES`
- `METADATA_FIELDS_PER_TYPE`
- `TYPE_MARKDOWN_LABEL`
- `MARKDOWN_LABEL_TO_TYPE`

**Types:** `Tier1Type`, `Tier2Type`, `ExtractionType`

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

### `packages/ai/src/validations/email-classifier.ts`

**Exports:**
- `EmailClassifierSchema`

**Types:** `EmailClassifierOutput`

### `packages/ai/src/validations/email-extractor.ts`

**Exports:**
- `EmailExtractionItemSchema`
- `EmailExtractorOutputSchema`

**Types:** `EmailExtractionItem`, `EmailExtractorOutput`

### `packages/ai/src/validations/extractor.ts`

**Exports:**
- `ExtractionItemSchema`
- `ExtractorOutputSchema`

**Types:** `ExtractionItem`, `ExtractorOutput`

### `packages/ai/src/validations/fireflies.ts`

**Exports:**
- `isValidDuration()`
- `hasParticipants()`

### `packages/ai/src/validations/gatekeeper.ts`

**Exports:**
- `MEETING_TYPES`
- `PARTY_TYPES`
- `IdentifiedProjectSchema`
- `GatekeeperSchema`

**Types:** `MeetingType`, `PartyType`, `IdentifiedProject`, `GatekeeperOutput`

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

### `packages/ai/src/validations/meeting-structurer.ts`

**Exports:**
- `validateKernpuntMetadata()`
- `MeetingStructurerParticipantSchema`
- `TYPE_METADATA_SCHEMAS`
- `KernpuntSchema`
- `EntitiesSchema`
- `MeetingStructurerOutputSchema`

**Types:** `Kernpunt`, `MeetingStructurerParticipant`, `MeetingStructurerOutput`, `RawMeetingStructurerOutput`

**Internal deps:**
- `../extraction-types` → ALL_EXTRACTION_TYPES, type ExtractionType

### `packages/ai/src/validations/needs-scanner.ts`

**Exports:**
- `NeedItemSchema`
- `NeedsScannerOutputSchema`

**Types:** `NeedItem`, `NeedsScannerOutput`

### `packages/ai/src/validations/project-summary.ts`

**Exports:**
- `extractOrgTimeline()`
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

### `packages/ai/src/validations/summarizer.ts`

**Exports:**
- `ParticipantProfileSchema`
- `SummarizerOutputSchema`

**Types:** `SummarizerOutput`, `ParticipantProfile`

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

### `packages/mcp/src/tools/list-meetings.ts`

**Exports:**
- `registerListMeetingsTools()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/database/queries/meeting-project-summaries` → getSegmentCountsByMeetingIds

**Internal deps:**
- `./usage-tracking` → trackMcpQuery
- `./utils` → escapeLike, resolveProjectIds, resolveOrganizationIds, resolveMeetingIdsByParticipant

### `packages/mcp/src/tools/meetings.ts`

**Exports:**
- `registerMeetingTools()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/database/queries/meeting-project-summaries` → getSegmentsByMeetingIds

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

### `packages/mcp/src/tools/projects.ts`

**Exports:**
- `registerProjectTools()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/database/queries/meeting-project-summaries` → getSegmentCountsByProjectIds

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

### `apps/cockpit/src/actions/dev-extractor.ts`

**Exports:**
- `runDevExtractorAction()`
- `getMeetingStructurerPromptAction()`
- `runDevRiskSpecialistAction()`
- `getRiskSpecialistPromptAction()`

**Types:** `DevExtractorResult`, `ActionResult`, `DevRiskSpecialistResult`

**Depends on:**
- `@repo/auth/access` → requireAdminInAction
- `@repo/database/queries/meetings` → getMeetingForDevExtractor
- `@repo/database/queries/extractions` → getExtractionsForMeetingByType
- `@repo/ai/agents/meeting-structurer` → runMeetingStructurer, MEETING_STRUCTURER_SYSTEM_PROMPT
- `@repo/ai/agents/risk-specialist` → runRiskSpecialist, RISK_SPECIALIST_SYSTEM_PROMPT, RISK_SPECIALIST_PROMPT_VERSION
- `@repo/ai/extraction-types` → ALL_EXTRACTION_TYPES
- (type) `@repo/ai/validations/meeting-structurer` → Kernpunt
- (type) `@repo/ai/validations/risk-specialist` → RiskSpecialistItem, RiskSpecialistOutput
- (type) `@repo/ai/agents/risk-specialist` → RiskSpecialistRunMetrics

### `apps/cockpit/src/actions/email-filter.ts`

**Exports:**
- `unfilterEmailAction()`

**Depends on:**
- `@repo/database/mutations/emails` → updateEmailFilterStatus
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/ai/pipeline/email-pipeline` → processEmail
- `@repo/auth/helpers` → getAuthenticatedUser
- `@repo/auth/access` → isAdmin

### `apps/cockpit/src/actions/email-links.ts`

**Exports:**
- `linkEmailProjectAction()`
- `unlinkEmailProjectAction()`
- `updateEmailOrganizationAction()`
- `updateEmailSenderPersonAction()`
- `updateEmailTypeAction()`
- `updateEmailPartyTypeAction()`

**Depends on:**
- `@repo/database/mutations/emails` → linkEmailProject, unlinkEmailProject, updateEmailOrganization, updateEmailSenderPerson, updateEmailType, updateEmailPartyType
- `@repo/auth/helpers` → getAuthenticatedUser
- `@repo/auth/access` → isAdmin

### `apps/cockpit/src/actions/email-review.ts`

**Exports:**
- `approveEmailAction()`
- `approveEmailWithEditsAction()`
- `rejectEmailAction()`

**Depends on:**
- `@repo/database/mutations/emails` → verifyEmail, verifyEmailWithEdits, rejectEmail
- `@repo/ai/pipeline/summary-pipeline` → triggerSummariesForEmail
- `@repo/auth/helpers` → getAuthenticatedUser
- `@repo/auth/access` → isAdmin

### `apps/cockpit/src/actions/extractions.ts`

**Exports:**
- `createExtractionAction()`
- `updateExtractionAction()`
- `deleteExtractionAction()`

**Depends on:**
- `@repo/database/mutations/extractions` → createExtraction, updateExtraction, deleteExtraction
- `@repo/database/validations/entities` → createExtractionSchema, updateExtractionSchema, deleteWithContextSchema
- `@repo/auth/helpers` → getAuthenticatedUser
- `@repo/auth/access` → isAdmin

### `apps/cockpit/src/actions/management-insights.ts`

**Exports:**
- `generateManagementInsightsAction()`
- `dismissInsightAction()`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/auth/access` → isAdmin
- `@repo/ai/pipeline/management-insights-pipeline` → generateManagementInsights
- `@repo/database/mutations/management-insights` → dismissInsight

### `apps/cockpit/src/actions/meeting-pipeline.ts`

**Exports:**
- `regenerateMeetingAction()`
- `reprocessMeetingAction()`

**Depends on:**
- `@repo/database/mutations/meetings` → updateMeetingSummary, updateMeetingTitle, markMeetingEmbeddingStale
- `@repo/database/mutations/extractions` → deleteExtractionsByMeetingId
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/ai/agents/summarizer` → runSummarizer, formatSummary
- `@repo/ai/agents/extractor` → runExtractor
- `@repo/ai/pipeline/save-extractions` → saveExtractions
- `@repo/ai/pipeline/context-injection` → buildEntityContext
- `@repo/ai/agents/gatekeeper` → runGatekeeper
- `@repo/ai/pipeline/tagger` → runTagger
- `@repo/ai/pipeline/segment-builder` → buildSegments
- `@repo/ai/embeddings` → embedBatch
- `@repo/database/mutations/meeting-project-summaries` → insertMeetingProjectSummaries, updateSegmentEmbedding
- `@repo/database/queries/ignored-entities` → getIgnoredEntityNames
- `@repo/database/validations/meetings` → regenerateSchema
- `@repo/auth/helpers` → getAuthenticatedUser
- `@repo/auth/access` → isAdmin

### `apps/cockpit/src/actions/meetings.ts`

**Exports:**
- `updateMeetingTitleAction()`
- `updateMeetingSummaryAction()`
- `updateMeetingTypeAction()`
- `updatePartyTypeAction()`
- `updateMeetingOrganizationAction()`
- `linkMeetingProjectAction()`
- `unlinkMeetingProjectAction()`
- `linkMeetingParticipantAction()`
- `unlinkMeetingParticipantAction()`
- `updateMeetingMetadataAction()`
- `regenerateMeetingTitleAction()`
- `deleteMeetingAction()`

**Depends on:**
- `@repo/database/mutations/meetings` → updateMeetingTitle, updateMeetingType, updateMeetingPartyType, updateMeetingOrganization, updateMeetingSummaryOnly, markMeetingEmbeddingStale, linkMeetingProject, unlinkMeetingProject, deleteMeeting
- `@repo/database/mutations/meeting-participants` → linkMeetingParticipant, unlinkMeetingParticipant
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/database/validations/meetings` → updateTitleSchema, updateSummarySchema, updateMeetingTypeSchema, updatePartyTypeSchema, updateMeetingOrganizationSchema, meetingProjectSchema, meetingParticipantSchema, updateMeetingMetadataSchema, regenerateSchema
- `@repo/database/validations/entities` → deleteSchema
- `@repo/auth/helpers` → getAuthenticatedUser
- `@repo/auth/access` → isAdmin

### `apps/cockpit/src/actions/organizations.ts`

**Exports:**
- `createOrganizationAction()`
- `updateOrganizationAction()`
- `deleteOrganizationAction()`

**Depends on:**
- `@repo/database/mutations/organizations` → createOrganization, updateOrganization, deleteOrganization
- `@repo/database/validations/entities` → updateOrganizationSchema, deleteSchema
- `@repo/database/validations/meetings` → createOrganizationSchema
- `@repo/auth/helpers` → getAuthenticatedUser
- `@repo/auth/access` → isAdmin

### `apps/cockpit/src/actions/people.ts`

**Exports:**
- `createPersonAction()`
- `updatePersonAction()`
- `deletePersonAction()`

**Depends on:**
- `@repo/database/mutations/people` → createPerson, updatePerson, deletePerson
- `@repo/database/validations/entities` → updatePersonSchema, deleteSchema
- `@repo/database/validations/meetings` → createPersonSchema
- `@repo/auth/helpers` → getAuthenticatedUser
- `@repo/auth/access` → isAdmin

### `apps/cockpit/src/actions/projects.ts`

**Exports:**
- `createProjectAction()`
- `updateProjectAction()`
- `deleteProjectAction()`

**Depends on:**
- `@repo/database/mutations/projects` → createProject, updateProject, deleteProject
- `@repo/database/validations/entities` → updateProjectSchema, deleteSchema
- `@repo/database/validations/meetings` → createProjectSchema
- `@repo/auth/helpers` → getAuthenticatedUser
- `@repo/auth/access` → isAdmin

### `apps/cockpit/src/actions/review.ts`

**Exports:**
- `approveMeetingAction()`
- `approveMeetingWithEditsAction()`
- `rejectMeetingAction()`

**Depends on:**
- `@repo/database/mutations/review` → verifyMeeting, verifyMeetingWithEdits, rejectMeeting
- `@repo/database/mutations/meetings` → updateMeetingSummaryOnly
- `@repo/ai/pipeline/summary-pipeline` → triggerSummariesForMeeting
- `@repo/ai/pipeline/scan-needs` → scanMeetingNeeds
- `@repo/auth/helpers` → getAuthenticatedUser
- `@repo/auth/access` → isAdmin

### `apps/cockpit/src/actions/scan-needs.ts`

**Exports:**
- `scanTeamNeedsAction()`
- `updateNeedStatusAction()`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/auth/access` → isAdmin
- `@repo/ai/pipeline/scan-needs` → scanAllUnscannedMeetings
- `@repo/database/mutations/extractions` → updateNeedStatus

### `apps/cockpit/src/actions/segments.ts`

**Exports:**
- `linkSegmentToProjectAction()`
- `removeSegmentTagAction()`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/auth/access` → isAdmin
- `@repo/database/mutations/meeting-project-summaries` → linkSegmentToProject, removeSegmentTag
- `@repo/database/mutations/projects` → updateProjectAliases
- `@repo/database/mutations/ignored-entities` → addIgnoredEntity
- `@repo/database/supabase/admin` → getAdminClient

### `apps/cockpit/src/actions/summaries.ts`

**Exports:**
- `regenerateSummaryAction()`

**Depends on:**
- `@repo/ai/pipeline/summary-pipeline` → generateProjectSummaries, generateOrgSummaries
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
- `@repo/database/queries/team` → countAdmins, getUserWithAccess
- `@repo/database/validations/team` → inviteUserSchema, updateUserAccessSchema, deactivateUserSchema, type InviteUserInput, type UpdateUserAccessInput, type DeactivateUserInput

### `apps/cockpit/src/actions/weekly-summary.ts`

**Exports:**
- `generateWeeklySummaryAction()`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/auth/access` → isAdmin
- `@repo/ai/pipeline/weekly-summary-pipeline` → generateWeeklySummary

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
- `@repo/ai/pipeline/email-pipeline` → processEmailBatch

### `apps/cockpit/src/app/api/cron/re-embed/route.ts`

**Exports:**
- `POST()`

**Depends on:**
- `@repo/ai/pipeline/re-embed-worker` → runReEmbedWorker

### `apps/cockpit/src/app/api/cron/reclassify/route.ts`

**Exports:**
- `POST()`

**Depends on:**
- `@repo/ai/agents/gatekeeper` → runGatekeeper
- `@repo/database/queries/people` → getAllKnownPeople
- `@repo/database/queries/meetings` → listMeetingsForReclassify
- `@repo/database/mutations/meetings` → updateMeetingClassification
- `@repo/ai/pipeline/entity-resolution` → resolveOrganization
- `@repo/ai/pipeline/participant-classifier` → classifyParticipantsWithCache, determinePartyType

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
- `@repo/ai/pipeline/email-pipeline` → processEmailBatch
- `@repo/auth/access` → isAdmin

### `apps/cockpit/src/app/api/email/reclassify/route.ts`

**Exports:**
- `POST()`
- `maxDuration`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/ai/pipeline/email-pipeline` → processEmail
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
- `@repo/ai/pipeline/email-pipeline` → processEmailBatch

### `apps/cockpit/src/app/api/ingest/backfill-sentences/route.ts`

**Exports:**
- `POST()`

**Depends on:**
- `@repo/ai/fireflies` → fetchFirefliesTranscript
- `@repo/database/supabase/admin` → getAdminClient

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
- `@repo/ai/pipeline/re-embed-worker` → runReEmbedWorker

### `apps/cockpit/src/app/api/ingest/reprocess/route.ts`

**Exports:**
- `POST()`
- `maxDuration`

**Depends on:**
- `@repo/ai/fireflies` → fetchFirefliesTranscript
- `@repo/ai/transcript-processor` → chunkTranscript
- `@repo/ai/pipeline/steps/transcribe` → runTranscribeStep
- `@repo/ai/pipeline/steps/summarize` → runSummarizeStep
- `@repo/ai/agents/extractor` → runExtractor
- `@repo/ai/pipeline/save-extractions` → saveExtractions
- `@repo/ai/pipeline/embed-pipeline` → embedMeetingWithExtractions
- `@repo/database/mutations/extractions` → deleteExtractionsByMeetingId
- `@repo/database/mutations/meetings` → markMeetingEmbeddingStale
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/ai/pipeline/context-injection` → buildEntityContext
- `@repo/ai/pipeline/tagger` → runTagger
- `@repo/ai/pipeline/segment-builder` → buildSegments
- `@repo/database/mutations/meeting-project-summaries` → insertMeetingProjectSummaries, updateSegmentEmbedding
- `@repo/ai/embeddings` → embedBatch
- `@repo/database/queries/ignored-entities` → getIgnoredEntityNames
- (type) `@repo/ai/validations/gatekeeper` → IdentifiedProject

### `apps/cockpit/src/app/api/management-insights/generate/route.ts`

**Exports:**
- `POST()`
- `maxDuration`

**Depends on:**
- `@repo/ai/pipeline/management-insights-pipeline` → generateManagementInsights

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
- `@repo/ai/pipeline/scan-needs` → scanAllUnscannedMeetings

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

### `apps/cockpit/src/app/(dashboard)/dev/extractor/client.tsx`

**Exports:**
- `DevExtractorClient()`

**Depends on:**
- `@repo/ai/extraction-types` → ALL_EXTRACTION_TYPES
- (type) `@repo/ai/extraction-types` → ExtractionType

### `apps/cockpit/src/app/(dashboard)/dev/extractor/copy-button.tsx`

**Exports:**
- `CopyButton()`

### `apps/cockpit/src/app/(dashboard)/dev/extractor/page.tsx`

**Exports:**
- `dynamic`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/queries/meetings` → listMeetingsWithTranscript

### `apps/cockpit/src/app/(dashboard)/dev/extractor/panel.tsx`

**Exports:**
- `Panel()`
- `summariseMetadata()`

### `apps/cockpit/src/app/(dashboard)/dev/extractor/specialist-result-panel.tsx`

**Exports:**
- `SpecialistResultPanel()`

### `apps/cockpit/src/app/(dashboard)/dev/extractor/structurer-result-panel.tsx`

**Exports:**
- `StructurerResultPanel()`

**Depends on:**
- (type) `@repo/ai/extraction-types` → ExtractionType

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
- `@repo/database/queries/management-insights` → getManagementInsights, getDismissedInsightKeys
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
- `@repo/database/queries/weekly-summary` → getLatestWeeklySummary

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
- `@repo/database/queries/meeting-project-summaries` → getSegmentsByMeetingId

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
- `@repo/database/queries/management-insights` → getManagementInsights
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
- `@repo/database/queries/meeting-project-summaries` → getSegmentsByProjectId
- `@repo/database/queries/organizations` → listOrganizations
- `@repo/database/queries/people` → listPeople

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
- `@repo/database/queries/meeting-project-summaries` → getSegmentsByMeetingId

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

### `apps/cockpit/src/app/(dashboard)/shift/page.tsx`

**Exports:**
- `dynamic`

**Depends on:**
- `@repo/ui/badge` → Badge
- `@repo/ui/card` → Card, CardContent, CardHeader, CardTitle

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

### `apps/cockpit/src/components/clients/add-organization-button.tsx`

**Exports:**
- `AddOrganizationButton()`

**Depends on:**
- `@repo/database/constants/organizations` → ORG_TYPES

### `apps/cockpit/src/components/clients/edit-organization.tsx`

**Exports:**
- `EditOrganization()`

**Depends on:**
- `@repo/database/constants/organizations` → ORG_TYPES, ORG_STATUSES

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

### `apps/cockpit/src/components/directory/directory-tabs.tsx`

**Exports:**
- `DirectoryTabs()`

**Depends on:**
- `@repo/ui/utils` → cn
- (type) `@repo/database/queries/organizations` → OrganizationListItem
- (type) `@repo/database/queries/people` → PersonListItem

### `apps/cockpit/src/components/directory/organizations-grid.tsx`

**Exports:**
- `OrganizationsGrid()`

**Depends on:**
- `@repo/ui/badge` → Badge
- `@repo/ui/format` → formatDate
- (type) `@repo/database/queries/organizations` → OrganizationListItem

### `apps/cockpit/src/components/directory/people-grid.tsx`

**Exports:**
- `PeopleGrid()`

**Depends on:**
- `@repo/ui/badge` → Badge
- (type) `@repo/database/queries/people` → PersonListItem

### `apps/cockpit/src/components/emails/email-link-editor.tsx`

**Exports:**
- `EmailLinkEditor()`

### `apps/cockpit/src/components/emails/email-list.tsx`

**Exports:**
- `EmailList()`

**Depends on:**
- `@repo/ui/badge` → Badge
- (type) `@repo/database/queries/emails` → EmailListItem, EmailDirection

### `apps/cockpit/src/components/emails/email-type-selector.tsx`

**Exports:**
- `EmailTypeSelector()`

**Depends on:**
- `@repo/ui/button` → Button

### `apps/cockpit/src/components/emails/filtered-banner.tsx`

**Exports:**
- `FilteredBanner()`

**Depends on:**
- `@repo/ui/button` → Button

### `apps/cockpit/src/components/emails/google-account-status.tsx`

**Exports:**
- `GoogleAccountStatus()`

**Depends on:**
- `@repo/ui/button` → Button

### `apps/cockpit/src/components/emails/organization-selector.tsx`

**Exports:**
- `OrganizationSelector()`

**Depends on:**
- `@repo/ui/button` → Button

### `apps/cockpit/src/components/emails/party-type-selector.tsx`

**Exports:**
- `PartyTypeSelector()`

**Depends on:**
- `@repo/ui/button` → Button

### `apps/cockpit/src/components/emails/process-pending-button.tsx`

**Exports:**
- `ProcessPendingButton()`

**Depends on:**
- `@repo/ui/button` → Button

### `apps/cockpit/src/components/emails/project-linker.tsx`

**Exports:**
- `ProjectLinker()`

**Depends on:**
- `@repo/ui/button` → Button

### `apps/cockpit/src/components/emails/reclassify-button.tsx`

**Exports:**
- `ReclassifyButton()`

**Depends on:**
- `@repo/ui/button` → Button

### `apps/cockpit/src/components/emails/sender-person-selector.tsx`

**Exports:**
- `SenderPersonSelector()`

**Depends on:**
- `@repo/ui/button` → Button

### `apps/cockpit/src/components/emails/sync-button.tsx`

**Exports:**
- `SyncButton()`

**Depends on:**
- `@repo/ui/button` → Button

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

### `apps/cockpit/src/components/meetings/add-extraction-form.tsx`

**Exports:**
- `AddExtractionForm()`

### `apps/cockpit/src/components/meetings/copy-meeting-button.tsx`

**Exports:**
- `CopyMeetingButton()`

### `apps/cockpit/src/components/meetings/create-organization-modal.tsx`

**Exports:**
- `CreateOrganizationModal()`

**Depends on:**
- `@repo/ui/button` → Button

### `apps/cockpit/src/components/meetings/create-person-sub-modal.tsx`

**Exports:**
- `CreatePersonSubModal()`

**Depends on:**
- `@repo/ui/button` → Button

### `apps/cockpit/src/components/meetings/create-project-sub-modal.tsx`

**Exports:**
- `CreateProjectSubModal()`

**Depends on:**
- `@repo/ui/button` → Button

### `apps/cockpit/src/components/meetings/edit-metadata-modal.tsx`

**Exports:**
- `EditMetadataModal()`

**Depends on:**
- `@repo/ui/button` → Button
- `@repo/database/constants/meetings` → MEETING_TYPES
- (type) `@repo/database/queries/people` → PersonWithOrg

### `apps/cockpit/src/components/meetings/editable-title.tsx`

**Exports:**
- `EditableTitle()`

**Depends on:**
- `@repo/ui/button` → Button

### `apps/cockpit/src/components/meetings/extraction-tabs-panel.tsx`

**Exports:**
- `ExtractionTabsPanel()`

**Depends on:**
- (type) `@repo/database/queries/people` → PersonForAssignment

### `apps/cockpit/src/components/meetings/meeting-detail.tsx`

**Exports:**
- `MeetingDetailView()`

**Depends on:**
- `@repo/ui/button` → Button
- (type) `@repo/database/queries/meetings` → MeetingDetail
- (type) `@repo/database/queries/people` → PersonWithOrg, PersonForAssignment
- (type) `@repo/database/queries/meeting-project-summaries` → MeetingSegment

### `apps/cockpit/src/components/meetings/meeting-type-selector.tsx`

**Exports:**
- `MeetingTypeSelector()`

**Depends on:**
- `@repo/database/constants/meetings` → MEETING_TYPES

### `apps/cockpit/src/components/meetings/meetings-list.tsx`

**Exports:**
- `MeetingsList()`

**Depends on:**
- `@repo/ui/badge` → Badge
- `@repo/database/constants/meetings` → MEETING_TYPES, formatMeetingType
- (type) `@repo/database/queries/meetings` → VerifiedMeetingListItem

### `apps/cockpit/src/components/meetings/party-type-selector.tsx`

**Exports:**
- `PartyTypeSelector()`

### `apps/cockpit/src/components/meetings/people-selector.tsx`

**Exports:**
- `PeopleSelector()`

**Depends on:**
- `@repo/ui/button` → Button

### `apps/cockpit/src/components/meetings/project-linker.tsx`

**Exports:**
- `ProjectLinker()`

**Depends on:**
- `@repo/ui/button` → Button

### `apps/cockpit/src/components/organizations/org-briefing.tsx`

**Exports:**
- `OrgBriefing()`

**Depends on:**
- `@repo/ui/format` → timeAgoDays

### `apps/cockpit/src/components/organizations/org-summary.tsx`

**Exports:**
- `OrgSummary()`

**Depends on:**
- `@repo/ui/format` → timeAgoDays

### `apps/cockpit/src/components/organizations/org-timeline.tsx`

**Exports:**
- `OrgTimeline()`

**Depends on:**
- `@repo/ui/format` → formatDate
- (type) `@repo/ai/validations/project-summary` → OrgTimelineEntry

### `apps/cockpit/src/components/people/add-person-button.tsx`

**Exports:**
- `AddPersonButton()`

### `apps/cockpit/src/components/people/edit-person.tsx`

**Exports:**
- `EditPerson()`

### `apps/cockpit/src/components/projects/add-project-button.tsx`

**Exports:**
- `AddProjectButton()`

### `apps/cockpit/src/components/projects/combined-extractions-section.tsx`

**Exports:**
- `CombinedExtractionsSection()`

**Types:** `CombinedItem`

### `apps/cockpit/src/components/projects/edit-project.tsx`

**Exports:**
- `EditProject()`

**Depends on:**
- `@repo/database/constants/projects` → PROJECT_STATUSES, STATUS_LABELS

### `apps/cockpit/src/components/projects/project-card.tsx`

**Exports:**
- `ProjectCard()`

**Depends on:**
- `@repo/ui/format` → daysUntil

### `apps/cockpit/src/components/projects/project-emails-section.tsx`

**Exports:**
- `EmailsSection()`

**Types:** `ProjectEmail`

### `apps/cockpit/src/components/projects/project-sections.tsx`

**Exports:**
- `ProjectSections()`

**Depends on:**
- (type) `@repo/database/queries/meeting-project-summaries` → ProjectSegment

### `apps/cockpit/src/components/projects/project-timeline.tsx`

**Exports:**
- `ProjectTimeline()`

**Depends on:**
- `@repo/ui/format` → formatDate

### `apps/cockpit/src/components/projects/regenerate-summary-button.tsx`

**Exports:**
- `RegenerateSummaryButton()`

### `apps/cockpit/src/components/projects/status-pipeline.tsx`

**Exports:**
- `StatusPipeline()`

**Depends on:**
- `@repo/database/constants/projects` → ALL_STEPS, OTHER_STEPS, STATUS_LABELS, getPhaseSteps

### `apps/cockpit/src/components/review/email-review-card.tsx`

**Exports:**
- `EmailReviewCard()`

**Depends on:**
- `@repo/ui/format` → timeAgo

### `apps/cockpit/src/components/review/email-review-detail.tsx`

**Exports:**
- `EmailReviewDetail()`

**Depends on:**
- `@repo/ui/badge` → Badge

### `apps/cockpit/src/components/review/empty-state.tsx`

**Exports:**
- `ReviewEmptyState()`

### `apps/cockpit/src/components/review/review-action-bar.tsx`

**Exports:**
- `ReviewActionBar()`

### `apps/cockpit/src/components/review/review-card.tsx`

**Exports:**
- `ReviewCard()`

**Depends on:**
- `@repo/ui/format` → timeAgo

### `apps/cockpit/src/components/review/review-detail.tsx`

**Exports:**
- `ReviewDetail()`

**Depends on:**
- (type) `@repo/database/queries/people` → PersonForAssignment
- (type) `@repo/database/queries/meeting-project-summaries` → MeetingSegment

### `apps/cockpit/src/components/review/review-queue.tsx`

**Exports:**
- `ReviewQueue()`

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

### `apps/cockpit/src/components/shared/extraction-dots.tsx`

**Exports:**
- `ExtractionDots()`

### `apps/cockpit/src/components/shared/follow-up-checklist.tsx`

**Exports:**
- `FollowUpChecklist()`

**Depends on:**
- (type) `@repo/database/queries/people` → PersonForAssignment

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
- (type) `@repo/database/queries/meeting-project-summaries` → MeetingSegment

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

### `apps/devhub/src/actions/classify.ts`

**Exports:**
- `classifyIssueAction()`
- `classifyIssueBackground()`
- `bulkReclassifyAction()`

**Depends on:**
- `@repo/database/queries/issues` → getIssueById
- `@repo/auth/helpers` → getAuthenticatedUser
- `@repo/auth/access` → assertProjectAccess, NotAuthorizedError
- `@repo/database/mutations/issues` → updateIssue, insertActivity
- `@repo/ai/agents/issue-classifier` → runIssueClassifier
- `@repo/database/integrations/slack` → resolveSlackEvent, notifySlackIfUrgent, type SlackIssuePayload

### `apps/devhub/src/actions/comments.ts`

**Exports:**
- `createCommentAction()`
- `updateCommentAction()`
- `deleteCommentAction()`

**Depends on:**
- `@repo/database/mutations/issues` → insertComment, updateComment, deleteComment, insertActivity
- `@repo/database/queries/issues` → getIssueById
- `@repo/database/queries/issue-comments` → getCommentById
- `@repo/database/validations/issues` → createCommentSchema, updateCommentSchema, deleteCommentSchema
- `@repo/auth/helpers` → getAuthenticatedUser
- `@repo/auth/access` → assertProjectAccess, NotAuthorizedError

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
- `@repo/database/queries/issue-attachments` → getIssueIdsWithAttachments
- `@repo/database/integrations/userback` → extractMediaFromMetadata
- `@repo/database/integrations/userback-sync` → executeSyncPipeline
- `@repo/database/mutations/issue-attachments` → storeIssueMedia

### `apps/devhub/src/actions/issues.ts`

**Exports:**
- `createIssueAction()`
- `updateIssueAction()`
- `deleteIssueAction()`
- `getIssueCountsAction()`

**Depends on:**
- `@repo/database/mutations/issues` → insertIssue, updateIssue, deleteIssue, insertActivity
- `@repo/database/queries/issues` → getIssueById, getIssueCounts
- `@repo/database/constants/issues` → CLOSED_STATUSES, type IssueStatus
- `@repo/database/validations/issues` → createIssueSchema, updateIssueSchema, deleteIssueSchema
- `@repo/auth/helpers` → getAuthenticatedUser
- `@repo/auth/access` → assertProjectAccess, NotAuthorizedError
- `@repo/database/integrations/slack` → resolveSlackEvent, notifySlackIfUrgent, type SlackIssuePayload

### `apps/devhub/src/actions/review.ts`

**Exports:**
- `generateProjectReview()`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/database/queries/issues` → listIssues
- `@repo/database/queries/projects` → getProjectById
- `@repo/database/mutations/project-reviews` → saveProjectReview
- `@repo/ai/agents/issue-reviewer` → runIssueReviewer, type IssueForReview
- `@repo/auth/helpers` → getAuthenticatedUser, isAuthBypassed
- `@repo/auth/access` → assertProjectAccess, NotAuthorizedError

### `apps/devhub/src/actions/slack-settings.ts`

**Exports:**
- `updateSlackConfigAction()`
- `testSlackWebhookAction()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/auth/helpers` → getAuthenticatedUser
- `@repo/auth/access` → isAdmin
- `@repo/database/integrations/slack` → SLACK_NOTIFY_EVENTS

## DevHub API Routes

### `apps/devhub/src/app/api/ingest/userback/route.ts`

**Exports:**
- `GET()`
- `POST()`
- `maxDuration`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/database/integrations/userback-sync` → executeSyncPipeline
- `@repo/auth/access` → isAdmin

## DevHub Pages

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

### `apps/devhub/src/components/comments/comment-form.tsx`

**Exports:**
- `CommentForm()`

**Depends on:**
- `@repo/ui/button` → Button

### `apps/devhub/src/components/comments/comment-list.tsx`

**Exports:**
- `CommentActivityFeed()`

**Depends on:**
- (type) `@repo/database/queries/issue-comments` → IssueCommentRow
- (type) `@repo/database/queries/issue-activity` → IssueActivityRow

### `apps/devhub/src/components/comments/comment-section.tsx`

**Exports:**
- `CommentSection()`

**Types:** `CurrentUser`

**Depends on:**
- (type) `@repo/database/queries/issue-comments` → IssueCommentRow
- (type) `@repo/database/queries/issue-activity` → IssueActivityRow

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

### `apps/devhub/src/components/issues/ai-execution-panel.tsx`

**Exports:**
- `AiExecutionPanel()`

**Depends on:**
- `@repo/ui/utils` → cn

### `apps/devhub/src/components/issues/issue-attachments.tsx`

**Exports:**
- `IssueAttachments()`

**Depends on:**
- (type) `@repo/database/queries/issue-attachments` → IssueAttachmentRow

### `apps/devhub/src/components/issues/issue-detail.tsx`

**Exports:**
- `IssueDetail()`

**Depends on:**
- (type) `@repo/database/queries/issues` → IssueRow
- (type) `@repo/database/queries/issue-comments` → IssueCommentRow
- (type) `@repo/database/queries/issue-activity` → IssueActivityRow
- (type) `@repo/database/queries/issue-attachments` → IssueAttachmentRow

### `apps/devhub/src/components/issues/issue-filters.tsx`

**Exports:**
- `IssueFilters()`

**Depends on:**
- `@repo/ui/utils` → cn
- `@repo/database/constants/issues` → ISSUE_STATUSES, ISSUE_STATUS_LABELS, ISSUE_PRIORITIES, ISSUE_PRIORITY_LABELS, ISSUE_TYPES, ISSUE_TYPE_LABELS, ISSUE_COMPONENTS, ISSUE_COMPONENT_LABELS

### `apps/devhub/src/components/issues/issue-form.tsx`

**Exports:**
- `IssueForm()`

**Depends on:**
- `@repo/ui/button` → Button
- `@repo/database/constants/issues` → ISSUE_TYPES, ISSUE_TYPE_LABELS, ISSUE_PRIORITIES, ISSUE_PRIORITY_LABELS, ISSUE_COMPONENTS, ISSUE_COMPONENT_LABELS, ISSUE_SEVERITIES, ISSUE_SEVERITY_LABELS

### `apps/devhub/src/components/issues/issue-header.tsx`

**Exports:**
- `IssueHeader()`

### `apps/devhub/src/components/issues/issue-list.tsx`

**Exports:**
- `IssueList()`

**Depends on:**
- (type) `@repo/database/queries/issues` → IssueRow

### `apps/devhub/src/components/issues/issue-row.tsx`

**Exports:**
- `IssueRowItem()`

**Depends on:**
- (type) `@repo/database/queries/issues` → IssueRow
- `@repo/ui/utils` → cn
- `@repo/ui/dropdown-menu` → DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem

### `apps/devhub/src/components/issues/issue-sidebar.tsx`

**Exports:**
- `IssueSidebar()`

**Depends on:**
- (type) `@repo/database/queries/issues` → IssueRow
- `@repo/database/constants/issues` → ISSUE_STATUSES, ISSUE_STATUS_LABELS, ISSUE_PRIORITIES, ISSUE_PRIORITY_LABELS, ISSUE_TYPE_LABELS, ISSUE_COMPONENTS, ISSUE_COMPONENT_LABELS, type IssueType

### `apps/devhub/src/components/issues/label-input.tsx`

**Exports:**
- `LabelInput()`

**Depends on:**
- `@repo/ui/button` → Button

### `apps/devhub/src/components/issues/pagination-controls.tsx`

**Exports:**
- `PaginationControls()`

**Depends on:**
- `@repo/ui/utils` → cn

### `apps/devhub/src/components/issues/sidebar-ai-classification.tsx`

**Exports:**
- `SidebarAiClassification()`

**Depends on:**
- `@repo/ui/button` → Button

### `apps/devhub/src/components/issues/sidebar-delete.tsx`

**Exports:**
- `SidebarDelete()`

**Depends on:**
- `@repo/ui/button` → Button

### `apps/devhub/src/components/issues/sidebar-fields.tsx`

**Exports:**
- `FormSelect()`
- `SidebarSelect()`
- `SidebarAssignee()`

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
| AI Core | 10 | - | - | - | - | 10 |
| AI Pipeline | 47 | - | - | - | - | 47 |
| Auth | 4 | - | - | - | - | 4 |
| Cockpit Server Actions | 47 | 22 | 30 | - | - | 99 |
| Cockpit API Routes | 27 | 37 | 2 | - | 1 | 67 |
| Cockpit Components | 39 | 3 | - | 72 | - | 114 |
| Cockpit Middleware | - | - | 1 | - | - | 1 |
| Cockpit Pages | 82 | 7 | 2 | 25 | - | 116 |
| Database Queries | - | - | 3 | - | - | 3 |
| DevHub Server Actions | 25 | 2 | 12 | - | - | 39 |
| DevHub API Routes | 3 | - | 1 | - | - | 4 |
| DevHub Components | 15 | - | - | 22 | - | 37 |
| DevHub Middleware | - | - | 1 | - | - | 1 |
| DevHub Pages | 17 | - | 13 | 9 | - | 39 |
| MCP Server | 23 | 1 | - | - | - | 24 |

## Critical Integration Points

Files that import from 3+ shared packages. These are the most interconnected
parts of the codebase — changes here have the widest blast radius.

| File | Packages | Count |
|------|----------|-------|
| `apps/cockpit/src/actions/dev-extractor.ts` | auth, database, ai | 3 |
| `apps/cockpit/src/actions/email-filter.ts` | database, ai, auth | 3 |
| `apps/cockpit/src/actions/email-review.ts` | database, ai, auth | 3 |
| `apps/cockpit/src/actions/management-insights.ts` | database, auth, ai | 3 |
| `apps/cockpit/src/actions/meeting-pipeline.ts` | database, ai, auth | 3 |
| `apps/cockpit/src/actions/review.ts` | database, ai, auth | 3 |
| `apps/cockpit/src/actions/scan-needs.ts` | database, auth, ai | 3 |
| `apps/cockpit/src/actions/weekly-summary.ts` | database, auth, ai | 3 |
| `apps/cockpit/src/app/(dashboard)/administratie/[id]/page.tsx` | database, ui, ai | 3 |
| `apps/cockpit/src/app/(dashboard)/clients/[id]/page.tsx` | database, ui, ai | 3 |
| `apps/cockpit/src/app/api/email/process-pending/route.ts` | database, ai, auth | 3 |
| `apps/cockpit/src/app/api/email/reclassify/route.ts` | database, ai, auth | 3 |
| `apps/devhub/src/actions/classify.ts` | database, auth, ai | 3 |
| `apps/devhub/src/actions/review.ts` | database, ai, auth | 3 |

## Key Dependency Chains

Tracing the most important data flows from action → pipeline → database.

### mutations/emails.ts

| Mutation | Called from |
|----------|------------|
| `upsertGoogleAccount()` | `apps/cockpit/src/app/api/email/auth/callback/route.ts` |
| `updateGoogleAccountTokens()` | `apps/cockpit/src/app/api/cron/email-sync/route.ts`, `apps/cockpit/src/app/api/email/sync/route.ts` |
| `updateGoogleAccountLastSync()` | `apps/cockpit/src/app/api/cron/email-sync/route.ts`, `apps/cockpit/src/app/api/email/sync/route.ts` |
| `insertEmails()` | `apps/cockpit/src/app/api/cron/email-sync/route.ts`, `apps/cockpit/src/app/api/email/sync/route.ts` |
| `updateEmailClassification()` | `packages/ai/src/pipeline/email-pipeline.ts` |
| `updateEmailFilterStatus()` | `packages/ai/src/pipeline/email-pipeline.ts`, `apps/cockpit/src/actions/email-filter.ts`, `apps/cockpit/src/app/api/email/reclassify/route.ts` |
| `linkEmailProject()` | `packages/ai/src/pipeline/email-pipeline.ts`, `apps/cockpit/src/actions/email-links.ts` |
| `verifyEmail()` | `apps/cockpit/src/actions/email-review.ts` |
| `verifyEmailWithEdits()` | `apps/cockpit/src/actions/email-review.ts` |
| `rejectEmail()` | `apps/cockpit/src/actions/email-review.ts` |
| `updateEmailSenderPerson()` | `packages/ai/src/pipeline/email-pipeline.ts`, `apps/cockpit/src/actions/email-links.ts` |
| `updateEmailType()` | `apps/cockpit/src/actions/email-links.ts` |
| `updateEmailPartyType()` | `apps/cockpit/src/actions/email-links.ts` |
| `updateEmailOrganization()` | `apps/cockpit/src/actions/email-links.ts` |
| `unlinkEmailProject()` | `apps/cockpit/src/actions/email-links.ts` |

### mutations/embeddings.ts

| Mutation | Called from |
|----------|------------|
| `updateRowEmbedding()` | `packages/ai/src/pipeline/embed-pipeline.ts` |
| `batchUpdateEmbeddings()` | `packages/ai/src/pipeline/embed-pipeline.ts`, `packages/ai/src/pipeline/re-embed-worker.ts` |

### mutations/experimental-risk-extractions.ts

| Mutation | Called from |
|----------|------------|
| `insertExperimentalRiskExtraction()` | `packages/ai/src/pipeline/steps/risk-specialist-experiment.ts` |

### mutations/extractions.ts

| Mutation | Called from |
|----------|------------|
| `deleteExtractionsByMeetingId()` | `apps/cockpit/src/actions/meeting-pipeline.ts`, `apps/cockpit/src/app/api/ingest/reprocess/route.ts` |
| `getExtractionForCorrection()` | `packages/mcp/src/tools/correct-extraction.ts` |
| `correctExtraction()` | `packages/mcp/src/tools/correct-extraction.ts` |
| `insertExtractions()` | `packages/ai/src/pipeline/save-extractions.ts`, `packages/ai/src/pipeline/scan-needs.ts`, `packages/mcp/src/tools/write-client-updates.ts` |
| `replaceMeetingExtractions()` | `packages/ai/src/pipeline/save-extractions.ts` |
| `createExtraction()` | `apps/cockpit/src/actions/extractions.ts` |
| `updateExtraction()` | `apps/cockpit/src/actions/extractions.ts` |
| `deleteExtraction()` | `apps/cockpit/src/actions/extractions.ts` |
| `updateNeedStatus()` | `apps/cockpit/src/actions/scan-needs.ts` |

### mutations/ignored-entities.ts

| Mutation | Called from |
|----------|------------|
| `addIgnoredEntity()` | `apps/cockpit/src/actions/segments.ts` |

### mutations/issue-attachments.ts

| Mutation | Called from |
|----------|------------|
| `storeIssueMedia()` | `apps/devhub/src/actions/import.ts` |

### mutations/issues.ts

| Mutation | Called from |
|----------|------------|
| `insertIssue()` | `apps/devhub/src/actions/issues.ts` |
| `updateIssue()` | `apps/devhub/src/actions/classify.ts`, `apps/devhub/src/actions/issues.ts` |
| `deleteIssue()` | `apps/devhub/src/actions/issues.ts` |
| `insertComment()` | `apps/devhub/src/actions/comments.ts` |
| `updateComment()` | `apps/devhub/src/actions/comments.ts` |
| `deleteComment()` | `apps/devhub/src/actions/comments.ts` |
| `insertActivity()` | `apps/devhub/src/actions/classify.ts`, `apps/devhub/src/actions/comments.ts`, `apps/devhub/src/actions/issues.ts` |

### mutations/management-insights.ts

| Mutation | Called from |
|----------|------------|
| `saveManagementInsights()` | `packages/ai/src/pipeline/management-insights-pipeline.ts` |
| `dismissInsight()` | `apps/cockpit/src/actions/management-insights.ts` |

### mutations/meeting-participants.ts

| Mutation | Called from |
|----------|------------|
| `linkMeetingParticipants()` | `packages/ai/src/pipeline/participant-helpers.ts` |
| `linkMeetingParticipant()` | `apps/cockpit/src/actions/meetings.ts` |
| `unlinkMeetingParticipant()` | `apps/cockpit/src/actions/meetings.ts` |

### mutations/meeting-project-summaries.ts

| Mutation | Called from |
|----------|------------|
| `insertMeetingProjectSummaries()` | `packages/ai/src/pipeline/steps/tag-and-segment.ts`, `packages/ai/src/scripts/batch-segment-migration.ts`, `apps/cockpit/src/actions/meeting-pipeline.ts`, `apps/cockpit/src/app/api/ingest/reprocess/route.ts` |
| `linkSegmentToProject()` | `apps/cockpit/src/actions/segments.ts` |
| `removeSegmentTag()` | `apps/cockpit/src/actions/segments.ts` |
| `updateSegmentEmbedding()` | `packages/ai/src/pipeline/steps/tag-and-segment.ts`, `packages/ai/src/scripts/batch-segment-migration.ts`, `apps/cockpit/src/actions/meeting-pipeline.ts`, `apps/cockpit/src/app/api/ingest/reprocess/route.ts` |

### mutations/meetings.ts

| Mutation | Called from |
|----------|------------|
| `insertMeeting()` | `packages/ai/src/pipeline/gatekeeper-pipeline.ts` |
| `insertManualMeeting()` | `packages/mcp/src/tools/write-client-updates.ts` |
| `updateMeetingClassification()` | `apps/cockpit/src/app/api/cron/reclassify/route.ts` |
| `updateMeetingElevenLabs()` | `packages/ai/src/pipeline/steps/transcribe.ts` |
| `updateMeetingType()` | `apps/cockpit/src/actions/meetings.ts` |
| `updateMeetingPartyType()` | `apps/cockpit/src/actions/meetings.ts` |
| `updateMeetingTitle()` | `packages/ai/src/pipeline/steps/generate-title.ts`, `apps/cockpit/src/actions/meeting-pipeline.ts`, `apps/cockpit/src/actions/meetings.ts` |
| `updateMeetingOrganization()` | `apps/cockpit/src/actions/meetings.ts` |
| `linkMeetingProject()` | `apps/cockpit/src/actions/meetings.ts` |
| `linkAllMeetingProjects()` | `packages/ai/src/pipeline/save-extractions.ts`, `packages/ai/src/scripts/batch-segment-migration.ts` |
| `updateMeetingSummary()` | `packages/ai/src/pipeline/steps/structure.ts`, `packages/ai/src/pipeline/steps/summarize.ts`, `apps/cockpit/src/actions/meeting-pipeline.ts` |
| `updateMeetingSummaryOnly()` | `apps/cockpit/src/actions/meetings.ts`, `apps/cockpit/src/actions/review.ts` |
| `updateMeetingRawFireflies()` | `packages/ai/src/pipeline/steps/extract.ts`, `packages/ai/src/pipeline/steps/structure.ts` |
| `markMeetingEmbeddingStale()` | `apps/cockpit/src/actions/meeting-pipeline.ts`, `apps/cockpit/src/actions/meetings.ts`, `apps/cockpit/src/app/api/ingest/reprocess/route.ts` |
| `unlinkMeetingProject()` | `apps/cockpit/src/actions/meetings.ts` |
| `deleteMeeting()` | `apps/cockpit/src/actions/meetings.ts` |

### mutations/organizations.ts

| Mutation | Called from |
|----------|------------|
| `createOrganization()` | `apps/cockpit/src/actions/organizations.ts` |
| `updateOrganization()` | `apps/cockpit/src/actions/organizations.ts` |
| `deleteOrganization()` | `apps/cockpit/src/actions/organizations.ts` |

### mutations/people.ts

| Mutation | Called from |
|----------|------------|
| `createPerson()` | `apps/cockpit/src/actions/people.ts` |
| `updatePerson()` | `apps/cockpit/src/actions/people.ts` |
| `deletePerson()` | `apps/cockpit/src/actions/people.ts` |

### mutations/project-reviews.ts

| Mutation | Called from |
|----------|------------|
| `saveProjectReview()` | `apps/devhub/src/actions/review.ts` |

### mutations/projects.ts

| Mutation | Called from |
|----------|------------|
| `createProject()` | `apps/cockpit/src/actions/projects.ts` |
| `updateProjectAliases()` | `packages/ai/src/pipeline/entity-resolution.ts`, `apps/cockpit/src/actions/segments.ts` |
| `updateProject()` | `apps/cockpit/src/actions/projects.ts` |
| `deleteProject()` | `apps/cockpit/src/actions/projects.ts` |

### mutations/review.ts

| Mutation | Called from |
|----------|------------|
| `verifyMeeting()` | `apps/cockpit/src/actions/review.ts` |
| `verifyMeetingWithEdits()` | `apps/cockpit/src/actions/review.ts` |
| `rejectMeeting()` | `apps/cockpit/src/actions/review.ts` |

### mutations/summaries.ts

| Mutation | Called from |
|----------|------------|
| `createSummaryVersion()` | `packages/ai/src/pipeline/summary-pipeline.ts`, `packages/ai/src/pipeline/weekly-summary-pipeline.ts` |

### mutations/tasks.ts

| Mutation | Called from |
|----------|------------|
| `createTaskFromExtraction()` | `packages/mcp/src/tools/write-tasks.ts`, `apps/cockpit/src/actions/tasks.ts` |
| `updateTask()` | `packages/mcp/src/tools/write-tasks.ts`, `apps/cockpit/src/actions/tasks.ts` |
| `completeTask()` | `packages/mcp/src/tools/write-tasks.ts`, `apps/cockpit/src/actions/tasks.ts` |
| `dismissTask()` | `packages/mcp/src/tools/write-tasks.ts`, `apps/cockpit/src/actions/tasks.ts` |

## Query Usage Map

Which queries are used where across the codebase.

### queries/content.ts

| Query | Used in |
|-------|---------|
| `getStaleRows()` | `packages/ai/src/pipeline/re-embed-worker.ts` |

### queries/dashboard.ts

| Query | Used in |
|-------|---------|
| `getReviewQueueCount()` | `apps/cockpit/src/app/(dashboard)/layout.tsx` |
| `listRecentVerifiedMeetings()` | `apps/cockpit/src/app/(dashboard)/page.tsx` |
| `listTodaysBriefingMeetings()` | `apps/cockpit/src/app/(dashboard)/page.tsx` |
| `getExtractionCountsByMeetingIds()` | `apps/cockpit/src/app/(dashboard)/page.tsx` |

### queries/emails.ts

| Query | Used in |
|-------|---------|
| `listActiveGoogleAccountsSafe()` | `apps/cockpit/src/app/(dashboard)/emails/page.tsx` |
| `listActiveGoogleAccounts()` | `apps/cockpit/src/app/api/cron/email-sync/route.ts`, `apps/cockpit/src/app/api/email/sync/route.ts` |
| `listEmails()` | `apps/cockpit/src/app/(dashboard)/emails/page.tsx` |
| `countEmailsByFilterStatus()` | `apps/cockpit/src/app/(dashboard)/emails/page.tsx` |
| `listEmailsByOrganization()` | `apps/cockpit/src/app/(dashboard)/administratie/[id]/page.tsx` |
| `countEmailsByDirection()` | `apps/cockpit/src/app/(dashboard)/emails/page.tsx` |
| `getEmailById()` | `apps/cockpit/src/app/(dashboard)/emails/[id]/page.tsx` |
| `getExistingGmailIds()` | `apps/cockpit/src/app/api/cron/email-sync/route.ts`, `apps/cockpit/src/app/api/email/sync/route.ts` |
| `listDraftEmails()` | `apps/cockpit/src/app/(dashboard)/review/page.tsx` |
| `getDraftEmailById()` | `apps/cockpit/src/app/(dashboard)/review/email/[id]/page.tsx` |
| `countUnprocessedEmails()` | `apps/cockpit/src/app/(dashboard)/emails/page.tsx` |
| `getUnprocessedEmails()` | `apps/cockpit/src/app/api/cron/email-sync/route.ts`, `apps/cockpit/src/app/api/email/process-pending/route.ts`, `apps/cockpit/src/app/api/email/sync/route.ts` |

### queries/extractions.ts

| Query | Used in |
|-------|---------|
| `getExtractionsForMeetingByType()` | `apps/cockpit/src/actions/dev-extractor.ts` |

### queries/ignored-entities.ts

| Query | Used in |
|-------|---------|
| `getIgnoredEntityNames()` | `packages/ai/src/pipeline/steps/tag-and-segment.ts`, `packages/ai/src/scripts/batch-segment-migration.ts`, `apps/cockpit/src/actions/meeting-pipeline.ts`, `apps/cockpit/src/app/api/ingest/reprocess/route.ts` |

### queries/issue-activity.ts

| Query | Used in |
|-------|---------|
| `listIssueActivity()` | `apps/devhub/src/app/(app)/issues/[id]/page.tsx` |

### queries/issue-attachments.ts

| Query | Used in |
|-------|---------|
| `getIssueThumbnails()` | `apps/devhub/src/app/(app)/issues/page.tsx` |
| `listIssueAttachments()` | `apps/devhub/src/app/(app)/issues/[id]/page.tsx` |
| `getIssueIdsWithAttachments()` | `apps/devhub/src/actions/import.ts` |

### queries/issue-comments.ts

| Query | Used in |
|-------|---------|
| `getCommentById()` | `apps/devhub/src/actions/comments.ts` |
| `listIssueComments()` | `apps/devhub/src/app/(app)/issues/[id]/page.tsx` |

### queries/issues.ts

| Query | Used in |
|-------|---------|
| `listIssues()` | `apps/devhub/src/actions/review.ts`, `apps/devhub/src/app/(app)/issues/page.tsx` |
| `countFilteredIssues()` | `apps/devhub/src/app/(app)/issues/page.tsx` |
| `getIssueById()` | `apps/devhub/src/actions/classify.ts`, `apps/devhub/src/actions/comments.ts`, `apps/devhub/src/actions/issues.ts`, `apps/devhub/src/app/(app)/issues/[id]/page.tsx` |
| `getIssueCounts()` | `apps/devhub/src/actions/issues.ts`, `apps/devhub/src/app/(app)/issues/page.tsx`, `apps/devhub/src/app/(app)/page.tsx` |
| `countCriticalUnassigned()` | `apps/devhub/src/app/(app)/page.tsx` |

### queries/management-insights.ts

| Query | Used in |
|-------|---------|
| `getManagementInsights()` | `apps/cockpit/src/app/(dashboard)/intelligence/management/page.tsx`, `apps/cockpit/src/app/(dashboard)/page.tsx` |
| `getDismissedInsightKeys()` | `apps/cockpit/src/app/(dashboard)/intelligence/management/page.tsx` |

### queries/meeting-project-summaries.ts

| Query | Used in |
|-------|---------|
| `getSegmentsByMeetingId()` | `apps/cockpit/src/app/(dashboard)/meetings/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/review/[id]/page.tsx` |
| `getSegmentsByMeetingIds()` | `packages/mcp/src/tools/meetings.ts` |
| `getSegmentCountsByMeetingIds()` | `packages/mcp/src/tools/list-meetings.ts` |
| `getSegmentCountsByProjectIds()` | `packages/mcp/src/tools/projects.ts` |
| `getSegmentsByProjectId()` | `packages/ai/src/pipeline/summary-pipeline.ts`, `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx` |

### queries/meetings.ts

| Query | Used in |
|-------|---------|
| `getVerifiedMeetingById()` | `apps/cockpit/src/app/(dashboard)/meetings/[id]/page.tsx` |
| `listVerifiedMeetings()` | `apps/cockpit/src/app/(dashboard)/meetings/page.tsx` |
| `listBoardMeetings()` | `packages/ai/src/pipeline/management-insights-pipeline.ts`, `apps/cockpit/src/app/(dashboard)/intelligence/management/page.tsx` |
| `getMeetingByFirefliesId()` | `apps/cockpit/src/app/api/webhooks/fireflies/route.ts` |
| `getExistingFirefliesIds()` | `apps/cockpit/src/app/api/ingest/fireflies/route.ts` |
| `getExistingMeetingsByTitleDates()` | `apps/cockpit/src/app/api/ingest/fireflies/route.ts` |
| `getMeetingByTitleAndDate()` | `apps/cockpit/src/app/api/webhooks/fireflies/route.ts` |
| `listMeetingsForReclassify()` | `apps/cockpit/src/app/api/cron/reclassify/route.ts` |
| `listMeetingsWithTranscript()` | `apps/cockpit/src/app/(dashboard)/dev/extractor/page.tsx` |
| `getMeetingForDevExtractor()` | `apps/cockpit/src/actions/dev-extractor.ts` |
| `getMeetingForEmbedding()` | `packages/ai/src/pipeline/embed-pipeline.ts` |
| `getExtractionIdsAndContent()` | `packages/ai/src/pipeline/embed-pipeline.ts` |
| `getMeetingExtractions()` | `packages/ai/src/pipeline/embed-pipeline.ts` |
| `getMeetingExtractionsBatch()` | `packages/ai/src/pipeline/re-embed-worker.ts` |
| `getVerifiedMeetingsWithoutSegments()` | `packages/ai/src/scripts/batch-segment-migration.ts` |

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
| `getAllOrganizations()` | `packages/ai/src/pipeline/context-injection.ts`, `packages/ai/src/pipeline/entity-resolution.ts` |
| `findOrganizationIdByEmailDomain()` | `packages/ai/src/pipeline/email-pipeline.ts`, `packages/ai/src/scripts/backfill-email-organizations.ts` |
| `listOrganizationsByType()` | `apps/cockpit/src/app/(dashboard)/administratie/page.tsx`, `apps/cockpit/src/app/(dashboard)/clients/page.tsx` |

### queries/people.ts

| Query | Used in |
|-------|---------|
| `listPeople()` | `apps/cockpit/src/app/(dashboard)/directory/page.tsx`, `apps/cockpit/src/app/(dashboard)/emails/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/people/page.tsx`, `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/review/email/[id]/page.tsx` |
| `listPeopleByOrganization()` | `apps/cockpit/src/app/(dashboard)/administratie/[id]/page.tsx` |
| `listPeopleWithOrg()` | `apps/cockpit/src/app/(dashboard)/meetings/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/review/[id]/page.tsx` |
| `listPeopleForAssignment()` | `apps/cockpit/src/app/(dashboard)/meetings/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/page.tsx`, `apps/cockpit/src/app/(dashboard)/review/[id]/page.tsx` |
| `findPersonIdsByName()` | `packages/mcp/src/tools/actions.ts` |
| `findProfileIdByName()` | `packages/mcp/src/tools/correct-extraction.ts`, `packages/mcp/src/tools/write-client-updates.ts`, `packages/mcp/src/tools/write-tasks.ts` |
| `getPersonById()` | `apps/cockpit/src/app/(dashboard)/people/[id]/page.tsx` |
| `getStalePeople()` | `packages/ai/src/pipeline/re-embed-worker.ts` |
| `getAllKnownPeople()` | `packages/ai/src/pipeline/gatekeeper-pipeline.ts`, `packages/ai/src/pipeline/participant-classifier.ts`, `packages/ai/src/scripts/reclassify-board-meetings.ts`, `apps/cockpit/src/app/api/cron/reclassify/route.ts` |
| `getPeopleForContext()` | `packages/ai/src/pipeline/context-injection.ts` |
| `findPeopleByEmails()` | `packages/ai/src/pipeline/participant-helpers.ts` |
| `findPersonOrgByEmail()` | `packages/ai/src/pipeline/email-pipeline.ts`, `packages/ai/src/scripts/backfill-email-organizations.ts` |

### queries/project-access.ts

| Query | Used in |
|-------|---------|
| `listAccessibleProjects()` | `apps/devhub/src/app/(app)/layout.tsx`, `apps/devhub/src/app/(app)/page.tsx`, `apps/devhub/src/app/(app)/settings/slack/page.tsx` |

### queries/project-reviews.ts

| Query | Used in |
|-------|---------|
| `getLatestProjectReview()` | `apps/devhub/src/app/(app)/page.tsx` |
| `getHealthTrend()` | `apps/devhub/src/app/(app)/page.tsx` |

### queries/projects.ts

| Query | Used in |
|-------|---------|
| `listProjects()` | `apps/cockpit/src/app/(dashboard)/admin/team/page.tsx`, `apps/cockpit/src/app/(dashboard)/emails/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/meetings/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/projects/page.tsx`, `apps/cockpit/src/app/(dashboard)/review/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/review/email/[id]/page.tsx` |
| `getProjectById()` | `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx`, `apps/devhub/src/actions/review.ts` |
| `listFocusProjects()` | `apps/cockpit/src/app/(dashboard)/layout.tsx` |
| `getAllProjects()` | `packages/ai/src/pipeline/entity-resolution.ts` |
| `getActiveProjectsForContext()` | `packages/ai/src/pipeline/context-injection.ts` |
| `matchProjectsByEmbedding()` | `packages/ai/src/pipeline/entity-resolution.ts` |

### queries/review.ts

| Query | Used in |
|-------|---------|
| `listDraftMeetings()` | `apps/cockpit/src/app/(dashboard)/review/page.tsx` |
| `getDraftMeetingById()` | `apps/cockpit/src/app/(dashboard)/review/[id]/page.tsx` |
| `getReviewStats()` | `apps/cockpit/src/app/(dashboard)/review/page.tsx` |

### queries/summaries.ts

| Query | Used in |
|-------|---------|
| `getLatestSummary()` | `packages/database/src/queries/management-insights.ts`, `packages/database/src/queries/organizations.ts`, `packages/database/src/queries/projects.ts`, `packages/database/src/queries/weekly-summary.ts`, `packages/ai/src/pipeline/summary-pipeline.ts` |

### queries/tasks.ts

| Query | Used in |
|-------|---------|
| `hasTaskForExtraction()` | `apps/cockpit/src/actions/tasks.ts` |
| `getPromotedExtractionIds()` | `apps/cockpit/src/app/(dashboard)/meetings/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/review/[id]/page.tsx` |
| `listAllTasks()` | `apps/cockpit/src/app/(dashboard)/page.tsx` |

### queries/team.ts

| Query | Used in |
|-------|---------|
| `listTeamMembers()` | `apps/cockpit/src/app/(dashboard)/admin/team/page.tsx`, `apps/devhub/src/app/(app)/issues/[id]/page.tsx`, `apps/devhub/src/app/(app)/issues/new/page.tsx` |
| `getUserWithAccess()` | `apps/cockpit/src/actions/team.ts` |
| `countAdmins()` | `apps/cockpit/src/actions/team.ts`, `apps/cockpit/src/app/(dashboard)/admin/team/page.tsx` |

### queries/userback-issues.ts

| Query | Used in |
|-------|---------|
| `getUserbackSyncCursor()` | `apps/devhub/src/actions/import.ts` |
| `countUserbackIssues()` | `apps/devhub/src/actions/import.ts` |
| `listUserbackIssuesForBackfill()` | `apps/devhub/src/actions/import.ts` |

### queries/weekly-summary.ts

| Query | Used in |
|-------|---------|
| `getWeeklyProjectData()` | `packages/ai/src/pipeline/weekly-summary-pipeline.ts` |
| `getLatestWeeklySummary()` | `apps/cockpit/src/app/(dashboard)/intelligence/weekly/page.tsx` |
