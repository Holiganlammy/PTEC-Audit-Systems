import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { defaultServerConfig } from 'src/config/multi-database.config';

@Injectable()
export class DatabaseManagerService {
  private pool: sql.ConnectionPool;

  async getPool(): Promise<sql.ConnectionPool> {
    if (!this.pool) {
      this.pool = await new sql.ConnectionPool(defaultServerConfig).connect();
      console.log(`Connected to SQL Server: ${defaultServerConfig.server}`);
    }
    return this.pool;
  }

  async executeStoredProcedure<T = any>(
    fullyQualifiedProcName: string,
    params: {
      name: string;
      type: sql.ISqlType;
      value?: any;
      output?: boolean;
    }[],
    mapOutput?: (result: {
      recordset: T[];
      output?: Record<string, any>;
    }) => T[],
  ): Promise<T[]> {
    const pool = await this.getPool();
    const request = pool.request();

    for (const param of params) {
      if (param.output) {
        request.output(param.name, param.type);
      } else {
        request.input(param.name, param.type, param.value);
      }
    }

    const result = await request.execute(fullyQualifiedProcName);
    return mapOutput ? mapOutput(result) : result.recordset;
  }

  async executeStoredProcedureMultiple<T = any>(
    fullyQualifiedProcName: string,
    params: {
      name: string;
      type: sql.ISqlType;
      value?: any;
      output?: boolean;
    }[],
  ): Promise<T[][]> {
    const pool = await this.getPool();
    const request = pool.request();

    for (const param of params) {
      if (param.output) {
        request.output(param.name, param.type);
      } else {
        request.input(param.name, param.type, param.value);
      }
    }

    const result = await request.execute(fullyQualifiedProcName);
    return result.recordsets as T[][];
  }

  async query<T = any>(sqlQuery: string): Promise<T[]> {
    const pool = await this.getPool();
    const result = await pool.request().query(sqlQuery);
    return result.recordset;
  }
}
