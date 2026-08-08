-- Required for the codReconciliation job's upsert (one row per
-- courier + period) to work correctly.
alter table cod_remittances
  add constraint cod_remittances_courier_period_unique unique (courier_id, period_start, period_end);
