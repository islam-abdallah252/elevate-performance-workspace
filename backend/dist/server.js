import { createApp } from "./app.js";
import { seedData } from "./seed-data.js";
const port = Number(process.env.PORT ?? 4000);
await seedData();
createApp().listen(port, () => console.log(`KPI API listening on http://localhost:${port}`));
