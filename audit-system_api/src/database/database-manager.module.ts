import { Module } from '@nestjs/common';
import { DatabaseManagerService } from './database-manager.service';

@Module({
  providers: [DatabaseManagerService],
  exports: [DatabaseManagerService], // ต้อง export เพื่อให้โมดูลอื่นใช้ได้
})
export class DatabaseManagerModule {}
