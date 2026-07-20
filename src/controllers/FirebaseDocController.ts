import { ReactiveController, ReactiveControllerHost } from 'lit';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../config/firebase.js';

export class FirebaseDocController<T = any> implements ReactiveController {
  private host: ReactiveControllerHost;
  private path: string | (() => string | null);
  private unsubscribe: (() => void) | null = null;
  
  data: T | null = null;
  loading = true;
  error: Error | null = null;

  constructor(host: ReactiveControllerHost, path: string | (() => string | null)) {
    this.host = host;
    this.path = path;
    host.addController(this);
  }

  hostConnected() {
    this.subscribe();
  }

  hostDisconnected() {
    this.unsubscribeFromDb();
  }

  // Allow re-subscribing if path dynamics change (e.g., user uid loads)
  subscribe() {
    this.unsubscribeFromDb();

    const resolvedPath = typeof this.path === 'function' ? this.path() : this.path;
    if (!resolvedPath) {
      this.loading = false;
      this.data = null;
      this.host.requestUpdate();
      return;
    }

    this.loading = true;
    this.host.requestUpdate();

    const dbRefInstance = ref(db, resolvedPath);
    
    const onValueCallback = onValue(
      dbRefInstance,
      (snapshot) => {
        this.data = snapshot.val() as T;
        this.loading = false;
        this.error = null;
        this.host.requestUpdate();
      },
      (error) => {
        this.error = error;
        this.loading = false;
        this.host.requestUpdate();
      }
    );

    this.unsubscribe = () => off(dbRefInstance, 'value', onValueCallback);
  }

  private unsubscribeFromDb() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}
