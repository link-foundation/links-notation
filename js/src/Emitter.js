/**
 * A dependency-free event emitter with the Node.js `EventEmitter` methods that
 * StreamParser documents.
 *
 * Importing Node's built-in `events` module made every bundle of the package
 * entry point, including parser-only browser bundles, fail to resolve `events`
 * unless the consumer installed a polyfill (issue #351). This class runs
 * unchanged in browsers, Node.js, Bun, and Deno. It keeps Node's semantics:
 * listeners run synchronously in registration order, and emitting `error`
 * without a listener throws the error. It also works with Node's
 * `events.once()` and `events.on()` helpers.
 */
export class Emitter {
  #listeners = new Map();

  /** Add a listener for an event. */
  on(event, listener) {
    return this.#add(event, listener, false, false);
  }

  /** Alias of on(), as in Node.js. */
  addListener(event, listener) {
    return this.on(event, listener);
  }

  /** Add a listener that runs before the existing ones. */
  prependListener(event, listener) {
    return this.#add(event, listener, false, true);
  }

  /** Add a listener that is removed after its first call. */
  once(event, listener) {
    return this.#add(event, listener, true, false);
  }

  /** Add a one-time listener that runs before the existing ones. */
  prependOnceListener(event, listener) {
    return this.#add(event, listener, true, true);
  }

  /** Remove the most recently added registration of a listener. */
  off(event, listener) {
    checkListener(listener);
    const entries = this.#listeners.get(event);
    if (!entries) return this;
    const entry = entries.findLast((entry) => entry.listener === listener);
    if (entry) this.#remove(event, entry);
    return this;
  }

  /** Alias of off(), as in Node.js. */
  removeListener(event, listener) {
    return this.off(event, listener);
  }

  /** Remove the listeners of one event, or of every event. */
  removeAllListeners(event) {
    if (event === undefined) {
      this.#listeners.clear();
    } else {
      this.#listeners.delete(event);
    }
    return this;
  }

  /**
   * Call the listeners of an event with the given arguments and return whether
   * there were any. An `error` event without listeners throws its argument.
   */
  emit(event, ...arguments_) {
    const entries = this.#listeners.get(event);
    if (!entries || entries.length === 0) {
      if (event === 'error') {
        const error = arguments_[0];
        if (error instanceof Error) throw error;
        throw new Error(`Unhandled error. (${String(error)})`);
      }
      return false;
    }
    // Listeners added or removed while emitting take effect on the next emit.
    for (const entry of [...entries]) {
      if (entry.once) this.#remove(event, entry);
      entry.listener.apply(this, arguments_);
    }
    return true;
  }

  /** Return a copy of the listeners of an event. */
  listeners(event) {
    return (this.#listeners.get(event) ?? []).map((entry) => entry.listener);
  }

  /** Return the number of listeners of an event. */
  listenerCount(event) {
    return this.#listeners.get(event)?.length ?? 0;
  }

  /** Return the names of events that have listeners. */
  eventNames() {
    return [...this.#listeners.keys()];
  }

  #remove(event, entry) {
    const entries = this.#listeners.get(event);
    const index = entries?.indexOf(entry) ?? -1;
    if (index === -1) return;
    entries.splice(index, 1);
    if (entries.length === 0) this.#listeners.delete(event);
  }

  #add(event, listener, once, prepend) {
    checkListener(listener);
    let entries = this.#listeners.get(event);
    if (!entries) {
      entries = [];
      this.#listeners.set(event, entries);
    }
    const entry = { listener, once };
    if (prepend) {
      entries.unshift(entry);
    } else {
      entries.push(entry);
    }
    return this;
  }
}

function checkListener(listener) {
  if (typeof listener !== 'function') {
    throw new TypeError(
      `The "listener" argument must be a function. Received ${typeof listener}`
    );
  }
}
