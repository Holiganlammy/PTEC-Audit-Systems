import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { AuditUserRoles } from './audit-user-roles.entity';

@Entity('Role_System_Audit')
export class RoleSystemAudit {
  @PrimaryGeneratedColumn({ name: 'role_id' })
  roleId: number;

  @Column({ name: 'role_name', type: 'nvarchar', length: 100 })
  roleName: string;

  @OneToMany(() => AuditUserRoles, (userRole) => userRole.role)
  userRoles: AuditUserRoles[];
}
