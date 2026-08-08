-- Migration: create trigger/function to send welcome message from official_GraficNeo
-- Date: 2026-08-08

-- This function sends a welcome message from the official account (username = 'official_GraficNeo')
-- to any newly inserted profile. It will only insert the welcome message once per conversation by
-- checking for an existing message with the exact content.

create or replace function public.send_welcome_message_on_profile_insert()
returns trigger as $$
declare
  system_user_id uuid;
  conv_id uuid;
  existing_msg_count int;
  welcome_text text := $$🎉 Welcome to GraficNeo!

We’re happy to have you here! ✨

Connect with others, share your posts, discover new profiles, and be part of the GraficNeo community.

Have fun, be respectful, and enjoy exploring!

Welcome to the community! 🚀$$;
begin
  -- Find the official system account by exact username 'official_GraficNeo'
  select id into system_user_id from public.profiles where username = 'official_GraficNeo' limit 1;

  -- If the official account doesn't exist, do nothing (safe no-op)
  if system_user_id is null then
    return null;
  end if;

  -- See if a conversation already exists that includes both the system user and the new user
  select cp.conversation_id
  into conv_id
  from public.conversation_participants cp
  where cp.user_id = system_user_id
  and cp.conversation_id in (
    select conversation_id from public.conversation_participants where user_id = NEW.id
  )
  limit 1;

  -- If no conversation exists, create one and add both participants
  if conv_id is null then
    insert into public.conversations default values returning id into conv_id;

    insert into public.conversation_participants(conversation_id, user_id)
    values (conv_id, system_user_id), (conv_id, NEW.id);
  end if;

  -- Prevent duplicate welcome message by checking for exact content from the system user
  select count(1) into existing_msg_count
  from public.messages m
  where m.conversation_id = conv_id
    and m.sender_id = system_user_id
    and m.content = welcome_text;

  if existing_msg_count = 0 then
    insert into public.messages(conversation_id, sender_id, content, created_at)
    values (conv_id, system_user_id, welcome_text, now());

    -- Optional: create a notification for the recipient if notifications table exists with these columns
    begin
      insert into public.notifications (user_id, actor_id, type, conversation_id, content, read, created_at)
      values (NEW.id, system_user_id, 'message', conv_id, left(welcome_text, 100), false, now());
    exception when others then
      -- If notifications table/columns differ, ignore the notification error to avoid failing the trigger
      null;
    end;
  end if;

  return null;
end;
$$ language plpgsql security definer;

-- Create trigger on profiles AFTER INSERT

drop trigger if exists profiles_send_welcome_trigger on public.profiles;

create trigger profiles_send_welcome_trigger
after insert on public.profiles
for each row
execute procedure public.send_welcome_message_on_profile_insert();
