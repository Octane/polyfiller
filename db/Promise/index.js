/**
 * Promise polyfill v1.0.9
 *
 * @author Dmitry Korobkin
 * @requires window.setImmediate, Array.isArray
 * @see https://github.com/Octane/Promise
 * @license MIT, 2015
 */
void function () {
    'use strict';

    if ('Promise' in window) {
        return 0;
    }

    var STATUS = '[[PromiseStatus]]',
        VALUE = '[[PromiseValue]]',
        ON_FUlFILLED = '[[OnFulfilled]]',
        ON_REJECTED = '[[OnRejected]]',
        ORIGINAL_ERROR = '[[OriginalError]]',
        PENDING = 'pending',
        INTERNAL_PENDING = 'internal pending',
        FULFILLED = 'fulfilled',
        REJECTED = 'rejected',
        NOT_ARRAY = 'not an array.',
        REQUIRES_NEW = 'constructor Promise requires "new".',
        CHAINING_CYCLE = 'then() cannot return same Promise that it resolves.';

    function InternalError (originalError) {
        this[ORIGINAL_ERROR] = originalError;
    }

    function isInternalError (anything) {
        return anything instanceof InternalError;
    }

    function isObject (anything) {
        return Object(anything) === anything;
    }

    function isCallable (anything) {
        return typeof anything == 'function';
    }

    function isPromise (anything) {
        return anything instanceof Promise;
    }

    function identity (value) {
        return value;
    }

    function thrower (reason) {
        throw reason;
    }

    function enqueue (promise, onFulfilled, onRejected) {
        if (!promise[ON_FUlFILLED]) {
            promise[ON_FUlFILLED] = [];
            promise[ON_REJECTED] = [];
        }

        promise[ON_FUlFILLED].push(onFulfilled);
        promise[ON_REJECTED].push(onRejected);
    }

    function clearAllQueues (promise) {
        delete promise[ON_FUlFILLED];
        delete promise[ON_REJECTED];
    }

    function callEach (queue) {
        var length = queue.length, i;

        for (i = 0; i < length; i++) {
            queue[i]();
        }
    }

    function call (resolve, reject, value) {
        var anything = toPromise(value);

        if (isPromise(anything)) {
            anything.then(resolve, reject);
        }
        else if (isInternalError(anything)) {
            reject(anything[ORIGINAL_ERROR]);
        }
        else {
            resolve(value);
        }
    }

    function toPromise (anything) {
        var then;

        if (isPromise(anything)) {
            return anything;
        }

        if (isObject(anything)) {
            try {
                then = anything.then;
            }
            catch (error) {
                return new InternalError(error);
            }

            if (isCallable(then)) {
                return new Promise(function (resolve, reject) {
                    window.setImmediate(function () {
                        try {
                            then.call(anything, resolve, reject);
                        }
                        catch (error) {
                            reject(error);
                        }
                    });
                });
            }
        }
        return null;
    }

    function resolvePromise (promise, resolver) {
        function resolve (value) {
            if (promise[STATUS] == PENDING) {
                fulfillPromise(promise, value);
            }
        }

        function reject (reason) {
            if (promise[STATUS] == PENDING) {
                rejectPromise(promise, reason);
            }
        }

        try {
            resolver(resolve, reject);
        }
        catch (error) {
            reject(error);
        }
    }

    function fulfillPromise (promise, value) {
        var anything = toPromise(value), queue;

        if (isPromise(anything)) {
            promise[STATUS] = INTERNAL_PENDING;

            anything.then(
                function (value) {
                    fulfillPromise(promise, value);
                },
                function (reason) {
                    rejectPromise(promise, reason);
                }
            );
        }
        else if (isInternalError(anything)) {
            rejectPromise(promise, anything[ORIGINAL_ERROR]);
        }
        else {
            promise[STATUS] = FULFILLED;
            promise[VALUE] = value;

            queue = promise[ON_FUlFILLED];

            if (queue && queue.length) {
                clearAllQueues(promise);
                callEach(queue);
            }
        }
    }

    function rejectPromise (promise, reason) {
        var queue = promise[ON_REJECTED];

        promise[STATUS] = REJECTED;
        promise[VALUE] = reason;

        if (queue && queue.length) {
            clearAllQueues(promise);
            callEach(queue);
        }
    }

    function Promise (resolver) {
        var promise = this;

        if (!isPromise(promise)) {
            throw new TypeError(REQUIRES_NEW);
        }

        promise[STATUS] = PENDING;
        promise[VALUE] = undefined;

        resolvePromise(promise, resolver);
    }

    Promise.prototype.then = function (onFulfilled, onRejected) {
        var promise = this, nextPromise;

        onFulfilled = isCallable(onFulfilled) ? onFulfilled : identity;
        onRejected = isCallable(onRejected) ? onRejected : thrower;

        nextPromise = new Promise(function (resolve, reject) {
            function tryCall (func) {
                var value;

                try {
                    value = func(promise[VALUE]);
                }
                catch (error) {
                    reject(error);
                    return;
                }

                if (value === nextPromise) {
                    reject(new TypeError(CHAINING_CYCLE));
                }
                else {
                    call(resolve, reject, value);
                }
            }

            function asyncOnFulfilled () {
                window.setImmediate(tryCall, onFulfilled);
            }

            function asyncOnRejected () {
                window.setImmediate(tryCall, onRejected);
            }

            switch (promise[STATUS]) {
                case FULFILLED:
                    asyncOnFulfilled();
                    break;

                case REJECTED:
                    asyncOnRejected();
                    break;

                default:
                    enqueue(promise, asyncOnFulfilled, asyncOnRejected);
            }
        });

        return nextPromise;
    };

    Promise.prototype.catch = function (onRejected) {
        return this.then(identity, onRejected);
    };

    Promise.resolve = function (value) {
        var anything = toPromise(value);

        if (isPromise(anything)) {
            return anything;
        }

        return new Promise(function (resolve, reject) {
            if (isInternalError(anything)) {
                reject(anything[ORIGINAL_ERROR]);
            }
            else {
                resolve(value);
            }
        });
    };

    Promise.reject = function (reason) {
        return new Promise(function (resolve, reject) {
            reject(reason);
        });
    };

    Promise.race = function (values) {
        return new Promise(function (resolve, reject) {
            var length, i;

            if (Array.isArray(values)) {
                length = values.length;

                for (i = 0; i < length; i++) {
                    call(resolve, reject, values[i]);
                }
            }
            else {
                reject(new TypeError(NOT_ARRAY));
            }
        });
    };

    Promise.all = function (values) {
        return new Promise(function (resolve, reject) {
            var fulfilledCount = 0,
                promiseCount = 0,
                anything,
                value;

            if (Array.isArray(values)) {
                values = values.slice(0);
                var length = values.length;

                for (var index = 0; index < length; index++) {
                    value = values[index];
                    anything = toPromise(value);

                    if (isPromise(anything)) {
                        promiseCount++;

                        anything.then(
                            function (index) {
                                return function (value) {
                                    values[index] = value;
                                    fulfilledCount++;

                                    if (fulfilledCount == promiseCount) {
                                        resolve(values);
                                    }
                                };
                            }(index),
                            reject
                        );
                    }
                    else if (isInternalError(anything)) {
                        reject(anything[ORIGINAL_ERROR]);
                    }
                    else {
                        //[1, , 3] → [1, undefined, 3]
                        values[index] = value;
                    }
                }

                if (!promiseCount) {
                    resolve(values);
                }
            }
            else {
                reject(new TypeError(NOT_ARRAY));
            }
        });
    };

    window.Promise = Promise;
}();