export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4";
  };
  public: {
    Tables: {
      _cron_log: {
        Row: {
          created_at: string | null;
          id: number;
          job_name: string;
          result: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: never;
          job_name: string;
          result?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: never;
          job_name?: string;
          result?: string | null;
        };
        Relationships: [];
      };
      action_item_golden_items: {
        Row: {
          assignee: string | null;
          category: string | null;
          coder_notes: string | null;
          content: string;
          created_at: string;
          deadline: string | null;
          follow_up_contact: string;
          id: string;
          lane: string;
          meeting_id: string;
          project_context: string | null;
          source_quote: string | null;
          type_werk: string;
          updated_at: string;
        };
        Insert: {
          assignee?: string | null;
          category?: string | null;
          coder_notes?: string | null;
          content: string;
          created_at?: string;
          deadline?: string | null;
          follow_up_contact: string;
          id?: string;
          lane: string;
          meeting_id: string;
          project_context?: string | null;
          source_quote?: string | null;
          type_werk: string;
          updated_at?: string;
        };
        Update: {
          assignee?: string | null;
          category?: string | null;
          coder_notes?: string | null;
          content?: string;
          created_at?: string;
          deadline?: string | null;
          follow_up_contact?: string;
          id?: string;
          lane?: string;
          meeting_id?: string;
          project_context?: string | null;
          source_quote?: string | null;
          type_werk?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "action_item_golden_items_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
        ];
      };
      action_item_golden_meetings: {
        Row: {
          encoded_at: string;
          encoded_by: string | null;
          meeting_id: string;
          notes: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          encoded_at?: string;
          encoded_by?: string | null;
          meeting_id: string;
          notes?: string | null;
          status: string;
          updated_at?: string;
        };
        Update: {
          encoded_at?: string;
          encoded_by?: string | null;
          meeting_id?: string;
          notes?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "action_item_golden_meetings_encoded_by_fkey";
            columns: ["encoded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "action_item_golden_meetings_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: true;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
        ];
      };
      devhub_project_access: {
        Row: {
          created_at: string;
          id: string;
          profile_id: string;
          project_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          profile_id: string;
          project_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          profile_id?: string;
          project_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "devhub_project_access_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "devhub_project_access_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      email_extractions: {
        Row: {
          confidence: number | null;
          content: string;
          corrected_at: string | null;
          corrected_by: string | null;
          created_at: string | null;
          email_id: string;
          embedding: string | null;
          embedding_stale: boolean | null;
          id: string;
          metadata: Json | null;
          organization_id: string | null;
          project_id: string | null;
          search_vector: unknown;
          source_ref: string | null;
          type: string;
          verification_status: string;
          verified_at: string | null;
          verified_by: string | null;
        };
        Insert: {
          confidence?: number | null;
          content: string;
          corrected_at?: string | null;
          corrected_by?: string | null;
          created_at?: string | null;
          email_id: string;
          embedding?: string | null;
          embedding_stale?: boolean | null;
          id?: string;
          metadata?: Json | null;
          organization_id?: string | null;
          project_id?: string | null;
          search_vector?: unknown;
          source_ref?: string | null;
          type: string;
          verification_status?: string;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Update: {
          confidence?: number | null;
          content?: string;
          corrected_at?: string | null;
          corrected_by?: string | null;
          created_at?: string | null;
          email_id?: string;
          embedding?: string | null;
          embedding_stale?: boolean | null;
          id?: string;
          metadata?: Json | null;
          organization_id?: string | null;
          project_id?: string | null;
          search_vector?: unknown;
          source_ref?: string | null;
          type?: string;
          verification_status?: string;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "email_extractions_corrected_by_fkey";
            columns: ["corrected_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_extractions_email_id_fkey";
            columns: ["email_id"];
            isOneToOne: false;
            referencedRelation: "emails";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_extractions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_extractions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_extractions_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      email_projects: {
        Row: {
          created_at: string | null;
          email_id: string;
          project_id: string;
          source: string;
        };
        Insert: {
          created_at?: string | null;
          email_id: string;
          project_id: string;
          source?: string;
        };
        Update: {
          created_at?: string | null;
          email_id?: string;
          project_id?: string;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: "email_projects_email_id_fkey";
            columns: ["email_id"];
            isOneToOne: false;
            referencedRelation: "emails";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_projects_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      emails: {
        Row: {
          body_html: string | null;
          body_text: string | null;
          cc_addresses: string[] | null;
          created_at: string | null;
          date: string;
          direction: string;
          email_type: string | null;
          embedding: string | null;
          embedding_stale: boolean | null;
          filter_reason: string | null;
          filter_status: string;
          from_address: string;
          from_name: string | null;
          gmail_id: string;
          google_account_id: string;
          has_attachments: boolean | null;
          id: string;
          is_processed: boolean | null;
          labels: string[] | null;
          organization_id: string | null;
          party_type: string | null;
          raw_gmail: Json | null;
          rejection_reason: string | null;
          relevance_score: number | null;
          search_vector: unknown;
          sender_person_id: string | null;
          snippet: string | null;
          subject: string | null;
          thread_id: string;
          to_addresses: string[] | null;
          unmatched_organization_name: string | null;
          updated_at: string | null;
          verification_status: string;
          verified_at: string | null;
          verified_by: string | null;
        };
        Insert: {
          body_html?: string | null;
          body_text?: string | null;
          cc_addresses?: string[] | null;
          created_at?: string | null;
          date: string;
          direction?: string;
          email_type?: string | null;
          embedding?: string | null;
          embedding_stale?: boolean | null;
          filter_reason?: string | null;
          filter_status?: string;
          from_address: string;
          from_name?: string | null;
          gmail_id: string;
          google_account_id: string;
          has_attachments?: boolean | null;
          id?: string;
          is_processed?: boolean | null;
          labels?: string[] | null;
          organization_id?: string | null;
          party_type?: string | null;
          raw_gmail?: Json | null;
          rejection_reason?: string | null;
          relevance_score?: number | null;
          search_vector?: unknown;
          sender_person_id?: string | null;
          snippet?: string | null;
          subject?: string | null;
          thread_id: string;
          to_addresses?: string[] | null;
          unmatched_organization_name?: string | null;
          updated_at?: string | null;
          verification_status?: string;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Update: {
          body_html?: string | null;
          body_text?: string | null;
          cc_addresses?: string[] | null;
          created_at?: string | null;
          date?: string;
          direction?: string;
          email_type?: string | null;
          embedding?: string | null;
          embedding_stale?: boolean | null;
          filter_reason?: string | null;
          filter_status?: string;
          from_address?: string;
          from_name?: string | null;
          gmail_id?: string;
          google_account_id?: string;
          has_attachments?: boolean | null;
          id?: string;
          is_processed?: boolean | null;
          labels?: string[] | null;
          organization_id?: string | null;
          party_type?: string | null;
          raw_gmail?: Json | null;
          rejection_reason?: string | null;
          relevance_score?: number | null;
          search_vector?: unknown;
          sender_person_id?: string | null;
          snippet?: string | null;
          subject?: string | null;
          thread_id?: string;
          to_addresses?: string[] | null;
          unmatched_organization_name?: string | null;
          updated_at?: string | null;
          verification_status?: string;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "emails_google_account_id_fkey";
            columns: ["google_account_id"];
            isOneToOne: false;
            referencedRelation: "google_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "emails_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "emails_sender_person_id_fkey";
            columns: ["sender_person_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "emails_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      experimental_risk_extractions: {
        Row: {
          created_at: string;
          error: string | null;
          id: string;
          input_tokens: number | null;
          latency_ms: number | null;
          meeting_id: string;
          model: string;
          output_tokens: number | null;
          prompt_version: string;
          reasoning_tokens: number | null;
          risks: Json;
        };
        Insert: {
          created_at?: string;
          error?: string | null;
          id?: string;
          input_tokens?: number | null;
          latency_ms?: number | null;
          meeting_id: string;
          model: string;
          output_tokens?: number | null;
          prompt_version: string;
          reasoning_tokens?: number | null;
          risks: Json;
        };
        Update: {
          created_at?: string;
          error?: string | null;
          id?: string;
          input_tokens?: number | null;
          latency_ms?: number | null;
          meeting_id?: string;
          model?: string;
          output_tokens?: number | null;
          prompt_version?: string;
          reasoning_tokens?: number | null;
          risks?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "experimental_risk_extractions_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
        ];
      };
      extractions: {
        Row: {
          confidence: number | null;
          content: string;
          corrected_at: string | null;
          corrected_by: string | null;
          created_at: string | null;
          embedding: string | null;
          embedding_stale: boolean | null;
          follow_up_context: string | null;
          id: string;
          meeting_id: string;
          metadata: Json | null;
          organization_id: string | null;
          project_id: string | null;
          reasoning: string | null;
          search_vector: unknown;
          transcript_ref: string | null;
          type: string;
          verification_status: string;
          verified_at: string | null;
          verified_by: string | null;
        };
        Insert: {
          confidence?: number | null;
          content: string;
          corrected_at?: string | null;
          corrected_by?: string | null;
          created_at?: string | null;
          embedding?: string | null;
          embedding_stale?: boolean | null;
          follow_up_context?: string | null;
          id?: string;
          meeting_id: string;
          metadata?: Json | null;
          organization_id?: string | null;
          project_id?: string | null;
          reasoning?: string | null;
          search_vector?: unknown;
          transcript_ref?: string | null;
          type: string;
          verification_status?: string;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Update: {
          confidence?: number | null;
          content?: string;
          corrected_at?: string | null;
          corrected_by?: string | null;
          created_at?: string | null;
          embedding?: string | null;
          embedding_stale?: boolean | null;
          follow_up_context?: string | null;
          id?: string;
          meeting_id?: string;
          metadata?: Json | null;
          organization_id?: string | null;
          project_id?: string | null;
          reasoning?: string | null;
          search_vector?: unknown;
          transcript_ref?: string | null;
          type?: string;
          verification_status?: string;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "extractions_corrected_by_fkey";
            columns: ["corrected_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "extractions_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "extractions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "extractions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "extractions_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      extraction_themes: {
        Row: {
          confidence: string;
          created_at: string;
          extraction_id: string;
          theme_id: string;
        };
        Insert: {
          confidence: string;
          created_at?: string;
          extraction_id: string;
          theme_id: string;
        };
        Update: {
          confidence?: string;
          created_at?: string;
          extraction_id?: string;
          theme_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "extraction_themes_extraction_id_fkey";
            columns: ["extraction_id"];
            isOneToOne: false;
            referencedRelation: "extractions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "extraction_themes_theme_id_fkey";
            columns: ["theme_id"];
            isOneToOne: false;
            referencedRelation: "themes";
            referencedColumns: ["id"];
          },
        ];
      };
      google_accounts: {
        Row: {
          access_token: string;
          created_at: string | null;
          email: string;
          id: string;
          is_active: boolean | null;
          last_sync_at: string | null;
          refresh_token: string;
          scopes: string[] | null;
          token_expiry: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          access_token: string;
          created_at?: string | null;
          email: string;
          id?: string;
          is_active?: boolean | null;
          last_sync_at?: string | null;
          refresh_token: string;
          scopes?: string[] | null;
          token_expiry: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          access_token?: string;
          created_at?: string | null;
          email?: string;
          id?: string;
          is_active?: boolean | null;
          last_sync_at?: string | null;
          refresh_token?: string;
          scopes?: string[] | null;
          token_expiry?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "google_accounts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ignored_entities: {
        Row: {
          created_at: string;
          entity_name: string;
          entity_type: string;
          id: string;
          organization_id: string;
        };
        Insert: {
          created_at?: string;
          entity_name: string;
          entity_type: string;
          id?: string;
          organization_id: string;
        };
        Update: {
          created_at?: string;
          entity_name?: string;
          entity_type?: string;
          id?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ignored_entities_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      issue_activity: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          field: string | null;
          id: string;
          issue_id: string;
          metadata: Json | null;
          new_value: string | null;
          old_value: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          field?: string | null;
          id?: string;
          issue_id: string;
          metadata?: Json | null;
          new_value?: string | null;
          old_value?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          field?: string | null;
          id?: string;
          issue_id?: string;
          metadata?: Json | null;
          new_value?: string | null;
          old_value?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "issue_activity_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issue_activity_issue_id_fkey";
            columns: ["issue_id"];
            isOneToOne: false;
            referencedRelation: "issues";
            referencedColumns: ["id"];
          },
        ];
      };
      issue_comments: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          issue_id: string;
          updated_at: string;
        };
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          id?: string;
          issue_id: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          issue_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "issue_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issue_comments_issue_id_fkey";
            columns: ["issue_id"];
            isOneToOne: false;
            referencedRelation: "issues";
            referencedColumns: ["id"];
          },
        ];
      };
      issue_number_seq: {
        Row: {
          last_number: number;
          project_id: string;
        };
        Insert: {
          last_number?: number;
          project_id: string;
        };
        Update: {
          last_number?: number;
          project_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "issue_number_seq_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: true;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      issues: {
        Row: {
          ai_classification: Json | null;
          ai_classified_at: string | null;
          ai_context: Json | null;
          ai_executable: boolean | null;
          ai_result: Json | null;
          assigned_to: string | null;
          client_description: string | null;
          client_title: string | null;
          closed_at: string | null;
          component: string | null;
          created_at: string;
          description: string | null;
          duplicate_of_id: string | null;
          embedding: string | null;
          execution_type: string;
          id: string;
          issue_number: number;
          labels: string[] | null;
          priority: string;
          project_id: string;
          reporter_email: string | null;
          reporter_name: string | null;
          severity: string | null;
          similarity_score: number | null;
          source: string;
          source_metadata: Json | null;
          source_url: string | null;
          status: string;
          title: string;
          type: string;
          updated_at: string;
          userback_id: string | null;
        };
        Insert: {
          ai_classification?: Json | null;
          ai_classified_at?: string | null;
          ai_context?: Json | null;
          ai_executable?: boolean | null;
          ai_result?: Json | null;
          assigned_to?: string | null;
          client_description?: string | null;
          client_title?: string | null;
          closed_at?: string | null;
          component?: string | null;
          created_at?: string;
          description?: string | null;
          duplicate_of_id?: string | null;
          embedding?: string | null;
          execution_type?: string;
          id?: string;
          issue_number: number;
          labels?: string[] | null;
          priority?: string;
          project_id: string;
          reporter_email?: string | null;
          reporter_name?: string | null;
          severity?: string | null;
          similarity_score?: number | null;
          source?: string;
          source_metadata?: Json | null;
          source_url?: string | null;
          status?: string;
          title: string;
          type?: string;
          updated_at?: string;
          userback_id?: string | null;
        };
        Update: {
          ai_classification?: Json | null;
          ai_classified_at?: string | null;
          ai_context?: Json | null;
          ai_executable?: boolean | null;
          ai_result?: Json | null;
          assigned_to?: string | null;
          client_description?: string | null;
          client_title?: string | null;
          closed_at?: string | null;
          component?: string | null;
          created_at?: string;
          description?: string | null;
          duplicate_of_id?: string | null;
          embedding?: string | null;
          execution_type?: string;
          id?: string;
          issue_number?: number;
          labels?: string[] | null;
          priority?: string;
          project_id?: string;
          reporter_email?: string | null;
          reporter_name?: string | null;
          severity?: string | null;
          similarity_score?: number | null;
          source?: string;
          source_metadata?: Json | null;
          source_url?: string | null;
          status?: string;
          title?: string;
          type?: string;
          updated_at?: string;
          userback_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "issues_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issues_duplicate_of_id_fkey";
            columns: ["duplicate_of_id"];
            isOneToOne: false;
            referencedRelation: "issues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issues_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      mcp_queries: {
        Row: {
          created_at: string | null;
          id: string;
          query: string | null;
          tool: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          query?: string | null;
          tool: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          query?: string | null;
          tool?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "mcp_queries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      meeting_participants: {
        Row: {
          created_at: string | null;
          meeting_id: string;
          person_id: string;
        };
        Insert: {
          created_at?: string | null;
          meeting_id: string;
          person_id: string;
        };
        Update: {
          created_at?: string | null;
          meeting_id?: string;
          person_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_participants_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
        ];
      };
      meeting_project_summaries: {
        Row: {
          created_at: string;
          embedding: string | null;
          embedding_stale: boolean;
          id: string;
          is_general: boolean | null;
          kernpunten: string[] | null;
          meeting_id: string;
          project_id: string | null;
          project_name_raw: string | null;
          search_vector: unknown;
          summary_text: string;
          vervolgstappen: string[] | null;
        };
        Insert: {
          created_at?: string;
          embedding?: string | null;
          embedding_stale?: boolean;
          id?: string;
          is_general?: boolean | null;
          kernpunten?: string[] | null;
          meeting_id: string;
          project_id?: string | null;
          project_name_raw?: string | null;
          search_vector?: unknown;
          summary_text: string;
          vervolgstappen?: string[] | null;
        };
        Update: {
          created_at?: string;
          embedding?: string | null;
          embedding_stale?: boolean;
          id?: string;
          is_general?: boolean | null;
          kernpunten?: string[] | null;
          meeting_id?: string;
          project_id?: string | null;
          project_name_raw?: string | null;
          search_vector?: unknown;
          summary_text?: string;
          vervolgstappen?: string[] | null;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_project_summaries_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_project_summaries_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      meeting_projects: {
        Row: {
          created_at: string | null;
          meeting_id: string;
          project_id: string;
          source: string;
        };
        Insert: {
          created_at?: string | null;
          meeting_id: string;
          project_id: string;
          source?: string;
        };
        Update: {
          created_at?: string | null;
          meeting_id?: string;
          project_id?: string;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_projects_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_projects_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      meeting_themes: {
        Row: {
          confidence: string;
          created_at: string;
          evidence_quote: string;
          meeting_id: string;
          summary: string | null;
          theme_id: string;
        };
        Insert: {
          confidence: string;
          created_at?: string;
          evidence_quote: string;
          meeting_id: string;
          summary?: string | null;
          theme_id: string;
        };
        Update: {
          confidence?: string;
          created_at?: string;
          evidence_quote?: string;
          meeting_id?: string;
          summary?: string | null;
          theme_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_themes_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_themes_theme_id_fkey";
            columns: ["theme_id"];
            isOneToOne: false;
            referencedRelation: "themes";
            referencedColumns: ["id"];
          },
        ];
      };
      meetings: {
        Row: {
          ai_briefing: string | null;
          audio_url: string | null;
          created_at: string | null;
          date: string | null;
          embedding: string | null;
          embedding_stale: boolean | null;
          fireflies_id: string | null;
          id: string;
          meeting_type: string | null;
          organization_id: string | null;
          organizer_email: string | null;
          participants: string[] | null;
          party_type: string | null;
          raw_elevenlabs: Json | null;
          raw_fireflies: Json | null;
          relevance_score: number | null;
          search_vector: unknown;
          summary: string | null;
          title: string;
          transcript: string | null;
          transcript_elevenlabs: string | null;
          transcript_elevenlabs_named: string | null;
          unmatched_organization_name: string | null;
          updated_at: string | null;
          verification_status: string;
          verified_at: string | null;
          verified_by: string | null;
        };
        Insert: {
          ai_briefing?: string | null;
          audio_url?: string | null;
          created_at?: string | null;
          date?: string | null;
          embedding?: string | null;
          embedding_stale?: boolean | null;
          fireflies_id?: string | null;
          id?: string;
          meeting_type?: string | null;
          organization_id?: string | null;
          organizer_email?: string | null;
          participants?: string[] | null;
          party_type?: string | null;
          raw_elevenlabs?: Json | null;
          raw_fireflies?: Json | null;
          relevance_score?: number | null;
          search_vector?: unknown;
          summary?: string | null;
          title: string;
          transcript?: string | null;
          transcript_elevenlabs?: string | null;
          transcript_elevenlabs_named?: string | null;
          unmatched_organization_name?: string | null;
          updated_at?: string | null;
          verification_status?: string;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Update: {
          ai_briefing?: string | null;
          audio_url?: string | null;
          created_at?: string | null;
          date?: string | null;
          embedding?: string | null;
          embedding_stale?: boolean | null;
          fireflies_id?: string | null;
          id?: string;
          meeting_type?: string | null;
          organization_id?: string | null;
          organizer_email?: string | null;
          participants?: string[] | null;
          party_type?: string | null;
          raw_elevenlabs?: Json | null;
          raw_fireflies?: Json | null;
          relevance_score?: number | null;
          search_vector?: unknown;
          summary?: string | null;
          title?: string;
          transcript?: string | null;
          transcript_elevenlabs?: string | null;
          transcript_elevenlabs_named?: string | null;
          unmatched_organization_name?: string | null;
          updated_at?: string | null;
          verification_status?: string;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meetings_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meetings_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          aliases: string[] | null;
          contact_person: string | null;
          created_at: string | null;
          email: string | null;
          id: string;
          name: string;
          status: string | null;
          type: string;
          updated_at: string | null;
        };
        Insert: {
          aliases?: string[] | null;
          contact_person?: string | null;
          created_at?: string | null;
          email?: string | null;
          id?: string;
          name: string;
          status?: string | null;
          type?: string;
          updated_at?: string | null;
        };
        Update: {
          aliases?: string[] | null;
          contact_person?: string | null;
          created_at?: string | null;
          email?: string | null;
          id?: string;
          name?: string;
          status?: string | null;
          type?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      pending_matches: {
        Row: {
          content_id: string;
          content_table: string;
          created_at: string | null;
          extracted_name: string;
          id: string;
          resolved_by: string | null;
          similarity_score: number | null;
          status: string | null;
          suggested_match_id: string | null;
        };
        Insert: {
          content_id: string;
          content_table: string;
          created_at?: string | null;
          extracted_name: string;
          id?: string;
          resolved_by?: string | null;
          similarity_score?: number | null;
          status?: string | null;
          suggested_match_id?: string | null;
        };
        Update: {
          content_id?: string;
          content_table?: string;
          created_at?: string | null;
          extracted_name?: string;
          id?: string;
          resolved_by?: string | null;
          similarity_score?: number | null;
          status?: string | null;
          suggested_match_id?: string | null;
        };
        Relationships: [];
      };
      people: {
        Row: {
          created_at: string | null;
          email: string | null;
          embedding: string | null;
          embedding_stale: boolean | null;
          id: string;
          name: string;
          organization_id: string | null;
          role: string | null;
          team: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          email?: string | null;
          embedding?: string | null;
          embedding_stale?: boolean | null;
          id?: string;
          name: string;
          organization_id?: string | null;
          role?: string | null;
          team?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string | null;
          embedding?: string | null;
          embedding_stale?: boolean | null;
          id?: string;
          name?: string;
          organization_id?: string | null;
          role?: string | null;
          team?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "people_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      portal_project_access: {
        Row: {
          created_at: string;
          id: string;
          profile_id: string;
          project_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          profile_id: string;
          project_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          profile_id?: string;
          project_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "portal_project_access_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "portal_project_access_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          email: string;
          full_name: string | null;
          id: string;
          organization_id: string | null;
          role: "admin" | "member" | "client";
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          email: string;
          full_name?: string | null;
          id: string;
          organization_id?: string | null;
          role?: "admin" | "member" | "client";
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string;
          full_name?: string | null;
          id?: string;
          organization_id?: string | null;
          role?: "admin" | "member" | "client";
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          aliases: string[] | null;
          contact_person_id: string | null;
          created_at: string | null;
          deadline: string | null;
          description: string | null;
          embedding: string | null;
          embedding_stale: boolean | null;
          github_url: string | null;
          id: string;
          name: string;
          organization_id: string | null;
          owner_id: string | null;
          preview_url: string | null;
          production_url: string | null;
          project_key: string | null;
          screenshot_url: string | null;
          start_date: string | null;
          status: string | null;
          updated_at: string | null;
          userback_project_id: string | null;
        };
        Insert: {
          aliases?: string[] | null;
          contact_person_id?: string | null;
          created_at?: string | null;
          deadline?: string | null;
          description?: string | null;
          embedding?: string | null;
          embedding_stale?: boolean | null;
          github_url?: string | null;
          id?: string;
          name: string;
          organization_id?: string | null;
          owner_id?: string | null;
          preview_url?: string | null;
          production_url?: string | null;
          project_key?: string | null;
          screenshot_url?: string | null;
          start_date?: string | null;
          status?: string | null;
          updated_at?: string | null;
          userback_project_id?: string | null;
        };
        Update: {
          aliases?: string[] | null;
          contact_person_id?: string | null;
          created_at?: string | null;
          deadline?: string | null;
          description?: string | null;
          embedding?: string | null;
          embedding_stale?: boolean | null;
          github_url?: string | null;
          id?: string;
          name?: string;
          organization_id?: string | null;
          owner_id?: string | null;
          preview_url?: string | null;
          production_url?: string | null;
          project_key?: string | null;
          screenshot_url?: string | null;
          start_date?: string | null;
          status?: string | null;
          updated_at?: string | null;
          userback_project_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "projects_contact_person_id_fkey";
            columns: ["contact_person_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
        ];
      };
      summaries: {
        Row: {
          content: string;
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: string;
          source_meeting_ids: string[] | null;
          structured_content: Json | null;
          summary_type: string;
          version: number;
        };
        Insert: {
          content: string;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          source_meeting_ids?: string[] | null;
          structured_content?: Json | null;
          summary_type: string;
          version?: number;
        };
        Update: {
          content?: string;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          source_meeting_ids?: string[] | null;
          structured_content?: Json | null;
          summary_type?: string;
          version?: number;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          assigned_to: string | null;
          completed_at: string | null;
          created_at: string | null;
          created_by: string | null;
          due_date: string | null;
          extraction_id: string | null;
          id: string;
          status: string;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          assigned_to?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          due_date?: string | null;
          extraction_id?: string | null;
          id?: string;
          status?: string;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          assigned_to?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          due_date?: string | null;
          extraction_id?: string | null;
          id?: string;
          status?: string;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_extraction_id_fkey";
            columns: ["extraction_id"];
            isOneToOne: false;
            referencedRelation: "extractions";
            referencedColumns: ["id"];
          },
        ];
      };
      theme_match_rejections: {
        Row: {
          evidence_quote: string;
          id: string;
          meeting_id: string;
          reason: string;
          rejected_at: string;
          rejected_by: string;
          theme_id: string;
        };
        Insert: {
          evidence_quote: string;
          id?: string;
          meeting_id: string;
          reason: string;
          rejected_at?: string;
          rejected_by: string;
          theme_id: string;
        };
        Update: {
          evidence_quote?: string;
          id?: string;
          meeting_id?: string;
          reason?: string;
          rejected_at?: string;
          rejected_by?: string;
          theme_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "theme_match_rejections_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "theme_match_rejections_theme_id_fkey";
            columns: ["theme_id"];
            isOneToOne: false;
            referencedRelation: "themes";
            referencedColumns: ["id"];
          },
        ];
      };
      themes: {
        Row: {
          archived_at: string | null;
          created_at: string;
          created_by_agent: string | null;
          description: string;
          emoji: string;
          id: string;
          last_mentioned_at: string | null;
          matching_guide: string;
          mention_count: number;
          name: string;
          origin_meeting_id: string | null;
          slug: string;
          status: string;
          updated_at: string;
          verified_at: string | null;
          verified_by: string | null;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          created_by_agent?: string | null;
          description: string;
          emoji?: string;
          id?: string;
          last_mentioned_at?: string | null;
          matching_guide: string;
          mention_count?: number;
          name: string;
          origin_meeting_id?: string | null;
          slug: string;
          status?: string;
          updated_at?: string;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          created_by_agent?: string | null;
          description?: string;
          emoji?: string;
          id?: string;
          last_mentioned_at?: string | null;
          matching_guide?: string;
          mention_count?: number;
          name?: string;
          origin_meeting_id?: string | null;
          slug?: string;
          status?: string;
          updated_at?: string;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "themes_origin_meeting_id_fkey";
            columns: ["origin_meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
        ];
      };
      topic_issues: {
        Row: {
          issue_id: string;
          linked_at: string;
          linked_by: string;
          linked_via: string;
          topic_id: string;
        };
        Insert: {
          issue_id: string;
          linked_at?: string;
          linked_by: string;
          linked_via?: string;
          topic_id: string;
        };
        Update: {
          issue_id?: string;
          linked_at?: string;
          linked_by?: string;
          linked_via?: string;
          topic_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "topic_issues_issue_id_fkey";
            columns: ["issue_id"];
            isOneToOne: true;
            referencedRelation: "issues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "topic_issues_linked_by_fkey";
            columns: ["linked_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "topic_issues_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
        ];
      };
      topics: {
        Row: {
          client_description: string | null;
          client_test_instructions: string | null;
          client_title: string | null;
          closed_at: string | null;
          created_at: string;
          created_by: string;
          description: string | null;
          id: string;
          priority: string | null;
          project_id: string;
          status: string;
          status_overridden: boolean;
          target_sprint_id: string | null;
          title: string;
          type: string;
          updated_at: string;
          wont_do_reason: string | null;
        };
        Insert: {
          client_description?: string | null;
          client_test_instructions?: string | null;
          client_title?: string | null;
          closed_at?: string | null;
          created_at?: string;
          created_by: string;
          description?: string | null;
          id?: string;
          priority?: string | null;
          project_id: string;
          status?: string;
          status_overridden?: boolean;
          target_sprint_id?: string | null;
          title: string;
          type: string;
          updated_at?: string;
          wont_do_reason?: string | null;
        };
        Update: {
          client_description?: string | null;
          client_test_instructions?: string | null;
          client_title?: string | null;
          closed_at?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          id?: string;
          priority?: string | null;
          project_id?: string;
          status?: string;
          status_overridden?: boolean;
          target_sprint_id?: string | null;
          title?: string;
          type?: string;
          updated_at?: string;
          wont_do_reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "topics_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "topics_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      update_suggestions: {
        Row: {
          created_at: string | null;
          current_content: string | null;
          id: string;
          new_content: string | null;
          reason: string | null;
          status: string | null;
          target_content_id: string | null;
          target_table: string | null;
          trigger_source_id: string | null;
          trigger_source_type: string | null;
        };
        Insert: {
          created_at?: string | null;
          current_content?: string | null;
          id?: string;
          new_content?: string | null;
          reason?: string | null;
          status?: string | null;
          target_content_id?: string | null;
          target_table?: string | null;
          trigger_source_id?: string | null;
          trigger_source_type?: string | null;
        };
        Update: {
          created_at?: string | null;
          current_content?: string | null;
          id?: string;
          new_content?: string | null;
          reason?: string | null;
          status?: string | null;
          target_content_id?: string | null;
          target_table?: string | null;
          trigger_source_id?: string | null;
          trigger_source_type?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      portal_meetings: {
        Row: {
          ai_briefing: string | null;
          created_at: string | null;
          date: string | null;
          id: string | null;
          meeting_type: string | null;
          organization_id: string | null;
          organizer_email: string | null;
          participants: string[] | null;
          party_type: string | null;
          summary: string | null;
          title: string | null;
          unmatched_organization_name: string | null;
          updated_at: string | null;
          verification_status: string | null;
          verified_at: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      batch_update_embeddings: {
        Args: { p_embeddings: string[]; p_ids: string[]; p_table: string };
        Returns: undefined;
      };
      match_decisions: {
        Args: {
          match_count?: number;
          match_threshold?: number;
          query_embedding: string;
        };
        Returns: {
          date: string;
          decision: string;
          id: string;
          made_by: string;
          similarity: number;
          source_id: string;
        }[];
      };
      match_meetings: {
        Args: {
          match_count?: number;
          match_threshold?: number;
          query_embedding: string;
        };
        Returns: {
          date: string;
          id: string;
          similarity: number;
          summary: string;
          title: string;
        }[];
      };
      match_people: {
        Args: {
          match_count?: number;
          match_threshold?: number;
          query_embedding: string;
        };
        Returns: {
          email: string;
          id: string;
          name: string;
          role: string;
          similarity: number;
          team: string;
        }[];
      };
      match_projects:
        | {
            Args: {
              match_count?: number;
              match_threshold?: number;
              query_embedding: string;
            };
            Returns: {
              id: string;
              name: string;
              organization_id: string;
              similarity: number;
              status: string;
            }[];
          }
        | {
            Args: {
              match_count?: number;
              match_threshold?: number;
              query_embedding: string;
            };
            Returns: {
              aliases: string[];
              client: string;
              id: string;
              name: string;
              similarity: number;
            }[];
          };
      next_issue_number: { Args: { p_project_id: string }; Returns: number };
      reject_email:
        | {
            Args: { p_email_id: string; p_user_id: string };
            Returns: undefined;
          }
        | {
            Args: { p_email_id: string; p_reason?: string; p_user_id: string };
            Returns: undefined;
          };
      reject_meeting: {
        Args: { p_meeting_id: string; p_user_id: string };
        Returns: undefined;
      };
      search_all_content:
        | {
            Args: {
              match_count?: number;
              match_threshold?: number;
              query_embedding: string;
              query_text?: string;
            };
            Returns: {
              content: string;
              date: string;
              id: string;
              rrf_score: number;
              similarity: number;
              source_type: string;
              text_rank: number;
              title: string;
            }[];
          }
        | {
            Args: {
              match_count?: number;
              match_threshold?: number;
              query_embedding: string;
              query_text?: string;
              verified_only?: boolean;
            };
            Returns: {
              confidence: number;
              content: string;
              corrected_by: string;
              date: string;
              id: string;
              meeting_id: string;
              rrf_score: number;
              similarity: number;
              source_type: string;
              text_rank: number;
              title: string;
              transcript_ref: string;
              verification_status: string;
              verified_at: string;
              verified_by: string;
            }[];
          };
      search_meetings_by_participant: {
        Args: {
          match_count?: number;
          match_threshold?: number;
          participant_name: string;
          query_embedding: string;
        };
        Returns: {
          date: string;
          id: string;
          participants: string[];
          similarity: number;
          summary: string;
          title: string;
        }[];
      };
      verify_email: {
        Args: {
          p_edits?: Json;
          p_email_id: string;
          p_rejected_ids?: string[];
          p_type_changes?: Json;
          p_user_id: string;
        };
        Returns: undefined;
      };
      verify_meeting: {
        Args: {
          p_edits?: Json;
          p_meeting_id: string;
          p_rejected_ids?: string[];
          p_type_changes?: Json;
          p_user_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
