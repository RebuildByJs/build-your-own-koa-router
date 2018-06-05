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

Router.prototype.compose = function (ctx, final) {
  let index = -1;
  final = final || (() => {});
  return (middlewares) => {
    function dispatch (i) {
      if (i < index) throw new Error('cannot excute next twice in a function.');
      index = i;
      if (i === middlewares.length - 1) dispatch = final;
      let fn = middlewares[index];
      return Promise.resolve(fn(ctx, () => {
        return dispatch(i + 1);
      }));
    }
    return dispatch(0);
  };
};

Router.prototype.routes = function () {
  const router = this;

  function dispatch (ctx, next) {
    console.log('routes');
    let path = ctx.path;
    console.log(path);
    let method = ctx.method;
    console.log(method);
    let matched = router.match(path, method);
    console.log(matched);
    
    let layerChain = matched.pathAndMethods.reduce((memo, layer) => {
      
      memo.push((ctx, next) => {
        ctx.router = layer;
        ctx.params = {};
        return next();
      });

      memo = memo.concat(layer.stack);
      return memo;
    }, []);
    console.log(layerChain);
    return router.compose(ctx)(layerChain).then(next);
  }

  dispatch.router = router;

  return dispatch;
};

Router.prototype.allowedMethods = function () {
  return function allowedMethods (ctx, next) {
    console.log('allowed');
    return next();
  };
};



module.exports = Router;