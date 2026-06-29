// --- REPLACE THE OLD PORT LISTENER AT THE BOTTOM OF YOUR SERVER.JS WITH THIS ---

// Hostinger passes its custom execution port or dynamic hook variable directly 
// via process.env.PORT. Fallback to 3000 only for local testing.
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Pool engine successfully executing on dynamic port: ${PORT}`);
});
