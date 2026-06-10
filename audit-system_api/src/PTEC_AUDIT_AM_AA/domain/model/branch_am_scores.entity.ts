import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AMItem } from './am-item.entity';

@Entity('Branch_Am_Scores')
export class BranchAmScores {
  @PrimaryGeneratedColumn({ name: 'score_id' })
  scoreId!: number;

  @Column({ name: 'job_id', type: 'int', nullable: false })
  jobId!: number;

  @Column({ name: 'branch_id', type: 'int', nullable: false })
  branchId!: number;

  @Column({ name: 'item_id', type: 'int', nullable: false })
  itemId!: number;

  @Column({
    name: 'score',
    type: 'int',
    nullable: false,
  })
  score!: number;

  @Column({ name: 'created_by', type: 'int', nullable: false })
  createdBy!: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;

  @Column({ name: 'remarks', type: 'nvarchar', nullable: true })
  remarks!: string | null;

  @Column({ name: 'active', type: 'bit', default: 1 })
  active!: boolean;

  // Relations
  @ManyToOne(() => AMItem, (item) => item.branchAmScores)
  @JoinColumn({ name: 'item_id' })
  item!: AMItem;
}
