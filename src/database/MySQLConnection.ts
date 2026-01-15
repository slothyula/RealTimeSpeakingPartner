/**
 * MySQL Database Connection
 * MySQL veritabanı bağlantı yönetimi
 */

import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { dbConfig } from '../config/database.config';

export class MySQLConnection {
    private static instance: MySQLConnection;
    private pool: Pool | null = null;
    private isConnected: boolean = false;

    private constructor() {}

    /**
     * Singleton instance
     */
    public static getInstance(): MySQLConnection {
        if (!MySQLConnection.instance) {
            MySQLConnection.instance = new MySQLConnection();
        }
        return MySQLConnection.instance;
    }

    /**
     * Veritabanı bağlantısını başlat
     */
    public async connect(): Promise<boolean> {
        try {
            this.pool = mysql.createPool({
                host: dbConfig.host,
                port: dbConfig.port,
                user: dbConfig.user,
                password: dbConfig.password,
                database: dbConfig.database,
                connectionLimit: dbConfig.connectionLimit,
                waitForConnections: dbConfig.waitForConnections,
                queueLimit: dbConfig.queueLimit,
                charset: dbConfig.charset
            });

            // Bağlantıyı test et
            const connection = await this.pool.getConnection();
            console.log('✅ MySQL Database connected successfully');
            connection.release();
            this.isConnected = true;
            return true;
        } catch (error) {
            console.error('❌ MySQL Database connection failed:', error);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Bağlantı havuzunu al
     */
    public getPool(): Pool | null {
        return this.pool;
    }

    /**
     * Bağlantı durumu
     */
    public isConnectionActive(): boolean {
        return this.isConnected;
    }

    /**
     * SELECT sorgusu çalıştır
     */
    public async query<T extends RowDataPacket[]>(sql: string, params?: any[]): Promise<T> {
        if (!this.pool) {
            throw new Error('Database not connected');
        }
        const [rows] = await this.pool.execute<T>(sql, params);
        return rows;
    }

    /**
     * INSERT/UPDATE/DELETE sorgusu çalıştır
     */
    public async execute(sql: string, params?: any[]): Promise<ResultSetHeader> {
        if (!this.pool) {
            throw new Error('Database not connected');
        }
        const [result] = await this.pool.execute<ResultSetHeader>(sql, params);
        return result;
    }

    /**
     * Transaction başlat
     */
    public async beginTransaction(): Promise<PoolConnection> {
        if (!this.pool) {
            throw new Error('Database not connected');
        }
        const connection = await this.pool.getConnection();
        await connection.beginTransaction();
        return connection;
    }

    /**
     * Bağlantıyı kapat
     */
    public async disconnect(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            this.isConnected = false;
            console.log('MySQL Database disconnected');
        }
    }
}

export default MySQLConnection;
