// Generated manually from supabase/migrations/ — Sprint 001
// Regenereer met: npx supabase gen types typescript --project-id <id> > packages/database/src/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string;
          avatar_url: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email: string;
          avatar_url?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string;
          avatar_url?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          aliases: string[];
          type: "client" | "partner" | "supplier" | "other";
          contact_person: string | null;
          email: string | null;
          status: "prospect" | "active" | "inactive";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          aliases?: string[];
          type?: "client" | "partner" | "supplier" | "other";
          contact_person?: string | null;
          email?: string | null;
          status?: "prospect" | "active" | "inactive";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          aliases?: string[];
          type?: "client" | "partner" | "supplier" | "other";
          contact_person?: string | null;
          email?: string | null;
          status?: "prospect" | "active" | "inactive";
          created_at?: string;
          updated_at?: string;
        };
      };
      people: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          team: string | null;
          role: string | null;
          organization_id: string | null;
          embedding: string | null;
          embedding_stale: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          team?: string | null;
          role?: string | null;
          organization_id?: string | null;
          embedding?: string | null;
          embedding_stale?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string | null;
          team?: string | null;
          role?: string | null;
          organization_id?: string | null;
          embedding?: string | null;
          embedding_stale?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          name: string;
          aliases: string[];
          organization_id: string | null;
          description: string | null;
          owner_id: string | null;
          contact_person_id: string | null;
          start_date: string | null;
          deadline: string | null;
          github_url: string | null;
          status: string;
          embedding: string | null;
          embedding_stale: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          aliases?: string[];
          organization_id?: string | null;
          description?: string | null;
          owner_id?: string | null;
          contact_person_id?: string | null;
          start_date?: string | null;
          deadline?: string | null;
          github_url?: string | null;
          status?: string;
          embedding?: string | null;
          embedding_stale?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          aliases?: string[];
          organization_id?: string | null;
          description?: string | null;
          owner_id?: string | null;
          contact_person_id?: string | null;
          start_date?: string | null;
          deadline?: string | null;
          github_url?: string | null;
          status?: string;
          embedding?: string | null;
          embedding_stale?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      meetings: {
        Row: {
          id: string;
          fireflies_id: string | null;
          title: string;
          date: string | null;
          participants: string[] | null;
          summary: string | null;
          transcript: string | null;
          meeting_type: string | null;
          party_type: "client" | "partner" | "internal" | "other" | null;
          organization_id: string | null;
          unmatched_organization_name: string | null;
          raw_fireflies: Json | null;
          transcript_elevenlabs: string | null;
          raw_elevenlabs: Json | null;
          audio_url: string | null;
          relevance_score: number | null;
          ai_briefing: string | null;
          embedding: string | null;
          embedding_stale: boolean;
          verification_status: string;
          verified_by: string | null;
          verified_at: string | null;
          search_vector: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          fireflies_id?: string | null;
          title: string;
          date?: string | null;
          participants?: string[] | null;
          summary?: string | null;
          transcript?: string | null;
          meeting_type?: string | null;
          party_type?: "client" | "partner" | "internal" | "other" | null;
          organization_id?: string | null;
          unmatched_organization_name?: string | null;
          raw_fireflies?: Json | null;
          transcript_elevenlabs?: string | null;
          raw_elevenlabs?: Json | null;
          audio_url?: string | null;
          relevance_score?: number | null;
          ai_briefing?: string | null;
          embedding?: string | null;
          embedding_stale?: boolean;
          verification_status?: string;
          verified_by?: string | null;
          verified_at?: string | null;
          search_vector?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          fireflies_id?: string | null;
          title?: string;
          date?: string | null;
          participants?: string[] | null;
          summary?: string | null;
          transcript?: string | null;
          meeting_type?: string | null;
          party_type?: "client" | "partner" | "internal" | "other" | null;
          organization_id?: string | null;
          unmatched_organization_name?: string | null;
          raw_fireflies?: Json | null;
          transcript_elevenlabs?: string | null;
          raw_elevenlabs?: Json | null;
          audio_url?: string | null;
          relevance_score?: number | null;
          ai_briefing?: string | null;
          embedding?: string | null;
          embedding_stale?: boolean;
          verification_status?: string;
          verified_by?: string | null;
          verified_at?: string | null;
          search_vector?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      meeting_projects: {
        Row: {
          meeting_id: string;
          project_id: string;
          source: "ai" | "manual" | "review";
          created_at: string;
        };
        Insert: {
          meeting_id: string;
          project_id: string;
          source?: "ai" | "manual" | "review";
          created_at?: string;
        };
        Update: {
          meeting_id?: string;
          project_id?: string;
          source?: "ai" | "manual" | "review";
          created_at?: string;
        };
      };
      meeting_project_summaries: {
        Row: {
          id: string;
          meeting_id: string;
          project_id: string | null;
          project_name_raw: string | null;
          is_general: boolean;
          kernpunten: string[];
          vervolgstappen: string[];
          summary_text: string;
          embedding: string | null;
          embedding_stale: boolean;
          search_vector: unknown | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          project_id?: string | null;
          project_name_raw?: string | null;
          kernpunten?: string[];
          vervolgstappen?: string[];
          summary_text: string;
          embedding?: string | null;
          embedding_stale?: boolean;
          search_vector?: unknown | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          project_id?: string | null;
          project_name_raw?: string | null;
          kernpunten?: string[];
          vervolgstappen?: string[];
          summary_text?: string;
          embedding?: string | null;
          embedding_stale?: boolean;
          search_vector?: unknown | null;
          created_at?: string;
        };
      };
      meeting_participants: {
        Row: {
          meeting_id: string;
          person_id: string;
          created_at: string;
        };
        Insert: {
          meeting_id: string;
          person_id: string;
          created_at?: string;
        };
        Update: {
          meeting_id?: string;
          person_id?: string;
          created_at?: string;
        };
      };
      extractions: {
        Row: {
          id: string;
          meeting_id: string;
          type: "decision" | "action_item" | "need" | "insight";
          content: string;
          confidence: number | null;
          metadata: Json;
          transcript_ref: string | null;
          organization_id: string | null;
          project_id: string | null;
          embedding: string | null;
          embedding_stale: boolean;
          corrected_by: string | null;
          corrected_at: string | null;
          verification_status: string;
          verified_by: string | null;
          verified_at: string | null;
          search_vector: unknown | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          type: "decision" | "action_item" | "need" | "insight";
          content: string;
          confidence?: number | null;
          metadata?: Json;
          transcript_ref?: string | null;
          organization_id?: string | null;
          project_id?: string | null;
          embedding?: string | null;
          embedding_stale?: boolean;
          corrected_by?: string | null;
          corrected_at?: string | null;
          verification_status?: string;
          verified_by?: string | null;
          verified_at?: string | null;
          search_vector?: unknown | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          type?: "decision" | "action_item" | "need" | "insight";
          content?: string;
          confidence?: number | null;
          metadata?: Json;
          transcript_ref?: string | null;
          organization_id?: string | null;
          project_id?: string | null;
          embedding?: string | null;
          embedding_stale?: boolean;
          corrected_by?: string | null;
          corrected_at?: string | null;
          verification_status?: string;
          verified_by?: string | null;
          verified_at?: string | null;
          search_vector?: unknown | null;
          created_at?: string;
        };
      };
      summaries: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string;
          summary_type: string;
          content: string;
          version: number;
          source_meeting_ids: string[];
          structured_content: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          entity_type: string;
          entity_id: string;
          summary_type: string;
          content: string;
          version?: number;
          source_meeting_ids?: string[];
          structured_content?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          entity_type?: string;
          entity_id?: string;
          summary_type?: string;
          content?: string;
          version?: number;
          source_meeting_ids?: string[];
          structured_content?: Record<string, unknown> | null;
          created_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          extraction_id: string | null;
          title: string;
          status: "active" | "done" | "dismissed";
          assigned_to: string | null;
          due_date: string | null;
          created_by: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          extraction_id?: string | null;
          title: string;
          status?: "active" | "done" | "dismissed";
          assigned_to?: string | null;
          due_date?: string | null;
          created_by?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          extraction_id?: string | null;
          title?: string;
          status?: "active" | "done" | "dismissed";
          assigned_to?: string | null;
          due_date?: string | null;
          created_by?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      ignored_entities: {
        Row: {
          id: string;
          organization_id: string;
          entity_name: string;
          entity_type: "project" | "organization" | "person";
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          entity_name: string;
          entity_type: "project" | "organization" | "person";
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          entity_name?: string;
          entity_type?: "project" | "organization" | "person";
          created_at?: string;
        };
      };
      google_accounts: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          access_token: string;
          refresh_token: string;
          token_expiry: string;
          scopes: string[];
          is_active: boolean;
          last_sync_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          access_token: string;
          refresh_token: string;
          token_expiry: string;
          scopes?: string[];
          is_active?: boolean;
          last_sync_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          access_token?: string;
          refresh_token?: string;
          token_expiry?: string;
          scopes?: string[];
          is_active?: boolean;
          last_sync_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      emails: {
        Row: {
          id: string;
          google_account_id: string;
          gmail_id: string;
          thread_id: string;
          subject: string | null;
          from_address: string;
          from_name: string | null;
          to_addresses: string[];
          cc_addresses: string[];
          date: string;
          body_text: string | null;
          body_html: string | null;
          snippet: string | null;
          labels: string[];
          has_attachments: boolean;
          organization_id: string | null;
          unmatched_organization_name: string | null;
          relevance_score: number | null;
          email_type: string | null;
          party_type: string | null;
          is_processed: boolean;
          verification_status: string;
          verified_by: string | null;
          verified_at: string | null;
          raw_gmail: Json | null;
          embedding: string | null;
          embedding_stale: boolean;
          search_vector: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          google_account_id: string;
          gmail_id: string;
          thread_id: string;
          subject?: string | null;
          from_address: string;
          from_name?: string | null;
          to_addresses?: string[];
          cc_addresses?: string[];
          date: string;
          body_text?: string | null;
          body_html?: string | null;
          snippet?: string | null;
          labels?: string[];
          has_attachments?: boolean;
          organization_id?: string | null;
          unmatched_organization_name?: string | null;
          relevance_score?: number | null;
          email_type?: string | null;
          party_type?: string | null;
          is_processed?: boolean;
          verification_status?: string;
          verified_by?: string | null;
          verified_at?: string | null;
          raw_gmail?: Json | null;
          embedding?: string | null;
          embedding_stale?: boolean;
          search_vector?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          google_account_id?: string;
          gmail_id?: string;
          thread_id?: string;
          subject?: string | null;
          from_address?: string;
          from_name?: string | null;
          to_addresses?: string[];
          cc_addresses?: string[];
          date?: string;
          body_text?: string | null;
          body_html?: string | null;
          snippet?: string | null;
          labels?: string[];
          has_attachments?: boolean;
          organization_id?: string | null;
          unmatched_organization_name?: string | null;
          relevance_score?: number | null;
          email_type?: string | null;
          party_type?: string | null;
          is_processed?: boolean;
          verification_status?: string;
          verified_by?: string | null;
          verified_at?: string | null;
          raw_gmail?: Json | null;
          embedding?: string | null;
          embedding_stale?: boolean;
          search_vector?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      email_projects: {
        Row: {
          email_id: string;
          project_id: string;
          source: "ai" | "manual" | "review";
          created_at: string;
        };
        Insert: {
          email_id: string;
          project_id: string;
          source?: "ai" | "manual" | "review";
          created_at?: string;
        };
        Update: {
          email_id?: string;
          project_id?: string;
          source?: "ai" | "manual" | "review";
          created_at?: string;
        };
      };
      email_extractions: {
        Row: {
          id: string;
          email_id: string;
          type: "decision" | "action_item" | "need" | "insight" | "project_update" | "request";
          content: string;
          confidence: number | null;
          metadata: Json;
          source_ref: string | null;
          organization_id: string | null;
          project_id: string | null;
          embedding: string | null;
          embedding_stale: boolean;
          corrected_by: string | null;
          corrected_at: string | null;
          verification_status: string;
          verified_by: string | null;
          verified_at: string | null;
          search_vector: unknown | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email_id: string;
          type: "decision" | "action_item" | "need" | "insight" | "project_update" | "request";
          content: string;
          confidence?: number | null;
          metadata?: Json;
          source_ref?: string | null;
          organization_id?: string | null;
          project_id?: string | null;
          embedding?: string | null;
          embedding_stale?: boolean;
          corrected_by?: string | null;
          corrected_at?: string | null;
          verification_status?: string;
          verified_by?: string | null;
          verified_at?: string | null;
          search_vector?: unknown | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email_id?: string;
          type?: "decision" | "action_item" | "need" | "insight" | "project_update" | "request";
          content?: string;
          confidence?: number | null;
          metadata?: Json;
          source_ref?: string | null;
          organization_id?: string | null;
          project_id?: string | null;
          embedding?: string | null;
          embedding_stale?: boolean;
          corrected_by?: string | null;
          corrected_at?: string | null;
          verification_status?: string;
          verified_by?: string | null;
          verified_at?: string | null;
          search_vector?: unknown | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Convenience types
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
