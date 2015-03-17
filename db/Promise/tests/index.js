'use strict';

var assert = require('assert');
var Promise = require('../index');

var tests = [];

var test = new function () {
    function test (desc, tester) {

        tests.push(new Promise(function (resolve, reject) {
            var settled = false;

            it(desc, function () {
                tester(function (result) {
                    settled = true;

                    assert(result);

                    if (result) {
                        resolve(desc);
                    }
                    else {
                        reject(new Error(desc));
                    }

                });
            });

            global.setTimeout(function () {
                if (!settled) {
                    reject(new Error(desc));
                }
            }, 5000);
        }));
    }

    return test;
};

test('call resolver synchronously', function (assert) {
    var x = 0;

    new Promise(function () {
        x = 1;
    });

    assert(x === 1);
});

test('call resolver once', function (assert) {
    var callCount = 0;

    var promise = new Promise(function () {
        callCount++;
    });

    function testResolver () {
        Promise.resolve(promise);
        Promise.reject(promise);
        Promise.race([promise]);
        Promise.all([promise]);
        promise.then();
    }

    testResolver();

    global.setImmediate(testResolver);

    global.setTimeout(function () {
        assert(callCount === 1);
    }, 500);
});

test('call onFulfilled asynchronously', function (assert) {
    var x = 0;

    new Promise(function (resolve) {
        resolve();
    })
    .then(function () {
        x = 1;
    });

    assert(x === 0);
});

test('call onRejected asynchronously', function (assert) {
    var x = 0;

    new Promise(function (resolve, reject) {
        reject();
    })
    ['catch'](function () {
        x = 1;
    });

    assert(x === 0);
});

test('reject resolver error', function (assert) {
    var error = new Error('resolver error');

    new Promise(function () {
        throw error;
    })
    ['catch'](function (reason) {
        assert(reason === error);
    });
});

test('skip resolver error (fulfilled)', function (assert) {
    new Promise(function (resolve) {
        resolve(1);
        throw new Error('resolver error');
    })
    .then(function (value) {
        assert(value === 1);
    });
});

test('skip resolver error (rejected)', function (assert) {
    var rejectedError = new Error('rejected error');
    var resolverError = new Error('resolver error');

    new Promise(function (resolve, reject) {
        reject(rejectedError);
        throw resolverError;
    })
    ['catch'](function (reason) {
        assert(reason === rejectedError);
    });
});

test('call something one (resolve first)', function (assert) {
    new Promise(function (resolve, reject) {
        resolve();
        reject();
    })
    .then(function () {
        assert(true);
    });
});

test('call something one (reject first)', function (assert) {
    new Promise(function (resolve, reject) {
        reject();
        resolve();
    })
    ['catch'](function () {
        assert(true);
    });
});

test('resolve once', function (assert) {
    var callCount = 0;
    var values = [];

    new Promise(function (resolve) {
        resolve(1);
        resolve(2);
    })
    .then(function (value) {
        values.push(value);
        callCount++;
    });

    global.setTimeout(function () {
        assert(callCount === 1 && values.length === 1 && values[0] === 1);
    }, 500);
});

test('reject once', function (assert) {
    var callCount = 0;
    var reasons = [];
    var error1 = new Error('test error 1');
    var error2 = new Error('test error 2');

    new Promise(function (resolve, reject) {
        reject(error1);
        reject(error2);
    })
    ['catch'](function (reason) {
        reasons.push(reason);
        callCount++;
    });

    global.setTimeout(function () {
        assert(callCount === 1 && reasons.length === 1 && reasons[0] === error1);
    }, 500);
});

test('call onFulfilled with promise value', function (assert) {
    var promise = new Promise(function (resolve) {
        resolve(1);
    });

    promise.then(function () {
        promise.then(function () {
            promise.then(function (value) {
                assert(value === 1);
            });

            return 2;
        });

        return 3;
    });
});

test('call onRejected with promise value', function (assert) {
    var error1 = new Error('test error 1');
    var error2 = new Error('test error 2');
    var error3 = new Error('test error 3');

    var promise = new Promise(function (resolve, reject) {
        reject(error1);
    });

    promise['catch'](function () {
        promise['catch'](function () {
            promise['catch'](function (reason) {
                assert(reason === error1);
            });

            throw error2;
        });

        throw error3;
    });
});

test('unwrap promise (resolve)', function (assert) {
    new Promise(function (resolve) {
        resolve(1);
    })
    .then(function () {
        return new Promise(function (resolve) {
            resolve(new Promise(function (resolve) {
                resolve(2);
            }));
        });
    })
    .then(function (value) {
        assert(value === 2);
    });
});

test('unwrap promise (reject)', function (assert) {
    var error1 = new Error('test error 1');
    var error2 = new Error('test error 2');

    new Promise(function (resolve, reject) {
        reject(error1);
    })
    ['catch'](function () {
        return new Promise(function (resolve, reject) {
            reject(new Promise(function (resolve, reject) {
                reject(error2);
            }));
        });
    })
    ['catch'](function (reason) {
        reason['catch'](function (reason) {
            assert(reason === error2);
        });
    });
});

test('return fulfilled promise', function (assert) {
    Promise.resolve(1)
    .then(function () {
        return Promise.resolve(2);
    })
    .then(function (value) {
        assert(value === 2);
    });
});

test('return rejected promise', function (assert) {
    var error1 = new Error('test error 1');
    var error2 = new Error('test error 2');

    Promise.reject(error1)['catch'](function () {
        return Promise.reject(error2);
    })
    ['catch'](function (reason) {
        assert(reason === error2);
    });
});

test('return self', function (assert) {
    var promise = Promise.resolve(1);

    promise.then(function () {
        return promise;
    })
    .then(function (value) {
        assert(value === 1);
    });
});

test('keep initial value (fulfilled)', function (assert) {
    var error = new Error('test error');
    var promise = Promise.resolve(1);

    promise.then(function () {
        return 2;
    });

    promise['catch'](function () {
        throw error;
    });

    promise.then(function (value) {
        assert(value === 1);
    });
});

test('keep initial value (rejected)', function (assert) {
    var error1 = new Error('test error 1');
    var error2 = new Error('test error 2');

    var promise = Promise.reject(error1);

    promise.then(function () {
        return 1;
    });

    promise['catch'](function () {
        throw error2;
    });

    promise['catch'](function (reason) {
        assert(reason === error1);
    });
});

test('transfer value', function (assert) {
    Promise.resolve(1).then(function (value) {
        return value + 1;
    })
    .then(function (value) {
        return value + 1;
    })
    .then(function (value) {
        assert(value === 3);
    })
});

test('transfer reason', function (assert) {
    var error = new Error('test error');

    Promise.reject(error)['catch'](function (reason) {
        throw reason;
    })
    ['catch'](function (reason) {
        throw reason;
    })
    ['catch'](function (reason) {
        assert(reason === error);
    });
});

test('call resolve asynchronously', function (assert) {
    new Promise(function (resolve) {
        global.setImmediate(resolve, 1);
    })
    .then(function (value) {
        assert(value === 1);
    });
});

test('call reject asynchronously', function (assert) {
    var error = new Error('test error');

    new Promise(function (resolve, reject) {
        global.setImmediate(reject, error);
    })
    ['catch'](function (reason) {
        assert(reason === error);
    });
});

test('throw from onFulfilled', function (assert) {
    var error = new Error('test error');

    Promise.resolve().then(function () {
        throw error;
    })
    ['catch'](function (reason) {
        assert(reason === error);
    });
});

test('throw from onRejected', function (assert) {
    var error1 = new Error('test error 1');
    var error2 = new Error('test error 2');

    Promise.reject(error1)['catch'](function () {
        throw error2;
    })
    ['catch'](function (reason) {
        assert(reason === error2);
    });
});

test('race', function (assert) {
    var promise1 = new Promise(function (resolve) {
        global.setTimeout(function () {
            resolve(1);
        }, 150);
    });

    var promise2 = new Promise(function (resolve) {
        global.setTimeout(function () {
            resolve(2);
        }, 50);
    });

    var promise3 = new Promise(function (resolve) {
        global.setTimeout(function () {
            resolve(3);
        }, 100);
    });

    Promise.race([promise1, promise2, promise3]).then(function (value) {
        assert(value === 2);
    });
});

test('resolve(promise)', function (assert) {
    Promise.resolve(new Promise(function (resolve) {
        resolve(1);
    }))
    .then(function (value) {
        assert(value === 1);
    });
});

test('reject(promise)', function (assert) {
    var promise = new Promise(function (resolve) {
        resolve(1);
    });

    Promise.reject(promise)['catch'](function (value) {
        value.then(function (value) {
            assert(value === 1);
        });
    });
});

test('resolve(thenable)', function (assert) {
    var thenable = {
        then: function (onFulfilled) {
            onFulfilled(1);
        }
    };

    Promise.resolve(thenable).then(function (value) {
        assert(value === 1);
    });
});

test('reject(thenable)', function (assert) {
    var thenable = {
        then: function () {
        }
    };

    Promise.reject(thenable)['catch'](function (value) {
        assert(value === thenable);
    });
});

test('then(promise)', function (assert) {
    var promise = new Promise(function (resolve) {
        resolve(2);
    });

    Promise.resolve(1).then(promise).then(function (value) {
        assert(value === 1);
    });
});

test('then(thenable)', function (assert) {
    var thenable = {
        then: function (onFulfilled) {
            onFulfilled(2);
        }
    };

    Promise.resolve(1).then(thenable).then(function (value) {
        assert(value === 1);
    });
});

test('return value from onRejected', function (assert) {
    Promise.reject(1)['catch'](function () {
        return 2;
    })
    .then(function (value) {
        assert(value === 2);
    });
});

test('return thenable from onFulfilled', function (assert) {
    Promise.resolve(1)
        .then(function (value) {
            return {
                then: function (onFulfilled) {
                    onFulfilled(value + 1)
                }
            };
        })
        .then(function (value) {
            assert(value === 2);
        });
});

test('return thenable from onRejected', function (assert) {
    var error = new Error('test error');

    Promise.reject(error)['catch'](function (reason) {
        return {
            then: function (onFulfilled, onRejected) {
                onRejected(reason);
            }
        };
    })
    ['catch'](function (reason) {
        assert(reason === error);
    });
});

test('throw from thenable', function (assert) {
    var error = new Error('test error');
    Promise.resolve().then(function () {
        return {
            then: function () {
                throw error;
            }
        };
    })
    ['catch'](function (reason) {
        assert(reason === error);
    });
});

test('race([thenable])', function (assert) {
    Promise.race([{
        then: function (onFulfilled) {
            global.setTimeout(function () {
                onFulfilled(1);
            }, 150);
        }
    },
    {
        then: function (onFulfilled) {
            global.setTimeout(function () {
                onFulfilled(2);
            }, 50);
        }
    },
    {
        then: function (onFulfilled) {
            global.setTimeout(function () {
                onFulfilled(3);
            }, 100);
        }
    }])
    .then(function (value) {
        assert(value === 2);
    });
});

test('all([thenable])', function (assert) {
    Promise.all([{
        then: function (onFulfilled) {
            global.setTimeout(function () {
                onFulfilled(1);
            }, 150);
        }
    },
    {
        then: function (onFulfilled) {
            global.setTimeout(function () {
                onFulfilled(2);
            }, 50);
        }
    },
    {
        then: function (onFulfilled) {
            global.setTimeout(function () {
                onFulfilled(3);
            }, 100);
        }
    }])
    .then(function (values) {
        assert(values.join('') === '123');
    });
});

test('call resolver for each thenable (race)', function (assert) {
    var count = 0;

    Promise.race([
        {
            then: function (onFulfilled) {
                count++;
                global.setTimeout(function () {
                    onFulfilled(1);
                }, 150);
            }
        },
        {
            then: function (onFulfilled) {
                count++;
                global.setTimeout(function () {
                    onFulfilled(2);
                }, 50);
            }
        },
        {
            then: function (onFulfilled) {
                count++;
                global.setTimeout(function () {
                    onFulfilled(3);
                }, 100);
            }
        }
    ])
    .then(function (value) {
        assert(count === 3 && value === 2);
    });
});

test('call resolver for each thenable (all)', function (assert) {
    var count = 0;

    Promise.all([
        {
            then: function (onFulfilled) {
                count++;

                global.setTimeout(function () {
                    onFulfilled(1);
                }, 150);
            }
        },
        {
            then: function (onFulfilled) {
                count++;
                global.setTimeout(function () {
                    onFulfilled(2);
                }, 50);
            }
        },
        {
            then: function (onFulfilled) {
                count++;
                global.setTimeout(function () {
                    onFulfilled(3);
                }, 100);
            }
        }
    ])
    .then(function (values) {
        assert(count === 3 && values.join('') === '123');
    });
});

test('first rejected (race)', function (assert) {
    var error1 = new Error('test error 1');
    var error2 = new Error('test error 2');
    var error3 = new Error('test error 3');

    Promise.race([
        new Promise(function (resolve, reject) {
            global.setTimeout(function () {
                reject(error1);
            }, 150);
        }),
        new Promise(function (resolve, reject) {
            global.setTimeout(function () {
                reject(error2);
            }, 50);
        }),
        new Promise(function (resolve, reject) {
            global.setTimeout(function () {
                reject(error3);
            }, 100);
        })
    ])
    ['catch'](function (reason) {
        assert(reason === error2);
    });
});

test('resolve all(emptyArray)', function (assert) {
    var array = [];

    Promise.all(array).then(function (values) {
        assert(values !== array && values.length === 0);
    });
});

test('resolve all(values)', function (assert) {
    var array = [1, 2, , 3];

    Promise.all(array).then(function (values) {
        var length = values.length;
        var i = length;

        while (i--) {
            if (array[i] !== values[i]) {
                assert(false);
                break;
            }
        }

        assert(length === 4);
    });
});

test('resolve all(mixed)', function (assert) {
    Promise.all([ 1, Promise.resolve(2), 3 ]).then(function (values) {
        assert(values.join('') === '123');
    });
});

test('deep resolve all(mixed)', function (assert) {
    Promise.all([
        new Promise(function (resolve) {
            resolve(1);
        })
        .then(function (value) {
            return new Promise(function (resolve) {
                resolve(value + 1);
            })
            .then(function (value) {
                return new Promise(function (resolve) {
                    global.setTimeout(function () {
                        resolve(value + 1);
                    }, 50);
                })
                .then(function (value) {
                    return value + 1;
                });
            });
        }),
        /*undefined*/, 2, Promise.resolve(1), 0 ])
        .then(function (values) {
            assert(
                    values.length === 5 &&
                    values[4] === 0 &&
                    values[3] === 1 &&
                    values[2] === 2 &&
                    values[1] === undefined &&
                    values[0] === 4
            );
        });
});

test('reject all(mixed)', function (assert) {
    var error = new Error('test error');

    Promise.all([ 1, new Promise(function (resolve, reject) {
        reject(error);
    }), 3 ])
    ['catch'](function (reason) {
        assert(reason === error);
    });
});

test('deep reject all(mixed)', function (assert) {
    var error = new Error('test error');

    Promise.all([
        1,
        new Promise(function (resolve, reject) {
            reject(error);
        })
        ['catch'](function (reason) {
            return new Promise(function (resolve, reject) {
                global.setTimeout(function () {
                    reject(reason);
                }, 50);
            })
            ['catch'](function (reason) {
                return new Promise(function (resolve, reject) {
                    reject(reason);
                });
            });
        }),
        3
    ])
    ['catch'](function (reason) {
        assert(reason === error);
    });
});

test('resolve race(mixed)', function (assert) {
    Promise.race([
        new Promise(function (resolve) {
            global.setTimeout(function () {
                resolve(1);
            }, 50);
        }),
        2,
        new Promise(function (resolve) {
            global.setTimeout(function () {
                resolve(3);
            }, 150);
        })
    ])
    .then(function (value) {
        assert(value === 2);
    });
});

test('deep resolve race(mixed)', function (assert) {
    Promise.race([
        new Promise(function (resolve) {
            global.setTimeout(function () {
                resolve(1);
            }, 150);
        })
        .then(function (value) {
            return new Promise(function (resolve) {
                resolve(value);
            });
        }),

        new Promise(function (resolve) {
            global.setTimeout(function () {
                resolve(2);
            }, 50);
        })
        .then(function (value) {
            return new Promise(function (resolve) {
                resolve(value);
            });
        })
    ])
    .then(function (value) {
        assert(value === 2);
    });
});

test('do not modify initial array', function (assert) {
    var array = [1, , 3];

    Promise.all(array).then(function (values) {
        assert(1 in values && !(1 in array));
    });
});

test('chaining cycle on resolve', function (assert) {
    var promise = Promise.resolve().then(function () {
        return promise;
    });

    promise['catch'](function (reason) {
        assert(reason instanceof TypeError);
    });
});

test('chaining cycle on reject', function (assert) {
    var promise = Promise.reject()['catch'](function () {
        return promise;
    });

    promise['catch'](function (reason) {
        assert(reason instanceof TypeError);
    });
});


test('call thenable.then synchronously', function (assert) {
    var x = 0;

    var thenable = {
        then: function () {
            x = 1;
        }
    };

    new Promise(function (resolve) {
        resolve(thenable);
    });

    assert(x === 0);
});

//github.com/getify/native-promise-only/issues/5
//github.com/domenic/promises-unwrapping/issues/105
test('call thenable.then asynchronously', function (assert) {
    var x = 0;
    var thenable = {
        then: function () {
            x = 1;
        }
    };

    Promise.resolve(thenable);
    assert(x === 0);
});

Promise.all(tests).then(function () {
    console.log('all tests completed successfully');
}, function (reason) {
    console.log('failed on: ' + reason.toString());
});
