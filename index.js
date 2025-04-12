require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { Manager } = require('erela.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel]
});

client.commands = new Collection();
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.manager.init(client.user.id);
});

// 📡 Lavalink Manager
client.manager = new Manager({
  nodes: [
    {
      host: process.env.LAVALINK_HOST,
      port: Number(process.env.LAVALINK_PORT),
      password: process.env.LAVALINK_PASSWORD,
      secure: true // ✅ สำคัญมากสำหรับ Render
    },
  ],
  send(id, payload) {
    const guild = client.guilds.cache.get(id);
    if (guild) guild.shard.send(payload);
  }
})
.on('nodeConnect', node => console.log(`✅ Lavalink node "${node.options.host}" connected.`))
.on('nodeError', (node, error) => console.error(`❌ Lavalink error: ${error.message}`));

// 📥 รับ interaction
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'เกิดข้อผิดพลาดในการทำงานของคำสั่ง!', ephemeral: true });
  }
});

// 🎶 Voice update สำหรับ erela.js
client.on('raw', d => client.manager.updateVoiceState(d));

client.login(process.env.DISCORD_TOKEN);
