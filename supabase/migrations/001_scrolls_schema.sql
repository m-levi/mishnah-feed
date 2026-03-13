-- Scroll platform schema
-- Creates tables for scrolls, scroll items, user subscriptions, and read tracking

-- ─── scrolls: The core entity ───────────────────────────────
create table if not exists scrolls (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references auth.users(id),
  title text not null,
  description text,
  scroll_type text not null check (scroll_type in ('structured', 'calendar', 'custom')),
  source_type text not null check (source_type in ('mishnayos', 'gemara', 'chumash', 'mixed')),
  config jsonb not null default '{}',
  is_public boolean default false,
  is_template boolean default false,
  follower_count int default 0,
  cover_emoji text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── scroll_items: Content units within a scroll ────────────
create table if not exists scroll_items (
  id uuid primary key default gen_random_uuid(),
  scroll_id uuid references scrolls(id) on delete cascade,
  position int not null,
  slug text not null,
  ref text not null,
  source_type text not null,
  display_name text not null,
  content jsonb,
  generated_at timestamptz,
  created_at timestamptz default now(),
  unique(scroll_id, position)
);

-- ─── user_scrolls: Follow/subscription relationship ─────────
create table if not exists user_scrolls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  scroll_id uuid references scrolls(id) on delete cascade,
  current_position int default 0,
  is_creator boolean default false,
  pinned boolean default false,
  created_at timestamptz default now(),
  unique(user_id, scroll_id)
);

-- ─── scroll_item_reads: Track what user has seen ────────────
create table if not exists scroll_item_reads (
  user_id uuid references auth.users(id) on delete cascade,
  scroll_item_id uuid references scroll_items(id) on delete cascade,
  read_at timestamptz default now(),
  primary key (user_id, scroll_item_id)
);

-- ─── Indexes ────────────────────────────────────────────────
create index if not exists idx_scrolls_creator on scrolls(creator_id);
create index if not exists idx_scrolls_public on scrolls(is_public) where is_public = true;
create index if not exists idx_scrolls_template on scrolls(is_template) where is_template = true;
create index if not exists idx_scroll_items_scroll on scroll_items(scroll_id, position);
create index if not exists idx_user_scrolls_user on user_scrolls(user_id);
create index if not exists idx_user_scrolls_scroll on user_scrolls(scroll_id);
create index if not exists idx_scroll_item_reads_user on scroll_item_reads(user_id);

-- ─── RLS Policies ───────────────────────────────────────────
alter table scrolls enable row level security;
alter table scroll_items enable row level security;
alter table user_scrolls enable row level security;
alter table scroll_item_reads enable row level security;

-- scrolls: anyone can read public/template scrolls
create policy "Public scrolls are viewable by everyone"
  on scrolls for select
  using (is_public = true or is_template = true or creator_id = auth.uid());

create policy "Users can create scrolls"
  on scrolls for insert
  with check (auth.uid() = creator_id);

create policy "Creators can update their scrolls"
  on scrolls for update
  using (auth.uid() = creator_id);

create policy "Creators can delete their scrolls"
  on scrolls for delete
  using (auth.uid() = creator_id);

-- scroll_items: readable if scroll is public or user follows it
create policy "Scroll items are viewable for accessible scrolls"
  on scroll_items for select
  using (
    exists (
      select 1 from scrolls
      where scrolls.id = scroll_items.scroll_id
        and (scrolls.is_public = true or scrolls.is_template = true or scrolls.creator_id = auth.uid())
    )
    or exists (
      select 1 from user_scrolls
      where user_scrolls.scroll_id = scroll_items.scroll_id
        and user_scrolls.user_id = auth.uid()
    )
  );

create policy "Scroll creators can manage items"
  on scroll_items for all
  using (
    exists (
      select 1 from scrolls
      where scrolls.id = scroll_items.scroll_id
        and scrolls.creator_id = auth.uid()
    )
  );

-- user_scrolls: users manage their own subscriptions
create policy "Users can view their own subscriptions"
  on user_scrolls for select
  using (auth.uid() = user_id);

create policy "Users can follow scrolls"
  on user_scrolls for insert
  with check (auth.uid() = user_id);

create policy "Users can update their subscriptions"
  on user_scrolls for update
  using (auth.uid() = user_id);

create policy "Users can unfollow scrolls"
  on user_scrolls for delete
  using (auth.uid() = user_id);

-- scroll_item_reads: users manage their own read tracking
create policy "Users can view their read history"
  on scroll_item_reads for select
  using (auth.uid() = user_id);

create policy "Users can mark items as read"
  on scroll_item_reads for insert
  with check (auth.uid() = user_id);

-- ─── Function to update follower count ──────────────────────
create or replace function update_scroll_follower_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update scrolls set follower_count = follower_count + 1 where id = NEW.scroll_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update scrolls set follower_count = follower_count - 1 where id = OLD.scroll_id;
    return OLD;
  end if;
end;
$$ language plpgsql security definer;

create trigger on_user_scroll_change
  after insert or delete on user_scrolls
  for each row execute function update_scroll_follower_count();
