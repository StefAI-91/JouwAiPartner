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
          relevance_score: number | null;
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
          relevance_score?: number | null;
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
          relevance_score?: number | null;
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
          created_at: string;
        };
        Insert: {
          meeting_id: string;
          project_id: string;
          created_at?: string;
        };
        Update: {
          meeting_id?: string;
          project_id?: string;
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
