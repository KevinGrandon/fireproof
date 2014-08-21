
(function (root, factory) {

  'use strict';

  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], factory);
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    // Browser globals (root is window)
    root.returnExports = factory();
  }

}(this, function () {

  var library = {};

  /* jshint ignore:start */

  (function(target) {

    var undef;

    function isFunction(f) {
      return typeof f == 'function';
    }
    function isObject(f) {
      return typeof f == 'object';
    }
    function defer(callback) {
      if (typeof setImmediate != 'undefined')
        setImmediate(callback);
      else if (typeof process != 'undefined' && process['nextTick'])
        process['nextTick'](callback);
      else
        setTimeout(callback, 0);
    }

    target[0][target[1]] = function pinkySwear(extend) {
      var state;           // undefined/null = pending, true = fulfilled, false = rejected
      var values = [];     // an array of values as arguments for the then() handlers
      var deferred = [];   // functions to call when set() is invoked

      var set = function(newState, newValues) {
        if (state == null && newState != null) {
          state = newState;
          values = newValues;
          if (deferred.length)
            defer(function() {
              for (var i = 0; i < deferred.length; i++)
                deferred[i]();
            });
        }
        return state;
      };

      set['then'] = function (onFulfilled, onRejected) {
        var promise2 = pinkySwear(extend);
        var callCallbacks = function() {
            try {
              var f = (state ? onFulfilled : onRejected);
              if (isFunction(f)) {
                function resolve(x) {
                  var then, cbCalled = 0;
                  try {
                    if (x && (isObject(x) || isFunction(x)) && isFunction(then = x['then'])) {
                      if (x === promise2)
                        throw new TypeError();
                      then['call'](x,
                        function() { if (!cbCalled++) resolve.apply(undef,arguments); } ,
                        function(value){ if (!cbCalled++) promise2(false,[value]);});
                    }
                    else
                      promise2(true, arguments);
                  }
                  catch(e) {
                    if (!cbCalled++)
                      promise2(false, [e]);
                  }
                }
                resolve(f.apply(undef, values || []));
              }
              else
                promise2(state, values);
          }
          catch (e) {
            promise2(false, [e]);
          }
        };
        if (state != null)
          defer(callCallbacks);
        else
          deferred.push(callCallbacks);
        return promise2;
      };
          if(extend){
              set = extend(set);
          }
      return set;
    };
  })([library, 'pinkySwear']);
  /* jshint ignore:end */

  var nextTick = function(fn) {

    if (typeof setImmediate !== 'undefined') {
      setImmediate(fn);
    } else if (process && process.nextTick) {
      process.nextTick(fn);
    } else {
      setTimeout(fn, 0);
    }

  };

  var handleError = function(promise, onComplete) {

    return function(err) {

      if (onComplete && typeof onComplete === 'function') {

        nextTick(function() {
          onComplete(err);
          promise(err === null, err ? [err] : undefined);
        });

      } else {
        promise(err === null, err ? [err] : undefined);
      }

    };

  };

  var pinkySwear = library.pinkySwear;


  /**
   * Fireproofs an existing Firebase reference, giving it magic promise powers.
   * @name Fireproof
   * @constructor
   * @param {Firebase} firebaseRef A Firebase reference object.
   * @property then A promise shortcut for .once('value'),
   * except for references created by .push(), where it resolves on success
   * and rejects on failure of the property object.
   * @example
   * var fp = new Fireproof(new Firebase('https://test.firebaseio.com/something'));
   * fp.then(function(snap) { console.log(snap.val()); });
   */
  function Fireproof(firebaseRef, promise) {

    this._ref = firebaseRef;
    if (promise && promise.then) {
      this.then = promise.then.bind(promise);
    } else {

      this.then = function(ok, fail) {

        var promise = pinkySwear();

        this._ref.once('value', function(snap) {
          promise(true, snap);
        }, function(err) {
          promise(false, err);
        });

        return promise.then(ok || null, fail || null);

      };

    }

  }


  /**
   * Delegates Firebase#auth.
   * @method Fireproof#auth
   * @param {string} authToken Firebase authentication token.
   * @param {function=} onComplete Callback on initial completion.
   * @param {function=} onCancel Callback if we ever get disconnected.
   * @returns {Promise} Resolves on success, rejects on failure.
   */
  Fireproof.prototype.auth = function(authToken, onComplete, onCancel) {

    var promise = pinkySwear();

    this._ref.auth(authToken, function(err, info) {

      if (err !== null) {
        promise(false, [err]);
      } else {
        promise(true, [info]);
      }

      if (typeof onComplete === 'function') {
        nextTick(function() {
          onComplete(err, info);
        });
      }

    }, onCancel);

    return promise;

  };


  /**
   * Delegates Firebase#unauth.
   * @method Fireproof#unauth
   */
  Fireproof.prototype.unauth = function() {
    this._ref.unauth();
  };


  /**
   * Delegates Firebase#child, wrapping the child in fireproofing.
   * @method Fireproof#child
   * @param {string} childPath The subpath to refer to.
   * @returns {Fireproof} A reference to the child path.
   */
  Fireproof.prototype.child = function(childPath) {
    return new Fireproof(this._ref.child(childPath));
  };


  /**
   * Delegates Firebase#parent.
   * @method Fireproof#parent
   * @returns {Fireproof} A ref to the parent path, or null if there is none.
   */
  Fireproof.prototype.parent = function() {

    if (this._ref.parent() === null) {
      return null;
    } else {
      return new Fireproof(this._ref.parent());
    }

  };


  /**
   * Delegates Firebase#root.
   * @method Fireproof#root
   * @returns {Fireproof} A ref to the root.
   */
  Fireproof.prototype.root = function() {
    return new Fireproof(this._ref.root());
  };


  /**
   * Delegates Firebase#name.
   * @method Fireproof#name
   * @returns {string} The last component of this reference object's path.
   */
  Fireproof.prototype.name = function() {
    return this._ref.name();
  };


  /**
   * Delegates Firebase#toString.
   * @method Fireproof#toString
   * @returns {string} The full URL of this reference object.
   */
  Fireproof.prototype.toString = function() {
    return this._ref.toString();
  };


  /**
   * Delegates Firebase#set.
   * @method Fireproof#set
   * @param {object} value The value to set this path to.
   * @param {function=} onComplete Callback when the operation is done.
   * @returns {Promise} Resolves on success, rejects on failure.
   * @example
   * fireproofRef.set('something')
   * .then(function()) {
   *   console.log('set was successful!');
   * }, function(err) {
   *   console.error('error while setting:', err);
   * });
   */
  Fireproof.prototype.set = function(value, onComplete) {

    var promise = pinkySwear();

    this._ref.set(value, handleError(promise, onComplete));

    return promise;

  };


  /**
   * Delegates Firebase#update.
   * @method Fireproof#update
   * @param {object} value An object with keys and values to update.
   * @param {function=} onComplete Callback when the operation is done.
   * @returns {Promise} Resolves on success, rejects on failure.
   */
  Fireproof.prototype.update = function(value, onComplete) {

    var promise = pinkySwear();

    this._ref.update(value, handleError(promise, onComplete));

    return promise;

  };


  /**
   * Delegates Firebase#remove.
   * @method Fireproof#remove
   * @param {function=} onComplete Callback when the operation is done.
   * @returns {Promise} Resolves on success, rejects on failure.
   */
  Fireproof.prototype.remove = function(onComplete) {

    var promise = pinkySwear();

    this._ref.remove(handleError(promise, onComplete));

    return promise;

  };


  /**
   * Delegates Firebase#push.
   * @method Fireproof#push
   * @param {object} value An object with keys and values to update.
   * @param {function=} onComplete Callback when the operation is done.
   * @returns {Promise} Resolves on success, rejects on failure.
   */
  Fireproof.prototype.push = function(value, onComplete) {

    var promise = pinkySwear();

    var rv = new Fireproof(
      this._ref.push(value, handleError(promise, onComplete)),
      promise
    );

    return rv;

  };


  /**
   * Delegates Firebase#setWithPriority.
   * @method Fireproof#setWithPriority
   * @param {object} value The value to set this path to.
   * @param {object} priority The priority to set this path to.
   * @param {function=} onComplete Callback when the operation is done.
   * @returns {Promise} Resolves on success, rejects on failure.
   */
  Fireproof.prototype.setWithPriority = function(value, priority, onComplete) {

    var promise = pinkySwear();

    this._ref.setWithPriority(value, priority, handleError(promise, onComplete));

    return promise;

  };


  /**
   * Delegates Firebase#setPriority.
   * @method Fireproof#setPriority
   * @param {object} priority The priority to set this path to.
   * @param {function=} onComplete Callback when the operation is done.
   * @returns {Promise} Resolves on success, rejects on failure.
   */
  Fireproof.prototype.setPriority = function(priority, onComplete) {

    var promise = pinkySwear();

    this._ref.setPriority(priority, handleError(promise, onComplete));

    return promise;

  };


  /**
   * Delegates Firebase#transaction.
   * @method Fireproof#transaction
   * @param {function} updateFunction
   * @param {function} onComplete
   * @param {boolean=} applyLocally
   * @returns {Promise} Resolves on success, rejects on failure.
   */
  Fireproof.prototype.transaction = function(updateFunction, onComplete, applyLocally) {

    var promise = pinkySwear();

    this._ref.transaction(updateFunction, function(err, committed, snap) {

      nextTick(function() {
        onComplete(err, committed, snap);

        if (err) {
          promise(false, [err]);
        } else {
          promise(true, [committed, snap]);
        }

      });

    }, applyLocally);

    return promise;

  };


  /**
   * Delegates Firebase#on.
   * @method Fireproof#on
   * @param {string} eventType
   * @param {function} callback
   * @param {function=} cancelCallback
   * @param {object=} context
   * @returns {function} Your callback parameter wrapped in fireproofing. Use
   * this return value, not your own copy of callback, to call .off(). It also
   * functions as a promise that resolves on success and rejects on failure.
   */
  Fireproof.prototype.on = function(eventType, callback, cancelCallback, context) {

    var promise = pinkySwear();

    var callbackHandler = function(snap, prev) {

      nextTick(function() {
        callback(snap, prev);
        promise(true, [snap, prev]);
      });

    }.bind(this);

    callbackHandler.then = promise.then.bind(promise);

    this._ref.on(eventType, callbackHandler, function(err) {

      nextTick(function() {
        cancelCallback(err);
        promise(false, [err]);
      });

    }, context);

    return callbackHandler;

  };


  /**
   * Delegates Firebase#off.
   * @method Fireproof#off
   * @param {string} eventType
   * @param {function=} callback
   * @param {object=} context
   */
  Fireproof.prototype.off = function(eventType, callback, context) {

    this._ref.off(eventType, callback, context);

  };


  /**
   * Delegates Firebase#once.
   * @method Fireproof#once
   * @param {object} eventType
   * @param {function} successCallback
   * @param {function=} failureCallback
   * @param {object=} context
   * @returns {Promise} Resolves on success and rejects on failure.
   */
  Fireproof.prototype.once = function(eventType, successCallback, failureCallback, context) {

    var promise = pinkySwear();

    this._ref.once(eventType, function(snap) {

      promise(true, [snap]);
      nextTick(function() {
        successCallback(snap);
      });

    }, function(err) {

      promise(false, [err]);
      nextTick(function() {
        failureCallback(err);
      });

    }, context);

    return promise;

  };


  /**
   * Delegates Firebase#limit.
   * @method Fireproof#limit
   * @param {Number} limit
   * @returns {Fireproof}
   */
  Fireproof.prototype.limit = function(limit) {
    return new Fireproof(this._ref.limit(limit));
  };


  /**
   * Delegates Firebase#startAt.
   * @method Fireproof#startAt
   * @param {object} priority
   * @param {string} name
   * @returns {Fireproof}
   */
  Fireproof.prototype.startAt = function(priority, name) {
    return new Fireproof(this._ref.startAt(priority, name));
  };


  /**
   * Delegates Firebase#endAt.
   * @method Fireproof#endAt
   * @param {object} priority
   * @param {string} name
   * @returns {Fireproof}
   */
  Fireproof.prototype.endAt = function(priority, name) {
    return new Fireproof(this._ref.endAt(priority, name));
  };


  /**
   * Delegates Firebase#equalTo.
   * @method Fireproof#equalTo
   * @param {object} priority
   * @param {string} name
   * @returns {Fireproof}
   */
  Fireproof.prototype.equalTo = function(priority, name) {
    return new Fireproof(this._ref.equalTo(priority, name));
  };


  /**
   * Delegates Firebase#ref.
   * @method Fireproof#ref
   * @returns {Fireproof}
   */
  Fireproof.prototype.ref = function() {
    return new Fireproof(this._ref());
  };

  return Fireproof;

}));
