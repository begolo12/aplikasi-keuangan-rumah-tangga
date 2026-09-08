/**
 * SQL Queries untuk Financial Events (CRUD + Recurrence)
 * Event Types: bonus, insurance_renewal, tax_deadline, investment_contribution
 */

/**
 * INSERT - Create new financial event
 */
export const INSERT_EVENT_SQL = `
  INSERT INTO financial_events (
    user_id, title, type, date, amount, description,
    recurrence_rule, notification_days_before, is_active
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  RETURNING id, created_at, updated_at
`;

/**
 * GET BY ID - Fetch single event
 */
export const GET_EVENT_BY_ID_SQL = `
  SELECT * FROM financial_events
  WHERE id = $1 AND user_id = $2
`;

/**
 * GET ALL - List all events for user (ordered by date)
 */
export const GET_ALL_EVENTS_SQL = `
  SELECT * FROM financial_events
  WHERE user_id = $1
  ORDER BY date ASC, title ASC
`;

/**
 * GET UPCOMING - Get upcoming events within X days from today
 * Used by ReminderScheduler for notifications
 * @param userId - User ID
 * @param daysAhead - Days to look ahead (default 30)
 */
export const GET_UPCOMING_EVENTS_SQL = `
  SELECT *,
    date - CURRENT_DATE AS days_until
  FROM financial_events
  WHERE user_id = $1
    AND is_active = TRUE
    AND date >= CURRENT_DATE
    AND date <= CURRENT_DATE + INTERVAL '${$2} days'
  ORDER BY date ASC
`;

/**
 * GET EVENTS BY MONTH RANGE - For calendar view display
 * Returns events in specific month range with calculated color indicator
 * @param userId - User ID
 * @param startDate - Start of month
 * @param endDate - End of month
 */
export const GET_EVENTS_BY_MONTH_RANGE_SQL = `
  SELECT *,
    CASE
      WHEN type = 'bonus' THEN '#10b181'
      WHEN type = 'insurance_renewal' THEN '#f59e0b'
      WHEN type = 'tax_deadline' THEN '#ef4444'
      WHEN type = 'investment_contribution' THEN '#3b82f6'
    END as indicator_color
  FROM financial_events
  WHERE user_id = $1
    AND date >= $2
    AND date <= $3
  ORDER BY date ASC, title ASC
`;

/**
 * UPDATE - Modify existing event
 */
export const UPDATE_EVENT_SQL = `
  UPDATE financial_events
  SET title = $2,
    type = $3,
    date = $4,
    amount = $5,
    description = $6,
    recurrence_rule = $7,
    notification_days_before = $8,
    is_active = $9,
    updated_at = NOW()
  WHERE id = $10 AND user_id = $11
  RETURNING *
`;

/**
 * DELETE - Soft delete (set is_active = FALSE)
 */
export const DELETE_EVENT_SQL = `
  UPDATE financial_events
  SET is_active = FALSE,
    updated_at = NOW()
  WHERE id = $1 AND user_id = $2
  RETURNING id
`;

/**
 * PERMANENT DELETE - Hard delete from database
 * Use with caution (e.g., admin cleanup)
 */
export const PERMANENT_DELETE_EVENT_SQL = `
  DELETE FROM financial_events
  WHERE id = $1 AND user_id = $2
  RETURNING id
`;

/**
 * GET TODAY'S EVENTS - Quick reference for notifications
 */
export const GET_TODAYS_EVENTS_SQL = `
  SELECT *,
    EXTRACT(HOUR FROM (date - CURRENT_DATE)) as hours_until
  FROM financial_events
  WHERE user_id = $1
    AND is_active = TRUE
    AND date = CURRENT_DATE
  ORDER BY time_asc
`;

/**
 * GET TOMORROWS EVENTS - Next day reminders
 */
export const GET_TOMORROWS_EVENTS_SQL = `
  SELECT * FROM financial_events
  WHERE user_id = $1
    AND is_active = TRUE
    AND date = CURRENT_DATE + INTERVAL '1 day'
  ORDER BY date ASC
`;

/**
 * COUNT ACTIVE EVENTS - Stats for dashboard
 */
export const COUNT_ACTIVE_EVENTS_SQL = `
  SELECT COUNT(*) as total,
    SUM(CASE WHEN type = 'bonus' THEN 1 ELSE 0 END) as bonus_count,
    SUM(CASE WHEN type = 'insurance_renewal' THEN 1 ELSE 0 END) as insurance_count,
    SUM(CASE WHEN type = 'tax_deadline' THEN 1 ELSE 0 END) as tax_count,
    SUM(CASE WHEN type = 'investment_contribution' THEN 1 ELSE 0 END) as investment_count
  FROM financial_events
  WHERE user_id = $1 AND is_active = TRUE
`;

/**
 * EXPAND RECURRENCE - Generate all future instances of a recurring event
 * Uses recursive CTE to expand RRULE strings
 * Supports: FREQ=DAILY|WEEKLY|MONTHLY|YEARLY;INTERVAL=N
 * @param userId - User ID
 * @param eventId - Specific event ID (NULL returns all recurring events)
 * @param startDate - Start date for expansion
 * @param endDate - End date for expansion
 * @param maxInstances - Maximum number of instances to generate (safety limit)
 */
export const EXPAND_RECURRENCE_SQL = `
  RECURSIVE event_instances AS (
    -- Base case: first instance on or after startDate
    SELECT
      e.id as event_id,
      e.type,
      e.title,
      e.amount,
      e.description,
      e.recurrence_rule,
      e.notification_days_before,
      GREATEST(e.date, $3) as instance_date,
      0 as instance_number,
      e.recurrence_rule
    FROM financial_events e
    WHERE e.user_id = $1
      AND ($2 IS NULL OR e.id = $2)
      AND e.is_active = TRUE
      AND e.recurrence_rule IS NOT NULL
      AND e.recurrence_rule != ''
      AND e.date <= $4

    UNION ALL

    -- Recursive case: calculate next occurrence from RRULE
    SELECT
      ei.event_id,
      ei.type,
      ei.title,
      ei.amount,
      ei.description,
      ei.recurrence_rule,
      ei.notification_days_before,
      CASE
        -- DAILY recurrence
        WHEN ei.recurrence_rule LIKE 'FREQ=DAILY%' THEN
          ei.instance_date + INTERVAL '1 day' * COALESCE(
            (SELECT SPLIT_PART(REPLACE(REPLACE(ei.recurrence_rule, 'FREQ=DAILY', ''), 'INTERVAL=', ''), ';', 1)::int),
            1
          )
        -- WEEKLY recurrence
        WHEN ei.recurrence_rule LIKE 'FREQ=WEEKLY%' THEN
          ei.instance_date + INTERVAL '1 week' * COALESCE(
            (SELECT SPLIT_PART(REPLACE(REPLACE(ei.recurrence_rule, 'FREQ=WEEKLY', ''), 'INTERVAL=', ''), ';', 1)::int),
            1
          )
        -- MONTHLY recurrence
        WHEN ei.recurrence_rule LIKE 'FREQ=MONTHLY%' THEN
          ei.instance_date + INTERVAL '1 month' * COALESCE(
            (SELECT SPLIT_PART(REPLACE(REPLACE(ei.recurrence_rule, 'FREQ=MONTHLY', ''), 'INTERVAL=', ''), ';', 1)::int),
            1
          )
        -- YEARLY recurrence
        WHEN ei.recurrence_rule LIKE 'FREQ=YEARLY%' THEN
          ei.instance_date + INTERVAL '1 year' * COALESCE(
            (SELECT SPLIT_PART(REPLACE(REPLACE(ei.recurrence_rule, 'FREQ=YEARLY', ''), 'INTERVAL=', ''), ';', 1)::int),
            1
          )
        ELSE ei.instance_date + INTERVAL '1 day'
      END as instance_date,
      ei.instance_number + 1 as instance_number,
      ei.recurrence_rule
    FROM event_instances ei
    WHERE ei.instance_date < $4
      AND ei.instance_number < $5
      -- Stop when we've generated enough instances
      AND ei.recurrence_rule IS NOT NULL
      AND ei.recurrence_rule != ''
  )
  SELECT
    event_id,
    type,
    title,
    instance_date as date,
    amount,
    description,
    notification_days_before,
    instance_number,
    CASE
      WHEN type = 'bonus' THEN '#10b181'
      WHEN type = 'insurance_renewal' THEN '#f59e0b'
      WHEN type = 'tax_deadline' THEN '#ef4444'
      WHEN type = 'investment_contribution' THEN '#3b82f6'
    END as indicator_color,
    CASE
      WHEN instance_date = CURRENT_DATE THEN 'today'
      WHEN instance_date = CURRENT_DATE + INTERVAL '1 day' THEN 'tomorrow'
      WHEN instance_date > CURRENT_DATE + INTERVAL '1 day' THEN 'upcoming'
      ELSE 'past'
    END as status
  FROM event_instances
  WHERE instance_date >= $3
  ORDER BY instance_date ASC, instance_number ASC
`;

/**
 * GET NEXT OCCURRENCE - Find next instance of recurring event
 * Optimized single-query version of expand_recurrence for quick checks
 * @param userId - User ID
 * @param eventId - Event ID
 */
export const GET_NEXT_OCCURRENCE_SQL = `
  WITH RECURSIVE next_occurrence AS (
    SELECT
      e.id as event_id,
      e.type,
      e.title,
      e.amount,
      e.description,
      e.date as next_date
    FROM financial_events e
    WHERE e.user_id = $1
      AND e.id = $2
      AND e.is_active = TRUE
      AND e.date >= CURRENT_DATE
      AND e.recurrence_rule IS NOT NULL
      AND e.recurrence_rule != ''
    LIMIT 1

    UNION ALL

    SELECT
      no.event_id,
      no.type,
      no.title,
      no.amount,
      no.description,
      CASE
        WHEN no.next_date + INTERVAL '1 day' < CURRENT_DATE THEN
          no.next_date + INTERVAL '1 month'
        ELSE
          no.next_date + INTERVAL '1 day'
      END
    FROM next_occurrence no
    WHERE no.next_date < CURRENT_DATE + INTERVAL '1 year'
      AND no.next_date + INTERVAL '1 month' > CURRENT_DATE
  )
  SELECT * FROM next_occurrence
  WHERE next_date >= CURRENT_DATE
  ORDER BY next_date ASC
  LIMIT 1
`;

/**
 * UPSERT EVENT - Create or update (if exists)
 * Not strictly needed with UUID but useful for certain workflows
 */
export const UPSERT_EVENT_SQL = `
  INSERT INTO financial_events (
    user_id, title, type, date, amount, description,
    recurrence_rule, notification_days_before, is_active
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  ON CONFLICT (id) DO UPDATE SET
    title = $2,
    type = $3,
    date = $4,
    amount = $5,
    description = $6,
    recurrence_rule = $7,
    notification_days_before = $8,
    is_active = $9,
    updated_at = NOW()
  RETURNING *
`;

/**
 * GET EVENTS BY TYPE - Filter by specific event category
 */
export const GET_EVENTS_BY_TYPE_SQL = `
  SELECT * FROM financial_events
  WHERE user_id = $1
    AND type = $2
    AND is_active = TRUE
  ORDER BY date ASC
`;

/**
 * DELETE ALL INACTIVE EVENTS - Cleanup utility
 * Permanently removes soft-deleted events older than N days
 */
export const PURGE_INACTIVE_EVENTS_SQL = `
  DELETE FROM financial_events
  WHERE is_active = FALSE
    AND updated_at < CURRENT_DATE - INTERVAL '$1 days'
`;

/**
 * GET EVENTS WITH AMOUNT SUMMARY - Aggregate statistics
 * For dashboard widgets showing projected amounts
 */
export const GET_EVENTS_AMOUNT_SUMMARY_SQL = `
  SELECT
    COUNT(*) as total_events,
    COALESCE(SUM(amount), 0) as total_amount,
    SUM(CASE WHEN date >= CURRENT_DATE THEN COALESCE(amount, 0) ELSE 0 END) as upcoming_amount,
    SUM(CASE WHEN type IN ('bonus', 'investment_contribution') THEN COALESCE(amount, 0) ELSE 0 END) as income_amount,
    SUM(CASE WHEN type IN ('insurance_renewal', 'tax_deadline') THEN COALESCE(amount, 0) ELSE 0 END) as expense_amount
  FROM financial_events
  WHERE user_id = $1 AND is_active = TRUE
`;
