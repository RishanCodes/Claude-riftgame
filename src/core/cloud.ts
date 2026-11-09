// Cloud save: when the game runs as a claude.ai artifact, mirror the save into the
// artifact's per-user private database (data/users/<id>/save). localStorage stays the
// fast local copy; whichever save is newer wins on startup.
import { onSaveWritten, parseSave, type SaveData } from './save';

type DocRef = { get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>; set(d: Record<string, unknown>): Promise<void> };
type ClaudeWin = { claude?: { use(name: string): Promise<unknown> } };

export type CloudStatus = 'connecting' | 'online' | 'offline' | 'error';

export const Cloud = {
  status: 'connecting' as CloudStatus,
  doc: null as DocRef | null,
  lastJson: '',
  pending: '' as string,
  writing: false,
  timer: 0,
  listeners: [] as ((s: CloudStatus) => void)[],

  setStatus(s: CloudStatus) {
    this.status = s;
    this.listeners.forEach((f) => f(s));
  },

  /** Connect and return the cloud save if it is newer than `local`. */
  async init(local: SaveData): Promise<SaveData | null> {
    const claude = (window as unknown as ClaudeWin).claude;
    if (!claude?.use) {
      this.setStatus('offline');
      return null;
    }
    try {
      const timeout = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
      const [db, user] = (await timeout(Promise.all([claude.use('db'), claude.use('user')]), 10000)) ?? [null, null];
      const id = user ? await (user as { id(): Promise<string | null> }).id() : null;
      if (!db || !id) {
        this.setStatus('offline');
        return null;
      }
      this.doc = (db as { doc(p: string): DocRef }).doc(`data/users/${id}/save`);
      const snap = await timeout(this.doc.get(), 10000);
      this.setStatus('online');
      onSaveWritten((json) => this.queue(json));
      const json = snap && snap.exists ? (snap.data()?.json as string | undefined) : undefined;
      if (json) {
        this.lastJson = json;
        const remote = parseSave(json);
        if (remote && remote.savedAt > (local.savedAt || 0)) return remote;
      }
      // local is newer (or no cloud save yet): upload it
      this.queue(JSON.stringify(local));
      return null;
    } catch (e) {
      console.warn('Cloud save unavailable', e);
      this.setStatus('error');
      return null;
    }
  },

  queue(json: string) {
    if (!this.doc || json === this.lastJson) return;
    this.pending = json;
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => void this.flush(), 1500);
  },

  /** One write at a time; coalesces bursts of saves. */
  async flush() {
    if (!this.doc || this.writing || !this.pending || this.pending === this.lastJson) return;
    if (this.pending.length > 240000) {
      console.warn('Save too large for cloud');
      return;
    }
    const json = this.pending;
    this.writing = true;
    try {
      await this.doc.set({ json, savedAt: Date.now(), v: 1 });
      this.lastJson = json;
      if (this.status !== 'online') this.setStatus('online');
    } catch (e) {
      console.warn('Cloud write failed', e);
      this.setStatus('error');
    } finally {
      this.writing = false;
      if (this.pending !== this.lastJson) this.queue(this.pending);
    }
  },
};
