drop policy if exists "staff read contract templates" on storage.objects;
create policy "staff read contract templates"
on storage.objects for select to authenticated
using (bucket_id = 'contract-templates' and public.is_staff(auth.uid()));

drop policy if exists "staff write contract templates" on storage.objects;
create policy "staff write contract templates"
on storage.objects for insert to authenticated
with check (bucket_id = 'contract-templates' and public.is_staff(auth.uid()));

drop policy if exists "staff update contract templates" on storage.objects;
create policy "staff update contract templates"
on storage.objects for update to authenticated
using (bucket_id = 'contract-templates' and public.is_staff(auth.uid()))
with check (bucket_id = 'contract-templates' and public.is_staff(auth.uid()));

drop policy if exists "staff delete contract templates" on storage.objects;
create policy "staff delete contract templates"
on storage.objects for delete to authenticated
using (bucket_id = 'contract-templates' and public.is_staff(auth.uid()));

drop policy if exists "staff upload resident documents" on storage.objects;
create policy "staff upload resident documents"
on storage.objects for insert to authenticated
with check (bucket_id = 'resident-documents' and public.is_staff(auth.uid()));

drop policy if exists "staff update resident documents" on storage.objects;
create policy "staff update resident documents"
on storage.objects for update to authenticated
using (bucket_id = 'resident-documents' and public.is_staff(auth.uid()))
with check (bucket_id = 'resident-documents' and public.is_staff(auth.uid()));

alter table public.contracts add column if not exists regular_rent_amount numeric(10,2);