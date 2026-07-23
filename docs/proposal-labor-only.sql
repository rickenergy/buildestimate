-- Labor-only proposals on the public client page (/p/[token]).
--
-- The client-facing proposal reads estimate data through the SECURITY DEFINER
-- RPC get_proposal_by_token (anon has no direct table access). This patch adds
-- two keys to the returned `estimate` object so the page can honor the
-- "with / without material" choice:
--   - materials_included : the GC's toggle
--   - client_total       : material-excluded total when the toggle is off,
--                          otherwise the full estimate total
--
-- The page code already falls back to the full total when these keys are
-- absent, so applying this is safe and backward-compatible. Run once in the
-- Supabase SQL editor (or via MCP) for project buildestimate-ai
-- (snvmpzlgngoohqovzeij). Only the `estimate` jsonb block changed vs the
-- current definition.

CREATE OR REPLACE FUNCTION public.get_proposal_by_token(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb;
begin
  select jsonb_build_object(
    'proposal', jsonb_build_object(
      'id', p.id, 'scope', p.scope, 'exclusions', p.exclusions, 'terms', p.terms,
      'valid_until', p.valid_until, 'status', p.status, 'accepted_at', p.accepted_at,
      'client_name_signed', p.client_name_signed),
    'estimate', jsonb_build_object(
      'title', e.title, 'trade', e.trade, 'total', e.total, 'tax_pct', e.tax_pct,
      'est_days', e.est_days, 'location', e.location, 'area_sqft', e.area_sqft, 'crew_size', e.crew_size,
      'payment_schedule_preset', e.payment_schedule_preset, 'show_rules', e.show_rules,
      'materials_included', coalesce(e.materials_included, true),
      'client_total', case when coalesce(e.materials_included, true) then e.total
        else round(
          ( (e.labor_cost + e.demo_cost)
            + (e.labor_cost + e.demo_cost) * e.overhead_pct / 100.0
            + ((e.labor_cost + e.demo_cost) + (e.labor_cost + e.demo_cost) * e.overhead_pct / 100.0) * e.profit_pct / 100.0
          ) * (1 + e.tax_pct / 100.0), 2) end),
    'contractor', jsonb_build_object(
      'company_name', pr.company_name, 'full_name', pr.full_name, 'phone', pr.phone,
      'logo_url', pr.logo_url, 'banner_url', pr.banner_url, 'banner_position', pr.banner_position,
      'banner_zoom', pr.banner_zoom,
      'company_address', pr.company_address, 'company_email', pr.company_email,
      'license_number', pr.license_number, 'language', pr.language,
      'licenses', coalesce((select jsonb_agg(jsonb_build_object('license_type', l.license_type, 'license_number', l.license_number, 'state', l.state)) from public.company_licenses l where l.user_id = pr.id), '[]'::jsonb),
      'insurances', coalesce((select jsonb_agg(jsonb_build_object('provider', ins.provider, 'policy_number', ins.policy_number, 'coverage_amount', ins.coverage_amount)) from public.company_insurances ins where ins.user_id = pr.id), '[]'::jsonb)
    ),
    'client', case when c.id is null then null else jsonb_build_object('name', c.name, 'address', c.address) end,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('kind', i.kind, 'description', i.description, 'qty', i.qty, 'unit', i.unit) order by i.sort_order)
      from public.estimate_items i where i.estimate_id = e.id), '[]'::jsonb)
  ) into result
  from public.proposals p
  join public.estimates e on e.id = p.estimate_id
  join public.profiles pr on pr.id = p.user_id
  left join public.clients c on c.id = e.client_id
  where p.token = p_token and p.status <> 'draft';

  update public.proposals set status = 'viewed', viewed_at = now()
  where token = p_token and status = 'sent';
  return result;
end $function$;
