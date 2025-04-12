require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const { Manager } = require('erela.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ]
});

client.commands = new Collection();

// โหลดคำสั่งจาก commands/
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

// สร้าง Manager เชื่อม Lavalink
const manager = new Manager({
  nodes: [
    {
      host: process.env.LAVALINK_HOST,
      port: Number(process.env.LAVALINK_PORT),
      password: process.env.LAVALINK_PASSWORD,
      retryDelay: 3000,
    },
  ],
  send(id, payload) {
    const guild = client.guilds.cache.get(id);
    if (guild) guild.shard.send(payload);
  },
});

client.manager = manager;

// Event: เมื่อเชื่อม Lavalink สำเร็จ
manager.on('nodeConnect', node => {
  console.log(`✅ Lavalink node "${node.options.host}" connected.`);
});

manager.on('nodeError', (node, error) => {
  console.error(`❌ Lavalink node error:`, error);
});

// เมื่อบอทพร้อม → ลงทะเบียน slash command
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const slashCommands = client.commands.map(cmd => ({
    name: cmd.name,
    description: cmd.description,
    options: cmd.options || [],
  }));

  const { REST } = require('@discordjs/rest');
  const { Routes } = require('discord-api-types/v10');

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: slashCommands }
    );
    console.log('✅ Slash commands deployed.');
  } catch (err) {
    console.error('❌ Failed to register commands:', err);
  }
});

// interaction
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.run(client, interaction, manager);
  } catch (error) {
    console.error(`❌ Error in /${interaction.commandName}:`, error);
    if (!interaction.replied) {
      await interaction.reply({
        content: '❌ เกิดข้อผิดพลาดในการประมวลผลคำสั่ง',
        ephemeral: true,
      });
    }
  }
});

// สำคัญมาก: ให้ erela รับ voice update
client.on('raw', d => manager.updateVoiceState(d));

// ✅ เริ่มบอท + init manager
client.login(process.env.DISCORD_TOKEN)
  .then(() => {
    client.manager.init(client.user.id);
  });
