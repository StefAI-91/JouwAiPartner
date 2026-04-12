# Dependency Graph

> Auto-generated on 2026-04-12. Do not edit manually.
> Run `node scripts/generate-dep-graph.js` to regenerate.

## Overview

| Metric | Count |
|--------|-------|
| Files scanned | 241 |
| Exported functions/constants | 409 |
| Exported types/interfaces | 110 |
| Cross-package imports | 317 |
| Critical integration points (3+ packages) | 6 |

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
- `getEmailById()`
- `getExistingGmailIds()`
- `listDraftEmails()`
- `getDraftEmailById()`
- `getUnprocessedEmails()`

**Types:** `GoogleAccountSafe`, `GoogleAccountRow`, `EmailListItem`, `EmailDetail`, `ReviewEmail`

### `queries/ignored-entities.ts`

**Exports:**
- `getIgnoredEntityNames()`

### `queries/issues.ts`

**Exports:**
- `listIssues()`
- `countFilteredIssues()`
- `getIssueById()`
- `getIssueCounts()`
- `listIssueComments()`
- `getUserbackSyncCursor()`
- `getExistingUserbackIds()`
- `countUserbackIssues()`
- `listIssueActivity()`
- `getIssueThumbnails()`
- `listIssueAttachments()`
- `listUserbackIssuesForBackfill()`
- `getIssueIdsWithAttachments()`
- `ISSUE_SELECT`

**Types:** `IssueRow`, `IssueCommentRow`, `IssueActivityRow`, `IssueAttachmentRow`

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
- `getMeetingByFirefliesId()`
- `getExistingFirefliesIds()`
- `getExistingMeetingsByTitleDates()`
- `getMeetingByTitleAndDate()`
- `listMeetingsForReclassify()`
- `getMeetingForEmbedding()`
- `getExtractionIdsAndContent()`
- `getMeetingExtractions()`
- `getMeetingExtractionsBatch()`
- `getVerifiedMeetingsWithoutSegments()`

**Types:** `MeetingDetail`, `RecentMeeting`, `VerifiedMeetingListItem`, `MeetingForReclassify`, `MeetingForBatchSegmentation`

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

**Types:** `OrganizationListItem`, `OrganizationDetail`

### `queries/people.ts`

**Exports:**
- `listPeople()`
- `listPeopleWithOrg()`
- `listPeopleForAssignment()`
- `findPersonIdsByName()`
- `findProfileIdByName()`
- `getPersonById()`
- `getStalePeople()`
- `getAllKnownPeople()`
- `getPeopleForContext()`
- `findPeopleByNames()`
- `findPeopleByEmails()`

**Types:** `PersonListItem`, `PersonWithOrg`, `PersonForAssignment`, `PersonDetail`, `KnownPerson`, `PersonForContext`

### `queries/project-access.ts`

**Exports:**
- `listAccessibleProjects()`

**Types:** `AccessibleProject`

### `queries/project-reviews.ts`

**Exports:**
- `getLatestProjectReview()`
- `listProjectReviews()`

**Types:** `ProjectReviewRow`

### `queries/projects.ts`

**Exports:**
- `listProjects()`
- `getProjectById()`
- `getProjectByNameIlike()`
- `getAllProjects()`
- `getActiveProjectsForContext()`
- `matchProjectsByEmbedding()`

**Types:** `ProjectListItem`, `ProjectDetail`, `ActiveProjectForContext`

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

### `mutations/extractions.ts`

**Exports:**
- `deleteExtractionsByMeetingId()`
- `getExtractionForCorrection()`
- `correctExtraction()`
- `insertExtractions()`
- `createExtraction()`
- `updateExtraction()`
- `deleteExtraction()`
- `updateNeedStatus()`

**Types:** `NeedStatus`

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
- `deleteOrganization()`

### `mutations/people.ts`

**Exports:**
- `createPerson()`
- `updatePerson()`
- `deletePerson()`

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

### `packages/ai/src/agents/summarizer.ts`

**Exports:**
- `runSummarizer()`
- `formatSummary()`

**Internal deps:**
- `../validations/summarizer` → SummarizerOutputSchema, SummarizerOutput

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

### `packages/ai/src/pipeline/email-pipeline.ts`

**Exports:**
- `processEmail()`
- `processEmailBatch()`

**Depends on:**
- `@repo/database/mutations/emails` → updateEmailClassification, updateEmailSenderPerson, linkEmailProject, insertEmailExtractions
- `@repo/database/queries/people` → findPeopleByEmails
- `@repo/database/supabase/admin` → getAdminClient

**Internal deps:**
- `../agents/email-classifier` → runEmailClassifier
- `../agents/email-extractor` → runEmailExtractor
- `../agents/email-classifier` → EmailClassifierOutput
- `../agents/email-extractor` → EmailExtractorOutput
- `./context-injection` → buildEntityContext
- `./entity-resolution` → resolveOrganization
- `../embeddings` → embedText

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
- `@repo/database/queries/people` → findPeopleByEmails, getAllKnownPeople
- `@repo/database/mutations/meeting-participants` → linkMeetingParticipants
- `@repo/database/mutations/meeting-project-summaries` → insertMeetingProjectSummaries
- `@repo/database/mutations/meeting-project-summaries` → updateSegmentEmbedding
- `@repo/database/queries/ignored-entities` → getIgnoredEntityNames

**Internal deps:**
- `../agents/gatekeeper` → runGatekeeper
- `../agents/gatekeeper` → ParticipantInfo
- `../agents/extractor` → ExtractorOutput
- `../validations/gatekeeper` → GatekeeperOutput
- `../validations/gatekeeper` → PartyType, IdentifiedProject
- `./entity-resolution` → resolveOrganization
- `./context-injection` → buildEntityContext
- `./embed-pipeline` → embedMeetingWithExtractions
- `./participant-classifier` → classifyParticipantsWithCache, determinePartyType
- `./build-raw-fireflies` → buildRawFireflies
- `./steps/transcribe` → runTranscribeStep
- `./steps/summarize` → runSummarizeStep
- `./steps/extract` → runExtractStep
- `./tagger` → runTagger
- `./segment-builder` → buildSegments
- `../embeddings` → embedBatch
- `./speaker-map` → extractSpeakerNames, buildSpeakerMap, formatSpeakerContext
- `./speaker-map` → SpeakerMap

### `packages/ai/src/pipeline/participant-classifier.ts`

**Exports:**
- `classifyParticipants()`
- `classifyParticipantsWithCache()`
- `determinePartyType()`

**Depends on:**
- (type) `@repo/database/queries/people` → KnownPerson
- `@repo/database/queries/people` → getAllKnownPeople

**Internal deps:**
- `../agents/gatekeeper` → ParticipantInfo
- `../validations/gatekeeper` → PartyType

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

**Depends on:**
- `@repo/database/mutations/meetings` → linkAllMeetingProjects
- `@repo/database/mutations/extractions` → insertExtractions

**Internal deps:**
- `../validations/extractor` → ExtractorOutput, ExtractionItem
- `../validations/gatekeeper` → IdentifiedProject

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

### `packages/ai/src/pipeline/steps/summarize.ts`

**Exports:**
- `runSummarizeStep()`

**Types:** `SummarizeResult`

**Depends on:**
- `@repo/database/mutations/meetings` → updateMeetingSummary

**Internal deps:**
- `../../agents/summarizer` → runSummarizer, formatSummary

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

### `packages/ai/src/validations/needs-scanner.ts`

**Exports:**
- `NeedItemSchema`
- `NeedsScannerOutputSchema`

**Types:** `NeedItem`, `NeedsScannerOutput`

### `packages/ai/src/validations/project-summary.ts`

**Exports:**
- `TimelineEntrySchema`
- `ProjectSummaryOutputSchema`
- `OrgSummaryOutputSchema`

**Types:** `TimelineEntry`, `ProjectSummaryOutput`, `OrgSummaryOutput`

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

### `apps/cockpit/src/actions/email-review.ts`

**Exports:**
- `approveEmailAction()`
- `approveEmailWithEditsAction()`
- `rejectEmailAction()`

**Depends on:**
- `@repo/database/mutations/emails` → verifyEmail, verifyEmailWithEdits, rejectEmail
- `@repo/ai/pipeline/summary-pipeline` → triggerSummariesForEmail
- `@repo/auth/helpers` → getAuthenticatedUser

### `apps/cockpit/src/actions/entities.ts`

**Exports:**
- `updateOrganizationAction()`
- `deleteOrganizationAction()`
- `updateProjectAction()`
- `deleteProjectAction()`
- `updatePersonAction()`
- `deletePersonAction()`
- `createExtractionAction()`
- `updateExtractionAction()`
- `deleteExtractionAction()`
- `deleteMeetingAction()`

**Depends on:**
- `@repo/database/mutations/organizations` → updateOrganization, deleteOrganization
- `@repo/database/mutations/projects` → updateProject, deleteProject
- `@repo/database/mutations/people` → updatePerson, deletePerson
- `@repo/database/mutations/extractions` → createExtraction, updateExtraction, deleteExtraction
- `@repo/database/mutations/meetings` → deleteMeeting
- `@repo/database/validations/entities` → updateOrganizationSchema, updateProjectSchema, updatePersonSchema, createExtractionSchema, updateExtractionSchema, deleteSchema, deleteWithContextSchema
- `@repo/auth/helpers` → getAuthenticatedUser

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
- `regenerateMeetingAction()`
- `reprocessMeetingAction()`
- `createOrganizationAction()`
- `createProjectAction()`
- `createPersonAction()`

**Depends on:**
- `@repo/database/mutations/meetings` → updateMeetingTitle, updateMeetingType, updateMeetingPartyType, updateMeetingOrganization, updateMeetingSummary, updateMeetingSummaryOnly, markMeetingEmbeddingStale, linkMeetingProject, unlinkMeetingProject
- `@repo/database/mutations/extractions` → deleteExtractionsByMeetingId
- `@repo/database/mutations/organizations` → createOrganization
- `@repo/database/mutations/projects` → createProject
- `@repo/database/mutations/meeting-participants` → linkMeetingParticipant, unlinkMeetingParticipant
- `@repo/database/mutations/people` → createPerson
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
- `@repo/database/validations/meetings` → updateTitleSchema, updateSummarySchema, updateMeetingTypeSchema, updatePartyTypeSchema, updateMeetingOrganizationSchema, meetingProjectSchema, meetingParticipantSchema, createOrganizationSchema, createProjectSchema, createPersonSchema, updateMeetingMetadataSchema, regenerateSchema
- `@repo/auth/helpers` → getAuthenticatedUser

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

### `apps/cockpit/src/actions/scan-needs.ts`

**Exports:**
- `scanTeamNeedsAction()`
- `updateNeedStatusAction()`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/ai/pipeline/scan-needs` → scanAllUnscannedMeetings
- `@repo/database/mutations/extractions` → updateNeedStatus

### `apps/cockpit/src/actions/segments.ts`

**Exports:**
- `linkSegmentToProjectAction()`
- `removeSegmentTagAction()`

**Depends on:**
- `@repo/database/supabase/server` → createClient
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

### `apps/cockpit/src/actions/weekly-summary.ts`

**Exports:**
- `generateWeeklySummaryAction()`

**Depends on:**
- `@repo/database/supabase/server` → createClient
- `@repo/ai/pipeline/weekly-summary-pipeline` → generateWeeklySummary

## Cockpit API Routes

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

## DevHub Server Actions

### `apps/devhub/src/actions/classify.ts`

**Exports:**
- `classifyIssueAction()`
- `classifyIssueBackground()`

**Depends on:**
- `@repo/database/queries/issues` → getIssueById
- `@repo/auth/helpers` → getAuthenticatedUser
- `@repo/database/mutations/issues` → updateIssue, insertActivity
- `@repo/ai/agents/issue-classifier` → runIssueClassifier

### `apps/devhub/src/actions/comments.ts`

**Exports:**
- `createCommentAction()`
- `updateCommentAction()`
- `deleteCommentAction()`

**Depends on:**
- `@repo/database/mutations/issues` → insertComment, updateComment, deleteComment, insertActivity
- `@repo/database/validations/issues` → createCommentSchema, updateCommentSchema, deleteCommentSchema
- `@repo/auth/helpers` → getAuthenticatedUser

### `apps/devhub/src/actions/execute.ts`

**Exports:**
- `startAiExecution()`

**Depends on:**
- `@repo/database/queries/issues` → getIssueById
- `@repo/database/mutations/issues` → updateIssue, insertActivity
- `@repo/ai/agents/issue-executor` → runIssueExecutor
- `@repo/auth/helpers` → getAuthenticatedUser

### `apps/devhub/src/actions/import.ts`

**Exports:**
- `syncUserback()`
- `getSyncStatus()`
- `backfillMedia()`

**Depends on:**
- `@repo/database/supabase/admin` → getAdminClient
- `@repo/auth/helpers` → getAuthenticatedUser
- `@repo/database/queries/issues` → getUserbackSyncCursor, countUserbackIssues, listUserbackIssuesForBackfill, getIssueIdsWithAttachments
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

## Cross-Package Dependency Matrix

Which layers depend on which packages:

| Layer | database | ai | auth | ui | mcp | Total |
|-------|---|---|---|---|---|-------|
| AI Core | 5 | - | - | - | - | 5 |
| AI Pipeline | 39 | - | - | - | - | 39 |
| Auth | 2 | - | - | - | - | 2 |
| Cockpit Server Actions | 32 | 14 | 7 | - | - | 53 |
| Cockpit API Routes | 20 | 32 | - | - | 1 | 53 |
| Cockpit Pages | 65 | - | - | 20 | - | 85 |
| DevHub Server Actions | 20 | 3 | 6 | - | - | 29 |
| DevHub API Routes | 3 | - | - | - | - | 3 |
| DevHub Pages | 9 | - | 6 | 9 | - | 24 |
| MCP Server | 23 | 1 | - | - | - | 24 |

## Critical Integration Points

Files that import from 3+ shared packages. These are the most interconnected
parts of the codebase — changes here have the widest blast radius.

| File | Packages | Count |
|------|----------|-------|
| `apps/cockpit/src/actions/email-review.ts` | database, ai, auth | 3 |
| `apps/cockpit/src/actions/meetings.ts` | database, ai, auth | 3 |
| `apps/cockpit/src/actions/review.ts` | database, ai, auth | 3 |
| `apps/devhub/src/actions/classify.ts` | database, auth, ai | 3 |
| `apps/devhub/src/actions/execute.ts` | database, ai, auth | 3 |
| `apps/devhub/src/actions/review.ts` | database, ai, auth | 3 |

## Key Dependency Chains

Tracing the most important data flows from action → pipeline → database.

### mutations/emails.ts

| Mutation | Called from |
|----------|------------|
| `upsertGoogleAccount()` | `apps/cockpit/src/app/api/email/auth/callback/route.ts` |
| `updateGoogleAccountTokens()` | `apps/cockpit/src/app/api/email/sync/route.ts` |
| `updateGoogleAccountLastSync()` | `apps/cockpit/src/app/api/email/sync/route.ts` |
| `insertEmails()` | `apps/cockpit/src/app/api/email/sync/route.ts` |
| `updateEmailClassification()` | `packages/ai/src/pipeline/email-pipeline.ts` |
| `linkEmailProject()` | `packages/ai/src/pipeline/email-pipeline.ts`, `apps/cockpit/src/actions/email-links.ts` |
| `verifyEmail()` | `apps/cockpit/src/actions/email-review.ts` |
| `verifyEmailWithEdits()` | `apps/cockpit/src/actions/email-review.ts` |
| `rejectEmail()` | `apps/cockpit/src/actions/email-review.ts` |
| `updateEmailSenderPerson()` | `packages/ai/src/pipeline/email-pipeline.ts`, `apps/cockpit/src/actions/email-links.ts` |
| `updateEmailType()` | `apps/cockpit/src/actions/email-links.ts` |
| `updateEmailPartyType()` | `apps/cockpit/src/actions/email-links.ts` |
| `updateEmailOrganization()` | `apps/cockpit/src/actions/email-links.ts` |
| `unlinkEmailProject()` | `apps/cockpit/src/actions/email-links.ts` |
| `insertEmailExtractions()` | `packages/ai/src/pipeline/email-pipeline.ts` |

### mutations/embeddings.ts

| Mutation | Called from |
|----------|------------|
| `updateRowEmbedding()` | `packages/ai/src/pipeline/embed-pipeline.ts` |
| `batchUpdateEmbeddings()` | `packages/ai/src/pipeline/embed-pipeline.ts`, `packages/ai/src/pipeline/re-embed-worker.ts` |

### mutations/extractions.ts

| Mutation | Called from |
|----------|------------|
| `deleteExtractionsByMeetingId()` | `apps/cockpit/src/actions/meetings.ts`, `apps/cockpit/src/app/api/ingest/reprocess/route.ts` |
| `getExtractionForCorrection()` | `packages/mcp/src/tools/correct-extraction.ts` |
| `correctExtraction()` | `packages/mcp/src/tools/correct-extraction.ts` |
| `insertExtractions()` | `packages/ai/src/pipeline/save-extractions.ts`, `packages/ai/src/pipeline/scan-needs.ts`, `packages/mcp/src/tools/write-client-updates.ts` |
| `createExtraction()` | `apps/cockpit/src/actions/entities.ts` |
| `updateExtraction()` | `apps/cockpit/src/actions/entities.ts` |
| `deleteExtraction()` | `apps/cockpit/src/actions/entities.ts` |
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
| `updateIssue()` | `apps/devhub/src/actions/classify.ts`, `apps/devhub/src/actions/execute.ts`, `apps/devhub/src/actions/issues.ts` |
| `deleteIssue()` | `apps/devhub/src/actions/issues.ts` |
| `insertComment()` | `apps/devhub/src/actions/comments.ts` |
| `updateComment()` | `apps/devhub/src/actions/comments.ts` |
| `deleteComment()` | `apps/devhub/src/actions/comments.ts` |
| `insertActivity()` | `apps/devhub/src/actions/classify.ts`, `apps/devhub/src/actions/comments.ts`, `apps/devhub/src/actions/execute.ts`, `apps/devhub/src/actions/issues.ts` |

### mutations/meeting-participants.ts

| Mutation | Called from |
|----------|------------|
| `linkMeetingParticipants()` | `packages/ai/src/pipeline/gatekeeper-pipeline.ts` |
| `linkMeetingParticipant()` | `apps/cockpit/src/actions/meetings.ts` |
| `unlinkMeetingParticipant()` | `apps/cockpit/src/actions/meetings.ts` |

### mutations/meeting-project-summaries.ts

| Mutation | Called from |
|----------|------------|
| `insertMeetingProjectSummaries()` | `packages/ai/src/pipeline/gatekeeper-pipeline.ts`, `packages/ai/src/scripts/batch-segment-migration.ts`, `apps/cockpit/src/actions/meetings.ts`, `apps/cockpit/src/app/api/ingest/reprocess/route.ts` |
| `linkSegmentToProject()` | `apps/cockpit/src/actions/segments.ts` |
| `removeSegmentTag()` | `apps/cockpit/src/actions/segments.ts` |
| `updateSegmentEmbedding()` | `packages/ai/src/pipeline/gatekeeper-pipeline.ts`, `packages/ai/src/scripts/batch-segment-migration.ts`, `apps/cockpit/src/actions/meetings.ts`, `apps/cockpit/src/app/api/ingest/reprocess/route.ts` |

### mutations/meetings.ts

| Mutation | Called from |
|----------|------------|
| `insertMeeting()` | `packages/ai/src/pipeline/gatekeeper-pipeline.ts` |
| `insertManualMeeting()` | `packages/mcp/src/tools/write-client-updates.ts` |
| `updateMeetingClassification()` | `apps/cockpit/src/app/api/cron/reclassify/route.ts` |
| `updateMeetingElevenLabs()` | `packages/ai/src/pipeline/steps/transcribe.ts` |
| `updateMeetingType()` | `apps/cockpit/src/actions/meetings.ts` |
| `updateMeetingPartyType()` | `apps/cockpit/src/actions/meetings.ts` |
| `updateMeetingTitle()` | `apps/cockpit/src/actions/meetings.ts` |
| `updateMeetingOrganization()` | `apps/cockpit/src/actions/meetings.ts` |
| `linkMeetingProject()` | `apps/cockpit/src/actions/meetings.ts` |
| `linkAllMeetingProjects()` | `packages/ai/src/pipeline/save-extractions.ts`, `packages/ai/src/scripts/batch-segment-migration.ts` |
| `updateMeetingSummary()` | `packages/ai/src/pipeline/steps/summarize.ts`, `apps/cockpit/src/actions/meetings.ts` |
| `updateMeetingSummaryOnly()` | `apps/cockpit/src/actions/meetings.ts`, `apps/cockpit/src/actions/review.ts` |
| `updateMeetingRawFireflies()` | `packages/ai/src/pipeline/steps/extract.ts` |
| `markMeetingEmbeddingStale()` | `apps/cockpit/src/actions/meetings.ts`, `apps/cockpit/src/app/api/ingest/reprocess/route.ts` |
| `unlinkMeetingProject()` | `apps/cockpit/src/actions/meetings.ts` |
| `deleteMeeting()` | `apps/cockpit/src/actions/entities.ts` |

### mutations/organizations.ts

| Mutation | Called from |
|----------|------------|
| `createOrganization()` | `apps/cockpit/src/actions/meetings.ts` |
| `updateOrganization()` | `apps/cockpit/src/actions/entities.ts` |
| `deleteOrganization()` | `apps/cockpit/src/actions/entities.ts` |

### mutations/people.ts

| Mutation | Called from |
|----------|------------|
| `createPerson()` | `apps/cockpit/src/actions/meetings.ts` |
| `updatePerson()` | `apps/cockpit/src/actions/entities.ts` |
| `deletePerson()` | `apps/cockpit/src/actions/entities.ts` |

### mutations/project-reviews.ts

| Mutation | Called from |
|----------|------------|
| `saveProjectReview()` | `apps/devhub/src/actions/review.ts` |

### mutations/projects.ts

| Mutation | Called from |
|----------|------------|
| `createProject()` | `apps/cockpit/src/actions/meetings.ts` |
| `updateProjectAliases()` | `packages/ai/src/pipeline/entity-resolution.ts`, `apps/cockpit/src/actions/segments.ts` |
| `updateProject()` | `apps/cockpit/src/actions/entities.ts` |
| `deleteProject()` | `apps/cockpit/src/actions/entities.ts` |

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
| `listActiveGoogleAccounts()` | `apps/cockpit/src/app/api/email/sync/route.ts` |
| `listEmails()` | `apps/cockpit/src/app/(dashboard)/emails/page.tsx` |
| `getEmailById()` | `apps/cockpit/src/app/(dashboard)/emails/[id]/page.tsx` |
| `getExistingGmailIds()` | `apps/cockpit/src/app/api/email/sync/route.ts` |
| `listDraftEmails()` | `apps/cockpit/src/app/(dashboard)/review/page.tsx` |
| `getDraftEmailById()` | `apps/cockpit/src/app/(dashboard)/review/email/[id]/page.tsx` |
| `getUnprocessedEmails()` | `apps/cockpit/src/app/api/email/sync/route.ts` |

### queries/ignored-entities.ts

| Query | Used in |
|-------|---------|
| `getIgnoredEntityNames()` | `packages/ai/src/pipeline/gatekeeper-pipeline.ts`, `packages/ai/src/scripts/batch-segment-migration.ts`, `apps/cockpit/src/actions/meetings.ts`, `apps/cockpit/src/app/api/ingest/reprocess/route.ts` |

### queries/issues.ts

| Query | Used in |
|-------|---------|
| `listIssues()` | `apps/devhub/src/actions/review.ts`, `apps/devhub/src/app/(app)/issues/page.tsx` |
| `countFilteredIssues()` | `apps/devhub/src/app/(app)/issues/page.tsx` |
| `getIssueById()` | `apps/devhub/src/actions/classify.ts`, `apps/devhub/src/actions/execute.ts`, `apps/devhub/src/actions/issues.ts`, `apps/devhub/src/app/(app)/issues/[id]/page.tsx` |
| `getIssueCounts()` | `apps/devhub/src/actions/issues.ts`, `apps/devhub/src/app/(app)/review/page.tsx` |
| `listIssueComments()` | `apps/devhub/src/app/(app)/issues/[id]/page.tsx` |
| `getUserbackSyncCursor()` | `apps/devhub/src/actions/import.ts` |
| `countUserbackIssues()` | `apps/devhub/src/actions/import.ts` |
| `listIssueActivity()` | `apps/devhub/src/app/(app)/issues/[id]/page.tsx` |
| `getIssueThumbnails()` | `apps/devhub/src/app/(app)/issues/page.tsx` |
| `listIssueAttachments()` | `apps/devhub/src/app/(app)/issues/[id]/page.tsx` |
| `listUserbackIssuesForBackfill()` | `apps/devhub/src/actions/import.ts` |
| `getIssueIdsWithAttachments()` | `apps/devhub/src/actions/import.ts` |

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
| `getMeetingByFirefliesId()` | `apps/cockpit/src/app/api/webhooks/fireflies/route.ts` |
| `getExistingFirefliesIds()` | `apps/cockpit/src/app/api/ingest/fireflies/route.ts` |
| `getExistingMeetingsByTitleDates()` | `apps/cockpit/src/app/api/ingest/fireflies/route.ts` |
| `getMeetingByTitleAndDate()` | `apps/cockpit/src/app/api/webhooks/fireflies/route.ts` |
| `listMeetingsForReclassify()` | `apps/cockpit/src/app/api/cron/reclassify/route.ts` |
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
| `listOrganizations()` | `apps/cockpit/src/app/(dashboard)/clients/page.tsx`, `apps/cockpit/src/app/(dashboard)/directory/page.tsx`, `apps/cockpit/src/app/(dashboard)/emails/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/meetings/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/people/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/people/page.tsx`, `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/projects/page.tsx`, `apps/cockpit/src/app/(dashboard)/review/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/review/email/[id]/page.tsx` |
| `getOrganizationById()` | `apps/cockpit/src/app/(dashboard)/clients/[id]/page.tsx` |
| `getAllOrganizations()` | `packages/ai/src/pipeline/context-injection.ts`, `packages/ai/src/pipeline/entity-resolution.ts` |

### queries/people.ts

| Query | Used in |
|-------|---------|
| `listPeople()` | `apps/cockpit/src/app/(dashboard)/directory/page.tsx`, `apps/cockpit/src/app/(dashboard)/emails/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/people/page.tsx`, `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/review/email/[id]/page.tsx`, `apps/devhub/src/app/(app)/issues/[id]/page.tsx`, `apps/devhub/src/app/(app)/issues/new/page.tsx` |
| `listPeopleWithOrg()` | `apps/cockpit/src/app/(dashboard)/meetings/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/review/[id]/page.tsx` |
| `listPeopleForAssignment()` | `apps/cockpit/src/app/(dashboard)/meetings/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/page.tsx`, `apps/cockpit/src/app/(dashboard)/review/[id]/page.tsx` |
| `findPersonIdsByName()` | `packages/mcp/src/tools/actions.ts` |
| `findProfileIdByName()` | `packages/mcp/src/tools/correct-extraction.ts`, `packages/mcp/src/tools/write-client-updates.ts`, `packages/mcp/src/tools/write-tasks.ts` |
| `getPersonById()` | `apps/cockpit/src/app/(dashboard)/people/[id]/page.tsx` |
| `getStalePeople()` | `packages/ai/src/pipeline/re-embed-worker.ts` |
| `getAllKnownPeople()` | `packages/ai/src/pipeline/gatekeeper-pipeline.ts`, `packages/ai/src/pipeline/participant-classifier.ts`, `apps/cockpit/src/app/api/cron/reclassify/route.ts` |
| `getPeopleForContext()` | `packages/ai/src/pipeline/context-injection.ts` |
| `findPeopleByEmails()` | `packages/ai/src/pipeline/email-pipeline.ts`, `packages/ai/src/pipeline/gatekeeper-pipeline.ts` |

### queries/project-access.ts

| Query | Used in |
|-------|---------|
| `listAccessibleProjects()` | `apps/devhub/src/app/(app)/layout.tsx`, `apps/devhub/src/app/(app)/review/page.tsx` |

### queries/project-reviews.ts

| Query | Used in |
|-------|---------|
| `getLatestProjectReview()` | `apps/devhub/src/app/(app)/review/page.tsx` |

### queries/projects.ts

| Query | Used in |
|-------|---------|
| `listProjects()` | `apps/cockpit/src/app/(dashboard)/emails/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/meetings/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/projects/page.tsx`, `apps/cockpit/src/app/(dashboard)/review/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/review/email/[id]/page.tsx` |
| `getProjectById()` | `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx`, `apps/devhub/src/actions/review.ts` |
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
| `getLatestSummary()` | `packages/database/src/queries/projects.ts`, `packages/database/src/queries/weekly-summary.ts`, `packages/ai/src/pipeline/summary-pipeline.ts` |

### queries/tasks.ts

| Query | Used in |
|-------|---------|
| `hasTaskForExtraction()` | `apps/cockpit/src/actions/tasks.ts` |
| `getPromotedExtractionIds()` | `apps/cockpit/src/app/(dashboard)/meetings/[id]/page.tsx`, `apps/cockpit/src/app/(dashboard)/review/[id]/page.tsx` |
| `listAllTasks()` | `apps/cockpit/src/app/(dashboard)/page.tsx` |

### queries/weekly-summary.ts

| Query | Used in |
|-------|---------|
| `getWeeklyProjectData()` | `packages/ai/src/pipeline/weekly-summary-pipeline.ts` |
| `getLatestWeeklySummary()` | `apps/cockpit/src/app/(dashboard)/intelligence/weekly/page.tsx` |
