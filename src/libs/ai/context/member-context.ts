import { db } from '@/db/db';
import { eq, and } from 'drizzle-orm';
import { members, memberLocations, locations } from '@/db/schemas';

export interface MemberContext {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  phone?: string;
  memberSince: Date;
  locationName?: string;
  subscriptions?: any[];
  packages?: any[];
  type: 'member';
}

export class MemberContextBuilder {
  /**
   * Build comprehensive member context for AI personalization
   */
  async buildContext(memberId: string, locationId: string): Promise<MemberContext> {
    try {
      console.log(`👤 Building context for member ${memberId} at location ${locationId}`);

      // Get member info
      const member = await db.query.members.findFirst({
        where: eq(members.id, memberId),
      });

      if (!member) {
        throw new Error(`Member ${memberId} not found`);
      }

      // Get location info
      const location = await db.query.locations.findFirst({
        where: eq(locations.id, locationId),
      });

      // Verify member has access to this location
      const memberLocation = await db.query.memberLocations.findFirst({
        where: and(
          eq(memberLocations.memberId, memberId),
          eq(memberLocations.locationId, locationId)
        )
      });

      if (!memberLocation) {
        throw new Error(`Member ${memberId} does not have access to location ${locationId}`);
      }

      // Try to get detailed member info with relations
      let subscriptions: any[] = [];
      let packages: any[] = [];

      try {
        // TODO: Uncomment when member subscription/package relations are available
        // const detailedMember = await db.query.memberLocations.findFirst({
        //   where: and(
        //     eq(memberLocations.memberId, memberId),
        //     eq(memberLocations.locationId, locationId)
        //   ),
        //   with: {
        //     member: {
        //       with: {
        //         subscriptions: {
        //           with: { plan: true }
        //         },
        //         packages: {
        //           with: { plan: true }
        //         }
        //       }
        //     }
        //   }
        // });

        // if (detailedMember?.member) {
        //   subscriptions = detailedMember.member.subscriptions || [];
        //   packages = detailedMember.member.packages || [];
        // }
      } catch (relationError) {
        console.log("📝 Relations not available yet, using basic member info");
      }

      const memberContext: MemberContext = {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName || '',
        email: member.email,
        phone: member.phone || undefined,
        memberSince: member.created,
        locationName: location?.name || 'Gym Location',
        subscriptions,
        packages,
        type: 'member'
      };

      console.log(`✅ Built context for ${memberContext.firstName} ${memberContext.lastName}`);
      return memberContext;

    } catch (error) {
      console.error('❌ Error building member context:', error);
      throw new Error('Failed to build member context');
    }
  }

  /**
   * Get member's current membership status summary
   */
  async getMembershipSummary(memberId: string, locationId: string): Promise<string> {
    try {
      const context = await this.buildContext(memberId, locationId);
      
      let summary = `${context.firstName} ${context.lastName || ''}`;
      summary += `\n• Member since: ${context.memberSince.toLocaleDateString()}`;
      summary += `\n• Location: ${context.locationName}`;
      
      if (context.subscriptions && context.subscriptions.length > 0) {
        summary += `\n• Active subscriptions: ${context.subscriptions.length}`;
      }
      
      if (context.packages && context.packages.length > 0) {
        summary += `\n• Available packages: ${context.packages.length}`;
      }
      
      return summary;
    } catch (error) {
      console.error('Error getting membership summary:', error);
      return 'Unable to retrieve membership summary';
    }
  }

  /**
   * Validate member access to location
   */
  async validateMemberAccess(memberId: string, locationId: string): Promise<boolean> {
    try {
      const memberLocation = await db.query.memberLocations.findFirst({
        where: and(
          eq(memberLocations.memberId, memberId),
          eq(memberLocations.locationId, locationId)
        )
      });

      return !!memberLocation;
    } catch (error) {
      console.error('Error validating member access:', error);
      return false;
    }
  }

  /**
   * Get member's basic info for quick lookups
   */
  async getMemberBasicInfo(memberId: string): Promise<{ firstName: string; lastName: string | null; email: string } | null> {
    try {
      const member = await db.query.members.findFirst({
        where: eq(members.id, memberId),
        columns: {
          firstName: true,
          lastName: true,
          email: true
        }
      });

      return member ? {
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email
      } : null;
    } catch (error) {
      console.error('Error getting member basic info:', error);
      return null;
    }
  }
}
