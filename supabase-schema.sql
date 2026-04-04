-- NeuronVault Schema (nv_ prefix to namespace within shared Supabase project)

-- User profiles
CREATE TABLE public.nv_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'lifetime')),
  note_count INTEGER DEFAULT 0,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.nv_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.nv_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.nv_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.nv_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.nv_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.nv_profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER nv_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.nv_handle_new_user();

-- Notes
CREATE TABLE public.nv_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT DEFAULT '',
  parent_id UUID REFERENCES public.nv_notes(id) ON DELETE SET NULL,
  branch_name TEXT DEFAULT 'main',
  is_branch BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.nv_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own notes" ON public.nv_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes" ON public.nv_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON public.nv_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON public.nv_notes FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX nv_notes_user_id_idx ON public.nv_notes(user_id);
CREATE INDEX nv_notes_parent_id_idx ON public.nv_notes(parent_id);
CREATE INDEX nv_notes_fts_idx ON public.nv_notes USING GIN (to_tsvector('english', title || ' ' || content));

-- Note versions (git-style history)
CREATE TABLE public.nv_note_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.nv_notes(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  diff_from_previous JSONB,
  commit_message TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(note_id, version_number)
);

ALTER TABLE public.nv_note_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own note versions" ON public.nv_note_versions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.nv_notes WHERE id = note_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can insert own note versions" ON public.nv_note_versions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.nv_notes WHERE id = note_id AND user_id = auth.uid())
  );

CREATE INDEX nv_note_versions_note_id_idx ON public.nv_note_versions(note_id);

-- Bidirectional links
CREATE TABLE public.nv_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_note_id UUID NOT NULL REFERENCES public.nv_notes(id) ON DELETE CASCADE,
  target_note_id UUID NOT NULL REFERENCES public.nv_notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_note_id, target_note_id)
);

ALTER TABLE public.nv_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own links" ON public.nv_links FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own links" ON public.nv_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own links" ON public.nv_links FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX nv_links_source_idx ON public.nv_links(source_note_id);
CREATE INDEX nv_links_target_idx ON public.nv_links(target_note_id);

-- Free tier enforcement
CREATE OR REPLACE FUNCTION nv_check_note_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT plan FROM nv_profiles WHERE id = NEW.user_id) = 'free' THEN
    IF (SELECT COUNT(*) FROM nv_notes WHERE user_id = NEW.user_id AND NOT is_archived) >= 50 THEN
      RAISE EXCEPTION 'Free plan limit: 50 notes. Upgrade to Pro for unlimited.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER nv_enforce_note_limit
  BEFORE INSERT ON public.nv_notes
  FOR EACH ROW EXECUTE FUNCTION nv_check_note_limit();

-- Full-text search function
CREATE OR REPLACE FUNCTION nv_search_notes(search_query TEXT, user_uuid UUID)
RETURNS SETOF public.nv_notes AS $$
  SELECT * FROM public.nv_notes
  WHERE user_id = user_uuid
    AND NOT is_archived
    AND to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', search_query)
  ORDER BY ts_rank(to_tsvector('english', title || ' ' || content), plainto_tsquery('english', search_query)) DESC
  LIMIT 50;
$$ LANGUAGE sql SECURITY DEFINER;

-- Metrics table (for NemoClaw monitoring)
CREATE TABLE public.nv_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type TEXT NOT NULL,
  value NUMERIC DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.nv_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON public.nv_metrics FOR ALL USING (false);

-- NemoClaw task queue
CREATE TABLE public.nemoclaw_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'running', 'completed', 'failed')),
  payload JSONB DEFAULT '{}',
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.nemoclaw_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON public.nemoclaw_tasks FOR ALL USING (false);

-- Update note_count on profile when notes change
CREATE OR REPLACE FUNCTION nv_update_note_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE nv_profiles SET note_count = note_count + 1, updated_at = NOW() WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE nv_profiles SET note_count = note_count - 1, updated_at = NOW() WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER nv_note_count_trigger
  AFTER INSERT OR DELETE ON public.nv_notes
  FOR EACH ROW EXECUTE FUNCTION nv_update_note_count();
