import Dexie, { type Table } from 'dexie';

export interface PendingSale {
  id?: number;
  payload: any;
  created_at: string;
}

export class POSDatabase extends Dexie {
  pendingSales!: Table<PendingSale, number>;

  constructor() {
    super('MountBakersPOS_DB');
    this.version(1).stores({
      pendingSales: '++id, created_at'
    });
  }
}

export const db = new POSDatabase();
