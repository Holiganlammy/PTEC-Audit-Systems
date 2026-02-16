// src/PTEC_AUDIT/entities/menu-audit.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MenuAuditPermission } from './menu-audit-permission.entity';

@Entity('menu_audit')
export class MenuAudit {
  @PrimaryGeneratedColumn({ name: 'menu_id' })
  menuId: number;

  @Column({ name: 'name', type: 'nvarchar', length: 255 })
  name: string;

  @Column({ name: 'path', type: 'nvarchar', length: 500, nullable: true })
  path: string;

  @Column({ name: 'icon', type: 'nvarchar', length: 100, nullable: true })
  icon: string;

  @Column({ name: 'parent_id', type: 'int', nullable: true })
  parentId: number | null;

  @Column({ name: 'order_no', type: 'int', default: 0 })
  orderNo: number;

  @Column({ name: 'is_active', type: 'bit', default: true })
  isActive: boolean;

  // Relations
  @OneToMany(() => MenuAuditPermission, (permission) => permission.menu)
  permissions: MenuAuditPermission[];

  // Self-referencing relation (parent menu)
  @ManyToOne(() => MenuAudit, (menu) => menu.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: MenuAudit;

  // Self-referencing relation (child menus)
  @OneToMany(() => MenuAudit, (menu) => menu.parent)
  children: MenuAudit[];
}
