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

// โหลด utils หรือ embed
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

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

// Event: เมื่อตัวบอทพร้อม
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // ลงทะเบียน Slash commands
  const commands = client.commands.map(cmd => ({
    name: cmd.name,
    description: cmd.description,
    options: cmd.options || [],
  }));

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), {
      body: commands
    });
    console.log('✅ Slash commands deployed.');
  } catch (error) {
    console.error('❌ Failed to deploy commands:', error);
  }
});

// Event: interaction
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.run(client, interaction, manager);
  } catch (error) {
    console.error(`❌ Error in /${interaction.commandName}:`, error);
    await interaction.reply({ content: '❌ เกิดข้อผิดพลาดในการประมวลผลคำสั่ง', ephemeral: true });
  }
});

// Event: raw → ให้ Lavalink sync voice state
client.on('raw', d => manager.updateVoiceState(d));

// Event: เมื่อเชื่อม Lavalink สำเร็จ
manager.on('nodeConnect', node => {
  console.log(`✅ Lavalink node "${node.options.host}" connected.`);
});

manager.on('nodeError', (node, error) => {
  console.error(`❌ Lavalink node error:`, error);
});

// เริ่มรันบอท
client.login(process.env.DISCORD_TOKEN);
