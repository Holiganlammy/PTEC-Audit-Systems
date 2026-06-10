import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { OneToMany } from 'typeorm';
import { AMItem } from './am-item.entity';
@Entity('AM_Head_Check_Status')
export class AMHeadCheckerStatus {
  @PrimaryGeneratedColumn({ name: 'am_checker_status_id' })
  amCheckerStatusId!: number;

  @Column({ name: 'am_checker_status', type: 'nvarchar', length: 500 })
  amCheckerStatus!: string;

  @OneToMany(() => AMItem, (item) => item.headerChecklistStatusRelation)
  items!: AMItem[];
}
