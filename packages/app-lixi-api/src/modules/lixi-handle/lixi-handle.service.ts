import { Injectable, OnModuleInit } from "@nestjs/common";
import { ChronikClient } from "chronik-client";
import { InjectChronikClient } from "nestjs-chronik";

@Injectable()
export class LixiHandleService implements OnModuleInit {

  constructor(
    @InjectChronikClient('xpi') private chronikXPI: ChronikClient,
  ) { }

  async onModuleInit() {
  }
}
