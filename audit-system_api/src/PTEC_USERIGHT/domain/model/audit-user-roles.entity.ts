import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RoleSystemAudit } from './role-system-audit.entity';

@Entity('Audit_User_Roles')
export class AuditUserRoles {
  @PrimaryGeneratedColumn({ name: 'user_role_id' })
  userRoleId: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'user_code', type: 'nvarchar', length: 50 })
  userCode: string;

  @Column({ name: 'role_id', type: 'int' })
  roleId: number;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', nullable: true })
  createdAt: Date | null;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy: number | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', nullable: true })
  updatedAt: Date | null;

  @Column({ name: 'active', type: 'tinyint', default: 1 })
  active: number;

  // Relations
  @ManyToOne(() => RoleSystemAudit, (role) => role.userRoles)
  @JoinColumn({ name: 'role_id' })
  role: RoleSystemAudit;
}
