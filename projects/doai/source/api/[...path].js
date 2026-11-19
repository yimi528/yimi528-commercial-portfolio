/** Vercel 同源入口：转发主站账号与 DOAI 接口；数据由主站 MySQL 持久化。 */
import app from '../server.js';
export default app;
export const config = { maxDuration: 30 };
