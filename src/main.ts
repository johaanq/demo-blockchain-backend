import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  const corsOrigins = process.env.CORS_ORIGINS?.split(",").map((o) => o.trim()) ?? [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];
  app.enableCors({ origin: corsOrigins });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, "0.0.0.0");
  console.log(`Blockchain API (NestJS) — http://localhost:${port}/api`);
  console.log(`Dificultad PoW: ${process.env.DIFFICULTY ?? 4} ceros iniciales`);
}

bootstrap();
