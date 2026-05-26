// src/modules/auth/entities/auth-session.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('AuthSessions')
@Index(['accessToken'])
@Index(['userCode'])
@Index(['isRevoked'])
@Index(['expiresAt'])
export class AuthSession {
  @PrimaryGeneratedColumn({ name: 'SessionID' })
  sessionId!: number;

  @Column({
    name: 'AccessToken',
    type: 'nvarchar',
    length: 'MAX',
    unique: true,
  })
  accessToken!: string;

  @Column({ name: 'UserID', type: 'int' })
  userId!: number;

  @Column({ name: 'UserCode', type: 'nvarchar', length: 50 })
  userCode!: string;

  @Column({ name: 'UserData', type: 'nvarchar', length: 'MAX' })
  userData!: string;

  @Column({ name: 'Source', type: 'nvarchar', length: 50 })
  source!: string;

  @Column({ name: 'ExpiresAt', type: 'datetime' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'CreatedAt' })
  createdAt!: Date;

  @Column({
    name: 'LastAccessAt',
    type: 'datetime',
    default: () => 'GETDATE()',
  })
  lastAccessAt!: Date;

  @Column({ name: 'IsRevoked', type: 'bit', default: false })
  isRevoked!: boolean;

  @Column({ name: 'DeviceInfo', type: 'nvarchar', length: 500, nullable: true })
  deviceInfo!: string;

  @Column({ name: 'IpAddress', type: 'nvarchar', length: 50, nullable: true })
  ipAddress!: string;

  @Column({ name: 'UserAgent', type: 'nvarchar', length: 500, nullable: true })
  userAgent!: string;
}
