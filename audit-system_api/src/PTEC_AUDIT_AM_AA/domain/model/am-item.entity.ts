import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { AMJobHeader } from './am.jobs-header.entity';
import { AAJobHeader } from './aa.jobs-header.entity';
import { AuditCategoryItem } from './audit-category-item.entity';
import { AMItemAMComment } from './am-item-am-comment.entity';
import { AMItemAMCheckerComment } from './am-item-am-checker-comment.entity';
import { AMItemAAComment } from './am-item-aa-comment.entity';
import { AMItemOtherComment } from './am-item-other-comment.entity';
import { AMItemOtherCommentUsersTag } from './am-item-other-comment-users-tag.entity';
import { AMItemStatus } from './am-item-status.entity';
import { AMHeadCheckerStatus } from './am_head_check_status.entity';
import { BranchAmScores } from './branch_am_scores.entity';

@Entity('AMItems')
export class AMItem {
  @PrimaryGeneratedColumn({ name: 'item_id' })
  itemId!: number;

  @Column({ name: 'job_id', type: 'int', nullable: true })
  jobId!: number;

  @Column({ name: 'category_item_id', type: 'int', nullable: true })
  categoryItemId!: number;

  @Column({ name: 'inspection_date', type: 'date', nullable: true })
  inspectionDate!: Date;

  @Column({ name: 'item_status', type: 'int', nullable: true })
  itemStatus!: number;

  @Column({ name: 'remarks', type: 'nvarchar', nullable: true })
  remarks!: string;

  @Column({
    name: 'job_source',
    type: 'nvarchar',
    length: 10,
    nullable: true,
  })
  jobSource!: string | null;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy!: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;

  @Column({ name: 'update_by', type: 'int', nullable: true })
  updateBy!: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt!: Date;

  @Column({ name: 'active', type: 'bit', default: 1 })
  active!: boolean;

  @Column({ name: 'item_status_edit', type: 'int', nullable: true })
  itemStatusEdit!: number;

  @Column({ name: 'header_checklist_status', type: 'int', nullable: true })
  headerChecklistStatus!: number | null;

  @Column({
    name: 'header_checklist_detail',
    type: 'nvarchar',
    length: 'MAX',
    nullable: true,
  })
  headerChecklistDetail!: string | null;

  @Column({ name: 'header_checklist_by', type: 'int', nullable: true })
  headerChecklistBy!: number | null;

  @Column({ name: 'header_checklist_at', type: 'datetime', nullable: true })
  headerChecklistAt!: Date | null;

  // Relations
  @ManyToOne(() => AMJobHeader, (job) => job.items)
  @JoinColumn({ name: 'job_id' })
  job!: AMJobHeader;

  @ManyToOne(() => AAJobHeader, (job) => job.items, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'job_id' })
  aaJob!: AAJobHeader;

  @ManyToOne(() => AuditCategoryItem, (category) => category.items)
  @JoinColumn({ name: 'category_item_id' })
  categoryItem!: AuditCategoryItem;

  @OneToMany(() => AMItemAMComment, (comment) => comment.item)
  amComments!: AMItemAMComment[];

  @OneToMany(() => AMItemAMCheckerComment, (comment) => comment.item)
  amCheckerComments!: AMItemAMCheckerComment[];

  @OneToMany(() => AMItemAAComment, (comment) => comment.item)
  aaComments!: AMItemAAComment[];

  @OneToMany(() => AMItemOtherComment, (otherComment) => otherComment.item)
  otherComments!: AMItemOtherComment[];

  @OneToMany(() => AMItemOtherCommentUsersTag, (user) => user.item)
  taggedUsers!: AMItemOtherCommentUsersTag[];

  @ManyToOne(() => AMItemStatus, (status) => status.items)
  @JoinColumn({ name: 'item_status' })
  itemStatusRelation!: AMItemStatus;

  @ManyToOne(() => AMItemStatus, (status) => status.items)
  @JoinColumn({ name: 'item_status_edit' })
  itemStatusEditRelation!: AMItemStatus;

  @ManyToOne(() => AMHeadCheckerStatus, (status) => status.items)
  @JoinColumn({ name: 'header_checklist_status' })
  headerChecklistStatusRelation!: AMHeadCheckerStatus;

  @OneToMany(() => BranchAmScores, (score) => score.item)
  branchAmScores!: BranchAmScores[];
}
