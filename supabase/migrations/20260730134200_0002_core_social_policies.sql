/*
# Core Social Media Schema — RLS Policies

Applies row-level security policies to all tables created in 0001_core_social_tables.
All policies use auth.uid() for ownership checks. Profiles are readable by all
authenticated users (required for search/feed). Posts respect visibility + follows.
Messages are scoped to conversation participants. Notifications scoped to recipient.
Admin-only policies check profiles.is_admin.
*/

-- ===== PROFILES =====
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ===== FOLLOWS =====
DROP POLICY IF EXISTS "follows_select_all" ON follows;
CREATE POLICY "follows_select_all" ON follows FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "follows_insert_own" ON follows;
CREATE POLICY "follows_insert_own" ON follows FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "follows_update_own" ON follows;
CREATE POLICY "follows_update_own" ON follows FOR UPDATE
  TO authenticated USING (follower_id = auth.uid() OR following_id = auth.uid())
  WITH CHECK (follower_id = auth.uid() OR following_id = auth.uid());

DROP POLICY IF EXISTS "follows_delete_own" ON follows;
CREATE POLICY "follows_delete_own" ON follows FOR DELETE
  TO authenticated USING (follower_id = auth.uid());

-- ===== POSTS =====
DROP POLICY IF EXISTS "posts_select_visible" ON posts;
CREATE POLICY "posts_select_visible" ON posts FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR visibility = 'public'
    OR (
      visibility = 'followers'
      AND EXISTS (
        SELECT 1 FROM follows
        WHERE follows.follower_id = auth.uid()
          AND follows.following_id = posts.user_id
          AND follows.status = 'accepted'
      )
    )
  );

DROP POLICY IF EXISTS "posts_insert_own" ON posts;
CREATE POLICY "posts_insert_own" ON posts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "posts_update_own" ON posts;
CREATE POLICY "posts_update_own" ON posts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "posts_delete_own" ON posts;
CREATE POLICY "posts_delete_own" ON posts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== COMMENTS =====
DROP POLICY IF EXISTS "comments_select_visible" ON comments;
CREATE POLICY "comments_select_visible" ON comments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "comments_insert_own" ON comments;
CREATE POLICY "comments_insert_own" ON comments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "comments_delete_own" ON comments;
CREATE POLICY "comments_delete_own" ON comments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== LIKES =====
DROP POLICY IF EXISTS "likes_select_all" ON likes;
CREATE POLICY "likes_select_all" ON likes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "likes_insert_own" ON likes;
CREATE POLICY "likes_insert_own" ON likes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "likes_delete_own" ON likes;
CREATE POLICY "likes_delete_own" ON likes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== COMMENT LIKES =====
DROP POLICY IF EXISTS "comment_likes_select_all" ON comment_likes;
CREATE POLICY "comment_likes_select_all" ON comment_likes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "comment_likes_insert_own" ON comment_likes;
CREATE POLICY "comment_likes_insert_own" ON comment_likes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "comment_likes_delete_own" ON comment_likes;
CREATE POLICY "comment_likes_delete_own" ON comment_likes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== STORIES =====
DROP POLICY IF EXISTS "stories_select_visible" ON stories;
CREATE POLICY "stories_select_visible" ON stories FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM follows
      WHERE follows.follower_id = auth.uid()
        AND follows.following_id = stories.user_id
        AND follows.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "stories_insert_own" ON stories;
CREATE POLICY "stories_insert_own" ON stories FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "stories_delete_own" ON stories;
CREATE POLICY "stories_delete_own" ON stories FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== STORY VIEWS =====
DROP POLICY IF EXISTS "story_views_select_own_or_owner" ON story_views;
CREATE POLICY "story_views_select_own_or_owner" ON story_views FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM stories WHERE stories.id = story_views.story_id AND stories.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "story_views_insert_own" ON story_views;
CREATE POLICY "story_views_insert_own" ON story_views FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- ===== STORY REPLIES =====
DROP POLICY IF EXISTS "story_replies_select_owner_or_sender" ON story_replies;
CREATE POLICY "story_replies_select_owner_or_sender" ON story_replies FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM stories WHERE stories.id = story_replies.story_id AND stories.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "story_replies_insert_own" ON story_replies;
CREATE POLICY "story_replies_insert_own" ON story_replies FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- ===== CONVERSATIONS =====
DROP POLICY IF EXISTS "conversations_select_participant" ON conversations;
CREATE POLICY "conversations_select_participant" ON conversations FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
        AND conversation_participants.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "conversations_insert_any" ON conversations;
CREATE POLICY "conversations_insert_any" ON conversations FOR INSERT
  TO authenticated WITH CHECK (true);

-- ===== CONVERSATION PARTICIPANTS =====
DROP POLICY IF EXISTS "conv_participants_select_member" ON conversation_participants;
CREATE POLICY "conv_participants_select_member" ON conversation_participants FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "conv_participants_insert_own_or_conv" ON conversation_participants;
CREATE POLICY "conv_participants_insert_own_or_conv" ON conversation_participants FOR INSERT
  TO authenticated WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id AND cp.user_id = auth.uid()
    )
  );

-- ===== MESSAGES =====
DROP POLICY IF EXISTS "messages_select_participant" ON messages;
CREATE POLICY "messages_select_participant" ON messages FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
        AND conversation_participants.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "messages_insert_participant" ON messages;
CREATE POLICY "messages_insert_participant" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
        AND conversation_participants.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "messages_update_participant" ON messages;
CREATE POLICY "messages_update_participant" ON messages FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
        AND conversation_participants.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
        AND conversation_participants.user_id = auth.uid()
    )
  );

-- ===== NOTIFICATIONS =====
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert_any" ON notifications;
CREATE POLICY "notifications_insert_any" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- ===== SAVED POSTS =====
DROP POLICY IF EXISTS "saved_posts_select_own" ON saved_posts;
CREATE POLICY "saved_posts_select_own" ON saved_posts FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "saved_posts_insert_own" ON saved_posts;
CREATE POLICY "saved_posts_insert_own" ON saved_posts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_posts_delete_own" ON saved_posts;
CREATE POLICY "saved_posts_delete_own" ON saved_posts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== REPORTS =====
DROP POLICY IF EXISTS "reports_select_own_or_admin" ON reports;
CREATE POLICY "reports_select_own_or_admin" ON reports FOR SELECT
  TO authenticated USING (
    reporter_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "reports_insert_own" ON reports;
CREATE POLICY "reports_insert_own" ON reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "reports_update_admin" ON reports;
CREATE POLICY "reports_update_admin" ON reports FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- ===== USER SETTINGS =====
DROP POLICY IF EXISTS "settings_select_own" ON user_settings;
CREATE POLICY "settings_select_own" ON user_settings FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "settings_insert_own" ON user_settings;
CREATE POLICY "settings_insert_own" ON user_settings FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "settings_update_own" ON user_settings;
CREATE POLICY "settings_update_own" ON user_settings FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ===== MUTED USERS =====
DROP POLICY IF EXISTS "muted_select_own" ON muted_users;
CREATE POLICY "muted_select_own" ON muted_users FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "muted_insert_own" ON muted_users;
CREATE POLICY "muted_insert_own" ON muted_users FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "muted_delete_own" ON muted_users;
CREATE POLICY "muted_delete_own" ON muted_users FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== BLOCKED USERS =====
DROP POLICY IF EXISTS "blocked_select_own" ON blocked_users;
CREATE POLICY "blocked_select_own" ON blocked_users FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "blocked_insert_own" ON blocked_users;
CREATE POLICY "blocked_insert_own" ON blocked_users FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "blocked_delete_own" ON blocked_users;
CREATE POLICY "blocked_delete_own" ON blocked_users FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== HASHTAGS =====
DROP POLICY IF EXISTS "hashtags_select_all" ON hashtags;
CREATE POLICY "hashtags_select_all" ON hashtags FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "hashtags_insert_any" ON hashtags;
CREATE POLICY "hashtags_insert_any" ON hashtags FOR INSERT
  TO authenticated WITH CHECK (true);

-- ===== POST TAGS =====
DROP POLICY IF EXISTS "post_tags_select_all" ON post_tags;
CREATE POLICY "post_tags_select_all" ON post_tags FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "post_tags_insert_any" ON post_tags;
CREATE POLICY "post_tags_insert_any" ON post_tags FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "post_tags_delete_own" ON post_tags;
CREATE POLICY "post_tags_delete_own" ON post_tags FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = post_tags.post_id AND posts.user_id = auth.uid())
  );
