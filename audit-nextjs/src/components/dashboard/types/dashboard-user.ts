import type { PaginatedActionItems, ActivityData } from "./dashboard-common";
 
export interface UserStats {
  taggedMe: number;      // Tag ใน Item (จาก AuditItems_OtherComment_Users_Tag)
  myComments: number;    // Comment ทั้งหมดของฉัน
  mentioned: number;      // Mention (@) ฉันใน Comment
}
 
export interface UserDashboardResponse {
  stats: {
    user: UserStats;
  };
  taggedItems: PaginatedActionItems;         // Tag ใน Item
  myComments: PaginatedActionItems;          // Comment ของฉัน
  mentioned: PaginatedActionItems;      // Mention ฉัน
  recentActivities: ActivityData[];
}