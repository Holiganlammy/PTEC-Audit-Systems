// src/PTEC_AUDIT/entities/menu-audit-permission.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MenuAudit } from './menu-audit.entity';

@Entity('Menu_audit_permission')
export class MenuAuditPermission {
  @PrimaryGeneratedColumn({ name: 'permission_id' })
  permissionId: number;

  @Column({ name: 'role_id', type: 'int' })
  roleId: number;

  @Column({ name: 'menu_id', type: 'int' })
  menuId: number;

  @Column({ name: 'can_view', type: 'bit', default: false })
  canView: boolean;

  // Relations
  @ManyToOne(() => MenuAudit, (menu) => menu.permissions)
  @JoinColumn({ name: 'menu_id' })
  menu: MenuAudit;
}
