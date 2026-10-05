-- QA fixture: reset the local dev account to mirror the state shown in the reference captures
-- (9 extractions: 5 tastelabs pages on 5 Oct + trycanopy/reducto on 16 Sept, 1 search, 1 adherence run,
-- 17 credits spent / 3 remaining). Local dev database only. usage: psql onbrand -f qa/fixture.sql
begin;

create temp table keep(id text, ts timestamptz);
insert into keep values
  ('ext_23fc714i9nn4b3ot', '2026-10-05 14:04:50+05:30'), -- tastelabs.com/case-study
  ('ext_cl118mxxl9doqtbw', '2026-10-05 14:04:40+05:30'), -- tastelabs.com/careers
  ('ext_hsa95e2kfxi3dv8v', '2026-10-05 14:04:30+05:30'), -- tastelabs.com/contact
  ('ext_jmo8v87s2ycsdxu6', '2026-10-05 14:04:20+05:30'), -- tastelabs.com/blog
  ('ext_3mz0zlxptz6dw1zl', '2026-10-05 14:04:00+05:30'), -- tastelabs.com
  ('ext_c7wzipm3n26vlnv7', '2026-09-16 18:30:00+05:30'), -- trycanopy.space
  ('ext_ua3o2hwxx777oef7', '2026-09-16 17:20:00+05:30'), -- reducto.ai/pricing
  ('ext_4bjdahatahrhoj1t', '2026-09-16 17:10:00+05:30'), -- reducto.ai
  ('ext_de4eygpros054er1', '2026-09-16 16:00:00+05:30'); -- trycanopy.space

update adherence_runs set reference_extraction_id = 'ext_4bjdahatahrhoj1t', design_extraction_id = 'ext_ua3o2hwxx777oef7',
  created_at = '2026-09-16 17:30:00+05:30', finished_at = '2026-09-16 17:34:01+05:30', latency_ms = 241000
  where id = 'adh_oz2y8u6zloj2j0kk';
delete from adherence_runs where user_id = 'dev_user' and id <> 'adh_oz2y8u6zloj2j0kk';

delete from extractions where user_id = 'dev_user' and id not in (select id from keep);
update extractions e set created_at = k.ts, started_at = k.ts, finished_at = k.ts + interval '219 seconds', latency_ms = 219000,
  credits = case when e.url like 'https://reducto.ai%' then 0 else 2 end,
  source = case when e.url like 'https://tastelabs.com%' then 'cache' else 'fresh' end
  from keep k where e.id = k.id;

delete from searches where user_id = 'dev_user' and id <> 'srch_0idy5zas4bvd3oxl';
update searches set created_at = '2026-09-16 17:00:00+05:30' where id = 'srch_0idy5zas4bvd3oxl';

delete from usage_events where user_id = 'dev_user';
insert into usage_events (id, user_id, feature, credits, latency_ms, ref_id, created_at)
  select 'use_' || e.id, 'dev_user', 'extraction', e.credits, 219000, e.id, e.created_at from extractions e where e.user_id = 'dev_user';
insert into usage_events (id, user_id, feature, credits, latency_ms, ref_id, created_at) values
  ('use_qa_search', 'dev_user', 'search', 1, 2000, 'srch_0idy5zas4bvd3oxl', '2026-09-16 17:00:00+05:30'),
  ('use_qa_adh', 'dev_user', 'adherence', 2, 241000, 'adh_oz2y8u6zloj2j0kk', '2026-09-16 17:30:00+05:30');

update users set credits = 3 where id = 'dev_user';
commit;
