-- Images are private. The first path segment is always the owning user's UUID.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-images', 'exercise-images', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy exercise_images_read on storage.objects for select to authenticated
    using (bucket_id = 'exercise-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy exercise_images_insert on storage.objects for insert to authenticated
    with check (bucket_id = 'exercise-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy exercise_images_delete on storage.objects for delete to authenticated
    using (bucket_id = 'exercise-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
