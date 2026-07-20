import { ReactiveController, ReactiveControllerHost } from 'lit';
import { 
  ref, 
  onValue, 
  off, 
  query, 
  QueryConstraint,
  Query
} from 'firebase/database';
import { db } from '../config/firebase.js';

export interface FirebaseObjectWithKey {
  $key: string;
  [key: string]: any;
}

export class FirebaseQueryController<T extends FirebaseObjectWithKey = any> implements ReactiveController {
  private host: ReactiveControllerHost;
  private path: string | (() => string | null);
  private constraints: QueryConstraint[] | (() => QueryConstraint[] | null);
  private unsubscribe: (() => void) | null = null;

  data: T[] = [];
  loading = true;
  error: Error | null = null;

  constructor(
    host: ReactiveControllerHost, 
    path: string | (() => string | null),
    constraints: QueryConstraint[] | (() => QueryConstraint[] | null) = []
  ) {
    this.host = host;
    this.path = path;
    this.constraints = constraints;
    host.addController(this);
  }

  hostConnected() {
    this.subscribe();
  }

  hostDisconnected() {
    this.unsubscribeFromDb();
  }

  subscribe() {
    this.unsubscribeFromDb();

    const resolvedPath = typeof this.path === 'function' ? this.path() : this.path;
    if (!resolvedPath) {
      this.loading = false;
      this.data = [];
      this.host.requestUpdate();
      return;
    }

    this.loading = true;
    this.host.requestUpdate();

    const dbRefInstance = ref(db, resolvedPath);
    const resolvedConstraints = typeof this.constraints === 'function' ? this.constraints() : this.constraints;

    let q: Query = dbRefInstance;
    if (resolvedConstraints && resolvedConstraints.length > 0) {
      q = query(dbRefInstance, ...resolvedConstraints);
    }

    const onValueCallback = onValue(
      q,
      (snapshot) => {
        const list: T[] = [];
        snapshot.forEach((childSnapshot) => {
          const val = childSnapshot.val();
          list.push({
            $key: childSnapshot.key as string,
            ...(typeof val === 'object' && val !== null ? val : { value: val })
          } as unknown as T);
        });
        this.data = list;
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

    this.unsubscribe = () => off(q, 'value', onValueCallback);
  }

  private unsubscribeFromDb() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}
