import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('AM_Header_Status')
export class AMHeaderStatus {
  @PrimaryGeneratedColumn({ name: 'am_status_id' })
  amStatusId!: number;

  @Column({ name: 'status_name', type: 'nvarchar', nullable: true })
  statusName!: string;
}
