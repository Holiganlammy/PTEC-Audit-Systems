import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AMItem } from './am-item.entity';

@Entity('AMItems_OtherComment_Users_Tag')
export class AMItemOtherCommentUsersTag {
  @PrimaryGeneratedColumn({ name: 'tagged_user_id' })
  taggedUserId!: number;

  @Column({ name: 'item_id', type: 'int', nullable: false })
  itemId!: number;

  @Column({ name: 'user_id', type: 'int', nullable: false })
  userId!: number;

  @Column({ name: 'created_by', type: 'int', nullable: false })
  createdBy!: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;

  @Column({ name: 'active', type: 'bit', default: 1 })
  active!: boolean;

  // Relations
  @ManyToOne(() => AMItem, (item) => item.taggedUsers)
  @JoinColumn({ name: 'item_id' })
  item!: AMItem;
}
