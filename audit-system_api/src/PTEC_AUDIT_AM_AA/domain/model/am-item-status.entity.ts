import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { OneToMany } from 'typeorm';
import { AMItem } from './am-item.entity';
@Entity('AM_Items_Status')
export class AMItemStatus {
  @PrimaryGeneratedColumn({ name: 'am_status_item_id' })
  amStatusItemId!: number;

  @Column({ name: 'status_name', type: 'nvarchar', length: 100 })
  statusName!: string;

  @OneToMany(() => AMItem, (item) => item.itemStatusRelation)
  items!: AMItem[];
}
