const http = require('http');
const Layer = require('./layer');
const methods = http.METHODS;

const Router = function (opts = {}) {
  this.opts = opts;

  this.methods = opts.methods || [
    'HEAD',
    'OPTIONS',
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE'
  ];

  this.params = {};
  this.stack = [];
};

methods.forEach((method) => {
  Router.prototype[method] = Router.prototype[method.toLowerCase()] = function (path) {
    if (typeof path !== 'string') {
      throw new Error('path must be a string');
    }

    let middlewares = Array.prototype.slice.call(arguments, 1);
    this.register(path, [method], middlewares);
    return this;
  };
}, this);

Router.prototype.register = function (path, method, middlewares) {
    let router = new Layer(path, method, middlewares);
    console.log(router);
    Object.keys(this.params).forEach((paramName) => {
      router.param(paramName, this.params[paramName]);
    });

    this.stack.push(router);

    return this;
};

Router.prototype.use = function () {
  let router = this;
  let middlewares = Array.prototype.slice.call(arguments, 0);
  let path;

  let hasPath = typeof middlewares[0] === 'string';
  if (hasPath) {
    path = middlewares.shift();
  }

  middlewares.forEach((m) => {
    if (m.router) {
      m.stack.forEach((layer) => {
        router.stack.push(layer);
      });

      Object.keys(this.params).forEach((paramName) => {
        router.param(paramName, this.params[paramName]);
      });
    } else {
      this.register(path || '*', [], middlewares);
    }
  });
};

Router.prototype.params = function () {

};

Router.prototype.match = function (path, method) {
  let layers = this.stack;
  let matched = {
    path: [],
    pathAndMethods: [],
    router: false
  };

  layers.forEach((layer) => {
    if (layer.path === path || layer.path === '*') {
      matched.path.push(layer);
      if (layer.methods.length === 0 || ~layer.methods.indexOf(method)) {
        matched.pathAndMethods.push(layer);
        if (layer.methods.length) matched.router = true;
      }
    }
  });

  return matched;
};

Router.prototype.compose = function (middlewares) {
  if (!Array.isArray(middlewares)) throw new Error('middlewares nust be array');
  return (ctx, final) => {
    final = final || (() => {});
    let index = -1;
    return dispatch(0);
    function dispatch (i) {
      if (i < index) throw new Error('cannot excute next twice in a function.');
      index = i;
      if (i === middlewares.length - 1) dispatch = final;
      let fn = middlewares[index];
      if (!fn) return Promise.resolve();
      return Promise.resolve(fn(ctx, () => {
        return dispatch(i + 1);
      }));
    }
  };
};

Router.prototype.routes = function () {
  const router = this;

  function dispatch (ctx, next) {
    let path = ctx.path;
    console.log('path', path);
    let method = ctx.method;
    console.log('method', method);
    let matched = router.match(path, method);
    console.log(matched);
    ctx.matched = matched.path;

    let layerChain = matched.pathAndMethods.reduce((memo, layer) => {
      
      memo.push((ctx, next) => {
        ctx.router = layer;
        ctx.params = {};
        return next();
      });

      memo = memo.concat(layer.stack);
      return memo;
    }, []);

    return router.compose(layerChain)(ctx).then(next);
  }

  dispatch.router = router;

  return dispatch;
};

Router.prototype.allowedMethods = function () {
  let methods = this.methods;
  return function allowedMethods (ctx, next) {
    let allowed = ctx.matched.reduce((memo, layer) => {
      return memo.concat(layer.methods);
    }, []);
    return next().then(() => {
      if (!ctx.status || ctx.status === 404) {
        console.log('not found');
        let matched = ctx.matched;
        if (!methods.includes(ctx.method)) {
          ctx.status = 501;
          ctx.body = 'not support';
        } else if (matched.length) {
          if (ctx.method === 'OPTIONS') {
            ctx.status = 200;
            ctx.set('Allow', allowed.join(' '));
          } else if (!allowed.includes(ctx.methods)) {
            ctx.status = 405;
            ctx.body = 'method is not allowed';
          }
        }
      }
    });
  };
};



module.exports = Router;