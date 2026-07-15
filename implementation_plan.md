# Implementation Plan - Auth, Profile, and Comments Integration

We will build a secure and premium authentication system (Log In, Sign Up, Password Reset) with liquid glass styling, a fully functional profile dashboard, a robust commenting and replies section on details pages, and ensure all mobile header buttons work correctly.

## Proposed SQL Migration

We need to create a `comments` table in Supabase. The migration script will be applied to the database.

```sql
-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    movie_id VARCHAR(255) NOT NULL,
    media_type VARCHAR(50) NOT NULL, -- 'movie', 'tv', or 'dubbed'
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read access to comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert to comments" ON public.comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow users to delete their own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);
```

---

## Proposed Changes

### [NEW] [AuthContext.tsx](file:///Users/zanafaroqhado/Downloads/flkrd-movies%20%2827%29%202/contexts/AuthContext.tsx)
- Create a global React Context to manage Supabase Auth state (session, user profile, login, sign up, sign out, reset password).
- Sync profile data with `localStorage` for backwards compatibility.

### [MODIFY] [App.tsx](file:///Users/zanafaroqhado/Downloads/flkrd-movies%20%2827%29%202/App.tsx)
- Wrap the application in the new `AuthProvider` to expose authentication state to all pages and components.

### [MODIFY] [ProfilePage.tsx](file:///Users/zanafaroqhado/Downloads/flkrd-movies%20%2827%29%202/pages/ProfilePage.tsx)
- Check authentication state:
  - **If Guest (Unauthenticated)**: Render the liquid glass auth panel with Login, Sign Up, and Password Reset screens, as requested in the design mockups.
  - **If Authenticated**: Render the user's Profile Dashboard with watch statistics, user preferences, and a functional Sign Out button.

### [NEW] [CommentSection.tsx](file:///Users/zanafaroqhado/Downloads/flkrd-movies%20%2827%29%202/components/CommentSection.tsx)
- Create a reusable comment engine:
  - Fetches comments from Supabase matching the current `movieId` and `mediaType`.
  - Supports nested reply threads.
  - Shows login CTA with redirect to login if unauthenticated.
  - Supports deleting comments for the comment author.

### [MODIFY] [DetailPage.tsx](file:///Users/zanafaroqhado/Downloads/flkrd-movies%20%2827%29%202/pages/DetailPage.tsx)
- Add `<CommentSection movieId={id} mediaType="movie" />` below the movie details / similar movies row.

### [MODIFY] [TVDetailPage.tsx](file:///Users/zanafaroqhado/Downloads/flkrd-movies%20%2827%29%202/pages/TVDetailPage.tsx)
- Add `<CommentSection movieId={id} mediaType="tv" />` below the show details / seasons list.

### [MODIFY] [DubbedDetailPage.tsx](file:///Users/zanafaroqhado/Downloads/flkrd-movies%20%2827%29%202/pages/DubbedDetailPage.tsx)
- Add `<CommentSection movieId={id} mediaType="dubbed" />` below the dubbed movie details.

### [MODIFY] [Header.tsx](file:///Users/zanafaroqhado/Downloads/flkrd-movies%20%2827%29%202/components/Header.tsx)
- Ensure all mobile actions and settings buttons trigger correctly.
- Update profile avatars to reflect the authenticated user's custom settings or Google profile picture.

---

## Verification Plan

### Automated Verification
- Verify that `npm run build` succeeds with zero errors.

### Manual Verification
- Test SignUp, Login, and Reset Password flows.
- Verify commenting and nested replies under movie/show details.
- Verify mobile drawer actions and drawer header link functionalities.
