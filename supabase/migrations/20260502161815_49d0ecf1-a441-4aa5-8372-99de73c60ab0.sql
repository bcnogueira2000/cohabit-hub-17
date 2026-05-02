
-- Comments / thread messages on requests
create table public.request_comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  author_user_id uuid not null,
  author_name text not null,
  author_role text not null check (author_role in ('staff','resident')),
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index request_comments_request_idx on public.request_comments(request_id, created_at);

alter table public.request_comments enable row level security;

create policy "staff full access request_comments"
  on public.request_comments for all to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

create policy "resident read own request comments"
  on public.request_comments for select to authenticated
  using (
    exists (
      select 1 from public.requests r
      where r.id = request_comments.request_id
        and r.resident_id = public.current_resident_id()
    )
  );

create policy "resident insert own request comments"
  on public.request_comments for insert to authenticated
  with check (
    author_user_id = auth.uid()
    and author_role = 'resident'
    and exists (
      select 1 from public.requests r
      where r.id = request_comments.request_id
        and r.resident_id = public.current_resident_id()
    )
  );

-- Trigger: notify the other side on new comment
create or replace function public.notify_on_request_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request requests;
  v_resident_user uuid;
begin
  select * into v_request from public.requests where id = NEW.request_id;
  if v_request is null then return NEW; end if;

  if NEW.author_role = 'resident' then
    -- Notify staff (assigned user, or all staff if unassigned)
    if v_request.assigned_to_user_id is not null then
      insert into public.notifications (user_id, type, title, body, link)
      values (v_request.assigned_to_user_id, 'request_comment',
              'Nova mensagem em ' || v_request.code,
              NEW.author_name || ': ' || left(NEW.body, 120),
              '/requests/' || v_request.id);
    else
      insert into public.notifications (user_id, type, title, body, link)
      select ur.user_id, 'request_comment',
             'Nova mensagem em ' || v_request.code,
             NEW.author_name || ': ' || left(NEW.body, 120),
             '/requests/' || v_request.id
      from public.user_roles ur
      where ur.role in ('staff','manager','admin');
    end if;
  else
    -- Notify the resident
    if v_request.resident_id is not null then
      select user_id into v_resident_user from public.residents where id = v_request.resident_id;
      if v_resident_user is not null then
        insert into public.notifications (user_id, type, title, body, link)
        values (v_resident_user, 'request_comment',
                'Resposta ao teu pedido ' || v_request.code,
                NEW.author_name || ': ' || left(NEW.body, 120),
                '/app/requests/' || v_request.id);
      end if;
    end if;
  end if;

  return NEW;
end;
$$;

create trigger request_comments_notify
after insert on public.request_comments
for each row execute function public.notify_on_request_comment();

-- Realtime
alter publication supabase_realtime add table public.request_comments;
