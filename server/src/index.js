const app = require('./app');
const config = require('./config');

app.listen(config.port, () => {
  console.log(`ShelfScout API listening on http://localhost:${config.port}`);
});
