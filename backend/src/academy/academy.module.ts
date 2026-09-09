import { Module } from "@nestjs/common";
import { AcademyController } from "./academy.controller";
import { ReportsController } from "./reports.controller";
@Module({ controllers: [AcademyController, ReportsController] })
export class AcademyModule {}
