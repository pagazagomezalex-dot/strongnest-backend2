import app from './app';export default app;

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor StrongNest escuchando en el puerto ${PORT}`);
});
