import { Elysia, t } from 'elysia';
import { evaluateAllTriggersForMember } from '@/libs/achievements';

export const achievementRoutes = new Elysia({ prefix: '/achievements' })
  .post(
    '/evaluate',
    async ({ body, params, set }) => {
      try {
        const { mid } = params as { mid: string };
        const { locationId, triggerIds } = body;

        // For security, only allow evaluating triggers for the authenticated member
        const result = await evaluateAllTriggersForMember(mid, locationId, triggerIds);

        return {
          success: true,
          memberId: mid,
          locationId,
          results: result.results,
          summary: {
            totalTriggersEvaluated: result.results.length,
            newAchievements: result.results.filter(r => r.newAchievement).length,
            errors: result.results.filter(r => r.error).length
          }
        };

      } catch (error) {
        console.error('Error evaluating achievements:', error);
        set.status = 500;
        return { error: 'Internal server error' };
      }
    },
    {
      body: t.Object({
        locationId: t.String(),
        triggerIds: t.Optional(t.Array(t.Number()))
      })
    }
  );