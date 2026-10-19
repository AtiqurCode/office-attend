/**
 * Future sync interface. V1 keeps records as pending_sync and does not
 * perform network requests.
 */
export interface AttendanceSyncService {
  syncPending(): Promise<{ attempted: number; succeeded: number }>;
}

export class NoOpAttendanceSyncService implements AttendanceSyncService {
  async syncPending(): Promise<{ attempted: number; succeeded: number }> {
    return { attempted: 0, succeeded: 0 };
  }
}
