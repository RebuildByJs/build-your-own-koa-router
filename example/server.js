const Koa = require('koa');
const Router = require('../router');

const koa = new Koa();
const router = new Router();

router.get('/', async (ctx, next) => {
  ctx.body = 'index';
});

router.post('/post', async (ctx, next) => {

});

koa.use(router.routes());
koa.use(router.allowedMethods());

koa.listen(3000);