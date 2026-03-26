import app from './server';

export default {
  port: process.env.PORT || 4000,
  fetch: app.fetch,
};
