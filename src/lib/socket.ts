import { io, Socket as S } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from './socket-types';

export interface CalcResult {
  meltdownTime: number;
  scramTime: number;
  startTime: number;
  endTime: number;
  endTemp: number;
  data: Array<{ time: number; temperature: number; temperature_change: number }>;
}

export const emptyCalc = {
  meltdownTime: 0,
  scramTime: 0,
  startTime: 0,
  endTime: 0,
  endTemp: 0,
  data: [{
    time: 0,
    temperature: 0,
    temperature_change: 0
  }]
};

export class Socket {
  public io: S<ServerToClientEvents, ClientToServerEvents>;

  constructor(url: string) {
    this.io = io(url, {
      autoConnect: false
    });
  }
}