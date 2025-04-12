require("dotenv").config();
const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js");
const { Manager } = require("erela.js");
const fs = require("fs");
const { REST, Routes } = require("discord.js");

// 🔧 สร้าง Client Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.commands = new Collection();

// 📁 โหลดคำสั่งจากโฟลเดอร์ /commands
fs.readdirSync("./commands").forEach(file => {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command); // ✅ เปลี่ยนจาก command.data.name เป็น command.name
});

// 🌐 เชื่อม Lavalink
client.manager = new Manager({
  nodes: [
    {
      host: process.env.LAVALINK_HOST,
      port: parseInt(process.env.LAVALINK_PORT),
      password: process.env.LAVALINK_PASSWORD,
      secure: false, // ❗️ต้องเป็น false ถ้าใช้ http
    },
  ],
  send: (id, payload) => {
    const guild = client.guilds.cache.get(id);
    if (guild) guild.shard.send(payload);
  },
});

// 🎧 เมื่อบอทพร้อม
client.once("ready", async () => {
  console.log(`🎵 Logged in as ${client.user.tag}`);
  client.manager.init(client.user.id);

  // สมัคร Slash Commands
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  const commands = client.commands.map(cmd => ({
    name: cmd.name,
    description: cmd.description,
    options: cmd.options || [],
  }));

  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("✅ Slash commands deployed.");
  } catch (err) {
    console.error("❌ Error deploying commands:", err);
  }
});

// 🎧 Event เชื่อม Lavalink สำเร็จ
client.manager.on("nodeConnect", node =>
  console.log(`✅ Lavalink node "${node.options.host}" connected.`)
);

client.manager.on("nodeError", (node, error) =>
  console.error(`❌ Lavalink error on ${node.options.host}:`, error)
);

// รับ interaction และใช้คำสั่ง
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.run(client, interaction, client.manager); // ✅ เรียก .run และส่ง manager เข้าไป
  } catch (err) {
    console.error("❌ Command error:", err);
    await interaction.reply({ content: "เกิดข้อผิดพลาด!", ephemeral: true });
  }
});

// ให้ manager ทำงานกับ voice state
client.on("raw", d => client.manager.updateVoiceState(d));

// 🔑 ล็อกอินด้วย Token
client.login(process.env.DISCORD_TOKEN);
