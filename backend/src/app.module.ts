import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { User } from './users/user.entity';
import { Appointment } from './appointments/appointment.entity';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { databaseConfig } from './config/env';

@Module({
  imports: [
    // Rate Limiting global (RNF01: proteção contra força bruta e DoS)
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minuto
        limit: 100, // Limite geral da API
      },
    ]),

    // Conexão com o PostgreSQL via TypeORM
    // Credenciais lidas do ambiente (obrigatórias em produção; ver config/env.ts)
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        ...databaseConfig(),
        entities: [User, Appointment],
        // Esquema controlado pelo database/init.sql (sem sincronização automática)
        synchronize: false,
      }),
    }),

    UsersModule,
    AuthModule,
    AppointmentsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
