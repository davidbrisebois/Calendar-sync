import express from 'express';

const app = express();
app.use(express.json());

app.get('/hello', (req, res) => {
  res.json({ ok: true });
});

export default app;