export interface DatabaseConfigurationInterface {
  name?: string;
  type: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  autoLoadEntities?: boolean; // Check here to get the detail https://docs.nestjs.com/techniques/database#auto-load-entities
  synchronize: boolean;
  entities?: any;
  driver: string;
}
