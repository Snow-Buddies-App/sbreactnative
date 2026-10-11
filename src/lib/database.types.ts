// Mirrors supabase/migrations. Regenerate with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts

export type Sport = 'ski' | 'snowboard' | 'both';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type BuddyStatus = 'pending' | 'accepted';

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '12';
  };
  public: {
    Tables: {
      mountains: {
        Row: {
          id: number;
          name: string;
          region: string;
          country: string;
          latitude: number;
          longitude: number;
        };
        Insert: {
          name: string;
          region: string;
          country?: string;
          latitude: number;
          longitude: number;
        };
        Update: {
          name?: string;
          region?: string;
          country?: string;
          latitude?: number;
          longitude?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          display_name: string;
          sport: Sport | null;
          skill_level: SkillLevel | null;
          home_mountain_id: number | null;
          bio: string | null;
          onboarded: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          sport?: Sport | null;
          skill_level?: SkillLevel | null;
          home_mountain_id?: number | null;
          bio?: string | null;
          onboarded?: boolean;
        };
        Update: {
          display_name?: string;
          sport?: Sport | null;
          skill_level?: SkillLevel | null;
          home_mountain_id?: number | null;
          bio?: string | null;
          onboarded?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_home_mountain_id_fkey';
            columns: ['home_mountain_id'];
            isOneToOne: false;
            referencedRelation: 'mountains';
            referencedColumns: ['id'];
          },
        ];
      };
      buddy_requests: {
        Row: {
          id: number;
          requester_id: string;
          addressee_id: string;
          status: BuddyStatus;
          created_at: string;
          responded_at: string | null;
        };
        Insert: {
          requester_id?: string;
          addressee_id: string;
          status?: BuddyStatus;
        };
        Update: {
          status?: BuddyStatus;
          responded_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'buddy_requests_requester_id_fkey';
            columns: ['requester_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'buddy_requests_addressee_id_fkey';
            columns: ['addressee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          id: number;
          sender_id: string;
          recipient_id: string;
          body: string;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          sender_id?: string;
          recipient_id: string;
          body: string;
        };
        Update: {
          read_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      trips: {
        Row: {
          id: number;
          host_id: string;
          mountain_id: number;
          trip_date: string;
          title: string;
          notes: string | null;
          min_skill: SkillLevel | null;
          max_riders: number;
          created_at: string;
        };
        Insert: {
          host_id?: string;
          mountain_id: number;
          trip_date: string;
          title: string;
          notes?: string | null;
          min_skill?: SkillLevel | null;
          max_riders?: number;
        };
        Update: {
          mountain_id?: number;
          trip_date?: string;
          title?: string;
          notes?: string | null;
          min_skill?: SkillLevel | null;
          max_riders?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'trips_host_id_fkey';
            columns: ['host_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trips_mountain_id_fkey';
            columns: ['mountain_id'];
            isOneToOne: false;
            referencedRelation: 'mountains';
            referencedColumns: ['id'];
          },
        ];
      };
      trip_members: {
        Row: {
          trip_id: number;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          trip_id: number;
          user_id?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: 'trip_members_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trip_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      location_sharing: {
        Row: {
          user_id: string;
          sharing_until: string | null;
          updated_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      location_shares: {
        Row: {
          owner_id: string;
          viewer_id: string;
          created_at: string;
        };
        Insert: {
          owner_id?: string;
          viewer_id: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: 'location_shares_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'location_shares_viewer_id_fkey';
            columns: ['viewer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      live_locations: {
        Row: {
          user_id: string;
          latitude: number;
          longitude: number;
          accuracy_m: number | null;
          heading: number | null;
          updated_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: 'live_locations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      accept_buddy_request: {
        Args: { request_id: number };
        Returns: undefined;
      };
      are_buddies: {
        Args: { a: string; b: string };
        Returns: boolean;
      };
      mark_conversation_read: {
        Args: { other_id: string };
        Returns: undefined;
      };
      start_location_sharing: {
        Args: { duration_minutes: number };
        Returns: string;
      };
      stop_location_sharing: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      update_my_location: {
        Args: { lat: number; lng: number; accuracy?: number | null; heading_deg?: number | null };
        Returns: boolean;
      };
      can_see_location: {
        Args: { owner: string };
        Returns: boolean;
      };
      get_conversations: {
        Args: Record<PropertyKey, never>;
        Returns: {
          buddy_id: string;
          display_name: string;
          last_body: string;
          last_at: string;
          last_sender_id: string;
          unread_count: number;
        }[];
      };
    };
    Enums: {
      sport: Sport;
      skill_level: SkillLevel;
      buddy_status: BuddyStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type Tables = Database['public']['Tables'];
export type Mountain = Tables['mountains']['Row'];
export type Profile = Tables['profiles']['Row'];
export type BuddyRequest = Tables['buddy_requests']['Row'];
export type Message = Tables['messages']['Row'];
export type Trip = Tables['trips']['Row'];
export type TripMember = Tables['trip_members']['Row'];
export type LiveLocation = Tables['live_locations']['Row'];
export type Conversation = Database['public']['Functions']['get_conversations']['Returns'][number];
