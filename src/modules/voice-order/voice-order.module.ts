import { Module } from '@nestjs/common';
import { VoiceOrderService } from './services/voice-order/voice-order.service';

@Module({
  providers: [VoiceOrderService],
  exports: [VoiceOrderService],
})
export class VoiceOrderModule {}
