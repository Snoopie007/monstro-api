import type { AssistantToolName } from "@subtrees/types/assistant";
import type { ToolExecutorContext, ToolExecutorResult } from "./shared";

type MemberDeps = {
  parseRangeDays: (input?: string) => number;
  extractMemberLookupSignals: (rawQuery: string) => {
    searchText: string;
    email: string | null;
    phoneDigits: string | null;
    tokens: string[];
  };
  scoreMemberCandidate: (candidate: { first_name: string | null; last_name: string | null; email: string; phone: string | null }, signals: any) => number;
  db: any;
  sql: any;
};

export async function executeMemberLookupTool(params: {
  name: AssistantToolName;
  input: Record<string, unknown>;
  context: ToolExecutorContext;
  deps: MemberDeps;
}): Promise<ToolExecutorResult> {
  const { name, input, context, deps } = params;
  const { parseRangeDays, extractMemberLookupSignals, scoreMemberCandidate, db, sql } = deps;

    const modeInput = typeof input.mode === "string" ? input.mode.toLowerCase() : "single";
    const mode = modeInput === "list" || modeInput === "aggregate" ? modeInput : "single";
    const rawQuery = typeof input.query === "string"
      ? input.query.trim()
      : [input.name, input.memberName, input.email, input.phone]
          .filter((value) => typeof value === "string")
          .map((value) => (value as string).trim())
          .filter((value) => value.length > 0)
          .join(" ");

    const statusFilter = typeof input.status === "string" ? input.status.trim().toLowerCase() : "";
    const joinedWithinDays = typeof input.joinedWithinDays === "number"
      ? Math.max(1, Math.min(3650, Math.floor(input.joinedWithinDays)))
      : (typeof input.range === "string" ? parseRangeDays(input.range) : null);
    const requestedLimit = typeof input.limit === "number" ? Math.floor(input.limit) : 10;
    const limit = Math.max(1, Math.min(50, requestedLimit));
    const offset = typeof input.offset === "number" ? Math.max(0, Math.floor(input.offset)) : 0;
    const sortByInput = typeof input.sortBy === "string" ? input.sortBy : "joined_desc";
    const sortBy = ["joined_desc", "joined_asc", "name_asc", "points_desc"].includes(sortByInput)
      ? sortByInput
      : "joined_desc";

    if (mode === "single" && !rawQuery) {
      return {
        content: JSON.stringify({ ok: false, error: "Missing member lookup query" }),
      };
    }

    const signals = extractMemberLookupSignals(rawQuery);
    if (mode === "single" && !signals.searchText) {
      return {
        content: JSON.stringify({
          ok: false,
          error: "Member lookup needs a name, email, or phone number",
        }),
      };
    }

    const filters: ReturnType<typeof sql>[] = [sql`ml.location_id = ${context.locationId}`];
    if (statusFilter) {
      filters.push(sql`lower(COALESCE(ml.status::text, '')) = ${statusFilter}`);
    }
    if (typeof joinedWithinDays === "number" && Number.isFinite(joinedWithinDays) && joinedWithinDays > 0) {
      filters.push(sql`m.created_at >= now() - (${joinedWithinDays} * interval '1 day')`);
    }

    if (signals.searchText) {
      const searchLike = `%${signals.searchText}%`;
      const emailLike = signals.email ? `%${signals.email}%` : null;
      const phoneLike = signals.phoneDigits ? `%${signals.phoneDigits}%` : null;
      const tokenLikes = signals.tokens.map((token) => `%${token}%`);
      const emailCondition = emailLike ? sql`m.email ILIKE ${emailLike}` : sql`false`;
      const phoneCondition = phoneLike
        ? sql`regexp_replace(COALESCE(m.phone, ''), '\\D', '', 'g') LIKE ${phoneLike}`
        : sql`false`;

      filters.push(sql`(
        concat_ws(' ', COALESCE(m.first_name, ''), COALESCE(m.last_name, '')) ILIKE ${searchLike}
        OR concat_ws(' ', COALESCE(m.last_name, ''), COALESCE(m.first_name, '')) ILIKE ${searchLike}
        OR m.email ILIKE ${searchLike}
        OR COALESCE(m.phone, '') ILIKE ${searchLike}
        OR (${emailCondition})
        OR (${phoneCondition})
        OR (${tokenLikes.length > 0 ? sql.join(tokenLikes.map((tokenLike) => sql`
            m.first_name ILIKE ${tokenLike}
            OR m.last_name ILIKE ${tokenLike}
            OR m.email ILIKE ${tokenLike}
            OR COALESCE(m.phone, '') ILIKE ${tokenLike}
          `), sql` OR `) : sql`false`})
      )`);
    }

    const whereClause = filters.length > 0 ? sql`WHERE ${sql.join(filters, sql` AND `)}` : sql``;

    if (mode === "aggregate") {
      const aggregateRows = await db.execute(sql`
        SELECT
          COUNT(*)::bigint AS total_count,
          COUNT(*) FILTER (WHERE lower(COALESCE(ml.status::text, '')) = 'active')::bigint AS active_count,
          COUNT(*) FILTER (WHERE m.created_at >= now() - interval '30 day')::bigint AS joined_last_30_days
        FROM member_locations ml
        JOIN members m ON m.id = ml.member_id
        ${whereClause}
      `) as unknown as Array<{
        total_count: number;
        active_count: number;
        joined_last_30_days: number;
      }>;

      const row = aggregateRows[0] || { total_count: 0, active_count: 0, joined_last_30_days: 0 };
      return {
        content: JSON.stringify({
          ok: true,
          locationId: context.locationId,
          tool: name,
          mode,
          query: rawQuery,
          status: statusFilter || null,
          joinedWithinDays: joinedWithinDays || null,
          totals: {
            members: Number(row.total_count || 0),
            activeMembers: Number(row.active_count || 0),
            joinedLast30Days: Number(row.joined_last_30_days || 0),
          },
        }),
      };
    }

    const orderBy = sortBy === "joined_asc"
      ? sql`m.created_at ASC`
      : sortBy === "name_asc"
        ? sql`m.first_name ASC NULLS LAST, m.last_name ASC NULLS LAST`
        : sortBy === "points_desc"
          ? sql`ml.points DESC NULLS LAST, m.created_at DESC`
          : sql`m.created_at DESC`;

    const rows = await db.execute(sql`
      SELECT
        m.id,
        m.first_name,
        m.last_name,
        m.email,
        m.phone,
        ml.status,
        ml.points,
        m.created_at,
        COUNT(*) OVER()::bigint AS total_count
      FROM member_locations ml
      JOIN members m ON m.id = ml.member_id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ${mode === "single" ? 40 : limit}
      OFFSET ${mode === "single" ? 0 : offset}
    `) as unknown as Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string;
      phone: string | null;
      status: string;
      points: number;
      created_at: string;
      total_count: number;
    }>;

    if (mode === "single") {
      const scored = rows
        .map((member) => ({
          ...member,
          score: scoreMemberCandidate(member, signals),
        }))
        .filter((member) => member.score > 0)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
        .slice(0, 5);

      return {
        content: JSON.stringify({
          ok: true,
          locationId: context.locationId,
          tool: name,
          mode,
          query: rawQuery,
          normalizedQuery: signals.searchText,
          count: scored.length,
          members: scored.map((member) => ({
            id: member.id,
            name: `${member.first_name}${member.last_name ? ` ${member.last_name}` : ""}`.trim(),
            email: member.email,
            phone: member.phone,
            status: member.status,
            points: Number(member.points || 0),
            score: member.score,
            joinedAt: member.created_at,
          })),
        }),
      };
    }

    const total = rows[0] ? Number(rows[0].total_count || 0) : 0;
    return {
      content: JSON.stringify({
        ok: true,
        locationId: context.locationId,
        tool: name,
        mode,
        query: rawQuery || null,
        status: statusFilter || null,
        joinedWithinDays: joinedWithinDays || null,
        sortBy,
        limit,
        offset,
        total,
        hasMore: offset + rows.length < total,
        nextOffset: offset + rows.length < total ? offset + rows.length : null,
        count: rows.length,
        members: rows.map((member) => ({
          id: member.id,
          name: `${member.first_name}${member.last_name ? ` ${member.last_name}` : ""}`.trim(),
          firstName: member.first_name,
          lastName: member.last_name,
          email: member.email,
          phone: member.phone,
          status: member.status,
          points: Number(member.points || 0),
          joinedAt: member.created_at,
        })),
      }),
    };
  
}
