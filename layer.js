module.exports = class Layer {
  constructor(path, methods, middlewares) {
    this.path = path;
    middlewares = Array.isArray(middlewares) ? middlewares : [middlewares];
    methods = methods.reduce((memo, item) => {
      let l = methods.length;
      if (methods[l - 1] === 'GET') {
        memo.unshift('HEAD');
      }
      memo.push(item);
      return memo;
    }, []);

    middlewares.forEach((ware) => {
      if (typeof ware !== 'function') {
        throw new Error('middlewares must contains all function');
      }
    });

    this.methods = methods;
    this.stack = middlewares;
  }
};