const Koa = require('koa');
const Router = require('../router');

const koa = new Koa();
const router = new Router();

router.get('/', async (ctx, next) => {
  ctx.body = 'index';
}, async () => {
  console.log('second async');
  next();
});

router.post('/post', async (ctx, next) => {
  ctx.body = 'post'
});

koa.use(router.routes());
koa.use(router.allowedMethods());

koa.listen(3000);